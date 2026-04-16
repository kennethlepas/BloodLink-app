import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { useCachedData } from '@/src/hooks/useCachedData';
import { useTabBarAnimation } from '@/src/hooks/useTabBarAnimation';
import {
  completeDonationAfterVerification,
  getRecipientBookings,
  getRequesterPendingVerifications,
  getUserBloodRequests,
  verifyDonationByRequester,
} from '@/src/services/firebase/database';
import { AcceptedRequest, BloodRequest, RecipientBooking } from '@/src/types/types';
import { showRatingPrompt } from '@/src/utils/ratingPromptHelper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const shadow = (c = '#000', o = 0.08, r = 10, e = 3) => ({
  shadowColor: c,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: o,
  shadowRadius: r,
  elevation: e
});

const statusMap: Record<string, { color: string; icon: string; bg: string; label: string }> = {
  pending: { color: '#F59E0B', icon: 'time', bg: '#FEF3C7', label: 'Pending' },
  confirmed: { color: '#3B82F6', icon: 'checkmark-circle', bg: '#DBEAFE', label: 'Confirmed' },
  processing: { color: '#8B5CF6', icon: 'sync', bg: '#EDE9FE', label: 'Processing' },
  ready: { color: '#10B981', icon: 'checkmark-done', bg: '#D1FAE5', label: 'Ready' },
  completed: { color: '#10B981', icon: 'trophy', bg: '#D1FAE5', label: 'Completed' },
  fulfilled: { color: '#10B981', icon: 'checkmark-done-circle', bg: '#D1FAE5', label: 'Fulfilled' },
  rejected: { color: '#EF4444', icon: 'close-circle', bg: '#FEE2E2', label: 'Rejected' },
  cancelled: { color: '#EF4444', icon: 'close-circle', bg: '#FEE2E2', label: 'Cancelled' },
  cancel: { color: '#EF4444', icon: 'close-circle', bg: '#FEE2E2', label: 'Cancelled' },
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, backgroundColor: '#2C2418' },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  // Summary Row
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryChip: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.15)', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10 },
  summaryChipVal: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  summaryChipLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  // Verification Banner
  verifyBanner: { padding: 14, borderBottomWidth: 1 },
  verifyBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  verifyBannerIconWrap: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  verifyBannerTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  verifyBannerSub: { fontSize: 12 },
  verifyCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verifyCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  verifyAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  verifyAvatarText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  verifyDonorName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  verifyMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  verifyBloodBadge: { borderRadius: 6, backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2 },
  verifyBloodText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF' },
  verifyDate: { fontSize: 11, fontWeight: '500' },
  verifyBtn: { borderRadius: 10, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 10, paddingHorizontal: 14, paddingVertical: 9 },
  verifyBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Filter Bar
  filterBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  filterTab: { flex: 1, borderBottomWidth: 2.5, borderBottomColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13 },
  filterTabText: { fontSize: 13, fontWeight: '700' },
  filterBadge: { borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1 },
  filterBadgeText: { fontSize: 10, fontWeight: '700' },

  // Loading
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 40 },
  loadingText: { fontSize: 15 },

  listContent: { padding: 16, paddingBottom: 100 },

  // Card
  card: { marginBottom: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, overflow: 'hidden' },
  cardBand: { paddingHorizontal: 12, paddingVertical: 10 },
  cardBandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bloodTypeBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bloodTypeSmallLabel: { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  bloodTypeValue: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginTop: 0 },
  statusPill: { borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6 },
  statusPillText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },

  cardBody: { padding: 12, gap: 8 },
  infoGrid: { flexDirection: 'row', gap: 8 },
  infoCell: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  infoCellIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  infoCellText: { flex: 1 },
  infoCellLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 },
  infoCellValue: { fontSize: 12, fontWeight: '700' },

  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addressText: { flex: 1, fontSize: 12, lineHeight: 17 },

  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 3, paddingVertical: 9 },
  chipLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  chipValue: { fontSize: 13, fontWeight: '800' },

  donorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 10 },
  notesBox: { borderRadius: 10, borderLeftWidth: 3, flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10 },
  notesText: { flex: 1, fontSize: 12, lineHeight: 17 },

  cardActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1 },
  actionBtnGreen: { flex: 1, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9 },
  actionBtnRed: { flex: 1, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9 },
  actionBtnBlue: { flex: 1, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  actionBtnFilled: { flex: 1.4, borderRadius: 10, overflow: 'hidden' },
  actionBtnFilledGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 },
  actionBtnFilledText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  completedRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  completedText: { fontSize: 13, fontWeight: '700' },

  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 19, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { borderRadius: 14, overflow: 'hidden' },
  emptyBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 28 },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modalSheet: { borderRadius: 26, padding: 24, paddingBottom: 30 },
  modalHandle: { display: 'none' },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  modalTitleIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '800' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  donorInfoCard: { borderRadius: 14, borderLeftWidth: 3, padding: 14, marginBottom: 16 },
  donorInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  donorInfoAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  donorInfoAvatarText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  donorInfoName: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  donorInfoMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  donorInfoBlood: { fontSize: 12, fontWeight: '700' },
  donorInfoDate: { fontSize: 12 },
  donorInfoNoteBox: { borderRadius: 9, flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10 },
  donorInfoNoteText: { flex: 1, fontSize: 13, fontStyle: 'italic' },
  modalDesc: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  modalInputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  modalInput: { minHeight: 80, borderRadius: 12, borderWidth: 1.5, padding: 12, fontSize: 14, marginBottom: 20 },
  modalBtnsRow: { flexDirection: 'row', gap: 10 },
  modalDisputeBtn: { flex: 1, borderRadius: 14, borderWidth: 1, alignItems: 'center', paddingVertical: 14 },
  modalDisputeText: { fontSize: 14, fontWeight: '700' },
  modalVerifyBtn: { flex: 1.5, borderRadius: 14, overflow: 'hidden' },
  modalVerifyGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  modalVerifyText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  searchBarInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: colors.text,
  },
});

const MyRequestsScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const { colors, isDark } = useAppTheme();
  const st = getStyles(colors, isDark);

  // Color Constants
  const WARN = colors.warning;
  const WARN_PALE = isDark ? colors.warning + '20' : '#FEF3C7';
  const DANGER = colors.danger;
  const DANGER_PALE = isDark ? colors.danger + '20' : '#FEE2E2';
  const BLUE = colors.primary;
  const BLUE_PALE = isDark ? colors.primary + '20' : '#DBEAFE';
  const GREEN = colors.success;
  const GREEN_PALE = isDark ? colors.success + '20' : '#D1FAE5';
  const TEXT_DARK = colors.text;
  const TEXT_MID = colors.textSecondary;
  const TEXT_SOFT = colors.textMuted;
  const BORDER = colors.surfaceBorder;
  const SURFACE = colors.surface;
  const BG = colors.bg;

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<AcceptedRequest | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [viewRequest, setViewRequest] = useState<BloodRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | '3months' | '6months' | 'year' | 'lastYear'>('all');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'bookings'>('requests');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const { onScroll } = useTabBarAnimation();

  // Fetch user requests
  const { data: requestsData, loading: loadingRequests, refresh: refreshRequests } = useCachedData(
    `user_requests_${user?.id}`,
    () => getUserBloodRequests(user!.id),
    { enabled: !!user }
  );

  // Fetch pending verifications
  const { data: verificationsData, loading: loadingVerifications, refresh: refreshVerifications } = useCachedData(
    `user_verifications_${user?.id}`,
    () => getRequesterPendingVerifications(user!.id),
    { enabled: !!user }
  );

  // Fetch booking history
  const { data: bookingsData, loading: loadingBookings, refresh: refreshBookings } = useCachedData(
    `user_bookings_${user?.id}`,
    () => getRecipientBookings(user!.id),
    { enabled: !!user }
  );


  const requests = requestsData || [];
  const pendingVerifications = verificationsData || [];
  const recipientBookings: RecipientBooking[] = bookingsData || [];
  const loading = loadingRequests || loadingVerifications || loadingBookings;

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await Promise.all([refreshRequests(), refreshVerifications(), refreshBookings()]);
    } catch (error) {
      console.log('Error refreshing requester data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshRequests, refreshVerifications]);

  const loadRequests = useCallback(async () => {
    try {
      await Promise.all([refreshRequests(), refreshVerifications()]);
    } catch (error) {
      console.log('Error loading requester data:', error);
    }
  }, [refreshRequests, refreshVerifications]);

  const handleVerifyDonation = (v: AcceptedRequest) => {
    setSelectedVerification(v);
    setVerifyModalVisible(true);
  };

  const confirmVerifyDonation = async () => {
    if (!selectedVerification || !user) return;
    try {
      await verifyDonationByRequester(selectedVerification.id, verificationNotes || undefined);
      await completeDonationAfterVerification(selectedVerification, selectedVerification.donorId, selectedVerification.donorName);

      const { createNotification } = await import('@/src/services/firebase/database');
      await createNotification({
        userId: selectedVerification.donorId,
        type: 'donation_verified',
        title: 'Donation Verified! 🎉',
        message: 'Your donation has been verified. You earned 50 points!',
        data: { acceptedRequestId: selectedVerification.id },
        isRead: false,
        timestamp: new Date().toISOString()
      });

      setVerifyModalVisible(false);
      setSelectedVerification(null);
      setVerificationNotes('');
      Alert.alert('Success', 'Donation verified! The donor has been notified.');
      showRatingPrompt(router, user.id);
      loadRequests();
    } catch (error) {
      console.error('Error verifying donation:', error);
      Alert.alert('Error', 'Failed to verify donation.');
    }
  };

  const handleDisputeDonation = async () => {
    if (!selectedVerification || !user) return;

    const { disputeDonationByRequesterWithTicket, createNotification } = await import('@/src/services/firebase/database');

    Alert.alert('Report Issue', 'Are you sure you want to report an issue with this donation? This will create a support ticket for our team to investigate.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report Issue', style: 'destructive', onPress: async () => {
          try {
            const { ticketId } = await disputeDonationByRequesterWithTicket(
              selectedVerification,
              user.id,
              `${user.firstName} ${user.lastName}`,
              user.email,
              user.phoneNumber,
              verificationNotes || 'No reason provided'
            );

            await createNotification({
              userId: selectedVerification.donorId,
              type: 'donation_disputed',
              title: 'Donation Issue Reported',
              message: 'The requester has reported an issue with your donation. Support will review this.',
              data: { acceptedRequestId: selectedVerification.id, ticketId },
              isRead: false,
              timestamp: new Date().toISOString()
            });

            setVerifyModalVisible(false);
            setSelectedVerification(null);
            setVerificationNotes('');

            Alert.alert('Report Submitted', 'The issue has been reported and a support ticket has been created.', [
              { text: 'Close', onPress: () => loadRequests() },
              { text: 'View Ticket', onPress: () => { loadRequests(); router.push(`/(shared)/ticket/${ticketId}` as any); } }
            ]);
          } catch (error) {
            console.error('Error reporting issue:', error);
            Alert.alert('Error', 'Failed to report issue. Please try again.');
          }
        }
      }
    ]);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { color: colors.warning, bg: WARN_PALE, icon: 'time-outline', label: 'PENDING' };
      case 'accepted': return { color: colors.success, bg: GREEN_PALE, icon: 'checkmark-circle-outline', label: 'ACCEPTED' };
      case 'completed': return { color: colors.primary, bg: BLUE_PALE, icon: 'checkmark-done-circle-outline', label: 'COMPLETED' };
      case 'cancelled':
      case 'cancel': return { color: colors.danger, bg: DANGER_PALE, icon: 'close-circle-outline', label: 'CANCELLED' };
      default: return { color: TEXT_SOFT, bg: colors.surfaceTint, icon: 'information-circle-outline', label: status.toUpperCase() };
    }
  };

  const getVerificationStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { color: colors.warning, icon: 'time-outline', label: 'Pending Verification' };
      case 'approved': return { color: colors.success, icon: 'checkmark-circle-outline', label: 'Verified' };
      case 'rejected': return { color: colors.danger, icon: 'close-circle-outline', label: 'Verification Rejected' };
      default: return null;
    }
  };

  const getUrgencyConfig = (u: string) => {
    switch (u) {
      case 'critical': return { color: colors.danger, bg: DANGER_PALE, icon: 'warning', label: 'CRITICAL' };
      case 'urgent': return { color: colors.warning, bg: WARN_PALE, icon: 'alert-circle', label: 'URGENT' };
      default: return { color: colors.primary, bg: BLUE_PALE, icon: 'information-circle', label: 'MODERATE' };
    }
  };

  const filteredRequests = useMemo(() => {
    let f = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    // Time Filtering
    if (timeFilter !== 'all') {
      const now = new Date();
      f = f.filter(item => {
        const itemDate = new Date(item.createdAt);
        if (timeFilter === 'month') {
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        }
        if (timeFilter === '3months') {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          return itemDate >= threeMonthsAgo;
        }
        if (timeFilter === '6months') {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          return itemDate >= sixMonthsAgo;
        }
        if (timeFilter === 'year') {
          return itemDate.getFullYear() === now.getFullYear();
        }
        if (timeFilter === 'lastYear') {
          return itemDate.getFullYear() === now.getFullYear() - 1;
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter(r =>
        r.patientName.toLowerCase().includes(q) ||
        r.hospitalName.toLowerCase().includes(q)
      );
    }
    return f;
  }, [filter, requests, searchQuery, timeFilter]);

  const filterTabs = useMemo(() => [
    { key: 'all', label: 'All', count: requests.length },
    { key: 'pending', label: 'Pending', count: requests.filter(r => r.status === 'pending').length },
    { key: 'accepted', label: 'Accepted', count: requests.filter(r => r.status === 'accepted').length },
    { key: 'completed', label: 'Done', count: requests.filter(r => r.status === 'completed').length },
  ] as const, [requests]);

  const TIME_FILTER_OPTIONS = [
    { id: 'all', label: 'All Time' },
    { id: 'month', label: 'This Month' },
    { id: '3months', label: 'Last 3 Months' },
    { id: '6months', label: 'Last 6 Months' },
    { id: 'year', label: 'This Year' },
    { id: 'lastYear', label: 'Last Year' },
  ];

  const filteredBookings = useMemo(() => {
    let b = [...recipientBookings];

    // Status filtering
    if (bookingFilter !== 'all') {
      b = b.filter(bk => bk.status === bookingFilter);
    }

    if (timeFilter !== 'all') {
      const now = new Date();
      b = b.filter(item => {
        const itemDate = new Date(item.createdAt);
        if (timeFilter === 'month') return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        if (timeFilter === '3months') { const d = new Date(); d.setMonth(now.getMonth() - 3); return itemDate >= d; }
        if (timeFilter === '6months') { const d = new Date(); d.setMonth(now.getMonth() - 6); return itemDate >= d; }
        if (timeFilter === 'year') return itemDate.getFullYear() === now.getFullYear();
        if (timeFilter === 'lastYear') return itemDate.getFullYear() === now.getFullYear() - 1;
        return true;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      b = b.filter(bk =>
        bk.hospitalName?.toLowerCase().includes(q) ||
        bk.patientName?.toLowerCase().includes(q)
      );
    }
    return b;
  }, [recipientBookings, bookingFilter, timeFilter, searchQuery]);

  const bookingFilterTabs = useMemo(() => [
    { key: 'all', label: 'All', count: recipientBookings.length },
    { key: 'pending', label: 'Pending', count: recipientBookings.filter(b => b.status === 'pending').length },
    { key: 'confirmed', label: 'Confirmed', count: recipientBookings.filter(b => b.status === 'confirmed').length },
    { key: 'completed', label: 'Done', count: recipientBookings.filter(b => b.status === 'completed').length },
    { key: 'cancelled', label: 'Cancelled', count: recipientBookings.filter(b => b.status === 'cancelled').length },
  ] as const, [recipientBookings]);

  const renderRequestDetail = ({ item }: { item: BloodRequest }) => {
    const statusCfg = getStatusConfig(item.status);
    const urgencyCfg = getUrgencyConfig(item.urgencyLevel || 'moderate');
    const vStatusCfg = getVerificationStatusConfig(item.verificationStatus || '');

    return (
      <View style={[st.card, { backgroundColor: SURFACE, borderColor: BORDER }]}>
        <LinearGradient
          colors={item.status === 'completed' ? [BLUE, BLUE + 'B3'] : item.status === 'accepted' ? [GREEN, GREEN + 'B3'] : ['#334155', '#475569']}
          style={st.cardBand}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <View style={st.cardBandRow}>
            <View style={st.bloodTypeBlock}>
              <Ionicons name="water" size={18} color="rgba(255,255,255,0.75)" />
              <View>
                <Text style={st.bloodTypeSmallLabel}>Blood Type</Text>
                <Text style={st.bloodTypeValue}>{item.bloodType}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {vStatusCfg && (
                <View style={[st.statusPill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                  <Ionicons name={vStatusCfg.icon as any} size={13} color="#FFFFFF" />
                  <Text style={st.statusPillText}>{vStatusCfg.label.toUpperCase()}</Text>
                </View>
              )}
              <View style={[st.statusPill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Ionicons name={statusCfg.icon as any} size={13} color="#FFFFFF" />
                <Text style={st.statusPillText}>{statusCfg.label}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={st.cardBody}>
          <View style={st.infoGrid}>
            <View style={st.infoCell}>
              <View style={[st.infoCellIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="medical" size={14} color="#8B5CF6" />
              </View>
              <View style={st.infoCellText}>
                <Text style={[st.infoCellLabel, { color: TEXT_SOFT }]}>Patient</Text>
                <Text style={[st.infoCellValue, { color: TEXT_DARK }]} numberOfLines={1}>{item.patientName}</Text>
              </View>
            </View>
            <View style={st.infoCell}>
              <View style={[st.infoCellIcon, { backgroundColor: BLUE_PALE }]}>
                <Ionicons name="business" size={14} color={BLUE} />
              </View>
              <View style={st.infoCellText}>
                <Text style={[st.infoCellLabel, { color: TEXT_SOFT }]}>Hospital</Text>
                <Text style={[st.infoCellValue, { color: TEXT_DARK }]} numberOfLines={1}>{item.hospitalName}</Text>
              </View>
            </View>
          </View>

          <View style={st.addressRow}>
            <Ionicons name="location" size={13} color={TEXT_MID} />
            <Text style={[st.addressText, { color: TEXT_MID }]} numberOfLines={2}>{item.location.address || 'Location provided'}</Text>
          </View>

          <View style={st.chipRow}>
            <View style={[st.chip, { backgroundColor: colors.surfaceTint, borderColor: BORDER }]}>
              <Ionicons name="flask" size={13} color="#8B5CF6" />
              <Text style={[st.chipLabel, { color: TEXT_SOFT }]}>Units</Text>
              <Text style={[st.chipValue, { color: '#8B5CF6' }]}>{item.unitsNeeded}</Text>
            </View>
            <View style={[st.chip, { backgroundColor: urgencyCfg.bg, borderColor: 'transparent' }]}>
              <Ionicons name={urgencyCfg.icon as any} size={13} color={urgencyCfg.color} />
              <Text style={[st.chipLabel, { color: TEXT_SOFT }]}>Urgency</Text>
              <Text style={[st.chipValue, { color: urgencyCfg.color }]}>{urgencyCfg.label}</Text>
            </View>
            <View style={[st.chip, { backgroundColor: colors.surfaceTint, borderColor: BORDER }]}>
              <Ionicons name="time" size={13} color={BLUE} />
              <Text style={[st.chipLabel, { color: TEXT_SOFT }]}>Created</Text>
              <Text style={[st.chipValue, { color: BLUE }]}>
                {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <>

      {pendingVerifications.length > 0 && (
        <View style={[st.verifyBanner, { backgroundColor: '#FEF3C7', borderBottomColor: colors.warning }]}>
          <View style={st.verifyBannerHeader}>
            <View style={[st.verifyBannerIconWrap, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
              <Ionicons name="alert-circle" size={22} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.verifyBannerTitle, { color: '#92400E' }]}>
                {pendingVerifications.length} Donation{pendingVerifications.length > 1 ? 's' : ''} Need Verification
              </Text>
              <Text style={[st.verifyBannerSub, { color: '#92400E' }]}>Please confirm donations you received</Text>
            </View>
          </View>
          {pendingVerifications.map((v) => (
            <View key={v.id} style={[st.verifyCard, { backgroundColor: SURFACE, borderColor: '#FDE68A' }]}>
              <View style={st.verifyCardLeft}>
                <LinearGradient colors={[colors.primary, colors.primary + 'E6']} style={st.verifyAvatar}>
                  <Text style={st.verifyAvatarText}>{v.donorName?.charAt(0)?.toUpperCase()}</Text>
                </LinearGradient>
                <View>
                  <Text style={[st.verifyDonorName, { color: TEXT_DARK }]}>{v.donorName}</Text>
                  <View style={st.verifyMeta}>
                    <View style={[st.verifyBloodBadge, { backgroundColor: colors.danger }]}>
                      <Ionicons name="water" size={10} color="#FFFFFF" />
                      <Text style={st.verifyBloodText}>{v.bloodType}</Text>
                    </View>
                    <Text style={[st.verifyDate, { color: TEXT_MID }]}>
                      {new Date(v.donorCompletedAt || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={st.verifyBtn} onPress={() => handleVerifyDonation(v)}>
                <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                <Text style={st.verifyBtnText}>Verify</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={st.searchBarBox}>
        <Ionicons name="search" size={16} color={TEXT_SOFT} />
        <TextInput
          placeholder="Search requests, patient, hospital..."
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

      {/* Time Filter Dropdown */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12, zIndex: 10 }}>
        <TouchableOpacity
          onPress={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
              {TIME_FILTER_OPTIONS.find(o => o.id === timeFilter)?.label || 'All Time'}
            </Text>
          </View>
          <Ionicons name={isTimeDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        {isTimeDropdownOpen && (
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            marginTop: 4,
            overflow: 'hidden',
          }}>
            {TIME_FILTER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => { setTimeFilter(opt.id as any); setIsTimeDropdownOpen(false); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  backgroundColor: timeFilter === opt.id ? (colors.primary + '15') : 'transparent',
                  borderBottomWidth: 1,
                  borderBottomColor: colors.surfaceBorder,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: timeFilter === opt.id ? '700' : '500', color: timeFilter === opt.id ? colors.primary : colors.text }}>
                  {opt.label}
                </Text>
                {timeFilter === opt.id && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {activeTab === 'requests' && (
        <View style={[st.filterBar, { backgroundColor: SURFACE, borderBottomColor: BORDER }]}>
          {filterTabs.map(tab => {
            const isActive = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[st.filterTab, isActive && { borderBottomColor: colors.primary }]}
                onPress={() => setFilter(tab.key)}
              >
                <Text style={[st.filterTabText, { color: TEXT_MID }, isActive && { color: colors.primary }]}>{tab.label}</Text>
                {tab.count > 0 && (
                  <View style={[st.filterBadge, { backgroundColor: colors.surfaceTint }, isActive && { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[st.filterBadgeText, { color: TEXT_SOFT }, isActive && { color: colors.primary }]}>{tab.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {activeTab === 'bookings' && (
        <View style={[st.filterBar, { backgroundColor: SURFACE, borderBottomColor: BORDER }]}>
          {bookingFilterTabs.map(tab => {
            const isActive = bookingFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[st.filterTab, isActive && { borderBottomColor: colors.primary }]}
                onPress={() => setBookingFilter(tab.key)}
              >
                <Text style={[st.filterTabText, { color: TEXT_MID }, isActive && { color: colors.primary }]}>{tab.label}</Text>
                {tab.count > 0 && (
                  <View style={[st.filterBadge, { backgroundColor: colors.surfaceTint }, isActive && { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[st.filterBadgeText, { color: TEXT_SOFT }, isActive && { color: colors.primary }]}>{tab.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

    </>
  );

  const renderBookingListItem = ({ item }: { item: any }) => {
    const booking = item as RecipientBooking;
    const cfg = statusMap[booking.status] || { color: colors.textMuted, icon: 'information-circle', bg: colors.surfaceTint, label: booking.status };
    return (
      <View style={st.card}>
        <LinearGradient
          colors={booking.status === 'confirmed' ? [BLUE, BLUE + 'B3'] : booking.status === 'completed' ? [GREEN, GREEN + 'B3'] : ['#334155', '#475569']}
          style={[st.cardBand, { paddingVertical: 12 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="business" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{booking.hospitalName}</Text>
            </View>
            <View style={[st.statusPill, { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 4, paddingHorizontal: 8 }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{cfg.label.toUpperCase()}</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View>
              <Text style={{ fontSize: 11, color: TEXT_SOFT, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>Patient</Text>
              <Text style={{ fontSize: 15, color: TEXT_DARK, fontWeight: '700' }}>{booking.patientName}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: TEXT_SOFT, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>Blood</Text>
              <Text style={{ fontSize: 15, color: colors.success, fontWeight: '800' }}>{booking.bloodType}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <View style={[st.chip, { backgroundColor: colors.surfaceTint, borderColor: BORDER }]}>
              <Ionicons name="flask" size={13} color="#8B5CF6" />
              <Text style={[st.chipLabel, { color: TEXT_SOFT }]}>{booking.bloodComponent || 'Whole Blood'}</Text>
            </View>
            <View style={[st.chip, { backgroundColor: colors.surfaceTint, borderColor: BORDER }]}>
              <Ionicons name="time" size={13} color={BLUE} />
              <Text style={[st.chipLabel, { color: TEXT_SOFT }]}>
                {new Date(booking.scheduledDate || booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <View style={[st.chip, { backgroundColor: cfg.bg, borderColor: 'transparent' }]}>
              <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
              <Text style={[st.chipValue, { color: cfg.color }]}>{booking.unitsNeeded || 1} units</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderBookingsEmptyState = () => (
    <View style={st.emptyWrap}>
      <LinearGradient colors={[colors.surfaceTint, colors.bg]} style={st.emptyIconWrap}>
        <Ionicons name="calendar-outline" size={46} color={colors.primary} />
      </LinearGradient>
      <Text style={[st.emptyTitle, { color: TEXT_DARK }]}>No Transfusion Bookings</Text>
      <Text style={[st.emptyText, { color: TEXT_MID }]}>You haven't made any transfusion bookings yet.</Text>
      <TouchableOpacity style={st.emptyBtn} onPress={() => router.push('/(requester)/booktransfusion' as any)}>
        <LinearGradient colors={[colors.primary, colors.primary + 'E6']} style={st.emptyBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="add-circle" size={18} color="#FFFFFF" />
          <Text style={st.emptyBtnText}>Book Transfusion</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderRequestListItem = ({ item }: { item: BloodRequest }) => {
    const statusCfg = getStatusConfig(item.status);
    return (
      <TouchableOpacity style={st.card} onPress={() => setViewRequest(item)} activeOpacity={0.9}>
        <LinearGradient
          colors={item.status === 'pending' ? [GREEN, BLUE] : item.status === 'completed' ? [colors.primary, colors.primary + 'B3'] : [colors.surfaceTint, BORDER]}
          style={[st.cardBand, { paddingVertical: 12 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="location" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>{item.hospitalName}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {item.verificationStatus && item.verificationStatus !== 'approved' && (
                <View style={[st.statusPill, { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 4, paddingHorizontal: 8 }]}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{item.verificationStatus === 'pending' ? 'VERIFYING...' : 'REJECTED'}</Text>
                </View>
              )}
              <View style={[st.statusPill, { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 4, paddingHorizontal: 8 }]}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{statusCfg.label}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        <View style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 11, color: TEXT_SOFT, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>Patient</Text>
            <Text style={{ fontSize: 15, color: TEXT_DARK, fontWeight: '700' }}>{item.patientName}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: TEXT_SOFT, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>Blood</Text>
            <Text style={{ fontSize: 15, color: colors.success, fontWeight: '800' }}>{item.bloodType}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={BORDER} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={st.emptyWrap}>
      <LinearGradient colors={[colors.surfaceTint, colors.bg]} style={st.emptyIconWrap}>
        <Ionicons name="document-text-outline" size={46} color={colors.primary} />
      </LinearGradient>
      <Text style={[st.emptyTitle, { color: TEXT_DARK }]}>No Blood Requests</Text>
      <Text style={[st.emptyText, { color: TEXT_MID }]}>You haven't created any blood requests yet.</Text>
      <TouchableOpacity style={st.emptyBtn} onPress={() => router.push('/(requester)/needblood' as any)}>
        <LinearGradient colors={[colors.primary, colors.primary + 'E6']} style={st.emptyBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="add-circle" size={18} color="#FFFFFF" />
          <Text style={st.emptyBtnText}>Create Request</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[st.container, { backgroundColor: '#FDFBF7' }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A2647" />
      <LinearGradient colors={['#3B82F6', '#2563EB']} style={st.header}>
        <View style={st.headerTop}>
          <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>My Requests</Text>
            <Text style={st.headerSub}>
              {activeTab === 'requests'
                ? `${requests.length} request${requests.length !== 1 ? 's' : ''}`
                : `${recipientBookings.length} booking${recipientBookings.length !== 1 ? 's' : ''}`
              }
            </Text>
          </View>
          <TouchableOpacity style={st.addBtn} onPress={() => router.push('/(requester)/needblood' as any)}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={st.summaryRow}>
          {[
            { icon: 'time', label: 'Pending', val: requests.filter(r => r.status === 'pending').length, clr: colors.warning },
            { icon: 'checkmark-circle', label: 'Accepted', val: requests.filter(r => r.status === 'accepted').length, clr: colors.success },
            { icon: 'checkmark-done-circle', label: 'Done', val: requests.filter(r => r.status === 'completed').length, clr: '#93C5FD' },
          ].map((s, i) => (
            <View key={i} style={st.summaryChip}>
              <Ionicons name={s.icon as any} size={16} color={s.clr} />
              <Text style={st.summaryChipVal}>{s.val}</Text>
              <Text style={st.summaryChipLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Tab Switcher: Requests vs Bookings */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            onPress={() => setActiveTab('requests')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: activeTab === 'requests' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              borderColor: activeTab === 'requests' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>🩸 Blood Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('bookings')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: activeTab === 'bookings' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              borderColor: activeTab === 'bookings' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>📋 Transfusion Bookings</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={(activeTab === 'requests' ? filteredRequests : filteredBookings) as any[]}
        renderItem={(activeTab === 'requests' ? renderRequestListItem : renderBookingListItem) as any}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={st.listContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={activeTab === 'requests' ? renderEmptyState : renderBookingsEmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />

      <Modal visible={!!viewRequest} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={[st.modalSheet, { maxHeight: '80%', backgroundColor: SURFACE }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={st.modalHeaderRow}>
                <Text style={[st.modalTitle, { color: TEXT_DARK }]}>Request Details</Text>
                <TouchableOpacity onPress={() => setViewRequest(null)} style={st.modalCloseBtn}>
                  <Ionicons name="close" size={24} color={TEXT_SOFT} />
                </TouchableOpacity>
              </View>
              {viewRequest && renderRequestDetail({ item: viewRequest })}
              <TouchableOpacity
                style={[st.verifyBtn, { marginTop: 20, alignSelf: 'center', width: '100%' }]}
                onPress={() => setViewRequest(null)}
              >
                <Text style={st.verifyBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={verifyModalVisible} transparent animationType="slide">
        <View style={[st.modalOverlay, { justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[st.modalSheet, { backgroundColor: SURFACE, width: '100%', borderTopLeftRadius: 26, borderTopRightRadius: 26 }]}>
            <View style={st.modalHeaderRow}>
              <View style={[st.modalTitleIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              </View>
              <Text style={[st.modalTitle, { color: TEXT_DARK }]}>Verify Donation</Text>
              <TouchableOpacity style={st.modalCloseBtn} onPress={() => setVerifyModalVisible(false)}>
                <Ionicons name="close" size={24} color={TEXT_SOFT} />
              </TouchableOpacity>
            </View>

            {selectedVerification && (
              <View style={[st.donorInfoCard, { backgroundColor: colors.surfaceTint, borderLeftColor: colors.primary }]}>
                <View style={st.donorInfoRow}>
                  <LinearGradient colors={[colors.primary, colors.primary + 'B3']} style={st.donorInfoAvatar}>
                    <Text style={st.donorInfoAvatarText}>{selectedVerification.donorName?.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                  <View>
                    <Text style={[st.donorInfoName, { color: TEXT_DARK }]}>{selectedVerification.donorName}</Text>
                    <View style={st.donorInfoMeta}>
                      <Text style={[st.donorInfoBlood, { color: colors.danger }]}>{selectedVerification.bloodType}</Text>
                      <Text style={[st.donorInfoDate, { color: TEXT_SOFT }]}>received {new Date(selectedVerification.donorCompletedAt || '').toLocaleDateString()}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <Text style={[st.modalInputLabel, { color: TEXT_DARK }]}>Notes (Optional)</Text>
            <TextInput
              style={[st.modalInput, { backgroundColor: colors.surfaceTint, borderColor: BORDER, color: TEXT_DARK }]}
              placeholder="Any feedback?" placeholderTextColor={TEXT_SOFT}
              multiline value={verificationNotes} onChangeText={setVerificationNotes}
            />

            <View style={st.modalBtnsRow}>
              <TouchableOpacity style={[st.modalDisputeBtn, { borderColor: BORDER }]} onPress={handleDisputeDonation}>
                <Text style={[st.modalDisputeText, { color: colors.danger }]}>Report Issue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalVerifyBtn} onPress={confirmVerifyDonation}>
                <LinearGradient colors={[colors.primary, colors.primary + 'B3']} style={st.modalVerifyGrad}>
                  <Text style={st.modalVerifyText}>Confirm Received</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default MyRequestsScreen;