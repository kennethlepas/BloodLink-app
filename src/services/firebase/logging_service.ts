import Constants from 'expo-constants';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from './firebase';

export type ActivityType =
    | 'auth_login' | 'auth_logout' | 'auth_register'
    | 'request_create' | 'request_cancel' | 'request_accepted'
    | 'donor_register' | 'donor_update_availability'
    | 'profile_update' | 'app_open' | 'error_occurred';

export interface LogEntry {
    activityType: ActivityType;
    details?: any;
    severity?: 'info' | 'warning' | 'error' | 'critical';
}

class LoggingService {
    private static instance: LoggingService;

    private constructor() { }

    public static getInstance(): LoggingService {
        if (!LoggingService.instance) {
            LoggingService.instance = new LoggingService();
        }
        return LoggingService.instance;
    }

    /**
     * Log an activity to Firestore
     */
    async logActivity(entry: LogEntry) {
        try {
            const user = auth.currentUser;

            const logData = {
                activityType: entry.activityType,
                timestamp: serverTimestamp(),
                timestampISO: new Date().toISOString(),
                severity: entry.severity || 'info',
                user: user ? {
                    uid: user.uid,
                    email: user.email,
                    userType: 'donor' // This would ideally be dynamic if available in auth context
                } : null,
                device: {
                    id: Constants.sessionId || 'unknown',
                    platform: Platform.OS,
                    osVersion: Platform.Version,
                    model: Platform.select({ ios: 'iPhone', android: 'Android Device', default: 'Web' }),
                    brand: Platform.OS
                },
                data: entry.details || {},
                metadata: {
                    appVersion: Constants.expoConfig?.version || '1.0.0',
                    buildNumber: Constants.expoConfig?.ios?.buildNumber || '1'
                }
            };

            await addDoc(collection(db, 'user_activity_logs'), logData);
        } catch (error) {
            console.warn('LoggingService: Failed to log activity', error);
            // Don't throw to avoid breaking main app flow
        }
    }

    // Helper methods for common logs
    logLogin() { return this.logActivity({ activityType: 'auth_login' }); }
    logLogout() { return this.logActivity({ activityType: 'auth_logout' }); }
    logRequestCreate(details: any) { return this.logActivity({ activityType: 'request_create', details }); }
    logError(error: string, details?: any) {
        return this.logActivity({
            activityType: 'error_occurred',
            details: { error, ...details },
            severity: 'error'
        });
    }
}

export const loggingService = LoggingService.getInstance();
