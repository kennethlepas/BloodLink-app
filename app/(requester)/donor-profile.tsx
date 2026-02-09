import { useUser } from '@/src/contexts/UserContext';
import { getDonorHistory } from '@/src/services/firebase/database';
import { DonationRecord, Donor } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

interface DonationHistoryItemProps {
  donation: DonationRecord;
}

const DonationHistoryItem: React.FC<DonationHistoryItemProps> = ({ donation }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.donationItem}>
      <View style={styles.donationIconContainer}>
        <Ionicons name="water" size={24} color="#DC2626" />
      </View>
      
      <View style={styles.donationInfo}>
        <View style={styles.donationHeader}>
          <Text style={styles.donationBloodType}>{donation.bloodType}</Text>
          <View style={styles.pointsBadge}>
            <Ionicons name="trophy" size={14} color="#F59E0B" />
            <Text style={styles.pointsText}>+{donation.pointsEarned}</Text>
          </View>
        </View>
        
        <Text style={styles.donationDate}>{formatDate(donation.donationDate)}</Text>
        
        {donation.bloodBankName && (
          <View style={styles.donationLocation}>
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text style={styles.donationLocationText}>{donation.bloodBankName}</Text>
          </View>
        )}
        
        {donation.unitsCollected && (
          <Text style={styles.donationUnits}>{donation.unitsCollected} units collected</Text>
        )}
      </View>
    </View>
  );
};

export default function DonorProfileViewScreen() {
  const router = useRouter();
  const { user } = useUser();
  const params = useLocalSearchParams<{ donorData?: string }>();
  
  const [donor, setDonor] = useState<Donor | null>(null);
  const [donationHistory, setDonationHistory] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDonorData();
  }, [params.donorData]);

  const loadDonorData = async () => {
    try {
      setLoading(true);
      
      if (params.donorData) {
        const donorData = JSON.parse(params.donorData) as Donor;
        setDonor(donorData);
        
        // Load donation history
        const history = await getDonorHistory(donorData.id);
        setDonationHistory(history);
      }
    } catch (error) {
      console.error('Error loading donor data:', error);
      Alert.alert('Error', 'Failed to load donor profile');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDonorData();
    setRefreshing(false);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvailabilityInfo = () => {
    if (!donor) return { canDonate: false, message: '', daysRemaining: 0 };

    if (!donor.isAvailable) {
      return {
        canDonate: false,
        message: 'Currently unavailable for donation',
        daysRemaining: 0,
      };
    }

    if (donor.lastDonationDate) {
      const daysSinceLastDonation = Math.floor(
        (Date.now() - new Date(donor.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastDonation < 56) {
        const daysRemaining = 56 - daysSinceLastDonation;
        return {
          canDonate: false,
          message: `Can donate again in ${daysRemaining} days`,
          daysRemaining,
        };
      }
    }

    return {
      canDonate: true,
      message: 'Available for donation',
      daysRemaining: 0,
    };
  };

  const handleContact = () => {
    if (!donor) return;

    const availability = getAvailabilityInfo();
    
    if (!availability.canDonate) {
      Alert.alert(
        'Donor Unavailable',
        availability.message,
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'Contact Anyway',
            onPress: () => initiateContact(),
          },
        ]
      );
      return;
    }

    initiateContact();
  };

  const initiateContact = () => {
    if (!donor) return;

    Alert.alert(
      `Contact ${donor.firstName}`,
      'Choose how you want to contact this donor',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Message',
          onPress: () => {
            Alert.alert('Coming Soon', 'Chat functionality will be available soon');
          },
        },
        {
          text: 'Create Blood Request',
          onPress: () => {
            router.push('/(requester)/needblood' as any);
          },
        },
      ]
    );
  };

  const handleCallDonor = () => {
    if (!donor) return;
    Alert.alert(
      'Call Donor',
      `Call ${donor.firstName} at ${donor.phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            // In a real app, this would open the phone dialer
            Alert.alert('Feature Coming Soon', 'Direct calling will be available soon');
          },
        },
      ]
    );
  };

  const handleShareProfile = () => {
    if (!donor) return;
    Alert.alert('Share Profile', `Share ${donor.firstName}'s profile?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share',
        onPress: () => {
          Alert.alert('Coming Soon', 'Profile sharing will be available soon');
        },
      },
    ]);
  };

  if (loading || !donor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const availability = getAvailabilityInfo();
  const totalLivesImpacted = donor.totalDonations * 3; // Each donation can save up to 3 lives

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1b8882ff', '#16b43eff']} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Donor Profile</Text>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareProfile}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {donor.profilePicture ? (
              <Image source={{ uri: donor.profilePicture }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitials}>
                  {getInitials(donor.firstName, donor.lastName)}
                </Text>
              </View>
            )}

            <Text style={styles.donorName}>
              {donor.firstName} {donor.lastName}
            </Text>

            <View style={styles.bloodTypeBadge}>
              <Ionicons name="water" size={20} color="#DC2626" />
              <Text style={styles.bloodTypeText}>{donor.bloodType}</Text>
            </View>

            <View
              style={[
                styles.availabilityBadge,
                { backgroundColor: availability.canDonate ? '#D1FAE5' : '#FEF3C7' },
              ]}
            >
              <Ionicons
                name={availability.canDonate ? 'checkmark-circle' : 'time'}
                size={16}
                color={availability.canDonate ? '#10B981' : '#F59E0B'}
              />
              <Text
                style={[
                  styles.availabilityText,
                  { color: availability.canDonate ? '#10B981' : '#F59E0B' },
                ]}
              >
                {availability.message}
              </Text>
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.contactSection}>
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={18} color="#64748B" />
              <Text style={styles.contactText}>{donor.email}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={18} color="#64748B" />
              <Text style={styles.contactText}>{donor.phoneNumber}</Text>
            </View>
            {donor.location?.city && (
              <View style={styles.contactItem}>
                <Ionicons name="location-outline" size={18} color="#64748B" />
                <Text style={styles.contactText}>
                  {donor.location.city}
                  {donor.location.region && `, ${donor.location.region}`}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={handleContact}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.primaryActionGradient}
              >
                <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Contact Donor</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={handleCallDonor}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={20} color="#3B82F6" />
              <Text style={styles.secondaryActionText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Donation Statistics</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="water"
              value={donor.totalDonations}
              label="Total Donations"
              color="#DC2626"
            />
            <StatCard
              icon="trophy"
              value={donor.points || 0}
              label="Points Earned"
              color="#F59E0B"
            />
            <StatCard
              icon="people"
              value={totalLivesImpacted}
              label="Lives Impacted"
              color="#10B981"
            />
          </View>
        </View>

        {/* Medical Information */}
        {donor.medicalHistory && (
          <View style={styles.medicalSection}>
            <Text style={styles.sectionTitle}>Medical Information</Text>
            <View style={styles.medicalCard}>
              {donor.medicalHistory.weight && (
                <View style={styles.medicalItem}>
                  <View style={styles.medicalIconContainer}>
                    <Ionicons name="fitness" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.medicalInfo}>
                    <Text style={styles.medicalLabel}>Weight</Text>
                    <Text style={styles.medicalValue}>{donor.medicalHistory.weight} kg</Text>
                  </View>
                </View>
              )}

              {donor.lastDonationDate && (
                <View style={styles.medicalItem}>
                  <View style={styles.medicalIconContainer}>
                    <Ionicons name="calendar" size={20} color="#10B981" />
                  </View>
                  <View style={styles.medicalInfo}>
                    <Text style={styles.medicalLabel}>Last Donation</Text>
                    <Text style={styles.medicalValue}>
                      {new Date(donor.lastDonationDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              )}

              {donor.medicalHistory.hasChronicIllness !== undefined && (
                <View style={styles.medicalItem}>
                  <View style={styles.medicalIconContainer}>
                    <Ionicons
                      name={donor.medicalHistory.hasChronicIllness ? 'alert-circle' : 'shield-checkmark'}
                      size={20}
                      color={donor.medicalHistory.hasChronicIllness ? '#EF4444' : '#10B981'}
                    />
                  </View>
                  <View style={styles.medicalInfo}>
                    <Text style={styles.medicalLabel}>Health Status</Text>
                    <Text style={styles.medicalValue}>
                      {donor.medicalHistory.hasChronicIllness ? 'Has chronic illness' : 'Healthy'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Donation History */}
        <View style={styles.historySection}>
          <View style={styles.historySectionHeader}>
            <Text style={styles.sectionTitle}>Donation History</Text>
            <Text style={styles.historyCount}>
              {donationHistory.length} {donationHistory.length === 1 ? 'donation' : 'donations'}
            </Text>
          </View>

          {donationHistory.length > 0 ? (
            <View style={styles.historyList}>
              {donationHistory.map((donation) => (
                <DonationHistoryItem key={donation.id} donation={donation} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyHistory}>
              <Ionicons name="water-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyHistoryText}>No donation history yet</Text>
            </View>
          )}
        </View>

        {/* Impact Card */}
        {donor.totalDonations > 0 && (
          <View style={styles.impactCard}>
            <LinearGradient
              colors={['#DC2626', '#991B1B']}
              style={styles.impactGradient}
            >
              <Ionicons name="heart" size={40} color="#FFFFFF" />
              <Text style={styles.impactTitle}>Hero Status</Text>
              <Text style={styles.impactText}>
                {donor.firstName} has potentially saved up to {totalLivesImpacted} lives through {donor.totalDonations}{' '}
                {donor.totalDonations === 1 ? 'donation' : 'donations'}!
              </Text>
            </LinearGradient>
          </View>
        )}

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
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
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
    flex: 1,
    textAlign: 'center',
  },
  shareButton: {
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
    marginTop: -10,
    borderRadius: 20,
    padding: 24,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 16px rgba(0,0,0,0.1)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 8,
        }),
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#3B82F6',
    marginBottom: 16,
  },
  profilePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInitials: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  donorName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  bloodTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 12,
  },
  bloodTypeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactSection: {
    gap: 12,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 15,
    color: '#64748B',
    flex: 1,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryActionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  statsSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  medicalSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  medicalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 16,
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
  medicalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  medicalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicalInfo: {
    flex: 1,
  },
  medicalLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  medicalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  historySection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  historyCount: {
    fontSize: 14,
    color: '#64748B',
  },
  historyList: {
    gap: 12,
  },
  donationItem: {
    flexDirection: 'row',
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
  donationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donationInfo: {
    flex: 1,
    gap: 4,
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  donationBloodType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  donationDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  donationLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  donationLocationText: {
    fontSize: 13,
    color: '#64748B',
  },
  donationUnits: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyHistory: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
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
  emptyHistoryText: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 12,
  },
  impactCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(220, 38, 38, 0.3)' } as any
      : {
          shadowColor: '#DC2626',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        }),
  },
  impactGradient: {
    padding: 24,
    alignItems: 'center',
  },
  impactTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  impactText: {
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.95,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  bottomSpacer: {
    height: 40,
  },
});