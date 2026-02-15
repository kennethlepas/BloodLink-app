import { getUserReviews } from '@/src/services/firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const RATING_PROMPT_KEY = '@bloodlink_rating_prompted';
const RATING_SUBMITTED_KEY = '@bloodlink_rating_submitted';

/**
 * Check if user should be prompted to rate the app
 * Returns true if user hasn't been prompted before OR hasn't submitted a review
 */
export const shouldPromptForRating = async (userId: string): Promise<boolean> => {
  try {
    // Check if user has already submitted a review
    const hasSubmitted = await AsyncStorage.getItem(RATING_SUBMITTED_KEY);
    if (hasSubmitted === 'true') {
      return false; // Don't prompt if already submitted
    }

    // Double-check in database
    const userReviews = await getUserReviews(userId);
    if (userReviews.length > 0) {
      // User has a review in database, mark as submitted
      await AsyncStorage.setItem(RATING_SUBMITTED_KEY, 'true');
      return false;
    }

    // Check if user has been prompted before
    const hasBeenPrompted = await AsyncStorage.getItem(RATING_PROMPT_KEY);
    if (hasBeenPrompted === 'true') {
      return false; // Don't prompt again
    }

    return true; // User should be prompted
  } catch (error) {
    console.error('Error checking rating prompt status:', error);
    return false;
  }
};

/**
 * Mark that user has been prompted to rate
 */
export const markAsPrompted = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(RATING_PROMPT_KEY, 'true');
  } catch (error) {
    console.error('Error marking as prompted:', error);
  }
};

/**
 * Mark that user has submitted a rating
 */
export const markRatingSubmitted = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(RATING_SUBMITTED_KEY, 'true');
    await AsyncStorage.setItem(RATING_PROMPT_KEY, 'true');
  } catch (error) {
    console.error('Error marking rating as submitted:', error);
  }
};

/**
 * Reset rating prompt status (for testing purposes)
 */
export const resetRatingPrompt = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RATING_PROMPT_KEY);
    await AsyncStorage.removeItem(RATING_SUBMITTED_KEY);
  } catch (error) {
    console.error('Error resetting rating prompt:', error);
  }
};

/**
 * Show rating prompt to user
 * @param navigation - Navigation object to navigate to rating screen
 * @param userId - Current user ID
 * @param onDismiss - Optional callback when user dismisses prompt
 */
export const showRatingPrompt = async (
  navigation: any,
  userId: string,
  onDismiss?: () => void
): Promise<void> => {
  const shouldPrompt = await shouldPromptForRating(userId);
  
  if (!shouldPrompt) {
    return;
  }

  Alert.alert(
    'Enjoying BloodLink? 🩸',
    'Your feedback helps us improve and encourages others to join our life-saving community. Would you like to rate the app?',
    [
      {
        text: 'Not Now',
        style: 'cancel',
        onPress: async () => {
          await markAsPrompted();
          onDismiss?.();
        },
      },
      {
        text: 'Rate App',
        style: 'default',
        onPress: async () => {
          await markAsPrompted();
          navigation.push('/(shared)/rate-app');
        },
      },
    ],
    { cancelable: true }
  );
};