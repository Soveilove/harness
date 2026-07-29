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
import { join } from 'node:path';

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
  workspaces: WorkspaceEntry[];
}

const REGISTRY_FILE = 'harness/project/workspaces.json';

export class WorkspaceManager {
  constructor(private storage: StorageBackend) {}

  /** Load the workspace registry */
  async loadRegistry(): Promise<WorkspaceRegistry> {
    const content = await this.storage.read(REGISTRY_FILE);
    if (!content) {
      return { hubPath: '', workspaces: [] };
    }
    return JSON.parse(content) as WorkspaceRegistry;
  }

  /** Save the workspace registry */
  async saveRegistry(registry: WorkspaceRegistry): Promise<void> {
    await this.storage.write(REGISTRY_FILE, JSON.stringify(registry, null, 2));
  }

  /** Register a workspace. First workspace becomes the hub. */
  async register(entry: Omit<WorkspaceEntry, 'registeredAt'>): Promise<WorkspaceEntry> {
    const registry = await this.loadRegistry();

    // Check for duplicate path
    if (registry.workspaces.some((w) => w.path === entry.path)) {
      throw new Error('Workspace already registered at: ' + entry.path);
    }

    const fullEntry: WorkspaceEntry = {
      ...entry,
      registeredAt: new Date().toISOString(),
    };

    // First workspace is always the hub
    if (registry.workspaces.length === 0) {
      fullEntry.role = 'hub';
      registry.hubPath = entry.path;
    } else if (entry.role === 'hub') {
      // Demote existing hub
      const oldHub = registry.workspaces.find((w) => w.role === 'hub');
      if (oldHub) {
        oldHub.role = 'satellite';
      }
      registry.hubPath = entry.path;
    }

    registry.workspaces.push(fullEntry);
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

    for (const type of knowledgeTypes) {
      const hubContent = await this.storage.read('harness/project/knowledge/' + type + '.json');
      if (!hubContent) continue;

      const entries = JSON.parse(hubContent) as any[];
      // Only sync stable entries
      const stableEntries = entries.filter((e) => e.lifecycle === 'stable');

      // Merge with satellite's existing entries
      const satContent = await satelliteStorage.read('harness/project/knowledge/' + type + '.json');
      const satEntries = satContent ? JSON.parse(satContent) as any[] : [];

      // Merge: stable from hub + all local (candidate/pending/deprecated)
      const localOnly = satEntries.filter((e) => e.lifecycle !== 'stable');
      const merged = [...stableEntries, ...localOnly];

      await satelliteStorage.write(
        'harness/project/knowledge/' + type + '.json',
        JSON.stringify(merged, null, 2),
      );
      synced += stableEntries.length;
      skipped += entries.length - stableEntries.length;
    }

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
    let promoted = 0;

    for (const type of knowledgeTypes) {
      const satContent = await satelliteStorage.read('harness/project/knowledge/' + type + '.json');
      if (!satContent) continue;

      const satEntries = JSON.parse(satContent) as any[];
      // Find candidate entries that don't exist in hub
      const candidates = satEntries.filter((e) => e.lifecycle === 'candidate');

      if (candidates.length === 0) continue;

      const hubContent = await this.storage.read('harness/project/knowledge/' + type + '.json');
      const hubEntries = hubContent ? JSON.parse(hubContent) as any[] : [];

      for (const candidate of candidates) {
        // Check if already exists in hub (by id)
        if (!hubEntries.some((e) => e.id === candidate.id)) {
          // Add evidence that this came from a satellite
          candidate.evidence.push({
            feature: 'workspace:' + satelliteId,
            date: new Date().toISOString(),
            description: 'Promoted from workspace ' + satellite.name,
            verified: false,
          });
          hubEntries.push(candidate);
          promoted++;
        }
      }

      await this.storage.write(
        'harness/project/knowledge/' + type + '.json',
        JSON.stringify(hubEntries, null, 2),
      );
    }

    return { promoted };
  }
}
