import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ticket } from '@/src/types/types';
import TicketStatusBadge from './TicketStatusBadge';
import TicketPriorityBadge from './TicketPriorityBadge';
import { ThemedView } from '../themed-view';
import { ThemedText } from '../themed-text';

interface TicketCardProps {
  ticket: Ticket;
  showUser?: boolean;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, showUser = false }) => {
  const router = useRouter();

  const getTypeIcon = () => {
    switch (ticket.type) {
      case 'dispute':
        return { icon: 'warning', color: '#DC2626' };
      case 'bug_report':
        return { icon: 'bug', color: '#EA580C' };
      case 'feature_request':
        return { icon: 'lightbulb', color: '#9333EA' };
      case 'general_inquiry':
        return { icon: 'help-circle', color: '#2563EB' };
      case 'account_issue':
        return { icon: 'person', color: '#059669' };
      case 'verification_issue':
        return { icon: 'shield-checkmark', color: '#D97706' };
      default:
        return { icon: 'document-text', color: '#64748B' };
    }
  };

  const typeConfig = getTypeIcon();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handlePress = () => {
    router.push(`/(shared)/ticket/${ticket.id}`);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      <ThemedView style={styles.cardContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.typeIconContainer, { backgroundColor: `${typeConfig.color}15` }]}>
            <Ionicons name={typeConfig.icon as any} size={20} color={typeConfig.color} />
          </View>
          
          <View style={styles.headerRight}>
            <View style={styles.badgesContainer}>
              <TicketPriorityBadge priority={ticket.priority} size="small" />
              <TicketStatusBadge status={ticket.status} size="small" />
            </View>
            <Text style={styles.date}>{formatDate(ticket.createdAt)}</Text>
          </View>
        </View>

        {/* Subject */}
        <ThemedText style={styles.subject}>{ticket.subject}</ThemedText>

        {/* Description preview */}
        <ThemedText numberOfLines={2} style={styles.description}>
          {ticket.description}
        </ThemedText>

        {/* Related entity info */}
        {ticket.relatedEntityId && (
          <View style={styles.relatedEntity}>
            <Ionicons name="link" size={14} color="#64748B" />
            <Text style={styles.relatedEntityText}>
              {ticket.relatedEntityType === 'accepted_request' ? 'Donation Dispute' : 
               ticket.relatedEntityType === 'blood_request' ? 'Blood Request' :
               ticket.relatedEntityType === 'user_account' ? 'Account Issue' :
               'Related Item'}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {showUser && ticket.userName && (
            <View style={styles.userInfo}>
              <Ionicons name="person-circle-outline" size={16} color="#64748B" />
              <Text style={styles.userName}>{ticket.userName}</Text>
            </View>
          )}
          
          <View style={styles.footerRight}>
            {ticket.messageCount > 0 && (
              <View style={styles.messageCount}>
                <Ionicons name="chatbubble-outline" size={14} color="#64748B" />
                <Text style={styles.messageCountText}>{ticket.messageCount}</Text>
              </View>
            )}
            
            {ticket.assignedAdminName && (
              <View style={styles.adminInfo}>
                <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
                <Text style={styles.adminName}>{ticket.assignedAdminName}</Text>
              </View>
            )}
            
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </View>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#94A3B8',
  },
  subject: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  relatedEntity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  relatedEntityText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 13,
    color: '#64748B',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageCountText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adminName: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
});

export default TicketCard;
