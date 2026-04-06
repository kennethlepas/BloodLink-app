import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@bloodlink_cache_';

interface CacheItem<T> {
    data: T;
    timestamp: number;
}

/**
 * Saves data to AsyncStorage with a timestamp
 */
export const saveToCache = async <T>(key: string, data: T): Promise<void> => {
    try {
        const item: CacheItem<T> = {
            data,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item));
    } catch (error) {
        console.error(`[CacheHelper] Error saving to cache for key ${key}:`, error);
    }
};

/**
 * Retrieves data from AsyncStorage if it exists
 */
export const getFromCache = async <T>(key: string): Promise<T | null> => {
    try {
        const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!cached) return null;

        const item: CacheItem<T> = JSON.parse(cached);
        return item.data;
    } catch (error) {
        console.error(`[CacheHelper] Error getting from cache for key ${key}:`, error);
        return null;
    }
};

/**
 * Removes a specific item from cache
 */
export const removeFromCache = async (key: string): Promise<void> => {
    try {
        await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
        console.error(`[CacheHelper] Error removing from cache for key ${key}:`, error);
    }
};

/**
 * Clears all bloodlink related cache
 */
export const clearAllCache = async (): Promise<void> => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
        if (cacheKeys.length > 0) {
            await AsyncStorage.multiRemove(cacheKeys);
        }
    } catch (error) {
        console.error('[CacheHelper] Error clearing all cache:', error);
    }
};
