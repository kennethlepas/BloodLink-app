import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import 'react-native-reanimated';

import { AppThemeProvider, useAppTheme } from '@/src/contexts/ThemeContext';
import { UserProvider, useUser } from '@/src/contexts/UserContext';
import LoadingScreen from './(auth)/LoadingScreen'; // Import from (auth) folder

export const unstable_settings = {
  initialRouteName: 'index',
};

function RootLayoutNav() {
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const { isDark } = useAppTheme();
  const { loading: isUserLoading } = useUser();

  // Hide loading screen after it completes its animation
  const handleLoadComplete = () => {
    console.log('Splash animation complete');
    setIsSplashFinished(true);
  };

  // Show loading screen if splash animation isn't done OR user data is still loading
  const shouldShowLoading = !isSplashFinished || isUserLoading;

  if (shouldShowLoading) {
    return <LoadingScreen onLoadComplete={handleLoadComplete} />;
  }

  // Show main app after loading
  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Welcome/Landing Screen */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* Auth Screens */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* Donor Flow */}
        <Stack.Screen name="(donor)" options={{ headerShown: false }} />

        {/* Requester Flow */}
        <Stack.Screen name="(requester)" options={{ headerShown: false }} />

        {/* Modal */}
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'auto'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <UserProvider>
        <RootLayoutNav />
      </UserProvider>
    </AppThemeProvider>
  );
}