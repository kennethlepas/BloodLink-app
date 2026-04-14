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

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoutModal } from '@/src/components/LogoutModal';
import { useAppTheme, type ThemeColors } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { updateUser } from '@/src/services/firebase/database';
import { getDonorEligibilityStatus } from '@/src/services/firebase/donationEligibilityService';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Cross-platform shadow helper.
 * On web it emits a CSS box-shadow; on native it uses the standard shadow props.
 */
function makeShadow(
  color = '#000',
  opacity = 0.08,
  radius = 10,
  elevation = 3,
) {
  return Platform.select({
    web: { boxShadow: `0 2px ${radius}px rgba(0,0,0,${opacity})` } as any,
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  });
}


interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  isLast?: boolean;
  colors: ThemeColors;
  styles: ReturnType<typeof buildStyles>;
}

interface SectionHeadingProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  textColor: string;
  styles: ReturnType<typeof buildStyles>;
}


/** A single row in a settings card. */
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
  styles,
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
    {/* Left icon */}
    <View style={[styles.settingsIconWrap, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>

    {/* Label + optional subtitle */}
    <View style={styles.settingsTextWrap}>
      <Text
        style={[
          styles.settingsLabel,
          { color: colors.text },
          danger && { color: colors.danger },
        ]}
      >
        {label}
      </Text>
      {subtitle ? (
        <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>

    {/* Right element: custom node, or a chevron if the row is tappable */}
    {rightElement ?? (onPress ? (
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    ) : null)}
  </TouchableOpacity>
);

const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  icon,
  color,
  textColor,
  styles,
}) => (
  <View style={styles.sectionHeading}>
    <View style={[styles.sectionBar, { backgroundColor: color }]} />
    <Ionicons name={icon} size={16} color={color} style={{ marginRight: 6 }} />
    <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
  </View>
);


function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: {
      fontSize: 15,
      marginTop: 8,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 40,
    },


    header: {
      paddingTop: 12,
      paddingBottom: 20,
      paddingHorizontal: 16,
      overflow: 'hidden',
    },

    hCircle1: { width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)', position: 'absolute', top: -60, right: -40 },
    hCircle2: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)', position: 'absolute', bottom: -30, left: 20 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    headerSub: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 2,
    },

    profileBadge: { borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
    profileBadgeAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
    profileBadgeInitial: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    profileBadgeName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    profileBadgeRole: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
    },
    editProfileBtn: { borderRadius: 20, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6 },
    editProfileBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },

    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 10,
      paddingHorizontal: 2,
    },
    sectionBar: { width: 3, height: 16, borderRadius: 2, marginRight: 8 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },

    card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', ...makeShadow('#000', 0.06, 8, 2) },


    settingsItem: { borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
    settingsIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    settingsTextWrap: {
      flex: 1,
    },
    settingsLabel: {
      fontSize: 15,
      fontWeight: '500',
    },
    settingsSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },

    switchStyle: {
      transform: [{ scaleX: 0.88 }, { scaleY: 0.88 }],
    },


    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 32,
      gap: 8,
    },
    footerDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.divider,
    },
    footerText: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}


export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateUserData, logout, deleteAccount } = useUser();
  const { themeMode, isDark, colors, setThemeMode } = useAppTheme();

  const isDonor = user?.userType === 'donor';

  //Local state 
  const [pushNotifs, setPushNotifs] = useState(true);
  const [requestAlerts, setRequestAlerts] = useState(true);
  const [messageNotifs, setMessageNotifs] = useState(true);
  const [profileVisible, setProfileVisible] = useState(user?.isAvailable ?? true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [eligibility, setEligibility] = useState(getDonorEligibilityStatus(user?.lastDonationDate));

  // Build styles once per theme change (not on every render)
  const styles = buildStyles(colors);

  //Route helpers
  const editProfileRoute = isDonor
    ? '/(donor)/edit-profile'
    : '/(requester)/edit-profile';

  const handleToggleProfileVisibility = async (value: boolean) => {
    if (!user?.id) return;

    // 56-day rule enforcement
    if (value && user.lastDonationDate) {
      const status = getDonorEligibilityStatus(user.lastDonationDate);
      if (!status.isEligible) {
        Alert.alert(
          'Not Eligible Yet',
          status.message,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    try {
      setSaving(true);
      setProfileVisible(value);
      await updateUser(user.id, { isAvailable: value });
      await updateUserData({ isAvailable: value });
      setEligibility(getDonorEligibilityStatus(user.lastDonationDate));
    } catch {
      setProfileVisible(!value);
      Alert.alert('Error', 'Failed to update availability.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => setShowLogoutModal(true);

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace('/(auth)/login' as any);
    } catch (e) {
      console.log('Logout error:', e);
      Alert.alert('Error', 'Failed to logout');
      setIsLoggingOut(false);
    }
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
          onPress: async () => {
            try {
              setSaving(true);
              await deleteAccount();
              router.replace('/(auth)/login' as any);
            } catch (e) {
              console.log('Delete account error:', e);
              // Error alerts are handled in the context
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };


  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading settings…
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.primary} />

      {/* Gradient header  */}
      <LinearGradient
        colors={[colors.primary, '#60A5FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Decorative circles */}
        <View style={styles.hCircle1} />
        <View style={styles.hCircle2} />

        {/* Back button + centred title */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSub}>Manage your preferences</Text>
          </View>

          {/* Invisible spacer keeps the title visually centred */}
          <View style={{ width: 42 }} />
        </View>

        {/* Mini profile badge */}
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
            onPress={() => router.push(editProfileRoute as any)}
            activeOpacity={0.75}
          >
            <Ionicons name="create-outline" size={15} color={colors.primary} />
            <Text style={styles.editProfileBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Scrollable settings body  */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Account & Profile  */}
        <SectionHeading
          title="Account & Profile"
          icon="person-circle-outline"
          color={colors.primary}
          textColor={colors.text}
          styles={styles}
        />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <SettingsItem
            icon="person-outline"
            iconBg={isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE'}
            iconColor={colors.primary}
            label="Edit Profile"
            subtitle="Name, photo, contact info"
            onPress={() => router.push(editProfileRoute as any)}
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="lock-closed-outline"
            iconBg={isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7'}
            iconColor="#D97706"
            label="Change Password"
            subtitle="Update your account password"
            onPress={() => router.push('/(shared)/change-password' as any)}
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="water"
            iconBg={isDark ? 'rgba(234, 88, 12, 0.15)' : '#FFF7ED'}
            iconColor="#EA580C"
            label="Blood Type"
            subtitle={user.bloodType}
            isLast
            colors={colors}
            styles={styles}
          />
        </View>

        {/* Donation Status - ONLY FOR DONORS */}
        {isDonor && (
          <>
            <SectionHeading
              title="Donation Status"
              icon="heart-outline"
              color={colors.success}
              textColor={colors.text}
              styles={styles}
            />
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <SettingsItem
                icon="calendar-outline"
                iconBg={isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5'}
                iconColor={colors.success}
                label="Available for Donation"
                subtitle={eligibility.message}
                rightElement={
                  <Switch
                    value={profileVisible}
                    onValueChange={handleToggleProfileVisibility}
                    trackColor={{ false: colors.divider, true: colors.success }}
                    thumbColor="#FFFFFF"
                    style={styles.switchStyle}
                    disabled={saving}
                  />
                }
                colors={colors}
                styles={styles}
              />
              <SettingsItem
                icon="time-outline"
                iconBg={isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE'}
                iconColor={colors.primary}
                label="Last Donation"
                subtitle={user.lastDonationDate ? new Date(user.lastDonationDate).toLocaleDateString() : 'No record'}
                isLast
                colors={colors}
                styles={styles}
              />
            </View>
          </>
        )}

        {/* Notifications */}
        <SectionHeading
          title="Notifications"
          icon="notifications-outline"
          color="#EA580C"
          textColor={colors.text}
          styles={styles}
        />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <SettingsItem
            icon="notifications"
            iconBg={isDark ? 'rgba(234, 88, 12, 0.15)' : '#FFF7ED'}
            iconColor="#EA580C"
            label="Push Notifications"
            subtitle="Receive alerts on your device"
            rightElement={
              <Switch
                value={pushNotifs}
                onValueChange={setPushNotifs}
                trackColor={{ false: colors.divider, true: colors.success }}
                thumbColor="#FFFFFF"
                style={styles.switchStyle}
              />
            }
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="alert-circle"
            iconBg={isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2'}
            iconColor={colors.danger}
            label="Blood Request Alerts"
            subtitle={isDonor ? 'When someone needs your blood type' : 'Updates on your requests'}
            rightElement={
              <Switch
                value={requestAlerts}
                onValueChange={setRequestAlerts}
                trackColor={{ false: colors.divider, true: colors.success }}
                thumbColor="#FFFFFF"
                style={styles.switchStyle}
              />
            }
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="chatbubble"
            iconBg={isDark ? 'rgba(2, 132, 199, 0.15)' : '#E0F2FE'}
            iconColor="#0284C7"
            label="Message Notifications"
            subtitle="New message alerts"
            rightElement={
              <Switch
                value={messageNotifs}
                onValueChange={setMessageNotifs}
                trackColor={{ false: colors.divider, true: colors.success }}
                thumbColor="#FFFFFF"
                style={styles.switchStyle}
              />
            }
            isLast
            colors={colors}
            styles={styles}
          />
        </View>

        {/* Privacy & Security */}
        <SectionHeading
          title="Privacy & Security"
          icon="shield-checkmark-outline"
          color="#8B5CF6"
          textColor={colors.text}
          styles={styles}
        />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <SettingsItem
            icon="location-outline"
            iconBg={isDark ? 'rgba(22, 163, 74, 0.15)' : '#F0FDF4'}
            iconColor="#16A34A"
            label="Location Sharing"
            subtitle="Allow nearby donor/requester discovery"
            rightElement={
              <Switch
                value={locationSharing}
                onValueChange={setLocationSharing}
                trackColor={{ false: colors.divider, true: colors.success }}
                thumbColor="#FFFFFF"
                style={styles.switchStyle}
              />
            }
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="document-text-outline"
            iconBg={isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF'}
            iconColor="#8B5CF6"
            label="Data & Privacy"
            subtitle="Learn how we handle your data"
            onPress={() => router.push('/(shared)/privacy-policy' as any)}
            isLast
            colors={colors}
            styles={styles}
          />
        </View>

        {/*App Preferences */}
        <SectionHeading
          title="App Preferences"
          icon="color-palette-outline"
          color="#0EA5E9"
          textColor={colors.text}
          styles={styles}
        />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <SettingsItem
            icon="sunny-outline"
            iconBg={themeMode === 'light' ? 'rgba(59, 130, 246, 0.1)' : colors.surfaceAlt}
            iconColor={colors.primary}
            label="Light Mode"
            onPress={() => setThemeMode('light')}
            rightElement={
              themeMode === 'light'
                ? <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                : undefined
            }
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="moon-outline"
            iconBg={themeMode === 'dark' ? 'rgba(14, 165, 233, 0.1)' : colors.surfaceAlt}
            iconColor="#0EA5E9"
            label="Dark Mode"
            onPress={() => setThemeMode('dark')}
            rightElement={
              themeMode === 'dark'
                ? <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                : undefined
            }
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="settings-outline"
            iconBg={themeMode === 'system' ? 'rgba(100, 116, 139, 0.1)' : colors.surfaceAlt}
            iconColor="#64748B"
            label="System Default"
            subtitle="Sync with device settings"
            onPress={() => setThemeMode('system')}
            rightElement={
              themeMode === 'system'
                ? <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                : undefined
            }
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="language-outline"
            iconBg={isDark ? 'rgba(2, 132, 199, 0.15)' : '#E0F2FE'}
            iconColor="#0284C7"
            label="Language"
            subtitle="English"
            onPress={() => Alert.alert('Coming Soon', 'Multi-language support is on the roadmap.')}
            isLast
            colors={colors}
            styles={styles}
          />
        </View>

        {/* About & Support  */}
        <SectionHeading
          title="About & Support"
          icon="information-circle-outline"
          color="#10B981"
          textColor={colors.text}
          styles={styles}
        />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <SettingsItem
            icon={user?.hasReviewed ? "star" : "star-outline"}
            iconBg={isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7'}
            iconColor="#D97706"
            label={user?.hasReviewed ? "Your Feedback" : "Rate BloodLink"}
            subtitle={user?.hasReviewed ? "Thank you for rating us!" : "Love the app? Let us know!"}
            onPress={() => router.push('/(shared)/rate-app' as any)}
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="document-outline"
            iconBg={isDark ? 'rgba(22, 163, 74, 0.15)' : '#F0FDF4'}
            iconColor="#16A34A"
            label="Terms & Conditions"
            onPress={() => router.push('/(shared)/terms-and-conditions' as any)}
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="shield-outline"
            iconBg={isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF'}
            iconColor="#8B5CF6"
            label="Privacy Policy"
            onPress={() => router.push('/(shared)/privacy-policy' as any)}
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="help-circle-outline"
            iconBg={isDark ? 'rgba(2, 132, 199, 0.15)' : '#E0F2FE'}
            iconColor="#0284C7"
            label="Help & Support"
            subtitle="Get assistance or report an issue"
            onPress={() => router.push('/(shared)/help-support' as any)}
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="book-outline"
            iconBg={isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF'}
            iconColor="#8B5CF6"
            label="Web User Guide"
            subtitle="View the full online documentation"
            onPress={() => Linking.openURL('https://blood-link-webguide.vercel.app/')}
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="logo-github"
            iconBg={isDark ? 'rgba(30, 41, 59, 0.15)' : '#F1F5F9'}
            iconColor={isDark ? '#94a3b8' : '#334155'}
            label="App Version"
            subtitle="BloodLink v2.1.0"
            isLast
            colors={colors}
            styles={styles}
          />
        </View>

        {/*  Danger Zone  */}
        <SectionHeading
          title="Danger Zone"
          icon="warning-outline"
          color={colors.danger}
          textColor={colors.text}
          styles={styles}
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: isDark ? colors.dangerBorder : '#FECACA',
            },
          ]}
        >
          <SettingsItem
            icon="trash-outline"
            iconBg={isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2'}
            iconColor={colors.danger}
            label="Delete Account"
            subtitle="Permanently remove your data"
            onPress={handleDeleteAccount}
            danger
            colors={colors}
            styles={styles}
          />
          <SettingsItem
            icon="log-out-outline"
            iconBg={isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2'}
            iconColor={colors.danger}
            label="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            danger
            isLast
            colors={colors}
            styles={styles}
          />
        </View>

        {/* Footer  */}
        <View style={styles.footer}>
          <View style={styles.footerDot} />
          <Text style={styles.footerText}>BloodLink · Made with ❤️ in Kenya 🇰🇪</Text>
          <View style={styles.footerDot} />
        </View>
      </ScrollView>

      {/*  Logout confirmation modal  */}
      <LogoutModal
        visible={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onLogout={handleConfirmLogout}
        isLoggingOut={isLoggingOut}
      />

    </SafeAreaView>
  );
}