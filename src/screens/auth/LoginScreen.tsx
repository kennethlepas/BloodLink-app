import { useUser } from '@/src/contexts/UserContext';
import { auth, db } from '@/src/services/firebase/firebase';
import { transformFirebaseUser } from '@/src/types/userTransform';
import { mapErrorMessage } from '@/src/utils/errorMapper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive sizing helpers
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

interface LoginFormData {
  email: string;
  password: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
}

interface FirebaseUserData {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  bloodType: string;
  userType: 'donor' | 'requester';
  isActive: boolean;
  isAvailable?: boolean;
  profilePicture?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    region?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastDonationDate?: string;
  points?: number;
}

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const { login } = useUser();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const validateField = (field: keyof LoginFormData, value: string): string | undefined => {
    switch (field) {
      case 'email':
        const trimmedValue = value.trim();
        if (!trimmedValue) {
          return 'Email is required';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedValue)) {
          return 'Please enter a valid email address';
        }
        if (trimmedValue.length > 100) {
          return 'Email must be less than 100 characters';
        }
        break;

      case 'password':
        if (!value) {
          return 'Password is required';
        }
        if (value.length < 8) {
          return 'Password must be at least 8 characters';
        }
        if (value.length > 10) {
          return 'Password cannot exceed 10 characters';
        }
        break;
    }
    return undefined;
  };

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleBlur = (field: keyof LoginFormData) => {
    const value = formData[field];
    const error = validateField(field, value);
    if (error) {
      setErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let hasError = false;

    const emailError = validateField('email', formData.email);
    if (emailError) {
      newErrors.email = emailError;
      hasError = true;
    }

    const passwordError = validateField('password', formData.password);
    if (passwordError) {
      newErrors.password = passwordError;
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) {
      const firstError = Object.values(newErrors)[0];
      Alert.alert('Validation Error', firstError);
      return false;
    }

    return true;
  };


  const getUserData = async (userId: string): Promise<FirebaseUserData | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (userDoc.exists()) {
        return userDoc.data() as FirebaseUserData;
      } else {
        console.log('No user document found');
        return null;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  };

  const signInUser = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const user = userCredential.user;

      const userData = await getUserData(user.uid);

      if (!userData) {
        throw new Error('User profile not found. Please sign up or contact support.');
      }

      if (!userData.isActive) {
        throw new Error('Your account has been deactivated. Please contact support for assistance.');
      }

      return { user, userData };

    } catch (error: any) {
      throw new Error(mapErrorMessage(error));
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await signInUser(formData.email, formData.password);

      console.log('Login successful:', {
        uid: result.user.uid,
        email: result.user.email,
        userType: result.userData.userType
      });

      const userContextData = transformFirebaseUser(result.userData);

      console.log('Transformed user data for context:', userContextData);

      await login(userContextData);

      if (!result.user.emailVerified) {
        router.replace('/(auth)/verify-email' as any);
        return;
      }

      if (result.userData.userType === 'donor') {
        router.replace('/(donor)' as any);
      } else if (result.userData.userType === 'requester') {
        router.replace('/(requester)' as any);
      }

    } catch (error: any) {
      console.log('Login error:', error);

      const errorMessage = mapErrorMessage(error);

      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Login Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      Alert.alert(
        'Email Required',
        'Please enter your email address in the email field, then tap "Forgot Password?" again.'
      );
      return;
    }

    const emailError = validateField('email', formData.email);
    if (emailError) {
      Alert.alert('Invalid Email', emailError);
      return;
    }

    setResetLoading(true);
    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      await sendPasswordResetEmail(auth, normalizedEmail);

      Alert.alert(
        'Password Reset Email Sent',
        `A password reset link has been sent to ${normalizedEmail}.\n\nPlease check your inbox (and spam folder) and follow the instructions to reset your password.`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error: any) {
      const errorMessage = mapErrorMessage(error);

      Alert.alert('Password Reset Failed', errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSignup = () => {
    router.push('/(auth)/user-type-selection' as any);
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
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with Logo */}
            {/* Compact Header Section */}
            <View style={styles.headerBranding}>
              <TouchableOpacity
                onPress={() => router.replace('/')}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color='#FFFFFF' />
              </TouchableOpacity>

              <View style={styles.topBadgeContainer}>
                <View style={styles.introBadge}>
                  <Text style={styles.introBadgeText}>🇰🇪 Secure Access</Text>
                </View>
              </View>

              <View style={styles.logoRow}>
                <View style={styles.logoWrapper}>
                  <View style={styles.logoCompact}>
                    <Image
                      source={require('@/assets/images/logo.jpg')}
                      style={styles.logoImage}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.verifiedMiniBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.brandTitleContainer}>
                  <Text style={styles.appNameCompact}>BloodLink</Text>
                  <Text style={styles.appTaglineCompact}>Integrated Online Blood Bank Platform</Text>
                </View>
              </View>
              <Text style={styles.welcomeSubtext}>Every Drop Counts, Every Life Matters</Text>
            </View>

            {/* Login Form - Modern Translucent Design */}
            <View style={styles.formContainer}>
              <View style={styles.glassFormCard}>
                <View style={styles.formHeader}>
                  <Text style={styles.glassFormTitle}>Welcome Back</Text>
                  <Text style={styles.glassFormSubtitle}>Login to continue your lifesaving journey</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.glassInputLabel}>Email Address</Text>
                  <View style={[styles.glassInputWrapper, errors.email && styles.glassInputError]}>
                    <Ionicons name="mail-outline" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.glassTextInput}
                      value={formData.email}
                      onChangeText={(value) => handleInputChange('email', value)}
                      onBlur={() => handleBlur('email')}
                      placeholder="e.g. john@example.com"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      maxLength={100}
                      editable={!loading}
                    />
                  </View>
                  {errors.email && <Text style={styles.glassErrorText}>{errors.email}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.glassInputLabel}>Password</Text>
                  <View style={[styles.glassInputWrapper, errors.password && styles.glassInputError]}>
                    <Ionicons name="lock-closed-outline" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.glassTextInput}
                      value={formData.password}
                      onChangeText={(value) => handleInputChange('password', value)}
                      onBlur={() => handleBlur('password')}
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      maxLength={10}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="rgba(255, 255, 255, 0.5)" />
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={styles.glassErrorText}>{errors.password}</Text>}
                </View>

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={handleForgotPassword}
                  disabled={resetLoading || loading}
                >
                  {resetLoading ? (
                    <ActivityIndicator size="small" color="#10B981" />
                  ) : (
                    <Text style={styles.glassForgotPasswordText}>Forgot Password?</Text>
                  )}
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.glassLoginButton, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.glassLoginButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.glassLoginButtonText}>Sign In</Text>
                        <View style={styles.glassButtonIconContainer}>
                          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Sign Up Link */}
                <View style={styles.glassSignupContainer}>
                  <Text style={styles.glassSignupText}>New to BloodLink? </Text>
                  <TouchableOpacity onPress={handleSignup} disabled={loading}>
                    <Text style={styles.glassSignupLink}>Create Account</Text>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: '#0A2647',
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },
  headerBranding: {
    paddingTop: verticalScale(12),
    marginBottom: verticalScale(15),
    alignItems: 'center',
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
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(15),
  },
  logoWrapper: {
    position: 'relative',
  },
  logoCompact: {
    width: moderateScale(70),
    height: moderateScale(95),
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  verifiedMiniBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#10B981',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0A2647',
    zIndex: 10,
  },
  brandTitleContainer: {
    justifyContent: 'center',
  },
  appNameCompact: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  appTaglineCompact: {
    fontSize: moderateScale(10),
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  welcomeSubtext: {
    fontSize: moderateScale(11),
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },

  // Glass Form Design
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  glassFormCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: scale(20),
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  glassFormTitle: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  glassFormSubtitle: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.5)',
  },
  inputGroup: {
    marginBottom: verticalScale(12),
  },
  glassInputLabel: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
    marginLeft: 4,
  },
  glassInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: scale(14),
  },
  glassInputError: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  inputIcon: {
    marginRight: scale(10),
  },
  glassTextInput: {
    flex: 1,
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(15),
    color: '#FFFFFF',
  },
  eyeIcon: {
    padding: 4,
  },
  glassErrorText: {
    color: '#F87171',
    fontSize: moderateScale(11),
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: verticalScale(15),
  },
  glassForgotPasswordText: {
    fontSize: moderateScale(13),
    color: '#10B981',
    fontWeight: '600',
  },
  glassLoginButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: verticalScale(15),
  },
  glassLoginButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(14),
  },
  glassLoginButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  glassButtonIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  glassSignupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  glassSignupText: {
    fontSize: moderateScale(13),
    color: 'rgba(255, 255, 255, 0.5)',
  },
  glassSignupLink: {
    fontSize: moderateScale(13),
    color: '#FFFFFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default LoginScreen;