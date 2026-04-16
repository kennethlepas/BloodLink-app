import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { createRecipientBooking, getBloodBanks, getRecipientBookings, updateRecipientBookingStatus } from '@/src/services/firebase/database';
import { getCurrentLocation } from '@/src/services/location/locationService';
import { sendLocalNotification } from '@/src/services/notifications';
import { BloodBank, BloodType, RecipientBooking } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KENYA_COUNTIES, getSubCountiesByCounty } from '../../constants/kenyaLocations';

const { width } = Dimensions.get('window');

// Type definitions
interface LocationCoords {
    latitude: number;
    longitude: number;
}

interface UserLocation {
    coords: LocationCoords;
    timestamp: number;
}

interface BookingFormData {
    patientName: string;
    unitsNeeded: number;
    bloodComponent: string;
    selectedTimeSlot: string;
    notes: string;
    scheduledDate: Date;
}

// Constants
const BLOOD_COMPONENTS = [
    'Whole Blood',
    'Red Blood Cells',
    'Platelets',
    'Plasma',
    'Cryoprecipitate'
] as const;

type BloodComponent = typeof BLOOD_COMPONENTS[number];

const TIME_SLOTS = [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM'
] as const;

type TimeSlot = typeof TIME_SLOTS[number];

// Color palette — Now primarily consumed via ThemeContext
const COLORS = {
    primary: {
        main: '#3B82F6',
        light: '#60A5FA',
        dark: '#2563EB',
        pale: '#DBEAFE',
        gradient: ['#3B82F6', '#2563EB'] as const,
    },
    secondary: {
        main: '#8B5CF6',
        light: '#A78BFA',
        dark: '#7C3AED',
        pale: '#EDE9FE',
        gradient: ['#8B5CF6', '#7C3AED'] as const,
    },
    success: {
        main: '#10B981',
        light: '#34D399',
        dark: '#059669',
        pale: '#D1FAE5',
    },
    warning: {
        main: '#F59E0B',
        light: '#FBBF24',
        dark: '#D97706',
        pale: '#FEF3C7',
    },
    error: {
        main: '#EF4444',
        light: '#F87171',
        dark: '#DC2626',
        pale: '#FEE2E2',
    },
    info: {
        main: '#06B6D4',
        light: '#22D3EE',
        dark: '#0891B2',
        pale: '#CFFAFE',
    },
    neutral: {
        50: '#F9FAFB',
        100: '#F3F4F6',
        200: '#E5E7EB',
        300: '#D1D5DB',
        400: '#9CA3AF',
        500: '#6B7280',
        600: '#4B5563',
        700: '#374151',
        800: '#1F2937',
        900: '#111827',
    },
} as const;

// Utility functions
const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
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

const generateBookingId = (hospitalCode: string): string => {
    return `REC-${hospitalCode}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

export default function BookRecipientScreen(): JSX.Element {
    const router = useRouter();
    const params = useLocalSearchParams<{ referralId?: string; hospitalName?: string }>();
    const { user } = useUser();
    const { colors, isDark } = useAppTheme();
    const dynamicStyles = getStyles(colors, isDark);

    // State
    const [loading, setLoading] = useState<boolean>(true);
    const [bookingLoading, setBookingLoading] = useState<boolean>(false);
    const [recipientBookings, setRecipientBookings] = useState<RecipientBooking[]>([]);
    const [historyModalVisible, setHistoryModalVisible] = useState<boolean>(false);
    const [refreshingHistory, setRefreshingHistory] = useState<boolean>(false);
    const [hospitals, setHospitals] = useState<BloodBank[]>([]);
    const [filteredHospitals, setFilteredHospitals] = useState<BloodBank[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [sortByDistance, setSortByDistance] = useState<boolean>(false);
    const [selectedHospital, setSelectedHospital] = useState<BloodBank | null>(null);
    const [formData, setFormData] = useState<BookingFormData>({
        patientName: '',
        unitsNeeded: 1,
        bloodComponent: 'Whole Blood',
        selectedTimeSlot: '',
        notes: '',
        scheduledDate: new Date(),
    });
    const [selectedCounty, setSelectedCounty] = useState('');
    const [selectedSubCounty, setSelectedSubCounty] = useState('');
    const [isCountyExpanded, setIsCountyExpanded] = useState(false);
    const [isSubCountyExpanded, setIsSubCountyExpanded] = useState(false);
    const [countySearch, setCountySearch] = useState('');
    const [subCountySearch, setSubCountySearch] = useState('');
    const [timeFilter, setTimeFilter] = useState<'all' | 'month' | '3months' | 'year'>('all');

    // Effects
    useEffect(() => {
        fetchHospitals();
        requestLocation();
        fetchHistory();
    }, []);

    useEffect(() => {
        filterHospitals();
    }, [searchQuery, hospitals, sortByDistance, userLocation, selectedCounty, selectedSubCounty]);

    // Handlers
    const fetchHistory = useCallback(async () => {
        if (!user?.id) return;
        try {
            setRefreshingHistory(true);
            const bookings = await getRecipientBookings(user.id);
            setRecipientBookings(bookings || []);
        } catch (error) {
            console.error('Error fetching booking history:', error);
        } finally {
            setRefreshingHistory(false);
        }
    }, [user?.id]);

    const requestLocation = async (): Promise<void> => {
        try {
            const loc = await getCurrentLocation();
            if (loc) {
                setUserLocation({
                    coords: {
                        latitude: loc.latitude,
                        longitude: loc.longitude
                    },
                    timestamp: Date.now()
                });
                setSortByDistance(true);
            }
        } catch (error) {
            console.log('Location request error:', error);
        }
    };

    const fetchHospitals = async (): Promise<void> => {
        try {
            const data = await getBloodBanks();
            setHospitals(data);

            if (params.hospitalName) {
                const preselected = data.find(h => h.name === params.hospitalName);
                if (preselected) setSelectedHospital(preselected);
            }
        } catch (error) {
            console.error('Error fetching hospitals:', error);
            Alert.alert('Error', 'Failed to load hospitals. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const filterHospitals = useCallback((): void => {
        let filtered = [...hospitals];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(h =>
                h.name.toLowerCase().includes(q) ||
                h.address.toLowerCase().includes(q)
            );
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

        // County and Sub-County filtering
        if (selectedCounty) {
            filtered = filtered.filter(h => (h.county || '').trim().toLowerCase() === selectedCounty.trim().toLowerCase());
        }
        if (selectedSubCounty) {
            filtered = filtered.filter(h => (h.subCounty || '').trim().toLowerCase() === selectedSubCounty.trim().toLowerCase());
        }

        // Sub-county prioritization (if no specific sub-county filter is applied)
        if (!selectedSubCounty && user?.subCounty) {
            const userSubCounty = user.subCounty.trim().toLowerCase();
            filtered.sort((a, b) => {
                const aInSubCounty = (a.subCounty || '').trim().toLowerCase() === userSubCounty;
                const bInSubCounty = (b.subCounty || '').trim().toLowerCase() === userSubCounty;
                if (aInSubCounty && !bInSubCounty) return -1;
                if (!aInSubCounty && bInSubCounty) return 1;
                return 0;
            });
        }

        setFilteredHospitals(filtered);
    }, [hospitals, searchQuery, sortByDistance, userLocation, selectedCounty, selectedSubCounty, user?.subCounty]);

    const updateFormField = <K extends keyof BookingFormData>(
        field: K,
        value: BookingFormData[K]
    ): void => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBooking = async (): Promise<void> => {
        if (!selectedHospital || !formData.selectedTimeSlot) {
            Alert.alert('Incomplete', 'Please select a hospital and time slot.');
            return;
        }

        if (!user?.id) {
            Alert.alert('Error', 'User not found. Please log in again.');
            return;
        }

        const existingBooking = recipientBookings.find(b =>
            b.hospitalId === selectedHospital.id &&
            b.scheduledDate === formData.scheduledDate.toISOString().split('T')[0] &&
            (b.status === 'pending' || b.status === 'confirmed')
        );

        if (existingBooking) {
            Alert.alert(
                'Slot Already Booked',
                `You already have a ${existingBooking.status} booking at ${selectedHospital.name} for this date. You can view your bookings in the History section.`,
                [{ text: 'OK' }]
            );
            return;
        }

        // Blood Stock Availability Check
        const hospitalBloodType = user?.bloodType || 'O+';
        const inventory = selectedHospital.inventory;
        const availableUnits = inventory?.[hospitalBloodType]?.units || 0;

        if (availableUnits <= 0) {
            Alert.alert(
                'Out of Stock 🩸',
                `We apology, but ${selectedHospital.name} currently does not have ${hospitalBloodType} blood in stock. You can still schedule a consultation, but transfusion may be delayed.`,
                [
                    { text: 'Find Another', onPress: () => setSelectedHospital(null) },
                    { text: 'Book Anyway', onPress: () => proceedWithBooking() }
                ]
            );
            return;
        }

        if (availableUnits < formData.unitsNeeded) {
            Alert.alert(
                'Low Stock 🩸',
                `${selectedHospital.name} only has ${availableUnits} units of ${hospitalBloodType} available, which is less than your requested ${formData.unitsNeeded} units.`,
                [
                    { text: 'Adjust Units', onPress: () => { } },
                    { text: 'Find Another', onPress: () => setSelectedHospital(null) },
                    { text: 'Proceed', onPress: () => proceedWithBooking() }
                ]
            );
            return;
        }

        proceedWithBooking();
    };

    const proceedWithBooking = async () => {
        if (!selectedHospital || !user?.id) return;

        try {
            setBookingLoading(true);
            const bookingId = generateBookingId(selectedHospital.code);

            const requesterName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous';

            const bookingData: Omit<RecipientBooking, 'id' | 'createdAt' | 'updatedAt'> = {
                bookingId,
                requesterId: user.id,
                requesterName,
                requesterPhone: user.phoneNumber || '',
                bloodType: (user.bloodType as BloodType) || 'O+',
                bloodComponent: formData.bloodComponent,
                hospitalId: selectedHospital.id,
                hospitalName: selectedHospital.name,
                hospitalCode: selectedHospital.code,
                hospitalAddress: selectedHospital.address,
                scheduledDate: formData.scheduledDate.toISOString().split('T')[0],
                scheduledTime: formData.selectedTimeSlot,
                status: 'pending',
                patientName: formData.patientName.trim() || undefined,
                unitsNeeded: formData.unitsNeeded,
                notes: formData.notes.trim() || undefined,
                referralId: params.referralId || undefined,
            };

            await createRecipientBooking(bookingData);

            await sendLocalNotification(
                'Transfusion Slot Booked! 🏥',
                `Your appointment at ${selectedHospital.name} on ${bookingData.scheduledDate} at ${bookingData.scheduledTime} is scheduled. Please bring your medical documents.`
            );

            resetFormAndClose();

            Alert.alert(
                'Booking Successful! 🏥',
                `Your transfusion slot has been scheduled at ${selectedHospital.name}.\n\nYour Booking ID: ${bookingId}`,
                [{ text: 'Great!', onPress: () => router.back() }]
            );
        } catch (error) {
            console.error('Booking error:', error);
            Alert.alert('Error', 'Failed to schedule transfusion slot. Please try again.');
        } finally {
            setBookingLoading(false);
        }
    };

    const resetFormAndClose = (): void => {
        setSelectedHospital(null);
        setFormData({
            patientName: '',
            unitsNeeded: 1,
            bloodComponent: 'Whole Blood',
            selectedTimeSlot: '',
            notes: '',
            scheduledDate: new Date(),
        });
    };

    const closeModal = (): void => {
        resetFormAndClose();
    };

    const adjustUnits = (increment: boolean): void => {
        const newValue = increment
            ? formData.unitsNeeded + 1
            : Math.max(1, formData.unitsNeeded - 1);
        updateFormField('unitsNeeded', newValue);
    };

    // Memoized values
    const distanceToHospital = useMemo(() => {
        if (!selectedHospital || !userLocation) return null;
        return calculateDistance(
            userLocation.coords.latitude,
            userLocation.coords.longitude,
            selectedHospital.location.latitude,
            selectedHospital.location.longitude
        ).toFixed(1);
    }, [selectedHospital, userLocation]);

    // Render helpers
    const renderHospitalCard = ({ item }: { item: BloodBank }): JSX.Element => {
        const isSelected = selectedHospital?.id === item.id;
        const distance = sortByDistance && userLocation
            ? calculateDistance(
                userLocation.coords.latitude,
                userLocation.coords.longitude,
                item.location.latitude,
                item.location.longitude
            ).toFixed(1)
            : null;

        return (
            <TouchableOpacity
                style={[
                    dynamicStyles.hospitalCard,
                    isSelected && dynamicStyles.hospitalCardSelected
                ]}
                onPress={() => setSelectedHospital(item)}
                activeOpacity={0.7}
            >
                <View style={dynamicStyles.hospitalInfo}>
                    <View style={dynamicStyles.hospitalHeader}>
                        <Text style={dynamicStyles.hospitalName}>{item.name}</Text>
                        {distance && (
                            <View style={dynamicStyles.distanceBadge}>
                                <Ionicons name="location" size={12} color={colors.primary} />
                                <Text style={dynamicStyles.distanceText}>{distance} km</Text>
                            </View>
                        )}
                    </View>
                    <Text style={dynamicStyles.hospitalType}>{item.facilityType || 'Hospital'}</Text>
                    <Text style={dynamicStyles.hospitalAddress} numberOfLines={1}>
                        {item.address}
                    </Text>
                    <View style={dynamicStyles.hospitalMeta}>
                        <View style={dynamicStyles.metaItem}>
                            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                            <Text style={dynamicStyles.metaText}>
                                {item.operatingHours?.open} - {item.operatingHours?.close}
                            </Text>
                        </View>
                        {item.phoneNumber && (
                            <View style={dynamicStyles.metaItem}>
                                <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                                <Text style={dynamicStyles.metaText}>{item.phoneNumber}</Text>
                            </View>
                        )}
                    </View>
                </View>
                {isSelected && (
                    <Ionicons name="checkmark-circle" size={28} color={COLORS.success.main} />
                )}
            </TouchableOpacity>
        );
    };

    const renderBloodComponent = (component: BloodComponent): JSX.Element => (
        <TouchableOpacity
            key={component}
            style={[
                dynamicStyles.compChip,
                formData.bloodComponent === component && dynamicStyles.compChipActive
            ]}
            onPress={() => updateFormField('bloodComponent', component)}
        >
            <Text style={[
                dynamicStyles.compChipText,
                formData.bloodComponent === component && dynamicStyles.compChipTextActive
            ]}>
                {component}
            </Text>
        </TouchableOpacity>
    );

    const renderTimeSlot = (timeSlot: TimeSlot): JSX.Element => (
        <TouchableOpacity
            key={timeSlot}
            style={[
                dynamicStyles.timeSlot,
                formData.selectedTimeSlot === timeSlot && dynamicStyles.timeSlotActive
            ]}
            onPress={() => updateFormField('selectedTimeSlot', timeSlot)}
        >
            <Text style={[
                dynamicStyles.timeSlotText,
                formData.selectedTimeSlot === timeSlot && dynamicStyles.timeSlotTextActive
            ]}>
                {timeSlot}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={dynamicStyles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            {/* Header */}
            <LinearGradient
                colors={COLORS.primary.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={dynamicStyles.header}
            >
                <View style={dynamicStyles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
                        <View style={dynamicStyles.iconCircle}>
                            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                    <Text style={dynamicStyles.headerTitle}>Book Transfusion</Text>
                    <TouchableOpacity onPress={() => setHistoryModalVisible(true)} style={dynamicStyles.historyButton}>
                        <Ionicons name="time" size={20} color="#FFFFFF" />
                        <Text style={dynamicStyles.historyButtonText}>History</Text>
                    </TouchableOpacity>
                </View>

                <View style={dynamicStyles.searchContainer}>
                    <Ionicons name="search" size={20} color="rgba(255,255,255,0.8)" />
                    <TextInput
                        placeholder="Search hospital by name or location..."
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        style={dynamicStyles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* County and Sub-County Dropdowns */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            height: 44,
                            borderWidth: isCountyExpanded ? 1 : 0,
                            borderColor: '#FFF'
                        }}
                        onPress={() => {
                            setIsCountyExpanded(!isCountyExpanded);
                            setIsSubCountyExpanded(false);
                        }}
                    >
                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                            {selectedCounty || 'All Counties'}
                        </Text>
                        <Ionicons name={isCountyExpanded ? "chevron-up" : "chevron-down"} size={16} color="#FFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            height: 44,
                            borderWidth: isSubCountyExpanded ? 1 : 0,
                            borderColor: '#FFF'
                        }}
                        onPress={() => {
                            if (!selectedCounty) {
                                Alert.alert('Notice', 'Please select a county first');
                                return;
                            }
                            setIsSubCountyExpanded(!isSubCountyExpanded);
                            setIsCountyExpanded(false);
                        }}
                    >
                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                            {selectedSubCounty || 'All Sub-Counties'}
                        </Text>
                        <Ionicons name={isSubCountyExpanded ? "chevron-up" : "chevron-down"} size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {isCountyExpanded && (
                    <View style={{ backgroundColor: colors.surface, borderRadius: 12, marginTop: 10, maxHeight: 250, overflow: 'hidden', borderWidth: 1, borderColor: colors.primary }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.surfaceAlt }}>
                            <Ionicons name="search" size={16} color={colors.textSecondary} />
                            <TextInput
                                placeholder="Search county..."
                                placeholderTextColor={colors.textMuted}
                                style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.text, paddingVertical: 8 }}
                                value={countySearch}
                                onChangeText={setCountySearch}
                            />
                        </View>
                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                            <TouchableOpacity
                                style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.divider }}
                                onPress={() => { setSelectedCounty(''); setSelectedSubCounty(''); setIsCountyExpanded(false); setCountySearch(''); }}
                            >
                                <Text style={{ color: colors.text, fontWeight: '700' }}>All Counties</Text>
                            </TouchableOpacity>
                            {KENYA_COUNTIES.filter(c => c.toLowerCase().includes(countySearch.toLowerCase())).map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: selectedCounty === c ? colors.surfaceAlt : colors.surface }}
                                    onPress={() => { setSelectedCounty(c); setSelectedSubCounty(''); setIsCountyExpanded(false); setCountySearch(''); }}
                                >
                                    <Text style={{ color: selectedCounty === c ? colors.primary : colors.text }}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {isSubCountyExpanded && (
                    <View style={{ backgroundColor: colors.surface, borderRadius: 12, marginTop: 10, maxHeight: 250, overflow: 'hidden', borderWidth: 1, borderColor: colors.primary }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.surfaceAlt }}>
                            <Ionicons name="search" size={16} color={colors.textSecondary} />
                            <TextInput
                                placeholder="Search sub-county..."
                                placeholderTextColor={colors.textMuted}
                                style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.text, paddingVertical: 8 }}
                                value={subCountySearch}
                                onChangeText={setSubCountySearch}
                            />
                        </View>
                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                            <TouchableOpacity
                                style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.divider }}
                                onPress={() => { setSelectedSubCounty(''); setIsSubCountyExpanded(false); setSubCountySearch(''); }}
                            >
                                <Text style={{ color: colors.text, fontWeight: '700' }}>All Sub-Counties</Text>
                            </TouchableOpacity>
                            {getSubCountiesByCounty(selectedCounty).filter(sc => sc.toLowerCase().includes(subCountySearch.toLowerCase())).map(sc => (
                                <TouchableOpacity
                                    key={sc}
                                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: selectedSubCounty === sc ? colors.surfaceAlt : colors.surface }}
                                    onPress={() => { setSelectedSubCounty(sc); setIsSubCountyExpanded(false); setSubCountySearch(''); }}
                                >
                                    <Text style={{ color: selectedSubCounty === sc ? colors.primary : colors.text }}>{sc}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </LinearGradient>

            {/* Hospital List */}
            {loading ? (
                <View style={dynamicStyles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredHospitals}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={dynamicStyles.listContent}
                    renderItem={renderHospitalCard}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={dynamicStyles.emptyState}>
                            <Ionicons name="business-outline" size={64} color={colors.textMuted} />
                            <Text style={dynamicStyles.emptyText}>No hospitals found</Text>
                            <Text style={dynamicStyles.emptySubtext}>Try adjusting your search</Text>
                        </View>
                    }
                />
            )}

            {/* Booking Modal */}
            <Modal
                visible={!!selectedHospital}
                animationType="slide"
                transparent={true}
                onRequestClose={closeModal}
            >
                <TouchableWithoutFeedback onPress={closeModal}>
                    <View style={dynamicStyles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                style={dynamicStyles.keyboardView}
                            >
                                <View style={dynamicStyles.modalContent}>
                                    <LinearGradient
                                        colors={[colors.surfaceAlt, colors.bg]}
                                        style={dynamicStyles.modalHeader}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Text style={dynamicStyles.modalTitle}>Schedule Transfusion</Text>
                                        <TouchableOpacity onPress={closeModal} style={dynamicStyles.modalCloseButton}>
                                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </LinearGradient>

                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={dynamicStyles.modalScrollContent}
                                    >
                                        {/* Hospital Info Card */}
                                        <View style={dynamicStyles.selectedHospitalCard}>
                                            <LinearGradient
                                                colors={[colors.surfaceAlt, colors.surfaceTint]}
                                                style={dynamicStyles.hospitalIcon}
                                            >
                                                <Ionicons name="business" size={28} color={colors.primary} />
                                            </LinearGradient>
                                            <View style={dynamicStyles.selectedHospitalInfo}>
                                                <Text style={dynamicStyles.selectedHospitalName}>
                                                    {selectedHospital?.name}
                                                </Text>
                                                <Text style={dynamicStyles.selectedHospitalAddr}>
                                                    {selectedHospital?.address}
                                                </Text>
                                                {distanceToHospital && (
                                                    <View style={dynamicStyles.selectedDistance}>
                                                        <Ionicons name="location" size={12} color={colors.primary} />
                                                        <Text style={dynamicStyles.selectedDistanceText}>
                                                            {distanceToHospital} km away
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        {/* Patient Name */}
                                        <Text style={dynamicStyles.sectionLabel}>Patient Name (Optional)</Text>
                                        <TextInput
                                            placeholder="Enter patient name"
                                            placeholderTextColor={colors.textMuted}
                                            style={dynamicStyles.inputField}
                                            value={formData.patientName}
                                            onChangeText={(text) => updateFormField('patientName', text)}
                                        />

                                        {/* Units Needed */}
                                        <Text style={dynamicStyles.sectionLabel}>Units Required</Text>
                                        <View style={dynamicStyles.unitsRow}>
                                            <TouchableOpacity
                                                style={dynamicStyles.unitBtn}
                                                onPress={() => adjustUnits(false)}
                                            >
                                                <Ionicons name="remove" size={24} color={colors.primary} />
                                            </TouchableOpacity>
                                            <Text style={dynamicStyles.unitsValue}>{formData.unitsNeeded}</Text>
                                            <TouchableOpacity
                                                style={dynamicStyles.unitBtn}
                                                onPress={() => adjustUnits(true)}
                                            >
                                                <Ionicons name="add" size={24} color={colors.primary} />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Blood Component */}
                                        <Text style={dynamicStyles.sectionLabel}>Blood Component</Text>
                                        <View style={dynamicStyles.componentGrid}>
                                            {BLOOD_COMPONENTS.map(renderBloodComponent)}
                                        </View>

                                        {/* Time Slot */}
                                        <Text style={dynamicStyles.sectionLabel}>Preferred Time</Text>
                                        <View style={dynamicStyles.timeGrid}>
                                            {TIME_SLOTS.map(renderTimeSlot)}
                                        </View>

                                        {/* Notes */}
                                        <Text style={dynamicStyles.sectionLabel}>Special Instructions (Optional)</Text>
                                        <TextInput
                                            placeholder="Any specific requirements or notes..."
                                            placeholderTextColor={colors.textMuted}
                                            style={dynamicStyles.notesInput}
                                            value={formData.notes}
                                            onChangeText={(text) => updateFormField('notes', text)}
                                            multiline
                                            numberOfLines={3}
                                            textAlignVertical="top"
                                        />

                                        {/* Book Button */}
                                        <TouchableOpacity
                                            style={dynamicStyles.bookButton}
                                            onPress={handleBooking}
                                            disabled={bookingLoading}
                                        >
                                            <LinearGradient
                                                colors={COLORS.primary.gradient}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={dynamicStyles.bookButtonGrad}
                                            >
                                                {bookingLoading ? (
                                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                                ) : (
                                                    <>
                                                        <Text style={dynamicStyles.bookButtonText}>Confirm Appointment</Text>
                                                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                                                    </>
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
            {/* History Modal */}
            <Modal visible={historyModalVisible} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '80%', padding: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>Booking History</Text>
                            <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={{ padding: 5 }}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Time Filter Chips */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'month', label: 'This Month' },
                                { id: '3months', label: '3 Months' },
                                { id: 'year', label: 'This Year' }
                            ].map((filter) => (
                                <TouchableOpacity
                                    key={filter.id}
                                    onPress={() => setTimeFilter(filter.id as any)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 20,
                                        backgroundColor: timeFilter === filter.id ? colors.primary : colors.surfaceAlt,
                                        borderWidth: 1,
                                        borderColor: timeFilter === filter.id ? colors.primary : colors.surfaceBorder
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: '700',
                                        color: timeFilter === filter.id ? '#FFF' : colors.textSecondary
                                    }}>{filter.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {refreshingHistory && !recipientBookings.length ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                        ) : recipientBookings.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
                                <Ionicons name="calendar-outline" size={60} color={colors.surfaceTint} />
                                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textSecondary, marginTop: 20 }}>No Bookings Yet</Text>
                                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 10 }}>Your transfusion bookings will appear here.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={recipientBookings.filter(item => {
                                    if (timeFilter === 'all') return true;
                                    const bookingDate = new Date(item.scheduledDate);
                                    const now = new Date();
                                    if (timeFilter === 'month') {
                                        return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
                                    }
                                    if (timeFilter === '3months') {
                                        const threeMonthsAgo = new Date();
                                        threeMonthsAgo.setMonth(now.getMonth() - 3);
                                        return bookingDate >= threeMonthsAgo;
                                    }
                                    if (timeFilter === 'year') {
                                        return bookingDate.getFullYear() === now.getFullYear();
                                    }
                                    return true;
                                })}
                                keyExtractor={(item) => item.id}
                                refreshing={refreshingHistory}
                                onRefresh={fetchHistory}
                                renderItem={({ item }) => {
                                    const statusColors: Record<string, string> = {
                                        pending: colors.warning,
                                        confirmed: colors.primary,
                                        completed: colors.success,
                                        cancelled: colors.danger,
                                        cancel: colors.danger,
                                    };
                                    const statusColor = statusColors[item.status] || colors.textSecondary;

                                    return (
                                        <View style={{
                                            backgroundColor: colors.surfaceAlt,
                                            borderRadius: 18,
                                            padding: 16,
                                            marginBottom: 16,
                                            borderWidth: 1,
                                            borderColor: colors.surfaceBorder
                                        }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <View>
                                                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{item.hospitalName}</Text>
                                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>ID: {item.bookingId}</Text>
                                                </View>
                                                <View style={{
                                                    backgroundColor: statusColor + (isDark ? '30' : '15'),
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 4,
                                                    borderRadius: 10,
                                                    height: 24
                                                }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '900', color: statusColor, textTransform: 'uppercase' }}>{item.status}</Text>
                                                </View>
                                            </View>

                                            <View style={{ flexDirection: 'row', gap: 15, marginBottom: 12 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                    <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                                                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>{item.scheduledDate}</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                    <Ionicons name="time-outline" size={14} color={colors.primary} />
                                                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>{item.scheduledTime}</Text>
                                                </View>
                                            </View>

                                            <View style={{ height: 1, backgroundColor: colors.surfaceBorder, marginBottom: 12 }} />

                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Patient: <Text style={{ color: colors.text, fontWeight: '700' }}>{item.patientName || 'Self'}</Text></Text>
                                                {item.status === 'pending' && (
                                                    <TouchableOpacity
                                                        onPress={async () => {
                                                            Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
                                                                { text: 'No', style: 'cancel' },
                                                                {
                                                                    text: 'Yes, Cancel',
                                                                    style: 'destructive',
                                                                    onPress: async () => {
                                                                        try {
                                                                            await updateRecipientBookingStatus(item.id, 'cancel');
                                                                            fetchHistory();
                                                                        } catch (error) {
                                                                            Alert.alert('Error', 'Failed to cancel booking.');
                                                                        }
                                                                    }
                                                                }
                                                            ]);
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 13, color: colors.danger, fontWeight: '700' }}>Cancel</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    );
                                }}
                                contentContainerStyle={{ paddingBottom: 40 }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 20 : 40,
        paddingHorizontal: 20,
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        marginRight: 16,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        flex: 1,
    },
    historyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    historyButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 50,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        color: '#FFFFFF',
        fontSize: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    hospitalCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    hospitalCardSelected: {
        borderColor: colors.primary,
        borderWidth: 2,
        backgroundColor: colors.surfaceAlt,
    },
    hospitalInfo: {
        flex: 1,
    },
    hospitalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    hospitalName: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
    },
    hospitalType: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
        marginBottom: 4,
    },
    hospitalAddress: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    hospitalMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : '#DBEAFE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    distanceText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: colors.textMuted,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        width: '100%',
    },
    modalContent: {
        backgroundColor: colors.bg,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '90%',
        width: '100%',
        overflow: 'hidden',
    },
    modalHeader: {
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: -0.5,
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScrollContent: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    selectedHospitalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 24,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    hospitalIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    selectedHospitalInfo: {
        flex: 1,
    },
    selectedHospitalName: {
        fontSize: 17,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 4,
    },
    selectedHospitalAddr: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    selectedDistance: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    selectedDistanceText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    inputField: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: colors.text,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    unitsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    unitBtn: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: colors.surfaceAlt,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unitsValue: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.text,
        marginHorizontal: 30,
    },
    componentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
    },
    compChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    compChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    compChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    compChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
    },
    timeSlot: {
        width: (width - 48 - 20) / 3,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        alignItems: 'center',
    },
    timeSlotActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    timeSlotText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    timeSlotTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    notesInput: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: colors.text,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        height: 100,
    },
    bookButton: {
        marginBottom: 20,
        borderRadius: 18,
        overflow: 'hidden',
    },
    bookButtonGrad: {
        paddingVertical: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    bookButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
});