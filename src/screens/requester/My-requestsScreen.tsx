import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import {
  completeBloodRequest,
  completeDonationAfterVerification,
  createNotification,
  disputeDonationByRequester,
  getRequesterPendingVerifications,
  getUserBloodRequests,
  updateBloodRequest,
  verifyDonationByRequester
} from '@/src/services/firebase/database';
import { AcceptedRequest, BloodRequest } from '@/src/types/types';
import { showRatingPrompt } from '@/src/utils/ratingPromptHelper';
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

const shadow = (c = '#000', o = 0.08, r = 10, e = 3) =>
  Platform.select({
    web: { boxShadow: `0 2px ${r}px rgba(0,0,0,${o})` } as any,
    default: { shadowColor: c, shadowOffset: { width: 0, height: 2 }, shadowOpacity: o, shadowRadius: r, elevation: e },
  });

const MyRequestsScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const { colors, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');
  const [pendingVerifications, setPendingVerifications] = useState<AcceptedRequest[]>([]);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<AcceptedRequest | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => { loadRequests(); }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [userRequests, verifications] = await Promise.all([
        getUserBloodRequests(user.id),
        getRequesterPendingVerifications(user.id),
      ]);
      setRequests(userRequests);
      setPendingVerifications(verifications);
    } catch {
      Alert.alert('Error', 'Failed to load your blood requests.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadRequests(); setRefreshing(false); };

  const handleVerifyDonation = (v: AcceptedRequest) => { setSelectedVerification(v); setVerifyModalVisible(true); };

  const confirmVerifyDonation = async () => {
    if (!selectedVerification || !user) return;
    try {
      await verifyDonationByRequester(selectedVerification.id, verificationNotes || undefined);
      await completeDonationAfterVerification(selectedVerification, selectedVerification.donorId, selectedVerification.donorName);
      await createNotification({
        userId: selectedVerification.donorId, type: 'donation_verified',
        title: 'Donation Verified! 🎉',
        message: 'Your donation has been verified. You earned 50 points!',
        data: { acceptedRequestId: selectedVerification.id }, isRead: false, timestamp: ''
      });
      setVerifyModalVisible(false); setSelectedVerification(null); setVerificationNotes('');
      Alert.alert('Success', 'Donation verified! The donor has been notified.');
      showRatingPrompt(router, user.id);
      loadRequests();
    } catch { Alert.alert('Error', 'Failed to verify donation.'); }
  };

  const handleDisputeDonation = async () => {
    if (!selectedVerification) return;
    Alert.alert('Report Issue', 'Are you sure you want to report an issue with this donation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit Report', style: 'destructive', onPress: async () => {
          try {
            await disputeDonationByRequester(selectedVerification.id, verificationNotes || 'No reason provided');
            await createNotification({
              userId: selectedVerification.donorId, type: 'donation_disputed',
              title: 'Donation Disputed',
              message: 'The requester has reported an issue with your donation. Support will review this.',
              data: { acceptedRequestId: selectedVerification.id }, isRead: false, timestamp: ''
            });
            setVerifyModalVisible(false); setSelectedVerification(null); setVerificationNotes('');
            Alert.alert('Reported', 'The issue has been reported to support.'); loadRequests();
          } catch { Alert.alert('Error', 'Failed to report issue.'); }
        }
      }
    ]);
  };

  const handleCompleteRequest = async (request: BloodRequest) => {
    if (!user) return;
    Alert.alert('Complete Request', 'Have you received the blood donation? This will mark the request as completed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete', onPress: async () => {
          try {
            await completeBloodRequest(request.id);
            Alert.alert('Success', 'Blood request marked as completed!');
            showRatingPrompt(router, user.id); loadRequests();
          } catch { Alert.alert('Error', 'Failed to complete request. Please try again.'); }
        }
      }
    ]);
  };

  const handleCancelRequest = async (request: BloodRequest) => {
    if (!user) return;
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this blood request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try {
            await updateBloodRequest(request.id, { status: 'cancelled' });
            Alert.alert('Success', 'Blood request cancelled.');
            showRatingPrompt(router, user.id); loadRequests();
          } catch { Alert.alert('Error', 'Failed to cancel request. Please try again.'); }
        }
      }
    ]);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { color: colors.warning, bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7', icon: 'time-outline', label: 'PENDING' };
      case 'accepted': return { color: colors.success, bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5', icon: 'checkmark-circle-outline', label: 'ACCEPTED' };
      case 'completed': return { color: colors.primary, bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE', icon: 'checkmark-done-circle-outline', label: 'COMPLETED' };
      case 'cancelled': return { color: colors.danger, bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2', icon: 'close-circle-outline', label: 'CANCELLED' };
      default: return { color: colors.textMuted, bg: colors.surfaceAlt, icon: 'information-circle-outline', label: status.toUpperCase() };
    }
  };

  const getUrgencyConfig = (u: string) => {
    switch (u) {
      case 'critical': return { color: colors.danger, bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2', icon: 'warning', label: 'CRITICAL' };
      case 'urgent': return { color: colors.warning, bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7', icon: 'alert-circle', label: 'URGENT' };
      default: return { color: colors.success, bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5', icon: 'information-circle', label: 'MODERATE' };
    }
  };

  const filteredRequests = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const filterTabs = [
    { key: 'all', label: 'All', count: requests.length },
    { key: 'pending', label: 'Pending', count: requests.filter(r => r.status === 'pending').length },
    { key: 'accepted', label: 'Accepted', count: requests.filter(r => r.status === 'accepted').length },
    { key: 'completed', label: 'Done', count: requests.filter(r => r.status === 'completed').length },
  ] as const;

  const ListHeader = () => (
    <>
      <LinearGradient colors={[colors.primary, '#60A5FA']} style={st.header}>
        <View style={st.headerTop}>
          <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>My Requests</Text>
            <Text style={st.headerSub}>{requests.length} total request{requests.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            style={st.addBtn}
            onPress={() => router.push('/(requester)/needblood' as any)}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Summary chips */}
        <View style={st.summaryRow}>
          {[
            { icon: 'time', label: 'Pending', val: requests.filter(r => r.status === 'pending').length, clr: isDark ? colors.warning : '#FCD34D' },
            { icon: 'checkmark-circle', label: 'Accepted', val: requests.filter(r => r.status === 'accepted').length, clr: isDark ? colors.success : '#86EFAC' },
            { icon: 'checkmark-done-circle', label: 'Done', val: requests.filter(r => r.status === 'completed').length, clr: '#93C5FD' },
          ].map((s, i) => (
            <View key={i} style={st.summaryChip}>
              <Ionicons name={s.icon as any} size={16} color={s.clr} />
              <Text style={st.summaryChipVal}>{s.val}</Text>
              <Text style={st.summaryChipLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Pending Verifications Banner */}
      {pendingVerifications.length > 0 && (
        <View style={[st.verifyBanner, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FEF3C7', borderBottomColor: colors.warning }]}>
          <View style={st.verifyBannerHeader}>
            <View style={[st.verifyBannerIconWrap, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(251, 191, 36, 0.2)' }]}>
              <Ionicons name="alert-circle" size={22} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.verifyBannerTitle, { color: isDark ? '#F59E0B' : '#92400E' }]}>
                {pendingVerifications.length} Donation{pendingVerifications.length > 1 ? 's' : ''} Need Verification
              </Text>
              <Text style={[st.verifyBannerSub, { color: isDark ? '#D97706' : '#92400E' }]}>Please confirm donations you received</Text>
            </View>
          </View>
          {pendingVerifications.map((v) => (
            <View key={v.id} style={[st.verifyCard, { backgroundColor: colors.surface, borderColor: isDark ? '#78350F' : '#FDE68A' }]}>
              <View style={st.verifyCardLeft}>
                <LinearGradient colors={[colors.primary, '#60A5FA']} style={st.verifyAvatar}>
                  <Text style={st.verifyAvatarText}>{v.donorName?.charAt(0)?.toUpperCase()}</Text>
                </LinearGradient>
                <View>
                  <Text style={[st.verifyDonorName, { color: colors.text }]}>{v.donorName}</Text>
                  <View style={st.verifyMeta}>
                    <View style={[st.verifyBloodBadge, { backgroundColor: colors.danger }]}>
                      <Ionicons name="water" size={10} color="#FFFFFF" />
                      <Text style={st.verifyBloodText}>{v.bloodType}</Text>
                    </View>
                    <Text style={[st.verifyDate, { color: colors.textSecondary }]}>
                      {new Date(v.donorCompletedAt || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={[st.verifyBtn, { backgroundColor: colors.primary }]} onPress={() => handleVerifyDonation(v)}>
                <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                <Text style={st.verifyBtnText}>Verify</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Filter Tabs */}
      <View style={[st.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        {filterTabs.map(tab => {
          const isActive = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[st.filterTab, isActive && { borderBottomColor: colors.primary }]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[st.filterTabText, { color: colors.textSecondary }, isActive && { color: colors.primary }]}>{tab.label}</Text>
              {tab.count > 0 && (
                <View style={[st.filterBadge, { backgroundColor: colors.surfaceAlt }, isActive && { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE' }]}>
                  <Text style={[st.filterBadgeText, { color: colors.textMuted }, isActive && { color: colors.primary }]}>{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const renderRequestItem = ({ item }: { item: BloodRequest }) => {
    const statusCfg = getStatusConfig(item.status);
    const urgencyCfg = getUrgencyConfig(item.urgencyLevel || 'moderate');
    return (
      <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        {/* Top band */}
        <LinearGradient
          colors={item.status === 'completed' ? [colors.primary, '#60A5FA'] : item.status === 'accepted' ? [colors.success, '#34D399'] : ['#334155', '#475569']}
          style={st.cardBand}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <View style={st.cardBandRow}>
            {/* Blood type */}
            <View style={st.bloodTypeBlock}>
              <Ionicons name="water" size={18} color="rgba(255,255,255,0.75)" />
              <View>
                <Text style={st.bloodTypeSmallLabel}>Blood Type</Text>
                <Text style={st.bloodTypeValue}>{item.bloodType}</Text>
              </View>
            </View>
            {/* Status pill */}
            <View style={[st.statusPill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Ionicons name={statusCfg.icon as any} size={13} color="#FFFFFF" />
              <Text style={st.statusPillText}>{statusCfg.label}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Body */}
        <View style={st.cardBody}>
          {/* Info Grid */}
          <View style={st.infoGrid}>
            <View style={st.infoCell}>
              <View style={[st.infoCellIcon, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#EDE9FE' }]}>
                <Ionicons name="medical" size={14} color="#8B5CF6" />
              </View>
              <View style={st.infoCellText}>
                <Text style={[st.infoCellLabel, { color: colors.textMuted }]}>Patient</Text>
                <Text style={[st.infoCellValue, { color: colors.text }]} numberOfLines={1}>{item.patientName}</Text>
              </View>
            </View>
            <View style={st.infoCell}>
              <View style={[st.infoCellIcon, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE' }]}>
                <Ionicons name="business" size={14} color={colors.primary} />
              </View>
              <View style={st.infoCellText}>
                <Text style={[st.infoCellLabel, { color: colors.textMuted }]}>Hospital</Text>
                <Text style={[st.infoCellValue, { color: colors.text }]} numberOfLines={1}>{item.hospitalName}</Text>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={st.addressRow}>
            <Ionicons name="location" size={13} color={colors.textSecondary} />
            <Text style={[st.addressText, { color: colors.textSecondary }]} numberOfLines={2}>{item.location.address || 'Location provided'}</Text>
          </View>

          {/* Stats Chips */}
          <View style={st.chipRow}>
            <View style={[st.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="flask" size={13} color="#8B5CF6" />
              <Text style={[st.chipLabel, { color: colors.textMuted }]}>Units</Text>
              <Text style={[st.chipValue, { color: '#8B5CF6' }]}>{item.unitsNeeded}</Text>
            </View>
            <View style={[st.chip, { backgroundColor: urgencyCfg.bg, borderColor: 'transparent' }]}>
              <Ionicons name={urgencyCfg.icon as any} size={13} color={urgencyCfg.color} />
              <Text style={[st.chipLabel, { color: colors.textMuted }]}>Urgency</Text>
              <Text style={[st.chipValue, { color: urgencyCfg.color }]}>{urgencyCfg.label}</Text>
            </View>
            <View style={[st.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="time" size={13} color={colors.primary} />
              <Text style={[st.chipLabel, { color: colors.textMuted }]}>Created</Text>
              <Text style={[st.chipValue, { color: colors.primary }]}>
                {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>

          {/* Donor Info */}
          {item.acceptedDonorName && (
            <View style={[st.donorRow, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' }]}>
              <View style={[st.infoCellIcon, { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                <Ionicons name="person-circle" size={14} color={colors.success} />
              </View>
              <View>
                <Text style={[st.infoCellLabel, { color: colors.textMuted }]}>Assigned Donor</Text>
                <Text style={[st.infoCellValue, { color: colors.success }]}>{item.acceptedDonorName}</Text>
              </View>
            </View>
          )}

          {/* Notes */}
          {item.notes && (
            <View style={[st.notesBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF', borderLeftColor: colors.primary }]}>
              <Ionicons name="document-text" size={13} color={colors.primary} />
              <Text style={[st.notesText, { color: colors.text }]}>{item.notes}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={[st.cardActions, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
          {item.status === 'pending' && (
            <>
              {item.interestedDonorIds && item.interestedDonorIds.length > 0 && (
                <TouchableOpacity
                  style={[st.actionBtnGreen, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5', borderColor: isDark ? '#065F46' : '#A7F3D0' }]}
                  onPress={() => router.push(`/(requester)/select-donor?requestId=${item.id}` as any)}
                >
                  <Ionicons name="people" size={15} color={colors.success} />
                  <Text style={[st.actionBtnText, { color: colors.success }]}>
                    {item.interestedDonorIds.length} Interested
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[st.actionBtnRed, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2', borderColor: isDark ? '#7F1D1D' : '#FECACA' }]}
                onPress={() => handleCancelRequest(item)}
              >
                <Ionicons name="close-circle" size={15} color={colors.danger} />
                <Text style={[st.actionBtnText, { color: colors.danger }]}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === 'accepted' && (
            <>
              <TouchableOpacity
                style={[st.actionBtnBlue, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE', borderColor: isDark ? '#1E3A8A' : '#BFDBFE' }]}
                onPress={() => router.push(`/(shared)/chat?requestId=${item.id}` as any)}
              >
                <Ionicons name="chatbubble-ellipses" size={15} color={colors.primary} />
                <Text style={[st.actionBtnText, { color: colors.primary }]}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.actionBtnFilled} onPress={() => handleCompleteRequest(item)}>
                <LinearGradient colors={[colors.success, '#34D399']} style={st.actionBtnFilledGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="checkmark-done" size={15} color="#FFFFFF" />
                  <Text style={st.actionBtnFilledText}>Complete</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {item.status === 'completed' && (
            <View style={st.completedRow}>
              <Ionicons name="checkmark-done-circle" size={18} color={colors.success} />
              <Text style={[st.completedText, { color: colors.success }]}>Request Completed</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={st.emptyWrap}>
      <LinearGradient colors={isDark ? ['#1E293B', '#334155'] : ['#DBEAFE', '#EFF6FF']} style={st.emptyIconWrap}>
        <Ionicons name="document-text-outline" size={46} color={colors.primary} />
      </LinearGradient>
      <Text style={[st.emptyTitle, { color: colors.text }]}>No Blood Requests</Text>
      <Text style={[st.emptyText, { color: colors.textSecondary }]}>You haven't created any blood requests yet.</Text>
      <TouchableOpacity style={st.emptyBtn} onPress={() => router.push('/(requester)/needblood' as any)}>
        <LinearGradient colors={[colors.primary, '#60A5FA']} style={st.emptyBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="add-circle" size={18} color="#FFFFFF" />
          <Text style={st.emptyBtnText}>Create Request</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {loading ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[st.loadingText, { color: colors.textSecondary }]}>Loading requests...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={st.listContent}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={renderEmptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        />
      )}

      {/* Verify Modal */}
      <Modal visible={verifyModalVisible} transparent animationType="slide" onRequestClose={() => setVerifyModalVisible(false)}>
        <View style={[st.modalOverlay, { backgroundColor: colors.drawerOverlay }]}>
          <View style={[st.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[st.modalHandle, { backgroundColor: colors.surfaceBorder }]} />
            <View style={st.modalHeaderRow}>
              <View style={[st.modalTitleIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
              <Text style={[st.modalTitle, { color: colors.text }]}>Verify Donation</Text>
              <TouchableOpacity style={[st.modalCloseBtn, { backgroundColor: colors.surfaceAlt }]} onPress={() => setVerifyModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedVerification && (
              <>
                <View style={[st.donorInfoCard, { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.primary }]}>
                  <View style={st.donorInfoRow}>
                    <LinearGradient colors={[colors.primary, '#60A5FA']} style={st.donorInfoAvatar}>
                      <Text style={st.donorInfoAvatarText}>{selectedVerification.donorName?.charAt(0)?.toUpperCase()}</Text>
                    </LinearGradient>
                    <View>
                      <Text style={[st.donorInfoName, { color: colors.text }]}>{selectedVerification.donorName}</Text>
                      <View style={st.donorInfoMeta}>
                        <Ionicons name="water" size={11} color={colors.danger} />
                        <Text style={[st.donorInfoBlood, { color: colors.danger }]}>{selectedVerification.bloodType}</Text>
                        <Text style={[st.donorInfoDate, { color: colors.textMuted }]}>
                          · {new Date(selectedVerification.donorCompletedAt || '').toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {selectedVerification.donorNotes && (
                    <View style={[st.donorInfoNoteBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#DBEAFE' }]}>
                      <Ionicons name="document-text" size={13} color={colors.primary} />
                      <Text style={[st.donorInfoNoteText, { color: colors.primary }]}>{selectedVerification.donorNotes}</Text>
                    </View>
                  )}
                </View>

                <Text style={[st.modalDesc, { color: colors.textSecondary }]}>Did you receive the blood donation from {selectedVerification.donorName}?</Text>
                <Text style={[st.modalInputLabel, { color: colors.text }]}>Additional Notes (Optional)</Text>
                <TextInput
                  style={[st.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="Add any notes about the donation..."
                  placeholderTextColor={colors.textMuted}
                  value={verificationNotes}
                  onChangeText={setVerificationNotes}
                  multiline numberOfLines={3} textAlignVertical="top"
                />

                <View style={st.modalBtnsRow}>
                  <TouchableOpacity
                    style={[st.modalDisputeBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2', borderColor: isDark ? '#7F1D1D' : '#FECACA' }]}
                    onPress={handleDisputeDonation}
                  >
                    <Text style={[st.modalDisputeText, { color: colors.danger }]}>Report Issue</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={st.modalVerifyBtn} onPress={confirmVerifyDonation}>
                    <LinearGradient colors={[colors.success, '#059669']} style={st.modalVerifyGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={st.modalVerifyText}>Verify Donation</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  // Summary Row
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  summaryChipVal: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  summaryChipLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  // Verification Banner
  verifyBanner: { padding: 14, borderBottomWidth: 1 },
  verifyBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  verifyBannerIconWrap: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  verifyBannerTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  verifyBannerSub: { fontSize: 12 },
  verifyCard: { borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, ...shadow('#F59E0B', 0.08, 6, 2) },
  verifyCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  verifyAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  verifyAvatarText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  verifyDonorName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  verifyMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  verifyBloodBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  verifyBloodText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF' },
  verifyDate: { fontSize: 11, fontWeight: '500' },
  verifyNotes: { fontSize: 11, fontStyle: 'italic' },
  verifyBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 10 },
  verifyBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Filter Bar
  filterBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  filterTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  filterTabText: { fontSize: 13, fontWeight: '700' },
  filterBadge: { borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1 },
  filterBadgeText: { fontSize: 10, fontWeight: '700' },

  // Loading
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 40 },
  loadingText: { fontSize: 15 },

  listContent: { padding: 16, paddingBottom: 40 },

  // Card
  card: { borderRadius: 14, marginBottom: 12, overflow: 'hidden', borderWidth: 1, ...shadow('#000', 0.08, 10, 3) },
  cardBand: { paddingHorizontal: 12, paddingVertical: 10 },
  cardBandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bloodTypeBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bloodTypeSmallLabel: { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  bloodTypeValue: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginTop: 0 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
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
  chip: { flex: 1, alignItems: 'center', gap: 3, borderRadius: 12, paddingVertical: 9, borderWidth: 1 },
  chipLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  chipValue: { fontSize: 13, fontWeight: '800' },

  donorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 10 },
  notesBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, borderLeftWidth: 3 },
  notesText: { flex: 1, fontSize: 12, lineHeight: 17 },

  cardActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1 },
  actionBtnGreen: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  actionBtnRed: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  actionBtnBlue: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 40, ...shadow('#000', 0.2, 30, 10) },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  modalTitleIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '800' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  donorInfoCard: { borderRadius: 14, padding: 14, marginBottom: 16, borderLeftWidth: 3 },
  donorInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  donorInfoAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  donorInfoAvatarText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  donorInfoName: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  donorInfoMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  donorInfoBlood: { fontSize: 12, fontWeight: '700' },
  donorInfoDate: { fontSize: 12 },
  donorInfoNoteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 9, padding: 10 },
  donorInfoNoteText: { flex: 1, fontSize: 13, fontStyle: 'italic' },
  modalDesc: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  modalInputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  modalInput: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, marginBottom: 20 },
  modalBtnsRow: { flexDirection: 'row', gap: 10 },
  modalDisputeBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  modalDisputeText: { fontSize: 14, fontWeight: '700' },
  modalVerifyBtn: { flex: 1.5, borderRadius: 14, overflow: 'hidden' },
  modalVerifyGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  modalVerifyText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});

export default MyRequestsScreen;