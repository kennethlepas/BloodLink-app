import { useUser } from '@/src/contexts/UserContext';
import {
  createBloodRequest,
  createNotification,
  getUsersByBloodType
} from '@/src/services/firebase/database';
import { BloodType, Donor, Location, UrgencyLevel } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const NeedBloodScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const [formData, setFormData] = useState({
    bloodType: 'O+' as BloodType,
    urgencyLevel: 'urgent' as UrgencyLevel,
    patientName: '',
    hospitalName: '',
    hospitalAddress: '',
    requesterPhone: user?.phoneNumber || '',
    description: '',
    unitsNeeded: '1',
  });

  const [location, setLocation] = useState<Location | null>(null);
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to find nearby donors.');
        return;
      }

      const position = await ExpoLocation.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;

      // Get address from coordinates
      const addresses = await ExpoLocation.reverseGeocodeAsync({ latitude, longitude });
      let formattedAddress = 'Current Location';
      let city = '';
      let region = '';
      
      if (addresses.length > 0) {
        const addr = addresses[0];
        const parts = [addr.street, addr.city, addr.region].filter(Boolean);
        formattedAddress = parts.join(', ') || 'Current Location';
        city = addr.city || '';
        region = addr.region || '';
        setAddress(formattedAddress);
      }

      setLocation({ 
        latitude, 
        longitude, 
        address: formattedAddress,
        city,
        region
      });
      Alert.alert('Success', 'Location captured successfully!');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location. Please enter manually.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.patientName.trim()) {
      newErrors.patientName = 'Patient name is required';
    }

    if (!formData.hospitalName.trim()) {
      newErrors.hospitalName = 'Hospital name is required';
    }

    if (!formData.requesterPhone.trim()) {
      newErrors.requesterPhone = 'Contact number is required';
    } else if (!/^[0-9+\-\s()]+$/.test(formData.requesterPhone)) {
      newErrors.requesterPhone = 'Invalid phone number format';
    }

    if (!location && !address.trim()) {
      newErrors.location = 'Location is required';
    }

    const units = parseInt(formData.unitsNeeded);
    if (isNaN(units) || units < 1 || units > 10) {
      newErrors.unitsNeeded = 'Units must be between 1 and 10';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      Alert.alert('Validation Error', firstError);
      return false;
    }

    return true;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a request.');
      return;
    }

    if (!validateForm()) return;

    Alert.alert(
      'Confirm Blood Request',
      `You are requesting ${formData.unitsNeeded} unit(s) of ${formData.bloodType} blood. This will notify all compatible donors in your area.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              const requestLocation = location || {
                latitude: 0,
                longitude: 0,
                address: address,
              };

              // Create blood request with correct field names
              const requestId = await createBloodRequest({
                requesterId: user.id,
                requesterName: `${user.firstName} ${user.lastName}`,
                requesterPhone: formData.requesterPhone,
                bloodType: formData.bloodType,
                urgencyLevel: formData.urgencyLevel,
                patientName: formData.patientName,
                hospitalName: formData.hospitalName,
                hospitalAddress: formData.hospitalAddress || address,
                location: requestLocation,
                unitsNeeded: parseInt(formData.unitsNeeded),
                description: formData.description,
                status: 'pending',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                notes: undefined,
                urgency: ''
              });

              // Get compatible donors and notify them
              const compatibleDonors = await getUsersByBloodType(formData.bloodType);
              
              // Notify all compatible donors
              await Promise.all(
                compatibleDonors.map((donor: Donor) =>
                  createNotification({
                    userId: donor.id,
                    type: 'blood_request',
                    title: 'New Blood Request',
                    message: `${formData.urgencyLevel === 'critical' || formData.urgencyLevel === 'urgent' ? '🚨 URGENT: ' : ''}${formData.patientName} needs ${formData.bloodType} blood at ${formData.hospitalName}`,
                    data: {
                      requestId: requestId,
                      bloodType: formData.bloodType,
                      urgency: formData.urgencyLevel,
                    },
                    isRead: false,
                    timestamp: ''
                  })
                )
              );

              Alert.alert(
                'Success!',
                `Your blood request has been created and ${compatibleDonors.length} compatible donors have been notified.`,
                [
                  {
                    text: 'View My Requests',
                    onPress: () => router.push('/(requester)/my-requests' as any),
                  },
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error) {
              console.error('Error creating blood request:', error);
              Alert.alert('Error', 'Failed to create blood request. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1b8882ff" />
      <LinearGradient colors={['#1b8882ff', '#16b43eff']} style={styles.gradient}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Request Blood</Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formCard}>
              {/* Blood Type Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Blood Information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Blood Type Needed *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.bloodType}
                      onValueChange={(value) => handleInputChange('bloodType', value)}
                      style={styles.picker}
                      enabled={!loading}
                    >
                      {BLOOD_TYPES.map((type) => (
                        <Picker.Item key={type} label={type} value={type} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Urgency Level *</Text>
                  <View style={styles.urgencyContainer}>
                    <TouchableOpacity
                      style={[
                        styles.urgencyButton,
                        formData.urgencyLevel === 'moderate' && styles.urgencyButtonActive,
                      ]}
                      onPress={() => handleInputChange('urgencyLevel', 'moderate')}
                      disabled={loading}
                    >
                      <Ionicons
                        name="information-circle"
                        size={20}
                        color={formData.urgencyLevel === 'moderate' ? '#FFFFFF' : '#10B981'}
                      />
                      <Text
                        style={[
                          styles.urgencyButtonText,
                          formData.urgencyLevel === 'moderate' && styles.urgencyButtonTextActive,
                        ]}
                      >
                        Moderate
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.urgencyButton,
                        styles.urgencyButtonUrgent,
                        formData.urgencyLevel === 'urgent' && styles.urgencyButtonUrgentActive,
                      ]}
                      onPress={() => handleInputChange('urgencyLevel', 'urgent')}
                      disabled={loading}
                    >
                      <Ionicons
                        name="alert-circle"
                        size={20}
                        color={formData.urgencyLevel === 'urgent' ? '#FFFFFF' : '#F59E0B'}
                      />
                      <Text
                        style={[
                          styles.urgencyButtonText,
                          styles.urgencyButtonTextUrgent,
                          formData.urgencyLevel === 'urgent' && styles.urgencyButtonTextActive,
                        ]}
                      >
                        Urgent
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.urgencyButton,
                        styles.urgencyButtonCritical,
                        formData.urgencyLevel === 'critical' && styles.urgencyButtonCriticalActive,
                      ]}
                      onPress={() => handleInputChange('urgencyLevel', 'critical')}
                      disabled={loading}
                    >
                      <Ionicons
                        name="warning"
                        size={20}
                        color={formData.urgencyLevel === 'critical' ? '#FFFFFF' : '#EF4444'}
                      />
                      <Text
                        style={[
                          styles.urgencyButtonText,
                          styles.urgencyButtonTextCritical,
                          formData.urgencyLevel === 'critical' && styles.urgencyButtonTextActive,
                        ]}
                      >
                        Critical
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Units Needed *</Text>
                  <TextInput
                    style={[styles.input, errors.unitsNeeded && styles.inputError]}
                    value={formData.unitsNeeded}
                    onChangeText={(value) => handleInputChange('unitsNeeded', value)}
                    placeholder="Enter number of units (1-10)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    editable={!loading}
                  />
                  {errors.unitsNeeded && (
                    <Text style={styles.errorText}>{errors.unitsNeeded}</Text>
                  )}
                </View>
              </View>

              {/* Patient Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Patient Information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Patient Name *</Text>
                  <TextInput
                    style={[styles.input, errors.patientName && styles.inputError]}
                    value={formData.patientName}
                    onChangeText={(value) => handleInputChange('patientName', value)}
                    placeholder="Enter patient name"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    editable={!loading}
                  />
                  {errors.patientName && (
                    <Text style={styles.errorText}>{errors.patientName}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hospital/Clinic Name *</Text>
                  <TextInput
                    style={[styles.input, errors.hospitalName && styles.inputError]}
                    value={formData.hospitalName}
                    onChangeText={(value) => handleInputChange('hospitalName', value)}
                    placeholder="Enter hospital or clinic name"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    editable={!loading}
                  />
                  {errors.hospitalName && (
                    <Text style={styles.errorText}>{errors.hospitalName}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contact Number *</Text>
                  <TextInput
                    style={[styles.input, errors.requesterPhone && styles.inputError]}
                    value={formData.requesterPhone}
                    onChangeText={(value) => handleInputChange('requesterPhone', value)}
                    placeholder="Enter contact number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                  {errors.requesterPhone && (
                    <Text style={styles.errorText}>{errors.requesterPhone}</Text>
                  )}
                </View>
              </View>

              {/* Location Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Location</Text>

                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={getCurrentLocation}
                  disabled={loading || loadingLocation}
                >
                  {loadingLocation ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="location" size={20} color="#FFFFFF" />
                      <Text style={styles.locationButtonText}>Use Current Location</Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.orText}>OR</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Enter Address Manually</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, errors.location && styles.inputError]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Enter hospital address"
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!loading}
                  />
                  {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
                </View>

                {location && (
                  <View style={styles.locationConfirm}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.locationConfirmText}>Location captured</Text>
                  </View>
                )}
              </View>

              {/* Additional Notes */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>

                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  placeholder="Any additional information or special requirements..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.infoText}>
                  Your request will be sent to all compatible donors in your area. They will be
                  able to see your contact information and location.
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text style={styles.loadingButtonText}>Creating Request...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit Blood Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
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
  urgencyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  urgencyButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  urgencyButtonUrgent: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  urgencyButtonUrgentActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  urgencyButtonCritical: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  urgencyButtonCriticalActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  urgencyButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
  },
  urgencyButtonTextUrgent: {
    color: '#F59E0B',
  },
  urgencyButtonTextCritical: {
    color: '#EF4444',
  },
  urgencyButtonTextActive: {
    color: '#FFFFFF',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#64748B',
    marginVertical: 8,
  },
  locationConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
  locationConfirmText: {
    fontSize: 14,
    color: '#047857',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    marginLeft: 10,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default NeedBloodScreen;