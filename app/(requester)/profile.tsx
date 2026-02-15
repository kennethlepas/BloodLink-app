import { useImagePicker } from '@/hooks/useImagePicker';
import { useUser } from '@/src/contexts/UserContext';
import { getUserBloodRequests, updateUser } from '@/src/services/firebase/database';
import { BloodRequest } from '@/src/types/types';
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
// DESIGN TOKENS - HOSPITAL THEME (REQUESTER - TEAL ACCENT)
// ═══════════════════════════════════════════════════════════════════════════

const COLORS = {
  // Primary - Medical Teal (Requester theme)
  primary50: '#F0FDFA',
  primary100: '#CCFBF1',
  primary200: '#99F6E4',
  primary500: '#14B8A6',
  primary600: '#0D9488',
  primary700: '#0F766E',

  // Secondary - Medical Blue
  secondary50: '#EFF6FF',
  secondary100: '#DBEAFE',
  secondary200: '#BFDBFE',
  secondary500: '#3B82F6',
  secondary600: '#2563EB',
  secondary700: '#1D4ED8',

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

interface RequestItemProps {
  request: BloodRequest;
  onPress: () => void;
}

const RequestItem: React.FC<RequestItemProps> = ({ request, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        color: COLORS.warning700,
        bg: COLORS.warning50,
        border: COLORS.warning200,
        icon: 'time-outline' as const,
        label: 'Pending',
      },
      accepted: {
        color: COLORS.secondary700,
        bg: COLORS.secondary50,
        border: COLORS.secondary200,
        icon: 'checkmark-circle-outline' as const,
        label: 'Accepted',
      },
      completed: {
        color: COLORS.success700,
        bg: COLORS.success50,
        border: COLORS.success200,
        icon: 'checkmark-done-circle-outline' as const,
        label: 'Completed',
      },
      cancelled: {
        color: COLORS.accent700,
        bg: COLORS.accent50,
        border: COLORS.accent200,
        icon: 'close-circle-outline' as const,
        label: 'Cancelled',
      },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const statusConfig = getStatusConfig(request.status);

  return (
    <TouchableOpacity style={styles.requestCard} onPress={onPress} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.requestHeader}>
        <View style={styles.requestBloodType}>
          <View style={styles.requestBloodIcon}>
            <LinearGradient
              colors={[COLORS.accent500, COLORS.accent600]}
              style={styles.bloodIconGradient}
            >
              <Ionicons name="water" size={18} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={styles.requestBloodTypeText}>{request.bloodType}</Text>
        </View>
        <View
          style={[
            styles.requestStatusBadge,
            {
              backgroundColor: statusConfig.bg,
              borderColor: statusConfig.border,
            },
          ]}
        >
          <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
          <Text style={[styles.requestStatusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.requestDetails}>
        <View style={styles.requestDetailRow}>
          <Ionicons name="person-outline" size={16} color={COLORS.neutral500} />
          <Text style={styles.requestDetailText} numberOfLines={1}>
            {typeof request.patientName === 'string' ? request.patientName : 'Patient'}
          </Text>
        </View>
        <View style={styles.requestDetailRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.neutral500} />
          <Text style={styles.requestDetailText} numberOfLines={1}>
            {request.hospitalName || request.location.address || 'Medical Facility'}
          </Text>
        </View>
        <View style={styles.requestDetailRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.neutral500} />
          <Text style={styles.requestDetailText}>{formatDate(request.createdAt)}</Text>
        </View>
      </View>

      {/* Accepted Donor */}
      {request.acceptedDonorName && (
        <View style={styles.requestDonorBadge}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success600} />
          <Text style={styles.requestDonorText} numberOfLines={1}>
            Donor: {request.acceptedDonorName}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const RequesterProfileScreen: React.FC = () => {
  const router = useRouter();
  const { user, logout, updateUserData } = useUser();
  const { pickAndUploadImage, takeAndUploadPhoto, uploading: imageUploading } = useImagePicker();

  const [requestHistory, setRequestHistory] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequestHistory();
  }, [user]);

  const loadRequestHistory = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const history = await getUserBloodRequests(user.id);
      setRequestHistory(history);
    } catch (error) {
      console.error('Error loading request history:', error);
      Alert.alert('Error', 'Failed to load request history');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequestHistory();
    setRefreshing(false);
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
    router.push('/(requester)/edit-profile' as any);
  };

  const handleRequestPress = (request: BloodRequest) => {
    router.push(`/(requester)/my-requests` as any);
  };

  const handleCreateRequest = () => {
    router.push('/(requester)/needblood' as any);
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

  const activeRequests = requestHistory.filter(
    (r) => r.status === 'pending' || r.status === 'accepted'
  );
  const completedRequests = requestHistory.filter((r) => r.status === 'completed');

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
            <Text style={styles.headerSubtitle}>REQUESTER DASHBOARD</Text>
            <Text style={styles.headerTitle}>My Profile</Text>
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
                <View style={styles.bloodTypeBadge}>
                  <Ionicons name="water" size={16} color="#FFFFFF" />
                  <Text style={styles.bloodTypeText}>{user.bloodType}</Text>
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

        {/* Create Request CTA */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.ctaCard} onPress={handleCreateRequest} activeOpacity={0.85}>
            <LinearGradient
              colors={[COLORS.accent500, COLORS.accent600]}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.ctaIconWrapper}>
                <Ionicons name="add-circle" size={48} color="rgba(255,255,255,0.9)" />
              </View>
              <View style={styles.ctaContent}>
                <Text style={styles.ctaTitle}>Need Blood Urgently?</Text>
                <Text style={styles.ctaSubtitle}>
                  Create a new request to connect with donors
                </Text>
              </View>
              <View style={styles.ctaArrow}>
                <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="document-text-outline"
              value={requestHistory.length}
              label="Total Requests"
              color={COLORS.secondary600}
              bgColor={COLORS.secondary50}
            />
            <StatCard
              icon="time-outline"
              value={activeRequests.length}
              label="Active"
              color={COLORS.warning600}
              bgColor={COLORS.warning50}
            />
            <StatCard
              icon="checkmark-done-circle-outline"
              value={completedRequests.length}
              label="Completed"
              color={COLORS.success600}
              bgColor={COLORS.success50}
            />
          </View>
        </View>

        {/* Request History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Request History</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{requestHistory.length}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary600} />
              <Text style={styles.loadingText}>Loading history...</Text>
            </View>
          ) : requestHistory.length > 0 ? (
            <>
              {/* Active Requests */}
              {activeRequests.length > 0 && (
                <View style={styles.requestsSection}>
                  <Text style={styles.subsectionTitle}>ACTIVE REQUESTS</Text>
                  <View style={styles.requestsList}>
                    {activeRequests.slice(0, 3).map((request) => (
                      <RequestItem
                        key={request.id}
                        request={request}
                        onPress={() => handleRequestPress(request)}
                      />
                    ))}
                  </View>
                  {activeRequests.length > 3 && (
                    <TouchableOpacity
                      style={styles.viewMoreButton}
                      onPress={() => router.push('/(requester)/my-requests' as any)}
                    >
                      <Text style={styles.viewMoreText}>View All Active Requests</Text>
                      <Ionicons name="arrow-forward" size={16} color={COLORS.primary600} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Completed Requests */}
              {completedRequests.length > 0 && (
                <View style={styles.requestsSection}>
                  <Text style={styles.subsectionTitle}>COMPLETED REQUESTS</Text>
                  <View style={styles.requestsList}>
                    {completedRequests.slice(0, 2).map((request) => (
                      <RequestItem
                        key={request.id}
                        request={request}
                        onPress={() => handleRequestPress(request)}
                      />
                    ))}
                  </View>
                  {completedRequests.length > 2 && (
                    <TouchableOpacity
                      style={styles.viewMoreButton}
                      onPress={() => router.push('/(requester)/my-requests' as any)}
                    >
                      <Text style={styles.viewMoreText}>View All Requests</Text>
                      <Ionicons name="arrow-forward" size={16} color={COLORS.primary600} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
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
              <Text style={styles.emptyTitle}>No Requests Yet</Text>
              <Text style={styles.emptySubtitle}>
                Create your first blood request to connect with donors
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleCreateRequest}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Create Request</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsList}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(shared)/find-bloodbank' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.primary50 }]}>
                <Ionicons name="business" size={22} color={COLORS.primary600} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Find Blood Banks</Text>
                <Text style={styles.actionSubtitle}>Locate nearby medical facilities</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.neutral400} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(requester)/find-donors' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.secondary50 }]}>
                <Ionicons name="people" size={22} color={COLORS.secondary600} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Find Donors</Text>
                <Text style={styles.actionSubtitle}>Search available blood donors</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.neutral400} />
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
  bloodTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary600,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  bloodTypeText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '700',
    color: '#FFFFFF',
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

  // CTA Card
  ctaCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...createShadow(8),
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  ctaIconWrapper: {
    opacity: 0.9,
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  ctaArrow: {
    opacity: 0.8,
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
  requestsSection: {
    marginBottom: SPACING.xl,
  },
  subsectionTitle: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '700',
    color: COLORS.neutral600,
    marginBottom: SPACING.md,
    letterSpacing: 0.8,
  },
  requestsList: {
    gap: SPACING.sm,
  },
  requestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...createShadow(1),
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  requestBloodType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  requestBloodIcon: {
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  bloodIconGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestBloodTypeText: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: '800',
    color: COLORS.accent600,
  },
  requestStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  requestStatusText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '700',
  },
  requestDetails: {
    gap: SPACING.sm,
  },
  requestDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  requestDetailText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '500',
    color: COLORS.neutral700,
  },
  requestDonorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.success50,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.success200,
  },
  requestDonorText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '600',
    color: COLORS.success700,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  viewMoreText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '700',
    color: COLORS.primary600,
  },

  // Actions
  actionsList: {
    gap: SPACING.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
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
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '700',
    color: COLORS.neutral900,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '500',
    color: COLORS.neutral500,
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
    marginBottom: SPACING.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary600,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...createShadow(3),
  },
  emptyButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '700',
    color: '#FFFFFF',
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

export default RequesterProfileScreen;