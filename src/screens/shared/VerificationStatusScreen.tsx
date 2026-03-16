import { useAppTheme } from '@/src/contexts/ThemeContext';
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

export default function VerificationStatusScreen() {
    const router = useRouter();
    const { user } = useUser();
    const { colors } = useAppTheme();

    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState<VerificationRequest | null>(null);

    useEffect(() => {
        if (!user) return;
        getVerificationRequest(user.id).then(req => {
            setRequest(req);
            setLoading(false);
        });
    }, [user?.id]);

    const status = request?.status ?? (user?.verificationStatus as any) ?? 'unsubmitted';

    const BLUE = '#2563EB';
    const GREEN = '#10B981';
    const RED = '#EF4444';

    const timelineSteps: TimelineStep[] = [
        { label: 'Documents Submitted', icon: 'cloud-upload-outline', done: true, active: false, color: GREEN },
        { label: 'Under Admin Review', icon: 'hourglass-outline', done: status !== 'pending', active: status === 'pending', color: status === 'pending' ? BLUE : GREEN },
        { label: status === 'rejected' ? 'Rejected by Admin' : 'Account Verified', icon: status === 'rejected' ? 'close-circle-outline' : 'shield-checkmark-outline', done: status === 'approved', active: status === 'rejected', color: status === 'approved' ? GREEN : status === 'rejected' ? RED : '#D1D5DB' },
    ];

    const bannerColor = status === 'approved' ? GREEN : status === 'rejected' ? RED : BLUE;
    const bannerTitle = status === 'approved' ? 'Verification Approved ✅' : status === 'rejected' ? 'Verification Rejected ❌' : 'Verification Under Review';
    const bannerMessage = status === 'approved'
        ? 'Your account is now fully verified. You can use all features of BloodLink.'
        : status === 'rejected'
            ? 'Your verification was not approved. Please re-submit with corrected documents.'
            : 'Our team is reviewing your documents. This usually takes 24–48 hours.';

    const s = StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bg },
        header: { paddingHorizontal: 16, paddingBottom: 20 },
        hTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
        backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
        hTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
        hSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

        banner: { marginHorizontal: 16, borderRadius: 16, padding: 18, marginBottom: 20, marginTop: 8 },
        bannerTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
        bannerMsg: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 6, lineHeight: 20 },

        section: { marginHorizontal: 16, marginBottom: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.surfaceBorder },
        sTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 16 },

        // Timeline
        timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
        tDot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
        tLine: { width: 2, flex: 1, minHeight: 20, alignSelf: 'center', marginLeft: 17, marginTop: 4 },
        tContent: { flex: 1, paddingLeft: 12, paddingTop: 4 },
        tLabel: { fontSize: 14, fontWeight: '700' },
        tSub: { fontSize: 12, marginTop: 2 },

        // Rejection card
        rejCard: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FECACA', marginTop: 4 },
        rejTitle: { fontSize: 13, fontWeight: '700', color: '#DC2626', marginBottom: 4 },
        rejText: { fontSize: 13, color: '#7F1D1D', lineHeight: 18 },

        // Re-submit button
        rBtn: { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
        rGrad: { paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
        rText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
    });

    if (loading) {
        return (
            <SafeAreaView style={s.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={BLUE} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <LinearGradient colors={[BLUE, '#3B82F6']} style={s.header}>
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
                                <View style={[s.tLine, { backgroundColor: timelineSteps[idx + 1].done || timelineSteps[idx + 1].active ? step.color : '#E5E7EB', marginBottom: 4, height: 20 }]} />
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
                        <LinearGradient colors={[RED, '#DC2626']} style={s.rGrad}>
                            <Ionicons name="refresh-circle" size={20} color="#FFF" />
                            <Text style={s.rText}>{status === 'rejected' ? 'Re-submit Verification' : 'Start Verification'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
