/**
 * Network Monitor Service
 * Singleton that tracks online/offline state using @react-native-community/netinfo.
 * Provides both imperative API and a React hook for components.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type NetworkCallback = (isConnected: boolean) => void;

class NetworkMonitor {
    private static instance: NetworkMonitor;
    private connected: boolean = true;
    private listeners: Set<NetworkCallback> = new Set();
    private unsubscribeNetInfo: (() => void) | null = null;
    private initialized: boolean = false;

    private constructor() { }

    static getInstance(): NetworkMonitor {
        if (!NetworkMonitor.instance) {
            NetworkMonitor.instance = new NetworkMonitor();
        }
        return NetworkMonitor.instance;
    }

    /**
     * Initialize the network monitor. Call once on app startup.
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;

        // Get initial state
        try {
            const state = await NetInfo.fetch();
            this.connected = !!(state.isConnected && state.isInternetReachable !== false);
            console.log('[NetworkMonitor] Initial state:', this.connected ? 'online' : 'offline');
        } catch (error) {
            console.warn('[NetworkMonitor] Error fetching initial state:', error);
            this.connected = true; // Assume online if we can't determine
        }

        // Subscribe to changes
        this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
            const wasConnected = this.connected;
            this.connected = !!(state.isConnected && state.isInternetReachable !== false);

            if (wasConnected !== this.connected) {
                console.log('[NetworkMonitor] State changed:', this.connected ? 'online' : 'offline');
                this.notifyListeners();
            }
        });
    }

    /**
     * Check if device is currently online.
     */
    isOnline(): boolean {
        return this.connected;
    }

    /**
     * Subscribe to network state changes.
     * Returns an unsubscribe function.
     */
    subscribe(callback: NetworkCallback): () => void {
        this.listeners.add(callback);
        return () => {
            this.listeners.delete(callback);
        };
    }

    /**
     * Clean up resources.
     */
    destroy(): void {
        if (this.unsubscribeNetInfo) {
            this.unsubscribeNetInfo();
            this.unsubscribeNetInfo = null;
        }
        this.listeners.clear();
        this.initialized = false;
    }

    private notifyListeners(): void {
        this.listeners.forEach((cb) => {
            try {
                cb(this.connected);
            } catch (error) {
                console.warn('[NetworkMonitor] Listener error:', error);
            }
        });
    }
}

// Export singleton instance
export const networkMonitor = NetworkMonitor.getInstance();

// Convenience function
export const isOnline = (): boolean => networkMonitor.isOnline();
