import { useAppTheme, type ThemeColors } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
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
import { getOrCreateChat } from '../../services/firebase/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// Accordion FAQ Component 
const FAQAccordion: React.FC<{ item: FAQItem; index: number; colors: ThemeColors; isDark: boolean; styles: any }> = ({
    item,
    index,
    colors,
    isDark,
    styles,
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

    const iconBg =
        index % 2 === 0
            ? isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE'
            : isDark ? 'rgba(234, 88, 12, 0.15)' : '#FFF7ED';

    return (
        <TouchableOpacity
            style={[
                styles.faqCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                expanded && { borderColor: colors.primary, borderWidth: 1.5 },
            ]}
            onPress={toggle}
            activeOpacity={0.75}
        >
            <View style={styles.faqHeader}>
                <View style={[styles.faqIconWrap, { backgroundColor: iconBg }]}>
                    <Ionicons name={item.icon} size={18} color={index % 2 === 0 ? colors.primary : '#EA580C'} />
                </View>
                <View style={styles.faqTextWrap}>
                    <Text style={[styles.faqCategory, { color: colors.primary }]}>{item.category}</Text>
                    <Text style={[styles.faqQuestion, { color: colors.text }]}>{item.q}</Text>
                </View>
                <Animated.View style={{ transform: [{ rotateZ }] }}>
                    <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                </Animated.View>
            </View>
            {expanded && (
                <View style={styles.faqAnswer}>
                    <View style={[styles.faqAnswerBar, { backgroundColor: colors.primary + '80' }]} />
                    <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>{item.a}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 20 },

    // HEADER
    header: {
        position: 'relative',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 22,
    },
    hCircle1: { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.05)', position: 'absolute', top: -50, right: -40 },
    hCircle2: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)', position: 'absolute', bottom: 10, left: -25 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
    headerCenter: { alignItems: 'center', flex: 1 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
    headerSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
        fontWeight: '600',
    },

    heroCard: { borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.18)', flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
    heroIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    heroTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    heroSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 18,
        fontWeight: '500',
    },

    searchSection: { paddingHorizontal: 20, marginTop: 18, marginBottom: 4 },
    searchBox: { borderRadius: 14, borderWidth: 1.5, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, ...shadow(colors.primary, 0.07, 8, 2) },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        paddingVertical: 0,
        color: colors.text
    },

    section: { marginTop: 22, paddingHorizontal: 20 },
    sectionHdr: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionBar: { width: 4, height: 20, borderRadius: 2, marginRight: 8 },
    sectionTitle: { fontSize: 17, fontWeight: '800', flex: 1, color: colors.text },

    contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    contactCard: {
        width: (SCREEN_WIDTH - 40 - 12) / 2,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        backgroundColor: colors.surface,
        alignItems: 'center',
        padding: 16,
        ...shadow(colors.primary, 0.07, 8, 2),
    },
    contactIconGrad: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    contactTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3, color: colors.text },
    contactSubtitle: { fontSize: 11, fontWeight: '500', textAlign: 'center', color: colors.textSecondary },

    faqCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        backgroundColor: colors.surface,
        marginBottom: 10,
        overflow: 'hidden',
        ...shadow('#000', 0.05, 6, 2),
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
    },
    faqIconWrap: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    faqTextWrap: { flex: 1 },
    faqCategory: {
        fontSize: 10,
        fontWeight: '700',
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
    faqAnswerBar: { width: 3, borderRadius: 2, alignSelf: 'stretch', marginLeft: 18 },
    faqAnswerText: { flex: 1, fontSize: 13, lineHeight: 21, fontWeight: '500' },

    quickLinksCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        backgroundColor: colors.surface,
        overflow: 'hidden',
        ...shadow(colors.primary, 0.07, 8, 2),
    },
    quickLinkItem: { borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
    quickLinkIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    quickLinkLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },

    emergencyBanner: { borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, ...shadow(colors.danger, 0.2, 10, 4) },
    emergencyIconWrap: { width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    emergencyTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 3 },
    emergencySub: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 16,
        fontWeight: '500',
    },
    emergencyCallBtn: { borderRadius: 12, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 10 },
    emergencyCallText: { fontSize: 14, fontWeight: '800', color: colors.danger },

    emptyState: { alignItems: 'center', padding: 30 },
    emptyIconBox: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
    emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6, color: colors.text },
    emptySub: { fontSize: 13, textAlign: 'center', color: colors.textSecondary },

    appInfoCard: {
        alignItems: 'center',
        marginTop: 24,
        paddingVertical: 20,
    },
    appInfoLogoWrap: { width: 72, height: 86, borderRadius: 20, marginBottom: 12, overflow: 'hidden', ...shadow('#000', 0.12, 10, 4) },
    appInfoLogoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    appInfoName: { fontSize: 18, fontWeight: '900', marginBottom: 2, color: colors.text },
    appInfoVersion: { fontSize: 12, fontWeight: '600', marginBottom: 4, color: colors.textSecondary },
    appInfoTagline: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
});

export default function HelpSupportScreen() {
    const router = useRouter();
    const { user } = useUser();
    const { colors, isDark } = useAppTheme();
    const [searchQuery, setSearchQuery] = useState('');

    const s = getStyles(colors, isDark);

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

    const handleLiveSupport = async () => {
        if (!user) return;
        try {
            const chatId = await getOrCreateChat(
                user.uid,
                user.displayName || 'Donor',
                'admin',
                'BloodLink Support'
            );
            router.push({ pathname: '/(shared)/chat' as any, params: { chatId, recipientName: 'BloodLink Support' } });
        } catch (error) {
            console.error('Error starting support chat:', error);
        }
    };

    const contactMethods = [
        {
            icon: 'chatbubbles' as keyof typeof Ionicons.glyphMap,
            title: 'Live Support',
            subtitle: 'Chat with our team',
            gradient: ['#F59E0B', '#D97706'] as [string, string],
            onPress: handleLiveSupport,
        },
        {
            icon: 'mail' as keyof typeof Ionicons.glyphMap,
            title: 'Email Us',
            subtitle: 'support@bloodlink.co.ke',
            gradient: [colors.primary, '#60A5FA'] as [string, string],
            onPress: () => openLink('mailto:support@bloodlink.co.ke'),
        },
        {
            icon: 'logo-whatsapp' as keyof typeof Ionicons.glyphMap,
            title: 'WhatsApp',
            subtitle: '+254 115 408 612',
            gradient: ['#25D366', '#128C7E'] as [string, string],
            onPress: () => openLink('https://wa.me/254700000000'),
        },
    ];

    const quickLinks = [
        {
            icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Terms & Conditions',
            color: colors.primary,
            bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
            onPress: () => router.push('/(shared)/terms-and-conditions' as any),
        },
        {
            icon: 'shield-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Privacy Policy',
            color: '#8B5CF6',
            bg: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF',
            onPress: () => router.push('/(shared)/privacy-policy' as any),
        },
        {
            icon: 'book-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Web User Guide',
            color: '#8B5CF6',
            bg: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF',
            onPress: () => Linking.openURL('https://blood-link-webguide.vercel.app/'),
        },
        {
            icon: 'star-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Rate the App',
            color: '#D97706',
            bg: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
            onPress: () => router.push('/(shared)/rate-app' as any),
        },
        {
            icon: 'settings-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Settings',
            color: '#0EA5E9',
            bg: isDark ? 'rgba(14, 165, 233, 0.15)' : '#E0F2FE',
            onPress: () => router.push('/(shared)/settings' as any),
        },
    ];

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            <LinearGradient
                colors={[colors.primary, '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.header}
            >
                <View style={s.hCircle1} />
                <View style={s.hCircle2} />

                <View style={s.headerRow}>
                    <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={s.headerCenter}>
                        <Text style={s.headerTitle}>Help & Support</Text>
                        <Text style={s.headerSub}>We're here to help you</Text>
                    </View>
                    <View style={{ width: 42 }} />
                </View>

                <View style={s.heroCard}>
                    <View style={[s.heroIconWrap, { backgroundColor: 'rgba(234,88,12,0.85)' }]}>
                        <Ionicons name="headset" size={28} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={s.heroTitle}>Need Assistance?</Text>
                        <Text style={s.heroSub}>
                            Browse FAQs below or reach out to our team directly. We typically respond within 24 hours.
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={s.scrollView}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={s.searchSection}>
                    <View style={s.searchBox}>
                        <Ionicons name="search" size={20} color={colors.textMuted} />
                        <TextInput
                            style={s.searchInput}
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

                <View style={s.section}>
                    <View style={s.sectionHdr}>
                        <View style={[s.sectionBar, { backgroundColor: '#EA580C' }]} />
                        <Ionicons name="chatbubbles-outline" size={16} color="#EA580C" style={{ marginRight: 6 }} />
                        <Text style={s.sectionTitle}>Contact Us</Text>
                    </View>
                    <View style={s.contactGrid}>
                        {contactMethods.map((method, i) => (
                            <TouchableOpacity
                                key={i}
                                style={s.contactCard}
                                onPress={method.onPress}
                                activeOpacity={0.75}
                            >
                                <LinearGradient colors={method.gradient} style={s.contactIconGrad}>
                                    <Ionicons name={method.icon} size={22} color="#FFFFFF" />
                                </LinearGradient>
                                <Text style={s.contactTitle}>{method.title}</Text>
                                <Text style={s.contactSubtitle} numberOfLines={1}>
                                    {method.subtitle}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={s.section}>
                    <View style={s.sectionHdr}>
                        <View style={[s.sectionBar, { backgroundColor: colors.primary }]} />
                        <Ionicons name="help-circle-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={s.sectionTitle}>Frequently Asked Questions</Text>
                    </View>

                    {filteredFaqs.length > 0 ? (
                        filteredFaqs.map((faq, i) => (
                            <FAQAccordion key={i} item={faq} index={i} colors={colors} isDark={isDark} styles={s} />
                        ))
                    ) : (
                        <View style={s.emptyState}>
                            <LinearGradient colors={['#DBEAFE', '#BFDBFE']} style={s.emptyIconBox}>
                                <Ionicons name="search-outline" size={36} color={colors.primary} />
                            </LinearGradient>
                            <Text style={s.emptyTitle}>No results found</Text>
                            <Text style={s.emptySub}>
                                Try different keywords or contact us directly
                            </Text>
                        </View>
                    )}
                </View>

                <View style={s.section}>
                    <View style={s.sectionHdr}>
                        <View style={[s.sectionBar, { backgroundColor: '#10B981' }]} />
                        <Ionicons name="link-outline" size={16} color="#10B981" style={{ marginRight: 6 }} />
                        <Text style={s.sectionTitle}>Quick Links</Text>
                    </View>
                    <View style={s.quickLinksCard}>
                        {user && (
                            <TouchableOpacity
                                style={[
                                    s.quickLinkItem,
                                ]}
                                onPress={() => router.push('/(shared)/tickets' as any)}
                                activeOpacity={0.65}
                            >
                                <View style={[s.quickLinkIcon, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE' }]}>
                                    <Ionicons name="ticket" size={18} color={colors.primary} />
                                </View>
                                <Text style={s.quickLinkLabel}>My Support Tickets</Text>
                                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        )}
                        {quickLinks
                            .filter(link => {
                                // Filter out Settings for unauthenticated users
                                if (!user && link.label === 'Settings') return false;
                                return true;
                            })
                            .map((link, i, filteredList) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[
                                        s.quickLinkItem,
                                        i === filteredList.length - 1 && { borderBottomWidth: 0 },
                                    ]}
                                    onPress={link.onPress}
                                    activeOpacity={0.65}
                                >
                                    <View style={[s.quickLinkIcon, { backgroundColor: link.bg }]}>
                                        <Ionicons name={link.icon} size={18} color={link.color} />
                                    </View>
                                    <Text style={s.quickLinkLabel}>{link.label}</Text>
                                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                                </TouchableOpacity>
                            ))}
                    </View>
                </View>

                <View style={s.section}>
                    <LinearGradient colors={['#DC2626', '#B91C1C']} style={s.emergencyBanner}>
                        <View style={s.emergencyIconWrap}>
                            <Ionicons name="warning" size={24} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.emergencyTitle}>Medical Emergency?</Text>
                            <Text style={s.emergencySub}>
                                If you or someone needs urgent blood, please call emergency services immediately.
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={s.emergencyCallBtn}
                            onPress={() => openLink('tel:999')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="call" size={18} color="#DC2626" />
                            <Text style={s.emergencyCallText}>999</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>

                <View style={s.appInfoCard}>
                    <View style={s.appInfoLogoWrap}>
                        <Image
                            source={require('@/assets/images/logo.jpg')}
                            style={s.appInfoLogoImage}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={s.appInfoName}>BloodLink</Text>
                    <Text style={s.appInfoVersion}>Version 2.1.0</Text>
                    <Text style={s.appInfoTagline}>We Save Lives 🇰🇪</Text>
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
}