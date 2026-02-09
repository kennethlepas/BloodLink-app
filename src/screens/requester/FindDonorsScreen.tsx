import { useUser } from '@/src/contexts/UserContext';
import { getUsersByBloodType } from '@/src/services/firebase/database';
import { BloodType, Donor } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface DonorCardProps {
  donor: Donor;
  onContact: (donor: Donor) => void;
  onViewProfile: (donor: Donor) => void;
}

const DonorCard: React.FC<DonorCardProps> = ({ donor, onContact, onViewProfile }) => {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvailabilityStatus = () => {
    if (!donor.isAvailable) {
      return { text: 'Unavailable', color: '#94A3B8', bgColor: '#F1F5F9' };
    }
    
    // Check if donor can donate (56 days since last donation)
    if (donor.lastDonationDate) {
      const daysSinceLastDonation = Math.floor(
        (Date.now() - new Date(donor.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastDonation < 56) {
        const daysRemaining = 56 - daysSinceLastDonation;
        return {
          text: `Available in ${daysRemaining}d`,
          color: '#F59E0B',
          bgColor: '#FEF3C7',
        };
      }
    }
    
    return { text: 'Available', color: '#10B981', bgColor: '#D1FAE5' };
  };

  const status = getAvailabilityStatus();

  return (
    <View style={styles.donorCard}>
      <View style={styles.donorHeader}>
        <View style={styles.donorProfileSection}>
          {donor.profilePicture ? (
            <Image source={{ uri: donor.profilePicture }} style={styles.donorAvatar} />
          ) : (
            <View style={styles.donorAvatarPlaceholder}>
              <Text style={styles.donorInitials}>
                {getInitials(donor.firstName, donor.lastName)}
              </Text>
            </View>
          )}
          
          <View style={styles.donorInfo}>
            <Text style={styles.donorName}>
              {donor.firstName} {donor.lastName}
            </Text>
            
            <View style={styles.donorMetaRow}>
              <View style={styles.bloodTypeBadge}>
                <Ionicons name="water" size={14} color="#DC2626" />
                <Text style={styles.bloodTypeText}>{donor.bloodType}</Text>
              </View>
              
              {donor.totalDonations > 0 && (
                <View style={styles.donationsBadge}>
                  <Ionicons name="heart" size={12} color="#EF4444" />
                  <Text style={styles.donationsText}>{donor.totalDonations || 0} donations</Text>
                </View>
              )}
            </View>

            {donor.location?.city && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#64748B" />
                <Text style={styles.locationText}>
                  {donor.location.city}
                  {donor.location.region && `, ${donor.location.region}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      {/* Donor Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="trophy-outline" size={18} color="#F59E0B" />
          <Text style={styles.statValue}>{donor.points || 0}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>

        {donor.lastDonationDate && (
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
            <Text style={styles.statValue}>
              {new Date(donor.lastDonationDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.statLabel}>Last Donation</Text>
          </View>
        )}

        {donor.medicalHistory?.weight && (
          <View style={styles.statItem}>
            <Ionicons name="fitness-outline" size={18} color="#10B981" />
            <Text style={styles.statValue}>{donor.medicalHistory.weight}kg</Text>
            <Text style={styles.statLabel}>Weight</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.viewProfileButton}
          onPress={() => onViewProfile(donor)}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={18} color="#3B82F6" />
          <Text style={styles.viewProfileText}>View Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.contactButton,
            !donor.isAvailable && styles.contactButtonDisabled,
          ]}
          onPress={() => onContact(donor)}
          disabled={!donor.isAvailable}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>Contact</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function FindDonorsScreen() {
  const router = useRouter();
  const { user } = useUser();

  const [donors, setDonors] = useState<Donor[]>([]);
  const [filteredDonors, setFilteredDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodType, setSelectedBloodType] = useState<BloodType | 'all'>('all');
  const [availableOnly, setAvailableOnly] = useState(true);

  useEffect(() => {
    loadDonors();
  }, []);

  useEffect(() => {
    filterDonors();
  }, [donors, searchQuery, selectedBloodType, availableOnly]);

  const loadDonors = async () => {
    try {
      setLoading(true);
      
      // For now, we'll fetch all blood types and filter client-side
      // In production, you might want to implement a more efficient query
      const allDonors: Donor[] = [];
      
      for (const bloodType of BLOOD_TYPES) {
        const typeDonors = await getUsersByBloodType(bloodType);
        allDonors.push(...typeDonors);
      }

      setDonors(allDonors);
    } catch (error) {
      console.error('Error loading donors:', error);
      Alert.alert('Error', 'Failed to load donors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDonors();
    setRefreshing(false);
  };

  const filterDonors = () => {
    let filtered = [...donors];

    // Filter by blood type
    if (selectedBloodType !== 'all') {
      filtered = filtered.filter((donor) => donor.bloodType === selectedBloodType);
    }

    // Filter by availability
    if (availableOnly) {
      filtered = filtered.filter((donor) => donor.isAvailable);
    }

    // Filter by search query (name or location)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((donor) => {
        const fullName = `${donor.firstName} ${donor.lastName}`.toLowerCase();
        const location = donor.location?.city?.toLowerCase() || '';
        const region = donor.location?.region?.toLowerCase() || '';
        
        return (
          fullName.includes(query) ||
          location.includes(query) ||
          region.includes(query)
        );
      });
    }

    setFilteredDonors(filtered);
  };

  const handleContactDonor = (donor: Donor) => {
    // Navigate to chat or create blood request
    Alert.alert(
      'Contact Donor',
      `Would you like to contact ${donor.firstName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Message',
          onPress: () => {
            // Navigate to chat
            Alert.alert('Coming Soon', 'Chat functionality will be available soon');
          },
        },
        {
          text: 'Create Request',
          onPress: () => {
            // Navigate to create request with pre-filled blood type
            router.push('/(requester)/needblood' as any);
          },
        },
      ]
    );
  };

  const handleViewProfile = (donor: Donor) => {
    // Navigate to donor profile view screen with donor data
    router.push({
      pathname: '/(requester)/donor-profile' as any,
      params: {
        donorData: JSON.stringify(donor),
      },
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#CBD5E1" />
      <Text style={styles.emptyStateTitle}>No Donors Found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery
          ? 'Try adjusting your search filters'
          : 'No donors match the selected criteria'}
      </Text>
      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => {
          setSearchQuery('');
          setSelectedBloodType('all');
          setAvailableOnly(false);
        }}
      >
        <Text style={styles.resetButtonText}>Reset Filters</Text>
      </TouchableOpacity>
    </View>
  );

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
          <Text style={styles.headerTitle}>Find Donors</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or location..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Blood Type Filter */}
        <View style={styles.filterRow}>
          <View style={styles.pickerWrapper}>
            <Ionicons name="water" size={18} color="#64748B" />
            <Picker
              selectedValue={selectedBloodType}
              onValueChange={(value) => setSelectedBloodType(value as BloodType | 'all')}
              style={styles.picker}
            >
              <Picker.Item label="All Blood Types" value="all" />
              {BLOOD_TYPES.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            style={[
              styles.availabilityToggle,
              availableOnly && styles.availabilityToggleActive,
            ]}
            onPress={() => setAvailableOnly(!availableOnly)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={availableOnly ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={20}
              color={availableOnly ? '#10B981' : '#64748B'}
            />
            <Text
              style={[
                styles.availabilityText,
                availableOnly && styles.availabilityTextActive,
              ]}
            >
              Available Only
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {filteredDonors.length} {filteredDonors.length === 1 ? 'donor' : 'donors'} found
        </Text>
      </View>

      {/* Donors List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading donors...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDonors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DonorCard
              donor={item}
              onContact={handleContactDonor}
              onViewProfile={handleViewProfile}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={renderEmptyState}
        />
      )}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pickerWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  picker: {
    flex: 1,
    height: 48,
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  availabilityToggleActive: {
    backgroundColor: '#D1FAE5',
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  availabilityTextActive: {
    color: '#10B981',
  },
  resultsCount: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  listContent: {
    padding: 20,
  },
  donorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  donorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  donorProfileSection: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  donorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  donorAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donorInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  donorInfo: {
    flex: 1,
    gap: 6,
  },
  donorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  donorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bloodTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  bloodTypeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  donationsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  donationsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  viewProfileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  viewProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  contactButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  resetButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});