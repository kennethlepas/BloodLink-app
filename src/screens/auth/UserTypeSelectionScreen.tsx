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
      {/* Updated to light green */}
      <LinearGradient   colors={['#1b8882ff', '#16b43eff']} style={styles.gradient}>
        
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
                  <Text style={styles.logoEmoji}>🩸</Text>
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
                    size={32}
                    color={selectedType === 'donor' ? '#FFFFFF' : '#DC2626'}
                  />
                </View>
                {selectedType === 'donor' && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={30} color="#10B981" />
                  </View>
                )}
              </View>

              <Text style={styles.cardTitle}>Blood Donor</Text>
              <Text style={styles.cardDescription}>
                I want to donate blood and help save lives
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name="notifications" size={18} color="#29a845ff" />
                  </View>
                  <Text style={styles.featureText}>Receive urgent blood requests</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name="calendar" size={18} color="#3B82F6" />
                  </View>
                  <Text style={styles.featureText}>Track donation history</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name="trophy" size={18} color="#F59E0B" />
                  </View>
                  <Text style={styles.featureText}>Earn donation points</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name="time" size={18} color="#8B5CF6" />
                  </View>
                  <Text style={styles.featureText}>Set your availability</Text>
                </View>
              </View>

              <View style={styles.requirementBox}>
                <Ionicons name="information-circle" size={20} color="#DC2626" />
                <Text style={styles.requirementText}>
                  Must be 18+ years old and weigh at least 50kg
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
                    size={32}
                    color={selectedType === 'requester' ? '#FFFFFF' : '#3B82F6'}
                  />
                </View>
                {selectedType === 'requester' && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={30} color="#10B981" />
                  </View>
                )}
              </View>

              <Text style={styles.cardTitle}>Blood Requester</Text>
              <Text style={styles.cardDescription}>
                I need blood or want to help someone find donors
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name="add-circle" size={18} color="#DC2626" />
                  </View>
                  <Text style={styles.featureText}>Create urgent blood requests</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name="location" size={18} color="#3B82F6" />
                  </View>
                  <Text style={styles.featureText}>Find nearby donors instantly</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name="business" size={18} color="#10B981" />
                  </View>
                  <Text style={styles.featureText}>Search blood banks</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name="pulse" size={18} color="#F59E0B" />
                  </View>
                  <Text style={styles.featureText}>Track request status</Text>
                </View>
              </View>

              <View style={styles.requirementBox}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.requirementText}>
                  For patients, family members, or caregivers
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="shield-checkmark" size={28} color="#10B981" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Your data is safe with us</Text>
              <Text style={styles.infoDescription}>
                We protect your privacy and only share your information with verified users when necessary.
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
              <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
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
    paddingTop: 20,
    paddingBottom: 24,
    flexGrow: 1,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 20,
  },
  outerCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#DC2626',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0px 8px 16px rgba(255, 255, 255, 0.3)',
        } as any
      : {
          shadowColor: '#FFFFFF',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 10,
        }),
  },
  iconContainer: {
    width: 95,
    height: 95,
    borderRadius: 47.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoEmoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#140f0fff',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#110d0dff',
    opacity: 0.95,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  typeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
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
    marginBottom: 16,
  },
  iconBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
    borderRadius: 15,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  cardDescription: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 22,
  },
  featuresList: {
    gap: 14,
    marginBottom: 18,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e9362aff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featureText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
    fontWeight: '500',
  },
  requirementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  requirementText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
    fontWeight: '500',
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
    gap: 14,
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
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  infoDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 6px 16px rgba(212, 228, 68, 0.3)',
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
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loginText: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  loginLink: {
    fontSize: 15,
    color: '#181616ff',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default UserTypeSelectionScreen;
