import { BloodType } from '@/src/types/types';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BloodTypeBadgeProps {
    type: BloodType;
    size?: 'small' | 'medium' | 'large';
}

const BloodTypeBadge: React.FC<BloodTypeBadgeProps> = ({ type, size = 'medium' }) => {
    const sizeStyles = {
        small: { width: 40, height: 40, fontSize: 14 },
        medium: { width: 50, height: 50, fontSize: 16 },
        large: { width: 60, height: 60, fontSize: 20 },
    };

    const currentSize = sizeStyles[size];

    return (
        <View style={[styles.badge, { width: currentSize.width, height: currentSize.height }]}>
            <Text style={[styles.bloodType, { fontSize: currentSize.fontSize }]}>{type}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        borderRadius: 8,
        backgroundColor: '#DC2626',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    bloodType: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});

export default BloodTypeBadge;
