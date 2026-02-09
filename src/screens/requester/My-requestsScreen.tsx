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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MyRequestsScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');
  
  // Verification states
  const [pendingVerifications, setPendingVerifications] = useState<AcceptedRequest[]>([]);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<AcceptedRequest | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userRequests = await getUserBloodRequests(user.id);
      setRequests(userRequests);
      
      // Load pending verifications
      const verifications = await getRequesterPendingVerifications(user.id);
      setPendingVerifications(verifications);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load your blood requests.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  // Verification handlers
  const handleVerifyDonation = (verification: AcceptedRequest) => {
    setSelectedVerification(verification);
    setVerifyModalVisible(true);
  };

  const confirmVerifyDonation = async () => {
    if (!selectedVerification) return;

    try {
      // Verify the donation
      await verifyDonationByRequester(
        selectedVerification.id,
        verificationNotes || undefined
      );

      // Complete donation and award points
      await completeDonationAfterVerification(
        selectedVerification,
        selectedVerification.donorId,
        selectedVerification.donorName
      );

      // Send notification to donor
      await createNotification({
        userId: selectedVerification.donorId,
        type: 'donation_verified',
        title: 'Donation Verified! 🎉',
        message: `Your donation has been verified. You earned 50 points!`,
        data: {
          acceptedRequestId: selectedVerification.id,
        },
        isRead: false,
        timestamp: ''
      });

      setVerifyModalVisible(false);
      setSelectedVerification(null);
      setVerificationNotes('');

      Alert.alert('Success', 'Donation verified! The donor has been notified.');
      loadRequests();
    } catch (error) {
      console.error('Error verifying donation:', error);
      Alert.alert('Error', 'Failed to verify donation.');
    }
  };

  const handleDisputeDonation = async () => {
    if (!selectedVerification) return;

    Alert.alert(
      'Report Issue',
      'Are you sure you want to report an issue with this donation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Report',
          style: 'destructive',
          onPress: async () => {
            try {
              await disputeDonationByRequester(
                selectedVerification.id,
                verificationNotes || 'No reason provided'
              );

              // Notify donor
              await createNotification({
                userId: selectedVerification.donorId,
                type: 'donation_disputed',
                title: 'Donation Disputed',
                message: 'The requester has reported an issue with your donation. Support will review this.',
                data: {
                  acceptedRequestId: selectedVerification.id,
                },
                isRead: false,
                timestamp: ''
              });

              setVerifyModalVisible(false);
              setSelectedVerification(null);
              setVerificationNotes('');

              Alert.alert('Reported', 'The issue has been reported to support.');
              loadRequests();
            } catch (error) {
              console.error('Error disputing donation:', error);
              Alert.alert('Error', 'Failed to report issue.');
            }
          }
        }
      ]
    );
  };

  const handleCompleteRequest = async (request: BloodRequest) => {
    Alert.alert(
      'Complete Request',
      'Have you received the blood donation? This will mark the request as completed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await completeBloodRequest(request.id);
              Alert.alert('Success', 'Blood request marked as completed!');
              loadRequests();
            } catch (error) {
              console.error('Error completing request:', error);
              Alert.alert('Error', 'Failed to complete request. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCancelRequest = async (request: BloodRequest) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this blood request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateBloodRequest(request.id, { status: 'cancelled' });
              Alert.alert('Success', 'Blood request cancelled.');
              loadRequests();
            } catch (error) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Failed to cancel request. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getFilteredRequests = () => {
    if (filter === 'all') return requests;
    return requests.filter(r => r.status === filter);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'accepted':
        return '#10B981';
      case 'completed':
        return '#3B82F6';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'accepted':
        return 'checkmark-circle-outline';
      case 'completed':
        return 'checkmark-done-circle-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const renderRequestItem = ({ item }: { item: BloodRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.bloodTypeContainer}>
          <Ionicons name="water" size={24} color="#EF4444" />
          <Text style={styles.bloodType}>{item.bloodType}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Ionicons 
            name={getStatusIcon(item.status) as any} 
            size={16} 
            color={getStatusColor(item.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.requestBody}>
        <View style={styles.infoRow}>
          <Ionicons name="medical" size={18} color="#64748B" />
          <Text style={styles.infoText}>Patient: {item.patientName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="business" size={18} color="#64748B" />
          <Text style={styles.infoText}>{item.hospitalName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location" size={18} color="#64748B" />
          <Text style={styles.infoText} numberOfLines={2}>
            {item.location.address || 'Location provided'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="water-outline" size={18} color="#64748B" />
          <Text style={styles.infoText}>{item.unitsNeeded} unit(s) needed</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time" size={18} color="#64748B" />
          <Text style={styles.infoText}>
            Created: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {item.acceptedDonorName && (
          <View style={[styles.infoRow, styles.donorInfo]}>
            <Ionicons name="person-circle" size={18} color="#10B981" />
            <Text style={[styles.infoText, styles.donorText]}>
              Donor: {item.acceptedDonorName}
            </Text>
          </View>
        )}

        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {item.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleCancelRequest(item)}
          >
            <Ionicons name="close-circle" size={18} color="#EF4444" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {item.status === 'accepted' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.chatButton]}
              onPress={() => router.push(`/(shared)/chat?requestId=${item.id}` as any)}
            >
              <Ionicons name="chatbubble" size={18} color="#3B82F6" />
              <Text style={styles.chatButtonText}>Chat with Donor</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleCompleteRequest(item)}
            >
              <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === 'completed' && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-done-circle" size={20} color="#10B981" />
            <Text style={styles.completedText}>Request Completed</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={80} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Blood Requests</Text>
      <Text style={styles.emptyText}>
        You haven't created any blood requests yet.
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push('/(requester)/needblood' as any)}
      >
        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
        <Text style={styles.createButtonText}>Create Request</Text>
      </TouchableOpacity>
    </View>
  );

  const filteredRequests = getFilteredRequests();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1b8882ff" />
      <LinearGradient colors={['#1b8882ff', '#16b43eff']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Requests</Text>
          <Text style={styles.headerSubtitle}>
            {requests.length} total request{requests.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </LinearGradient>

      {/* Pending Verifications Banner */}
      {pendingVerifications.length > 0 && (
        <View style={styles.verificationBanner}>
          <View style={styles.verificationHeader}>
            <Ionicons name="alert-circle" size={24} color="#F59E0B" />
            <View style={styles.verificationHeaderText}>
              <Text style={styles.verificationTitle}>
                {pendingVerifications.length} Donation{pendingVerifications.length > 1 ? 's' : ''} Awaiting Verification
              </Text>
              <Text style={styles.verificationSubtitle}>
                Please verify donations you received
              </Text>
            </View>
          </View>
          
          {pendingVerifications.map((verification) => (
            <View key={verification.id} style={styles.verificationCard}>
              <View style={styles.verificationInfo}>
                <Ionicons name="person" size={20} color="#64748B" />
                <View style={styles.verificationDetails}>
                  <Text style={styles.verificationDonor}>{verification.donorName}</Text>
                  <Text style={styles.verificationMeta}>
                    {verification.bloodType} • {new Date(verification.donorCompletedAt || '').toLocaleDateString()}
                  </Text>
                  {verification.donorNotes && (
                    <Text style={styles.verificationNotes} numberOfLines={2}>
                      Note: {verification.donorNotes}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.verificationActions}>
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={() => handleVerifyDonation(verification)}
                >
                  <Text style={styles.verifyButtonText}>Verify</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({requests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending ({requests.filter(r => r.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'accepted' && styles.filterButtonActive]}
          onPress={() => setFilter('accepted')}
        >
          <Text style={[styles.filterText, filter === 'accepted' && styles.filterTextActive]}>
            Accepted ({requests.filter(r => r.status === 'accepted').length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1b8882ff" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1b8882ff']} />
          }
        />
      )}

      {/* Verification Modal */}
      <Modal
        visible={verifyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVerifyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Donation</Text>
              <TouchableOpacity onPress={() => setVerifyModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedVerification && (
              <>
                <View style={styles.donorInfoCard}>
                  <Text style={styles.donorInfoLabel}>Donor</Text>
                  <Text style={styles.donorInfoValue}>{selectedVerification.donorName}</Text>
                  <Text style={styles.donorInfoLabel}>Blood Type: {selectedVerification.bloodType}</Text>
                  <Text style={styles.donorInfoLabel}>
                    Date: {new Date(selectedVerification.donorCompletedAt || '').toLocaleDateString()}
                  </Text>
                  {selectedVerification.donorNotes && (
                    <>
                      <Text style={styles.donorInfoLabel}>Donor Notes:</Text>
                      <Text style={styles.donorInfoNotes}>{selectedVerification.donorNotes}</Text>
                    </>
                  )}
                </View>

                <Text style={styles.modalDescription}>
                  Did you receive the blood donation from {selectedVerification.donorName}?
                </Text>

                <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Add any notes about the donation..."
                  placeholderTextColor="#94A3B8"
                  value={verificationNotes}
                  onChangeText={setVerificationNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.disputeButton}
                    onPress={handleDisputeDonation}
                  >
                    <Text style={styles.disputeButtonText}>Report Issue</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmVerifyButton}
                    onPress={confirmVerifyDonation}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.confirmVerifyButtonText}>Verify Donation</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  // Verification Banner Styles
  verificationBanner: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  verificationHeaderText: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 2,
  },
  verificationSubtitle: {
    fontSize: 13,
    color: '#78350F',
  },
  verificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  verificationInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  verificationDetails: {
    flex: 1,
  },
  verificationDonor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  verificationMeta: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  verificationNotes: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  verificationActions: {
    marginLeft: 12,
  },
  verifyButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterButtonActive: {
    backgroundColor: '#1b8882ff',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  listContent: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bloodTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bloodType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  donorInfo: {
    backgroundColor: '#D1FAE5',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  donorText: {
    color: '#047857',
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  chatButton: {
    backgroundColor: '#DBEAFE',
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  completedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  completedText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  donorInfoCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  donorInfoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  donorInfoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  donorInfoNotes: {
    fontSize: 14,
    color: '#1E293B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    minHeight: 80,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  disputeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  disputeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
  confirmVerifyButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  confirmVerifyButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default MyRequestsScreen;