import { auth, db } from '@/src/services/firebase/firebase';
import { User } from '@/src/types/types';
import { isValidUser, transformFirebaseUser } from '@/src/types/userTransform';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

interface UserContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (updates: Partial<User>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_CACHE_KEY = '@bloodlink_user_cache';
const AUTH_STATE_KEY = '@bloodlink_auth_state';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load cached user data immediately on mount
  useEffect(() => {
    loadCachedUser();
  }, []);

  const loadCachedUser = async () => {
    try {
      const [cachedUser, authState] = await Promise.all([
        AsyncStorage.getItem(USER_CACHE_KEY),
        AsyncStorage.getItem(AUTH_STATE_KEY),
      ]);

      if (cachedUser && authState === 'true') {
        const userData = JSON.parse(cachedUser);

        if (isValidUser(userData)) {
          setUser(userData);
          setIsAuthenticated(true);
          setLoading(false);
        } else {
          await Promise.all([
            AsyncStorage.removeItem(USER_CACHE_KEY),
            AsyncStorage.removeItem(AUTH_STATE_KEY),
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading cached user:', error);
    }
  };

  // Set up Firebase auth listener with enhanced initialization check
  useEffect(() => {
    let isMounted = true;
    console.log('[UserContext] Starting initialization');

    // Safety timeout to ensure loading doesn't stick forever (e.g. 10 seconds)
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[UserContext] Initialization timed out, forcing loading false');
        setLoading(false);
      }
    }, 10000);

    // Use authStateReady for reliable initial state
    (async () => {
      try {
        console.log('[UserContext] Waiting for auth state...');
        await auth.authStateReady();
        console.log('[UserContext] Auth state ready');
      } catch (e) {
        console.error('[UserContext] Error waiting for auth state:', e);
      } finally {
        if (isMounted && !auth.currentUser) {
          // If no user after ready, stop loading
          console.log('[UserContext] No user found after ready, stopping loading');
          setLoading(false);
        }
      }
    })();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      // Clear safety timeout if we get a response
      clearTimeout(safetyTimeout);

      if (firebaseUser) {
        try {
          // Timeout for Firestore fetch (5 seconds)
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore fetch timeout')), 5000)
          );

          const userDocPromise = getDoc(doc(db, 'users', firebaseUser.uid));

          const userDoc: any = await Promise.race([userDocPromise, timeoutPromise]);

          if (userDoc.exists() && isMounted) {
            const firestoreData = userDoc.data();
            const userData = transformFirebaseUser(firestoreData);

            setUser(userData);
            setIsAuthenticated(true);

            await Promise.all([
              AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(userData)),
              AsyncStorage.setItem(AUTH_STATE_KEY, 'true'),
            ]);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          if (isMounted) {
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
          await Promise.all([
            AsyncStorage.removeItem(USER_CACHE_KEY),
            AsyncStorage.removeItem(AUTH_STATE_KEY),
          ]);
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);

    await Promise.all([
      AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(userData)),
      AsyncStorage.setItem(AUTH_STATE_KEY, 'true'),
    ]);
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('Starting logout process...');

      // 1. Sign out from Firebase Auth
      await signOut(auth);
      console.log('Signed out from Firebase Auth');

      // 2. Clear user state
      setUser(null);
      setIsAuthenticated(false);

      // 3. Clear AsyncStorage cache
      await Promise.all([
        AsyncStorage.removeItem(USER_CACHE_KEY),
        AsyncStorage.removeItem(AUTH_STATE_KEY),
      ]);
      console.log('Cleared cached data');

      // 4. Show success message (platform-specific)
      if (Platform.OS === 'web') {
        // For web, we can use a simple alert or toast
        console.log('Logout successful');
      } else {
        Alert.alert('Success', 'You have been logged out successfully');
      }

    } catch (error) {
      console.error('Error during logout:', error);

      // Even if Firebase signout fails, clear local state
      setUser(null);
      setIsAuthenticated(false);

      await Promise.all([
        AsyncStorage.removeItem(USER_CACHE_KEY),
        AsyncStorage.removeItem(AUTH_STATE_KEY),
      ]);

      // Show error message
      if (Platform.OS === 'web') {
        console.error('Logout error:', error);
      } else {
        Alert.alert('Logout Error', 'An error occurred during logout, but you have been signed out locally.');
      }

      throw error;
    }
  }, []);

  const updateUserData = useCallback(async (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);

    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(updatedUser));
  }, [user]);

  const value: UserContextType = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUserData,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};