import { deleteUserCollections } from '@/src/services/firebase/database';
import { auth, db } from '@/src/services/firebase/firebase';
import { User } from '@/src/types/types';
import { isValidUser, transformFirebaseUser } from '@/src/types/userTransform';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, LogBox, Platform } from 'react-native';

// Suppress Firebase offline warnings from showing as red screens
LogBox.ignoreLogs([
  'Failed to get document because the client is offline',
  'Could not reach Cloud Firestore backend',
  'WebChannelConnection RPC',
  '@firebase/firestore',
]);

// Helper to detect offline/network errors
const isOfflineError = (error: any): boolean => {
  const message = error?.message || error?.toString() || '';
  return (
    message.includes('offline') ||
    message.includes('network') ||
    message.includes('Failed to get document') ||
    message.includes('Could not reach Cloud Firestore') ||
    message.includes('WebChannel') ||
    error?.code === 'unavailable' ||
    error?.code === 'failed-precondition'
  );
};

interface UserContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  checkEmailVerification: () => Promise<boolean>;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (updates: Partial<User>) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_CACHE_KEY = '@bloodlink_user_cache';
const AUTH_STATE_KEY = '@bloodlink_auth_state';
const EMAIL_VERIFIED_KEY = '@bloodlink_email_verified';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [snapshotUnsubscribe, setSnapshotUnsubscribe] = useState<(() => void) | null>(null);

  // Load cached user data immediately on mount
  useEffect(() => {
    loadCachedUser();
  }, []);

  const loadCachedUser = async () => {
    try {
      const [cachedUser, authState, emailVerified] = await Promise.all([
        AsyncStorage.getItem(USER_CACHE_KEY),
        AsyncStorage.getItem(AUTH_STATE_KEY),
        AsyncStorage.getItem(EMAIL_VERIFIED_KEY),
      ]);

      if (cachedUser && authState === 'true') {
        const userData = JSON.parse(cachedUser);

        if (isValidUser(userData)) {
          setUser(userData);
          setIsAuthenticated(true);
          setIsEmailVerified(emailVerified === 'true');
          setLoading(false);
        } else {
          await Promise.all([
            AsyncStorage.removeItem(USER_CACHE_KEY),
            AsyncStorage.removeItem(AUTH_STATE_KEY),
            AsyncStorage.removeItem(EMAIL_VERIFIED_KEY),
          ]);
        }
      }
    } catch (error) {
      console.warn('Error loading cached user:', error);
    } finally {
      // Ensure loading is set to false if no cached user
      setLoading(false);
    }
  };

  // Clean up snapshot listener
  useEffect(() => {
    return () => {
      if (snapshotUnsubscribe) {
        snapshotUnsubscribe();
      }
    };
  }, [snapshotUnsubscribe]);

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
        console.warn('[UserContext] Error waiting for auth state:', e);
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
          console.log('[UserContext] User authenticated:', firebaseUser.uid);

          // Clean up previous snapshot listener
          if (snapshotUnsubscribe) {
            snapshotUnsubscribe();
            setSnapshotUnsubscribe(null);
          }

          // First, check if user document exists
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            console.warn('[UserContext] User document does not exist in Firestore for:', firebaseUser.uid);
            // Still set authenticated but with null user until document is created
            setIsAuthenticated(true);
            setIsEmailVerified(firebaseUser.emailVerified);
            setUser(null);
            setLoading(false);
            return;
          }

          // Set up real-time listener for user document
          const unsubscribeSnapshot = onSnapshot(
            userDocRef,
            (userDoc) => {
              if (userDoc.exists() && isMounted) {
                const firestoreData = userDoc.data();
                const userData = transformFirebaseUser(firestoreData);

                console.log('[UserContext] Profile updated in real-time:', {
                  uid: userData.id,
                  isVerified: userData.isVerified,
                  verificationStatus: userData.verificationStatus
                });

                setUser(userData);
                setIsAuthenticated(true);
                setIsEmailVerified(firebaseUser.emailVerified);

                AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(userData)).catch(err =>
                  console.warn('Error caching user:', err)
                );
                AsyncStorage.setItem(AUTH_STATE_KEY, 'true').catch(err =>
                  console.warn('Error caching auth state:', err)
                );
                AsyncStorage.setItem(EMAIL_VERIFIED_KEY, String(firebaseUser.emailVerified)).catch(err =>
                  console.warn('Error caching email verified:', err)
                );
              } else if (!userDoc.exists() && isMounted) {
                console.warn('[UserContext] User document does not exist in Firestore');
              }
              setLoading(false);
            },
            (error: any) => {
              if (isOfflineError(error)) {
                console.warn('[UserContext] Snapshot listener offline, using cached data');
                // Don't clear state — keep showing cached data
                setLoading(false);
              } else if (error.code === 'permission-denied') {
                console.warn('[UserContext] Permission denied, checking if document exists...');
                getDoc(userDocRef).then(docSnap => {
                  if (docSnap.exists() && isMounted) {
                    const userData = transformFirebaseUser(docSnap.data());
                    setUser(userData);
                    setIsAuthenticated(true);
                    setIsEmailVerified(firebaseUser.emailVerified);
                  }
                  setLoading(false);
                }).catch(getErr => {
                  console.warn('[UserContext] Error fetching document after permission denied:', getErr);
                  setLoading(false);
                });
              } else {
                console.warn('[UserContext] Snapshot listener error:', error);
                setLoading(false);
              }
            }
          );

          setSnapshotUnsubscribe(() => unsubscribeSnapshot);

        } catch (error: any) {
          if (isOfflineError(error)) {
            console.warn('[UserContext] Device is offline, using cached data');
            // Don't clear state — keep cached user data
            if (isMounted) {
              setLoading(false);
            }
          } else {
            console.warn('[UserContext] Error setting up user listener:', error);
            if (isMounted) {
              setIsAuthenticated(false);
              setIsEmailVerified(false);
              setUser(null);
              setLoading(false);
            }
          }
        }
      } else {
        if (isMounted) {
          console.log('[UserContext] No Firebase user, clearing state');

          // Clean up snapshot listener
          if (snapshotUnsubscribe) {
            snapshotUnsubscribe();
            setSnapshotUnsubscribe(null);
          }

          setUser(null);
          setIsAuthenticated(false);
          setIsEmailVerified(false);

          await Promise.all([
            AsyncStorage.removeItem(USER_CACHE_KEY),
            AsyncStorage.removeItem(AUTH_STATE_KEY),
            AsyncStorage.removeItem(EMAIL_VERIFIED_KEY),
          ]).catch(err => console.warn('Error clearing cache:', err));

          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      unsubscribe();
      if (snapshotUnsubscribe) {
        snapshotUnsubscribe();
      }
    };
  }, []);

  const login = useCallback(async (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    // When manual login happens, we assume the auth listener will pick up the emailVerified status
    // Or we should update it if we have the auth user. 
    // Since login() is usually called AFTER auth is done, check auth.currentUser
    if (auth.currentUser) {
      setIsEmailVerified(auth.currentUser.emailVerified);
    }

    await Promise.all([
      AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(userData)),
      AsyncStorage.setItem(AUTH_STATE_KEY, 'true'),
      AsyncStorage.setItem(EMAIL_VERIFIED_KEY, String(auth.currentUser?.emailVerified ?? false)),
    ]).catch(err => console.error('Error caching login data:', err));
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('Starting logout process...');

      // Clean up snapshot listener
      if (snapshotUnsubscribe) {
        snapshotUnsubscribe();
        setSnapshotUnsubscribe(null);
      }

      // 1. Sign out from Firebase Auth
      await signOut(auth);
      console.log('Signed out from Firebase Auth');

      // 2. Clear user state
      setUser(null);
      setIsAuthenticated(false);
      setIsEmailVerified(false);

      // 3. Clear AsyncStorage cache
      await Promise.all([
        AsyncStorage.removeItem(USER_CACHE_KEY),
        AsyncStorage.removeItem(AUTH_STATE_KEY),
        AsyncStorage.removeItem(EMAIL_VERIFIED_KEY),
      ]);
      console.log('Cleared cached data');

      // 4. Show success message (platform-specific)
      if (Platform.OS === 'web') {
        console.log('Logout successful');
      } else {
        Alert.alert('Success', 'You have been logged out successfully');
      }

    } catch (error) {
      console.error('Error during logout:', error);

      // Even if Firebase signout fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
      setIsEmailVerified(false);

      await Promise.all([
        AsyncStorage.removeItem(USER_CACHE_KEY),
        AsyncStorage.removeItem(AUTH_STATE_KEY),
        AsyncStorage.removeItem(EMAIL_VERIFIED_KEY),
      ]).catch(err => console.error('Error clearing cache on logout error:', err));

      // Show error message
      if (Platform.OS === 'web') {
        console.error('Logout error:', error);
      } else {
        Alert.alert('Logout Error', 'An error occurred during logout, but you have been signed out locally.');
      }

      throw error;
    }
  }, [snapshotUnsubscribe]);

  const updateUserData = useCallback(async (updates: Partial<User>) => {
    if (!user) return;

    try {
      const updatedUser = { ...user, ...updates, updatedAt: new Date().toISOString() };
      setUser(updatedUser);

      const userDocRef = doc(db, 'users', user.id);
      const cleanedUpdates = Object.fromEntries(
        Object.entries({ ...updates, updatedAt: new Date().toISOString() })
          .filter(([_, v]) => v !== undefined)
      );

      await updateDoc(userDocRef, cleanedUpdates);
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(updatedUser));
      console.log('[UserContext] User data updated and persisted');
    } catch (error) {
      console.error('[UserContext] Error updating user data:', error);
      throw error;
    }
  }, [user]);

  const deleteAccount = useCallback(async () => {
    try {
      console.log('[UserContext] Starting account deletion...');
      if (!auth.currentUser) throw new Error('No authenticated user');
      const userId = auth.currentUser.uid;

      // 1. Delete Firestore data
      await deleteUserCollections(userId);
      console.log('[UserContext] Firestore data deleted');

      // 2. Delete Auth user
      await deleteUser(auth.currentUser);
      console.log('[UserContext] Auth user deleted');

      // 3. Clear local state
      setUser(null);
      setIsAuthenticated(false);
      setIsEmailVerified(false);

      await Promise.all([
        AsyncStorage.removeItem(USER_CACHE_KEY),
        AsyncStorage.removeItem(AUTH_STATE_KEY),
        AsyncStorage.removeItem(EMAIL_VERIFIED_KEY),
      ]);
      console.log('[UserContext] Local state cleared');

      if (Platform.OS !== 'web') {
        Alert.alert('Account Deleted', 'Your account and all associated data have been permanently removed.');
      }
    } catch (error: any) {
      console.error('[UserContext] Account deletion error:', error);

      if (error.code === 'auth/requires-recent-login') {
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Action Required',
            'For security reasons, this operation requires a recent login. Please log out and log back in before deleting your account.'
          );
        }
      } else {
        if (Platform.OS !== 'web') {
          Alert.alert('Error', 'Failed to delete account. Please try again.');
        }
      }
      throw error;
    }
  }, []);

  const checkEmailVerification = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        const verified = auth.currentUser.emailVerified;
        setIsEmailVerified(verified);
        await AsyncStorage.setItem(EMAIL_VERIFIED_KEY, String(verified));
        return verified;
      }
      return false;
    } catch (e) {
      console.error('Error checking email verification:', e);
      return false;
    }
  }, []);

  const value: UserContextType = {
    user,
    loading,
    isAuthenticated,
    isEmailVerified,
    checkEmailVerification,
    login,
    logout,
    updateUserData,
    deleteAccount,
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