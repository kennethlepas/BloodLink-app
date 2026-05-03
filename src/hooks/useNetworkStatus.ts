/**
 * useNetworkStatus React Hook
 * Provides reactive network status for components.
 */

import { useEffect, useState } from 'react';
import { networkMonitor } from '../services/offline/networkMonitor';

export function useNetworkStatus() {
    const [isConnected, setIsConnected] = useState(networkMonitor.isOnline());

    useEffect(() => {
        const unsubscribe = networkMonitor.subscribe((connected) => {
            setIsConnected(connected);
        });
        return unsubscribe;
    }, []);

    return {
        isConnected,
        isOffline: !isConnected,
    };
}
