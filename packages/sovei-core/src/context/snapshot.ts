/**
 * Knowledge Snapshot & Version Tracking
 *
 * Records the generation chain that produced the current knowledge index,
 * so consumers can detect stale context without re-scanning.
 */

import { createHash } from 'node:crypto';
import type { StorageBackend } from '../storage/types.js';
import type { KnowledgeEntry } from '../knowledge/schemas.js';

export interface KnowledgeSnapshot {
  schemaVersion: 1;
  indexVersion: number;
  projectId: string;
  sourceRevision: string | null;
  sourceHash: string;
  engineVersion: string;
  scannerVersion: string;
  chunkerVersion: string;
  embeddingProvider: string | null;
  embeddingModel: string | null;
  embeddingDimensions: number | null;
  createdAt: string;
  entryCount: number;
}

export const SNAPSHOT_FILE = 'harness/project/knowledge/.snapshot.json';

/** Compute a deterministic content hash from knowledge entries. */
export function computeSourceHash(entries: KnowledgeEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  const hash = createHash('sha256');
  for (const entry of sorted) {
    hash.update(entry.id + '\0' + entry.type + '\0' + entry.title + '\0' + entry.content + '\0' + entry.lifecycle + '\0' + entry.updatedAt + '\n');
  }
  return hash.digest('hex');
}

/** Build a snapshot from current knowledge state. */
export function buildSnapshot(
  entries: KnowledgeEntry[],
  projectId: string,
  options: {
    engineVersion: string;
    scannerVersion: string;
    sourceRevision?: string | null;
    embeddingProvider?: string | null;
    embeddingModel?: string | null;
    embeddingDimensions?: number | null;
  },
): KnowledgeSnapshot {
  return {
    schemaVersion: 1,
    indexVersion: Date.now(),
    projectId,
    sourceRevision: options.sourceRevision ?? null,
    sourceHash: computeSourceHash(entries),
    engineVersion: options.engineVersion,
    scannerVersion: options.scannerVersion,
    chunkerVersion: 'plain-text-v1',
    embeddingProvider: options.embeddingProvider ?? null,
    embeddingModel: options.embeddingModel ?? null,
    embeddingDimensions: options.embeddingDimensions ?? null,
    createdAt: new Date().toISOString(),
    entryCount: entries.length,
  };
}

/** Persist snapshot to storage. */
export async function saveSnapshot(storage: StorageBackend, snapshot: KnowledgeSnapshot): Promise<void> {
  await storage.write(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));
}

/** Load a previously saved snapshot. Returns null if none exists. */
export async function loadSnapshot(storage: StorageBackend): Promise<KnowledgeSnapshot | null> {
  const content = await storage.read(SNAPSHOT_FILE);
  if (!content) return null;
  try {
    return JSON.parse(content) as KnowledgeSnapshot;
  } catch {
    return null;
  }
}

/** Check whether the current knowledge state is stale relative to a saved snapshot. */
export function isStale(currentEntries: KnowledgeEntry[], snapshot: KnowledgeSnapshot | null): boolean {
  if (!snapshot) return true;
  return computeSourceHash(currentEntries) !== snapshot.sourceHash;
}
