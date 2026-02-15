import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Animated,
    Dimensions,
    Linking,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Brand Palette (static) ──────────────────────────────────────────────────
const B_SKY = '#2563EB';
const B_LIGHT = '#3B82F6';
const B_SOFT = '#60A5FA';
const B_PALE = '#DBEAFE';
const O_DEEP = '#C2410C';
const O_MID = '#EA580C';
const O_LITE = '#FB923C';
const O_PALE = '#FFF7ED';

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

// ─── FAQ Data ────────────────────────────────────────────────────────────────
type FAQItem = { q: string; a: string; icon: keyof typeof Ionicons.glyphMap; category: string };

const FAQ_DATA: FAQItem[] = [
    {
        q: 'How do I become a blood donor?',
        a: 'Register on BloodLink as a "Donor", complete your profile with your blood type and medical history, then toggle your availability to "Available". You\'ll start receiving matching blood requests in your area.',
        icon: 'heart',
        category: 'Getting Started',
    },
    {
        q: 'How does blood type matching work?',
        a: 'BloodLink uses standard blood compatibility rules. When a request is made, our smart engine matches it with compatible donors based on blood type, location, and urgency level to find the best match quickly.',
        icon: 'water',
        category: 'Blood Donation',
    },
    {
        q: 'Is my personal information safe?',
        a: 'Yes! We take your privacy seriously. All data is encrypted and stored securely on Firebase. Your personal details are only shared with matched requesters/donors when you agree to help. You can control your visibility in Settings.',
        icon: 'shield-checkmark',
        category: 'Privacy',
    },
    {
        q: 'How often can I donate blood?',
        a: 'You should wait at least 56 days (8 weeks) between whole blood donations. BloodLink automatically tracks your last donation date and will notify you when you\'re eligible to donate again.',
        icon: 'time',
        category: 'Blood Donation',
    },
    {
        q: 'How do I create a blood request?',
        a: 'If you\'re a Requester, tap "New Request" from the home screen. Fill in the required blood type, urgency level, hospital name, and contact details. Compatible donors nearby will be notified immediately.',
        icon: 'add-circle',
        category: 'Requests',
    },
    {
        q: 'What do points and rewards mean?',
        a: 'Donors earn points for every verified donation. Points reflect your contribution to the community and can unlock badges and recognition. It\'s our way of saying thank you for saving lives!',
        icon: 'trophy',
        category: 'Rewards',
    },
    {
        q: 'How do I find nearby blood banks?',
        a: 'Use the "Blood Banks" option from Quick Actions on the home screen. Our GPS-powered search shows nearby blood banks with their locations, contact information, and available services.',
        icon: 'business',
        category: 'Blood Banks',
    },
    {
        q: 'Can I delete my account?',
        a: 'Yes, you can request account deletion from Settings > Danger Zone > Delete Account. This will permanently remove all your data. Please note this action is irreversible.',
        icon: 'trash',
        category: 'Account',
    },
];

// ─── Accordion FAQ Component ─────────────────────────────────────────────────
const FAQAccordion: React.FC<{ item: FAQItem; index: number; colors: any; isDark: boolean }> = ({
    item,
    index,
    colors,
    isDark,
}) => {
    const [expanded, setExpanded] = useState(false);
    const animValue = useState(new Animated.Value(0))[0];

    const toggle = () => {
        Animated.spring(animValue, {
            toValue: expanded ? 0 : 1,
            useNativeDriver: false,
            tension: 80,
            friction: 10,
        }).start();
        setExpanded(!expanded);
    };

    const rotateZ = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    // Dynamic icon background for dark mode
    const iconBg =
        index % 2 === 0
            ? isDark
                ? '#1e3a8a'
                : B_PALE
            : isDark
                ? '#7c2d12'
                : O_PALE;

    return (
        <TouchableOpacity
            style={[
                styles.faqCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                expanded && { borderColor: B_SOFT, borderWidth: 1.5 },
            ]}
            onPress={toggle}
            activeOpacity={0.75}
        >
            <View style={styles.faqHeader}>
                <View style={[styles.faqIconWrap, { backgroundColor: iconBg }]}>
                    <Ionicons name={item.icon} size={18} color={index % 2 === 0 ? B_SKY : O_MID} />
                </View>
                <View style={styles.faqTextWrap}>
                    <Text style={styles.faqCategory}>{item.category}</Text>
                    <Text style={[styles.faqQuestion, { color: colors.text }]}>{item.q}</Text>
                </View>
                <Animated.View style={{ transform: [{ rotateZ }] }}>
                    <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                </Animated.View>
            </View>
            {expanded && (
                <View style={styles.faqAnswer}>
                    <View style={styles.faqAnswerBar} />
                    <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>{item.a}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function HelpSupportScreen() {
    const router = useRouter();
    const { user } = useUser();
    const { colors, isDark } = useAppTheme();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFaqs = searchQuery.trim()
        ? FAQ_DATA.filter(
            f =>
                f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                f.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
                f.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : FAQ_DATA;

    const openLink = (url: string) => {
        Linking.openURL(url).catch(() => { });
    };

    const contactMethods = [
        {
            icon: 'mail' as keyof typeof Ionicons.glyphMap,
            title: 'Email Us',
            subtitle: 'support@bloodlink.co.ke',
            color: B_SKY,
            bg: isDark ? '#1e3a8a' : B_PALE,
            gradient: [B_SKY, B_LIGHT] as [string, string],
            onPress: () => openLink('mailto:support@bloodlink.co.ke'),
        },
        {
            icon: 'logo-whatsapp' as keyof typeof Ionicons.glyphMap,
            title: 'WhatsApp',
            subtitle: '+254 700 000 000',
            color: '#25D366',
            bg: isDark ? '#14532d' : '#E8F5E9',
            gradient: ['#25D366', '#128C7E'] as [string, string],
            onPress: () => openLink('https://wa.me/254700000000'),
        },
        {
            icon: 'call' as keyof typeof Ionicons.glyphMap,
            title: 'Call Us',
            subtitle: '+254 700 000 000',
            color: '#8B5CF6',
            bg: isDark ? '#4c1d95' : '#F5F3FF',
            gradient: ['#8B5CF6', '#7C3AED'] as [string, string],
            onPress: () => openLink('tel:+254700000000'),
        },
        {
            icon: 'logo-twitter' as keyof typeof Ionicons.glyphMap,
            title: 'X / Twitter',
            subtitle: '@bloodlinkapp',
            color: isDark ? '#e2e8f0' : '#0F1419',
            bg: isDark ? '#334155' : '#E7E7E7',
            gradient: ['#1DA1F2', '#0D8BD9'] as [string, string],
            onPress: () => openLink('https://twitter.com/bloodlinkapp'),
        },
    ];

    const quickLinks = [
        {
            icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Terms & Conditions',
            color: B_SKY,
            bg: isDark ? '#1e3a8a' : B_PALE,
            onPress: () => router.push('/(auth)/terms-and-conditions' as any),
        },
        {
            icon: 'shield-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Privacy Policy',
            color: '#8B5CF6',
            bg: isDark ? '#4c1d95' : '#F5F3FF',
            onPress: () => router.push('/(auth)/privacy-policy' as any),
        },
        {
            icon: 'star-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Rate the App',
            color: '#D97706',
            bg: isDark ? '#78350f' : '#FEF3C7',
            onPress: () => router.push('/(shared)/rate-app' as any),
        },
        {
            icon: 'settings-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Settings',
            color: '#0EA5E9',
            bg: isDark ? '#0c4a6e' : '#E0F2FE',
            onPress: () => router.push('/(shared)/settings' as any),
        },
    ];

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
                        <Text style={styles.headerTitle}>Help & Support</Text>
                        <Text style={styles.headerSub}>We're here to help you</Text>
                    </View>
                    <View style={{ width: 42 }} />
                </View>

                {/* Hero card */}
                <View style={styles.heroCard}>
                    <LinearGradient colors={[O_MID, O_DEEP]} style={styles.heroIconWrap}>
                        <Ionicons name="headset" size={28} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.heroTitle}>Need Assistance?</Text>
                        <Text style={styles.heroSub}>
                            Browse FAQs below or reach out to our team directly. We typically respond within 24 hours.
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ══ SEARCH ══ */}
                <View style={styles.searchSection}>
                    <View
                        style={[
                            styles.searchBox,
                            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                        ]}
                    >
                        <Ionicons name="search" size={20} color={colors.textMuted} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Search FAQs..."
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* ══ CONTACT METHODS ══ */}
                <View style={styles.section}>
                    <View style={styles.sectionHdr}>
                        <View style={[styles.sectionBar, { backgroundColor: O_MID }]} />
                        <Ionicons name="chatbubbles-outline" size={16} color={O_MID} style={{ marginRight: 6 }} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Us</Text>
                    </View>
                    <View style={styles.contactGrid}>
                        {contactMethods.map((method, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[
                                    styles.contactCard,
                                    { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                                ]}
                                onPress={method.onPress}
                                activeOpacity={0.75}
                            >
                                <LinearGradient colors={method.gradient} style={styles.contactIconGrad}>
                                    <Ionicons name={method.icon} size={22} color="#FFFFFF" />
                                </LinearGradient>
                                <Text style={[styles.contactTitle, { color: colors.text }]}>{method.title}</Text>
                                <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {method.subtitle}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ══ FAQS ══ */}
                <View style={styles.section}>
                    <View style={styles.sectionHdr}>
                        <View style={[styles.sectionBar, { backgroundColor: B_SKY }]} />
                        <Ionicons name="help-circle-outline" size={16} color={B_SKY} style={{ marginRight: 6 }} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
                    </View>

                    {filteredFaqs.length > 0 ? (
                        filteredFaqs.map((faq, i) => (
                            <FAQAccordion key={i} item={faq} index={i} colors={colors} isDark={isDark} />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <LinearGradient colors={[B_PALE, '#BFDBFE']} style={styles.emptyIconBox}>
                                <Ionicons name="search-outline" size={36} color={B_SKY} />
                            </LinearGradient>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
                            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                                Try different keywords or contact us directly
                            </Text>
                        </View>
                    )}
                </View>

                {/* ══ QUICK LINKS ══ */}
                <View style={styles.section}>
                    <View style={styles.sectionHdr}>
                        <View style={[styles.sectionBar, { backgroundColor: '#10B981' }]} />
                        <Ionicons name="link-outline" size={16} color="#10B981" style={{ marginRight: 6 }} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Links</Text>
                    </View>
                    <View
                        style={[
                            styles.quickLinksCard,
                            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                        ]}
                    >
                        {quickLinks.map((link, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[
                                    styles.quickLinkItem,
                                    { borderBottomColor: colors.divider },
                                    i === quickLinks.length - 1 && { borderBottomWidth: 0 },
                                ]}
                                onPress={link.onPress}
                                activeOpacity={0.65}
                            >
                                <View style={[styles.quickLinkIcon, { backgroundColor: link.bg }]}>
                                    <Ionicons name={link.icon} size={18} color={link.color} />
                                </View>
                                <Text style={[styles.quickLinkLabel, { color: colors.text }]}>{link.label}</Text>
                                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ══ EMERGENCY BANNER ══ */}
                <View style={styles.section}>
                    <LinearGradient colors={['#DC2626', '#B91C1C']} style={styles.emergencyBanner}>
                        <View style={styles.emergencyIconWrap}>
                            <Ionicons name="warning" size={24} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.emergencyTitle}>Medical Emergency?</Text>
                            <Text style={styles.emergencySub}>
                                If you or someone needs urgent blood, please call emergency services immediately.
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.emergencyCallBtn}
                            onPress={() => openLink('tel:999')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="call" size={18} color="#DC2626" />
                            <Text style={styles.emergencyCallText}>999</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>

                {/* ══ APP INFO ══ */}
                <View style={styles.appInfoCard}>
                    <LinearGradient colors={[B_SKY, B_LIGHT]} style={styles.appInfoIcon}>
                        <Ionicons name="water" size={22} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={[styles.appInfoName, { color: colors.text }]}>BloodLink</Text>
                    <Text style={[styles.appInfoVersion, { color: colors.textSecondary }]}>Version 2.1.0</Text>
                    <Text style={[styles.appInfoTagline, { color: colors.textMuted }]}>We Save Lives 🇰🇪</Text>
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>
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

    // HERO
    heroCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    heroIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow(O_MID, 0.3, 8, 4),
    },
    heroTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    heroSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 18,
        fontWeight: '500',
    },

    // SEARCH
    searchSection: { paddingHorizontal: 20, marginTop: 18, marginBottom: 4 },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1.5,
        ...shadow(B_SKY, 0.07, 8, 2),
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        paddingVertical: 0,
    },

    // SECTIONS
    section: { marginTop: 22, paddingHorizontal: 20 },
    sectionHdr: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionBar: { width: 4, height: 20, borderRadius: 2, marginRight: 8 },
    sectionTitle: { fontSize: 17, fontWeight: '800', flex: 1 },

    // CONTACT GRID
    contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    contactCard: {
        width: (SCREEN_WIDTH - 40 - 12) / 2,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        ...shadow(B_SKY, 0.07, 8, 2),
    },
    contactIconGrad: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    contactTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
    contactSubtitle: { fontSize: 11, fontWeight: '500', textAlign: 'center' },

    // FAQ
    faqCard: {
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        overflow: 'hidden',
        ...shadow('#000', 0.05, 6, 2),
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
    },
    faqIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    faqTextWrap: { flex: 1 },
    faqCategory: {
        fontSize: 10,
        fontWeight: '700',
        color: B_SKY,
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    faqQuestion: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
    faqAnswer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 14,
        paddingBottom: 16,
        paddingTop: 4,
    },
    faqAnswerBar: {
        width: 3,
        borderRadius: 2,
        backgroundColor: B_SOFT,
        marginLeft: 18,
        alignSelf: 'stretch',
    },
    faqAnswerText: { flex: 1, fontSize: 13, lineHeight: 21, fontWeight: '500' },

    // QUICK LINKS
    quickLinksCard: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
        ...shadow(B_SKY, 0.07, 8, 2),
    },
    quickLinkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    quickLinkIcon: {
        width: 38,
        height: 38,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickLinkLabel: { flex: 1, fontSize: 14, fontWeight: '700' },

    // EMERGENCY
    emergencyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 18,
        padding: 16,
        ...shadow('#DC2626', 0.2, 10, 4),
    },
    emergencyIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emergencyTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 3 },
    emergencySub: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 16,
        fontWeight: '500',
    },
    emergencyCallBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    emergencyCallText: { fontSize: 14, fontWeight: '800', color: '#DC2626' },

    // EMPTY
    emptyState: { alignItems: 'center', padding: 30 },
    emptyIconBox: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
    emptySub: { fontSize: 13, textAlign: 'center' },

    // APP INFO
    appInfoCard: {
        alignItems: 'center',
        marginTop: 24,
        paddingVertical: 20,
    },
    appInfoIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    appInfoName: { fontSize: 18, fontWeight: '900', marginBottom: 2 },
    appInfoVersion: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
    appInfoTagline: { fontSize: 12, fontWeight: '500' },
});
