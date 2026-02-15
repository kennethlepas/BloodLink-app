import { useAppTheme } from '@/src/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface ChatInputProps {
  onSend: (message: string) => void;
  onAttachment?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onAttachment,
  disabled = false,
  placeholder = 'Type a message...',
}) => {
  const { colors } = useAppTheme();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || disabled || sending) return;

    setSending(true);
    try {
      await onSend(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={{ backgroundColor: colors.bg }} // Add background to KeyboardAvoidingView
    >
      <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.surfaceBorder }]}>
        {onAttachment && (
          <TouchableOpacity
            style={[styles.attachButton, { backgroundColor: colors.bg }]}
            onPress={onAttachment}
            disabled={disabled || sending}
          >
            <Ionicons name="attach" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}

        <TextInput
          style={[styles.input, {
            backgroundColor: colors.bg,
            color: colors.text,
            borderColor: colors.surfaceBorder
          }]}
          value={message}
          onChangeText={setMessage}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
          editable={!disabled && !sending}
          onSubmitEditing={handleSend}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            (!message.trim() || disabled || sending) && { backgroundColor: colors.surfaceBorder },
          ]}
          onPress={handleSend}
          disabled={!message.trim() || disabled || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
});