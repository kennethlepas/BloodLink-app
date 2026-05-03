/**
 * Sync Queue Service
 * Persistent queue for offline mutations. Stored in AsyncStorage so it
 * survives app restarts. When connectivity is restored, the queue is
 * replayed against Firebase in FIFO order.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_QUEUE_KEY = '@bloodlink_sync_queue';
const MAX_RETRIES = 5;

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
    id: string;
    operation: SyncOperation;
    collection: string;
    docId?: string;        // For update/delete operations
    tempId?: string;       // For create operations (local temp ID)
    data?: any;            // The payload
    timestamp: number;     // When the operation was enqueued
    retryCount: number;
    status: 'pending' | 'processing' | 'failed' | 'completed';
    error?: string;
    /** The original function name from database.ts to call on sync */
    functionName: string;
    /** The original arguments (serializable) */
    args: any[];
}

/**
 * Load the full queue from storage.
 */
const loadQueue = async (): Promise<SyncQueueItem[]> => {
    try {
        const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (error) {
        console.warn('[SyncQueue] Error loading queue:', error);
        return [];
    }
};

/**
 * Persist the queue to storage.
 */
const saveQueue = async (queue: SyncQueueItem[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
        console.warn('[SyncQueue] Error saving queue:', error);
    }
};

/**
 * Generate a unique queue item ID.
 */
const generateQueueId = (): string => {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Add a mutation to the sync queue.
 */
export const enqueue = async (
    item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>
): Promise<string> => {
    const queue = await loadQueue();
    const newItem: SyncQueueItem = {
        ...item,
        id: generateQueueId(),
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
    };
    queue.push(newItem);
    await saveQueue(queue);
    console.log(`[SyncQueue] Enqueued: ${newItem.functionName} (${newItem.id})`);
    return newItem.id;
};

/**
 * Get all pending items in the queue (FIFO order).
 */
export const getPendingItems = async (): Promise<SyncQueueItem[]> => {
    const queue = await loadQueue();
    return queue
        .filter((item) => item.status === 'pending' || item.status === 'failed')
        .sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Get the count of pending items.
 */
export const getPendingCount = async (): Promise<number> => {
    const pending = await getPendingItems();
    return pending.length;
};

/**
 * Mark an item as processing.
 */
export const markProcessing = async (itemId: string): Promise<void> => {
    const queue = await loadQueue();
    const item = queue.find((i) => i.id === itemId);
    if (item) {
        item.status = 'processing';
        await saveQueue(queue);
    }
};

/**
 * Mark an item as completed and remove it.
 */
export const markCompleted = async (itemId: string): Promise<void> => {
    const queue = await loadQueue();
    const filtered = queue.filter((i) => i.id !== itemId);
    await saveQueue(filtered);
    console.log(`[SyncQueue] Completed and removed: ${itemId}`);
};

/**
 * Mark an item as failed with an error. Increment retry count.
 */
export const markFailed = async (itemId: string, error: string): Promise<void> => {
    const queue = await loadQueue();
    const item = queue.find((i) => i.id === itemId);
    if (item) {
        item.retryCount += 1;
        item.error = error;

        if (item.retryCount >= MAX_RETRIES) {
            // Move to permanent failure — will need manual intervention
            item.status = 'failed';
            console.warn(`[SyncQueue] Item ${itemId} exceeded max retries, marked as permanently failed`);
        } else {
            item.status = 'pending'; // Will retry on next sync
            console.warn(`[SyncQueue] Item ${itemId} failed (retry ${item.retryCount}/${MAX_RETRIES}): ${error}`);
        }
        await saveQueue(queue);
    }
};

/**
 * Remove a specific item from the queue.
 */
export const removeItem = async (itemId: string): Promise<void> => {
    const queue = await loadQueue();
    const filtered = queue.filter((i) => i.id !== itemId);
    await saveQueue(filtered);
};

/**
 * Clear the entire sync queue.
 */
export const clearQueue = async (): Promise<void> => {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    console.log('[SyncQueue] Queue cleared');
};

/**
 * Get all failed items (for user review / retry).
 */
export const getFailedItems = async (): Promise<SyncQueueItem[]> => {
    const queue = await loadQueue();
    return queue.filter((item) => item.status === 'failed' && item.retryCount >= MAX_RETRIES);
};

/**
 * Reset failed items back to pending for retry.
 */
export const retryFailedItems = async (): Promise<number> => {
    const queue = await loadQueue();
    let count = 0;
    queue.forEach((item) => {
        if (item.status === 'failed') {
            item.status = 'pending';
            item.retryCount = 0;
            item.error = undefined;
            count++;
        }
    });
    await saveQueue(queue);
    console.log(`[SyncQueue] Reset ${count} failed items for retry`);
    return count;
};
