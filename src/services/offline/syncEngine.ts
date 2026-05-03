/**
 * Sync Engine
 * Orchestrates syncing queued offline mutations when connectivity is restored.
 * Listens to the network monitor for reconnection events and processes
 * the sync queue in FIFO order.
 */

import { networkMonitor } from './networkMonitor';
import type { SyncQueueItem } from './syncQueue';
import * as syncQueue from './syncQueue';

// Import the ORIGINAL database functions for replaying mutations
import * as database from '../firebase/database';

type SyncStatusCallback = (status: SyncStatus) => void;

export interface SyncStatus {
    isSyncing: boolean;
    pendingCount: number;
    lastSyncTime: number | null;
    lastError: string | null;
    currentItem: string | null;
}

class SyncEngine {
    private static instance: SyncEngine;
    private syncing: boolean = false;
    private listeners: Set<SyncStatusCallback> = new Set();
    private unsubscribeNetwork: (() => void) | null = null;
    private status: SyncStatus = {
        isSyncing: false,
        pendingCount: 0,
        lastSyncTime: null,
        lastError: null,
        currentItem: null,
    };

    private constructor() { }

    static getInstance(): SyncEngine {
        if (!SyncEngine.instance) {
            SyncEngine.instance = new SyncEngine();
        }
        return SyncEngine.instance;
    }

    /**
     * Initialize the sync engine. Call once on app startup after networkMonitor.initialize().
     */
    initialize(): void {
        // Listen for network reconnection
        this.unsubscribeNetwork = networkMonitor.subscribe(async (isConnected) => {
            if (isConnected) {
                console.log('[SyncEngine] Network restored, starting sync...');
                await this.processQueue();
            }
        });

        // Also attempt sync on startup if online
        if (networkMonitor.isOnline()) {
            this.processQueue().catch((err) =>
                console.warn('[SyncEngine] Initial sync failed:', err)
            );
        }

        this.refreshPendingCount();
    }

    /**
     * Process all pending items in the sync queue.
     */
    async processQueue(): Promise<void> {
        if (this.syncing) {
            console.log('[SyncEngine] Already syncing, skipping...');
            return;
        }

        if (!networkMonitor.isOnline()) {
            console.log('[SyncEngine] Offline, skipping sync');
            return;
        }

        this.syncing = true;
        this.updateStatus({ isSyncing: true });

        try {
            const pending = await syncQueue.getPendingItems();
            console.log(`[SyncEngine] Processing ${pending.length} queued items...`);

            for (const item of pending) {
                if (!networkMonitor.isOnline()) {
                    console.log('[SyncEngine] Lost connectivity during sync, pausing');
                    break;
                }

                await this.processItem(item);
            }

            this.updateStatus({
                isSyncing: false,
                lastSyncTime: Date.now(),
                lastError: null,
                currentItem: null,
            });
        } catch (error: any) {
            console.error('[SyncEngine] Queue processing error:', error);
            this.updateStatus({
                isSyncing: false,
                lastError: error.message || 'Sync failed',
                currentItem: null,
            });
        } finally {
            this.syncing = false;
            await this.refreshPendingCount();
        }
    }

    /**
     * Process a single queue item by calling the original database function.
     */
    private async processItem(item: SyncQueueItem): Promise<void> {
        try {
            this.updateStatus({ currentItem: item.functionName });
            await syncQueue.markProcessing(item.id);

            // Get the function from the database module
            const fn = (database as any)[item.functionName];
            if (typeof fn !== 'function') {
                throw new Error(`Unknown database function: ${item.functionName}`);
            }

            // Replay the operation
            console.log(`[SyncEngine] Replaying: ${item.functionName}`);
            await fn(...item.args);

            // Mark as completed
            await syncQueue.markCompleted(item.id);
            console.log(`[SyncEngine] ✅ Synced: ${item.functionName} (${item.id})`);
        } catch (error: any) {
            console.error(`[SyncEngine] ❌ Failed to sync ${item.functionName}:`, error);

            // Check if it's a network error (retry later) or a data error (mark failed)
            const isNetworkError =
                error?.message?.includes('network') ||
                error?.message?.includes('offline') ||
                error?.code === 'unavailable';

            if (isNetworkError) {
                // Will retry when back online
                await syncQueue.markFailed(item.id, 'Network error — will retry');
            } else {
                await syncQueue.markFailed(item.id, error.message || 'Unknown error');
            }
        }
    }

    /**
     * Subscribe to sync status updates.
     */
    subscribe(callback: SyncStatusCallback): () => void {
        this.listeners.add(callback);
        // Immediately send current status
        callback(this.status);
        return () => this.listeners.delete(callback);
    }

    /**
     * Get current sync status.
     */
    getStatus(): SyncStatus {
        return { ...this.status };
    }

    /**
     * Force a sync attempt.
     */
    async forceSync(): Promise<void> {
        if (networkMonitor.isOnline()) {
            await this.processQueue();
        }
    }

    /**
     * Clean up resources.
     */
    destroy(): void {
        if (this.unsubscribeNetwork) {
            this.unsubscribeNetwork();
            this.unsubscribeNetwork = null;
        }
        this.listeners.clear();
    }

    private async refreshPendingCount(): Promise<void> {
        const count = await syncQueue.getPendingCount();
        this.updateStatus({ pendingCount: count });
    }

    private updateStatus(partial: Partial<SyncStatus>): void {
        this.status = { ...this.status, ...partial };
        this.listeners.forEach((cb) => {
            try {
                cb(this.status);
            } catch (err) {
                console.warn('[SyncEngine] Listener error:', err);
            }
        });
    }
}

// Export singleton
export const syncEngine = SyncEngine.getInstance();
