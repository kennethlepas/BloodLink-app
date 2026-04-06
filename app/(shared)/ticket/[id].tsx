import { TicketPriorityBadge, TicketStatusBadge } from '@/src/components/ticket';
import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import {
  closeTicket,
  createTicketMessage,
  getTicket,
  getTicketMessages,
  reopenTicket,
  subscribeToTicket,
  subscribeToTicketMessages,
  updateTicketStatus,
} from '@/src/services/firebase/database';
import { notifyUserOfTicketMessage } from '@/src/services/notification/notificationService';
import { Ticket, TicketMessage, TicketStatus } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const B_SKY = '#2563EB';
const B_LIGHT = '#3B82F6';

export default function TicketDetailScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { colors, isDark } = useAppTheme();
  const { id: ticketId } = useLocalSearchParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load initial ticket data
  useEffect(() => {
    const loadTicket = async () => {
      if (!ticketId) return;
      try {
        const ticketData = await getTicket(ticketId);
        const messagesData = await getTicketMessages(ticketId);
        setTicket(ticketData);
        setMessages(messagesData);
      } catch (error) {
        console.error('Error loading ticket:', error);
        Alert.alert('Error', 'Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    };
    loadTicket();
  }, [ticketId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!ticketId) return;

    const unsubscribeTicket = subscribeToTicket(ticketId, (updatedTicket) => {
      setTicket(updatedTicket);
    });

    const unsubscribeMessages = subscribeToTicketMessages(ticketId, (updatedMessages) => {
      setMessages(updatedMessages);
      // Scroll to bottom when new message arrives
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      unsubscribeTicket();
      unsubscribeMessages();
    };
  }, [ticketId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket || !user || sending) return;

    setSending(true);
    try {
      await createTicketMessage(
        ticket.id,
        user.id,
        `${user.firstName} ${user.lastName}`,
        'user',
        newMessage.trim()
      );

      // Notify admin (in real implementation, would notify assigned admin)
      if (ticket.assignedAdminId) {
        await notifyUserOfTicketMessage(ticket.assignedAdminId, ticket.id, {
          ticketSubject: ticket.subject,
          senderName: `${user.firstName} ${user.lastName}`,
          messagePreview: newMessage.trim(),
        });
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = () => {
    if (!ticket || !user) return;

    Alert.alert(
      'Confirm Close',
      'Are you sure you want to close this ticket? You can reopen it later if needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Ticket',
          style: 'default',
          onPress: async () => {
            try {
              await closeTicket(ticket.id, user.id, 'user');
              Alert.alert('Success', 'Ticket closed successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to close ticket');
            }
          },
        },
      ]
    );
  };

  const handleReopenTicket = async () => {
    if (!ticket || !user) return;

    try {
      await reopenTicket(ticket.id, user.id, 'user');
      Alert.alert('Success', 'Ticket reopened');
    } catch (error) {
      Alert.alert('Error', 'Failed to reopen ticket');
    }
  };

  const handleStatusUpdate = (newStatus: TicketStatus) => {
    if (!ticket || !user) return;

    Alert.alert(
      'Confirm Status Change',
      `Change ticket status to ${newStatus.replace('_', ' ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await updateTicketStatus(ticket.id, newStatus, user.id, 'user');
              Alert.alert('Success', 'Status updated');
            } catch (error) {
              Alert.alert('Error', 'Failed to update status');
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getStatusTimeline = () => {
    if (!ticket) return [];

    const timeline = [
      { status: 'open', label: 'Open', icon: 'document-text', completed: true },
      {
        status: 'under_review',
        label: 'In Review',
        icon: 'search',
        completed: ['under_review', 'awaiting_user', 'resolved', 'closed'].includes(ticket.status),
      },
      {
        status: 'awaiting_user',
        label: 'Your Response',
        icon: 'chatbubble',
        completed: ['awaiting_user', 'resolved', 'closed'].includes(ticket.status),
      },
      {
        status: 'resolved',
        label: 'Resolved',
        icon: 'checkmark-circle',
        completed: ['resolved', 'closed'].includes(ticket.status),
      },
    ];

    if (ticket.status === 'closed') {
      timeline.push({
        status: 'closed',
        label: 'Closed',
        icon: 'lock-closed',
        completed: true,
      });
    }

    return timeline;
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: 'hidden',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
    headerSub: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
      fontWeight: '500',
      textAlign: 'center',
    },

    // Content
    content: { flex: 1 },
    scrollContent: { paddingBottom: 20 },

    // Status Timeline
    timelineContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    timeline: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timelineItem: {
      flex: 1,
      alignItems: 'center',
    },
    timelineIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    timelineIconCompleted: {
      backgroundColor: B_SKY,
    },
    timelineIconPending: {
      backgroundColor: colors.surfaceBorder,
    },
    timelineLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    timelineLabelCompleted: {
      color: B_SKY,
    },
    timelineLine: {
      position: 'absolute',
      top: 18,
      left: 30,
      right: 30,
      height: 2,
      backgroundColor: colors.surfaceBorder,
    },
    timelineLineCompleted: {
      backgroundColor: B_SKY,
    },

    // Ticket Info
    ticketInfo: {
      padding: 20,
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginTop: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    ticketHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    ticketSubject: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 12,
    },
    ticketBadges: {
      flexDirection: 'row',
      gap: 6,
    },
    ticketMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 8,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontSize: 12,
      color: colors.textSecondary,
    },

    // Messages
    messagesContainer: {
      padding: 20,
      paddingBottom: 100,
    },
    messageGroup: {
      marginBottom: 16,
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    messageAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: B_SKY,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    messageAvatarAdmin: {
      backgroundColor: '#10B981',
    },
    messageSender: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    messageTime: {
      fontSize: 11,
      color: colors.textMuted,
      marginLeft: 8,
    },
    messageBubble: {
      borderRadius: 16,
      padding: 12,
      marginLeft: 42,
    },
    messageBubbleUser: {
      backgroundColor: B_SKY,
      borderBottomRightRadius: 4,
    },
    messageBubbleAdmin: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: 14,
      lineHeight: 20,
      color: '#FFFFFF',
    },
    messageTextAdmin: {
      color: colors.text,
    },

    // Input Area
    inputContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.surfaceBorder,
      padding: 12,
      paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },
    input: {
      flex: 1,
      backgroundColor: colors.bg,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      maxHeight: 100,
      minHeight: 40,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: B_SKY,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendBtnDisabled: {
      backgroundColor: colors.textMuted,
    },

    // Action Buttons
    actionContainer: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.surfaceBorder,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    actionBtnPrimary: {
      backgroundColor: B_SKY,
      borderColor: B_SKY,
    },
    actionBtnDanger: {
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    actionBtnTextPrimary: {
      color: '#FFFFFF',
    },
    actionBtnTextDanger: {
      color: '#DC2626',
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Empty Messages
    emptyMessages: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: `${B_SKY}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    emptySub: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

  const timeline = getStatusTimeline();

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={B_SKY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="document-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Ticket not found</Text>
          <TouchableOpacity
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: B_SKY, borderRadius: 12 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isUser = true; // Current user is the ticket creator
  const canClose = ticket.status === 'resolved' && !ticket.closedAt;
  const canReopen = ticket.status === 'closed';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[B_SKY, B_LIGHT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Support Request</Text>
            <Text style={styles.headerSub}>
              #{ticket.id.slice(0, 8)} · {new Date(ticket.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push('/(shared)/tickets')}
            activeOpacity={0.7}
          >
            <Ionicons name="list" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Status Timeline */}
      <View style={styles.timelineContainer}>
        <View style={styles.timeline}>
          {/* Progress line */}
          <View style={styles.timelineLine} />

          {timeline.map((item, index) => (
            <View key={item.status} style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineIcon,
                  item.completed ? styles.timelineIconCompleted : styles.timelineIconPending,
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={item.completed ? '#FFFFFF' : colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.timelineLabel,
                  item.completed && styles.timelineLabelCompleted,
                ]}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Ticket Info Card */}
        <View style={styles.ticketInfo}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketSubject} numberOfLines={2}>
              {ticket.subject}
            </Text>
            <View style={styles.ticketBadges}>
              <TicketPriorityBadge priority={ticket.priority} size="small" />
              <TicketStatusBadge status={ticket.status} size="small" />
            </View>
          </View>

          <View style={styles.ticketMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {ticket.type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </View>
            {ticket.relatedEntityId && (
              <View style={styles.metaItem}>
                <Ionicons name="link" size={14} color={colors.textMuted} />
                <Text style={styles.metaText}>
                  Related to {ticket.relatedEntityType === 'accepted_request' ? 'Donation' :
                    ticket.relatedEntityType === 'blood_request' ? 'Request' :
                      ticket.relatedEntityType?.replace('_', ' ')}
                </Text>
              </View>
            )}
            {ticket.assignedAdminName && (
              <View style={styles.metaItem}>
                <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                <Text style={styles.metaText}>Assigned to {ticket.assignedAdminName}</Text>
              </View>
            )}
          </View>

          {/* Dispute Specific Info */}
          {ticket.type === 'dispute' && (ticket.disputeReason || ticket.additionalDetails) && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                Issue Details
              </Text>
              {ticket.disputeReason && (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, width: 60 }}>Reason:</Text>
                  <Text style={{ fontSize: 12, color: colors.text, flex: 1 }}>
                    {ticket.disputeReason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
              )}
              {ticket.additionalDetails && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, width: 60 }}>Details:</Text>
                  <Text style={{ fontSize: 12, color: colors.text, flex: 1 }}>{ticket.additionalDetails}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Messages */}
        <View style={styles.messagesContainer}>
          {messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={28} color={B_SKY} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>
                Start the conversation by sending a message below
              </Text>
            </View>
          ) : (
            messages.map((msg) => (
              <View key={msg.id} style={styles.messageGroup}>
                <View style={styles.messageHeader}>
                  <View
                    style={[
                      styles.messageAvatar,
                      msg.senderType === 'admin' && styles.messageAvatarAdmin,
                    ]}
                  >
                    <Ionicons
                      name={msg.senderType === 'admin' ? 'shield-checkmark' : 'person'}
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.messageSender}>{msg.senderName}</Text>
                  <Text style={styles.messageTime}>{formatTime(msg.createdAt)}</Text>
                </View>
                <View
                  style={[
                    styles.messageBubble,
                    msg.senderType === 'user' ? styles.messageBubbleUser : styles.messageBubbleAdmin,
                  ]}
                >
                  <Text
                    style={[styles.messageText, msg.senderType === 'admin' && styles.messageTextAdmin]}
                  >
                    {msg.message}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Action Buttons (conditional) */}
      {(canClose || canReopen) && (
        <View style={styles.actionContainer}>
          {canClose && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleCloseTicket}>
              <Ionicons name="checkmark-done-circle" size={16} color="#DC2626" />
              <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Confirm & Close</Text>
            </TouchableOpacity>
          )}
          {canReopen && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleReopenTicket}>
              <Ionicons name="lock-open" size={16} color="#FFFFFF" />
              <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Reopen Ticket</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor={colors.textMuted}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
