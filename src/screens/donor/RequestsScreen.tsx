import { VerificationBanner } from '@/src/components/VerificationBanner';
import { useUser } from '@/src/contexts/UserContext';
import { useCachedData } from '@/src/hooks/useCachedData';
import { useTabBarAnimation } from '@/src/hooks/useTabBarAnimation';
import {
  acceptBloodRequest,
  createAcceptedRequest,
  createChat,
  createNotification,
  createRejectedRequest,
  getActiveBloodRequestsForDonor,
  updateDonorAvailability
} from '@/src/services/firebase/database';
import { getDonorEligibilityStatus } from '@/src/services/firebase/donationEligibilityService';
import { BloodRequest } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Colors 
const TEAL = '#0D9488';
const TEAL_MID = '#14B8A6';
const TEAL_PALE = '#CCFBF1';
const GREEN = '#10B981';
const DANGER = '#EF4444';
const DANGER_PALE = '#FEE2E2';
const BLUE = '#3B82F6';
const BLUE_PALE = '#DBEAFE';
const PURPLE = '#8B5CF6';
const PURPLE_PALE = '#EDE9FE';
const WARN = '#F59E0B';
const WARN_PALE = '#FEF3C7';
const TEXT_DARK = '#0C1A33';
const TEXT_MID = '#4B5563';
const TEXT_SOFT = '#9CA3AF';
const BORDER = '#E8E4DE';
const SURFACE = '#FFFFFF';
const BG = '#F2EFE9';
const HEADER_BG = '#0A2647'; // Darker blue for StatusBar consistency
const HEADER_BLUE = '#1D6FD2'; // Brand blue

const shadow = (c = '#000', o = 0.08, r = 10, e = 3) => ({
  shadowColor: c,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: o,
  shadowRadius: r,
  elevation: e
});

const RequestsScreen: React.FC = () => {
  const router = useRouter();
  const { user, updateUserData } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'urgent' | 'moderate'>('all');
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewRequest, setViewRequest] = useState<BloodRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { onScroll } = useTabBarAnimation();

  // Track loading states for individual requests
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());

  // Check if donor has active commitments (should be unavailable)
  const [hasActiveCommitment, setHasActiveCommitment] = useState(false);

  // Eligibility state
  const [eligibility, setEligibility] = useState<{ isEligible: boolean; message: string }>({ isEligible: true, message: '' });

  // 1. Fetch compatible requests with SWR hook
  const {
    data: allCompatibleRequests,
    loading: loadingRequests,
    refresh: refreshRequests,
    error: requestsError
  } = useCachedData(
    `donor_requests_${user?.id}`,
    async () => {
      if (!user) return [];
      try {
        return await getActiveBloodRequestsForDonor(user.id, user.bloodType);
      } catch (err) {
        console.error('Error fetching requests:', err);
        throw err;
      }
    },
    { enabled: !!user && !hasActiveCommitment }
  );

  // Check if donor has active commitments
  const checkActiveCommitments = useCallback(async () => {
    if (!user) return;
    try {
      const { getDonorAcceptedRequests } = await import('@/src/services/firebase/database');
      const commitments = await getDonorAcceptedRequests(user.id);
      const active = commitments.filter(req =>
        ['pending', 'in_progress', 'pending_verification'].includes(req.status)
      );

      const hasActive = active.length > 0;
      setHasActiveCommitment(hasActive);

      if (hasActive && user.isAvailable) {
        await updateDonorAvailability(user.id, false);
        await updateUserData({ isAvailable: false });
      }

      return hasActive;
    } catch (error) {
      console.error('Error checking active commitments:', error);
      return false;
    }
  }, [user, updateUserData]);

  useEffect(() => {
    checkActiveCommitments();
    if (user) {
      const status = getDonorEligibilityStatus(user.lastDonationDate);
      setEligibility({ isEligible: status.isEligible, message: status.message });
    }
  }, [user?.id, user?.lastDonationDate, checkActiveCommitments]);

  const isBloodTypeCompatible = (donorType: string, recipientType: string): boolean => {
    const compatibility: { [key: string]: string[] } = {
      'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
      'O+': ['O+', 'A+', 'B+', 'AB+'],
      'A-': ['A-', 'A+', 'AB-', 'AB+'],
      'A+': ['A+', 'AB+'],
      'B-': ['B-', 'B+', 'AB-', 'AB+'],
      'B+': ['B+', 'AB+'],
      'AB-': ['AB-', 'AB+'],
      'AB+': ['AB+'],
    };
    return compatibility[donorType]?.includes(recipientType) || false;
  };

  // 2. Memoized filtering
  const requests = useMemo(() => {
    if (!allCompatibleRequests || !user) return [];

    let compatible = allCompatibleRequests.filter(request =>
      isBloodTypeCompatible(user.bloodType, request.bloodType)
    );

    if (filter !== 'all') {
      compatible = compatible.filter(r => r.urgencyLevel === filter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      compatible = compatible.filter(r =>
        r.patientName.toLowerCase().includes(q) ||
        r.hospitalName.toLowerCase().includes(q)
      );
    }

    return compatible;
  }, [allCompatibleRequests, filter, user, searchQuery]);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const hasActive = await checkActiveCommitments();
      if (!hasActive) {
        await refreshRequests();
      }
    } catch (err) {
      console.error('Refresh error:', err);
      Alert.alert('Refresh Failed', 'Could not refresh requests.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshRequests, user, checkActiveCommitments]);

  const startProcessing = (requestId: string) => {
    processingRef.current.add(requestId);
    setProcessingRequests(new Set(processingRef.current));
  };

  const stopProcessing = (requestId: string) => {
    processingRef.current.delete(requestId);
    setProcessingRequests(new Set(processingRef.current));
  };

  const isProcessing = (requestId: string) => processingRequests.has(requestId);

  const handleAcceptRequest = async (request: BloodRequest) => {
    if (!user) return;
    if (isProcessing(request.id)) return;

    const hasActive = await checkActiveCommitments();
    if (hasActive) {
      Alert.alert('Already Committed', 'Please complete your current donation first.');
      return;
    }

    if (user.verificationStatus !== 'approved') {
      Alert.alert('Verification Required', 'Please get verified to accept requests.');
      return;
    }

    Alert.alert(
      'Accept Request',
      `Accept this request from ${request.requesterName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            startProcessing(request.id);
            try {
              const chatId = await createChat(
                user.id,
                `${user.firstName} ${user.lastName}`,
                request.requesterId,
                request.requesterName,
                request.id,
                'donor'
              );
              await createAcceptedRequest(user.id, `${user.firstName} ${user.lastName}`, request, chatId);
              await acceptBloodRequest(request.id, user.id, `${user.firstName} ${user.lastName}`);
              await updateDonorAvailability(user.id, false);
              await updateUserData({ isAvailable: false });
              setHasActiveCommitment(true);

              await createNotification({
                userId: request.requesterId,
                type: 'request_accepted',
                title: 'Blood Request Accepted',
                message: `${user.firstName} ${user.lastName} has accepted your request.`,
                data: { requestId: request.id, donorId: user.id, chatId },
                isRead: false,
                timestamp: new Date().toISOString()
              });

              await refreshRequests();
              Alert.alert('Success!', 'Request accepted.', [
                { text: 'Go to Chat', onPress: () => router.push(`/(shared)/chat?chatId=${chatId}` as any) },
                { text: 'OK' }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to accept request.');
            } finally {
              stopProcessing(request.id);
            }
          }
        }
      ]
    );
  };

  const handleRejectRequest = (request: BloodRequest) => {
    setSelectedRequest(request);
    setRejectionModalVisible(true);
  };

  const confirmRejectRequest = async () => {
    if (!user || !selectedRequest) return;
    if (isProcessing(selectedRequest.id)) return;

    startProcessing(selectedRequest.id);
    try {
      await createRejectedRequest(user.id, selectedRequest.id, rejectionReason.trim() || undefined);
      await refreshRequests();
      setRejectionModalVisible(false);
      setSelectedRequest(null);
      setRejectionReason('');
    } catch (error) {
      Alert.alert('Error', 'Failed to decline request.');
    } finally {
      stopProcessing(selectedRequest.id);
    }
  };

  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case 'critical': return { color: DANGER, bg: DANGER_PALE, icon: 'warning', label: 'CRITICAL' };
      case 'urgent': return { color: WARN, bg: WARN_PALE, icon: 'alert-circle', label: 'URGENT' };
      default: return { color: BLUE, bg: BLUE_PALE, icon: 'information-circle', label: 'MODERATE' };
    }
  };

  const renderActiveCommitmentWarning = () => (
    <View style={st.warningContainer}>
      <LinearGradient colors={['#FEF3C7', '#FFFBEB']} style={st.warningCard}>
        <View style={st.warningContent}>
          <Ionicons name="alert-circle" size={24} color={WARN} />
          <View style={st.warningTextContainer}>
            <Text style={st.warningTitle}>Active Commitment</Text>
            <Text style={st.warningMessage}>Complete your current donation first.</Text>
            <TouchableOpacity style={st.warningButton} onPress={() => router.push('/(donor)/donation-history' as any)}>
              <LinearGradient colors={[WARN, '#EA580C']} style={st.warningButtonGrad}>
                <Text style={st.warningButtonText}>View Commitments</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderUnavailabilityWarning = () => (
    <View style={st.warningContainer}>
      <LinearGradient colors={['#FEF3C7', '#FFFBEB']} style={st.warningCard}>
        <View style={st.warningContent}>
          <Ionicons name="moon" size={24} color={WARN} />
          <View style={st.warningTextContainer}>
            <Text style={st.warningTitle}>Status: Offline</Text>
            <Text style={st.warningMessage}>Mark yourself as available in your profile to see requests.</Text>
            <TouchableOpacity style={st.warningButton} onPress={() => router.push('/(donor)/profile' as any)}>
              <LinearGradient colors={[WARN, '#EA580C']} style={st.warningButtonGrad}>
                <Text style={st.warningButtonText}>Go to Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderIneligibilityWarning = () => (
    <View style={st.warningContainer}>
      <LinearGradient colors={[DANGER_PALE, '#FEE2E2']} style={st.warningCard}>
        <View style={st.warningContent}>
          <Ionicons name="time" size={24} color={DANGER} />
          <View style={st.warningTextContainer}>
            <Text style={[st.warningTitle, { color: DANGER }]}>Not Eligible</Text>
            <Text style={[st.warningMessage, { color: '#991B1B' }]}>{eligibility.message}</Text>
            <TouchableOpacity style={st.warningButton} onPress={() => router.push('/(shared)/guide' as any)}>
              <LinearGradient colors={[DANGER, '#B91C1C']} style={st.warningButtonGrad}>
                <Text style={st.warningButtonText}>Health Guide</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderRequestListItem = ({ item }: { item: BloodRequest }) => {
    const urgencyCfg = getUrgencyConfig(item.urgencyLevel || 'moderate');
    return (
      <TouchableOpacity style={st.card} onPress={() => setViewRequest(item)}>
        <LinearGradient colors={[TEAL, TEAL_MID]} style={st.cardBand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <View style={st.cardBandRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={urgencyCfg.icon as any} size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{item.hospitalName}</Text>
            </View>
            <View style={[st.urgencyPill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={st.urgencyPillText}>{urgencyCfg.label}</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={st.infoCellLabel}>Patient</Text>
            <Text style={{ fontSize: 15, color: TEXT_DARK, fontWeight: '700' }}>{item.patientName}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.infoCellLabel}>Blood Type</Text>
            <Text style={{ fontSize: 15, color: TEAL, fontWeight: '800' }}>{item.bloodType}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={BORDER} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequestDetail = ({ item }: { item: BloodRequest }) => {
    const urgencyCfg = getUrgencyConfig(item.urgencyLevel || 'moderate');
    const processing = isProcessing(item.id);
    return (
      <View style={{ backgroundColor: SURFACE, borderRadius: 20, overflow: 'hidden' }}>
        <LinearGradient colors={[TEAL, TEAL_MID]} style={st.cardBand}>
          <View style={st.cardBandRow}>
            <View style={st.bloodTypeBlock}>
              <Ionicons name="water" size={20} color="#FFFFFF" />
              <Text style={st.bloodTypeValue}>{item.bloodType}</Text>
            </View>
            <View style={[st.urgencyPill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={st.urgencyPillText}>{urgencyCfg.label}</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={st.cardBody}>
          <View style={st.infoGrid}>
            <View style={st.infoCell}>
              <Text style={st.infoCellLabel}>Requester</Text>
              <Text style={st.infoCellValue}>{item.requesterName}</Text>
            </View>
            <View style={st.infoCell}>
              <Text style={st.infoCellLabel}>Patient</Text>
              <Text style={st.infoCellValue}>{item.patientName}</Text>
            </View>
          </View>
          <View style={{ marginTop: 10 }}>
            <Text style={st.infoCellLabel}>Hospital</Text>
            <Text style={st.infoCellValue}>{item.hospitalName}</Text>
          </View>
          <View style={st.chipRow}>
            <View style={st.chip}>
              <Text style={st.chipLabel}>Units</Text>
              <Text style={st.chipValue}>{item.unitsNeeded}</Text>
            </View>
            <View style={st.chip}>
              <Text style={st.chipLabel}>Posted</Text>
              <Text style={st.chipValue}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}</Text>
            </View>
          </View>
        </View>
        <View style={st.cardActions}>
          <TouchableOpacity style={st.actionBtnRed} onPress={() => handleRejectRequest(item)}>
            <Text style={[st.actionBtnText, { color: DANGER }]}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.actionBtnFilled} onPress={() => handleAcceptRequest(item)}>
            <LinearGradient colors={[GREEN, '#059669']} style={st.actionBtnFilledGrad}>
              {processing ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={st.actionBtnFilledText}>Accept</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const isLoading = loadingRequests || refreshing;

  if (hasActiveCommitment || !user?.isAvailable || !eligibility.isEligible) {
    let warningRender = renderActiveCommitmentWarning;
    if (!user?.isAvailable) warningRender = renderUnavailabilityWarning;
    else if (!eligibility.isEligible) warningRender = renderIneligibilityWarning;

    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle="dark-content" backgroundColor={TEAL} />
        <LinearGradient colors={[TEAL, TEAL_MID]} style={st.header}>
          <Text style={st.headerTitle}>Blood Requests</Text>
        </LinearGradient>
        {warningRender()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_BG} />
      <LinearGradient colors={[HEADER_BLUE, '#1A5BB0']} style={st.header}>
        <View style={st.headerTop}>
          <Text style={st.headerTitle}>Blood Requests</Text>
          <Text style={st.headerSub}>{requests.length} compatible requests</Text>
        </View>
      </LinearGradient>

      {user?.verificationStatus !== 'approved' && (
        <VerificationBanner status={user?.verificationStatus || 'pending'} userType="donor" />
      )}

      <View style={st.searchBarBox}>
        <Ionicons name="search" size={16} color={TEXT_SOFT} />
        <TextInput
          placeholder="Search by patient or hospital..."
          style={st.searchBarInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={TEXT_SOFT}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={TEXT_SOFT} />
          </TouchableOpacity>
        )}
      </View>

      <View style={st.filterBar}>
        {['all', 'critical', 'urgent', 'moderate'].map((id) => (
          <TouchableOpacity
            key={id}
            style={[st.filterTab, filter === id && st.filterTabActive]}
            onPress={() => setFilter(id as any)}
          >
            <Text style={[st.filterTabText, filter === id && st.filterTabTextActive]}>{id.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && requests.length === 0 ? (
        <View style={st.loadingWrap}><ActivityIndicator size="large" color={TEAL} /></View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestListItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={st.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} />}
          ListEmptyComponent={<View style={st.emptyWrap}><Text>No requests found</Text></View>}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
      )}

      {/* Rejection Modal */}
      <Modal visible={rejectionModalVisible} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={st.modalSheet}>
            <Text style={st.modalReasonLabel}>Reason for declining:</Text>
            <TextInput style={st.input} value={rejectionReason} onChangeText={setRejectionReason} multiline />
            <View style={st.modalActions}>
              <TouchableOpacity style={st.modalCancelBtn} onPress={() => setRejectionModalVisible(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalSubmitBtn} onPress={confirmRejectRequest}>
                <LinearGradient colors={[DANGER, '#C2410C']} style={st.modalSubmitGrad}>
                  <Text style={st.modalSubmitText}>Decline</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!viewRequest} transparent animationType="slide">
        <TouchableOpacity style={st.modalOverlay} activeOpacity={1} onPress={() => setViewRequest(null)}>
          <View style={st.modalSheet}>
            {viewRequest && renderRequestDetail({ item: viewRequest })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { padding: 16 },
  headerTop: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: '#FFF', opacity: 0.8 },
  filterBar: { flexDirection: 'row', backgroundColor: SURFACE, padding: 8, gap: 4 },
  filterTab: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  filterTabActive: { backgroundColor: TEAL_PALE, borderColor: TEAL },
  filterTabText: { fontSize: 10, fontWeight: '700', color: TEXT_SOFT },
  filterTabTextActive: { color: TEAL },
  searchBarBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE, margin: 12, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: BORDER },
  searchBarInput: { flex: 1, marginLeft: 8, fontSize: 14, color: TEXT_DARK },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  warningContainer: { padding: 16 },
  warningCard: { padding: 16, borderRadius: 12, ...shadow() },
  warningContent: { flexDirection: 'row', gap: 12 },
  warningTextContainer: { flex: 1 },
  warningTitle: { fontWeight: '800', fontSize: 14 },
  warningMessage: { fontSize: 12, color: TEXT_MID, marginTop: 4 },
  warningButton: { marginTop: 12 },
  warningButtonGrad: { padding: 8, borderRadius: 8, alignItems: 'center' },
  warningButtonText: { color: '#FFF', fontWeight: '700' },
  card: { backgroundColor: SURFACE, borderRadius: 16, marginBottom: 12, ...shadow(), overflow: 'hidden' },
  cardBand: { padding: 12 },
  cardBandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  urgencyPill: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  urgencyPillText: { fontSize: 10, color: '#FFF', fontWeight: '800' },
  cardBody: { padding: 16 },
  infoGrid: { flexDirection: 'row', gap: 16 },
  infoCell: { flex: 1 },
  infoCellLabel: { fontSize: 10, color: TEXT_SOFT, fontWeight: '700', textTransform: 'uppercase' },
  infoCellValue: { fontSize: 14, color: TEXT_DARK, fontWeight: '600' },
  bloodTypeBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bloodTypeValue: { fontSize: 20, fontWeight: '900', color: '#FFF' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { flex: 1, padding: 8, backgroundColor: BG, borderRadius: 8, alignItems: 'center' },
  chipLabel: { fontSize: 9, color: TEXT_SOFT },
  chipValue: { fontSize: 12, fontWeight: '700' },
  cardActions: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: BORDER, gap: 8 },
  actionBtnRed: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: DANGER_PALE },
  actionBtnFilled: { flex: 1.5, borderRadius: 8, overflow: 'hidden' },
  actionBtnFilledGrad: { padding: 12, alignItems: 'center' },
  actionBtnFilledText: { color: '#FFF', fontWeight: '800' },
  actionBtnText: { fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalSheet: { backgroundColor: SURFACE, borderRadius: 20, padding: 20 },
  modalReasonLabel: { fontWeight: '700', marginBottom: 10 },
  input: { backgroundColor: BG, borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelBtn: { flex: 1, padding: 12, alignItems: 'center' },
  modalSubmitBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  modalSubmitGrad: { padding: 12, alignItems: 'center' },
  modalSubmitText: { color: '#FFF', fontWeight: '700' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
});

export default RequestsScreen;