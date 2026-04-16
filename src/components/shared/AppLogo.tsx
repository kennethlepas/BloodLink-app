import { moderateScale, scale } from '@/src/utils/scaling';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

interface AppLogoProps {
    variant?: 'compact' | 'large' | 'icon' | 'header';
    showBadge?: boolean;
    style?: ViewStyle;
}

/**
 * A robust, responsive Logo component for BloodLink.
 * Uses moderateScale to ensure the logo remains crisp and well-proportioned across all devices.
 */
const AppLogo: React.FC<AppLogoProps> = ({ variant = 'compact', showBadge = false, style }) => {
    const getLogoSize = () => {
        switch (variant) {
            case 'large':
                return { width: moderateScale(150), height: moderateScale(200) };
            case 'header':
                return { width: scale(48), height: scale(62) };
            case 'icon':
                return { width: moderateScale(40), height: moderateScale(40) };
            case 'compact':
            default:
                return { width: moderateScale(70), height: moderateScale(95) };
        }
    };

    const { width, height } = getLogoSize();

    return (
        <View style={[styles.logoWrapper, style]}>
            <View style={[styles.logoContainer, { width, height }]}>
                <Image
                    source={require('@/assets/images/logo.jpg')}
                    style={styles.logoImage}
                    contentFit="contain" // Ensures the logo is fully visible without cropping or distortion
                    cachePolicy="memory-disk"
                />
            </View>
            {showBadge && (
                <View style={[
                    styles.verifiedBadge,
                    variant === 'large' ? styles.largeBadge : styles.smallBadge
                ]}>
                    <Ionicons
                        name="checkmark-circle"
                        size={variant === 'large' ? 16 : 12}
                        color="#FFFFFF"
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    logoWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100, // Ensure logo is always in front
    },
    logoContainer: {
        borderRadius: 8,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
            web: {
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            } as any,
        }),
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    verifiedBadge: {
        position: 'absolute',
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#0A2647',
        zIndex: 10,
    },
    smallBadge: {
        bottom: -6,
        right: -6,
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    largeBadge: {
        bottom: -10,
        right: -10,
        width: 30,
        height: 30,
        borderRadius: 15,
    },
});

export default AppLogo;
