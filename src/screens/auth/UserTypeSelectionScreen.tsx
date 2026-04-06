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
          {/* Compact Header Section */}
          <View style={styles.headerBranding}>
            <View style={styles.topBadgeContainer}>
              <View style={styles.introBadge}>
                <Text style={styles.introBadgeText}>🇰🇪 Kenya's Leading Network</Text>
              </View>
            </View>

            <View style={styles.logoRow}>
              <View style={styles.logoWrapper}>
                <View style={styles.logoCompact}>
                  <Image
                    source={require('@/assets/images/logo.jpg')}
                    style={styles.logoImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.verifiedMiniBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.brandTitleContainer}>
                <Text style={styles.appNameCompact}>BloodLink</Text>
                <Text style={styles.appTaglineCompact}>Blood Donation Management System</Text>
              </View>
            </View>
          </View>

          <View style={styles.selectionPrompt}>
            <Text style={styles.titleText}>Choose Your Role</Text>
            <Text style={styles.subtitleText}>Select how you'll help save lives today</Text>
          </View>

          {/* Type Selection Cards - Modern Translucent Design */}
          <View style={styles.cardsGrid}>
            {/* Donor Card */}
            <TouchableOpacity
              style={[
                styles.glassCard,
                selectedType === 'donor' && styles.glassCardSelected,
              ]}
              onPress={() => handleSelectType('donor')}
              activeOpacity={0.7}
            >
              <View style={styles.glassCardContent}>
                <View style={[styles.iconGlow, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="heart" size={moderateScale(28)} color="#EF4444" />
                </View>
                <View style={styles.glassCardText}>
                  <Text style={styles.glassCardTitle}>Blood Donor</Text>
                  <Text style={styles.glassCardDesc}>Donate & help save lives locally</Text>
                </View>
                <View style={styles.selectorContainer}>
                  {selectedType === 'donor' ? (
                    <View style={styles.activeDot} />
                  ) : (
                    <View style={styles.inactiveDot} />
                  )}
                </View>
              </View>
            </TouchableOpacity>

            {/* Requester Card */}
            <TouchableOpacity
              style={[
                styles.glassCard,
                selectedType === 'requester' && styles.glassCardSelected,
              ]}
              onPress={() => handleSelectType('requester')}
              activeOpacity={0.7}
            >
              <View style={styles.glassCardContent}>
                <View style={[styles.iconGlow, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Ionicons name="medkit" size={moderateScale(28)} color="#3B82F6" />
                </View>
                <View style={styles.glassCardText}>
                  <Text style={styles.glassCardTitle}>Blood Requester</Text>
                  <Text style={styles.glassCardDesc}>Find donors for patients in need</Text>
                </View>
                <View style={styles.selectorContainer}>
                  {selectedType === 'requester' ? (
                    <View style={styles.activeDot} />
                  ) : (
                    <View style={styles.inactiveDot} />
                  )}
                </View>
              </View>
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
    paddingBottom: verticalScale(20),
    flexGrow: 1,
  },

  // Compact Header branding
  headerBranding: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  topBadgeContainer: {
    marginBottom: verticalScale(12),
  },
  introBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  introBadgeText: {
    fontSize: moderateScale(10),
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(15),
  },
  logoWrapper: {
    position: 'relative',
  },
  logoCompact: {
    width: moderateScale(70),
    height: moderateScale(95),
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  verifiedMiniBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0A2647',
    zIndex: 10,
  },
  brandTitleContainer: {
    justifyContent: 'center',
  },
  appNameCompact: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  appTaglineCompact: {
    fontSize: moderateScale(11),
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  selectionPrompt: {
    marginBottom: verticalScale(15),
    alignItems: 'center',
  },
  titleText: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: moderateScale(13),
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Glass Cards
  cardsGrid: {
    gap: verticalScale(12),
    marginBottom: verticalScale(15),
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: scale(16),
  },
  glassCardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  glassCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(15),
  },
  iconGlow: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCardText: {
    flex: 1,
  },
  glassCardTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  glassCardDesc: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.6)',
  },
  selectorContainer: {
    paddingLeft: scale(10),
  },
  activeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  inactiveDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Info Card (Compact)
  infoCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    gap: 12,
    marginBottom: verticalScale(15),
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoDescription: {
    fontSize: moderateScale(11),
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: moderateScale(15),
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
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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