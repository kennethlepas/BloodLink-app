import { useUser } from "@/src/contexts/UserContext";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, Link, useRouter } from "expo-router";
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <LinearGradient
          colors={['#1b8882ff', '#16b43eff']}
          style={styles.gradientContainer}
          locations={[0, 0.5, 1]}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DC2626" />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <LinearGradient
          colors={['#1b8882ff', '#16b43eff']}
          style={styles.gradientContainer}
          locations={[0, 0.5, 1]}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DC2626" />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <LinearGradient
        colors={['#1b8882ff', '#16b43eff']}
        style={styles.gradientContainer}
        locations={[0, 0.5, 1]}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header with Enhanced Logo */}
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <View style={styles.pulseCircle} />
              <View style={styles.outerCircle}>
                <View style={styles.iconContainer}>
                  <Text style={styles.logoEmoji}>🩸</Text>
                </View>
              </View>
            </View>
            <View style={styles.brandContainer}>
              <Text style={styles.brandName}>BloodLink</Text>
              <View style={styles.taglineContainer}>
                <View style={styles.taglineDot} />
                <Text style={styles.tagline}>Connecting Lives</Text>
              </View>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            <Text style={styles.description}>
              Join our community of life-savers and make a difference today
            </Text>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>1000+</Text>
                <Text style={styles.statLabel}>Donors</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>500+</Text>
                <Text style={styles.statLabel}>Lives Saved</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>24/7</Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
            </View>

            {/* Feature Cards */}
            <View style={styles.featuresContainer}>
              <View style={styles.featureCard}>
                <View style={[styles.iconBadge, styles.iconBadgeRed]}>
                  <Ionicons name="heart" size={moderateScale(22)} color="#DC2626" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Save Lives</Text>
                  <Text style={styles.featureSubtext}>Your donation matters</Text>
                </View>
              </View>

              <View style={styles.featureCard}>
                <View style={[styles.iconBadge, styles.iconBadgeBlue]}>
                  <Ionicons name="location" size={moderateScale(22)} color="#3B82F6" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Real-time Tracking</Text>
                  <Text style={styles.featureSubtext}>Find donors nearby</Text>
                </View>
              </View>

              <View style={styles.featureCard}>
                <View style={[styles.iconBadge, styles.iconBadgeGreen]}>
                  <Ionicons name="shield-checkmark" size={moderateScale(22)} color="#10B981" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Verified Network</Text>
                  <Text style={styles.featureSubtext}>Trusted community</Text>
                </View>
              </View>

              <View style={styles.featureCard}>
                <View style={[styles.iconBadge, styles.iconBadgeOrange]}>
                  <Ionicons name="notifications" size={moderateScale(22)} color="#F59E0B" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Instant Alerts</Text>
                  <Text style={styles.featureSubtext}>Get notified immediately</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Link href={"/(auth)/user-type-selection" as Href} asChild>
              <TouchableOpacity style={styles.loginButton} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#3B82F6', '#B91C1C']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.loginButtonText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </Link>
  
            <View style={styles.bottomTextContainer}>
              <Text style={styles.helperText}>
                Already have an account?{" "}
                <Link href={"/(auth)/login" as Href} style={styles.linkText}>
                  Login
                </Link>
              </Text>
            </View>
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
  header: ViewStyle;
  logoWrapper: ViewStyle;
  pulseCircle: ViewStyle;
  outerCircle: ViewStyle;
  iconContainer: ViewStyle;
  logoEmoji: TextStyle;
  brandContainer: ViewStyle;
  brandName: TextStyle;
  taglineContainer: ViewStyle;
  taglineDot: ViewStyle;
  tagline: TextStyle;
  content: ViewStyle;
  title: TextStyle;
  description: TextStyle;
  statsContainer: ViewStyle;
  statCard: ViewStyle;
  statNumber: TextStyle;
  statLabel: TextStyle;
  featuresContainer: ViewStyle;
  featureCard: ViewStyle;
  iconBadge: ViewStyle;
  iconBadgeRed: ViewStyle;
  iconBadgeBlue: ViewStyle;
  iconBadgeGreen: ViewStyle;
  iconBadgeOrange: ViewStyle;
  featureContent: ViewStyle;
  featureTitle: TextStyle;
  featureSubtext: TextStyle;
  buttonContainer: ViewStyle;
  buttonGradient: ViewStyle;
  dividerContainer: ViewStyle;
  divider: ViewStyle;
  dividerText: TextStyle;
  bottomTextContainer: ViewStyle;
  helperText: TextStyle;
  linkText: TextStyle;
  loginButton: ViewStyle;
  loginButtonText: TextStyle;
  signupButton: ViewStyle;
  signupButtonText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fcff',
  },
  gradientContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(20),
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(15),
    alignItems: "center",
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: verticalScale(12),
  },
  pulseCircle: {
    position: 'absolute',
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -moderateScale(60) },
      { translateY: -moderateScale(60) },
    ],
  },
  outerCircle: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: 'transparent',
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: '#DC2626',
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 8px 16px rgba(220, 38, 38, 0.3)',
      } as any
      : {
        shadowColor: "rgba(220, 38, 38, 1)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
      }),
  },
  iconContainer: {
    width: moderateScale(86),
    height: moderateScale(86),
    borderRadius: moderateScale(43),
    backgroundColor: '#FFFFFF',
    alignItems: "center",
    justifyContent: "center",
    overflow: 'hidden',
  },
  logoEmoji: {
    fontSize: moderateScale(45),
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandName: {
    fontSize: moderateScale(28),
    fontWeight: "800",
    color: "#162133ff",
    letterSpacing: 0.5,
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  taglineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DC2626',
    marginRight: 6,
  },
  tagline: {
    fontSize: moderateScale(13),
    color: "#3e597eff",
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
  },
  title: {
    fontSize: moderateScale(32),
    fontWeight: "800",
    textAlign: "center",
    marginBottom: verticalScale(8),
    color: "#1E293B",
    lineHeight: moderateScale(40),
  },
  description: {
    fontSize: moderateScale(15),
    textAlign: "center",
    color: "#3e597eff",
    marginBottom: verticalScale(20),
    fontWeight: "500",
    lineHeight: moderateScale(22),
    paddingHorizontal: scale(10),
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(20),
    gap: scale(10),
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(8),
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
      } as any
      : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }),
  },
  statNumber: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: moderateScale(11),
    color: '#64748B',
    fontWeight: '600',
  },
  featuresContainer: {
    gap: verticalScale(10),
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(14),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 4px 12px rgba(0,0,0,0.06)',
      } as any
      : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }),
  },
  iconBadge: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeRed: {
    backgroundColor: "#FEE2E2",
  },
  iconBadgeBlue: {
    backgroundColor: "#DBEAFE",
  },
  iconBadgeGreen: {
    backgroundColor: "#D1FAE5",
  },
  iconBadgeOrange: {
    backgroundColor: "#FEF3C7",
  },
  featureContent: {
    marginLeft: scale(12),
    flex: 1,
  },
  featureTitle: {
    fontSize: moderateScale(15),
    fontWeight: "700",
    color: "#51555aff",
    marginBottom: 2,
  },
  featureSubtext: {
    fontSize: moderateScale(12),
    color: "#64748B",
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    gap: verticalScale(12),
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 4px 12px rgba(220, 38, 38, 0.3)',
      } as any
      : {
        shadowColor: "rgba(220, 38, 38, 1)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
      }),
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(14),
    gap: 8,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(16),
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(4),
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: scale(12),
    fontSize: moderateScale(13),
    color: '#94A3B8',
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: verticalScale(14),
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  signupButtonText: {
    color: '#196cf1ff',
    fontSize: moderateScale(16),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bottomTextContainer: {
    marginTop: verticalScale(8),
    alignItems: "center",
  },
  helperText: {
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  linkText: {
     color: '#0a0a0aff',
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});