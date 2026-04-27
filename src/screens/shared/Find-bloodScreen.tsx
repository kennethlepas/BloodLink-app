import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { useCachedData } from '@/src/hooks/useCachedData';
import { useTabBarAnimation } from '@/src/hooks/useTabBarAnimation';
import { BloodBank, BloodType, Location } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KENYA_COUNTIES, getSubCountiesByCounty } from '../../constants/kenyaLocations';
import {
  getBloodBanks,
  searchBloodBanksByType
} from '../../services/firebase/database';
import { DEFAULT_LOCATION, getCurrentLocation } from '../../services/location/locationService';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];


const FindBloodScreen: React.FC = () => {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { user } = useUser();
  const { onScroll } = useTabBarAnimation();

  const [selectedBloodType, setSelectedBloodType] = useState<BloodType | 'all'>('all');
  const [isBloodTypeExpanded, setIsBloodTypeExpanded] = useState(false);
  const [viewBloodBank, setViewBloodBank] = useState<BloodBank | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [allBloodBanks, setAllBloodBanks] = useState<BloodBank[]>([]);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [usingDefaultLocation, setUsingDefaultLocation] = useState(false);
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedSubCounty, setSelectedSubCounty] = useState('');
  const [isCountyExpanded, setIsCountyExpanded] = useState(false);
  const [isSubCountyExpanded, setIsSubCountyExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [countySearch, setCountySearch] = useState('');
  const [subCountySearch, setSubCountySearch] = useState('');

  const {
    data: allBanksData,
    loading: loadingAll,
    refresh: refreshAll
  } = useCachedData(
    'all_blood_banks',
    getBloodBanks,
    {
      onSuccess: (data) => {
        if (!searched) {
          setAllBloodBanks(data);
          setBloodBanks(data);
        }
      }
    }
  );

  const loading = loadingAll || searching;

  // Memoized filter for manual text search
  const filteredBloodBanks = useMemo(() => {
    if (!searchQuery.trim()) return bloodBanks;
    const q = searchQuery.toLowerCase();
    return bloodBanks.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.address.toLowerCase().includes(q)
    );
  }, [bloodBanks, searchQuery]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
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

  const totalUnitsFor = (bank: BloodBank) =>
    Object.values(bank.inventory || {}).reduce((s, inv) => s + (inv?.units || 0), 0);

  // ─── Actions ────────────────────────────────────────────────────────────────
  const getCurrentLocationHandler = async (): Promise<Location | null> => {
    try {
      setLoadingLocation(true);
      setUsingDefaultLocation(false);

      const loc = await getCurrentLocation(ExpoLocation.Accuracy.Balanced);
      if (loc) {
        setUserLocation(loc);
        return loc;
      } else {
        setUserLocation(DEFAULT_LOCATION);
        setUsingDefaultLocation(true);
        return DEFAULT_LOCATION;
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSearch = async () => {
    try {
      setSearching(true);
      setSearched(true);
      const location = await getCurrentLocationHandler();
      let banks: BloodBank[] = selectedBloodType === 'all'
        ? await getBloodBanks()
        : await searchBloodBanksByType(selectedBloodType, location || undefined);

      // Filter by County/Sub-County if selected
      if (selectedCounty) {
        banks = banks.filter(b => b.county === selectedCounty);
      }
      if (selectedSubCounty) {
        banks = banks.filter(b => b.subCounty === selectedSubCounty);
      }

      setBloodBanks(banks);
      if (banks.length === 0) {
        Alert.alert('No Results', `No blood banks found with ${selectedBloodType} blood available.`);
      }
    } catch {
      Alert.alert('Error', 'Failed to search blood banks. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearched(false);
    setBloodBanks(allBloodBanks);
    setSearchQuery('');
    setUserLocation(null);
    setUsingDefaultLocation(false);
    setSelectedCounty('');
    setSelectedSubCounty('');
  };

  const handleCall = (phoneNumber: string) => {
    try {
      if (!phoneNumber || phoneNumber === 'Not provided') {
        Alert.alert('No Phone', 'This blood bank has no phone number listed.');
        return;
      }
      const url = `tel:${phoneNumber.replace(/\s/g, '')}`;
      Linking.canOpenURL(url)
        .then(ok => {
          if (ok) return Linking.openURL(url);
          Alert.alert('Not Supported', 'Calling is not supported on this device/platform.');
        })
        .catch(err => {
          console.error('Call error:', err);
          Alert.alert('Error', 'Failed to open phone dialer.');
        });
    } catch (err) {
      console.error('handleCall error:', err);
      Alert.alert('Error', 'An unexpected error occurred while trying to call.');
    }
  };

  const handleDirections = (bank: BloodBank) => {
    try {
      const { latitude, longitude } = bank.location;
      if (!latitude || !longitude) {
        Alert.alert('No Location', 'The exact coordinates for this blood bank are not available.');
        return;
      }
      const label = encodeURIComponent(bank.name);
      const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_name=${label}`;
      const appleUrl = `maps://?daddr=${latitude},${longitude}&q=${label}`;
      const url = Platform.OS === 'ios' ? appleUrl : googleUrl;

      Linking.canOpenURL(url)
        .then(ok => {
          if (ok) return Linking.openURL(url);
          return Linking.openURL(googleUrl);
        })
        .catch(err => {
          console.error('Directions error:', err);
          Alert.alert('Error', 'Unable to open maps application.');
        });
    } catch (err) {
      console.error('handleDirections error:', err);
      Alert.alert('Error', 'An unexpected error occurred while opening directions.');
    }
  };

  const handleChat = async (bank: BloodBank) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to chat with blood banks.');
      return;
    }
    try {
      setViewBloodBank(null);
      router.push({
        pathname: '/(shared)/chat' as any,
        params: {
          recipientId: bank.id,
          recipientName: bank.name,
          recipientType: 'hospital',
          chatRole: user.userType
        }
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (searched) await handleSearch();
    else await refreshAll();
    setRefreshing(false);
  }, [searched, refreshAll]);

  const closeModal = () => {
    setViewBloodBank(null);
  };

  // ─── Styles ────────────────────────────────────────────────────────────────
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    // Header
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
    headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 1 },

    // Search controls
    searchControls: { gap: 8 },
    pickerBlock: { gap: 4 },
    pickerBlockLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5, textTransform: 'uppercase' },
    pickerTrigger: {
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      backgroundColor: 'rgba(255,255,255,0.95)',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12
    },
    pickerTriggerExpanded: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    inlineSelectionContainer: {
      borderBottomLeftRadius: 14,
      borderBottomRightRadius: 14,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: 'rgba(255,255,255,0.3)',
      backgroundColor: 'rgba(255,255,255,1)',
      marginTop: -2,
      marginBottom: 8,
      padding: 16
    },
    selectionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
    selectionItem: {
      width: '48%',
      aspectRatio: 1.25,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#F8FAFC',
      justifyContent: 'center',
      alignItems: 'center'
    },
    selectionItemActive: { borderColor: '#2563EB', backgroundColor: '#DBEAFE' },
    selectionText: { fontSize: 12, fontWeight: '700', color: '#64748B', marginTop: 4 },
    selectionTextActive: { color: '#2563EB' },
    allTypeItem: {
      width: '100%',
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#F8FAFC',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12
    },
    searchBtnRow: { flexDirection: 'row', gap: 10 },
    clearBtn: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      backgroundColor: 'rgba(255,255,255,0.2)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    clearBtnText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.95)' },
    searchBtn: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      backgroundColor: 'rgba(255,255,255,0.25)',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10
    },
    searchBtnDisabled: { opacity: 0.5 },
    searchBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
    locationNote: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      backgroundColor: 'rgba(255,255,255,0.15)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    locationNoteText: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

    // List
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    loadingText: { fontSize: 15, color: colors.textSecondary },
    listContent: { padding: 16, paddingBottom: 100 },

    // Card
    card: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.divider,
      backgroundColor: colors.surface,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
    cardIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
    cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardStatus: { fontSize: 12, fontWeight: '600' },
    cardDot: { fontSize: 12, color: colors.textMuted },
    cardDistance: { fontSize: 12, color: colors.textSecondary },
    cardDivider: { height: 1, backgroundColor: colors.divider, marginHorizontal: 16 },
    cardFooter: {
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      backgroundColor: colors.surfaceAlt,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      paddingHorizontal: 16
    },
    cardFooterItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardFooterText: { flex: 1, fontSize: 13, color: colors.textSecondary },
    cardFooterBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
    cardFooterBadgeText: { fontSize: 11, fontWeight: '700' },

    // ─── Centered Modal ─────────────────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    centeredModal: {
      width: '90%',
      maxWidth: 400,
      maxHeight: '85%',
      backgroundColor: colors.surface,
      borderRadius: 24,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 8,
    },
    modalGradientHeader: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    modalIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalTitleBlock: { flex: 1 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
    modalBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    modalStatusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    modalStatusText: { fontSize: 11, fontWeight: '700' },
    modalDistanceChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)' },
    modalDistanceText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
    modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    modalBody: { padding: 20 },
    modalSection: { marginBottom: 20 },
    modalSectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
    actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    actionBtn: { flex: 1, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14 },
    actionBtnText: { fontSize: 13, fontWeight: '700' },
    infoCard: { backgroundColor: colors.bg, borderRadius: 16, padding: 16, marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    infoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 2, textTransform: 'uppercase' },
    infoValue: { fontSize: 14, color: colors.text, fontWeight: '500' },
    inventoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    invItem: {
      width: '22%',
      borderRadius: 14,
      alignItems: 'center',
      gap: 4,
      paddingVertical: 12,
      paddingHorizontal: 4,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: 'transparent'
    },
    invType: { fontSize: 14, fontWeight: '800', color: colors.text },
    invUnits: { fontSize: 10, fontWeight: '700' },
    legendRow: { flexDirection: 'row', gap: 16, marginTop: 16, flexWrap: 'wrap' },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: colors.textMuted, marginLeft: 4 },

    // Empty state
    emptyWrap: { flex: 1, alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
    emptyIconWrap: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8, textAlign: 'center' },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  });

  // ─── Render Functions ────────────────────────────────────────────────────────
  const renderCard = ({ item }: { item: BloodBank }) => {
    const openStatus = isBloodBankOpen(item.operatingHours);
    const total = totalUnitsFor(item);

    return (
      <TouchableOpacity style={styles.card} onPress={() => setViewBloodBank(item)} activeOpacity={0.88}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconCircle, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE' }]}>
            <Ionicons name="business" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            <View style={styles.cardMetaRow}>
              {openStatus === null ? null : openStatus ? (
                <Text style={[styles.cardStatus, { color: colors.success }]}>Open</Text>
              ) : (
                <Text style={[styles.cardStatus, { color: colors.danger }]}>Closed</Text>
              )}
              {openStatus !== null && <Text style={styles.cardDot}>•</Text>}
              <Text style={styles.cardDistance}>{item.distance?.toFixed(1) ?? '--'} km</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.cardFooterItem}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.cardFooterText} numberOfLines={1}>{item.address}</Text>
          </View>
          {selectedBloodType !== 'all' ? (
            <View style={[styles.cardFooterBadge, {
              backgroundColor: (item.inventory[selectedBloodType]?.units ?? 0) > 0
                ? (isDark ? 'rgba(16,185,129,0.15)' : colors.success + '1a')
                : (isDark ? 'rgba(239,68,68,0.15)' : colors.danger + '1a')
            }]}>
              <Text style={[styles.cardFooterBadgeText, {
                color: (item.inventory[selectedBloodType]?.units ?? 0) > 0 ? colors.success : colors.danger
              }]}>
                {selectedBloodType}: {item.inventory[selectedBloodType]?.units ?? 0} units
              </Text>
            </View>
          ) : (
            <View style={[styles.cardFooterBadge, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE' }]}>
              <Text style={[styles.cardFooterBadgeText, { color: colors.primary }]}>{total} Total Units</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderModal = () => {
    if (!viewBloodBank) return null;
    const item = viewBloodBank;
    const openStatus = isBloodBankOpen(item.operatingHours);

    return (
      <Modal
        visible={!!viewBloodBank}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
              >
                <View style={styles.centeredModal}>
                  {/* Gradient Header */}
                  <LinearGradient
                    colors={[colors.primary, '#60A5FA']}
                    style={styles.modalGradientHeader}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={styles.modalHeaderRow}>
                      <View style={styles.modalIconCircle}>
                        <Ionicons name="business" size={28} color="#FFFFFF" />
                      </View>
                      <View style={styles.modalTitleBlock}>
                        <Text style={styles.modalTitle} numberOfLines={2}>{item.name}</Text>
                        <View style={styles.modalBadgeRow}>
                          {openStatus === true && (
                            <View style={[styles.modalStatusBadge, { backgroundColor: 'rgba(16,185,129,0.25)' }]}>
                              <Text style={[styles.modalStatusText, { color: '#6EE7B7' }]}>● Open Now</Text>
                            </View>
                          )}
                          {openStatus === false && (
                            <View style={[styles.modalStatusBadge, { backgroundColor: 'rgba(239,68,68,0.25)' }]}>
                              <Text style={[styles.modalStatusText, { color: '#FCA5A5' }]}>● Closed</Text>
                            </View>
                          )}
                          {item.distance !== undefined && (
                            <View style={styles.modalDistanceChip}>
                              <Ionicons name="navigate" size={12} color="#FFFFFF" />
                              <Text style={styles.modalDistanceText}>{item.distance.toFixed(1)} km away</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal}>
                        <Ionicons name="close" size={22} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>

                  {/* Scrollable Body */}
                  <ScrollView
                    style={styles.modalBody}
                    contentContainerStyle={{ paddingBottom: 24 }}
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
                        onPress={() => handleDirections(item)}
                      >
                        <Ionicons name="navigate" size={20} color="#2C2418" />
                        <Text style={[styles.actionBtnText, { color: '#2C2418' }]}>Directions</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#EDE9FE' }]}
                        onPress={() => handleChat(item)}
                      >
                        <Ionicons name="chatbubble-ellipses" size={20} color="#7C3AED" />
                        <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>Chat</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Contact & Location */}
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>📍 Contact & Location</Text>
                      <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                          <View style={styles.infoIcon}>
                            <Ionicons name="location" size={18} color={colors.primary} />
                          </View>
                          <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Address</Text>
                            <Text style={styles.infoValue}>{item.address || 'Not provided'}</Text>
                          </View>
                        </View>

                        <View style={styles.infoRow}>
                          <View style={styles.infoIcon}>
                            <Ionicons name="call" size={18} color={colors.primary} />
                          </View>
                          <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Phone</Text>
                            <Text style={[styles.infoValue, { color: colors.primary }]}>
                              {item.phoneNumber && item.phoneNumber !== 'Not provided'
                                ? item.phoneNumber
                                : 'Not available'}
                            </Text>
                          </View>
                        </View>

                        {item.operatingHours && (
                          <View style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                              <Ionicons name="time" size={18} color={colors.primary} />
                            </View>
                            <View style={styles.infoContent}>
                              <Text style={styles.infoLabel}>Hours</Text>
                              <Text style={styles.infoValue}>
                                {item.operatingHours.open} – {item.operatingHours.close}
                              </Text>
                            </View>
                          </View>
                        )}

                        {item.location?.latitude && item.location?.longitude && (
                          <View style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                              <Ionicons name="compass" size={18} color={colors.primary} />
                            </View>
                            <View style={[styles.infoContent, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                              <View>
                                <Text style={styles.infoLabel}>GPS Coordinates</Text>
                                <Text style={[styles.infoValue, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12 }]}>
                                  {item.location.latitude.toFixed(5)}, {item.location.longitude.toFixed(5)}
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => handleDirections(item)}
                                style={{ padding: 8, borderRadius: 10, backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE' }}
                              >
                                <Ionicons name="open-outline" size={16} color={colors.primary} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Blood Inventory */}
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>🩸 Blood Stock</Text>
                      <View style={styles.infoCard}>
                        <View style={styles.inventoryGrid}>
                          {BLOOD_TYPES.map(type => {
                            const units = item.inventory?.[type]?.units ?? 0;
                            const { color, bg } = getInventoryStatus(units);
                            return (
                              <View key={type} style={[styles.invItem, { backgroundColor: bg + '40', borderColor: color + '30' }]}>
                                <Text style={styles.invType}>{type}</Text>
                                <Text style={[styles.invUnits, { color }]}>{units} units</Text>
                              </View>
                            );
                          })}
                        </View>

                        {/* Legend */}
                        <View style={styles.legendRow}>
                          {[
                            { color: '#10B981', label: '≥5 units — Good' },
                            { color: '#F59E0B', label: '1–4 units — Low' },
                            { color: '#EF4444', label: '0 units — Empty' },
                          ].map(l => (
                            <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                              <Text style={styles.legendText}>{l.label}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <LinearGradient colors={isDark ? ['#1E293B', '#334155'] : ['#DBEAFE', '#EFF6FF']} style={styles.emptyIconWrap}>
        <Ionicons name={searched ? 'file-tray-outline' : 'business-outline'} size={48} color={colors.primary} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>{searched ? 'No Blood Banks Found' : 'No Blood Banks Available'}</Text>
      <Text style={styles.emptyText}>
        {searched
          ? `No blood banks have ${selectedBloodType} blood available. Try a different type.`
          : 'Blood banks will appear here once registered.'}
      </Text>
    </View>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A2647" />

      {/* Header */}
      <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Find Blood</Text>
            <Text style={styles.headerSub}>
              {searched
                ? `${bloodBanks.length} result${bloodBanks.length !== 1 ? 's' : ''} for ${selectedBloodType}`
                : `${allBloodBanks.length} bank${allBloodBanks.length !== 1 ? 's' : ''} available`}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Name Search Bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: 12,
          paddingHorizontal: 12,
          height: 44,
          marginBottom: 12
        }}>
          <Ionicons name="search" size={16} color="#64748B" />
          <TextInput
            placeholder="Search blood bank by name..."
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#0F172A' }}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Blood type picker */}
        <View style={styles.searchControls}>
          <View style={styles.pickerBlock}>
            <Text style={styles.pickerBlockLabel}>Blood Type</Text>
            <TouchableOpacity
              style={[styles.pickerTrigger, isBloodTypeExpanded && styles.pickerTriggerExpanded]}
              onPress={() => setIsBloodTypeExpanded(v => !v)}
              disabled={loading || loadingLocation}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="water" size={20} color={colors.primary} />
                <Text style={{ fontWeight: '700', color: colors.primary, fontSize: 15 }}>
                  {selectedBloodType === 'all' ? 'All Blood Types' : selectedBloodType}
                </Text>
              </View>
              <Ionicons name={isBloodTypeExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
            </TouchableOpacity>

            {isBloodTypeExpanded && (
              <View style={styles.inlineSelectionContainer}>
                <TouchableOpacity
                  style={[styles.allTypeItem, selectedBloodType === 'all' && styles.selectionItemActive]}
                  onPress={() => { setSelectedBloodType('all'); setIsBloodTypeExpanded(false); }}
                >
                  <Text style={[styles.selectionText, { marginTop: 0 }, selectedBloodType === 'all' && styles.selectionTextActive]}>
                    ALL BLOOD TYPES
                  </Text>
                </TouchableOpacity>
                <View style={styles.selectionGrid}>
                  {BLOOD_TYPES.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.selectionItem, selectedBloodType === type && styles.selectionItemActive]}
                      onPress={() => { setSelectedBloodType(type); setIsBloodTypeExpanded(false); }}
                    >
                      <Ionicons name="water" size={18} color={selectedBloodType === type ? colors.primary : '#64748B'} />
                      <Text style={[styles.selectionText, selectedBloodType === type && styles.selectionTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* County & Sub-county horizontally */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.pickerBlock, { flex: 1 }]}>
              <Text style={styles.pickerBlockLabel}>County</Text>
              <TouchableOpacity
                style={[styles.pickerTrigger, isCountyExpanded && styles.pickerTriggerExpanded]}
                onPress={() => {
                  setIsCountyExpanded(!isCountyExpanded);
                  setIsSubCountyExpanded(false);
                  setIsBloodTypeExpanded(false);
                }}
                disabled={loading || loadingLocation}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="location" size={18} color={colors.primary} />
                  <Text style={{ fontWeight: '700', color: colors.primary, fontSize: 13 }} numberOfLines={1}>
                    {selectedCounty || 'County'}
                  </Text>
                </View>
                <Ionicons name={isCountyExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
              </TouchableOpacity>

              {isCountyExpanded && (
                <View style={[styles.inlineSelectionContainer, { position: 'absolute', top: 60, left: 0, right: -130, zIndex: 1000 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 10, height: 38, marginBottom: 10 }}>
                    <Ionicons name="search" size={14} color="#94A3B8" />
                    <TextInput
                      placeholder="Search county..."
                      style={{ flex: 1, marginLeft: 8, fontSize: 13, color: '#0F172A' }}
                      value={countySearch}
                      onChangeText={setCountySearch}
                      placeholderTextColor="#94A3B8"
                      autoFocus
                    />
                    {countySearch.length > 0 && (
                      <TouchableOpacity onPress={() => setCountySearch('')}>
                        <Ionicons name="close-circle" size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.allTypeItem, !selectedCounty && styles.selectionItemActive, { height: 36 }]}
                    onPress={() => { setSelectedCounty(''); setSelectedSubCounty(''); setIsCountyExpanded(false); setCountySearch(''); }}
                  >
                    <Text style={[styles.selectionText, { marginTop: 0 }, !selectedCounty && styles.selectionTextActive]}>
                      ALL COUNTIES
                    </Text>
                  </TouchableOpacity>
                  <ScrollView contentContainerStyle={styles.selectionGrid} style={{ maxHeight: 180 }} nestedScrollEnabled>
                    {KENYA_COUNTIES.filter(c => !countySearch.trim() || c.toLowerCase().includes(countySearch.toLowerCase())).map(c => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.selectionItem, selectedCounty === c && styles.selectionItemActive, { width: '100%', aspectRatio: undefined, paddingVertical: 10 }]}
                        onPress={() => { setSelectedCounty(c); setSelectedSubCounty(''); setIsCountyExpanded(false); setCountySearch(''); }}
                      >
                        <Text style={[styles.selectionText, { marginTop: 0 }, selectedCounty === c && styles.selectionTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={[styles.pickerBlock, { flex: 1 }]}>
              <Text style={styles.pickerBlockLabel}>Sub-County</Text>
              <TouchableOpacity
                style={[styles.pickerTrigger, isSubCountyExpanded && styles.pickerTriggerExpanded]}
                onPress={() => {
                  if (!selectedCounty) {
                    Alert.alert('Notice', 'Please select a county first');
                    return;
                  }
                  setIsSubCountyExpanded(!isSubCountyExpanded);
                  setIsCountyExpanded(false);
                  setIsBloodTypeExpanded(false);
                }}
                disabled={loading || loadingLocation}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="map" size={18} color={colors.primary} />
                  <Text style={{ fontWeight: '700', color: colors.primary, fontSize: 13 }} numberOfLines={1}>
                    {selectedSubCounty || 'Sub-County'}
                  </Text>
                </View>
                <Ionicons name={isSubCountyExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
              </TouchableOpacity>

              {isSubCountyExpanded && (
                <View style={[styles.inlineSelectionContainer, { position: 'absolute', top: 60, right: 0, left: -130, zIndex: 1000 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 10, height: 38, marginBottom: 10 }}>
                    <Ionicons name="search" size={14} color="#94A3B8" />
                    <TextInput
                      placeholder="Search sub-county..."
                      style={{ flex: 1, marginLeft: 8, fontSize: 13, color: '#0F172A' }}
                      value={subCountySearch}
                      onChangeText={setSubCountySearch}
                      placeholderTextColor="#94A3B8"
                      autoFocus
                    />
                    {subCountySearch.length > 0 && (
                      <TouchableOpacity onPress={() => setSubCountySearch('')}>
                        <Ionicons name="close-circle" size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.allTypeItem, !selectedSubCounty && styles.selectionItemActive, { height: 36 }]}
                    onPress={() => { setSelectedSubCounty(''); setIsSubCountyExpanded(false); setSubCountySearch(''); }}
                  >
                    <Text style={[styles.selectionText, { marginTop: 0 }, !selectedSubCounty && styles.selectionTextActive]}>
                      ALL SUB-COUNTIES
                    </Text>
                  </TouchableOpacity>
                  <ScrollView contentContainerStyle={styles.selectionGrid} style={{ maxHeight: 180 }} nestedScrollEnabled>
                    {getSubCountiesByCounty(selectedCounty).filter(sc => !subCountySearch.trim() || sc.toLowerCase().includes(subCountySearch.toLowerCase())).map(sc => (
                      <TouchableOpacity
                        key={sc}
                        style={[styles.selectionItem, selectedSubCounty === sc && styles.selectionItemActive, { width: '100%', aspectRatio: undefined, paddingVertical: 10 }]}
                        onPress={() => { setSelectedSubCounty(sc); setIsSubCountyExpanded(false); setSubCountySearch(''); }}
                      >
                        <Text style={[styles.selectionText, { marginTop: 0 }, selectedSubCounty === sc && styles.selectionTextActive]}>{sc}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          <View style={styles.searchBtnRow}>
            {searched && (
              <TouchableOpacity style={styles.clearBtn} onPress={handleClearSearch} disabled={loading || loadingLocation}>
                <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.8)" />
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.searchBtn, (loading || loadingLocation) && styles.searchBtnDisabled]}
              onPress={handleSearch}
              disabled={loading || loadingLocation}
            >
              {loading || loadingLocation
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <>
                  <Ionicons name="search" size={20} color="#FFFFFF" />
                  <Text style={styles.searchBtnText}>Search Nearby</Text>
                </>
              }
            </TouchableOpacity>
          </View>
        </View>

        {searched && usingDefaultLocation && bloodBanks.length > 0 && (
          <View style={styles.locationNote}>
            <Ionicons name="information-circle" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.locationNoteText}>Using Nairobi city center for distance calculation</Text>
          </View>
        )}
      </LinearGradient>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{searched ? 'Searching blood banks…' : 'Loading blood banks…'}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBloodBanks}
          renderItem={renderCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          onScroll={onScroll}
          scrollEventThrottle={16}
          ListEmptyComponent={renderEmpty}
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

      {/* Blood Bank Detail Modal */}
      {renderModal()}
    </SafeAreaView>
  );
};

export default FindBloodScreen;