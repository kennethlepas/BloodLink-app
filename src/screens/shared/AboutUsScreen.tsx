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

const AboutUsScreen: React.FC = () => {
    const router = useRouter();
    const { colors, isDark } = useAppTheme();

    const handleContactSupport = () => {
        Linking.openURL('mailto:support@bloodlink.com');
    };

    const handleVisitWebsite = () => {
        Linking.openURL('https://bloodlink.com');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor="#0A2647" />

            {/* Header */}
            <LinearGradient
                colors={['#0A2647', '#144272', '#2C74B3']}
                style={styles.header}
                locations={[0, 0.5, 1]}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>About Us</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    {/* Logo */}
                    <View style={styles.logoSection}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('@/assets/images/logo.jpg')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={[styles.appName, { color: colors.text }]}>BloodLink</Text>
                        <Text style={[styles.version, { color: colors.textSecondary }]}>Version 1.0.0</Text>
                    </View>

                    {/* Mission */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Our Mission</Text>
                        <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
                            BloodLink is dedicated to bridging the gap between blood donors and patients in need. We believe that every drop counts and that technology can save lives by making blood donation more accessible, efficient, and community-driven.
                        </Text>
                    </View>

                    {/* Features */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Why BloodLink?</Text>

                        <View style={styles.featuresGrid}>
                            <View style={styles.featureCard}>
                                <View style={[styles.featureIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
                                    <Ionicons name="flash" size={20} color={colors.success} />
                                </View>
                                <Text style={[styles.featureTitle, { color: colors.text }]}>Real-time Requests</Text>
                                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Connect instantly with nearby donors when time matters most.</Text>
                            </View>

                            <View style={styles.featureCard}>
                                <View style={[styles.featureIcon, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE' }]}>
                                    <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                                </View>
                                <Text style={[styles.featureTitle, { color: colors.text }]}>Verified Community</Text>
                                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Safe and secure environment for all donors and requesters.</Text>
                            </View>

                            <View style={styles.featureCard}>
                                <View style={[styles.featureIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]}>
                                    <Ionicons name="location" size={20} color={colors.danger} />
                                </View>
                                <Text style={[styles.featureTitle, { color: colors.text }]}>Location Based</Text>
                                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Find help right where you are, using advanced geolocation.</Text>
                            </View>

                            <View style={styles.featureCard}>
                                <View style={[styles.featureIcon, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' }]}>
                                    <Ionicons name="heart" size={20} color={colors.warning} />
                                </View>
                                <Text style={[styles.featureTitle, { color: colors.text }]}>Save Lives</Text>
                                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Every donation makes a difference in someone's life.</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Contact Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                        onPress={handleVisitWebsite}
                    >
                        <Ionicons name="globe-outline" size={22} color={colors.primary} />
                        <Text style={[styles.actionButtonText, { color: colors.text }]}>Visit Website</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                        onPress={handleContactSupport}
                    >
                        <Ionicons name="mail-outline" size={22} color={colors.primary} />
                        <Text style={[styles.actionButtonText, { color: colors.text }]}>Contact Support</Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.copyright, { color: colors.textMuted }]}>
                    © 2026 BloodLink Inc. All rights reserved.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 10,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 24,
        ...Platform.select({
            web: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' } as any,
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
            },
        }),
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: '#fff',
        marginBottom: 16,
        overflow: 'hidden',
    },
    logo: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    appName: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
    },
    version: {
        fontSize: 14,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    sectionText: {
        fontSize: 15,
        lineHeight: 24,
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
    },
    featureCard: {
        width: '48%',
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: 12,
        padding: 12,
        minHeight: 120,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 16,
    },
    featureIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureTextCtx: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    featureDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    actions: {
        gap: 12,
        marginBottom: 32,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    copyright: {
        textAlign: 'center',
        fontSize: 12,
    },
});

export default AboutUsScreen;
