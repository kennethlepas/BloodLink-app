import { useImagePicker } from '@/hooks/useImagePicker';
import { getSubCountiesByCounty, KENYA_COUNTIES } from '@/src/constants/kenyaLocations';
import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { useCachedData } from '@/src/hooks/useCachedData';
import {
  createBloodRequest,
  createNotification,
  getBloodBanks,
  getUsersByBloodType
} from '@/src/services/firebase/database';
import { getAddressFromCoords, getCurrentLocation } from '@/src/services/location/locationService';
import { BloodBank, BloodType, Location, UrgencyLevel } from '@/src/types/types';
import { mapErrorMessage } from '@/src/utils/errorMapper';
import { showRatingPrompt } from '@/src/utils/ratingPromptHelper';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BLOOD_COMPONENTS = [
  'Whole Blood (Full Blood)',
  'Red Blood Cells (Packed Red Cells)',
  'Platelets',
  'Plasma',
  'Cryoprecipitate'
];

// ─── Constants (Legacy/Brand) ──────────────────────────────────────────────────────────────
const BLUE = '#3B82F6';
const BLUE_PALE = '#DBEAFE';
const GREEN = '#10B981';
const GREEN_PALE = '#D1FAE5';
const DANGER = '#EF4444';
const DANGER_PALE = '#FEE2E2';
const WARN = '#F59E0B';
const WARN_PALE = '#FEF3C7';
const SURFACE = '#FFFFFF';
const BG = '#F2EFE9'; // ★ Warm cream background
const TEXT_DARK = '#0F172A';
const TEXT_MID = '#475569';
const TEXT_SOFT = '#94A3B8';
const BORDER = '#E8E4DE'; // ★ Warmer border

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

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },

  scrollContent: { paddingBottom: 100 },
  formBody: { padding: 20 },

  section: {
    marginBottom: 32,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    ...shadow(colors.primary, 0.04, 10, 3),
    borderWidth: 1,
    borderColor: colors.surfaceBorder
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 20, letterSpacing: -0.5 },

  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
  input: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceAlt,
    fontSize: 15,
    color: colors.text,
    paddingHorizontal: 16,
  },
  inputError: { borderColor: DANGER },
  textArea: { minHeight: 100, paddingTop: 14, textAlignVertical: 'top' },

  pickerTrigger: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pickerTriggerExpanded: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderColor: colors.primary },
  inlineSelectionContainer: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.primary,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: colors.surface,
    marginTop: -1,
    padding: 12
  },

  selectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectionItem: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center'
  },
  selectionItemActive: { backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : BLUE_PALE, borderColor: colors.primary },
  selectionText: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 2 },
  selectionTextActive: { color: colors.primary },

  urgencyRow: { flexDirection: 'row', gap: 10 },
  urgencyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6
  },
  urgencyBtnActive: { color: '#FFFFFF' },
  urgencyText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

  unitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center'
  },
  unitBtnActive: { backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : BLUE_PALE, borderColor: colors.primary },
  unitText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  unitTextActive: { color: colors.primary },

  listSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 8,
    backgroundColor: colors.surfaceAlt
  },
  listSelectionItemActive: { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : BLUE_PALE },
  listSelectionText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  listSelectionTextActive: { color: colors.primary, fontWeight: '700' },

  hospitalSearchBox: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12
  },
  hospitalSearchInput: { flex: 1, fontSize: 13, color: colors.text, marginLeft: 8 },

  hospitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.surfaceBorder
  },
  hospitalItemActive: { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : BLUE_PALE },
  hospitalIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : BLUE_PALE, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  hospitalName: { fontSize: 14, fontWeight: '700', color: colors.text },
  hospitalAddr: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  distanceBadge: { fontSize: 10, fontWeight: '800', color: colors.primary, marginTop: 4 },

  locationBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8
  },
  locationBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  locationConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : GREEN_PALE,
    marginTop: 12
  },
  locationConfirmTitle: { fontSize: 14, fontWeight: '800', color: GREEN },
  locationConfirmSub: { fontSize: 12, color: isDark ? '#D1FAE5' : '#065F46', marginTop: 2 },

  uploadArea: {
    height: 160,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : BLUE_PALE,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  uploadAreaSuccess: { borderColor: GREEN, backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : GREEN_PALE },
  previewImg: { width: '100%', height: '100%' },
  changeImgBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  changeImgText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  uploadPlaceholder: { alignItems: 'center', gap: 8 },
  uploadTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  uploadSub: { fontSize: 12, color: colors.textMuted },

  submitBtn: {
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    ...shadow(colors.primary, 0.3, 15, 4)
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },

  errorText: { fontSize: 12, color: DANGER, fontWeight: '600', marginTop: 4, marginLeft: 4 },
  helperText: { fontSize: 13, color: colors.textSecondary, marginBottom: 16, lineHeight: 18 }
});

const NeedBloodScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const { colors, isDark } = useAppTheme();
  const nb = getStyles(colors, isDark);
  const { pickAndUploadImage, takeAndUploadPhoto, uploading: imageUploading, error: imageError } = useImagePicker();

  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isHospitalExpanded, setIsHospitalExpanded] = useState(false);
  const [isBloodTypeExpanded, setIsBloodTypeExpanded] = useState(false);
  const [isBloodComponentExpanded, setIsBloodComponentExpanded] = useState(false);
  const [hospitalSearchQuery, setHospitalSearchQuery] = useState('');

  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedSubCounty, setSelectedSubCounty] = useState('');
  const [isCountyExpanded, setIsCountyExpanded] = useState(false);
  const [isSubCountyExpanded, setIsSubCountyExpanded] = useState(false);
  const [countySearch, setCountySearch] = useState('');
  const [subCountySearch, setSubCountySearch] = useState('');

  const [formData, setFormData] = useState({
    bloodType: 'O+' as BloodType,
    urgencyLevel: 'urgent' as UrgencyLevel,
    patientName: '',
    hospitalId: '',
    hospitalName: '',
    hospitalAddress: '',
    bloodComponent: 'Whole Blood',
    hospitalFormUrl: '',
    requesterPhone: user?.phoneNumber || '',
    description: '',
    unitsNeeded: '1',
  });

  const [location, setLocation] = useState<Location | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { data: bloodBanksData, loading: loadingBanks, refresh: refreshBanks } = useCachedData('blood_banks', () => getBloodBanks());
  const bloodBanks = bloodBanksData || [];

  useEffect(() => {
    ExpoLocation.getForegroundPermissionsAsync().catch(console.error);
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const filteredHospitals = useMemo(() => {
    let results = [...bloodBanks];

    // Filter by name/search
    if (hospitalSearchQuery.trim()) {
      const q = hospitalSearchQuery.toLowerCase();
      results = results.filter(bank =>
        bank.name.toLowerCase().includes(q) ||
        bank.address.toLowerCase().includes(q) ||
        bank.subCounty.toLowerCase().includes(q) ||
        bank.county.toLowerCase().includes(q)
      );
    }

    // Filter by County/Sub-County
    if (selectedCounty) {
      results = results.filter(bank => bank.county === selectedCounty);
    }
    if (selectedSubCounty) {
      results = results.filter(bank => bank.subCounty === selectedSubCounty);
    }

    // Distance calculation
    if (location && location.latitude !== 0) {
      results = results.map(bank => ({
        ...bank,
        distance: calculateDistance(location.latitude, location.longitude, bank.location.latitude, bank.location.longitude)
      }));
    }

    // Prioritization logic:
    // 1. If distance available, sort by distance
    // 2. Otherwise sort by subcounty of user
    results.sort((a, b) => {
      // Priority 1: Distance
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }

      // Priority 2: User's Subcounty
      if (user?.subCounty) {
        const aInSubCounty = a.subCounty === user.subCounty;
        const bInSubCounty = b.subCounty === user.subCounty;
        if (aInSubCounty && !bInSubCounty) return -1;
        if (!aInSubCounty && bInSubCounty) return 1;
      }

      // Priority 3: Alphabetical
      return a.name.localeCompare(b.name);
    });

    return results;
  }, [bloodBanks, hospitalSearchQuery, location, selectedCounty, selectedSubCounty, user?.subCounty]);

  const selectHospital = (bank: BloodBank | 'other') => {
    if (bank === 'other') {
      setFormData(prev => ({ ...prev, hospitalId: 'other', hospitalName: '', hospitalAddress: '' }));
      setLocation(null);
    } else {
      setFormData(prev => ({ ...prev, hospitalId: bank.id, hospitalName: bank.name, hospitalAddress: bank.address }));
      if (bank.location) setLocation({ latitude: bank.location.latitude, longitude: bank.location.longitude, address: bank.address, city: bank.location.city || '', region: bank.location.region || '' });
    }
    setIsHospitalExpanded(false);
    setHospitalSearchQuery('');
  };

  const getCurrentLocationHandler = async () => {
    try {
      setLoadingLocation(true);

      const loc = await getCurrentLocation(ExpoLocation.Accuracy.Balanced);
      if (!loc) {
        Alert.alert('Location Error', 'Unable to get your location. Please enter it manually.');
        setLoadingLocation(false);
        return;
      }

      const { latitude, longitude } = loc;
      const addrData = await getAddressFromCoords(latitude, longitude);
      const formattedAddress = addrData.address || `${latitude}, ${longitude}`;

      const locData: Location = {
        latitude,
        longitude,
        address: formattedAddress,
        city: addrData.city || '',
        region: addrData.region || ''
      };

      setLocation(locData);
      if (!formData.hospitalAddress) setFormData(p => ({ ...p, hospitalAddress: formattedAddress }));
      Alert.alert('✓ Location Captured', formattedAddress);
    } catch (e) {
      Alert.alert('Location Error', 'An unexpected error occurred while getting location.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validateForm = () => {
    const e: { [key: string]: string } = {};
    if (!formData.patientName.trim()) e.patientName = 'Patient name is required';
    if (!formData.hospitalName.trim()) e.hospitalName = 'Hospital name is required';
    if (!formData.hospitalAddress.trim()) e.hospitalAddress = 'Hospital address is required';
    if (!formData.hospitalFormUrl) e.hospitalForm = 'Request form image is required';
    if (!location) e.location = 'Please capture your precise location';
    if (!formData.requesterPhone.trim()) e.requesterPhone = 'Contact number is required';
    const units = parseInt(formData.unitsNeeded);
    if (isNaN(units) || units < 1) e.unitsNeeded = 'Invalid units';
    setErrors(e);
    if (Object.keys(e).length > 0) { Alert.alert('Validation Error', Object.values(e)[0]); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return Alert.alert('Error', 'Login required');
    if (!validateForm()) return;

    Alert.alert('Confirm Request', `Request ${formData.unitsNeeded} unit(s) of ${formData.bloodType}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          setLoading(true);
          try {
            const expiresAt = new Date(Date.now() + (formData.urgencyLevel === 'critical' ? 24 : 72) * 3600000).toISOString();
            const requestId = await createBloodRequest({
              ...formData,
              requesterId: user.id,
              requesterName: `${user.firstName} ${user.lastName}`,
              location: { ...location!, address: formData.hospitalAddress },
              unitsNeeded: parseInt(formData.unitsNeeded),
              status: 'pending',
              verificationStatus: 'pending',
              expiresAt
            } as any);

            const donors = await getUsersByBloodType(formData.bloodType);
            await Promise.all(donors.map(d => createNotification({
              userId: d.id, type: 'blood_request', title: 'New Blood Request',
              message: `${formData.urgencyLevel === 'critical' ? '🚨 ' : ''}${formData.patientName} needs ${formData.bloodType} at ${formData.hospitalName}`,
              data: { requestId, bloodType: formData.bloodType }, timestamp: new Date().toISOString(), isRead: false
            })));

            Alert.alert('Success!', 'Blood request created successfully', [
              { text: 'View Requests', onPress: () => router.replace('/(requester)/my-requests' as any) },
              { text: 'OK', onPress: () => { if (user?.id) showRatingPrompt(router, user.id); router.back(); } }
            ]);
          } catch (err) { Alert.alert('Error', mapErrorMessage(err)); } finally { setLoading(false); }
        }
      }
    ]);
  };

  const handleImagePicker = () => {
    Alert.alert('Upload Request Form', 'Choose clinical document source', [
      { text: 'Take Photo', onPress: async () => { const url = await takeAndUploadPhoto(`requests/${user?.id}`, 'verification'); if (url) handleInputChange('hospitalFormUrl', url); } },
      { text: 'Gallery', onPress: async () => { const url = await pickAndUploadImage(`requests/${user?.id}`, 'verification'); if (url) handleInputChange('hospitalFormUrl', url); } },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  return (
    <SafeAreaView style={nb.container} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      <View style={nb.header}>
        <View style={nb.headerRow}>
          <TouchableOpacity style={nb.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={nb.headerCenter}>
            <Text style={nb.headerTitle}>Request Blood</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={nb.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={nb.formBody}>

            <View style={nb.section}>
              <Text style={nb.sectionTitle}>Blood Information</Text>

              <View style={nb.inputGroup}>
                <Text style={nb.inputLabel}>Blood Type Needed *</Text>
                <TouchableOpacity style={[nb.pickerTrigger, isBloodTypeExpanded && nb.pickerTriggerExpanded]}
                  onPress={() => { setIsBloodTypeExpanded(!isBloodTypeExpanded); setIsBloodComponentExpanded(false); setIsHospitalExpanded(false); }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{formData.bloodType}</Text>
                  <Ionicons name={isBloodTypeExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {isBloodTypeExpanded && (
                  <View style={nb.inlineSelectionContainer}>
                    <View style={nb.selectionGrid}>
                      {BLOOD_TYPES.map(type => (
                        <TouchableOpacity key={type} style={[nb.selectionItem, formData.bloodType === type && nb.selectionItemActive]}
                          onPress={() => { handleInputChange('bloodType', type); setIsBloodTypeExpanded(false); }}>
                          <Ionicons name="water" size={18} color={formData.bloodType === type ? colors.primary : colors.textMuted} />
                          <Text style={[nb.selectionText, formData.bloodType === type && nb.selectionTextActive]}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <View style={nb.inputGroup}>
                <Text style={nb.inputLabel}>Urgency Level *</Text>
                <View style={nb.urgencyRow}>
                  {[
                    { id: 'moderate', icon: 'information-circle', color: GREEN, bg: GREEN_PALE },
                    { id: 'urgent', icon: 'alert-circle', color: WARN, bg: WARN_PALE },
                    { id: 'critical', icon: 'warning', color: DANGER, bg: DANGER_PALE }
                  ].map(lvl => (
                    <TouchableOpacity key={lvl.id} onPress={() => handleInputChange('urgencyLevel', lvl.id as UrgencyLevel)}
                      style={[
                        nb.urgencyBtn,
                        formData.urgencyLevel === lvl.id && { backgroundColor: lvl.color, borderColor: lvl.color, ...shadow(lvl.color, 0.3, 8, 3) }
                      ]}>
                      <Ionicons name={lvl.icon as any} size={20} color={formData.urgencyLevel === lvl.id ? '#FFFFFF' : (isDark && lvl.id === 'moderate' ? '#D1FAE5' : lvl.color)} />
                      <Text style={[nb.urgencyText, formData.urgencyLevel === lvl.id && { color: '#FFFFFF', fontWeight: '900' }]}>
                        {lvl.id.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={nb.inputGroup}>
                <Text style={nb.inputLabel}>Units Needed *</Text>
                <View style={nb.unitsRow}>
                  {['1', '2', '3', '4', '5'].map(num => (
                    <TouchableOpacity key={num} style={[nb.unitBtn, formData.unitsNeeded === num && nb.unitBtnActive]} onPress={() => handleInputChange('unitsNeeded', num)}>
                      <Text style={[nb.unitText, formData.unitsNeeded === num && nb.unitTextActive]}>{num}</Text>
                    </TouchableOpacity>
                  ))}
                  <TextInput style={[nb.input, { flex: 1, height: 46, minWidth: 60, paddingVertical: 0 }]} placeholder="Other" keyboardType="number-pad"
                    value={['1', '2', '3', '4', '5'].includes(formData.unitsNeeded) ? '' : formData.unitsNeeded}
                    onChangeText={t => handleInputChange('unitsNeeded', t.replace(/[^0-9]/g, ''))} />
                </View>
              </View>

              <View style={nb.inputGroup}>
                <Text style={nb.inputLabel}>Blood Component *</Text>
                <TouchableOpacity style={[nb.pickerTrigger, isBloodComponentExpanded && nb.pickerTriggerExpanded]}
                  onPress={() => { setIsBloodComponentExpanded(!isBloodComponentExpanded); setIsBloodTypeExpanded(false); setIsHospitalExpanded(false); }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: TEXT_DARK }}>{formData.bloodComponent}</Text>
                  <Ionicons name={isBloodComponentExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {isBloodComponentExpanded && (
                  <View style={nb.inlineSelectionContainer}>
                    {BLOOD_COMPONENTS.map(comp => (
                      <TouchableOpacity key={comp} style={[nb.listSelectionItem, formData.bloodComponent === comp && nb.listSelectionItemActive]}
                        onPress={() => { handleInputChange('bloodComponent', comp); setIsBloodComponentExpanded(false); }}>
                        <Text style={[nb.listSelectionText, formData.bloodComponent === comp && nb.listSelectionTextActive]}>{comp}</Text>
                        {formData.bloodComponent === comp && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={nb.section}>
              <Text style={nb.sectionTitle}>Patient & Hospital</Text>

              <View style={nb.inputGroup}>
                <Text style={nb.inputLabel}>Patient Name *</Text>
                <TextInput style={[nb.input, errors.patientName && nb.inputError]} placeholder="Enter patient's full name"
                  value={formData.patientName} onChangeText={t => handleInputChange('patientName', t)} />
              </View>

              <View style={nb.inputGroup}>
                <Text style={nb.inputLabel}>Contact Number *</Text>
                <TextInput style={[nb.input, errors.requesterPhone && nb.inputError]} placeholder="Your contact number"
                  keyboardType="phone-pad" value={formData.requesterPhone} onChangeText={t => handleInputChange('requesterPhone', t)} />
              </View>

              <View style={nb.inputGroup}>
                <Text style={nb.inputLabel}>Select Hospital *</Text>
                <TouchableOpacity style={[nb.pickerTrigger, isHospitalExpanded && nb.pickerTriggerExpanded]}
                  onPress={() => { setIsHospitalExpanded(!isHospitalExpanded); setIsBloodTypeExpanded(false); setIsBloodComponentExpanded(false); }}>
                  <Text style={{ fontSize: 14, color: formData.hospitalName ? colors.text : colors.textSecondary }} numberOfLines={1}>
                    {formData.hospitalName || 'Choose from list...'}
                  </Text>
                  <Ionicons name={isHospitalExpanded ? "chevron-up" : "search"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {isHospitalExpanded && (
                  <View style={nb.inlineSelectionContainer}>
                    {/* County and Sub-County Filters */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: colors.surfaceAlt,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          height: 36,
                          borderWidth: isCountyExpanded ? 1 : 0,
                          borderColor: colors.primary
                        }}
                        onPress={() => { setIsCountyExpanded(!isCountyExpanded); setIsSubCountyExpanded(false); }}
                      >
                        <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                          {selectedCounty || 'All Counties'}
                        </Text>
                        <Ionicons name={isCountyExpanded ? "chevron-up" : "chevron-down"} size={14} color={colors.textSecondary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: colors.surfaceAlt,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          height: 36,
                          borderWidth: isSubCountyExpanded ? 1 : 0,
                          borderColor: colors.primary
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
                        <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                          {selectedSubCounty || 'All Sub-Counties'}
                        </Text>
                        <Ionicons name={isSubCountyExpanded ? "chevron-up" : "chevron-down"} size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    {isCountyExpanded && (
                      <View style={{ backgroundColor: colors.surface, borderRadius: 10, marginBottom: 12, maxHeight: 180, overflow: 'hidden', borderWidth: 1, borderColor: colors.primary }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.surfaceAlt }}>
                          <Ionicons name="search" size={14} color={colors.textSecondary} />
                          <TextInput
                            placeholder="Search county..."
                            placeholderTextColor={colors.textMuted}
                            style={{ flex: 1, marginLeft: 6, fontSize: 12, color: colors.text, paddingVertical: 4 }}
                            value={countySearch}
                            onChangeText={setCountySearch}
                          />
                        </View>
                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          <TouchableOpacity
                            style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: colors.divider }}
                            onPress={() => { setSelectedCounty(''); setSelectedSubCounty(''); setIsCountyExpanded(false); setCountySearch(''); }}
                          >
                            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>All Counties</Text>
                          </TouchableOpacity>
                          {KENYA_COUNTIES.filter(c => c.toLowerCase().includes(countySearch.toLowerCase())).map((c: string) => (
                            <TouchableOpacity
                              key={c}
                              style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: selectedCounty === c ? colors.surfaceAlt : colors.surface }}
                              onPress={() => { setSelectedCounty(c); setSelectedSubCounty(''); setIsCountyExpanded(false); setCountySearch(''); }}
                            >
                              <Text style={{ color: selectedCounty === c ? colors.primary : colors.text, fontSize: 13 }}>{c}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {isSubCountyExpanded && (
                      <View style={{ backgroundColor: colors.surface, borderRadius: 10, marginBottom: 12, maxHeight: 180, overflow: 'hidden', borderWidth: 1, borderColor: colors.primary }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.surfaceAlt }}>
                          <Ionicons name="search" size={14} color={colors.textSecondary} />
                          <TextInput
                            placeholder="Search sub-county..."
                            placeholderTextColor={colors.textMuted}
                            style={{ flex: 1, marginLeft: 6, fontSize: 12, color: colors.text, paddingVertical: 4 }}
                            value={subCountySearch}
                            onChangeText={setSubCountySearch}
                          />
                        </View>
                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          <TouchableOpacity
                            style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: colors.divider }}
                            onPress={() => { setSelectedSubCounty(''); setIsSubCountyExpanded(false); setSubCountySearch(''); }}
                          >
                            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>All Sub-Counties</Text>
                          </TouchableOpacity>
                          {getSubCountiesByCounty(selectedCounty).filter(sc => sc.toLowerCase().includes(subCountySearch.toLowerCase())).map((sc: string) => (
                            <TouchableOpacity
                              key={sc}
                              style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: selectedSubCounty === sc ? colors.surfaceAlt : colors.surface }}
                              onPress={() => { setSelectedSubCounty(sc); setIsSubCountyExpanded(false); setSubCountySearch(''); }}
                            >
                              <Text style={{ color: selectedSubCounty === sc ? colors.primary : colors.text, fontSize: 13 }}>{sc}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <View style={nb.hospitalSearchBox}>
                      <Ionicons name="search" size={16} color={colors.textSecondary} />
                      <TextInput style={nb.hospitalSearchInput} placeholder="Search hospital..." value={hospitalSearchQuery} onChangeText={setHospitalSearchQuery} />
                    </View>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
                      <TouchableOpacity style={[nb.hospitalItem, formData.hospitalId === 'other' && nb.hospitalItemActive]} onPress={() => selectHospital('other')}>
                        <View style={nb.hospitalIcon}><Ionicons name="pencil" size={18} color={colors.primary} /></View>
                        <View style={{ flex: 1 }}><Text style={nb.hospitalName}>Other Hospital</Text><Text style={nb.hospitalAddr}>Enter details manually</Text></View>
                        {formData.hospitalId === 'other' && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                      </TouchableOpacity>
                      {filteredHospitals.map(bank => (
                        <TouchableOpacity key={bank.id} style={[nb.hospitalItem, formData.hospitalId === bank.id && nb.hospitalItemActive]} onPress={() => selectHospital(bank)}>
                          <View style={nb.hospitalIcon}><Ionicons name="business" size={18} color={colors.primary} /></View>
                          <View style={{ flex: 1 }}>
                            <Text style={nb.hospitalName}>{bank.name}</Text>
                            <Text style={nb.hospitalAddr} numberOfLines={1}>{bank.address}</Text>
                            {bank.distance !== undefined && <Text style={nb.distanceBadge}>{bank.distance.toFixed(1)} km away</Text>}
                          </View>
                          {formData.hospitalId === bank.id && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={nb.inputGroup}>
                <Text style={nb.inputLabel}>Hospital Address *</Text>
                <TextInput style={[nb.input, nb.textArea, errors.hospitalAddress && nb.inputError]} placeholder="Enter hospital address"
                  multiline value={formData.hospitalAddress} onChangeText={t => handleInputChange('hospitalAddress', t)} />
              </View>

              <TouchableOpacity style={[nb.locationBtn, loadingLocation && { opacity: 0.7 }]} onPress={getCurrentLocationHandler} disabled={loadingLocation}>
                {loadingLocation ? <ActivityIndicator color="#FFFFFF" /> : (
                  <>
                    <Ionicons name="location" size={20} color="#FFFFFF" />
                    <Text style={nb.locationBtnText}>{location ? 'Update Location' : 'Capture Location'}</Text>
                  </>
                )}
              </TouchableOpacity>

              {location && (
                <View style={nb.locationConfirm}>
                  <Ionicons name="checkmark-circle" size={24} color={GREEN} />
                  <View style={{ flex: 1 }}>
                    <Text style={nb.locationConfirmTitle}>Location Captured</Text>
                    <Text style={nb.locationConfirmSub} numberOfLines={1}>{location.address}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={nb.section}>
              <Text style={nb.sectionTitle}>Verification Document</Text>
              <Text style={nb.helperText}>Upload image of blood request form for verification.</Text>
              <TouchableOpacity style={[nb.uploadArea, formData.hospitalFormUrl && nb.uploadAreaSuccess]} onPress={handleImagePicker}>
                {formData.hospitalFormUrl ? (
                  <>
                    <Image source={{ uri: formData.hospitalFormUrl }} style={nb.previewImg} />
                    <View style={nb.changeImgBadge}><Ionicons name="camera" size={14} color="#FFFFFF" /><Text style={nb.changeImgText}>Change Image</Text></View>
                  </>
                ) : (
                  <View style={nb.uploadPlaceholder}>
                    {imageUploading ? <ActivityIndicator size="large" color={colors.primary} /> : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
                        <Text style={nb.uploadTitle}>Pick Image</Text>
                        <Text style={nb.uploadSub}>JPG, PNG allowed</Text>
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={nb.section}>
              <Text style={nb.sectionTitle}>Notes (Optional)</Text>
              <TextInput style={[nb.input, nb.textArea]} placeholder="Additional details..." multiline
                value={formData.description} onChangeText={t => handleInputChange('description', t)} />
            </View>

            <TouchableOpacity style={[nb.submitBtn, (loading || imageUploading) && nb.submitBtnDisabled]} onPress={handleSubmit} disabled={loading || imageUploading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <Text style={nb.submitBtnText}>Create Request</Text>
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView >
  );
};

export default NeedBloodScreen;