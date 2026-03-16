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
}

export const AwarenessModal: React.FC<AwarenessModalProps> = ({ visible, onClose }) => {
    const { colors, isDark } = useAppTheme();
    const router = useRouter();
    const [fact, setFact] = useState<AwarenessFact | null>(null);
    const [scaleValue] = useState(new Animated.Value(0));

    useEffect(() => {
        if (visible) {
            // Pick a random fact
            const randomFact = AWARENESS_FACTS[Math.floor(Math.random() * AWARENESS_FACTS.length)];
            setFact(randomFact);

            // Animate in
            Animated.spring(scaleValue, {
                toValue: 1,
                useNativeDriver: true,
                damping: 15,
                stiffness: 100,
            }).start();
        } else {
            setFact(null);
            scaleValue.setValue(0);
        }
    }, [visible]);

    const handleGotIt = () => {
        onClose();
        router.push('/(shared)/guide' as any);
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
                        backgroundColor: isDark ? 'rgba(28,28,30,0.90)' : 'rgba(255,255,255,0.90)',
                        transform: [{ scale: scaleValue }],
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        borderWidth: 1,
                    }
                ]}>
                    <View style={st.contentRow}>
                        {/* Icon */}
                        <View style={[st.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name={fact.icon as any || 'bulb'} size={24} color={colors.primary} />
                        </View>

                        <View style={st.textContainer}>
                            {/* Title */}
                            <Text style={[st.category, { color: colors.primary }]}>
                                {fact.category}
                            </Text>

                            {/* Content */}
                            <Text style={[st.text, { color: colors.text }]}>
                                {fact.text}
                            </Text>
                        </View>
                    </View>

                    {/* Actions Row */}
                    <View style={st.actionRow}>
                        <TouchableOpacity
                            style={st.skipButton}
                            onPress={onClose}
                        >
                            <Text style={[st.skipText, { color: colors.textSecondary }]}>Skip</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[st.button, { backgroundColor: colors.primary }]}
                            onPress={handleGotIt}
                            activeOpacity={0.8}
                        >
                            <Text style={st.buttonText}>Learn More</Text>
                            <Ionicons name="arrow-forward" size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>

                </Animated.View>
            </View>
        </Modal>
    );
};

const st = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 20,
        padding: 16,
        paddingBottom: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
    },
    textContainer: {
        flex: 1,
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    category: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
        opacity: 0.9,
    },
    text: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
    },
    button: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    skipButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    skipText: {
        fontSize: 12,
        fontWeight: '500',
    },
});
