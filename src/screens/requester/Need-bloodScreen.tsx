import { useImagePicker } from '@/hooks/useImagePicker';
import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import {
  createBloodRequest,
  createNotification,
  getBloodBanks,
  getUsersByBloodType
} from '@/src/services/firebase/database';
import { BloodBank, BloodType, Donor, Location, UrgencyLevel } from '@/src/types/types';
import { showRatingPrompt } from '@/src/utils/ratingPromptHelper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BLOOD_COMPONENTS = [
  'Whole Blood (Full Blood)',
  'Red Blood Cells (Packed Red Cells)',
  'Platelets',
  'Plasma',
  'Cryoprecipitate'
];

const NeedBloodScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const { colors, isDark } = useAppTheme();
  const { pickAndUploadImage, takeAndUploadPhoto, uploading: imageUploading, error: imageError } = useImagePicker();

  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<string>('');
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [isHospitalExpanded, setIsHospitalExpanded] = useState(false);
  const [isBloodTypeExpanded, setIsBloodTypeExpanded] = useState(false);
  const [isBloodComponentExpanded, setIsBloodComponentExpanded] = useState(false);
  const [hospitalSearchQuery, setHospitalSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    bloodType: 'O+' as BloodType,
    urgencyLevel: 'urgent' as UrgencyLevel,
    patientName: '',
    hospitalId: '',
    hospitalName: '',
    hospitalAddress: '',
    bloodComponent: 'Whole Blood',
    hospitalFormUrl: '',
    requesterPhone: user?.phoneNumber || '',
    description: '',
    unitsNeeded: '1',
  });

  const [location, setLocation] = useState<Location | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Check location permissions and fetch hospitals on mount
  useEffect(() => {
    checkLocationPermission();
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      const banks = await getBloodBanks();
      setBloodBanks(banks);
    } catch (error) {
      console.log('Error fetching blood banks:', error);
    }
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Upload Request Form',
      'Choose an option to upload the clinical document',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const imageUrl = await takeAndUploadPhoto(`bloodlink/requests/${user?.id}`);
            if (imageUrl) {
              handleInputChange('hospitalFormUrl', imageUrl);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const imageUrl = await pickAndUploadImage(`bloodlink/requests/${user?.id}`);
            if (imageUrl) {
              handleInputChange('hospitalFormUrl', imageUrl);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      setLocationPermissionStatus(status);
    } catch (error) {
      console.log('Error checking location permission:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  const filteredHospitals = useMemo(() => {
    let results = [...bloodBanks];

    if (hospitalSearchQuery.trim()) {
      const q = hospitalSearchQuery.toLowerCase();
      results = results.filter(bank =>
        bank.name.toLowerCase().includes(q) ||
        bank.address.toLowerCase().includes(q) ||
        (bank.location.city || '').toLowerCase().includes(q)
      );
    }

    if (location && location.latitude !== 0) {
      results = results.map(bank => ({
        ...bank,
        distance: calculateDistance(
          location.latitude,
          location.longitude,
          bank.location.latitude,
          bank.location.longitude
        )
      })).sort((a: any, b: any) => a.distance - b.distance);
    }

    return results;
  }, [bloodBanks, hospitalSearchQuery, location]);

  const selectHospital = (bank: BloodBank | 'other') => {
    if (bank === 'other') {
      setFormData(prev => ({
        ...prev,
        hospitalId: 'other',
        hospitalName: '',
        hospitalAddress: ''
      }));
      setLocation(null); // Clear specific hospital location for manual entry
    } else {
      setFormData(prev => ({
        ...prev,
        hospitalId: bank.id,
        hospitalName: bank.name,
        hospitalAddress: bank.address
      }));
      if (bank.location) {
        setLocation({
          latitude: bank.location.latitude,
          longitude: bank.location.longitude,
          address: bank.address,
          city: bank.location.city || '',
          region: bank.location.region || '',
        });
      }
    }
    setIsHospitalExpanded(false);
    setHospitalSearchQuery('');
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
        console.log('Geocoding error:', geocodeError);

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
      console.log('Location error details:', error);

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

    if (!formData.bloodComponent) {
      newErrors.bloodComponent = 'Blood component is required';
    }

    if (!formData.hospitalFormUrl) {
      newErrors.hospitalForm = 'Hospital form image is required for verification';
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
              // Image should already be uploaded at this point
              const hospitalFormUrl = formData.hospitalFormUrl;

              // location object matching Location interface
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

              //request data with ALL required fields
              const requestData = {
                requesterId: user.id,
                requesterName: `${user.firstName} ${user.lastName}`,
                requesterPhone: formData.requesterPhone,
                bloodType: formData.bloodType,
                urgencyLevel: formData.urgencyLevel,
                urgency: formData.urgencyLevel,
                patientName: formData.patientName,
                hospitalId: formData.hospitalId,
                hospitalName: formData.hospitalName,
                hospitalAddress: formData.hospitalAddress,
                bloodComponent: formData.bloodComponent,
                hospitalFormUrl: hospitalFormUrl,
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

              const requestId = await createBloodRequest(requestData as any);

              console.log('Blood request created with ID:', requestId);

              // Try to notify donors
              try {
                const compatibleDonors = await getUsersByBloodType(formData.bloodType);
                console.log(`Found ${compatibleDonors.length} compatible donors`);

                if (compatibleDonors.length > 0) {

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
                          : ''}${formData.patientName} needs ${formData.bloodType} ${formData.bloodComponent} at ${formData.hospitalName}`,
                        data: {
                          requestId: requestId,
                          bloodType: formData.bloodType,
                          bloodComponent: formData.bloodComponent,
                          urgency: formData.urgencyLevel,
                        },
                        isRead: false,
                        timestamp: ''
                      }).catch(err => {
                        console.log(`Failed to notify donor ${donor.id}:`, err);
                        return null;
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
                console.log('Error sending notifications:', notificationError);
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
              console.log('Error creating blood request:', error);

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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  });

  const styles = StyleSheet.create({
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      height: 50,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 15,
    },
    searchInput: {
      flex: 1,
      marginLeft: 10,
      fontSize: 16,
    },
    hospitalList: {
      flex: 1,
    },
    hospitalItem: {
      flexDirection: 'row',
      paddingVertical: 15,
      borderBottomWidth: 1,
      alignItems: 'center',
    },
    hospitalIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#f0f9ff',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    hospitalInfo: {
      flex: 1,
    },
    hospitalNameText: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    hospitalAddressText: {
      fontSize: 13,
      lineHeight: 18,
    },
    distanceText: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    hospitalSelectorTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 56,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    hospitalSelectorText: {
      fontSize: 16,
      color: colors.text,
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
    },
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      paddingTop: StatusBar.currentHeight || 44,
      paddingBottom: 25,
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
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
      marginLeft: 15,
    },
    keyboardAvoid: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 24,
      marginTop: -20,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    section: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    pickerContainer: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      height: 56,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    picker: {
      color: colors.text,
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
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBg,
      gap: 6,
    },
    urgencyButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
    },
    helperText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 18,
    },
    locationButton: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
      marginTop: 8,
    },
    locationButtonDisabled: {
      opacity: 0.6,
    },
    locationButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 15,
    },
    locationConfirm: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      borderRadius: 12,
      marginTop: 15,
      gap: 12,
    },
    locationInfo: {
      flex: 1,
    },
    locationConfirmText: {
      fontWeight: '700',
      fontSize: 14,
    },
    locationCoords: {
      fontSize: 12,
      marginTop: 2,
    },
    locationDetails: {
      fontSize: 12,
      marginTop: 1,
    },
    uploadCard: {
      backgroundColor: colors.inputBg,
      borderRadius: 16,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 140,
    },
    uploadPlaceholder: {
      alignItems: 'center',
    },
    uploadText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: 12,
    },
    uploadSubtext: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    imagePreviewContainer: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    changeImageBadge: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    changeImageText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    submitButton: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      borderRadius: 16,
      marginTop: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      gap: 10,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
    },
    selectionModalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 24,
      width: '100%',
    },
    selectionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
      paddingTop: 8,
    },
    selectionItem: {
      width: '22%',
      aspectRatio: 1,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.divider,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    selectionText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginTop: 4,
    },
    listSelectionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.divider,
      marginBottom: 10,
    },
    listSelectionIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    listSelectionText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    pickerTriggerExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderColor: colors.primary,
    },
    inlineSelectionContainer: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: colors.primary,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

      {/* Selection sections will be rendered inline in the ScrollView */}


      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.formCard, shadowStyle]}>
            {/* Blood Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Blood Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Blood Type Needed *</Text>
                <TouchableOpacity
                  style={[styles.hospitalSelectorTrigger, isBloodTypeExpanded && styles.pickerTriggerExpanded]}
                  onPress={() => {
                    setIsBloodTypeExpanded(!isBloodTypeExpanded);
                    setIsBloodComponentExpanded(false);
                    setIsHospitalExpanded(false);
                  }}
                  disabled={loading}
                >
                  <Text style={[styles.hospitalSelectorText, { color: colors.text }]}>
                    {formData.bloodType}
                  </Text>
                  <Ionicons name={isBloodTypeExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {isBloodTypeExpanded && (
                  <View style={styles.inlineSelectionContainer}>
                    <View style={styles.selectionGrid}>
                      {BLOOD_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.selectionItem,
                            formData.bloodType === type && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }
                          ]}
                          onPress={() => {
                            handleInputChange('bloodType', type);
                            setIsBloodTypeExpanded(false);
                          }}
                        >
                          <Ionicons
                            name="water"
                            size={20}
                            color={formData.bloodType === type ? colors.primary : colors.textSecondary}
                          />
                          <Text style={[
                            styles.selectionText,
                            { fontSize: 13 },
                            formData.bloodType === type && { color: colors.primary, fontWeight: '700' }
                          ]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Urgency Level *</Text>
                <View style={styles.urgencyContainer}>
                  <TouchableOpacity
                    style={[
                      styles.urgencyButton,
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
                        formData.urgencyLevel === 'moderate' && { color: '#FFFFFF' },
                      ]}
                    >
                      Moderate
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.urgencyButton,
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
                        formData.urgencyLevel === 'urgent' && { color: '#FFFFFF' },
                      ]}
                    >
                      Urgent
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.urgencyButton,
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
                        formData.urgencyLevel === 'critical' && { color: '#FFFFFF' },
                      ]}
                    >
                      Critical
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Units Needed (1-10) *</Text>
                <TextInput
                  style={[styles.input, errors.unitsNeeded && { borderColor: colors.danger }]}
                  placeholder="Number of units"
                  placeholderTextColor={colors.textMuted}
                  value={formData.unitsNeeded}
                  onChangeText={(text) => handleInputChange('unitsNeeded', text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!loading}
                />
                {errors.unitsNeeded && <Text style={styles.errorText}>{errors.unitsNeeded}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Blood Component *</Text>
                <TouchableOpacity
                  style={[styles.hospitalSelectorTrigger, isBloodComponentExpanded && styles.pickerTriggerExpanded]}
                  onPress={() => {
                    setIsBloodComponentExpanded(!isBloodComponentExpanded);
                    setIsBloodTypeExpanded(false);
                    setIsHospitalExpanded(false);
                  }}
                  disabled={loading}
                >
                  <Text style={[styles.hospitalSelectorText, { color: colors.text }]}>
                    {formData.bloodComponent}
                  </Text>
                  <Ionicons name={isBloodComponentExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {isBloodComponentExpanded && (
                  <View style={styles.inlineSelectionContainer}>
                    {BLOOD_COMPONENTS.map((comp) => (
                      <TouchableOpacity
                        key={comp}
                        style={[
                          styles.listSelectionItem,
                          formData.bloodComponent === comp && { backgroundColor: colors.surfaceAlt, borderColor: colors.primary },
                          { marginBottom: 8 }
                        ]}
                        onPress={() => {
                          handleInputChange('bloodComponent', comp);
                          setIsBloodComponentExpanded(false);
                        }}
                      >
                        <View style={[
                          styles.listSelectionIcon,
                          {
                            width: 32, height: 32,
                            backgroundColor: formData.bloodComponent === comp ? `${colors.primary}15` : colors.surfaceAlt
                          }
                        ]}>
                          <Ionicons
                            name="flask-outline"
                            size={16}
                            color={formData.bloodComponent === comp ? colors.primary : colors.textSecondary}
                          />
                        </View>
                        <Text style={[
                          styles.listSelectionText,
                          { fontSize: 14 },
                          formData.bloodComponent === comp && { color: colors.primary, fontWeight: '700' }
                        ]}>
                          {comp}
                        </Text>
                        {formData.bloodComponent === comp && (
                          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {errors.bloodComponent && <Text style={styles.errorText}>{errors.bloodComponent}</Text>}
              </View>
            </View>

            {/* Patient Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Patient Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Patient Name *</Text>
                <TextInput
                  style={[styles.input, errors.patientName && { borderColor: colors.danger }]}
                  placeholder="Enter patient's full name"
                  placeholderTextColor={colors.textMuted}
                  value={formData.patientName}
                  onChangeText={(text) => handleInputChange('patientName', text)}
                  editable={!loading}
                />
                {errors.patientName && <Text style={styles.errorText}>{errors.patientName}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number *</Text>
                <TextInput
                  style={[styles.input, errors.requesterPhone && { borderColor: colors.danger }]}
                  placeholder="Your contact number"
                  placeholderTextColor={colors.textMuted}
                  value={formData.requesterPhone}
                  onChangeText={(text) => handleInputChange('requesterPhone', text)}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                {errors.requesterPhone && <Text style={styles.errorText}>{errors.requesterPhone}</Text>}
              </View>
            </View>

            {/* Hospital Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hospital Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Hospital *</Text>
                <TouchableOpacity
                  style={[styles.hospitalSelectorTrigger, isHospitalExpanded && styles.pickerTriggerExpanded]}
                  onPress={() => {
                    setIsHospitalExpanded(!isHospitalExpanded);
                    setIsBloodTypeExpanded(false);
                    setIsBloodComponentExpanded(false);
                  }}
                >
                  <Text style={[
                    styles.hospitalSelectorText,
                    !formData.hospitalId && { color: colors.textMuted }
                  ]}>
                    {formData.hospitalId === 'other'
                      ? (formData.hospitalName ? `Other: ${formData.hospitalName}` : 'Other Hospital (Manual Entry)')
                      : formData.hospitalName || 'Choose from list...'
                    }
                  </Text>
                  <Ionicons name={isHospitalExpanded ? "chevron-up" : "search"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {isHospitalExpanded && (
                  <View style={styles.inlineSelectionContainer}>
                    <View style={[styles.searchBar, { marginTop: 8 }]}>
                      <Ionicons name="search" size={18} color={colors.textSecondary} />
                      <TextInput
                        style={[styles.searchInput, { color: colors.text, fontSize: 14 }]}
                        placeholder="Search hospital..."
                        placeholderTextColor={colors.textMuted}
                        value={hospitalSearchQuery}
                        onChangeText={setHospitalSearchQuery}
                      />
                    </View>

                    <View style={{ maxHeight: 250 }}>
                      <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                        <TouchableOpacity
                          style={[styles.hospitalItem, { paddingVertical: 10 }]}
                          onPress={() => selectHospital('other')}
                        >
                          <View style={[styles.hospitalIcon, { width: 36, height: 36, backgroundColor: colors.surfaceAlt }]}>
                            <Ionicons name="pencil" size={20} color={colors.primary} />
                          </View>
                          <View style={styles.hospitalInfo}>
                            <Text style={[styles.hospitalNameText, { fontSize: 14, color: colors.text }]}>Other Hospital</Text>
                            <Text style={[styles.hospitalAddressText, { fontSize: 12, color: colors.textSecondary }]}>Enter details manually</Text>
                          </View>
                        </TouchableOpacity>

                        {filteredHospitals.length > 0 ? (
                          filteredHospitals.map((bank) => (
                            <TouchableOpacity
                              key={bank.id}
                              style={[styles.hospitalItem, { paddingVertical: 10 }]}
                              onPress={() => selectHospital(bank)}
                            >
                              <View style={[styles.hospitalIcon, { width: 36, height: 36, backgroundColor: colors.surfaceAlt }]}>
                                <Ionicons name="business" size={20} color={colors.primary} />
                              </View>
                              <View style={styles.hospitalInfo}>
                                <Text style={[styles.hospitalNameText, { fontSize: 14, color: colors.text }]}>{bank.name}</Text>
                                <Text style={[styles.hospitalAddressText, { fontSize: 11, color: colors.textSecondary }]} numberOfLines={1}>{bank.address}</Text>
                                {bank.distance !== undefined && (
                                  <Text style={[styles.distanceText, { fontSize: 10, color: colors.primary }]}>
                                    {bank.distance.toFixed(1)} km away
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { fontSize: 14, color: colors.textMuted }]}>
                              No hospitals found
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  </View>
                )}
              </View>

              {(formData.hospitalId === 'other' || !formData.hospitalId) && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hospital Name *</Text>
                  <TextInput
                    style={[styles.input, errors.hospitalName && { borderColor: colors.danger }]}
                    placeholder="Enter hospital name"
                    placeholderTextColor={colors.textMuted}
                    value={formData.hospitalName}
                    onChangeText={(text) => handleInputChange('hospitalName', text)}
                    editable={!loading}
                  />
                  {errors.hospitalName && <Text style={styles.errorText}>{errors.hospitalName}</Text>}
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hospital Address *</Text>
                <TextInput
                  style={[styles.input, styles.textArea, errors.hospitalAddress && { borderColor: colors.danger }]}
                  placeholder="Enter hospital address"
                  placeholderTextColor={colors.textMuted}
                  value={formData.hospitalAddress}
                  onChangeText={(text) => handleInputChange('hospitalAddress', text)}
                  editable={!loading}
                  multiline
                />
                {errors.hospitalAddress && <Text style={styles.errorText}>{errors.hospitalAddress}</Text>}
              </View>

              {(!formData.hospitalId || formData.hospitalId === 'other') && (
                <TouchableOpacity
                  style={[styles.locationButton, loadingLocation && styles.locationButtonDisabled]}
                  onPress={getCurrentLocation}
                  disabled={loadingLocation || loading}
                >
                  {loadingLocation ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="location" size={20} color="#FFFFFF" />
                      <Text style={styles.locationButtonText}>
                        {location ? 'Update GPS Location' : 'Get Current Location'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {location && location.latitude !== 0 && (
                <View style={[styles.locationConfirm, { backgroundColor: colors.success + '15' }]}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  <View style={styles.locationInfo}>
                    <Text style={[styles.locationConfirmText, { color: colors.success }]}>GPS Location Captured</Text>
                    <Text style={[styles.locationCoords, { color: colors.textSecondary }]}>
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </Text>
                    {location.address && (
                      <Text style={[styles.locationDetails, { color: colors.textSecondary }]} numberOfLines={1}>
                        {location.address}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Verification Document Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Verification Document</Text>
              <Text style={styles.helperText}>
                Please upload an image of the blood request form from the hospital for admin verification.
              </Text>

              <TouchableOpacity
                style={[
                  styles.uploadCard,
                  { borderColor: formData.hospitalFormUrl ? colors.success : colors.primary }
                ]}
                onPress={handleImagePicker}
                disabled={loading || imageUploading}
              >
                {formData.hospitalFormUrl ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: formData.hospitalFormUrl }} style={styles.previewImage} />
                    <View style={styles.changeImageBadge}>
                      <Ionicons name="camera" size={16} color="#FFFFFF" />
                      <Text style={styles.changeImageText}>Change Image</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    {imageUploading ? (
                      <ActivityIndicator size="large" color={colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={40} color={colors.primary} />
                        <Text style={styles.uploadText}>Upload Request Form</Text>
                        <Text style={styles.uploadSubtext}>JPG, PNG allowed (Max 5MB)</Text>
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>
              {imageError && <Text style={styles.errorText}>{imageError}</Text>}
              {errors.hospitalForm && <Text style={styles.errorText}>{errors.hospitalForm}</Text>}
            </View>

            {/* Optional Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Case Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Briefly describe the medical situation..."
                  placeholderTextColor={colors.textMuted}
                  value={formData.description}
                  onChangeText={(text) => handleInputChange('description', text)}
                  multiline
                  numberOfLines={4}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (loading || imageUploading) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={loading || imageUploading}
            >
              {(loading || imageUploading) ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Create Blood Request</Text>
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default NeedBloodScreen;