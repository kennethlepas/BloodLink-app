import { useUser } from '@/src/contexts/UserContext';
import { useEffect, useRef } from 'react';
import { AppState, PanResponder } from 'react-native';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export const useIdleTimeout = () => {
    const { user, logout } = useUser();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (user) {
            timerRef.current = setTimeout(() => {
                console.log('User idle for 15 minutes, logging out...');
                logout();
            }, IDLE_TIMEOUT);
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => {
                resetTimer();
                return false;
            },
            onMoveShouldSetPanResponderCapture: () => {
                resetTimer();
                return false;
            },
        })
    ).current;

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                resetTimer();
            }
        });

        resetTimer();

        return () => {
            subscription.remove();
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [user]);

    return { panResponder };
};
