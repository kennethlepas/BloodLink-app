import { COMPATIBILITY_CHART, DONOR_GUIDE, GuideSection, RECIPIENT_GUIDE } from '@/src/constants/guideData';
import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Brand Palette
const B_SKY = '#2563EB';
const B_LIGHT = '#3B82F6';
const O_MID = '#BE4516'; // More muted, professional orange
const O_LITE = '#FB923C';
const O_PALE = '#FFF7ED';
const PURPLE = '#8B5CF6';
const PURPLE_DARK = '#7C3AED';
const GREEN = '#10B981';
const GREEN_DARK = '#059669';

// Tab config
type TabKey = 'donor' | 'recipient' | 'learn';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; gradient: [string, string] }[] = [
    { key: 'donor', label: 'Donor Guide', icon: 'heart', color: O_MID, gradient: [O_MID, '#C2410C'] },
    { key: 'recipient', label: 'Recipient', icon: 'medkit', color: B_SKY, gradient: [B_SKY, B_LIGHT] },
    { key: 'learn', label: 'Learn', icon: 'book', color: PURPLE, gradient: [PURPLE, PURPLE_DARK] },
];

// Kenya-Specific Statistics
const KENYA_STATS = {
    targetAnnual: 500000,
    currentAnnual: 160000,
    dailyNeed: 1500,
    population: 54000000,
    donationTargetPercent: 1,
    shelfLifeDays: 42,
    plateletShelfLifeDays: 5,
    donorAgeMin: 16,
    donorAgeMax: 65,
    donorWeightMin: 50,
    hemoglobinMin: 12.5,
    collectionMl: 470,
    maleWaitMonths: 3,
    femaleWaitMonths: 4,
};

// Donor Eligibility Tips
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

// Enhanced Accordion Section with animation
const AccordionSection: React.FC<{ section: GuideSection; colors: any; isDark: boolean; accentColor: string }> = ({
    section, colors, isDark, accentColor,
}) => {
    const [expanded, setExpanded] = useState(false);
    const animHeight = useRef(new Animated.Value(0)).current;
    const animRotate = useRef(new Animated.Value(0)).current;

    const toggle = () => {
        Animated.parallel([
            Animated.spring(animHeight, {
                toValue: expanded ? 0 : 1,
                useNativeDriver: false,
                tension: 80,
                friction: 10,
            }),
            Animated.spring(animRotate, {
                toValue: expanded ? 0 : 1,
                useNativeDriver: true,
                tension: 80,
                friction: 10,
            }),
        ]).start();
        setExpanded(!expanded);
    };

    const maxHeight = animHeight.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 500],
    });

    const rotate = animRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <View style={[st.accordionContainer, {
            backgroundColor: colors.surface,
            borderColor: expanded ? accentColor : (isDark ? '#334155' : '#E2E8F0'),
        }]}>
            <TouchableOpacity
                style={st.accordionHeader}
                onPress={toggle}
                activeOpacity={0.7}
            >
                <View style={[st.accordionIcon, { backgroundColor: `${accentColor}15` }]}>
                    <Ionicons name="document-text-outline" size={20} color={accentColor} />
                </View>
                <Text style={[st.accordionTitle, { color: colors.text }]}>{section.title}</Text>
                <Animated.View style={{ transform: [{ rotate }] }}>
                    <Ionicons name="chevron-down" size={20} color={accentColor} />
                </Animated.View>
            </TouchableOpacity>

            <Animated.View style={[st.accordionContent, { maxHeight }]}>
                {expanded && (
                    <View style={st.accordionBody}>
                        {section.content.map((block, idx) => (
                            <View key={idx} style={st.block}>
                                {block.subtitle && (
                                    <View style={st.subtitleRow}>
                                        <View style={[st.subtitleDot, { backgroundColor: accentColor }]} />
                                        <Text style={[st.subtitle, { color: accentColor }]}>{block.subtitle}</Text>
                                    </View>
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
            </Animated.View>
        </View>
    );
};

// Enhanced Tip Card
const TipCard: React.FC<{ icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; tip: string; colors: any }> = ({
    icon, color, bg, tip, colors,
}) => (
    <View style={[st.tipCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder ?? '#E2E8F0' }]}>
        <View style={[st.tipIconWrap, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={[st.tipText, { color: colors.textSecondary }]}>{tip}</Text>
    </View>
);

// Kenya Stats Card Component
const KenyaStatsCard: React.FC<{ colors: any; isDark: boolean }> = ({ colors, isDark }) => {
    const shortfall = KENYA_STATS.targetAnnual - KENYA_STATS.currentAnnual;
    const percentageCollected = (KENYA_STATS.currentAnnual / KENYA_STATS.targetAnnual) * 100;

    return (
        <View style={[st.statsCard, { backgroundColor: colors.surface, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={st.statsHeader}>
                <Ionicons name="stats-chart" size={22} color={GREEN} />
                <Text style={[st.statsTitle, { color: colors.text }]}>Kenya's Blood Supply Status</Text>
            </View>

            <View style={st.statsGrid}>
                <View style={st.statItem}>
                    <Text style={[st.statValue, { color: B_SKY }]}>{KENYA_STATS.targetAnnual.toLocaleString()}</Text>
                    <Text style={[st.statLabel, { color: colors.textSecondary }]}>Annual Target (Units)</Text>
                </View>
                <View style={st.statItem}>
                    <Text style={[st.statValue, { color: O_MID }]}>{KENYA_STATS.currentAnnual.toLocaleString()}</Text>
                    <Text style={[st.statLabel, { color: colors.textSecondary }]}>Current Collection</Text>
                </View>
                <View style={st.statItem}>
                    <Text style={[st.statValue, { color: '#DC2626' }]}>{shortfall.toLocaleString()}</Text>
                    <Text style={[st.statLabel, { color: colors.textSecondary }]}>Shortfall</Text>
                </View>
            </View>

            <View style={st.progressContainer}>
                <View style={st.progressBarBg}>
                    <View style={[st.progressBarFill, { width: `${percentageCollected}%`, backgroundColor: percentageCollected < 50 ? '#DC2626' : percentageCollected < 80 ? '#F59E0B' : '#10B981' }]} />
                </View>
                <Text style={[st.progressText, { color: colors.textSecondary }]}>
                    {percentageCollected.toFixed(1)}% of annual target met
                </Text>
            </View>

            <Text style={[st.statsNote, { color: colors.textSecondary }]}>
                Kenya needs approximately {KENYA_STATS.dailyNeed.toLocaleString()} units of blood daily.
                With current collection rates, only {Math.floor(KENYA_STATS.currentAnnual / 365).toLocaleString()} units
                are available per day, leaving a critical gap of {KENYA_STATS.dailyNeed - Math.floor(KENYA_STATS.currentAnnual / 365)} units daily.
            </Text>
        </View>
    );
};

// Donor Eligibility Card
const EligibilityCard: React.FC<{ colors: any; isDark: boolean }> = ({ colors, isDark }) => (
    <View style={[st.eligibilityCard, { backgroundColor: colors.surface, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <View style={st.eligibilityHeader}>
            <Ionicons name="checkmark-circle" size={22} color={GREEN} />
            <Text style={[st.eligibilityTitle, { color: colors.text }]}>Donor Eligibility (KNBTS Standards)</Text>
        </View>

        <View style={st.eligibilityGrid}>
            <View style={st.eligibilityItem}>
                <Ionicons name="calendar" size={18} color={B_SKY} />
                <Text style={[st.eligibilityText, { color: colors.textSecondary }]}>Age: {KENYA_STATS.donorAgeMin}–{KENYA_STATS.donorAgeMax} years</Text>
            </View>
            <View style={st.eligibilityItem}>
                <Ionicons name="fitness" size={18} color={B_SKY} />
                <Text style={[st.eligibilityText, { color: colors.textSecondary }]}>Weight: ≥{KENYA_STATS.donorWeightMin} kg</Text>
            </View>
            <View style={st.eligibilityItem}>
                <Ionicons name="water" size={18} color={B_SKY} />
                <Text style={[st.eligibilityText, { color: colors.textSecondary }]}>Hemoglobin: ≥{KENYA_STATS.hemoglobinMin} g/dL</Text>
            </View>
            <View style={st.eligibilityItem}>
                <Ionicons name="man" size={18} color={B_SKY} />
                <Text style={[st.eligibilityText, { color: colors.textSecondary }]}>Males: Every {KENYA_STATS.maleWaitMonths} months</Text>
            </View>
            <View style={st.eligibilityItem}>
                <Ionicons name="woman" size={18} color={B_SKY} />
                <Text style={[st.eligibilityText, { color: colors.textSecondary }]}>Females: Every {KENYA_STATS.femaleWaitMonths} months</Text>
            </View>
            <View style={st.eligibilityItem}>
                <Ionicons name="flask" size={18} color={B_SKY} />
                <Text style={[st.eligibilityText, { color: colors.textSecondary }]}>Donation: {KENYA_STATS.collectionMl} ml whole blood</Text>
            </View>
        </View>
    </View>
);

// Blood Shelf Life Card
const ShelfLifeCard: React.FC<{ colors: any; isDark: boolean }> = ({ colors, isDark }) => (
    <View style={[st.shelfLifeCard, { backgroundColor: colors.surface, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <View style={st.shelfLifeHeader}>
            <Ionicons name="time" size={22} color={PURPLE} />
            <Text style={[st.shelfLifeTitle, { color: colors.text }]}>Blood Product Shelf Life</Text>
        </View>

        <View style={st.shelfLifeGrid}>
            <View style={st.shelfLifeItem}>
                <LinearGradient colors={['#DC2626', '#B91C1C']} style={st.shelfLifeBadge}>
                    <Text style={st.shelfLifeBadgeText}>Whole Blood</Text>
                </LinearGradient>
                <Text style={[st.shelfLifeDays, { color: colors.text }]}>{KENYA_STATS.shelfLifeDays} days</Text>
                <Text style={[st.shelfLifeNote, { color: colors.textSecondary }]}>Can be stored for up to 6 weeks</Text>
            </View>
            <View style={st.shelfLifeItem}>
                <LinearGradient colors={['#F59E0B', '#D97706']} style={st.shelfLifeBadge}>
                    <Text style={st.shelfLifeBadgeText}>Platelets</Text>
                </LinearGradient>
                <Text style={[st.shelfLifeDays, { color: colors.text }]}>{KENYA_STATS.plateletShelfLifeDays} days</Text>
                <Text style={[st.shelfLifeNote, { color: colors.textSecondary }]}>Requires constant rotation</Text>
            </View>
        </View>

        <Text style={[st.shelfLifeWarning, { color: colors.textSecondary }]}>
            ⚠️ Due to short shelf life, maintaining adequate platelet supplies is a constant challenge.
            Regular donations are critical for cancer patients, trauma victims, and surgical patients.
        </Text>
    </View>
);

// Urgency Guide Card
const UrgencyGuideCard: React.FC<{ colors: any; isDark: boolean }> = ({ colors, isDark }) => (
    <View style={[st.urgencyCard, { backgroundColor: colors.surface, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <View style={st.urgencyHeader}>
            <Ionicons name="alert-circle" size={22} color={O_MID} />
            <Text style={[st.urgencyTitle, { color: colors.text }]}>Understanding Urgency Levels</Text>
        </View>

        <View style={st.urgencyList}>
            <View style={st.urgencyItem}>
                <View style={[st.urgencyDot, { backgroundColor: '#DC2626' }]} />
                <View style={st.urgencyContent}>
                    <Text style={[st.urgencyLevel, { color: '#DC2626' }]}>Critical</Text>
                    <Text style={[st.urgencyDesc, { color: colors.textSecondary }]}>
                        Life-threatening emergency. Patient requires immediate transfusion.
                        Response time: <Text style={{ fontWeight: '700' }}>Within 30 minutes</Text>
                    </Text>
                </View>
            </View>
            <View style={st.urgencyItem}>
                <View style={[st.urgencyDot, { backgroundColor: '#F59E0B' }]} />
                <View style={st.urgencyContent}>
                    <Text style={[st.urgencyLevel, { color: '#F59E0B' }]}>Urgent</Text>
                    <Text style={[st.urgencyDesc, { color: colors.textSecondary }]}>
                        Serious condition requiring blood within 24 hours.
                        Response time: <Text style={{ fontWeight: '700' }}>Within 2-4 hours</Text>
                    </Text>
                </View>
            </View>
            <View style={st.urgencyItem}>
                <View style={[st.urgencyDot, { backgroundColor: '#3B82F6' }]} />
                <View style={st.urgencyContent}>
                    <Text style={[st.urgencyLevel, { color: '#3B82F6' }]}>Moderate</Text>
                    <Text style={[st.urgencyDesc, { color: colors.textSecondary }]}>
                        Planned procedure or non-critical condition.
                        Response time: <Text style={{ fontWeight: '700' }}>Within 24-72 hours</Text>
                    </Text>
                </View>
            </View>
        </View>
    </View>
);

// Compatibility Chart Component
const CompatibilityChart: React.FC<{ colors: any; isDark: boolean }> = ({ colors, isDark }) => (
    <View style={[st.chartCard, { backgroundColor: colors.surface, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <View style={st.chartHeader}>
            <Ionicons name="water" size={20} color={PURPLE} />
            <Text style={[st.chartTitle, { color: colors.text }]}>Blood Compatibility Chart</Text>
        </View>
        <View style={st.chartTable}>
            {/* Table Header */}
            <View style={[st.tableHeader, { backgroundColor: isDark ? '#1e293b' : '#F8FAFC' }]}>
                <Text style={[st.tableHeaderText, { flex: 1, color: colors.textSecondary }]}>Blood Type</Text>
                <Text style={[st.tableHeaderText, { flex: 2, color: colors.textSecondary }]}>Can Give To</Text>
                <Text style={[st.tableHeaderText, { flex: 2, color: colors.textSecondary }]}>Can Receive From</Text>
            </View>
            {COMPATIBILITY_CHART.map((item, idx) => (
                <View
                    key={idx}
                    style={[
                        st.tableRow,
                        { borderBottomColor: isDark ? '#334155' : '#F1F5F9' },
                        idx % 2 === 0 && { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' },
                    ]}
                >
                    <View style={[st.typeBadge, { backgroundColor: item.type.includes('-') ? '#EFF6FF' : '#FEF2F2' }]}>
                        <Text style={[st.typeText, { color: item.type.includes('-') ? B_SKY : '#DC2626' }]}>
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

export default function GuideScreen() {
    const { colors, isDark } = useAppTheme();
    const { user } = useUser();
    const router = useRouter();

    const defaultTab: TabKey = user?.userType === 'requester' ? 'recipient' : 'donor';
    const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (user?.userType) {
            setActiveTab(user.userType === 'requester' ? 'recipient' : 'donor');
        }
    }, [user?.userType]);

    const activeTabConfig = TABS.find(t => t.key === activeTab)!;
    const accentColor = activeTabConfig.color;

    const renderDonorContent = () => (
        <>
            {/* Welcome Banner */}
            <LinearGradient colors={[O_PALE, '#FFEDD5']} style={st.welcomeBanner}>
                <View style={[st.welcomeIcon, { backgroundColor: O_MID }]}>
                    <Ionicons name="heart" size={24} color="#FFFFFF" />
                </View>
                <View style={st.welcomeContent}>
                    <Text style={[st.welcomeTitle, { color: '#9A3412' }]}>Thank You for Donating! 🩸</Text>
                    <Text style={[st.welcomeText, { color: O_MID }]}>
                        One donation can save up to 3 lives. Follow these guidelines to stay safe and healthy.
                    </Text>
                </View>
            </LinearGradient>

            {/* Kenya Statistics */}
            <KenyaStatsCard colors={colors} isDark={isDark} />

            {/* Eligibility Card */}
            <EligibilityCard colors={colors} isDark={isDark} />

            {/* Shelf Life Card */}
            <ShelfLifeCard colors={colors} isDark={isDark} />

            {/* Quick Tips Section */}
            <View style={st.sectionHeader}>
                <Ionicons name="flash" size={20} color={accentColor} />
                <Text style={[st.sectionTitle, { color: colors.text }]}>Quick Tips</Text>
            </View>
            <View style={st.tipsGrid}>
                {DONOR_TIPS.map((t, i) => (
                    <TipCard key={i} {...t} colors={colors} />
                ))}
            </View>

            {/* Eligibility Callout */}
            <View style={[st.calloutCard, { backgroundColor: isDark ? '#1e3a5f' : '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <Ionicons name="information-circle" size={22} color={B_SKY} />
                <Text style={[st.calloutText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                    <Text style={{ fontWeight: '700' }}>Eligibility Reminder:</Text> You must be {KENYA_STATS.donorAgeMin}–{KENYA_STATS.donorAgeMax} years old, weigh at least {KENYA_STATS.donorWeightMin}kg,
                    have hemoglobin ≥{KENYA_STATS.hemoglobinMin}g/dL, and wait {KENYA_STATS.maleWaitMonths} months (males) or {KENYA_STATS.femaleWaitMonths} months (females) between donations.
                </Text>
            </View>

            {/* Full Guide Section */}
            <View style={st.sectionHeader}>
                <Ionicons name="library" size={20} color={accentColor} />
                <Text style={[st.sectionTitle, { color: colors.text }]}>Full Donor Guide</Text>
            </View>
            {DONOR_GUIDE.map((section, i) => (
                <AccordionSection key={i} section={section} colors={colors} isDark={isDark} accentColor={accentColor} />
            ))}

            {/* Emergency Note */}
            <LinearGradient colors={[O_MID, '#C2410C']} style={st.emergencyCard}>
                <Ionicons name="warning" size={22} color="#FFFFFF" />
                <Text style={st.emergencyText}>
                    Feeling unwell after donation? Rest immediately, drink fluids, and call your donation center or emergency services if symptoms persist.
                </Text>
            </LinearGradient>
        </>
    );

    const renderRecipientContent = () => (
        <>
            <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={st.welcomeBanner}>
                <View style={[st.welcomeIcon, { backgroundColor: B_SKY }]}>
                    <Ionicons name="medkit" size={24} color="#FFFFFF" />
                </View>
                <View style={st.welcomeContent}>
                    <Text style={[st.welcomeTitle, { color: '#1E40AF' }]}>Stay Safe & Informed 💙</Text>
                    <Text style={[st.welcomeText, { color: B_SKY }]}>
                        Understanding your transfusion helps ensure the best outcome. Read these tips carefully.
                    </Text>
                </View>
            </LinearGradient>

            {/* Urgency Guide */}
            <UrgencyGuideCard colors={colors} isDark={isDark} />

            {/* Quick Tips */}
            <View style={st.sectionHeader}>
                <Ionicons name="flash" size={20} color={accentColor} />
                <Text style={[st.sectionTitle, { color: colors.text }]}>Quick Tips</Text>
            </View>
            <View style={st.tipsGrid}>
                {RECIPIENT_TIPS.map((t, i) => (
                    <TipCard key={i} {...t} colors={colors} />
                ))}
            </View>

            {/* Safety Callout */}
            <View style={[st.calloutCard, { backgroundColor: isDark ? '#1c1917' : '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Ionicons name="alert-circle" size={22} color="#D97706" />
                <Text style={[st.calloutText, { color: isDark ? '#FCD34D' : '#92400E' }]}>
                    <Text style={{ fontWeight: '700' }}>Safety First:</Text> Never accept blood that has not been properly cross-matched with your blood type by a qualified medical professional.
                </Text>
            </View>

            {/* Full Guide */}
            <View style={st.sectionHeader}>
                <Ionicons name="library" size={20} color={accentColor} />
                <Text style={[st.sectionTitle, { color: colors.text }]}>Full Recipient Guide</Text>
            </View>
            {RECIPIENT_GUIDE.map((section, i) => (
                <AccordionSection key={i} section={section} colors={colors} isDark={isDark} accentColor={accentColor} />
            ))}

            {/* Emergency Card */}
            <LinearGradient colors={['#DC2626', '#B91C1C']} style={st.emergencyCard}>
                <Ionicons name="call" size={22} color="#FFFFFF" />
                <Text style={st.emergencyText}>
                    If you experience fever, chills, back pain, or difficulty breathing during or after a transfusion, alert medical staff immediately or call 999.
                </Text>
            </LinearGradient>
        </>
    );

    const renderLearnContent = () => (
        <>
            <LinearGradient colors={['#F5F3FF', '#EDE9FE']} style={st.welcomeBanner}>
                <View style={[st.welcomeIcon, { backgroundColor: PURPLE }]}>
                    <Ionicons name="library" size={24} color="#FFFFFF" />
                </View>
                <View style={st.welcomeContent}>
                    <Text style={[st.welcomeTitle, { color: '#5B21B6' }]}>Know Your Blood 🧬</Text>
                    <Text style={[st.welcomeText, { color: PURPLE }]}>
                        Understanding blood types helps you make informed decisions during emergencies.
                    </Text>
                </View>
            </LinearGradient>

            {/* Universal Donors/Recipients */}
            <View style={st.universalRow}>
                <LinearGradient colors={['#DC2626', '#B91C1C']} style={st.universalCard}>
                    <Ionicons name="water" size={28} color="#FFFFFF" />
                    <Text style={st.universalType}>O-</Text>
                    <Text style={st.universalLabel}>Universal Donor</Text>
                    <Text style={st.universalNote}>Can give to ALL blood types</Text>
                </LinearGradient>
                <LinearGradient colors={[B_SKY, B_LIGHT]} style={st.universalCard}>
                    <Ionicons name="person" size={28} color="#FFFFFF" />
                    <Text style={st.universalType}>AB+</Text>
                    <Text style={st.universalLabel}>Universal Recipient</Text>
                    <Text style={st.universalNote}>Can receive from ALL types</Text>
                </LinearGradient>
            </View>

            {/* Compatibility Chart */}
            <View style={st.sectionHeader}>
                <Ionicons name="water" size={20} color={accentColor} />
                <Text style={[st.sectionTitle, { color: colors.text }]}>Compatibility Chart</Text>
            </View>
            <CompatibilityChart colors={colors} isDark={isDark} />

            {/* Blood Type Facts */}
            <View style={st.sectionHeader}>
                <Ionicons name="bulb" size={20} color={accentColor} />
                <Text style={[st.sectionTitle, { color: colors.text }]}>Blood Type Facts</Text>
            </View>
            {[
                { icon: 'flask' as const, color: '#DC2626', bg: '#FEE2E2', fact: 'Blood makes up about 7–8% of your total body weight.' },
                { icon: 'timer' as const, color: '#D97706', bg: '#FEF3C7', fact: 'Red blood cells live for about 120 days before being replaced.' },
                { icon: 'globe' as const, color: B_SKY, bg: '#DBEAFE', fact: 'O+ is the most common blood type globally, found in ~38% of people.' },
                { icon: 'star' as const, color: PURPLE, bg: '#F5F3FF', fact: 'AB- is the rarest blood type, found in less than 1% of the population.' },
                { icon: 'leaf' as const, color: '#16A34A', bg: '#F0FDF4', fact: 'Platelets must be used within 5–7 days of donation — they cannot be stored long.' },
                { icon: 'time' as const, color: '#0284C7', bg: '#E0F2FE', fact: 'Your body replaces donated plasma within 24 hours, but red cells take 4–6 weeks.' },
            ].map((f, i) => (
                <View key={i} style={[st.factCard, { backgroundColor: colors.surface, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <View style={[st.factIcon, { backgroundColor: f.bg }]}>
                        <Ionicons name={f.icon} size={20} color={f.color} />
                    </View>
                    <Text style={[st.factText, { color: colors.textSecondary }]}>{f.fact}</Text>
                </View>
            ))}

            {/* Donation Types */}
            <View style={st.sectionHeader}>
                <Ionicons name="flask" size={20} color={accentColor} />
                <Text style={[st.sectionTitle, { color: colors.text }]}>Types of Donation</Text>
            </View>
            {[
                { type: 'Whole Blood', wait: `${KENYA_STATS.shelfLifeDays} days`, icon: 'water' as const, color: '#DC2626', desc: 'The most common donation. Separated into components after collection.' },
                { type: 'Platelets', wait: `${KENYA_STATS.plateletShelfLifeDays} days`, icon: 'ellipse' as const, color: '#D97706', desc: 'Critical for cancer patients and those undergoing surgery.' },
                { type: 'Plasma', wait: '1 year frozen', icon: 'beaker' as const, color: B_SKY, desc: 'Used for burn victims, trauma patients, and clotting disorders.' },
                { type: 'Double Red Cells', wait: `${KENYA_STATS.maleWaitMonths * 4} weeks`, icon: 'heart' as const, color: '#B91C1C', desc: 'Gives twice the red cells in one visit — higher eligibility requirements.' },
            ].map((d, i) => (
                <View key={i} style={[st.donationCard, { backgroundColor: colors.surface, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <View style={[st.donationIcon, { backgroundColor: d.color + '15' }]}>
                        <Ionicons name={d.icon} size={24} color={d.color} />
                    </View>
                    <View style={st.donationInfo}>
                        <View style={st.donationHeader}>
                            <Text style={[st.donationTitle, { color: colors.text }]}>{d.type}</Text>
                            <View style={[st.waitBadge, { backgroundColor: d.color + '15' }]}>
                                <Text style={[st.waitText, { color: d.color }]}>Shelf Life: {d.wait}</Text>
                            </View>
                        </View>
                        <Text style={[st.donationDesc, { color: colors.textSecondary }]}>{d.desc}</Text>
                    </View>
                </View>
            ))}
        </>
    );

    return (
        <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={B_SKY} />

            {/* Header with Gradient */}
            <LinearGradient
                colors={activeTabConfig.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.header}
            >
                <View style={st.headerDecoration} />
                <View style={st.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={st.backButton} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={st.headerText}>
                        <Text style={st.headerTitle}>Blood Guide</Text>
                        <Text style={st.headerSubtitle}>
                            {user?.userType === 'donor'
                                ? `Welcome back, ${user?.firstName ?? 'Donor'}!`
                                : user?.userType === 'requester'
                                    ? `Stay informed, ${user?.firstName ?? 'User'}`
                                    : 'Everything you need to know'}
                        </Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                {/* User Type Pill */}
                <View style={st.userTypePill}>
                    <Ionicons
                        name={user?.userType === 'donor' ? 'heart' : 'medkit'}
                        size={14}
                        color="#FFFFFF"
                    />
                    <Text style={st.userTypeText}>
                        {user?.userType === 'donor' ? 'Donor Mode' : user?.userType === 'requester' ? 'Recipient Mode' : 'Guest Mode'}
                        {user?.bloodType ? ` · ${user.bloodType}` : ''}
                    </Text>
                </View>
            </LinearGradient>

            {/* Tabs */}
            <View style={[st.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
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
                                size={20}
                                color={isActive ? tab.color : colors.textMuted ?? '#94A3B8'}
                            />
                            <Text style={[
                                st.tabText,
                                { color: isActive ? tab.color : colors.textSecondary },
                                isActive && st.tabTextActive,
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={st.content}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'donor' && renderDonorContent()}
                {activeTab === 'recipient' && renderRecipientContent()}
                {activeTab === 'learn' && renderLearnContent()}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    container: {
        flex: 1,
    },

    // Header
    header: {
        position: 'relative',
        overflow: 'hidden',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 8 : 12,
        paddingBottom: 24,
    },
    headerDecoration: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.05)',
        top: -80,
        right: -60,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 4,
    },
    userTypePill: {
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 30,
    },
    userTypeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    // Tabs
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        ...Platform.select({
            web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } as any,
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 2,
            },
        }),
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
        flexDirection: 'row',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    tabTextActive: {
        fontWeight: '800',
    },

    // Content
    content: {
        padding: 20,
    },

    // Welcome Banner
    welcomeBanner: {
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 18,
        marginBottom: 24,
        ...Platform.select({
            web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } as any,
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
            },
        }),
    },
    welcomeIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeContent: {
        flex: 1,
    },
    welcomeTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
    },
    welcomeText: {
        fontSize: 13,
        lineHeight: 20,
    },

    // Stats Card
    statsCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        marginBottom: 16,
    },
    statsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        textAlign: 'center',
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        textAlign: 'center',
    },
    statsNote: {
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
    },

    // Eligibility Card
    eligibilityCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        marginBottom: 16,
    },
    eligibilityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    eligibilityTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    eligibilityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    eligibilityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '48%',
    },
    eligibilityText: {
        fontSize: 13,
    },

    // Shelf Life Card
    shelfLifeCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        marginBottom: 16,
    },
    shelfLifeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    shelfLifeTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    shelfLifeGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    shelfLifeItem: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    shelfLifeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    shelfLifeBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    shelfLifeDays: {
        fontSize: 24,
        fontWeight: '800',
    },
    shelfLifeNote: {
        fontSize: 11,
        textAlign: 'center',
    },
    shelfLifeWarning: {
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },

    // Urgency Card
    urgencyCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        marginBottom: 24,
    },
    urgencyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    urgencyTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    urgencyList: {
        gap: 16,
    },
    urgencyItem: {
        flexDirection: 'row',
        gap: 12,
    },
    urgencyDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginTop: 3,
    },
    urgencyContent: {
        flex: 1,
    },
    urgencyLevel: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    urgencyDesc: {
        fontSize: 12,
        lineHeight: 18,
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },

    // Tips Grid
    tipsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    tipCard: {
        width: (SCREEN_WIDTH - 52) / 2,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        gap: 12,
    },
    tipIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tipText: {
        fontSize: 13,
        lineHeight: 19,
    },

    // Callout Card
    calloutCard: {
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 16,
        marginBottom: 24,
    },
    calloutText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 20,
    },

    // Accordion
    accordionContainer: {
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        overflow: 'hidden',
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    accordionIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    accordionTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },
    accordionContent: {
        overflow: 'hidden',
    },
    accordionBody: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    block: {
        marginBottom: 16,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        marginTop: 4,
    },
    subtitleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    pointRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        gap: 10,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 7,
    },
    pointText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 20,
    },

    // Emergency Card
    emergencyCard: {
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 16,
        marginTop: 8,
        marginBottom: 16,
    },
    emergencyText: {
        flex: 1,
        fontSize: 13,
        color: '#FFFFFF',
        lineHeight: 20,
    },

    // Universal Cards
    universalRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    universalCard: {
        flex: 1,
        borderRadius: 20,
        alignItems: 'center',
        gap: 8,
        padding: 20,
    },
    universalType: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    universalLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    universalNote: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        marginTop: 4,
    },

    // Chart Card
    chartCard: {
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 24,
        overflow: 'hidden',
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    chartTable: {
        padding: 12,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        marginBottom: 8,
    },
    tableHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
    },
    typeBadge: {
        flex: 1,
        borderRadius: 8,
        alignItems: 'center',
        paddingVertical: 6,
        marginRight: 8,
    },
    typeText: {
        fontSize: 13,
        fontWeight: '800',
    },
    tableCell: {
        fontSize: 12,
        lineHeight: 18,
    },

    // Fact Card
    factCard: {
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        padding: 14,
        marginBottom: 10,
    },
    factIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    factText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 20,
    },

    // Donation Card
    donationCard: {
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        padding: 16,
        marginBottom: 12,
    },
    donationIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    donationInfo: {
        flex: 1,
    },
    donationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 6,
        flexWrap: 'wrap',
    },
    donationTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    waitBadge: {
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    waitText: {
        fontSize: 11,
        fontWeight: '700',
    },
    donationDesc: {
        fontSize: 13,
        lineHeight: 19,
    },
});