/**
 * OfflineIndicator Component
 * Floating banner that appears when the device is offline.
 * Shows pending sync count and animates in/out.
 */

import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { useSyncStatus } from '@/src/hooks/useSyncStatus';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const OfflineIndicator: React.FC = () => {
    const { isOffline } = useNetworkStatus();
    const { pendingCount, isSyncing } = useSyncStatus();
    const slideAnim = useRef(new Animated.Value(-60)).current;

    const [dismissed, setDismissed] = React.useState(false);

    useEffect(() => {
        if (!isOffline) {
            setDismissed(false); // Reset when coming online
        }
    }, [isOffline]);

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: (isOffline && !dismissed) ? 0 : -60,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
        }).start();
    }, [isOffline, dismissed]);

    // Also show a brief syncing indicator when coming back online
    const showSyncing = !isOffline && isSyncing;

    if ((!isOffline && !showSyncing) || dismissed) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] },
                showSyncing && styles.syncingContainer,
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setDismissed(true)}
                style={styles.content}
            >
                <Ionicons
                    name={showSyncing ? 'sync' : 'cloud-offline'}
                    size={16}
                    color="#FFFFFF"
                    style={showSyncing ? styles.spinIcon : undefined}
                />
                <Text style={styles.text}>
                    {showSyncing
                        ? 'Syncing changes...'
                        : 'Offline - Tap to dismiss'}
                </Text>
                {pendingCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{pendingCount}</Text>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 45, // Below status bar
        alignSelf: 'center',
        backgroundColor: '#DC2626',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        zIndex: 9999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    syncingContainer: {
        backgroundColor: '#2563EB',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    badge: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        marginLeft: 2,
    },
    badgeText: {
        color: '#DC2626',
        fontSize: 10,
        fontWeight: '800',
    },
    spinIcon: {},
});

export default OfflineIndicator;
