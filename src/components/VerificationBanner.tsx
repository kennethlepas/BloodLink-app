import { useAppTheme } from '@/src/contexts/ThemeContext';
import { VerificationStatus } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VerificationBannerProps {
    status: VerificationStatus | undefined;
    userType: 'donor' | 'requester';
    rejectionReason?: string;
}

/**
 * A non-dismissible banner shown on HomeScreen to users who are not yet verified.
 * Hides completely once status is 'approved'.
 */
export const VerificationBanner: React.FC<VerificationBannerProps> = ({
    status,
    userType,
    rejectionReason,
}) => {
    const router = useRouter();
    const { colors } = useAppTheme();

    // Verified users — render nothing
    if (!status || status === 'approved') return null;

    const config = {
        unsubmitted: {
            bg: '#FFF7ED',
            border: '#FDBA74',
            icon: 'shield-outline' as const,
            iconColor: '#EA580C',
            title: 'Complete Your Verification',
            message: 'To access all features (requesting blood, accepting donations), please complete identity verification.',
            btnLabel: 'Get Verified',
            btnColor: '#EA580C',
            route: userType === 'donor' ? '/(shared)/donor-verification' : '/(shared)/requester-verification',
        },
        pending: {
            bg: '#EFF6FF',
            border: '#93C5FD',
            icon: 'hourglass-outline' as const,
            iconColor: '#2563EB',
            title: 'Verification Under Review',
            message: 'Your documents are being reviewed by our team. This usually takes 24–48 hours.',
            btnLabel: 'View Status',
            btnColor: '#2563EB',
            route: '/(shared)/verification-status',
        },
        rejected: {
            bg: '#FEF2F2',
            border: '#FCA5A5',
            icon: 'alert-circle-outline' as const,
            iconColor: '#DC2626',
            title: 'Verification Rejected',
            message: rejectionReason || 'Your verification was not approved. Please re-submit with corrected documents.',
            btnLabel: 'Re-submit',
            btnColor: '#DC2626',
            route: userType === 'donor' ? '/(shared)/donor-verification' : '/(shared)/requester-verification',
        },
    }[status];

    const s = StyleSheet.create({
        container: {
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: config.border,
            backgroundColor: config.bg,
            overflow: 'hidden',
        },
        inner: { flexDirection: 'row', padding: 14, alignItems: 'flex-start' },
        iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: config.iconColor + '18', justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
        textCol: { flex: 1 },
        title: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 3 },
        msg: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
        btnRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 },
        btn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: config.btnColor },
        btnTxt: { fontSize: 12, fontWeight: '800', color: '#FFF' },
    });

    return (
        <View style={s.container}>
            <View style={s.inner}>
                <View style={s.iconWrap}>
                    <Ionicons name={config.icon} size={18} color={config.iconColor} />
                </View>
                <View style={s.textCol}>
                    <Text style={s.title}>{config.title}</Text>
                    <Text style={s.msg}>{config.message}</Text>
                </View>
            </View>
            <View style={s.btnRow}>
                <TouchableOpacity style={s.btn} onPress={() => router.push(config.route as any)}>
                    <Text style={s.btnTxt}>{config.btnLabel}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
