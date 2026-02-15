import { useUser } from '@/src/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const B_SKY    = '#2563EB';
const B_LIGHT  = '#3B82F6';
const B_SOFT   = '#60A5FA';
const B_PALE   = '#DBEAFE';
const B_BG     = '#EFF6FF';

export default function AllReviewsScreen() {
  const { user } = useUser();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [filter, setFilter] = useState<'all' | 5 | 4 | 3 | 2 | 1>('all');
  const [ratingBreakdown, setRatingBreakdown] = useState({
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0
  });

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const { getApprovedReviews, getAverageRating } = await import('@/src/services/firebase/database');
      
      const allReviews = await getApprovedReviews(100); // Get up to 100 reviews
      const ratingData = await getAverageRating();
      
      setReviews(allReviews);
      setAverageRating(ratingData.average);
      setTotalReviews(ratingData.count);
      
      // Calculate rating breakdown
      const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      allReviews.forEach((review: any) => {
        const rating = review.rating || 5;
        breakdown[rating as keyof typeof breakdown]++;
      });
      setRatingBreakdown(breakdown);
      
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  const getFilteredReviews = () => {
    if (filter === 'all') return reviews;
    return reviews.filter(r => r.rating === filter);
  };

  const filteredReviews = getFilteredReviews();

  const renderReviewItem = ({ item }: { item: any }) => (
    <View style={s.reviewCard}>
      <View style={s.reviewHeader}>
        <View style={s.avatarWrapper}>
          <LinearGradient colors={[B_SKY, B_LIGHT]} style={s.avatarFallback}>
            <Text style={s.avatarInitial}>{item.userName?.charAt(0) || 'U'}</Text>
          </LinearGradient>
          <View style={s.bloodTypeBadge}>
            <Text style={s.bloodTypeBadgeText}>{item.bloodType}</Text>
          </View>
        </View>
        <View style={s.reviewInfo}>
          <Text style={s.reviewName}>{item.userName || 'Anonymous'}</Text>
          <View style={s.reviewMeta}>
            <View style={s.roleTag}>
              <Ionicons 
                name={item.userType === 'donor' ? 'heart' : 'medkit'} 
                size={10} 
                color={item.userType === 'donor' ? '#EA580C' : B_SKY} 
              />
              <Text style={s.roleText}>
                {item.userType === 'donor' ? 'Donor' : 'Requester'}
              </Text>
            </View>
            <Text style={s.reviewDate}>
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.stars}>
        {[...Array(5)].map((_, i) => (
          <Ionicons 
            key={i} 
            name={i < item.rating ? 'star' : 'star-outline'} 
            size={16} 
            color={i < item.rating ? '#F59E0B' : '#CBD5E1'} 
          />
        ))}
      </View>

      <Text style={s.reviewText}>{item.review}</Text>

      {item.category && (
        <View style={s.categoryTag}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={s.categoryText}>{getCategoryLabel(item.category)}</Text>
        </View>
      )}
    </View>
  );

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      easy: 'Easy to Use',
      helpful: 'Very Helpful',
      fast: 'Fast Response',
      reliable: 'Reliable',
      recommend: 'Would Recommend',
    };
    return labels[category] || category;
  };

  const renderRatingBar = (rating: number) => {
    const count = ratingBreakdown[rating as keyof typeof ratingBreakdown];
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

    return (
      <TouchableOpacity
        key={rating}
        style={s.ratingBarRow}
        onPress={() => setFilter(filter === rating ? 'all' : rating as any)}
        activeOpacity={0.7}
      >
        <View style={s.ratingBarLabel}>
          <Text style={s.ratingBarNumber}>{rating}</Text>
          <Ionicons name="star" size={14} color="#F59E0B" />
        </View>
        <View style={s.ratingBarTrack}>
          <View 
            style={[s.ratingBarFill, { width: `${percentage}%` }]} 
          />
        </View>
        <Text style={s.ratingBarCount}>{count}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={B_SKY} />

      {/* Header */}
      <LinearGradient colors={[B_SKY, B_LIGHT]} style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity
            style={s.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Reviews & Ratings</Text>
          <TouchableOpacity
            style={s.addReviewButton}
            onPress={() => router.push('/(shared)/rate-app' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Overall Rating Card */}
        <View style={s.overallCard}>
          <View style={s.overallLeft}>
            <Text style={s.overallNumber}>{averageRating.toFixed(1)}</Text>
            <View style={s.overallStars}>
              {[...Array(5)].map((_, i) => (
                <Ionicons 
                  key={i} 
                  name={i < Math.floor(averageRating) ? 'star' : 'star-outline'} 
                  size={14} 
                  color="#F59E0B" 
                />
              ))}
            </View>
            <Text style={s.overallSubtext}>{totalReviews} review{totalReviews !== 1 ? 's' : ''}</Text>
          </View>

          <View style={s.overallRight}>
            {[5, 4, 3, 2, 1].map(rating => renderRatingBar(rating))}
          </View>
        </View>
      </LinearGradient>

      {/* Filter Pills */}
      <View style={s.filterContainer}>
        <TouchableOpacity
          style={[s.filterPill, filter === 'all' && s.filterPillActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[s.filterPillText, filter === 'all' && s.filterPillTextActive]}>
            All ({reviews.length})
          </Text>
        </TouchableOpacity>
        {[5, 4, 3, 2, 1].map(rating => (
          <TouchableOpacity
            key={rating}
            style={[s.filterPill, filter === rating && s.filterPillActive]}
            onPress={() => setFilter(rating as any)}
          >
            <Ionicons 
              name="star" 
              size={12} 
              color={filter === rating ? '#FFFFFF' : '#F59E0B'} 
            />
            <Text style={[s.filterPillText, filter === rating && s.filterPillTextActive]}>
              {rating} ({ratingBreakdown[rating as keyof typeof ratingBreakdown]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reviews List */}
      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={B_SKY} />
          <Text style={s.loadingText}>Loading reviews...</Text>
        </View>
      ) : filteredReviews.length > 0 ? (
        <FlatList
          data={filteredReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[B_SKY]}
              tintColor={B_SKY}
            />
          }
        />
      ) : (
        <View style={s.emptyState}>
          <View style={s.emptyIconBox}>
            <Ionicons name="star-outline" size={60} color="#CBD5E1" />
          </View>
          <Text style={s.emptyTitle}>No Reviews Yet</Text>
          <Text style={s.emptyText}>
            {filter === 'all' 
              ? 'Be the first to share your experience!' 
              : `No ${filter}-star reviews yet`}
          </Text>
          <TouchableOpacity
            style={s.emptyButton}
            onPress={() => router.push('/(shared)/rate-app' as any)}
          >
            <LinearGradient colors={[B_SKY, B_LIGHT]} style={s.emptyButtonGrad}>
              <Ionicons name="star" size={20} color="#FFFFFF" />
              <Text style={s.emptyButtonText}>Write a Review</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: B_BG },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  addReviewButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Overall Rating Card
  overallCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 20,
    gap: 20,
    ...shadow(B_SKY, 0.15, 12, 4),
  },
  overallLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  overallNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: B_SKY,
    marginBottom: 8,
  },
  overallStars: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 6,
  },
  overallSubtext: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  overallRight: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },

  // Rating Bars
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ratingBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    width: 40,
  },
  ratingBarNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  ratingBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  ratingBarCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    width: 30,
    textAlign: 'right',
  },

  // Filter Pills
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexWrap: 'wrap',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: B_SKY,
    borderColor: B_SKY,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  // Reviews List
  listContent: {
    padding: 16,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadow('#000', 0.08, 10, 3),
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bloodTypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#EA580C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bloodTypeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  reviewInfo: {
    flex: 1,
  },
  reviewName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C1A3A',
    marginBottom: 4,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  reviewDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...shadow(B_SKY, 0.2, 12, 4),
  },
  emptyButtonGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});