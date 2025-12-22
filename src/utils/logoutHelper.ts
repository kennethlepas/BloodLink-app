import { Router } from 'expo-router';
import { Alert, Platform } from 'react-native';

export interface LogoutOptions {
  logout: () => Promise<void>;
  router: Router;
  showConfirmation?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Shows a platform-specific confirmation dialog
 * @returns Promise that resolves to true if confirmed, false if canceled
 */
export const confirmLogout = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return window.confirm('Are you sure you want to logout?');
  }
  
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Logout', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true }
    );
  });
};

/**
 * Handles the complete logout flow with optional confirmation
 * @param options - Configuration for logout behavior
 */
export const handleLogoutWithConfirmation = async ({
  logout,
  router,
  showConfirmation = true,
  onSuccess,
  onError,
}: LogoutOptions): Promise<void> => {
  try {
    // Show confirmation dialog if enabled
    if (showConfirmation) {
      const confirmed = await confirmLogout();
      if (!confirmed) return;
    }

    // Perform logout
    await logout();
    
    // Navigate to home with slight delay for state cleanup
    setTimeout(() => {
      router.replace('/' as any);
    }, 100);

    // Call success callback
    onSuccess?.();

  } catch (error) {
    console.error('Logout error:', error);
    
    // Show platform-specific error alert
    if (Platform.OS === 'web') {
      alert('Logout failed. Please try again.');
    } else {
      Alert.alert('Error', 'Logout failed. Please try again.');
    }

    // Call error callback
    onError?.(error as Error);
  }
};