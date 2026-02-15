import { NotificationBell } from '@/src/components/NotificationBell';
import { useAppTheme } from '@/src/contexts/ThemeContext'; // NEW
import { useUser } from '@/src/contexts/UserContext';
import {
  getActiveBloodRequests,
  getDonorHistory,
  getUserBloodRequests,
  getUsersByBloodType,
  updateUser,
} from '@/src/services/firebase/database';
import { BloodRequest, Donor } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const REQUEST_CARD_WIDTH = SCREEN_WIDTH * 0.75;
const DONOR_CARD_WIDTH = SCREEN_WIDTH * 0.7;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.41;

// ─── Brand Palette ────────────────────────────────────────────────────────
const B_SKY = '#2563EB';
const B_LIGHT = '#3B82F6';
const B_SOFT = '#60A5FA';
const B_PALE = '#DBEAFE';
const B_BG = '#EFF6FF';
const O_DEEP = '#C2410C';
const O_MID = '#EA580C';
const O_LITE = '#FB923C';
const O_PALE = '#FFF7ED';

// ─── Helper: compute aggregate from review array ─────────────────────────
function computeAggregate(reviews: any[]): { average: number; count: number } {
  if (!reviews || reviews.length === 0) return { average: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return {
    average: Math.round((sum / reviews.length) * 10) / 10,
    count: reviews.length,
  };
}

const getUrgencyColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'critical': return '#DC2626';
    case 'high': return '#EA580C';
    case 'medium': return '#FBBF24';
    default: return '#2563EB';
  }
};

const getUrgencyIcon = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'critical': return 'alert-circle';
    case 'high': return 'alert-circle-outline';
    default: return 'time-outline';
  }
};

const getRatingLabel = (rating: number) => {
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 4.0) return 'Very Good';
  if (rating >= 3.0) return 'Good';
  if (rating >= 2.0) return 'Fair';
  return 'Poor';
};

const renderStars = (rating: number, size = 12) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const name = i <= rating ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-outline';
    stars.push(<Ionicons key={i} name={name as any} size={size} color="#F59E0B" />);
  }
  return stars;
};

export default function HomeScreen() {
  const { user, updateUserData } = useUser();
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [recentRequests, setRecentRequests] = useState<BloodRequest[]>([]);
  const [availableDonors, setAvailableDonors] = useState<Donor[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingDonors, setLoadingDonors] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useState(new Animated.Value(-DRAWER_WIDTH))[0];

  const [totalRequests, setTotalRequests] = useState(0);
  const [fulfilledRequests, setFulfilledRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [totalDonations, setTotalDonations] = useState(0);

  const [previewReviews, setPreviewReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  const isDonor = user?.userType === 'donor';
  const isRequester = user?.userType === 'requester';

  useEffect(() => {
    if (user) {
      if (isDonor) loadRecentRequests();
      else if (isRequester) loadRequesterData();
      loadUserReviews();
    }
  }, [isDonor, isRequester, user?.id]);

  const loadUserReviews = async () => {
    try {
      setLoadingReviews(true);
      const { getApprovedReviews } = await import('@/src/services/firebase/database');
      const allApproved: any[] = await getApprovedReviews(100);
      const { average, count } = computeAggregate(allApproved);
      setAverageRating(average);
      setTotalReviews(count);
      const sorted = [...allApproved].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setPreviewReviews(sorted.slice(0, 2));
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const loadRecentRequests = async () => {
    if (!user) return;
    try {
      setLoadingRequests(true);
      const all = await getActiveBloodRequests();
      const list = all
        .filter(r => isBloodTypeCompatible(user.bloodType, r.bloodType))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      setRecentRequests(list);
      const history = await getDonorHistory(user.id);
      setTotalDonations(history.length);
    } catch (e) { console.error(e); }
    finally { setLoadingRequests(false); }
  };

  const loadRequesterData = async () => {
    if (!user) return;
    try {
      setLoadingRequests(true); setLoadingDonors(true);
      const reqs = await getUserBloodRequests(user.id);
      setTotalRequests(reqs.length);
      setFulfilledRequests(reqs.filter(r => r.status === 'completed').length);
      setPendingRequests(reqs.filter(r => r.status === 'pending').length);
      const donors = await getUsersByBloodType(user.bloodType);
      setAvailableDonors(donors.slice(0, 5));
    } catch (e) { console.error(e); }
    finally { setLoadingRequests(false); setLoadingDonors(false); }
  };

  const toggleDrawer = () => {
    const toValue = drawerOpen ? -DRAWER_WIDTH : 0;
    setDrawerOpen(!drawerOpen);
    Animated.spring(drawerAnim, {
      toValue, useNativeDriver: true, tension: 65, friction: 9,
    }).start();
  };

  const handleAvailabilityToggle = async (value: boolean) => {
    if (!user?.id) return;
    if (value && user.lastDonationDate) {
      const days = Math.floor((Date.now() - new Date(user.lastDonationDate).getTime()) / 86400000);
      if (days < 56) {
        const eligible = new Date(user.lastDonationDate);
        eligible.setDate(eligible.getDate() + 56);
        Alert.alert(
          'Not Yet Eligible',
          `You can donate again on ${eligible.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }
    try {
      setTogglingAvail(true);
      await updateUser(user.id, { isAvailable: value });
      await updateUserData({ isAvailable: value });
    } catch { Alert.alert('Error', 'Failed to update availability.'); }
    finally { setTogglingAvail(false); }
  };

  const isBloodTypeCompatible = (donor: string, recipient: string) => {
    const map: Record<string, string[]> = {
      'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], 'O+': ['O+', 'A+', 'B+', 'AB+'],
      'A-': ['A-', 'A+', 'AB-', 'AB+'], 'A+': ['A+', 'AB+'],
      'B-': ['B-', 'B+', 'AB-', 'AB+'], 'B+': ['B+', 'AB+'],
      'AB-': ['AB-', 'AB+'], 'AB+': ['AB+'],
    };
    return map[donor]?.includes(recipient) || false;
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user) {
      await Promise.all([
        isDonor ? loadRecentRequests() : loadRequesterData(),
        loadUserReviews(),
      ]);
    }
    setTimeout(() => setRefreshing(false), 800);
  }, [isDonor, isRequester, user]);

  const handleLogout = () => router.push('/(auth)/logout' as any);
  const handleViewAllReviews = () => router.push('/(shared)/allreviews-screen' as any);

  const handleRequestPress = () =>
    router.push(isDonor ? '/(donor)/requests' as any : '/(requester)/my-requests' as any);
  const handleDonorPress = (donor: Donor) =>
    router.push({ pathname: '/(requester)/donor-profile' as any, params: { donorData: JSON.stringify(donor) } });

  const getInitials = (f: string, l: string) => `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  };

  const navigateToProfile = () => {
    toggleDrawer();
    router.push(isDonor ? '/(donor)/profile' as any : '/(requester)/profile' as any);
  };

  const renderStarsLocal = (rating: number, size = 13) =>
    [1, 2, 3, 4, 5].map(i => (
      <Ionicons
        key={i}
        name={i <= Math.round(rating) ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-outline'}
        size={size}
        color="#F59E0B"
      />
    ));

  const getRatingLabelLocal = (avg: number) => {
    if (avg >= 4.5) return 'Excellent';
    if (avg >= 4.0) return 'Very Good';
    if (avg >= 3.0) return 'Good';
    if (avg >= 2.0) return 'Fair';
    return 'Poor';
  };

  if (!user) return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={B_BG} />
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={B_SKY} />
        <Text style={s.loadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  );

  const donorActions = [
    { icon: 'notifications', title: 'Requests', clr: [O_MID, O_DEEP] as [string, string], bg: O_PALE, route: '/(donor)/requests' },
    { icon: 'pulse', title: 'Availability', clr: ['#10B981', '#059669'] as [string, string], bg: '#F0FDF4', route: '/(donor)/availability-toggle' },
    { icon: 'time', title: 'History', clr: [B_SKY, B_LIGHT] as [string, string], bg: B_PALE, route: '/(donor)/donation-history' },
    { icon: 'business', title: 'Blood Banks', clr: ['#8B5CF6', '#7C3AED'] as [string, string], bg: '#F5F3FF', route: '/(shared)/find-bloodbank' },
    { icon: 'chatbubbles', title: 'Messages', clr: ['#0EA5E9', '#0284C7'] as [string, string], bg: '#F0F9FF', route: '/(donor)/chat' },
  ];
  const requesterActions = [
    { icon: 'add-circle', title: 'New Request', clr: [O_MID, O_DEEP] as [string, string], bg: O_PALE, route: '/(requester)/needblood' },
    { icon: 'list', title: 'My Requests', clr: [B_SKY, B_LIGHT] as [string, string], bg: B_PALE, route: '/(requester)/my-requests' },
    { icon: 'people', title: 'Find Donors', clr: ['#10B981', '#059669'] as [string, string], bg: '#F0FDF4', route: '/(requester)/find-donors' },
    { icon: 'business', title: 'Blood Banks', clr: ['#8B5CF6', '#7C3AED'] as [string, string], bg: '#F5F3FF', route: '/(shared)/find-bloodbank' },
    { icon: 'chatbubbles', title: 'Messages', clr: ['#0EA5E9', '#0284C7'] as [string, string], bg: '#F0F9FF', route: '/(requester)/chat' },
  ];
  const actions = isDonor ? donorActions : requesterActions;

  const features = [
    { icon: 'shield-checkmark', bg: [B_SKY, B_LIGHT] as [string, string], title: 'Verified & Safe', desc: 'Every donor and recipient is identity-verified before going live on the platform.' },
    { icon: 'flash', bg: [O_MID, O_DEEP] as [string, string], title: 'Real-Time Matching', desc: 'Smart engine connects compatible donors by blood type, location and urgency level.' },
    { icon: 'location', bg: ['#0EA5E9', '#0284C7'] as [string, string], title: 'Location-Aware', desc: 'GPS-powered discovery shows the nearest donors, cutting emergency response time.' },
    { icon: 'trophy', bg: ['#F59E0B', '#D97706'] as [string, string], title: 'Reward System', desc: 'Donors earn points per verified donation. Redeem rewards and unlock community badges.' },
    { icon: 'chatbubbles', bg: ['#8B5CF6', '#7C3AED'] as [string, string], title: 'Direct Messaging', desc: 'Secure in-app chat lets donors and requesters coordinate without any middlemen.' },
    { icon: 'heart', bg: [O_LITE, O_MID] as [string, string], title: 'Community Impact', desc: 'Join thousands of active donors. Every contribution builds a national blood safety net.' },
  ];

  const socialLinks = [
    { icon: 'logo-facebook', label: 'Facebook', url: 'https://facebook.com/bloodlinkapp', color: '#1877F2', bg: '#E7F0FD' },
    { icon: 'logo-twitter', label: 'X / Twitter', url: 'https://twitter.com/bloodlinkapp', color: '#0F1419', bg: '#E7E7E7' },
    { icon: 'logo-instagram', label: 'Instagram', url: 'https://instagram.com/bloodlinkapp', color: '#E1306C', bg: '#FCE4EC' },
    { icon: 'logo-whatsapp', label: 'WhatsApp', url: 'https://wa.me/254700000000', color: '#25D366', bg: '#E8F5E9' },
    { icon: 'logo-linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/bloodlinkapp', color: '#0077B5', bg: '#E3F0F8' },
    { icon: 'mail', label: 'Email Us', url: 'mailto:support@bloodlink.co.ke', color: O_MID, bg: O_PALE },
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={B_SKY} />

      {/* ══ SIDE DRAWER ══ */}
      <Animated.View style={[s.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        <LinearGradient colors={[B_SKY, B_LIGHT, B_SOFT]} style={s.drawerGrad}>
          <View style={s.drawerProfile}>
            <TouchableOpacity style={s.drawerAvatarWrap} onPress={navigateToProfile} activeOpacity={0.8}>
              {user.profilePicture
                ? <Image source={{ uri: user.profilePicture }} style={s.drawerAvatarImg} />
                : <View style={s.drawerAvatarFallback}>
                  <Text style={s.drawerAvatarInitial}>{user.firstName.charAt(0).toUpperCase()}</Text>
                </View>
              }
            </TouchableOpacity>
            <Text style={s.drawerName}>{user.firstName} {user.lastName}</Text>
            <Text style={s.drawerEmail} numberOfLines={1}>{user.email}</Text>
            <View style={[s.drawerBadge, { backgroundColor: isDonor ? 'rgba(251,146,60,0.2)' : 'rgba(59,130,246,0.2)' }]}>
              <Ionicons name={isDonor ? 'heart' : 'medkit'} size={13} color={isDonor ? O_LITE : '#93C5FD'} />
              <Text style={[s.drawerBadgeText, { color: isDonor ? O_LITE : '#93C5FD' }]}>
                {isDonor ? 'Donor' : 'Requester'}
              </Text>
            </View>
          </View>

          {isDonor && (
            <View style={s.drawerToggleBox}>
              <View style={s.drawerToggleHeader}>
                <View style={s.drawerToggleRow}>
                  <Ionicons name="pulse" size={14} color="#FFFFFF" />
                  <Text style={s.drawerToggleTitle}>Availability Status</Text>
                </View>
              </View>
              <View style={s.drawerToggleCtrl}>
                <View style={s.drawerToggleStatus}>
                  <View style={[s.drawerStatusDot, { backgroundColor: user.isAvailable ? '#10B981' : '#EF4444' }]} />
                  <Text style={s.drawerToggleLbl}>
                    {togglingAvail ? 'Updating…' : user.isAvailable ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
                <Switch
                  value={user.isAvailable || false}
                  onValueChange={handleAvailabilityToggle}
                  trackColor={{ false: 'rgba(255,255,255,0.25)', true: '#10B981' }}
                  thumbColor={user.isAvailable ? '#FFFFFF' : 'rgba(255,255,255,0.75)'}
                  ios_backgroundColor="rgba(255,255,255,0.25)"
                  disabled={togglingAvail}
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
              </View>
            </View>
          )}

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 50 + insets.bottom }} showsVerticalScrollIndicator={false}>
            <View style={s.drawerMenu}>
              {[
                { icon: 'person-outline', label: 'My Profile', color: '#93C5FD', fn: navigateToProfile },
                {
                  icon: 'notifications-outline', label: 'Notifications', color: O_LITE,
                  fn: () => { toggleDrawer(); router.push('/(shared)/notifications' as any); }
                },
                {
                  icon: 'star-outline', label: 'Ratings & Reviews', color: '#F59E0B',
                  fn: () => { toggleDrawer(); router.push('/(shared)/allreviews-screen' as any); }
                },
                {
                  icon: 'information-circle-outline', label: 'About Us', color: '#60A5FA',
                  fn: () => { toggleDrawer(); router.push('/(shared)/about-us' as any); }
                },
                {
                  icon: 'settings-outline', label: 'Settings', color: '#93C5FD',
                  fn: () => { toggleDrawer(); router.push('/(shared)/settings' as any); }
                },
                {
                  icon: 'help-circle-outline', label: 'Help & Support', color: '#10B981',
                  fn: () => { toggleDrawer(); router.push('/(shared)/help-support' as any); }
                },
              ].map((item, i) => (
                <TouchableOpacity key={i} style={s.drawerMenuItem} onPress={item.fn}>
                  <View style={[s.drawerMenuIcon, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                  </View>
                  <Text style={s.drawerMenuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              ))}
              <View style={s.drawerDivider} />
              <TouchableOpacity style={s.drawerMenuItem} onPress={() => { toggleDrawer(); handleLogout(); }}>
                <View style={[s.drawerMenuIcon, { backgroundColor: 'rgba(251,146,60,0.2)' }]}>
                  <Ionicons name="log-out-outline" size={16} color={O_LITE} />
                </View>
                <Text style={[s.drawerMenuLabel, { color: O_LITE }]}>Logout</Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.35)" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity style={s.drawerCloseBtn} onPress={toggleDrawer}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      {drawerOpen && (
        <TouchableOpacity style={s.drawerOverlay} activeOpacity={1} onPress={toggleDrawer} />
      )}

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={true}
        persistentScrollbar={true}
        indicatorStyle="default"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[B_SKY]} tintColor={B_SKY} />
        }
      >

        {/* ══════════════════════════════════════
            HEADER
            ══════════════════════════════════════ */}
        <LinearGradient colors={[B_SKY, B_LIGHT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
          <View style={s.hCircle1} /><View style={s.hCircle2} />

          <View style={s.hTopBar}>
            <TouchableOpacity style={s.menuBtn} onPress={toggleDrawer} activeOpacity={0.7}>
              <View style={[s.menuLine, { width: 18 }]} />
              <View style={[s.menuLine, { width: 13 }]} />
            </TouchableOpacity>

            <View style={s.hBrand}>
              <Image
                source={require('@/assets/images/logo.jpg')}
                style={[s.hBrandIcon, { width: 42, height: 42, borderRadius: 12 }]}
                resizeMode="cover"
              />
              <View style={s.hBrandTextContainer}>
                <Text style={s.hAppName}>BloodLink</Text>
                <Text style={s.hTagline}>Every Drop Counts</Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => router.push('/(shared)/notifications' as any)} style={s.hNotifBtn} activeOpacity={0.8}>
              <NotificationBell iconSize={24} iconColor="#FFFFFF" badgeColor={O_LITE} />
            </TouchableOpacity>
          </View>

          <View style={s.hGreetRow}>
            <View style={s.hAvatarSmall}>
              {user.profilePicture
                ? <Image source={{ uri: user.profilePicture }} style={s.hAvatarImg} />
                : <Text style={s.hAvatarInitial}>{user.firstName.charAt(0).toUpperCase()}</Text>
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.hGreeting}>{getGreeting()}, {user.firstName}!</Text>
              <Text style={s.hRole}>{isDonor ? '💉 Donor' : '🔎 Seeking help'}</Text>
            </View>
            <View style={[s.statusPill, { backgroundColor: user.isAvailable ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.25)' }]}>
              <View style={[s.statusDot, { backgroundColor: user.isAvailable ? '#10B981' : '#94A3B8' }]} />
              <Text style={[s.statusPillText, { color: '#FFFFFF' }]}>
                {user.isAvailable ? 'Active' : 'Away'}
              </Text>
            </View>
          </View>

          <View style={s.bloodCard}>
            <View style={s.bloodCardLeft}>
              <View style={s.bloodTypeCircle}>
                <Ionicons name="water" size={16} color={O_MID} />
                <Text style={s.bloodType}>{user.bloodType}</Text>
              </View>
              <Text style={s.bloodTypeLabel}>Blood Type</Text>
            </View>
            <View style={s.bloodCardStats}>
              {isDonor ? (
                <>
                  <View style={s.statItem}>
                    <View style={[s.statIconCircle, { backgroundColor: O_PALE }]}>
                      <Ionicons name="heart" size={14} color={O_MID} />
                    </View>
                    <Text style={s.statValue}>{totalDonations}</Text>
                    <Text style={s.statLabel}>Donations</Text>
                  </View>
                  <View style={s.statItem}>
                    <View style={[s.statIconCircle, { backgroundColor: O_PALE }]}>
                      <Ionicons name="star" size={14} color={O_MID} />
                    </View>
                    <Text style={s.statValue}>{user.points || 0}</Text>
                    <Text style={s.statLabel}>Points</Text>
                  </View>
                  <View style={s.statItem}>
                    <View style={[s.statIconCircle, { backgroundColor: O_PALE }]}>
                      <Ionicons name="time" size={14} color={O_MID} />
                    </View>
                    <Text style={s.statValue}>{pendingRequests || 0}</Text>
                    <Text style={s.statLabel}>Pending</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={s.statItem}>
                    <View style={[s.statIconCircle, { backgroundColor: O_PALE }]}>
                      <Ionicons name="document-text" size={14} color={O_MID} />
                    </View>
                    <Text style={s.statValue}>{totalRequests}</Text>
                    <Text style={s.statLabel}>Requests</Text>
                  </View>
                  <View style={s.statItem}>
                    <View style={[s.statIconCircle, { backgroundColor: O_PALE }]}>
                      <Ionicons name="checkmark-circle" size={14} color={O_MID} />
                    </View>
                    <Text style={s.statValue}>{fulfilledRequests}</Text>
                    <Text style={s.statLabel}>Fulfilled</Text>
                  </View>
                  <View style={s.statItem}>
                    <View style={[s.statIconCircle, { backgroundColor: O_PALE }]}>
                      <Ionicons name="time" size={14} color={O_MID} />
                    </View>
                    <Text style={s.statValue}>{pendingRequests}</Text>
                    <Text style={s.statLabel}>Pending</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* ══════════════════════════════════════
            QUICK ACTIONS
            ══════════════════════════════════════ */}
        <View style={s.section}>
          <View style={s.sectionHdr}>
            <View style={[s.sectionBar, { backgroundColor: O_MID }]} />
            <Text style={[s.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          </View>
          <View style={s.actionsGrid}>
            {actions.map((a, i) => (
              <TouchableOpacity key={i} style={s.actionCard} onPress={() => router.push(a.route as any)} activeOpacity={0.75}>
                <View style={[s.actionIconBg, { backgroundColor: a.bg }]}>
                  <LinearGradient colors={a.clr} style={s.actionIconGrad}>
                    <Ionicons name={a.icon as any} size={20} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={s.actionTitle} numberOfLines={1}>{a.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════
            REQUESTS / DONORS
            ══════════════════════════════════════ */}
        {isDonor ? (
          <View style={s.section}>
            <View style={s.sectionHdr}>
              <View style={[s.sectionBar, { backgroundColor: O_MID }]} />
              <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Requests</Text>
              <TouchableOpacity onPress={() => router.push('/(donor)/requests' as any)} style={s.seeAllBtn}>
                <Text style={s.seeAllText}>View All</Text>
                <Ionicons name="arrow-forward" size={13} color={B_SKY} />
              </TouchableOpacity>
            </View>

            {loadingRequests ? (
              <View style={s.loadingCard}>
                <ActivityIndicator size="small" color={O_MID} />
                <Text style={s.loadingCardText}>Loading requests…</Text>
              </View>
            ) : recentRequests.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.hScrollCont} snapToInterval={REQUEST_CARD_WIDTH + 16} decelerationRate="fast">
                {recentRequests.map(req => (
                  <View key={req.id} style={[s.requestCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={[s.cardStripe, { backgroundColor: getUrgencyColor(req.urgencyLevel) }]} />
                    <TouchableOpacity onPress={handleRequestPress} activeOpacity={0.85}>
                      <View style={s.requestHdr}>
                        <View>
                          <Text style={[s.reqBloodType, { color: colors.text }]}>{req.bloodType}</Text>
                          <Text style={[s.reqBloodLabel, { color: colors.textSecondary }]}>needed</Text>
                        </View>
                        <View style={[s.urgencyBadge, { backgroundColor: getUrgencyColor(req.urgencyLevel) + '18', borderColor: getUrgencyColor(req.urgencyLevel) }]}>
                          <Ionicons name={getUrgencyIcon(req.urgencyLevel) as any} size={11} color={getUrgencyColor(req.urgencyLevel)} />
                          <Text style={[s.urgencyText, { color: getUrgencyColor(req.urgencyLevel) }]}>{req.urgencyLevel.toUpperCase()}</Text>
                        </View>
                      </View>
                      <View style={s.requestBody}>
                        {[
                          { icon: 'person', bg: B_SKY, val: req.requesterName },
                          ...(req.hospitalName ? [{ icon: 'business', bg: B_LIGHT, val: req.hospitalName }] : []),
                          { icon: 'location', bg: '#10B981', val: req.location.address || 'Location provided' },
                        ].map((row, ri) => (
                          <View key={ri} style={s.reqRow}>
                            <View style={[s.reqRowIcon, { backgroundColor: row.bg }]}>
                              <Ionicons name={row.icon as any} size={13} color="#FFFFFF" />
                            </View>
                            <Text style={[s.reqText, { color: colors.textSecondary }]} numberOfLines={1}>{row.val}</Text>
                          </View>
                        ))}
                      </View>
                      <LinearGradient colors={[O_MID, O_DEEP]} style={s.cardFooter}>
                        <Text style={s.cardFooterText}>Respond to Request</Text>
                        <Ionicons name="arrow-forward-circle" size={17} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={[s.emptyState, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <LinearGradient colors={[O_PALE, '#FED7AA']} style={s.emptyIconBox}>
                  <Ionicons name="heart-outline" size={42} color={O_MID} />
                </LinearGradient>
                <Text style={[s.emptyTitle, { color: colors.text }]}>No Urgent Requests</Text>
                <Text style={[s.emptySub, { color: colors.textSecondary }]}>We'll notify you when someone needs your blood type</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={s.section}>
            <View style={s.sectionHdr}>
              <View style={[s.sectionBar, { backgroundColor: B_SKY }]} />
              <Text style={[s.sectionTitle, { color: colors.text }]}>Available Donors</Text>
              <TouchableOpacity onPress={() => router.push('/(requester)/find-donors' as any)} style={s.seeAllBtn}>
                <Text style={s.seeAllText}>View All</Text>
                <Ionicons name="arrow-forward" size={13} color={B_SKY} />
              </TouchableOpacity>
            </View>

            {loadingDonors ? (
              <View style={s.loadingCard}>
                <ActivityIndicator size="small" color={B_SKY} />
                <Text style={s.loadingCardText}>Loading donors…</Text>
              </View>
            ) : availableDonors.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.hScrollCont} snapToInterval={DONOR_CARD_WIDTH + 16} decelerationRate="fast">
                {availableDonors.map(donor => (
                  <View key={donor.id} style={[s.donorCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={[s.cardStripe, { backgroundColor: B_SKY }]} />
                    <TouchableOpacity onPress={() => handleDonorPress(donor)} activeOpacity={0.85} style={{ padding: 16 }}>
                      <View style={s.donorHdr}>
                        {donor.profilePicture
                          ? <Image source={{ uri: donor.profilePicture }} style={s.donorAvatar} />
                          : <LinearGradient colors={[B_SKY, B_LIGHT]} style={s.donorAvatarFallback}>
                            <Text style={s.donorInitials}>{getInitials(donor.firstName, donor.lastName)}</Text>
                          </LinearGradient>
                        }
                        <View style={{ flex: 1 }}>
                          <Text style={[s.donorName, { color: colors.text }]} numberOfLines={1}>{donor.firstName} {donor.lastName}</Text>
                          <View style={s.donorBloodBadge}>
                            <Ionicons name="water" size={11} color={O_MID} />
                            <Text style={s.donorBloodType}>{donor.bloodType}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={[s.donorStatsBox, { backgroundColor: isDark ? '#1e293b' : '#F8FAFF' }]}>
                        <View style={s.donorStat}><Text style={[s.donorStatVal, { color: colors.text }]}>{donor.totalDonations || 0}</Text><Text style={[s.donorStatLbl, { color: colors.textSecondary }]}>Donations</Text></View>
                        <View style={s.donorStatDiv} />
                        <View style={s.donorStat}><Text style={[s.donorStatVal, { color: O_MID }]}>{donor.points || 0}</Text><Text style={[s.donorStatLbl, { color: colors.textSecondary }]}>Points</Text></View>
                      </View>
                      {donor.location?.city && (
                        <View style={s.donorLoc}>
                          <Ionicons name="location" size={13} color={B_SKY} />
                          <Text style={[s.donorLocText, { color: colors.textSecondary }]} numberOfLines={1}>{donor.location.city}</Text>
                        </View>
                      )}
                      <LinearGradient colors={[B_SKY, B_LIGHT]} style={s.cardFooter}>
                        <Text style={s.cardFooterText}>View Profile</Text>
                        <Ionicons name="arrow-forward-circle" size={17} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={s.emptyState}>
                <LinearGradient colors={[B_PALE, '#BFDBFE']} style={s.emptyIconBox}>
                  <Ionicons name="people-outline" size={42} color={B_SKY} />
                </LinearGradient>
                <Text style={[s.emptyTitle, { color: colors.text }]}>No Available Donors</Text>
                <Text style={[s.emptySub, { color: colors.textSecondary }]}>Check back later or browse all donors</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(requester)/find-donors' as any)}>
                  <LinearGradient colors={[B_SKY, B_LIGHT]} style={s.emptyBtnGrad}>
                    <Text style={s.emptyBtnText}>Browse Donors</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════
            DONATION TIPS
            ══════════════════════════════════════ */}
        <View style={s.section}>
          <View style={s.sectionHdr}>
            <View style={[s.sectionBar, { backgroundColor: B_SKY }]} />
            <Text style={[s.sectionTitle, { color: colors.text }]}>{isDonor ? 'Donation Tips' : 'Helpful Guidance'}</Text>
          </View>
          <View style={[s.tipsCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            {(isDonor ? [
              { icon: 'water', tip: 'Drink plenty of water before and after donating' },
              { icon: 'moon', tip: 'Get adequate sleep the night before your donation' },
              { icon: 'nutrition', tip: 'Eat iron-rich foods regularly' },
              { icon: 'timer', tip: 'Wait 56 days between whole blood donations' },
            ] : [
              { icon: 'document-text', tip: 'Provide accurate blood type information' },
              { icon: 'business', tip: 'Include hospital name and ward details' },
              { icon: 'alert-circle', tip: 'Set the correct urgency level' },
              { icon: 'call', tip: 'Keep contact details updated' },
            ]).map((item, i) => (
              <View key={i} style={s.tipRow}>
                <View style={s.tipIconWrap}>
                  <Ionicons name={item.icon as any} size={15} color={B_SKY} />
                </View>
                <Text style={[s.tipText, { color: colors.textSecondary }]}>{item.tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════
            COMMUNITY STORIES
            ══════════════════════════════════════ */}
        <View style={s.section}>
          <View style={s.sectionHdr}>
            <View style={[s.sectionBar, { backgroundColor: B_SKY }]} />
            <Text style={[s.sectionTitle, { color: colors.text }]}>Community Stories</Text>
            <TouchableOpacity onPress={handleViewAllReviews} style={s.seeAllBtn}>
              <Text style={s.seeAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={13} color={B_SKY} />
            </TouchableOpacity>
          </View>

          {loadingReviews ? (
            <View style={s.ratingBannerSkeleton}>
              <ActivityIndicator size="small" color={B_SKY} />
              <Text style={s.loadingCardText}>Loading ratings…</Text>
            </View>
          ) : totalReviews > 0 ? (
            <TouchableOpacity style={[s.ratingBanner, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]} onPress={handleViewAllReviews} activeOpacity={0.8}>
              <View style={s.ratingScoreCircle}>
                <Text style={s.ratingScoreValue}>{averageRating.toFixed(1)}</Text>
                <Text style={s.ratingScoreMax}>/5</Text>
              </View>
              <View style={s.ratingBannerMid}>
                <Text style={[s.ratingBannerLabel, { color: colors.text }]}>{getRatingLabelLocal(averageRating)}</Text>
                <View style={s.ratingBannerStars}>
                  {renderStarsLocal(averageRating, 14)}
                </View>
                <Text style={[s.ratingBannerCount, { color: colors.textSecondary }]}>
                  Based on {totalReviews} verified review{totalReviews !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={s.ratingBannerArrow}>
                <Ionicons name="chevron-forward" size={20} color={B_SKY} />
              </View>
            </TouchableOpacity>
          ) : null}

          {loadingReviews ? (
            <View style={s.loadingCard}>
              <ActivityIndicator size="small" color={B_SKY} />
              <Text style={s.loadingCardText}>Loading reviews…</Text>
            </View>
          ) : previewReviews.length > 0 ? (
            <>
              <View style={s.reviewsRow}>
                {previewReviews.map((review, i) => (
                  <View key={review.id || i} style={[s.reviewCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={s.reviewQuoteBg}>
                      <Text style={s.reviewQuoteChar}>"</Text>
                    </View>
                    <View style={s.reviewCardHeader}>
                      <LinearGradient
                        colors={review.userType === 'donor' ? [O_MID, O_DEEP] : [B_SKY, B_LIGHT]}
                        style={s.reviewAvatar}
                      >
                        <Text style={s.reviewAvatarLetter}>
                          {review.userName?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      </LinearGradient>
                      <View style={s.reviewCardMeta}>
                        <Text style={[s.reviewCardName, { color: colors.text }]}>
                          {review.userName || 'Anonymous'}
                        </Text>
                        <View style={s.reviewCardRoleRow}>
                          <Ionicons
                            name={review.userType === 'donor' ? 'heart' : 'medkit'}
                            size={10}
                            color={review.userType === 'donor' ? O_MID : B_SKY}
                          />
                          <Text style={[s.reviewCardRole, { color: review.userType === 'donor' ? O_MID : B_SKY }]}>
                            {review.userType === 'donor' ? 'Donor' : 'Requester'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {review.bloodType && (
                      <View style={s.reviewBloodBadge}>
                        <Ionicons name="water" size={9} color="#FFFFFF" />
                        <Text style={s.reviewBloodBadgeText}>{review.bloodType}</Text>
                      </View>
                    )}
                    <View style={s.reviewStarsRow}>
                      {renderStarsLocal(review.rating || 5, 12)}
                    </View>
                    <Text style={[s.reviewText, { color: colors.textSecondary }]} numberOfLines={5}>
                      {review.review}
                    </Text>
                    {review.category && (
                      <View style={s.reviewCategoryChip}>
                        <Text style={s.reviewCategoryText}>#{review.category}</Text>
                      </View>
                    )}
                  </View>
                ))}
                {previewReviews.length === 1 && (
                  <TouchableOpacity
                    style={[s.reviewCard, s.reviewCardCta, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                    onPress={() => router.push('/(shared)/rate-app' as any)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={[B_SKY, B_LIGHT]} style={s.reviewCtaGrad}>
                      <Ionicons name="create-outline" size={28} color="#FFFFFF" />
                      <Text style={s.reviewCtaText}>Write a Review</Text>
                      <Text style={s.reviewCtaSub}>Share your experience with the community</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={s.viewAllReviewsBtn} onPress={handleViewAllReviews} activeOpacity={0.8}>
                <LinearGradient colors={[B_SKY, B_LIGHT]} style={s.viewAllReviewsGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="star" size={16} color="#FFFFFF" />
                  <Text style={s.viewAllReviewsText}>
                    View All {totalReviews} Review{totalReviews !== 1 ? 's' : ''}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <View style={[s.emptyState, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <LinearGradient colors={[B_PALE, '#BFDBFE']} style={s.emptyIconBox}>
                <Ionicons name="star-outline" size={42} color={B_SKY} />
              </LinearGradient>
              <Text style={[s.emptyTitle, { color: colors.text }]}>No Reviews Yet</Text>
              <Text style={[s.emptySub, { color: colors.textSecondary }]}>Be the first to share your experience!</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(shared)/rate-app' as any)}>
                <LinearGradient colors={[B_SKY, B_LIGHT]} style={s.emptyBtnGrad}>
                  <Text style={s.emptyBtnText}>Write a Review</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Impact Stats */}
          <LinearGradient colors={[B_SKY, B_LIGHT]} style={s.impactCard}>
            <Text style={s.impactCardTitle}>Our Impact Together</Text>
            <View style={s.impactStatsRow}>
              <View style={s.impactStatItem}>
                <Text style={s.impactStatValue}>10,000+</Text>
                <Text style={s.impactStatLabel}>Active Donors</Text>
              </View>
              <View style={s.impactStatDivider} />
              <View style={s.impactStatItem}>
                <Text style={s.impactStatValue}>4,500+</Text>
                <Text style={s.impactStatLabel}>Lives Saved</Text>
              </View>
              <View style={s.impactStatDivider} />
              <View style={s.impactStatItem}>
                <Text style={s.impactStatValue}>47</Text>
                <Text style={s.impactStatLabel}>Counties</Text>
              </View>
            </View>
            <Text style={s.impactCardSubtext}>Every donation makes a difference. Join our life-saving community today.</Text>
          </LinearGradient>
        </View>

        {/* ══════════════════════════════════════
            ABOUT BLOODLINK
            ══════════════════════════════════════ */}
        <View style={s.section}>
          <View style={s.sectionHdr}>
            <View style={[s.sectionBar, { backgroundColor: O_MID }]} />
            <Text style={[s.sectionTitle, { color: colors.text }]}>About BloodLink</Text>
          </View>

          <View style={[s.missionCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={s.missionQuote}>"Every drop counts."</Text>
            <Text style={[s.missionText, { color: colors.textSecondary }]}>
              BloodLink is a community-driven blood donation platform bridging the critical gap between
              donors and patients in need. We operate at the intersection of technology and humanity —
              ensuring that when life is on the line, help is always one tap away.
            </Text>
          </View>

          {/* ── FIXED: 2-column feature grid ── */}
          <View style={s.featGrid}>
            {features.map((f, i) => (
              <View key={i} style={[s.featCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <LinearGradient colors={f.bg} style={s.featIcon}>
                  <Ionicons name={f.icon as any} size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[s.featTitle, { color: colors.text }]}>{f.title}</Text>
                <Text style={[s.featDesc, { color: colors.textSecondary }]}>{f.desc}</Text>
              </View>
            ))}
          </View>

          <View style={[s.serveCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[s.serveHeading, { color: colors.text }]}>Who We Serve</Text>
            <View style={s.serveRow}>
              <LinearGradient colors={[O_PALE, '#FED7AA']} style={s.serveItem}>
                <Ionicons name="heart" size={24} color={O_MID} />
                <Text style={[s.serveItemTitle, { color: '#0C1A3A' }]}>Voluntary Donors</Text>
                <Text style={[s.serveItemDesc, { color: '#475569' }]}>Healthy individuals aged 18–65 who want to give back.</Text>
              </LinearGradient>
              <LinearGradient colors={[B_PALE, '#BFDBFE']} style={s.serveItem}>
                <Ionicons name="medkit" size={24} color={B_SKY} />
                <Text style={[s.serveItemTitle, { color: '#0C1A3A' }]}>Patients & Families</Text>
                <Text style={[s.serveItemDesc, { color: '#475569' }]}>Individuals facing emergencies or chronic conditions.</Text>
              </LinearGradient>
            </View>
            <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={s.serveItemFull}>
              <Ionicons name="business" size={24} color="#15803D" />
              <View style={{ flex: 1 }}>
                <Text style={[s.serveItemTitle, { color: '#0C1A3A' }]}>Hospitals & Blood Banks</Text>
                <Text style={[s.serveItemDesc, { color: '#475569' }]}>Partner institutions using BloodLink to manage inventory and coordinate with registered donors.</Text>
              </View>
            </LinearGradient>
          </View>

          <View style={[s.socialCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={s.socialHeader}>
              <LinearGradient colors={[O_MID, O_LITE]} style={s.socialHeaderIcon}>
                <Ionicons name="share-social" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={s.socialHeaderTitle}>Connect With Us</Text>
                <Text style={s.socialHeaderSub}>Follow · Share · Engage</Text>
              </View>
            </View>
            <View style={s.socialBody}>
              <Text style={[s.socialBodyText, { color: colors.textSecondary }]}>Stay updated on donation drives, community stories and blood alerts.</Text>
              <View style={s.socialGrid}>
                {socialLinks.map((link, i) => (
                  <TouchableOpacity key={i} style={s.socialItem} onPress={() => Linking.openURL(link.url)} activeOpacity={0.75}>
                    <View style={[s.socialIconCircle, { backgroundColor: link.bg }]}>
                      <Ionicons name={link.icon as any} size={20} color={link.color} />
                    </View>
                    <Text style={s.socialLabel}>{link.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.hashtagRow}>
                {['#BloodLink', '#DonateBlood', '#SaveLives', '#Kenya'].map((tag, i) => (
                  <View key={i} style={s.hashtagChip}>
                    <Text style={s.hashtagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={s.versionRow}>
            <View style={s.versionDot} />
            <Text style={s.versionText}>BloodLink · v2.1.0 · Made with ❤️ in Kenya 🇰🇪</Text>
            <View style={s.versionDot} />
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const shadow = (color = '#000', opacity = 0.08, radius = 10, elevation = 3) =>
  Platform.select({
    web: { boxShadow: `0 2px ${radius}px rgba(0,0,0,${opacity})` } as any,
    default: { shadowColor: color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: opacity, shadowRadius: radius, elevation },
  });

// ── Calculated widths for 2-column feature grid ──────────────────────────────
// section paddingHorizontal = 16 on each side → total horizontal padding = 32
// gap between the two columns = 12
// card width = (SCREEN_WIDTH - 32 - 12) / 2
const FEAT_CARD_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 12) / 2);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: B_BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748B', fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // DRAWER
  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: DRAWER_WIDTH, zIndex: 1000, ...shadow('#000', 0.2, 16, 12) },
  drawerGrad: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 36, paddingBottom: 24 },
  drawerProfile: { alignItems: 'center', paddingHorizontal: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)' },
  drawerAvatarWrap: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)', overflow: 'hidden', marginBottom: 10 },
  drawerAvatarImg: { width: '100%', height: '100%' },
  drawerAvatarFallback: { width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  drawerAvatarInitial: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  drawerName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 2, textAlign: 'center' },
  drawerEmail: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 8, textAlign: 'center' },
  drawerBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, gap: 5 },
  drawerBadgeText: { fontSize: 11, fontWeight: '700' },
  drawerToggleBox: { marginTop: 16, marginHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  drawerToggleHeader: { marginBottom: 8 },
  drawerToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  drawerToggleTitle: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  drawerToggleCtrl: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  drawerToggleStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  drawerStatusDot: { width: 7, height: 7, borderRadius: 3.5 },
  drawerToggleLbl: { fontSize: 11, color: '#FFFFFF', fontWeight: '600', flex: 1 },
  drawerMenu: { flex: 1, marginTop: 16, paddingHorizontal: 10 },
  drawerMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, gap: 8, borderRadius: 10, marginBottom: 4 },
  drawerMenuIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  drawerMenuLabel: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  drawerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 10 },
  drawerCloseBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 44 : 28, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  drawerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999 },

  // HEADER
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', position: 'relative' },
  hCircle1: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.05)', top: -50, right: -40 },
  hCircle2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)', bottom: 10, left: -25 },
  hTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  menuBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 12 },
  menuLine: { height: 2.5, borderRadius: 2, backgroundColor: '#FFFFFF' },
  hBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  hBrandIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center', ...shadow(O_MID, 0.3, 8, 4) },
  hBrandTextContainer: { alignItems: 'center' },
  hAppName: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.4 },
  hTagline: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.88)', letterSpacing: 1.8, marginTop: 1 },
  hNotifBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  hGreetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  hAvatarSmall: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.5)', overflow: 'hidden' },
  hAvatarImg: { width: '100%', height: '100%' },
  hAvatarInitial: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  hGreeting: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 3 },
  hRole: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  bloodCard: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow('#000', 0.1, 10, 2) },
  bloodCardLeft: { alignItems: 'center' },
  bloodTypeCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', ...shadow(O_MID, 0.15, 6, 2) },
  bloodType: { fontSize: 20, fontWeight: '900', color: O_MID, marginTop: 1 },
  bloodTypeLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginTop: 4, letterSpacing: 0.5 },
  bloodCardStats: { flex: 1, flexDirection: 'row', gap: 10 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statIconCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statValue: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 3 },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textAlign: 'center' },

  // SECTIONS
  section: { marginTop: 18, paddingHorizontal: 16 },
  sectionHdr: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionBar: { width: 3, height: 18, borderRadius: 1.5 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0C1A3A', flex: 1 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  seeAllText: { fontSize: 13, fontWeight: '700', color: B_SKY },

  // QUICK ACTIONS
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: Math.floor((SCREEN_WIDTH - 40 - 24) / 3), backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E8EEFF', ...shadow(B_SKY, 0.1, 10, 3) },
  actionIconBg: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionIconGrad: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontSize: 11, fontWeight: '700', color: '#0C1A3A', textAlign: 'center' },

  // SHARED CARD ELEMENTS
  hScrollCont: { paddingRight: 20, gap: 16 },
  cardStripe: { height: 5, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  cardFooterText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // REQUEST CARD
  requestCard: { width: REQUEST_CARD_WIDTH, borderRadius: 14, backgroundColor: '#FFFFFF', overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', ...shadow('#000', 0.08, 10, 3) },
  requestHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  reqBloodType: { fontSize: 24, fontWeight: '900', color: '#0C1A3A' },
  reqBloodLabel: { fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: -1 },
  urgencyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 2 },
  urgencyText: { fontSize: 10, fontWeight: '800' },
  requestBody: { padding: 16, gap: 10 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reqRowIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  reqText: { fontSize: 13, color: '#334155', flex: 1, fontWeight: '500' },

  // DONOR CARD
  donorCard: { width: DONOR_CARD_WIDTH, borderRadius: 14, backgroundColor: '#FFFFFF', overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', ...shadow('#000', 0.08, 10, 3) },
  donorHdr: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  donorAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: B_SKY },
  donorAvatarFallback: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  donorInitials: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  donorName: { fontSize: 13, fontWeight: '700', color: '#0C1A3A', marginBottom: 3 },
  donorBloodBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: O_PALE, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  donorBloodType: { fontSize: 12, fontWeight: '800', color: O_MID },
  donorStatsBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFF', borderRadius: 12, padding: 12, marginBottom: 12 },
  donorStat: { flex: 1, alignItems: 'center' },
  donorStatVal: { fontSize: 16, fontWeight: '800', color: '#0C1A3A' },
  donorStatLbl: { fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 3 },
  donorStatDiv: { width: 1, height: 32, backgroundColor: '#E2E8F0' },
  donorLoc: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  donorLocText: { fontSize: 12, color: '#64748B', flex: 1, fontWeight: '500' },

  // RATING BANNER
  ratingBannerSkeleton: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  ratingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: B_PALE, gap: 12, ...shadow(B_SKY, 0.1, 8, 2) },
  ratingScoreCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: B_SKY, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', ...shadow(B_SKY, 0.35, 10, 5) },
  ratingScoreValue: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', lineHeight: 30 },
  ratingScoreMax: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '700', alignSelf: 'flex-end', marginBottom: 4 },
  ratingBannerMid: { flex: 1, gap: 4 },
  ratingBannerLabel: { fontSize: 18, fontWeight: '900', color: '#0C1A3A' },
  ratingBannerStars: { flexDirection: 'row', gap: 3 },
  ratingBannerCount: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  ratingBannerArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: B_PALE, justifyContent: 'center', alignItems: 'center' },

  // REVIEW CARDS
  reviewsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  reviewCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', position: 'relative', ...shadow('#000', 0.05, 6, 2) },
  reviewCardCta: { padding: 0, overflow: 'hidden' },
  reviewCtaGrad: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 10, borderRadius: 16 },
  reviewCtaText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  reviewCtaSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 16 },
  reviewQuoteBg: { position: 'absolute', top: -4, right: 8 },
  reviewQuoteChar: { fontSize: 72, fontWeight: '900', color: B_PALE, lineHeight: 72 },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  reviewAvatarLetter: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  reviewCardMeta: { flex: 1, minWidth: 0 },
  reviewCardName: { fontSize: 12, fontWeight: '800', color: '#0C1A3A', marginBottom: 2 },
  reviewCardRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reviewCardRole: { fontSize: 10, fontWeight: '700' },
  reviewBloodBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: O_MID, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  reviewBloodBadgeText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF' },
  reviewStarsRow: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  reviewText: { fontSize: 12, color: '#475569', lineHeight: 17, fontStyle: 'italic', flex: 1 },
  reviewCategoryChip: { marginTop: 8, backgroundColor: B_PALE, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  reviewCategoryText: { fontSize: 10, fontWeight: '700', color: B_SKY },

  // VIEW ALL REVIEWS BUTTON
  viewAllReviewsBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 16, ...shadow(B_SKY, 0.2, 10, 4) },
  viewAllReviewsGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  viewAllReviewsText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', flex: 1, textAlign: 'center' },

  // IMPACT
  impactCard: { borderRadius: 14, padding: 16, marginTop: 4, ...shadow(B_SKY, 0.1, 10, 3) },
  impactCardTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 12, textAlign: 'center' },
  impactStatsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  impactStatItem: { flex: 1, alignItems: 'center' },
  impactStatValue: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  impactStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textAlign: 'center' },
  impactStatDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.25)' },
  impactCardSubtext: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 20 },

  // LOADING / EMPTY
  loadingCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  loadingCardText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  emptyState: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 },
  emptyIconBox: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0C1A3A', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 18, borderRadius: 12, overflow: 'hidden' },
  emptyBtnGrad: { paddingVertical: 12, paddingHorizontal: 24 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // TIPS
  tipsCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E8EEFF', ...shadow(B_SKY, 0.05, 6, 2) },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  tipIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: B_PALE, justifyContent: 'center', alignItems: 'center' },
  tipText: { fontSize: 13, color: '#334155', flex: 1, lineHeight: 20, fontWeight: '500' },

  // MISSION
  missionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E8EEFF', ...shadow(B_SKY, 0.05, 6, 2) },
  missionQuote: { fontSize: 20, fontWeight: '900', color: O_MID, marginBottom: 10, letterSpacing: 0.3 },
  missionText: { fontSize: 13, color: '#475569', lineHeight: 21 },

  // ── FIXED FEATURE GRID: 2-column layout ──────────────────────────────────
  featGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  featCard: {
    // Use explicit pixel width so both columns are exactly equal
    width: FEAT_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    ...shadow(B_SKY, 0.05, 6, 2),
  },
  featIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  featTitle: { fontSize: 13, fontWeight: '700', color: '#0C1A3A', marginBottom: 5 },
  featDesc: { fontSize: 11, color: '#64748B', lineHeight: 17 },

  // WHO WE SERVE
  serveCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#EEF2FF', ...shadow(B_SKY, 0.05, 6, 2) },
  serveHeading: { fontSize: 16, fontWeight: '800', color: '#0C1A3A', marginBottom: 12 },
  serveRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  serveItem: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  serveItemFull: { borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  serveItemTitle: { fontSize: 13, fontWeight: '700', color: '#0C1A3A', marginBottom: 6, marginTop: 10, textAlign: 'center' },
  serveItemDesc: { fontSize: 11, color: '#475569', lineHeight: 17, textAlign: 'center' },

  // SOCIAL
  socialCard: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#EEF2FF', ...shadow(B_SKY, 0.05, 6, 2) },
  socialHeader: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: B_PALE },
  socialHeaderIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  socialHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#0C1A3A' },
  socialHeaderSub: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2, letterSpacing: 0.7 },
  socialBody: { padding: 16 },
  socialBodyText: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 },
  socialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 16 },
  socialItem: { width: (SCREEN_WIDTH - 40 - 32 - 42) / 3, alignItems: 'center', gap: 8 },
  socialIconCircle: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', ...shadow('#000', 0.05, 4, 2) },
  socialLabel: { fontSize: 10, fontWeight: '700', color: '#334155', textAlign: 'center' },
  hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hashtagChip: { backgroundColor: B_PALE, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  hashtagText: { fontSize: 11, fontWeight: '600', color: B_SKY },

  // VERSION
  versionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  versionDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: O_MID },
  versionText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
});