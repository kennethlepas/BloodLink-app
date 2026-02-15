import { useImagePicker } from '@/hooks/useImagePicker';
import { useUser } from '@/src/contexts/UserContext';
import { getDonorHistory, updateUser } from '@/src/services/firebase/database';
import { DonationRecord, Donor } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS - HOSPITAL THEME (DONOR - BLUE ACCENT)
// ═══════════════════════════════════════════════════════════════════════════

const COLORS = {
  // Primary - Medical Blue
  primary50: '#EFF6FF',
  primary100: '#DBEAFE',
  primary200: '#BFDBFE',
  primary500: '#3B82F6',
  primary600: '#2563EB',
  primary700: '#1D4ED8',

  // Accent - Blood Red
  accent50: '#FEF2F2',
  accent100: '#FEE2E2',
  accent200: '#FECACA',
  accent500: '#EF4444',
  accent600: '#DC2626',
  accent700: '#B91C1C',

  // Success - Medical Green
  success50: '#F0FDF4',
  success100: '#DCFCE7',
  success200: '#BBF7D0',
  success500: '#22C55E',
  success600: '#16A34A',
  success700: '#15803D',

  // Warning - Amber
  warning50: '#FFFBEB',
  warning100: '#FEF3C7',
  warning200: '#FDE68A',
  warning500: '#F59E0B',
  warning600: '#D97706',
  warning700: '#B45309',

  // Neutrals
  neutral50: '#F8FAFC',
  neutral100: '#F1F5F9',
  neutral200: '#E2E8F0',
  neutral400: '#94A3B8',
  neutral500: '#64748B',
  neutral600: '#475569',
  neutral700: '#334155',
  neutral800: '#1E293B',
  neutral900: '#0F172A',

  // Semantic
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  divider: '#F1F5F9',
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
};

const TYPOGRAPHY = {
  xs: 11,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
};

const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
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
// REUSABLE COMPONENTS
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
}

const DonationItem: React.FC<DonationItemProps> = ({ donation }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getLocationDisplay = () => {
    if (donation.bloodBankName) return donation.bloodBankName;
    if (donation.location?.address) return donation.location.address;
    if (donation.location?.city) return donation.location.city;
    return 'Medical Facility';
  };

  return (
    <View style={styles.donationItem}>
      <View style={styles.donationLeft}>
        <View style={styles.donationIconContainer}>
          <LinearGradient
            colors={[COLORS.accent500, COLORS.accent600]}
            style={styles.donationIconGradient}
          >
            <Ionicons name="water" size={20} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <View style={styles.donationInfo}>
          <Text style={styles.donationLocation} numberOfLines={1}>
            {getLocationDisplay()}
          </Text>
          <View style={styles.donationMeta}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.neutral500} />
            <Text style={styles.donationDate}>{formatDate(donation.donationDate)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.donationPoints}>
        <Ionicons name="star" size={14} color={COLORS.warning600} />
        <Text style={styles.donationPointsText}>+{donation.pointsEarned}</Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const DonorProfileScreen: React.FC = () => {
  const router = useRouter();
  const { user, logout, updateUserData } = useUser();
  const { pickAndUploadImage, takeAndUploadPhoto, uploading: imageUploading } = useImagePicker();

  const [donationHistory, setDonationHistory] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable || false);

  const isDonor = (user: any): user is Donor => user?.userType === 'donor';

  useEffect(() => {
    loadDonationHistory();
  }, [user]);

  useEffect(() => {
    if (user) setIsAvailable(user.isAvailable || false);
  }, [user]);

  const loadDonationHistory = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const history = await getDonorHistory(user.id);
      setDonationHistory(history);
    } catch (error) {
      console.error('Error loading donation history:', error);
      Alert.alert('Error', 'Failed to load donation history');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDonationHistory();
    setRefreshing(false);
  };

  const handleToggleAvailability = async () => {
    if (!user?.id) return;

    try {
      const newAvailability = !isAvailable;
      setIsAvailable(newAvailability);

      await updateUser(user.id, { isAvailable: newAvailability });
      await updateUserData({ isAvailable: newAvailability });

      Alert.alert(
        'Availability Updated',
        `You are now ${newAvailability ? 'available' : 'unavailable'} for blood donations`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error updating availability:', error);
      setIsAvailable(!isAvailable);
      Alert.alert('Error', 'Failed to update availability. Please try again.');
    }
  };

  const handleProfilePictureUpdate = () => {
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
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/login' as any);
          } catch (error) {
            console.error('Logout error:', error);
          }
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    router.push('/(donor)/edit-profile' as any);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary600} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary600, COLORS.primary700]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerSubtitle}>DONOR DASHBOARD</Text>
            <Text style={styles.headerTitle}>My Health Profile</Text>
          </View>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => Alert.alert('Settings', 'Settings coming soon')}
          >
            <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
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
            colors={[COLORS.primary600]}
            tintColor={COLORS.primary600}
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                style={styles.avatarWrapper}
                onPress={handleProfilePictureUpdate}
                disabled={imageUploading}
                activeOpacity={0.8}
              >
                {user.profilePicture ? (
                  <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={[COLORS.primary100, COLORS.primary200]}
                    style={styles.avatarPlaceholder}
                  >
                    <Ionicons name="person" size={44} color={COLORS.primary600} />
                  </LinearGradient>
                )}
                <View style={styles.cameraButton}>
                  {imageUploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>

              {/* Name and Blood Type */}
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>
                  {user.firstName} {user.lastName}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={styles.bloodTypeBadge}>
                    <Ionicons name="water" size={16} color="#FFFFFF" />
                    <Text style={styles.bloodTypeText}>{user.bloodType}</Text>
                  </View>
                  {isDonor(user) && user.medicalHistory && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={14} color={COLORS.success600} />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Contact Info */}
            <View style={styles.contactSection}>
              <View style={styles.contactItem}>
                <View style={styles.contactIcon}>
                  <Ionicons name="mail" size={16} color={COLORS.primary600} />
                </View>
                <Text style={styles.contactText} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
              <View style={styles.contactItem}>
                <View style={styles.contactIcon}>
                  <Ionicons name="call" size={16} color={COLORS.primary600} />
                </View>
                <Text style={styles.contactText}>{user.phoneNumber}</Text>
              </View>
            </View>

            {/* Edit Button */}
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditProfile}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.primary600} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Availability Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Donation Status</Text>
          <View style={styles.availabilityCard}>
            <View style={styles.availabilityContent}>
              <View
                style={[
                  styles.availabilityIcon,
                  {
                    backgroundColor: isAvailable
                      ? COLORS.success50
                      : COLORS.neutral100,
                  },
                ]}
              >
                <Ionicons
                  name={isAvailable ? 'checkmark-circle' : 'close-circle'}
                  size={28}
                  color={isAvailable ? COLORS.success600 : COLORS.neutral500}
                />
              </View>
              <View style={styles.availabilityInfo}>
                <Text style={styles.availabilityTitle}>
                  {isAvailable ? 'Available to Donate' : 'Currently Unavailable'}
                </Text>
                <Text style={styles.availabilitySubtitle}>
                  {isAvailable
                    ? 'Visible to requesters needing blood'
                    : 'Hidden from donor searches'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  isAvailable && styles.toggleActive,
                ]}
                onPress={handleToggleAvailability}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.toggleCircle,
                    isAvailable && styles.toggleCircleActive,
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Statistics</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="water"
              value={isDonor(user) ? user.totalDonations || 0 : 0}
              label="Total Donations"
              color={COLORS.accent600}
              bgColor={COLORS.accent50}
            />
            <StatCard
              icon="star"
              value={user.points || 0}
              label="Impact Points"
              color={COLORS.warning600}
              bgColor={COLORS.warning50}
            />
            <StatCard
              icon="heart"
              value={isDonor(user) ? `${(user.totalDonations || 0) * 3}` : '0'}
              label="Lives Impacted"
              color={COLORS.success600}
              bgColor={COLORS.success50}
            />
          </View>
        </View>

        {/* Last Donation */}
        {user.lastDonationDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last Donation</Text>
            <View style={styles.lastDonationCard}>
              <View style={styles.lastDonationIcon}>
                <Ionicons name="time" size={24} color={COLORS.primary600} />
              </View>
              <View style={styles.lastDonationInfo}>
                <Text style={styles.lastDonationLabel}>MOST RECENT CONTRIBUTION</Text>
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

        {/* Donation History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Donation History</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{donationHistory.length}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary600} />
              <Text style={styles.loadingText}>Loading history...</Text>
            </View>
          ) : donationHistory.length > 0 ? (
            <View style={styles.historyList}>
              {donationHistory.map((donation) => (
                <DonationItem key={donation.id} donation={donation} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <LinearGradient
                  colors={[COLORS.primary50, COLORS.primary100]}
                  style={styles.emptyIcon}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={48}
                    color={COLORS.primary600}
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

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(donor)/requests' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.primary50 }]}>
                <Ionicons name="list" size={22} color={COLORS.primary600} />
              </View>
              <Text style={styles.actionTitle}>Blood Requests</Text>
              <Text style={styles.actionSubtitle}>View active needs</Text>
              <View style={styles.actionArrow}>
                <Ionicons name="arrow-forward" size={18} color={COLORS.neutral400} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                Alert.alert('Coming Soon', 'Donation certificates will be available soon')
              }
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.warning50 }]}>
                <Ionicons name="ribbon" size={22} color={COLORS.warning600} />
              </View>
              <Text style={styles.actionTitle}>Certificates</Text>
              <Text style={styles.actionSubtitle}>View achievements</Text>
              <View style={styles.actionArrow}>
                <Ionicons name="arrow-forward" size={18} color={COLORS.neutral400} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.accent600} />
            <Text style={styles.logoutText}>Logout from Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.xxxl,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerButton: {
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
    marginTop: -SPACING.xxl,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...createShadow(5),
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: COLORS.primary100,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary600,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
    ...createShadow(3),
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: '700',
    color: COLORS.neutral900,
    marginBottom: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bloodTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent600,
    paddingHorizontal: 14,
    paddingVertical: 6,
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
    gap: 4,
    backgroundColor: COLORS.success50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.success200,
  },
  verifiedText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '600',
    color: COLORS.success700,
  },
  contactSection: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '500',
    color: COLORS.neutral700,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary50,
    borderWidth: 1.5,
    borderColor: COLORS.primary200,
  },
  editButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '600',
    color: COLORS.primary700,
  },

  // Sections
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
    color: COLORS.neutral900,
    marginBottom: SPACING.md,
  },

  // Availability
  availabilityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...createShadow(3),
  },
  availabilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  availabilityIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availabilityInfo: {
    flex: 1,
  },
  availabilityTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '700',
    color: COLORS.neutral900,
    marginBottom: 2,
  },
  availabilitySubtitle: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '500',
    color: COLORS.neutral500,
  },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.neutral200,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.success500,
  },
  toggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    ...createShadow(1),
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },

  // Stats
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
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: '800',
    color: COLORS.neutral900,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '500',
    color: COLORS.neutral500,
    textAlign: 'center',
  },

  // Last Donation
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
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastDonationInfo: {
    flex: 1,
  },
  lastDonationLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '600',
    color: COLORS.neutral500,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  lastDonationDate: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '700',
    color: COLORS.neutral900,
  },

  // History
  countBadge: {
    backgroundColor: COLORS.primary50,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary200,
  },
  countText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '700',
    color: COLORS.primary700,
  },
  historyList: {
    gap: SPACING.sm,
  },
  donationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  donationLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  donationIconContainer: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  donationIconGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donationInfo: {
    flex: 1,
  },
  donationLocation: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '600',
    color: COLORS.neutral900,
    marginBottom: 4,
  },
  donationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  donationDate: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '500',
    color: COLORS.neutral500,
  },
  donationPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warning50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  donationPointsText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '700',
    color: COLORS.warning700,
  },

  // Actions
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
    ...createShadow(1),
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '700',
    color: COLORS.neutral900,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '500',
    color: COLORS.neutral500,
    marginBottom: SPACING.sm,
  },
  actionArrow: {
    alignSelf: 'flex-start',
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent50,
    borderWidth: 1.5,
    borderColor: COLORS.accent200,
  },
  logoutText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '600',
    color: COLORS.accent700,
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
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: '700',
    color: COLORS.neutral900,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '500',
    color: COLORS.neutral500,
    textAlign: 'center',
    paddingHorizontal: SPACING.xxl,
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
    color: COLORS.neutral500,
  },

  bottomSpacer: {
    height: SPACING.huge,
  },
});

export default DonorProfileScreen;