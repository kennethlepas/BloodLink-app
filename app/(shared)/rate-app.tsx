import { useUser } from '@/src/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Brand Colors ─────────────────────────────────────────────────────────
const B_SKY    = '#1D4ED8';
const B_LIGHT  = '#2563EB';
const B_MID    = '#3B82F6';
const B_SOFT   = '#60A5FA';
const B_PALE   = '#DBEAFE';
const B_BG     = '#EFF6FF';
const O_DEEP   = '#C2410C';
const O_MID    = '#EA580C';
const O_LITE   = '#FB923C';
const O_PALE   = '#FFF7ED';
const SUCCESS  = '#10B981';
const SUCCESS_PALE = '#D1FAE5';
const DANGER   = '#EF4444';
const SURFACE  = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MID  = '#475569';
const TEXT_SOFT = '#94A3B8';
const BORDER   = '#E2E8F0';
const BG_LIGHT = '#F8FAFC';

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

export default function RateAppScreen() {
  const { user } = useUser();
  const router = useRouter();
  
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isDonor = user?.userType === 'donor';

  const feedbackCategories = [
    { id: 'easy', label: 'Easy to Use', icon: 'checkmark-circle' },
    { id: 'helpful', label: 'Very Helpful', icon: 'heart' },
    { id: 'fast', label: 'Fast Response', icon: 'flash' },
    { id: 'reliable', label: 'Reliable', icon: 'shield-checkmark' },
    { id: 'recommend', label: 'Would Recommend', icon: 'thumbs-up' },
  ];

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }
    if (review.trim().length < 10) {
      Alert.alert('Review Too Short', 'Please write at least 10 characters to help us improve.');
      return;
    }
    if (!user?.id || !user?.userType || !user?.bloodType || !user?.firstName || !user?.lastName) {
      Alert.alert('Error', 'User information is incomplete. Please try logging in again.');
      return;
    }

    try {
      setSubmitting(true);
      const reviewData = {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userType: user.userType as 'donor' | 'requester',
        bloodType: user.bloodType,
        rating,
        review: review.trim(),
        category: selectedCategory,
        createdAt: new Date().toISOString(),
        status: 'pending' as const,
      };

      const { addReview } = await import('@/src/services/firebase/database');
      await addReview(reviewData);

      Alert.alert(
        'Thank You! 🎉',
        'Your review has been submitted successfully. It will be visible after approval.',
        [{ text: 'OK', onPress: () => router.back() }]
      );

      setRating(0);
      setReview('');
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Submission Failed', 'Unable to submit your review. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = () => {
    const r = hoveredRating || rating;
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'];
    const colors = ['', DANGER, O_LITE, '#F59E0B', B_MID, SUCCESS];
    return { label: labels[r] || 'Tap a star to rate', color: colors[r] || TEXT_SOFT };
  };

  const { label: ratingLabel, color: ratingColor } = getRatingLabel();

  const renderStars = () => (
    <View style={s.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = star <= (hoveredRating || rating);
        return (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            onPressIn={() => setHoveredRating(star)}
            onPressOut={() => setHoveredRating(0)}
            activeOpacity={0.7}
            style={s.starButton}
          >
            <Ionicons
              name={isActive ? 'star' : 'star-outline'}
              size={46}
              color={isActive ? '#F59E0B' : '#CBD5E1'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={B_SKY} />

      {/* Header */}
      <LinearGradient colors={[B_SKY, B_MID]} style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Rate BloodLink</Text>
          <Text style={s.headerSub}>Share your experience</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView style={s.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Hero Banner */}
          <LinearGradient colors={[O_PALE, '#FED7AA']} style={s.heroBanner}>
            <View style={s.heroRow}>
              <View style={s.heroIconWrap}>
                <LinearGradient colors={[O_MID, O_LITE]} style={s.heroIconGrad}>
                  <Ionicons name="heart" size={28} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={s.heroTextWrap}>
                <Text style={s.heroTitle}>Help Us Improve!</Text>
                <Text style={s.heroSub}>Your feedback helps us serve the community better</Text>
              </View>
            </View>
            {/* Stats row */}
            <View style={s.heroStats}>
              <View style={s.heroStatItem}>
                <Ionicons name="star" size={16} color={O_MID} />
                <Text style={s.heroStatText}>Reviewed by community</Text>
              </View>
              <View style={s.heroStatDot} />
              <View style={s.heroStatItem}>
                <Ionicons name="shield-checkmark" size={16} color={O_MID} />
                <Text style={s.heroStatText}>Admin approved</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Rating Card */}
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <View style={s.cardIconBadge}>
                <Ionicons name="star" size={18} color={B_MID} />
              </View>
              <Text style={s.cardTitle}>Overall Rating</Text>
            </View>
            <Text style={s.cardSub}>How would you rate your experience?</Text>
            {renderStars()}
            <View style={[s.ratingLabelWrap, { borderColor: ratingColor + '40', backgroundColor: ratingColor + '10' }]}>
              <Text style={[s.ratingLabel, { color: ratingColor }]}>{ratingLabel}</Text>
              {(hoveredRating || rating) > 0 && (
                <Text style={[s.ratingStarCount, { color: ratingColor }]}>
                  {hoveredRating || rating}/5
                </Text>
              )}
            </View>
          </View>

          {/* Category Selection */}
          {rating > 0 && (
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <View style={s.cardIconBadge}>
                  <Ionicons name="list" size={18} color={B_MID} />
                </View>
                <View>
                  <Text style={s.cardTitle}>What did you like most?</Text>
                  <Text style={s.optionalTag}>Optional · Select one</Text>
                </View>
              </View>
              <View style={s.categoriesGrid}>
                {feedbackCategories.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[s.categoryChip, isActive && s.categoryChipActive]}
                      onPress={() => setSelectedCategory(isActive ? null : cat.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[s.chipIconWrap, isActive && s.chipIconWrapActive]}>
                        <Ionicons
                          name={cat.icon as any}
                          size={15}
                          color={isActive ? '#FFFFFF' : B_MID}
                        />
                      </View>
                      <Text style={[s.categoryChipText, isActive && s.categoryChipTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Review Text */}
          {rating > 0 && (
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <View style={s.cardIconBadge}>
                  <Ionicons name="create" size={18} color={B_MID} />
                </View>
                <View>
                  <Text style={s.cardTitle}>Write Your Review</Text>
                  <Text style={s.optionalTag}>Minimum 10 characters</Text>
                </View>
              </View>
              <TextInput
                style={s.textArea}
                value={review}
                onChangeText={setReview}
                placeholder={
                  isDonor
                    ? 'e.g., The app made it easy to connect with people in need...'
                    : 'e.g., I found a donor quickly and saved my loved one...'
                }
                placeholderTextColor={TEXT_SOFT}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={500}
              />
              <View style={s.charCountRow}>
                <View style={[s.charProgressBar]}>
                  <View style={[s.charProgressFill, { 
                    width: `${(review.length / 500) * 100}%` as any,
                    backgroundColor: review.length >= 10 ? SUCCESS : TEXT_SOFT
                  }]} />
                </View>
                <Text style={[s.charCount, { color: review.length >= 10 ? SUCCESS : TEXT_SOFT }]}>
                  {review.length}/500
                </Text>
              </View>
            </View>
          )}

          {/* Review Preview */}
          {rating > 0 && review.trim().length >= 10 && (
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <View style={s.cardIconBadge}>
                  <Ionicons name="eye" size={18} color={B_MID} />
                </View>
                <Text style={s.cardTitle}>Preview</Text>
              </View>
              <View style={s.previewCard}>
                <View style={s.previewHeaderRow}>
                  <View style={s.previewAvatarWrap}>
                    {user?.profilePicture ? (
                      <Image source={{ uri: user.profilePicture }} style={s.previewAvatarImg} />
                    ) : (
                      <LinearGradient colors={[B_SKY, B_MID]} style={s.previewAvatarFallback}>
                        <Text style={s.previewAvatarLetter}>{user?.firstName?.charAt(0)}</Text>
                      </LinearGradient>
                    )}
                    <View style={s.bloodTypeBadge}>
                      <Text style={s.bloodTypeBadgeText}>{user?.bloodType}</Text>
                    </View>
                  </View>
                  <View style={s.previewUserInfo}>
                    <Text style={s.previewName}>{user?.firstName} {user?.lastName}</Text>
                    {/* Blood Type Label */}
                    <View style={s.bloodTypeRow}>
                      <Ionicons name="water" size={11} color={DANGER} />
                      <Text style={s.bloodTypeLabel}>Blood Type: {user?.bloodType}</Text>
                    </View>
                    <View style={s.previewRoleRow}>
                      <Ionicons name={isDonor ? 'heart' : 'medkit'} size={11} color={B_MID} />
                      <Text style={s.previewRole}>{isDonor ? 'Donor' : 'Requester'}</Text>
                    </View>
                  </View>
                  <View style={s.previewStars}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons key={i} name={i < rating ? 'star' : 'star-outline'} size={13} color="#F59E0B" />
                    ))}
                  </View>
                </View>
                {selectedCategory && (
                  <View style={s.previewCategory}>
                    <Ionicons name="pricetag" size={12} color={B_MID} />
                    <Text style={s.previewCategoryText}>
                      {feedbackCategories.find(c => c.id === selectedCategory)?.label}
                    </Text>
                  </View>
                )}
                <Text style={s.previewText} numberOfLines={4}>{review}</Text>
              </View>
              <View style={s.pendingNote}>
                <Ionicons name="time-outline" size={15} color={B_MID} />
                <Text style={s.pendingNoteText}>Pending admin review before publishing</Text>
              </View>
            </View>
          )}

          {/* Submit Button */}
          {rating > 0 && (
            <TouchableOpacity
              style={[s.submitBtn, (submitting || review.trim().length < 10) && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || review.trim().length < 10}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={submitting || review.trim().length < 10 ? ['#94A3B8', '#64748B'] : [B_SKY, B_MID]}
                style={s.submitGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {submitting ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={s.submitText}>Submitting...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                    <Text style={s.submitText}>Submit Review</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Why It Matters */}
          <View style={s.benefitsCard}>
            <View style={s.benefitsTitleRow}>
              <LinearGradient colors={[B_SKY, B_MID]} style={s.benefitsTitleIcon}>
                <Ionicons name="heart" size={14} color="#FFFFFF" />
              </LinearGradient>
              <Text style={s.benefitsTitle}>Why Your Review Matters</Text>
            </View>
            {[
              { icon: 'people', text: 'Helps new users trust the platform', color: B_MID },
              { icon: 'trending-up', text: 'Improves our services over time', color: SUCCESS },
              { icon: 'heart', text: 'Encourages others to donate blood', color: DANGER },
              { icon: 'star', text: 'Builds a stronger community', color: '#F59E0B' },
            ].map((b, i) => (
              <View key={i} style={s.benefitRow}>
                <View style={[s.benefitIcon, { backgroundColor: b.color + '15' }]}>
                  <Ionicons name={b.icon as any} size={16} color={b.color} />
                </View>
                <Text style={s.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_LIGHT },
  keyboardAvoid: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },

  // Hero Banner
  heroBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 14,
    borderRadius: 18,
    padding: 18,
    ...shadow(O_MID, 0.15, 14, 4),
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  heroIconWrap: { ...shadow(O_MID, 0.25, 8, 3) },
  heroIconGrad: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextWrap: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: O_DEEP, marginBottom: 4 },
  heroSub: { fontSize: 13, color: '#78350F', lineHeight: 18 },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
  },
  heroStatItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroStatText: { fontSize: 12, color: O_DEEP, fontWeight: '600' },
  heroStatDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: O_MID },

  // Card Base
  card: {
    backgroundColor: SURFACE,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    ...shadow('#000', 0.07, 10, 3),
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  cardIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: B_PALE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  cardSub: { fontSize: 13, color: TEXT_MID, marginBottom: 4, marginLeft: 44 },
  optionalTag: { fontSize: 11, color: TEXT_SOFT, marginTop: 1 },

  // Stars
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 16,
    paddingVertical: 8,
    backgroundColor: BG_LIGHT,
    borderRadius: 14,
  },
  starButton: { padding: 4 },
  ratingLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  ratingLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  ratingStarCount: { fontSize: 13, fontWeight: '600' },

  // Categories
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: B_PALE,
    borderWidth: 1.5,
    borderColor: B_SOFT,
  },
  categoryChipActive: { backgroundColor: B_SKY, borderColor: B_SKY },
  chipIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipIconWrapActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  categoryChipText: { fontSize: 12, fontWeight: '700', color: B_SKY },
  categoryChipTextActive: { color: '#FFFFFF' },

  // Text Area
  textArea: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: TEXT_DARK,
    backgroundColor: BG_LIGHT,
    minHeight: 120,
    textAlignVertical: 'top',
    marginTop: 10,
    lineHeight: 20,
  },
  charCountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  charProgressBar: {
    flex: 1,
    height: 3,
    backgroundColor: BORDER,
    borderRadius: 2,
    overflow: 'hidden',
  },
  charProgressFill: { height: '100%', borderRadius: 2 },
  charCount: { fontSize: 11, fontWeight: '600' },

  // Preview
  previewCard: {
    backgroundColor: BG_LIGHT,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 10,
  },
  previewHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  previewAvatarWrap: { position: 'relative' },
  previewAvatarImg: { width: 46, height: 46, borderRadius: 23 },
  previewAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewAvatarLetter: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  bloodTypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: DANGER,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    ...shadow(DANGER, 0.3, 4, 2),
  },
  bloodTypeBadgeText: { fontSize: 8, fontWeight: '900', color: '#FFFFFF' },
  previewUserInfo: { flex: 1 },
  previewName: { fontSize: 14, fontWeight: '800', color: TEXT_DARK, marginBottom: 3 },
  bloodTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 },
  bloodTypeLabel: { fontSize: 11, color: DANGER, fontWeight: '700' },
  previewRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  previewRole: { fontSize: 11, color: B_MID, fontWeight: '600' },
  previewStars: { flexDirection: 'row', gap: 1, marginTop: 2 },
  previewCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: B_PALE,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  previewCategoryText: { fontSize: 11, color: B_SKY, fontWeight: '700' },
  previewText: { fontSize: 13, color: TEXT_MID, lineHeight: 19, fontStyle: 'italic' },
  pendingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 10,
    backgroundColor: B_PALE,
    borderRadius: 9,
  },
  pendingNoteText: { fontSize: 12, color: B_SKY, fontWeight: '500', flex: 1 },

  // Submit
  submitBtn: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    ...shadow(B_SKY, 0.3, 14, 5),
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },

  // Benefits
  benefitsCard: {
    backgroundColor: SURFACE,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    ...shadow('#000', 0.06, 8, 2),
  },
  benefitsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  benefitsTitleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitsTitle: { fontSize: 15, fontWeight: '800', color: TEXT_DARK },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: { fontSize: 13, color: TEXT_MID, flex: 1, fontWeight: '500' },
});