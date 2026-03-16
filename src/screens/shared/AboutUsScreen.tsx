import { useAppTheme } from '@/src/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Image,
    Linking,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Brand Palette 
const B_SKY = '#2563EB';
const B_LIGHT = '#3B82F6';
const O_MID = '#EA580C';

const AboutUsScreen: React.FC = () => {
    const router = useRouter();
    const { colors, isDark } = useAppTheme();

    const openLink = (url: string) => {
        Linking.openURL(url).catch(() => { });
    };

    // Social Media 
    const socialLinks = [
        {
            icon: 'logo-facebook' as const,
            label: 'Facebook',
            handle: '@BloodLinkKE',
            gradient: ['#1877F2', '#0C5DC7'] as [string, string],
            url: 'https://facebook.com/bloodlinkke',
        },
        {
            icon: 'logo-twitter' as const,
            label: 'X / Twitter',
            handle: '@bloodlinkapp',
            gradient: ['#1DA1F2', '#0D8BD9'] as [string, string],
            url: 'https://twitter.com/bloodlinkapp',
        },
        {
            icon: 'logo-instagram' as const,
            label: 'Instagram',
            handle: '@bloodlink.ke',
            gradient: ['#E1306C', '#C13584'] as [string, string],
            url: 'https://instagram.com/bloodlink.ke',
        },
        {
            icon: 'logo-whatsapp' as const,
            label: 'WhatsApp',
            handle: '+254 700 000 000',
            gradient: ['#25D366', '#128C7E'] as [string, string],
            url: 'https://wa.me/254700000000',
        },
        {
            icon: 'logo-linkedin' as const,
            label: 'LinkedIn',
            handle: 'BloodLink Inc.',
            gradient: ['#0A66C2', '#004182'] as [string, string],
            url: 'https://linkedin.com/company/bloodlink',
        },
        {
            icon: 'logo-youtube' as const,
            label: 'YouTube',
            handle: 'BloodLink Kenya',
            gradient: ['#FF0000', '#CC0000'] as [string, string],
            url: 'https://youtube.com/@bloodlinkke',
        },
    ];

    // ── Team ──────────────────────────────────────────────────────────────
    const teamMembers = [
        { name: 'Kenneth Lepas', role: 'Founder & CEO', initial: 'KL', color: B_SKY },
        { name: 'Dev Team', role: 'Engineering', initial: 'DT', color: O_MID },
        { name: 'Medical Board', role: 'Health Advisors', initial: 'MB', color: '#10B981' },
    ];

    // ── Stats ─────────────────────────────────────────────────────────────
    const stats = [
        { value: '10K+', label: 'Donors', icon: 'people' as const, color: B_SKY },
        { value: '5K+', label: 'Lives Saved', icon: 'heart' as const, color: '#DC2626' },
        { value: '47', label: 'Counties', icon: 'location' as const, color: '#10B981' },
        { value: '4.8★', label: 'App Rating', icon: 'star' as const, color: '#D97706' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={B_SKY} />

            {/* ══ HEADER ══ */}
            <LinearGradient
                colors={[B_SKY, B_LIGHT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.hCircle1} />
                <View style={styles.hCircle2} />

                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>About Us</Text>
                        <Text style={styles.headerSub}>BloodLink · Saving Lives Together</Text>
                    </View>
                    <View style={{ width: 42 }} />
                </View>

                {/* Logo + tagline in header */}
                <View style={styles.heroBadge}>
                    <View style={styles.logoWrap}>
                        <Image
                            source={require('@/assets/images/logo.jpg')}
                            style={styles.logoImg}
                            resizeMode="contain"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.heroAppName}>BloodLink</Text>
                        <Text style={styles.heroTagline}>Connecting Donors · Saving Lives 🇰🇪</Text>
                        <View style={styles.versionBadge}>
                            <View style={styles.versionDot} />
                            <Text style={styles.versionText}>v2.1.0 · Made in Kenya</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ══ IMPACT STATS ══ */}
                <View style={styles.statsRow}>
                    {stats.map((s, i) => (
                        <View
                            key={i}
                            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                        >
                            <View style={[styles.statIconWrap, { backgroundColor: s.color + '22' }]}>
                                <Ionicons name={s.icon} size={18} color={s.color} />
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                {/* ══ MISSION ══ */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={styles.cardTitleRow}>
                        <View style={[styles.cardTitleBar, { backgroundColor: B_SKY }]} />
                        <Ionicons name="flag" size={18} color={B_SKY} style={{ marginRight: 8 }} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Our Mission</Text>
                    </View>
                    <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                        BloodLink is dedicated to bridging the gap between blood donors and patients in need across Kenya and beyond. We believe every drop counts — and that technology can save lives by making blood donation more accessible, efficient, and community-driven.
                    </Text>
                    <Text style={[styles.bodyText, { color: colors.textSecondary, marginTop: 10 }]}>
                        Our platform connects willing donors with urgent recipients in real time, eliminating the delays that cost lives during medical emergencies.
                    </Text>
                </View>

                {/* ══ STORY ══ */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={styles.cardTitleRow}>
                        <View style={[styles.cardTitleBar, { backgroundColor: O_MID }]} />
                        <Ionicons name="book" size={18} color={O_MID} style={{ marginRight: 8 }} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Our Story</Text>
                    </View>
                    <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                        BloodLink was born out of a personal experience — watching a loved one struggle to find compatible blood during an emergency. Founded in 2024 in Nakuru, Kenya, our team set out to build a solution that could work for any Kenyan, in any county, at any time.
                    </Text>
                    <Text style={[styles.bodyText, { color: colors.textSecondary, marginTop: 10 }]}>
                        What started as a small app idea has grown into a community of thousands of donors and requesters united by one goal: no one should die because blood wasn't available.
                    </Text>
                </View>

                {/* ══ WHY BLOODLINK ══ */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={styles.cardTitleRow}>
                        <View style={[styles.cardTitleBar, { backgroundColor: '#10B981' }]} />
                        <Ionicons name="sparkles" size={18} color="#10B981" style={{ marginRight: 8 }} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Why BloodLink?</Text>
                    </View>

                    <View style={styles.featuresGrid}>
                        {[
                            { icon: 'flash' as const, color: '#10B981', bg: isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5', title: 'Real-time Requests', desc: 'Connect instantly with nearby donors when time matters most.' },
                            { icon: 'shield-checkmark' as const, color: B_SKY, bg: isDark ? 'rgba(59,130,246,0.2)' : '#DBEAFE', title: 'Verified Community', desc: 'Safe and secure environment for all donors and requesters.' },
                            { icon: 'location' as const, color: '#DC2626', bg: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2', title: 'Location Based', desc: 'Find help right where you are using advanced geolocation.' },
                            { icon: 'trophy' as const, color: '#D97706', bg: isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7', title: 'Donor Rewards', desc: 'Earn points and recognition for every life-saving donation.' },
                            { icon: 'notifications' as const, color: '#8B5CF6', bg: isDark ? 'rgba(139,92,246,0.2)' : '#F5F3FF', title: 'Smart Alerts', desc: 'Get notified instantly when your blood type is urgently needed.' },
                            { icon: 'business' as const, color: O_MID, bg: isDark ? 'rgba(234,88,12,0.2)' : '#FFF7ED', title: 'Blood Banks', desc: 'Access a directory of verified blood banks across Kenya.' },
                        ].map((f, i) => (
                            <View key={i} style={[styles.featureCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
                                <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                                    <Ionicons name={f.icon} size={20} color={f.color} />
                                </View>
                                <Text style={[styles.featureTitle, { color: colors.text }]}>{f.title}</Text>
                                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{f.desc}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ══ VALUES ══ */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={styles.cardTitleRow}>
                        <View style={[styles.cardTitleBar, { backgroundColor: '#8B5CF6' }]} />
                        <Ionicons name="heart-circle" size={18} color="#8B5CF6" style={{ marginRight: 8 }} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Our Values</Text>
                    </View>
                    {[
                        { icon: 'people' as const, color: B_SKY, label: 'Community First', desc: 'We put the needs of patients and donors at the center of every decision.' },
                        { icon: 'eye' as const, color: '#10B981', label: 'Transparency', desc: 'Honest communication and clear privacy practices you can trust.' },
                        { icon: 'rocket' as const, color: O_MID, label: 'Innovation', desc: 'Continuously improving our technology to save more lives, faster.' },
                        { icon: 'globe' as const, color: '#8B5CF6', label: 'Inclusivity', desc: 'Accessible to every Kenyan, regardless of location or background.' },
                    ].map((v, i) => (
                        <View key={i} style={[styles.valueRow, i < 3 && { borderBottomColor: colors.divider, borderBottomWidth: 1 }]}>
                            <View style={[styles.valueIconWrap, { backgroundColor: v.color + '22' }]}>
                                <Ionicons name={v.icon} size={20} color={v.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.valueLabel, { color: colors.text }]}>{v.label}</Text>
                                <Text style={[styles.valueDesc, { color: colors.textSecondary }]}>{v.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* ══ TEAM ══ */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={styles.cardTitleRow}>
                        <View style={[styles.cardTitleBar, { backgroundColor: '#D97706' }]} />
                        <Ionicons name="people" size={18} color="#D97706" style={{ marginRight: 8 }} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>The Team</Text>
                    </View>
                    <View style={styles.teamRow}>
                        {teamMembers.map((m, i) => (
                            <View key={i} style={styles.teamCard}>
                                <View style={[styles.teamAvatar, { backgroundColor: m.color }]}>
                                    <Text style={styles.teamInitial}>{m.initial}</Text>
                                </View>
                                <Text style={[styles.teamName, { color: colors.text }]}>{m.name}</Text>
                                <Text style={[styles.teamRole, { color: colors.textSecondary }]}>{m.role}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ══ SOCIAL MEDIA ══ */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={styles.cardTitleRow}>
                        <View style={[styles.cardTitleBar, { backgroundColor: '#EC4899' }]} />
                        <Ionicons name="share-social" size={18} color="#EC4899" style={{ marginRight: 8 }} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Follow Us</Text>
                    </View>
                    <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 16 }]}>
                        Stay updated with blood donation drives, health tips, and community stories.
                    </Text>
                    <View style={styles.socialGrid}>
                        {socialLinks.map((s, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.socialCard, { borderColor: colors.surfaceBorder }]}
                                onPress={() => openLink(s.url)}
                                activeOpacity={0.75}
                            >
                                <LinearGradient colors={s.gradient} style={styles.socialIconGrad}>
                                    <Ionicons name={s.icon} size={20} color="#FFFFFF" />
                                </LinearGradient>
                                <Text style={[styles.socialLabel, { color: colors.text }]}>{s.label}</Text>
                                <Text style={[styles.socialHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {s.handle}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ══ CONTACT ACTIONS ══ */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                        onPress={() => openLink('https://bloodlink.co.ke')}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="globe-outline" size={20} color={B_SKY} />
                        <Text style={[styles.actionBtnText, { color: colors.text }]}>Website</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                        onPress={() => openLink('mailto:support@bloodlink.co.ke')}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="mail-outline" size={20} color={O_MID} />
                        <Text style={[styles.actionBtnText, { color: colors.text }]}>Email Us</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                        onPress={() => openLink('tel:+254700000000')}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="call-outline" size={20} color="#10B981' " />
                        <Text style={[styles.actionBtnText, { color: colors.text }]}>Call Us</Text>
                    </TouchableOpacity>
                </View>

                {/* ══ FOOTER ══ */}
                <View style={styles.footer}>
                    <View style={styles.footerDivider} />
                    <Image
                        source={require('@/assets/images/logo.jpg')}
                        style={styles.footerLogo}
                        resizeMode="contain"
                    />
                    <Text style={[styles.footerName, { color: colors.text }]}>BloodLink</Text>
                    <Text style={[styles.footerTagline, { color: colors.textMuted }]}>
                        We Save Lives · Built with ❤️ in Kenya 🇰🇪
                    </Text>
                    <Text style={[styles.copyright, { color: colors.textMuted }]}>
                        © 2026 BloodLink Inc. All rights reserved.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

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
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.07)',
        top: -60,
        right: -40,
    },
    hCircle2: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.05)',
        bottom: -30,
        left: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    logoWrap: {
        width: 52,
        height: 62,
        borderRadius: 14,
        overflow: 'hidden',
    },
    logoImg: { width: '100%', height: '100%' },
    heroAppName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
    heroTagline: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 6 },
    versionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    versionDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#10B981' },
    versionText: { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },

    scrollContent: { padding: 16, paddingBottom: 40 },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statCard: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } as any,
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
        }),
    },
    statIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    statValue: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
    statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        marginBottom: 16,
        ...Platform.select({
            web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } as any,
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
        }),
    },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    cardTitleBar: { width: 4, height: 20, borderRadius: 2, marginRight: 8 },
    cardTitle: { fontSize: 17, fontWeight: '800' },
    bodyText: { fontSize: 14, lineHeight: 22 },

    featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    featureCard: {
        width: '48%',
        borderRadius: 14,
        padding: 12,
        minHeight: 110,
    },
    featureIcon: {
        width: 38,
        height: 38,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    featureTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
    featureDesc: { fontSize: 12, lineHeight: 17 },

    valueRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        paddingVertical: 14,
    },
    valueIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    valueLabel: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
    valueDesc: { fontSize: 12, lineHeight: 18 },

    teamRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
    teamCard: { alignItems: 'center', flex: 1 },
    teamAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    teamInitial: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
    teamName: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
    teamRole: { fontSize: 11, textAlign: 'center' },

    socialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    socialCard: {
        width: '30%',
        flexGrow: 1,
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } as any,
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
        }),
    },
    socialIconGrad: {
        width: 44,
        height: 44,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    socialLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
    socialHandle: { fontSize: 10, textAlign: 'center' },

    actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    actionBtn: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 6,
        ...Platform.select({
            web: { boxShadow: '0 2px 6px rgba(0,0,0,0.06)' } as any,
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
        }),
    },
    actionBtnText: { fontSize: 12, fontWeight: '700' },

    // FOOTER
    footer: { alignItems: 'center', paddingTop: 8, paddingBottom: 10 },
    footerDivider: {
        width: 60,
        height: 3,
        borderRadius: 2,
        backgroundColor: '#E2E8F0',
        marginBottom: 20,
    },
    footerLogo: {
        width: 60,
        height: 72,
        borderRadius: 16,
        marginBottom: 10,
    },
    footerName: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
    footerTagline: { fontSize: 12, marginBottom: 6 },
    copyright: { fontSize: 11, textAlign: 'center' },
});

export default AboutUsScreen;