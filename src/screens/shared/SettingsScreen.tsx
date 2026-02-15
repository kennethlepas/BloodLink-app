import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { updateUser } from '@/src/services/firebase/database';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
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

// ─── Types ───────────────────────────────────────────────────────────────────
type SettingsItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  isLast?: boolean;
  colors: any; // Theme colors passed down
};

// ─── Reusable Settings Row ───────────────────────────────────────────────────
const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  iconBg,
  iconColor,
  label,
  subtitle,
  rightElement,
  onPress,
  danger,
  isLast,
  colors,
}) => (
  <TouchableOpacity
    style={[
      styles.settingsItem,
      { borderBottomColor: colors.divider },
      isLast && { borderBottomWidth: 0 },
    ]}
    onPress={onPress}
    activeOpacity={onPress ? 0.65 : 1}
    disabled={!onPress && !rightElement}
  >
    <View style={[styles.settingsIconWrap, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <View style={styles.settingsTextWrap}>
      <Text style={[styles.settingsLabel, { color: colors.text }, danger && { color: '#DC2626' }]}>
        {label}
      </Text>
      {subtitle && (
        <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
    {rightElement ?? (
      onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ) : null
    )}
  </TouchableOpacity>
);

// ─── Section heading ─────────────────────────────────────────────────────────
const SectionHeading: React.FC<{
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  textColor: string;
}> = ({ title, icon, color, textColor }) => (
  <View style={styles.sectionHeading}>
    <View style={[styles.sectionBar, { backgroundColor: color }]} />
    <Ionicons name={icon} size={16} color={color} style={{ marginRight: 6 }} />
    <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
  </View>
);

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateUserData, logout } = useUser();
  const { isDark, colors, toggleDarkMode } = useAppTheme();

  const isDonor = user?.userType === 'donor';

  // ── Toggle states ────────────────────────────────────────────────────────
  const [pushNotifs, setPushNotifs] = useState(true);
  const [requestAlerts, setRequestAlerts] = useState(true);
  const [messageNotifs, setMessageNotifs] = useState(true);
  const [profileVisible, setProfileVisible] = useState(user?.isAvailable ?? true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggleProfileVisibility = async (value: boolean) => {
    if (!user?.id) return;
    try {
      setSaving(true);
      setProfileVisible(value);
      await updateUser(user.id, { isAvailable: value });
      await updateUserData({ isAvailable: value });
    } catch {
      setProfileVisible(!value);
      Alert.alert('Error', 'Failed to update profile visibility.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/login' as any);
          } catch (e) {
            console.error('Logout error:', e);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your data will be permanently deleted. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => Alert.alert('Coming Soon', 'Account deletion will be available in a future update.'),
        },
      ]
    );
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open the link.'));
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={B_SKY} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading settings…</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSub}>Manage your preferences</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>

        {/* mini profile badge */}
        <View style={styles.profileBadge}>
          <View style={styles.profileBadgeAvatar}>
            <Text style={styles.profileBadgeInitial}>
              {user.firstName?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileBadgeName} numberOfLines={1}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.profileBadgeRole}>
              {isDonor ? '💉 Donor' : '🔎 Requester'} · {user.bloodType}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() =>
              router.push(isDonor ? '/(donor)/edit-profile' as any : '/(requester)/edit-profile' as any)
            }
            activeOpacity={0.75}
          >
            <Ionicons name="create-outline" size={15} color={B_SKY} />
            <Text style={styles.editProfileBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════════
            ACCOUNT & PROFILE
            ══════════════════════════════════════ */}
        <SectionHeading
          title="Account & Profile"
          icon="person-circle-outline"
          color={B_SKY}
          textColor={colors.text}
        />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <SettingsItem
            icon="person-outline"
            iconBg={isDark ? '#1e3a8a' : B_PALE}
            iconColor={B_SKY}
            label="Edit Profile"
            subtitle="Name, photo, contact info"
            onPress={() =>
              router.push(isDonor ? '/(donor)/edit-profile' as any : '/(requester)/edit-profile' as any)
            }
            colors={colors}
          />
          <SettingsItem
            icon="lock-closed-outline"
            iconBg={isDark ? '#78350f' : '#FEF3C7'}
            iconColor="#D97706"
            label="Change Password"
            subtitle="Update your account password"
            onPress={() => router.push('/(shared)/change-password' as any)}
            colors={colors}
          />
          <SettingsItem
            icon="water"
            iconBg={isDark ? '#7c2d12' : O_PALE}
            iconColor={O_MID}
            label="Blood Type"
            subtitle={user.bloodType}
            isLast
            colors={colors}
          />
        </View>

        {/* ══════════════════════════════════════
            NOTIFICATIONS
            ══════════════════════════════════════ */}
        <SectionHeading
          title="Notifications"
          icon="notifications-outline"
          color={O_MID}
          textColor={colors.text}
        />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <SettingsItem
            icon="notifications"
            iconBg={isDark ? '#7c2d12' : O_PALE}
            iconColor={O_MID}
            label="Push Notifications"
            subtitle="Receive alerts on your device"
            rightElement={
              <Switch
                value={pushNotifs}
                onValueChange={setPushNotifs}
                trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                thumbColor="#FFFFFF"
                style={styles.switchStyle}
              />
            }
            colors={colors}
          />
          <SettingsItem
            icon="alert-circle"
            iconBg={isDark ? '#7f1d1d' : '#FEE2E2'}
            iconColor="#DC2626"
            label="Blood Request Alerts"
            subtitle={isDonor ? 'When someone needs your blood type' : 'Updates on your requests'}
            rightElement={
              <Switch
                value={requestAlerts}
                onValueChange={setRequestAlerts}
                trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                thumbColor="#FFFFFF"
                style={styles.switchStyle}
              />
            }
            colors={colors}
          />
          <SettingsItem
            icon="chatbubble"
            iconBg={isDark ? '#0c4a6e' : '#E0F2FE'}
            iconColor="#0284C7"
            label="Message Notifications"
            subtitle="New message alerts"
            rightElement={
              <Switch
                value={messageNotifs}
                onValueChange={setMessageNotifs}
                trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                thumbColor="#FFFFFF"
                style={styles.switchStyle}
              />
            }
            isLast
            colors={colors}
          />
        </View>

        {/* ══════════════════════════════════════
            PRIVACY & SECURITY
            ══════════════════════════════════════ */}
        <SectionHeading
          title="Privacy & Security"
          icon="shield-checkmark-outline"
          color="#8B5CF6"
          textColor={colors.text}
        />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <SettingsItem
            icon="eye-outline"
            iconBg={isDark ? '#4c1d95' : '#F5F3FF'}
            iconColor="#8B5CF6"
            label="Profile Visibility"
            subtitle={profileVisible ? 'Visible to others' : 'Hidden from searches'}
            rightElement={
              saving ? (
                <ActivityIndicator size="small" color={B_SKY} />
              ) : (
                <Switch
                  value={profileVisible}
                  onValueChange={handleToggleProfileVisibility}
                  trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                  style={styles.switchStyle}
                />
              )
            }
            colors={colors}
          />
          <SettingsItem
            icon="location-outline"
            iconBg={isDark ? '#14532d' : '#F0FDF4'}
            iconColor="#16A34A"
            label="Location Sharing"
            subtitle="Allow nearby donor/requester discovery"
            rightElement={
              <Switch
                value={locationSharing}
                onValueChange={setLocationSharing}
                trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                thumbColor="#FFFFFF"
                style={styles.switchStyle}
              />
            }
            colors={colors}
          />
          <SettingsItem
            icon="document-text-outline"
            iconBg={isDark ? '#4c1d95' : '#F5F3FF'}
            iconColor="#8B5CF6"
            label="Data & Privacy"
            subtitle="Learn how we handle your data"
            onPress={() => router.push('/(auth)/privacy-policy' as any)}
            isLast
            colors={colors}
          />
        </View>

        {/* ══════════════════════════════════════
            APP PREFERENCES
            ══════════════════════════════════════ */}
        <SectionHeading
          title="App Preferences"
          icon="color-palette-outline"
          color="#0EA5E9"
          textColor={colors.text}
        />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <SettingsItem
            icon={isDark ? 'moon' : 'moon-outline'}
            iconBg={isDark ? '#0c4a6e' : '#F0F9FF'}
            iconColor="#0EA5E9"
            label="Dark Mode"
            subtitle="Reduce eye strain in low light"
            rightElement={
              <Switch
                value={isDark}
                onValueChange={toggleDarkMode}
                trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                thumbColor="#FFFFFF"
                style={styles.switchStyle}
              />
            }
            colors={colors}
          />
          <SettingsItem
            icon="language-outline"
            iconBg={isDark ? '#0c4a6e' : '#E0F2FE'}
            iconColor="#0284C7"
            label="Language"
            subtitle="English"
            onPress={() => Alert.alert('Coming Soon', 'Multi-language support is on the roadmap.')}
            isLast
            colors={colors}
          />
        </View>

        {/* ══════════════════════════════════════
            ABOUT & SUPPORT
            ══════════════════════════════════════ */}
        <SectionHeading
          title="About & Support"
          icon="information-circle-outline"
          color="#10B981"
          textColor={colors.text}
        />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <SettingsItem
            icon="star-outline"
            iconBg={isDark ? '#78350f' : '#FEF3C7'}
            iconColor="#D97706"
            label="Rate BloodLink"
            subtitle="Love the app? Let us know!"
            onPress={() => router.push('/(shared)/rate-app' as any)}
            colors={colors}
          />
          <SettingsItem
            icon="document-outline"
            iconBg={isDark ? '#14532d' : '#F0FDF4'}
            iconColor="#16A34A"
            label="Terms & Conditions"
            onPress={() => router.push('/(auth)/terms-and-conditions' as any)}
            colors={colors}
          />
          <SettingsItem
            icon="shield-outline"
            iconBg={isDark ? '#4c1d95' : '#F5F3FF'}
            iconColor="#8B5CF6"
            label="Privacy Policy"
            onPress={() => router.push('/(auth)/privacy-policy' as any)}
            colors={colors}
          />
          <SettingsItem
            icon="help-circle-outline"
            iconBg={isDark ? '#0c4a6e' : '#E0F2FE'}
            iconColor="#0284C7"
            label="Help & Support"
            subtitle="Get assistance or report an issue"
            onPress={() => router.push('/(shared)/help-support' as any)}
            colors={colors}
          />
          <SettingsItem
            icon="logo-github"
            iconBg={isDark ? '#1e293b' : '#F1F5F9'}
            iconColor={isDark ? '#94a3b8' : '#334155'}
            label="App Version"
            subtitle="BloodLink v2.1.0"
            isLast
            colors={colors}
          />
        </View>

        {/* ══════════════════════════════════════
            DANGER ZONE
            ══════════════════════════════════════ */}
        <SectionHeading
          title="Danger Zone"
          icon="warning-outline"
          color="#DC2626"
          textColor={colors.text}
        />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: isDark ? colors.dangerBorder : '#FECACA' },
          ]}
        >
          <SettingsItem
            icon="trash-outline"
            iconBg={isDark ? '#7f1d1d' : '#FEE2E2'}
            iconColor="#DC2626"
            label="Delete Account"
            subtitle="Permanently remove your data"
            onPress={handleDeleteAccount}
            danger
            colors={colors}
          />
          <SettingsItem
            icon="log-out-outline"
            iconBg={isDark ? '#7f1d1d' : '#FEE2E2'}
            iconColor="#DC2626"
            label="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            danger
            isLast
            colors={colors}
          />
        </View>

        {/* Bottom spacer  */}
        <View style={styles.footer}>
          <View style={styles.footerDot} />
          <Text style={styles.footerText}>BloodLink · Made with ❤️ in Kenya 🇰🇪</Text>
          <View style={styles.footerDot} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 30 },

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

  // PROFILE BADGE
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  profileBadgeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  profileBadgeInitial: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  profileBadgeName: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  profileBadgeRole: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginTop: 1,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  editProfileBtnText: { fontSize: 12, fontWeight: '700', color: B_SKY },

  // SECTIONS
  sectionHeading: {
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
    borderWidth: 1,
    overflow: 'hidden',
    ...shadow(B_SKY, 0.07, 8, 2),
  },

  // SETTINGS ITEM
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  settingsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsTextWrap: { flex: 1 },
  settingsLabel: { fontSize: 14, fontWeight: '700' },
  settingsSubtitle: { fontSize: 12, marginTop: 2, fontWeight: '500' },

  switchStyle: { transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] },

  // FOOTER
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  footerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: O_MID },
  footerText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
});
