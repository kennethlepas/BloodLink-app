import { useUser } from '@/src/contexts/UserContext';
import { db } from '@/src/services/firebase/firebase';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
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

  // Real-time listener for unread notifications count
  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setUnreadCount(snapshot.size);
      },
      (error) => {
        console.error('Error listening to notifications:', error);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  return (
    <View style={styles.bellContainer}>
      <Ionicons name="notifications-outline" size={iconSize} color={iconColor} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>
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
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});