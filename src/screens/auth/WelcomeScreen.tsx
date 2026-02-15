import { useUser } from "@/src/contexts/UserContext";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, Link, useRouter } from "expo-router";
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageStyle,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive sizing helpers
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

export default function WelcomeScreen() {
  const { loading, isAuthenticated, user } = useUser();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!loading && isAuthenticated && user && !hasRedirected.current) {
      hasRedirected.current = true;

      if (user.userType === 'donor') {
        router.replace('/(donor)' as any);
      } else if (user.userType === 'requester') {
        router.replace('/(requester)' as any);
      }
    }
  }, [loading, isAuthenticated, user]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#0A2647" />
        <LinearGradient
          colors={['#0A2647', '#144272', '#2C74B3']}
          style={styles.gradientContainer}
          locations={[0, 0.5, 1]}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#0A2647" />
        <LinearGradient
          colors={['#0A2647', '#144272', '#2C74B3']}
          style={styles.gradientContainer}
          locations={[0, 0.5, 1]}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A2647" />
      <LinearGradient
        colors={['#0A2647', '#144272', '#2C74B3']}
        style={styles.gradientContainer}
        locations={[0, 0.5, 1]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Modern Header Section */}
          <View style={styles.headerSection}>
            {/* Logo Container - Modern Card Style */}
            <View style={styles.logoCard}>
              <View style={styles.logoGlowEffect} />
              <View style={styles.logoImageContainer}>
                {/* Replace the source with your actual logo path */}
                <Image
                  source={require('@/assets/images/logo.jpg')} // Update this path
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                {/* Fallback if image not available */}
                {/* <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoText}>🩸</Text>
                </View> */}
              </View>

              {/* Verified Badge - Bottom-right outside logo container */}
              <View style={styles.logoBadge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>Verified</Text>
              </View>
            </View>

            {/* Brand Identity */}
            <View style={styles.brandSection}>
              <Text style={styles.appName}>BloodLink</Text>
              <Text style={styles.appTagline}>Every Drop Counts, Every Life Matters</Text>
            </View>
          </View>

          {/* Hero Content Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>
                Connect with{'\n'}
                <Text style={styles.heroTitleHighlight}>Life-Savers</Text> Today
              </Text>
              <Text style={styles.heroDescription}>
                Join a trusted network of donors and requesters working together to save lives through quick and reliable blood donation connections
              </Text>
            </View>

            {/* Impact Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, styles.statIconRed]}>
                  <Ionicons name="people" size={moderateScale(24)} color="#DC2626" />
                </View>
                <Text style={styles.statValue}>1,000+</Text>
                <Text style={styles.statLabel}>Active Donors</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, styles.statIconGreen]}>
                  <Ionicons name="heart" size={moderateScale(24)} color="#10B981" />
                </View>
                <Text style={styles.statValue}>500+</Text>
                <Text style={styles.statLabel}>Lives Saved</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, styles.statIconBlue]}>
                  <Ionicons name="time" size={moderateScale(24)} color="#3B82F6" />
                </View>
                <Text style={styles.statValue}>24/7</Text>
                <Text style={styles.statLabel}>Support</Text>
              </View>
            </View>
          </View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLine} />
              <Text style={styles.sectionTitle}>Why Choose BloodLink</Text>
              <View style={styles.sectionHeaderLine} />
            </View>

            <View style={styles.featuresList}>
              {/* Feature 1 */}
              <View style={styles.modernFeatureCard}>
                <View style={styles.featureIconWrapper}>
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    style={styles.featureIconGradient}
                  >
                    <Ionicons name="location-sharp" size={moderateScale(26)} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Real-Time Location Tracking</Text>
                  <Text style={styles.featureDescription}>
                    Find nearby donors instantly with our advanced GPS-powered matching system
                  </Text>
                </View>
                <View style={styles.featureArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </View>
              </View>

              {/* Feature 2 */}
              <View style={styles.modernFeatureCard}>
                <View style={styles.featureIconWrapper}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.featureIconGradient}
                  >
                    <Ionicons name="shield-checkmark" size={moderateScale(26)} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Verified & Secure Network</Text>
                  <Text style={styles.featureDescription}>
                    All donors are verified for safety with comprehensive profile screening
                  </Text>
                </View>
                <View style={styles.featureArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </View>
              </View>

              {/* Feature 3 */}
              <View style={styles.modernFeatureCard}>
                <View style={styles.featureIconWrapper}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.featureIconGradient}
                  >
                    <Ionicons name="notifications" size={moderateScale(26)} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Instant Emergency Alerts</Text>
                  <Text style={styles.featureDescription}>
                    Get notified immediately when someone in your area needs your blood type
                  </Text>
                </View>
                <View style={styles.featureArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </View>
              </View>

              {/* Feature 4 */}
              <View style={styles.modernFeatureCard}>
                <View style={styles.featureIconWrapper}>
                  <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    style={styles.featureIconGradient}
                  >
                    <Ionicons name="analytics" size={moderateScale(26)} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Track Your Impact</Text>
                  <Text style={styles.featureDescription}>
                    Monitor your donation history and see the lives you've helped save
                  </Text>
                </View>
                <View style={styles.featureArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </View>
              </View>
            </View>
          </View>

          {/* Call to Action Section */}
          <View style={styles.ctaSection}>
            <View style={styles.ctaCard}>
              <View style={styles.ctaContent}>
                <Text style={styles.ctaTitle}>Ready to Make a Difference?</Text>
                <Text style={styles.ctaSubtext}>
                  Join thousands of heroes saving lives every day
                </Text>
              </View>

              {/* Primary CTA Button */}
              <Link href={"/(auth)/user-type-selection" as Href} asChild>
                <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.primaryButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.primaryButtonText}>Get Started</Text>
                    <View style={styles.buttonIconContainer}>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Link>

              {/* Secondary Link */}
              <View style={styles.loginLinkContainer}>
                <Text style={styles.loginPromptText}>Already have an account? </Text>
                <Link href={"/(auth)/login" as Href} asChild>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.loginLinkText}>Sign In</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>

          {/* Footer Info */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our{' '}
              <Text
                style={styles.footerLink}
                onPress={() => router.push('/(auth)/terms-and-conditions' as any)}
              >
                Terms
              </Text>
              {' '}and{' '}
              <Text
                style={styles.footerLink}
                onPress={() => router.push('/(auth)/privacy-policy' as any)}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

interface Styles {
  container: ViewStyle;
  gradientContainer: ViewStyle;
  scrollContent: ViewStyle;
  loadingContainer: ViewStyle;
  headerSection: ViewStyle;
  logoCard: ViewStyle;
  logoGlowEffect: ViewStyle;
  logoImageContainer: ViewStyle;
  logoImage: ImageStyle;
  logoPlaceholder: ViewStyle;
  logoText: TextStyle;
  logoBadge: ViewStyle;
  badgeDot: ViewStyle;
  badgeText: TextStyle;
  brandSection: ViewStyle;
  appName: TextStyle;
  appTagline: TextStyle;
  heroSection: ViewStyle;
  heroCard: ViewStyle;
  heroTitle: TextStyle;
  heroTitleHighlight: TextStyle;
  heroDescription: TextStyle;
  statsGrid: ViewStyle;
  statItem: ViewStyle;
  statIconContainer: ViewStyle;
  statIconRed: ViewStyle;
  statIconGreen: ViewStyle;
  statIconBlue: ViewStyle;
  statValue: TextStyle;
  statLabel: TextStyle;
  featuresSection: ViewStyle;
  sectionHeader: ViewStyle;
  sectionHeaderLine: ViewStyle;
  sectionTitle: TextStyle;
  featuresList: ViewStyle;
  modernFeatureCard: ViewStyle;
  featureIconWrapper: ViewStyle;
  featureIconGradient: ViewStyle;
  featureTextContainer: ViewStyle;
  featureTitle: TextStyle;
  featureDescription: TextStyle;
  featureArrow: ViewStyle;
  ctaSection: ViewStyle;
  ctaCard: ViewStyle;
  ctaContent: ViewStyle;
  ctaTitle: TextStyle;
  ctaSubtext: TextStyle;
  primaryButton: ViewStyle;
  primaryButtonGradient: ViewStyle;
  primaryButtonText: TextStyle;
  buttonIconContainer: ViewStyle;
  loginLinkContainer: ViewStyle;
  loginPromptText: TextStyle;
  loginLinkText: TextStyle;
  footer: ViewStyle;
  footerText: TextStyle;
  footerLink: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#0A2647',
  },
  gradientContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(30),
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Header Section
  headerSection: {
    paddingTop: verticalScale(20),
    paddingHorizontal: scale(20),
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  logoCard: {
    position: 'relative',
    marginBottom: verticalScale(12),
  },
  logoGlowEffect: {
    position: 'absolute',
    width: moderateScale(140),
    height: moderateScale(140),
    borderRadius: 35,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -moderateScale(70) },
      { translateY: -moderateScale(70) },
    ],
    ...(Platform.OS === 'web'
      ? {
        filter: 'blur(20px)',
      } as any
      : {}),
  },
  logoImageContainer: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: moderateScale(50),
  },
  logoBadge: {
    position: 'absolute',
    bottom: -15,
    right: -10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
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
    fontSize: moderateScale(10),
    fontWeight: '700',
  },
  brandSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  appName: {
    fontSize: moderateScale(32),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  appTagline: {
    fontSize: moderateScale(14),
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(20),
  },
  heroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: scale(20),
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...(Platform.OS === 'web'
      ? {
        backdropFilter: 'blur(10px)',
      } as any
      : {}),
  },
  heroTitle: {
    fontSize: moderateScale(28),
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: moderateScale(36),
    marginBottom: verticalScale(12),
  },
  heroTitleHighlight: {
    color: '#3B82F6',
  },
  heroDescription: {
    fontSize: moderateScale(15),
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: moderateScale(22),
    fontWeight: '400',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(12),
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: scale(16),
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
      } as any
      : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }),
  },
  statIconContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIconRed: {
    backgroundColor: '#FEE2E2',
  },
  statIconGreen: {
    backgroundColor: '#D1FAE5',
  },
  statIconBlue: {
    backgroundColor: '#DBEAFE',
  },
  statValue: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: moderateScale(11),
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Features Section
  featuresSection: {
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(20),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: scale(12),
  },
  featuresList: {
    gap: verticalScale(12),
  },
  modernFeatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 18,
    padding: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)',
      } as any
      : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
      }),
  },
  featureIconWrapper: {
    marginRight: scale(14),
  },
  featureIconGradient: {
    width: moderateScale(54),
    height: moderateScale(54),
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: moderateScale(13),
    color: '#64748B',
    lineHeight: moderateScale(18),
    fontWeight: '400',
  },
  featureArrow: {
    marginLeft: scale(8),
  },

  // CTA Section
  ctaSection: {
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(15),
  },
  ctaCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: scale(24),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...(Platform.OS === 'web'
      ? {
        backdropFilter: 'blur(10px)',
      } as any
      : {}),
  },
  ctaContent: {
    marginBottom: verticalScale(20),
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaSubtext: {
    fontSize: moderateScale(14),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '400',
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: verticalScale(16),
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 6px 20px rgba(59, 130, 246, 0.4)',
      } as any
      : {
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 8,
      }),
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(24),
  },
  primaryButtonText: {
    fontSize: moderateScale(17),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  buttonIconContainer: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 6,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginPromptText: {
    fontSize: moderateScale(14),
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  loginLinkText: {
    fontSize: moderateScale(14),
    color: '#FFFFFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Footer
  footer: {
    paddingHorizontal: scale(20),
    alignItems: 'center',
  },
  footerText: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontWeight: '400',
  },
  footerLink: {
    color: '#FFFFFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});