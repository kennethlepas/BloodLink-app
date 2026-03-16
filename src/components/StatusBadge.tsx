import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatusBadgeProps {
    status: string;
    type?: 'urgency' | 'status' | 'availability';
    size?: 'small' | 'medium';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'status', size = 'small' }) => {
    const getConfig = () => {
        if (type === 'urgency') {
            switch (status.toLowerCase()) {
                case 'critical':
                    return { bg: '#FEE2E2', color: '#DC2626', icon: 'alert-circle', label: 'Critical' };
                case 'high':
                    return { bg: '#FED7AA', color: '#EA580C', icon: 'warning', label: 'High' };
                case 'moderate':
                    return { bg: '#FEF3C7', color: '#D97706', icon: 'time', label: 'Moderate' };
                default:
                    return { bg: '#DBEAFE', color: '#2563EB', icon: 'information-circle', label: 'Normal' };
            }
        }

        if (type === 'status') {
            switch (status.toLowerCase()) {
                case 'pending':
                    return { bg: '#FEF3C7', color: '#D97706', icon: 'time', label: 'Pending' };
                case 'accepted':
                case 'in_progress':
                    return { bg: '#DBEAFE', color: '#2563EB', icon: 'checkmark-circle', label: 'In Progress' };
                case 'completed':
                case 'verified':
                    return { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-done', label: 'Completed' };
                case 'cancelled':
                case 'rejected':
                    return { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle', label: 'Cancelled' };
                default:
                    return { bg: '#F1F5F9', color: '#64748B', icon: 'ellipse', label: status };
            }
        }

        // availability
        return status.toLowerCase() === 'available'
            ? { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-circle', label: 'Available' }
            : { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle', label: 'Unavailable' };
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    badgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
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

export default StatusBadge;
