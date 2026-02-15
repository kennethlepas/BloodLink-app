import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

interface LoadingScreenProps {
  onLoadComplete?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onLoadComplete }) => {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Content for the carousel
  const LOADING_MESSAGES = [
    "BloodLink connects donors with those in need in real-time.",
    "\"The request of a friend is a command.\" - Traditional Proverb",
    "Did you know? One pint of blood can save up to three lives.",
    "\"To give blood is to give life.\"",
    "Every 2 seconds, someone in the world needs blood.",
    "Join our community of heroes saving lives every day.",
    "BloodLink: Powered by compassion, driven by technology."
  ];

  // Animation values
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const pulseAnim = new Animated.Value(1);
  const progressAnim = new Animated.Value(0);
  const backgroundTransition = useRef(new Animated.Value(0)).current;
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    const preloadImages = async () => {
      try {
        const images = [
          require('@/assets/images/loading-bg1.jpg'),
          require('@/assets/images/loading-bg2.jpg'),
        ];

        const prefetchTasks = images.map(image => {
          const uri = Image.resolveAssetSource(image).uri;
          return Image.prefetch(uri);
        });

        await Promise.all(prefetchTasks);
        setImagesLoaded(true);
      } catch (e) {
        console.warn('Failed to preload images', e);
        setImagesLoaded(true);
      }
    };

    preloadImages();
  }, []);

  // Message rotation logic
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    return () => clearInterval(messageInterval);
  }, []);

  useEffect(() => {
    if (!imagesLoaded) return;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 15,
        stiffness: 70,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    setTimeout(() => {
      Animated.timing(backgroundTransition, {
        toValue: 1,
        duration: 2500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 2000);

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    simulateLoading();

    return () => {
      unsubscribe();
    };
  }, [imagesLoaded]);

  const simulateLoading = async () => {
    const steps = [
      { progress: 15, message: 'Initializing BloodLink...', delay: 800 },
      { progress: 30, message: 'Loading donor network...', delay: 900 },
      { progress: 45, message: 'Connecting to blood banks...', delay: 900 },
      { progress: 60, message: 'Checking connection...', delay: 900 },
      { progress: 75, message: 'Setting up your account...', delay: 900 },
      { progress: 90, message: 'Almost ready...', delay: 800 },
      { progress: 100, message: 'Welcome to BloodLink!', delay: 1000 },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      setLoadingProgress(step.progress);
      setStatusMessage(step.message);

      Animated.timing(progressAnim, {
        toValue: step.progress,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }

    setTimeout(() => {
      if (onLoadComplete) {
        onLoadComplete();
      } else {
        router.replace('/(auth)/welcome' as any);
      }
    }, 1500);
  };

  if (!imagesLoaded) {
    return <View style={[styles.container, { backgroundColor: '#0A2647' }]} />;
  }

  return (
    <View style={styles.container}>
      {/* First Background Image */}
      <ImageBackground
        source={require('@/assets/images/loading-bg1.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(10, 38, 71, 0.2)', 'rgba(10, 38, 71, 0.8)', 'rgba(10, 38, 71, 0.95)']}
          style={styles.overlay}
        />
      </ImageBackground>

      {/* Second Background Image with Fade Transition */}
      <Animated.View
        style={[
          styles.secondBackgroundContainer,
          {
            opacity: backgroundTransition,
          },
        ]}
      >
        <ImageBackground
          source={require('@/assets/images/loading-bg2.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(10, 38, 71, 0.2)', 'rgba(10, 38, 71, 0.8)', 'rgba(10, 38, 71, 0.95)']}
            style={styles.overlay}
          />
        </ImageBackground>
      </Animated.View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.ScrollView
          style={[
            { flex: 1 },
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER SECTION - Logo and App Name */}
          <View style={styles.headerSection}>
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Image
                source={require('@/assets/images/logo.jpg')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            <Text style={styles.appName}>BloodLink</Text>
            <Text style={styles.tagline}>Every Drop Counts, Every Life Matters</Text>
          </View>

          {/* CENTER CONTENT SECTION */}
          <View style={styles.centerContentSection}>
            {/* Mission Statement */}
            <View style={styles.missionCard}>
              <Text style={styles.missionTitle}>Our Mission</Text>
              <Text style={styles.missionText}>
                Connecting blood donors with those in need through a trusted,
                real-time network that saves lives across communities
              </Text>
            </View>

            {/* How It Works Section */}
            <View style={styles.usageContainer}>
              <Text style={styles.usageTitle}>How It Works</Text>
              <View style={styles.usageSteps}>
                <View style={styles.usageStep}>
                  <View style={styles.usageIconBox}><Text style={styles.usageIcon}>📝</Text></View>
                  <View style={styles.usageStepContent}>
                    <Text style={styles.usageStepTitle}>1. Register</Text>
                    <Text style={styles.usageStepDesc}>Create your secure profile</Text>
                  </View>
                </View>
                <View style={styles.usageStep}>
                  <View style={styles.usageIconBox}><Text style={styles.usageIcon}>🔍</Text></View>
                  <View style={styles.usageStepContent}>
                    <Text style={styles.usageStepTitle}>2. Connect</Text>
                    <Text style={styles.usageStepDesc}>Match by blood type & location</Text>
                  </View>
                </View>
                <View style={styles.usageStep}>
                  <View style={styles.usageIconBox}><Text style={styles.usageIcon}>❤️</Text></View>
                  <View style={styles.usageStepContent}>
                    <Text style={styles.usageStepTitle}>3. Save Lives</Text>
                    <Text style={styles.usageStepDesc}>Donate or receive help fast</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Key Features */}
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>Real-time GPS Matching</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>Verified Donor Network</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>24/7 Emergency Support</Text>
              </View>
            </View>

            {/* Dynamic Content Carousel */}
            <View style={styles.carouselContainer}>
              <Animated.Text
                key={currentMessageIndex}
                style={styles.carouselText}
                numberOfLines={3}
              >
                {LOADING_MESSAGES[currentMessageIndex]}
              </Animated.Text>
            </View>
          </View>

          {/* BOTTOM SECTION - Loading & Status */}
          <View style={styles.bottomSection}>
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{loadingProgress}%</Text>
            </View>

            {/* Status Message */}
            <Text style={styles.statusMessage}>{statusMessage}</Text>

            {/* Connection Status */}
            {isConnected === false && (
              <View style={styles.offlineBanner}>
                <View style={styles.offlineIcon}>
                  <Text style={styles.offlineIconText}>⚠️</Text>
                </View>
                <Text style={styles.offlineText}>
                  No internet connection. Running in offline mode.
                </Text>
              </View>
            )}

            {isConnected === true && (
              <View style={styles.onlineBanner}>
                <View style={styles.onlineIcon}>
                  <Text style={styles.onlineIconText}>✓</Text>
                </View>
                <Text style={styles.onlineText}>Connected & Secure</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              onPress={() => router.push('/(shared)/about-us' as any)}
              style={({ pressed }) => [
                styles.aboutButton,
                { opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Text style={styles.aboutButtonText}>About BloodLink</Text>
            </Pressable>

            <Text style={styles.versionText}>Version 1.0.0</Text>
            <Text style={styles.copyrightText}>© 2026 BloodLink. All rights reserved.</Text>
            <Text style={styles.footerTagline}>Powered by compassion, driven by technology</Text>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A2647',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  secondBackgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    minHeight: SCREEN_HEIGHT,
    paddingHorizontal: scale(24),
    paddingTop: 0,
    paddingBottom: verticalScale(20),
  },

  // HEADER SECTION - Logo at top
  headerSection: {
    alignItems: 'center',
    width: '100%',
    paddingTop: verticalScale(30),
    marginBottom: verticalScale(20),
  },
  logoContainer: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  appName: {
    fontSize: moderateScale(32),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // CENTER CONTENT SECTION
  centerContentSection: {
    width: '100%',
    marginBottom: verticalScale(18),
  },

  // Mission Card
  missionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: scale(14),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  missionTitle: {
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  missionText: {
    fontSize: moderateScale(13),
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: moderateScale(20),
    opacity: 0.95,
  },

  // How It Works
  usageContainer: {
    width: '100%',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 16,
    padding: scale(14),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  usageTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#93C5FD',
    marginBottom: verticalScale(10),
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  usageSteps: {
    gap: verticalScale(10),
  },
  usageStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usageIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  usageIcon: {
    fontSize: 18,
  },
  usageStepContent: {
    flex: 1,
  },
  usageStepTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  usageStepDesc: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.75)',
  },

  // Features Container
  featuresContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(4),
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginRight: scale(12),
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 0px 8px rgba(59, 130, 246, 0.8)',
      } as any
      : {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      }),
  },
  featureText: {
    fontSize: moderateScale(13),
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Content Carousel
  carouselContainer: {
    minHeight: verticalScale(55),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  carouselText: {
    fontSize: moderateScale(13),
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: moderateScale(19),
    opacity: 0.9,
  },

  // BOTTOM SECTION - Loading indicators
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },

  progressBarContainer: {
    width: '100%',
    marginBottom: verticalScale(12),
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 0px 12px rgba(59, 130, 246, 0.8)',
      } as any
      : {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
      }),
  },
  progressText: {
    fontSize: moderateScale(15),
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  statusMessage: {
    fontSize: moderateScale(14),
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: verticalScale(12),
    minHeight: moderateScale(20),
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Connection Status
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    width: '100%',
  },
  offlineIcon: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  offlineIconText: {
    fontSize: moderateScale(16),
  },
  offlineText: {
    fontSize: moderateScale(14),
    color: '#FCA5A5',
    fontWeight: '700',
    flex: 1,
  },
  onlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    width: '100%',
  },
  onlineIcon: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  onlineIconText: {
    fontSize: moderateScale(18),
    color: '#10B981',
    fontWeight: '900',
  },
  onlineText: {
    fontSize: moderateScale(14),
    color: '#6EE7B7',
    fontWeight: '700',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: verticalScale(15),
    paddingBottom: verticalScale(10),
  },
  aboutButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  aboutButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  versionText: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
    marginBottom: 6,
  },
  copyrightText: {
    fontSize: moderateScale(11),
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
    marginBottom: 4,
  },
  footerTagline: {
    fontSize: moderateScale(10),
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    fontStyle: 'italic',
  },
});

export default LoadingScreen;