/**
 * Workspace Registry
 * Manages multiple checkouts of the same project.
 *
 * Architecture:
 * - One workspace is the "hub" (owns stable knowledge)
 * - Other workspaces are "satellites" (own local Feature state)
 * - Knowledge syncs: hub → satellites (stable knowledge)
 * - Discoveries promote: satellite → hub (candidate → review → stable)
 *
 * This replaces the old A/B/C sync with a project-agnostic design.
 */

import type { StorageBackend } from '../storage/types.js';
import { resolve } from 'node:path';
import { FilesystemStorage } from '../storage/filesystem.js';
import { parseJson } from '../storage/json.js';
import { KnowledgeEntry as KnowledgeEntrySchema, type KnowledgeEntry } from '../knowledge/schemas.js';
import { Redline as RedlineSchema, type Redline } from '../change-control/schemas.js';

export interface WorkspaceEntry {
  id: string;          // short identifier (e.g. "main", "exp", "ci")
  name: string;        // human-readable name
  path: string;        // absolute filesystem path
  branch?: string;     // git branch if known
  role: 'hub' | 'satellite';
  registeredAt: string;
  lastSyncedAt?: string;
}

export interface WorkspaceRegistry {
  hubPath: string;
  projectName?: string;
  workspaces: WorkspaceEntry[];
}

const REGISTRY_FILE = 'sovei-flow/project/workspaces.json';

export class WorkspaceManager {
  constructor(private storage: StorageBackend) {}

  /** Load the workspace registry */
  async loadRegistry(): Promise<WorkspaceRegistry> {
    const content = await this.storage.read(REGISTRY_FILE);
    if (!content) {
      return { hubPath: '', workspaces: [] };
    }
    const registry = parseJson(content, REGISTRY_FILE) as WorkspaceRegistry;
    const ids = registry.workspaces.map((workspace) => workspace.id);
    if (new Set(ids).size !== ids.length) throw new Error('Workspace registry contains duplicate IDs');
    return registry;
  }

  /** Save the workspace registry */
  async saveRegistry(registry: WorkspaceRegistry): Promise<void> {
    await this.storage.write(REGISTRY_FILE, JSON.stringify(registry, null, 2));
  }

  /** Register a workspace. First workspace becomes the hub. */
  async register(entry: Omit<WorkspaceEntry, 'registeredAt'>): Promise<WorkspaceEntry> {
    const registry = await this.loadRegistry();
    const canonicalPath = this.canonicalPath(entry.path);
    const targetStorage = new FilesystemStorage(canonicalPath);
    const declaration = await targetStorage.read('sovei-flow/project/project.config.json');
    if (!declaration) throw new Error('Workspace is not a Sovei project: ' + canonicalPath);
    const projectName = (parseJson(declaration, 'project.config.json') as { project?: { name?: string } }).project?.name;
    if (!projectName) throw new Error('Workspace project declaration has no project.name: ' + canonicalPath);
    let expectedProjectName = registry.projectName;
    if (!expectedProjectName && registry.workspaces.length) {
      const existingHub = registry.workspaces.find((workspace) => workspace.role === 'hub');
      const existingDeclaration = existingHub
        ? await new FilesystemStorage(existingHub.path).read('sovei-flow/project/project.config.json')
        : null;
      expectedProjectName = existingDeclaration
        ? (parseJson(existingDeclaration, 'project.config.json') as { project?: { name?: string } }).project?.name
        : undefined;
    }
    if (expectedProjectName && expectedProjectName !== projectName) {
      throw new Error(`Workspace belongs to project '${projectName}', expected '${expectedProjectName}'`);
    }
    if (registry.workspaces.some((w) => w.id === entry.id)) {
      throw new Error('Workspace ID already registered: ' + entry.id);
    }

    // Check for duplicate path
    if (registry.workspaces.some((w) => this.pathKey(w.path) === this.pathKey(canonicalPath))) {
      throw new Error('Workspace already registered at: ' + canonicalPath);
    }

    const fullEntry: WorkspaceEntry = {
      ...entry,
      path: canonicalPath,
      registeredAt: new Date().toISOString(),
    };

    // First workspace is always the hub
    if (registry.workspaces.length === 0) {
      fullEntry.role = 'hub';
      registry.hubPath = canonicalPath;
    } else if (entry.role === 'hub') {
      // Demote existing hub
      const oldHub = registry.workspaces.find((w) => w.role === 'hub');
      if (oldHub) {
        oldHub.role = 'satellite';
      }
      registry.hubPath = canonicalPath;
    }

    registry.workspaces.push(fullEntry);
    registry.projectName = expectedProjectName ?? projectName;
    await this.saveRegistry(registry);
    return fullEntry;
  }

  /** Unregister a workspace by id */
  async unregister(id: string): Promise<void> {
    const registry = await this.loadRegistry();
    const entry = registry.workspaces.find((w) => w.id === id);
    if (!entry) throw new Error('Workspace not found: ' + id);
    if (entry.role === 'hub') {
      throw new Error('Cannot unregister the hub workspace. Change hub first.');
    }
    registry.workspaces = registry.workspaces.filter((w) => w.id !== id);
    await this.saveRegistry(registry);
  }

  /** List all registered workspaces */
  async list(): Promise<WorkspaceEntry[]> {
    const registry = await this.loadRegistry();
    return registry.workspaces;
  }

  /** Get the hub workspace */
  async getHub(): Promise<WorkspaceEntry | null> {
    const registry = await this.loadRegistry();
    return registry.workspaces.find((w) => w.role === 'hub') ?? null;
  }

  /**
   * Sync stable knowledge from hub to a satellite workspace.
   * Only stable knowledge entries are synced. Feature state (specs/) is never synced.
   */
  async syncToSatellite(
    satelliteId: string,
    satelliteStorage: StorageBackend,
  ): Promise<{ synced: number; skipped: number }> {
    const registry = await this.loadRegistry();
    const satellite = registry.workspaces.find((w) => w.id === satelliteId);
    if (!satellite) throw new Error('Satellite not found: ' + satelliteId);
    if (satellite.role === 'hub') throw new Error('Target is the hub, nothing to sync');

    const hub = await this.getHub();
    if (!hub) throw new Error('No hub workspace registered');

    // Read all knowledge from hub
    const knowledgeTypes = ['pitfall', 'rule', 'decision', 'code-map', 'architecture', 'preference', 'constitution'];
    let synced = 0;
    let skipped = 0;

    const hubStorage = new FilesystemStorage(hub.path);
    const pendingWrites: Array<{ path: string; content: string }> = [];
    const hubRedlines = await hubStorage.read('sovei-flow/project/governance/redlines.json');
    if (hubRedlines) {
      const redlines = RedlineSchema.array().parse(parseJson(hubRedlines, 'hub redlines.json'));
      // Scope filter: only push redlines that apply to the target branch.
      // Global redlines (branches absent/empty) always apply; branch-scoped
      // redlines apply only when the satellite's branch matches.
      const scoped = redlines.filter((redline) => this.redlineAppliesToBranch(redline, satellite.branch));
      pendingWrites.push({
        path: 'sovei-flow/project/governance/redlines.json',
        content: JSON.stringify(scoped, null, 2),
      });
    }
    for (const type of knowledgeTypes) {
      const hubContent = await hubStorage.read('sovei-flow/project/knowledge/' + type + '.json');
      if (!hubContent) continue;

      const entries = this.parseKnowledge(hubContent, `hub ${type}`);
      // Only sync stable entries
      const stableEntries = entries.filter((e) => e.lifecycle === 'stable');

      // Merge with satellite's existing entries
      const satContent = await satelliteStorage.read('sovei-flow/project/knowledge/' + type + '.json');
      const satEntries = satContent ? this.parseKnowledge(satContent, `satellite ${type}`) : [];

      // Merge: stable from hub + all local (candidate/pending/deprecated)
      const localOnly = satEntries.filter((e) => e.lifecycle !== 'stable');
      const stableIds = new Set(stableEntries.map((entry) => entry.id));
      const conflicts = localOnly.filter((entry) => stableIds.has(entry.id));
      if (conflicts.length) {
        throw new Error(`Knowledge conflict in ${type}: ${conflicts.map((entry) => entry.id).join(', ')}`);
      }
      const merged = [...stableEntries, ...localOnly];

      pendingWrites.push({
        path: 'sovei-flow/project/knowledge/' + type + '.json',
        content: JSON.stringify(merged, null, 2),
      });
      synced += stableEntries.length;
      skipped += entries.length - stableEntries.length;
    }
    for (const write of pendingWrites) await satelliteStorage.write(write.path, write.content);

    // Update lastSyncedAt
    satellite.lastSyncedAt = new Date().toISOString();
    await this.saveRegistry(registry);

    return { synced, skipped };
  }

  /**
   * Promote candidate knowledge from a satellite to the hub.
   * Does NOT auto-promote to stable. Creates candidate entries in the hub for review.
   */
  async promoteToHub(
    satelliteId: string,
    satelliteStorage: StorageBackend,
  ): Promise<{ promoted: number }> {
    const registry = await this.loadRegistry();
    const satellite = registry.workspaces.find((w) => w.id === satelliteId);
    if (!satellite) throw new Error('Satellite not found: ' + satelliteId);

    const knowledgeTypes = ['pitfall', 'rule', 'decision', 'code-map', 'architecture', 'preference', 'constitution'];
    const hub = await this.getHub();
    if (!hub) throw new Error('No hub workspace registered');
    const hubStorage = new FilesystemStorage(hub.path);
    let promoted = 0;
    const pendingWrites: Array<{ path: string; content: string }> = [];

    for (const type of knowledgeTypes) {
      const satContent = await satelliteStorage.read('sovei-flow/project/knowledge/' + type + '.json');
      if (!satContent) continue;

      const satEntries = this.parseKnowledge(satContent, `satellite ${type}`);
      // Find candidate entries that don't exist in hub
      const candidates = satEntries.filter((e) => e.lifecycle === 'candidate');

      if (candidates.length === 0) continue;

      const hubContent = await hubStorage.read('sovei-flow/project/knowledge/' + type + '.json');
      const hubEntries = hubContent ? this.parseKnowledge(hubContent, `hub ${type}`) : [];

      for (const candidate of candidates) {
        // Check if already exists in hub (by id)
        const existing = hubEntries.find((e) => e.id === candidate.id);
        if (existing && !this.sameKnowledge(existing, candidate)) {
          throw new Error(`Knowledge ID conflict in ${type}: ${candidate.id}`);
        }
        if (!existing) {
          // Add evidence that this came from a satellite
          const promotedCandidate = { ...candidate, evidence: [...candidate.evidence, {
            feature: 'workspace:' + satelliteId,
            date: new Date().toISOString(),
            description: 'Promoted from workspace ' + satellite.name,
            verified: false,
          }] };
          hubEntries.push(promotedCandidate);
          promoted++;
        }
      }

      pendingWrites.push({
        path: 'sovei-flow/project/knowledge/' + type + '.json',
        content: JSON.stringify(hubEntries, null, 2),
      });
    }

    for (const write of pendingWrites) await hubStorage.write(write.path, write.content);

    return { promoted };
  }

  private canonicalPath(path: string): string {
    return resolve(path).replace(/[\\/]+$/, '');
  }

  private pathKey(path: string): string {
    const canonical = this.canonicalPath(path);
    return process.platform === 'win32' ? canonical.toLowerCase() : canonical;
  }

  private sameKnowledge(left: any, right: any): boolean {
    return left.type === right.type
      && left.title === right.title
      && left.content === right.content
      && left.lifecycle === right.lifecycle;
  }

  /**
   * Decide whether a redline applies to a given branch for sync purposes.
   * - No `branches` or empty array => global redline, always applies.
   * - Otherwise applies only if `branches` includes the target branch.
   * A satellite with no known branch still receives global redlines only.
   */
  private redlineAppliesToBranch(redline: Redline, branch?: string): boolean {
    if (!redline.branches || redline.branches.length === 0) return true;
    if (!branch) return false;
    return redline.branches.includes(branch);
  }

  private parseKnowledge(content: string, source: string): KnowledgeEntry[] {
    try {
      return KnowledgeEntrySchema.array().parse(JSON.parse(content));
    } catch (error) {
      throw new Error(`Invalid knowledge data in ${source}: ${(error as Error).message}`);
    }
  }
}
