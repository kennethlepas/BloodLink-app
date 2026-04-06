import { useUser } from '@/src/contexts/UserContext';
import { markNotificationAsRead } from '@/src/services/firebase/database';
import { db } from '@/src/services/firebase/firebase';
import { Notification } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const NotificationsScreen: React.FC = () => {
  const { user } = useUser();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Real-time listener for notifications
  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as Notification[];

        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.isRead).length);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to notifications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    // The onSnapshot listener will automatically update the data
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id);
      }

      // Navigate based on notification data or type
      const action = notification.data?.action;
      const type = notification.type;

      if (action === 'view_request' || type === 'blood_request' || type === 'donor_nearby' || type === 'hospital_broadcast') {
        if (user?.userType === 'donor') {
          router.push('/(donor)/requests' as any);
        } else {
          router.push('/(requester)/my-requests' as any);
        }
      } else if (action === 'open_chat' || type === 'new_message' || type === 'request_accepted') {
        if (notification.data?.chatId) {
          router.push(`/(shared)/chat/${notification.data.chatId}` as any);
        } else {
          router.push('/(shared)/chat-list' as any);
        }
      } else if (action === 'verify_donation' || type === 'verify_donation') {
        router.push('/(requester)/my-requests' as any);
      } else if (action === 'view_donation_history' || type === 'donation_verified') {
        router.push('/(donor)/donation-history' as any);
      } else if (action === 'open_donor_home' || type === 'donation_reminder') {
        router.push('/(donor)/index' as any);
      } else if (type === 'booking_confirmed' || type === 'booking_rejected' || type === 'booking_completed' || type === 'booking_fulfilled') {
        if (user?.userType === 'donor') {
          router.push('/(donor)/booking-status' as any);
        } else {
          router.push('/(requester)/my-requests' as any);
        }
      } else if (type === 'system_alert') {
        // Maybe show an alert or navigate to settings/info
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'blood_request':
        return 'water';
      case 'hospital_broadcast':
        return 'radio';
      case 'request_accepted':
        return 'checkmark-circle';
      case 'booking_confirmed':
        return 'calendar';
      case 'booking_rejected':
        return 'close-circle';
      case 'booking_completed':
      case 'booking_fulfilled':
        return 'trophy';
      case 'request_completed':
        return 'checkmark-done-circle';
      case 'verify_donation':
        return 'shield-checkmark';
      case 'donation_verified':
        return 'star';
      case 'donation_disputed':
        return 'warning';
      case 'new_message':
        return 'chatbubble';
      case 'donor_nearby':
        return 'location';
      case 'donation_reminder':
        return 'time';
      case 'system_alert':
        return 'information-circle';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'blood_request':
        return '#DC2626';
      case 'hospital_broadcast':
        return '#EA580C';
      case 'request_accepted':
        return '#16A34A';
      case 'booking_confirmed':
        return '#312E81';
      case 'booking_rejected':
        return '#DC2626';
      case 'booking_completed':
      case 'booking_fulfilled':
        return '#059669';
      case 'verify_donation':
        return '#2563EB';
      case 'donation_verified':
        return '#CA8A04';
      case 'donation_disputed':
        return '#EA580C';
      case 'new_message':
        return '#7C3AED';
      case 'donation_reminder':
        return '#0891B2';
      default:
        return '#6B7280';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: getNotificationColor(item.type) + '20' },
        ]}
      >
        <Ionicons
          name={getNotificationIcon(item.type) as any}
          size={24}
          color={getNotificationColor(item.type)}
        />
      </View>

      <View style={styles.textContainer}>
        <View style={styles.notificationHeader}>
          <Text
            style={[
              styles.notificationTitle,
              !item.isRead ? styles.unreadText : styles.readText
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text
          style={[
            styles.notificationMessage,
            !item.isRead ? styles.unreadMessage : styles.readMessage
          ]}
          numberOfLines={2}
        >
          {item.message}
        </Text>
        <View style={styles.notificationFooter}>
          <Text style={styles.notificationTime}>{formatTimestamp(item.timestamp)}</Text>
          <View style={styles.viewDetailsContainer}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={80} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyText}>
        We'll notify you when something important happens
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />

      {/* Header */}
      <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  notificationItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  unreadNotification: {
    backgroundColor: '#EFF6FF',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  unreadText: {
    color: '#111827', // Black for unread
  },
  readText: {
    color: '#9CA3AF', // Grey for read
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  unreadMessage: {
    color: '#4B5563', // Darker grey for unread messages
  },
  readMessage: {
    color: '#9CA3AF', // Light grey for read messages
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;