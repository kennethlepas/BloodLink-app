import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import {
  cancelAcceptedRequest,
  createNotification,
  getDonorAcceptedRequests,
  getDonorHistory,
  markDonationPendingVerification,
  startAcceptedRequest
} from '@/src/services/firebase/database';
import { AcceptedRequest, DonationRecord } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabType = 'active' | 'history';

// Brand Colors 
const B_DARK = '#1D4ED8';
const B_MID = '#2563EB';
const B_LIGHT = '#3B82F6';
const B_SOFT = '#60A5FA';
const B_PALE = '#DBEAFE';
const SUCCESS = '#10B981';
const SUCCESS_PALE = '#D1FAE5';
const WARN = '#F59E0B';
const WARN_PALE = '#FEF3C7';
const DANGER = '#EF4444';
const DANGER_PALE = '#FEE2E2';
const PURPLE = '#8B5CF6';
const PURPLE_PALE = '#EDE9FE';

const shadow = (color = '#000', opacity = 0.08, radius = 10, elevation = 3) =>
  Platform.select({
    web: { boxShadow: `0 2px ${radius}px rgba(0,0,0,${opacity})` } as any,
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  });

const DonationHistoryScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const { isDark, colors } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [acceptedRequests, setAcceptedRequests] = useState<AcceptedRequest[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'thisYear' | 'lastYear'>('all');
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [selectedCommitment, setSelectedCommitment] = useState<AcceptedRequest | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [donationNotes, setDonationNotes] = useState('');
  const [viewCommitment, setViewCommitment] = useState<AcceptedRequest | null>(null);
  const [viewDonation, setViewDonation] = useState<DonationRecord | null>(null);

  // Theme-aware colors
  const TEXT_DARK = colors.text;
  const TEXT_MID = colors.textSecondary;
  const TEXT_SOFT = colors.textMuted;
  const BORDER = colors.divider;
  const SURFACE = colors.surface;
  const BG = colors.bg;

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const activeCommitments = await getDonorAcceptedRequests(user.id);
      const pending = activeCommitments.filter(
        req => ['pending', 'in_progress', 'pending_verification'].includes(req.status)
      );
      setAcceptedRequests(pending);
      const donorHistory = await getDonorHistory(user.id);
      setDonations(donorHistory);
    } catch (error) {
      Alert.alert('Error', 'Failed to load donation data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getFilteredDonations = () => {
    const now = new Date().getFullYear();
    if (filter === 'thisYear') return donations.filter(d => new Date(d.donationDate).getFullYear() === now);
    if (filter === 'lastYear') return donations.filter(d => new Date(d.donationDate).getFullYear() === now - 1);
    return donations;
  };

  const filteredDonations = getFilteredDonations();
  const totalPoints = filteredDonations.reduce((s, d) => s + d.pointsEarned, 0);
  const totalUnits = filteredDonations.reduce((s, d) => s + (d.unitsCollected || 1), 0);

  const handleStartCommitment = async (c: AcceptedRequest) => {
    try {
      await startAcceptedRequest(c.id);
      Alert.alert('Success', 'Commitment marked as in progress!');
      await loadData();
    } catch { Alert.alert('Error', 'Failed to update commitment.'); }
  };

  const handleCancelCommitment = (c: AcceptedRequest) => { setSelectedCommitment(c); setCancelModalVisible(true); };

  const confirmCancelCommitment = async () => {
    if (!selectedCommitment) return;
    if (!cancellationReason.trim()) { Alert.alert('Required', 'Please provide a reason for cancellation.'); return; }
    try {
      await cancelAcceptedRequest(selectedCommitment.id, cancellationReason);
      await createNotification({
        userId: selectedCommitment.requesterId,
        type: 'system_alert',
        title: 'Donation Cancelled',
        message: `${user?.firstName} ${user?.lastName} has cancelled their commitment. Reason: ${cancellationReason}`,
        data: {
          acceptedRequestId: selectedCommitment.id,
          requestId: selectedCommitment.requestId,
          bloodType: selectedCommitment.bloodType,
          bloodComponent: selectedCommitment.bloodComponent || 'Whole Blood'
        },
        isRead: false,
        timestamp: ''
      });
      setCancelModalVisible(false);
      setSelectedCommitment(null);
      setCancellationReason('');
      Alert.alert('Cancelled', 'Commitment cancelled and requester notified.');
      await loadData();
    } catch { Alert.alert('Error', 'Failed to cancel commitment.'); }
  };

  const handleCompleteCommitment = (c: AcceptedRequest) => { setSelectedCommitment(c); setCompleteModalVisible(true); };

  const confirmCompleteCommitment = async () => {
    if (!user || !selectedCommitment) return;
    try {
      await markDonationPendingVerification(selectedCommitment.id, donationNotes || undefined);
      await createNotification({
        userId: selectedCommitment.requesterId,
        type: 'verify_donation',
        title: 'Verify Donation',
        message: `${user.firstName} ${user.lastName} has marked the donation as complete. Please verify.`,
        data: { acceptedRequestId: selectedCommitment.id, donorId: user.id, requestId: selectedCommitment.requestId },
        isRead: false, timestamp: ''
      });
      setCompleteModalVisible(false);
      setSelectedCommitment(null);
      setDonationNotes('');
      Alert.alert('Awaiting Verification', 'The requester has been notified to verify your donation.');
      await loadData();
    } catch { Alert.alert('Error', 'Failed to complete donation.'); }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return 'N/A'; }
  };

  const getUrgencyConfig = (u: string) => {
    switch (u) {
      case 'critical': return { color: DANGER, bg: DANGER_PALE, icon: 'warning' };
      case 'urgent': return { color: WARN, bg: WARN_PALE, icon: 'alert-circle' };
      default: return { color: SUCCESS, bg: SUCCESS_PALE, icon: 'information-circle' };
    }
  };

  const getStatusConfig = (s: string) => {
    switch (s) {
      case 'in_progress': return { label: 'IN PROGRESS', color: B_LIGHT, bg: B_PALE };
      case 'pending_verification': return { label: 'AWAITING VERIFY', color: WARN, bg: WARN_PALE };
      default: return { label: 'PENDING', color: WARN, bg: WARN_PALE };
    }
  };

  // List Items 
  const renderCommitmentListItem = ({ item }: { item: AcceptedRequest }) => {
    const statusCfg = getStatusConfig(item.status);
    const urgCfg = getUrgencyConfig(item.urgencyLevel);
    return (
      <TouchableOpacity style={st.card} onPress={() => setViewCommitment(item)} activeOpacity={0.9}>
        <LinearGradient
          colors={item.status === 'in_progress' ? [B_DARK, B_MID] : item.status === 'pending_verification' ? ['#92400E', '#B45309'] : ['#334155', '#475569']}
          style={[st.cardTopBand, { paddingVertical: 12 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={urgCfg.icon as any} size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>{item.hospitalName}</Text>
            </View>
            <View style={[st.statusPill, { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 4, paddingHorizontal: 8 }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{statusCfg.label}</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 11, color: TEXT_SOFT, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>Patient</Text>
            <Text style={{ fontSize: 15, color: TEXT_DARK, fontWeight: '700' }}>{item.patientName}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: TEXT_SOFT, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>Blood & Component</Text>
            <Text style={{ fontSize: 15, color: B_MID, fontWeight: '800' }}>{item.bloodType} - {item.bloodComponent || 'Whole Blood'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={BORDER} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderDonationListItem = ({ item }: { item: DonationRecord }) => (
    <TouchableOpacity style={st.card} onPress={() => setViewDonation(item)} activeOpacity={0.9}>
      <LinearGradient colors={[B_DARK, B_MID]} style={[st.cardTopBand, { paddingVertical: 12 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Ionicons name="calendar" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
              {new Date(item.donationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
            <Ionicons name="star" size={12} color={WARN} />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>+{item.pointsEarned}</Text>
          </View>
        </View>
      </LinearGradient>
      <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: SUCCESS_PALE, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="business" size={18} color={SUCCESS} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: TEXT_DARK, fontWeight: '700' }} numberOfLines={1}>{item.bloodBankName || item.location?.address || 'Location'}</Text>
          <Text style={{ fontSize: 12, color: TEXT_MID }}>{item.unitsCollected || 1} Unit{item.unitsCollected !== 1 ? 's' : ''} · {item.bloodComponent || 'Whole Blood'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={BORDER} />
      </View>
    </TouchableOpacity>
  );

  // Details Renderers 
  const renderCommitmentDetail = (item: AcceptedRequest) => {
    const statusCfg = getStatusConfig(item.status);
    const urgCfg = getUrgencyConfig(item.urgencyLevel);

    return (
      <View style={st.card}>
        {/* Card Header */}
        <LinearGradient
          colors={item.status === 'in_progress' ? [B_DARK, B_MID] : item.status === 'pending_verification' ? ['#92400E', '#B45309'] : ['#334155', '#475569']}
          style={st.cardTopBand}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <View style={st.cardTopRow}>
            <View style={st.bloodTypeBlock}>
              <Ionicons name="water" size={20} color="rgba(255,255,255,0.8)" />
              <View>
                <Text style={st.bloodTypeSmallLabel}>Blood Type & Component</Text>
                <Text style={[st.bloodTypeValue, { fontSize: 18 }]}>{item.bloodType} ({item.bloodComponent || 'Whole Blood'})</Text>
              </View>
            </View>
            <View style={[st.statusPill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <View style={[st.statusDot, { backgroundColor: statusCfg.color }]} />
              <Text style={st.statusPillText}>{statusCfg.label}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Card Body */}
        <View style={st.cardBody}>
          {/* Patient & Hospital Row */}
          <View style={st.infoGrid}>
            <View style={st.infoCell}>
              <View style={[st.infoCellIcon, { backgroundColor: B_PALE }]}>
                <Ionicons name="person" size={15} color={B_LIGHT} />
              </View>
              <View style={st.infoCellText}>
                <Text style={st.infoCellLabel}>Patient</Text>
                <Text style={st.infoCellValue} numberOfLines={1}>{item.patientName}</Text>
              </View>
            </View>
            <View style={st.infoCell}>
              <View style={[st.infoCellIcon, { backgroundColor: SUCCESS_PALE }]}>
                <Ionicons name="business" size={15} color={SUCCESS} />
              </View>
              <View style={st.infoCellText}>
                <Text style={st.infoCellLabel}>Hospital</Text>
                <Text style={st.infoCellValue} numberOfLines={1}>{item.hospitalName}</Text>
              </View>
            </View>
          </View>

          {/* Hospital Address */}
          {item.hospitalAddress && (
            <View style={st.addressRow}>
              <Ionicons name="location" size={14} color={TEXT_SOFT} />
              <Text style={st.addressText} numberOfLines={2}>{item.hospitalAddress}</Text>
            </View>
          )}

          {/* Requester Contact */}
          <View style={st.contactRow}>
            <View style={[st.infoCellIcon, { backgroundColor: PURPLE_PALE }]}>
              <Ionicons name="call" size={14} color={PURPLE} />
            </View>
            <View>
              <Text style={st.infoCellLabel}>Requester Contact</Text>
              <Text style={st.infoCellValue}>{item.requesterName} · {item.requesterPhone}</Text>
            </View>
          </View>

          {/* Stats Pills */}
          <View style={st.statsPillsRow}>
            <View style={st.statPill}>
              <Ionicons name="flask" size={14} color={PURPLE} />
              <Text style={st.statPillLabel}>Units</Text>
              <Text style={[st.statPillValue, { color: PURPLE }]}>{item.unitsNeeded}</Text>
            </View>
            <View style={[st.statPill, { backgroundColor: urgCfg.bg }]}>
              <Ionicons name={urgCfg.icon as any} size={14} color={urgCfg.color} />
              <Text style={st.statPillLabel}>Urgency</Text>
              <Text style={[st.statPillValue, { color: urgCfg.color }]}>
                {item.urgencyLevel.charAt(0).toUpperCase() + item.urgencyLevel.slice(1)}
              </Text>
            </View>
            <View style={st.statPill}>
              <Ionicons name="calendar" size={14} color={B_LIGHT} />
              <Text style={st.statPillLabel}>Accepted</Text>
              <Text style={[st.statPillValue, { color: B_LIGHT }]}>{formatDate(item.acceptedDate)}</Text>
            </View>
          </View>

          {/* Notes */}
          {item.notes && (
            <View style={st.notesBox}>
              <Ionicons name="document-text" size={14} color={B_LIGHT} />
              <Text style={st.notesText}>{item.notes}</Text>
            </View>
          )}

          {/* Verification Notice */}
          {item.status === 'pending_verification' && (
            <View style={st.verifyNotice}>
              <Ionicons name="time-outline" size={16} color={WARN} />
              <Text style={st.verifyNoticeText}>Waiting for requester to verify your donation</Text>
            </View>
          )}
        </View>

        {/* Card Actions */}
        <View style={st.cardActions}>
          <TouchableOpacity style={st.chatBtn} onPress={() => router.push(`/(shared)/chat?chatId=${item.chatId}` as any)}>
            <Ionicons name="chatbubble-ellipses" size={16} color={B_LIGHT} />
            <Text style={st.chatBtnText}>Chat</Text>
          </TouchableOpacity>

          {item.status === 'pending' && (
            <TouchableOpacity style={st.startBtn} onPress={() => handleStartCommitment(item)}>
              <Ionicons name="play-circle" size={16} color={SUCCESS} />
              <Text style={st.startBtnText}>Start</Text>
            </TouchableOpacity>
          )}

          {item.status !== 'pending_verification' && (
            <TouchableOpacity style={st.completeBtn} onPress={() => handleCompleteCommitment(item)}>
              <LinearGradient colors={[SUCCESS, '#059669']} style={st.completeBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={st.completeBtnText}>Complete</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={st.cancelIconBtn} onPress={() => handleCancelCommitment(item)}>
            <Ionicons name="close-circle" size={20} color={DANGER} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Donation History Card
  const renderDonationDetail = (item: DonationRecord) => (
    <View style={st.card}>
      <LinearGradient colors={[B_DARK, B_MID]} style={st.cardTopBand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <View style={st.donationTopRow}>
          <View style={st.bloodTypeBlock}>
            <Ionicons name="water" size={20} color="rgba(255,255,255,0.8)" />
            <View>
              <Text style={st.bloodTypeSmallLabel}>Blood Type & Component</Text>
              <Text style={[st.bloodTypeValue, { fontSize: 18 }]}>{item.bloodType} ({item.bloodComponent || 'Whole Blood'})</Text>
            </View>
          </View>
          <View style={st.pointsBadge}>
            <Ionicons name="star" size={14} color={WARN} />
            <Text style={st.pointsBadgeText}>+{item.pointsEarned} pts</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={st.cardBody}>
        {/* Date Row */}
        <View style={st.donationDateRow}>
          <View style={[st.infoCellIcon, { backgroundColor: B_PALE }]}>
            <Ionicons name="calendar" size={15} color={B_LIGHT} />
          </View>
          <View>
            <Text style={st.donationDateMain}>
              {new Date(item.donationDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
            <Text style={st.donationDateTime}>
              {new Date(item.donationDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* Location */}
        <View style={st.contactRow}>
          <View style={[st.infoCellIcon, { backgroundColor: SUCCESS_PALE }]}>
            <Ionicons name="business" size={14} color={SUCCESS} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.infoCellLabel}>Location</Text>
            <Text style={st.infoCellValue} numberOfLines={2}>
              {item.bloodBankName || item.location?.address || 'Not specified'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={st.statsPillsRow}>
          <View style={st.statPill}>
            <Ionicons name="flask" size={14} color={PURPLE} />
            <Text style={st.statPillLabel}>Units</Text>
            <Text style={[st.statPillValue, { color: PURPLE }]}>{item.unitsCollected || 1}</Text>
          </View>
          <View style={[st.statPill, { backgroundColor: WARN_PALE }]}>
            <Ionicons name="star" size={14} color={WARN} />
            <Text style={st.statPillLabel}>Points Earned</Text>
            <Text style={[st.statPillValue, { color: WARN }]}>{item.pointsEarned}</Text>
          </View>
        </View>

        {item.notes && (
          <View style={st.notesBox}>
            <Ionicons name="document-text" size={14} color={B_LIGHT} />
            <Text style={st.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>

      {item.certificateUrl && (
        <TouchableOpacity style={st.certBtn}>
          <LinearGradient colors={[B_DARK, B_MID]} style={st.certBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="ribbon" size={16} color="#FFFFFF" />
            <Text style={st.certBtnText}>Download Certificate</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmptyCommitments = () => (
    <View style={st.emptyWrap}>
      <View style={st.emptyIconWrap}>
        <LinearGradient colors={[B_PALE, '#C7D2FE']} style={st.emptyIconGrad}>
          <Ionicons name="heart-outline" size={48} color={B_MID} />
        </LinearGradient>
      </View>
      <Text style={st.emptyTitle}>No Active Commitments</Text>
      <Text style={st.emptyText}>You haven't accepted any blood requests yet.</Text>
      <TouchableOpacity style={st.emptyActionBtn} onPress={() => router.push('/(donor)/requests' as any)}>
        <LinearGradient colors={[B_DARK, B_MID]} style={st.emptyActionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="search" size={18} color="#FFFFFF" />
          <Text style={st.emptyActionText}>Find Blood Requests</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyHistory = () => (
    <View style={st.emptyWrap}>
      <View style={st.emptyIconWrap}>
        <LinearGradient colors={[B_PALE, '#C7D2FE']} style={st.emptyIconGrad}>
          <Ionicons name="time-outline" size={48} color={B_MID} />
        </LinearGradient>
      </View>
      <Text style={st.emptyTitle}>No Donation History</Text>
      <Text style={st.emptyText}>Complete your active commitments to build your donation history.</Text>
    </View>
  );

  const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },

    // Header
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    backBtn: {
      width: 38, height: 38, borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center', alignItems: 'center',
    },
    headerTitleWrap: { alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },

    // Stats
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    statValue: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

    // Tabs
    tabBar: {
      flexDirection: 'row',
      backgroundColor: SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      paddingHorizontal: 8,
    },
    tab: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 14,
      borderBottomWidth: 2.5, borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: B_MID },
    tabText: { fontSize: 14, fontWeight: '700', color: TEXT_SOFT },
    tabTextActive: { color: B_MID },
    tabBadge: {
      backgroundColor: BORDER, borderRadius: 10,
      paddingHorizontal: 7, paddingVertical: 2,
    },
    tabBadgeActive: { backgroundColor: B_PALE },
    tabBadgeText: { fontSize: 11, fontWeight: '700', color: TEXT_SOFT },
    tabBadgeTextActive: { color: B_MID },

    // Filters
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16, paddingVertical: 10,
      gap: 8, backgroundColor: SURFACE,
      borderBottomWidth: 1, borderBottomColor: BORDER,
    },
    filterBtn: {
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 20, backgroundColor: BG,
      borderWidth: 1, borderColor: BORDER,
    },
    filterBtnActive: { backgroundColor: B_MID, borderColor: B_MID },
    filterBtnText: { fontSize: 13, fontWeight: '600', color: TEXT_MID },
    filterBtnTextActive: { color: '#FFFFFF' },

    // Loading
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 15, color: TEXT_MID },

    // List
    listContent: { padding: 16, paddingBottom: 40 },

    // Card
    card: {
      backgroundColor: SURFACE,
      borderRadius: 18,
      marginBottom: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: BORDER,
      ...shadow('#000', 0.08, 12, 4),
    },
    cardTopBand: { paddingHorizontal: 16, paddingVertical: 14 },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    donationTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bloodTypeBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bloodTypeSmallLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    bloodTypeValue: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginTop: 1 },
    statusPill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusPillText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
    pointsBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    },
    pointsBadgeText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

    // Card Body
    cardBody: { padding: 16, gap: 10 },

    // Info Grid
    infoGrid: { flexDirection: 'row', gap: 10 },
    infoCell: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    infoCellIcon: {
      width: 30, height: 30, borderRadius: 9,
      justifyContent: 'center', alignItems: 'center',
      flexShrink: 0,
    },
    infoCellText: { flex: 1 },
    infoCellLabel: { fontSize: 10, color: TEXT_SOFT, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
    infoCellValue: { fontSize: 13, color: TEXT_DARK, fontWeight: '700' },

    // Address
    addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingLeft: 2 },
    addressText: { flex: 1, fontSize: 12, color: TEXT_MID, lineHeight: 17 },

    // Contact Row
    contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },

    // Stats Pills
    statsPillsRow: { flexDirection: 'row', gap: 8 },
    statPill: {
      flex: 1, flexDirection: 'column', alignItems: 'center', gap: 3,
      backgroundColor: BG, borderRadius: 12,
      paddingVertical: 10, paddingHorizontal: 8,
      borderWidth: 1, borderColor: BORDER,
    },
    statPillLabel: { fontSize: 10, color: TEXT_SOFT, fontWeight: '600', textTransform: 'uppercase' },
    statPillValue: { fontSize: 14, fontWeight: '800' },

    // Notes Box
    notesBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      padding: 12, backgroundColor: SUCCESS_PALE, borderRadius: 10,
      borderLeftWidth: 3, borderLeftColor: SUCCESS,
    },
    notesText: { flex: 1, fontSize: 13, color: TEXT_DARK, lineHeight: 18 },

    // Verification Notice
    verifyNotice: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      padding: 11, backgroundColor: WARN_PALE, borderRadius: 10,
      borderWidth: 1, borderColor: '#FDE68A',
    },
    verifyNoticeText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600' },

    // Card Actions
    cardActions: {
      flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10,
      borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: BG,
    },
    chatBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 5, backgroundColor: B_PALE, paddingVertical: 9, borderRadius: 10,
      borderWidth: 1, borderColor: '#BFDBFE',
    },
    chatBtnText: { fontSize: 13, fontWeight: '700', color: B_MID },
    startBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 5, backgroundColor: SUCCESS_PALE, paddingVertical: 9, borderRadius: 10,
      borderWidth: 1, borderColor: '#A7F3D0',
    },
    startBtnText: { fontSize: 13, fontWeight: '700', color: SUCCESS },
    completeBtn: { flex: 1.5, borderRadius: 10, overflow: 'hidden' },
    completeBtnGrad: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 5, paddingVertical: 10,
    },
    completeBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
    cancelIconBtn: {
      width: 40, alignItems: 'center', justifyContent: 'center',
      backgroundColor: DANGER_PALE, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA',
    },

    // Donation Date
    donationDateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    donationDateMain: { fontSize: 15, fontWeight: '800', color: TEXT_DARK },
    donationDateTime: { fontSize: 12, color: TEXT_SOFT, marginTop: 2 },

    // Certificate
    certBtn: { overflow: 'hidden' },
    certBtnGrad: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 13,
    },
    certBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

    // Empty State
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
    emptyIconWrap: { marginBottom: 20, ...shadow(B_MID, 0.15, 20, 6) },
    emptyIconGrad: {
      width: 110, height: 110, borderRadius: 55,
      justifyContent: 'center', alignItems: 'center',
    },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: TEXT_DARK, marginBottom: 8, textAlign: 'center' },
    emptyText: { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    emptyActionBtn: { borderRadius: 14, overflow: 'hidden', ...shadow(B_MID, 0.25, 10, 4) },
    emptyActionGrad: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 14, paddingHorizontal: 28,
    },
    emptyActionText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
    modalSheet: {
      backgroundColor: SURFACE,
      borderRadius: 26,
      padding: 24,
      paddingBottom: 30,
      ...shadow('#000', 0.2, 30, 10),
    },
    modalHandle: { display: 'none' },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    modalTitleIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    modalTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: TEXT_DARK },
    modalCloseBtn: {
      width: 32, height: 32, borderRadius: 10,
      backgroundColor: BG, justifyContent: 'center', alignItems: 'center',
    },
    modalDesc: { fontSize: 14, color: TEXT_MID, lineHeight: 20, marginBottom: 18 },
    modalInputLabel: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
    modalInput: {
      borderWidth: 1.5, borderColor: BORDER, borderRadius: 12,
      padding: 12, fontSize: 14, color: TEXT_DARK,
      backgroundColor: BG, minHeight: 100, marginBottom: 20,
    },
    modalBtnsRow: { flexDirection: 'row', gap: 10 },
    modalKeepBtn: {
      flex: 1, paddingVertical: 14, borderRadius: 14,
      backgroundColor: BG, alignItems: 'center',
      borderWidth: 1, borderColor: BORDER,
    },
    modalKeepText: { fontSize: 14, fontWeight: '700', color: TEXT_MID },
    modalConfirmCancelBtn: {
      flex: 1, paddingVertical: 14, borderRadius: 14,
      backgroundColor: DANGER, alignItems: 'center',
    },
    modalConfirmCancelText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
    modalCompleteBtn: { flex: 1.5, borderRadius: 14, overflow: 'hidden' },
    modalCompleteBtnGrad: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 14,
    },
    modalCompleteText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  });

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={B_DARK} />

      {/* Header */}
      <LinearGradient colors={[B_DARK, B_MID]} style={st.header}>
        <View style={st.headerTop}>
          <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={st.headerTitleWrap}>
            <Text style={st.headerTitle}>My Donations</Text>
            <Text style={st.headerSub}>Track your impact</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Stats Summary */}
        {donations.length > 0 && (
          <View style={st.statsRow}>
            {[
              { icon: 'water', value: filteredDonations.length, label: 'Donations', color: B_SOFT },
              { icon: 'flask', value: totalUnits, label: 'Units', color: '#A78BFA' },
              { icon: 'star', value: totalPoints, label: 'Points', color: WARN },
            ].map((s, i) => (
              <View key={i} style={st.statCard}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
                <Text style={st.statValue}>{s.value}</Text>
                <Text style={st.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Tabs */}
      <View style={st.tabBar}>
        {[
          { key: 'active', label: 'Active', icon: 'time', count: acceptedRequests.length },
          { key: 'history', label: 'History', icon: 'checkmark-done-circle', count: donations.length },
        ].map((tab) => {
          const isActive = activeTab === tab.key as TabType;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[st.tab, isActive && st.tabActive]}
              onPress={() => setActiveTab(tab.key as TabType)}
            >
              <Ionicons name={tab.icon as any} size={18} color={isActive ? B_MID : TEXT_SOFT} />
              <Text style={[st.tabText, isActive && st.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[st.tabBadge, isActive && st.tabBadgeActive]}>
                  <Text style={[st.tabBadgeText, isActive && st.tabBadgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filter Buttons (history tab) */}
      {activeTab === 'history' && donations.length > 0 && (
        <View style={st.filterRow}>
          {(['all', 'thisYear', 'lastYear'] as const).map((f) => {
            const labels = { all: 'All Time', thisYear: 'This Year', lastYear: 'Last Year' };
            const isActive = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[st.filterBtn, isActive && st.filterBtnActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[st.filterBtnText, isActive && st.filterBtnTextActive]}>
                  {labels[f]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={B_MID} />
          <Text style={st.loadingText}>Loading your donations...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'active' ? (
            <FlatList
              data={acceptedRequests}
              renderItem={renderCommitmentListItem}
              keyExtractor={(i) => i.id}
              contentContainerStyle={st.listContent}
              ListEmptyComponent={renderEmptyCommitments}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[B_MID]} tintColor={B_MID} />}
            />
          ) : (
            <FlatList
              data={filteredDonations}
              renderItem={renderDonationListItem}
              keyExtractor={(i) => i.id}
              contentContainerStyle={st.listContent}
              ListEmptyComponent={renderEmptyHistory}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[B_MID]} tintColor={B_MID} />}
            />
          )}
        </>
      )}

      {/* Commitment Detail Modal */}
      <Modal visible={!!viewCommitment} transparent animationType="fade" onRequestClose={() => setViewCommitment(null)}>
        <View style={st.modalOverlay}>
          <View style={[st.modalSheet, { maxHeight: '85%' }]}>
            <View style={st.modalHandle} />
            <View style={[st.modalHeaderRow, { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: BORDER }]}>
              <Text style={st.modalTitle}>Commitment Details</Text>
              <TouchableOpacity onPress={() => setViewCommitment(null)} style={st.modalCloseBtn}>
                <Ionicons name="close" size={22} color={TEXT_SOFT} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              {viewCommitment && renderCommitmentDetail(viewCommitment)}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Donation Detail Modal */}
      <Modal visible={!!viewDonation} transparent animationType="fade" onRequestClose={() => setViewDonation(null)}>
        <View style={st.modalOverlay}>
          <View style={[st.modalSheet, { maxHeight: '85%' }]}>
            <View style={st.modalHandle} />
            <View style={[st.modalHeaderRow, { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: BORDER }]}>
              <Text style={st.modalTitle}>Donation History</Text>
              <TouchableOpacity onPress={() => setViewDonation(null)} style={st.modalCloseBtn}>
                <Ionicons name="close" size={22} color={TEXT_SOFT} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              {viewDonation && renderDonationDetail(viewDonation)}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Cancel Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="fade" onRequestClose={() => setCancelModalVisible(false)}>
        <View style={st.modalOverlay}>
          <View style={st.modalSheet}>
            <View style={st.modalHandle} />
            <View style={st.modalHeaderRow}>
              <View style={[st.modalTitleIcon, { backgroundColor: DANGER_PALE }]}>
                <Ionicons name="close-circle" size={20} color={DANGER} />
              </View>
              <Text style={st.modalTitle}>Cancel Commitment</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)} style={st.modalCloseBtn}>
                <Ionicons name="close" size={22} color={TEXT_SOFT} />
              </TouchableOpacity>
            </View>
            <Text style={st.modalDesc}>The requester will be notified of your cancellation.</Text>
            <Text style={st.modalInputLabel}>Reason for Cancellation *</Text>
            <TextInput
              style={st.modalInput}
              placeholder="Please provide a reason..."
              placeholderTextColor={TEXT_SOFT}
              value={cancellationReason}
              onChangeText={setCancellationReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={st.modalBtnsRow}>
              <TouchableOpacity style={st.modalKeepBtn} onPress={() => { setCancelModalVisible(false); setCancellationReason(''); }}>
                <Text style={st.modalKeepText}>Keep Commitment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalConfirmCancelBtn} onPress={confirmCancelCommitment}>
                <Text style={st.modalConfirmCancelText}>Cancel It</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Modal */}
      <Modal visible={completeModalVisible} transparent animationType="fade" onRequestClose={() => setCompleteModalVisible(false)}>
        <View style={st.modalOverlay}>
          <View style={st.modalSheet}>
            <View style={st.modalHandle} />
            <View style={st.modalHeaderRow}>
              <View style={[st.modalTitleIcon, { backgroundColor: SUCCESS_PALE }]}>
                <Ionicons name="checkmark-circle" size={20} color={SUCCESS} />
              </View>
              <Text style={st.modalTitle}>Complete Donation</Text>
              <TouchableOpacity onPress={() => setCompleteModalVisible(false)} style={st.modalCloseBtn}>
                <Ionicons name="close" size={22} color={TEXT_SOFT} />
              </TouchableOpacity>
            </View>
            <Text style={st.modalDesc}>Congratulations! Add any notes about how the donation went.</Text>
            <Text style={st.modalInputLabel}>Notes (Optional)</Text>
            <TextInput
              style={st.modalInput}
              placeholder="How did it go? Any notes to add..."
              placeholderTextColor={TEXT_SOFT}
              value={donationNotes}
              onChangeText={setDonationNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={st.modalBtnsRow}>
              <TouchableOpacity style={st.modalKeepBtn} onPress={() => { setCompleteModalVisible(false); setDonationNotes(''); }}>
                <Text style={st.modalKeepText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalCompleteBtn} onPress={confirmCompleteCommitment}>
                <LinearGradient colors={[SUCCESS, '#059669']} style={st.modalCompleteBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={st.modalCompleteText}>Mark Complete</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default DonationHistoryScreen;