import { useAppTheme } from '@/src/contexts/ThemeContext';
import { ChatMessage } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ChatBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  onLongPress?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwnMessage,
  onLongPress,
}) => {
  const { colors } = useAppTheme();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const BubbleContent = () => (
    <>
      {message.type === 'image' && message.imageUrl && (
        <Image
          source={{ uri: message.imageUrl }}
          style={styles.messageImage}
          resizeMode="cover"
        />
      )}

      {message.type === 'location' && message.location && (
        <View style={[styles.locationContainer, { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : '#F1F5F9' }]}>
          <Ionicons name="location" size={24} color={isOwnMessage ? '#FFF' : colors.primary} />
          <Text style={[styles.locationText, { color: isOwnMessage ? '#FFF' : colors.primary }]}>
            Location: {message.location.latitude.toFixed(6)},{' '}
            {message.location.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      {message.message && (
        <Text
          style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : { color: colors.text },
          ]}
        >
          {message.message}
        </Text>
      )}

      <View style={styles.footer}>
        <Text
          style={[
            styles.timeText,
            isOwnMessage ? { color: 'rgba(255,255,255,0.7)' } : { color: colors.textMuted },
          ]}
        >
          {formatTime(message.timestamp)}
        </Text>
        {isOwnMessage && (
          <Ionicons
            name={message.isRead ? 'checkmark-done' : 'checkmark'}
            size={14}
            color={message.isRead ? '#FFF' : 'rgba(255,255,255,0.7)'}
            style={styles.readIcon}
          />
        )}
      </View>
    </>
  );

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
      ]}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {isOwnMessage ? (
        <LinearGradient
          colors={[colors.primary, '#60A5FA']}
          style={[styles.bubble, styles.ownBubble]}
        >
          <BubbleContent />
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.bubble,
            styles.otherBubble,
            { backgroundColor: colors.surface },
          ]}
        >
          <BubbleContent />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  ownBubble: {
    borderTopRightRadius: 2, // Bubble effect
  },
  otherBubble: {
    borderTopLeftRadius: 2, // Bubble effect
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  timeText: {
    fontSize: 10,
  },
  readIcon: {
    marginLeft: 2,
  },
});