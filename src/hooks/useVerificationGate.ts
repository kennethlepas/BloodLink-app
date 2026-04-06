import { useUser } from '@/src/contexts/UserContext';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

export type GateReason = 'unsubmitted' | 'pending' | 'rejected' | 'unavailable';

export type GateResult =
  | { allowed: true }
  | { allowed: false; reason: GateReason };

export interface GateOptions {
  actionLabel?: string;
  skipAvailabilityCheck?: boolean;
}

export default function useVerificationGate() {
  const { user } = useUser();
  const router = useRouter();

  const checkDonorReady = (options: GateOptions = {}): GateResult => {
    if (!user || user.userType !== 'donor') return { allowed: true };

    const action = options.actionLabel ?? 'perform this action';

    if (!user.verificationStatus || user.verificationStatus === 'unsubmitted') {
      Alert.alert(
        '🔐 Verification Required',
        `You must complete identity verification before you can ${action}.\n\nIt takes just a few minutes and keeps our community safe.`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Get Verified Now',
            onPress: () => router.push('/(shared)/donor-verification' as any),
          },
        ]
      );
      return { allowed: false, reason: 'unsubmitted' };
    }

    if (user.verificationStatus === 'pending') {
      Alert.alert(
        '⏳ Verification Pending',
        `Your documents are under review. Our team typically responds within 24–48 hours.\n\nYou'll be notified as soon as your account is approved.`,
        [{ text: 'OK' }]
      );
      return { allowed: false, reason: 'pending' };
    }

    if (user.verificationStatus === 'rejected') {
      const reasonLine = user.verificationRejectionReason
        ? `\n\nReason: ${user.verificationRejectionReason}`
        : '';
      Alert.alert(
        '❌ Verification Rejected',
        `Your verification was not approved.${reasonLine}\n\nPlease re-submit with the correct documents.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Re-Submit',
            onPress: () => router.push('/(shared)/donor-verification' as any),
          },
        ]
      );
      return { allowed: false, reason: 'rejected' };
    }

    if (!options.skipAvailabilityCheck && !user.isAvailable) {
      Alert.alert(
        '🔴 You Are Unavailable',
        `You must mark yourself as available before you can ${action}.\n\nToggle your availability from the home screen or your profile.`,
        [{ text: 'OK' }]
      );
      return { allowed: false, reason: 'unavailable' };
    }

    return { allowed: true };
  };

  const checkRequesterReady = (options: GateOptions = {}): GateResult => {
    // Requesters no longer need account-level verification as each request is verified individually
    return { allowed: true };
  };

  const isDonorReady = (skipAvailabilityCheck = false): boolean => {
    if (!user || user.userType !== 'donor') return true;
    const verified = user.verificationStatus === 'approved';
    if (!verified) return false;
    if (!skipAvailabilityCheck && !user.isAvailable) return false;
    return true;
  };

  const isRequesterReady = (): boolean => {
    // Requesters are always ready at the account level; verification happens per request
    return true;
  };

  return { checkDonorReady, isDonorReady, checkRequesterReady, isRequesterReady };
}