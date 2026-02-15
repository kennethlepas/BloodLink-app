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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabType = 'active' | 'history';

// ─── Brand Colors ─────────────────────────────────────────────────────────
const B_DARK   = '#1D4ED8';
const B_MID    = '#2563EB';
const B_LIGHT  = '#3B82F6';
const B_SOFT   = '#60A5FA';
const B_PALE   = '#DBEAFE';
const B_BG     = '#EFF6FF';
const SUCCESS  = '#10B981';
const SUCCESS_PALE = '#D1FAE5';
const SUCCESS_DARK = '#047857';
const WARN     = '#F59E0B';
const WARN_PALE = '#FEF3C7';
const DANGER   = '#EF4444';
const DANGER_PALE = '#FEE2E2';
const PURPLE   = '#8B5CF6';
const PURPLE_PALE = '#EDE9FE';
const TEXT_DARK = '#0F172A';
const TEXT_MID  = '#475569';
const TEXT_SOFT = '#94A3B8';
const BORDER   = '#E2E8F0';
const SURFACE  = '#FFFFFF';
const BG_LIGHT = '#F8FAFC';

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
        data: { acceptedRequestId: selectedCommitment.id, requestId: selectedCommitment.requestId },
        isRead: false, timestamp: ''
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
      case 'urgent':   return { color: WARN, bg: WARN_PALE, icon: 'alert-circle' };
      default:         return { color: SUCCESS, bg: SUCCESS_PALE, icon: 'information-circle' };
    }
  };

  const getStatusConfig = (s: string) => {
    switch (s) {
      case 'in_progress':          return { label: 'IN PROGRESS', color: B_LIGHT, bg: B_PALE };
      case 'pending_verification': return { label: 'AWAITING VERIFY', color: WARN, bg: WARN_PALE };
      default:                     return { label: 'PENDING', color: WARN, bg: WARN_PALE };
    }
  };

  // ─── Commitment Card ───────────────────────────────────────────────────
  const renderCommitmentItem = ({ item }: { item: AcceptedRequest }) => {
    const statusCfg = getStatusConfig(item.status);
    const urgCfg = getUrgencyConfig(item.urgencyLevel);

    return (
      <View style={styles.card}>
        {/* Card Header */}
        <LinearGradient
          colors={item.status === 'in_progress' ? [B_DARK, B_MID] : item.status === 'pending_verification' ? ['#92400E', '#B45309'] : ['#334155', '#475569']}
          style={styles.cardTopBand}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <View style={styles.cardTopRow}>
            <View style={styles.bloodTypeBlock}>
              <Ionicons name="water" size={20} color="rgba(255,255,255,0.8)" />
              <View>
                <Text style={styles.bloodTypeSmallLabel}>Blood Type</Text>
                <Text style={styles.bloodTypeValue}>{item.bloodType}</Text>
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
              <Text style={styles.statusPillText}>{statusCfg.label}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Card Body */}
        <View style={styles.cardBody}>
          {/* Patient & Hospital Row */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <View style={[styles.infoCellIcon, { backgroundColor: B_PALE }]}>
                <Ionicons name="person" size={15} color={B_LIGHT} />
              </View>
              <View style={styles.infoCellText}>
                <Text style={styles.infoCellLabel}>Patient</Text>
                <Text style={styles.infoCellValue} numberOfLines={1}>{item.patientName}</Text>
              </View>
            </View>
            <View style={styles.infoCell}>
              <View style={[styles.infoCellIcon, { backgroundColor: SUCCESS_PALE }]}>
                <Ionicons name="business" size={15} color={SUCCESS} />
              </View>
              <View style={styles.infoCellText}>
                <Text style={styles.infoCellLabel}>Hospital</Text>
                <Text style={styles.infoCellValue} numberOfLines={1}>{item.hospitalName}</Text>
              </View>
            </View>
          </View>

          {/* Hospital Address */}
          {item.hospitalAddress && (
            <View style={styles.addressRow}>
              <Ionicons name="location" size={14} color={TEXT_SOFT} />
              <Text style={styles.addressText} numberOfLines={2}>{item.hospitalAddress}</Text>
            </View>
          )}

          {/* Requester Contact */}
          <View style={styles.contactRow}>
            <View style={[styles.infoCellIcon, { backgroundColor: PURPLE_PALE }]}>
              <Ionicons name="call" size={14} color={PURPLE} />
            </View>
            <View>
              <Text style={styles.infoCellLabel}>Requester Contact</Text>
              <Text style={styles.infoCellValue}>{item.requesterName} · {item.requesterPhone}</Text>
            </View>
          </View>

          {/* Stats Pills */}
          <View style={styles.statsPillsRow}>
            <View style={styles.statPill}>
              <Ionicons name="flask" size={14} color={PURPLE} />
              <Text style={styles.statPillLabel}>Units</Text>
              <Text style={[styles.statPillValue, { color: PURPLE }]}>{item.unitsNeeded}</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: urgCfg.bg }]}>
              <Ionicons name={urgCfg.icon as any} size={14} color={urgCfg.color} />
              <Text style={styles.statPillLabel}>Urgency</Text>
              <Text style={[styles.statPillValue, { color: urgCfg.color }]}>
                {item.urgencyLevel.charAt(0).toUpperCase() + item.urgencyLevel.slice(1)}
              </Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="calendar" size={14} color={B_LIGHT} />
              <Text style={styles.statPillLabel}>Accepted</Text>
              <Text style={[styles.statPillValue, { color: B_LIGHT }]}>{formatDate(item.acceptedDate)}</Text>
            </View>
          </View>

          {/* Notes */}
          {item.notes && (
            <View style={styles.notesBox}>
              <Ionicons name="document-text" size={14} color={B_LIGHT} />
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}

          {/* Verification Notice */}
          {item.status === 'pending_verification' && (
            <View style={styles.verifyNotice}>
              <Ionicons name="time-outline" size={16} color={WARN} />
              <Text style={styles.verifyNoticeText}>Waiting for requester to verify your donation</Text>
            </View>
          )}
        </View>

        {/* Card Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.chatBtn} onPress={() => router.push(`/(shared)/chat?chatId=${item.chatId}` as any)}>
            <Ionicons name="chatbubble-ellipses" size={16} color={B_LIGHT} />
            <Text style={styles.chatBtnText}>Chat</Text>
          </TouchableOpacity>

          {item.status === 'pending' && (
            <TouchableOpacity style={styles.startBtn} onPress={() => handleStartCommitment(item)}>
              <Ionicons name="play-circle" size={16} color={SUCCESS} />
              <Text style={styles.startBtnText}>Start</Text>
            </TouchableOpacity>
          )}

          {item.status !== 'pending_verification' && (
            <TouchableOpacity style={styles.completeBtn} onPress={() => handleCompleteCommitment(item)}>
              <LinearGradient colors={[SUCCESS, '#059669']} style={styles.completeBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.completeBtnText}>Complete</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelIconBtn} onPress={() => handleCancelCommitment(item)}>
            <Ionicons name="close-circle" size={20} color={DANGER} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Donation History Card ─────────────────────────────────────────────
  const renderDonationItem = ({ item }: { item: DonationRecord }) => (
    <View style={styles.card}>
      <LinearGradient colors={[B_DARK, B_MID]} style={styles.cardTopBand} start={{x:0,y:0}} end={{x:1,y:0}}>
        <View style={styles.donationTopRow}>
          <View style={styles.bloodTypeBlock}>
            <Ionicons name="water" size={20} color="rgba(255,255,255,0.8)" />
            <View>
              <Text style={styles.bloodTypeSmallLabel}>Blood Type</Text>
              <Text style={styles.bloodTypeValue}>{item.bloodType}</Text>
            </View>
          </View>
          <View style={styles.pointsBadge}>
            <Ionicons name="star" size={14} color={WARN} />
            <Text style={styles.pointsBadgeText}>+{item.pointsEarned} pts</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.cardBody}>
        {/* Date Row */}
        <View style={styles.donationDateRow}>
          <View style={[styles.infoCellIcon, { backgroundColor: B_PALE }]}>
            <Ionicons name="calendar" size={15} color={B_LIGHT} />
          </View>
          <View>
            <Text style={styles.donationDateMain}>
              {new Date(item.donationDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
            <Text style={styles.donationDateTime}>
              {new Date(item.donationDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.contactRow}>
          <View style={[styles.infoCellIcon, { backgroundColor: SUCCESS_PALE }]}>
            <Ionicons name="business" size={14} color={SUCCESS} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoCellLabel}>Location</Text>
            <Text style={styles.infoCellValue} numberOfLines={2}>
              {item.bloodBankName || item.location?.address || 'Not specified'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsPillsRow}>
          <View style={styles.statPill}>
            <Ionicons name="flask" size={14} color={PURPLE} />
            <Text style={styles.statPillLabel}>Units</Text>
            <Text style={[styles.statPillValue, { color: PURPLE }]}>{item.unitsCollected || 1}</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: WARN_PALE }]}>
            <Ionicons name="star" size={14} color={WARN} />
            <Text style={styles.statPillLabel}>Points Earned</Text>
            <Text style={[styles.statPillValue, { color: WARN }]}>{item.pointsEarned}</Text>
          </View>
        </View>

        {item.notes && (
          <View style={styles.notesBox}>
            <Ionicons name="document-text" size={14} color={B_LIGHT} />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>

      {item.certificateUrl && (
        <TouchableOpacity style={styles.certBtn}>
          <LinearGradient colors={[B_DARK, B_MID]} style={styles.certBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
            <Ionicons name="ribbon" size={16} color="#FFFFFF" />
            <Text style={styles.certBtnText}>Download Certificate</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmptyCommitments = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <LinearGradient colors={[B_PALE, '#C7D2FE']} style={styles.emptyIconGrad}>
          <Ionicons name="heart-outline" size={48} color={B_MID} />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>No Active Commitments</Text>
      <Text style={styles.emptyText}>You haven't accepted any blood requests yet.</Text>
      <TouchableOpacity style={styles.emptyActionBtn} onPress={() => router.push('/(donor)/requests' as any)}>
        <LinearGradient colors={[B_DARK, B_MID]} style={styles.emptyActionGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
          <Ionicons name="search" size={18} color="#FFFFFF" />
          <Text style={styles.emptyActionText}>Find Blood Requests</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyHistory = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <LinearGradient colors={[B_PALE, '#C7D2FE']} style={styles.emptyIconGrad}>
          <Ionicons name="time-outline" size={48} color={B_MID} />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>No Donation History</Text>
      <Text style={styles.emptyText}>Complete your active commitments to build your donation history.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={B_DARK} />

      {/* Header */}
      <LinearGradient colors={[B_DARK, B_MID]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>My Donations</Text>
            <Text style={styles.headerSub}>Track your impact</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Stats Summary */}
        {donations.length > 0 && (
          <View style={styles.statsRow}>
            {[
              { icon: 'water', value: filteredDonations.length, label: 'Donations', color: B_SOFT },
              { icon: 'flask', value: totalUnits, label: 'Units', color: '#A78BFA' },
              { icon: 'star', value: totalPoints, label: 'Points', color: WARN },
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'active', label: 'Active', icon: 'time', count: acceptedRequests.length },
          { key: 'history', label: 'History', icon: 'checkmark-done-circle', count: donations.length },
        ].map((tab) => {
          const isActive = activeTab === tab.key as TabType;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as TabType)}
            >
              <Ionicons name={tab.icon as any} size={18} color={isActive ? B_MID : TEXT_SOFT} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
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
        <View style={styles.filterRow}>
          {(['all', 'thisYear', 'lastYear'] as const).map((f) => {
            const labels = { all: 'All Time', thisYear: 'This Year', lastYear: 'Last Year' };
            const isActive = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, isActive && styles.filterBtnActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterBtnText, isActive && styles.filterBtnTextActive]}>
                  {labels[f]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={B_MID} />
          <Text style={styles.loadingText}>Loading your donations...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'active' ? (
            <FlatList
              data={acceptedRequests}
              renderItem={renderCommitmentItem}
              keyExtractor={(i) => i.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={renderEmptyCommitments}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[B_MID]} tintColor={B_MID} />}
            />
          ) : (
            <FlatList
              data={filteredDonations}
              renderItem={renderDonationItem}
              keyExtractor={(i) => i.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={renderEmptyHistory}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[B_MID]} tintColor={B_MID} />}
            />
          )}
        </>
      )}

      {/* Cancel Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="slide" onRequestClose={() => setCancelModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalTitleIcon, { backgroundColor: DANGER_PALE }]}>
                <Ionicons name="close-circle" size={20} color={DANGER} />
              </View>
              <Text style={styles.modalTitle}>Cancel Commitment</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={TEXT_SOFT} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>The requester will be notified of your cancellation.</Text>
            <Text style={styles.modalInputLabel}>Reason for Cancellation *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Please provide a reason..."
              placeholderTextColor={TEXT_SOFT}
              value={cancellationReason}
              onChangeText={setCancellationReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalBtnsRow}>
              <TouchableOpacity style={styles.modalKeepBtn} onPress={() => { setCancelModalVisible(false); setCancellationReason(''); }}>
                <Text style={styles.modalKeepText}>Keep Commitment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmCancelBtn} onPress={confirmCancelCommitment}>
                <Text style={styles.modalConfirmCancelText}>Cancel It</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Modal */}
      <Modal visible={completeModalVisible} transparent animationType="slide" onRequestClose={() => setCompleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalTitleIcon, { backgroundColor: SUCCESS_PALE }]}>
                <Ionicons name="checkmark-circle" size={20} color={SUCCESS} />
              </View>
              <Text style={styles.modalTitle}>Complete Donation</Text>
              <TouchableOpacity onPress={() => setCompleteModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={TEXT_SOFT} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>Congratulations! Add any notes about how the donation went.</Text>
            <Text style={styles.modalInputLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="How did it go? Any notes to add..."
              placeholderTextColor={TEXT_SOFT}
              value={donationNotes}
              onChangeText={setDonationNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalBtnsRow}>
              <TouchableOpacity style={styles.modalKeepBtn} onPress={() => { setCompleteModalVisible(false); setDonationNotes(''); }}>
                <Text style={styles.modalKeepText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCompleteBtn} onPress={confirmCompleteCommitment}>
                <LinearGradient colors={[SUCCESS, '#059669']} style={styles.modalCompleteBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.modalCompleteText}>Mark Complete</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_LIGHT },

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
    borderRadius: 20, backgroundColor: BG_LIGHT,
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
    backgroundColor: BG_LIGHT, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 8,
    borderWidth: 1, borderColor: BORDER,
  },
  statPillLabel: { fontSize: 10, color: TEXT_SOFT, fontWeight: '600', textTransform: 'uppercase' },
  statPillValue: { fontSize: 14, fontWeight: '800' },

  // Notes Box
  notesBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, backgroundColor: B_BG, borderRadius: 10,
    borderLeftWidth: 3, borderLeftColor: B_MID,
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
    borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: BG_LIGHT,
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 24, paddingBottom: 40,
    ...shadow('#000', 0.2, 30, 10),
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: BORDER, alignSelf: 'center', marginBottom: 20,
  },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  modalTitleIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: TEXT_DARK },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: BG_LIGHT, justifyContent: 'center', alignItems: 'center',
  },
  modalDesc: { fontSize: 14, color: TEXT_MID, lineHeight: 20, marginBottom: 18 },
  modalInputLabel: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
  modalInput: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 12,
    padding: 12, fontSize: 14, color: TEXT_DARK,
    backgroundColor: BG_LIGHT, minHeight: 100, marginBottom: 20,
  },
  modalBtnsRow: { flexDirection: 'row', gap: 10 },
  modalKeepBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: BG_LIGHT, alignItems: 'center',
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

export default DonationHistoryScreen;