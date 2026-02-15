import { ChatBubble } from '@/src/components/chat/ChatBubble';
import { ChatInput } from '@/src/components/chat/ChatInput';
import { useUser } from '@/src/contexts/UserContext';
import {
  getChatById,
  getChatMessages,
  markMessagesAsRead,
  sendMessage,
  subscribeToChatMessages,
} from '@/src/services/firebase/database';
import { Chat, ChatMessage } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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


// ⭐ REAL WHATSAPP CHAT COLOR
const WHATSAPP_BG = '#EFEAE2';

const TEAL = '#0D9488';
const TEAL_MID = '#14B8A6';


const ChatScreen: React.FC = () => {

  const router = useRouter();
  const { user } = useUser();
  const params = useLocalSearchParams<{ chatId: string }>();
  const flatListRef = useRef<FlatList>(null);

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {

    if (!params.chatId || !user) return;

    loadChat();
    loadMessages();

    const unsubscribe = subscribeToChatMessages(
      params.chatId,
      (newMessages) => {
        setMessages(newMessages);
        markMessagesAsRead(params.chatId, user.id);
      }
    );

    return () => unsubscribe();

  }, [params.chatId, user]);


  const loadChat = async () => {
    if (!params.chatId) return;

    try {
      const chatData = await getChatById(params.chatId);
      setChat(chatData);
    } catch {
      Alert.alert('Error', 'Failed to load chat details.');
    }
  };


  const loadMessages = async () => {
    if (!params.chatId) return;

    try {
      setLoading(true);
      const chatMessages = await getChatMessages(params.chatId);
      setMessages(chatMessages);

      if (user) {
        await markMessagesAsRead(params.chatId, user.id);
      }

    } finally {
      setLoading(false);
    }
  };


  const handleSend = async (messageText: string) => {

    if (!user || !chat || !params.chatId) return;

    const otherParticipantId =
      chat.participants.find(id => id !== user.id);

    if (!otherParticipantId) return;

    setSending(true);

    try {

      await sendMessage(
        params.chatId,
        user.id,
        `${user.firstName} ${user.lastName}`,
        otherParticipantId,
        messageText
      );

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch {

      Alert.alert('Error', 'Failed to send message.');

    } finally {

      setSending(false);
    }
  };


  const getOtherParticipantName = (): string => {

    if (!chat || !user) return 'Chat';

    const otherParticipantId =
      chat.participants.find(id => id !== user.id);

    return otherParticipantId
      ? chat.participantNames[otherParticipantId]
      : 'Unknown';
  };


  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <ChatBubble
      message={item}
      isOwnMessage={item.senderId === user?.id}
    />
  );


  if (!user) {
    return (
      <SafeAreaView style={st.loadingWrap}>
        <ActivityIndicator size="large" color={TEAL} />
      </SafeAreaView>
    );
  }


  return (

    <SafeAreaView style={{ flex: 1, backgroundColor: WHATSAPP_BG }}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />

      {/* HEADER */}
      <LinearGradient colors={[TEAL, TEAL_MID]} style={st.header}>

        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={st.headerCenter}>
          <View style={st.headerAvatar}>
            <Text style={st.headerAvatarText}>
              {getOtherParticipantName().charAt(0).toUpperCase()}
            </Text>
          </View>

          <View>
            <Text style={st.headerName}>
              {getOtherParticipantName()}
            </Text>

            <Text style={st.headerStatus}>
              {user.userType === 'donor' ? 'Requester' : 'Donor'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={st.backBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </TouchableOpacity>

      </LinearGradient>


      {/* CHAT AREA */}
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: WHATSAPP_BG }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >

        {loading ? (

          <View style={st.loadingWrap}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text>Loading messages...</Text>
          </View>

        ) : (

          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={st.messagesList}
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerAvatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  headerName: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  headerStatus: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  messagesList: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexGrow: 1,
  },
});

export default ChatScreen;
