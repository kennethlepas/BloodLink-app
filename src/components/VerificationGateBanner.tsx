import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { useCachedData } from '@/src/hooks/useCachedData';
import { getUserBloodRequests } from '@/src/services/firebase/database';
import { BloodRequest } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type VerifStatus = 'unsubmitted' | 'pending' | 'approved' | 'rejected' | undefined | null;

interface BannerConfig {
  gradient: [string, string];
  icon: string;
  title: string;
  body: string;
  cta: string | null;
  pillLabel: string;
  pillColor: string;
}

function getConfig(
  status: VerifStatus,
  userType: 'donor' | 'requester',
  rejectionReason?: string,
  isRequestVerification?: boolean
): BannerConfig {
  if (isRequestVerification && userType === 'requester') {
    switch (status) {
      case 'pending':
        return {
          gradient: ['#78350F', '#B45309'],
          icon: 'hourglass-outline',
          title: 'Request Under Review',
          body: "Our team is reviewing your clinical documents for this blood request.",
          cta: 'View My Requests →',
          pillLabel: 'Verifying',
          pillColor: '#FCD34D',
        };
      case 'rejected':
        return {
          gradient: ['#7F1D1D', '#B91C1C'],
          icon: 'close-circle-outline',
          title: 'Request Rejected',
          body: rejectionReason
            ? `Reason: ${rejectionReason}`
            : 'Your blood request verification was not approved. Tap to see details.',
          cta: 'Check Details →',
          pillLabel: 'Action Needed',
          pillColor: '#FCA5A5',
        };
      default:
        // This case shouldn't be hit for isRequestVerification
        return {
          gradient: ['#5F1E1E', '#DC2626'],
          icon: 'shield-outline',
          title: 'Blood Request Verification',
          body: 'Create a request and upload the required documents for verification.',
          cta: 'My Requests →',
          pillLabel: 'Status',
          pillColor: '#FCA5A5',
        };
    }
  }

  switch (status) {
    case 'pending':
      return {
        gradient: ['#78350F', '#B45309'],
        icon: 'hourglass-outline',
        title: 'Verification Under Review',
        body: "Our team is reviewing your documents. You'll be notified within 24–48 hours.",
        cta: null,
        pillLabel: 'Under Review',
        pillColor: '#FCD34D',
      };
    case 'rejected':
      return {
        gradient: ['#7F1D1D', '#B91C1C'],
        icon: 'close-circle-outline',
        title: 'Verification Rejected',
        body: rejectionReason
          ? `Reason: ${rejectionReason}\n\nPlease re-submit with the correct documents.`
          : 'Your verification was not approved. Please re-submit with the correct documents.',
        cta: 'Re-Submit Documents →',
        pillLabel: 'Action Needed',
        pillColor: '#FCA5A5',
      };
    default:
      return {
        gradient: userType === 'donor' ? ['#1E3A5F', '#2563EB'] : ['#5F1E1E', '#DC2626'],
        icon: 'shield-outline',
        title: 'Complete Your Verification',
        body: userType === 'donor'
          ? 'Verify your identity to start accepting donation requests and help save lives.'
          : 'Verify your identity to start creating blood requests and finding donors.',
        cta: 'Get Verified Now →',
        pillLabel: 'Unverified',
        pillColor: userType === 'donor' ? '#93C5FD' : '#FCA5A5',
      };
  }
}

interface Props {
  style?: any;
}

export default function VerificationGateBanner({ style }: Props) {
  const { user } = useUser();
  const router = useRouter();
  const { isDark } = useAppTheme();

  if (!user) return null;
  // Only show for donors and requesters
  if (user.userType !== 'donor' && user.userType !== 'requester') return null;

  const isRequester = user.userType === 'requester';

  // Fetch requests for requesters to determine banner state
  const { data: requests } = useCachedData<BloodRequest[]>(
    `user_requests_${user.id}`,
    () => getUserBloodRequests(user.id),
    { enabled: isRequester }
  );

  let bannerConfig: BannerConfig | null = null;
  let handlePressAction: () => void = () => { };

  if (isRequester) {
    if (!requests || requests.length === 0) return null;

    // Prioritize 'rejected' requests for the banner
    const rejectedReq = requests.find(r => r.verificationStatus === 'rejected');
    const pendingReq = requests.find(r => r.verificationStatus === 'pending');

    if (rejectedReq) {
      bannerConfig = getConfig('rejected', 'requester', rejectedReq.verificationRejectionReason, true);
      handlePressAction = () => router.push('/(requester)/my-requests' as any);
    } else if (pendingReq) {
      bannerConfig = getConfig('pending', 'requester', undefined, true);
      handlePressAction = () => router.push('/(requester)/my-requests' as any);
    } else {
      // All requests are either approved or don't have a verification status (old requests)
      return null;
    }
  } else {
    // Donor logic (account-level)
    const status = user.verificationStatus as VerifStatus;
    if (status === 'approved') return null;

    bannerConfig = getConfig(status, user.userType, user.verificationRejectionReason);
    handlePressAction = () => {
      if (!bannerConfig?.cta) return;
      router.push('/(shared)/donor-verification' as any);
    };
  }

  if (!bannerConfig) return null;

  return (
    <TouchableOpacity
      activeOpacity={bannerConfig.cta ? 0.82 : 1}
      onPress={handlePressAction}
      style={[styles.wrapper, { opacity: isDark ? 0.95 : 1 }, style]}
    >
      <LinearGradient
        colors={bannerConfig.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.bgCircle} />

        <View style={styles.iconWrap}>
          <Ionicons name={bannerConfig.icon as any} size={26} color="#FFFFFF" />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>{bannerConfig.title}</Text>
          <Text style={styles.body}>{bannerConfig.body}</Text>

          {bannerConfig.cta && (
            <View style={styles.ctaRow}>
              <View style={styles.ctaBtn}>
                <Text style={styles.ctaText}>{bannerConfig.cta}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.pill}>
          <View style={[styles.pillDot, { backgroundColor: bannerConfig.pillColor }]} />
          <Text style={styles.pillText}>{bannerConfig.pillLabel}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14 },
      android: { elevation: 8 },
    }),
  },
  gradient: {
    padding: 18,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  bgCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -50,
    right: -40,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    fontWeight: '500',
  },
  ctaRow: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  ctaBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  pill: {
    position: 'absolute',
    top: 12,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});