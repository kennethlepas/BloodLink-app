import { useAppTheme } from '@/src/contexts/ThemeContext';
import { auth } from '@/src/services/firebase/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
} from 'firebase/auth';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Brand Palette (static) ──────────────────────────────────────────────────
const B_SKY = '#2563EB';
const B_LIGHT = '#3B82F6';
const B_PALE = '#DBEAFE';
const B_BG = '#EFF6FF';
const O_MID = '#EA580C';

// ─── Shadow helper ───────────────────────────────────────────────────────────
const shadow = (color = '#000', opacity = 0.08, radius = 10, elevation = 3) =>
    Platform.select({
        web: { boxShadow: `0 2px ${radius}px rgba(0,0,0,${opacity})` } as any,
        default: {
            shadowColor: color,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: opacity,
            shadowRadius: radius,
            elevation,
        },
    });

// ─── Strength meter logic ────────────────────────────────────────────────────
type Strength = { level: number; label: string; color: string };

function getPasswordStrength(pw: string): Strength {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { level: 1, label: 'Weak', color: '#EF4444' };
    if (score === 2) return { level: 2, label: 'Fair', color: '#F59E0B' };
    if (score === 3) return { level: 3, label: 'Good', color: '#0EA5E9' };
    return { level: 4, label: 'Strong', color: '#10B981' };
}

// ─── Requirement check item ─────────────────────────────────────────────────
const ReqItem: React.FC<{ met: boolean; text: string; colors: any }> = ({
    met,
    text,
    colors,
}) => (
    <View style={styles.reqItem}>
        <Ionicons
            name={met ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={met ? '#10B981' : colors.textMuted}
        />
        <Text style={[styles.reqText, { color: colors.textMuted }, met && { color: '#10B981' }]}>
            {text}
        </Text>
    </View>
);

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function ChangePasswordScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const { colors, isDark } = useAppTheme();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const strength = getPasswordStrength(newPassword);
    const reqs = {
        length: newPassword.length >= 6,
        upper: /[A-Z]/.test(newPassword),
        number: /[0-9]/.test(newPassword),
        special: /[^A-Za-z0-9]/.test(newPassword),
    };

    // ── Validation ───────────────────────────────────────────────────────────
    const validate = (): boolean => {
        const e: Record<string, string> = {};

        if (!currentPassword) e.current = 'Current password is required';
        if (!newPassword) {
            e.new = 'New password is required';
        } else if (newPassword.length < 6) {
            e.new = 'Password must be at least 6 characters';
        } else if (newPassword === currentPassword) {
            e.new = 'New password must differ from the current one';
        }
        if (!confirmPassword) {
            e.confirm = 'Please confirm your new password';
        } else if (confirmPassword !== newPassword) {
            e.confirm = 'Passwords do not match';
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleChangePassword = async () => {
        if (!validate()) return;
        if (!user || !user.email) {
            Alert.alert('Error', 'No authenticated user found. Please log in again.');
            return;
        }

        setLoading(true);
        try {
            // Step 1 — Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Step 2 — Update password
            await updatePassword(user, newPassword);

            Alert.alert(
                'Password Updated ✅',
                'Your password has been changed successfully. Use your new password next time you log in.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error: any) {
            console.error('Change password error:', error);
            let msg = 'Failed to change password. Please try again.';

            switch (error?.code) {
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    msg = 'Your current password is incorrect. Please try again.';
                    setErrors(prev => ({ ...prev, current: 'Incorrect password' }));
                    break;
                case 'auth/weak-password':
                    msg = 'Your new password is too weak. Please choose a stronger one.';
                    break;
                case 'auth/requires-recent-login':
                    msg = 'Session expired. Please log out, log back in, and try again.';
                    break;
                case 'auth/too-many-requests':
                    msg = 'Too many attempts. Please wait a few minutes and try again.';
                    break;
                case 'auth/network-request-failed':
                    msg = 'Network error. Please check your internet connection.';
                    break;
            }
            Alert.alert('Password Change Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={B_SKY} />

            {/* ══ HEADER ══ */}
            <LinearGradient colors={[B_SKY, B_LIGHT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.hCircle1} />
                <View style={styles.hCircle2} />

                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Change Password</Text>
                        <Text style={styles.headerSub}>Keep your account secure</Text>
                    </View>
                    <View style={{ width: 42 }} />
                </View>

                {/* Info banner */}
                <View style={styles.infoBanner}>
                    <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.infoBannerTitle}>Security Update</Text>
                        <Text style={styles.infoBannerSub}>
                            You'll need to enter your current password to verify your identity before setting a new one.
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ══ CURRENT PASSWORD ══ */}
                    <View style={styles.sectionHdr}>
                        <View style={[styles.sectionBar, { backgroundColor: '#D97706' }]} />
                        <Ionicons name="key-outline" size={16} color="#D97706" style={{ marginRight: 6 }} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Password</Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Enter your current password</Text>
                        <View
                            style={[
                                styles.inputWrap,
                                { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                            ]}
                        >
                            <Ionicons
                                name="lock-closed-outline"
                                size={18}
                                color={colors.textMuted}
                                style={{ marginRight: 10 }}
                            />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Current password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry={!showCurrent}
                                value={currentPassword}
                                onChangeText={v => {
                                    setCurrentPassword(v);
                                    setErrors(e => ({ ...e, current: '' }));
                                }}
                                editable={!loading}
                                autoComplete="password"
                            />
                            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} disabled={loading}>
                                <Ionicons
                                    name={showCurrent ? 'eye-off' : 'eye'}
                                    size={20}
                                    color={colors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>
                        {!!errors.current && <Text style={styles.errorText}>{errors.current}</Text>}
                    </View>

                    {/* ══ NEW PASSWORD ══ */}
                    <View style={styles.sectionHdr}>
                        <View style={[styles.sectionBar, { backgroundColor: B_SKY }]} />
                        <Ionicons name="lock-open-outline" size={16} color={B_SKY} style={{ marginRight: 6 }} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>New Password</Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Create a new password</Text>
                        <View
                            style={[
                                styles.inputWrap,
                                { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                            ]}
                        >
                            <Ionicons
                                name="lock-closed-outline"
                                size={18}
                                color={colors.textMuted}
                                style={{ marginRight: 10 }}
                            />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="New password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry={!showNew}
                                value={newPassword}
                                onChangeText={v => {
                                    setNewPassword(v);
                                    setErrors(e => ({ ...e, new: '' }));
                                }}
                                editable={!loading}
                            />
                            <TouchableOpacity onPress={() => setShowNew(!showNew)} disabled={loading}>
                                <Ionicons
                                    name={showNew ? 'eye-off' : 'eye'}
                                    size={20}
                                    color={colors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>
                        {!!errors.new && <Text style={styles.errorText}>{errors.new}</Text>}

                        {/* Strength meter */}
                        {newPassword.length > 0 && (
                            <View style={styles.strengthSection}>
                                <View style={styles.strengthBarBg}>
                                    {[1, 2, 3, 4].map(i => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.strengthBarSegment,
                                                {
                                                    backgroundColor:
                                                        i <= strength.level
                                                            ? strength.color
                                                            : isDark
                                                                ? '#334155'
                                                                : '#E2E8F0',
                                                },
                                            ]}
                                        />
                                    ))}
                                </View>
                                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                                    {strength.label}
                                </Text>
                            </View>
                        )}

                        {/* Requirements checklist */}
                        {newPassword.length > 0 && (
                            <View style={styles.reqsBox}>
                                <ReqItem met={reqs.length} text="At least 6 characters" colors={colors} />
                                <ReqItem met={reqs.upper} text="One uppercase letter" colors={colors} />
                                <ReqItem met={reqs.number} text="One number" colors={colors} />
                                <ReqItem met={reqs.special} text="One special character" colors={colors} />
                            </View>
                        )}
                    </View>

                    {/* ══ CONFIRM PASSWORD ══ */}
                    <View style={styles.sectionHdr}>
                        <View style={[styles.sectionBar, { backgroundColor: '#10B981' }]} />
                        <Ionicons
                            name="checkmark-done-outline"
                            size={16}
                            color="#10B981"
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Confirm New Password</Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Re-enter your new password</Text>
                        <View
                            style={[
                                styles.inputWrap,
                                { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                            ]}
                        >
                            <Ionicons
                                name="lock-closed-outline"
                                size={18}
                                color={colors.textMuted}
                                style={{ marginRight: 10 }}
                            />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Confirm new password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry={!showConfirm}
                                value={confirmPassword}
                                onChangeText={v => {
                                    setConfirmPassword(v);
                                    setErrors(e => ({ ...e, confirm: '' }));
                                }}
                                editable={!loading}
                            />
                            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} disabled={loading}>
                                <Ionicons
                                    name={showConfirm ? 'eye-off' : 'eye'}
                                    size={20}
                                    color={colors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>
                        {!!errors.confirm && <Text style={styles.errorText}>{errors.confirm}</Text>}
                        {confirmPassword.length > 0 && confirmPassword === newPassword && !errors.confirm && (
                            <View
                                style={[
                                    styles.matchBadge,
                                    { backgroundColor: isDark ? '#14532d' : '#F0FDF4' },
                                ]}
                            >
                                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                <Text style={styles.matchText}>Passwords match</Text>
                            </View>
                        )}
                    </View>

                    {/* ══ SUBMIT BUTTON ══ */}
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                        onPress={handleChangePassword}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[B_SKY, B_LIGHT]}
                            style={styles.submitGrad}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons
                                        name="shield-checkmark"
                                        size={20}
                                        color="#FFFFFF"
                                        style={{ marginRight: 8 }}
                                    />
                                    <Text style={styles.submitText}>Update Password</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Tip */}
                    <View
                        style={[
                            styles.tipCard,
                            {
                                backgroundColor: isDark ? '#1e3a8a' : B_PALE,
                                borderColor: isDark ? '#1e40af' : '#BFDBFE',
                            },
                        ]}
                    >
                        <Ionicons name="information-circle-outline" size={18} color={B_SKY} />
                        <Text style={[styles.tipText, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                            Tip: Use a unique password that you don't use on other sites. Consider using a mix of letters,
                            numbers, and symbols.
                        </Text>
                    </View>

                    <View style={{ height: 30 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 20 },

    // HEADER
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 22,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
        position: 'relative',
    },
    hCircle1: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.05)',
        top: -50,
        right: -40,
    },
    hCircle2: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.06)',
        bottom: 10,
        left: -25,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: { alignItems: 'center', flex: 1 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
    headerSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
        fontWeight: '600',
    },

    // INFO BANNER
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    infoBannerTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginBottom: 3 },
    infoBannerSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 18,
        fontWeight: '500',
    },

    // SECTION
    sectionHdr: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 22,
        marginBottom: 10,
        paddingHorizontal: 20,
    },
    sectionBar: { width: 4, height: 20, borderRadius: 2, marginRight: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '800' },

    // CARD
    card: {
        marginHorizontal: 20,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        ...shadow(B_SKY, 0.07, 8, 2),
    },

    // INPUT
    inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    input: { flex: 1, fontSize: 15, fontWeight: '500', paddingVertical: 0 },

    errorText: { color: '#EF4444', fontSize: 12, marginTop: 8, marginLeft: 4, fontWeight: '600' },

    // STRENGTH METER
    strengthSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        gap: 10,
    },
    strengthBarBg: { flex: 1, flexDirection: 'row', gap: 4 },
    strengthBarSegment: { flex: 1, height: 5, borderRadius: 3 },
    strengthLabel: { fontSize: 12, fontWeight: '700', width: 50, textAlign: 'right' },

    // REQUIREMENTS
    reqsBox: { marginTop: 14, gap: 6 },
    reqItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reqText: { fontSize: 12, fontWeight: '600' },

    // MATCH BADGE
    matchBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    matchText: { fontSize: 12, fontWeight: '700', color: '#10B981' },

    // SUBMIT
    submitBtn: {
        marginHorizontal: 20,
        marginTop: 28,
        borderRadius: 16,
        overflow: 'hidden',
        ...shadow(B_SKY, 0.3, 12, 5),
    },
    submitGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    submitText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },

    // TIP
    tipCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginHorizontal: 20,
        marginTop: 16,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
    },
    tipText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500' },
});
