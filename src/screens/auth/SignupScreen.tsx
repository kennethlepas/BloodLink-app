import { useImagePicker } from '@/hooks/useImagePicker';
import { KENYA_COUNTIES, getTownsByCounty } from '@/src/constants/kenyaLocations';
import { useUser } from '@/src/contexts/UserContext';
import { createUser } from '@/src/services/firebase/database';
import { auth, db } from '@/src/services/firebase/firebase';
import { BloodType, SignupFormData, UserType } from '@/src/types/types';
import { transformFirebaseUser } from '@/src/types/userTransform';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  const params = useLocalSearchParams<{ userType?: 'donor' | 'requester' }>();

  const { pickAndUploadImage, takeAndUploadPhoto, uploading: imageUploading, error: imageError } = useImagePicker();
  const [loading, setLoading] = useState(false);
  const [isBloodTypeExpanded, setIsBloodTypeExpanded] = useState(false);
  const [isCountyExpanded, setIsCountyExpanded] = useState(false);
  const [isTownExpanded, setIsTownExpanded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
    town: '',
    profilePicture: undefined,
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
      case 'town':
        if (!value) return 'Town/City is required';
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
      'town',
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
        town: formData.town,
        isActive: true,
        points: 0,
        acceptedTermsAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
      await login(userForContext);

      Alert.alert(
        'Account Created',
        'Please check your email to verify your account.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(auth)/verify-email' as any);
            },
          },
        ]
      );
    } catch (error: any) {
      console.log('Signup error:', error);

      let errorMessage = 'Failed to create account. Please try again.';

      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Please login or use a different email.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address format.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please use a stronger password.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            if (error.message && !error.message.includes('Firebase')) {
              errorMessage = error.message;
            }
        }
      }

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
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              Create {selectedUserType === 'donor' ? 'Donor' : 'Requester'} Account
            </Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <TextInput
                    style={[styles.input, errors.firstName && styles.inputError]}
                    value={formData.firstName}
                    onChangeText={(value) => handleInputChange('firstName', value)}
                    onBlur={() => handleBlur('firstName')}
                    placeholder="Enter your first name"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    editable={!loading}
                  />
                  {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Last Name *</Text>
                  <TextInput
                    style={[styles.input, errors.lastName && styles.inputError]}
                    value={formData.lastName}
                    onChangeText={(value) => handleInputChange('lastName', value)}
                    onBlur={() => handleBlur('lastName')}
                    placeholder="Enter your last name"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    editable={!loading}
                  />
                  {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email *</Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    onBlur={() => handleBlur('email')}
                    placeholder="Enter your email"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                  />
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <TextInput
                    style={[styles.input, errors.phoneNumber && styles.inputError]}
                    value={formData.phoneNumber}
                    onChangeText={(value) => handleInputChange('phoneNumber', value)}
                    onBlur={() => handleBlur('phoneNumber')}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    editable={!loading}
                  />
                  {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
                </View>
              </View>

              {/* Medical Information Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Medical Information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Blood Type *</Text>
                  <TouchableOpacity
                    style={[styles.pickerTrigger, isBloodTypeExpanded && styles.pickerTriggerExpanded]}
                    onPress={() => {
                      setIsBloodTypeExpanded(!isBloodTypeExpanded);
                      setIsCountyExpanded(false);
                      setIsTownExpanded(false);
                    }}
                    disabled={loading}
                  >
                    <Text style={[styles.pickerTriggerText, !formData.bloodType && { color: '#94A3B8' }]}>
                      {formData.bloodType || 'Select blood type'}
                    </Text>
                    <Ionicons name={isBloodTypeExpanded ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                  </TouchableOpacity>

                  {isBloodTypeExpanded && (
                    <View style={styles.inlineSelectionContainer}>
                      {BLOOD_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.selectionItem,
                            formData.bloodType === type && { backgroundColor: '#3B82F620', borderColor: '#3B82F6' }
                          ]}
                          onPress={() => {
                            handleInputChange('bloodType', type);
                            setIsBloodTypeExpanded(false);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons
                              name="water"
                              size={20}
                              color={formData.bloodType === type ? '#3B82F6' : '#64748B'}
                            />
                            <Text style={[
                              styles.selectionText,
                              { marginLeft: 10, marginTop: 0, fontSize: moderateScale(14) },
                              formData.bloodType === type && { color: '#3B82F6', fontWeight: '700' }
                            ]}>
                              {type}
                            </Text>
                          </View>
                          {formData.bloodType === type && (
                            <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                {errors.bloodType && <Text style={styles.errorText}>{errors.bloodType}</Text>}

                {/* Location Section - Moved here as requested */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>County *</Text>
                  <TouchableOpacity
                    style={[styles.pickerTrigger, isCountyExpanded && styles.pickerTriggerExpanded]}
                    onPress={() => {
                      setIsCountyExpanded(!isCountyExpanded);
                      setIsBloodTypeExpanded(false);
                      setIsTownExpanded(false);
                    }}
                    disabled={loading}
                  >
                    <Text style={[styles.pickerTriggerText, !formData.county && { color: '#94A3B8' }]}>
                      {formData.county || 'Select your county'}
                    </Text>
                    <Ionicons name={isCountyExpanded ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                  </TouchableOpacity>

                  {isCountyExpanded && (
                    <View style={[styles.inlineSelectionContainer, { maxHeight: verticalScale(250) }]}>
                      <ScrollView nestedScrollEnabled={true}>
                        {KENYA_COUNTIES.map((county) => (
                          <TouchableOpacity
                            key={county}
                            style={[
                              styles.selectionItem,
                              formData.county === county && { backgroundColor: '#3B82F620', borderColor: '#3B82F6' }
                            ]}
                            onPress={() => {
                              handleInputChange('county', county);
                              handleInputChange('town', '');
                              setIsCountyExpanded(false);
                            }}
                          >
                            <Text style={[
                              styles.selectionText,
                              { marginTop: 0, fontSize: moderateScale(14) },
                              formData.county === county && { color: '#3B82F6', fontWeight: '700' }
                            ]}>
                              {county}
                            </Text>
                            {formData.county === county && (
                              <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {errors.county && <Text style={styles.errorText}>{errors.county}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Town/City *</Text>
                  <TouchableOpacity
                    style={[styles.pickerTrigger, isTownExpanded && styles.pickerTriggerExpanded]}
                    onPress={() => {
                      if (!formData.county) {
                        Alert.alert('Selection Required', 'Please select a county first');
                        return;
                      }
                      setIsTownExpanded(!isTownExpanded);
                      setIsBloodTypeExpanded(false);
                      setIsCountyExpanded(false);
                    }}
                    disabled={loading}
                  >
                    <Text style={[styles.pickerTriggerText, !formData.town && { color: '#94A3B8' }]}>
                      {formData.town || 'Select your town'}
                    </Text>
                    <Ionicons name={isTownExpanded ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                  </TouchableOpacity>

                  {isTownExpanded && (
                    <View style={[styles.inlineSelectionContainer, { maxHeight: verticalScale(250) }]}>
                      <ScrollView nestedScrollEnabled={true}>
                        {getTownsByCounty(formData.county || '').map((town) => (
                          <TouchableOpacity
                            key={town}
                            style={[
                              styles.selectionItem,
                              formData.town === town && { backgroundColor: '#3B82F620', borderColor: '#3B82F6' }
                            ]}
                            onPress={() => {
                              handleInputChange('town', town);
                              setIsTownExpanded(false);
                            }}
                          >
                            <Text style={[
                              styles.selectionText,
                              { marginTop: 0, fontSize: moderateScale(14) },
                              formData.town === town && { color: '#3B82F6', fontWeight: '700' }
                            ]}>
                              {town}
                            </Text>
                            {formData.town === town && (
                              <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {errors.town && <Text style={styles.errorText}>{errors.town}</Text>}
                </View>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={moderateScale(20)} color="#3B82F6" />
                  <Text style={styles.infoText}>
                    Your blood type information helps us match you with compatible {selectedUserType === 'donor' ? 'recipients' : 'donors'}.
                  </Text>
                </View>
              </View>

              {/* Password Section */}
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
                      placeholder="Create a password"
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
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#64748B" />
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
                      placeholder="Confirm your password"
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
                      <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color="#64748B" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(12),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(30),
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: scale(20),
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(0,0,0,0.1)' } as any
      : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
      }),
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  profilePictureContainer: {
    alignSelf: 'center',
    marginBottom: verticalScale(10),
  },
  profilePicture: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
  },
  profilePlaceholder: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: moderateScale(12),
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  uploadingText: {
    fontSize: moderateScale(12),
    color: '#3B82F6',
    marginTop: 4,
    textAlign: 'center',
  },
  imageErrorText: {
    color: '#EF4444',
    fontSize: moderateScale(12),
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    marginBottom: verticalScale(20),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: verticalScale(12),
    paddingBottom: verticalScale(6),
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  inputGroup: {
    marginBottom: verticalScale(14),
  },
  inputLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(15),
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    paddingRight: scale(48),
    fontSize: moderateScale(15),
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  eyeIcon: {
    position: 'absolute',
    right: scale(14),
    top: verticalScale(12),
    padding: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: moderateScale(12),
    marginTop: 4,
    marginLeft: 4,
  },
  helpText: {
    fontSize: moderateScale(12),
    color: '#64748B',
    marginTop: 4,
    marginLeft: 4,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: scale(12),
    borderRadius: 8,
    marginTop: verticalScale(8),
  },
  infoText: {
    fontSize: moderateScale(13),
    color: '#1E40AF',
    marginLeft: scale(10),
    flex: 1,
    lineHeight: moderateScale(18),
  },
  passwordRequirements: {
    backgroundColor: '#F0FDF4',
    padding: scale(12),
    borderRadius: 8,
    marginTop: verticalScale(8),
  },
  requirementsTitle: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  requirementItem: {
    fontSize: moderateScale(12),
    color: '#64748B',
    marginBottom: 3,
  },
  termsSection: {
    marginBottom: verticalScale(20),
    paddingTop: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: verticalScale(8),
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
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
    fontSize: moderateScale(13),
    color: '#334155',
    lineHeight: moderateScale(20),
  },
  termsLink: {
    color: '#3B82F6',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signupButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: verticalScale(12),
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 6px 20px rgba(59, 130, 246, 0.4)',
      } as any
      : {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 8,
      }),
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(24),
  },
  signupButtonText: {
    fontSize: moderateScale(17),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  buttonIconContainer: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(16),
  },
  loginText: {
    fontSize: moderateScale(14),
    color: '#64748B',
  },
  loginLink: {
    fontSize: moderateScale(14),
    color: '#3B82F6',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 8,
  },
  selectionItem: {
    width: '100%',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(16),
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 4,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: verticalScale(50),
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  pickerTriggerText: {
    fontSize: moderateScale(15),
    color: '#1E293B',
  },
  modalList: {
    marginTop: verticalScale(10),
  },
  pickerTriggerExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: '#3B82F6',
  },
  inlineSelectionContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: '#3B82F6',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 8,
    marginBottom: 4,
  },
});

export default SignupScreen;