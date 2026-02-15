import { useImagePicker } from '@/hooks/useImagePicker';
import { useUser } from '@/src/contexts/UserContext';
import { updateUser } from '@/src/services/firebase/database';
import { BloodType, Donor } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const DonorEditProfileScreen: React.FC = () => {
  const router = useRouter();
  const { user, updateUserData } = useUser();
  const { pickAndUploadImage, takeAndUploadPhoto, uploading: imageUploading } = useImagePicker();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Type guard to check if user is a donor
  const isDonor = (user: any): user is Donor => {
    return user?.userType === 'donor';
  };

  // Get initial weight value safely
  const getInitialWeight = (): string => {
    if (isDonor(user) && user.medicalHistory?.weight) {
      return user.medicalHistory.weight.toString();
    }
    return '';
  };

  // Editable fields
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [bloodType, setBloodType] = useState<BloodType>(user?.bloodType || 'O+');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [weight, setWeight] = useState(getInitialWeight());

  const validateField = (field: string, value: string): string | undefined => {
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

      case 'phoneNumber':
        if (!value.trim()) return 'Phone number is required';
        const phoneRegex = /^[0-9+\-\s()]+$/;
        if (!phoneRegex.test(value)) return 'Please enter a valid phone number';
        if (value.replace(/\D/g, '').length < 10) return 'Phone number must be at least 10 digits';
        break;

      case 'weight':
        if (value) {
          const weightNum = Number(value);
          if (isNaN(weightNum)) return 'Weight must be a number';
          if (weightNum < 50) return 'Donors must weigh at least 50kg';
          if (weightNum > 200) return 'Please enter a valid weight';
        }
        break;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    const firstNameError = validateField('firstName', firstName);
    if (firstNameError) newErrors.firstName = firstNameError;

    const lastNameError = validateField('lastName', lastName);
    if (lastNameError) newErrors.lastName = lastNameError;

    const phoneError = validateField('phoneNumber', phoneNumber);
    if (phoneError) newErrors.phoneNumber = phoneError;

    if (weight) {
      const weightError = validateField('weight', weight);
      if (weightError) newErrors.weight = weightError;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      Alert.alert('Validation Error', firstError);
      return false;
    }

    return true;
  };

  const handleProfilePictureUpdate = () => {
    if (Platform.OS === 'web') {
      uploadImageFromGallery();
      return;
    }

    Alert.alert('Update Profile Picture', 'Choose an option', [
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
    ]);
  };

  const uploadImageFromGallery = async () => {
    try {
      const imageUrl = await pickAndUploadImage('bloodlink/profile_pictures');

      if (imageUrl) {
        setProfilePicture(imageUrl);
      }
    } catch (error) {
      console.error('Error uploading from gallery:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const uploadImageFromCamera = async () => {
    try {
      const imageUrl = await takeAndUploadPhoto('bloodlink/profile_pictures');

      if (imageUrl) {
        setProfilePicture(imageUrl);
      }
    } catch (error) {
      console.error('Error uploading from camera:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const handleSave = async () => {
    if (!validateForm() || !user?.id) return;

    setLoading(true);
    try {
      const updates: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        bloodType,
      };

      if (profilePicture !== user.profilePicture) {
        updates.profilePicture = profilePicture;
      }

      // Update medical history weight if provided and user is a donor
      if (weight && isDonor(user)) {
        const currentMedicalHistory = user.medicalHistory || {
          hasChronicIllness: false,
          currentMedication: '',
          allergies: '',
          weight: 0,
        };
        
        updates.medicalHistory = {
          ...currentMedicalHistory,
          weight: Number(weight),
        };
      }

      await updateUser(user.id, updates);
      await updateUserData(updates);

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Discard Changes?', 'Are you sure you want to discard your changes?', [
      { text: 'Continue Editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1b8882ff', '#16b43eff']} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

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
          <View style={styles.formCard}>
            {/* Profile Picture Section */}
            <View style={styles.profileSection}>
              <TouchableOpacity
                style={styles.profilePictureContainer}
                onPress={handleProfilePictureUpdate}
                disabled={loading || imageUploading}
                activeOpacity={0.7}
              >
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <Ionicons name="person" size={50} color="#94A3B8" />
                  </View>
                )}
                <View style={styles.cameraIconContainer}>
                  {imageUploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera" size={18} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.photoHint}>Tap to change photo</Text>
            </View>

            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  value={firstName}
                  onChangeText={(value) => {
                    setFirstName(value);
                    if (errors.firstName) {
                      const newErrors = { ...errors };
                      delete newErrors.firstName;
                      setErrors(newErrors);
                    }
                  }}
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
                  value={lastName}
                  onChangeText={(value) => {
                    setLastName(value);
                    if (errors.lastName) {
                      const newErrors = { ...errors };
                      delete newErrors.lastName;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="Enter your last name"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                  editable={!loading}
                />
                {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={user.email}
                  editable={false}
                  placeholder="Email address"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.helpText}>Email cannot be changed</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={[styles.input, errors.phoneNumber && styles.inputError]}
                  value={phoneNumber}
                  onChangeText={(value) => {
                    setPhoneNumber(value);
                    if (errors.phoneNumber) {
                      const newErrors = { ...errors };
                      delete newErrors.phoneNumber;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
              </View>
            </View>

            {/* Medical Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Medical Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Blood Type *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={bloodType}
                    onValueChange={(value) => setBloodType(value as BloodType)}
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
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={[styles.input, errors.weight && styles.inputError]}
                  value={weight}
                  onChangeText={(value) => {
                    setWeight(value);
                    if (errors.weight) {
                      const newErrors = { ...errors };
                      delete newErrors.weight;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="Enter your weight"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  editable={!loading}
                />
                <Text style={styles.helpText}>Minimum weight: 50kg (for donors)</Text>
                {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.infoText}>
                  Your medical information helps us ensure safe blood donation practices.
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, (loading || imageUploading) && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={loading || imageUploading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerGradient: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  keyboardAvoid: {
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
    marginTop: -20,
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
    position: 'relative',
    marginBottom: 8,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E2E8F0',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  photoHint: {
    fontSize: 13,
    color: '#64748B',
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
    borderBottomColor: '#10B981',
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
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
});

export default DonorEditProfileScreen;