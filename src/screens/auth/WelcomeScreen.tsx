import WelcomeSlider from '@/src/components/WelcomeSlider';
import { useUser } from "@/src/contexts/UserContext";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, Link, useRouter } from "expo-router";
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

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
        {/* Background Blood Components - Faded and Distributed */}
        <View style={styles.bloodComponentsContainer}>
          {/* Red Blood Cell 1 - Top Left Area */}
          <Svg style={styles.rbc1} width="85" height="85" viewBox="0 0 85 85">
            <Circle cx="42.5" cy="42.5" r="38" fill="rgba(220, 38, 38, 0.08)" stroke="rgba(220, 38, 38, 0.15)" strokeWidth="2" />
            <Circle cx="42.5" cy="42.5" r="25" fill="rgba(220, 38, 38, 0.05)" />
            <Circle cx="42.5" cy="42.5" r="12" fill="rgba(220, 38, 38, 0.03)" />
          </Svg>

          {/* Red Blood Cell 2 - Middle Right */}
          <Svg style={styles.rbc2} width="70" height="70" viewBox="0 0 70 70">
            <Circle cx="35" cy="35" r="30" fill="rgba(220, 38, 38, 0.07)" stroke="rgba(220, 38, 38, 0.12)" strokeWidth="1.5" />
            <Circle cx="35" cy="35" r="18" fill="rgba(220, 38, 38, 0.04)" />
          </Svg>

          {/* Red Blood Cell 3 - Bottom Center */}
          <Svg style={styles.rbc3} width="60" height="60" viewBox="0 0 60 60">
            <Circle cx="30" cy="30" r="26" fill="rgba(220, 38, 38, 0.06)" stroke="rgba(220, 38, 38, 0.1)" strokeWidth="1.5" />
            <Circle cx="30" cy="30" r="14" fill="rgba(220, 38, 38, 0.03)" />
          </Svg>

          {/* Platelet 1 - Top Right */}
          <Svg style={styles.platelet1} width="65" height="65" viewBox="0 0 65 65">
            <Ellipse cx="32.5" cy="32.5" rx="28" ry="20" fill="rgba(251, 191, 36, 0.08)" stroke="rgba(251, 191, 36, 0.15)" strokeWidth="2" />
            <Circle cx="32.5" cy="32.5" r="10" fill="rgba(251, 191, 36, 0.05)" />
            <Circle cx="22" cy="28" r="4" fill="rgba(251, 191, 36, 0.04)" />
            <Circle cx="43" cy="28" r="4" fill="rgba(251, 191, 36, 0.04)" />
          </Svg>

          {/* Platelet 2 - Bottom Left */}
          <Svg style={styles.platelet2} width="55" height="55" viewBox="0 0 55 55">
            <Ellipse cx="27.5" cy="27.5" rx="23" ry="16" fill="rgba(251, 191, 36, 0.07)" stroke="rgba(251, 191, 36, 0.12)" strokeWidth="1.5" />
            <Circle cx="27.5" cy="27.5" r="8" fill="rgba(251, 191, 36, 0.04)" />
          </Svg>

          {/* White Blood Cell 1 - Center Left */}
          <Svg style={styles.wbc1} width="75" height="75" viewBox="0 0 75 75">
            <Circle cx="37.5" cy="37.5" r="32" fill="rgba(148, 163, 184, 0.07)" stroke="rgba(148, 163, 184, 0.12)" strokeWidth="2" />
            <Circle cx="37.5" cy="37.5" r="20" fill="rgba(148, 163, 184, 0.04)" />
            <Circle cx="27" cy="27" r="6" fill="rgba(148, 163, 184, 0.05)" />
            <Circle cx="48" cy="27" r="6" fill="rgba(148, 163, 184, 0.05)" />
            <Circle cx="37.5" cy="48" r="6" fill="rgba(148, 163, 184, 0.05)" />
          </Svg>

          {/* White Blood Cell 2 - Bottom Right */}
          <Svg style={styles.wbc2} width="65" height="65" viewBox="0 0 65 65">
            <Circle cx="32.5" cy="32.5" r="28" fill="rgba(148, 163, 184, 0.06)" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1.5" />
            <Circle cx="32.5" cy="32.5" r="16" fill="rgba(148, 163, 184, 0.03)" />
            <Circle cx="24" cy="24" r="5" fill="rgba(148, 163, 184, 0.04)" />
            <Circle cx="41" cy="24" r="5" fill="rgba(148, 163, 184, 0.04)" />
          </Svg>

          {/* Plasma Drop 1 - Top Center */}
          <Svg style={styles.plasma1} width="80" height="100" viewBox="0 0 80 100">
            <Path d="M40 10 Q65 40 65 65 Q65 85 40 95 Q15 85 15 65 Q15 40 40 10" fill="rgba(59, 130, 246, 0.06)" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="2" />
            <Path d="M40 25 Q55 45 55 60 Q55 75 40 82 Q25 75 25 60 Q25 45 40 25" fill="rgba(59, 130, 246, 0.04)" />
          </Svg>

          {/* Plasma Drop 2 - Middle Right */}
          <Svg style={styles.plasma2} width="60" height="80" viewBox="0 0 60 80">
            <Path d="M30 8 Q50 35 50 55 Q50 70 30 78 Q10 70 10 55 Q10 35 30 8" fill="rgba(59, 130, 246, 0.05)" stroke="rgba(59, 130, 246, 0.08)" strokeWidth="1.5" />
          </Svg>

          {/* Plasma Drop 3 - Bottom Left */}
          <Svg style={styles.plasma3} width="50" height="65" viewBox="0 0 50 65">
            <Path d="M25 5 Q40 28 40 45 Q40 55 25 60 Q10 55 10 45 Q10 28 25 5" fill="rgba(59, 130, 246, 0.05)" stroke="rgba(59, 130, 246, 0.08)" strokeWidth="1.5" />
          </Svg>

          {/* Hospital Cross - Faded */}
          <Svg style={styles.hospitalCross} width="55" height="55" viewBox="0 0 55 55">
            <Rect x="23" y="5" width="9" height="45" fill="rgba(220, 38, 38, 0.1)" />
            <Rect x="5" y="23" width="45" height="9" fill="rgba(220, 38, 38, 0.1)" />
          </Svg>

          {/* Heartbeat Line - Bottom */}
          <Svg style={styles.heartbeat} width="120" height="40" viewBox="0 0 120 40">
            <Path d="M5 20 L25 20 L30 8 L40 32 L48 16 L56 24 L65 20 L115 20"
              fill="none"
              stroke="rgba(239, 68, 68, 0.12)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round" />
          </Svg>

          {/* Small Blood Drops Scattered */}
          <Svg style={styles.bloodDrop1} width="30" height="40" viewBox="0 0 30 40">
            <Path d="M15 2 Q25 20 25 30 Q25 38 15 38 Q5 38 5 30 Q5 20 15 2" fill="rgba(220, 38, 38, 0.08)" />
          </Svg>

          <Svg style={styles.bloodDrop2} width="25" height="35" viewBox="0 0 25 35">
            <Path d="M12.5 2 Q20 18 20 26 Q20 32 12.5 32 Q5 32 5 26 Q5 18 12.5 2" fill="rgba(220, 38, 38, 0.07)" />
          </Svg>

          <Svg style={styles.bloodDrop3} width="20" height="28" viewBox="0 0 20 28">
            <Path d="M10 2 Q16 15 16 21 Q16 26 10 26 Q4 26 4 21 Q4 15 10 2" fill="rgba(220, 38, 38, 0.06)" />
          </Svg>
        </View>

        {/* Top Navigation */}
        <View style={styles.topNavigation}>
          <Link href={"/(auth)/user-type-selection" as Href} asChild>
            <TouchableOpacity style={styles.navButton} activeOpacity={0.7}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.1)']}
                style={styles.navButtonGradient}
              >
                <Ionicons name="person-add-outline" size={14} color="#10B981" />
                <Text style={styles.navButtonText}>Sign Up</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Link>
          <View style={styles.navDivider} />
          <Link href={"/(auth)/login" as Href} asChild>
            <TouchableOpacity style={styles.navButton} activeOpacity={0.7}>
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']}
                style={styles.navButtonGradient}
              >
                <Ionicons name="log-in-outline" size={14} color="#3B82F6" />
                <Text style={[styles.navButtonText, styles.loginButtonText]}>Login</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Link>
        </View>

        <ScrollView
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
            <Text style={styles.welcomeSubtext}>Every Drop Counts, Every Life Matters</Text>
          </View>

          {/* Welcome Slider */}
          <View style={styles.sliderWrapper}>
            <WelcomeSlider />
          </View>

          {/* Stats Section - Dashboard Style (No Cards) */}
          <View style={styles.statsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLine} />
              <Text style={styles.sectionTitle}>Our Impact in Kenya</Text>
              <View style={styles.sectionHeaderLine} />
            </View>

            <View style={styles.statsDashboard}>
              <View style={styles.statsDashboardRow}>
                <View style={styles.statItemDashboard}>
                  <View style={[styles.statIconGlow, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Ionicons name="business" size={moderateScale(24)} color="#EF4444" />
                  </View>
                  <Text style={styles.statValueDashboard}>500+</Text>
                  <Text style={styles.statLabelDashboard}>Partner Hospitals</Text>
                </View>

                <View style={styles.statItemDashboard}>
                  <View style={[styles.statIconGlow, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Ionicons name="people" size={moderateScale(24)} color="#10B981" />
                  </View>
                  <Text style={styles.statValueDashboard}>2,500+</Text>
                  <Text style={styles.statLabelDashboard}>Active Donors</Text>
                </View>
              </View>

              <View style={styles.statsDashboardRow}>
                <View style={styles.statItemDashboard}>
                  <View style={[styles.statIconGlow, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Ionicons name="heart" size={moderateScale(24)} color="#3B82F6" />
                  </View>
                  <Text style={styles.statValueDashboard}>1,200+</Text>
                  <Text style={styles.statLabelDashboard}>Lives Saved</Text>
                </View>

                <View style={styles.statItemDashboard}>
                  <View style={[styles.statIconGlow, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Ionicons name="time" size={moderateScale(24)} color="#F59E0B" />
                  </View>
                  <Text style={styles.statValueDashboard}>24/7</Text>
                  <Text style={styles.statLabelDashboard}>Emergency Care</Text>
                </View>
              </View>
            </View>
          </View>

          {/* About Us Section */}
          <View style={styles.aboutSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLine} />
              <Text style={styles.sectionTitle}>Our Mission</Text>
              <View style={styles.sectionHeaderLine} />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutText}>
                BloodLink is a dedicated digital health platform committed to bridging the gap between blood donors and those in need across Kenya.
              </Text>
              <Text style={styles.aboutText}>
                We leverage technology to ensure reaching donors and managing blood requests is easier than ever, creating a seamless, verified, and efficient lifesaving network.
              </Text>
            </View>
          </View>

          {/* Why Choose Us Section - Redesigned (Staggered, No Cards) */}
          <View style={styles.whyChooseSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLine} />
              <Text style={styles.sectionTitle}>Why Choose Our Network</Text>
              <View style={styles.sectionHeaderLine} />
            </View>

            <View style={styles.staggeredFeatures}>
              {/* Feature 1 - Left */}
              <View style={styles.featureItemLeft}>
                <LinearGradient
                  colors={['#EF4444', 'rgba(239, 68, 68, 0.2)']}
                  style={styles.featureIconLarge}
                >
                  <Ionicons name="location-sharp" size={moderateScale(32)} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.featureTextContent}>
                  <Text style={styles.featureTitleLarge}>Real-Time Tracking</Text>
                  <Text style={styles.featureDescLarge}>Find nearby donors instantly with advanced GPS mapping</Text>
                </View>
              </View>

              {/* Feature 2 - Right */}
              <View style={styles.featureItemRight}>
                <View style={[styles.featureTextContent, { alignItems: 'flex-end' }]}>
                  <Text style={styles.featureTitleLarge}>Verified Network</Text>
                  <Text style={[styles.featureDescLarge, { textAlign: 'right' }]}>Every donor and hospital is thoroughly verified for your safety</Text>
                </View>
                <LinearGradient
                  colors={['#3B82F6', 'rgba(59, 130, 246, 0.2)']}
                  style={styles.featureIconLarge}
                >
                  <Ionicons name="shield-checkmark" size={moderateScale(32)} color="#FFFFFF" />
                </LinearGradient>
              </View>

              {/* Feature 3 - Left */}
              <View style={styles.featureItemLeft}>
                <LinearGradient
                  colors={['#10B981', 'rgba(16, 185, 129, 0.2)']}
                  style={styles.featureIconLarge}
                >
                  <Ionicons name="notifications" size={moderateScale(32)} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.featureTextContent}>
                  <Text style={styles.featureTitleLarge}>Emergency Alerts</Text>
                  <Text style={styles.featureDescLarge}>Receive instant notifications when blood is needed urgently</Text>
                </View>
              </View>

              {/* Feature 4 - Right */}
              <View style={styles.featureItemRight}>
                <View style={[styles.featureTextContent, { alignItems: 'flex-end' }]}>
                  <Text style={styles.featureTitleLarge}>Track Your Impact</Text>
                  <Text style={[styles.featureDescLarge, { textAlign: 'right' }]}>See exactly how many lives you've helped save through our app</Text>
                </View>
                <LinearGradient
                  colors={['#F59E0B', 'rgba(245, 158, 11, 0.2)']}
                  style={styles.featureIconLarge}
                >
                  <Ionicons name="analytics" size={moderateScale(32)} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* User Guide Section */}
          <View style={styles.guideSection}>
            <LinearGradient
              colors={['#8B5CF6', '#6D28D9']}
              style={styles.guideCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.guideIconContainer}>
                <Ionicons name="book-outline" size={moderateScale(40)} color="#FFFFFF" />
              </View>
              <View style={styles.guideContent}>
                <Text style={styles.guideTitle}>New to BloodLink?</Text>
                <Text style={styles.guideSubtext}>
                  Explore our comprehensive user guide to learn how everything works.
                </Text>
                <TouchableOpacity
                  style={styles.guideButton}
                  onPress={() => router.push('/(shared)/guide' as any)}
                >
                  <Text style={styles.guideButtonText}>Explore User Guide</Text>
                  <Ionicons name="arrow-forward" size={18} color="#8B5CF6" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* Call to Action Section */}
          <View style={styles.ctaSection}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.15)', 'rgba(37, 99, 235, 0.1)']}
              style={styles.ctaCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.ctaContent}>
                <View style={styles.kenyaBadge}>
                  <Text style={styles.kenyaBadgeText}>🇰🇪 Proudly Serving Kenya</Text>
                </View>

                <Text style={styles.ctaTitle}>
                  Ready to Make a{' '}
                  <Text style={styles.ctaHighlight}>Difference?</Text>
                </Text>

                <Text style={styles.ctaSubtext}>
                  Join thousands of Kenyan heroes saving lives every day through our trusted platform
                </Text>
              </View>

              <Link href={"/(auth)/user-type-selection" as Href} asChild>
                <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.primaryButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.primaryButtonText}>Get Started Now</Text>
                    <View style={styles.buttonIconContainer}>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Link>

              <View style={styles.loginLinkContainer}>
                <Text style={styles.loginPromptText}>Already have an account? </Text>
                <Link href={"/(auth)/login" as Href} asChild>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.loginLinkText}>Sign In →</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </LinearGradient>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.certificationRow}>
              <View style={styles.certBadge}>
                <Text style={styles.certText}>🇰🇪 Kenya Ministry of Health Approved</Text>
              </View>
            </View>

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

            <Text style={styles.copyrightText}>
              © 2024 BloodLink Kenya | Saving lives, one drop at a time
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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

  // Blood Components Container
  bloodComponentsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  // Red Blood Cells
  rbc1: {
    position: 'absolute',
    top: verticalScale(60),
    left: scale(10),
    opacity: 0.6,
  },
  rbc2: {
    position: 'absolute',
    top: verticalScale(300),
    right: scale(15),
    opacity: 0.5,
  },
  rbc3: {
    position: 'absolute',
    bottom: verticalScale(250),
    left: scale(30),
    opacity: 0.4,
  },

  // Platelets
  platelet1: {
    position: 'absolute',
    top: verticalScale(120),
    right: scale(25),
    opacity: 0.55,
  },
  platelet2: {
    position: 'absolute',
    bottom: verticalScale(350),
    right: scale(20),
    opacity: 0.45,
  },

  // White Blood Cells
  wbc1: {
    position: 'absolute',
    top: verticalScale(450),
    left: scale(8),
    opacity: 0.5,
  },
  wbc2: {
    position: 'absolute',
    bottom: verticalScale(150),
    right: scale(35),
    opacity: 0.4,
  },

  // Plasma Drops
  plasma1: {
    position: 'absolute',
    top: verticalScale(200),
    left: scale(40),
    opacity: 0.4,
  },
  plasma2: {
    position: 'absolute',
    top: verticalScale(380),
    right: scale(45),
    opacity: 0.35,
  },
  plasma3: {
    position: 'absolute',
    bottom: verticalScale(450),
    left: scale(50),
    opacity: 0.35,
  },

  // Medical Symbols
  hospitalCross: {
    position: 'absolute',
    top: verticalScale(250),
    right: scale(50),
    opacity: 0.4,
  },
  heartbeat: {
    position: 'absolute',
    bottom: verticalScale(100),
    left: scale(20),
    opacity: 0.35,
  },

  // Small Blood Drops
  bloodDrop1: {
    position: 'absolute',
    top: verticalScale(520),
    right: scale(60),
    opacity: 0.7,
  },
  bloodDrop2: {
    position: 'absolute',
    bottom: verticalScale(500),
    right: scale(80),
    opacity: 0.7,
  },
  bloodDrop3: {
    position: 'absolute',
    top: verticalScale(180),
    right: scale(70),
    opacity: 0.7,
  },

  // Top Navigation
  topNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 10,
  },
  navButton: {
    marginHorizontal: scale(4),
  },
  navButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: 20,
    gap: 6,
  },
  navButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#10B981',
  },
  loginButtonText: {
    color: '#3B82F6',
  },
  navDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: scale(8),
  },

  // Compact Header branding
  headerBranding: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
    paddingTop: verticalScale(70),
  },
  topBadgeContainer: {
    marginBottom: verticalScale(12),
    alignItems: 'center',
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
  welcomeSubtext: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    marginTop: 10,
  },

  // Slider
  sliderWrapper: {
    marginTop: verticalScale(5),
    marginBottom: verticalScale(10),
    zIndex: 1,
  },

  // Stats Section (Dashboard Style)
  statsSection: {
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(30),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
    width: '100%',
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    maxWidth: SCREEN_WIDTH * 0.2,
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: scale(12),
    textAlign: 'center',
  },
  statsDashboard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statsDashboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: verticalScale(5),
  },
  statItemDashboard: {
    alignItems: 'center',
    flex: 1,
  },
  statIconGlow: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValueDashboard: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabelDashboard: {
    fontSize: moderateScale(11),
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Why Choose Us (Redesigned)
  whyChooseSection: {
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(30),
  },
  staggeredFeatures: {
    gap: verticalScale(25),
    marginTop: verticalScale(10),
  },
  featureItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(15),
    paddingRight: scale(20),
  },
  featureItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(15),
    paddingLeft: scale(20),
    justifyContent: 'flex-end',
  },
  featureIconLarge: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(32),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureTextContent: {
    flex: 1,
  },
  featureTitleLarge: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescLarge: {
    fontSize: moderateScale(13),
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: moderateScale(18),
  },

  // About Section
  aboutSection: {
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(30),
  },
  aboutContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: scale(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  aboutText: {
    fontSize: moderateScale(14),
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: moderateScale(22),
    textAlign: 'center',
    marginBottom: 10,
  },

  // Guide Section
  guideSection: {
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(30),
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(20),
    borderRadius: 24,
    gap: scale(15),
  },
  guideIconContainer: {
    width: moderateScale(70),
    height: moderateScale(70),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  guideSubtext: {
    fontSize: moderateScale(13),
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: moderateScale(18),
    marginBottom: 12,
  },
  guideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(8),
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  guideButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: '#8B5CF6',
  },

  // CTA Section
  ctaSection: {
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(20),
  },
  ctaCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: scale(20),
  },
  ctaContent: {
    marginBottom: verticalScale(16),
    alignItems: 'center',
  },
  kenyaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: 20,
    marginBottom: verticalScale(12),
    gap: 6,
  },
  kenyaBadgeText: {
    fontSize: moderateScale(11),
    color: '#10B981',
    fontWeight: '600',
  },
  ctaTitle: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaHighlight: {
    color: '#3B82F6',
  },
  ctaSubtext: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '400',
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: verticalScale(12),
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(20),
  },
  primaryButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  buttonIconContainer: {
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 6,
    marginLeft: 8,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginPromptText: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  loginLinkText: {
    fontSize: moderateScale(12),
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Footer
  footer: {
    paddingHorizontal: scale(16),
    alignItems: 'center',
    gap: verticalScale(10),
    paddingBottom: verticalScale(20),
  },
  certificationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: 20,
    gap: 6,
  },
  certText: {
    fontSize: moderateScale(10),
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  footerText: {
    fontSize: moderateScale(10),
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    fontWeight: '400',
  },
  footerLink: {
    color: '#FFFFFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  copyrightText: {
    fontSize: moderateScale(9),
    color: 'rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
  },
});