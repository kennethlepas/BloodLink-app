import { COMPATIBILITY_CHART, DONOR_GUIDE, GuideSection, RECIPIENT_GUIDE } from '@/src/constants/guideData';
import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

//Brand Palette
const B_SKY = '#2563EB';
const B_LIGHT = '#3B82F6';
const O_MID = '#EA580C';
const O_PALE = '#FFF7ED';

//Tab config
type TabKey = 'donor' | 'recipient' | 'learn';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; gradient: [string, string] }[] = [
    { key: 'donor', label: 'Donor Guide', icon: 'heart', color: '#EA580C', gradient: ['#EA580C', '#C2410C'] },
    { key: 'recipient', label: 'Recipient', icon: 'medkit', color: B_SKY, gradient: [B_SKY, B_LIGHT] },
    { key: 'learn', label: 'Learn', icon: 'book', color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] },
];

//Quick Tips data 
const DONOR_TIPS = [
    { icon: 'water-outline' as const, color: '#0284C7', bg: '#E0F2FE', tip: 'Drink 500ml of water before donating to avoid dizziness.' },
    { icon: 'restaurant-outline' as const, color: '#16A34A', bg: '#F0FDF4', tip: 'Eat a light iron-rich meal 2–3 hours before you donate.' },
    { icon: 'bed-outline' as const, color: '#8B5CF6', bg: '#F5F3FF', tip: 'Get at least 7–8 hours of sleep the night before.' },
    { icon: 'fitness-outline' as const, color: O_MID, bg: O_PALE, tip: 'Avoid heavy exercise for 24 hours after donating.' },
    { icon: 'cafe-outline' as const, color: '#DC2626', bg: '#FEE2E2', tip: 'Skip alcohol and caffeine for at least 24 hours before.' },
    { icon: 'shirt-outline' as const, color: '#0284C7', bg: '#E0F2FE', tip: 'Wear loose-fitting clothes with sleeves that roll up easily.' },
];

const RECIPIENT_TIPS = [
    { icon: 'shield-checkmark-outline' as const, color: B_SKY, bg: '#DBEAFE', tip: 'Always confirm the blood type matches yours before transfusion.' },
    { icon: 'alert-circle-outline' as const, color: '#DC2626', bg: '#FEE2E2', tip: 'Report any unusual reactions (chills, rash, fever) immediately to medical staff.' },
    { icon: 'time-outline' as const, color: '#D97706', bg: '#FEF3C7', tip: 'Most transfusions take 1–4 hours — plan your schedule accordingly.' },
    { icon: 'water-outline' as const, color: '#0284C7', bg: '#E0F2FE', tip: 'Stay well hydrated before and after your transfusion.' },
    { icon: 'document-text-outline' as const, color: '#10B981', bg: '#D1FAE5', tip: 'Keep records of all transfusions for future medical consultations.' },
    { icon: 'heart-outline' as const, color: '#8B5CF6', bg: '#F5F3FF', tip: 'Follow up with your doctor 24–48 hours after transfusion.' },
];

// Accordion Section
const AccordionSection: React.FC<{ section: GuideSection; colors: any; isDark: boolean; accentColor: string }> = ({
    section, colors, isDark, accentColor,
}) => {
    const [expanded, setExpanded] = useState(false);
    const anim = useState(new Animated.Value(0))[0];

    const toggle = () => {
        Animated.spring(anim, {
            toValue: expanded ? 0 : 1,
            useNativeDriver: false,
            tension: 80,
            friction: 10,
        }).start();
        setExpanded(!expanded);
    };

    const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    return (
        <TouchableOpacity
            style={[st.card, {
                backgroundColor: colors.surface,
                borderColor: expanded ? accentColor : (isDark ? '#333' : '#E2E8F0'),
                borderWidth: expanded ? 1.5 : 1,
            }]}
            onPress={toggle}
            activeOpacity={0.75}
        >
            <View style={st.cardHeader}>
                <View style={[st.cardTitleBar, { backgroundColor: accentColor }]} />
                <Text style={[st.cardTitle, { color: colors.text, flex: 1 }]}>{section.title}</Text>
                <Animated.View style={{ transform: [{ rotate }] }}>
                    <Ionicons name="chevron-down" size={20} color={accentColor} />
                </Animated.View>
            </View>

            {expanded && (
                <View style={st.cardBody}>
                    {section.content.map((block, idx) => (
                        <View key={idx} style={st.block}>
                            {block.subtitle && (
                                <Text style={[st.subtitle, { color: accentColor }]}>{block.subtitle}</Text>
                            )}
                            {block.points.map((point, pIdx) => (
                                <View key={pIdx} style={st.pointRow}>
                                    <View style={[st.bullet, { backgroundColor: accentColor }]} />
                                    <Text style={[st.pointText, { color: colors.textSecondary }]}>{point}</Text>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            )}
        </TouchableOpacity>
    );
};

//Quick Tip Card 
const TipCard: React.FC<{ icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; tip: string; colors: any }> = ({
    icon, color, bg, tip, colors,
}) => (
    <View style={[st.tipCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder ?? '#E2E8F0' }]}>
        <View style={[st.tipIconWrap, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[st.tipText, { color: colors.textSecondary }]}>{tip}</Text>
    </View>
);

export default function GuideScreen() {
    const { colors, isDark } = useAppTheme();
    const { user } = useUser();
    const router = useRouter();

    // ── Auto-select tab based on user type ────────────────────────────────
    const defaultTab: TabKey = user?.userType === 'requester' ? 'recipient' : 'donor';
    const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

    useEffect(() => {

        if (user?.userType) {
            setActiveTab(user.userType === 'requester' ? 'recipient' : 'donor');
        }
    }, [user?.userType]);

    const activeTabConfig = TABS.find(t => t.key === activeTab)!;
    const accentColor = activeTabConfig.color;

    const renderCompatibilityChart = () => (
        <View style={[st.card, { backgroundColor: colors.surface, borderColor: isDark ? '#333' : '#E2E8F0' }]}>
            <View style={st.cardHeader}>
                <View style={[st.cardTitleBar, { backgroundColor: '#8B5CF6' }]} />
                <Text style={[st.cardTitle, { color: colors.text, flex: 1 }]}>Blood Compatibility Chart</Text>
            </View>
            <View style={st.cardBody}>
                {/* Table header */}
                <View style={[st.tableHeader, { backgroundColor: isDark ? '#1e293b' : '#F8FAFC' }]}>
                    <Text style={[st.colHeader, { flex: 1, color: colors.textSecondary }]}>Type</Text>
                    <Text style={[st.colHeader, { flex: 2, color: colors.textSecondary }]}>Can Give To</Text>
                    <Text style={[st.colHeader, { flex: 2, color: colors.textSecondary }]}>Can Receive From</Text>
                </View>
                {COMPATIBILITY_CHART.map((item, idx) => (
                    <View
                        key={idx}
                        style={[
                            st.tableRow,
                            { borderBottomColor: isDark ? '#1e293b' : '#F1F5F9' },
                            idx % 2 === 0 && { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' },
                        ]}
                    >
                        <View style={[
                            st.typeBadge,
                            { backgroundColor: item.type.includes('-') ? (isDark ? '#1e3a8a' : '#EFF6FF') : (isDark ? '#7f1d1d' : '#FEF2F2') },
                        ]}>
                            <Text style={[st.typeText, { color: item.type.includes('-') ? '#2563EB' : '#DC2626' }]}>
                                {item.type}
                            </Text>
                        </View>
                        <Text style={[st.tableCell, { flex: 2, color: colors.text }]}>{item.give.join(', ')}</Text>
                        <Text style={[st.tableCell, { flex: 2, color: colors.text }]}>{item.receive.join(', ')}</Text>
                    </View>
                ))}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={B_SKY} />

            {/* HEADER  */}
            <LinearGradient
                colors={activeTabConfig.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.header}
            >
                <View style={st.hCircle1} />
                <View style={st.hCircle2} />

                <View style={st.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={st.backBtn} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={st.headerCenter}>
                        <Text style={st.headerTitle}>Blood Guide</Text>
                        <Text style={st.headerSub}>
                            {user?.userType === 'donor'
                                ? 'Your donation guide, ' + (user?.firstName ?? 'Donor')
                                : user?.userType === 'requester'
                                    ? 'Recipient guide, ' + (user?.firstName ?? 'User')
                                    : 'Everything you need to know'}
                        </Text>
                    </View>
                    <View style={{ width: 42 }} />
                </View>

                {/* user type pill */}
                <View style={st.userTypePill}>
                    <Ionicons
                        name={user?.userType === 'donor' ? 'heart' : 'medkit'}
                        size={13}
                        color="#FFFFFF"
                    />
                    <Text style={st.userTypePillText}>
                        {user?.userType === 'donor' ? 'Donor Mode' : user?.userType === 'requester' ? 'Recipient Mode' : 'Guest Mode'}
                        {user?.bloodType ? ` · ${user.bloodType}` : ''}
                    </Text>
                </View>
            </LinearGradient>

            {/* TABS  */}
            <View style={[st.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: isDark ? '#333' : '#E2E8F0' }]}>
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[st.tab, isActive && { borderBottomColor: tab.color, borderBottomWidth: 3 }]}
                            onPress={() => setActiveTab(tab.key)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={16}
                                color={isActive ? tab.color : colors.textMuted ?? '#94A3B8'}
                                style={{ marginBottom: 3 }}
                            />
                            <Text style={[
                                st.tabText,
                                { color: isActive ? tab.color : colors.textSecondary },
                                isActive && { fontWeight: '700' },
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

                {/* DONOR TAB*/}
                {activeTab === 'donor' && (
                    <>
                        {/* Welcome banner */}
                        <LinearGradient colors={['#FFF7ED', '#FFEDD5']} style={st.welcomeBanner}>
                            <View style={[st.welcomeIcon, { backgroundColor: '#EA580C' }]}>
                                <Ionicons name="heart" size={22} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[st.welcomeTitle, { color: '#9A3412' }]}>Thank you for donating! 🩸</Text>
                                <Text style={[st.welcomeSub, { color: '#EA580C' }]}>
                                    One donation can save up to 3 lives. Follow these guidelines to stay safe and healthy.
                                </Text>
                            </View>
                        </LinearGradient>

                        {/* Quick tips */}
                        <View style={st.sectionLabel}>
                            <View style={[st.sectionLabelBar, { backgroundColor: '#EA580C' }]} />
                            <Text style={[st.sectionLabelText, { color: colors.text }]}>⚡ Quick Tips</Text>
                        </View>
                        <View style={st.tipsGrid}>
                            {DONOR_TIPS.map((t, i) => (
                                <TipCard key={i} {...t} colors={colors} />
                            ))}
                        </View>

                        {/* Eligibility callout */}
                        <View style={[st.callout, { backgroundColor: isDark ? '#1e3a5f' : '#EFF6FF', borderColor: '#BFDBFE' }]}>
                            <Ionicons name="information-circle" size={20} color={B_SKY} />
                            <Text style={[st.calloutText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                                <Text style={{ fontWeight: '700' }}>Eligibility reminder:</Text> You must be 18–65 years old, weigh at least 50kg, and wait 56 days between whole blood donations.
                            </Text>
                        </View>

                        {/* Guide sections */}
                        <View style={st.sectionLabel}>
                            <View style={[st.sectionLabelBar, { backgroundColor: '#EA580C' }]} />
                            <Text style={[st.sectionLabelText, { color: colors.text }]}>📖 Full Guide</Text>
                        </View>
                        {DONOR_GUIDE.map((section, i) => (
                            <AccordionSection key={i} section={section} colors={colors} isDark={isDark} accentColor="#EA580C" />
                        ))}

                        {/* Emergency note */}
                        <LinearGradient colors={['#EA580C', '#C2410C']} style={st.emergencyCard}>
                            <Ionicons name="warning" size={20} color="#FFFFFF" />
                            <Text style={st.emergencyText}>
                                Feeling unwell after donation? Rest immediately, drink fluids, and call your donation center or emergency services if symptoms persist.
                            </Text>
                        </LinearGradient>
                    </>
                )}

                {/*RECIPIENT TAB */}
                {activeTab === 'recipient' && (
                    <>
                        {/* Welcome banner */}
                        <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={st.welcomeBanner}>
                            <View style={[st.welcomeIcon, { backgroundColor: B_SKY }]}>
                                <Ionicons name="medkit" size={22} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[st.welcomeTitle, { color: '#1E40AF' }]}>Stay Safe & Informed 💙</Text>
                                <Text style={[st.welcomeSub, { color: B_SKY }]}>
                                    Understanding your transfusion helps ensure the best outcome. Read these tips carefully.
                                </Text>
                            </View>
                        </LinearGradient>

                        {/* Quick tips */}
                        <View style={st.sectionLabel}>
                            <View style={[st.sectionLabelBar, { backgroundColor: B_SKY }]} />
                            <Text style={[st.sectionLabelText, { color: colors.text }]}>⚡ Quick Tips</Text>
                        </View>
                        <View style={st.tipsGrid}>
                            {RECIPIENT_TIPS.map((t, i) => (
                                <TipCard key={i} {...t} colors={colors} />
                            ))}
                        </View>

                        {/* Safety callout */}
                        <View style={[st.callout, { backgroundColor: isDark ? '#1c1917' : '#FFFBEB', borderColor: '#FDE68A' }]}>
                            <Ionicons name="alert-circle" size={20} color="#D97706" />
                            <Text style={[st.calloutText, { color: isDark ? '#FCD34D' : '#92400E' }]}>
                                <Text style={{ fontWeight: '700' }}>Safety first:</Text> Never accept blood that has not been properly cross-matched with your blood type by a qualified medical professional.
                            </Text>
                        </View>

                        {/* Guide sections */}
                        <View style={st.sectionLabel}>
                            <View style={[st.sectionLabelBar, { backgroundColor: B_SKY }]} />
                            <Text style={[st.sectionLabelText, { color: colors.text }]}>📖 Full Guide</Text>
                        </View>
                        {RECIPIENT_GUIDE.map((section, i) => (
                            <AccordionSection key={i} section={section} colors={colors} isDark={isDark} accentColor={B_SKY} />
                        ))}

                        {/* Emergency */}
                        <LinearGradient colors={['#DC2626', '#B91C1C']} style={st.emergencyCard}>
                            <Ionicons name="call" size={20} color="#FFFFFF" />
                            <Text style={st.emergencyText}>
                                If you experience fever, chills, back pain, or difficulty breathing during or after a transfusion, alert medical staff immediately or call 999.
                            </Text>
                        </LinearGradient>
                    </>
                )}

                {/* LEARN TAB */}
                {activeTab === 'learn' && (
                    <>
                        <LinearGradient colors={['#F5F3FF', '#EDE9FE']} style={st.welcomeBanner}>
                            <View style={[st.welcomeIcon, { backgroundColor: '#8B5CF6' }]}>
                                <Ionicons name="library" size={22} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[st.welcomeTitle, { color: '#5B21B6' }]}>Know Your Blood 🧬</Text>
                                <Text style={[st.welcomeSub, { color: '#8B5CF6' }]}>
                                    Understanding blood types helps you make informed decisions during emergencies.
                                </Text>
                            </View>
                        </LinearGradient>

                        {/* Universal donors callout */}
                        <View style={st.universalRow}>
                            <LinearGradient colors={['#DC2626', '#B91C1C']} style={st.universalCard}>
                                <Ionicons name="water" size={24} color="#FFFFFF" />
                                <Text style={st.universalType}>O−</Text>
                                <Text style={st.universalLabel}>Universal{'\n'}Donor</Text>
                                <Text style={st.universalNote}>Can give to ALL blood types</Text>
                            </LinearGradient>
                            <LinearGradient colors={[B_SKY, B_LIGHT]} style={st.universalCard}>
                                <Ionicons name="person" size={24} color="#FFFFFF" />
                                <Text style={st.universalType}>AB+</Text>
                                <Text style={st.universalLabel}>Universal{'\n'}Recipient</Text>
                                <Text style={st.universalNote}>Can receive from ALL types</Text>
                            </LinearGradient>
                        </View>

                        {/* Compatibility chart */}
                        <View style={st.sectionLabel}>
                            <View style={[st.sectionLabelBar, { backgroundColor: '#8B5CF6' }]} />
                            <Text style={[st.sectionLabelText, { color: colors.text }]}>🩸 Compatibility Chart</Text>
                        </View>
                        {renderCompatibilityChart()}

                        {/* Blood type facts */}
                        <View style={st.sectionLabel}>
                            <View style={[st.sectionLabelBar, { backgroundColor: '#8B5CF6' }]} />
                            <Text style={[st.sectionLabelText, { color: colors.text }]}>💡 Blood Type Facts</Text>
                        </View>
                        {[
                            { icon: 'flask' as const, color: '#DC2626', bg: '#FEE2E2', fact: 'Blood makes up about 7–8% of your total body weight.' },
                            { icon: 'timer' as const, color: '#D97706', bg: '#FEF3C7', fact: 'Red blood cells live for about 120 days before being replaced.' },
                            { icon: 'globe' as const, color: B_SKY, bg: '#DBEAFE', fact: 'O+ is the most common blood type globally, found in ~38% of people.' },
                            { icon: 'star' as const, color: '#8B5CF6', bg: '#F5F3FF', fact: 'AB- is the rarest blood type, found in less than 1% of the population.' },
                            { icon: 'leaf' as const, color: '#16A34A', bg: '#F0FDF4', fact: 'Platelets must be used within 5–7 days of donation — they cannot be stored long.' },
                            { icon: 'time' as const, color: '#0284C7', bg: '#E0F2FE', fact: 'Your body replaces donated plasma within 24 hours, but red cells take 4–6 weeks.' },
                        ].map((f, i) => (
                            <View
                                key={i}
                                style={[st.factCard, { backgroundColor: colors.surface, borderColor: isDark ? '#333' : '#E2E8F0' }]}
                            >
                                <View style={[st.factIcon, { backgroundColor: f.bg }]}>
                                    <Ionicons name={f.icon} size={18} color={f.color} />
                                </View>
                                <Text style={[st.factText, { color: colors.textSecondary }]}>{f.fact}</Text>
                            </View>
                        ))}

                        {/* Donation types */}
                        <View style={st.sectionLabel}>
                            <View style={[st.sectionLabelBar, { backgroundColor: '#8B5CF6' }]} />
                            <Text style={[st.sectionLabelText, { color: colors.text }]}>🧪 Types of Donation</Text>
                        </View>
                        {[
                            { type: 'Whole Blood', wait: '56 days', icon: 'water' as const, color: '#DC2626', desc: 'The most common donation. Separated into components after collection.' },
                            { type: 'Platelets', wait: '7 days', icon: 'ellipse' as const, color: '#D97706', desc: 'Critical for cancer patients and those undergoing surgery.' },
                            { type: 'Plasma', wait: '28 days', icon: 'beaker' as const, color: B_SKY, desc: 'Used for burn victims, trauma patients, and clotting disorders.' },
                            { type: 'Double Red Cells', wait: '112 days', icon: 'heart' as const, color: '#B91C1C', desc: 'Gives twice the red cells in one visit — higher eligibility requirements.' },
                        ].map((d, i) => (
                            <View
                                key={i}
                                style={[st.donationTypeCard, { backgroundColor: colors.surface, borderColor: isDark ? '#333' : '#E2E8F0' }]}
                            >
                                <View style={[st.donationTypeIcon, { backgroundColor: d.color + '22' }]}>
                                    <Ionicons name={d.icon} size={20} color={d.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={st.donationTypeRow}>
                                        <Text style={[st.donationTypeTitle, { color: colors.text }]}>{d.type}</Text>
                                        <View style={[st.waitBadge, { backgroundColor: d.color + '22' }]}>
                                            <Text style={[st.waitBadgeText, { color: d.color }]}>Wait: {d.wait}</Text>
                                        </View>
                                    </View>
                                    <Text style={[st.donationTypeDesc, { color: colors.textSecondary }]}>{d.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    container: { flex: 1 },

    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 18,
        overflow: 'hidden',
        position: 'relative',
    },
    hCircle1: {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -40,
    },
    hCircle2: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: 20,
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    },
    backBtn: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    userTypePill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
    },
    userTypePillText: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },

    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        ...Platform.select({
            web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } as any,
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
        }),
    },
    tab: {
        flex: 1, paddingVertical: 12,
        alignItems: 'center', justifyContent: 'center',
        borderBottomWidth: 3, borderBottomColor: 'transparent',
    },
    tabText: { fontSize: 12, fontWeight: '500' },

    content: { padding: 16, paddingTop: 16 },

    welcomeBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        borderRadius: 16, padding: 14, marginBottom: 18,
    },
    welcomeIcon: {
        width: 48, height: 48, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    welcomeTitle: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
    welcomeSub: { fontSize: 12, lineHeight: 18 },

    sectionLabel: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginBottom: 12, marginTop: 4,
    },
    sectionLabelBar: { width: 4, height: 18, borderRadius: 2 },
    sectionLabelText: { fontSize: 15, fontWeight: '800' },

    tipsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 18,
    },
    tipCard: {
        width: '48%',
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        gap: 8,
        ...Platform.select({
            web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } as any,
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
        }),
    },
    tipIconWrap: {
        width: 38, height: 38, borderRadius: 11,
        justifyContent: 'center', alignItems: 'center',
    },
    tipText: { fontSize: 12, lineHeight: 18 },

    callout: {
        flexDirection: 'row', gap: 10, alignItems: 'flex-start',
        borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 18,
    },
    calloutText: { flex: 1, fontSize: 13, lineHeight: 20 },

    card: {
        borderRadius: 14, padding: 14, marginBottom: 12,
        ...Platform.select({
            web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } as any,
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
        }),
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitleBar: { width: 4, height: 18, borderRadius: 2 },
    cardTitle: { fontSize: 15, fontWeight: '700' },
    cardBody: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
    block: { marginBottom: 14 },
    subtitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 4 },
    pointRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
    bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
    pointText: { fontSize: 13, lineHeight: 20, flex: 1 },

    emergencyCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        borderRadius: 14, padding: 14, marginTop: 8, marginBottom: 16,
    },
    emergencyText: { flex: 1, fontSize: 13, color: '#FFFFFF', lineHeight: 20 },

    universalRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    universalCard: {
        flex: 1, borderRadius: 16, padding: 16,
        alignItems: 'center', gap: 4,
    },
    universalType: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
    universalLabel: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
    universalNote: { fontSize: 10, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4 },

    tableHeader: {
        flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8,
        borderRadius: 8, marginBottom: 4,
    },
    colHeader: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1 },
    typeBadge: { flex: 1, paddingVertical: 4, borderRadius: 6, alignItems: 'center', marginRight: 8 },
    typeText: { fontSize: 12, fontWeight: '800' },
    tableCell: { fontSize: 12, lineHeight: 18 },

    factCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10,
    },
    factIcon: {
        width: 36, height: 36, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    },
    factText: { flex: 1, fontSize: 13, lineHeight: 20 },

    donationTypeCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 14,
        borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
    },
    donationTypeIcon: {
        width: 44, height: 44, borderRadius: 13,
        justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    },
    donationTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
    donationTypeTitle: { fontSize: 14, fontWeight: '700' },
    waitBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    waitBadgeText: { fontSize: 11, fontWeight: '700' },
    donationTypeDesc: { fontSize: 12, lineHeight: 18 },
});