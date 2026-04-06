import { useAppTheme, type ThemeColors } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { getVerificationRequest } from '@/src/services/firebase/database';
import { VerificationRequest } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TimelineStep = {
    label: string;
    icon: string;
    done: boolean;
    active: boolean;
    color: string;
};

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 16, paddingBottom: 20 },
    hTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    hTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    hSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    banner: { marginTop: 8, marginHorizontal: 16, marginBottom: 20, borderRadius: 16, padding: 18 },
    bannerTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
    bannerMsg: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 6, lineHeight: 20 },

    section: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: 16 },
    sTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 16 },

    // Timeline
    timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    tDot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    tLine: { minHeight: 20, width: 2, marginLeft: 17, marginTop: 4, flex: 1, alignSelf: 'center' },
    tContent: { flex: 1, paddingLeft: 12, paddingTop: 4 },
    tLabel: { fontSize: 14, fontWeight: '700' },
    tSub: { fontSize: 12, marginTop: 2 },

    // Rejection card
    rejCard: { marginTop: 4, borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.dangerBorder : '#FECACA', backgroundColor: isDark ? colors.surfaceAlt : '#FEF2F2', padding: 14 },
    rejTitle: { fontSize: 13, fontWeight: '700', color: colors.danger, marginBottom: 4 },
    rejText: { fontSize: 13, color: colors.text, lineHeight: 18 },

    // Re-submit button
    rBtn: { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
    rGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14 },
    rText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
});

export default function VerificationStatusScreen() {
    const router = useRouter();
    const { user } = useUser();
    const { colors, isDark } = useAppTheme();

    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState<VerificationRequest | null>(null);

    useEffect(() => {
        if (!user) return;
        getVerificationRequest(user.id).then(req => {
            setRequest(req);
            setLoading(false);
        });
    }, [user?.id]);

    const s = getStyles(colors, isDark);
    const status = request?.status ?? (user?.verificationStatus as any) ?? 'unsubmitted';

    const timelineSteps: TimelineStep[] = [
        { label: 'Documents Submitted', icon: 'cloud-upload-outline', done: true, active: false, color: colors.success },
        { label: 'Under Admin Review', icon: 'hourglass-outline', done: status !== 'pending' && status !== 'unsubmitted', active: status === 'pending', color: status === 'pending' ? colors.primary : colors.success },
        { label: status === 'rejected' ? 'Rejected by Admin' : 'Account Verified', icon: status === 'rejected' ? 'close-circle-outline' : 'shield-checkmark-outline', done: status === 'approved', active: status === 'rejected', color: status === 'approved' ? colors.success : status === 'rejected' ? colors.danger : colors.divider },
    ];

    const bannerColor = status === 'approved' ? colors.success : status === 'rejected' ? colors.danger : colors.primary;
    const bannerTitle = status === 'approved' ? 'Verification Approved ✅' : status === 'rejected' ? 'Verification Rejected ❌' : 'Verification Under Review';
    const bannerMessage = status === 'approved'
        ? 'Your account is now fully verified. You can use all features of BloodLink.'
        : status === 'rejected'
            ? 'Your verification was not approved. Please re-submit with corrected documents.'
            : 'Our team is reviewing your documents. This usually takes 24–48 hours.';

    if (loading) {
        return (
            <SafeAreaView style={s.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <LinearGradient colors={[colors.primary, '#3B82F6']} style={s.header}>
                <View style={s.hTop}>
                    <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={s.hTitle}>Verification Status</Text>
                        <Text style={s.hSub}>Track your account review progress</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Status Banner */}
                <View style={[s.banner, { backgroundColor: bannerColor }]}>
                    <Text style={s.bannerTitle}>{bannerTitle}</Text>
                    <Text style={s.bannerMsg}>{bannerMessage}</Text>
                </View>

                {/* Timeline */}
                <View style={s.section}>
                    <Text style={s.sTitle}>Review Progress</Text>
                    {timelineSteps.map((step, idx) => (
                        <View key={step.label}>
                            <View style={s.timelineRow}>
                                <View style={[s.tDot, { backgroundColor: step.color + '20' }]}>
                                    <Ionicons name={step.icon as any} size={18} color={step.color} />
                                </View>
                                <View style={s.tContent}>
                                    <Text style={[s.tLabel, { color: step.active || step.done ? colors.text : colors.textSecondary }]}>{step.label}</Text>
                                    <Text style={[s.tSub, { color: colors.textSecondary }]}>
                                        {idx === 0 ? (request?.submittedAt ? new Date(request.submittedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
                                            : idx === 2 && status === 'approved' ? (request?.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
                                                : step.active ? 'In progress…' : step.done ? 'Complete' : 'Pending'}
                                    </Text>
                                </View>
                            </View>
                            {idx < timelineSteps.length - 1 && (
                                <View style={[s.tLine, { backgroundColor: timelineSteps[idx + 1].done || timelineSteps[idx + 1].active ? step.color : colors.divider, marginBottom: 4, height: 20 }]} />
                            )}
                        </View>
                    ))}
                </View>

                {/* Rejection reason */}
                {status === 'rejected' && (
                    <View style={[s.section, { marginBottom: 8 }]}>
                        <Text style={s.sTitle}>Rejection Reason</Text>
                        <View style={s.rejCard}>
                            <Text style={s.rejTitle}>Admin Notes</Text>
                            <Text style={s.rejText}>{request?.adminNotes || user?.verificationRejectionReason || 'No specific reason provided. Please re-submit with corrected documents.'}</Text>
                        </View>
                    </View>
                )}

                {/* Re-submit or start verification button */}
                {(status === 'rejected' || status === 'unsubmitted') && (
                    <TouchableOpacity
                        style={s.rBtn}
                        onPress={() => router.push(user?.userType === 'donor' ? '/(shared)/donor-verification' : '/(shared)/requester-verification' as any)}
                    >
                        <LinearGradient colors={[colors.danger, '#DC2626']} style={s.rGrad}>
                            <Ionicons name="refresh-circle" size={20} color="#FFF" />
                            <Text style={s.rText}>{status === 'rejected' ? 'Re-submit Verification' : 'Start Verification'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
