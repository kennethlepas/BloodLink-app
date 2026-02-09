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

const DonationHistoryScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  
  // Active commitments
  const [acceptedRequests, setAcceptedRequests] = useState<AcceptedRequest[]>([]);
  
  // History
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'thisYear' | 'lastYear'>('all');
  
  // Modal states
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [selectedCommitment, setSelectedCommitment] = useState<AcceptedRequest | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [donationNotes, setDonationNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load active commitments (including pending_verification)
      const activeCommitments = await getDonorAcceptedRequests(user.id);
      const pending = activeCommitments.filter(
        req => req.status === 'pending' || req.status === 'in_progress' || req.status === 'pending_verification'
      );
      setAcceptedRequests(pending);
      
      console.log('Loaded active commitments:', pending.length);
      
      // Load donation history (only completed/verified)
      const donorHistory = await getDonorHistory(user.id);
      setDonations(donorHistory);
      
      console.log('Loaded donation history:', donorHistory.length);
    } catch (error) {
      console.error('Error loading data:', error);
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
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    switch (filter) {
      case 'thisYear':
        return donations.filter(
          (donation) =>
            new Date(donation.donationDate).getFullYear() === currentYear
        );
      case 'lastYear':
        return donations.filter(
          (donation) =>
            new Date(donation.donationDate).getFullYear() === lastYear
        );
      default:
        return donations;
    }
  };

  const filteredDonations = getFilteredDonations();

  const getTotalDonations = () => filteredDonations.length;
  const getTotalPoints = () =>
    filteredDonations.reduce((sum, donation) => sum + donation.pointsEarned, 0);
  const getTotalUnits = () =>
    filteredDonations.reduce((sum, donation) => sum + (donation.unitsCollected || 1), 0);

  // Handle commitment actions
  const handleStartCommitment = async (commitment: AcceptedRequest) => {
    try {
      await startAcceptedRequest(commitment.id);
      Alert.alert('Success', 'Commitment marked as in progress!');
      await loadData();
    } catch (error) {
      console.error('Error starting commitment:', error);
      Alert.alert('Error', 'Failed to update commitment.');
    }
  };

  const handleCancelCommitment = (commitment: AcceptedRequest) => {
    setSelectedCommitment(commitment);
    setCancelModalVisible(true);
  };

  const confirmCancelCommitment = async () => {
    if (!selectedCommitment) return;

    if (!cancellationReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for cancellation.');
      return;
    }

    try {
      await cancelAcceptedRequest(selectedCommitment.id, cancellationReason);
      
      // Notify requester
      await createNotification({
        userId: selectedCommitment.requesterId,
        type: 'system_alert',
        title: 'Donation Cancelled',
        message: `${user?.firstName} ${user?.lastName} has cancelled their commitment. Reason: ${cancellationReason}`,
        data: {
          acceptedRequestId: selectedCommitment.id,
          requestId: selectedCommitment.requestId,
        },
        isRead: false,
        timestamp: ''
      });
      
      setCancelModalVisible(false);
      setSelectedCommitment(null);
      setCancellationReason('');
      Alert.alert('Cancelled', 'Commitment has been cancelled and the requester has been notified.');
      await loadData();
    } catch (error) {
      console.error('Error cancelling commitment:', error);
      Alert.alert('Error', 'Failed to cancel commitment.');
    }
  };

  const handleCompleteCommitment = (commitment: AcceptedRequest) => {
    setSelectedCommitment(commitment);
    setCompleteModalVisible(true);
  };

  const confirmCompleteCommitment = async () => {
    if (!user || !selectedCommitment) return;

    try {
      // Mark as pending verification instead of completing immediately
      await markDonationPendingVerification(
        selectedCommitment.id,
        donationNotes || undefined
      );

      // Send notification to requester
      await createNotification({
        userId: selectedCommitment.requesterId,
        type: 'verify_donation',
        title: 'Verify Donation',
        message: `${user.firstName} ${user.lastName} has marked the donation as complete. Please verify that you received the blood.`,
        data: {
          acceptedRequestId: selectedCommitment.id,
          donorId: user.id,
          requestId: selectedCommitment.requestId,
        },
        isRead: false,
        timestamp: ''
      });

      setCompleteModalVisible(false);
      setSelectedCommitment(null);
      setDonationNotes('');
      
      Alert.alert(
        'Awaiting Verification',
        'The requester has been notified to verify your donation. You will receive points once verified.',
        [{ text: 'OK' }]
      );
      
      await loadData();
    } catch (error) {
      console.error('Error marking donation complete:', error);
      Alert.alert('Error', 'Failed to complete donation.');
    }
  };

  const handleOpenChat = (chatId: string) => {
    router.push(`/(donor)/chat?chatId=${chatId}` as any);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return '#EF4444';
      case 'urgent':
        return '#F59E0B';
      case 'moderate':
        return '#10B981';
      default:
        return '#64748B';
    }
  };

  const getUrgencyBgColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return '#FEE2E2';
      case 'urgent':
        return '#FEF3C7';
      case 'moderate':
        return '#D1FAE5';
      default:
        return '#F1F5F9';
    }
  };

  // Render Active Commitment Item
  const renderCommitmentItem = ({ item }: { item: AcceptedRequest }) => (
    <View style={styles.commitmentCard}>
      <View style={styles.commitmentHeader}>
        <View style={styles.bloodTypeContainer}>
          <Ionicons name="water" size={24} color="#EF4444" />
          <Text style={styles.bloodType}>{item.bloodType}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { 
            backgroundColor: 
              item.status === 'in_progress' ? '#DBEAFE' : 
              item.status === 'pending_verification' ? '#FEF3C7' :
              '#FEF3C7' 
          }
        ]}>
          <Text style={[
            styles.statusText,
            { 
              color: 
                item.status === 'in_progress' ? '#3B82F6' : 
                item.status === 'pending_verification' ? '#F59E0B' :
                '#F59E0B' 
            }
          ]}>
            {item.status === 'in_progress' ? 'IN PROGRESS' : 
             item.status === 'pending_verification' ? 'AWAITING VERIFICATION' :
             'PENDING'}
          </Text>
        </View>
      </View>

      <View style={styles.commitmentBody}>
        {/* Patient Info */}
        <View style={styles.infoRow}>
          <Ionicons name="person" size={18} color="#64748B" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Patient</Text>
            <Text style={styles.infoValue}>{item.patientName}</Text>
          </View>
        </View>

        {/* Hospital Info */}
        <View style={styles.infoRow}>
          <Ionicons name="business" size={18} color="#64748B" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Hospital</Text>
            <Text style={styles.infoValue}>{item.hospitalName}</Text>
            {item.hospitalAddress && (
              <Text style={styles.infoSubtext} numberOfLines={2}>
                {item.hospitalAddress}
              </Text>
            )}
          </View>
        </View>

        {/* Requester Contact */}
        <View style={styles.infoRow}>
          <Ionicons name="call" size={18} color="#64748B" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Requester</Text>
            <Text style={styles.infoValue}>{item.requesterName}</Text>
            <Text style={styles.infoSubtext}>{item.requesterPhone}</Text>
          </View>
        </View>

        {/* Units and Urgency */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="flask" size={18} color="#8B5CF6" />
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Units</Text>
              <Text style={styles.statValue}>{item.unitsNeeded}</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons 
              name={item.urgencyLevel === 'critical' ? 'warning' : 
                    item.urgencyLevel === 'urgent' ? 'alert-circle' : 
                    'information-circle'} 
              size={18} 
              color={getUrgencyColor(item.urgencyLevel)} 
            />
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Urgency</Text>
              <Text style={[styles.statValue, { color: getUrgencyColor(item.urgencyLevel) }]}>
                {item.urgencyLevel.charAt(0).toUpperCase() + item.urgencyLevel.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Accepted Date */}
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={18} color="#64748B" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Accepted On</Text>
            <Text style={styles.infoValue}>{formatDate(item.acceptedDate)}</Text>
          </View>
        </View>

        {/* Additional Notes */}
        {item.notes && (
          <View style={styles.notesContainer}>
            <Ionicons name="document-text" size={16} color="#64748B" />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
        
        {/* Verification Notice */}
        {item.status === 'pending_verification' && (
          <View style={styles.verificationNotice}>
            <Ionicons name="time-outline" size={18} color="#F59E0B" />
            <Text style={styles.verificationText}>
              Waiting for requester to verify your donation
            </Text>
          </View>
        )}
      </View>

      <View style={styles.commitmentActions}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => handleOpenChat(item.chatId)}
        >
          <Ionicons name="chatbubble" size={18} color="#3B82F6" />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>

        {item.status === 'pending' && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => handleStartCommitment(item)}
          >
            <Ionicons name="play" size={18} color="#10B981" />
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        )}

        {/* Only show Complete button if not pending verification */}
        {item.status !== 'pending_verification' && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleCompleteCommitment(item)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancelCommitment(item)}
        >
          <Ionicons name="close-circle" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render Donation History Item
  const renderDonationItem = ({ item }: { item: DonationRecord }) => (
    <View style={styles.donationCard}>
      <View style={styles.donationHeader}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar" size={20} color="#3B82F6" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateText}>
              {new Date(item.donationDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <Text style={styles.timeText}>
              {new Date(item.donationDate).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
        <View style={styles.pointsBadge}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.pointsText}>+{item.pointsEarned} pts</Text>
        </View>
      </View>

      <View style={styles.donationBody}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="business" size={18} color="#64748B" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {item.bloodBankName || item.location?.address || 'Not specified'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="water" size={18} color="#EF4444" />
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Blood Type</Text>
              <Text style={styles.statValue}>{item.bloodType}</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="flask" size={18} color="#8B5CF6" />
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Units</Text>
              <Text style={styles.statValue}>{item.unitsCollected || 1}</Text>
            </View>
          </View>
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <Ionicons name="document-text" size={16} color="#64748B" />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>

      {item.certificateUrl && (
        <TouchableOpacity style={styles.certificateButton}>
          <Ionicons name="download" size={18} color="#3B82F6" />
          <Text style={styles.certificateText}>Download Certificate</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmptyCommitments = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart-outline" size={80} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No Active Commitments</Text>
      <Text style={styles.emptyText}>
        You haven't accepted any blood requests yet. Start by finding requests that match your blood type.
      </Text>
      <TouchableOpacity
        style={styles.findRequestsButton}
        onPress={() => router.push('/(donor)/requests' as any)}
      >
        <Ionicons name="search" size={20} color="#FFFFFF" />
        <Text style={styles.findRequestsButtonText}>Find Blood Requests</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyHistory = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="time-outline" size={80} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No Donation History</Text>
      <Text style={styles.emptyText}>
        Complete your active commitments to build your donation history.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
      
      {/* Header */}
      <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Donations</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Stats Summary (show on both tabs) */}
        {donations.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="water" size={24} color="#FFFFFF" />
              <Text style={styles.statCardValue}>{getTotalDonations()}</Text>
              <Text style={styles.statCardLabel}>Donations</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="flask" size={24} color="#FFFFFF" />
              <Text style={styles.statCardValue}>{getTotalUnits()}</Text>
              <Text style={styles.statCardLabel}>Units</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color="#FFFFFF" />
              <Text style={styles.statCardValue}>{getTotalPoints()}</Text>
              <Text style={styles.statCardLabel}>Points</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Ionicons 
            name="time" 
            size={20} 
            color={activeTab === 'active' ? '#3B82F6' : '#64748B'} 
          />
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({acceptedRequests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons 
            name="time-outline" 
            size={20} 
            color={activeTab === 'history' ? '#3B82F6' : '#64748B'} 
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History ({donations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Buttons (only for history tab) */}
      {activeTab === 'history' && donations.length > 0 && (
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'all' && styles.filterTextActive,
              ]}
            >
              All Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'thisYear' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('thisYear')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'thisYear' && styles.filterTextActive,
              ]}
            >
              This Year
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'lastYear' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('lastYear')}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'lastYear' && styles.filterTextActive,
              ]}
            >
              Last Year
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'active' ? (
            <FlatList
              data={acceptedRequests}
              renderItem={renderCommitmentItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={renderEmptyCommitments}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#3B82F6']}
                  tintColor="#3B82F6"
                />
              }
            />
          ) : (
            <FlatList
              data={filteredDonations}
              renderItem={renderDonationItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={renderEmptyHistory}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#3B82F6']}
                  tintColor="#3B82F6"
                />
              }
            />
          )}
        </>
      )}

      {/* Cancel Commitment Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Commitment</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Are you sure you want to cancel this commitment? The requester will be notified.
            </Text>

            <Text style={styles.inputLabel}>Reason for Cancellation *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Please provide a reason..."
              placeholderTextColor="#94A3B8"
              value={cancellationReason}
              onChangeText={setCancellationReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setCancelModalVisible(false);
                  setCancellationReason('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Keep Commitment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmCancelCommitment}
              >
                <Text style={styles.modalConfirmButtonText}>Cancel Commitment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Donation Modal */}
      <Modal
        visible={completeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCompleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Donation</Text>
              <TouchableOpacity onPress={() => setCompleteModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Congratulations on completing your donation! Please add any additional notes.
            </Text>

            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="How did it go? Any notes to add..."
              placeholderTextColor="#94A3B8"
              value={donationNotes}
              onChangeText={setDonationNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setCompleteModalVisible(false);
                  setDonationNotes('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCompleteButton}
                onPress={confirmCompleteCommitment}
              >
                <Text style={styles.modalCompleteButtonText}>Mark Complete</Text>
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
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  verificationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginTop: 8,
  },
  verificationText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#3B82F6',
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
    backgroundColor: '#3B82F6',
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
  // Commitment Card Styles
  commitmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  commitmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  commitmentBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  infoSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  commitmentActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  completeButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cancelButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  // Donation Card Styles
  donationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  donationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateTextContainer: {
    flexDirection: 'column',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  donationBody: {
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  certificateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  certificateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  findRequestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  findRequestsButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalCompleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  modalCompleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default DonationHistoryScreen;