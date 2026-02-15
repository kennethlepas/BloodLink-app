import { useUser } from '@/src/contexts/UserContext';
import { db } from '@/src/services/firebase/firebase';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface NotificationBellProps {
  iconSize?: number;
  iconColor?: string;
  badgeColor?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  iconSize = 24,
  iconColor = '#000',
  badgeColor = '#DC2626',
}) => {
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    let unsubscribe: (() => void) | undefined;

    const setupListener = () => {
      try {
        // Query only by userId first, then filter isRead client-side
        // This avoids composite index issues on web
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', user.id)
        );

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            // Filter unread client-side for web compatibility
            const unreadDocs = snapshot.docs.filter(
              (doc) => doc.data().isRead === false
            );
            setUnreadCount(unreadDocs.length);
          },
          (error) => {
            console.error('Notification listener error:', error);
            setUnreadCount(0);
          }
        );
      } catch (error) {
        console.error('Failed to setup notification listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

  return (
    <View style={styles.bellContainer}>
      <Ionicons name="notifications-outline" size={iconSize} color={iconColor} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={[styles.badgeText, Platform.OS === 'web' && styles.badgeTextWeb]}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    // Web needs explicit zIndex to render above icon
    ...(Platform.OS === 'web' && { zIndex: 10 }),
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeTextWeb: {
    // lineHeight fix for web — without this badge text is vertically off
    lineHeight: 18,
  },
});