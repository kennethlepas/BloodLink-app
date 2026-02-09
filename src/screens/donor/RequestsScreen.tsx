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
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      // Use the new function that excludes rejected requests
      const allRequests = await getActiveBloodRequestsForDonor(user.id);
      
      // Filter by blood type compatibility
      const compatibleRequests = allRequests.filter(request => 
        isBloodTypeCompatible(user.bloodType, request.bloodType)
      );

      // Apply urgency filter
      let filteredRequests = compatibleRequests;
      if (filter === 'urgent') {
        filteredRequests = compatibleRequests.filter(r => r.urgencyLevel === 'urgent');
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
              // Create chat between donor and requester
              const chatId = await createChat(
                user.id,
                `${user.firstName} ${user.lastName}`,
                request.requesterId,
                request.requesterName,
                request.id
              );

              // Create accepted request record
              await createAcceptedRequest(
                user.id,
                `${user.firstName} ${user.lastName}`,
                request,
                chatId
              );

              // Update blood request status
              await acceptBloodRequest(
                request.id,
                user.id,
                `${user.firstName} ${user.lastName}`
              );

              // Send notification to requester
              await createNotification({
                userId: request.requesterId,
                type: 'request_accepted',
                title: 'Blood Request Accepted',
                message: `${user.firstName} ${user.lastName} has accepted your blood donation request.`,
                data: {
                  requestId: request.id,
                  donorId: user.id,
                  chatId,
                },
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
                  { 
                    text: 'View My Commitments',
                    onPress: () => router.push('/(donor)/donation-history' as any)
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
      // Create rejection record
      await createRejectedRequest(
        user.id,
        selectedRequest.id,
        rejectionReason || undefined
      );

      // Close modal and reset
      setRejectionModalVisible(false);
      setSelectedRequest(null);
      setRejectionReason('');

      // Reload requests to remove this one from the list
      await loadRequests();

      Alert.alert('Request Declined', 'This request will no longer be shown to you.');
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to decline request. Please try again.');
    }
  };

  const getUrgencyColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical':
        return '#DC2626';
      case 'urgent':
        return '#EF4444';
      case 'moderate':
        return '#F59E0B';
      default:
        return '#64748B';
    }
  };

  const getUrgencyIcon = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical':
        return 'alert-circle';
      case 'urgent':
        return 'alert-circle';
      case 'moderate':
        return 'information-circle';
      default:
        return 'checkmark-circle';
    }
  };

  const renderRequestItem = ({ item }: { item: BloodRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.bloodTypeContainer}>
          <Ionicons name="water" size={24} color="#EF4444" />
          <Text style={styles.bloodType}>{item.bloodType}</Text>
        </View>
        <View style={[styles.urgencyBadge, { backgroundColor: `${getUrgencyColor(item.urgencyLevel)}20` }]}>
          <Ionicons name={getUrgencyIcon(item.urgencyLevel) as any} size={16} color={getUrgencyColor(item.urgencyLevel)} />
          <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgencyLevel) }]}>
            {item.urgencyLevel?.toUpperCase() || 'MODERATE'}
          </Text>
        </View>
      </View>

      <View style={styles.requestBody}>
        <View style={styles.infoRow}>
          <Ionicons name="person" size={18} color="#64748B" />
          <Text style={styles.infoText}>{item.requesterName}</Text>
        </View>

        {item.patientName && (
          <View style={styles.infoRow}>
            <Ionicons name="medical" size={18} color="#64748B" />
            <Text style={styles.infoText}>Patient: {item.patientName}</Text>
          </View>
        )}

        {item.hospitalName && (
          <View style={styles.infoRow}>
            <Ionicons name="business" size={18} color="#64748B" />
            <Text style={styles.infoText}>{item.hospitalName}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Ionicons name="location" size={18} color="#64748B" />
          <Text style={styles.infoText}>{item.location.address || 'Location provided'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time" size={18} color="#64748B" />
          <Text style={styles.infoText}>
            {new Date(item.createdAt).toLocaleDateString()} at{' '}
            {new Date(item.createdAt).toLocaleTimeString()}
          </Text>
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleRejectRequest(item)}
        >
          <Ionicons name="close-circle" size={20} color="#EF4444" />
          <Text style={styles.rejectButtonText}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(item)}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.acceptButtonText}>Accept Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="file-tray-outline" size={80} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Blood Requests</Text>
      <Text style={styles.emptyText}>
        There are no active blood requests for your blood type at the moment.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1b8882ff" />
      <LinearGradient colors={['#1b8882ff', '#16b43eff']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Blood Requests</Text>
          <Text style={styles.headerSubtitle}>
            {requests.length} compatible request{requests.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'urgent' && styles.filterButtonActive]}
          onPress={() => setFilter('urgent')}
        >
          <Text style={[styles.filterText, filter === 'urgent' && styles.filterTextActive]}>
            Urgent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'moderate' && styles.filterButtonActive]}
          onPress={() => setFilter('moderate')}
        >
          <Text style={[styles.filterText, filter === 'moderate' && styles.filterTextActive]}>
            Moderate
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
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1b8882ff']} />
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Decline Request</Text>
              <TouchableOpacity onPress={() => setRejectionModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              You're about to decline this blood donation request. This will remove it from your list.
            </Text>

            <Text style={styles.inputLabel}>Reason (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Why are you declining this request?"
              placeholderTextColor="#94A3B8"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setRejectionModalVisible(false);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmRejectButton}
                onPress={confirmRejectRequest}
              >
                <Text style={styles.confirmRejectButtonText}>Decline Request</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterButtonActive: {
    backgroundColor: '#1b8882ff',
  },
  filterText: {
    fontSize: 14,
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
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  urgencyText: {
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
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  acceptButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  },
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
    minHeight: 100,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmRejectButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  confirmRejectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default RequestsScreen;