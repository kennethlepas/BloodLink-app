import { useNavigation } from '@react-navigation/native';
import { useCallback, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { getHangingTabStyle } from '../constants/TabStyles';
import { useAppTheme } from '../contexts/ThemeContext';

/**
 * Hook to automatically hide/show the tab bar on scroll.
 * Usage: 
 * const { onScroll } = useTabBarAnimation();
 * ...
 * <FlatList onScroll={onScroll} ... />
 */
export const useTabBarAnimation = () => {
    const navigation = useNavigation();
    const lastScrollY = useRef(0);
    const { colors, isDark } = useAppTheme();
    const isHidden = useRef(false);

    const showTabBar = useCallback(() => {
        if (isHidden.current) {
            navigation.setOptions({
                tabBarStyle: getHangingTabStyle(colors, isDark)
            });
            isHidden.current = false;
        }
    }, [navigation, colors, isDark]);

    const hideTabBar = useCallback(() => {
        if (!isHidden.current) {
            navigation.setOptions({ tabBarStyle: { display: 'none' } });
            isHidden.current = true;
        }
    }, [navigation]);

    const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;

        // Don't hide if we're at the very top or scrolling very little
        if (currentScrollY < 50) {
            showTabBar();
            lastScrollY.current = currentScrollY;
            return;
        }

        const delta = currentScrollY - lastScrollY.current;

        // Threshold of 10 pixels to avoid jitter
        if (currentScrollY > 150 && delta > 15) {
            // Scrolling down fast
            hideTabBar();
        } else if (delta < -25) {
            // Scrolling up significantly
            showTabBar();
        }

        lastScrollY.current = currentScrollY;
    }, [showTabBar, hideTabBar]);

    return { onScroll, showTabBar, hideTabBar };
};
