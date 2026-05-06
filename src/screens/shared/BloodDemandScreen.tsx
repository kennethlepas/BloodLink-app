

import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getActiveBloodRequests } from '../../services/firebase/database';
import { db } from '../../services/firebase/firebase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Blood type colors ──
const BLOOD_TYPE_COLORS: Record<string, string> = {
    'O+': '#EF4444', 'O-': '#DC2626',
    'A+': '#3B82F6', 'A-': '#2563EB',
    'B+': '#10B981', 'B-': '#059669',
    'AB+': '#8B5CF6', 'AB-': '#7C3AED',
};

const URGENCY_COLORS: Record<string, string> = {
    critical: '#EF4444',
    high: '#F59E0B',
    medium: '#3B82F6',
    low: '#10B981',
};

interface DemandData {
    bloodType: string;
    totalRequests: number;
    criticalRequests: number;
    highRequests: number;
    pendingRequests: number;
    fulfilledRequests: number;
}

interface TrendPoint {
    label: string;
    value: number;
}

interface BookingStats {
    totalBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    completedBookings: number;
    cancelledBookings: number;
}

export default function BloodDemandScreen() {
    const { colors, isDark } = useAppTheme();
    const { user } = useUser();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [demandData, setDemandData] = useState<DemandData[]>([]);
    const [trendData, setTrendData] = useState<TrendPoint[]>([]);
    const [bookingStats, setBookingStats] = useState<BookingStats>({
        totalBookings: 0, pendingBookings: 0, confirmedBookings: 0,
        completedBookings: 0, cancelledBookings: 0,
    });
    const [totalRequests, setTotalRequests] = useState(0);
    const [totalCritical, setTotalCritical] = useState(0);
    const [totalFulfilled, setTotalFulfilled] = useState(0);
    const [totalPending, setTotalPending] = useState(0);
    const [urgencyBreakdown, setUrgencyBreakdown] = useState<Record<string, number>>({});

    const loadData = useCallback(async () => {
        try {
            // 1. Load all blood requests
            const allRequests = await getActiveBloodRequests();

            // Also fetch completed/cancelled requests for full picture
            let allRequestsDocs: any[] = [];
            try {
                const requestsRef = collection(db, 'bloodRequests');
                const allSnap = await getDocs(requestsRef);
                allRequestsDocs = allSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.log('Error fetching all requests:', e);
                allRequestsDocs = allRequests;
            }

            // 2. Calculate demand per blood type
            const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
            const demandMap: DemandData[] = bloodTypes.map(bt => {
                const btRequests = allRequestsDocs.filter((r: any) => r.bloodType === bt);
                return {
                    bloodType: bt,
                    totalRequests: btRequests.length,
                    criticalRequests: btRequests.filter((r: any) => r.urgencyLevel?.toLowerCase() === 'critical').length,
                    highRequests: btRequests.filter((r: any) => r.urgencyLevel?.toLowerCase() === 'high').length,
                    pendingRequests: btRequests.filter((r: any) => r.status === 'pending').length,
                    fulfilledRequests: btRequests.filter((r: any) => r.status === 'completed').length,
                };
            }).sort((a, b) => b.totalRequests - a.totalRequests);

            setDemandData(demandMap);

            // 3. Calculate totals
            const totReq = allRequestsDocs.length;
            const totCrit = allRequestsDocs.filter((r: any) => r.urgencyLevel?.toLowerCase() === 'critical').length;
            const totFul = allRequestsDocs.filter((r: any) => r.status === 'completed').length;
            const totPend = allRequestsDocs.filter((r: any) => r.status === 'pending').length;
            setTotalRequests(totReq);
            setTotalCritical(totCrit);
            setTotalFulfilled(totFul);
            setTotalPending(totPend);

            // 4. Urgency breakdown
            const urgency: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
            allRequestsDocs.forEach((r: any) => {
                const level = r.urgencyLevel?.toLowerCase() || 'low';
                if (urgency[level] !== undefined) urgency[level]++;
                else urgency['low']++;
            });
            setUrgencyBreakdown(urgency);

            // 5. Calculate trend data (last 6 months)
            const now = new Date();
            const months: TrendPoint[] = [];
            for (let i = 5; i >= 0; i--) {
                const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
                const label = monthDate.toLocaleDateString('en-US', { month: 'short' });
                const count = allRequestsDocs.filter((r: any) => {
                    const created = r.createdAt ? new Date(r.createdAt) : null;
                    return created && created >= monthDate && created <= monthEnd;
                }).length;
                months.push({ label, value: count });
            }
            setTrendData(months);

            // 6. Load transfusion bookings
            try {
                const bookingsRef = collection(db, 'bookings');
                const bookingsSnap = await getDocs(bookingsRef);
                const bookings = bookingsSnap.docs.map(doc => doc.data());

                const bStats: BookingStats = {
                    totalBookings: bookings.length,
                    pendingBookings: bookings.filter((b: any) => b.status === 'pending').length,
                    confirmedBookings: bookings.filter((b: any) => b.status === 'confirmed').length,
                    completedBookings: bookings.filter((b: any) => b.status === 'completed').length,
                    cancelledBookings: bookings.filter((b: any) => b.status === 'cancelled').length,
                };

                // Also check donorBookings collection
                try {
                    const donorBookingsRef = collection(db, 'donorBookings');
                    const donorBookingsSnap = await getDocs(donorBookingsRef);
                    const donorBookings = donorBookingsSnap.docs.map(doc => doc.data());

                    bStats.totalBookings += donorBookings.length;
                    bStats.pendingBookings += donorBookings.filter((b: any) => b.status === 'pending').length;
                    bStats.confirmedBookings += donorBookings.filter((b: any) => b.status === 'confirmed').length;
                    bStats.completedBookings += donorBookings.filter((b: any) => b.status === 'completed').length;
                    bStats.cancelledBookings += donorBookings.filter((b: any) => b.status === 'cancelled').length;
                } catch { }

                setBookingStats(bStats);
            } catch (e) {
                console.log('Error loading bookings:', e);
            }

        } catch (error) {
            console.error('Error loading demand data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    const maxDemand = Math.max(...demandData.map(d => d.totalRequests), 1);
    const maxTrend = Math.max(...trendData.map(t => t.value), 1);

    const brand = {
        sky: colors.primary,
        orange: '#EA580C',
        orangeLight: '#FB923C',
        orangePale: isDark ? '#2D1F1A' : '#FFF7ED',
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.primary} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Loading demand statistics...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const fulfillmentRate = totalRequests > 0 ? Math.round((totalFulfilled / totalRequests) * 100) : 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: brand.sky }]} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={brand.sky} />
            <View style={{ flex: 1, backgroundColor: colors.bg }}>
                {/* ── Header ── */}
                <LinearGradient
                    colors={[brand.sky, isDark ? '#1E3A5F' : '#60A5FA']}
                    style={styles.header}
                >
                    <View style={styles.headerRow}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backBtn}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={22} color="#FFF" />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerTitle}>Blood Demand Statistics</Text>
                            <Text style={styles.headerSubtitle}>Real-time demand overview & trends</Text>
                        </View>
                        <View style={styles.headerIcon}>
                            <Ionicons name="analytics" size={24} color="rgba(255,255,255,0.6)" />
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[brand.sky]} tintColor={brand.sky} />
                    }
                >
                    {/* ── Summary Cards ── */}
                    <View style={styles.summaryRow}>
                        {[
                            { label: 'Total Requests', value: totalRequests, icon: 'document-text', color: brand.sky, bg: isDark ? brand.sky + '20' : '#EFF6FF' },
                            { label: 'Critical', value: totalCritical, icon: 'alert-circle', color: '#EF4444', bg: isDark ? '#EF444420' : '#FEF2F2' },
                            { label: 'Pending', value: totalPending, icon: 'time', color: '#F59E0B', bg: isDark ? '#F59E0B20' : '#FFFBEB' },
                            { label: 'Fulfilled', value: totalFulfilled, icon: 'checkmark-circle', color: '#10B981', bg: isDark ? '#10B98120' : '#ECFDF5' },
                        ].map((card, i) => (
                            <View key={i} style={[styles.summaryCard, { backgroundColor: card.bg, borderColor: card.color + '30' }]}>
                                <View style={[styles.summaryIconCircle, { backgroundColor: card.color + '20' }]}>
                                    <Ionicons name={card.icon as any} size={18} color={card.color} />
                                </View>
                                <Text style={[styles.summaryValue, { color: card.color }]}>{card.value}</Text>
                                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{card.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* ── Fulfillment Rate ── */}
                    <View style={[styles.section, { paddingHorizontal: 16 }]}>
                        <View style={[styles.fulfillmentCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                            <View style={styles.fulfillmentHeader}>
                                <Ionicons name="pie-chart" size={20} color={brand.sky} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Fulfillment Rate</Text>
                            </View>
                            <View style={styles.fulfillmentBody}>
                                <View style={styles.fulfillmentCircle}>
                                    <LinearGradient
                                        colors={fulfillmentRate >= 50 ? ['#10B981', '#059669'] : ['#F59E0B', '#D97706']}
                                        style={styles.fulfillmentCircleInner}
                                    >
                                        <Text style={styles.fulfillmentPercent}>{fulfillmentRate}%</Text>
                                    </LinearGradient>
                                </View>
                                <View style={styles.fulfillmentStats}>
                                    <View style={styles.fulfillmentStatRow}>
                                        <View style={[styles.fulfillmentDot, { backgroundColor: '#10B981' }]} />
                                        <Text style={[styles.fulfillmentStatText, { color: colors.textSecondary }]}>
                                            {totalFulfilled} Fulfilled
                                        </Text>
                                    </View>
                                    <View style={styles.fulfillmentStatRow}>
                                        <View style={[styles.fulfillmentDot, { backgroundColor: '#F59E0B' }]} />
                                        <Text style={[styles.fulfillmentStatText, { color: colors.textSecondary }]}>
                                            {totalPending} Pending
                                        </Text>
                                    </View>
                                    <View style={styles.fulfillmentStatRow}>
                                        <View style={[styles.fulfillmentDot, { backgroundColor: '#EF4444' }]} />
                                        <Text style={[styles.fulfillmentStatText, { color: colors.textSecondary }]}>
                                            {totalCritical} Critical
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            {/* Progress bar */}
                            <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={[styles.progressBarFill, { width: `${fulfillmentRate}%` as any }]}
                                />
                            </View>
                        </View>
                    </View>

                    {/* ── Demand By Blood Type (Bar Chart) ── */}
                    <View style={[styles.section, { paddingHorizontal: 16 }]}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionBar, { backgroundColor: brand.orange }]} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Demand by Blood Type</Text>
                        </View>
                        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                            {demandData.map((item, i) => {
                                const barWidth = maxDemand > 0 ? (item.totalRequests / maxDemand) * 100 : 0;
                                const btColor = BLOOD_TYPE_COLORS[item.bloodType] || '#6B7280';
                                return (
                                    <View key={item.bloodType} style={styles.barRow}>
                                        <View style={styles.barLabel}>
                                            <View style={[styles.barDot, { backgroundColor: btColor }]} />
                                            <Text style={[styles.barLabelText, { color: colors.text }]}>{item.bloodType}</Text>
                                        </View>
                                        <View style={styles.barContainer}>
                                            <View style={[styles.barBg, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                                                <LinearGradient
                                                    colors={[btColor, btColor + 'CC']}
                                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                                    style={[styles.barFill, { width: `${Math.max(barWidth, 2)}%` as any }]}
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.barValues}>
                                            <Text style={[styles.barValueText, { color: colors.text }]}>{item.totalRequests}</Text>
                                            {item.criticalRequests > 0 && (
                                                <View style={styles.barCriticalBadge}>
                                                    <Text style={styles.barCriticalText}>{item.criticalRequests}🔴</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* ── Trend Graph ── */}
                    <View style={[styles.section, { paddingHorizontal: 16 }]}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionBar, { backgroundColor: brand.sky }]} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Request Trend (6 Months)</Text>
                        </View>
                        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                            <View style={styles.trendChart}>
                                {/* Y-axis lines */}
                                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                                    <View key={idx}
                                        style={[styles.trendGridLine, {
                                            bottom: ratio * 120,
                                            borderColor: isDark ? '#374151' : '#E5E7EB',
                                        }]}
                                    />
                                ))}
                                {/* Bars */}
                                <View style={styles.trendBarsRow}>
                                    {trendData.map((point, i) => {
                                        const barHeight = maxTrend > 0 ? (point.value / maxTrend) * 120 : 4;
                                        return (
                                            <View key={i} style={styles.trendBarCol}>
                                                <View style={styles.trendBarWrap}>
                                                    <LinearGradient
                                                        colors={[brand.sky, isDark ? '#1E3A5F' : '#93C5FD']}
                                                        style={[styles.trendBar, { height: Math.max(barHeight, 4) }]}
                                                    />
                                                    {point.value > 0 && (
                                                        <Text style={[styles.trendBarValue, { color: colors.text }]}>
                                                            {point.value}
                                                        </Text>
                                                    )}
                                                </View>
                                                <Text style={[styles.trendBarLabel, { color: colors.textSecondary }]}>
                                                    {point.label}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ── Urgency Distribution ── */}
                    <View style={[styles.section, { paddingHorizontal: 16 }]}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionBar, { backgroundColor: '#EF4444' }]} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Urgency Distribution</Text>
                        </View>
                        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                            {Object.entries(urgencyBreakdown).map(([level, count]) => {
                                const totalUrgency = Object.values(urgencyBreakdown).reduce((a, b) => a + b, 0) || 1;
                                const percentage = Math.round((count / totalUrgency) * 100);
                                const color = URGENCY_COLORS[level] || '#6B7280';
                                return (
                                    <View key={level} style={styles.urgencyRow}>
                                        <View style={styles.urgencyLabelRow}>
                                            <View style={[styles.urgencyDot, { backgroundColor: color }]} />
                                            <Text style={[styles.urgencyLabel, { color: colors.text }]}>
                                                {level.charAt(0).toUpperCase() + level.slice(1)}
                                            </Text>
                                            <Text style={[styles.urgencyCount, { color: colors.textSecondary }]}>
                                                {count} ({percentage}%)
                                            </Text>
                                        </View>
                                        <View style={[styles.urgencyBarBg, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                                            <View style={[styles.urgencyBarFill, { width: `${percentage}%` as any, backgroundColor: color }]} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* ── Transfusion Bookings ── */}
                    <View style={[styles.section, { paddingHorizontal: 16 }]}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionBar, { backgroundColor: '#8B5CF6' }]} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Transfusion Bookings</Text>
                        </View>
                        <View style={[styles.bookingCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                            <View style={styles.bookingStatsRow}>
                                {[
                                    { label: 'Total', value: bookingStats.totalBookings, color: '#8B5CF6', icon: 'calendar' },
                                    { label: 'Pending', value: bookingStats.pendingBookings, color: '#F59E0B', icon: 'time' },
                                    { label: 'Confirmed', value: bookingStats.confirmedBookings, color: '#3B82F6', icon: 'checkmark' },
                                    { label: 'Completed', value: bookingStats.completedBookings, color: '#10B981', icon: 'checkmark-done' },
                                ].map((stat, i) => (
                                    <View key={i} style={styles.bookingStat}>
                                        <View style={[styles.bookingStatIcon, { backgroundColor: stat.color + '15' }]}>
                                            <Ionicons name={stat.icon as any} size={16} color={stat.color} />
                                        </View>
                                        <Text style={[styles.bookingStatValue, { color: stat.color }]}>{stat.value}</Text>
                                        <Text style={[styles.bookingStatLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                                    </View>
                                ))}
                            </View>
                            {bookingStats.cancelledBookings > 0 && (
                                <View style={[styles.cancelledRow, { borderColor: isDark ? '#374151' : '#F3F4F6' }]}>
                                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                                    <Text style={[styles.cancelledText, { color: colors.textSecondary }]}>
                                        {bookingStats.cancelledBookings} cancelled booking{bookingStats.cancelledBookings !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            )}

                            {/* Booking completion rate */}
                            {bookingStats.totalBookings > 0 && (
                                <View style={styles.bookingRateSection}>
                                    <Text style={[styles.bookingRateLabel, { color: colors.textSecondary }]}>
                                        Completion Rate
                                    </Text>
                                    <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                        <LinearGradient
                                            colors={['#8B5CF6', '#7C3AED']}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                            style={[styles.progressBarFill, {
                                                width: `${Math.round((bookingStats.completedBookings / bookingStats.totalBookings) * 100)}%` as any,
                                            }]}
                                        />
                                    </View>
                                    <Text style={[styles.bookingRateValue, { color: '#8B5CF6' }]}>
                                        {Math.round((bookingStats.completedBookings / bookingStats.totalBookings) * 100)}%
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* ── Blood Type Detail Cards ── */}
                    <View style={[styles.section, { paddingHorizontal: 16 }]}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionBar, { backgroundColor: brand.orange }]} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Detailed Breakdown</Text>
                        </View>
                        <View style={styles.detailGrid}>
                            {demandData.map((item) => {
                                const btColor = BLOOD_TYPE_COLORS[item.bloodType] || '#6B7280';
                                const demandLevel = item.criticalRequests > 2 || item.totalRequests > 10
                                    ? 'Critical'
                                    : item.totalRequests > 5 || item.criticalRequests > 0
                                        ? 'High'
                                        : item.totalRequests > 2
                                            ? 'Medium'
                                            : 'Low';
                                const demandColor = demandLevel === 'Critical' ? '#EF4444'
                                    : demandLevel === 'High' ? '#F59E0B'
                                        : demandLevel === 'Medium' ? '#3B82F6' : '#10B981';
                                return (
                                    <View key={item.bloodType} style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                                        <View style={styles.detailCardHeader}>
                                            <LinearGradient
                                                colors={[btColor, btColor + 'CC']}
                                                style={styles.detailBloodCircle}
                                            >
                                                <Ionicons name="water" size={12} color="#FFF" />
                                                <Text style={styles.detailBloodType}>{item.bloodType}</Text>
                                            </LinearGradient>
                                            <View style={[styles.demandBadge, { backgroundColor: demandColor + '18', borderColor: demandColor + '40' }]}>
                                                <Text style={[styles.demandBadgeText, { color: demandColor }]}>{demandLevel}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.detailStatsRow}>
                                            <View style={styles.detailStat}>
                                                <Text style={[styles.detailStatValue, { color: colors.text }]}>{item.totalRequests}</Text>
                                                <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>Total</Text>
                                            </View>
                                            <View style={[styles.detailStatDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
                                            <View style={styles.detailStat}>
                                                <Text style={[styles.detailStatValue, { color: '#10B981' }]}>{item.fulfilledRequests}</Text>
                                                <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>Done</Text>
                                            </View>
                                            <View style={[styles.detailStatDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
                                            <View style={styles.detailStat}>
                                                <Text style={[styles.detailStatValue, { color: '#F59E0B' }]}>{item.pendingRequests}</Text>
                                                <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>Pend</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

// ── Styles ──
const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 14, fontWeight: '500' },

    header: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.18)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFF' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },
    headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },

    summaryRow: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: 10, paddingHorizontal: 16, marginTop: 20,
    },
    summaryCard: {
        width: (SCREEN_WIDTH - 42) / 2, borderRadius: 16,
        padding: 14, borderWidth: 1, alignItems: 'center',
    },
    summaryIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    summaryValue: { fontSize: 26, fontWeight: '900', marginBottom: 2 },
    summaryLabel: { fontSize: 11, fontWeight: '600' },

    section: { marginTop: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionBar: { width: 4, height: 18, borderRadius: 2 },
    sectionTitle: { fontSize: 17, fontWeight: '800' },

    fulfillmentCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
    fulfillmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    fulfillmentBody: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 16 },
    fulfillmentCircle: { width: 72, height: 72, borderRadius: 36 },
    fulfillmentCircleInner: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
    fulfillmentPercent: { fontSize: 22, fontWeight: '900', color: '#FFF' },
    fulfillmentStats: { flex: 1, gap: 8 },
    fulfillmentStatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fulfillmentDot: { width: 10, height: 10, borderRadius: 5 },
    fulfillmentStatText: { fontSize: 13, fontWeight: '600' },

    progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: 8, borderRadius: 4 },

    chartCard: { borderRadius: 16, padding: 16, borderWidth: 1 },

    barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    barLabel: { width: 52, flexDirection: 'row', alignItems: 'center', gap: 6 },
    barDot: { width: 8, height: 8, borderRadius: 4 },
    barLabelText: { fontSize: 13, fontWeight: '800' },
    barContainer: { flex: 1 },
    barBg: { height: 22, borderRadius: 11, overflow: 'hidden' },
    barFill: { height: 22, borderRadius: 11, minWidth: 4 },
    barValues: { width: 50, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
    barValueText: { fontSize: 14, fontWeight: '800' },
    barCriticalBadge: {},
    barCriticalText: { fontSize: 10 },

    trendChart: { height: 180, position: 'relative', justifyContent: 'flex-end' },
    trendGridLine: {
        position: 'absolute', left: 0, right: 0,
        height: 0, borderTopWidth: 1, borderStyle: 'dashed',
    },
    trendBarsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 150, paddingTop: 20 },
    trendBarCol: { alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
    trendBarWrap: { alignItems: 'center' },
    trendBar: { width: 28, borderRadius: 8, minHeight: 4 },
    trendBarValue: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
    trendBarLabel: { fontSize: 10, fontWeight: '600', marginTop: 6 },

    urgencyRow: { marginBottom: 14 },
    urgencyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    urgencyDot: { width: 10, height: 10, borderRadius: 5 },
    urgencyLabel: { fontSize: 14, fontWeight: '700', flex: 1 },
    urgencyCount: { fontSize: 13, fontWeight: '600' },
    urgencyBarBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
    urgencyBarFill: { height: 10, borderRadius: 5 },

    bookingCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
    bookingStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    bookingStat: { alignItems: 'center', flex: 1 },
    bookingStatIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    bookingStatValue: { fontSize: 20, fontWeight: '900', marginBottom: 2 },
    bookingStatLabel: { fontSize: 10, fontWeight: '600' },
    cancelledRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
    cancelledText: { fontSize: 12, fontWeight: '600' },
    bookingRateSection: { marginTop: 14, gap: 6 },
    bookingRateLabel: { fontSize: 12, fontWeight: '600' },
    bookingRateValue: { fontSize: 13, fontWeight: '800', textAlign: 'right' },

    detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    detailCard: {
        width: (SCREEN_WIDTH - 42) / 2, borderRadius: 16,
        padding: 12, borderWidth: 1,
    },
    detailCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    detailBloodCircle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    detailBloodType: { fontSize: 14, fontWeight: '900', color: '#FFF' },
    demandBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    demandBadgeText: { fontSize: 10, fontWeight: '800' },
    detailStatsRow: { flexDirection: 'row', alignItems: 'center' },
    detailStat: { flex: 1, alignItems: 'center' },
    detailStatValue: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
    detailStatLabel: { fontSize: 9, fontWeight: '600' },
    detailStatDivider: { width: 1, height: 28 },
});
