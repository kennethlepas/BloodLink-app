import { useUser } from '@/src/contexts/UserContext';
import { handleLogoutWithConfirmation, LogoutOptions } from '@/src/utils/logoutHelper';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * Custom hook for logout functionality
 * Automatically gets logout function from UserContext
 * Use this in components where you need a logout button or trigger
 */
export const useLogout = () => {
  const { logout } = useUser();
  const router = useRouter();

  const performLogout = useCallback(
    async (options?: Partial<Omit<LogoutOptions, 'logout' | 'router'>>) => {
      await handleLogoutWithConfirmation({
        logout,
        router,
        showConfirmation: true,
        ...options,
      });
    },
    [logout, router]
  );

  return { performLogout };
};