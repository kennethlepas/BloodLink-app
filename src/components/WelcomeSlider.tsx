import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
    id: string;
    headline: string;
    body: string;
    image: any;
    icon?: string;
    colors: [string, string];
}

const SLIDES: Slide[] = [
    {
        id: '1',
        headline: 'Be the Hero Someone is Praying For',
        body: 'Every 10 minutes, a mother in a local hospital needs blood during childbirth, or a child needs it to survive malaria. Your single donation is their second chance at life.',
        image: require('@/assets/images/story-1.png'),
        colors: ['#EF4444', '#991B1B'],
    },
    {
        id: '2',
        headline: 'Critical Paediatric Support',
        body: 'Malaria-associated anaemia and severe acute malnutrition are leading causes for childhood blood transfusions in Kenya. Children with sickle cell disease also need regular help.',
        image: require('@/assets/images/story-2.png'),
        colors: ['#F59E0B', '#B45309'],
    },
    {
        id: '3',
        headline: 'Mothers Need You',
        body: 'Postpartum hemorrhage and pregnancy complications like placenta previa can arise suddenly. Your donation saves both the mother and the newborn during these critical moments.',
        image: require('@/assets/images/story-3.png'),
        colors: ['#EC4899', '#9D174D'],
    },
    {
        id: '4',
        headline: 'Emergency & Trauma Response',
        body: 'A single road traffic accident victim can require as many as 100 units of blood. Existing reserves are the only hope for victims of sudden emergencies and trauma.',
        image: require('@/assets/images/story-4.png'),
        colors: ['#EF4444', '#B91C1C'],
    },
    {
        id: '5',
        headline: 'Chronic Illness Support',
        body: 'Cancer patients undergoing chemotherapy and individuals with chronic kidney disease depend on regular transfusions to manage low blood counts and stay stable.',
        image: require('@/assets/images/story-5.png'),
        colors: ['#3B82F6', '#1E40AF'],
    },
    {
        id: '6',
        headline: "Kenya's Critical Need",
        body: 'Kenya faces a significant shortfall, collecting only 16% to 50% of the annual need. Join the movement to close this gap and ensure no life is lost due to blood shortage.',
        image: require('@/assets/images/story-6.png'),
        colors: ['#10B981', '#064E3B'],
    },
];

export default function WelcomeSlider() {
    // Support for infinite loop
    const SLIDES_WITH_CLONES = [
        SLIDES[SLIDES.length - 1], // Clone of last
        ...SLIDES,
        SLIDES[0], // Clone of first
    ];

    const [activeIndex, setActiveIndex] = useState(1); // Start at real index 1
    const scrollViewRef = useRef<ScrollView>(null);
    const autoPlayRef = useRef<any>(null);

    const startAutoPlay = () => {
        stopAutoPlay();
        autoPlayRef.current = setInterval(() => {
            scrollToIndex(activeIndex + 1);
        }, 5500);
    };

    const stopAutoPlay = () => {
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
        }
    };

    useEffect(() => {
        startAutoPlay();
        return () => stopAutoPlay();
    }, [activeIndex]);

    const scrollToIndex = (index: number, animated = true) => {
        scrollViewRef.current?.scrollTo({
            x: index * SCREEN_WIDTH,
            animated,
        });
        setActiveIndex(index);
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollOffset / SCREEN_WIDTH);

        // Handle transitions between clones
        if (index === 0) {
            // Jump to actual slide 6 (index 6 in clones)
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ x: SLIDES.length * SCREEN_WIDTH, animated: false });
                setActiveIndex(SLIDES.length);
            }, 100);
        } else if (index === SLIDES_WITH_CLONES.length - 1) {
            // Jump to actual slide 1 (index 1 in clones)
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
                setActiveIndex(1);
            }, 100);
        } else {
            setActiveIndex(index);
        }
    };

    const handleNext = () => {
        scrollToIndex(activeIndex + 1);
    };

    const handlePrevious = () => {
        scrollToIndex(activeIndex - 1);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.scrollView}
                contentOffset={{ x: SCREEN_WIDTH, y: 0 }}
                onScrollBeginDrag={stopAutoPlay}
                onScrollEndDrag={startAutoPlay}
            >
                {SLIDES_WITH_CLONES.map((slide, idx) => (
                    <View key={`${slide.id}-${idx}`} style={styles.slide}>
                        <View style={styles.imageContainer}>
                            <Image source={slide.image} style={styles.image} />
                            {/* Blending Overlay - Multi-stop for smooth vertical integration */}
                            <LinearGradient
                                colors={['rgba(10, 38, 71, 0.4)', 'transparent', 'transparent', 'rgba(10, 38, 71, 0.8)']}
                                style={styles.imageOverlay}
                                locations={[0, 0.2, 0.7, 1]}
                            />
                        </View>
                        <View style={styles.contentContainer}>
                            <Text style={styles.headline}>{slide.headline}</Text>
                            <Text style={styles.body}>{slide.body}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Visual Blending Overlays */}
            <LinearGradient
                colors={['#0A2647', 'transparent']}
                style={styles.topFade}
                pointerEvents="none"
            />
            <LinearGradient
                colors={['transparent', '#0A2647']}
                style={styles.bottomFade}
                pointerEvents="none"
            />

            {/* Navigation Buttons - Raised zIndex to stay above fades */}
            <TouchableOpacity
                style={[styles.navButton, styles.leftButton]}
                onPress={handlePrevious}
                activeOpacity={0.7}
            >
                <Ionicons name="chevron-back" size={24} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.navButton, styles.rightButton]}
                onPress={handleNext}
                activeOpacity={0.7}
            >
                <Ionicons name="chevron-forward" size={24} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>

            <View style={styles.pagination}>
                {SLIDES.map((_, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => scrollToIndex(index)}
                        style={[
                            styles.paginationDot,
                            activeIndex === index && styles.paginationDotActive,
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 350,
        backgroundColor: 'transparent',
    },
    scrollView: {
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        height: 400,
    },
    imageContainer: {
        width: '100%',
        height: '80%',
        position: 'absolute',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    topFade: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 5,
    },
    bottomFade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 5,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: 30,
        paddingBottom: 85,
        zIndex: 6,
    },
    headline: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 12,
        lineHeight: 32,
    },
    body: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.95)',
        lineHeight: 22,
        fontWeight: '600',
    },
    navButton: {
        position: 'absolute',
        top: '40%',
        padding: 10,
        zIndex: 20,
    },
    leftButton: {
        left: 10,
    },
    rightButton: {
        right: 10,
    },
    pagination: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        zIndex: 20,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 4,
    },
    paginationDotActive: {
        backgroundColor: '#3B82F6',
        width: 24,
    },
});
