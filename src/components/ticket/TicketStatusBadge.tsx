import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TicketStatus, TicketPriority } from '@/src/types/types';

interface TicketStatusBadgeProps {
  status: TicketStatus;
  size?: 'small' | 'medium';
}

const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status, size = 'small' }) => {
  const getConfig = () => {
    switch (status) {
      case 'open':
        return { bg: '#DBEAFE', color: '#2563EB', icon: 'document-text', label: 'Open' };
      case 'under_review':
        return { bg: '#FEF3C7', color: '#D97706', icon: 'search', label: 'Under Review' };
      case 'awaiting_user':
        return { bg: '#F3E8FF', color: '#9333EA', icon: 'chatbubble', label: 'Awaiting You' };
      case 'resolved':
        return { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-circle', label: 'Resolved' };
      case 'closed':
        return { bg: '#F1F5F9', color: '#64748B', icon: 'lock-closed', label: 'Closed' };
      default:
        return { bg: '#F1F5F9', color: '#64748B', icon: 'ellipse', label: status };
    }
  };

  const config = getConfig();
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isSmall && styles.badgeSmall]}>
      <Ionicons name={config.icon as any} size={isSmall ? 12 : 14} color={config.color} />
      <Text style={[styles.label, { color: config.color }, isSmall && styles.labelSmall]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  badgeSmall: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default TicketStatusBadge;
