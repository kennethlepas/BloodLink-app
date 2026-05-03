/**
 * useSyncStatus React Hook
 * Provides reactive sync engine status for components.
 */

import { useEffect, useState } from 'react';
import { syncEngine, SyncStatus } from '../services/offline/syncEngine';

export function useSyncStatus() {
    const [status, setStatus] = useState<SyncStatus>({
        isSyncing: false,
        pendingCount: 0,
        lastSyncTime: null,
        lastError: null,
        currentItem: null,
    });

    useEffect(() => {
        const unsubscribe = syncEngine.subscribe((newStatus) => {
            setStatus(newStatus);
        });
        return unsubscribe;
    }, []);

    return status;
}
