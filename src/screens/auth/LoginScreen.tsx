import { useUser } from '@/src/contexts/UserContext';
import { auth, db } from '@/src/services/firebase/firebase';
import { transformFirebaseUser } from '@/src/types/userTransform';
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
        if (!value.trim()) {
          return 'Email is required';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
        if (value.length > 100) {
          return 'Email must be less than 100 characters';
        }
        break;

      case 'password':
        if (!value) {
          return 'Password is required';
        }
        if (value.length < 6) {
          return 'Password must be at least 6 characters';
        }
        if (value.length > 50) {
          return 'Password is too long';
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
        throw new Error('User profile not found. Please contact support.');
      }

      if (!userData.isActive) {
        throw new Error('Your account has been deactivated. Please contact support for assistance.');
      }

      return { user, userData };

    } catch (error: any) {
      console.error('Sign in error:', error);

      let errorMessage = 'Login failed. Please try again.';

      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address. Please check your email or sign up.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please try again or use "Forgot Password" to reset.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address format. Please check and try again.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support for assistance.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please wait a few minutes and try again, or reset your password.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          case 'auth/invalid-credential':
          case 'auth/invalid-login-credentials':
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            break;
          default:
            if (error.message && !error.message.includes('Firebase')) {
              errorMessage = error.message;
            }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
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

      if (result.userData.userType === 'donor') {
        router.replace('/(donor)' as any);
      } else if (result.userData.userType === 'requester') {
        router.replace('/(requester)' as any);
      }

    } catch (error: any) {
      console.error('Login error:', error);

      const errorMessage = error?.message || 'Invalid email or password. Please check your credentials and try again.';

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
      console.error('Password reset error:', error);

      let errorMessage = 'Failed to send reset email. Please try again.';

      if (error?.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address. Please check the email or sign up.';
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format. Please check and try again.';
      } else if (error?.code === 'auth/too-many-requests') {
        errorMessage = 'Too many password reset requests. Please try again later.';
      } else if (error?.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }

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
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => router.replace('/')}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={26} color='#FFFFFF' />
              </TouchableOpacity>

              {/* Logo */}
              <View style={styles.logoContainer}>
                <View style={styles.logoCard}>
                  <View style={styles.logoGlowEffect} />
                  <View style={styles.logoImageContainer}>
                    <Image
                      source={require('@/assets/images/logo.jpg')}
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Verified Badge */}
                  <View style={styles.logoBadge}>
                    <View style={styles.badgeDot} />
                    <Text style={styles.badgeText}>Verified</Text>
                  </View>
                </View>

                <Text style={styles.appName}>BloodLink</Text>
                <Text style={styles.welcomeText}>Welcome back to BloodLink</Text>
                <Text style={styles.tagline}>Every Drop Counts, Every Life Matters</Text>
              </View>
            </View>

            {/* Login Form */}
            <View style={styles.formContainer}>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Login to Your Account</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
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
                    maxLength={100}
                    editable={!loading}
                  />
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.passwordInput, errors.password && styles.inputError]}
                      value={formData.password}
                      onChangeText={(value) => handleInputChange('password', value)}
                      onBlur={() => handleBlur('password')}
                      placeholder="Enter your password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      maxLength={50}
                      editable={!loading}
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

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={handleForgotPassword}
                  disabled={resetLoading || loading}
                >
                  {resetLoading ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  )}
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.loginButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.loginButtonText}>Login</Text>
                        <View style={styles.buttonIconContainer}>
                          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Sign Up Link */}
                <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={handleSignup} disabled={loading}>
                    <Text style={styles.signupLink}>Sign Up</Text>
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
  header: {
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(16),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCard: {
    position: 'relative',
    marginBottom: verticalScale(10),
  },
  logoGlowEffect: {
    position: 'absolute',
    width: moderateScale(110),
    height: moderateScale(110),
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -moderateScale(55) },
      { translateY: -moderateScale(55) },
    ],
    ...(Platform.OS === 'web'
      ? {
        filter: 'blur(20px)',
      } as any
      : {}),
  },
  logoImageContainer: {
    width: moderateScale(95),
    height: moderateScale(95),
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  logoBadge: {
    position: 'absolute',
    bottom: -15,
    right: -10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#144272',
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 4px 12px rgba(16, 185, 129, 0.4)',
      } as any
      : {
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      }),
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(9),
    fontWeight: '700',
  },
  appName: {
    fontSize: moderateScale(24),
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: moderateScale(14),
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    marginBottom: 2,
  },
  tagline: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '400',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: scale(20),
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
      } as any
      : {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
      }),
  },
  formTitle: {
    fontSize: moderateScale(19),
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: verticalScale(20),
    letterSpacing: 0.3,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: verticalScale(18),
    minHeight: 20,
  },
  forgotPasswordText: {
    fontSize: moderateScale(13),
    color: '#3B82F6',
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: verticalScale(16),
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 6px 20px rgba(59, 130, 246, 0.4)',
      } as any
      : {
        shadowColor: '#3B82F6',
        shadowOffset: {
          width: 0,
          height: 6,
        },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 8,
      }),
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(24),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
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
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: moderateScale(14),
    color: '#64748B',
  },
  signupLink: {
    fontSize: moderateScale(14),
    color: '#3B82F6',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;