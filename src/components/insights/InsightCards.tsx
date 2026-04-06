/**
 * Insight Cards Components
 */

import { useAppTheme } from '@/src/contexts/ThemeContext';
import {
    BloodTypeDemand,
    DonorImpact,
    EligibilityStatus,
    NearbyInsights,
    RequestActivity,
    UrgentNeed,
} from '@/src/services/insights';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

export const InsightCard: React.FC<{ style?: StyleProp<ViewStyle>; children: React.ReactNode }> = ({ style, children }) => {
    const { colors } = useAppTheme();
    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }, style as any]}>
            {children}
        </View>
    );
};

export const EligibilityCard: React.FC<{ eligibility: EligibilityStatus; onPress?: () => void }> = ({ eligibility, onPress }) => {
    const getStatusColor = () => {
        if (eligibility.isEligible) return (isDark ? ['#059669', '#065F46'] : ['#10B981', '#059669']) as [string, string];
        if (eligibility.daysUntilEligible <= 7) return (isDark ? ['#D97706', '#92400E'] : ['#F59E0B', '#D97706']) as [string, string];
        return (isDark ? ['#1D4ED8', '#1E3A8A'] : ['#3B82F6', '#2563EB']) as [string, string];
    };
    const { colors, isDark } = useAppTheme();
    const getStatusIcon = () => eligibility.isEligible ? 'checkmark-circle' : (eligibility.daysUntilEligible <= 7 ? 'time' : 'hourglass');

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <LinearGradient colors={getStatusColor()} style={styles.eligibilityCard}>
                <View style={styles.eligibilityHeader}>
                    <Ionicons name={getStatusIcon() as any} size={28} color="#FFFFFF" />
                    <Text style={styles.eligibilityTitle}>Eligibility Status</Text>
                </View>
                <View style={styles.eligibilityBody}>
                    <View style={styles.countdownContent}>
                        <Text style={styles.eligibleText}>{eligibility.isEligible ? "Ready to Donate!" : `${eligibility.daysUntilEligible} days left`}</Text>
                        <Text style={styles.countdownText}>{eligibility.message}</Text>
                    </View>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

export const ImpactCard: React.FC<{ impact: DonorImpact }> = ({ impact }) => {
    const { colors, isDark } = useAppTheme();
    return (
        <InsightCard style={styles.impactCard}>
            <View style={styles.impactHeader}>
                <LinearGradient colors={['#F97316', '#EA580C']} style={styles.impactIcon}><Ionicons name="heart" size={20} color="#FFFFFF" /></LinearGradient>
                <Text style={[styles.impactTitle, { color: colors.text }]}>Your Impact</Text>
            </View>
            <View style={styles.impactBody}>
                <View style={styles.impactStat}><Text style={[styles.impactStatValue, { color: isDark ? '#FB923C' : '#F97316' }]}>{impact.livesSaved}</Text><Text style={[styles.impactStatLabel, { color: colors.textSecondary }]}>Lives Saved</Text></View>
                <View style={[styles.impactDivider, { backgroundColor: colors.divider }]} />
                <View style={styles.impactStat}><Text style={[styles.impactStatValue, { color: isDark ? '#FB923C' : '#F97316' }]}>{impact.totalDonations}</Text><Text style={[styles.impactStatLabel, { color: colors.textSecondary }]}>Donations</Text></View>
            </View>
        </InsightCard>
    );
};

export const BloodTypeDemandCard: React.FC<{ demand: BloodTypeDemand; compact?: boolean }> = ({ demand, compact }) => {
    const { colors, isDark } = useAppTheme();
    const getDemandColor = () => {
        if (demand.demandLevel === 'critical') return (isDark ? ['#B91C1C', '#7F1D1D'] : ['#DC2626', '#991B1B']) as [string, string];
        if (demand.demandLevel === 'high') return (isDark ? ['#EA580C', '#9A3412'] : ['#F97316', '#EA580C']) as [string, string];
        return (isDark ? ['#059669', '#064E3B'] : ['#10B981', '#059669']) as [string, string];
    };
    return (
        <View style={[styles.demandCardCompact, { backgroundColor: colors.surface }]}>
            <LinearGradient colors={getDemandColor()} style={styles.demandBadgeCompact}><Text style={styles.demandBloodType}>{demand.bloodType}</Text></LinearGradient>
            <View style={styles.demandInfoCompact}>
                <Text style={[styles.demandLabelCompact, { color: colors.textSecondary }]}>{demand.activeRequests} requests</Text>
                {demand.criticalRequests > 0 && <Text style={[styles.demandCriticalCompact, { color: colors.danger }]}>{demand.criticalRequests} critical</Text>}
            </View>
        </View>
    );
};

export const UrgentNeedCard: React.FC<{ need: UrgentNeed; onPress?: () => void }> = ({ need, onPress }) => {
    const { colors, isDark } = useAppTheme();
    const urgencyColor = need.urgencyLevel === 'critical' ? '#DC2626' : '#F97316';
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <InsightCard style={[styles.urgentCard, { borderLeftWidth: 4, borderLeftColor: urgencyColor }] as any}>
                <View style={styles.urgentHeader}>
                    <LinearGradient colors={isDark ? ['#2563EB', '#1D4ED8'] : ['#2563EB', '#3B82F6']} style={styles.urgentBloodBadge}><Text style={styles.urgentBloodText}>{need.bloodType}</Text></LinearGradient>
                    <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + (isDark ? 'E6' : '') }]}><Text style={styles.urgencyText}>{need.urgencyLevel.toUpperCase()}</Text></View>
                </View>
                <View style={styles.urgentBody}>
                    <Text style={[styles.urgentTextValue, { color: colors.text }]}>{need.hospitalName}</Text>
                    <Text style={[styles.urgentFooterText, { color: colors.textSecondary }]}>{need.distance} km away</Text>
                </View>
            </InsightCard>
        </TouchableOpacity>
    );
};

export const NearbyCard: React.FC<{
    nearby: NearbyInsights;
    userType: 'donor' | 'requester';
    onSeeAll?: () => void;
}> = ({ nearby, userType, onSeeAll }) => {
    const { colors } = useAppTheme();
    return (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.85}>
            <InsightCard style={styles.nearbyCard}>
                <Text style={[styles.nearbyTitle, { color: colors.text }]}>Near You (50km)</Text>
                <View style={styles.nearbyGrid}>
                    <View style={styles.nearbyStat}>
                        <Text style={[styles.nearbyValue, { color: colors.text }]}>
                            {userType === 'donor' ? nearby.activeRequests : nearby.compatibleDonors}
                        </Text>
                        <Text style={[styles.nearbyLabel, { color: colors.textSecondary }]}>
                            {userType === 'donor' ? "Requests" : "Donors"}
                        </Text>
                    </View>
                </View>
            </InsightCard>
        </TouchableOpacity>
    );
};

export const RequestActivityCard: React.FC<{ activity: RequestActivity }> = ({ activity }) => {
    const { colors } = useAppTheme();
    return (
        <InsightCard style={styles.activityCard}>
            <Text style={[styles.activityTitle, { color: colors.text }]}>Request Activity</Text>
            <View style={styles.activityRow}>
                <View style={styles.activityStat}><Text style={[styles.activityValue, { color: colors.text }]}>{activity.totalRequests}</Text><Text style={[styles.activityLabel, { color: colors.textSecondary }]}>Total</Text></View>
                <View style={styles.activityStat}><Text style={[styles.activityValue, { color: colors.success }]}>{activity.completedRequests}</Text><Text style={[styles.activityLabel, { color: colors.textSecondary }]}>Done</Text></View>
            </View>
        </InsightCard>
    );
};

const styles = StyleSheet.create({
    card: { borderRadius: 16, borderWidth: 1, padding: 16, elevation: 4 },
    eligibilityCard: { borderRadius: 16, padding: 16, minWidth: 280 },
    eligibilityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    eligibilityTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    eligibilityBody: { marginBottom: 12 },
    eligibleText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    countdownContent: { alignItems: 'center' },
    countdownText: { fontSize: 13, color: '#FFFFFF', textAlign: 'center' },
    impactCard: { minWidth: 260 },
    impactHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    impactIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    impactTitle: { fontSize: 16, fontWeight: '700' },
    impactBody: { flexDirection: 'row', alignItems: 'center' },
    impactStat: { flex: 1, alignItems: 'center' },
    impactStatValue: { fontSize: 22, fontWeight: '800', color: '#F97316' },
    impactStatLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },
    impactDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
    demandCardCompact: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 10, gap: 10, minWidth: 180 },
    demandBadgeCompact: { width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    demandBloodType: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
    demandInfoCompact: { flex: 1 },
    demandLabelCompact: { fontSize: 11, fontWeight: '500' },
    demandCriticalCompact: { fontSize: 10, fontWeight: '600', marginTop: 1 },
    urgentCard: { minWidth: 160, padding: 10 },
    urgentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    urgentBloodBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
    urgentBloodText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
    urgencyBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
    urgencyText: { fontSize: 7, fontWeight: '800', color: '#FFFFFF' },
    urgentBody: { gap: 2, marginBottom: 2 },
    urgentTextValue: { fontSize: 10, fontWeight: '700' },
    urgentFooterText: { fontSize: 8 },
    nearbyCard: { minWidth: 240 },
    nearbyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
    nearbyGrid: { flexDirection: 'row' },
    nearbyStat: { flex: 1, alignItems: 'center' },
    nearbyValue: { fontSize: 18, fontWeight: '800' },
    nearbyLabel: { fontSize: 9, marginTop: 2 },
    activityCard: { minWidth: 260 },
    activityTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
    activityRow: { flexDirection: 'row', alignItems: 'center' },
    activityStat: { flex: 1, alignItems: 'center' },
    activityValue: { fontSize: 20, fontWeight: '800' },
    activityLabel: { fontSize: 9, marginTop: 2 },
});
