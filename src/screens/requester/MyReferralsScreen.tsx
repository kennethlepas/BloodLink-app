import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { db } from '@/src/services/firebase/firebase';
import { HospitalReferral } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Platform,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

const shadow = (color: string, opacity = 0.08, radius = 10, elevation = 3) =>
    Platform.select({
        web: { boxShadow: `0 2px ${radius}px rgba(0,0,0,${opacity})` } as any,
        default: {
            shadowColor: color,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: opacity,
            shadowRadius: radius,
            elevation: elevation
        },
    });

// ─── Styles ────────────────────────────────────────────────────────────────
const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    header: {
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 20 : 40,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        ...shadow(colors.primary, 0.25, 15, 5)
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    headerRight: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 44,
    },
    countText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF'
    },

    listContent: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        backgroundColor: colors.bg,
    },
    loadingText: {
        fontSize: 15,
        color: colors.textSecondary,
        fontWeight: '600'
    },

    referralItem: {
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 0,
        marginBottom: 20,
        overflow: 'hidden',
        ...shadow(isDark ? '#000' : colors.text, 0.1, 12, 5),
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    itemTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 18,
        paddingBottom: 12,
        backgroundColor: isDark ? colors.surfaceAlt : colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceBorder,
    },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: colors.surfaceTint,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow(colors.primary, 0.1, 4, 2),
    },
    infoWrap: {
        flex: 1
    },
    fromLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    hospitalName: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.3,
    },

    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        ...shadow('#000', 0.05, 2, 1),
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
    },

    itemBody: {
        padding: 18,
        gap: 16,
        backgroundColor: colors.surface,
    },
    targetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: isDark ? colors.surfaceAlt : '#F0F9FF',
        padding: 12,
        borderRadius: 16,
    },
    targetLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    targetName: {
        fontSize: 15,
        fontWeight: '800',
        color: isDark ? colors.primary : '#0369A1',
        flex: 1,
    },

    detailsGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    detailItem: {
        flex: 1,
        backgroundColor: colors.surfaceAlt,
        padding: 12,
        borderRadius: 16,
    },
    detailLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        marginBottom: 8,
        letterSpacing: 0.6,
    },
    valBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    valText: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
    },

    reasonRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
        backgroundColor: isDark ? colors.surfaceAlt : colors.surfaceTint,
        padding: 14,
        borderRadius: 16,
    },
    reasonText: {
        flex: 1,
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 20,
        fontWeight: '500',
    },

    itemActions: {
        flexDirection: 'row',
        gap: 12,
        padding: 18,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.surfaceBorder,
        backgroundColor: isDark ? colors.surfaceAlt : colors.bg,
    },
    chatBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surface,
        ...shadow(colors.primary, 0.1, 4, 2),
    },
    chatBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.primary,
    },
    bookBtn: {
        flex: 1.8,
        height: 52,
        borderRadius: 16,
        overflow: 'hidden',
        ...shadow('#F97316', 0.2, 6, 3),
    },
    bookBtnGrad: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    bookBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },

    separator: {
        height: 0
    },

    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 120,
        paddingHorizontal: 40,
    },
    emptyIconWrap: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surfaceTint,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        ...shadow(colors.primary, 0.15, 10, 5),
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    emptyDesc: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '500',
    }
});

export default function MyReferralsScreen() {
    const router = useRouter();
    const { user } = useUser();
    const { colors, isDark } = useAppTheme();
    const st = getStyles(colors, isDark);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [referrals, setReferrals] = useState<HospitalReferral[]>([]);

    // Helper function for status styling
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending':
                return { color: colors.warning, bg: isDark ? '#3D2F15' : '#FFFBEB', icon: 'time-outline' };
            case 'accepted':
                return { color: colors.success, bg: isDark ? '#113329' : '#ECFDF5', icon: 'checkmark-circle-outline' };
            case 'completed':
                return { color: colors.primary, bg: isDark ? '#1E293B' : colors.surfaceTint, icon: 'checkmark-done-circle-outline' };
            case 'cancelled':
                return { color: colors.danger, bg: isDark ? '#421C1C' : '#FEF2F2', icon: 'close-circle-outline' };
            default:
                return { color: colors.textMuted, bg: colors.surfaceAlt, icon: 'help-circle-outline' };
        }
    };

    const getUrgencyColor = (urgency: string) => {
        return urgency === 'critical' ? colors.danger : colors.warning;
    };

    useEffect(() => {
        if (!user) return;
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        const q = query(
            collection(db, 'hospital_referrals'),
            where('patientName', 'in', [fullName, user.firstName, user.lastName, user.id, user.phoneNumber].filter(Boolean))
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HospitalReferral));
            list = list.filter(ref =>
                ref.patientName === fullName ||
                (ref as any).userId === user.id ||
                (ref as any).patientPhone === user.phoneNumber
            );
            setReferrals(list.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ));
            setLoading(false);
            setRefreshing(false);
        }, (err) => {
            console.error('Fetch referrals error:', err);
            setLoading(false);
            setRefreshing(false);
        });
        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return (
            <SafeAreaView style={st.container}>
                <LinearGradient
                    colors={[colors.primary, isDark ? '#1E293B' : '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={st.header}
                >
                    <View style={st.headerRow}>
                        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={st.headerTitle}>Hospital Referrals</Text>
                        </View>
                        <View style={{ width: 44 }} />
                    </View>
                </LinearGradient>
                <View style={st.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={st.loadingText}>Loading your referrals...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={st.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            <LinearGradient
                colors={[colors.primary, isDark ? '#1E293B' : '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.header}
            >
                <View style={st.headerRow}>
                    <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={st.headerTitle}>My Referrals</Text>
                    <View style={st.headerRight}>
                        <Text style={st.countText}>{referrals.length}</Text>
                    </View>
                </View>
            </LinearGradient>

            <FlatList
                data={referrals}
                keyExtractor={(item) => item.id}
                contentContainerStyle={st.listContent}
                ItemSeparatorComponent={() => <View style={st.separator} />}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => setRefreshing(true)}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                renderItem={({ item }) => {
                    const status = getStatusStyle(item.status);
                    const urgencyColor = getUrgencyColor(item.urgency);

                    return (
                        <View style={st.referralItem}>
                            <View style={st.itemTop}>
                                <LinearGradient
                                    colors={isDark ? ['#1E293B', '#0F172A'] : [colors.surfaceTint, '#FFFFFF']}
                                    style={st.iconBox}
                                >
                                    <Ionicons name="business" size={28} color={colors.primary} />
                                </LinearGradient>
                                <View style={st.infoWrap}>
                                    <Text style={st.fromLabel}>Referring Hospital</Text>
                                    <Text style={st.hospitalName}>{item.fromHospitalName}</Text>
                                </View>
                                <View style={[st.statusBadge, { backgroundColor: status.bg }]}>
                                    <Ionicons name={status.icon as any} size={12} color={status.color} />
                                    <Text style={[st.statusText, { color: status.color }]}>
                                        {item.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>

                            <View style={st.itemBody}>
                                <View style={st.targetRow}>
                                    <Ionicons name="arrow-forward-circle" size={20} color={isDark ? colors.primary : '#0EA5E9'} />
                                    <Text style={st.targetLabel}>Referred to:</Text>
                                    <Text style={st.targetName} numberOfLines={1}>
                                        {item.targetHospital}
                                    </Text>
                                </View>

                                <View style={st.detailsGrid}>
                                    <View style={st.detailItem}>
                                        <Text style={st.detailLabel}>Blood Type</Text>
                                        <View style={st.valBox}>
                                            <Ionicons name="water" size={18} color={colors.danger} />
                                            <Text style={st.valText}>{item.bloodType}</Text>
                                        </View>
                                    </View>
                                    <View style={st.detailItem}>
                                        <Text style={st.detailLabel}>Urgency</Text>
                                        <View style={st.valBox}>
                                            <Ionicons name="alert-circle" size={18} color={urgencyColor} />
                                            <Text style={[st.valText, { color: urgencyColor }]}>
                                                {item.urgency.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={st.reasonRow}>
                                    <Ionicons name="information-circle" size={18} color={colors.primary} />
                                    <Text style={st.reasonText}>{item.reason}</Text>
                                </View>
                            </View>

                            <View style={st.itemActions}>
                                <TouchableOpacity
                                    style={st.chatBtn}
                                    activeOpacity={0.7}
                                    onPress={() => router.push({
                                        pathname: '/(shared)/chat',
                                        params: {
                                            recipientId: item.fromHospitalId,
                                            recipientName: item.fromHospitalName,
                                            referralId: item.id
                                        }
                                    } as any)}
                                >
                                    <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
                                    <Text style={st.chatBtnText}>Message</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={st.bookBtn}
                                    activeOpacity={0.8}
                                    onPress={() => router.push({
                                        pathname: '/(requester)/book-transfusion',
                                        params: {
                                            referralId: item.id,
                                            hospitalName: item.targetHospital
                                        }
                                    } as any)}
                                >
                                    <LinearGradient
                                        colors={['#F97316', '#EA580C']}
                                        style={st.bookBtnGrad}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Ionicons name="calendar-outline" size={20} color="#FFF" />
                                        <Text style={st.bookBtnText}>Book Appointment</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={st.emptyState}>
                        <LinearGradient
                            colors={isDark ? ['#1E293B', '#0F172A'] : [colors.surfaceTint, '#FFFFFF']}
                            style={st.emptyIconWrap}
                        >
                            <Ionicons name="document-text-outline" size={48} color={colors.primary} />
                        </LinearGradient>
                        <Text style={st.emptyTitle}>No Referrals Yet</Text>
                        <Text style={st.emptyDesc}>
                            Hospitals can refer you to other specialist facilities for advanced care.
                            They will appear here once created.
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}