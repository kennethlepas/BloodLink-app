import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { getUserChats } from '@/src/services/firebase/database';
import { Chat } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const shadow = (c = '#000', o = 0.08, r = 10, e = 3) =>
  Platform.select({
    web: { boxShadow: `0 2px ${r}px rgba(0,0,0,${o})` } as any,
    default: {
      shadowColor: c,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: o,
      shadowRadius: r,
      elevation: e
    },
  });

const ChatListScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const { colors, isDark } = useAppTheme();

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadChats(); }, [user]);

  const loadChats = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userChats = await getUserChats(user.id);
      setChats(userChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  };

  const getOtherParticipantName = (chat: Chat): string => {
    const otherParticipantId = chat.participants.find(id => id !== user?.id);
    return otherParticipantId ? chat.participantNames[otherParticipantId] : 'Unknown';
  };

  const getUnreadCount = (chat: Chat): number => {
    return user ? chat.unreadCount[user.id] || 0 : 0;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const ListHeader = () => (
    <View style={[st.header, { backgroundColor: '#075E54' }]}>
      <View style={st.headerRow}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Chats</Text>
        <View style={st.headerActions}>
          <TouchableOpacity style={st.headerIconBtn}>
            <Ionicons name="search" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={st.headerIconBtn}>
            <Ionicons name="ellipsis-vertical" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderChatItem = ({ item }: { item: Chat }) => {
    const otherParticipantName = getOtherParticipantName(item);
    const unreadCount = getUnreadCount(item);
    const hasUnread = unreadCount > 0;

    return (
      <TouchableOpacity
        style={[st.chatCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
        onPress={() => router.push(`/(shared)/chat?chatId=${item.id}` as any)}
        activeOpacity={0.6}
      >
        <View style={st.avatarWrap}>
          <View style={[st.avatar, { backgroundColor: '#128C7E' }]}>
            <Text style={st.avatarText}>
              {otherParticipantName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={st.chatContent}>
          <View style={st.chatHeader}>
            <Text
              style={[st.chatName, { color: isDark ? '#FFFFFF' : '#000000' }, hasUnread && st.chatNameUnread]}
              numberOfLines={1}
            >
              {otherParticipantName}
            </Text>
            <Text style={[st.chatTime, { color: hasUnread ? '#25D366' : '#8696A0' }]}>
              {formatTime(item.lastMessageTime)}
            </Text>
          </View>
          <View style={st.lastMessageRow}>
            <Text
              style={[st.lastMessage, { color: '#667781' }, hasUnread && { color: isDark ? '#FFFFFF' : '#000000', fontWeight: '500' }]}
              numberOfLines={1}
            >
              {item.lastMessage || 'Tap to start chatting'}
            </Text>
            {hasUnread && (
              <View style={st.unreadBadge}>
                <Text style={st.unreadCount}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[st.loadingText, { color: colors.textSecondary }]}>Loading chats...</Text>
        </View>
      );
    }
    return (
      <View style={st.emptyWrap}>
        <LinearGradient colors={isDark ? ['#1E293B', '#334155'] : ['#DBEAFE', '#EFF6FF']} style={st.emptyIconWrap}>
          <Ionicons name="chatbubbles-outline" size={46} color={colors.primary} />
        </LinearGradient>
        <Text style={[st.emptyTitle, { color: colors.text }]}>No Conversations Yet</Text>
        <Text style={[st.emptyText, { color: colors.textSecondary }]}>
          Connect with requesters to start chatting.
        </Text>
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[st.container, { backgroundColor: isDark ? '#000000' : '#F0F2F5' }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />

      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={st.listContent}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  container: { flex: 1 },

  // Header - WhatsApp Style
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Loading
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 60
  },
  loadingText: { fontSize: 15 },

  listContent: { paddingBottom: 20 },

  // Chat Card - WhatsApp Style
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 0.5,
    borderBottomColor: '#E9EDEF',
  },

  avatarWrap: {
    marginRight: 12
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  chatContent: { flex: 1, gap: 3 },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '400',
    flex: 1,
    marginRight: 8,
  },
  chatNameUnread: { fontWeight: '600' },
  chatTime: {
    fontSize: 12,
    fontWeight: '400',
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
    marginRight: 8,
  },

  // Empty State
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#E9EDEF',
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    color: '#000000',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    color: '#667781',
  },
});

export default ChatListScreen;
