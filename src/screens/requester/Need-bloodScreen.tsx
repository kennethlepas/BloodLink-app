import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import {
  createBloodRequest,
  createNotification,
  getUsersByBloodType
} from '@/src/services/firebase/database';
import { BloodType, Donor, Location, UrgencyLevel } from '@/src/types/types';
import { showRatingPrompt } from '@/src/utils/ratingPromptHelper';
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
  const { colors, isDark } = useAppTheme();

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

              // Create request data with ALL required fields including 'urgency'
              const requestData = {
                requesterId: user.id,
                requesterName: `${user.firstName} ${user.lastName}`,
                requesterPhone: formData.requesterPhone,
                bloodType: formData.bloodType,
                urgencyLevel: formData.urgencyLevel,
                urgency: formData.urgencyLevel, // matches the urgencyLevel
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
                        // Show rating prompt after successful request creation
                        if (user?.id) {
                          showRatingPrompt(router, user.id);
                        }

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
                        if (user?.id) {
                          showRatingPrompt(router, user.id);
                        }

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

              let errorMessage = 'Failed to create blood request. Please try again.';

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

  const shadowStyle = Platform.select({
    web: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' } as any,
    default: {
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <LinearGradient colors={[colors.primary, '#60A5FA']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Blood</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }, shadowStyle]}>
            {/* Blood Type Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Blood Information</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Blood Type Needed *</Text>
                <View style={[styles.pickerContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <Picker
                    selectedValue={formData.bloodType}
                    onValueChange={(value) => handleInputChange('bloodType', value)}
                    style={[styles.picker, { color: colors.text }]}
                    enabled={!loading}
                    dropdownIconColor={colors.textSecondary}
                  >
                    {BLOOD_TYPES.map((type) => (
                      <Picker.Item key={type} label={type} value={type} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Urgency Level *</Text>
                <View style={styles.urgencyContainer}>
                  <TouchableOpacity
                    style={[
                      styles.urgencyButton,
                      { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                      formData.urgencyLevel === 'moderate' && { backgroundColor: colors.success, borderColor: colors.success },
                    ]}
                    onPress={() => handleInputChange('urgencyLevel', 'moderate')}
                    disabled={loading}
                  >
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color={formData.urgencyLevel === 'moderate' ? '#FFFFFF' : colors.success}
                    />
                    <Text
                      style={[
                        styles.urgencyButtonText,
                        { color: colors.textSecondary },
                        formData.urgencyLevel === 'moderate' && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      Moderate
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.urgencyButton,
                      { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                      formData.urgencyLevel === 'urgent' && { backgroundColor: colors.warning, borderColor: colors.warning },
                    ]}
                    onPress={() => handleInputChange('urgencyLevel', 'urgent')}
                    disabled={loading}
                  >
                    <Ionicons
                      name="alert-circle"
                      size={20}
                      color={formData.urgencyLevel === 'urgent' ? '#FFFFFF' : colors.warning}
                    />
                    <Text
                      style={[
                        styles.urgencyButtonText,
                        { color: colors.textSecondary },
                        formData.urgencyLevel === 'urgent' && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      Urgent
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.urgencyButton,
                      { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                      formData.urgencyLevel === 'critical' && { backgroundColor: colors.danger, borderColor: colors.danger },
                    ]}
                    onPress={() => handleInputChange('urgencyLevel', 'critical')}
                    disabled={loading}
                  >
                    <Ionicons
                      name="warning"
                      size={20}
                      color={formData.urgencyLevel === 'critical' ? '#FFFFFF' : colors.danger}
                    />
                    <Text
                      style={[
                        styles.urgencyButtonText,
                        { color: colors.textSecondary },
                        formData.urgencyLevel === 'critical' && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      Critical
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Units Needed *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
                    errors.unitsNeeded && { borderColor: colors.danger }
                  ]}
                  value={formData.unitsNeeded}
                  onChangeText={(value) => handleInputChange('unitsNeeded', value)}
                  placeholder="Enter number of units (1-10)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  editable={!loading}
                />
                {errors.unitsNeeded && (
                  <Text style={[styles.errorText, { color: colors.danger }]}>{errors.unitsNeeded}</Text>
                )}
              </View>
            </View>

            {/* Patient Information */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Patient Information</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Patient Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
                    errors.patientName && { borderColor: colors.danger }
                  ]}
                  value={formData.patientName}
                  onChangeText={(value) => handleInputChange('patientName', value)}
                  placeholder="Enter patient name"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  editable={!loading}
                />
                {errors.patientName && (
                  <Text style={[styles.errorText, { color: colors.danger }]}>{errors.patientName}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Hospital/Clinic Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
                    errors.hospitalName && { borderColor: colors.danger }
                  ]}
                  value={formData.hospitalName}
                  onChangeText={(value) => handleInputChange('hospitalName', value)}
                  placeholder="e.g., Kenyatta National Hospital"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  editable={!loading}
                />
                {errors.hospitalName && (
                  <Text style={[styles.errorText, { color: colors.danger }]}>{errors.hospitalName}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Hospital Address *</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
                    errors.hospitalAddress && { borderColor: colors.danger }
                  ]}
                  value={formData.hospitalAddress}
                  onChangeText={(value) => handleInputChange('hospitalAddress', value)}
                  placeholder="e.g., Hospital Rd, Upper Hill, Nairobi"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                />
                {errors.hospitalAddress && (
                  <Text style={[styles.errorText, { color: colors.danger }]}>{errors.hospitalAddress}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Contact Number *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
                    errors.requesterPhone && { borderColor: colors.danger }
                  ]}
                  value={formData.requesterPhone}
                  onChangeText={(value) => handleInputChange('requesterPhone', value)}
                  placeholder="Enter contact number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                {errors.requesterPhone && (
                  <Text style={[styles.errorText, { color: colors.danger }]}>{errors.requesterPhone}</Text>
                )}
              </View>
            </View>

            {/* Location Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Precise Location (Optional)</Text>
              <Text style={[styles.helperText, { color: colors.textMuted }]}>
                Adding GPS coordinates helps donors navigate to you faster
              </Text>

              <TouchableOpacity
                style={[
                  styles.locationButton,
                  { backgroundColor: colors.primary },
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
                <View style={[styles.locationConfirm, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5' }]}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <View style={styles.locationInfo}>
                    <Text style={[styles.locationConfirmText, { color: colors.success }]}>GPS Location Captured</Text>
                    <Text style={[styles.locationCoords, { color: colors.textSecondary }]}>
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </Text>
                    {location.city && location.region && (
                      <Text style={[styles.locationDetails, { color: colors.textMuted }]}>
                        {location.city}, {location.region}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.primary },
                  loading && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Request Blood</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    height: 52,
    justifyContent: 'center',
  },
  picker: {
    // Picker styles handled via props
  },
  urgencyContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  urgencyButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 19,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginBottom: 16,
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  locationConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationConfirmText: {
    fontWeight: '700',
    fontSize: 13,
  },
  locationCoords: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  locationDetails: {
    fontSize: 12,
    marginTop: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 100, // Pill shape
    gap: 10,
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default NeedBloodScreen;