import { UserType } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive sizing helpers
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

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
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={['#0A2647', '#144272', '#2C74B3']}
        style={styles.gradient}
        locations={[0, 0.5, 1]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoCard}>
              <View style={styles.logoGlowEffect} />
              <View style={styles.logoImageContainer}>
                <Image
                  source={require('@/assets/images/logo.jpg')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>

              {/* Verified Badge */}
              <View style={styles.logoBadge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>Verified</Text>
              </View>
            </View>

            <Text style={styles.appName}>BloodLink</Text>
            <Text style={styles.title}>Choose Your Role</Text>
            <Text style={styles.subtitle}>Select how you'd like to help save lives</Text>
          </View>

          {/* Type Selection Cards - Compact Design */}
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
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <LinearGradient
                    colors={selectedType === 'donor' ? ['#EF4444', '#DC2626'] : ['#FEE2E2', '#FCA5A5']}
                    style={styles.iconBadge}
                  >
                    <Ionicons
                      name="heart"
                      size={moderateScale(28)}
                      color={selectedType === 'donor' ? '#FFFFFF' : '#DC2626'}
                    />
                  </LinearGradient>
                </View>

                <View style={styles.cardCenter}>
                  <Text style={styles.cardTitle}>Blood Donor</Text>
                  <Text style={styles.cardDescription}>
                    Donate blood and help save lives in your community
                  </Text>

                  <View style={styles.quickFeatures}>
                    <View style={styles.quickFeature}>
                      <Ionicons name="notifications-outline" size={14} color="#64748B" />
                      <Text style={styles.quickFeatureText}>Urgent alerts</Text>
                    </View>
                    <View style={styles.quickFeature}>
                      <Ionicons name="bar-chart-outline" size={14} color="#64748B" />
                      <Text style={styles.quickFeatureText}>Track history</Text>
                    </View>
                    <View style={styles.quickFeature}>
                      <Ionicons name="star-outline" size={14} color="#64748B" />
                      <Text style={styles.quickFeatureText}>Earn points</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardRight}>
                  {selectedType === 'donor' && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    </View>
                  )}
                  {selectedType !== 'donor' && (
                    <View style={styles.emptyCircle} />
                  )}
                </View>
              </View>

              {selectedType === 'donor' && (
                <View style={styles.requirementBanner}>
                  <Ionicons name="information-circle" size={16} color="#F59E0B" />
                  <Text style={styles.requirementText}>Must be 18+ and weigh at least 50kg</Text>
                </View>
              )}
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
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <LinearGradient
                    colors={selectedType === 'requester' ? ['#3B82F6', '#2563EB'] : ['#DBEAFE', '#93C5FD']}
                    style={styles.iconBadge}
                  >
                    <Ionicons
                      name="medkit"
                      size={moderateScale(28)}
                      color={selectedType === 'requester' ? '#FFFFFF' : '#3B82F6'}
                    />
                  </LinearGradient>
                </View>

                <View style={styles.cardCenter}>
                  <Text style={styles.cardTitle}>Blood Requester</Text>
                  <Text style={styles.cardDescription}>
                    Find donors quickly for patients in need of blood
                  </Text>

                  <View style={styles.quickFeatures}>
                    <View style={styles.quickFeature}>
                      <Ionicons name="add-circle-outline" size={14} color="#64748B" />
                      <Text style={styles.quickFeatureText}>Create requests</Text>
                    </View>
                    <View style={styles.quickFeature}>
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text style={styles.quickFeatureText}>Find donors</Text>
                    </View>
                    <View style={styles.quickFeature}>
                      <Ionicons name="business-outline" size={14} color="#64748B" />
                      <Text style={styles.quickFeatureText}>Blood banks</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardRight}>
                  {selectedType === 'requester' && (
                    <View style={styles.checkmarkCircle}>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    </View>
                  )}
                  {selectedType !== 'requester' && (
                    <View style={styles.emptyCircle} />
                  )}
                </View>
              </View>

              {selectedType === 'requester' && (
                <View style={styles.requirementBanner}>
                  <Ionicons name="information-circle" size={16} color="#3B82F6" />
                  <Text style={styles.requirementText}>For patients, family members, or caregivers</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Your data is safe with us</Text>
              <Text style={styles.infoDescription}>
                We protect your privacy and only share information with verified users
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
              colors={selectedType ? ['#3B82F6', '#2563EB'] : ['#9CA3AF', '#6B7280']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.continueButtonText}>
                {selectedType ? `Continue as ${selectedType === 'donor' ? 'Donor' : 'Requester'}` : 'Select Account Type'}
              </Text>
              <View style={styles.buttonIconContainer}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLink}>Sign In</Text>
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
    backgroundColor: '#0A2647',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(24),
    flexGrow: 1,
  },

  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  logoCard: {
    position: 'relative',
    marginBottom: verticalScale(10),
  },
  logoGlowEffect: {
    position: 'absolute',
    width: moderateScale(110),
    height: moderateScale(110),
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -moderateScale(55) },
      { translateY: -moderateScale(55) },
    ],
    ...(Platform.OS === 'web'
      ? {
        filter: 'blur(20px)',
      } as any
      : {}),
  },
  logoImageContainer: {
    width: moderateScale(95),
    height: moderateScale(95),
    borderRadius: 24,
    backgroundColor: '#f6ededd1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(1),
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.3)',
      } as any
      : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
      }),
  },
  logoImage: {
    width: '90%',
    height: '90%',
    borderRadius: 40,
  },
  logoBadge: {
    position: 'absolute',
    bottom: -15,
    right: -10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#144272',
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 4px 12px rgba(16, 185, 129, 0.4)',
      } as any
      : {
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      }),
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(9),
    fontWeight: '700',
  },
  appName: {
    fontSize: moderateScale(24),
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: moderateScale(22),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: moderateScale(14),
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },

  // Cards Container
  cardsContainer: {
    gap: verticalScale(14),
    marginBottom: verticalScale(20),
  },
  typeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 18,
    padding: scale(16),
    borderWidth: 2,
    borderColor: 'rgba(226, 232, 240, 0.5)',
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
    backgroundColor: '#FFFFFF',
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  cardLeft: {
    width: moderateScale(60),
    height: moderateScale(60),
  },
  iconBadge: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCenter: {
    flex: 1,
  },
  cardTitle: {
    fontSize: moderateScale(17),
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: moderateScale(13),
    color: '#64748B',
    lineHeight: moderateScale(18),
    marginBottom: 8,
  },
  quickFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickFeatureText: {
    fontSize: moderateScale(11),
    color: '#64748B',
    fontWeight: '500',
  },
  cardRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkCircle: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCircle: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: 'transparent',
  },
  requirementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: scale(10),
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  requirementText: {
    fontSize: moderateScale(12),
    color: '#92400E',
    flex: 1,
    fontWeight: '500',
    lineHeight: moderateScale(16),
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: scale(14),
    borderRadius: 14,
    marginBottom: verticalScale(20),
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
  infoIconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: moderateScale(12),
    color: '#64748B',
    lineHeight: moderateScale(17),
  },

  // Continue Button
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: verticalScale(18),
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 6px 20px rgba(59, 130, 246, 0.4)',
      } as any
      : {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
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
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(24),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  buttonIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 6,
  },

  // Login Link
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
  },
  loginText: {
    fontSize: moderateScale(14),
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loginLink: {
    fontSize: moderateScale(14),
    color: '#FFFFFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default UserTypeSelectionScreen;