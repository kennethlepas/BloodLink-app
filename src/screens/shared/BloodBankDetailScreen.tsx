import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { BloodBank, BloodType } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
    Alert,
    Clipboard,
    Linking,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const BloodBankDetailScreen: React.FC = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { colors, isDark } = useAppTheme();
    const { user } = useUser();

    const item: BloodBank | null = useMemo(() => {
        try {
            if (params?.bankData) {
                return JSON.parse(params.bankData as string);
            }
        } catch (e) {
            console.error('Failed to parse bank data:', e);
        }
        return null;
    }, [params?.bankData]);

    if (!item) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <View style={styles.errorWrap}>
                    <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
                    <Text style={[styles.errorTitle, { color: colors.text }]}>Details Unavailable</Text>
                    <Text style={[styles.errorSub, { color: colors.textSecondary }]}>Could not load blood bank details.</Text>
                    <TouchableOpacity style={[styles.errorBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
                        <Text style={styles.errorBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const isDonor = user?.userType === 'donor';

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const isBloodBankOpen = (hours?: { open: string; close: string }) => {
        if (!hours?.open || !hours?.close) return null;
        const now = new Date();
        const cur = now.getHours() * 60 + now.getMinutes();
        const [oh, om] = hours.open.split(':').map(Number);
        const [ch, cm] = hours.close.split(':').map(Number);
        return cur >= oh * 60 + om && cur <= ch * 60 + cm;
    };

    const getInventoryStatus = (units: number) => {
        if (units === 0) return { color: colors.danger, label: 'Empty', bg: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2' };
        if (units < 5) return { color: colors.warning, label: 'Low', bg: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7' };
        return { color: colors.success, label: 'Good', bg: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5' };
    };

    const totalUnits = Object.values(item.inventory || {}).reduce((s, inv) => s + (inv?.units || 0), 0);
    const openStatus = isBloodBankOpen(item.operatingHours);

    // ─── OPTIMIZED CALL FUNCTION ──────────────────────────────────────────────
    const handleCall = async (phoneNumber: string) => {
        try {
            if (!phoneNumber || phoneNumber === 'Not provided' || phoneNumber.trim() === '') {
                Alert.alert('No Phone Number', 'This blood bank has no phone number listed.');
                return;
            }

            // Clean and format the phone number
            let cleanedNumber = phoneNumber.replace(/\s/g, '').replace(/-/g, '');
            cleanedNumber = cleanedNumber.replace(/[^\d+]/g, '');

            // Format Kenyan phone numbers
            if (cleanedNumber.startsWith('0') && cleanedNumber.length === 10) {
                // Convert 0712345678 to +254712345678
                cleanedNumber = '+254' + cleanedNumber.substring(1);
            } else if (cleanedNumber.match(/^254\d{9}$/)) {
                // Convert 254712345678 to +254712345678
                cleanedNumber = '+' + cleanedNumber;
            } else if (cleanedNumber.match(/^\d{9}$/)) {
                // Handle numbers like 712345678
                cleanedNumber = '+254' + cleanedNumber;
            }

            const callUrl = `tel:${cleanedNumber}`;

            // Check if calling is supported
            const canOpen = await Linking.canOpenURL(callUrl);

            if (canOpen) {
                // Show confirmation dialog before calling
                Alert.alert(
                    'Call Blood Bank',
                    `Call ${phoneNumber}?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Call',
                            onPress: async () => {
                                try {
                                    await Linking.openURL(callUrl);
                                } catch (error) {
                                    console.error('Error opening dialer:', error);
                                    Alert.alert('Error', 'Unable to open phone dialer. Please call manually.');
                                }
                            }
                        }
                    ]
                );
            } else {
                Alert.alert(
                    'Call Not Supported',
                    `Please call manually: ${phoneNumber}`,
                    [
                        {
                            text: 'Copy Number',
                            onPress: () => {
                                if (Platform.OS === 'web') {
                                    navigator.clipboard.writeText(phoneNumber);
                                } else {
                                    Clipboard.setString(phoneNumber);
                                }
                                Alert.alert('Copied', 'Phone number copied to clipboard');
                            }
                        },
                        { text: 'OK' }
                    ]
                );
            }
        } catch (err) {
            console.error('handleCall error:', err);
            Alert.alert('Error', 'Failed to initiate call. Please try again.');
        }
    };

    // ─── OPTIMIZED DIRECTIONS FUNCTION ────────────────────────────────────────
    const handleDirections = () => {
        try {
            const { latitude, longitude } = item.location;
            if (!latitude || !longitude) {
                Alert.alert('No Location', 'The exact coordinates for this blood bank are not available.');
                return;
            }

            const label = encodeURIComponent(item.name);
            const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_name=${label}`;
            const appleUrl = `maps://?daddr=${latitude},${longitude}&q=${label}`;
            const url = Platform.OS === 'ios' ? appleUrl : googleUrl;

            Linking.canOpenURL(url)
                .then(ok => {
                    if (ok) return Linking.openURL(url);
                    return Linking.openURL(googleUrl);
                })
                .catch(() => {
                    Alert.alert(
                        'Error',
                        'Unable to open maps application.',
                        [
                            {
                                text: 'Copy Coordinates',
                                onPress: () => {
                                    const coords = `${latitude}, ${longitude}`;
                                    if (Platform.OS === 'web') {
                                        navigator.clipboard.writeText(coords);
                                    } else {
                                        Clipboard.setString(coords);
                                    }
                                    Alert.alert('Copied', 'Coordinates copied to clipboard');
                                }
                            },
                            { text: 'OK' }
                        ]
                    );
                });
        } catch {
            Alert.alert('Error', 'An unexpected error occurred while opening directions.');
        }
    };

    // ─── OPTIMIZED CHAT FUNCTION ──────────────────────────────────────────────
    const handleChat = async () => {
        if (!user) {
            Alert.alert('Login Required', 'Please login to chat with blood banks.');
            return;
        }
        try {
            router.push({
                pathname: '/(shared)/chat' as any,
                params: {
                    recipientId: item.id,
                    recipientName: item.name,
                    recipientType: 'hospital',
                    chatRole: user.userType,
                },
            });
        } catch {
            Alert.alert('Error', 'Failed to start chat. Please try again.');
        }
    };

    const handleBooking = () => {
        if (isDonor) {
            router.push({
                pathname: '/(donor)/book-donation' as any,
                params: { hospitalName: item.name },
            });
        } else {
            router.push({
                pathname: '/(requester)/booking' as any,
                params: { hospitalName: item.name },
            });
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor="#2563EB" />

            {/* Gradient Header */}
            <LinearGradient
                colors={[colors.primary, '#60A5FA']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>Blood Bank Details</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.bankHeader}>
                    <View style={styles.bankIconCircle}>
                        <Ionicons name="business" size={32} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.bankName} numberOfLines={2}>{item.name}</Text>
                        <View style={styles.badgeRow}>
                            {openStatus === true && (
                                <View style={[styles.statusBadge, { backgroundColor: 'rgba(16,185,129,0.25)' }]}>
                                    <Text style={[styles.statusBadgeText, { color: '#6EE7B7' }]}>● Open Now</Text>
                                </View>
                            )}
                            {openStatus === false && (
                                <View style={[styles.statusBadge, { backgroundColor: 'rgba(239,68,68,0.25)' }]}>
                                    <Text style={[styles.statusBadgeText, { color: '#FCA5A5' }]}>● Closed</Text>
                                </View>
                            )}
                            {item.isVerified && (
                                <View style={[styles.statusBadge, { backgroundColor: 'rgba(16,185,129,0.25)' }]}>
                                    <Text style={[styles.statusBadgeText, { color: '#6EE7B7' }]}>✓ Verified</Text>
                                </View>
                            )}
                            {item.criticalNeed && (
                                <View style={[styles.statusBadge, { backgroundColor: 'rgba(239,68,68,0.3)' }]}>
                                    <Text style={[styles.statusBadgeText, { color: '#FCA5A5' }]}>⚠ Critical</Text>
                                </View>
                            )}
                            {item.distance !== undefined && (
                                <View style={styles.distanceChip}>
                                    <Ionicons name="navigate" size={12} color="#FFFFFF" />
                                    <Text style={styles.distanceText}>{item.distance.toFixed(1)} km</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Scrollable Body */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
            >
                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5' }]}
                        onPress={() => handleCall(item.phoneNumber)}
                    >
                        <Ionicons name="call" size={20} color="#10B981" />
                        <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EDE9E3' }]}
                        onPress={handleDirections}
                    >
                        <Ionicons name="navigate" size={20} color="#2C2418" />
                        <Text style={[styles.actionBtnText, { color: '#2C2418' }]}>Directions</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#EDE9FE' }]}
                        onPress={handleChat}
                    >
                        <Ionicons name="chatbubble-ellipses" size={20} color="#7C3AED" />
                        <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>Chat</Text>
                    </TouchableOpacity>
                </View>

                {/* Facility Details & Contact (combined compact) */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>🏥 Facility Info</Text>
                    <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt || colors.bg }]}>
                        {/* Two-column compact info grid */}
                        <View style={styles.compactInfoGrid}>
                            {item.facilityType && (
                                <View style={styles.compactInfoItem}>
                                    <View style={[styles.compactInfoIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}>
                                        <Ionicons name="medical" size={14} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.compactInfoLabel, { color: colors.textMuted }]}>Type</Text>
                                        <Text style={[styles.compactInfoValue, { color: colors.text }]} numberOfLines={1}>{item.facilityType}</Text>
                                    </View>
                                </View>
                            )}
                            {item.code && (
                                <View style={styles.compactInfoItem}>
                                    <View style={[styles.compactInfoIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}>
                                        <Ionicons name="barcode" size={14} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.compactInfoLabel, { color: colors.textMuted }]}>MFL Code</Text>
                                        <Text style={[styles.compactInfoValue, { color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]} numberOfLines={1}>{item.code}</Text>
                                    </View>
                                </View>
                            )}
                            <View style={styles.compactInfoItem}>
                                <View style={[styles.compactInfoIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}>
                                    <Ionicons name="call" size={14} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.compactInfoLabel, { color: colors.textMuted }]}>Phone</Text>
                                    <TouchableOpacity onPress={() => handleCall(item.phoneNumber)}>
                                        <Text style={[styles.compactInfoValue, { color: colors.primary }]} numberOfLines={1}>
                                            {item.phoneNumber && item.phoneNumber !== 'Not provided' ? item.phoneNumber : 'N/A'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {item.operatingHours && (
                                <View style={styles.compactInfoItem}>
                                    <View style={[styles.compactInfoIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}>
                                        <Ionicons name="time" size={14} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.compactInfoLabel, { color: colors.textMuted }]}>Hours</Text>
                                        <Text style={[styles.compactInfoValue, { color: colors.text }]} numberOfLines={1}>{item.operatingHours.open} – {item.operatingHours.close}</Text>
                                    </View>
                                </View>
                            )}
                            {item.rating !== undefined && item.rating > 0 && (
                                <View style={styles.compactInfoItem}>
                                    <View style={[styles.compactInfoIcon, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7' }]}>
                                        <Ionicons name="star" size={14} color="#F59E0B" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.compactInfoLabel, { color: colors.textMuted }]}>Rating</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Text style={[styles.compactInfoValue, { color: colors.text, fontWeight: '800' }]}>{item.rating.toFixed(1)}</Text>
                                            <View style={{ flexDirection: 'row' }}>
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Ionicons key={s} name={s <= Math.round(item.rating!) ? 'star' : 'star-outline'} size={10} color="#F59E0B" />
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}
                            <View style={styles.compactInfoItem}>
                                <View style={[styles.compactInfoIcon, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2' }]}>
                                    <Ionicons name="water" size={14} color="#EF4444" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.compactInfoLabel, { color: colors.textMuted }]}>Stock</Text>
                                    <Text style={[styles.compactInfoValue, { fontWeight: '800', color: totalUnits > 0 ? colors.success : colors.danger }]}>
                                        {totalUnits} units
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Full-width address row */}
                        <View style={[styles.infoRow, { marginTop: 10, marginBottom: item.email ? 10 : 0 }]}>
                            <View style={[styles.infoIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF', width: 30, height: 30, borderRadius: 10 }]}>
                                <Ionicons name="location" size={16} color={colors.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={[styles.compactInfoLabel, { color: colors.textMuted }]}>Address & Region</Text>
                                <Text style={[styles.infoValue, { color: colors.text, fontSize: 13 }]}>
                                    {item.address || 'Not provided'}{' · '}
                                    {[item.county, item.subCounty].filter(Boolean).join(', ') || ''}
                                </Text>
                            </View>
                        </View>

                        {item.email && (
                            <View style={[styles.infoRow, { marginBottom: 0 }]}>
                                <View style={[styles.infoIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF', width: 30, height: 30, borderRadius: 10 }]}>
                                    <Ionicons name="mail" size={16} color={colors.primary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <TouchableOpacity onPress={() => Linking.openURL(`mailto:${item.email}`)}>
                                        <Text style={[styles.infoValue, { color: colors.primary, textDecorationLine: 'underline', fontSize: 13 }]}>{item.email}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Blood Inventory */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>🩸 Blood Stock by Type</Text>
                    <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt || colors.bg, paddingHorizontal: 12, paddingVertical: 12 }]}>
                        <View style={styles.inventoryGrid}>
                            {BLOOD_TYPES.map(type => {
                                const units = item.inventory?.[type]?.units ?? 0;
                                const { color, bg, label } = getInventoryStatus(units);
                                const isUserType = user?.bloodType === type;
                                return (
                                    <View
                                        key={type}
                                        style={[
                                            styles.invItem,
                                            {
                                                backgroundColor: bg + '40',
                                                borderColor: isUserType ? colors.primary : color + '30',
                                                borderWidth: isUserType ? 2 : 1,
                                            }
                                        ]}
                                    >
                                        {isUserType && (
                                            <View style={{
                                                position: 'absolute', top: -6, right: -4,
                                                backgroundColor: colors.primary, borderRadius: 6,
                                                paddingHorizontal: 4, paddingVertical: 1,
                                            }}>
                                                <Text style={{ fontSize: 7, fontWeight: '800', color: '#FFF' }}>YOU</Text>
                                            </View>
                                        )}
                                        <Text style={[styles.invType, { color: colors.text }]}>{type}</Text>
                                        <Text style={[styles.invUnits, { color }]}>{units} units</Text>
                                        <Text style={{ fontSize: 8, color: color, fontWeight: '600', marginTop: 1 }}>{label}</Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Legend */}
                        <View style={styles.legendRow}>
                            {[
                                { color: '#10B981', label: '≥5 — Good' },
                                { color: '#F59E0B', label: '1–4 — Low' },
                                { color: '#EF4444', label: '0 — Empty' },
                            ].map(l => (
                                <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                                    <Text style={[styles.legendText, { color: colors.textMuted }]}>{l.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Book Appointment CTA - Always Blue */}
                <View style={styles.section}>
                    <TouchableOpacity activeOpacity={0.85} onPress={handleBooking}>
                        <LinearGradient
                            colors={['#3B82F6', '#2563EB']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.bookingBtn}
                        >
                            <Ionicons name={isDonor ? 'heart' : 'medkit'} size={22} color="#FFFFFF" />
                            <Text style={styles.bookingBtnText}>
                                {isDonor ? 'Book Donation Here' : 'Book Transfusion Here'}
                            </Text>
                            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text style={[styles.bookingHint, { color: colors.textMuted }]}>
                        {isDonor
                            ? `Schedule a blood donation appointment at ${item.name}`
                            : `Schedule a transfusion appointment at ${item.name}`
                        }
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Error state
    errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    errorTitle: { fontSize: 20, fontWeight: '800', marginTop: 16, marginBottom: 8 },
    errorSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    errorBtn: { marginTop: 24, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
    errorBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

    // Header
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', flex: 1, textAlign: 'center' },

    bankHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    bankIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    bankName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusBadgeText: { fontSize: 11, fontWeight: '700' },
    distanceChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)' },
    distanceText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },

    // Body
    body: { padding: 16, paddingBottom: 40 },

    // Quick Actions
    actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    actionBtn: { flex: 1, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12 },
    actionBtnText: { fontSize: 12, fontWeight: '700' },

    // Sections
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },

    // Info card
    infoCard: { borderRadius: 14, padding: 14 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    infoIcon: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 10, fontWeight: '600', marginBottom: 2, textTransform: 'uppercase' },
    infoValue: { fontSize: 13, fontWeight: '500' },

    // Compact two-column info grid
    compactInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    compactInfoItem: {
        width: '47%' as any,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
    },
    compactInfoIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    compactInfoLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', marginBottom: 1 },
    compactInfoValue: { fontSize: 12, fontWeight: '600' },

    // Inventory grid
    inventoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    invItem: {
        width: '22%' as any,
        borderRadius: 12,
        alignItems: 'center',
        gap: 2,
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    invType: { fontSize: 14, fontWeight: '800' },
    invUnits: { fontSize: 9, fontWeight: '700' },
    legendRow: { flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' },
    legendDot: { width: 7, height: 7, borderRadius: 4 },
    legendText: { fontSize: 10, marginLeft: 4 },

    // Booking CTA
    bookingBtn: {
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    bookingBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    bookingHint: { fontSize: 11, textAlign: 'center', marginTop: 8, fontWeight: '500' },
});

export default BloodBankDetailScreen;