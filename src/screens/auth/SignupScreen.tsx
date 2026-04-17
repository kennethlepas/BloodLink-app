import { useImagePicker } from '@/hooks/useImagePicker';
import { KENYA_COUNTIES, getSubCountiesByCounty } from '@/src/constants/kenyaLocations';
import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { createUser } from '@/src/services/firebase/database';
import { auth, db } from '@/src/services/firebase/firebase';
import { getCurrentLocation } from '@/src/services/location/locationService';
import { BloodType, SignupFormData, UserType } from '@/src/types/types';
import { transformFirebaseUser } from '@/src/types/userTransform';
import { mapErrorMessage } from '@/src/utils/errorMapper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoLocation from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive sizing helpers
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface SignupScreenProps {
  userType?: UserType;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ userType: propUserType }) => {
  const router = useRouter();
  const { login } = useUser();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ userType?: 'donor' | 'requester' }>();

  const { pickAndUploadImage, takeAndUploadPhoto, uploading: imageUploading, error: imageError } = useImagePicker();
  const [loading, setLoading] = useState(false);
  const [isBloodTypeExpanded, setIsBloodTypeExpanded] = useState(false);
  const [isCountyExpanded, setIsCountyExpanded] = useState(false);
  const [isSubCountyExpanded, setIsSubCountyExpanded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [countySearch, setCountySearch] = useState('');
  const [subCountySearch, setSubCountySearch] = useState('');

  const selectedUserType = propUserType || params.userType || 'donor';

  const [formData, setFormData] = useState<SignupFormData & { profilePicture?: string }>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    bloodType: 'O+',
    userType: selectedUserType,
    county: '',
    profilePicture: undefined,
    location: undefined,
  });

  const handleImagePicker = () => {
    if (Platform.OS === 'web') {
      uploadImageFromGallery();
      return;
    }

    Alert.alert(
      'Upload Profile Picture',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: uploadImageFromCamera,
        },
        {
          text: 'Choose from Gallery',
          onPress: uploadImageFromGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const uploadImageFromGallery = async () => {
    try {
      const imageUrl = await pickAndUploadImage('bloodlink/profile_pictures');

      if (imageUrl) {
        handleInputChange('profilePicture', imageUrl);
      }
    } catch (error) {
      console.error('Error uploading from gallery:', error);
      Alert.alert('Error', 'Failed to upload image from gallery');
    }
  };

  const uploadImageFromCamera = async () => {
    try {
      const imageUrl = await takeAndUploadPhoto('bloodlink/profile_pictures');

      if (imageUrl) {
        handleInputChange('profilePicture', imageUrl);
      }
    } catch (error) {
      console.error('Error uploading from camera:', error);
      Alert.alert('Error', 'Failed to upload image from camera');
    }
  };

  const validateField = (field: keyof SignupFormData, value: any): string | undefined => {
    switch (field) {
      case 'firstName':
        if (!value.trim()) return 'First name is required';
        if (value.length < 2) return 'First name must be at least 2 characters';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'First name can only contain letters';
        break;

      case 'lastName':
        if (!value.trim()) return 'Last name is required';
        if (value.length < 2) return 'Last name must be at least 2 characters';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'Last name can only contain letters';
        break;

      case 'email':
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        break;

      case 'phoneNumber':
        if (!value.trim()) return 'Phone number is required';
        const phoneRegex = /^[0-9+\-\s()]+$/;
        if (!phoneRegex.test(value)) return 'Please enter a valid phone number';
        if (value.replace(/\D/g, '').length < 10) return 'Phone number must be at least 10 digits';
        break;

      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (value.length > 10) return 'Password cannot exceed 10 characters';
        if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number';
        if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(value)) return 'Password must contain at least one special character';
        break;

      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        break;

      case 'county':
        if (!value) return 'County is required';
        break;
      case 'subCounty':
        if (!value) return 'Sub-County is required';
        break;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    let hasError = false;

    const fields: (keyof SignupFormData)[] = [
      'firstName',
      'lastName',
      'email',
      'phoneNumber',
      'password',
      'confirmPassword',
      'county',
      'subCounty',
    ];

    fields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        hasError = true;
      }
    });

    if (!formData.bloodType) {
      newErrors.bloodType = 'Please select your blood type';
      hasError = true;
    }

    // Check if terms and conditions are accepted
    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the Terms & Conditions';
      hasError = true;
      Alert.alert('Terms Required', 'Please accept the Terms & Conditions and Privacy Policy to continue.');
      return false;
    }

    setErrors(newErrors);

    if (hasError) {
      const firstError = Object.values(newErrors)[0];
      Alert.alert('Validation Error', firstError);
    }

    return !hasError;
  };

  const handleInputChange = (field: keyof (SignupFormData & { profilePicture?: string }), value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: keyof SignupFormData) => {
    const value = formData[field];
    const error = validateField(field, value);
    if (error) {
      setErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  };

  const [loadingLocation, setLoadingLocation] = useState(false);

  const getCurrentLocationHandler = async () => {
    try {
      setLoadingLocation(true);

      const loc = await getCurrentLocation(ExpoLocation.Accuracy.Balanced);
      if (loc) {
        const { latitude, longitude } = loc;
        handleInputChange('location', {
          latitude,
          longitude,
          address: `${formData.subCounty}, ${formData.county}`,
          city: formData.subCounty,
          region: formData.county
        });
        Alert.alert('Success', 'Current location captured successfully!');
      } else {
        Alert.alert('Error', 'Failed to capture precise location. Please ensure location services are enabled.');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to capture precise location. Please try again.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const normalizedEmail = formData.email.trim().toLowerCase();

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        formData.password
      );
      const firebaseUser = userCredential.user;

      const baseUserData: any = {
        uid: firebaseUser.uid,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: normalizedEmail,
        phoneNumber: formData.phoneNumber.trim(),
        bloodType: formData.bloodType,
        userType: selectedUserType,
        county: formData.county,
        subCounty: formData.subCounty,
        isActive: true,
        points: 0,
        acceptedTermsAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        verificationStatus: 'unsubmitted',
        isVerified: false,
        location: formData.location || null,
      };

      if (selectedUserType === 'donor') {
        baseUserData.isAvailable = true;
        baseUserData.totalDonations = 0;
        baseUserData.isVerified = false;
      }

      if (formData.profilePicture) {
        baseUserData.profilePicture = formData.profilePicture;
      }

      await createUser(firebaseUser.uid, baseUserData);

      await sendEmailVerification(firebaseUser);

      const specificCollection = selectedUserType === 'donor' ? 'donors' : 'requesters';
      await setDoc(doc(db, specificCollection, firebaseUser.uid), baseUserData);

      const userForContext = transformFirebaseUser(baseUserData);

      Alert.alert(
        'Account Created',
        'Please check your email to verify your account. We have sent a verification link to ' + normalizedEmail,
        [
          {
            text: 'OK',
            onPress: async () => {
              // Update context and redirect
              await login(userForContext);
              router.replace('/(auth)/verify-email' as any);
            },
          },
        ]
      );
    } catch (error: any) {
      const errorMessage = mapErrorMessage(error);
      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A2647" />

      <LinearGradient
        colors={['#0A2647', '#144272', '#2C74B3']}
        style={styles.gradient}
        locations={[0, 0.5, 1]}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Simplified Header Branding - Moved inside ScrollView as requested */}
            <View style={styles.headerBranding}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.topBadgeContainer}>
                <View style={styles.introBadge}>
                  <Text style={styles.introBadgeText}>🇰🇪 Join the Movement</Text>
                </View>
                <Text style={styles.headerPageTitle}>
                  Create {selectedUserType === 'donor' ? 'Donor' : 'Requester'} Account
                </Text>
              </View>
            </View>
            <View style={styles.formCard}>

              {/* Profile Picture Section */}
              <View style={styles.profileSection}>
                <TouchableOpacity
                  style={styles.profilePictureContainer}
                  onPress={handleImagePicker}
                  disabled={loading || imageUploading}
                  activeOpacity={0.7}
                >
                  {formData.profilePicture ? (
                    <Image source={{ uri: formData.profilePicture }} style={styles.profilePicture} />
                  ) : (
                    <View style={styles.profilePlaceholder}>
                      {imageUploading ? (
                        <>
                          <ActivityIndicator size="small" color="#3B82F6" />
                          <Text style={styles.uploadingText}>Uploading...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="camera" size={moderateScale(32)} color="#94A3B8" />
                          <Text style={styles.addPhotoText}>Add Photo</Text>
                        </>
                      )}
                    </View>
                  )}
                </TouchableOpacity>

                {imageError && (
                  <Text style={styles.imageErrorText}>{imageError}</Text>
                )}
              </View>

              {/* Personal Information Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Information</Text>

                <View style={styles.row}>
                  <View style={styles.halfInputGroup}>
                    <Text style={styles.inputLabel}>First Name *</Text>
                    <TextInput
                      style={[styles.input, errors.firstName && styles.inputError]}
                      value={formData.firstName}
                      onChangeText={(value) => handleInputChange('firstName', value)}
                      onBlur={() => handleBlur('firstName')}
                      placeholder="e.g. John"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="words"
                      editable={!loading}
                    />
                    {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                  </View>

                  <View style={styles.halfInputGroup}>
                    <Text style={styles.inputLabel}>Last Name *</Text>
                    <TextInput
                      style={[styles.input, errors.lastName && styles.inputError]}
                      value={formData.lastName}
                      onChangeText={(value) => handleInputChange('lastName', value)}
                      onBlur={() => handleBlur('lastName')}
                      placeholder="e.g. Doe"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="words"
                      editable={!loading}
                    />
                    {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email *</Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    onBlur={() => handleBlur('email')}
                    placeholder="e.g. john@example.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                  />
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInputGroup}>
                    <Text style={styles.inputLabel}>Phone *</Text>
                    <TextInput
                      style={[styles.input, errors.phoneNumber && styles.inputError]}
                      value={formData.phoneNumber}
                      onChangeText={(value) => handleInputChange('phoneNumber', value)}
                      onBlur={() => handleBlur('phoneNumber')}
                      placeholder="e.g. 07... / 01..."
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      editable={!loading}
                    />
                    {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
                  </View>

                  <View style={styles.halfInputGroup}>
                    <Text style={styles.inputLabel}>Blood Type *</Text>
                    <TouchableOpacity
                      style={[styles.pickerTrigger, isBloodTypeExpanded && styles.pickerTriggerExpanded]}
                      onPress={() => {
                        setIsBloodTypeExpanded(!isBloodTypeExpanded);
                        setIsCountyExpanded(false);
                        setIsSubCountyExpanded(false);
                      }}
                      disabled={loading}
                    >
                      <Text style={[styles.pickerTriggerText, !formData.bloodType && { color: '#94A3B8' }]}>
                        {formData.bloodType || 'Type'}
                      </Text>
                      <Ionicons name={isBloodTypeExpanded ? "chevron-up" : "chevron-down"} size={18} color="#64748B" />
                    </TouchableOpacity>
                    {errors.bloodType && <Text style={styles.errorText}>{errors.bloodType}</Text>}
                  </View>
                </View>

                {isBloodTypeExpanded && (
                  <View style={[styles.robustSelectionContainer, { marginTop: verticalScale(-8) }]}>
                    {BLOOD_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.selectionItem,
                          formData.bloodType === type && { backgroundColor: '#3B82F615', borderColor: '#3B82F6' }
                        ]}
                        onPress={() => {
                          handleInputChange('bloodType', type);
                          setIsBloodTypeExpanded(false);
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons
                            name="water"
                            size={18}
                            color={formData.bloodType === type ? '#3B82F6' : '#64748B'}
                          />
                          <Text style={[
                            styles.selectionText,
                            { marginLeft: 8, marginTop: 0, fontSize: moderateScale(13) },
                            formData.bloodType === type && { color: '#3B82F6', fontWeight: '700' }
                          ]}>
                            {type}
                          </Text>
                        </View>
                        {formData.bloodType === type && (
                          <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {errors.bloodType && <Text style={styles.errorText}>{errors.bloodType}</Text>}

                {/* Location Section - Moved here as requested */}
                <View style={styles.row}>
                  <View style={styles.halfInputGroup}>
                    <Text style={styles.inputLabel}>County *</Text>
                    <TouchableOpacity
                      style={[styles.pickerTrigger, isCountyExpanded && styles.pickerTriggerExpanded]}
                      onPress={() => {
                        setIsCountyExpanded(!isCountyExpanded);
                        setIsBloodTypeExpanded(false);
                        setIsSubCountyExpanded(false);
                      }}
                      disabled={loading}
                    >
                      <Text style={[styles.pickerTriggerText, !formData.county && { color: '#94A3B8' }]}>
                        {formData.county || 'County'}
                      </Text>
                      <Ionicons name={isCountyExpanded ? "chevron-up" : "chevron-down"} size={18} color="#64748B" />
                    </TouchableOpacity>
                    {errors.county && <Text style={styles.errorText}>{errors.county}</Text>}
                  </View>

                  <View style={styles.halfInputGroup}>
                    <Text style={styles.inputLabel}>Sub-County *</Text>
                    <TouchableOpacity
                      style={[styles.pickerTrigger, isSubCountyExpanded && styles.pickerTriggerExpanded]}
                      onPress={() => {
                        if (!formData.county) {
                          Alert.alert('Selection Required', 'Please select a county first');
                          return;
                        }
                        setIsSubCountyExpanded(!isSubCountyExpanded);
                        setIsBloodTypeExpanded(false);
                        setIsCountyExpanded(false);
                      }}
                      disabled={loading}
                    >
                      <Text style={[styles.pickerTriggerText, !formData.subCounty && { color: '#94A3B8' }]}>
                        {formData.subCounty || 'Sub-County'}
                      </Text>
                      <Ionicons name={isSubCountyExpanded ? "chevron-up" : "chevron-down"} size={18} color="#64748B" />
                    </TouchableOpacity>
                    {errors.subCounty && <Text style={styles.errorText}>{errors.subCounty}</Text>}
                  </View>
                </View>

                {isCountyExpanded && (
                  <View style={[styles.robustSelectionContainer, { marginTop: verticalScale(-8) }]}>
                    <View style={styles.searchBox}>
                      <Ionicons name="search" size={16} color={colors.textSecondary} />
                      <TextInput
                        placeholder="Search County..."
                        style={styles.searchInput}
                        value={countySearch}
                        onChangeText={setCountySearch}
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <ScrollView nestedScrollEnabled={true} persistentScrollbar={true} style={{ maxHeight: verticalScale(200) }}>
                      {KENYA_COUNTIES.filter(c => c.toLowerCase().includes(countySearch.toLowerCase())).map((county) => (
                        <TouchableOpacity
                          key={county}
                          style={[
                            styles.selectionItem,
                            formData.county === county && { backgroundColor: '#3B82F615', borderColor: '#3B82F6' }
                          ]}
                          onPress={() => {
                            handleInputChange('county', county);
                            handleInputChange('subCounty', '');
                            setIsCountyExpanded(false);
                            setCountySearch('');
                          }}
                        >
                          <Text style={[
                            styles.selectionText,
                            { marginTop: 0, fontSize: moderateScale(13) },
                            formData.county === county && { color: '#3B82F6', fontWeight: '700' }
                          ]}>
                            {county}
                          </Text>
                          {formData.county === county && (
                            <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {isSubCountyExpanded && (
                  <View style={[styles.robustSelectionContainer, { marginTop: verticalScale(-8) }]}>
                    <View style={styles.searchBox}>
                      <Ionicons name="search" size={16} color={colors.textSecondary} />
                      <TextInput
                        placeholder="Search Sub-County..."
                        style={styles.searchInput}
                        value={subCountySearch}
                        onChangeText={setSubCountySearch}
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <ScrollView nestedScrollEnabled={true} persistentScrollbar={true} style={{ maxHeight: verticalScale(200) }}>
                      {getSubCountiesByCounty(formData.county || '').filter(sc => sc.toLowerCase().includes(subCountySearch.toLowerCase())).map((subCounty) => (
                        <TouchableOpacity
                          key={subCounty}
                          style={[
                            styles.selectionItem,
                            formData.subCounty === subCounty && { backgroundColor: '#3B82F615', borderColor: '#3B82F6' }
                          ]}
                          onPress={() => {
                            handleInputChange('subCounty', subCounty);
                            setIsSubCountyExpanded(false);
                            setSubCountySearch('');
                          }}
                        >
                          <Text style={[
                            styles.selectionText,
                            { marginTop: 0, fontSize: moderateScale(13) },
                            formData.subCounty === subCounty && { color: '#3B82F6', fontWeight: '700' }
                          ]}>
                            {subCounty}
                          </Text>
                          {formData.subCounty === subCounty && (
                            <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* New Location Capture Button */}
                <View style={styles.inputGroup}>
                  <TouchableOpacity
                    style={[styles.locationButton, loadingLocation && styles.buttonDisabled]}
                    onPress={getCurrentLocationHandler}
                    disabled={loading || loadingLocation}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="location" size={20} color={formData.location ? "#10B981" : "#3B82F6"} />
                    <Text style={[styles.locationButtonText, formData.location && { color: "#10B981" }]}>
                      {loadingLocation ? 'Capturing...' : formData.location ? '✓ Location Captured' : 'Capture Precise Location'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.locationHelpText}>
                    Optional but recommended for better matching and distance calculation.
                  </Text>
                </View>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={moderateScale(20)} color="#3B82F6" />
                  <Text style={styles.infoText}>
                    Your blood type information helps us match you with compatible {selectedUserType === 'donor' ? 'recipients' : 'donors'}.
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Security</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password *</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.passwordInput, errors.password && styles.inputError]}
                      value={formData.password}
                      onChangeText={(value) => handleInputChange('password', value)}
                      onBlur={() => handleBlur('password')}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      autoComplete="password-new"
                      editable={!loading}
                      maxLength={10}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password *</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.passwordInput, errors.confirmPassword && styles.inputError]}
                      value={formData.confirmPassword}
                      onChangeText={(value) => handleInputChange('confirmPassword', value)}
                      onBlur={() => handleBlur('confirmPassword')}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showConfirmPassword}
                      autoComplete="password-new"
                      editable={!loading}
                      maxLength={10}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                    >
                      <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                </View>

                <View style={styles.passwordRequirements}>
                  <Text style={styles.requirementsTitle}>Password must contain:</Text>
                  <Text style={styles.requirementItem}>• 8 to 10 characters</Text>
                  <Text style={styles.requirementItem}>• One uppercase letter</Text>
                  <Text style={styles.requirementItem}>• One lowercase letter</Text>
                  <Text style={styles.requirementItem}>• One number</Text>
                  <Text style={styles.requirementItem}>• One special character (@, #, etc.)</Text>
                </View>
              </View>

              {/* Terms and Privacy Acceptance */}
              <View style={styles.termsSection}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => {
                    setAcceptedTerms(!acceptedTerms);
                    if (errors.terms) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.terms;
                        return newErrors;
                      });
                    }
                  }}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                    {acceptedTerms && (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.termsTextContainer}>
                    <Text style={styles.termsText}>
                      I agree to the{' '}
                      <Text
                        style={styles.termsLink}
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push('/(auth)/terms-and-conditions' as any);
                        }}
                      >
                        Terms
                      </Text>
                      {' '}and{' '}
                      <Text
                        style={styles.termsLink}
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push('/(auth)/privacy-policy' as any);
                        }}
                      >
                        Privacy Policy
                      </Text>
                    </Text>
                  </View>
                </TouchableOpacity>
                {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}
              </View>

              {/* Signup Button */}
              <TouchableOpacity
                style={[styles.signupButton, (loading || imageUploading || !acceptedTerms) && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading || imageUploading || !acceptedTerms}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={acceptedTerms ? ['#3B82F6', '#2563EB'] : ['#9CA3AF', '#6B7280']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#FFFFFF" />
                      <Text style={styles.loadingButtonText}>Creating Account...</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.signupButtonText}>Create Account</Text>
                      <View style={styles.buttonIconContainer}>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/login' as any)}
                  disabled={loading}
                >
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView >
      </LinearGradient >
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A2647',
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  headerBranding: {
    paddingTop: verticalScale(10),
    marginBottom: verticalScale(15),
    alignItems: 'center',
    width: '100%',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: verticalScale(10),
  },
  topBadgeContainer: {
    marginBottom: verticalScale(10),
    alignItems: 'center',
  },
  headerPageTitle: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: verticalScale(12),
    textAlign: 'center',
  },
  introBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  introBadgeText: {
    fontSize: moderateScale(10),
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  scrollView: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: verticalScale(12),
  },
  halfInputGroup: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(30),
  },
  formCard: {
    borderRadius: 24,
    backgroundColor: '#F8FAFC', // Standard gray as requested
    padding: scale(18),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' } as any
      : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
      }),
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  profilePictureContainer: {
    alignSelf: 'center',
    marginBottom: verticalScale(8),
  },
  profilePicture: {
    width: moderateScale(90),
    height: moderateScale(90),
    borderRadius: moderateScale(45),
  },
  profilePlaceholder: {
    width: moderateScale(90),
    height: moderateScale(90),
    borderRadius: moderateScale(45),
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: moderateScale(11),
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  uploadingText: {
    fontSize: moderateScale(11),
    color: '#3B82F6',
    marginTop: 2,
    textAlign: 'center',
  },
  imageErrorText: {
    color: '#EF4444',
    fontSize: moderateScale(11),
    textAlign: 'center',
    marginTop: 2,
  },
  section: {
    marginBottom: verticalScale(15),
  },
  sectionTitle: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#3B82F6',
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: verticalScale(12),
    paddingBottom: verticalScale(4),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: verticalScale(12),
  },
  inputLabel: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(14),
    color: '#1E293B',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    paddingRight: scale(48),
    fontSize: moderateScale(14),
    color: '#1E293B',
  },
  eyeIcon: {
    padding: 4,
    position: 'absolute',
    right: scale(14),
    top: verticalScale(8),
  },
  errorText: {
    color: '#EF4444',
    fontSize: moderateScale(11),
    marginTop: 4,
    marginLeft: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: scale(10),
    borderRadius: 12,
    marginTop: verticalScale(5),
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoText: {
    fontSize: moderateScale(12),
    color: '#1E40AF',
    marginLeft: scale(8),
    flex: 1,
    lineHeight: moderateScale(16),
  },
  passwordRequirements: {
    backgroundColor: '#F0FDF4',
    padding: scale(10),
    borderRadius: 12,
    marginTop: verticalScale(5),
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  requirementsTitle: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  requirementItem: {
    fontSize: moderateScale(11),
    color: '#166534',
    marginBottom: 2,
    opacity: 0.8,
  },
  termsSection: {
    marginBottom: verticalScale(15),
    paddingTop: verticalScale(10),
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: verticalScale(4),
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: moderateScale(12),
    color: '#475569',
    lineHeight: moderateScale(18),
  },
  termsLink: {
    color: '#3B82F6',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  signupButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: verticalScale(10),
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(14),
  },
  signupButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  buttonIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingButtonText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(12),
  },
  loginText: {
    fontSize: moderateScale(13),
    color: '#64748B',
  },
  loginLink: {
    fontSize: moderateScale(13),
    color: '#3B82F6',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  pickerTrigger: {
    height: verticalScale(48),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pickerTriggerText: {
    fontSize: moderateScale(14),
    color: '#1E293B',
  },
  pickerTriggerExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: '#3B82F6',
    borderBottomWidth: 0,
  },
  robustSelectionContainer: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    padding: 4,
    marginBottom: 8,
    // Add shadow specifically to the expanded box for robustness
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  selectionItem: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    marginBottom: 4,
  },
  selectionText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#334155',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginTop: 5,
  },
  locationButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
  },
  locationHelpText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: verticalScale(40),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(13),
    color: '#1E293B',
    marginLeft: 8,
    paddingVertical: 0,
  },
});

export default SignupScreen;