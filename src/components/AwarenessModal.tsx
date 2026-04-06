import { AWARENESS_FACTS, AwarenessFact } from '@/src/constants/awarenessData';
import { useAppTheme } from '@/src/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AwarenessModalProps {
    visible: boolean;
    onClose: () => void;
    onMute?: () => void;
    isMuted?: boolean;
    userType?: 'donor' | 'requester';
}

export const AwarenessModal: React.FC<AwarenessModalProps> = ({ visible, onClose, onMute, isMuted, userType }) => {
    const { colors, isDark } = useAppTheme();
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [fact, setFact] = useState<AwarenessFact | null>(null);
    const [scaleValue] = useState(new Animated.Value(0));
    const [fadeValue] = useState(new Animated.Value(1));

    const filteredFacts = React.useMemo(() => {
        if (!userType) return AWARENESS_FACTS;
        return AWARENESS_FACTS.filter(f => f.targetRole === userType || f.targetRole === 'both');
    }, [userType]);

    useEffect(() => {
        if (visible) {
            // Start with a random fact from filtered list
            const randomIndex = Math.floor(Math.random() * filteredFacts.length);
            setCurrentIndex(randomIndex);
            setFact(filteredFacts[randomIndex]);

            // Animate in
            Animated.spring(scaleValue, {
                toValue: 1,
                useNativeDriver: true,
                damping: 15,
                stiffness: 100,
            }).start();
        } else {
            scaleValue.setValue(0);
        }
    }, [visible, filteredFacts]);

    useEffect(() => {
        if (visible && filteredFacts[currentIndex]) {
            // Fade out current text
            Animated.timing(fadeValue, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start(() => {
                setFact(filteredFacts[currentIndex]);
                // Fade back in
                Animated.timing(fadeValue, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }).start();
            });
        }
    }, [currentIndex, filteredFacts, visible]);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % filteredFacts.length);
    };

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + filteredFacts.length) % filteredFacts.length);
    };

    const handleGotIt = () => {
        onClose();
        if (userType === 'donor') {
            router.push('/(shared)/guide' as any);
        } else if (userType === 'requester') {
            router.push('/(shared)/guide' as any); // Or a requester specific help page
        } else {
            router.push('/(shared)/guide' as any);
        }
    };

    if (!visible || !fact) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={st.overlay}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />

                <Animated.View style={[
                    st.container,
                    {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                        transform: [{ scale: scaleValue }],
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1.5,
                    }
                ]}>
                    <Animated.View style={{ opacity: fadeValue, alignItems: 'center' }}>
                        {/* Top Icon Badge */}
                        <View style={[st.iconOuter, { backgroundColor: colors.primary + '15' }]}>
                            <View style={[st.iconInner, { backgroundColor: colors.primary }]}>
                                <Ionicons name={fact.icon as any || 'bulb'} size={24} color="#FFFFFF" />
                            </View>
                        </View>

                        {/* Category & Counter Row */}
                        <View style={st.infoRow}>
                            <Text style={[st.category, { color: colors.primary }]}>
                                {fact.category}
                            </Text>
                            <View style={[st.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                <Text style={[st.pageIndicator, { color: colors.textSecondary }]}>
                                    {currentIndex + 1}/{filteredFacts.length}
                                </Text>
                            </View>
                        </View>

                        {/* Content */}
                        <Text style={[st.text, { color: colors.text }]}>
                            {fact.text}
                        </Text>
                    </Animated.View>

                    {/* Navigation Controls */}
                    <View style={st.navContainer}>
                        <TouchableOpacity style={st.navButton} onPress={handlePrevious} activeOpacity={0.7}>
                            <Ionicons name="chevron-back" size={20} color={colors.primary} />
                        </TouchableOpacity>

                        <View style={st.dotsContainer}>
                            {filteredFacts.slice(0, 5).map((_, i) => {
                                const isCurrent = i === (currentIndex % 5);
                                return (
                                    <View
                                        key={i}
                                        style={[
                                            st.dot,
                                            {
                                                backgroundColor: isCurrent ? colors.primary : colors.textSecondary + '40',
                                                width: isCurrent ? 12 : 6,
                                                opacity: isCurrent ? 1 : 0.5,
                                            }
                                        ]}
                                    />
                                );
                            })}
                        </View>

                        <TouchableOpacity style={st.navButton} onPress={handleNext} activeOpacity={0.7}>
                            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Action Buttons */}
                    <View style={st.footerActions}>
                        <TouchableOpacity
                            style={st.skipBtn}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <Text style={[st.skipBtnText, { color: colors.textSecondary }]}>Dismiss</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[st.primaryBtn, { backgroundColor: colors.primary }]}
                            onPress={handleGotIt}
                            activeOpacity={0.8}
                        >
                            <Text style={st.primaryBtnText}>Join the Movement</Text>
                            <Ionicons name="heart" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    </View>

                    {/* Mute Toggle */}
                    {onMute && (
                        <TouchableOpacity
                            style={st.muteBtn}
                            onPress={onMute}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={isMuted ? 'notifications-off' : 'notifications-off-outline'} size={14} color={colors.textSecondary} />
                            <Text style={[st.muteBtnText, { color: colors.textSecondary }]}>
                                Don't show again
                            </Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
};

const st = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 300,
        borderRadius: 28,
        padding: 20,
        paddingTop: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
    },
    iconOuter: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconInner: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    category: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    pageIndicator: {
        fontSize: 10,
        fontWeight: '700',
    },
    text: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    navContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
    },
    navButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(150, 150, 150, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        height: 4,
        borderRadius: 2,
    },
    footerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        width: '100%',
    },
    skipBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    skipBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    primaryBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    muteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
        paddingVertical: 8,
    },
    muteBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
