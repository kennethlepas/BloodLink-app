import { TicketCard } from '@/src/components/ticket';
import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { getUserTickets } from '@/src/services/firebase/database';
import { Ticket } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const B_SKY = '#2563EB';
const B_LIGHT = '#3B82F6';

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

type FilterStatus = 'all' | 'open' | 'active' | 'closed';

export default function TicketsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { colors, isDark } = useAppTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const loadTickets = useCallback(async () => {
    if (!user) return;
    try {
      const userTickets = await getUserTickets(user.id);
      setTickets(userTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, [loadTickets])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (filter === 'all') return true;
    if (filter === 'open') return ticket.status === 'open' || ticket.status === 'under_review';
    if (filter === 'active') return ticket.status !== 'closed' && ticket.status !== 'resolved';
    if (filter === 'closed') return ticket.status === 'closed' || ticket.status === 'resolved';
    return true;
  });

  const getStatusCounts = () => {
    const counts = {
      open: tickets.filter((t) => t.status === 'open' || t.status === 'under_review').length,
      active: tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length,
      closed: tickets.filter((t) => t.status === 'closed' || t.status === 'resolved').length,
    };
    return counts;
  };

  const counts = getStatusCounts();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    // HEADER
    header: {
      position: 'relative',
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: 'hidden',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 20,
    },
    headerCircle1: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.05)',
      position: 'absolute',
      top: -50,
      right: -40
    },
    headerCircle2: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(255,255,255,0.06)',
      position: 'absolute',
      bottom: 10,
      left: -25
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.18)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
    headerSub: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
      fontWeight: '600',
    },

    // STATS CARD
    statsCard: {
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.25)',
      backgroundColor: 'rgba(255,255,255,0.18)',
      padding: 14,
      marginTop: 12,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 24,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    statLabel: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '600',
      marginTop: 2,
    },

    // FILTER TABS
    filterContainer: {
      paddingHorizontal: 20,
      marginTop: 16,
      marginBottom: 8,
    },
    filterScroll: {
      flexDirection: 'row',
      gap: 8,
    },
    filterTab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    filterTabActive: {
      backgroundColor: B_SKY,
      borderColor: B_SKY,
    },
    filterTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterTabTextActive: {
      color: '#FFFFFF',
    },
    filterBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    filterBadgeActive: {
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    filterBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // CONTENT
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },

    // EMPTY STATE
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      minHeight: 300,
    },
    emptyIconBox: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#DBEAFE',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    emptySub: {
      fontSize: 14,
      textAlign: 'center',
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 24,
    },
    createBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: B_SKY,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 14,
      ...shadow(B_SKY, 0.3, 12, 4),
    },
    createBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // LOADING
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 300,
    },
  });

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={B_SKY} />
        </View>
      );
    }

    if (filteredTickets.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            <Ionicons
              name={tickets.length === 0 ? 'document-text-outline' : 'search-outline'}
              size={36}
              color={B_SKY}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {tickets.length === 0 ? 'No Tickets Yet' : 'No Matching Tickets'}
          </Text>
          <Text style={styles.emptySub}>
            {tickets.length === 0
              ? "You haven't created any support tickets. Create one if you need assistance."
              : 'Try adjusting your filter to see more tickets.'}
          </Text>
          {tickets.length === 0 && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push('/(shared)/create-ticket' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createBtnText}>Create Ticket</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={B_SKY}
          />
        }
      >
        {filteredTickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[B_SKY, B_LIGHT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerCircle1} />
        <View style={styles.headerCircle2} />

        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Support Center</Text>
            <Text style={styles.headerSub}>Help requests and issue reports</Text>
          </View>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push('/(shared)/create-ticket' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{counts.open}</Text>
              <Text style={styles.statLabel}>Open</Text>
            </View>
            <View style={{ width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{counts.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={{ width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{counts.closed}</Text>
              <Text style={styles.statLabel}>Closed</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { key: 'all', label: 'All', count: tickets.length },
            { key: 'open', label: 'Open', count: counts.open },
            { key: 'active', label: 'Active', count: counts.active },
            { key: 'closed', label: 'Closed', count: counts.closed },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.filterTab,
                filter === item.key && styles.filterTabActive,
              ]}
              onPress={() => setFilter(item.key as FilterStatus)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === item.key && styles.filterTabTextActive,
                ]}
              >
                {item.label}
              </Text>
              <View style={[styles.filterBadge, filter === item.key && styles.filterBadgeActive]}>
                <Text style={styles.filterBadgeText}>{item.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}
