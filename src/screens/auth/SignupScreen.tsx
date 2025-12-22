import { useImagePicker } from '@/hooks/useImagePicker';
import { useUser } from '@/src/contexts/UserContext';
import { createUser } from '@/src/services/firebase/database';
import { auth } from '@/src/services/firebase/firebase';
import { BloodType, SignupFormData, UserType } from '@/src/types/types';
import { transformFirebaseUser } from '@/src/types/userTransform';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

interface SignupScreenProps {
  userType?: UserType;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ userType: propUserType }) => {
  const router = useRouter();
  const { login } = useUser();
  const params = useLocalSearchParams<{ userType?: 'donor' | 'requester' }>();
  
  const { pickAndUploadImage, takeAndUploadPhoto, uploading: imageUploading, error: imageError } = useImagePicker();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    weight: undefined,
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
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number';
        break;

      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        break;

      case 'weight':
        if (selectedUserType === 'donor' && value) {
          const weight = Number(value);
          if (isNaN(weight)) return 'Weight must be a number';
          if (weight < 50) return 'Donors must weigh at least 50kg';
          if (weight > 200) return 'Please enter a valid weight';
        }
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
    ];

    if (selectedUserType === 'donor' && formData.weight) {
      fields.push('weight');
    }

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

      const userData: any = {
        uid: firebaseUser.uid,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: normalizedEmail,
        phoneNumber: formData.phoneNumber.trim(),
        bloodType: formData.bloodType,
        userType: selectedUserType,
        isActive: true,
        points: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (selectedUserType === 'donor') {
        userData.isAvailable = true;
      }
      
      if (formData.profilePicture) {
        userData.profilePicture = formData.profilePicture;
      }

      if (formData.weight) {
        userData.weight = formData.weight;
      }

      await createUser(firebaseUser.uid, userData);

      const userForContext = transformFirebaseUser(userData);

      await login(userForContext);

      Alert.alert(
        'Success!',
        'Your account has been created successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (selectedUserType === 'donor') {
                router.replace('/(donor)' as any);
              } else {
                router.replace('/(requester)' as any);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Signup error:', error);

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
      <StatusBar barStyle="light-content" backgroundColor="#7687a1ff" />
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
                          <Ionicons name="camera" size={32} color="#94A3B8" />
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
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.bloodType}
                      onValueChange={(value: any) => handleInputChange('bloodType', value)}
                      style={styles.picker}
                      enabled={!loading}
                    >
                      {BLOOD_TYPES.map((type) => (
                        <Picker.Item key={type} label={type} value={type} />
                      ))}
                    </Picker>
                  </View>
                  {errors.bloodType && <Text style={styles.errorText}>{errors.bloodType}</Text>}
                </View>

                {selectedUserType === 'donor' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Weight (kg) *</Text>
                    <TextInput
                      style={[styles.input, errors.weight && styles.inputError]}
                      value={formData.weight?.toString() || ''}
                      onChangeText={(value) => handleInputChange('weight', value ? Number(value) : undefined)}
                      onBlur={() => handleBlur('weight')}
                      placeholder="Enter your weight"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      editable={!loading}
                    />
                    <Text style={styles.helpText}>Minimum weight: 50kg (for donors)</Text>
                    {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
                  </View>
                )}

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
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
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#64748B" />
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
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                    >
                      <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                </View>

                <View style={styles.passwordRequirements}>
                  <Text style={styles.requirementsTitle}>Password must contain:</Text>
                  <Text style={styles.requirementItem}>• At least 6 characters</Text>
                  <Text style={styles.requirementItem}>• One uppercase letter</Text>
                  <Text style={styles.requirementItem}>• One lowercase letter</Text>
                  <Text style={styles.requirementItem}>• One number</Text>
                </View>
              </View>

              {/* Signup Button */}
              <TouchableOpacity
                style={[styles.signupButton, (loading || imageUploading) && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading || imageUploading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text style={styles.loadingButtonText}>Creating Account...</Text>
                  </View>
                ) : (
                  <Text style={styles.signupButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/login' as any)}
                  disabled={loading}
                >
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#f8f9fcff',
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
    marginBottom: 24,
  },
  profilePictureContainer: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  uploadingText: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 4,
    textAlign: 'center',
  },
  imageErrorText: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 50,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 12,
    padding: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  helpText: {
    fontSize: 12,
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
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    marginLeft: 10,
    flex: 1,
  },
  passwordRequirements: {
    backgroundColor: '#F0FDF4',
    padding: 15,
    borderRadius: 8,
    marginTop: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  signupButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonText: {
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 16,
    color: '#0e0e0fff',
  },
  loginLink: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default SignupScreen;