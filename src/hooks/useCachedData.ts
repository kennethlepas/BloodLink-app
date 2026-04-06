import { useCallback, useEffect, useState } from 'react';
import { getFromCache, saveToCache } from '../utils/cacheHelper';

interface useCachedDataOptions<T> {
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
    cacheKey?: string;
}

/**
 * Hook to manage data with Stale-While-Revalidate caching pattern
 */
export function useCachedData<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: useCachedDataOptions<T> = {}
) {
    const { enabled = true, onSuccess, onError, cacheKey } = options;
    const finalKey = cacheKey || key;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);

    const loadData = useCallback(async (isManualRefresh = false) => {
        if (!enabled && !isManualRefresh) return;

        try {
            if (isManualRefresh) {
                setRefreshing(true);
            } else {
                // Only show initial loading if we don't have data yet
                if (!data) setLoading(true);
            }

            // Step 1: Try to get from cache first
            if (!isManualRefresh && !data) {
                const cached = await getFromCache<T>(finalKey);
                if (cached) {
                    setData(cached);
                    setLoading(false); // We have something to show!
                }
            }

            // Step 2: Fetch fresh data from network
            const freshData = await fetchFn();

            // Step 3: Update state and cache
            setData(freshData);
            await saveToCache(finalKey, freshData);

            if (onSuccess) onSuccess(freshData);
            setError(null);
        } catch (err) {
            console.error(`[useCachedData] Error for key ${finalKey}:`, err);
            setError(err);
            if (onError) onError(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [finalKey, fetchFn, enabled, onSuccess, onError, data]);

    useEffect(() => {
        loadData();
    }, [finalKey, enabled]); // Only reload if key or enabled state changes

    return {
        data,
        loading,
        refreshing,
        error,
        refresh: () => loadData(true),
        setData,
    };
}
