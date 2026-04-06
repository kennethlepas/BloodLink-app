import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { useCachedData } from '@/src/hooks/useCachedData';
import { getUsersByBloodType } from '@/src/services/firebase/database';
import { BloodType, Donor } from '@/src/types/types';
import { canDonateTo } from '@/src/utils/bloodCompatibility';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList, Image, Modal, Platform,
  RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ─── Constants (Legacy/Brand) ──────────────────────────────────────────────────────────────
const BLUE = '#3B82F6';
const BLUE_PALE = '#DBEAFE';
const GREEN = '#10B981';
const GREEN_PALE = '#D1FAE5';
const DANGER = '#EF4444';
const DANGER_PALE = '#FEE2E2';
const WARN = '#F59E0B';
const WARN_PALE = '#FEF3C7';
const PURPLE = '#8B5CF6';
const PURPLE_PALE = '#EDE9FE';
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

  filtersWrap: { borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14 },
  searchBar: { borderRadius: 12, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceAlt, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },

  filterRow: { gap: 10 },
  availToggle: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  availToggleActive: { backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : GREEN_PALE, borderColor: GREEN },
  availText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  availTextActive: { color: GREEN },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: colors.textSecondary },
  listContent: { paddingBottom: 100 },

  // Simple List Item
  donorItem: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  separator: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginLeft: 82,
  },
  avatarWrapSmall: { position: 'relative' },
  avatarSmall: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarTextSmall: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  availabilityDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.surface },

  donorInfo: { flex: 1, marginLeft: 16 },
  donorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  donorName: { fontSize: 16, fontWeight: '700', color: colors.text },
  bloodBadgeMini: { backgroundColor: DANGER, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  bloodTypeTextMini: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },
  donorMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationTextMini: { fontSize: 13, color: colors.textSecondary },

  // Detail Card (Modal)
  detailCard: { borderRadius: 18, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  cardInner: { padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  avatarWrapLarge: { position: 'relative' },
  avatarImgLarge: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.primary },
  avatarFallbackLarge: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  avatarInitialsLarge: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  bloodBadgeLarge: { position: 'absolute', bottom: -2, right: -4, borderRadius: 7, borderWidth: 1.5, borderColor: colors.surface, backgroundColor: DANGER, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 2 },
  bloodBadgeTextLarge: { fontSize: 8, fontWeight: '900', color: '#FFFFFF' },

  infoBlock: { flex: 1, gap: 2 },
  donorNameLarge: { fontSize: 18, fontWeight: '800', color: colors.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationTextLarge: { flex: 1, fontSize: 13, color: colors.textSecondary },
  donationsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  donationsTextLarge: { fontSize: 13, color: DANGER, fontWeight: '600' },

  statusBadge: { borderRadius: 20, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  statsRow: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.surfaceBorder, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, paddingVertical: 12 },
  statItem: { alignItems: 'center', gap: 3 },
  statValue: { fontSize: 14, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 10 },
  profileBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : colors.surface, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 11 },
  profileBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  contactBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  contactBtnDisabled: { opacity: 0.6 },
  contactBtnGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 11 },
  contactBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Modal Structure
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.bg, borderRadius: 26, padding: 24, paddingBottom: 30, maxHeight: '90%', ...shadow(colors.primary, 0.15, 15, 10) },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },

  emptyWrap: { flex: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIconBox: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  resetBtn: { borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 12 },
  resetBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  pickerTrigger: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  pickerTriggerExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: colors.primary,
  },
  inlineSelectionContainer: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.primary,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: colors.surface,
    marginTop: -1,
    marginBottom: 10,
    padding: 12
  },
  selectionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
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
  selectionItemActive: {
    backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : BLUE_PALE,
    borderColor: colors.primary,
  },
  selectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
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
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  }
});

interface DonorCardProps { donor: Donor; onContact: (d: Donor) => void; onViewProfile: (d: Donor) => void; }

const DonorListItem = ({ donor, onPress }: { donor: Donor; onPress: () => void }) => {
  const { colors, isDark } = useAppTheme();
  const fd = getStyles(colors, isDark);
  const initials = `${donor.firstName.charAt(0)}${donor.lastName.charAt(0)}`.toUpperCase();
  const isAvailable = donor.isAvailable;

  return (
    <TouchableOpacity style={fd.donorItem} onPress={onPress} activeOpacity={0.7}>
      <View style={fd.avatarWrapSmall}>
        {donor.profilePicture
          ? <Image source={{ uri: donor.profilePicture }} style={fd.avatarSmall} />
          : <LinearGradient colors={[BLUE, '#60A5FA']} style={fd.avatarSmall}>
            <Text style={fd.avatarTextSmall}>{initials}</Text>
          </LinearGradient>
        }
        <View style={[fd.availabilityDot, { backgroundColor: isAvailable ? GREEN : TEXT_SOFT }]} />
      </View>
      <View style={fd.donorInfo}>
        <View style={fd.donorHeader}>
          <Text style={fd.donorName}>{donor.firstName} {donor.lastName}</Text>
          <View style={fd.bloodBadgeMini}>
            <Text style={fd.bloodTypeTextMini}>{donor.bloodType}</Text>
          </View>
        </View>
        <View style={fd.donorMeta}>
          <Ionicons name="location-outline" size={14} color={TEXT_SOFT} />
          <Text style={fd.locationTextMini} numberOfLines={1}>
            {donor.location?.city || 'Unknown Location'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const DonorDetailView: React.FC<DonorCardProps> = ({ donor, onContact, onViewProfile }) => {
  const { colors, isDark } = useAppTheme();
  const fd = getStyles(colors, isDark);
  const initials = `${donor.firstName.charAt(0)}${donor.lastName.charAt(0)}`.toUpperCase();

  const getStatus = () => {
    if (!donor.isAvailable) return { text: 'Unavailable', color: TEXT_SOFT, bg: '#F1F5F9', dot: '#CBD5E1' };
    if (donor.lastDonationDate) {
      const days = Math.floor((Date.now() - new Date(donor.lastDonationDate).getTime()) / 86400000);
      if (days < 56) return { text: `${56 - days}d until eligible`, color: WARN, bg: WARN_PALE, dot: WARN };
    }
    return { text: 'Available Now', color: GREEN, bg: GREEN_PALE, dot: GREEN };
  };

  const status = getStatus();

  return (
    <View style={fd.detailCard}>
      <View style={fd.cardInner}>
        <View style={fd.topRow}>
          <View style={fd.avatarWrapLarge}>
            {donor.profilePicture
              ? <Image source={{ uri: donor.profilePicture }} style={fd.avatarImgLarge} />
              : <LinearGradient colors={[BLUE, '#60A5FA']} style={fd.avatarFallbackLarge}>
                <Text style={fd.avatarInitialsLarge}>{initials}</Text>
              </LinearGradient>
            }
            <View style={fd.bloodBadgeLarge}>
              <Ionicons name="water" size={8} color="#FFFFFF" />
              <Text style={fd.bloodBadgeTextLarge}>{donor.bloodType}</Text>
            </View>
          </View>

          <View style={fd.infoBlock}>
            <Text style={fd.donorNameLarge} numberOfLines={1}>{donor.firstName} {donor.lastName}</Text>
            {donor.location?.city && (
              <View style={fd.locationRow}>
                <Ionicons name="location-outline" size={12} color={TEXT_SOFT} />
                <Text style={fd.locationTextLarge} numberOfLines={1}>
                  {donor.location.city}{donor.location.region ? `, ${donor.location.region}` : ''}
                </Text>
              </View>
            )}
            {donor.totalDonations > 0 && (
              <View style={fd.donationsRow}>
                <Ionicons name="heart" size={12} color={DANGER} />
                <Text style={fd.donationsTextLarge}>{donor.totalDonations} donation{donor.totalDonations !== 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>

          <View style={[fd.statusBadge, { backgroundColor: status.bg }]}>
            <View style={[fd.statusDot, { backgroundColor: status.dot }]} />
            <Text style={[fd.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        </View>

        <View style={fd.statsRow}>
          <View style={fd.statItem}>
            <Ionicons name="trophy-outline" size={16} color={WARN} />
            <Text style={fd.statValue}>{donor.points || 0}</Text>
            <Text style={fd.statLabel}>Points</Text>
          </View>
          {donor.lastDonationDate && (
            <View style={fd.statItem}>
              <Ionicons name="calendar-outline" size={16} color={BLUE} />
              <Text style={fd.statValue}>
                {new Date(donor.lastDonationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={fd.statLabel}>Last Donated</Text>
            </View>
          )}
          <View style={fd.statItem}>
            <Ionicons name="water" size={16} color={DANGER} />
            <Text style={[fd.statValue, { color: DANGER }]}>{donor.bloodType}</Text>
            <Text style={fd.statLabel}>Blood Type</Text>
          </View>
          {donor.medicalHistory?.weight && (
            <View style={fd.statItem}>
              <Ionicons name="fitness-outline" size={16} color={PURPLE} />
              <Text style={fd.statValue}>{donor.medicalHistory.weight}kg</Text>
              <Text style={fd.statLabel}>Weight</Text>
            </View>
          )}
        </View>

        <View style={fd.actions}>
          <TouchableOpacity style={fd.profileBtn} onPress={() => onViewProfile(donor)} activeOpacity={0.75}>
            <Ionicons name="person-outline" size={16} color={BLUE} />
            <Text style={fd.profileBtnText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[fd.contactBtn, !donor.isAvailable && fd.contactBtnDisabled]}
            onPress={() => onContact(donor)}
            disabled={!donor.isAvailable}
            activeOpacity={0.75}
          >
            <LinearGradient
              colors={!donor.isAvailable ? ['#CBD5E1', '#94A3B8'] : [BLUE, '#60A5FA']}
              style={fd.contactBtnGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
              <Text style={fd.contactBtnText}>Contact</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function FindDonorsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { colors, isDark } = useAppTheme();
  const fd = getStyles(colors, isDark);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [viewDonor, setViewDonor] = useState<Donor | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodType, setSelectedBloodType] = useState<BloodType | 'all' | 'compatible'>('compatible');
  const [isBloodTypeExpanded, setIsBloodTypeExpanded] = useState(false);

  const {
    data: donorsData,
    loading: loadingDonors,
    refresh: refreshDonors
  } = useCachedData(
    'all_donors',
    async () => {
      const all: Donor[] = [];
      const results = await Promise.all(BLOOD_TYPES.map(bt => getUsersByBloodType(bt)));
      results.forEach(batch => all.push(...batch));
      return all;
    }
  );

  const donors = donorsData || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDonors();
    setRefreshing(false);
  }, [refreshDonors]);

  const filteredDonors = useMemo(() => {
    let f = [...donors];
    if (selectedBloodType === 'compatible' && user?.bloodType) {
      f = f.filter(d => d.bloodType && canDonateTo(d.bloodType, user.bloodType as BloodType));
    } else if (selectedBloodType !== 'all' && selectedBloodType !== 'compatible') {
      f = f.filter(d => d.bloodType === selectedBloodType);
    }
    if (availableOnly) f = f.filter(d => d.isAvailable);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter(d =>
        `${d.firstName} ${d.lastName}`.toLowerCase().includes(q) ||
        d.location?.city?.toLowerCase().includes(q) ||
        d.location?.region?.toLowerCase().includes(q)
      );
    }
    return f;
  }, [donors, searchQuery, selectedBloodType, availableOnly, user?.bloodType]);

  const handleContactDonor = (donor: Donor) => {
    setViewDonor(null);
    router.push({
      pathname: '/(shared)/chat' as any,
      params: {
        recipientId: donor.id,
        recipientName: `${donor.firstName} ${donor.lastName}`,
        recipientType: 'donor',
        chatRole: 'requester'
      }
    });
  };

  const handleViewProfile = (donor: Donor) =>
    router.push({ pathname: '/(requester)/donor-profile' as any, params: { donorData: JSON.stringify(donor) } });

  const renderEmpty = () => (
    <View style={fd.emptyWrap}>
      <LinearGradient colors={[BLUE_PALE, '#E0F2FE']} style={fd.emptyIconBox}>
        <Ionicons name="people-outline" size={46} color={BLUE} />
      </LinearGradient>
      <Text style={fd.emptyTitle}>No Donors Found</Text>
      <Text style={fd.emptyText}>{searchQuery ? 'Try adjusting your search filters' : 'No donors match the selected criteria'}</Text>
      <TouchableOpacity style={fd.resetBtn}
        onPress={() => { setSearchQuery(''); setSelectedBloodType('all'); setAvailableOnly(false); }}>
        <Text style={fd.resetBtnText}>Reset Filters</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={fd.container} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
      <View style={fd.header}>
        <View style={fd.headerRow}>
          <TouchableOpacity style={fd.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
          </TouchableOpacity>
          <View style={fd.headerCenter}>
            <Text style={fd.headerTitle}>Find Donors</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={fd.filtersWrap}>
        <View style={fd.searchBar}>
          <Ionicons name="search" size={18} color={TEXT_SOFT} />
          <TextInput style={fd.searchInput} placeholder="Search by name or location…"
            placeholderTextColor={colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={TEXT_SOFT} />
            </TouchableOpacity>
          )}
        </View>

        <View style={fd.filterRow}>
          <TouchableOpacity
            style={[fd.pickerTrigger, isBloodTypeExpanded && fd.pickerTriggerExpanded]}
            onPress={() => setIsBloodTypeExpanded(!isBloodTypeExpanded)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="water" size={18} color={isBloodTypeExpanded ? BLUE : TEXT_SOFT} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: isBloodTypeExpanded ? BLUE : TEXT_DARK }}>
                {selectedBloodType === 'all' ? 'All Blood Types' : selectedBloodType}
              </Text>
            </View>
            <Ionicons name={isBloodTypeExpanded ? "chevron-up" : "chevron-down"} size={20} color={isBloodTypeExpanded ? BLUE : TEXT_SOFT} />
          </TouchableOpacity>

          {isBloodTypeExpanded && (
            <View style={fd.inlineSelectionContainer}>
              <TouchableOpacity
                style={[fd.allTypeItem, selectedBloodType === 'all' && fd.selectionItemActive]}
                onPress={() => {
                  setSelectedBloodType('all');
                  setIsBloodTypeExpanded(false);
                }}
              >
                <Text style={[fd.selectionText, { marginTop: 0 }, selectedBloodType === 'all' && fd.selectionTextActive]}>
                  ALL BLOOD TYPES
                </Text>
              </TouchableOpacity>
              <View style={fd.selectionGrid}>
                {BLOOD_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[fd.selectionItem, selectedBloodType === type && fd.selectionItemActive]}
                    onPress={() => {
                      setSelectedBloodType(type);
                      setIsBloodTypeExpanded(false);
                    }}
                  >
                    <Ionicons
                      name="water"
                      size={16}
                      color={selectedBloodType === type ? BLUE : TEXT_SOFT}
                    />
                    <Text style={[fd.selectionText, selectedBloodType === type && fd.selectionTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[fd.availToggle, availableOnly && fd.availToggleActive]}
            onPress={() => setAvailableOnly(!availableOnly)}
          >
            <Ionicons name={availableOnly ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={18} color={availableOnly ? GREEN : TEXT_SOFT} />
            <Text style={[fd.availText, availableOnly && fd.availTextActive]}>Available Only</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loadingDonors
        ? <View style={fd.loadingWrap}><ActivityIndicator size="large" color={BLUE} /><Text style={fd.loadingText}>Loading donors…</Text></View>
        : <FlatList data={filteredDonors} keyExtractor={i => i.id}
          renderItem={({ item }) => <DonorListItem donor={item} onPress={() => setViewDonor(item)} />}
          contentContainerStyle={fd.listContent} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BLUE]} tintColor={BLUE} />}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() => <View style={fd.separator} />} />
      }

      <Modal visible={!!viewDonor} transparent animationType="fade" onRequestClose={() => setViewDonor(null)}>
        <View style={fd.modalOverlay}>
          <View style={fd.modalContent}>
            <View style={fd.modalHeader}>
              <Text style={fd.modalTitle}>Donor Profile</Text>
              <TouchableOpacity onPress={() => setViewDonor(null)} style={fd.modalCloseBtn}>
                <Ionicons name="close" size={22} color={TEXT_SOFT} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              {viewDonor && <DonorDetailView donor={viewDonor} onContact={handleContactDonor} onViewProfile={handleViewProfile} />}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}