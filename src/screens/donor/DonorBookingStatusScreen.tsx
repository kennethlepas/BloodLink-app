import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import {
    getDonorBookingById,
    getOrCreateChat,
    subscribeToDonorBooking,
    updateDonorBookingStatus
} from '@/src/services/firebase/database';
import { DonorBooking, DonorBookingStatus } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DonorBookingStatusScreen() {
    const router = useRouter();
    const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
    const { user } = useUser();
    const { colors, isDark } = useAppTheme();

    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState<DonorBooking | null>(null);

    useEffect(() => {
        if (!bookingId) {
            setLoading(false);
            return;
        }

        // Initial load
        const loadBooking = async () => {
            try {
                const data = await getDonorBookingById(bookingId);
                setBooking(data);
            } catch (error) {
                console.error('Error loading booking:', error);
            } finally {
                setLoading(false);
            }
        };

        loadBooking();

        // Subscribe to updates
        const unsubscribe = subscribeToDonorBooking(bookingId, (updatedBooking) => {
            if (updatedBooking) {
                setBooking(updatedBooking);
            }
        });

        return () => unsubscribe();
    }, [bookingId]);

    const handleChatWithHospital = async () => {
        if (!booking || !user) return;

        try {
            const chatId = await getOrCreateChat(
                user.id,
                `${user.firstName} ${user.lastName}`,
                booking.hospitalId,
                booking.hospitalName
            );

            router.push({
                pathname: '/(shared)/chat' as any,
                params: {
                    chatId,
                    recipientName: booking.hospitalName,
                    recipientType: 'hospital'
                }
            });
        } catch (error) {
            console.error('Error opening chat:', error);
            Alert.alert('Error', 'Could not open chat with hospital.');
        }
    };

    const handleCancelBooking = async () => {
        if (!booking) return;

        Alert.alert(
            'Cancel Booking',
            'Are you sure you want to cancel this donation appointment? This will free up the slot for someone else.',
            [
                { text: 'Keep Appointment', style: 'cancel' },
                {
                    text: 'Cancel Appointment',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await updateDonorBookingStatus(booking.id, 'cancel');
                            Alert.alert('Success', 'Your booking has been cancelled.');
                            router.back();
                        } catch (error) {
                            console.error('Error cancelling booking:', error);
                            Alert.alert('Error', 'Failed to cancel booking. Please try again.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const getStatusConfig = (status: DonorBookingStatus) => {
        switch (status) {
            case 'pending':
                return { color: '#F59E0B', label: 'Pending Approval', icon: 'time', bg: '#FEF3C7' };
            case 'confirmed':
                return { color: '#2563EB', label: 'Booking Confirmed', icon: 'checkmark-circle', bg: '#DBEAFE' };
            case 'completed':
                return { color: '#10B981', label: 'Donation Completed', icon: 'trophy', bg: '#D1FAE5' };
            case 'cancelled':
            case 'cancel':
                return { color: '#6B7280', label: 'Cancelled', icon: 'close-circle', bg: '#F3F4F6' };
            case 'rejected':
                return { color: '#EF4444', label: 'Rejected', icon: 'alert-circle', bg: '#FEE2E2' };
            default:
                return { color: '#6B7280', label: status.toUpperCase(), icon: 'help-circle', bg: '#F3F4F6' };
        }
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.bg }]}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Fetching booking details...</Text>
            </View>
        );
    }

    if (!booking) {
        return (
            <View style={[styles.center, { backgroundColor: colors.bg }]}>
                <Ionicons name="alert-circle-outline" size={64} color="#CBD5E1" />
                <Text style={[styles.errorText, { color: colors.text }]}>Booking not found.</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const statusCfg = getStatusConfig(booking.status);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Booking Status</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.statusCard}>
                    <View style={[styles.statusIconCircle, { backgroundColor: statusCfg.bg }]}>
                        <Ionicons name={statusCfg.icon as any} size={32} color={statusCfg.color} />
                    </View>
                    <Text style={[styles.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    <Text style={styles.bookingId}>ID: {booking.bookingId}</Text>
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="business" size={20} color="#2563EB" />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hospital Information</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Facility Name</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{booking.hospitalName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Address</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{booking.hospitalAddress}</Text>
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="calendar" size={20} color="#2563EB" />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appointment Details</Text>
                    </View>
                    <View style={styles.doubleRow}>
                        <View style={styles.halfCol}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>{booking.scheduledDate}</Text>
                        </View>
                        <View style={styles.halfCol}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Time Slot</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>{booking.scheduledTime}</Text>
                        </View>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Blood Type</Text>
                        <View style={styles.bloodBadge}>
                            <Text style={styles.bloodText}>{booking.bloodType}</Text>
                        </View>
                    </View>
                </View>

                {booking.notes && (
                    <View style={[styles.section, { backgroundColor: colors.surface }]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="document-text" size={20} color="#2563EB" />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Notes</Text>
                        </View>
                        <Text style={[styles.notesText, { color: colors.textSecondary }]}>{booking.notes}</Text>
                    </View>
                )}

                {booking.status === 'rejected' && booking.rejectionReason && (
                    <View style={[styles.section, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1 }]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="alert-circle" size={20} color="#EF4444" />
                            <Text style={[styles.sectionTitle, { color: '#991B1B' }]}>Rejection Reason</Text>
                        </View>
                        <Text style={[styles.notesText, { color: '#B91C1C' }]}>{booking.rejectionReason}</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.chatButton}
                    onPress={handleChatWithHospital}
                    activeOpacity={0.8}
                >
                    <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.chatButtonGrad}>
                        <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
                        <Text style={styles.chatButtonText}>Message Hospital</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {booking.status === 'pending' && (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleCancelBooking}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                        <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.outlineBtn, { borderColor: colors.divider }]}
                    onPress={() => router.back()}
                >
                    <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>Back to History</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontWeight: '500' },
    errorText: { marginTop: 12, fontSize: 16, fontWeight: '600' },
    backBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#2563EB', borderRadius: 8 },
    backBtnText: { color: '#FFF', fontWeight: '700' },
    header: { padding: 20, paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
    backIcon: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    statusCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    statusIconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statusLabel: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    bookingId: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    section: { borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '700' },
    infoRow: { marginBottom: 12 },
    doubleRow: { flexDirection: 'row', marginBottom: 12 },
    halfCol: { flex: 1 },
    infoLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
    infoValue: { fontSize: 14, fontWeight: '700' },
    bloodBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
    bloodText: { color: '#EF4444', fontWeight: '800', fontSize: 13 },
    notesText: { fontSize: 14, lineHeight: 20 },
    chatButton: { marginTop: 10, borderRadius: 14, overflow: 'hidden', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    chatButtonGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
    chatButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    outlineBtn: { marginTop: 12, borderRadius: 14, borderWidth: 1, paddingVertical: 15, alignItems: 'center' },
    outlineBtnText: { fontSize: 16, fontWeight: '600' },
    cancelButton: { marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    cancelButtonText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
});