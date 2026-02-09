import { useUser } from '@/src/contexts/UserContext';
import { updateUser } from '@/src/services/firebase/database';
import { Donor } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AvailabilityHistoryItem {
  id: string;
  status: 'available' | 'unavailable';
  changedAt: string;
  reason?: string;
}

const AvailabilityScreen: React.FC = () => {
  const router = useRouter();
  const { user, updateUserData } = useUser();
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastDonationInfo, setLastDonationInfo] = useState<string | null>(null);
  const [nextEligibleDate, setNextEligibleDate] = useState<string | null>(null);

  // Type guard to check if user is a donor
  const isDonor = (user: any): user is Donor => {
    return user?.userType === 'donor';
  };

  useEffect(() => {
    if (user) {
      setIsAvailable(user.isAvailable || false);
      calculateEligibility();
    }
  }, [user]);

  const calculateEligibility = () => {
    if (!user || !isDonor(user)) return;

    if (user.lastDonationDate) {
      const lastDonation = new Date(user.lastDonationDate);
      const today = new Date();
      const daysSinceLastDonation = Math.floor(
        (today.getTime() - lastDonation.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Minimum waiting period is 56 days (8 weeks) between donations
      const minWaitingDays = 56;
      const daysUntilEligible = minWaitingDays - daysSinceLastDonation;

      if (daysUntilEligible > 0) {
        const eligibleDate = new Date(lastDonation);
        eligibleDate.setDate(eligibleDate.getDate() + minWaitingDays);
        setNextEligibleDate(eligibleDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }));
        setLastDonationInfo(`${daysSinceLastDonation} days ago`);
      } else {
        setNextEligibleDate(null);
        setLastDonationInfo(`${daysSinceLastDonation} days ago - You're eligible!`);
      }
    } else {
      setNextEligibleDate(null);
      setLastDonationInfo(null);
    }
  };

  const handleToggleAvailability = async (value: boolean) => {
    if (!user?.id) return;

    // Check if user donated recently and is trying to set available
    if (value && nextEligibleDate) {
      Alert.alert(
        'Not Yet Eligible',
        `You need to wait until ${nextEligibleDate} before donating again. This is for your health and safety.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setLoading(true);
      setIsAvailable(value);

      await updateUser(user.id, { isAvailable: value });
      await updateUserData({ isAvailable: value });

      Alert.alert(
        'Success',
        `You are now ${value ? 'available' : 'unavailable'} for donations. ${
          value
            ? 'Requesters will be able to see your availability.'
            : 'You will not receive blood requests until you turn availability back on.'
        }`
      );
    } catch (error) {
      console.error('Error updating availability:', error);
      setIsAvailable(!value); // Revert on error
      Alert.alert('Error', 'Failed to update availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    calculateEligibility();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleBack = () => {
    router.back();
  };

  if (!user || !isDonor(user)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = () => (isAvailable ? '#10B981' : '#94A3B8');
  const getStatusIcon = () => (isAvailable ? 'checkmark-circle' : 'close-circle');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

      {/* Header */}
      <LinearGradient colors={['#DC2626', '#991B1B']} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Donation Availability</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Main Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusIconContainer}>
            <View
              style={[
                styles.statusIconCircle,
                { backgroundColor: `${getStatusColor()}20` },
              ]}
            >
              <Ionicons
                name={getStatusIcon()}
                size={64}
                color={getStatusColor()}
              />
            </View>
          </View>

          <Text style={styles.statusTitle}>
            {isAvailable ? "You're Available" : "You're Unavailable"}
          </Text>
          <Text style={styles.statusSubtitle}>
            {isAvailable
              ? 'Requesters can see your availability and contact you for donations'
              : 'You will not appear in donor searches or receive blood requests'}
          </Text>

          <View style={styles.toggleContainer}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Donation Availability</Text>
              <Text style={styles.toggleSubtext}>
                {isAvailable ? 'Available to donate' : 'Not available to donate'}
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
              thumbColor={isAvailable ? '#10B981' : '#94A3B8'}
              ios_backgroundColor="#CBD5E1"
              disabled={loading}
            />
          </View>
        </View>

        {/* Eligibility Card */}
        {user.lastDonationDate && (
          <View style={styles.eligibilityCard}>
            <View style={styles.eligibilityHeader}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={nextEligibleDate ? '#F59E0B' : '#10B981'}
              />
              <Text style={styles.eligibilityTitle}>Donation Eligibility</Text>
            </View>

            <View style={styles.eligibilityContent}>
              <View style={styles.eligibilityRow}>
                <Text style={styles.eligibilityLabel}>Last Donation</Text>
                <Text style={styles.eligibilityValue}>
                  {new Date(user.lastDonationDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              {lastDonationInfo && (
                <View style={styles.eligibilityRow}>
                  <Text style={styles.eligibilityLabel}>Time Since Last</Text>
                  <Text style={styles.eligibilityValue}>{lastDonationInfo}</Text>
                </View>
              )}

              {nextEligibleDate ? (
                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                  <View style={styles.warningContent}>
                    <Text style={styles.warningTitle}>Not Yet Eligible</Text>
                    <Text style={styles.warningText}>
                      You can donate again on {nextEligibleDate}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <View style={styles.successContent}>
                    <Text style={styles.successTitle}>You're Eligible!</Text>
                    <Text style={styles.successText}>
                      You can donate blood at any time
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Statistics Cards */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="water" size={28} color="#DC2626" />
              </View>
              <Text style={styles.statValue}>{user.totalDonations || 0}</Text>
              <Text style={styles.statLabel}>Total Donations</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="heart" size={28} color="#EF4444" />
              </View>
              <Text style={styles.statValue}>
                {(user.totalDonations || 0) * 3}
              </Text>
              <Text style={styles.statLabel}>Lives Saved</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="star" size={28} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{user.points || 0}</Text>
              <Text style={styles.statLabel}>Points Earned</Text>
            </View>
          </View>
        </View>

        {/* Important Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Important Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="time-outline" size={24} color="#3B82F6" />
              <Text style={styles.infoTitle}>Donation Frequency</Text>
            </View>
            <Text style={styles.infoText}>
              You must wait at least 8 weeks (56 days) between blood donations. This
              allows your body to replenish red blood cells and maintain healthy iron
              levels.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="fitness-outline" size={24} color="#10B981" />
              <Text style={styles.infoTitle}>Health Requirements</Text>
            </View>
            <Text style={styles.infoText}>
              • Be in good general health{'\n'}
              • Weigh at least 50kg (110 lbs){'\n'}
              • Be well-rested and hydrated{'\n'}
              • Have eaten within the last 4 hours{'\n'}
              • Not be taking certain medications
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#6366F1" />
              <Text style={styles.infoTitle}>Safety First</Text>
            </View>
            <Text style={styles.infoText}>
              Blood donation is safe and follows strict hygiene protocols. Sterile
              equipment is used for each donor, and trained professionals monitor the
              entire process.
            </Text>
          </View>
        </View>

        {/* Preparation Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Before You Donate</Text>
          
          <View style={styles.tipCard}>
            <View style={styles.tipIconContainer}>
              <Ionicons name="water-outline" size={24} color="#3B82F6" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Stay Hydrated</Text>
              <Text style={styles.tipText}>
                Drink plenty of water (at least 16 oz) before donation
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipIconContainer}>
              <Ionicons name="restaurant-outline" size={24} color="#F59E0B" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Eat Iron-Rich Foods</Text>
              <Text style={styles.tipText}>
                Include red meat, spinach, beans, or fortified cereals
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipIconContainer}>
              <Ionicons name="moon-outline" size={24} color="#6366F1" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Get Adequate Sleep</Text>
              <Text style={styles.tipText}>
                Ensure you have at least 7-8 hours of sleep the night before
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipIconContainer}>
              <Ionicons name="flash-off-outline" size={24} color="#EF4444" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Avoid Fatty Foods</Text>
              <Text style={styles.tipText}>
                Skip greasy foods before donation to ensure quality
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(donor)/donation-history' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="list-outline" size={22} color="#3B82F6" />
            <Text style={styles.actionButtonText}>View Donation History</Text>
            <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(donor)/requests' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color="#F59E0B" />
            <Text style={styles.actionButtonText}>View Blood Requests</Text>
            <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              Alert.alert('Coming Soon', 'Health tracker will be available soon')
            }
            activeOpacity={0.7}
          >
            <Ionicons name="fitness-outline" size={22} color="#10B981" />
            <Text style={styles.actionButtonText}>Health Tracker</Text>
            <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Emergency Contact */}
        <View style={styles.emergencyCard}>
          <Ionicons name="medical" size={28} color="#EF4444" />
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Need Help?</Text>
            <Text style={styles.emergencyText}>
              Contact support if you have questions about eligibility or health concerns
            </Text>
          </View>
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
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
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
  statusIconContainer: {
    marginBottom: 16,
  },
  statusIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  toggleSubtext: {
    fontSize: 13,
    color: '#64748B',
  },
  eligibilityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
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
  eligibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  eligibilityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  eligibilityContent: {
    gap: 12,
  },
  eligibilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eligibilityLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  eligibilityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
  },
  successBox: {
    flexDirection: 'row',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 2,
  },
  successText: {
    fontSize: 13,
    color: '#065F46',
  },
  statsSection: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
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
    marginBottom: 8,
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
  infoSection: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  infoCard: {
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
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  tipsSection: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  tipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
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
  emergencyCard: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default AvailabilityScreen;