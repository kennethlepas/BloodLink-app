import {
  searchBloodBanksByType
} from '@/src/services/firebase/database';
import { BloodBank, BloodType, Location } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const FindBloodScreen: React.FC = () => {
  const router = useRouter();
  const [selectedBloodType, setSelectedBloodType] = useState<BloodType>('O+');
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [searched, setSearched] = useState(false);

  const getCurrentLocation = async (): Promise<Location | null> => {
    try {
      setLoadingLocation(true);
      
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to find nearby blood banks.');
        return null;
      }

      const position = await ExpoLocation.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;

      const location: Location = { latitude, longitude };
      setUserLocation(location);
      
      return location;
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location.');
      return null;
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setSearched(true);

      // Get user location first
      const location = await getCurrentLocation();

      // Search for blood banks
      const banks = await searchBloodBanksByType(selectedBloodType, location || undefined);
      
      setBloodBanks(banks);

      if (banks.length === 0) {
        Alert.alert(
          'No Results',
          `No blood banks found with ${selectedBloodType} blood type available.`
        );
      }
    } catch (error) {
      console.error('Error searching blood banks:', error);
      Alert.alert('Error', 'Failed to search blood banks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCallBloodBank = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to make phone call on this device.');
        }
      })
      .catch((error) => {
        console.error('Error opening dialer:', error);
        Alert.alert('Error', 'Failed to open phone dialer.');
      });
  };

  const handleGetDirections = (bank: BloodBank) => {
    const { latitude, longitude } = bank.location;
    const scheme = Platform.select({ 
      ios: 'maps:0,0?q=', 
      android: 'geo:0,0?q=' 
    });
    const latLng = `${latitude},${longitude}`;
    const label = bank.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Unable to open maps on this device.');
      });
    }
  };

  const renderBloodBankItem = ({ item }: { item: BloodBank }) => {
    const inventory = item.inventory[selectedBloodType];
    const hasStock = inventory && inventory.units > 0;

    return (
      <View style={styles.bankCard}>
        <View style={styles.bankHeader}>
          <View style={styles.bankTitleContainer}>
            <Ionicons name="business" size={24} color="#1b8882ff" />
            <View style={styles.bankInfo}>
              <Text style={styles.bankName}>{item.name}</Text>
              {item.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>

          {item.distance && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={14} color="#3B82F6" />
              <Text style={styles.distanceText}>{item.distance.toFixed(1)} km</Text>
            </View>
          )}
        </View>

        <View style={styles.bankBody}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#64748B" />
            <Text style={styles.infoText}>{item.address}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color="#64748B" />
            <Text style={styles.infoText}>{item.phoneNumber}</Text>
          </View>

          {item.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color="#64748B" />
              <Text style={styles.infoText}>{item.email}</Text>
            </View>
          )}

          <View style={styles.stockContainer}>
            <View style={styles.bloodTypeBox}>
              <Ionicons name="water" size={20} color="#EF4444" />
              <Text style={styles.bloodTypeText}>{selectedBloodType}</Text>
            </View>

            {hasStock ? (
              <View style={styles.availableBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.availableText}>
                  {inventory.units} unit{inventory.units !== 1 ? 's' : ''} available
                </Text>
              </View>
            ) : (
              <View style={styles.unavailableBadge}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
                <Text style={styles.unavailableText}>Out of stock</Text>
              </View>
            )}
          </View>

          {inventory?.lastUpdated && (
            <Text style={styles.updateText}>
              Last updated: {new Date(inventory.lastUpdated).toLocaleDateString()}
            </Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={() => handleCallBloodBank(item.phoneNumber)}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.directionsButton]}
            onPress={() => handleGetDirections(item)}
          >
            <Ionicons name="navigate" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Directions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {!searched ? (
        <>
          <Ionicons name="search" size={80} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Search for Blood</Text>
          <Text style={styles.emptyText}>
            Select a blood type and tap "Search" to find nearby blood banks with available stock.
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="file-tray-outline" size={80} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Blood Banks Found</Text>
          <Text style={styles.emptyText}>
            No blood banks have {selectedBloodType} blood available at the moment. Try again later or try a different blood type.
          </Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1b8882ff" />
      <LinearGradient colors={['#1b8882ff', '#16b43eff']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Find Blood</Text>
            <Text style={styles.headerSubtitle}>Search nearby blood banks</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>Select Blood Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedBloodType}
              onValueChange={(value) => setSelectedBloodType(value)}
              style={styles.picker}
              enabled={!loading}
            >
              {BLOOD_TYPES.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.searchButton, loading && styles.buttonDisabled]}
          onPress={handleSearch}
          disabled={loading || loadingLocation}
        >
          {loading || loadingLocation ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#FFFFFF" />
              <Text style={styles.searchButtonText}>Search Blood Banks</Text>
            </>
          )}
        </TouchableOpacity>

        {searched && !loading && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsText}>
              {bloodBanks.length} blood bank{bloodBanks.length !== 1 ? 's' : ''} found
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1b8882ff" />
          <Text style={styles.loadingText}>Searching blood banks...</Text>
        </View>
      ) : (
        <FlatList
          data={bloodBanks}
          renderItem={renderBloodBankItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pickerWrapper: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1b8882ff',
    paddingVertical: 14,
    borderRadius: 8,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resultsHeader: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
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
  listContent: {
    padding: 16,
  },
  bankCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bankTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  bankBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  stockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  bloodTypeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bloodTypeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  availableText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  unavailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unavailableText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  updateText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  callButton: {
    backgroundColor: '#10B981',
  },
  directionsButton: {
    backgroundColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default FindBloodScreen;