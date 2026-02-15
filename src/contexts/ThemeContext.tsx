import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ─── Storage key ─────────────────────────────────────────────────────────────
const DARK_MODE_KEY = '@bloodlink_dark_mode';

// ─── Color tokens ────────────────────────────────────────────────────────────
export interface ThemeColors {
    // Backgrounds
    bg: string;
    surface: string;
    surfaceAlt: string;
    surfaceBorder: string;

    // Text
    text: string;
    textSecondary: string;
    textMuted: string;

    // Dividers & borders
    divider: string;

    // Inputs
    inputBg: string;
    inputBorder: string;

    // Danger zone
    dangerBorder: string;

    // Tab bar
    tabBg: string;
    tabBorder: string;

    // Drawer overlay
    drawerOverlay: string;

    // Brand & Semantics (Added for Chat/UI consistency)
    primary: string;
    secondary: string;
    success: string;
    danger: string;
    warning: string;
}

const lightColors: ThemeColors = {
    bg: '#EFF6FF',
    surface: '#FFFFFF',
    surfaceAlt: '#F8FAFC',
    surfaceBorder: '#E8EEFF',

    text: '#0C1A3A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',

    divider: '#F1F5F9',

    inputBg: '#F8FAFC',
    inputBorder: '#E8EEFF',

    dangerBorder: '#FECACA',

    tabBg: '#FFFFFF',
    tabBorder: '#E2E8F0',

    drawerOverlay: 'rgba(0,0,0,0.5)',

    primary: '#3B82F6', // Blue 500
    secondary: '#64748B', // Slate 500
    success: '#10B981', // Emerald 500
    danger: '#EF4444', // Red 500
    warning: '#F59E0B', // Amber 500
};

const darkColors: ThemeColors = {
    bg: '#0F172A',
    surface: '#1E293B',
    surfaceAlt: '#1E293B',
    surfaceBorder: '#334155',

    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',

    divider: '#334155',

    inputBg: '#1E293B',
    inputBorder: '#475569',

    dangerBorder: '#7F1D1D',

    tabBg: '#0F172A',
    tabBorder: '#1E293B',

    drawerOverlay: 'rgba(0,0,0,0.75)',

    primary: '#60A5FA', // Blue 400 (Lighter for dark mode)
    secondary: '#94A3B8', // Slate 400
    success: '#34D399', // Emerald 400
    danger: '#F87171', // Red 400
    warning: '#FBBF24', // Amber 400
};

// ─── Context type ────────────────────────────────────────────────────────────
interface AppThemeContextType {
    isDark: boolean;
    colors: ThemeColors;
    toggleDarkMode: () => void;
}

const AppThemeContext = createContext<AppThemeContextType>({
    isDark: false,
    colors: lightColors,
    toggleDarkMode: () => { },
});

// ─── Provider ────────────────────────────────────────────────────────────────
export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDark, setIsDark] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Load persisted preference on mount
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(DARK_MODE_KEY);
                if (stored === 'true') setIsDark(true);
            } catch (e) {
                console.error('Failed to load theme preference:', e);
            } finally {
                setLoaded(true);
            }
        })();
    }, []);

    const toggleDarkMode = useCallback(() => {
        setIsDark(prev => {
            const next = !prev;
            AsyncStorage.setItem(DARK_MODE_KEY, String(next)).catch(() => { });
            return next;
        });
    }, []);

    const colors = isDark ? darkColors : lightColors;

    // Don't render until we've read the persisted value to avoid flicker
    if (!loaded) return null;

    return (
        <AppThemeContext.Provider value={{ isDark, colors, toggleDarkMode }}>
            {children}
        </AppThemeContext.Provider>
    );
};

// ─── Hook ────────────────────────────────────────────────────────────────────
export const useAppTheme = (): AppThemeContextType => {
    const ctx = useContext(AppThemeContext);
    if (!ctx) throw new Error('useAppTheme must be used within AppThemeProvider');
    return ctx;
};
