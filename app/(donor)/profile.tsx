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

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
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
      day: 'numeric' 
    });
  };

  // Get location string - prioritize blood bank name, then location address, then default
  const getLocationDisplay = () => {
    if (donation.bloodBankName) {
      return donation.bloodBankName;
    }
    if (donation.location?.address) {
      return donation.location.address;
    }
    if (donation.location?.city) {
      return donation.location.city;
    }
    return 'Blood Bank';
  };

  return (
    <View style={styles.donationItem}>
      <View style={styles.donationHeader}>
        <View style={styles.donationIconContainer}>
          <Ionicons name="water" size={20} color="#DC2626" />
        </View>
        <View style={styles.donationInfo}>
          <Text style={styles.donationLocation}>{getLocationDisplay()}</Text>
          <Text style={styles.donationDate}>{formatDate(donation.donationDate)}</Text>
        </View>
        <View style={styles.donationPointsBadge}>
          <Ionicons name="star" size={14} color="#F59E0B" />
          <Text style={styles.donationPoints}>+{donation.pointsEarned}</Text>
        </View>
      </View>
      {donation.notes && (
        <Text style={styles.donationNotes}>{donation.notes}</Text>
      )}
    </View>
  );
};

const DonorProfileScreen: React.FC = () => {
  const router = useRouter();
  const { user, logout, updateUserData } = useUser();
  const { pickAndUploadImage, takeAndUploadPhoto, uploading: imageUploading } = useImagePicker();
  
  const [donationHistory, setDonationHistory] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable || false);

  // Type guard to check if user is a donor
  const isDonor = (user: any): user is Donor => {
    return user?.userType === 'donor';
  };

  useEffect(() => {
    loadDonationHistory();
  }, [user]);

  useEffect(() => {
    if (user) {
      setIsAvailable(user.isAvailable || false);
    }
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
        'Success',
        `You are now ${newAvailability ? 'available' : 'unavailable'} for donations`
      );
    } catch (error) {
      console.error('Error updating availability:', error);
      setIsAvailable(!isAvailable);
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const handleProfilePictureUpdate = () => {
    if (Platform.OS === 'web') {
      uploadImageFromGallery();
      return;
    }

    Alert.alert(
      'Update Profile Picture',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: uploadImageFromCamera,
        },
        {
          text: 'Choose from Gallery',
          onPress: uploadImageFromGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
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
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
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
      ]
    );
  };

  const handleEditProfile = () => {
    // Navigate to edit profile screen
    Alert.alert('Coming Soon', 'Edit profile feature will be available soon');
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1b8882ff', '#16b43eff']} style={styles.headerGradient}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => Alert.alert('Coming Soon', 'Settings will be available soon')}
          >
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.profilePictureContainer}
            onPress={handleProfilePictureUpdate}
            disabled={imageUploading}
          >
            {user.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Ionicons name="person" size={50} color="#94A3B8" />
              </View>
            )}
            <View style={styles.cameraIconContainer}>
              {imageUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>
            {user.firstName} {user.lastName}
          </Text>
          
          <View style={styles.bloodTypeBadge}>
            <Ionicons name="water" size={16} color="#DC2626" />
            <Text style={styles.bloodTypeText}>{user.bloodType}</Text>
          </View>

          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={16} color="#64748B" />
              <Text style={styles.contactText}>{user.email}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={16} color="#64748B" />
              <Text style={styles.contactText}>{user.phoneNumber}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={18} color="#3B82F6" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Availability Toggle */}
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityHeader}>
            <View>
              <Text style={styles.availabilityTitle}>Donation Availability</Text>
              <Text style={styles.availabilitySubtitle}>
                {isAvailable ? 'You are available for donations' : 'You are currently unavailable'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleButton, isAvailable && styles.toggleButtonActive]}
              onPress={handleToggleAvailability}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleCircle, isAvailable && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="water"
            value={isDonor(user) ? user.totalDonations || 0 : 0}
            label="Total Donations"
            color="#DC2626"
          />
          <StatCard
            icon="star"
            value={user.points || 0}
            label="Points Earned"
            color="#F59E0B"
          />
          <StatCard
            icon="ribbon"
            value={isDonor(user) && user.medicalHistory ? 'Yes' : 'No'}
            label="Verified Donor"
            color="#10B981"
          />
        </View>

        {/* Last Donation */}
        {user.lastDonationDate && (
          <View style={styles.lastDonationCard}>
            <View style={styles.lastDonationHeader}>
              <Ionicons name="time-outline" size={20} color="#3B82F6" />
              <Text style={styles.lastDonationTitle}>Last Donation</Text>
            </View>
            <Text style={styles.lastDonationDate}>
              {new Date(user.lastDonationDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}

        {/* Donation History */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Donation History</Text>
            <Text style={styles.sectionCount}>
              {donationHistory.length} {donationHistory.length === 1 ? 'donation' : 'donations'}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#DC2626" />
              <Text style={styles.loadingText}>Loading history...</Text>
            </View>
          ) : donationHistory.length > 0 ? (
            donationHistory.map((donation) => (
              <DonationItem key={donation.id} donation={donation} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No donation history yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Your donation records will appear here
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(donor)/requests' as any)}
          >
            <Ionicons name="list-outline" size={20} color="#3B82F6" />
            <Text style={styles.actionButtonText}>View Blood Requests</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Coming Soon', 'Donation certificates will be available soon')}
          >
            <Ionicons name="ribbon-outline" size={20} color="#10B981" />
            <Text style={styles.actionButtonText}>My Certificates</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerGradient: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(0,0,0,0.1)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }),
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E2E8F0',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  bloodTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  bloodTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  contactInfo: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#64748B',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  availabilityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.08)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }),
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  availabilitySubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  toggleButton: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#10B981',
  },
  toggleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }),
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.08)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }),
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  lastDonationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.08)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }),
  },
  lastDonationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  lastDonationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  lastDonationDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  historySection: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  sectionCount: {
    fontSize: 14,
    color: '#64748B',
  },
  donationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.08)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }),
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  donationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  donationInfo: {
    flex: 1,
  },
  donationLocation: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  donationDate: {
    fontSize: 13,
    color: '#64748B',
  },
  donationPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  donationPoints: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400E',
  },
  donationNotes: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    paddingLeft: 52,
  },
  actionsSection: {
    marginHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.08)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }),
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default DonorProfileScreen;