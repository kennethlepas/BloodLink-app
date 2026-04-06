import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { getChatRegistry } from '@/src/services/firebase/database';
import { BloodType } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface RegistryItem {
    id: string;
    name: string;
    type: 'hospital' | 'user';
    bloodType?: BloodType;
    location?: string;
}

export default function ContactPickerScreen() {
    const router = useRouter();
    const { user } = useUser();
    const { colors } = useAppTheme();

    const [loading, setLoading] = useState(true);
    const [registry, setRegistry] = useState<RegistryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'hospital' | 'user'>('all');

    useEffect(() => {
        if (user) {
            loadRegistry();
        }
    }, [user]);

    const loadRegistry = async () => {
        try {
            setLoading(true);
            const data = await getChatRegistry(user?.id || '');
            setRegistry(data);
        } catch (error) {
            console.error('Error loading registry:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRegistry = useMemo(() => {
        return registry.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.location?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === 'all' || item.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [registry, searchQuery, filterType]);

    const handleSelect = (item: RegistryItem) => {
        router.push({
            pathname: '/(shared)/chat' as any,
            params: {
                recipientId: item.id,
                recipientName: item.name,
                recipientType: item.type,
                chatRole: user?.userType
            }
        });
    };

    const renderItem = ({ item }: { item: RegistryItem }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)}>
            <View style={[styles.iconCircle, { backgroundColor: item.type === 'hospital' ? '#EFF6FF' : '#F0FDF4' }]}>
                <Ionicons
                    name={item.type === 'hospital' ? 'business' : 'person'}
                    size={22}
                    color={item.type === 'hospital' ? '#3B82F6' : '#10B981'}
                />
            </View>
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.bloodType && (
                        <View style={styles.bloodBadge}>
                            <Text style={styles.bloodText}>{item.bloodType}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.typeText}>{item.type === 'hospital' ? 'Hospital / Blood Bank' : 'User / Donor'}</Text>
                {item.location && (
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={12} color="#64748B" />
                        <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                    </View>
                )}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
            <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Message</Text>
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="rgba(255,255,255,0.6)" />
                    <TextInput
                        placeholder="Search for a hospital or user..."
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </LinearGradient>

            <View style={styles.tabRow}>
                {(['all', 'hospital', 'user'] as const).map(type => (
                    <TouchableOpacity
                        key={type}
                        onPress={() => setFilterType(type)}
                        style={[styles.tab, filterType === type && styles.tabActive]}
                    >
                        <Text style={[styles.tabText, filterType === type && styles.tabTextActive]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}s
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Fetching registry...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredRegistry}
                    keyExtractor={item => `${item.type}-${item.id}`}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="search-outline" size={64} color="rgba(0,0,0,0.05)" />
                            <Text style={styles.emptyText}>No matches found.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backButton: { marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 45,
    },
    searchInput: { flex: 1, marginLeft: 10, color: '#FFF', fontSize: 16 },
    tabRow: { flexDirection: 'row', padding: 15, gap: 10 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9' },
    tabActive: { backgroundColor: '#2563EB' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    tabTextActive: { color: '#FFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: '#64748B', fontWeight: '500' },
    listContent: { padding: 15 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    cardContent: { flex: 1, marginLeft: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    name: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    bloodBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
    bloodText: { fontSize: 10, fontWeight: '800', color: '#EF4444' },
    typeText: { fontSize: 12, color: '#64748B', marginBottom: 4 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locationText: { fontSize: 12, color: '#94A3B8' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 10, color: '#94A3B8', fontWeight: '600' },
});
