import { LogoutModal } from '@/src/components/LogoutModal';
import { NotificationBell } from '@/src/components/NotificationBell';
import { VerificationBanner } from '@/src/components/VerificationBanner';
import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { BloodRequest, Donor, Notification } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
import { DashboardInsights } from '../../components/insights/DashboardInsights';
import { useTabBarAnimation } from '../../hooks/useTabBarAnimation';
import {
  countActiveCompatibleRequests,
  countAvailableCompatibleDonors,
  getActiveBloodRequests,
  getBloodBanks,
  getDonorHistory,
  getUserBloodRequests,
  getUsersByBloodType,
  subscribeToUserChats,
  subscribeToUserNotifications,
  updateUser
} from '../../services/firebase/database';
import { getDonorEligibilityStatus } from '../../services/firebase/donationEligibilityService';
import {
  addNotificationResponseListener,
  initNotifications
} from '../../services/notifications';
import { moderateScale, scale, verticalScale } from '../../utils/scaling';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const REQUEST_CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2.05;
const DONOR_CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2.05;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.41;
const FEAT_CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2;

//Helper: shadow 
const shadow = (color: string, opacity: number, radius: number, offset: number) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offset },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: offset * 2,
});

// Theme-aware Brand Palette helpers
const getBrandColors = (colors: any, isDark: boolean) => ({
  sky: colors.primary,
  light: isDark ? colors.primary : '#60A5FA',
  soft: isDark ? '#1D4ED8' : colors.surfaceTint,
  bg: colors.bg,
  orange: '#EA580C',
  orangeDeep: '#C2410C',
  orangeLite: '#FB923C',
  orangePale: isDark ? '#2D1F1A' : '#FFF7ED',
});

//Helper: compute aggregate from review array
function computeAggregate(reviews: any[]): { average: number; count: number } {
  if (!reviews || reviews.length === 0) return { average: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return {
    average: Math.round((sum / reviews.length) * 10) / 10,
    count: reviews.length,
  };
}

const getUrgencyColor = (level: string, colors: any) => {
  switch (level?.toLowerCase()) {
    case 'critical': return colors.danger;
    case 'high': return colors.warning;
    case 'medium': return '#FBBF24';
    default: return colors.primary;
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
  const { user, updateUserData, logout: userLogout } = useUser();
  const { colors, isDark } = useAppTheme();
  const brand = getBrandColors(colors, isDark);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets, isDark, brand);

  const renderStarsLocal = (rating: number, size = 12) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const name = i <= rating ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-outline';
      stars.push(<Ionicons key={i} name={name as any} size={size} color="#F59E0B" />);
    }
    return stars;
  };

  const [refreshing, setRefreshing] = useState(false);
  const [recentRequests, setRecentRequests] = useState<BloodRequest[]>([]);
  const [availableDonors, setAvailableDonors] = useState<Donor[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingDonors, setLoadingDonors] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const drawerAnim = useState(new Animated.Value(-DRAWER_WIDTH))[0];

  // Tab Bar Animation
  const { onScroll } = useTabBarAnimation();

  const [totalRequests, setTotalRequests] = useState(0);
  const [fulfilledRequests, setFulfilledRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [totalDonations, setTotalDonations] = useState(0);

  const [previewReviews, setPreviewReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [bloodBankStocks, setBloodBankStocks] = useState<any[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);

  const [compatibleDonorsCount, setCompatibleDonorsCount] = useState(0);
  const [compatibleRequestsCount, setCompatibleRequestsCount] = useState(0);
  const [eligibility, setEligibility] = useState<{ isEligible: boolean; message: string }>({ isEligible: true, message: '' });
  const [hasActiveCommitment, setHasActiveCommitment] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);


  const isDonor = user?.userType === 'donor';
  const isRequester = user?.userType === 'requester';

  useEffect(() => {
    if (user) {
      if (isDonor) {
        loadRecentRequests().catch(e => console.log('Error loading donor requests:', e));
        checkActiveCommitments().catch(e => console.log('Error checking commitments:', e));
        const status = getDonorEligibilityStatus(user.lastDonationDate);
        setEligibility({ isEligible: status.isEligible, message: status.message });
      }
      else if (isRequester) loadRequesterData().catch(e => console.log('Error loading requester data:', e));
      loadUserReviews().catch(e => console.log('Error loading reviews:', e));

      // Initialize notifications once user reaches home
      initNotifications();

      // Notification Response listener for deep-linking
      const responseListener = addNotificationResponseListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.targetScreen) {
          router.push(data.targetScreen as any);
        } else if (data?.type === 'chat') {
          router.push({
            pathname: '/(shared)/chat',
            params: { chatId: data.chatId }
          } as any);
        } else if (data?.type === 'request') {
          router.push(user.userType === 'donor' ? '/(donor)/requests' : '/(requester)/my-requests' as any);
        }
      });

      return () => {
        responseListener.remove();
      };
    }
  }, [isDonor, isRequester, user?.id]);

  // Real-time Notification listener
  useEffect(() => {
    if (!user?.id) return;

    // Track IDs of notifications already processed in this session
    const processedIds = new Set<string>();
    let isInitialLoad = true;

    const unsubscribe = subscribeToUserNotifications(user.id, (notifications: Notification[]) => {
      // If it's the first time onSnapshot returns, mark all existing ones as processed
      if (isInitialLoad) {
        notifications.forEach((n: Notification) => processedIds.add(n.id));
        isInitialLoad = false;
        return;
      }

      // Check for new notifications
      notifications.forEach((n: Notification) => {
        if (!processedIds.has(n.id)) {
          processedIds.add(n.id);
          handleNewNotification(n);
        }
      });
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Real-time Chat Unread listener
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToUserChats(user.id, (chats) => {
      // Deduplicate chats (same as chat-list.tsx) to avoid "phantom" counts from old duplicate chats
      const latestChatsMap = new Map<string, any>();

      chats.forEach(chat => {
        const otherId = chat.participants.find(id => id !== user.id);
        if (!otherId) return;

        const existing = latestChatsMap.get(otherId);
        if (!existing || new Date(chat.lastMessageTime) > new Date(existing.lastMessageTime)) {
          latestChatsMap.set(otherId, chat);
        }
      });

      const total = Array.from(latestChatsMap.values()).reduce((acc, chat) => {
        const count = chat.unreadCount?.[user.id] || 0;
        return acc + count;
      }, 0);

      setUnreadTotal(total);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const handleNewNotification = (notif: Notification) => {
    const { type, title, message, data } = notif;

    // Show alerts for important booking/broadcast events
    if (['booking_confirmed', 'booking_rejected', 'booking_completed', 'hospital_broadcast'].includes(type)) {
      Alert.alert(
        title,
        message,
        type === 'hospital_broadcast'
          ? [
            { text: 'View Request', onPress: () => router.push({ pathname: '/(donor)/requests' as any, params: { requestId: data?.requestId } }) },
            { text: 'Dismiss', style: 'cancel' }
          ]
          : [{ text: 'OK' }]
      );
    }
  };

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
      console.log('Error loading reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const checkActiveCommitments = async () => {
    if (!user || user.userType !== 'donor') return;
    try {
      const { getDonorAcceptedRequests } = await import('@/src/services/firebase/database');
      const commitments = await getDonorAcceptedRequests(user.id);
      const active = commitments.filter(req =>
        ['pending', 'in_progress', 'pending_verification'].includes(req.status)
      );
      setHasActiveCommitment(active.length > 0);
    } catch (error) {
      console.log('Error checking commitments:', error);
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

      const compReqs = await countActiveCompatibleRequests(user.bloodType);
      setCompatibleRequestsCount(compReqs);
    } catch (e) {
      console.log('Error in loadRecentRequests:', e);
    } finally {
      setLoadingRequests(false);
    }
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

      const compDonors = await countAvailableCompatibleDonors(user.bloodType);
      setCompatibleDonorsCount(compDonors);

      // Load blood bank stocks
      loadBloodBankStocks();
    } catch (e) {
      console.log('Error in loadRequesterData:', e);
    } finally {
      setLoadingRequests(false);
      setLoadingDonors(false);
    }
  };

  const loadBloodBankStocks = async () => {
    if (!user) return;
    try {
      setLoadingStocks(true);
      const allBanks = await getBloodBanks();
      const suggestions = allBanks
        .filter(bank => (bank.inventory?.[user.bloodType]?.units || 0) > 0)
        .map(bank => ({
          id: bank.id,
          name: bank.name,
          amount: bank.inventory?.[user.bloodType]?.units || 0,
          location: bank.address
        }))
        .slice(0, 3);
      setBloodBankStocks(suggestions);
    } catch (e) { console.log(e); }
    finally { setLoadingStocks(false); }
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
    try {
      setRefreshing(true);
      if (user) {
        await Promise.all([
          isDonor ? loadRecentRequests() : loadRequesterData(),
          loadUserReviews(),
        ]);
      }
    } catch (e) {
      console.log('Error in onRefresh:', e);
    } finally {
      setTimeout(() => setRefreshing(false), 800);
    }
  }, [isDonor, isRequester, user]);


  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      setIsLoggingOut(true);

      await userLogout();
      router.replace('/(auth)/login' as any);
    } catch (e) {
      console.log('Logout error:', e);
      Alert.alert('Error', 'Failed to logout');
      setIsLoggingOut(false);
    }
  };
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

  const getRatingLabelLocal = (avg: number) => {
    if (avg >= 4.5) return 'Excellent';
    if (avg >= 4.0) return 'Very Good';
    if (avg >= 3.0) return 'Good';
    if (avg >= 2.0) return 'Fair';
    return 'Poor';
  };

  if (!user) return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.primary} />
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  );

  const donorActions = [
    { icon: 'calendar', title: 'Book Donation', clr: ['#10B981', '#059669'] as [string, string], bg: '#F0FDF4', route: '/(donor)/book-donation' },
    { icon: 'notifications', title: 'Requests', clr: [brand.orange, '#C2410C'] as [string, string], bg: brand.orangePale, route: '/(donor)/requests' },
    { icon: 'time', title: 'History', clr: [brand.sky, brand.light] as [string, string], bg: brand.soft, route: '/(donor)/donation-history' },
    { icon: 'business', title: 'Blood Banks', clr: ['#8B5CF6', '#7C3AED'] as [string, string], bg: '#F5F3FF', route: '/(shared)/find-bloodbank' },
    { icon: 'chatbubbles', title: 'Messages', clr: ['#0EA5E9', '#0284C7'] as [string, string], bg: '#F0F9FF', route: '/(shared)/chat-list' },
    { icon: 'book', title: 'Health Guide', clr: ['#EF4444', '#DC2626'] as [string, string], bg: '#FEF2F2', route: '/(shared)/guide' },
  ];
  const requesterActions = [
    { icon: 'add-circle', title: 'New Request', clr: [brand.orange, '#C2410C'] as [string, string], bg: brand.orangePale, route: '/(requester)/needblood' },
    { icon: 'list', title: 'My Requests', clr: [brand.sky, brand.light] as [string, string], bg: brand.soft, route: '/(requester)/my-requests' },
    { icon: 'people', title: 'Find Donors', clr: ['#10B981', '#059669'] as [string, string], bg: '#F0FDF4', route: '/(requester)/find-donors' },
    { icon: 'document-text', title: 'Referrals', clr: ['#F59E0B', '#D97706'] as [string, string], bg: '#FFFBEB', route: '/(requester)/referrals' },
    { icon: 'business', title: 'Blood Banks', clr: ['#8B5CF6', '#7C3AED'] as [string, string], bg: '#F5F3FF', route: '/(shared)/find-bloodbank' },
    { icon: 'chatbubbles', title: 'Messages', clr: ['#0EA5E9', '#0284C7'] as [string, string], bg: '#F0F9FF', route: '/(shared)/chat-list' },
  ];
  const actions = isDonor ? donorActions : requesterActions;

  const features = [
    { icon: 'shield-checkmark', bg: [brand.sky, brand.light] as [string, string], title: 'Verified & Safe', desc: 'Every donor and recipient is identity-verified before going live on the platform.' },
    { icon: 'flash', bg: [brand.orange, brand.orangeDeep] as [string, string], title: 'Real-Time Matching', desc: 'Smart engine connects compatible donors by blood type, location and urgency level.' },
    { icon: 'location', bg: ['#0EA5E9', '#0284C7'] as [string, string], title: 'Location-Aware', desc: 'GPS-powered discovery shows the nearest donors, cutting emergency response time.' },
    { icon: 'trophy', bg: ['#F59E0B', '#D97706'] as [string, string], title: 'Reward System', desc: 'Donors earn points per verified donation. Redeem rewards and unlock community badges.' },
    { icon: 'chatbubbles', bg: ['#8B5CF6', '#7C3AED'] as [string, string], title: 'Direct Messaging', desc: 'Secure in-app chat lets donors and requesters coordinate without any middlemen.' },
    { icon: 'book', bg: [brand.orangeLite, brand.orange] as [string, string], title: 'User Guide', desc: 'Access full online documentation and helpful resources anytime.', onPress: () => Linking.openURL('https://blood-link-webguide.vercel.app/') },
  ];

  const socialLinks = [
    { icon: 'logo-facebook', label: 'Facebook', url: 'https://facebook.com/bloodlinkapp', color: '#1877F2', bg: '#E7F0FD' },
    { icon: 'logo-twitter', label: 'X / Twitter', url: 'https://twitter.com/bloodlinkapp', color: '#0F1419', bg: '#E7E7E7' },
    { icon: 'logo-instagram', label: 'Instagram', url: 'https://instagram.com/bloodlinkapp', color: '#E1306C', bg: '#FCE4EC' },
    { icon: 'logo-whatsapp', label: 'WhatsApp', url: 'https://wa.me/254700000000', color: '#25D366', bg: '#E8F5E9' },
    { icon: 'logo-linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/bloodlinkapp', color: '#0077B5', bg: '#E3F0F8' },
    { icon: 'mail', label: 'Email Us', url: 'mailto:support@bloodlink.co.ke', color: brand.orange, bg: brand.orangePale },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={brand.sky} />

      {/* ══ SIDE DRAWER - IMPROVED VISIBILITY WITH ORIGINAL SIZES ══ */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        <LinearGradient
          colors={isDark ? ['#0F172A', '#1E293B', '#111827'] : [brand.sky, brand.light, '#3B82F6']}
          style={styles.drawerGrad}
        >
          <View style={styles.drawerProfile}>
            <TouchableOpacity style={styles.drawerAvatarWrap} onPress={navigateToProfile} activeOpacity={0.8}>
              {user.profilePicture
                ? <Image source={{ uri: user.profilePicture }} style={styles.drawerAvatarImg} />
                : <LinearGradient
                  colors={[brand.orangeLite, brand.orange]}
                  style={styles.drawerAvatarFallback}
                >
                  <Text style={styles.drawerAvatarInitial}>
                    {user.firstName.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              }
            </TouchableOpacity>
            <Text style={styles.drawerName}>{user.firstName} {user.lastName}</Text>
            <Text style={styles.drawerEmail} numberOfLines={1}>{user.email}</Text>
            <View style={[styles.drawerBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name={isDonor ? 'heart' : 'medkit'} size={13} color="#FFFFFF" />
              <Text style={[styles.drawerBadgeText, { color: '#FFFFFF' }]}>
                {isDonor ? 'Donor' : 'Requester'}
              </Text>
            </View>
          </View>

          {isDonor && (
            <View style={styles.drawerToggleBox}>
              <View style={styles.drawerToggleHeader}>
                <View style={styles.drawerToggleRow}>
                  <Ionicons name="pulse" size={14} color="#FFFFFF" />
                  <Text style={styles.drawerToggleTitle}>Availability Status</Text>
                </View>
              </View>
              <View style={styles.drawerToggleCtrl}>
                <View style={styles.drawerToggleStatus}>
                  <View style={[styles.drawerStatusDot, { backgroundColor: user.isAvailable ? '#10B981' : '#EF4444' }]} />
                  <Text style={styles.drawerToggleLbl}>
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
            <View style={styles.drawerMenu}>
              {[
                {
                  icon: 'person-outline',
                  label: 'My Profile',
                  iconColor: '#FFFFFF',
                  bgColor: 'rgba(255,255,255,0.25)'
                },
                {
                  icon: 'notifications-outline',
                  label: 'Notifications',
                  iconColor: '#FFD700',
                  bgColor: 'rgba(255,215,0,0.25)'
                },
                {
                  icon: 'star-outline',
                  label: 'Ratings & Reviews',
                  iconColor: '#FFB347',
                  bgColor: 'rgba(255,179,71,0.25)'
                },
                {
                  icon: 'information-circle-outline',
                  label: 'About Us',
                  iconColor: '#87CEEB',
                  bgColor: 'rgba(135,206,235,0.25)'
                },
                {
                  icon: 'settings-outline',
                  label: 'Settings',
                  iconColor: '#E0E0E0',
                  bgColor: 'rgba(224,224,224,0.25)'
                },
                {
                  icon: 'chatbubbles-outline',
                  label: 'Messages',
                  iconColor: '#87CEFA',
                  bgColor: 'rgba(135,206,250,0.25)'
                },
                {
                  icon: 'help-circle-outline',
                  label: 'Help & Support',
                  iconColor: '#98FB98',
                  bgColor: 'rgba(152,251,152,0.25)'
                },
              ].map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.drawerMenuItem}
                  onPress={() => {
                    toggleDrawer();
                    if (item.label === 'My Profile') navigateToProfile();
                    else if (item.label === 'Notifications') router.push('/(shared)/notifications' as any);
                    else if (item.label === 'Ratings & Reviews') router.push('/(shared)/allreviews-screen' as any);
                    else if (item.label === 'About Us') router.push('/(shared)/about-us' as any);
                    else if (item.label === 'Settings') router.push('/(shared)/settings' as any);
                    else if (item.label === 'Messages') router.push('/(shared)/chat-list' as any);
                    else if (item.label === 'Help & Support') router.push('/(shared)/help-support' as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.drawerMenuIcon, { backgroundColor: item.bgColor }]}>
                    <Ionicons name={item.icon as any} size={16} color={item.iconColor} />
                    {item.label === 'Messages' && unreadTotal > 0 && (
                      <View style={styles.drawerIconBadge} />
                    )}
                  </View>
                  <Text style={[styles.drawerMenuLabel, { color: '#FFFFFF' }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              ))}

              <View style={styles.drawerDivider} />

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => { toggleDrawer(); handleLogout(); }}
                activeOpacity={0.7}
              >
                <View style={[styles.drawerMenuIcon, { backgroundColor: 'rgba(251,146,60,0.3)' }]}>
                  <Ionicons name="log-out-outline" size={16} color={brand.orangeLite} />
                </View>
                <Text style={[styles.drawerMenuLabel, { color: brand.orangeLite }]}>Logout</Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.drawerCloseBtn} onPress={toggleDrawer}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      {drawerOpen && (
        <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={toggleDrawer} />
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        persistentScrollbar={true}
        indicatorStyle="default"
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[brand.sky]} tintColor={brand.sky} />
        }
      >
        <LinearGradient colors={[brand.sky, brand.light]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.hCircle1} /><View style={styles.hCircle2} />

          <View style={styles.hTopBar}>
            <TouchableOpacity style={styles.menuBtn} onPress={toggleDrawer} activeOpacity={0.7}>
              <View style={[styles.menuLine, { width: 18 }]} />
              <View style={[styles.menuLine, { width: 13 }]} />
            </TouchableOpacity>

            <View style={styles.hBrand}>
              <Image
                source={require('@/assets/images/logo.jpg')}
                style={styles.hBrandIcon}
                resizeMode="cover"
              />
              <View style={styles.hBrandTextContainer}>
                <Text style={styles.hAppName}>BloodLink</Text>
                <Text style={styles.hTagline}>Every Drop Counts</Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => router.push('/(shared)/notifications' as any)} style={styles.hNotifBtn} activeOpacity={0.8}>
              <NotificationBell iconSize={24} iconColor="#FFFFFF" badgeColor={brand.orangeLite} />
            </TouchableOpacity>
          </View>

          <View style={styles.hGreetRow}>
            <View style={styles.hAvatarSmall}>
              {user.profilePicture
                ? <Image source={{ uri: user.profilePicture }} style={styles.hAvatarImg} />
                : <Text style={styles.hAvatarInitial}>{user.firstName.charAt(0).toUpperCase()}</Text>
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hGreeting}>{getGreeting()}, {user.firstName}!</Text>
              <Text style={styles.hRole}>{isDonor ? '💉 Donor' : '🔎 Seeking help'}</Text>
            </View>
            {isDonor ? (
              <View
                style={[styles.statusPill, { backgroundColor: user.isAvailable ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.25)' }]}
              >
                {togglingAvail ? (
                  <ActivityIndicator size="small" color={user.isAvailable ? '#10B981' : '#94A3B8'} style={{ marginRight: 6 }} />
                ) : (
                  <View style={[styles.statusDot, { backgroundColor: user.isAvailable ? '#10B981' : '#94A3B8' }]} />
                )}
                <Text style={[styles.statusPillText, { color: '#FFFFFF' }]}>
                  {togglingAvail ? 'Updating...' : user.isAvailable ? 'Active' : 'Away'}
                </Text>
              </View>
            ) : (
              <View style={[styles.statusPill, { backgroundColor: 'rgba(16,185,129,0.25)' }]}>
                <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.statusPillText, { color: '#FFFFFF' }]}>Online</Text>
              </View>
            )}
          </View>

          <View style={styles.bloodCard}>
            <View style={styles.bloodCardLeft}>
              <View style={styles.bloodTypeCircle}>
                <Ionicons name="water" size={scale(16)} color={brand.orange} />
                <Text style={styles.bloodType}>{user.bloodType}</Text>
              </View>
              <Text style={styles.bloodTypeLabel}>Blood Type</Text>
            </View>
            <View style={styles.bloodCardStats}>
              {isDonor ? (
                <>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconCircle, { backgroundColor: brand.orangePale }]}>
                      <Ionicons name="heart" size={14} color={brand.orange} />
                    </View>
                    <Text style={styles.statValue}>{totalDonations}</Text>
                    <Text style={styles.statLabel}>Donations</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconCircle, { backgroundColor: brand.orangePale }]}>
                      <Ionicons name="star" size={14} color={brand.orange} />
                    </View>
                    <Text style={styles.statValue}>{user.points || 0}</Text>
                    <Text style={styles.statLabel}>Points</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconCircle, { backgroundColor: brand.orangePale }]}>
                      <Ionicons name="time" size={14} color={brand.orange} />
                    </View>
                    <Text style={styles.statValue}>{compatibleRequestsCount}</Text>
                    <Text style={styles.statLabel}>Compatible</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconCircle, { backgroundColor: brand.orangePale }]}>
                      <Ionicons name="people" size={14} color={brand.orange} />
                    </View>
                    <Text style={styles.statValue}>{compatibleDonorsCount}</Text>
                    <Text style={styles.statLabel}>Donors</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconCircle, { backgroundColor: brand.orangePale }]}>
                      <Ionicons name="checkmark-circle" size={14} color={brand.orange} />
                    </View>
                    <Text style={styles.statValue}>{fulfilledRequests}</Text>
                    <Text style={styles.statLabel}>Fulfilled</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconCircle, { backgroundColor: brand.orangePale }]}>
                      <Ionicons name="time" size={14} color={brand.orange} />
                    </View>
                    <Text style={styles.statValue}>{pendingRequests}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* VERIFICATION BANNER */}
        {isDonor && (
          <VerificationBanner
            status={user.verificationStatus}
            userType={user.userType as 'donor' | 'requester'}
            rejectionReason={user.verificationRejectionReason}
          />
        )}

        {/* DONOR STATUS WARNINGS (Synchronized with Requests Screen) */}
        {isDonor && (
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            {hasActiveCommitment ? (
              <LinearGradient colors={['#FEF3C7', '#FFFBEB']} style={styles.warningBanner}>
                <Ionicons name="alert-circle" size={20} color="#D97706" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.warningText}>You have an active donation commitment.</Text>
                  <TouchableOpacity onPress={() => router.push('/(donor)/donation-history' as any)}>
                    <Text style={styles.warningAction}>View Commitments</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            ) : !user.isAvailable ? (
              <LinearGradient colors={['#FEF3C7', '#FFFBEB']} style={styles.warningBanner}>
                <Ionicons name="moon" size={20} color="#D97706" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.warningText}>Your availability is currently turned off.</Text>
                  <TouchableOpacity onPress={() => router.push('/(donor)/profile' as any)}>
                    <Text style={styles.warningAction}>Go to Profile to Change</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            ) : !eligibility.isEligible ? (
              <LinearGradient colors={['#FEE2E2', '#FEF2F2']} style={styles.warningBanner}>
                <Ionicons name="time" size={20} color="#DC2626" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.warningText, { color: '#991B1B' }]}>Not currently eligible to donate.</Text>
                  <TouchableOpacity onPress={() => router.push('/(shared)/guide' as any)}>
                    <Text style={[styles.warningAction, { color: '#DC2626' }]}>View Health Guide</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            ) : null}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHdr}>
            <View style={[styles.sectionBar, { backgroundColor: brand.orange }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          </View>
          <View style={styles.actionsGrid}>
            {actions.slice(0, 6).map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionCard} onPress={() => router.push(a.route as any)} activeOpacity={0.75}>
                <View style={[styles.actionIconBg, { backgroundColor: a.bg }]}>
                  <LinearGradient colors={a.clr} style={styles.actionIconGrad}>
                    <Ionicons name={a.icon as any} size={20} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.actionTitle} numberOfLines={1}>{a.title}</Text>
                {a.title === 'Messages' && unreadTotal > 0 && (
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>{unreadTotal > 9 ? '9+' : unreadTotal}</Text>
                  </View>
                )}
                <LinearGradient colors={a.clr} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionCardAccent} />
              </TouchableOpacity>
            ))}
          </View>

          {!isDonor && (
            <View style={styles.actionsRow3}>
              <TouchableOpacity
                style={[styles.actionCardHalf, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/(shared)/guide')}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIconBg, { backgroundColor: '#FEF2F2' }]}>
                  <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.actionIconGrad}>
                    <Ionicons name="book" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.actionTitle}>Health Guide</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCardHalf, styles.inviteBadge, { backgroundColor: '#ECFDF5' }]}
                onPress={() => router.push('/(shared)/invite')}
                activeOpacity={0.75}
              >
                <LinearGradient colors={['#10B981', '#059669']} style={styles.inviteBadgeGrad}>
                  <Ionicons name="people" size={18} color="#FFFFFF" />
                  <Text style={styles.inviteBadgeText}>Invite a Hero</Text>
                  <Ionicons name="chevron-forward" size={14} color="#FFF" style={{ marginLeft: 'auto' }} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* INVITE BANNER */}
        {isDonor && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.referralBanner}
              activeOpacity={0.9}
              onPress={() => router.push('/(shared)/invite' as any)}
            >
              <LinearGradient colors={['#0D9488', '#0F766E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.referralGrad}>
                <View style={styles.referralContent}>
                  <View style={styles.referralTextSide}>
                    <Text style={styles.referralTitle}>Invite a Hero</Text>
                    <Text style={styles.referralDesc}>Every friend you invite helps build a stronger life-saving community in Kenya.</Text>
                    <View style={styles.referralBadge}>
                      <Ionicons name="heart" size={12} color="#FFF" />
                      <Text style={styles.referralBadgeText}>Save lives together</Text>
                    </View>
                  </View>
                  <View style={styles.referralIconSide}>
                    <Ionicons name="people" size={60} color="rgba(255,255,255,0.2)" style={styles.referralIconLarge} />
                    <View style={styles.referralIconCircle}>
                      <Ionicons name="share-social" size={24} color="#0D9488" />
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {isDonor ? (
          <View style={styles.section}>
            <View style={styles.sectionHdr}>
              <View style={[styles.sectionBar, { backgroundColor: brand.orange }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Urgent Requests Near You</Text>
              <TouchableOpacity onPress={() => router.push('/(donor)/requests' as any)} style={styles.seeAllBtn}>
                <Text style={styles.seeAllText}>View All</Text>
                <Ionicons name="arrow-forward" size={13} color={brand.sky} />
              </TouchableOpacity>
            </View>

            {loadingRequests ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="small" color={brand.orange} />
                <Text style={styles.loadingCardText}>Loading requests…</Text>
              </View>
            ) : recentRequests.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScrollCont} snapToInterval={REQUEST_CARD_WIDTH + 12} decelerationRate="fast">
                {recentRequests.map(req => (
                  <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={[styles.cardStripe, { backgroundColor: getUrgencyColor(req.urgencyLevel, colors) }]} />
                    <TouchableOpacity onPress={handleRequestPress} activeOpacity={0.85}>
                      <View style={styles.requestHdrCompact}>
                        <View style={styles.requestHdrLeft}>
                          <Text style={[styles.reqBloodTypeSmall, { color: colors.text }]}>{req.bloodType}</Text>
                          <Text style={[styles.reqBloodLabelSmall, { color: colors.textSecondary }]}>needed</Text>
                        </View>
                        <View style={[styles.urgencyBadgeSmall, { backgroundColor: getUrgencyColor(req.urgencyLevel, colors) + '18', borderColor: getUrgencyColor(req.urgencyLevel, colors) }]}>
                          <Text style={[styles.urgencyTextSmall, { color: getUrgencyColor(req.urgencyLevel, colors) }]}>{req.urgencyLevel.toUpperCase()}</Text>
                        </View>
                      </View>
                      <View style={styles.requestBodyCompact}>
                        {[
                          { icon: 'business', val: req.hospitalName || 'Medical Center' },
                          { icon: 'location', val: req.location?.city || 'Nearby' },
                        ].map((row, ri) => (
                          <View key={ri} style={styles.reqRowCompact}>
                            <Ionicons name={row.icon as any} size={11} color={colors.textSecondary} />
                            <Text style={[styles.reqTextSmall, { color: colors.textSecondary }]} numberOfLines={1}>{row.val}</Text>
                          </View>
                        ))}
                      </View>
                      <LinearGradient colors={[brand.orange, '#C2410C']} style={styles.cardFooterSmall}>
                        <Text style={styles.cardFooterTextSmall}>Respond</Text>
                        <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <LinearGradient colors={[brand.orangePale, '#FED7AA']} style={styles.emptyIconBox}>
                  <Ionicons name="heart-outline" size={42} color={brand.orange} />
                </LinearGradient>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Urgent Requests</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>We'll notify you when someone needs your blood type</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHdr}>
              <View style={[styles.sectionBar, { backgroundColor: brand.sky }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Donors</Text>
              <TouchableOpacity onPress={() => router.push('/(requester)/find-donors' as any)} style={styles.seeAllBtn}>
                <Text style={styles.seeAllText}>View All</Text>
                <Ionicons name="arrow-forward" size={13} color={brand.sky} />
              </TouchableOpacity>
            </View>

            {loadingDonors ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="small" color={brand.sky} />
                <Text style={styles.loadingCardText}>Loading donors…</Text>
              </View>
            ) : availableDonors.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScrollCont} snapToInterval={DONOR_CARD_WIDTH + 16} decelerationRate="fast">
                {availableDonors.map(donor => (
                  <View key={donor.id} style={[styles.donorCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <TouchableOpacity onPress={() => handleDonorPress(donor)} activeOpacity={0.85}>
                      <View style={styles.donorHdrCompact}>
                        {donor.profilePicture
                          ? <Image source={{ uri: donor.profilePicture }} style={styles.donorAvatarCompact} />
                          : <LinearGradient colors={[brand.sky, brand.light]} style={styles.donorAvatarFallbackCompact}>
                            <Text style={styles.donorInitialsCompact}>{getInitials(donor.firstName, donor.lastName)}</Text>
                          </LinearGradient>
                        }
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.donorNameCompact, { color: colors.text }]} numberOfLines={1}>{donor.firstName}</Text>
                          <View style={styles.donorBloodBadgeCompact}>
                            <Ionicons name="water" size={10} color={brand.orange} />
                            <Text style={styles.donorBloodTypeCompact}>{donor.bloodType}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.donorStatsBoxCompact}>
                        <View style={styles.donorStatCompact}>
                          <Text style={[styles.donorStatValCompact, { color: colors.text }]}>{donor.totalDonations || 0}</Text>
                          <Text style={[styles.donorStatLblCompact, { color: colors.textSecondary }]}>Donations</Text>
                        </View>
                        <View style={styles.donorStatDivCompact} />
                        <View style={styles.donorStatCompact}>
                          <Text style={[styles.donorStatValCompact, { color: brand.orange }]}>{donor.points || 0}</Text>
                          <Text style={[styles.donorStatLblCompact, { color: colors.textSecondary }]}>Points</Text>
                        </View>
                      </View>

                      {donor.location?.city && (
                        <View style={styles.donorLocCompact}>
                          <Ionicons name="location" size={12} color={brand.sky} />
                          <Text style={[styles.donorLocTextCompact, { color: colors.textSecondary }]} numberOfLines={1}>{donor.location.city}</Text>
                        </View>
                      )}

                      <LinearGradient colors={[brand.sky, brand.light]} style={styles.donorFooterCompact}>
                        <Text style={styles.donorFooterTextCompact}>View Profile</Text>
                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <LinearGradient colors={[brand.soft, '#BFDBFE']} style={styles.emptyIconBox}>
                  <Ionicons name="people-outline" size={42} color={brand.sky} />
                </LinearGradient>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Available Donors</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Check back later or browse all donors</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(requester)/find-donors' as any)}>
                  <LinearGradient colors={[brand.sky, brand.light]} style={styles.emptyBtnGrad}>
                    <Text style={styles.emptyBtnText}>Browse Donors</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Blood Bank Stock Suggestions for Requesters */}
            <View style={{ marginTop: 24 }}>
              <View style={styles.sectionHdr}>
                <View style={[styles.sectionBar, { backgroundColor: brand.sky }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Nearby Stocks for {user.bloodType}</Text>
                <TouchableOpacity onPress={() => router.push('/(shared)/find-bloodbank' as any)} style={styles.seeAllBtn}>
                  <Text style={styles.seeAllText}>Find More</Text>
                  <Ionicons name="location" size={13} color={brand.sky} />
                </TouchableOpacity>
              </View>

              {loadingStocks ? (
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="small" color={brand.sky} />
                </View>
              ) : bloodBankStocks.length > 0 ? (
                <View style={styles.stockGrid}>
                  {bloodBankStocks.map(stock => (
                    <TouchableOpacity
                      key={stock.id}
                      style={[styles.stockCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                      onPress={() => router.push('/(shared)/find-bloodbank' as any)}
                    >
                      <View style={styles.stockIcon}>
                        <Ionicons name="business" size={18} color={brand.sky} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stockName, { color: colors.text }]} numberOfLines={1}>{stock.name}</Text>
                        <Text style={[styles.stockLoc, { color: colors.textSecondary }]} numberOfLines={1}>{stock.location}</Text>
                      </View>
                      <View style={styles.stockAmountBadge}>
                        <Text style={styles.stockAmountText}>{stock.amount}U</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={[styles.emptyStateMinimal, { backgroundColor: colors.surface }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>No nearby stocks found for {user.bloodType}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <DashboardInsights
          user={user}
          onDonorRequestPress={(id: string) => router.push({ pathname: '/(donor)/request-details' as any, params: { requestId: id } })}
          onSeeAllUrgentNeeds={() => router.push(isDonor ? '/(donor)/requests' : '/(requester)/my-requests' as any)}
          onSeeAllDemand={() => router.push(isDonor ? '/(shared)/find-bloodbank' : '/(requester)/needblood' as any)}
          onSeeAllNearby={() => router.push(isDonor ? '/(shared)/find-bloodbank' : '/(requester)/find-donors' as any)}
        />

        <View style={styles.section}>
          <View style={styles.sectionHdr}>
            <View style={[styles.sectionBar, { backgroundColor: brand.sky }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{isDonor ? 'Donation Tips' : 'Helpful Guidance'}</Text>
          </View>
          <View style={[styles.tipsCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
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
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipIconWrap}>
                  <Ionicons name={item.icon as any} size={15} color={brand.sky} />
                </View>
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>{item.tip}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHdr}>
            <View style={[styles.sectionBar, { backgroundColor: brand.sky }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Community Stories</Text>
            <TouchableOpacity onPress={handleViewAllReviews} style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={13} color={brand.sky} />
            </TouchableOpacity>
          </View>

          {loadingReviews ? (
            <View style={styles.ratingBannerSkeleton}>
              <ActivityIndicator size="small" color={brand.sky} />
              <Text style={styles.loadingCardText}>Loading ratings…</Text>
            </View>
          ) : totalReviews > 0 ? (
            <TouchableOpacity style={[styles.ratingBanner, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]} onPress={handleViewAllReviews} activeOpacity={0.8}>
              <View style={styles.ratingScoreCircle}>
                <Text style={styles.ratingScoreValue}>{averageRating.toFixed(1)}</Text>
                <Text style={styles.ratingScoreMax}>/5</Text>
              </View>
              <View style={styles.ratingBannerMid}>
                <Text style={[styles.ratingBannerLabel, { color: colors.text }]}>{getRatingLabelLocal(averageRating)}</Text>
                <View style={styles.ratingBannerStars}>
                  {renderStarsLocal(averageRating, 14)}
                </View>
                <Text style={[styles.ratingBannerCount, { color: colors.textSecondary }]}>
                  Based on {totalReviews} verified review{totalReviews !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.ratingBannerArrow}>
                <Ionicons name="chevron-forward" size={20} color={brand.sky} />
              </View>
            </TouchableOpacity>
          ) : null}

          {loadingReviews ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={brand.sky} />
              <Text style={styles.loadingCardText}>Loading reviews…</Text>
            </View>
          ) : previewReviews.length > 0 ? (
            <>
              <View style={styles.reviewsRow}>
                {previewReviews.map((review, i) => (
                  <View key={review.id || i} style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={styles.reviewQuoteBg}>
                      <Text style={styles.reviewQuoteChar}>"</Text>
                    </View>
                    <View style={styles.reviewCardHeader}>
                      <LinearGradient
                        colors={review.userType === 'donor' ? [brand.orange, '#C2410C'] : [brand.sky, brand.light]}
                        style={styles.reviewAvatar}
                      >
                        <Text style={styles.reviewAvatarLetter}>
                          {review.userName?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      </LinearGradient>
                      <View style={styles.reviewCardMeta}>
                        <Text style={[styles.reviewCardName, { color: colors.text }]}>
                          {review.userName || 'Anonymous'}
                        </Text>
                        <View style={styles.reviewCardRoleRow}>
                          <Ionicons
                            name={review.userType === 'donor' ? 'heart' : 'medkit'}
                            size={10}
                            color={review.userType === 'donor' ? brand.orange : brand.sky}
                          />
                          <Text style={[styles.reviewCardRole, { color: review.userType === 'donor' ? brand.orange : brand.sky }]}>
                            {review.userType === 'donor' ? 'Donor' : 'Requester'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {review.bloodType && (
                      <View style={styles.reviewBloodBadge}>
                        <Ionicons name="water" size={9} color="#FFFFFF" />
                        <Text style={styles.reviewBloodBadgeText}>{review.bloodType}</Text>
                      </View>
                    )}
                    <View style={styles.reviewStarsRow}>
                      {renderStarsLocal(review.rating || 5, 12)}
                    </View>
                    <Text style={[styles.reviewText, { color: colors.textSecondary }]} numberOfLines={5}>
                      {review.review}
                    </Text>
                    {review.category && (
                      <View style={styles.reviewCategoryChip}>
                        <Text style={styles.reviewCategoryText}>#{review.category}</Text>
                      </View>
                    )}
                  </View>
                ))}
                {previewReviews.length === 1 && (
                  <TouchableOpacity
                    style={[styles.reviewCard, styles.reviewCardCta, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                    onPress={() => router.push('/(shared)/rate-app' as any)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={[brand.sky, brand.light]} style={styles.reviewCtaGrad}>
                      <Ionicons name="create-outline" size={28} color="#FFFFFF" />
                      <Text style={styles.reviewCtaText}>Write a Review</Text>
                      <Text style={styles.reviewCtaSub}>Share your experience with the community</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={styles.viewAllReviewsBtn} onPress={handleViewAllReviews} activeOpacity={0.8}>
                <LinearGradient colors={[brand.sky, brand.light]} style={styles.viewAllReviewsGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="star" size={16} color="#FFFFFF" />
                  <Text style={styles.viewAllReviewsText}>
                    View All {totalReviews} Review{totalReviews !== 1 ? 's' : ''}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <LinearGradient colors={[brand.soft, '#BFDBFE']} style={styles.emptyIconBox}>
                <Ionicons name="star-outline" size={42} color={brand.sky} />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Reviews Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Be the first to share your experience!</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(shared)/rate-app' as any)}>
                <LinearGradient colors={[brand.sky, brand.light]} style={styles.emptyBtnGrad}>
                  <Text style={styles.emptyBtnText}>Write a Review</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Impact Stats */}
          <LinearGradient colors={[brand.sky, brand.light]} style={styles.impactCard}>
            <Text style={styles.impactCardTitle}>Our Impact Together</Text>
            <View style={styles.impactStatsRow}>
              <View style={styles.impactStatItem}>
                <Text style={styles.impactStatValue}>10,000+</Text>
                <Text style={styles.impactStatLabel}>Active Donors</Text>
              </View>
              <View style={styles.impactStatDivider} />
              <View style={styles.impactStatItem}>
                <Text style={styles.impactStatValue}>4,500+</Text>
                <Text style={styles.impactStatLabel}>Lives Saved</Text>
              </View>
              <View style={styles.impactStatDivider} />
              <View style={styles.impactStatItem}>
                <Text style={styles.impactStatValue}>47</Text>
                <Text style={styles.impactStatLabel}>Counties</Text>
              </View>
            </View>
            <Text style={styles.impactCardSubtext}>Every donation makes a difference. Join our life-saving community today.</Text>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHdr}>
            <View style={[styles.sectionBar, { backgroundColor: brand.orange }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About BloodLink</Text>
          </View>

          {/* Streamlined About Us Section */}
          <View style={styles.aboutSection}>
            {/* Mission Hero - Restored & Refined */}
            <LinearGradient
              colors={[isDark ? '#1E293B' : '#F8FAFC', isDark ? '#0F172A' : '#F1F5F9']}
              style={[styles.missionHero, { borderColor: colors.surfaceBorder }]}
            >
              <View style={styles.missionQuoteIcon}>
                <Ionicons name="chatbubble-ellipses" size={24} color={brand.orange} />
              </View>
              <Text style={[styles.missionHeroText, { color: colors.text }]}>
                Bridging the gap between <Text style={{ color: brand.orange, fontWeight: '800' }}>donors</Text> and <Text style={{ color: brand.sky, fontWeight: '800' }}>patients</Text> across Kenya.
              </Text>
              <View style={styles.missionDivider} />
              <Text style={[styles.missionHeroSub, { color: colors.textSecondary }]}>
                We leverage technology to ensure reaching donors and managing blood requests is easier than ever, creating a seamless, verified, and efficient lifesaving network.
              </Text>
            </LinearGradient>

            <View style={styles.aboutList}>
              {features.map((f, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.aboutItem}
                  onPress={f.onPress}
                  disabled={!f.onPress}
                  activeOpacity={0.7}
                >
                  <LinearGradient colors={f.bg} style={styles.aboutItemIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name={f.icon as any} size={16} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.aboutItemText}>
                    <Text style={styles.aboutItemTitle}>{f.title}</Text>
                    <Text style={styles.aboutItemDesc}>{f.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.aboutWhoHeading}>Who We Serve</Text>
            <View style={styles.aboutWhoRow}>
              {[
                { label: 'Donors', icon: 'heart', tint: brand.orange },
                { label: 'Patients', icon: 'medkit', tint: brand.sky },
                { label: 'Hospitals', icon: 'business', tint: '#16A34A' }
              ].map((item, i) => (
                <View key={i} style={styles.aboutWhoItem}>
                  <View style={styles.aboutWhoCircle}>
                    <Ionicons name={item.icon as any} size={20} color={item.tint} />
                  </View>
                  <Text style={styles.aboutWhoLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.aboutSocialHeader}>Connect With Us</Text>
            <View style={styles.aboutSocialRow}>
              {socialLinks.map((link, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.aboutSocialIcon}
                  onPress={() => Linking.openURL(link.url)}
                >
                  <Ionicons name={link.icon as any} size={18} color={link.color} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.aboutVersion}>
              <Text style={styles.aboutVersionText}>
                BloodLink v2.1.0 · Made with ❤️ in Kenya 🇰🇪
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <LogoutModal
        visible={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onLogout={handleConfirmLogout}
        isLoggingOut={isLoggingOut}
      />
    </SafeAreaView >
  );
}


const getStyles = (colors: any, insets: any, isDark: boolean, brand: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: DRAWER_WIDTH, zIndex: 1000, ...shadow('#000', 0.2, 16, 12) },
  drawerGrad: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 36, paddingBottom: 24 },
  drawerProfile: { alignItems: 'center', paddingHorizontal: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)' },
  drawerAvatarWrap: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)', overflow: 'hidden', marginBottom: 10 },
  drawerAvatarImg: { width: '100%', height: '100%' },
  drawerAvatarFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
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
  drawerMenu: { flex: 1, marginTop: 16, paddingHorizontal: 10, justifyContent: 'space-between', paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  drawerMenuIcon: {
    width: 21,
    height: 21,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  drawerMenuLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  drawerIconBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#3B82F6', // Matches drawer background
  },
  drawerMenuBadge: { backgroundColor: '#DC2626', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 6 },
  drawerMenuBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  drawerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 10 },
  drawerCloseBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 44 : 28, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  drawerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999 },

  actionBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: '#DC2626', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 10, borderWidth: 1.5, borderColor: colors.surface, minWidth: 18, alignItems: 'center' },
  actionBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },

  header: { paddingHorizontal: moderateScale(18), paddingTop: verticalScale(4), paddingBottom: verticalScale(12), borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', position: 'relative' },
  hCircle1: { position: 'absolute', width: scale(160), height: scale(160), borderRadius: scale(80), backgroundColor: 'rgba(255,255,255,0.05)', top: -50, right: -40 },
  hCircle2: { position: 'absolute', width: scale(100), height: scale(100), borderRadius: scale(50), backgroundColor: 'rgba(255,255,255,0.06)', bottom: 10, left: -25 },
  hTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  menuBtn: { width: scale(42), height: scale(42), borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 12 },
  menuLine: { height: 2.5, borderRadius: 2, backgroundColor: '#FFFFFF' },
  hBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  hBrandIcon: {
    width: scale(48),
    height: scale(62),
    borderRadius: 8,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 0px 20px rgba(128, 128, 128, 0.3), 0px 0px 10px rgba(160, 160, 160, 0.15)',
      } as any
      : {
        shadowColor: '#A0A0A0',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
      }),
  },
  hBrandTextContainer: { alignItems: 'center' },
  hAppName: { fontSize: moderateScale(18), fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.4 },
  hTagline: { fontSize: moderateScale(8), fontWeight: '700', color: 'rgba(255,255,255,0.88)', letterSpacing: 1.6, marginTop: 0 },
  hNotifBtn: { width: scale(44), height: scale(44), borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  hGreetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  hAvatarSmall: { width: scale(36), height: scale(36), borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', overflow: 'hidden' },
  hAvatarImg: { width: '100%', height: '100%' },
  hAvatarInitial: { fontSize: moderateScale(14), fontWeight: '800', color: '#FFFFFF' },
  hGreeting: { fontSize: moderateScale(14), fontWeight: '800', color: '#FFFFFF', marginBottom: 1 },
  hRole: { fontSize: moderateScale(10), color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  bloodCard: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...(isDark ? {} : shadow('#000', 0.1, 10, 2))
  },
  warningBanner: {
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  warningText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  warningAction: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  bloodCardLeft: { alignItems: 'center' },
  bloodTypeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? colors.surface : '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: isDark ? colors.primary + '40' : 'rgba(255,255,255,0.5)',
    ...shadow(brand.orange, 0.15, 5, 2)
  },
  bloodType: { fontSize: 16, fontWeight: '900', color: isDark ? colors.primary : brand.orange, marginTop: 1 },
  bloodTypeLabel: { fontSize: 7, fontWeight: '700', color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.9)', marginTop: 1, letterSpacing: 0.5 },
  bloodCardStats: { flex: 1, flexDirection: 'row', gap: 8 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statIconCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginBottom: 1 },
  statLabel: { fontSize: 8, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textAlign: 'center' },


  section: { marginTop: 6, paddingHorizontal: 16 },
  sectionHdr: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  sectionBar: { width: 3, height: 18, borderRadius: 1.5 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  seeAllText: { fontSize: 13, fontWeight: '700', color: colors.primary },


  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  actionCard: {
    width: (SCREEN_WIDTH - 32 - 8 - 8) / 3,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
    ...shadow(brand.sky, 0.08, 12, 4)
  },
  actionIconBg: { width: 48, height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: colors.surfaceAlt },
  actionIconGrad: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center', lineHeight: 14 },
  actionCardAccent: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  actionsScroll: { marginTop: 12 },
  actionsScrollContent: { gap: 12, paddingRight: 16 },
  actionCardHorizontal: {
    width: (SCREEN_WIDTH - 32 - 14) / 3.4,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadow(colors.primary, 0.08, 12, 4)
  },


  hScrollCont: { paddingRight: 20, gap: 16 },
  cardStripe: { height: 5, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  cardFooterText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  requestCard: { width: REQUEST_CARD_WIDTH, borderRadius: 16, backgroundColor: colors.surface, overflow: 'hidden', borderWidth: 1, borderColor: colors.surfaceBorder, ...shadow('#000', 0.08, 10, 3) },
  requestHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  reqBloodType: { fontSize: 28, fontWeight: '900', color: colors.text },
  reqBloodLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', marginTop: -1 },
  urgencyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 2 },
  urgencyText: { fontSize: 10, fontWeight: '800' },
  requestBody: { padding: 16, gap: 12 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reqRowIcon: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  reqText: { fontSize: 13, color: colors.textSecondary, flex: 1, fontWeight: '500' },

  donorCard: { width: DONOR_CARD_WIDTH, borderRadius: 16, backgroundColor: colors.surface, overflow: 'hidden', borderWidth: 1, borderColor: colors.surfaceBorder, ...shadow('#000', 0.06, 8, 3) },
  donorHdrCompact: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 10, paddingTop: 12 },
  donorAvatarCompact: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: brand.sky },
  donorAvatarFallbackCompact: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  donorInitialsCompact: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  donorNameCompact: { fontSize: 11, fontWeight: '800', color: colors.text },
  donorBloodBadgeCompact: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: brand.orangePale, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  donorBloodTypeCompact: { fontSize: 10, fontWeight: '800', color: brand.orange },
  donorStatsBoxCompact: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 8, marginHorizontal: 10, marginBottom: 8 },
  donorStatCompact: { flex: 1, alignItems: 'center' },
  donorStatValCompact: { fontSize: 13, fontWeight: '800', color: colors.text },
  donorStatLblCompact: { fontSize: 8, color: colors.textSecondary, fontWeight: '700', marginTop: 1 },
  donorStatDivCompact: { width: 1, height: 20, backgroundColor: colors.divider },
  donorLocCompact: { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 10, marginBottom: 10 },
  donorLocTextCompact: { fontSize: 10, color: colors.textSecondary, flex: 1, fontWeight: '600' },
  donorFooterCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  donorFooterTextCompact: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },

  // Referral Banner
  referralBanner: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 4,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  referralGrad: {
    padding: 8,
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referralTextSide: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 0,
  },
  referralDesc: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
    lineHeight: 13,
  },
  referralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  referralBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 5,
  },
  referralIconSide: {
    width: 80,
    alignItems: 'flex-end',
    position: 'relative',
  },
  referralIconLarge: {
    position: 'absolute',
    right: -10,
    top: -5,
  },
  referralIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionsRow3: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  actionCardHalf: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadow('#000', 0.05, 8, 3),
  },
  inviteBadge: {
    borderWidth: 1,
    borderColor: '#10B98133',
    overflow: 'hidden',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  inviteBadgeGrad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  inviteBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  ratingBannerSkeleton: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: colors.surfaceBorder },
  ratingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.primary + '33', gap: 12, ...shadow(colors.primary, 0.1, 8, 2) },
  ratingScoreCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', ...shadow(colors.primary, 0.35, 10, 5) },
  ratingScoreValue: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', lineHeight: 30 },
  ratingScoreMax: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '700', alignSelf: 'flex-end', marginBottom: 4 },
  ratingBannerMid: { flex: 1, gap: 4 },
  ratingBannerLabel: { fontSize: 18, fontWeight: '900', color: colors.text },
  ratingBannerStars: { flexDirection: 'row', gap: 3 },
  ratingBannerCount: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  ratingBannerArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },

  reviewsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  reviewCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: colors.surfaceBorder, overflow: 'hidden', position: 'relative', ...shadow('#000', 0.05, 6, 2) },
  reviewCardCta: { padding: 0, overflow: 'hidden' },
  reviewCtaGrad: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 10, borderRadius: 16 },
  reviewCtaText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  reviewCtaSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 16 },
  reviewQuoteBg: { position: 'absolute', top: -4, right: 8 },
  reviewQuoteChar: { fontSize: 72, fontWeight: '900', color: colors.surfaceAlt, lineHeight: 72 },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  reviewAvatarLetter: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  reviewCardMeta: { flex: 1, minWidth: 0 },
  reviewCardName: { fontSize: 12, fontWeight: '800', color: colors.text, marginBottom: 2 },
  reviewCardRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reviewCardRole: { fontSize: 10, fontWeight: '700' },
  reviewBloodBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: brand.orange, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  reviewBloodBadgeText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF' },
  reviewStarsRow: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  reviewText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, fontStyle: 'italic', flex: 1 },
  reviewCategoryChip: { marginTop: 8, backgroundColor: colors.primary + '1a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  reviewCategoryText: { fontSize: 10, fontWeight: '700', color: colors.primary },

  viewAllReviewsBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 16, ...shadow(colors.primary, 0.2, 10, 4) },
  viewAllReviewsGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  viewAllReviewsText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', flex: 1, textAlign: 'center' },

  impactCard: { borderRadius: 14, padding: 16, marginTop: 4, ...shadow(colors.primary, 0.1, 10, 3) },
  impactCardTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 12, textAlign: 'center' },
  impactStatsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  impactStatItem: { flex: 1, alignItems: 'center' },
  impactStatValue: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  impactStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textAlign: 'center' },
  impactStatDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.25)' },
  impactCardSubtext: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 20 },

  loadingCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  loadingCardText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  emptyState: { backgroundColor: colors.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 14 },
  emptyIconBox: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 18, borderRadius: 12, overflow: 'hidden' },
  emptyBtnGrad: { paddingVertical: 12, paddingHorizontal: 24 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  emptyStateMinimal: { padding: 20, alignItems: 'center', borderRadius: 12 },

  stockGrid: { gap: 12 },
  stockCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, gap: 12, ...shadow('#000', 0.04, 8, 2) },
  stockIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: brand.soft, justifyContent: 'center', alignItems: 'center' },
  stockName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  stockLoc: { fontSize: 11, fontWeight: '500' },
  stockAmountBadge: { backgroundColor: brand.orange, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  stockAmountText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },

  tipsCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.surfaceBorder, ...shadow(colors.primary, 0.05, 6, 2) },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  tipIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  tipText: { fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 20, fontWeight: '500' },

  missionCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.surfaceBorder, ...shadow(colors.primary, 0.05, 6, 2) },
  missionQuote: { fontSize: 20, fontWeight: '900', color: brand.orange, marginBottom: 10, letterSpacing: 0.3 },
  missionText: { fontSize: 13, color: colors.textSecondary, lineHeight: 21 },


  featGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  featCard: {

    width: FEAT_CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadow(colors.primary, 0.05, 6, 2),
  },
  featIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  featTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 5 },
  featDesc: { fontSize: 11, color: colors.textSecondary, lineHeight: 17 },


  serveCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.surfaceBorder, ...shadow(colors.primary, 0.05, 6, 2) },
  serveHeading: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
  serveRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  serveItem: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  serveItemFull: { borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  serveItemTitle: { fontSize: 13, fontWeight: '700', color: '#0C1A3A', marginBottom: 6, marginTop: 10, textAlign: 'center' },
  serveItemDesc: { fontSize: 11, color: '#475569', lineHeight: 17, textAlign: 'center' },


  socialCard: { backgroundColor: colors.surface, borderRadius: 14, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.surfaceBorder, ...shadow(colors.primary, 0.05, 6, 2) },
  socialHeader: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceAlt },
  socialHeaderIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  socialHeaderTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  socialHeaderSub: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2, letterSpacing: 0.7 },
  socialBody: { padding: 16 },
  socialBodyText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  socialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 16 },
  socialItem: { width: (SCREEN_WIDTH - 40 - 32 - 42) / 3, alignItems: 'center', gap: 8 },
  socialIconCircle: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', ...shadow('#000', 0.05, 4, 2) },
  socialLabel: { fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' },
  hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hashtagChip: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.divider },
  hashtagText: { fontSize: 11, fontWeight: '600', color: colors.primary },

  // VERSION
  versionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  versionDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: brand.orange },
  versionText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },

  // COMPACT URGENT REQUEST STYLES
  requestHdrCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  requestHdrLeft: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  reqBloodTypeSmall: { fontSize: 20, fontWeight: '900' },
  reqBloodLabelSmall: { fontSize: 8, fontWeight: '700', marginBottom: 2 },
  urgencyBadgeSmall: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  urgencyTextSmall: { fontSize: 8, fontWeight: '800' },
  requestBodyCompact: { padding: 10, gap: 6 },
  reqRowCompact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reqTextSmall: { fontSize: 10, fontWeight: '600', flex: 1 },
  cardFooterSmall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  cardFooterTextSmall: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },

  // STREAMLINED ABOUT US STYLES
  aboutSection: {
    marginTop: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadow('#000', 0.06, 12, 4)
  },
  missionHero: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 20, position: 'relative', overflow: 'hidden' },
  missionQuoteIcon: { position: 'absolute', top: -8, left: -8, opacity: 0.1 },
  missionHeroText: { fontSize: 16, fontWeight: '700', lineHeight: 24, textAlign: 'center', marginBottom: 12 },
  missionDivider: { width: 30, height: 3, borderRadius: 1.5, backgroundColor: brand.orange, alignSelf: 'center', marginBottom: 12 },
  missionHeroSub: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  aboutList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20, justifyContent: 'space-between' },
  aboutItem: { width: '48%', flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  aboutItemIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  aboutItemText: { flex: 1 },
  aboutItemTitle: { fontSize: 11, fontWeight: '800', color: colors.text, marginBottom: 2 },
  aboutItemDesc: { fontSize: 9, color: colors.textSecondary, lineHeight: 12 },

  aboutWhoHeading: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 12, textAlign: 'center' },
  aboutWhoRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 20 },
  aboutWhoItem: { alignItems: 'center', gap: 6, flex: 1 },
  aboutWhoCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', ...shadow('#000', 0.05, 5, 2) },
  aboutWhoLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },

  aboutSocialHeader: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10, textAlign: 'center' },
  aboutSocialRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 16 },
  aboutSocialIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#1E293B' : '#FFFFFF', ...shadow('#000', 0.04, 4, 2) },

  aboutVersion: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12, alignItems: 'center' },
  aboutVersionText: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
});