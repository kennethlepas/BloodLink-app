/**
 * Dashboard Insights Section
 * 
 * Integrates computed insights into the Home/Dashboard screen.
 * Displays horizontal scrollable carousels for modern swipe interactions.
 */

import { useAppTheme } from '@/src/contexts/ThemeContext';
import { BloodType, User } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
    DonorInsights,
    getUserInsights,
    RequesterInsights,
} from '../../services/insights';
import {
    ImpactCard,
    NearbyCard,
    RequestActivityCard
} from './InsightCards';
import {
    CarouselSection,
    DemandCarousel,
    InsightsCarousel,
    QuickStatsRow
} from './InsightCarousel';

interface DashboardInsightsProps {
    user: User;
    onDonorRequestPress?: (requestId: string) => void;
    onBloodTypeDemandPress?: (bloodType: BloodType) => void;
    onSeeAllUrgentNeeds?: () => void;
    onSeeAllDemand?: () => void;
    onSeeAllNearby?: () => void;
}

export const DashboardInsights: React.FC<DashboardInsightsProps> = ({
    user,
    onDonorRequestPress,
    onBloodTypeDemandPress,
    onSeeAllUrgentNeeds,
    onSeeAllDemand,
    onSeeAllNearby,
}) => {
    const { colors } = useAppTheme();
    const [loading, setLoading] = useState(true);
    const [donorInsights, setDonorInsights] = useState<DonorInsights | null>(null);
    const [requesterInsights, setRequesterInsights] = useState<RequesterInsights | null>(null);

    useEffect(() => {
        loadInsights();
    }, [user?.id]);

    const loadInsights = async () => {
        try {
            setLoading(true);
            const insights = await getUserInsights(user);

            if (insights.type === 'donor') {
                setDonorInsights(insights.data as DonorInsights);
            } else {
                setRequesterInsights(insights.data as RequesterInsights);
            }
        } catch (error) {
            console.error('Error loading insights:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Loading insights...
                </Text>
            </View>
        );
    }

    if (user.userType === 'donor' && donorInsights) {
        return (
            <DonorInsightsSection
                insights={donorInsights}
                onRequestPress={onDonorRequestPress}
                onBloodTypeDemandPress={onBloodTypeDemandPress}
                onSeeAllUrgentNeeds={onSeeAllUrgentNeeds}
                onSeeAllDemand={onSeeAllDemand}
                onSeeAllNearby={onSeeAllNearby}
            />
        );
    }

    if (user.userType === 'requester' && requesterInsights) {
        return (
            <RequesterInsightsSection
                insights={requesterInsights}
                onBloodTypeDemandPress={onBloodTypeDemandPress}
                onSeeAllDemand={onSeeAllDemand}
                onSeeAllNearby={onSeeAllNearby}
            />
        );
    }

    return null;
};

// ============================================================================
// DONOR INSIGHTS SECTION
// ============================================================================

interface DonorInsightsSectionProps {
    insights: DonorInsights;
    onRequestPress?: (requestId: string) => void;
    onBloodTypeDemandPress?: (bloodType: BloodType) => void;
    onSeeAllUrgentNeeds?: () => void;
    onSeeAllDemand?: () => void;
    onSeeAllNearby?: () => void;
}

const DonorInsightsSection: React.FC<DonorInsightsSectionProps> = ({
    insights,
    onRequestPress,
    onBloodTypeDemandPress,
    onSeeAllUrgentNeeds,
    onSeeAllDemand,
    onSeeAllNearby,
}) => {
    const { colors } = useAppTheme();

    // Build insight cards for carousel
    const insightCards: React.ReactNode[] = [];

    // 1. Impact Card (only if user has donations)
    if (insights.impact.totalDonations > 0) {
        insightCards.push(
            <ImpactCard key="impact" impact={insights.impact} />
        );
    }

    // 3. Nearby Card
    insightCards.push(
        <NearbyCard
            key="nearby"
            nearby={insights.nearby}
            userType="donor"
            onSeeAll={onSeeAllNearby}
        />
    );

    // Quick stats for donors
    const quickStats: { label: string; value: string | number; icon: keyof typeof Ionicons.glyphMap; color: string; }[] = [
        {
            label: 'Lives Saved',
            value: insights.impact.livesSaved,
            icon: 'heart',
            color: '#F97316',
        },
        {
            label: 'Nearby Requests',
            value: insights.nearby.activeRequests,
            icon: 'location',
            color: '#2563EB',
        },
    ];

    return (
        <View style={styles.container}>
            {/* Quick Stats Row */}
            <QuickStatsRow stats={quickStats} />

            {/* Main Insights Carousel */}
            <CarouselSection title="Your Dashboard">
                <InsightsCarousel insights={insightCards} />
            </CarouselSection>

            {/* Blood Type Demand */}
            {insights.bloodTypeDemand.length > 0 && (
                <DemandCarousel
                    demands={insights.bloodTypeDemand}
                    onPress={(demand: any) => onBloodTypeDemandPress?.(demand.bloodType)}
                    onSeeAll={onSeeAllDemand}
                />
            )}

        </View>
    );
};

// ============================================================================
// REQUESTER INSIGHTS SECTION
// ============================================================================

interface RequesterInsightsSectionProps {
    insights: RequesterInsights;
    onBloodTypeDemandPress?: (bloodType: BloodType) => void;
    onSeeAllDemand?: () => void;
    onSeeAllNearby?: () => void;
}

const RequesterInsightsSection: React.FC<RequesterInsightsSectionProps> = ({
    insights,
    onBloodTypeDemandPress,
    onSeeAllDemand,
    onSeeAllNearby,
}) => {
    const { colors } = useAppTheme();

    // Build insight cards for carousel
    const insightCards: React.ReactNode[] = [];

    // 1. Nearby Card (compatible donors)
    insightCards.push(
        <NearbyCard
            key="nearby"
            nearby={insights.nearby}
            userType="requester"
            onSeeAll={onSeeAllNearby}
        />
    );

    // 2. Request Activity Card
    if (insights.requestActivity.totalRequests > 0) {
        insightCards.push(
            <RequestActivityCard key="activity" activity={insights.requestActivity} />
        );
    }

    // Quick stats for requesters
    const quickStats: { label: string; value: string | number; icon: keyof typeof Ionicons.glyphMap; color: string; }[] = [
        {
            label: 'Compatible Donors',
            value: insights.bloodTypeSupply.compatibleDonors,
            icon: 'people-circle',
            color: '#10B981',
        },
        {
            label: 'Active Requests',
            value: insights.requestActivity.pendingRequests,
            icon: 'document-text',
            color: '#F59E0B',
        },
        {
            label: 'Completed',
            value: insights.requestActivity.completedRequests,
            icon: 'checkmark-circle',
            color: '#10B981',
        },
    ];

    return (
        <View style={styles.container}>
            {/* Quick Stats Row */}
            <QuickStatsRow stats={quickStats} />

            {/* Main Insights Carousel */}
            <CarouselSection title="Your Dashboard">
                <InsightsCarousel insights={insightCards} />
            </CarouselSection>

            {/* Blood Supply Status */}
            <CarouselSection title="Blood Supply Status">
                <View style={[styles.supplyCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={styles.supplyHeader}>
                        <Ionicons name="water" size={24} color={colors.primary} />
                        <Text style={[styles.supplyTitle, { color: colors.text }]}>
                            Available Donors
                        </Text>
                    </View>

                    <View style={styles.supplyBody}>
                        <View style={styles.supplyStat}>
                            <Text style={[styles.supplyValue, { color: colors.text }]}>
                                {insights.bloodTypeSupply.availableDonors}
                            </Text>
                            <Text style={[styles.supplyLabel, { color: colors.textSecondary }]}>
                                Total Donors
                            </Text>
                        </View>

                        <View style={styles.supplyDivider} />

                        <View style={styles.supplyStat}>
                            <Text style={[styles.supplyValue, { color: '#10B981' }]}>
                                {insights.bloodTypeSupply.compatibleDonors}
                            </Text>
                            <Text style={[styles.supplyLabel, { color: colors.textSecondary }]}>
                                Compatible
                            </Text>
                        </View>

                        <View style={{ width: 1, height: 40, backgroundColor: '#E5E7EB', marginHorizontal: 8 }} />

                        <View style={styles.supplyStat}>
                            <Text style={[styles.supplyValue, { color: getSupplyColor(insights.bloodTypeSupply.demandLevel) }]}>
                                {insights.bloodTypeSupply.demandLevel.toUpperCase()}
                            </Text>
                            <Text style={[styles.supplyLabel, { color: colors.textSecondary }]}>
                                Demand Level
                            </Text>
                        </View>
                    </View>
                </View>
            </CarouselSection>
        </View>
    );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getSupplyColor = (level: string): string => {
    switch (level) {
        case 'low':
            return '#10B981';
        case 'medium':
            return '#F59E0B';
        case 'high':
            return '#F97316';
        default:
            return '#6B7280';
    }
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    supplyCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginHorizontal: 16,
    },
    supplyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    supplyTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    supplyBody: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    supplyStat: {
        flex: 1,
        alignItems: 'center',
    },
    supplyValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    supplyLabel: {
        fontSize: 10,
        marginTop: 2,
    },
    supplyDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 8,
    },
});
