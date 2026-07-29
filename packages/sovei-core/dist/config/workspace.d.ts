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
export interface WorkspaceEntry {
    id: string;
    name: string;
    path: string;
    branch?: string;
    role: 'hub' | 'satellite';
    registeredAt: string;
    lastSyncedAt?: string;
}
export interface WorkspaceRegistry {
    hubPath: string;
    workspaces: WorkspaceEntry[];
}
export declare class WorkspaceManager {
    private storage;
    constructor(storage: StorageBackend);
    /** Load the workspace registry */
    loadRegistry(): Promise<WorkspaceRegistry>;
    /** Save the workspace registry */
    saveRegistry(registry: WorkspaceRegistry): Promise<void>;
    /** Register a workspace. First workspace becomes the hub. */
    register(entry: Omit<WorkspaceEntry, 'registeredAt'>): Promise<WorkspaceEntry>;
    /** Unregister a workspace by id */
    unregister(id: string): Promise<void>;
    /** List all registered workspaces */
    list(): Promise<WorkspaceEntry[]>;
    /** Get the hub workspace */
    getHub(): Promise<WorkspaceEntry | null>;
    /**
     * Sync stable knowledge from hub to a satellite workspace.
     * Only stable knowledge entries are synced. Feature state (specs/) is never synced.
     */
    syncToSatellite(satelliteId: string, satelliteStorage: StorageBackend): Promise<{
        synced: number;
        skipped: number;
    }>;
    /**
     * Promote candidate knowledge from a satellite to the hub.
     * Does NOT auto-promote to stable. Creates candidate entries in the hub for review.
     */
    promoteToHub(satelliteId: string, satelliteStorage: StorageBackend): Promise<{
        promoted: number;
    }>;
}
//# sourceMappingURL=workspace.d.ts.map