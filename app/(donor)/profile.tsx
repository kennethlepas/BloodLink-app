import { useImagePicker } from '@/hooks/useImagePicker';
import { LogoutModal } from '@/src/components/LogoutModal';
import { useUser } from '@/src/contexts/UserContext';
import { useCachedData } from '@/src/hooks/useCachedData';
import {
  getDonorAcceptedRequests,
  getDonorHistory,
  updateUser
} from '@/src/services/firebase/database';
import { getDonorEligibilityStatus } from '@/src/services/firebase/donationEligibilityService';
import { DonationRecord, Donor } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM - MODERN MEDICAL THEME
// ═══════════════════════════════════════════════════════════════════════════

const COLORS = {
  // Primary - Medical Blue
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  // Accent - Blood Red
  accent: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1A1A',
  },
  // Success - Medical Green
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  // Warning - Amber
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  // Neutrals
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  // Semantic
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  divider: '#F1F5F9',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
};

const TYPOGRAPHY = {
  xs: 11,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  display: 28,
};

const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

const createShadow = (elevation: number) => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0 ${elevation}px ${elevation * 2}px rgba(0,0,0,${0.08 + elevation * 0.01})`,
    } as any;
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: elevation },
    shadowOpacity: 0.08 + elevation * 0.01,
    shadowRadius: elevation * 2,
    elevation,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
  bgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color, bgColor }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconWrapper, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

interface DonationItemProps {
  donation: DonationRecord;
  onPress?: () => void;
}

const DonationListItem: React.FC<DonationItemProps> = ({ donation, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getLocationDisplay = () => {
    if (donation.bloodBankName) return donation.bloodBankName;
    if (donation.location?.address) return donation.location.address;
    if (donation.location?.city) return donation.location.city;
    return 'Medical Facility';
  };

  return (
    <TouchableOpacity
      style={styles.donationItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.donationIconWrapper}>
        <LinearGradient
          colors={[COLORS.accent[500], COLORS.accent[600]]}
          style={styles.donationIconGradient}
        >
          <Ionicons name="water" size={20} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <View style={styles.donationContent}>
        <Text style={styles.donationLocation} numberOfLines={1}>
          {getLocationDisplay()}
        </Text>
        <View style={styles.donationMeta}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.neutral[400]} />
          <Text style={styles.donationDate}>{formatDate(donation.donationDate)}</Text>
        </View>
      </View>
      <View style={styles.donationPoints}>
        <Ionicons name="star" size={14} color={COLORS.warning[500]} />
        <Text style={styles.donationPointsText}>+{donation.pointsEarned}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const DonorProfileScreen: React.FC = () => {
  const router = useRouter();
  const { user, logout, updateUserData } = useUser();
  const { pickAndUploadImage, takeAndUploadPhoto, uploading: imageUploading } = useImagePicker();

  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable || false);
  const [selectedDonation, setSelectedDonation] = useState<DonationRecord | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch active commitments (pending, in_progress, pending_verification)
  const {
    data: commitmentsData,
    loading: loadingCommitments,
    refresh: refreshCommitments
  } = useCachedData(
    `donor_commitments_${user?.id}`,
    () => getDonorAcceptedRequests(user!.id),
    { enabled: !!user }
  );

  // Fetch donation history
  const {
    data: historyData,
    loading: loadingHistory,
    refresh: refreshHistory
  } = useCachedData(
    `donor_history_${user?.id}`,
    () => getDonorHistory(user!.id),
    { enabled: !!user }
  );

  // Calculate active commitments count (matches home screen logic)
  const activeCommitments = useMemo(() =>
    (commitmentsData || []).filter(req =>
      ['pending', 'in_progress', 'pending_verification'].includes(req.status)
    ),
    [commitmentsData]
  );

  const donationHistory = historyData || [];
  const totalDonations = donationHistory.length;
  const totalPoints = donationHistory.reduce((sum, d) => sum + d.pointsEarned, 0);
  const pendingRequestsCount = activeCommitments.length; // This matches home screen's pending count

  const isDonor = (user: any): user is Donor => user?.userType === 'donor';
  const loading = loadingCommitments || loadingHistory;

  useEffect(() => {
    if (user) setIsAvailable(user.isAvailable || false);
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshCommitments(), refreshHistory()]);
    setRefreshing(false);
  };

  const [eligibility, setEligibility] = useState(getDonorEligibilityStatus(user?.lastDonationDate));

  const handleToggleAvailability = async () => {
    if (!user?.id) return;

    // 56-day rule enforcement
    const newAvailability = !isAvailable;
    if (newAvailability && user.lastDonationDate) {
      const status = getDonorEligibilityStatus(user.lastDonationDate);
      if (!status.isEligible) {
        Alert.alert(
          'Not Eligible Yet',
          status.message,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    try {
      setIsAvailable(newAvailability);

      await updateUser(user.id, { isAvailable: newAvailability });
      await updateUserData({ isAvailable: newAvailability });

      Alert.alert(
        'Status Updated',
        `You are now ${newAvailability ? 'available' : 'unavailable'} for blood donations`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error updating availability:', error);
      setIsAvailable(!isAvailable);
      Alert.alert('Error', 'Failed to update availability. Please try again.');
    } finally {
      setEligibility(getDonorEligibilityStatus(user?.lastDonationDate));
    }
  };

  const handleUpdateProfilePicture = () => {
    if (Platform.OS === 'web') {
      uploadImageFromGallery();
      return;
    }

    Alert.alert('Update Profile Picture', 'Choose an option', [
      { text: 'Take Photo', onPress: uploadImageFromCamera },
      { text: 'Choose from Gallery', onPress: uploadImageFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadImageFromGallery = async () => {
    if (!user?.id) return;

    try {
      const imageUrl = await pickAndUploadImage('bloodlink/profile_pictures');

      if (imageUrl) {
        await updateUser(user.id, { profilePicture: imageUrl });
        await updateUserData({ profilePicture: imageUrl });
        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (error) {
      console.error('Error uploading from gallery:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const uploadImageFromCamera = async () => {
    if (!user?.id) return;

    try {
      const imageUrl = await takeAndUploadPhoto('bloodlink/profile_pictures');

      if (imageUrl) {
        await updateUser(user.id, { profilePicture: imageUrl });
        await updateUserData({ profilePicture: imageUrl });
        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (error) {
      console.error('Error uploading from camera:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace('/(auth)/login' as any);
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
      setIsLoggingOut(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/(donor)/edit-profile' as any);
  };

  const getTotalLivesImpacted = () => {
    return totalDonations * 3; // Each donation saves up to 3 lives
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary[600]} />

      {/* Header with Gradient */}
      <LinearGradient
        colors={[COLORS.primary[600], COLORS.primary[700]]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerBadge}>DONOR PROFILE</Text>
            <Text style={styles.headerTitle}>My Health Dashboard</Text>
          </View>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/(shared)/settings' as any)}
          >
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary[500]]}
            tintColor={COLORS.primary[500]}
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={handleUpdateProfilePicture}
                disabled={imageUploading}
                activeOpacity={0.8}
              >
                {user.profilePicture ? (
                  <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={[COLORS.primary[100], COLORS.primary[200]]}
                    style={styles.avatarPlaceholder}
                  >
                    <Ionicons name="person" size={48} color={COLORS.primary[600]} />
                  </LinearGradient>
                )}
                <View style={styles.cameraOverlay}>
                  {imageUploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera" size={18} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.profileInfo}>
                <Text style={styles.userName}>
                  {user.firstName} {user.lastName}
                </Text>
                <View style={styles.badgeContainer}>
                  <View style={styles.bloodTypeBadge}>
                    <Ionicons name="water" size={14} color="#FFFFFF" />
                    <Text style={styles.bloodTypeText}>{user.bloodType}</Text>
                  </View>
                  {isDonor(user) && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={12} color={COLORS.success[600]} />
                      <Text style={styles.verifiedText}>Verified Donor</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.contactInfo}>
              <View style={styles.contactRow}>
                <View style={styles.contactIconWrapper}>
                  <Ionicons name="mail-outline" size={16} color={COLORS.primary[600]} />
                </View>
                <Text style={styles.contactText} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
              <View style={styles.contactRow}>
                <View style={styles.contactIconWrapper}>
                  <Ionicons name="call-outline" size={16} color={COLORS.primary[600]} />
                </View>
                <Text style={styles.contactText}>{user.phoneNumber}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={handleEditProfile}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.primary[600]} />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>




        {/* Statistics Grid - Matching HomeScreen Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impact Statistics</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="water"
              value={totalDonations}
              label="Total Donations"
              color={COLORS.accent[600]}
              bgColor={COLORS.accent[50]}
            />
            <StatCard
              icon="star"
              value={totalPoints}
              label="Impact Points"
              color={COLORS.warning[600]}
              bgColor={COLORS.warning[50]}
            />
            <StatCard
              icon="time"
              value={pendingRequestsCount}
              label="Pending Requests"
              color={COLORS.primary[600]}
              bgColor={COLORS.primary[50]}
            />
          </View>
        </View>

        {/* Additional Stats - Lives Impacted */}
        <View style={styles.section}>
          <View style={styles.livesImpactedCard}>
            <LinearGradient
              colors={[COLORS.success[500], COLORS.success[600]]}
              style={styles.livesImpactedGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="heart" size={28} color="#FFFFFF" />
              <View style={styles.livesImpactedInfo}>
                <Text style={styles.livesImpactedLabel}>LIVES IMPACTED</Text>
                <Text style={styles.livesImpactedValue}>{getTotalLivesImpacted()}</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Last Donation Info */}
        {user.lastDonationDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.lastDonationCard}>
              <View style={styles.lastDonationIcon}>
                <Ionicons name="time-outline" size={28} color={COLORS.primary[600]} />
              </View>
              <View style={styles.lastDonationInfo}>
                <Text style={styles.lastDonationLabel}>LAST DONATION</Text>
                <Text style={styles.lastDonationDate}>
                  {new Date(user.lastDonationDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Donation History Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Donation History</Text>
            <View style={styles.historyCountBadge}>
              <Text style={styles.historyCountText}>{totalDonations}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary[500]} />
              <Text style={styles.loadingText}>Loading history...</Text>
            </View>
          ) : donationHistory.length > 0 ? (
            <View style={styles.historyList}>
              {donationHistory.map((donation) => (
                <DonationListItem
                  key={donation.id}
                  donation={donation}
                  onPress={() => setSelectedDonation(donation)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <LinearGradient
                  colors={[COLORS.primary[50], COLORS.primary[100]]}
                  style={styles.emptyIcon}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={52}
                    color={COLORS.primary[400]}
                  />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>No Donations Yet</Text>
              <Text style={styles.emptySubtitle}>
                Your donation records will appear here once you start contributing
              </Text>
            </View>
          )}
        </View>

        {/* Donation Status Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Donation Status</Text>
          <TouchableOpacity
            style={[styles.statusCard, { borderColor: eligibility.isEligible ? COLORS.success[200] : COLORS.warning[200] }]}
            onPress={handleToggleAvailability}
            activeOpacity={0.8}
          >
            <View style={[styles.statusIcon, { backgroundColor: eligibility.isEligible ? COLORS.success[50] : COLORS.warning[50] }]}>
              <Ionicons
                name={eligibility.isEligible ? "checkmark-circle" : "time"}
                size={24}
                color={eligibility.isEligible ? COLORS.success[600] : COLORS.warning[600]}
              />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusSubtitle}>Current Eligibility</Text>
              <Text style={[styles.statusTitle, { color: eligibility.isEligible ? COLORS.success[700] : COLORS.warning[700] }]}>
                {eligibility.message}
              </Text>
            </View>
            <View style={[styles.toggleSwitch, isAvailable && styles.toggleSwitchActive]}>
              <View style={[styles.toggleKnob, isAvailable && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(donor)/requests' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.primary[50] }]}>
                <Ionicons name="notifications-outline" size={24} color={COLORS.primary[600]} />
              </View>
              <Text style={styles.actionTitle}>Blood Requests</Text>
              <Text style={styles.actionSubtitle}>View active needs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(donor)/donation-history' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.accent[50] }]}>
                <Ionicons name="time-outline" size={24} color={COLORS.accent[600]} />
              </View>
              <Text style={styles.actionTitle}>My History</Text>
              <Text style={styles.actionSubtitle}>View all donations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => Alert.alert('Coming Soon', 'Certificates will be available soon')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.warning[50] }]}>
                <Ionicons name="ribbon-outline" size={24} color={COLORS.warning[600]} />
              </View>
              <Text style={styles.actionTitle}>Certificates</Text>
              <Text style={styles.actionSubtitle}>View achievements</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.accent[600]} />
            <Text style={styles.logoutText}>Logout from Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Donation Detail Modal */}
      <Modal
        visible={!!selectedDonation}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDonation(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Donation Details</Text>
              <TouchableOpacity
                onPress={() => setSelectedDonation(null)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={22} color={COLORS.neutral[500]} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedDonation && (
                <View style={styles.modalBody}>
                  <View style={styles.modalDonationIcon}>
                    <LinearGradient
                      colors={[COLORS.accent[500], COLORS.accent[600]]}
                      style={styles.modalDonationGradient}
                    >
                      <Ionicons name="water" size={32} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Location</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedDonation.bloodBankName || selectedDonation.location?.address || 'Medical Facility'}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Date & Time</Text>
                    <Text style={styles.modalInfoValue}>
                      {new Date(selectedDonation.donationDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Blood Type</Text>
                    <Text style={styles.modalInfoValue}>{selectedDonation.bloodType}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Component</Text>
                    <Text style={styles.modalInfoValue}>{selectedDonation.bloodComponent || 'Whole Blood'}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Units Donated</Text>
                    <Text style={styles.modalInfoValue}>{selectedDonation.unitsCollected || 1}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Points Earned</Text>
                    <Text style={[styles.modalInfoValue, styles.pointsHighlight]}>
                      +{selectedDonation.pointsEarned}
                    </Text>
                  </View>
                  {selectedDonation.notes && (
                    <View style={styles.modalNotes}>
                      <Text style={styles.modalInfoLabel}>Notes</Text>
                      <Text style={styles.modalNotesText}>{selectedDonation.notes}</Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <LogoutModal
        visible={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onLogout={handleConfirmLogout}
        isLoggingOut={isLoggingOut}
      />
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBadge: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: SPACING.xs,
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.display,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollView: {
    flex: 1,
  },

  // Profile Section
  profileSection: {
    paddingHorizontal: SPACING.xl,
    marginTop: -SPACING.xxxl,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...createShadow(4),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    borderWidth: 3,
    borderColor: COLORS.primary[100],
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
    ...createShadow(2),
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: '700',
    color: COLORS.neutral[900],
    marginBottom: SPACING.sm,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bloodTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.accent[600],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  bloodTypeText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.success[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.success[200],
  },
  verifiedText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '600',
    color: COLORS.success[700],
  },
  contactInfo: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  contactIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '500',
    color: COLORS.neutral[700],
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    borderWidth: 1.5,
    borderColor: COLORS.primary[200],
  },
  editProfileText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '600',
    color: COLORS.primary[700],
  },

  // Section
  section: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: '700',
    color: COLORS.neutral[900],
    marginBottom: SPACING.md,
  },

  // Status Card
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...createShadow(2),
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '700',
    color: COLORS.neutral[900],
    marginBottom: SPACING.xs,
  },
  statusSubtitle: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '500',
    color: COLORS.neutral[500],
  },
  toggleSwitch: {
    width: 52,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.neutral[200],
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.success[500],
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    ...createShadow(1),
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...createShadow(1),
  },
  statIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: TYPOGRAPHY.xxl,
    fontWeight: '800',
    color: COLORS.neutral[900],
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '500',
    color: COLORS.neutral[500],
    textAlign: 'center',
  },

  // Lives Impacted Card
  livesImpactedCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...createShadow(4),
  },
  livesImpactedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  livesImpactedInfo: {
    flex: 1,
  },
  livesImpactedLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  livesImpactedValue: {
    fontSize: TYPOGRAPHY.display,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Last Donation Card
  lastDonationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...createShadow(1),
  },
  lastDonationIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastDonationInfo: {
    flex: 1,
  },
  lastDonationLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '600',
    color: COLORS.neutral[500],
    marginBottom: SPACING.xs,
    letterSpacing: 0.5,
  },
  lastDonationDate: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '700',
    color: COLORS.neutral[900],
  },

  // History
  historyCountBadge: {
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  historyCountText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '700',
    color: COLORS.primary[700],
  },
  historyList: {
    gap: SPACING.sm,
  },
  donationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  donationIconWrapper: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginRight: SPACING.md,
  },
  donationIconGradient: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donationContent: {
    flex: 1,
  },
  donationLocation: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '600',
    color: COLORS.neutral[900],
    marginBottom: SPACING.xs,
  },
  donationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  donationDate: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '500',
    color: COLORS.neutral[500],
  },
  donationPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.warning[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  donationPointsText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '700',
    color: COLORS.warning[700],
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    ...createShadow(1),
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '700',
    color: COLORS.neutral[900],
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '500',
    color: COLORS.neutral[500],
    textAlign: 'center',
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent[50],
    borderWidth: 1.5,
    borderColor: COLORS.accent[200],
  },
  logoutText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '600',
    color: COLORS.accent[700],
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.huge,
  },
  emptyIconWrapper: {
    marginBottom: SPACING.xl,
  },
  emptyIcon: {
    width: 112,
    height: 112,
    borderRadius: RADIUS.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: '700',
    color: COLORS.neutral[900],
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '500',
    color: COLORS.neutral[500],
    textAlign: 'center',
    paddingHorizontal: SPACING.xxxl,
  },

  // Loading
  loadingContainer: {
    paddingVertical: SPACING.xxxl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '500',
    color: COLORS.neutral[500],
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 48,
    height: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: '700',
    color: COLORS.neutral[900],
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingBottom: SPACING.xxxl,
  },
  modalDonationIcon: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  modalDonationGradient: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInfoRow: {
    marginBottom: SPACING.lg,
  },
  modalInfoLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '600',
    color: COLORS.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  modalInfoValue: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '600',
    color: COLORS.neutral[900],
  },
  pointsHighlight: {
    color: COLORS.warning[600],
    fontSize: TYPOGRAPHY.lg,
    fontWeight: '800',
  },
  modalNotes: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalNotesText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '500',
    color: COLORS.neutral[700],
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 100,
  },
});

export default DonorProfileScreen;