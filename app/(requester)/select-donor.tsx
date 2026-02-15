import { useUser } from '@/src/contexts/UserContext';
import { getInterestedDonorsForRequest, selectDonorForRequest } from '@/src/services/firebase/database';
import { InterestedDonor } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const DonorSelectionScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [donors, setDonors] = useState<InterestedDonor[]>([]);

  useEffect(() => {
    loadInterestedDonors();
  }, [requestId]);

  const loadInterestedDonors = async () => {
    if (!requestId) return;

    try {
      setLoading(true);
      const interestedDonors = await getInterestedDonorsForRequest(requestId);
      setDonors(interestedDonors);
    } catch (error) {
      console.error('Error loading interested donors:', error);
      Alert.alert('Error', 'Failed to load donors');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDonor = async (donor: InterestedDonor) => {
    if (!user) return;

    Alert.alert(
      'Select This Donor?',
      `Choose ${donor.donorName} as your donor? Other interested donors will be notified that the request is fulfilled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select',
          onPress: async () => {
            try {
              const chatId = await selectDonorForRequest(
                requestId,
                donor.donorId,
                donor.donorName,
                user.id,
                `${user.firstName} ${user.lastName}`
              );

              Alert.alert(
                'Donor Selected! 🎉',
                `You can now chat with ${donor.donorName}`,
                [
                  {
                    text: 'Go to Chat',
                    onPress: () => router.push(`/(shared)/chat?chatId=${chatId}` as any),
                  },
                  { text: 'OK' },
                ]
              );
            } catch (error) {
              console.error('Error selecting donor:', error);
              Alert.alert('Error', 'Failed to select donor');
            }
          },
        },
      ]
    );
  };

  const renderDonorItem = ({ item }: { item: InterestedDonor }) => (
    <View style={styles.donorCard}>
      <View style={styles.donorInfo}>
        {item.donorProfilePicture ? (
          <Image source={{ uri: item.donorProfilePicture }} style={styles.donorAvatar} />
        ) : (
          <View style={styles.donorAvatarPlaceholder}>
            <Ionicons name="person" size={24} color="#64748B" />
          </View>
        )}
        
        <View style={styles.donorDetails}>
          <Text style={styles.donorName}>{item.donorName}</Text>
          <View style={styles.bloodTypeBadge}>
            <Ionicons name="water" size={14} color="#EF4444" />
            <Text style={styles.bloodTypeText}>{item.donorBloodType}</Text>
          </View>
          <Text style={styles.interestedTime}>
            Interested {new Date(item.interestedAt).toLocaleDateString()}
          </Text>
          {item.message && (
            <Text style={styles.donorMessage}>" {item.message}"</Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => handleSelectDonor(item)}
      >
        <Text style={styles.selectButtonText}>Select</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading donors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select a Donor</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={donors}
        renderItem={renderDonorItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No interested donors yet</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  listContent: {
    padding: 16,
  },
  donorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  donorInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  donorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  donorAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donorDetails: {
    flex: 1,
  },
  donorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  bloodTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  bloodTypeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  interestedTime: {
    fontSize: 12,
    color: '#64748B',
  },
  donorMessage: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  selectButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
  },
});

export default DonorSelectionScreen;