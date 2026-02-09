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
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<string>('');

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
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Check location permissions on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      setLocationPermissionStatus(status);
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.location;
        return newErrors;
      });

      const isLocationEnabled = await ExpoLocation.hasServicesEnabledAsync();
      
      if (!isLocationEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to use this feature. You can still enter the hospital address manually.',
          [
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
            {
              text: 'Enter Manually',
              style: 'cancel',
            },
          ]
        );
        setLoadingLocation(false);
        return;
      }

      let { status } = await ExpoLocation.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        const { status: newStatus } = await ExpoLocation.requestForegroundPermissionsAsync();
        status = newStatus;
        setLocationPermissionStatus(newStatus);
        
        if (newStatus !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Location permission is needed to help donors find you. You can enter the address manually instead.',
            [
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                },
              },
              {
                text: 'OK',
                style: 'cancel',
              },
            ]
          );
          setLoadingLocation(false);
          return;
        }
      }

      const locationPromise = ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 0,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LOCATION_TIMEOUT')), 15000)
      );

      const position = await Promise.race([locationPromise, timeoutPromise]) as ExpoLocation.LocationObject;
      
      if (!position || !position.coords) {
        throw new Error('Invalid location data received');
      }

      const { latitude, longitude } = position.coords;

      try {
        const addresses = await ExpoLocation.reverseGeocodeAsync({ 
          latitude, 
          longitude 
        });

        if (addresses && addresses.length > 0) {
          const addr = addresses[0];
          const addressParts = [
            addr.name,
            addr.street,
            addr.streetNumber,
            addr.district,
            addr.city,
            addr.region,
          ].filter(Boolean);

          const formattedAddress = addressParts.length > 0 
            ? addressParts.join(', ')
            : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          
          const city = addr.city || addr.district || '';
          const region = addr.region || addr.subregion || '';

          const locationData: Location = {
            latitude,
            longitude,
            address: formattedAddress,
            city,
            region,
          };

          setLocation(locationData);

          if (!formData.hospitalAddress) {
            setFormData((prev) => ({ 
              ...prev, 
              hospitalAddress: formattedAddress 
            }));
          }

          Alert.alert(
            '✓ Location Captured',
            `Your location has been saved successfully.\n\n${formattedAddress}`,
            [{ text: 'OK' }]
          );
        } else {
          const locationData: Location = {
            latitude,
            longitude,
            address: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          };
          setLocation(locationData);
          
          Alert.alert(
            'Location Captured',
            'Coordinates saved. Please verify and update the hospital address for accuracy.',
            [{ text: 'OK' }]
          );
        }
      } catch (geocodeError) {
        console.error('Geocoding error:', geocodeError);
        
        const locationData: Location = {
          latitude,
          longitude,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        };
        setLocation(locationData);
        
        Alert.alert(
          'Location Captured',
          'Coordinates saved but address lookup failed. Please enter the hospital address manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Location error details:', error);
      
      let errorTitle = 'Location Error';
      let errorMessage = 'Unable to get your location. Please enter the hospital address manually.';
      
      if (error.message === 'LOCATION_TIMEOUT') {
        errorTitle = 'Request Timed Out';
        errorMessage = 'Location request took too long. Please try again or enter the address manually.';
      } else if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
        errorTitle = 'Location Services Off';
        errorMessage = 'Please enable location services in your device settings.';
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorTitle = 'Location Unavailable';
        errorMessage = 'Unable to determine your location. Please ensure you have a clear view of the sky if outdoors, or try again later.';
      } else if (error.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
        errorTitle = 'Location Settings Issue';
        errorMessage = 'Your device location settings need to be adjusted. Please check your settings.';
      }
      
      Alert.alert(errorTitle, errorMessage, [
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
        {
          text: 'OK',
          style: 'cancel',
        },
      ]);
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

    if (!formData.hospitalAddress.trim()) {
      newErrors.hospitalAddress = 'Hospital address is required';
    }

    if (!formData.requesterPhone.trim()) {
      newErrors.requesterPhone = 'Contact number is required';
    } else if (!/^[0-9+\-\s()]+$/.test(formData.requesterPhone)) {
      newErrors.requesterPhone = 'Invalid phone number format';
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
              // Create proper location object matching Location interface
              const requestLocation: Location = location
                ? {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    address: formData.hospitalAddress,
                    city: location.city,
                    region: location.region,
                  }
                : {
                    latitude: 0,
                    longitude: 0,
                    address: formData.hospitalAddress,
                    city: '',
                    region: '',
                  };

              // Calculate expiration date based on urgency level
              const getExpirationDate = (urgency: UrgencyLevel): string => {
                const now = Date.now();
                switch (urgency) {
                  case 'critical':
                    return new Date(now + 24 * 60 * 60 * 1000).toISOString(); // 1 day
                  case 'urgent':
                    return new Date(now + 72 * 60 * 60 * 1000).toISOString(); // 3 days
                  case 'moderate':
                    return new Date(now + 168 * 60 * 60 * 1000).toISOString(); // 7 days
                  default:
                    return new Date(now + 168 * 60 * 60 * 1000).toISOString(); // 7 days default
                }
              };

              // Create request data with required status and expiresAt fields
              const requestData = {
                requesterId: user.id,
                requesterName: `${user.firstName} ${user.lastName}`,
                requesterPhone: formData.requesterPhone,
                bloodType: formData.bloodType,
                urgencyLevel: formData.urgencyLevel,
                patientName: formData.patientName,
                hospitalName: formData.hospitalName,
                hospitalAddress: formData.hospitalAddress,
                location: requestLocation,
                unitsNeeded: parseInt(formData.unitsNeeded),
                status: 'pending' as const,
                expiresAt: getExpirationDate(formData.urgencyLevel),
                ...(formData.description && { 
                  description: formData.description,
                  notes: formData.description 
                }),
              };

              console.log('Creating blood request with data:', JSON.stringify(requestData, null, 2));

              const requestId = await createBloodRequest(requestData);

              console.log('Blood request created with ID:', requestId);

              // Try to notify donors, but don't fail if this errors
              try {
                const compatibleDonors = await getUsersByBloodType(formData.bloodType);
                console.log(`Found ${compatibleDonors.length} compatible donors`);

                if (compatibleDonors.length > 0) {
                  // Send notifications in batches to avoid overwhelming Firebase
                  const batchSize = 10;
                  for (let i = 0; i < compatibleDonors.length; i += batchSize) {
                    const batch = compatibleDonors.slice(i, i + batchSize);
                    const notificationPromises = batch.map((donor: Donor) =>
                      createNotification({
                        userId: donor.id,
                        type: 'blood_request',
                        title: 'New Blood Request',
                        message: `${formData.urgencyLevel === 'critical' || formData.urgencyLevel === 'urgent'
                            ? '🚨 URGENT: '
                            : ''}${formData.patientName} needs ${formData.bloodType} blood at ${formData.hospitalName}`,
                        data: {
                          requestId: requestId,
                          bloodType: formData.bloodType,
                          urgency: formData.urgencyLevel,
                        },
                        isRead: false,
                        timestamp: ''
                      }).catch(err => {
                        console.error(`Failed to notify donor ${donor.id}:`, err);
                        return null; // Don't fail the whole batch
                      })
                    );

                    await Promise.all(notificationPromises);
                  }
                  console.log('All notifications sent successfully');
                }

                Alert.alert(
                  'Success!',
                  `Your blood request has been created${compatibleDonors.length > 0 ? ` and ${compatibleDonors.length} compatible donor(s) have been notified` : ''}.`,
                  [
                    {
                      text: 'View My Requests',
                      onPress: () => {
                        router.replace('/(tabs)/requests' as any);
                      },
                    },
                    {
                      text: 'OK',
                      onPress: () => {
                        if (router.canGoBack()) {
                          router.back();
                        } else {
                          router.replace('/');
                        }
                      },
                    },
                  ]
                );
              } catch (notificationError) {
                console.error('Error sending notifications:', notificationError);
                // Still show success since the request was created
                Alert.alert(
                  'Request Created',
                  'Your blood request has been created, but we had trouble notifying some donors. Donors can still see your request.',
                  [
                    {
                      text: 'View My Requests',
                      onPress: () => {
                        router.replace('/(tabs)/requests' as any);
                      },
                    },
                    {
                      text: 'OK',
                      onPress: () => {
                        if (router.canGoBack()) {
                          router.back();
                        } else {
                          router.replace('/');
                        }
                      },
                    },
                  ]
                );
              }
            } catch (error: any) {
              console.error('Error creating blood request:', error);
              console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack,
              });
              
              let errorMessage = 'Failed to create blood request. Please try again.';
              
              // Provide more specific error messages
              if (error.code === 'permission-denied') {
                errorMessage = 'You do not have permission to create blood requests. Please check your account settings.';
              } else if (error.code === 'unavailable') {
                errorMessage = 'Network error. Please check your internet connection and try again.';
              } else if (error.message) {
                errorMessage = error.message;
              }
              
              Alert.alert('Error', errorMessage);
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
                    placeholder="e.g., Kenyatta National Hospital"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    editable={!loading}
                  />
                  {errors.hospitalName && (
                    <Text style={styles.errorText}>{errors.hospitalName}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hospital Address *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, errors.hospitalAddress && styles.inputError]}
                    value={formData.hospitalAddress}
                    onChangeText={(value) => handleInputChange('hospitalAddress', value)}
                    placeholder="e.g., Hospital Rd, Upper Hill, Nairobi"
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!loading}
                  />
                  {errors.hospitalAddress && (
                    <Text style={styles.errorText}>{errors.hospitalAddress}</Text>
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
                <Text style={styles.sectionTitle}>Precise Location (Optional)</Text>
                <Text style={styles.helperText}>
                  Adding GPS coordinates helps donors navigate to you faster
                </Text>

                <TouchableOpacity
                  style={[
                    styles.locationButton,
                    loadingLocation && styles.locationButtonDisabled,
                  ]}
                  onPress={getCurrentLocation}
                  disabled={loading || loadingLocation}
                >
                  {loadingLocation ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="location" size={20} color="#FFFFFF" />
                      <Text style={styles.locationButtonText}>
                        {location ? 'Update GPS Location' : 'Capture GPS Location'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {location && (
                  <View style={styles.locationConfirm}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationConfirmText}>GPS Location Captured</Text>
                      <Text style={styles.locationCoords}>
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </Text>
                      {location.city && location.region && (
                        <Text style={styles.locationDetails}>
                          {location.city}, {location.region}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {!location && (
                  <View style={styles.locationHelpCard}>
                    <Ionicons name="help-circle-outline" size={18} color="#3B82F6" />
                    <View style={styles.locationHelpContent}>
                      <Text style={styles.locationHelpTitle}>Can't get location?</Text>
                      <Text style={styles.locationHelpText}>
                        Make sure:{'\n'}
                        • Location services are enabled{'\n'}
                        • App has location permission{'\n'}
                        • You're not in airplane mode{'\n'}
                        • You have GPS signal (try outdoors)
                      </Text>
                    </View>
                  </View>
                )}

                {locationPermissionStatus === 'denied' && (
                  <View style={styles.permissionWarning}>
                    <Ionicons name="warning" size={18} color="#F59E0B" />
                    <Text style={styles.permissionWarningText}>
                      Location permission denied. Enable it in settings for better results.
                    </Text>
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
                  Your request will be sent to all compatible donors. They will be able to see
                  your contact information and hospital location.
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
  helperText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    fontStyle: 'italic',
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
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  locationConfirm: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
  locationInfo: {
    flex: 1,
  },
  locationConfirmText: {
    fontSize: 14,
    color: '#047857',
    fontWeight: '600',
  },
  locationCoords: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
  locationDetails: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
    fontStyle: 'italic',
  },
  locationHelpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  locationHelpContent: {
    flex: 1,
  },
  locationHelpTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  locationHelpText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  permissionWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
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