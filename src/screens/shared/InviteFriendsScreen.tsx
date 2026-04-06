import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function InviteFriendsScreen() {
    const router = useRouter();
    const { user } = useUser();
    const { colors, isDark } = useAppTheme();

    const referralCode = user?.id?.slice(-6).toUpperCase() || 'BLOODLINK';
    const referralLink = `https://bloodlink.app/join/${referralCode}`;

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Join me on BloodLink and help save lives in Kenya! We're building a community of life-savers. Use my code ${referralCode} when you join. Download here: ${referralLink}`,
                title: 'Join the BloodLink Community',
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
            <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invite a Hero</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.illustrationContainer}>
                    <View style={[styles.circleBg, { backgroundColor: isDark ? 'rgba(13, 148, 136, 0.1)' : '#F0FDFA' }]}>
                        <LinearGradient colors={isDark ? ['#115E59', '#134E4A'] : ['#CCFBF1', '#99F6E4']} style={styles.innerCircle}>
                            <Ionicons name="people" size={80} color={isDark ? '#5EEAD4' : '#0D9488'} />
                        </LinearGradient>
                    </View>
                </View>

                <View style={styles.textSection}>
                    <Text style={[styles.title, { color: colors.text }]}>Spread the Word</Text>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        BloodLink thrives on community. Invite your friends and family to join our network of life-savers. Every new member brings hope to someone in need across Kenya.
                    </Text>
                </View>

                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Your Community Code</Text>
                    <View style={styles.codeContainer}>
                        <Text style={[styles.codeText, { color: isDark ? '#5EEAD4' : '#0D9488' }]}>{referralCode}</Text>
                        <TouchableOpacity onPress={handleShare}>
                            <Ionicons name="copy-outline" size={24} color={isDark ? '#5EEAD4' : '#0D9488'} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.statValue, { color: colors.text }]}>0</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Invited</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.statValue, { color: colors.text }]}>❤️</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Lives Touched</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.shareBtnGrad}>
                        <Ionicons name="share-social" size={20} color="#FFF" style={{ marginRight: 10 }} />
                        <Text style={styles.shareBtnText}>Share Invitation</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.faqSection}>
                    <Text style={[styles.faqTitle, { color: colors.text }]}>How to help</Text>
                    <View style={styles.faqItem}>
                        <View style={[styles.faqNumber, { backgroundColor: isDark ? 'rgba(13, 148, 136, 0.2)' : '#CCFBF1' }]}><Text style={[styles.faqNumberText, { color: isDark ? '#5EEAD4' : '#0D9488' }]}>1</Text></View>
                        <Text style={[styles.faqText, { color: colors.textSecondary }]}>Share your unique link or code with friends.</Text>
                    </View>
                    <View style={styles.faqItem}>
                        <View style={[styles.faqNumber, { backgroundColor: isDark ? 'rgba(13, 148, 136, 0.2)' : '#CCFBF1' }]}><Text style={[styles.faqNumberText, { color: isDark ? '#5EEAD4' : '#0D9488' }]}>2</Text></View>
                        <Text style={[styles.faqText, { color: colors.textSecondary }]}>They sign up and join the life-saving network.</Text>
                    </View>
                    <View style={styles.faqItem}>
                        <View style={[styles.faqNumber, { backgroundColor: isDark ? 'rgba(13, 148, 136, 0.2)' : '#CCFBF1' }]}><Text style={[styles.faqNumberText, { color: isDark ? '#5EEAD4' : '#0D9488' }]}>3</Text></View>
                        <Text style={[styles.faqText, { color: colors.textSecondary }]}>Build a safer Kenya together, one drop at a time.</Text>
                    </View>
                </View>
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
    },
    backButton: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    scrollContent: { padding: 24, alignItems: 'center' },
    illustrationContainer: {
        marginVertical: 30,
        alignItems: 'center',
    },
    circleBg: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#F0FDFA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1E293B',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    card: {
        width: '100%',
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    cardLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    codeText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0D9488',
        letterSpacing: 2,
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 15,
        marginBottom: 30,
    },
    statBox: {
        flex: 1,
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1E293B',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 4,
    },
    shareButton: {
        width: '100%',
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 40,
    },
    shareBtnGrad: {
        paddingVertical: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareBtnText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFF',
    },
    faqSection: {
        width: '100%',
        paddingBottom: 40,
    },
    faqTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 20,
    },
    faqItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 15,
    },
    faqNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#CCFBF1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    faqNumberText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0D9488',
    },
    faqText: {
        flex: 1,
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
});
