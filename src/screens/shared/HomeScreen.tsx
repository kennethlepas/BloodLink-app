import { useUser } from '@/src/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

const HomeScreen: React.FC = () => {
  const { user } = useUser();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const isDonor = user?.userType === 'donor';
  const isRequester = user?.userType === 'requester';

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const handleLogout = () => {
    router.push('/(auth)/logout' as any);
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
      title: 'View Requests',
      description: 'See urgent blood requests',
      color: '#F59E0B',
      route: '/(donor)/requests',
    },
    {
      icon: 'time',
      title: 'Donation History',
      description: 'View your donations',
      color: '#3B82F6',
      route: '/(donor)/donation-history',
    },
    {
      icon: 'toggle',
      title: 'Availability',
      description: 'Manage availability',
      color: '#10B981',
      route: '/(donor)/availability-toggle',
    },
    {
      icon: 'search',
      title: 'Find Blood Banks',
      description: 'Locate nearby banks',
      color: '#6366F1',
      route: '/(shared)/find-blood',
    },
  ];

  const requesterActions = [
    {
      icon: 'add-circle',
      title: 'Create Request',
      description: 'Post blood request',
      color: '#F59E0B',
      route: '/(requester)/needblood',
    },
    {
      icon: 'list',
      title: 'My Requests',
      description: 'View your requests',
      color: '#3B82F6',
      route: '/(requester)/my-requests',
    },
    {
      icon: 'people',
      title: 'Donor Responses',
      description: 'See donor replies',
      color: '#10B981',
      route: '/(requester)/donor-responses',
    },
    {
      icon: 'search',
      title: 'Find Blood Banks',
      description: 'Locate nearby banks',
      color: '#6366F1',
      route: '/(shared)/find-blood',
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
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push('/(shared)/notifications' as any)}
            >
              <Ionicons name="notifications" size={24} color="#FFFFFF" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            {isDonor ? (
              <>
                <View style={styles.statCard}>
                  <Ionicons name="water" size={24} color="#FFFFFF" />
                  <Text style={styles.statValue} numberOfLines={1}>
                    {user.isAvailable ? 'Available' : 'Unavailable'}
                  </Text>
                  <Text style={styles.statLabel}>Status</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="trophy" size={24} color="#FFFFFF" />
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>Donations</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="star" size={24} color="#FFFFFF" />
                  <Text style={styles.statValue}>{user.points || 0}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statCard}>
                  <Ionicons name="document-text" size={24} color="#FFFFFF" />
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>Requests</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>Fulfilled</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="hourglass" size={24} color="#FFFFFF" />
                  <Text style={styles.statValue}>0</Text>
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
            {isDonor && (
              <Text style={styles.bloodTypeCompatibility}>
                Can donate to: A+, AB+
              </Text>
            )}
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
                    size={28}
                    color={action.color}
                  />
                </View>
                <Text style={styles.actionTitle} numberOfLines={1}>{action.title}</Text>
                <Text style={styles.actionDescription} numberOfLines={2}>{action.description}</Text>
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
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyStateText}>
                No urgent requests at the moment
              </Text>
              <Text style={styles.emptyStateSubtext}>
                We'll notify you when someone needs your blood type
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Requests</Text>
              <TouchableOpacity
                onPress={() => router.push('/(requester)/my-requests' as any)}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyStateText}>No active requests</Text>
              <Text style={styles.emptyStateSubtext}>
                Create a request to find donors
              </Text>
              <TouchableOpacity
                style={styles.createRequestButton}
                onPress={() =>
                  router.push('/(requester)/needblood' as any)
                }
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.createRequestButtonText}>
                  Create Request
                </Text>
              </TouchableOpacity>
            </View>
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
      </ScrollView>
    </SafeAreaView>
  );
};

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
    paddingBottom: 30,
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
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
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
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(0,0,0,0.08)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 5,
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
  bloodTypeCompatibility: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
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
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }),
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }),
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
  createRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  createRequestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
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
    padding: 16,
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

export default HomeScreen;