import { useUser } from '@/src/contexts/UserContext';
import {
  acceptBloodRequest,
  createAcceptedRequest,
  createChat,
  createNotification,
  createRejectedRequest,
  getActiveBloodRequestsForDonor
} from '@/src/services/firebase/database';
import { BloodRequest } from '@/src/types/types';
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

// ─── Colors ──────────────────────────────────────────────────────────────────
const TEAL      = '#0D9488';
const TEAL_MID  = '#14B8A6';
const TEAL_PALE = '#CCFBF1';
const GREEN     = '#10B981';
const GREEN_PALE= '#D1FAE5';
const WARN      = '#F59E0B';
const WARN_PALE = '#FEF3C7';
const DANGER    = '#EF4444';
const DANGER_PALE='#FEE2E2';
const BLUE      = '#3B82F6';
const BLUE_PALE = '#DBEAFE';
const PURPLE    = '#8B5CF6';
const PURPLE_PALE='#EDE9FE';
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

const RequestsScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'moderate'>('all');
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadRequests();
  }, [user, filter]);

  const loadRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const allRequests = await getActiveBloodRequestsForDonor(user.id);
      
      // Filter by blood type compatibility
      const compatibleRequests = allRequests.filter(request => 
        isBloodTypeCompatible(user.bloodType, request.bloodType)
      );

      // Apply urgency filter
      let filteredRequests = compatibleRequests;
      if (filter === 'urgent') {
        filteredRequests = compatibleRequests.filter(r => 
          r.urgencyLevel === 'urgent' || r.urgencyLevel === 'critical'
        );
      } else if (filter === 'moderate') {
        filteredRequests = compatibleRequests.filter(r => r.urgencyLevel === 'moderate');
      }

      setRequests(filteredRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load blood requests.');
    } finally {
      setLoading(false);
    }
  };

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleAcceptRequest = async (request: BloodRequest) => {
    if (!user) return;

    Alert.alert(
      'Accept Request',
      `Do you want to accept this blood donation request from ${request.requesterName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const chatId = await createChat(
                user.id,
                `${user.firstName} ${user.lastName}`,
                request.requesterId,
                request.requesterName,
                request.id
              );

              await createAcceptedRequest(
                user.id,
                `${user.firstName} ${user.lastName}`,
                request,
                chatId
              );

              await acceptBloodRequest(
                request.id,
                user.id,
                `${user.firstName} ${user.lastName}`
              );

              await createNotification({
                userId: request.requesterId,
                type: 'request_accepted',
                title: 'Blood Request Accepted',
                message: `${user.firstName} ${user.lastName} has accepted your blood donation request.`,
                data: { requestId: request.id, donorId: user.id, chatId },
                isRead: false,
                timestamp: ''
              });

              Alert.alert(
                'Success',
                'You have accepted the blood donation request. You can now chat with the requester.',
                [
                  {
                    text: 'Go to Chat',
                    onPress: () => router.push(`/(shared)/chat?chatId=${chatId}` as any),
                  },
                  { text: 'OK' },
                ]
              );

              loadRequests();
            } catch (error) {
              console.error('Error accepting request:', error);
              Alert.alert('Error', 'Failed to accept request. Please try again.');
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
    if (!user || !selectedRequest) return;

    try {
      await createRejectedRequest(
        user.id,
        selectedRequest.id,
        rejectionReason || undefined
      );

      setRejectionModalVisible(false);
      setSelectedRequest(null);
      setRejectionReason('');
      await loadRequests();

      Alert.alert('Request Declined', 'This request will no longer be shown to you.');
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to decline request. Please try again.');
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

  const renderRequestItem = ({ item }: { item: BloodRequest }) => {
    const urgencyCfg = getUrgencyConfig(item.urgencyLevel || 'moderate');

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
                <Text style={st.bloodTypeSmallLabel}>Blood Type</Text>
                <Text style={st.bloodTypeValue}>{item.bloodType}</Text>
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
              {item.location.address || 'Location provided'}
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
                {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
          <TouchableOpacity style={st.actionBtnRed} onPress={() => handleRejectRequest(item)}>
            <Ionicons name="close-circle" size={15} color={DANGER} />
            <Text style={[st.actionBtnText, { color: DANGER }]}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.actionBtnFilled} onPress={() => handleAcceptRequest(item)}>
            <LinearGradient 
              colors={[GREEN, '#059669']} 
              style={st.actionBtnFilledGrad} 
              start={{x:0,y:0}} 
              end={{x:1,y:0}}
            >
              <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
              <Text style={st.actionBtnFilledText}>Accept</Text>
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

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />
      
      {/* Header */}
      <LinearGradient colors={[TEAL, TEAL_MID]} style={st.header}>
        <View style={st.headerTop}>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Blood Requests</Text>
            <Text style={st.headerSub}>
              {requests.length} compatible request{requests.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={st.filterBar}>
        {[
          { key: 'all', label: 'All' },
          { key: 'urgent', label: 'Urgent' },
          { key: 'moderate', label: 'Moderate' },
        ].map(tab => {
          const isActive = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[st.filterTab, isActive && st.filterTabActive]}
              onPress={() => setFilter(tab.key as any)}
            >
              <Text style={[st.filterTabText, isActive && st.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={st.loadingText}>Loading requests...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={st.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />
          }
        />
      )}

      {/* Rejection Modal */}
      <Modal
        visible={rejectionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectionModalVisible(false)}
      >
        <View style={st.modalOverlay}>
          <View style={st.modalSheet}>
            <View style={st.modalHandle} />
            <View style={st.modalHeaderRow}>
              <View style={[st.modalTitleIcon, { backgroundColor: DANGER_PALE }]}>
                <Ionicons name="close-circle" size={20} color={DANGER} />
              </View>
              <Text style={st.modalTitle}>Decline Request</Text>
              <TouchableOpacity 
                style={st.modalCloseBtn} 
                onPress={() => setRejectionModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={TEXT_SOFT} />
              </TouchableOpacity>
            </View>

            <Text style={st.modalDesc}>
              You're about to decline this blood donation request. This will remove it from your list.
            </Text>

            <Text style={st.modalInputLabel}>Reason (Optional)</Text>
            <TextInput
              style={st.modalInput}
              placeholder="Why are you declining this request?"
              placeholderTextColor={TEXT_SOFT}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={st.modalBtnsRow}>
              <TouchableOpacity
                style={st.modalCancelBtn}
                onPress={() => {
                  setRejectionModalVisible(false);
                  setRejectionReason('');
                }}
              >
                <Text style={st.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalDeclineBtn} onPress={confirmRejectRequest}>
                <LinearGradient 
                  colors={[DANGER, '#DC2626']} 
                  style={st.modalDeclineGrad} 
                  start={{x:0,y:0}} 
                  end={{x:1,y:0}}
                >
                  <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                  <Text style={st.modalDeclineText}>Decline Request</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Header
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18 },
  headerTop: { alignItems: 'center', marginBottom: 0 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: '600' },

  // Filter Bar
  filterBar: { 
    flexDirection: 'row', 
    backgroundColor: SURFACE, 
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1, 
    borderBottomColor: BORDER,
    gap: 8,
  },
  filterTab: { 
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10, 
    borderRadius: 10,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterTabActive: { 
    backgroundColor: TEAL_PALE,
    borderColor: TEAL,
  },
  filterTabText: { fontSize: 13, fontWeight: '700', color: TEXT_SOFT },
  filterTabTextActive: { color: TEAL },

  // Loading
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
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
  urgencyPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 20 
  },
  urgencyPillText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },

  cardBody: { padding: 16, gap: 10 },

  infoGrid: { flexDirection: 'row', gap: 10 },
  infoCell: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoCellIcon: { 
    width: 30, 
    height: 30, 
    borderRadius: 9, 
    justifyContent: 'center', 
    alignItems: 'center', 
    flexShrink: 0 
  },
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
  chip: { 
    flex: 1, 
    alignItems: 'center', 
    gap: 3, 
    backgroundColor: BG, 
    borderRadius: 12, 
    paddingVertical: 9, 
    borderWidth: 1, 
    borderColor: BORDER 
  },
  chipLabel: { fontSize: 9, color: TEXT_SOFT, fontWeight: '600', textTransform: 'uppercase' },
  chipValue: { fontSize: 13, fontWeight: '800' },

  notesBox: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 8, 
    padding: 10, 
    backgroundColor: TEAL_PALE, 
    borderRadius: 10, 
    borderLeftWidth: 3, 
    borderLeftColor: TEAL 
  },
  notesText: { flex: 1, fontSize: 12, color: TEXT_DARK, lineHeight: 17 },

  cardActions: { 
    flexDirection: 'row', 
    gap: 8, 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderTopWidth: 1, 
    borderTopColor: BORDER, 
    backgroundColor: BG 
  },
  actionBtnRed: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 5, 
    backgroundColor: DANGER_PALE, 
    paddingVertical: 11, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#FECACA' 
  },
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

  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
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
  emptyText: { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { 
    backgroundColor: SURFACE, 
    borderTopLeftRadius: 26, 
    borderTopRightRadius: 26, 
    padding: 24, 
    paddingBottom: 40, 
    ...shadow('#000', 0.2, 30, 10) 
  },
  modalHandle: { 
    width: 40, 
    height: 4, 
    borderRadius: 2, 
    backgroundColor: BORDER, 
    alignSelf: 'center', 
    marginBottom: 20 
  },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  modalTitleIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 11, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: TEXT_DARK },
  modalCloseBtn: { 
    width: 32, 
    height: 32, 
    borderRadius: 10, 
    backgroundColor: BG, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalDesc: { fontSize: 14, color: TEXT_MID, lineHeight: 20, marginBottom: 16 },
  modalInputLabel: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
  modalInput: { 
    borderWidth: 1.5, 
    borderColor: BORDER, 
    borderRadius: 12, 
    padding: 12, 
    fontSize: 14, 
    color: TEXT_DARK, 
    backgroundColor: BG, 
    minHeight: 100, 
    marginBottom: 20 
  },
  modalBtnsRow: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 14, 
    backgroundColor: BG, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: BORDER 
  },
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
});

export default RequestsScreen;