import { useUser } from '@/src/contexts/UserContext';
import { deleteChat, getUserChats } from '@/src/services/firebase/database';
import { Chat } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Samsung Messages Light / Warm Beige Theme ───────────────────────────────
// Screenshot 1 & 2: warm cream bg, dark text, peach message bubbles, amber accent
const C = {
  bg: '#F2EFE9',            // warm cream background
  card: '#FFFFFF',          // white rows
  cardUnread: '#FFF8F2',    // very light peach for unread

  // Blue header
  headerBg: '#3B82F6',
  headerDark: '#0A2647',

  // Blue accent
  accent: '#3B82F6',
  accentLight: '#60A5FA',
  accentBg: '#EFF6FF',

  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',

  avatarBg: '#E8E4DE',
  avatarBorder: '#D5CFC6',
  avatarIcon: '#AAAAAA',

  border: '#E8E4DE',
  divider: '#EDEBE6',

  danger: '#E53935',
  badge: '#DC2626',
  badgeText: '#000000',
};

const ChatListScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [user])
  );

  const loadChats = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userChats = await getUserChats(user.id);
      const unique = deduplicateChats(userChats, user.id);
      setChats(
        unique.sort(
          (a, b) =>
            new Date(b.lastMessageTime).getTime() -
            new Date(a.lastMessageTime).getTime()
        )
      );
    } catch (err) {
      console.error('Error loading chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const deduplicateChats = (chats: Chat[], uid: string): Chat[] => {
    const map = new Map<string, Chat>();
    chats.forEach(c => {
      const other = c.participants.find(id => id !== uid);
      if (!other) return;
      const existing = map.get(other);
      if (!existing || new Date(c.lastMessageTime) > new Date(existing.lastMessageTime)) {
        map.set(other, c);
      }
    });
    return Array.from(map.values());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  };

  const getOtherId = (chat: Chat) =>
    chat.participants.find(id => id !== user?.id) || null;

  const getOtherName = (chat: Chat) => {
    const id = getOtherId(chat);
    return id ? chat.participantNames[id] : 'Unknown';
  };

  const getUnread = (chat: Chat) =>
    user ? chat.unreadCount[user.id] || 0 : 0;

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (days === 0) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ── Single delete ──
  const confirmDelete = (chatId: string, name: string) => {
    Alert.alert(
      'Delete Conversation',
      `Delete your conversation with ${name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(chatId);
            try {
              await deleteChat(chatId);
              setChats(prev => prev.filter(c => c.id !== chatId));
            } catch {
              Alert.alert('Error', 'Failed to delete conversation.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Bulk delete ──
  const confirmDeleteSelected = () => {
    if (!selectedChats.size) return;
    Alert.alert(
      'Delete Conversations',
      `Delete ${selectedChats.size} conversation${selectedChats.size > 1 ? 's' : ''}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => { setSelectionMode(false); setSelectedChats(new Set()); },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(Array.from(selectedChats).map(id => deleteChat(id)));
              setChats(prev => prev.filter(c => !selectedChats.has(c.id)));
            } catch {
              Alert.alert('Error', 'Some conversations could not be deleted.');
            } finally {
              setSelectionMode(false);
              setSelectedChats(new Set());
            }
          },
        },
      ]
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedChats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  // ── Navigate to new chat ──
  const goToNewChat = () => router.push('/(shared)/contact-picker' as any);

  const renderItem = ({ item }: { item: Chat }) => {
    const name = getOtherName(item);
    const unread = getUnread(item);
    const hasUnread = unread > 0;
    const otherId = getOtherId(item);
    const isSelected = selectedChats.has(item.id);
    const isDeleting = deletingId === item.id;

    const onPress = () => {
      if (selectionMode) { toggleSelect(item.id); return; }
      let type = item.participantTypes?.[otherId || ''] || 'user';
      if (type === 'user') {
        const n = name.toLowerCase();
        if (n.includes('hospital') || n.includes('blood bank') || n.includes('clinic')) type = 'hospital';
      }
      router.push({
        pathname: '/(shared)/chat' as any,
        params: {
          chatId: item.id,
          recipientId: otherId || '',
          recipientName: name,
          recipientType: type,
          chatRole: item.chatRole || user?.userType || '',
        },
      });
    };

    return (
      <TouchableOpacity
        style={[
          styles.chatRow,
          hasUnread && styles.chatRowUnread,
          isSelected && styles.chatRowSelected,
        ]}
        onPress={onPress}
        onLongPress={() => { setSelectionMode(true); toggleSelect(item.id); }}
        activeOpacity={0.65}
      >
        {/* Checkbox (selection mode) */}
        {selectionMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
            {isSelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
          </View>
        )}

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color={C.avatarIcon} />
          </View>
          {hasUnread && !selectionMode && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.infoTop}>
            <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.time, hasUnread && styles.timeUnread]}>
              {item.lastMessageTime ? formatTime(item.lastMessageTime) : ''}
            </Text>
          </View>
          <View style={styles.infoBottom}>
            <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
              {item.lastMessage || 'No messages yet'}
            </Text>
            {/* Unread orange dot like Samsung Messages */}
            {hasUnread && !selectionMode && (
              <View style={styles.unreadDot} />
            )}
          </View>
        </View>

        {/* Trash icon (always visible, right side) */}
        {!selectionMode && (
          isDeleting
            ? <ActivityIndicator size="small" color={C.danger} style={styles.trashBtn} />
            : (
              <TouchableOpacity
                style={styles.trashBtn}
                onPress={() => confirmDelete(item.id, name)}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color="#BBBBBB" />
              </TouchableOpacity>
            )
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="chatbubbles-outline" size={50} color={C.accent} />
      </View>
      <Text style={styles.emptyTitle}>No Messages Yet</Text>
      <Text style={styles.emptyDesc}>Start a conversation with hospitals or donors</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={goToNewChat}>
        <Ionicons name="create-outline" size={17} color="#FFF" />
        <Text style={styles.emptyBtnText}>New Message</Text>
      </TouchableOpacity>
    </View>
  );

  const sorted = useMemo(() =>
    [...chats]
      .filter(c => getOtherName(c).toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) =>
        (b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0) -
        (a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0)
      ), [chats, searchQuery]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.headerDark} />

      {/* ── Header ── */}
      {selectionMode ? (
        <View style={[styles.header, { backgroundColor: '#333333' }]}>
          <TouchableOpacity
            style={styles.hBtn}
            onPress={() => { setSelectionMode(false); setSelectedChats(new Set()); }}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.hTitle}>{selectedChats.size} selected</Text>
          <TouchableOpacity
            style={[styles.hBtn, !selectedChats.size && { opacity: 0.4 }]}
            onPress={confirmDeleteSelected}
            disabled={!selectedChats.size}
          >
            <Ionicons name="trash-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.header}>
          <TouchableOpacity style={styles.hBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.hTitle}>Messages</Text>
          <View style={styles.hActions}>
            <TouchableOpacity style={styles.hBtn}>
              <Ionicons name="search-outline" size={22} color="#FFF" />
            </TouchableOpacity>
            {/* ── Plus / New chat button ── */}
            <TouchableOpacity style={styles.hBtn} onPress={goToNewChat}>
              <Ionicons name="create-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Tabs (All + Plus) ── */}
      <View style={styles.tabs}>
        <View style={styles.tabActive}>
          <Text style={styles.tabActiveText}>All</Text>
        </View>
        {/* Tapping + opens new chat picker */}
        <TouchableOpacity style={styles.tabPlus} onPress={goToNewChat}>
          <Ionicons name="add" size={20} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBarBox}>
        <Ionicons name="search" size={16} color={C.textSecondary} />
        <TextInput
          placeholder="Search conversations..."
          style={styles.searchBarInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={C.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          renderItem={renderItem}
          keyExtractor={item => getOtherId(item) || item.id}
          contentContainerStyle={sorted.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.accent]}
              tintColor={C.accent}
              progressBackgroundColor={C.card}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── FAB ── */}
      {!selectionMode && (
        <TouchableOpacity style={styles.fab} onPress={goToNewChat} activeOpacity={0.85}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.headerBg,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  hBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  hTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  hActions: { flexDirection: 'row' },

  // Tabs
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  tabActive: {
    paddingBottom: 6,
    borderBottomWidth: 2.5,
    borderBottomColor: C.accent,
  },
  tabActiveText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.accent,
  },
  tabPlus: {
    paddingBottom: 4,
  },

  // Chat rows
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: C.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  chatRowUnread: { backgroundColor: C.cardUnread },
  chatRowSelected: { backgroundColor: '#FFF3E0' },

  // Checkbox
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxOn: {
    backgroundColor: C.accentLight,
    borderColor: C.accentLight,
  },

  // Avatar
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.avatarBg,
    borderWidth: 1,
    borderColor: C.avatarBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.badge,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: C.card,
  },
  badgeText: { fontSize: 10, fontWeight: '900', color: C.badgeText },

  // Info
  info: { flex: 1, gap: 3 },
  infoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  nameUnread: { fontWeight: '800' },
  time: { fontSize: 12, color: C.textTertiary },
  timeUnread: { color: C.accent, fontWeight: '600' },
  infoBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    fontSize: 13,
    color: C.textSecondary,
    flex: 1,
  },
  previewUnread: { color: C.textPrimary, fontWeight: '500' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.badge,
    marginLeft: 6,
  },

  // Trash
  trashBtn: { padding: 6, marginLeft: 4 },

  // Loading
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: C.textSecondary },

  // Empty
  emptyList: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.accentBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.headerBg,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchBarInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: C.textPrimary,
  },
});

export default ChatListScreen;