import { ConfirmModal } from '@/src/components/ConfirmModal';
import { useUser } from '@/src/contexts/UserContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
  const [showModal, setShowModal] = useState(showConfirmation);
  const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');

  const handleConfirm = async () => {
    setShowModal(false);
    setStatus('processing');

    try {
      console.log('🔄 Starting logout process...');
      await logout();
      console.log('✅ Logout successful');
      onSuccess?.();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('❌ Logout error:', error);
      setStatus('error');
      onError?.(error as Error);
      
      // Navigate away on error after brief delay
      setTimeout(() => {
        console.log('Navigating away after error...');
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(auth)/login');
        }
      }, 2000);
    }
  };

  const handleCancel = () => {
    console.log('🚫 User cancelled logout');
    setShowModal(false);
    
    // Navigate back immediately on cancel
    setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }, 100);
  };

  // If no confirmation needed, logout immediately
  React.useEffect(() => {
    if (!showConfirmation) {
      handleConfirm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#1b8882ff" />
          <Text style={styles.text}>
            {status === 'processing' && 'Logging out...'}
            {status === 'error' && 'Logout failed, redirecting...'}
          </Text>
        </View>
      )}
    </>
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