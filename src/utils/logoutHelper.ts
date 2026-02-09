import { Router } from 'expo-router';
import { Alert } from 'react-native';

interface LogoutOptions {
  logout: () => Promise<void>;
  router: Router;
  showConfirmation?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

export const handleLogoutWithConfirmation = async ({
  logout,
  router,
  showConfirmation = true,
  onSuccess,
  onError,
  onCancel,
}: LogoutOptions) => {
  try {
    if (showConfirmation) {
      Alert.alert(
        'Confirm Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            onPress: () => {
              console.log('Logout cancelled');
              onCancel?.();
            },
            style: 'cancel',
          },
          {
            text: 'Logout',
            onPress: async () => {
              try {
                await logout();
                onSuccess?.();
                router.replace('/(auth)/login');
              } catch (err) {
                console.error('Logout execution error:', err);
                onError?.(err as Error);
              }
            },
            style: 'destructive',
          },
        ],
        { cancelable: false }
      );
    } else {
      await logout();
      onSuccess?.();
      router.replace('/(auth)/login');
    }
  } catch (error) {
    console.error('Logout error:', error);
    onError?.(error as Error);
  }
};