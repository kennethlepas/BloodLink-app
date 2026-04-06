import { ChatBubble } from '@/src/components/chat/ChatBubble';
import { ChatInput } from '@/src/components/chat/ChatInput';
import { useUser } from '@/src/contexts/UserContext';
import {
  deleteChat,
  getChatById,
  getChatMessages,
  getOrCreateChat,
  markMessagesAsRead,
  patchChatParticipantTypes,
  sendMessage,
  subscribeToChatMessages,
} from '@/src/services/firebase/database';
import { Chat, ChatMessage } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Samsung Messages Light / Warm Theme ─────────────────────────────────────
// Chat screen: warm off-white bg, peach sent bubbles (left), white received (right)
const C = {
  // Chat background — very light warm grey, like the MPESA thread
  chatBg: '#F2EFE9',

  // Header — dark warm grey/brown (matches KCB header in screenshots)
  headerBg: '#2C2418',
  headerText: '#FFFFFF',
  headerSub: 'rgba(255,255,255,0.65)',

  // Message bubbles
  bubbleSent: '#F5DFC0',       // peach/salmon — matches MPESA bubbles
  bubbleSentText: '#2C1A00',   // dark warm brown text
  bubbleReceived: '#FFFFFF',   // white for received
  bubbleReceivedText: '#1A1A1A',

  // Timestamp text
  timeText: '#A09080',

  // Input bar
  inputBg: '#FFFFFF',
  inputBorder: '#E0DDD8',
  inputText: '#1A1A1A',

  // Accent
  accent: '#C67C2A',
  accentLight: '#F5A623',

  textSecondary: '#888888',
};

const ChatScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const params = useLocalSearchParams<{
    chatId: string;
    recipientId?: string;
    recipientName?: string;
    recipientType?: string;
    chatRole?: 'donor' | 'requester';
    referralId?: string;
  }>();
  const flatListRef = useRef<FlatList>(null);

  const [chatId, setChatId] = useState<string | null>(params.chatId || null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!user) return;

    const initChat = async () => {
      let activeId = chatId;

      if (!activeId && params.recipientId) {
        try {
          setLoading(true);
          activeId = await getOrCreateChat(
            user.id,
            `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            params.recipientId,
            params.recipientName || 'Hospital',
            undefined,
            params.referralId,
            params.recipientType
              ? { [params.recipientId]: params.recipientType as 'hospital' | 'user' }
              : undefined,
            params.chatRole as 'donor' | 'requester'
          );
          setChatId(activeId);
        } catch {
          Alert.alert('Error', 'Failed to initialize chat.');
          setLoading(false);
          return;
        }
      }

      if (!activeId) { setLoading(false); return; }

      const chatData = await loadChat(activeId);
      await loadMessages(activeId);

      // Backfill participantTypes
      if (chatData && params.recipientId && params.recipientType) {
        const existing = chatData.participantTypes?.[params.recipientId];
        if (!existing || existing !== params.recipientType) {
          try {
            await patchChatParticipantTypes(
              activeId,
              params.recipientId,
              params.recipientType as 'hospital' | 'user'
            );
          } catch (e) {
            console.warn('Could not backfill participantTypes:', e);
          }
        }
      }

      const unsub = subscribeToChatMessages(activeId, newMsgs => {
        setMessages(newMsgs);
        if (activeId && activeId !== 'undefined') {
          markMessagesAsRead(activeId as string, user.id);
        }
      });

      return unsub;
    };

    const p = initChat();
    return () => { p.then(fn => fn?.()); };
  }, [chatId, params.recipientId, user]);

  const loadChat = async (id: string): Promise<Chat | null> => {
    try {
      const data = await getChatById(id);
      setChat(data);
      return data;
    } catch {
      Alert.alert('Error', 'Failed to load chat.');
      return null;
    }
  };

  const loadMessages = async (id: string) => {
    if (!id || id === 'undefined') return;
    try {
      setLoading(true);
      const msgs = await getChatMessages(id);
      setMessages(msgs);
      if (user) await markMessagesAsRead(id, user.id);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (text: string) => {
    if (!user || !chat || !chatId) return;
    const otherId = chat.participants.find(id => id !== user.id);
    if (!otherId) return;
    setSending(true);
    try {
      await sendMessage(
        chatId as string,
        user.id,
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        otherId,
        text,
        params.referralId
      );
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // ── Delete entire conversation ──
  const handleDeleteConversation = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete Conversation',
      'Delete this entire conversation? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!chatId) return;
            try {
              await deleteChat(chatId);
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to delete conversation.');
            }
          },
        },
      ]
    );
  };

  const getOtherName = (): string => {
    if (chat) {
      const otherId = chat.participants.find(id => id !== user?.id);
      if (otherId && chat.participantNames[otherId]) return chat.participantNames[otherId];
    }
    return params.recipientName || 'Chat';
  };

  const getStatusLabel = (): string => {
    const otherId = chat?.participants.find(id => id !== user?.id);
    const storedType = otherId ? chat?.participantTypes?.[otherId] : undefined;
    const effectiveType = params.recipientType || storedType;
    const name = getOtherName().toLowerCase();

    // Detect hospital / blood bank / clinic
    if (
      effectiveType === 'hospital' ||
      name.includes('hospital') ||
      name.includes('blood bank') ||
      name.includes('clinic')
    ) return 'Blood Bank / Hospital';

    // Detect admin / HQ / system accounts
    if (
      name.includes('admin') ||
      name.includes('hq') ||
      name.includes('headquarters') ||
      name.includes('bloodlink') ||
      name.includes('support') ||
      name.includes('system')
    ) return 'Admin / Hospital';

    return user?.userType === 'donor' ? 'Recipient / Requester' : 'Donor / Hero';
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <ChatBubble message={item} isOwnMessage={item.senderId === user?.id} />
  );

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.chatBg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.headerBg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.headerBg} />

      {/* ── HEADER — Dark warm brown like Samsung KCB thread ── */}
      <View style={st.header}>
        {/* Back */}
        <TouchableOpacity style={st.hBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.headerText} />
        </TouchableOpacity>

        {/* Avatar */}
        <View style={st.hAvatar}>
          <Ionicons name="person" size={20} color="rgba(255,255,255,0.6)" />
        </View>

        {/* Name + status */}
        <View style={st.hMeta}>
          <Text style={st.hName} numberOfLines={1}>{getOtherName()}</Text>
          <Text style={st.hStatus}>{getStatusLabel()}</Text>
        </View>

        {/* Delete (trash icon on right — visible from header like Samsung screenshot) */}
        <TouchableOpacity
          style={st.hBtn}
          onPress={handleDeleteConversation}
        >
          <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </View>

      {/* ── CHAT BODY ── */}
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.chatBg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {loading ? (
          <View style={st.loadingWrap}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={{ marginTop: 10, color: C.textSecondary }}>
              Loading messages...
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              contentContainerStyle={st.msgList}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
            />

            <ChatInput
              onSend={handleSend}
              disabled={sending || loading}
              placeholder="Type message..."
            />
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.headerBg,
    paddingHorizontal: 6,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  hBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
  },
  hAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hMeta: { flex: 1, marginLeft: 2 },
  hName: {
    color: C.headerText,
    fontWeight: '700',
    fontSize: 16,
  },
  hStatus: {
    color: C.headerSub,
    fontSize: 11,
    marginTop: 1,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.chatBg,
  },

  msgList: {
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
});

export default ChatScreen;