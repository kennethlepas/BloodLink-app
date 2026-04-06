import { useImagePicker } from '@/hooks/useImagePicker';
import { LogoutModal } from '@/src/components/LogoutModal';
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
// DESIGN SYSTEM - MODERN MEDICAL THEME (REQUESTER - TEAL ACCENT)
// ═══════════════════════════════════════════════════════════════════════════

const COLORS = {
  // Primary - Medical Teal (Requester theme)
  primary: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },
  // Secondary - Medical Blue
  secondary: {
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
  overlay: 'rgba(0, 0, 0, 0.55)',
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

interface RequestItemProps {
  request: BloodRequest;
  onPress: () => void;
}

const RequestListItem: React.FC<RequestItemProps> = ({ request, onPress }) => {
  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { 
        color: COLORS.warning[600], 
        bg: COLORS.warning[50], 
        border: COLORS.warning[200], 
        icon: 'time-outline' as const, 
        label: 'Pending' 
      },
      accepted: { 
        color: COLORS.secondary[600], 
        bg: COLORS.secondary[50], 
        border: COLORS.secondary[200], 
        icon: 'checkmark-circle-outline' as const, 
        label: 'Accepted' 
      },
      completed: { 
        color: COLORS.success[600], 
        bg: COLORS.success[50], 
        border: COLORS.success[200], 
        icon: 'checkmark-done-circle-outline' as const, 
        label: 'Completed' 
      },
      cancelled: { 
        color: COLORS.accent[600], 
        bg: COLORS.accent[50], 
        border: COLORS.accent[200], 
        icon: 'close-circle-outline' as const, 
        label: 'Cancelled' 
      },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const statusConfig = getStatusConfig(request.status);
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity style={styles.requestCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.requestCardHeader}>
        <View style={styles.requestBloodTypeWrapper}>
          <LinearGradient
            colors={[COLORS.accent[500], COLORS.accent[600]]}
            style={styles.requestBloodIcon}
          >
            <Ionicons name="water" size={14} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.requestBloodType}>{request.bloodType}</Text>
        </View>
        <View style={[styles.requestStatusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
          <Ionicons name={statusConfig.icon} size={10} color={statusConfig.color} />
          <Text style={[styles.requestStatusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>
      
      <View style={styles.requestCardContent}>
        <View style={styles.requestInfo}>
          <Text style={styles.requestHospital} numberOfLines={1}>
            {request.hospitalName || 'Medical Facility'}
          </Text>
          <View style={styles.requestMeta}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.neutral[400]} />
            <Text style={styles.requestDate}>{formatDate(request.createdAt)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.neutral[400]} />
      </View>
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
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    router.push('/(requester)/edit-profile' as any);
  };

  const handleCreateRequest = () => {
    router.push('/(requester)/needblood' as any);
  };

  const handleViewAllRequests = () => {
    router.push('/(requester)/my-requests' as any);
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

  const activeRequests = requestHistory.filter(
    (r) => r.status === 'pending' || r.status === 'accepted'
  );
  const completedRequests = requestHistory.filter((r) => r.status === 'completed');
  const totalRequests = requestHistory.length;

  const getRequestDetailView = (request: BloodRequest) => {
    const formatDateTime = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const getStatusConfig = (status: string) => {
      const configs = {
        pending: {
          color: COLORS.warning[600],
          bg: COLORS.warning[50],
          border: COLORS.warning[200],
          icon: 'time-outline' as const,
          label: 'Pending',
        },
        accepted: {
          color: COLORS.secondary[600],
          bg: COLORS.secondary[50],
          border: COLORS.secondary[200],
          icon: 'checkmark-circle-outline' as const,
          label: 'Accepted',
        },
        completed: {
          color: COLORS.success[600],
          bg: COLORS.success[50],
          border: COLORS.success[200],
          icon: 'checkmark-done-circle-outline' as const,
          label: 'Completed',
        },
        cancelled: {
          color: COLORS.accent[600],
          bg: COLORS.accent[50],
          border: COLORS.accent[200],
          icon: 'close-circle-outline' as const,
          label: 'Cancelled',
        },
      };
      return configs[status as keyof typeof configs] || configs.pending;
    };

    const statusConfig = getStatusConfig(request.status);

    return (
      <View style={styles.modalRequestCard}>
        <View style={styles.modalRequestHeader}>
          <View style={styles.modalBloodTypeWrapper}>
            <LinearGradient
              colors={[COLORS.accent[500], COLORS.accent[600]]}
              style={styles.modalBloodIcon}
            >
              <Ionicons name="water" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.modalBloodType}>{request.bloodType}</Text>
          </View>
          <View
            style={[
              styles.modalStatusBadge,
              {
                backgroundColor: statusConfig.bg,
                borderColor: statusConfig.border,
              },
            ]}
          >
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.modalStatusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.modalDetails}>
          <View style={styles.modalDetailRow}>
            <View style={styles.modalDetailIcon}>
              <Ionicons name="person-outline" size={18} color={COLORS.neutral[500]} />
            </View>
            <View style={styles.modalDetailContent}>
              <Text style={styles.modalDetailLabel}>Patient Name</Text>
              <Text style={styles.modalDetailValue}>{request.patientName || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.modalDetailRow}>
            <View style={styles.modalDetailIcon}>
              <Ionicons name="business-outline" size={18} color={COLORS.neutral[500]} />
            </View>
            <View style={styles.modalDetailContent}>
              <Text style={styles.modalDetailLabel}>Hospital</Text>
              <Text style={styles.modalDetailValue}>{request.hospitalName || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.modalDetailRow}>
            <View style={styles.modalDetailIcon}>
              <Ionicons name="location-outline" size={18} color={COLORS.neutral[500]} />
            </View>
            <View style={styles.modalDetailContent}>
              <Text style={styles.modalDetailLabel}>Location</Text>
              <Text style={styles.modalDetailValue}>
                {request.location?.address || request.location?.city || 'Not specified'}
              </Text>
            </View>
          </View>

          <View style={styles.modalDetailRow}>
            <View style={styles.modalDetailIcon}>
              <Ionicons name="flask-outline" size={18} color={COLORS.neutral[500]} />
            </View>
            <View style={styles.modalDetailContent}>
              <Text style={styles.modalDetailLabel}>Units Needed</Text>
              <Text style={styles.modalDetailValue}>{request.unitsNeeded} unit(s)</Text>
            </View>
          </View>

          <View style={styles.modalDetailRow}>
            <View style={styles.modalDetailIcon}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.neutral[500]} />
            </View>
            <View style={styles.modalDetailContent}>
              <Text style={styles.modalDetailLabel}>Created</Text>
              <Text style={styles.modalDetailValue}>{formatDateTime(request.createdAt)}</Text>
            </View>
          </View>

          {request.notes && (
            <View style={styles.modalNotes}>
              <View style={styles.modalDetailIcon}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.neutral[500]} />
              </View>
              <View style={styles.modalDetailContent}>
                <Text style={styles.modalDetailLabel}>Additional Notes</Text>
                <Text style={styles.modalNotesText}>{request.notes}</Text>
              </View>
            </View>
          )}

          {request.acceptedDonorName && (
            <View style={styles.modalDonorBadge}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success[500]} />
              <View style={styles.modalDonorInfo}>
                <Text style={styles.modalDonorLabel}>Assigned Donor</Text>
                <Text style={styles.modalDonorName}>{request.acceptedDonorName}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

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
            <Text style={styles.headerBadge}>REQUESTER PROFILE</Text>
            <Text style={styles.headerTitle}>My Dashboard</Text>
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
                <View style={styles.bloodTypeBadge}>
                  <Ionicons name="water" size={14} color="#FFFFFF" />
                  <Text style={styles.bloodTypeText}>{user.bloodType}</Text>
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

        {/* Create Request CTA */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.ctaCard} onPress={handleCreateRequest} activeOpacity={0.85}>
            <LinearGradient
              colors={[COLORS.primary[500], COLORS.primary[600]]}
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

        {/* Statistics Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="document-text-outline"
              value={totalRequests}
              label="Total Requests"
              color={COLORS.primary[600]}
              bgColor={COLORS.primary[50]}
            />
            <StatCard
              icon="time-outline"
              value={activeRequests.length}
              label="Active"
              color={COLORS.warning[600]}
              bgColor={COLORS.warning[50]}
            />
            <StatCard
              icon="checkmark-done-circle-outline"
              value={completedRequests.length}
              label="Completed"
              color={COLORS.success[600]}
              bgColor={COLORS.success[50]}
            />
          </View>
        </View>

        {/* Request History Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Request History</Text>
            <View style={styles.historyCountBadge}>
              <Text style={styles.historyCountText}>{totalRequests}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary[500]} />
              <Text style={styles.loadingText}>Loading history...</Text>
            </View>
          ) : requestHistory.length > 0 ? (
            <>
              {/* Active Requests Section */}
              {activeRequests.length > 0 && (
                <View style={styles.requestsSubsection}>
                  <Text style={styles.subsectionTitle}>ACTIVE REQUESTS</Text>
                  <View style={styles.requestsList}>
                    {activeRequests.slice(0, 3).map((request) => (
                      <RequestListItem
                        key={request.id}
                        request={request}
                        onPress={() => setSelectedRequest(request)}
                      />
                    ))}
                  </View>
                  {activeRequests.length > 3 && (
                    <TouchableOpacity
                      style={styles.viewMoreButton}
                      onPress={handleViewAllRequests}
                    >
                      <Text style={styles.viewMoreText}>View All Active Requests</Text>
                      <Ionicons name="arrow-forward" size={14} color={COLORS.primary[600]} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Completed Requests Section */}
              {completedRequests.length > 0 && (
                <View style={styles.requestsSubsection}>
                  <Text style={styles.subsectionTitle}>COMPLETED REQUESTS</Text>
                  <View style={styles.requestsList}>
                    {completedRequests.slice(0, 2).map((request) => (
                      <RequestListItem
                        key={request.id}
                        request={request}
                        onPress={() => setSelectedRequest(request)}
                      />
                    ))}
                  </View>
                  {completedRequests.length > 2 && (
                    <TouchableOpacity
                      style={styles.viewMoreButton}
                      onPress={handleViewAllRequests}
                    >
                      <Text style={styles.viewMoreText}>View All Completed Requests</Text>
                      <Ionicons name="arrow-forward" size={14} color={COLORS.primary[600]} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
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
              <View style={[styles.actionIcon, { backgroundColor: COLORS.primary[50] }]}>
                <Ionicons name="business-outline" size={24} color={COLORS.primary[600]} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Find Blood Banks</Text>
                <Text style={styles.actionSubtitle}>Locate nearby medical facilities</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.neutral[400]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(requester)/find-donors' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.secondary[50] }]}>
                <Ionicons name="people-outline" size={24} color={COLORS.secondary[600]} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Find Donors</Text>
                <Text style={styles.actionSubtitle}>Search available blood donors</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.neutral[400]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleViewAllRequests}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.warning[50] }]}>
                <Ionicons name="list-outline" size={24} color={COLORS.warning[600]} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>My Requests</Text>
                <Text style={styles.actionSubtitle}>View all your blood requests</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.neutral[400]} />
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

      {/* Request Detail Modal */}
      <Modal
        visible={!!selectedRequest}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Details</Text>
              <TouchableOpacity
                onPress={() => setSelectedRequest(null)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={22} color={COLORS.neutral[500]} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedRequest && getRequestDetailView(selectedRequest)}
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
  bloodTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  bloodTypeText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '700',
    color: '#FFFFFF',
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
    marginBottom: SPACING.xs,
  },
  ctaSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  ctaArrow: {
    opacity: 0.8,
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

  // History Count Badge
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

  // Requests Subsection
  requestsSubsection: {
    marginBottom: SPACING.xl,
  },
  subsectionTitle: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '700',
    color: COLORS.neutral[500],
    marginBottom: SPACING.md,
    letterSpacing: 0.8,
  },
  requestsList: {
    gap: SPACING.sm,
  },

  // Request Card
  requestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...createShadow(1),
  },
  requestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  requestBloodTypeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  requestBloodIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestBloodType: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: '800',
    color: COLORS.accent[600],
  },
  requestStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  requestStatusText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '700',
  },
  requestCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestInfo: {
    flex: 1,
  },
  requestHospital: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '600',
    color: COLORS.neutral[800],
    marginBottom: SPACING.xs,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  requestDate: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '500',
    color: COLORS.neutral[500],
  },

  // View More Button
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
    fontWeight: '600',
    color: COLORS.primary[600],
  },

  // Actions List
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
    width: 52,
    height: 52,
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
    color: COLORS.neutral[900],
    marginBottom: SPACING.xs,
  },
  actionSubtitle: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '500',
    color: COLORS.neutral[500],
  },

  // Logout Button
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
    marginBottom: SPACING.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...createShadow(2),
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
  modalRequestCard: {
    paddingBottom: SPACING.xxxl,
  },
  modalRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  modalBloodTypeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  modalBloodIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBloodType: {
    fontSize: TYPOGRAPHY.xxxl,
    fontWeight: '900',
    color: COLORS.accent[600],
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  modalStatusText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '700',
  },
  modalDetails: {
    gap: SPACING.lg,
  },
  modalDetailRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalDetailIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDetailContent: {
    flex: 1,
  },
  modalDetailLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '600',
    color: COLORS.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  modalDetailValue: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '600',
    color: COLORS.neutral[800],
  },
  modalNotes: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalNotesText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '500',
    color: COLORS.neutral[600],
    lineHeight: 20,
  },
  modalDonorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.success[50],
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.success[200],
    marginTop: SPACING.md,
  },
  modalDonorInfo: {
    flex: 1,
  },
  modalDonorLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '600',
    color: COLORS.success[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  modalDonorName: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '700',
    color: COLORS.success[700],
  },

  bottomSpacer: {
    height: 100,
  },
});

export default RequesterProfileScreen;