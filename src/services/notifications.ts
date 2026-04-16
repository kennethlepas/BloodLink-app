import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { soundService } from './soundService';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let isNotificationsInitialized = false;

// Lazy-load expo-notifications to prevent startup crashes
// SDK 53+ removed push notification support from Expo Go on Android
const getNotificationsModule = () => {
    if (isExpoGo && Platform.OS === 'android') {
        return null;
    }
    try {
        return require('expo-notifications');
    } catch (error) {
        console.warn('⚠️ [Notifications] Failed to load expo-notifications module');
        return null;
    }
};

// Safely initialize notification handler
export const initNotifications = () => {
    if (isNotificationsInitialized) return;

    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });

        // Android notification channels - only if not Expo Go on Android
        if (Platform.OS === 'android' && !isExpoGo) {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            }).catch((e: any) => console.log('⚠️ Channel error:', e));
        }

        isNotificationsInitialized = true;
        console.log('✅ Notifications initialized');
    } catch (error) {
        console.log('⚠️ Notification initialization skipped:', error);
    }
};

export const registerForPushNotificationsAsync = async () => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return null;

    let token;

    // Remote notifications are not supported in Expo Go for Android (SDK 53+)
    if (isExpoGo && Platform.OS === 'android') {
        console.log('⚠️ Push notifications not supported in Expo Go on Android');
        return null;
    }

    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('❌ Failed to get push token - permission denied');
            return null;
        }

        // Get Expo push token
        try {
            const projectId = Constants.expoConfig?.extra?.eas?.projectId ??
                Constants.easConfig?.projectId;

            if (projectId) {
                token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
                console.log('✅ Push notification token obtained');
            } else {
                console.log('⚠️ No projectId found, skipping push token');
            }
        } catch (error) {
            console.log('⚠️ Error getting push token:', error);
        }

        return token;
    } catch (error) {
        console.log('⚠️ Notification permission error:', error);
        return null;
    }
};

export const sendLocalNotification = async (title: string, body: string, data?: any) => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: data || {},
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null,
        });
        console.log('✅ Local notification sent:', title);
    } catch (error) {
        console.error('❌ Failed to send local notification:', error);
    }
};

export const addNotificationResponseListener = (callback: (response: any) => void) => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return { remove: () => { } };

    try {
        return Notifications.addNotificationResponseReceivedListener(callback);
    } catch (error) {
        console.log('⚠️ Could not add notification response listener');
        return { remove: () => { } };
    }
};

export const addNotificationReceivedListener = (callback: (notification: any) => void) => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return { remove: () => { } };

    try {
        return Notifications.addNotificationReceivedListener((notification: any) => {
            soundService.playNotificationSound();
            if (callback) callback(notification);
        });
    } catch (error) {
        console.log('⚠️ Could not add notification received listener');
        return { remove: () => { } };
    }
};