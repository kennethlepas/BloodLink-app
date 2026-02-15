// Enhanced Find Blood Screen with pre-loaded blood banks
import {
  getBloodBanks,
  searchBloodBanksByType
} from '@/src/services/firebase/database';
import { BloodBank, BloodType, Location } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Default location (Nairobi city center)
const DEFAULT_LOCATION: Location = {
  latitude: -1.286389,
  longitude: 36.817223,
  address: 'Nairobi, Kenya'
};

// ─── Colors ──────────────────────────────────────────────────────────────────
const TEAL      = '#0D9488';
const TEAL_MID  = '#14B8A6';
const TEAL_PALE = '#CCFBF1';
const GREEN     = '#10B981';
const GREEN_PALE= '#D1FAE5';
const DANGER    = '#EF4444';
const DANGER_PALE='#FEE2E2';
const BLUE      = '#3B82F6';
const BLUE_PALE = '#DBEAFE';
const SURFACE   = '#FFFFFF';
const BG        = '#F8FAFC';
const TEXT_DARK = '#0F172A';
const TEXT_MID  = '#475569';
const TEXT_SOFT = '#94A3B8';
const BORDER    = '#E2E8F0';

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
  const [selectedBloodType, setSelectedBloodType] = useState<BloodType>('O+');
  const [loading, setLoading] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [allBloodBanks, setAllBloodBanks] = useState<BloodBank[]>([]);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [searched, setSearched] = useState(false);
  const [usingDefaultLocation, setUsingDefaultLocation] = useState(false);

  // Load all blood banks on mount
  useEffect(() => {
    loadAllBloodBanks();
  }, []);

  const loadAllBloodBanks = async () => {
    try {
      setLoading(true);
      const banks = await getBloodBanks();
      setAllBloodBanks(banks);
      setBloodBanks(banks); // Show all banks initially
    } catch (error) {
      console.error('Error loading blood banks:', error);
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
        
        const { latitude, longitude } = position.coords;
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
      console.error('Error in getCurrentLocation:', error);
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

      const banks = await searchBloodBanksByType(selectedBloodType, location || undefined);
      
      console.log(`📊 Found ${banks.length} blood banks with ${selectedBloodType}`);
      setBloodBanks(banks);

      if (banks.length === 0) {
        Alert.alert(
          'No Results',
          `No blood banks found with ${selectedBloodType} blood type available.`
        );
      }
    } catch (error) {
      console.error('Error searching blood banks:', error);
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
        console.error('Error opening dialer:', error);
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

  const renderBloodBankItem = ({ item }: { item: BloodBank }) => {
    // Get inventory for selected blood type (or show all if not searched)
    const inventory = item.inventory[selectedBloodType];
    const hasStock = inventory && inventory.units > 0;

    // Calculate total units across all blood types
    const totalUnits = Object.values(item.inventory).reduce(
      (sum, inv) => sum + (inv?.units || 0), 
      0
    );

    // Count blood types in stock
    const bloodTypesInStock = Object.entries(item.inventory)
      .filter(([_, inv]) => inv && inv.units > 0)
      .map(([type]) => type);

    return (
      <View style={st.card}>
        {/* Top band with gradient */}
        <LinearGradient
          colors={hasStock ? [TEAL, TEAL_MID] : ['#64748B', '#475569']}
          style={st.cardBand}
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 0 }}
        >
          <View style={st.cardBandRow}>
            {/* Bank name with icon */}
            <View style={st.bankTitleBlock}>
              <Ionicons name="business" size={20} color="rgba(255,255,255,0.85)" />
              <View style={{ flex: 1 }}>
                <Text style={st.bankNameText} numberOfLines={1}>{item.name}</Text>
                {item.isVerified && (
                  <View style={st.verifiedInline}>
                    <Ionicons name="checkmark-circle" size={12} color="rgba(255,255,255,0.95)" />
                    <Text style={st.verifiedInlineText}>Verified Facility</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Distance badge */}
            {item.distance !== undefined && (
              <View style={st.distancePill}>
                <Ionicons name="location" size={12} color="#FFFFFF" />
                <Text style={st.distancePillText}>{item.distance.toFixed(1)} km</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Body */}
        <View style={st.cardBody}>
          {/* Contact Info Grid */}
          <View style={st.infoGrid}>
            <View style={st.infoRow}>
              <View style={[st.infoIcon, { backgroundColor: BLUE_PALE }]}>
                <Ionicons name="location" size={14} color={BLUE} />
              </View>
              <Text style={st.infoText} numberOfLines={2}>{item.address}</Text>
            </View>

            <View style={st.infoRow}>
              <View style={[st.infoIcon, { backgroundColor: GREEN_PALE }]}>
                <Ionicons name="call" size={14} color={GREEN} />
              </View>
              <Text style={st.infoText}>{item.phoneNumber}</Text>
            </View>

            {item.email && (
              <View style={st.infoRow}>
                <View style={[st.infoIcon, { backgroundColor: TEAL_PALE }]}>
                  <Ionicons name="mail" size={14} color={TEAL} />
                </View>
                <Text style={st.infoText} numberOfLines={1}>{item.email}</Text>
              </View>
            )}
          </View>

          {/* Blood Stock Info */}
          {searched ? (
            // Show specific blood type when searched
            <View style={st.stockBox}>
              <View style={st.stockBoxHeader}>
                <View style={st.bloodTypeChip}>
                  <Ionicons name="water" size={16} color="#FFFFFF" />
                  <Text style={st.bloodTypeChipText}>{selectedBloodType}</Text>
                </View>
                {hasStock ? (
                  <View style={st.availableBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                    <Text style={st.availableText}>
                      {inventory.units} unit{inventory.units !== 1 ? 's' : ''}
                    </Text>
                  </View>
                ) : (
                  <View style={st.unavailableBadge}>
                    <Ionicons name="close-circle" size={16} color={DANGER} />
                    <Text style={st.unavailableText}>Out of stock</Text>
                  </View>
                )}
              </View>
              {inventory?.lastUpdated && (
                <Text style={st.updateText}>
                  Updated: {new Date(inventory.lastUpdated).toLocaleDateString()}
                </Text>
              )}
            </View>
          ) : (
            // Show summary of all blood types when not searched
            <View style={st.stockBox}>
              <View style={st.stockSummaryRow}>
                <View style={st.stockStat}>
                  <Ionicons name="water" size={18} color={TEAL} />
                  <View>
                    <Text style={st.stockStatLabel}>Total Units</Text>
                    <Text style={st.stockStatValue}>{totalUnits}</Text>
                  </View>
                </View>
                <View style={st.stockStat}>
                  <Ionicons name="list" size={18} color={BLUE} />
                  <View>
                    <Text style={st.stockStatLabel}>Types Available</Text>
                    <Text style={st.stockStatValue}>{bloodTypesInStock.length}/8</Text>
                  </View>
                </View>
              </View>
              {bloodTypesInStock.length > 0 && (
                <View style={st.bloodTypesRow}>
                  {bloodTypesInStock.slice(0, 8).map(type => (
                    <View key={type} style={st.miniBloodChip}>
                      <Text style={st.miniBloodChipText}>{type}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={st.cardActions}>
          <TouchableOpacity
            style={st.actionBtnCall}
            onPress={() => handleCallBloodBank(item.phoneNumber)}
          >
            <LinearGradient 
              colors={[GREEN, '#059669']} 
              style={st.actionBtnGrad}
              start={{x:0,y:0}} 
              end={{x:1,y:0}}
            >
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={st.actionBtnText}>Call</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={st.actionBtnDirections}
            onPress={() => handleGetDirections(item)}
          >
            <LinearGradient 
              colors={[BLUE, '#2563EB']} 
              style={st.actionBtnGrad}
              start={{x:0,y:0}} 
              end={{x:1,y:0}}
            >
              <Ionicons name="navigate" size={16} color="#FFFFFF" />
              <Text style={st.actionBtnText}>Directions</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={st.emptyWrap}>
      <LinearGradient colors={[TEAL_PALE, '#99F6E4']} style={st.emptyIconWrap}>
        <Ionicons 
          name={searched ? "file-tray-outline" : "business-outline"} 
          size={46} 
          color={TEAL} 
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
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />
      
      {/* Header */}
      <LinearGradient colors={[TEAL, TEAL_MID]} style={st.header}>
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

        {/* Search Controls */}
        <View style={st.searchControls}>
          <View style={st.pickerBlock}>
            <Text style={st.pickerBlockLabel}>Blood Type</Text>
            <View style={st.pickerWrap}>
              <View style={st.pickerIconContainer}>
                <Ionicons name="water" size={18} color={TEAL} />
              </View>
              <Picker
                selectedValue={selectedBloodType}
                onValueChange={(value) => setSelectedBloodType(value)}
                style={st.picker}
                enabled={!loading && !loadingLocation}
              >
                {BLOOD_TYPES.map((type) => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={st.searchBtnRow}>
            {searched && (
              <TouchableOpacity
                style={st.clearBtn}
                onPress={handleClearSearch}
                disabled={loading || loadingLocation}
              >
                <Ionicons name="close-circle" size={18} color={TEXT_SOFT} />
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

        {/* Location Note */}
        {searched && usingDefaultLocation && bloodBanks.length > 0 && (
          <View style={st.locationNote}>
            <Ionicons name="information-circle" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={st.locationNoteText}>
              Using Nairobi city center for distance calculation
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* List */}
      {loading && !refreshing ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={st.loadingText}>
            {searched ? 'Searching blood banks...' : 'Loading blood banks...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={bloodBanks}
          renderItem={renderBloodBankItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={st.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[TEAL]} 
              tintColor={TEAL} 
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Header
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18 },
  headerTop: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 16 
  },
  backBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  headerSub: { 
    fontSize: 11, 
    color: 'rgba(255,255,255,0.75)', 
    marginTop: 1 
  },

  // Search Controls
  searchControls: { gap: 12 },
  pickerBlock: { gap: 6 },
  pickerBlockLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: 'rgba(255,255,255,0.85)', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
    paddingLeft: 2
  },
  pickerWrap: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', 
    borderRadius: 12, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingRight: 8,
  },
  pickerIconContainer: {
    width: 40,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  picker: { 
    flex: 1, 
    height: 50,
    marginLeft: -8,
  },

  searchBtnRow: { flexDirection: 'row', gap: 8 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  clearBtnText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: 'rgba(255,255,255,0.95)' 
  },
  searchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#FFFFFF' 
  },

  locationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  locationNoteText: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600'
  },

  // Loading
  loadingWrap: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 12 
  },
  loadingText: { fontSize: 15, color: TEXT_MID },

  listContent: { padding: 16, paddingBottom: 40 },

  // Card
  card: { 
    backgroundColor: SURFACE, 
    borderRadius: 18, 
    marginBottom: 16, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: BORDER, 
    ...shadow('#000', 0.08, 12, 4) 
  },
  cardBand: { paddingHorizontal: 16, paddingVertical: 14 },
  cardBandRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  bankTitleBlock: { 
    flex: 1,
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10,
    marginRight: 12
  },
  bankNameText: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#FFFFFF',
    marginBottom: 2
  },
  verifiedInline: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  verifiedInlineText: { 
    fontSize: 10, 
    fontWeight: '600', 
    color: 'rgba(255,255,255,0.85)' 
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  distancePillText: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: '#FFFFFF' 
  },

  cardBody: { padding: 16, gap: 12 },

  infoGrid: { gap: 10 },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 10 
  },
  infoIcon: { 
    width: 30, 
    height: 30, 
    borderRadius: 9, 
    justifyContent: 'center', 
    alignItems: 'center',
    flexShrink: 0
  },
  infoText: { 
    flex: 1, 
    fontSize: 13, 
    color: TEXT_DARK, 
    lineHeight: 18,
    fontWeight: '500'
  },

  stockBox: { 
    backgroundColor: BG, 
    borderRadius: 12, 
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER
  },
  stockBoxHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  bloodTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DANGER,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  bloodTypeChipText: { 
    fontSize: 14, 
    fontWeight: '900', 
    color: '#FFFFFF' 
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  availableText: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN
  },
  unavailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  unavailableText: {
    fontSize: 13,
    fontWeight: '700',
    color: DANGER
  },
  updateText: {
    fontSize: 11,
    color: TEXT_SOFT,
    marginTop: 6,
    fontStyle: 'italic'
  },

  stockSummaryRow: { 
    flexDirection: 'row', 
    gap: 12,
    marginBottom: 10
  },
  stockStat: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  stockStatLabel: { 
    fontSize: 10, 
    color: TEXT_SOFT, 
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  stockStatValue: { 
    fontSize: 16, 
    fontWeight: '900', 
    color: TEXT_DARK 
  },

  bloodTypesRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER
  },
  miniBloodChip: {
    backgroundColor: DANGER_PALE,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },
  miniBloodChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: DANGER
  },

  cardActions: { 
    flexDirection: 'row', 
    gap: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    borderTopWidth: 1, 
    borderTopColor: BORDER,
    backgroundColor: BG
  },
  actionBtnCall: { 
    flex: 1, 
    borderRadius: 12, 
    overflow: 'hidden' 
  },
  actionBtnDirections: { 
    flex: 1, 
    borderRadius: 12, 
    overflow: 'hidden' 
  },
  actionBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11
  },
  actionBtnText: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: '#FFFFFF' 
  },

  // Empty State
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
    color: TEXT_DARK, 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  emptyText: { 
    fontSize: 14, 
    color: TEXT_MID, 
    textAlign: 'center', 
    lineHeight: 20 
  },
});

export default FindBloodScreen;