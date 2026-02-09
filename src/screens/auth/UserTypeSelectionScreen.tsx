import { UserType } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const UserTypeSelectionScreen: React.FC = () => {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<UserType | null>(null);

  const handleSelectType = (type: UserType) => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (selectedType) {
      router.push({
        pathname: '/(auth)/register' as any,
        params: { userType: selectedType },
      });
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient colors={['#1b8882ff', '#16b43eff']} style={styles.gradient}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Account Type</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Intro */}
          <View style={styles.introSection}>
            <View style={styles.logoContainer}>
              <View style={styles.outerCircle}>
                <View style={styles.iconContainer}>
                  <Ionicons name="water" size={48} color="#DC2626" />
                </View>
              </View>
            </View>
            <Text style={styles.title}>Join BloodLink</Text>
            <Text style={styles.subtitle}>Select how you'd like to help save lives</Text>
          </View>

          {/* Cards */}
          <View style={styles.cardsContainer}>
            {/* Donor Card */}
            <TouchableOpacity
              style={[
                styles.typeCard,
                selectedType === 'donor' && styles.typeCardSelected,
              ]}
              onPress={() => handleSelectType('donor')}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconBadge,
                    selectedType === 'donor' && styles.iconBadgeSelectedDonor,
                  ]}
                >
                  <Ionicons
                    name="heart"
                    size={28}
                    color={selectedType === 'donor' ? '#FFFFFF' : '#DC2626'}
                  />
                </View>
                {selectedType === 'donor' && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                  </View>
                )}
              </View>

              <Text style={styles.cardTitle}>Blood Donor</Text>
              <Text style={styles.cardDescription}>
                I want to donate blood and help save lives
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>Receive urgent blood requests</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>Track donation history</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>Earn donation points</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>Set your availability</Text>
                </View>
              </View>

              <View style={styles.requirementBox}>
                <Ionicons name="information-circle-outline" size={18} color="#DC2626" />
                <Text style={styles.requirementText}>
                  Must be 18+ and weigh at least 50kg
                </Text>
              </View>
            </TouchableOpacity>

            {/* Requester Card */}
            <TouchableOpacity
              style={[
                styles.typeCard,
                selectedType === 'requester' && styles.typeCardSelected,
              ]}
              onPress={() => handleSelectType('requester')}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconBadge,
                    selectedType === 'requester' && styles.iconBadgeSelectedRequester,
                  ]}
                >
                  <Ionicons
                    name="medkit"
                    size={28}
                    color={selectedType === 'requester' ? '#FFFFFF' : '#3B82F6'}
                  />
                </View>
                {selectedType === 'requester' && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                  </View>
                )}
              </View>

              <Text style={styles.cardTitle}>Blood Requester</Text>
              <Text style={styles.cardDescription}>
                I need blood or want to help someone find donors
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>Create urgent blood requests</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>Find nearby donors instantly</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>Search blood banks</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>Track request status</Text>
                </View>
              </View>

              <View style={styles.requirementBox}>
                <Ionicons name="information-circle-outline" size={18} color="#3B82F6" />
                <Text style={styles.requirementText}>
                  For patients, family members, or caregivers
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#10B981" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Your data is safe with us</Text>
              <Text style={styles.infoDescription}>
                We protect your privacy and only share information with verified users when necessary.
              </Text>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedType && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedType}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedType ? ['#10B981', '#059669'] : ['#9CA3AF', '#6B7280']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.continueButtonText}>
                Continue as {selectedType === 'donor' ? 'Donor' : selectedType === 'requester' ? 'Requester' : 'User'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity 
              onPress={() => router.push('/(auth)/login' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fcff',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#141212ff',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    marginBottom: 16,
  },
  outerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#DC2626',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0px 6px 12px rgba(255, 255, 255, 0.3)',
        } as any
      : {
          shadowColor: '#FFFFFF',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 8,
        }),
  },
  iconContainer: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#140f0fff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#110d0dff',
    opacity: 0.95,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  cardsContainer: {
    gap: 14,
    marginBottom: 16,
  },
  typeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
        } as any
      : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }),
  },
  typeCardSelected: {
    borderColor: '#10B981',
    borderWidth: 3,
    backgroundColor: '#F0FDF4',
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 8px 24px rgba(16, 185, 129, 0.25)',
      } as any
      : {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  iconBadgeSelectedDonor: {
    backgroundColor: '#DC2626',
    borderColor: '#991B1B',
  },
  iconBadgeSelectedRequester: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
  },
  checkmark: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 20,
  },
  featuresList: {
    gap: 10,
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  featureText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    fontWeight: '500',
  },
  requirementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  requirementText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    fontWeight: '500',
    lineHeight: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 18,
    gap: 12,
    alignItems: 'flex-start',
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
      } as any
      : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }),
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  infoDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 18,
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 6px 16px rgba(16, 185, 129, 0.3)',
      } as any
      : {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
      }),
  },
  continueButtonDisabled: {
    opacity: 0.5,
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
      } as any
      : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }),
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  loginLink: {
    fontSize: 14,
    color: '#181616ff',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default UserTypeSelectionScreen;