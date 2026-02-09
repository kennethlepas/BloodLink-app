import { db } from '@/src/services/firebase/firebase';
import { User } from '@/src/types/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { notifyDonorEligibleToDonate } from '../notification/notificationService';

// ============================================================================
// DONATION ELIGIBILITY CHECKER
// Checks if donors are eligible to donate again and sends notifications
// ============================================================================

const DONATION_INTERVAL_DAYS = 56; // 8 weeks between donations (standard for whole blood)

/**
 * Calculate if donor is eligible to donate based on last donation date
 */
export const isDonorEligible = (lastDonationDate?: string): boolean => {
  if (!lastDonationDate) return true;

  const lastDonation = new Date(lastDonationDate);
  const now = new Date();
  const daysSinceLastDonation = Math.floor(
    (now.getTime() - lastDonation.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceLastDonation >= DONATION_INTERVAL_DAYS;
};

/**
 * Get the next eligible donation date
 */
export const getNextEligibleDate = (lastDonationDate?: string): Date | null => {
  if (!lastDonationDate) return null;

  const lastDonation = new Date(lastDonationDate);
  const nextEligibleDate = new Date(lastDonation);
  nextEligibleDate.setDate(nextEligibleDate.getDate() + DONATION_INTERVAL_DAYS);

  return nextEligibleDate;
};

/**
 * Calculate days until next eligible donation
 */
export const getDaysUntilEligible = (lastDonationDate?: string): number => {
  if (!lastDonationDate) return 0;

  const nextEligibleDate = getNextEligibleDate(lastDonationDate);
  if (!nextEligibleDate) return 0;

  const now = new Date();
  const daysRemaining = Math.ceil(
    (nextEligibleDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, daysRemaining);
};

/**
 * Check all donors and notify those who became eligible to donate
 * This should be run periodically (e.g., daily via a scheduled job)
 */
export const checkAndNotifyEligibleDonors = async (): Promise<void> => {
  try {
    console.log('🔍 Checking for newly eligible donors...');

    // Get all active donors
    const donorsQuery = query(
      collection(db, 'users'),
      where('userType', '==', 'donor'),
      where('isActive', '==', true)
    );

    const donorsSnapshot = await getDocs(donorsQuery);
    const donors = donorsSnapshot.docs.map((doc) => doc.data() as User);

    console.log(`📊 Found ${donors.length} active donors to check`);

    let notificationsSent = 0;

    for (const donor of donors) {
      // Skip if no last donation date (they're already eligible)
      if (!donor.lastDonationDate) continue;

      const nextEligibleDate = getNextEligibleDate(donor.lastDonationDate);
      if (!nextEligibleDate) continue;

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Check if they became eligible within the last 24 hours
      if (nextEligibleDate <= now && nextEligibleDate > oneDayAgo) {
        try {
          await notifyDonorEligibleToDonate(
            donor.id,
            `${donor.firstName} ${donor.lastName}`
          );
          notificationsSent++;
          console.log(`✅ Notified donor: ${donor.firstName} ${donor.lastName}`);
        } catch (error) {
          console.error(`❌ Failed to notify donor ${donor.id}:`, error);
        }
      }
    }

    console.log(`✅ Donation eligibility check complete. Sent ${notificationsSent} notifications.`);
  } catch (error) {
    console.error('❌ Error checking eligible donors:', error);
    throw error;
  }
};

/**
 * Get donor eligibility status for UI display
 */
export const getDonorEligibilityStatus = (lastDonationDate?: string) => {
  if (!lastDonationDate) {
    return {
      isEligible: true,
      message: 'You are eligible to donate blood',
      daysRemaining: 0,
      nextEligibleDate: null,
    };
  }

  const isEligible = isDonorEligible(lastDonationDate);
  const daysRemaining = getDaysUntilEligible(lastDonationDate);
  const nextEligibleDate = getNextEligibleDate(lastDonationDate);

  if (isEligible) {
    return {
      isEligible: true,
      message: 'You are eligible to donate blood',
      daysRemaining: 0,
      nextEligibleDate: null,
    };
  }

  return {
    isEligible: false,
    message: `You can donate again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
    daysRemaining,
    nextEligibleDate,
  };
};

/**
 * Schedule donation eligibility check (to be called on app startup or in background)
 * In a production app, this would be handled by a backend cron job or cloud function
 */
export const scheduleDonationEligibilityCheck = () => {
  // Check immediately on startup
  checkAndNotifyEligibleDonors().catch(console.error);

  // Then check every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    checkAndNotifyEligibleDonors().catch(console.error);
  }, TWENTY_FOUR_HOURS);

  console.log('📅 Donation eligibility checker scheduled');
};