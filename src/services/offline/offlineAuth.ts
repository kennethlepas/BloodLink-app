/**
 * Offline Authentication Service
 * Enables users to login when offline by caching credentials after
 * a successful online login. Uses SHA-256 hashing with a per-user salt.
 */

import { User } from '@/src/types/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_CREDENTIALS_PREFIX = '@bloodlink_offline_cred_';
const OFFLINE_USER_PREFIX = '@bloodlink_offline_user_';
const OFFLINE_SALT_PREFIX = '@bloodlink_offline_salt_';

/**
 * Simple SHA-256 hash using SubtleCrypto (available in React Native Hermes).
 * Falls back to a basic hash if SubtleCrypto is unavailable.
 */
const sha256 = async (message: string): Promise<string> => {
    try {
        // Try using the Web Crypto API (available in modern RN/Hermes)
        if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        }
    } catch (e) {
        // Fallback below
    }

    // Fallback: simple but deterministic hash for environments without SubtleCrypto
    let hash = 0;
    const str = message;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash + char) | 0;
    }
    // Expand to make it harder to reverse
    let result = '';
    for (let i = 0; i < 8; i++) {
        const segment = ((hash * (i + 1)) ^ (hash >> (i * 4))) >>> 0;
        result += segment.toString(16).padStart(8, '0');
    }
    return result;
};

/**
 * Generate a random salt string.
 */
const generateSalt = (): string => {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Hash a password with a given salt.
 */
const hashPassword = async (password: string, salt: string): Promise<string> => {
    return sha256(`${salt}:${password}:bloodlink_offline`);
};

/**
 * Normalize email for consistent key lookup.
 */
const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase();
};

/**
 * Save credentials after a successful online login.
 * Called from LoginScreen after Firebase auth succeeds.
 */
export const saveOfflineCredentials = async (
    email: string,
    password: string,
    userData: User
): Promise<void> => {
    try {
        const normalizedEmail = normalizeEmail(email);
        const key = `${OFFLINE_CREDENTIALS_PREFIX}${normalizedEmail}`;
        const userKey = `${OFFLINE_USER_PREFIX}${normalizedEmail}`;
        const saltKey = `${OFFLINE_SALT_PREFIX}${normalizedEmail}`;

        // Generate salt and hash password
        const salt = generateSalt();
        const hashedPassword = await hashPassword(password, salt);

        // Store everything
        await Promise.all([
            AsyncStorage.setItem(key, hashedPassword),
            AsyncStorage.setItem(saltKey, salt),
            AsyncStorage.setItem(userKey, JSON.stringify(userData)),
        ]);

        console.log('[OfflineAuth] Credentials cached for:', normalizedEmail);
    } catch (error) {
        console.warn('[OfflineAuth] Error saving offline credentials:', error);
    }
};

/**
 * Attempt offline login by validating against cached credentials.
 */
export const offlineLogin = async (
    email: string,
    password: string
): Promise<{ success: boolean; cachedUser: User | null; error?: string }> => {
    try {
        const normalizedEmail = normalizeEmail(email);
        const key = `${OFFLINE_CREDENTIALS_PREFIX}${normalizedEmail}`;
        const userKey = `${OFFLINE_USER_PREFIX}${normalizedEmail}`;
        const saltKey = `${OFFLINE_SALT_PREFIX}${normalizedEmail}`;

        // Load stored hash and salt
        const [storedHash, salt, userJson] = await Promise.all([
            AsyncStorage.getItem(key),
            AsyncStorage.getItem(saltKey),
            AsyncStorage.getItem(userKey),
        ]);

        if (!storedHash || !salt || !userJson) {
            return {
                success: false,
                cachedUser: null,
                error: 'No offline credentials found. Please login online first.',
            };
        }

        // Hash the provided password with the stored salt
        const attemptHash = await hashPassword(password, salt);

        if (attemptHash !== storedHash) {
            return {
                success: false,
                cachedUser: null,
                error: 'Invalid email or password.',
            };
        }

        // Parse cached user data
        const cachedUser: User = JSON.parse(userJson);

        // Check if account is active
        if (!cachedUser.isActive) {
            return {
                success: false,
                cachedUser: null,
                error: 'Your account has been deactivated. Please contact support.',
            };
        }

        console.log('[OfflineAuth] Offline login successful for:', normalizedEmail);
        return { success: true, cachedUser };
    } catch (error: any) {
        console.error('[OfflineAuth] Error during offline login:', error);
        return {
            success: false,
            cachedUser: null,
            error: 'An error occurred during offline login.',
        };
    }
};

/**
 * Check if offline credentials exist for a given email.
 */
export const hasOfflineCredentials = async (email: string): Promise<boolean> => {
    try {
        const normalizedEmail = normalizeEmail(email);
        const key = `${OFFLINE_CREDENTIALS_PREFIX}${normalizedEmail}`;
        const stored = await AsyncStorage.getItem(key);
        return stored !== null;
    } catch {
        return false;
    }
};

/**
 * Clear offline credentials for a specific user (on logout).
 */
export const clearOfflineCredentials = async (email: string): Promise<void> => {
    try {
        const normalizedEmail = normalizeEmail(email);
        await Promise.all([
            AsyncStorage.removeItem(`${OFFLINE_CREDENTIALS_PREFIX}${normalizedEmail}`),
            AsyncStorage.removeItem(`${OFFLINE_USER_PREFIX}${normalizedEmail}`),
            AsyncStorage.removeItem(`${OFFLINE_SALT_PREFIX}${normalizedEmail}`),
        ]);
        console.log('[OfflineAuth] Credentials cleared for:', normalizedEmail);
    } catch (error) {
        console.warn('[OfflineAuth] Error clearing offline credentials:', error);
    }
};

/**
 * Update the cached user data (when profile changes while online).
 */
export const updateOfflineCachedUser = async (
    email: string,
    userData: User
): Promise<void> => {
    try {
        const normalizedEmail = normalizeEmail(email);
        const userKey = `${OFFLINE_USER_PREFIX}${normalizedEmail}`;
        await AsyncStorage.setItem(userKey, JSON.stringify(userData));
    } catch (error) {
        console.warn('[OfflineAuth] Error updating cached user:', error);
    }
};
