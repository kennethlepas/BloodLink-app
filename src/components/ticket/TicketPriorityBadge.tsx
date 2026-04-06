import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TicketPriority } from '@/src/types/types';

interface TicketPriorityBadgeProps {
  priority: TicketPriority;
  size?: 'small' | 'medium';
}

const TicketPriorityBadge: React.FC<TicketPriorityBadgeProps> = ({ priority, size = 'small' }) => {
  const getConfig = () => {
    switch (priority) {
      case 'critical':
        return { bg: '#FEE2E2', color: '#DC2626', icon: 'flash', label: 'Critical' };
      case 'high':
        return { bg: '#FED7AA', color: '#EA580C', icon: 'arrow-up', label: 'High' };
      case 'medium':
        return { bg: '#FEF3C7', color: '#D97706', icon: 'trending-up', label: 'Medium' };
      case 'low':
        return { bg: '#D1FAE5', color: '#059669', icon: 'arrow-down', label: 'Low' };
      default:
        return { bg: '#F1F5F9', color: '#64748B', icon: 'ellipse', label: priority };
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

export default TicketPriorityBadge;
