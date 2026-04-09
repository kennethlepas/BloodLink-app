import { KENYA_COUNTIES, getSubCountiesByCounty } from '@/src/constants/kenyaLocations';
import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { useTabBarAnimation } from '@/src/hooks/useTabBarAnimation';
import { createBooking, getBloodBanks, getDonorBookings } from '@/src/services/firebase/database';
import { getCurrentLocation } from '@/src/services/location/locationService';
import { sendLocalNotification } from '@/src/services/notifications';
import { BloodBank, BloodType, DonorBooking } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function BookDonationScreen() {
    const router = useRouter();
    const { user } = useUser();
    const { colors } = useAppTheme();

    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [hospitals, setHospitals] = useState<BloodBank[]>([]);
    const [filteredHospitals, setFilteredHospitals] = useState<BloodBank[]>([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [sortByDistance, setSortByDistance] = useState(false);
    const [selectedCounty, setSelectedCounty] = useState('');
    const [selectedSubCounty, setSelectedSubCounty] = useState('');
    const [isCountyFilterExpanded, setIsCountyFilterExpanded] = useState(false);
    const [isSubCountyFilterExpanded, setIsSubCountyFilterExpanded] = useState(false);
    const [countySearch, setCountySearch] = useState('');
    const [subCountySearch, setSubCountySearch] = useState('');
    const { onScroll } = useTabBarAnimation();

    // Booking selection
    const [selectedHospital, setSelectedHospital] = useState<BloodBank | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchHospitals();
        requestLocation();
    }, []);

    const requestLocation = async () => {
        try {
            const loc = await getCurrentLocation();
            if (loc) {
                // Compatibility with expo-location object expectation
                setUserLocation({ coords: loc, timestamp: Date.now() } as any);
                setSortByDistance(true);
            }
        } catch (error) {
            console.log('Location request error:', error);
        }
    };

    useEffect(() => {
        filterHospitals();
    }, [searchQuery, hospitals, sortByDistance, userLocation, selectedCounty, selectedSubCounty]);

    const fetchHospitals = async () => {
        try {
            const data = await getBloodBanks();
            setHospitals(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching hospitals:', error);
            setLoading(false);
        }
    };

    const filterHospitals = () => {
        let filtered = [...hospitals];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(h =>
                h.name.toLowerCase().includes(q) ||
                h.address.toLowerCase().includes(q) ||
                (h.county || '').toLowerCase().includes(q) ||
                (h.subCounty || '').toLowerCase().includes(q)
            );
        }

        if (selectedCounty) {
            filtered = filtered.filter(h => (h.county || '').trim().toLowerCase() === selectedCounty.trim().toLowerCase());
        }

        if (selectedSubCounty) {
            filtered = filtered.filter(h => (h.subCounty || '').trim().toLowerCase() === selectedSubCounty.trim().toLowerCase());
        }

        if (sortByDistance && userLocation) {
            filtered.sort((a, b) => {
                const distA = calculateDistance(
                    userLocation.coords.latitude,
                    userLocation.coords.longitude,
                    a.location.latitude,
                    a.location.longitude
                );
                const distB = calculateDistance(
                    userLocation.coords.latitude,
                    userLocation.coords.longitude,
                    b.location.latitude,
                    b.location.longitude
                );
                return distA - distB;
            });
        }

        setFilteredHospitals(filtered);
    };

    const handleBooking = async () => {
        if (!selectedHospital || !selectedTimeSlot) {
            Alert.alert('Incomplete', 'Please select a hospital and time slot.');
            return;
        }

        if (!user || !user.id) {
            Alert.alert('Error', 'User not found. Please log in again.');
            return;
        }

        try {
            setBookingLoading(true);

            // Check for existing active bookings for this hospital
            const existingBookings = await getDonorBookings(user.id);
            const activeDuplicate = existingBookings.find(b =>
                b.hospitalId === selectedHospital.id &&
                (b.status === 'pending' || b.status === 'confirmed')
            );

            if (activeDuplicate) {
                setBookingLoading(false);
                Alert.alert(
                    'Already Booked',
                    `You already have an active appointment at ${selectedHospital.name} for ${activeDuplicate.scheduledDate}. \n\nPlease complete or cancel your existing booking before scheduling a new one.`,
                    [{ text: 'View Existing', onPress: () => router.push({ pathname: '/(donor)/booking-status' as any, params: { bookingId: activeDuplicate.bookingId || activeDuplicate.id } }) }, { text: 'OK' }]
                );
                return;
            }
            const bookingId = `DON-${selectedHospital.code}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            const bookingData: Omit<DonorBooking, 'id' | 'createdAt' | 'updatedAt'> = {
                bookingId,
                donorId: user.id,
                donorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous Donor',
                donorPhone: user.phoneNumber || '',
                bloodType: (user.bloodType as BloodType) || 'O+',
                hospitalId: selectedHospital.id,
                hospitalName: selectedHospital.name,
                hospitalCode: selectedHospital.code,
                hospitalAddress: selectedHospital.address,
                scheduledDate: selectedDate.toISOString().split('T')[0],
                scheduledTime: selectedTimeSlot,
                status: 'pending',
                notes: notes.trim() || undefined,
            };

            await createBooking(bookingData as any);

            await sendLocalNotification(
                'Booking Confirmed! ❤️',
                `Your appointment at ${selectedHospital.name} on ${bookingData.scheduledDate} at ${bookingData.scheduledTime} is confirmed. See you there!`
            );

            // Close modal first
            setSelectedHospital(null);
            setSelectedTimeSlot('');
            setNotes('');

            // Show success alert
            Alert.alert(
                'Booking Successful! 🎉',
                `Thank you! ${selectedHospital.name} is preparing for your arrival.\n\nYour Booking ID: ${bookingId}`,
                [{ text: 'View Status', onPress: () => router.replace({ pathname: '/(donor)/booking-status' as any, params: { bookingId } }) }]
            );
        } catch (error) {
            console.error('Booking error:', error);
            Alert.alert('Error', 'Failed to schedule booking. Please try again.');
        } finally {
            setBookingLoading(false);
        }
    };

    const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];

    const closeModal = () => {
        setSelectedHospital(null);
        setSelectedTimeSlot('');
        setNotes('');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
            <LinearGradient colors={['#2563EB', '#3B82F6']} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Book Donation</Text>
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="rgba(255,255,255,0.6)" />
                    <TextInput
                        placeholder="Search hospital, county or sub-county..."
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                </View>
            </LinearGradient>

            {/* Filter Section */}
            <View style={[styles.filterContainer, { backgroundColor: colors.surface }]}>
                <View style={styles.filterRow}>
                    <TouchableOpacity
                        style={[styles.filterPicker, isCountyFilterExpanded && styles.filterPickerExpanded]}
                        onPress={() => {
                            setIsCountyFilterExpanded(!isCountyFilterExpanded);
                            setIsSubCountyFilterExpanded(false);
                        }}
                    >
                        <Text style={[styles.filterPickerText, !selectedCounty && { color: colors.textSecondary }]}>
                            {selectedCounty || 'All Counties'}
                        </Text>
                        <Ionicons name={isCountyFilterExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterPicker, isSubCountyFilterExpanded && styles.filterPickerExpanded]}
                        onPress={() => {
                            if (!selectedCounty) {
                                Alert.alert('Notice', 'Please select a county first');
                                return;
                            }
                            setIsSubCountyFilterExpanded(!isSubCountyFilterExpanded);
                            setIsCountyFilterExpanded(false);
                        }}
                    >
                        <Text style={[styles.filterPickerText, !selectedSubCounty && { color: colors.textSecondary }]}>
                            {selectedSubCounty || 'All Sub-Counties'}
                        </Text>
                        <Ionicons name={isSubCountyFilterExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {isCountyFilterExpanded && (
                    <View style={styles.filterDropdownList}>
                        <View style={styles.filterSearchBox}>
                            <Ionicons name="search" size={14} color={colors.textSecondary} />
                            <TextInput
                                placeholder="Search county..."
                                style={styles.filterSearchInput}
                                value={countySearch}
                                onChangeText={setCountySearch}
                            />
                        </View>
                        <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
                            <TouchableOpacity
                                style={[styles.filterListItem, !selectedCounty && styles.filterListItemSelected]}
                                onPress={() => {
                                    setSelectedCounty('');
                                    setSelectedSubCounty('');
                                    setIsCountyFilterExpanded(false);
                                }}
                            >
                                <Text style={[styles.filterListItemText, !selectedCounty && styles.filterListItemTextSelected]}>All Counties</Text>
                                {!selectedCounty && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </TouchableOpacity>
                            {KENYA_COUNTIES.filter(c => c.toLowerCase().includes(countySearch.toLowerCase())).map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.filterListItem, selectedCounty === c && styles.filterListItemSelected]}
                                    onPress={() => {
                                        setSelectedCounty(c);
                                        setSelectedSubCounty('');
                                        setIsCountyFilterExpanded(false);
                                    }}
                                >
                                    <Text style={[styles.filterListItemText, selectedCounty === c && styles.filterListItemTextSelected]}>{c}</Text>
                                    {selectedCounty === c && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {isSubCountyFilterExpanded && (
                    <View style={styles.filterDropdownList}>
                        <View style={styles.filterSearchBox}>
                            <Ionicons name="search" size={14} color={colors.textSecondary} />
                            <TextInput
                                placeholder="Search sub-county..."
                                style={styles.filterSearchInput}
                                value={subCountySearch}
                                onChangeText={setSubCountySearch}
                            />
                        </View>
                        <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
                            <TouchableOpacity
                                style={[styles.filterListItem, !selectedSubCounty && styles.filterListItemSelected]}
                                onPress={() => {
                                    setSelectedSubCounty('');
                                    setIsSubCountyFilterExpanded(false);
                                }}
                            >
                                <Text style={[styles.filterListItemText, !selectedSubCounty && styles.filterListItemTextSelected]}>All Sub-Counties</Text>
                                {!selectedSubCounty && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </TouchableOpacity>
                            {getSubCountiesByCounty(selectedCounty).filter(sc => sc.toLowerCase().includes(subCountySearch.toLowerCase())).map(sc => (
                                <TouchableOpacity
                                    key={sc}
                                    style={[styles.filterListItem, selectedSubCounty === sc && styles.filterListItemSelected]}
                                    onPress={() => {
                                        setSelectedSubCounty(sc);
                                        setIsSubCountyFilterExpanded(false);
                                    }}
                                >
                                    <Text style={[styles.filterListItemText, selectedSubCounty === sc && styles.filterListItemTextSelected]}>{sc}</Text>
                                    {selectedSubCounty === sc && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>

            {
                loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredHospitals}
                        keyExtractor={(item) => item.id}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.hospitalCard,
                                    { backgroundColor: colors.surface },
                                    selectedHospital?.id === item.id && styles.hospitalCardSelected
                                ]}
                                onPress={() => setSelectedHospital(item)}
                            >
                                <View style={styles.hospitalInfo}>
                                    <View style={styles.hospitalHeader}>
                                        <Text style={[styles.hospitalName, { color: colors.text }]}>{item.name}</Text>
                                        {sortByDistance && userLocation && (
                                            <View style={styles.distanceBadge}>
                                                <Ionicons name="location" size={10} color="#3B82F6" />
                                                <Text style={styles.distanceText}>
                                                    {calculateDistance(
                                                        userLocation.coords.latitude,
                                                        userLocation.coords.longitude,
                                                        item.location.latitude,
                                                        item.location.longitude
                                                    ).toFixed(1)} km
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.hospitalType}>{item.facilityType || 'Blood Bank'}</Text>
                                    <Text style={[styles.hospitalAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                                        {item.address}
                                    </Text>

                                    <View style={styles.hospitalMeta}>
                                        <View style={styles.metaItem}>
                                            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                                                {item.operatingHours?.open} - {item.operatingHours?.close}
                                            </Text>
                                        </View>
                                        {item.phoneNumber && (
                                            <View style={styles.metaItem}>
                                                <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
                                                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.phoneNumber}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                {item.criticalNeed && (
                                    <View style={styles.criticalBadge}>
                                        <Text style={styles.criticalText}>CRITICAL</Text>
                                    </View>
                                )}
                                {selectedHospital?.id === item.id && (
                                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                )}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="business-outline" size={64} color={colors.textSecondary + '40'} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    No hospitals found.
                                </Text>
                            </View>
                        }
                    />
                )
            }

            {/* Booking Modal - Centered */}
            <Modal
                visible={!!selectedHospital}
                animationType="fade"
                transparent={true}
                onRequestClose={closeModal}
            >
                <TouchableWithoutFeedback onPress={closeModal}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                style={styles.keyboardView}
                            >
                                <View style={[styles.centeredModal, { backgroundColor: colors.surface }]}>
                                    <View style={styles.modalHeader}>
                                        <Text style={[styles.modalTitle, { color: colors.text }]}>Schedule Donation</Text>
                                        <TouchableOpacity
                                            style={styles.modalCloseButton}
                                            onPress={closeModal}
                                        >
                                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Selected Hospital Info */}
                                    <View style={[styles.selectedHospitalCard, { backgroundColor: colors.bg }]}>
                                        <View style={styles.hospitalIcon}>
                                            <Ionicons name="business" size={24} color="#2563EB" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.selectedHospitalName, { color: colors.text }]}>
                                                {selectedHospital?.name}
                                            </Text>
                                            <Text style={[styles.selectedHospitalAddr, { color: colors.textSecondary }]}>
                                                {selectedHospital?.address}
                                            </Text>
                                        </View>
                                    </View>

                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        <Text style={[styles.sectionLabel, { color: colors.text }]}>Select Time Slot</Text>
                                        <View style={styles.timeGrid}>
                                            {timeSlots.map(time => (
                                                <TouchableOpacity
                                                    key={time}
                                                    style={[
                                                        styles.timeSlot,
                                                        { backgroundColor: colors.bg },
                                                        selectedTimeSlot === time && styles.timeSlotActive
                                                    ]}
                                                    onPress={() => setSelectedTimeSlot(time)}
                                                >
                                                    <Text style={[
                                                        styles.timeSlotText,
                                                        { color: colors.textSecondary },
                                                        selectedTimeSlot === time && styles.timeSlotTextActive
                                                    ]}>{time}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        {/* Notes */}
                                        <Text style={[styles.sectionLabel, { color: colors.text }]}>Additional Notes (Optional)</Text>
                                        <TextInput
                                            placeholder="Add any special requests or notes..."
                                            placeholderTextColor={colors.textSecondary}
                                            style={[styles.notesInput, {
                                                backgroundColor: colors.bg,
                                                color: colors.text,
                                                borderColor: colors.textSecondary + '40'
                                            }]}
                                            value={notes}
                                            onChangeText={setNotes}
                                            multiline
                                            numberOfLines={3}
                                        />

                                        <TouchableOpacity
                                            style={styles.bookButton}
                                            onPress={handleBooking}
                                            disabled={bookingLoading}
                                        >
                                            <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.bookButtonGrad}>
                                                {bookingLoading ? (
                                                    <ActivityIndicator size="small" color="#FFF" />
                                                ) : (
                                                    <Text style={styles.bookButtonText}>Confirm Appointment</Text>
                                                )}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </ScrollView>
                                </View>
                            </KeyboardAvoidingView>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backButton: { marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 45,
    },
    searchInput: { flex: 1, marginLeft: 10, color: '#FFF', fontSize: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 100 },
    hospitalCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    hospitalCardSelected: { borderColor: '#2563EB' },
    hospitalInfo: { flex: 1 },
    hospitalName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    hospitalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    hospitalType: { fontSize: 12, color: '#2563EB', fontWeight: '600', marginBottom: 4 },
    hospitalAddress: { fontSize: 13, marginBottom: 4 },
    hospitalMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11, fontWeight: '500' },
    distanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    distanceText: { fontSize: 11, fontWeight: '700', color: '#3B82F6' },
    criticalBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 10,
    },
    criticalText: { fontSize: 10, fontWeight: '800', color: '#EF4444' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    emptyText: { marginTop: 15, fontSize: 16 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    centeredModal: {
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    modalCloseButton: {
        padding: 4,
    },
    selectedHospitalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        gap: 12,
    },
    hospitalIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFF7ED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedHospitalName: { fontSize: 16, fontWeight: '700' },
    selectedHospitalAddr: { fontSize: 13, marginTop: 2 },
    sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12, marginTop: 8 },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    timeSlot: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        minWidth: 100,
        alignItems: 'center',
    },
    timeSlotActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
    timeSlotText: { fontWeight: '700' },
    timeSlotTextActive: { color: '#FFF' },
    notesInput: {
        borderRadius: 16,
        padding: 16,
        fontSize: 15,
        height: 80,
        textAlignVertical: 'top',
        marginBottom: 24,
        borderWidth: 1,
    },
    bookButton: { borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
    bookButtonGrad: { paddingVertical: 18, alignItems: 'center' },
    bookButtonText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
    filterContainer: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
    },
    filterPicker: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    filterPickerExpanded: {
        borderColor: '#2563EB',
        backgroundColor: '#EFF6FF',
    },
    filterPickerText: {
        fontSize: 13,
        fontWeight: '600',
    },
    filterDropdown: {
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    filterOption: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginRight: 8,
    },
    filterOptionSelected: {
        backgroundColor: '#2563EB',
    },
    filterOptionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    filterOptionTextSelected: {
        color: '#FFF',
    },
    filterDropdownList: {
        marginTop: 8,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden',
    },
    filterListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    filterListItemSelected: {
        backgroundColor: '#2563EB',
    },
    filterListItemText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    filterListItemTextSelected: {
        color: '#FFF',
    },
    filterSearchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    filterSearchInput: {
        flex: 1,
        fontSize: 13,
        marginLeft: 8,
        height: 30,
        padding: 0,
    },
});
