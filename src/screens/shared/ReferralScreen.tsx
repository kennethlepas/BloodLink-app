import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ReferralScreen() {
    const router = useRouter();
    const { user } = useUser();
    const { colors, isDark } = useAppTheme();

    const referralCode = user?.id?.slice(-6).toUpperCase() || 'BLOODLINK';
    const referralLink = `https://bloodlink.app/join/${referralCode}`;

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Join me on BloodLink and help save lives in Kenya! Use my referral code ${referralCode} to sign up and start donating or requesting blood. Download here: ${referralLink}`,
                title: 'Join BloodLink Kenya',
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleCopyCode = async () => {
        try {
            await Clipboard.setStringAsync(referralCode);
            Alert.alert('Copied!', 'Referral code copied to clipboard.');
        } catch (error) {
            console.error('Clipboard error:', error);
            Alert.alert('Copy Failed', 'Could not copy to clipboard. Please write down the code.');
        }
    };

    const handleCopyLink = async () => {
        try {
            await Clipboard.setStringAsync(referralLink);
            Alert.alert('Copied!', 'Referral link copied to clipboard.');
        } catch (error) {
            console.error('Clipboard error:', error);
            Alert.alert('Copy Failed', 'Could not copy to clipboard. You can still share the link.');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
            <LinearGradient colors={['#2563EB', '#3B82F6']} style={styles.header}>
                <View style={styles.hCircle1} />
                <View style={styles.hCircle2} />
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Refer & Save Lives</Text>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.illustrationContainer}>
                    <View style={[styles.circleBg, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
                        <LinearGradient
                            colors={isDark ? ['#3B82F6', '#2563EB'] : ['#DBEAFE', '#BFDBFE']}
                            style={styles.innerCircle}
                        >
                            <Ionicons name="people" size={80} color="#2563EB" />
                        </LinearGradient>
                    </View>
                </View>

                <View style={styles.textSection}>
                    <Text style={[styles.title, { color: colors.text }]}>Spread the Word</Text>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        BloodLink thrives on community. Refer your friends and family to join our network of life-savers. Every new donor brings hope to someone in need.
                    </Text>
                </View>

                {/* Referral Code Card */}
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <Text style={styles.cardLabel}>Your Referral Code</Text>
                    <View style={styles.codeContainer}>
                        <Text style={[styles.codeText, { color: colors.primary }]}>{referralCode}</Text>
                        <TouchableOpacity onPress={handleCopyCode} style={styles.copyBtn}>
                            <Ionicons name="copy-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Referral Link Card */}
                <View style={[styles.linkCard, { backgroundColor: colors.surface }]}>
                    <Text style={styles.cardLabel}>Your Referral Link</Text>
                    <View style={styles.linkContainer}>
                        <Text style={[styles.linkText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {referralLink}
                        </Text>
                        <TouchableOpacity onPress={handleCopyLink} style={styles.copyLinkBtn}>
                            <Ionicons name="copy-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
                        <LinearGradient
                            colors={isDark ? ['#3B82F6', '#2563EB'] : ['#DBEAFE', '#BFDBFE']}
                            style={styles.statIconCircle}
                        >
                            <Ionicons name="people" size={24} color="#2563EB" />
                        </LinearGradient>
                        <Text style={[styles.statValue, { color: colors.text }]}>0</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Referrals</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
                        <LinearGradient
                            colors={isDark ? ['#F59E0B', '#D97706'] : ['#FEF3C7', '#FDE68A']}
                            style={styles.statIconCircle}
                        >
                            <Ionicons name="star" size={24} color="#D97706" />
                        </LinearGradient>
                        <Text style={[styles.statValue, { color: colors.text }]}>0</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Points Earned</Text>
                    </View>
                </View>

                {/* Share Button */}
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <LinearGradient colors={['#2563EB', '#3B82F6']} style={styles.shareBtnGrad}>
                        <Ionicons name="share-social" size={22} color="#FFF" />
                        <Text style={styles.shareBtnText}>Share Invitation</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* How it Works Section */}
                <View style={styles.faqSection}>
                    <Text style={[styles.faqTitle, { color: colors.text }]}>How it works</Text>

                    <View style={[styles.faqCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.faqItem}>
                            <View style={styles.faqNumber}>
                                <Text style={styles.faqNumberText}>1</Text>
                            </View>
                            <View style={styles.faqContent}>
                                <Text style={[styles.faqText, { color: colors.text }]}>Share your unique link or code</Text>
                                <Text style={[styles.faqSubtext, { color: colors.textSecondary }]}>
                                    Share with friends via WhatsApp, SMS, or social media
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.faqCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.faqItem}>
                            <View style={styles.faqNumber}>
                                <Text style={styles.faqNumberText}>2</Text>
                            </View>
                            <View style={styles.faqContent}>
                                <Text style={[styles.faqText, { color: colors.text }]}>They sign up and complete their first donation or request</Text>
                                <Text style={[styles.faqSubtext, { color: colors.textSecondary }]}>
                                    Your friend must complete a verified donation or blood request
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.faqCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.faqItem}>
                            <View style={styles.faqNumber}>
                                <Text style={styles.faqNumberText}>3</Text>
                            </View>
                            <View style={styles.faqContent}>
                                <Text style={[styles.faqText, { color: colors.text }]}>Earn 50 LifePoints for every successful referral!</Text>
                                <Text style={[styles.faqSubtext, { color: colors.textSecondary }]}>
                                    Redeem points for rewards and recognition badges
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Bottom padding */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        overflow: 'hidden',
        position: 'relative',
    },
    hCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: -80,
        right: -60
    },
    hCircle2: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.06)',
        bottom: -40,
        left: -30
    },
    backButton: {
        marginRight: 15,
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF'
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center'
    },
    illustrationContainer: {
        marginVertical: 20,
        alignItems: 'center',
    },
    circleBg: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    innerCircle: {
        width: 130,
        height: 130,
        borderRadius: 65,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textSection: {
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    card: {
        width: '100%',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    codeText: {
        fontSize: 34,
        fontWeight: '900',
        letterSpacing: 3,
    },
    copyBtn: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
    },
    linkCard: {
        width: '100%',
        padding: 16,
        borderRadius: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    linkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    linkText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
    },
    copyLinkBtn: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 16,
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    statIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    shareButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    shareBtnGrad: {
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    shareBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFF',
    },
    faqSection: {
        width: '100%',
    },
    faqTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 16,
    },
    faqCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    faqItem: {
        flexDirection: 'row',
        gap: 14,
    },
    faqNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    faqNumberText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#2563EB',
    },
    faqContent: {
        flex: 1,
    },
    faqText: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
        lineHeight: 20,
    },
    faqSubtext: {
        fontSize: 12,
        lineHeight: 16,
    },
});