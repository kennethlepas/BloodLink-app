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

  useEffect(() => {
    loadChats();
  }, [user]);

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

    if (days === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const ListHeader = () => (
    <LinearGradient colors={[colors.primary, '#60A5FA']} style={st.header}>
      <View style={st.headerRow}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Messages</Text>
          <Text style={st.headerSub}>
            {chats.length} conversation{chats.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>
    </LinearGradient>
  );

  const renderChatItem = ({ item }: { item: Chat }) => {
    const otherParticipantName = getOtherParticipantName(item);
    const unreadCount = getUnreadCount(item);
    const hasUnread = unreadCount > 0;

    return (
      <TouchableOpacity
        style={[st.chatCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        onPress={() => router.push(`/(shared)/chat?chatId=${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={st.avatarWrap}>
          <LinearGradient
            colors={[colors.primary, '#60A5FA']}
            style={st.avatar}
          >
            <Text style={st.avatarText}>
              {otherParticipantName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          {hasUnread && (
            <View style={[st.unreadBadge, { backgroundColor: colors.danger, borderColor: colors.surface }]}>
              <Text style={st.unreadCount}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={st.chatContent}>
          <View style={st.chatHeader}>
            <Text
              style={[st.chatName, { color: colors.text }, hasUnread && st.chatNameUnread]}
              numberOfLines={1}
            >
              {otherParticipantName}
            </Text>
            <Text style={[st.chatTime, { color: colors.textSecondary }]}>{formatTime(item.lastMessageTime)}</Text>
          </View>
          <Text
            style={[st.lastMessage, { color: colors.textMuted }, hasUnread && { color: colors.text, fontWeight: '600' }]}
            numberOfLines={2}
          >
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
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
          When you accept a blood request or create one, you'll be able to chat here.
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
    <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

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

  // Header
  header: { paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16, borderRadius: 24, marginHorizontal: 16, marginTop: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  headerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1
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

  listContent: { paddingBottom: 40 },

  // Chat Card
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    ...shadow('#000', 0.06, 8, 3),
  },

  avatarWrap: {
    position: 'relative',
    marginRight: 12
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  chatContent: { flex: 1, gap: 4 },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  chatNameUnread: { fontWeight: '800' },
  chatTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    lineHeight: 19,
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
    marginBottom: 20
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20
  },
});

export default ChatListScreen;