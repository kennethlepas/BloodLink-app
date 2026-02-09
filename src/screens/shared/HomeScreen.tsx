import { NotificationBell } from '@/src/components/NotificationBell';
import { useUser } from '@/src/contexts/UserContext';
import { getActiveBloodRequests, getDonorHistory, getUserBloodRequests, getUsersByBloodType } from '@/src/services/firebase/database';
import { BloodRequest, Donor } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
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
const REQUEST_CARD_WIDTH = SCREEN_WIDTH * 0.85;
const DONOR_CARD_WIDTH = SCREEN_WIDTH * 0.8;

export default function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [recentRequests, setRecentRequests] = useState<BloodRequest[]>([]);
  const [activeRequests, setActiveRequests] = useState<BloodRequest[]>([]);
  const [availableDonors, setAvailableDonors] = useState<Donor[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingDonors, setLoadingDonors] = useState(false);

  // Statistics for requester
  const [totalRequests, setTotalRequests] = useState(0);
  const [fulfilledRequests, setFulfilledRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  // Statistics for donor
  const [totalDonations, setTotalDonations] = useState(0);

  const isDonor = user?.userType === 'donor';
  const isRequester = user?.userType === 'requester';

  useEffect(() => {
    if (user) {
      if (isDonor) {
        loadRecentRequests();
      } else if (isRequester) {
        loadRequesterData();
      }
    }
  }, [isDonor, isRequester, user]);

  const loadRecentRequests = async () => {
    if (!user) return;

    try {
      setLoadingRequests(true);
      const allRequests = await getActiveBloodRequests();
      
      // Filter by blood type compatibility
      const compatibleRequests = allRequests.filter(request => 
        isBloodTypeCompatible(user.bloodType, request.bloodType)
      );

      // Get the 5 most recent requests
      const sortedRequests = compatibleRequests
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      setRecentRequests(sortedRequests);

      // Load donation history to get total donations count
      const donorHistory = await getDonorHistory(user.id);
      setTotalDonations(donorHistory.length);
      
    } catch (error) {
      console.error('Error loading recent requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadRequesterData = async () => {
    if (!user) return;

    try {
      setLoadingRequests(true);
      setLoadingDonors(true);

      // Fetch user's blood requests
      const userRequests = await getUserBloodRequests(user.id);
      
      // Calculate statistics
      setTotalRequests(userRequests.length);
      setFulfilledRequests(userRequests.filter(r => r.status === 'completed').length);
      setPendingRequests(userRequests.filter(r => r.status === 'pending').length);
      
      // Get active requests for display
      const activeOnly = userRequests.filter(
        request => request.status === 'pending' || request.status === 'accepted'
      );
      setActiveRequests(activeOnly);

      // Load available donors matching user's blood type
      const donors = await getUsersByBloodType(user.bloodType);
      // Get top 5 available donors
      const topDonors = donors.slice(0, 5);
      setAvailableDonors(topDonors);

    } catch (error) {
      console.error('Error loading requester data:', error);
    } finally {
      setLoadingRequests(false);
      setLoadingDonors(false);
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

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (user) {
      if (isDonor) {
        await loadRecentRequests();
      } else if (isRequester) {
        await loadRequesterData();
      }
    }
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [isDonor, isRequester, user]);

  const handleLogout = () => {
    router.push('/(auth)/logout' as any);
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

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'warning';
      case 'urgent':
        return 'alert-circle';
      case 'moderate':
        return 'information-circle';
      default:
        return 'checkmark-circle';
    }
  };

  const handleRequestPress = (request: BloodRequest) => {
    if (isDonor) {
      router.push('/(donor)/requests' as any);
    } else {
      router.push('/(requester)/my-requests' as any);
    }
  };

  const handleDonorPress = (donor: Donor) => {
    router.push({
      pathname: '/(requester)/donor-profile' as any,
      params: {
        donorData: JSON.stringify(donor),
      },
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const donorActions = [
    {
      icon: 'notifications',
      title: 'Requests',
      color: '#F59E0B',
      route: '/(donor)/requests',
    },
    {
      icon: 'time',
      title: 'History',
      color: '#3B82F6',
      route: '/(donor)/donation-history',
    },
    {
      icon: 'toggle',
      title: 'Status',
      color: '#10B981',
      route: '/(donor)/availability-toggle',
    },
    {
      icon: 'search',
      title: 'Blood Banks',
      color: '#6366F1',
      route: '/(shared)/find-bloodbank',
    },
    {
      icon: 'chatbubbles',
      title: 'Messages',
      color: '#8B5CF6',
      route: '/(donor)/chat-list',
    },
  ];

  const requesterActions = [
    {
      icon: 'add-circle',
      title: 'New Request',
      color: '#F59E0B',
      route: '/(requester)/needblood',
    },
    {
      icon: 'list',
      title: 'My Requests',
      color: '#3B82F6',
      route: '/(requester)/my-requests',
    },
    {
      icon: 'people',
      title: 'Find Donors',
      color: '#10B981',
      route: '/(requester)/find-donors',
    },
    {
      icon: 'search',
      title: 'Blood Banks',
      color: '#6366F1',
      route: '/(shared)/find-bloodbank',
    },
    {
      icon: 'chatbubbles',
      title: 'Messages',
      color: '#8B5CF6',
      route: '/(requester)/chat-list',
    },
  ];

  const actions = isDonor ? donorActions : requesterActions;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Header with Gradient */}
        <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={() => router.push('/(shared)/profile' as any)}
                activeOpacity={0.8}
              >
                {user.profilePicture ? (
                  <Image 
                    source={{ uri: user.profilePicture }} 
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {user.firstName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
              <View style={styles.greetingContainer}>
                <Text style={styles.greetingText}>Welcome back,</Text>
                <Text style={styles.userName} numberOfLines={1}>
                  {user.firstName} {user.lastName}
                </Text>
                <View style={styles.userTypeBadge}>
                  <Ionicons
                    name={isDonor ? 'heart' : 'medkit'}
                    size={12}
                    color="#FFFFFF"
                  />
                  <Text style={styles.userTypeText}>
                    {isDonor ? 'Donor' : 'Requester'}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Notification Bell - Navigate to Notifications Screen */}
            <TouchableOpacity
              onPress={() => router.push('/(shared)/notifications' as any)}
              style={styles.notificationBellWrapper}
            >
              <NotificationBell 
                iconSize={24} 
                iconColor="#FFFFFF" 
                badgeColor="#F59E0B"
              />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            {isDonor ? (
              <>
                <View style={styles.statCard}>
                  <Ionicons name="water" size={20} color="#FFFFFF" />
                  <Text style={styles.statValue} numberOfLines={1}>
                    {user.isAvailable ? 'Available' : 'Unavailable'}
                  </Text>
                  <Text style={styles.statLabel}>Status</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="trophy" size={20} color="#FFFFFF" />
                  <Text style={styles.statValue}>{totalDonations}</Text>
                  <Text style={styles.statLabel}>Donations</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="star" size={20} color="#FFFFFF" />
                  <Text style={styles.statValue}>{user.points || 0}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statCard}>
                  <Ionicons name="document-text" size={20} color="#FFFFFF" />
                  <Text style={styles.statValue}>{totalRequests}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.statValue}>{fulfilledRequests}</Text>
                  <Text style={styles.statLabel}>Fulfilled</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="hourglass" size={20} color="#FFFFFF" />
                  <Text style={styles.statValue}>{pendingRequests}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              </>
            )}
          </View>
        </LinearGradient>

        {/* Blood Type Card */}
        <View style={styles.bloodTypeCard}>
          <View style={styles.bloodTypeLeft}>
            <Text style={styles.bloodTypeLabel}>Your Blood Type</Text>
            <Text style={styles.bloodTypeValue}>{user.bloodType}</Text>
          </View>
          <View style={styles.bloodTypeIcon}>
            <Text style={styles.bloodDropEmoji}>🩸</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: action.color + '20' },
                  ]}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={24}
                    color={action.color}
                  />
                </View>
                <Text style={styles.actionTitle} numberOfLines={1}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Conditional Content Based on User Type */}
        {isDonor ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Requests</Text>
              <TouchableOpacity
                onPress={() => router.push('/(donor)/requests' as any)}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {loadingRequests ? (
              <View style={styles.requestLoadingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.requestLoadingText}>Loading...</Text>
              </View>
            ) : recentRequests.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.requestsScrollContainer}
                snapToInterval={REQUEST_CARD_WIDTH + 12}
                decelerationRate="fast"
              >
                {recentRequests.map((request) => (
                  <TouchableOpacity
                    key={request.id}
                    style={styles.requestCard}
                    onPress={() => handleRequestPress(request)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.requestCardHeader}>
                      <View style={styles.bloodTypeContainer}>
                        <Ionicons name="water" size={18} color="#EF4444" />
                        <Text style={styles.requestBloodType}>{request.bloodType}</Text>
                      </View>
                      <View style={[
                        styles.urgencyBadge,
                        { backgroundColor: `${getUrgencyColor(request.urgencyLevel)}20` }
                      ]}>
                        <Ionicons
                          name={getUrgencyIcon(request.urgencyLevel) as any}
                          size={12}
                          color={getUrgencyColor(request.urgencyLevel)}
                        />
                        <Text style={[
                          styles.urgencyText,
                          { color: getUrgencyColor(request.urgencyLevel) }
                        ]}>
                          {request.urgencyLevel.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.requestCardBody}>
                      <View style={styles.requestInfoRow}>
                        <Ionicons name="person" size={14} color="#64748B" />
                        <Text style={styles.requestInfoText} numberOfLines={1}>
                          {request.requesterName}
                        </Text>
                      </View>

                      {request.hospitalName && (
                        <View style={styles.requestInfoRow}>
                          <Ionicons name="business" size={14} color="#64748B" />
                          <Text style={styles.requestInfoText} numberOfLines={1}>
                            {request.hospitalName}
                          </Text>
                        </View>
                      )}

                      <View style={styles.requestInfoRow}>
                        <Ionicons name="location" size={14} color="#64748B" />
                        <Text style={styles.requestInfoText} numberOfLines={1}>
                          {request.location.address || 'Location provided'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.requestCardFooter}>
                      <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
                      <Text style={styles.viewDetailsText}>View Details</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="heart-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyStateText}>
                  No urgent requests
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  We'll notify you when someone needs your blood type
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Donors</Text>
              <TouchableOpacity
                onPress={() => router.push('/(requester)/find-donors' as any)}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {loadingDonors ? (
              <View style={styles.requestLoadingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.requestLoadingText}>Loading donors...</Text>
              </View>
            ) : availableDonors.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.donorsScrollContainer}
                snapToInterval={DONOR_CARD_WIDTH + 12}
                decelerationRate="fast"
              >
                {availableDonors.map((donor) => (
                  <TouchableOpacity
                    key={donor.id}
                    style={styles.donorCard}
                    onPress={() => handleDonorPress(donor)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.donorHeader}>
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
                        <Text style={styles.donorName} numberOfLines={1}>
                          {donor.firstName} {donor.lastName}
                        </Text>
                        <View style={styles.donorBloodTypeBadge}>
                          <Ionicons name="water" size={12} color="#DC2626" />
                          <Text style={styles.donorBloodType}>{donor.bloodType}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.donorStats}>
                      <View style={styles.donorStatItem}>
                        <Ionicons name="heart" size={14} color="#EF4444" />
                        <Text style={styles.donorStatValue}>{donor.totalDonations || 0}</Text>
                      </View>
                      <View style={styles.donorStatItem}>
                        <Ionicons name="trophy" size={14} color="#F59E0B" />
                        <Text style={styles.donorStatValue}>{donor.points || 0}</Text>
                      </View>
                    </View>

                    {donor.location?.city && (
                      <View style={styles.donorLocation}>
                        <Ionicons name="location-outline" size={12} color="#64748B" />
                        <Text style={styles.donorLocationText} numberOfLines={1}>
                          {donor.location.city}
                        </Text>
                      </View>
                    )}

                    <View style={styles.donorFooter}>
                      <Text style={styles.viewDonorText}>View Profile</Text>
                      <Ionicons name="arrow-forward" size={14} color="#3B82F6" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyStateText}>No available donors</Text>
                <Text style={styles.emptyStateSubtext}>
                  Check back later or browse all donors
                </Text>
                <TouchableOpacity
                  style={styles.browseDonorsButton}
                  onPress={() => router.push('/(requester)/find-donors' as any)}
                >
                  <Text style={styles.browseDonorsButtonText}>Browse Donors</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isDonor ? 'Donation Tips' : 'Important Information'}
          </Text>
          <View style={styles.tipsCard}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <View style={styles.tipsContent}>
              {isDonor ? (
                <>
                  <Text style={styles.tipTitle}>Stay Healthy, Save Lives</Text>
                  <Text style={styles.tipText}>
                    • Drink plenty of water before donating{'\n'}
                    • Get adequate sleep the night before{'\n'}
                    • Eat iron-rich foods regularly{'\n'}
                    • Wait 8-12 weeks between donations
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.tipTitle}>Making a Request</Text>
                  <Text style={styles.tipText}>
                    • Provide accurate blood type information{'\n'}
                    • Include hospital/location details{'\n'}
                    • Set appropriate urgency level{'\n'}
                    • Keep contact information updated
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.emergencyCard}>
          <Ionicons name="call" size={24} color="#F59E0B" />
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Emergency Hotline</Text>
            <Text style={styles.emergencyNumber}>+254 XXX XXX XXX</Text>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Ionicons name="call" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#64748B" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  greetingContainer: {
    marginLeft: 12,
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  userTypeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  notificationBellWrapper: {
    flexShrink: 0,
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
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  bloodTypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: -40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.08)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
      },
    }),
  },
  bloodTypeLeft: {
    flex: 1,
  },
  bloodTypeLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  bloodTypeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  bloodTypeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloodDropEmoji: {
    fontSize: 32,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  actionCard: {
    width: (SCREEN_WIDTH - 40 - 24) / 3, // (screen width - horizontal padding - gaps) / 3 columns
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  requestLoadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    marginHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  requestLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
  },
  requestsScrollContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  requestCard: {
    width: REQUEST_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(59, 130, 246, 0.15)' } as any,
      default: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
      },
    }),
  },
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  bloodTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestBloodType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  requestCardBody: {
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  requestInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  requestInfoText: {
    fontSize: 13,
    color: '#1E293B',
    flex: 1,
  },
  requestCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  // Donor Cards Styles
  donorsScrollContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  donorCard: {
    width: DONOR_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.08)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  donorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  donorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  donorAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donorInitials: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  donorBloodTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    alignSelf: 'flex-start',
  },
  donorBloodType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  donorStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  donorStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  donorStatValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  donorLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  donorLocationText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  donorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  viewDonorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    marginHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  browseDonorsButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  browseDonorsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  tipsContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  emergencyCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 4,
  },
  emergencyNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});