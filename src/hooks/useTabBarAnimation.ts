import { useNavigation } from '@react-navigation/native';
import { useCallback, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

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

    const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;

        // Only hide if we've scrolled a reasonable amount
        if (currentScrollY < 10) {
            navigation.setOptions({ tabBarStyle: undefined });
            lastScrollY.current = currentScrollY;
            return;
        }

        const delta = currentScrollY - lastScrollY.current;

        // Threshold of 10 pixels to avoid jitter
        if (currentScrollY > 100 && delta > 10) {
            // Scrolling down
            navigation.setOptions({
                tabBarStyle: { display: 'none' }
            });
        } else if (delta < -15) {
            // Scrolling up
            navigation.setOptions({
                tabBarStyle: undefined
            });
        }

        lastScrollY.current = currentScrollY;
    }, [navigation]);

    return { onScroll };
};
