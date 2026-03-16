import { useUser } from '@/src/contexts/UserContext';
import { auth } from '@/src/services/firebase/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { sendEmailVerification, signOut } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VerifyEmailScreen = () => {
    const router = useRouter();
    const { user } = useUser();
    const [sending, setSending] = useState(false);
    const [checking, setChecking] = useState(false);
    const [countdown, setCountdown] = useState(0);

    //Prevents any double-fire of navigation 
    const hasNavigated = useRef(false);

    // Countdown timer 
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    //Background polling: check every 5s automatically 
    useEffect(() => {
        const interval = setInterval(async () => {
            if (hasNavigated.current) {
                clearInterval(interval);
                return;
            }
            try {
                if (auth.currentUser) {
                    await auth.currentUser.reload();
                    if (auth.currentUser.emailVerified) {
                        clearInterval(interval);
                        navigateToHome();
                    }
                }
            } catch {
                // silent background check — ignore errors
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);


    const navigateToHome = () => {
        if (hasNavigated.current) return;
        hasNavigated.current = true;

        // Small delay to let React state settle before navigating
        setTimeout(() => {
            if (user?.userType === 'donor') {
                router.replace('/(donor)' as any);
            } else if (user?.userType === 'requester') {
                router.replace('/(requester)' as any);
            } else {
                // Fallback: go back to auth selection
                router.replace('/(auth)/user-type-selection' as any);
            }
        }, 100);
    };

    //Manual check button 
    const handleCheckVerification = async () => {
        if (hasNavigated.current) return;
        setChecking(true);
        try {
            if (!auth.currentUser) {
                router.replace('/(auth)/login' as any);
                return;
            }

            await auth.currentUser.reload();

            if (auth.currentUser.emailVerified) {
                navigateToHome();
            } else {
                Alert.alert(
                    'Not Verified Yet',
                    "Your email hasn't been verified yet. Please open the link in the email we sent you, then tap this button again."
                );
            }
        } catch (error) {
            console.log('Verification check error:', error);
            Alert.alert('Error', 'Could not check verification status. Please try again.');
        } finally {
            setChecking(false);
        }
    };

    // Resend email
    const handleResend = async () => {
        if (countdown > 0 || !auth.currentUser) return;
        setSending(true);
        try {
            await sendEmailVerification(auth.currentUser);
            Alert.alert('Email Sent', 'A new verification link has been sent to your email.');
            setCountdown(60);
        } catch (error: any) {
            if (error.code === 'auth/too-many-requests') {
                Alert.alert('Too Many Requests', 'Please wait a while before trying again.');
            } else {
                Alert.alert('Error', 'Failed to send verification email. Please try again later.');
            }
        } finally {
            setSending(false);
        }
    };

    // Logout 
    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.log('Logout error:', error);
        } finally {
            router.replace('/(auth)/login' as any);
        }
    };

    const email = auth.currentUser?.email || user?.email || 'your email';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0A2647" />
            <LinearGradient
                colors={['#0A2647', '#144272', '#2C74B3']}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <View style={styles.card}>

                        <View style={styles.iconCircle}>
                            <Ionicons name="mail-unread-outline" size={48} color="#3B82F6" />
                        </View>

                        <Text style={styles.title}>Verify Your Email</Text>
                        <Text style={styles.description}>We've sent a verification link to:</Text>
                        <Text style={styles.emailText}>{email}</Text>

                        <Text style={styles.subText}>
                            Click the link in the email to verify your account, then tap the
                            button below. Check your spam folder if you don't see it.
                        </Text>

                        {/* User type indicator */}
                        <View style={styles.userTypeBadge}>
                            <Ionicons
                                name={user?.userType === 'donor' ? 'heart' : 'medkit'}
                                size={14}
                                color={user?.userType === 'donor' ? '#DC2626' : '#2563EB'}
                            />
                            <Text style={styles.userTypeBadgeText}>
                                Signing in as {user?.userType === 'donor' ? 'Blood Donor' : 'Blood Requester'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.checkButton}
                            onPress={handleCheckVerification}
                            disabled={checking}
                            activeOpacity={0.8}
                        >
                            {checking ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.checkButtonText}>I've Verified My Email</Text>
                            )}
                        </TouchableOpacity>

                        {/* Resend */}
                        <TouchableOpacity
                            style={[styles.resendButton, (countdown > 0 || sending) && styles.disabledBtn]}
                            onPress={handleResend}
                            disabled={sending || countdown > 0}
                            activeOpacity={0.7}
                        >
                            {sending ? (
                                <ActivityIndicator color="#3B82F6" size="small" />
                            ) : (
                                <Text style={[styles.resendText, countdown > 0 && styles.disabledText]}>
                                    {countdown > 0
                                        ? `Resend Email (${countdown}s)`
                                        : 'Resend Verification Email'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Back to login */}
                    <TouchableOpacity onPress={handleLogout} style={styles.backLink} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
                        <Text style={styles.backLinkText}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A2647',
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 30,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0C1A3A',
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
    },
    emailText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0C1A3A',
        marginVertical: 4,
        textAlign: 'center',
    },
    subText: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 16,
        lineHeight: 20,
    },
    userTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 24,
    },
    userTypeBadgeText: {
        fontSize: 13,
        color: '#334155',
        fontWeight: '600',
    },
    checkButton: {
        backgroundColor: '#3B82F6',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    checkButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    resendButton: {
        paddingVertical: 10,
    },
    resendText: {
        color: '#3B82F6',
        fontSize: 14,
        fontWeight: '600',
    },
    disabledBtn: {
        opacity: 0.5,
    },
    disabledText: {
        color: '#94A3B8',
    },
    backLink: {
        marginTop: 30,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 10,
    },
    backLinkText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default VerifyEmailScreen;