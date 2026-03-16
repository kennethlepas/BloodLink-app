import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LogoutModalProps {
    visible: boolean;
    onCancel: () => void;
    onLogout: () => void;
    isLoggingOut?: boolean;
}

const COLORS = {
    overlay: 'rgba(15, 23, 42, 0.6)',
    surface: '#FFFFFF',
    text: '#1E293B',
    subtext: '#64748B',
    danger: '#EF4444',
    dangerBg: '#FEF2F2',
    cancel: '#F1F5F9',
    cancelText: '#475569',
    border: '#E2E8F0',
};

export const LogoutModal: React.FC<LogoutModalProps> = ({
    visible,
    onCancel,
    onLogout,
    isLoggingOut = false,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                {Platform.OS === 'ios' && (
                    <BlurView intensity={20} style={styles.blur} tint="dark" />
                )}

                <View style={styles.modalContainer}>
                    <View style={styles.iconContainer}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="log-out" size={32} color={COLORS.danger} />
                        </View>
                    </View>

                    <Text style={styles.title}>Log Out</Text>
                    <Text style={styles.message}>
                        Are you sure you want to log out? You will need to sign in again to access your account.
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onCancel}
                            disabled={isLoggingOut}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.logoutButton}
                            onPress={onLogout}
                            disabled={isLoggingOut}
                            activeOpacity={0.8}
                        >
                            {isLoggingOut ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Text style={styles.logoutButtonText}>Yes, Log Out</Text>
                                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    blur: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: 20,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.dangerBg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFF',
        shadowColor: COLORS.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: COLORS.subtext,
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        backgroundColor: COLORS.cancel,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.cancelText,
    },
    logoutButton: {
        flex: 1.5,
        flexDirection: 'row',
        paddingVertical: 14,
        backgroundColor: COLORS.danger,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    logoutButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
