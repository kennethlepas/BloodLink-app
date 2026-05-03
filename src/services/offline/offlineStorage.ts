/**
 * Offline Storage Service
 * Structured AsyncStorage wrapper for local data persistence.
 * Stores collections and documents with timestamps for staleness detection.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = '@bloodlink_offline_';

interface StoredItem<T> {
    data: T;
    timestamp: number;
    version: number;
}

interface StoredCollection<T> {
    items: T[];
    timestamp: number;
    version: number;
}

/**
 * Save an entire collection locally.
 */
export const saveCollection = async <T>(
    collectionName: string,
    data: T[]
): Promise<void> => {
    try {
        const stored: StoredCollection<T> = {
            items: data,
            timestamp: Date.now(),
            version: 1,
        };
        await AsyncStorage.setItem(
            `${STORAGE_PREFIX}collection_${collectionName}`,
            JSON.stringify(stored)
        );
    } catch (error) {
        console.warn(`[OfflineStorage] Error saving collection ${collectionName}:`, error);
    }
};

/**
 * Get entire cached collection.
 */
export const getCollection = async <T>(
    collectionName: string
): Promise<T[] | null> => {
    try {
        const raw = await AsyncStorage.getItem(
            `${STORAGE_PREFIX}collection_${collectionName}`
        );
        if (!raw) return null;
        const stored: StoredCollection<T> = JSON.parse(raw);
        return stored.items;
    } catch (error) {
        console.warn(`[OfflineStorage] Error reading collection ${collectionName}:`, error);
        return null;
    }
};

/**
 * Get collection with metadata (timestamp, version).
 */
export const getCollectionWithMeta = async <T>(
    collectionName: string
): Promise<StoredCollection<T> | null> => {
    try {
        const raw = await AsyncStorage.getItem(
            `${STORAGE_PREFIX}collection_${collectionName}`
        );
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        console.warn(`[OfflineStorage] Error reading collection meta ${collectionName}:`, error);
        return null;
    }
};

/**
 * Save a single document to local storage.
 */
export const saveDocument = async <T>(
    collectionName: string,
    docId: string,
    data: T
): Promise<void> => {
    try {
        const stored: StoredItem<T> = {
            data,
            timestamp: Date.now(),
            version: 1,
        };
        await AsyncStorage.setItem(
            `${STORAGE_PREFIX}doc_${collectionName}_${docId}`,
            JSON.stringify(stored)
        );
    } catch (error) {
        console.warn(`[OfflineStorage] Error saving document ${collectionName}/${docId}:`, error);
    }
};

/**
 * Get a single cached document.
 */
export const getDocument = async <T>(
    collectionName: string,
    docId: string
): Promise<T | null> => {
    try {
        const raw = await AsyncStorage.getItem(
            `${STORAGE_PREFIX}doc_${collectionName}_${docId}`
        );
        if (!raw) return null;
        const stored: StoredItem<T> = JSON.parse(raw);
        return stored.data;
    } catch (error) {
        console.warn(`[OfflineStorage] Error reading document ${collectionName}/${docId}:`, error);
        return null;
    }
};

/**
 * Remove a single cached document.
 */
export const removeDocument = async (
    collectionName: string,
    docId: string
): Promise<void> => {
    try {
        await AsyncStorage.removeItem(
            `${STORAGE_PREFIX}doc_${collectionName}_${docId}`
        );
    } catch (error) {
        console.warn(`[OfflineStorage] Error removing document ${collectionName}/${docId}:`, error);
    }
};

/**
 * Query a cached collection using a filter function.
 */
export const queryCollection = async <T>(
    collectionName: string,
    filterFn: (item: T) => boolean
): Promise<T[]> => {
    const items = await getCollection<T>(collectionName);
    if (!items) return [];
    return items.filter(filterFn);
};

/**
 * Update a document within a cached collection.
 * If the document is found by matchFn, it is replaced; otherwise the new data is appended.
 */
export const upsertInCollection = async <T>(
    collectionName: string,
    matchFn: (item: T) => boolean,
    newData: T
): Promise<void> => {
    const items = await getCollection<T>(collectionName);
    if (!items) {
        await saveCollection(collectionName, [newData]);
        return;
    }

    const index = items.findIndex(matchFn);
    if (index >= 0) {
        items[index] = newData;
    } else {
        items.push(newData);
    }
    await saveCollection(collectionName, items);
};

/**
 * Remove a document from a cached collection.
 */
export const removeFromCollection = async <T>(
    collectionName: string,
    matchFn: (item: T) => boolean
): Promise<void> => {
    const items = await getCollection<T>(collectionName);
    if (!items) return;
    const filtered = items.filter((item) => !matchFn(item));
    await saveCollection(collectionName, filtered);
};

/**
 * Check if a collection is stale (older than maxAge milliseconds).
 */
export const isStale = async (
    collectionName: string,
    maxAgeMs: number = 5 * 60 * 1000 // Default 5 minutes
): Promise<boolean> => {
    const meta = await getCollectionWithMeta(collectionName);
    if (!meta) return true;
    return Date.now() - meta.timestamp > maxAgeMs;
};

/**
 * Clear all offline storage data.
 */
export const clearAllOfflineData = async (): Promise<void> => {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const offlineKeys = allKeys.filter((key) => key.startsWith(STORAGE_PREFIX));
        if (offlineKeys.length > 0) {
            await AsyncStorage.multiRemove(offlineKeys);
        }
        console.log(`[OfflineStorage] Cleared ${offlineKeys.length} items`);
    } catch (error) {
        console.warn('[OfflineStorage] Error clearing all offline data:', error);
    }
};

/**
 * Generate a temporary ID for offline-created documents.
 */
export const generateTempId = (): string => {
    return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};
