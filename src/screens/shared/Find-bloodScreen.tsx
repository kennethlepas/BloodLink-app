import { useAppTheme } from '@/src/contexts/ThemeContext';
import {
  getBloodBanks,
  searchBloodBanksByType
} from '@/src/services/firebase/database';
import { BloodBank, BloodType, Location } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar, StyleSheet, Text,
  TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Default location (Nairobi city center)
const DEFAULT_LOCATION: Location = {
  latitude: -1.286389,
  longitude: 36.817223,
  address: 'Nairobi, Kenya'
};

const shadow = (c = '#000', o = 0.08, r = 10, e = 3) =>
  Platform.select({
    web: { boxShadow: `0 2px ${r}px rgba(0,0,0,${o})` } as any,
    default: {
      shadowColor: c,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: o,
      shadowRadius: r,
      elevation: e
    },
  });

const FindBloodScreen: React.FC = () => {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [selectedBloodType, setSelectedBloodType] = useState<BloodType | 'all'>('all');
  const [isBloodTypeExpanded, setIsBloodTypeExpanded] = useState(false);
  const [viewBloodBank, setViewBloodBank] = useState<BloodBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [allBloodBanks, setAllBloodBanks] = useState<BloodBank[]>([]);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [searched, setSearched] = useState(false);
  const [usingDefaultLocation, setUsingDefaultLocation] = useState(false);

  const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerCenter: { alignItems: 'center', flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },

    searchControls: { gap: 12 },
    pickerBlock: { gap: 6 },
    pickerBlockLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.5, paddingLeft: 2 },
    pickerWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingRight: 8 },
    pickerIconContainer: { width: 40, height: 50, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    picker: { flex: 1, height: 50, marginLeft: -8, color: colors.primary },

    searchBtnRow: { flexDirection: 'row', gap: 8 },
    clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    clearBtnText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.95)' },
    searchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.25)', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    searchBtnDisabled: { opacity: 0.5 },
    searchBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

    locationNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    locationNoteText: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 15, color: colors.textSecondary },
    listContent: { padding: 16, paddingBottom: 40 },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 12,
      ...shadow('#000', 0.06, 8, 3),
      borderWidth: 1,
      borderColor: colors.divider
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12
    },
    cardIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center'
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6
    },
    cardStatus: {
      fontSize: 12,
      fontWeight: '600'
    },
    cardDot: {
      fontSize: 12,
      color: colors.textMuted
    },
    cardDistance: {
      fontSize: 12,
      color: colors.textSecondary
    },
    cardDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginHorizontal: 16
    },
    cardFooter: {
      padding: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceAlt,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16
    },
    cardFooterItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1
    },
    cardFooterText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1
    },
    cardFooterBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12
    },
    cardFooterBadgeText: {
      fontSize: 11,
      fontWeight: '700'
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      padding: 20
    },
    modalContainer: {
      backgroundColor: colors.bg,
      borderRadius: 24,
      maxHeight: '90%',
      width: '100%',
      overflow: 'hidden',
      ...shadow('#000', 0.2, 12, 10)
    },
    modalHeader: {
      padding: 20,
      paddingBottom: 24,
    },
    modalHeaderContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16
    },
    modalIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center'
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 6
    },
    modalSubtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700'
    },
    modalDistance: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.9)',
      fontWeight: '500'
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modalBody: {
      flex: 1,
      padding: 20
    },
    sectionBox: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      ...shadow('#000', 0.04, 8, 2)
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12
    },
    infoText: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1
    },
    inventoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10
    },
    invItem: {
      width: '22%',
      backgroundColor: colors.surfaceAlt,
      padding: 10,
      borderRadius: 10,
      alignItems: 'center',
      gap: 4
    },
    invItemLow: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
      borderWidth: 1,
      borderColor: isDark ? '#7F1D1D' : '#FECACA'
    },
    invType: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text
    },
    invUnits: {
      fontSize: 11,
      fontWeight: '600'
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20
    },
    modalActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14
    },
    modalActionText: {
      fontSize: 14,
      fontWeight: '700'
    },

    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 40
    },
    emptyIconWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20
    },
    emptyTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center'
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20
    },
    pickerTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: 12,
      height: 50,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    pickerTriggerExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    inlineSelectionContainer: {
      backgroundColor: 'rgba(255,255,255,1)',
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: 'rgba(255,255,255,0.3)',
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      padding: 12,
      marginTop: -2,
      marginBottom: 8,
    },
    selectionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center'
    },
    selectionItem: {
      width: '22%',
      aspectRatio: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
    },
    selectionItemActive: {
      backgroundColor: `${colors.primary}15`,
      borderColor: colors.primary,
    },
    selectionText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 2
    },
    selectionTextActive: {
      color: colors.primary,
    },
    allTypeItem: {
      width: '100%',
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      marginBottom: 8
    }
  });

  useEffect(() => {
    loadAllBloodBanks();
  }, []);

  const loadAllBloodBanks = async () => {
    try {
      setLoading(true);
      const banks = await getBloodBanks();
      setAllBloodBanks(banks);
      setBloodBanks(banks);
    } catch (error) {
      console.log('Error loading blood banks:', error);
      Alert.alert('Error', 'Failed to load blood banks.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (searched) {
      await handleSearch();
    } else {
      await loadAllBloodBanks();
    }
    setRefreshing(false);
  };

  const getCurrentLocation = async (): Promise<Location | null> => {
    try {
      setLoadingLocation(true);
      setUsingDefaultLocation(false);

      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log('Location permission denied - using default location');
        setUserLocation(DEFAULT_LOCATION);
        setUsingDefaultLocation(true);
        return DEFAULT_LOCATION;
      }

      try {
        const position = await Promise.race([
          ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 0,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Location timeout')), 10000)
          )
        ]);

        const { latitude, longitude } = (position as ExpoLocation.LocationObject).coords;
        const location: Location = { latitude, longitude };

        console.log('✅ Got actual location:', latitude, longitude);
        setUserLocation(location);
        setUsingDefaultLocation(false);

        return location;
      } catch (locationError: any) {
        console.log('Location fetch failed - using default location');
        setUserLocation(DEFAULT_LOCATION);
        setUsingDefaultLocation(true);
        return DEFAULT_LOCATION;
      }
    } catch (error: any) {
      console.log('Error in getCurrentLocation:', error);
      setUserLocation(DEFAULT_LOCATION);
      setUsingDefaultLocation(true);
      return DEFAULT_LOCATION;
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setSearched(true);

      const location = await getCurrentLocation();
      console.log('🔍 Searching with location:', location);

      let banks: BloodBank[] = [];

      if (selectedBloodType === 'all') {
        banks = await getBloodBanks();
      } else {
        banks = await searchBloodBanksByType(selectedBloodType, location || undefined);
      }

      console.log(`📊 Found ${banks.length} blood banks with ${selectedBloodType}`);
      setBloodBanks(banks);

      if (banks.length === 0) {
        Alert.alert(
          'No Results',
          `No blood banks found with ${selectedBloodType} blood type available.`
        );
      }
    } catch (error) {
      console.log('Error searching blood banks:', error);
      Alert.alert('Error', 'Failed to search blood banks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearched(false);
    setBloodBanks(allBloodBanks);
    setUserLocation(null);
    setUsingDefaultLocation(false);
  };

  const handleCallBloodBank = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to make phone call on this device.');
        }
      })
      .catch((error) => {
        console.log('Error opening dialer:', error);
        Alert.alert('Error', 'Failed to open phone dialer.');
      });
  };

  const handleGetDirections = (bank: BloodBank) => {
    const { latitude, longitude } = bank.location;
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q='
    });
    const latLng = `${latitude},${longitude}`;
    const label = bank.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Unable to open maps on this device.');
      });
    }
  };

  const isBloodBankOpen = (hours: { open: string; close: string }) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [openHour, openMinute] = hours.open.split(':').map(Number);
    const [closeHour, closeMinute] = hours.close.split(':').map(Number);

    const openTime = openHour * 60 + openMinute;
    const closeTime = closeHour * 60 + closeMinute;

    return currentTime >= openTime && currentTime <= closeTime;
  };

  const renderBloodBankModal = () => {
    if (!viewBloodBank) return null;
    const item = viewBloodBank;
    const inventory = item.inventory[selectedBloodType === 'all' ? 'O+' : selectedBloodType];
    const isOpen = item.operatingHours ? isBloodBankOpen(item.operatingHours) : false;

    return (
      <View style={st.modalOverlay}>
        <View style={st.modalContainer}>
          <LinearGradient
            colors={[colors.primary, '#60A5FA']}
            style={st.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={st.modalHeaderContent}>
              <View style={st.modalIconCircle}>
                <Ionicons name="business" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.modalTitle} numberOfLines={1}>{item.name}</Text>
                <View style={st.modalSubtitleRow}>
                  {isOpen ? (
                    <View style={[st.statusBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' }]}>
                      <Text style={[st.statusText, { color: colors.success }]}>Open Now</Text>
                    </View>
                  ) : (
                    <View style={[st.statusBadge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
                      <Text style={[st.statusText, { color: colors.danger }]}>Closed</Text>
                    </View>
                  )}
                  {item.distance !== undefined && (
                    <Text style={st.modalDistance}>{item.distance.toFixed(1)} km away</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => setViewBloodBank(null)} style={st.closeBtn}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView style={st.modalBody} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <View style={st.sectionBox}>
              <Text style={st.sectionTitle}>Contact & Location</Text>
              <View style={st.infoRow}>
                <Ionicons name="location" size={18} color={colors.textSecondary} />
                <Text style={st.infoText}>{item.address}</Text>
              </View>
              <View style={st.infoRow}>
                <Ionicons name="call" size={18} color={colors.textSecondary} />
                <Text style={st.infoText}>{item.phoneNumber}</Text>
              </View>
              <View style={st.infoRow}>
                <Ionicons name="time" size={18} color={colors.textSecondary} />
                <Text style={st.infoText}>{item.operatingHours?.open} - {item.operatingHours?.close}</Text>
              </View>
            </View>

            <View style={st.sectionBox}>
              <Text style={st.sectionTitle}>Blood Inventory</Text>
              <View style={st.inventoryGrid}>
                {BLOOD_TYPES.map(type => {
                  const inv = item.inventory[type];
                  const units = inv?.units || 0;
                  const isLow = units < 5;
                  return (
                    <View key={type} style={[st.invItem, isLow ? st.invItemLow : null]}>
                      <Text style={st.invType}>{type}</Text>
                      <Text style={[st.invUnits, isLow ? { color: colors.danger } : { color: colors.primary }]}>
                        {units} units
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={st.modalActions}>
              <TouchableOpacity
                style={[st.modalActionBtn, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' }]}
                onPress={() => handleCallBloodBank(item.phoneNumber)}
              >
                <Ionicons name="call" size={20} color={colors.success} />
                <Text style={[st.modalActionText, { color: colors.success }]}>Call Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.modalActionBtn, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE' }]}
                onPress={() => handleGetDirections(item)}
              >
                <Ionicons name="navigate" size={20} color={colors.primary} />
                <Text style={[st.modalActionText, { color: colors.primary }]}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderBloodBankListItem = ({ item }: { item: BloodBank }) => {
    const isOpen = item.operatingHours ? isBloodBankOpen(item.operatingHours) : false;
    const totalUnits = Object.values(item.inventory).reduce((sum, inv) => sum + (inv?.units || 0), 0);

    return (
      <TouchableOpacity style={st.card} onPress={() => setViewBloodBank(item)} activeOpacity={0.9}>
        <View style={st.cardHeader}>
          <View style={[st.cardIconCircle, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE' }]}>
            <Ionicons name="business" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.cardTitle} numberOfLines={1}>{item.name}</Text>
            <View style={st.cardMetaRow}>
              {isOpen ? (
                <Text style={[st.cardStatus, { color: colors.success }]}>Open</Text>
              ) : (
                <Text style={[st.cardStatus, { color: colors.danger }]}>Closed</Text>
              )}
              <Text style={st.cardDot}>•</Text>
              <Text style={st.cardDistance}>{item.distance?.toFixed(1) || '--'} km</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.divider} />
        </View>

        <View style={st.cardDivider} />

        <View style={st.cardFooter}>
          <View style={st.cardFooterItem}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={st.cardFooterText} numberOfLines={1}>{item.address}</Text>
          </View>
          {selectedBloodType !== 'all' ? (
            <View style={[st.cardFooterBadge, { backgroundColor: item.inventory[selectedBloodType]?.units ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5') : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2') }]}>
              <Text style={[st.cardFooterBadgeText, { color: item.inventory[selectedBloodType]?.units ? colors.success : colors.danger }]}>
                {selectedBloodType}: {item.inventory[selectedBloodType]?.units || 0} units
              </Text>
            </View>
          ) : (
            <View style={[st.cardFooterBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE' }]}>
              <Text style={[st.cardFooterBadgeText, { color: colors.primary }]}>{totalUnits} Total Units</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={st.emptyWrap}>
      <LinearGradient colors={isDark ? ['#1E293B', '#334155'] : ['#DBEAFE', '#EFF6FF']} style={st.emptyIconWrap}>
        <Ionicons
          name={searched ? "file-tray-outline" : "business-outline"}
          size={46}
          color={colors.primary}
        />
      </LinearGradient>
      <Text style={st.emptyTitle}>
        {searched ? 'No Blood Banks Found' : 'No Blood Banks Available'}
      </Text>
      <Text style={st.emptyText}>
        {searched
          ? `No blood banks have ${selectedBloodType} blood available at the moment. Try a different blood type.`
          : 'Blood banks will appear here once they are registered in the system.'
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <LinearGradient colors={[colors.primary, '#60A5FA']} style={st.header}>
        <View style={st.headerTop}>
          <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Find Blood</Text>
            <Text style={st.headerSub}>
              {searched
                ? `${bloodBanks.length} result${bloodBanks.length !== 1 ? 's' : ''} for ${selectedBloodType}`
                : `${allBloodBanks.length} blood bank${allBloodBanks.length !== 1 ? 's' : ''} available`
              }
            </Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <View style={st.searchControls}>
          <View style={st.pickerBlock}>
            <Text style={st.pickerBlockLabel}>Blood Type</Text>
            <TouchableOpacity
              style={[st.pickerTrigger, isBloodTypeExpanded && st.pickerTriggerExpanded]}
              onPress={() => setIsBloodTypeExpanded(!isBloodTypeExpanded)}
              disabled={loading || loadingLocation}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="water" size={18} color={colors.primary} />
                <Text style={{ fontWeight: '700', color: colors.primary }}>
                  {selectedBloodType === 'all' ? 'All Blood Types' : selectedBloodType}
                </Text>
              </View>
              <Ionicons name={isBloodTypeExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.primary} />
            </TouchableOpacity>

            {isBloodTypeExpanded && (
              <View style={st.inlineSelectionContainer}>
                <TouchableOpacity
                  style={[st.allTypeItem, selectedBloodType === 'all' && st.selectionItemActive]}
                  onPress={() => {
                    setSelectedBloodType('all');
                    setIsBloodTypeExpanded(false);
                  }}
                >
                  <Text style={[st.selectionText, { marginTop: 0 }, selectedBloodType === 'all' && st.selectionTextActive]}>
                    ALL BLOOD TYPES
                  </Text>
                </TouchableOpacity>
                <View style={st.selectionGrid}>
                  {BLOOD_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[st.selectionItem, selectedBloodType === type && st.selectionItemActive]}
                      onPress={() => {
                        setSelectedBloodType(type);
                        setIsBloodTypeExpanded(false);
                      }}
                    >
                      <Ionicons
                        name="water"
                        size={16}
                        color={selectedBloodType === type ? colors.primary : colors.textSecondary}
                      />
                      <Text style={[st.selectionText, selectedBloodType === type && st.selectionTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={st.searchBtnRow}>
            {searched && (
              <TouchableOpacity
                style={st.clearBtn}
                onPress={handleClearSearch}
                disabled={loading || loadingLocation}
              >
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.7)" />
                <Text style={st.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[st.searchBtn, (loading || loadingLocation) && st.searchBtnDisabled]}
              onPress={handleSearch}
              disabled={loading || loadingLocation}
            >
              {loading || loadingLocation ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                  <Text style={st.searchBtnText}>Search Nearby</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {searched && usingDefaultLocation && bloodBanks.length > 0 && (
          <View style={st.locationNote}>
            <Ionicons name="information-circle" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={st.locationNoteText}>
              Using Nairobi city center for distance calculation
            </Text>
          </View>
        )}
      </LinearGradient>

      {loading && !refreshing ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={st.loadingText}>
            {searched ? 'Searching blood banks...' : 'Loading blood banks...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={bloodBanks}
          renderItem={renderBloodBankListItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={st.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {viewBloodBank && (
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, backgroundColor: colors.drawerOverlay }}>
            {renderBloodBankModal()}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default FindBloodScreen;