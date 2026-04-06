import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AwarenessModal } from '@/src/components/AwarenessModal';
import { AppThemeProvider, useAppTheme } from '@/src/contexts/ThemeContext';
import { UserProvider, useUser } from '@/src/contexts/UserContext';
import { initNotifications, registerForPushNotificationsAsync } from '@/src/services/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingScreen from './(auth)/LoadingScreen';

export const unstable_settings = {
  initialRouteName: 'index',
};

function RootLayoutNav() {
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const { isDark } = useAppTheme();
  const { user, isAuthenticated, isEmailVerified, loading: isUserLoading } = useUser();
  const segments = useSegments();
  const router = useRouter();

  // Awareness Modal State
  const [showAwareness, setShowAwareness] = useState(false);
  const [awarenessMuted, setAwarenessMuted] = useState(false);
  const hasShownOnLogin = useRef(false);
  const appState = useRef(AppState.currentState);

  // ── Guard: only allow one navigation at a time ─────────────────────────
  const isNavigating = useRef(false);

  // ── Load mute preference ──────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('awareness_muted').then(val => {
      if (val === 'true') setAwarenessMuted(true);
    });
  }, []);

  // ── Handle mute toggle from modal ─────────────────────────────────────
  const handleMuteAwareness = async () => {
    setAwarenessMuted(true);
    setShowAwareness(false);
    await AsyncStorage.setItem('awareness_muted', 'true');
  };

  const handleCloseAwareness = () => {
    setShowAwareness(false);
  };

  useEffect(() => {
    // Wait until everything is ready
    if (isUserLoading || !isSplashFinished) return;

    // Debounce: ignore rapid segment changes during Firebase init
    if (isNavigating.current) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inVerifyScreen = segments[0] === '(auth)' && segments[1] === 'verify-email';
    const inDonorGroup = segments[0] === '(donor)';
    const inRequesterGroup = segments[0] === '(requester)';
    const inMainApp = inDonorGroup || inRequesterGroup;

    // ── Case 1: Logged in, NOT verified → stay on verify screen ──────────
    if (isAuthenticated && !isEmailVerified) {
      if (!inVerifyScreen) {
        isNavigating.current = true;
        router.replace('/(auth)/verify-email');
        // Release the guard after navigation settles
        setTimeout(() => { isNavigating.current = false; }, 1000);
      }
      // Already on verify screen — do nothing, stop here
      return;
    }

    // ── Case 2: Logged in AND verified ────────────────────────────────────
    if (isAuthenticated && isEmailVerified) {
      // If still sitting on verify-email or any auth screen, push to home
      if (inVerifyScreen || inAuthGroup) {
        isNavigating.current = true;
        const destination = user?.userType === 'donor'
          ? '/(donor)'
          : user?.userType === 'requester'
            ? '/(requester)'
            : '/'; // fallback to index if userType unknown
        router.replace(destination as any);
        setTimeout(() => { isNavigating.current = false; }, 1000);
      }
      // Already in main app — do nothing
      return;
    }

    // ── Case 3: Not logged in and trying to access main app ───────────────
    if (!isAuthenticated && inMainApp) {
      isNavigating.current = true;
      router.replace('/(auth)/login');
      setTimeout(() => { isNavigating.current = false; }, 1000);
    }

  }, [isAuthenticated, isEmailVerified, isUserLoading, isSplashFinished, segments]);

  // ── App State: show awareness modal when foregrounded ─────────────────
  useEffect(() => {
    const segmentsArray = segments as string[];
    const isHome = segmentsArray.length === 0 || (segmentsArray.length === 1 && (segmentsArray[0] === '(donor)' || segmentsArray[0] === '(requester)'));

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isHome &&
        !awarenessMuted
      ) {
        setTimeout(() => setShowAwareness(true), 500);
      }
      appState.current = nextAppState;
    });

    // Show once on initial login, even if muted
    if (isSplashFinished && isHome && !hasShownOnLogin.current) {
      hasShownOnLogin.current = true;
      const timer = setTimeout(() => setShowAwareness(true), 1000);
      return () => {
        subscription.remove();
        clearTimeout(timer);
      };
    }

    return () => subscription.remove();
  }, [isSplashFinished, segments, awarenessMuted]);

  // ── Push Notifications ──────────────────────────────────────────
  useEffect(() => {
    try {
      if (isSplashFinished) {
        initNotifications();
      }
    } catch (e) {
      console.log('⚠️ Notification init skipped');
    }
  }, [isSplashFinished]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      registerForPushNotificationsAsync()
        .then(token => {
          if (token) console.log('Registered for push notifications');
        })
        .catch(() => {
          console.log('⚠️ Push notification registration skipped');
        });
    }
  }, [isAuthenticated, user?.id]);

  const handleLoadComplete = () => {
    setIsSplashFinished(true);
  };

  // Show splash while animating OR while user data loads
  if (!isSplashFinished || isUserLoading) {
    return <LoadingScreen onLoadComplete={handleLoadComplete} />;
  }

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A2647' } // Fixes white flash during transitions
      }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(donor)" options={{ headerShown: false }} />
        <Stack.Screen name="(requester)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="(shared)/guide" options={{ headerShown: false }} />
        <Stack.Screen name="(shared)/donor-verification" options={{ headerShown: false }} />
        <Stack.Screen name="(shared)/requester-verification" options={{ headerShown: false }} />
        <Stack.Screen name="(shared)/verification-status" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'auto'} />
      <AwarenessModal
        visible={showAwareness}
        onClose={handleCloseAwareness}
        onMute={handleMuteAwareness}
        isMuted={awarenessMuted}
        userType={user?.userType as any}
      />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <UserProvider>
          <RootLayoutNav />
        </UserProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}