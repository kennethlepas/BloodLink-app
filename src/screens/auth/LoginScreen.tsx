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
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
      <LinearGradient
        colors={['#1b8882ff', '#16b43eff']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.content}>
            {/* Header with Logo */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={28} color='#FFFFFF' />
              </TouchableOpacity>

              {/* Logo */}
              <View style={styles.logoContainer}>
                <View style={styles.outerCircle}>
                  <View style={styles.iconContainer}>
                    <Text style={styles.logoEmoji}>🩸</Text>
                  </View>
                </View>
                <Text style={styles.appName}> BloodLink 🩸</Text>
              
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
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#64748B" />
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
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Login</Text>
                  )}
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
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
  },
  outerCircle: {
    width: 130,
    height: 130,
    borderRadius: 70,
    backgroundColor: 'transparent',
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: '#DC2626',
    marginBottom: 14,
    ...(Platform.OS === 'web'
      ? {
        boxShadow: '0px 8px 16px rgba(220, 38, 38, 0.4)',
      } as any
      : {
        shadowColor: "rgba(220, 38, 38, 1)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
      }),
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: "center",
    justifyContent: "center",
    overflow: 'hidden',
  },
  logoEmoji: {
    fontSize: 60,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f0e0eff',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    minHeight: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 16,
    color: '#080808ff',
  },
  signupLink: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;