import { ConfirmModal } from '@/src/components/ConfirmModal';
import { useUser } from '@/src/contexts/UserContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface LogoutScreenProps {
  showConfirmation?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const LogoutScreen: React.FC<LogoutScreenProps> = ({
  showConfirmation = true,
  onSuccess,
  onError,
}) => {
  const { logout } = useUser();
  const router = useRouter();
  const [showModal, setShowModal] = useState(showConfirmation);
  const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const errorShakeAnim = useRef(new Animated.Value(0)).current;

  // Fade + scale in when status changes away from idle
  useEffect(() => {
    if (status !== 'idle') {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [status]);

  // Spinner loop
  useEffect(() => {
    if (status === 'processing') {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Subtle pulse on the icon ring
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [status]);

  // Error shake
  useEffect(() => {
    if (status === 'error') {
      Animated.sequence([
        Animated.timing(errorShakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(errorShakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(errorShakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(errorShakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(errorShakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [status]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleConfirm = async () => {
    setShowModal(false);
    setStatus('processing');
    try {
      await logout();
      onSuccess?.();
      router.replace('/(auth)/login');
    } catch (error) {
      setStatus('error');
      onError?.(error as Error);
      setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(auth)/login');
      }, 2000);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }, 100);
  };

  useEffect(() => {
    if (!showConfirmation) handleConfirm();
  }, []);

  const isError = status === 'error';
  const accentColor = isError ? '#e05555' : '#1b8882';
  const ringColor = isError ? 'rgba(224,85,85,0.12)' : 'rgba(27,136,130,0.12)';

  return (
    <>
      <ConfirmModal
        visible={showModal}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {status !== 'idle' && (
        <View style={styles.screen}>
          {/* Decorative background blobs */}
          <View style={[styles.blob, styles.blobTopRight, { backgroundColor: isError ? 'rgba(224,85,85,0.06)' : 'rgba(27,136,130,0.07)' }]} />
          <View style={[styles.blob, styles.blobBottomLeft, { backgroundColor: isError ? 'rgba(224,85,85,0.04)' : 'rgba(27,136,130,0.05)' }]} />

          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateX: isError ? errorShakeAnim : new Animated.Value(0) },
                ],
              },
            ]}
          >
            {/* Outer pulse ring */}
            <Animated.View
              style={[
                styles.ring,
                {
                  backgroundColor: ringColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              {/* Spinner arc */}
              <Animated.View
                style={[
                  styles.spinnerArc,
                  {
                    borderTopColor: accentColor,
                    borderRightColor: 'transparent',
                    borderBottomColor: 'transparent',
                    borderLeftColor: 'transparent',
                    transform: [{ rotate: spinInterpolate }],
                    display: status === 'processing' ? 'flex' : 'none',
                  },
                ]}
              />

              {/* Icon center dot */}
              <View style={[styles.iconDot, { backgroundColor: accentColor }]}>
                {isError ? (
                  <Text style={styles.iconEmoji}>✕</Text>
                ) : (
                  <Text style={styles.iconEmoji}>↩</Text>
                )}
              </View>
            </Animated.View>

            {/* Label */}
            <Text style={[styles.statusLabel, { color: accentColor }]}>
              {status === 'processing' ? 'Signing out' : 'Sign out failed'}
            </Text>

            {/* Sub-label */}
            <Text style={styles.statusSub}>
              {status === 'processing'
                ? 'Clearing your session securely…'
                : 'Redirecting you back shortly'}
            </Text>

            {/* Animated progress dots (processing only) */}
            {status === 'processing' && (
              <View style={styles.dots}>
                {[0, 1, 2].map((i) => (
                  <BounceDot key={i} delay={i * 180} color={accentColor} />
                ))}
              </View>
            )}
          </Animated.View>

          {/* Footer brand mark */}
          <Text style={styles.brand}>Secured session management</Text>
        </View>
      )}
    </>
  );
};

/** Small animated bounce dot */
const BounceDot: React.FC<{ delay: number; color: string }> = ({ delay, color }) => {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: -6, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(600 - delay),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color, transform: [{ translateY: y }] }]}
    />
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafa',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  // Background decorative blobs
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTopRight: {
    width: 280,
    height: 280,
    top: -60,
    right: -80,
  },
  blobBottomLeft: {
    width: 220,
    height: 220,
    bottom: -40,
    left: -60,
  },

  // Main card
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingVertical: 44,
    paddingHorizontal: 32,
    alignItems: 'center',
    // Elegant layered shadow
    shadowColor: '#1b8882',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 32,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(27,136,130,0.08)',
  },

  // Spinner / icon area
  ring: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  spinnerArc: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
  },
  iconDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '700',
  },

  // Text
  statusLabel: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.2,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSub: {
    fontSize: 13.5,
    fontFamily: 'Poppins-Regular',
    color: '#9aafad',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  // Bounce dots
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    opacity: 0.85,
  },

  // Footer
  brand: {
    position: 'absolute',
    bottom: 36,
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#c4d4d3',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});

export default LogoutScreen;