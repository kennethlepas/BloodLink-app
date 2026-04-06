import { VerificationBanner } from '@/src/components/VerificationBanner';
import { useUser } from '@/src/contexts/UserContext';
import { useCachedData } from '@/src/hooks/useCachedData';
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
const GREEN_PALE = '#D1FAE5';
const WARN = '#F59E0B';
const WARN_PALE = '#FEF3C7';
const DANGER = '#EF4444';
const DANGER_PALE = '#FEE2E2';
const BLUE = '#3B82F6';
const BLUE_PALE = '#DBEAFE';
const PURPLE = '#8B5CF6';
const PURPLE_PALE = '#EDE9FE';

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
    { enabled: !!user && !hasActiveCommitment } // Only fetch if donor has no active commitment
  );

  // Constants
  const TEXT_DARK = '#0C1A33';
  const TEXT_MID = '#4B5563';
  const TEXT_SOFT = '#9CA3AF';
  const BORDER = '#E5E7EB';
  const SURFACE = '#FFFFFF';
  const BG = '#F9FAFB';

  // Check if donor has active commitments by fetching from database
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

      // If donor has active commitment, ensure they're marked as unavailable
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

  // Check for active commitments on mount and when user changes
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

    // Ensure compatibility (though service usually handles it)
    const compatible = allCompatibleRequests.filter(request =>
      isBloodTypeCompatible(user.bloodType, request.bloodType)
    );

    if (filter === 'all') return compatible;
    return compatible.filter(r => r.urgencyLevel === filter);
  }, [allCompatibleRequests, filter, user]);

  const loading = loadingRequests;

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      // Check active commitments first
      const hasActive = await checkActiveCommitments();

      if (!hasActive) {
        await refreshRequests();
      }
    } catch (err) {
      console.error('Refresh error:', err);
      Alert.alert('Refresh Failed', 'Could not refresh requests. Pull down again to retry.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshRequests, user, checkActiveCommitments]);

  const loadRequests = useCallback(async () => {
    if (!user) return;
    try {
      const hasActive = await checkActiveCommitments();

      if (!hasActive) {
        await refreshRequests();
      }
    } catch (err) {
      console.error('Load requests error:', err);
    }
  }, [refreshRequests, user, checkActiveCommitments]);

  // Helper to add/remove processing state
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
    if (!user) {
      Alert.alert('Error', 'Please login to accept requests');
      return;
    }

    // Prevent double-click
    if (isProcessing(request.id)) {
      return;
    }

    // Check if donor already has an active commitment
    const hasActive = await checkActiveCommitments();
    if (hasActive) {
      Alert.alert(
        'Already Committed',
        'You already have an active donation commitment. Please complete or cancel your current commitment before accepting a new request.',
        [
          { text: 'OK', onPress: () => router.push('/(donor)/donation-history' as any) }
        ]
      );
      return;
    }

    if (user.verificationStatus !== 'approved') {
      Alert.alert(
        'Verification Required',
        'Your account must be verified to accept blood donation requests. Please complete the verification process.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Verified', onPress: () => router.push('/(shared)/donor-verification' as any) }
        ]
      );
      return;
    }

    Alert.alert(
      'Accept Request',
      `Do you want to accept this blood donation request from ${request.requesterName}? Once accepted, you will be marked as unavailable to other requesters until you complete or cancel this donation.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            startProcessing(request.id);

            try {
              // Create chat first
              const chatId = await createChat(
                user.id,
                `${user.firstName} ${user.lastName}`,
                request.requesterId,
                request.requesterName,
                request.id,
                'donor'
              );

              // Create accepted request record
              await createAcceptedRequest(
                user.id,
                `${user.firstName} ${user.lastName}`,
                request,
                chatId
              );

              // Update the blood request status
              await acceptBloodRequest(
                request.id,
                user.id,
                `${user.firstName} ${user.lastName}`
              );

              // Mark donor as unavailable since they have an active commitment
              await updateDonorAvailability(user.id, false);
              await updateUserData({ isAvailable: false });
              setHasActiveCommitment(true);

              // Create notification for requester
              await createNotification({
                userId: request.requesterId,
                type: 'request_accepted',
                title: 'Blood Request Accepted',
                message: `${user.firstName} ${user.lastName} has accepted your blood donation request.`,
                data: { requestId: request.id, donorId: user.id, chatId },
                isRead: false,
                timestamp: new Date().toISOString()
              });

              // Refresh the list (will now be empty due to active commitment)
              await refreshRequests();

              // Show success message
              Alert.alert(
                'Success! 🎉',
                'You have accepted the blood donation request. You are now marked as unavailable to other requesters. You can now chat with the requester.',
                [
                  {
                    text: 'Go to Chat',
                    onPress: () => router.push(`/(shared)/chat?chatId=${chatId}` as any),
                  },
                  {
                    text: 'View My Commitments',
                    onPress: () => router.push('/(donor)/donation-history' as any),
                  },
                  { text: 'OK' }
                ]
              );

            } catch (error: any) {
              console.error('Error accepting request:', error);

              // Provide more specific error messages
              let errorMessage = 'Failed to accept request. Please try again.';
              if (error.code === 'permission-denied') {
                errorMessage = 'You don\'t have permission to accept this request.';
              } else if (error.code === 'unavailable') {
                errorMessage = 'Network error. Please check your connection and try again.';
              } else if (error.message) {
                errorMessage = error.message;
              }

              Alert.alert('Error', errorMessage);
            } finally {
              stopProcessing(request.id);
            }
          },
        },
      ]
    );
  };

  const handleRejectRequest = (request: BloodRequest) => {
    setSelectedRequest(request);
    setRejectionModalVisible(true);
  };

  const confirmRejectRequest = async () => {
    if (!user || !selectedRequest) {
      Alert.alert('Error', 'Unable to process rejection');
      return;
    }

    // Prevent double-click
    if (isProcessing(selectedRequest.id)) {
      return;
    }

    startProcessing(selectedRequest.id);

    try {
      // Create rejected request record
      await createRejectedRequest(
        user.id,
        selectedRequest.id,
        rejectionReason.trim() || undefined
      );

      // Refresh the list to remove the rejected request
      await refreshRequests();

      // Close modal and clear state
      setRejectionModalVisible(false);
      setSelectedRequest(null);
      setRejectionReason('');

      // Show success message
      Alert.alert(
        'Request Declined',
        'This request will no longer be shown to you.'
      );

    } catch (error: any) {
      console.error('Error rejecting request:', error);

      let errorMessage = 'Failed to decline request. Please try again.';
      if (error.code === 'permission-denied') {
        errorMessage = 'You don\'t have permission to decline this request.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      stopProcessing(selectedRequest.id);
    }
  };

  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return { color: DANGER, bg: DANGER_PALE, icon: 'warning', label: 'CRITICAL' };
      case 'urgent':
        return { color: WARN, bg: WARN_PALE, icon: 'alert-circle', label: 'URGENT' };
      default:
        return { color: BLUE, bg: BLUE_PALE, icon: 'information-circle', label: 'MODERATE' };
    }
  };

  const renderActiveCommitmentWarning = () => (
    <View style={st.warningContainer}>
      <LinearGradient
        colors={[WARN_PALE, '#FEF3C7']}
        style={st.warningCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={st.warningContent}>
          <Ionicons name="alert-circle" size={24} color={WARN} />
          <View style={st.warningTextContainer}>
            <Text style={st.warningTitle}>You Have an Active Commitment</Text>
            <Text style={st.warningMessage}>
              You currently have an active donation commitment. You cannot accept new requests until you complete or cancel your current donation.
            </Text>
            <TouchableOpacity
              style={st.warningButton}
              onPress={() => router.push('/(donor)/donation-history' as any)}
            >
              <LinearGradient
                colors={[WARN, '#EA580C']}
                style={st.warningButtonGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={st.warningButtonText}>View My Commitments</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderUnavailabilityWarning = () => (
    <View style={st.warningContainer}>
      <LinearGradient
        colors={[WARN_PALE, '#FEF3C7']}
        style={st.warningCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={st.warningContent}>
          <Ionicons name="moon" size={24} color={WARN} />
          <View style={st.warningTextContainer}>
            <Text style={st.warningTitle}>You are Currently Unavailable</Text>
            <Text style={st.warningMessage}>
              Your availability is turned off. You cannot view or accept blood requests until you mark yourself as available in your profile.
            </Text>
            <TouchableOpacity
              style={st.warningButton}
              onPress={() => router.push('/(donor)/profile' as any)}
            >
              <LinearGradient
                colors={[WARN, '#EA580C']}
                style={st.warningButtonGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={st.warningButtonText}>Go to Profile</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderIneligibilityWarning = () => (
    <View style={st.warningContainer}>
      <LinearGradient
        colors={[DANGER_PALE, '#FEE2E2']}
        style={st.warningCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={st.warningContent}>
          <Ionicons name="time" size={24} color={DANGER} />
          <View style={st.warningTextContainer}>
            <Text style={[st.warningTitle, { color: DANGER }]}>Not Currently Eligible</Text>
            <Text style={[st.warningMessage, { color: '#991B1B' }]}>
              {eligibility.message || "You don't meet the eligibility criteria to donate at this time."}
            </Text>
            <TouchableOpacity
              style={st.warningButton}
              onPress={() => router.push('/(shared)/guide' as any)}
            >
              <LinearGradient
                colors={[DANGER, '#B91C1C']}
                style={st.warningButtonGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={st.warningButtonText}>View Health Guide</Text>
                <Ionicons name="book" size={16} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderRequestListItem = ({ item }: { item: BloodRequest }) => {
    const urgencyCfg = getUrgencyConfig(item.urgencyLevel || 'moderate');
    const processing = isProcessing(item.id);

    return (
      <TouchableOpacity
        style={st.card}
        onPress={() => !processing && setViewRequest(item)}
        activeOpacity={0.9}
        disabled={processing}
      >
        <LinearGradient
          colors={[TEAL, TEAL_MID]}
          style={[st.cardBand, { paddingVertical: 12 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={urgencyCfg.icon as any} size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>{item.hospitalName}</Text>
            </View>
            <View style={[st.urgencyPill, { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 4, paddingHorizontal: 8 }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{urgencyCfg.label}</Text>
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
            <Text style={{ fontSize: 15, color: TEAL, fontWeight: '800' }}>{item.bloodType} - {item.bloodComponent || 'Whole Blood'}</Text>
          </View>
          {processing ? (
            <ActivityIndicator size="small" color={TEAL} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={BORDER} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequestDetail = ({ item }: { item: BloodRequest }) => {
    const urgencyCfg = getUrgencyConfig(item.urgencyLevel || 'moderate');
    const processing = isProcessing(item.id);

    return (
      <View style={st.card}>
        {/* Top band */}
        <LinearGradient
          colors={[TEAL, TEAL_MID]}
          style={st.cardBand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={st.cardBandRow}>
            {/* Blood type */}
            <View style={st.bloodTypeBlock}>
              <Ionicons name="water" size={20} color="rgba(255,255,255,0.75)" />
              <View>
                <Text style={st.bloodTypeSmallLabel}>Blood Type & Component</Text>
                <Text style={[st.bloodTypeValue, { fontSize: 18 }]}>{item.bloodType} ({item.bloodComponent || 'Whole Blood'})</Text>
              </View>
            </View>
            {/* Urgency pill */}
            <View style={[st.urgencyPill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Ionicons name={urgencyCfg.icon as any} size={13} color="#FFFFFF" />
              <Text style={st.urgencyPillText}>{urgencyCfg.label}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Body */}
        <View style={st.cardBody}>
          {/* Info Grid */}
          <View style={st.infoGrid}>
            <View style={st.infoCell}>
              <View style={[st.infoCellIcon, { backgroundColor: PURPLE_PALE }]}>
                <Ionicons name="person" size={14} color={PURPLE} />
              </View>
              <View style={st.infoCellText}>
                <Text style={st.infoCellLabel}>Requester</Text>
                <Text style={st.infoCellValue} numberOfLines={1}>{item.requesterName}</Text>
              </View>
            </View>
            {item.patientName && (
              <View style={st.infoCell}>
                <View style={[st.infoCellIcon, { backgroundColor: BLUE_PALE }]}>
                  <Ionicons name="medical" size={14} color={BLUE} />
                </View>
                <View style={st.infoCellText}>
                  <Text style={st.infoCellLabel}>Patient</Text>
                  <Text style={st.infoCellValue} numberOfLines={1}>{item.patientName}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Hospital */}
          {item.hospitalName && (
            <View style={st.hospitalRow}>
              <View style={[st.infoCellIcon, { backgroundColor: TEAL_PALE }]}>
                <Ionicons name="business" size={14} color={TEAL} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.infoCellLabel}>Hospital</Text>
                <Text style={st.infoCellValue} numberOfLines={1}>{item.hospitalName}</Text>
              </View>
            </View>
          )}

          {/* Location */}
          <View style={st.addressRow}>
            <Ionicons name="location" size={13} color={TEXT_SOFT} />
            <Text style={st.addressText} numberOfLines={2}>
              {item.location?.address || 'Location provided'}
            </Text>
          </View>

          {/* Stats Chips */}
          <View style={st.chipRow}>
            <View style={[st.chip, { backgroundColor: urgencyCfg.bg }]}>
              <Ionicons name={urgencyCfg.icon as any} size={13} color={urgencyCfg.color} />
              <Text style={st.chipLabel}>Urgency</Text>
              <Text style={[st.chipValue, { color: urgencyCfg.color }]}>{urgencyCfg.label}</Text>
            </View>
            <View style={st.chip}>
              <Ionicons name="flask" size={13} color={BLUE} />
              <Text style={st.chipLabel}>Units</Text>
              <Text style={[st.chipValue, { color: BLUE }]}>{item.unitsNeeded}</Text>
            </View>
            <View style={st.chip}>
              <Ionicons name="time" size={13} color={PURPLE} />
              <Text style={st.chipLabel}>Posted</Text>
              <Text style={[st.chipValue, { color: PURPLE }]}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}
              </Text>
            </View>
          </View>

          {/* Notes */}
          {item.notes && (
            <View style={st.notesBox}>
              <Ionicons name="document-text" size={13} color={TEAL} />
              <Text style={st.notesText}>{item.notes}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={st.cardActions}>
          <TouchableOpacity
            style={[st.actionBtnRed, processing && st.actionBtnDisabled]}
            onPress={() => !processing && handleRejectRequest(item)}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color={DANGER} />
            ) : (
              <>
                <Ionicons name="close-circle" size={15} color={DANGER} />
                <Text style={[st.actionBtnText, { color: DANGER }]}>Decline</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.actionBtnFilled, processing && st.actionBtnDisabled]}
            onPress={() => !processing && handleAcceptRequest(item)}
            disabled={processing}
          >
            <LinearGradient
              colors={processing ? ['#9CA3AF', '#6B7280'] : [GREEN, '#059669']}
              style={st.actionBtnFilledGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
                  <Text style={st.actionBtnFilledText}>Accept</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={st.emptyWrap}>
      <LinearGradient colors={[TEAL_PALE, '#99F6E4']} style={st.emptyIconWrap}>
        <Ionicons name="file-tray-outline" size={46} color={TEAL} />
      </LinearGradient>
      <Text style={st.emptyTitle}>No Blood Requests</Text>
      <Text style={st.emptyText}>
        There are no active blood requests for your blood type at the moment.
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={st.emptyWrap}>
      <LinearGradient colors={[DANGER_PALE, '#FECACA']} style={st.emptyIconWrap}>
        <Ionicons name="alert-circle-outline" size={46} color={DANGER} />
      </LinearGradient>
      <Text style={[st.emptyTitle, { color: DANGER }]}>Unable to Load Requests</Text>
      <Text style={st.emptyText}>
        There was an error loading blood requests. Please check your connection and try again.
      </Text>
      <TouchableOpacity
        style={[st.emptyBtn, { marginTop: 20 }]}
        onPress={onRefresh}
      >
        <LinearGradient colors={[TEAL, TEAL_MID]} style={st.emptyBtnGrad}>
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
          <Text style={st.emptyBtnText}>Retry</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },

    // Header
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    headerTop: { alignItems: 'center', marginBottom: 0 },
    headerCenter: { alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 0, fontWeight: '600' },

    // Filter Bar
    filterBar: {
      flexDirection: 'row',
      backgroundColor: SURFACE,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      gap: 6,
    },
    filterTab: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: BG, alignItems: 'center', paddingVertical: 8 },
    filterTabActive: {
      backgroundColor: TEAL_PALE,
      borderColor: TEAL,
    },
    filterTabText: { fontSize: 12, fontWeight: '700', color: TEXT_SOFT },
    filterTabTextActive: { color: TEAL },

    // Loading
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 15, color: TEXT_MID },

    listContent: { padding: 16, paddingBottom: 100 },

    // Warning Card
    warningContainer: { padding: 12, paddingBottom: 4 },
    warningCard: { borderRadius: 12, padding: 12, ...shadow('#000', 0.08, 6, 2) },
    warningContent: { flexDirection: 'row', gap: 10 },
    warningTextContainer: { flex: 1 },
    warningTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', marginBottom: 2 },
    warningMessage: { fontSize: 11, color: '#B45309', lineHeight: 16, marginBottom: 10 },
    warningButton: { borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start' },
    warningButtonGrad: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6 },
    warningButtonText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

    // Card
    card: { marginBottom: 16, borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, overflow: 'hidden', ...shadow('#000', 0.08, 12, 4) },
    cardBand: { paddingHorizontal: 16, paddingVertical: 14 },
    cardBandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bloodTypeBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bloodTypeSmallLabel: {
      fontSize: 9,
      color: 'rgba(255,255,255,0.65)',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5
    },
    bloodTypeValue: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginTop: 1 },
    urgencyPill: { borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6 },
    urgencyPillText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },

    cardBody: { padding: 16, gap: 10 },

    infoGrid: { flexDirection: 'row', gap: 10 },
    infoCell: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    infoCellIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    infoCellText: { flex: 1 },
    infoCellLabel: {
      fontSize: 10,
      color: TEXT_SOFT,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 2
    },
    infoCellValue: { fontSize: 13, color: TEXT_DARK, fontWeight: '700' },

    hospitalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    addressText: { flex: 1, fontSize: 12, color: TEXT_MID, lineHeight: 17 },

    chipRow: { flexDirection: 'row', gap: 8 },
    chip: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: BG, alignItems: 'center', gap: 3, paddingVertical: 9 },
    chipLabel: { fontSize: 9, color: TEXT_SOFT, fontWeight: '600', textTransform: 'uppercase' },
    chipValue: { fontSize: 13, fontWeight: '800' },

    notesBox: { borderRadius: 10, borderLeftWidth: 3, borderLeftColor: TEAL, backgroundColor: TEAL_PALE, flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10 },
    notesText: { flex: 1, fontSize: 12, color: TEXT_DARK, lineHeight: 17 },

    cardActions: { borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: BG, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
    actionBtnRed: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', backgroundColor: DANGER_PALE, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 11 },
    actionBtnDisabled: { opacity: 0.6 },
    actionBtnText: { fontSize: 13, fontWeight: '700' },
    actionBtnFilled: { flex: 1.4, borderRadius: 12, overflow: 'hidden' },
    actionBtnFilledGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 11
    },
    actionBtnFilledText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

    emptyWrap: { flex: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
    emptyIconWrap: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: TEXT_DARK,
      marginBottom: 8,
      textAlign: 'center'
    },
    emptyText: { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 20 },
    emptyBtn: { marginTop: 18, borderRadius: 12, overflow: 'hidden' },
    emptyBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24 },
    emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
    modalSheet: { borderRadius: 26, backgroundColor: SURFACE, padding: 24, paddingBottom: 30, ...shadow('#000', 0.2, 30, 10) },
    modalHandle: { display: 'none' },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    modalTitleIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    modalTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: TEXT_DARK },
    modalCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
    modalDesc: { fontSize: 14, color: TEXT_MID, lineHeight: 20, marginBottom: 16 },
    modalInputLabel: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
    modalInput: { minHeight: 100, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG, fontSize: 14, color: TEXT_DARK, marginBottom: 20, padding: 12, textAlignVertical: 'top' },
    modalBtnsRow: { flexDirection: 'row', gap: 10 },
    modalCancelBtn: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: BG, alignItems: 'center', paddingVertical: 14 },
    modalCancelText: { fontSize: 14, fontWeight: '700', color: TEXT_MID },
    modalDeclineBtn: { flex: 1.5, borderRadius: 14, overflow: 'hidden' },
    modalDeclineGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14
    },
    modalDeclineText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
    modalReasonLabel: { fontSize: 14, fontWeight: '700', color: TEXT_MID, marginBottom: 10 },
    input: {
      backgroundColor: BG,
      borderRadius: 14,
      padding: 14,
      fontSize: 14,
      color: TEXT_DARK,
      borderWidth: 1,
      borderColor: BORDER,
      minHeight: 100,
      textAlignVertical: 'top'
    },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
    modalSubmitBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    modalSubmitGrad: { paddingVertical: 14, alignItems: 'center' },
    modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' }
  });

  const isLoading = loading || refreshing;

  if (hasActiveCommitment || !user?.isAvailable || !eligibility.isEligible) {
    let warningIcon = 'alert-circle';
    let warningSub = 'Currently unavailable';
    let warningRender = renderActiveCommitmentWarning;

    if (!user?.isAvailable) {
      warningIcon = 'moon';
      warningSub = 'Status: Offline';
      warningRender = renderUnavailabilityWarning;
    } else if (!eligibility.isEligible) {
      warningIcon = 'time';
      warningSub = 'Not Eligible';
      warningRender = renderIneligibilityWarning;
    }

    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle='dark-content' backgroundColor={TEAL} />
        <LinearGradient colors={[TEAL, TEAL_MID]} style={st.header}>
          <View style={st.headerTop}>
            <Text style={st.headerTitle}>Blood Requests</Text>
            <Text style={st.headerSub}>{warningSub}</Text>
          </View>
        </LinearGradient>
        {warningRender()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle='dark-content' backgroundColor={TEAL} />

      <LinearGradient colors={[TEAL, TEAL_MID]} style={st.header}>
        <View style={st.headerTop}>
          <Text style={st.headerTitle}>Blood Requests</Text>
          <Text style={st.headerSub}>
            {`${requests.length} compatible request${requests.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
      </LinearGradient>

      {/* Verification Banner */}
      {user?.verificationStatus !== 'approved' && (
        <VerificationBanner
          status={user?.verificationStatus || 'pending'}
          userType="donor"
          rejectionReason={user?.verificationRejectionReason}
        />
      )}

      {/* Filter Bar */}
      <View style={st.filterBar}>
        {(['all', 'critical', 'urgent', 'moderate'] as const).map((id) => (
          <TouchableOpacity
            key={id}
            style={[st.filterTab, filter === id && st.filterTabActive]}
            onPress={() => setFilter(id)}
          >
            <Text style={[st.filterTabText, filter === id && st.filterTabTextActive]}>
              {id.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && requests.length === 0 ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={st.loadingText}>Finding compatible requests...</Text>
        </View>
      ) : requestsError ? (
        renderErrorState()
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestListItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={st.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Rejection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={rejectionModalVisible}
        onRequestClose={() => !isProcessing(selectedRequest?.id || '') && setRejectionModalVisible(false)}
      >
        <TouchableOpacity
          style={st.modalOverlay}
          activeOpacity={1}
          onPress={() => !isProcessing(selectedRequest?.id || '') && setRejectionModalVisible(false)}
        >
          <View style={st.modalSheet}>
            <View style={st.modalHeaderRow}>
              <View style={[st.modalTitleIcon, { backgroundColor: DANGER_PALE }]}>
                <Ionicons name="close-circle" size={22} color={DANGER} />
              </View>
              <Text style={[st.headerTitle, { color: TEXT_DARK, fontSize: 20 }]}>Decline Request</Text>
            </View>

            <Text style={st.modalReasonLabel}>Why are you declining this request?</Text>
            <TextInput
              style={st.input}
              placeholder="E.g. Not available, Too far, etc."
              placeholderTextColor={TEXT_SOFT}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              editable={!isProcessing(selectedRequest?.id || '')}
            />

            <View style={st.modalActions}>
              <TouchableOpacity
                style={st.modalCancelBtn}
                onPress={() => !isProcessing(selectedRequest?.id || '') && setRejectionModalVisible(false)}
                disabled={isProcessing(selectedRequest?.id || '')}
              >
                <Text style={st.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={st.modalSubmitBtn}
                onPress={confirmRejectRequest}
                disabled={isProcessing(selectedRequest?.id || '')}
              >
                <LinearGradient
                  colors={isProcessing(selectedRequest?.id || '') ? ['#9CA3AF', '#6B7280'] : [DANGER, '#C2410C']}
                  style={st.modalSubmitGrad}
                >
                  {isProcessing(selectedRequest?.id || '') ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={st.modalSubmitText}>Decline</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Request Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!viewRequest}
        onRequestClose={() => setViewRequest(null)}
      >
        <TouchableOpacity
          style={st.modalOverlay}
          activeOpacity={1}
          onPress={() => setViewRequest(null)}
        >
          <View style={[st.modalSheet, { padding: 0 }]}>
            {viewRequest && renderRequestDetail({ item: viewRequest })}
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

export default RequestsScreen;