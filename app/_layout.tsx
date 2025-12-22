import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserProvider } from '@/src/contexts/UserContext';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <UserProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
        <StatusBar style="auto" />
      </ThemeProvider>
    </UserProvider>
  );
}