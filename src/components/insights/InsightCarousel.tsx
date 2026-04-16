/**
 * Horizontal Scroll Carousel Components
 * 
 * Carousel-style horizontal scrollable containers for insight cards.
 * Eliminates vertical scrollbar conflict with modern swipe interactions.
 */

import { useAppTheme } from '@/src/contexts/ThemeContext';
import { BloodTypeDemand, UrgentNeed } from '@/src/services/insights';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SPACING = 16;
const SECTION_PADDING = 16;
const COMPACT_CARD_WIDTH = (SCREEN_WIDTH - (SECTION_PADDING * 2) - 12) / 2;

interface CarouselSectionProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    onSeeAll?: () => void;
    seeAllText?: string;
    style?: ViewStyle;
}

/**
 * Carousel Section Wrapper
 * Provides consistent section header and layout for all carousels
 */
export const CarouselSection: React.FC<CarouselSectionProps> = ({
    title,
    subtitle,
    children,
    onSeeAll,
    seeAllText = 'See All',
    style,
}) => {
    const { colors } = useAppTheme();

    return (
        <View style={[styles.section, style]}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <View style={[styles.sectionBar, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
                    {subtitle && (
                        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
                {onSeeAll && (
                    <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
                        <Text style={[styles.seeAllText, { color: colors.primary }]}>
                            {seeAllText}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>
            {children}
        </View>
    );
};

interface HorizontalCarouselProps {
    data: any[];
    renderItem: (item: any, index: number) => React.ReactElement | null;
    keyExtractor?: (item: any, index: number) => string;
    cardWidth?: number;
    contentContainerStyle?: ViewStyle;
    showPagination?: boolean;
    onEndReached?: () => void;
    autoScroll?: boolean;
    autoScrollInterval?: number;
}

/**
 * Horizontal Carousel
 * Scrollable horizontal list with optional pagination dots and auto-scroll
 */
export const HorizontalCarousel: React.FC<HorizontalCarouselProps> = ({
    data,
    renderItem,
    keyExtractor,
    cardWidth = 280,
    contentContainerStyle,
    showPagination = false,
    onEndReached,
    autoScroll = false,
    autoScrollInterval = 3000,
}) => {
    const flatListRef = useRef<FlatList>(null);
    const { colors, isDark } = useAppTheme();
    const scrollX = useRef(new Animated.Value(0)).current;
    const [activeIndex, setActiveIndex] = useState(0);
    const [isAutoScrolling, setIsAutoScrolling] = useState(autoScroll);

    useEffect(() => {
        let interval: any;
        if (isAutoScrolling && data.length > 1) {
            interval = setInterval(() => {
                const nextIndex = (activeIndex + 1) % data.length;
                flatListRef.current?.scrollToIndex({
                    index: nextIndex,
                    animated: true,
                });
                setActiveIndex(nextIndex);
            }, autoScrollInterval);
        }
        return () => clearInterval(interval);
    }, [isAutoScrolling, activeIndex, data.length, autoScrollInterval]);

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
            useNativeDriver: false,
            listener: (event: any) => {
                const offsetX = event.nativeEvent.contentOffset?.x || 0;
                const index = Math.round(offsetX / (cardWidth + CARD_SPACING));
                setActiveIndex(index);
            },
        }
    );

    const handleTouchStart = () => setIsAutoScrolling(false);
    const handleTouchEnd = () => {
        if (autoScroll) {
            setTimeout(() => setIsAutoScrolling(true), 5000);
        }
    };

    if (data.length === 0) {
        return null;
    }

    return (
        <View style={styles.carouselContainer} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <FlatList
                ref={flatListRef}
                data={data}
                renderItem={({ item, index }) => renderItem(item, index)}
                keyExtractor={keyExtractor || ((_, index) => index.toString())}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                    styles.carouselContent,
                    { paddingHorizontal: CARD_SPACING },
                    contentContainerStyle,
                ]}
                snapToInterval={cardWidth + CARD_SPACING}
                snapToAlignment="start"
                decelerationRate="fast"
                onScroll={handleScroll}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.5}
                getItemLayout={(_, index) => ({
                    length: cardWidth + CARD_SPACING,
                    offset: (cardWidth + CARD_SPACING) * index,
                    index,
                })}
            />

            {showPagination && data.length > 1 && (
                <View style={styles.pagination}>
                    {data.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.paginationDot,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#D1D5DB' },
                                index === activeIndex ? [styles.paginationDotActive, { backgroundColor: colors.primary }] : null,
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

interface QuickStatsRowProps {
    stats: {
        label: string;
        value: string | number;
        icon: keyof typeof Ionicons.glyphMap;
        color: string;
    }[];
}

/**
 * Quick Stats Row
 * Horizontal row of stat badges for at-a-glance metrics
 */
export const QuickStatsRow: React.FC<QuickStatsRowProps> = ({ stats }) => {
    const { colors, isDark } = useAppTheme();

    return (
        <View style={styles.quickStatsRow}>
            {stats.map((stat, index) => (
                <View
                    key={index}
                    style={[
                        styles.quickStatBadge,
                        { backgroundColor: stat.color + (isDark ? '20' : '15'), borderColor: stat.color + (isDark ? '40' : '30') },
                    ]}
                >
                    <Ionicons name={stat.icon} size={16} color={stat.color} />
                    <Text style={[styles.quickStatValue, { color: stat.color }]}>
                        {stat.value}
                    </Text>
                    <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>
                        {stat.label}
                    </Text>
                </View>
            ))}
        </View>
    );
};

interface EmptyStateProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    actionLabel?: string;
    onAction?: () => void;
}

/**
 * Empty State
 * Displayed when no data is available for a carousel
 */
export const CarouselEmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    subtitle,
    actionLabel,
    onAction,
}) => {
    const { colors } = useAppTheme();

    return (
        <View style={[styles.emptyState, { backgroundColor: colors.surfaceAlt }]}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.primary + '10' }]}>
                <Ionicons name={icon} size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {subtitle}
            </Text>
            {actionLabel && onAction && (
                <TouchableOpacity onPress={onAction} style={styles.emptyActionButton}>
                    <Text style={[styles.emptyActionText, { color: colors.primary }]}>
                        {actionLabel}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

// Pre-built carousel renderers

interface DemandCarouselProps {
    demands: BloodTypeDemand[];
    onPress?: (demand: BloodTypeDemand) => void;
    onSeeAll?: () => void;
    autoScroll?: boolean;
}

/**
 * Blood Type Demand Carousel
 * Shows blood type demand cards in horizontal scroll
 */
export const DemandCarousel: React.FC<DemandCarouselProps> = ({
    demands,
    onPress,
    onSeeAll,
    autoScroll = true,
}) => {
    const { BloodTypeDemandCard } = require('./InsightCards');

    return (
        <CarouselSection
            title="Blood Type Demand"
            subtitle="Near you"
            onSeeAll={onSeeAll}
        >
            <HorizontalCarousel
                data={demands.filter((d) => d.activeRequests > 0)}
                cardWidth={150}
                autoScroll={autoScroll}
                renderItem={(demand) => (
                    <TouchableOpacity
                        onPress={() => onPress?.(demand)}
                        activeOpacity={0.7}
                        style={{ marginRight: CARD_SPACING }}
                    >
                        <BloodTypeDemandCard demand={demand} compact />
                    </TouchableOpacity>
                )}
                keyExtractor={(item) => item.bloodType}
            />
        </CarouselSection>
    );
};

interface UrgentNeedsCarouselProps {
    needs: UrgentNeed[];
    onPress?: (need: UrgentNeed) => void;
    onSeeAll?: () => void;
    autoScroll?: boolean;
}

/**
 * Urgent Needs Carousel
 * Shows urgent blood need cards in horizontal scroll
 */
export const UrgentNeedsCarousel: React.FC<UrgentNeedsCarouselProps> = ({
    needs,
    onPress,
    onSeeAll,
    autoScroll = true,
}) => {
    const { UrgentNeedCard } = require('./InsightCards');

    if (needs.length === 0) {
        return (
            <CarouselEmptyState
                icon="checkmark-circle"
                title="No Urgent Needs"
                subtitle="All current requests are being met"
            />
        );
    }

    return (
        <CarouselSection
            title="Urgent Needs Near You"
            subtitle="Your blood type can help"
            onSeeAll={onSeeAll}
        >
            <HorizontalCarousel
                data={needs}
                cardWidth={COMPACT_CARD_WIDTH + 20} // Slightly wider for urgent needs
                autoScroll={autoScroll}
                renderItem={(need) => (
                    <View style={{ marginRight: CARD_SPACING }}>
                        <UrgentNeedCard need={need} onPress={() => onPress?.(need)} />
                    </View>
                )}
                keyExtractor={(item) => item.requestId}
                showPagination
            />
        </CarouselSection>
    );
};

interface InsightsCarouselProps {
    insights: React.ReactNode[];
}

/**
 * General Insights Carousel
 * Shows any insight cards in horizontal scroll
 */
export const InsightsCarousel: React.FC<InsightsCarouselProps> = ({ insights }) => {
    const INSIGHT_CARD_WIDTH = SCREEN_WIDTH - (SECTION_PADDING * 2);

    return (
        <HorizontalCarousel
            data={insights}
            cardWidth={INSIGHT_CARD_WIDTH}
            autoScroll={true}
            renderItem={(item) => (
                <View style={{ width: INSIGHT_CARD_WIDTH, marginRight: CARD_SPACING }}>
                    {item}
                </View>
            )}
            keyExtractor={(_, index) => index.toString()}
            showPagination
        />
    );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    // Section
    section: {
        marginTop: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: CARD_SPACING,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionBar: {
        width: 4,
        height: 18,
        borderRadius: 2,
        backgroundColor: '#2563EB',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
    },
    sectionSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    seeAllText: {
        fontSize: 13,
        fontWeight: '700',
    },

    // Carousel
    carouselContainer: {
        marginBottom: 8,
    },
    carouselContent: {
        paddingVertical: 8,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingHorizontal: CARD_SPACING,
    },
    paginationDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#D1D5DB',
    },
    paginationDotActive: {
        width: 20,
        backgroundColor: '#2563EB',
    },

    // Quick Stats
    quickStatsRow: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: CARD_SPACING,
        marginBottom: 16,
    },
    quickStatBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    quickStatValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    quickStatLabel: {
        fontSize: 9,
        fontWeight: '500',
    },

    // Empty State
    emptyState: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginHorizontal: CARD_SPACING,
    },
    emptyIconBox: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 12,
    },
    emptyActionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    emptyActionText: {
        fontSize: 13,
        fontWeight: '700',
    },
});
