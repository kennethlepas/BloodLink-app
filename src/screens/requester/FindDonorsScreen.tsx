// ═══════════════════════════════════════════════════════════════════════════
// FindDonorsScreen.tsx
// ═══════════════════════════════════════════════════════════════════════════

import { useUser } from '@/src/contexts/UserContext';
import { getUsersByBloodType } from '@/src/services/firebase/database';
import { BloodType, Donor } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Platform,
  RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ─── Colors ──────────────────────────────────────────────────────────────────
const TEAL      = '#0D9488';
const TEAL_MID  = '#14B8A6';
const TEAL_PALE = '#CCFBF1';
const TEAL_BG   = '#F0FDFA';
const GREEN     = '#10B981';
const GREEN_PALE= '#D1FAE5';
const WARN      = '#F59E0B';
const WARN_PALE = '#FEF3C7';
const DANGER    = '#EF4444';
const BLUE      = '#3B82F6';
const BLUE_PALE = '#DBEAFE';
const PURPLE    = '#8B5CF6';
const SURFACE   = '#FFFFFF';
const BG        = '#F8FAFC';
const TEXT_DARK = '#0F172A';
const TEXT_MID  = '#475569';
const TEXT_SOFT = '#94A3B8';
const BORDER    = '#E2E8F0';

const shadow = (c = '#000', o = 0.08, r = 10, e = 3) =>
  Platform.select({
    web: { boxShadow: `0 2px ${r}px rgba(0,0,0,${o})` } as any,
    default: { shadowColor: c, shadowOffset: { width: 0, height: 2 }, shadowOpacity: o, shadowRadius: r, elevation: e },
  });

// ─── Donor Card ──────────────────────────────────────────────────────────────
interface DonorCardProps { donor: Donor; onContact: (d: Donor) => void; onViewProfile: (d: Donor) => void; }

const DonorCard: React.FC<DonorCardProps> = ({ donor, onContact, onViewProfile }) => {
  const initials = `${donor.firstName.charAt(0)}${donor.lastName.charAt(0)}`.toUpperCase();

  const getStatus = () => {
    if (!donor.isAvailable) return { text: 'Unavailable', color: TEXT_SOFT, bg: BG, dot: '#CBD5E1' };
    if (donor.lastDonationDate) {
      const days = Math.floor((Date.now() - new Date(donor.lastDonationDate).getTime()) / 86400000);
      if (days < 56) return { text: `${56 - days}d until eligible`, color: WARN, bg: WARN_PALE, dot: WARN };
    }
    return { text: 'Available Now', color: GREEN, bg: GREEN_PALE, dot: GREEN };
  };

  const status = getStatus();

  return (
    <View style={fd.card}>
      <View style={fd.cardInner}>
        {/* Avatar + Info */}
        <View style={fd.topRow}>
          <View style={fd.avatarWrap}>
            {donor.profilePicture
              ? <Image source={{ uri: donor.profilePicture }} style={fd.avatarImg} />
              : <LinearGradient colors={[TEAL, TEAL_MID]} style={fd.avatarFallback}>
                  <Text style={fd.avatarInitials}>{initials}</Text>
                </LinearGradient>
            }
            {/* Blood type badge */}
            <View style={fd.bloodBadge}>
              <Ionicons name="water" size={8} color="#FFFFFF" />
              <Text style={fd.bloodBadgeText}>{donor.bloodType}</Text>
            </View>
          </View>

          <View style={fd.infoBlock}>
            <Text style={fd.donorName} numberOfLines={1}>{donor.firstName} {donor.lastName}</Text>
            {donor.location?.city && (
              <View style={fd.locationRow}>
                <Ionicons name="location-outline" size={12} color={TEXT_SOFT} />
                <Text style={fd.locationText} numberOfLines={1}>
                  {donor.location.city}{donor.location.region ? `, ${donor.location.region}` : ''}
                </Text>
              </View>
            )}
            {donor.totalDonations > 0 && (
              <View style={fd.donationsRow}>
                <Ionicons name="heart" size={12} color={DANGER} />
                <Text style={fd.donationsText}>{donor.totalDonations} donation{donor.totalDonations !== 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>

          {/* Status badge */}
          <View style={[fd.statusBadge, { backgroundColor: status.bg }]}>
            <View style={[fd.statusDot, { backgroundColor: status.dot }]} />
            <Text style={[fd.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        </View>

        {/* Stats Row */}
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

        {/* Action Buttons */}
        <View style={fd.actions}>
          <TouchableOpacity style={fd.profileBtn} onPress={() => onViewProfile(donor)} activeOpacity={0.75}>
            <Ionicons name="person-outline" size={16} color={TEAL} />
            <Text style={fd.profileBtnText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[fd.contactBtn, !donor.isAvailable && fd.contactBtnDisabled]}
            onPress={() => onContact(donor)}
            disabled={!donor.isAvailable}
            activeOpacity={0.75}
          >
            <LinearGradient
              colors={!donor.isAvailable ? ['#CBD5E1', '#94A3B8'] : [TEAL, TEAL_MID]}
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

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function FindDonorsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [filteredDonors, setFilteredDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodType, setSelectedBloodType] = useState<BloodType | 'all'>('all');
  const [availableOnly, setAvailableOnly] = useState(true);

  useEffect(() => { loadDonors(); }, []);
  useEffect(() => { filterDonors(); }, [donors, searchQuery, selectedBloodType, availableOnly]);

  const loadDonors = async () => {
    try {
      setLoading(true);
      const all: Donor[] = [];
      for (const bt of BLOOD_TYPES) all.push(...await getUsersByBloodType(bt));
      setDonors(all);
    } catch {
      Alert.alert('Error', 'Failed to load donors. Please try again.');
    } finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadDonors(); setRefreshing(false); };

  const filterDonors = () => {
    let f = [...donors];
    if (selectedBloodType !== 'all') f = f.filter(d => d.bloodType === selectedBloodType);
    if (availableOnly) f = f.filter(d => d.isAvailable);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter(d =>
        `${d.firstName} ${d.lastName}`.toLowerCase().includes(q) ||
        d.location?.city?.toLowerCase().includes(q) ||
        d.location?.region?.toLowerCase().includes(q)
      );
    }
    setFilteredDonors(f);
  };

  const handleContactDonor = (donor: Donor) =>
    Alert.alert('Contact Donor', `Would you like to contact ${donor.firstName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send Message', onPress: () => Alert.alert('Coming Soon', 'Chat functionality coming soon') },
      { text: 'Create Request', onPress: () => router.push('/(requester)/needblood' as any) },
    ]);

  const handleViewProfile = (donor: Donor) =>
    router.push({ pathname: '/(requester)/donor-profile' as any, params: { donorData: JSON.stringify(donor) } });

  const renderEmpty = () => (
    <View style={fd.emptyWrap}>
      <LinearGradient colors={[TEAL_PALE, '#99F6E4']} style={fd.emptyIconBox}>
        <Ionicons name="people-outline" size={46} color={TEAL} />
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
      <LinearGradient colors={[TEAL, TEAL_MID]} style={fd.header}>
        <View style={fd.headerRow}>
          <TouchableOpacity style={fd.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={fd.headerCenter}>
            <Text style={fd.headerTitle}>Find Donors</Text>
            <Text style={fd.headerSub}>{filteredDonors.length} donor{filteredDonors.length !== 1 ? 's' : ''} found</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Search + Filters */}
      <View style={fd.filtersWrap}>
        <View style={fd.searchBar}>
          <Ionicons name="search" size={18} color={TEXT_SOFT} />
          <TextInput style={fd.searchInput} placeholder="Search by name or location…"
            placeholderTextColor={TEXT_SOFT} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={TEXT_SOFT} />
            </TouchableOpacity>
          )}
        </View>

        <View style={fd.filterRow}>
          <View style={fd.pickerWrap}>
            <View style={fd.pickerIconContainer}>
              <Ionicons name="water" size={18} color={TEXT_SOFT} />
            </View>
            <Picker selectedValue={selectedBloodType}
              onValueChange={v => setSelectedBloodType(v as BloodType | 'all')}
              style={fd.picker}>
              <Picker.Item label="All Blood Types" value="all" />
              {BLOOD_TYPES.map(t => <Picker.Item key={t} label={t} value={t} />)}
            </Picker>
          </View>
          
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

      {loading
        ? <View style={fd.loadingWrap}><ActivityIndicator size="large" color={TEAL} /><Text style={fd.loadingText}>Loading donors…</Text></View>
        : <FlatList data={filteredDonors} keyExtractor={i => i.id}
            renderItem={({ item }) => <DonorCard donor={item} onContact={handleContactDonor} onViewProfile={handleViewProfile} />}
            contentContainerStyle={fd.listContent} showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />}
            ListEmptyComponent={renderEmpty} />
      }
    </SafeAreaView>
  );
}

const fd = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 16, paddingVertical: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },

  filtersWrap: { backgroundColor: SURFACE, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 10, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_DARK },
  
  filterRow: { gap: 10 },
  pickerWrap: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: BG, 
    borderRadius: 12, 
    paddingRight: 12,
    borderWidth: 1, 
    borderColor: BORDER,
    overflow: 'hidden',
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
  availToggle: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 6, 
    backgroundColor: BG, 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    borderWidth: 1, 
    borderColor: BORDER 
  },
  availToggleActive: { backgroundColor: GREEN_PALE, borderColor: '#A7F3D0' },
  availText: { fontSize: 13, fontWeight: '600', color: TEXT_SOFT },
  availTextActive: { color: GREEN },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: TEXT_MID },
  listContent: { padding: 16, paddingBottom: 40 },

  card: { backgroundColor: SURFACE, borderRadius: 18, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, ...shadow('#000', 0.08, 12, 4) },
  cardInner: { padding: 16 },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: TEAL_PALE },
  avatarFallback: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  bloodBadge: { position: 'absolute', bottom: -2, right: -4, backgroundColor: DANGER, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 7, borderWidth: 1.5, borderColor: SURFACE },
  bloodBadgeText: { fontSize: 8, fontWeight: '900', color: '#FFFFFF' },

  infoBlock: { flex: 1, gap: 4 },
  donorName: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 12, color: TEXT_MID, flex: 1 },
  donationsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  donationsText: { fontSize: 12, color: DANGER, fontWeight: '600' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderBottomWidth: 1, borderColor: BORDER, paddingVertical: 12, marginBottom: 12 },
  statItem: { alignItems: 'center', gap: 3 },
  statValue: { fontSize: 14, fontWeight: '800', color: TEXT_DARK },
  statLabel: { fontSize: 10, color: TEXT_SOFT, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 10 },
  profileBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: TEAL_PALE, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: '#99F6E4' },
  profileBtnText: { fontSize: 13, fontWeight: '700', color: TEAL },
  contactBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  contactBtnDisabled: { opacity: 0.6 },
  contactBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11 },
  contactBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  emptyWrap: { flex: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIconBox: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: TEXT_DARK, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  resetBtn: { backgroundColor: TEAL, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  resetBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});