import { useUser } from '@/src/contexts/UserContext';
import { handleLogoutWithConfirmation } from '@/src/utils/logoutHelper';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface LogoutScreenProps {
  showConfirmation?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Logout screen that automatically handles the complete logout flow
 * Gets logout function from UserContext
 */
const LogoutScreen: React.FC<LogoutScreenProps> = ({
  showConfirmation = true,
  onSuccess,
  onError,
}) => {
  const { logout } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState<'confirming' | 'processing' | 'error'>('confirming');

  useEffect(() => {
    performLogout();
  }, []);

  const performLogout = async () => {
    try {
      setStatus('confirming');
      
      await handleLogoutWithConfirmation({
        logout,
        router,
        showConfirmation,
        onSuccess: () => {
          setStatus('processing');
          onSuccess?.();
        },
        onError: (error) => {
          setStatus('error');
          onError?.(error);
        },
      });
    } catch (error) {
      setStatus('error');
      console.error('Logout screen error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#E63946" />
      <Text style={styles.text}>
        {status === 'confirming' && 'Confirming logout...'}
        {status === 'processing' && 'Logging out...'}
        {status === 'error' && 'Logout failed, redirecting...'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
});

export default LogoutScreen;