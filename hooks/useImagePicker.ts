import { uploadImageToCloudinary } from '@/src/services/cloudinary/upload.service';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';

export const useImagePicker = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload profile pictures.'
        );
        return false;
      }
    }
    return true;
  };

  const requestCameraPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Camera is not supported on web. Please upload an image instead.');
      return false;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera permissions to take photos.'
      );
      return false;
    }
    return true;
  };

  const pickAndUploadImage = async (folder: string = 'bloodlink/profile_pictures'): Promise<string | null> => {
    try {
      setError(null);
      
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      setUploading(true);

      const imageUri = result.assets[0].uri;
      const uploadResult = await uploadImageToCloudinary(imageUri, folder);

      setUploading(false);
      return uploadResult.secure_url;

    } catch (err: any) {
      console.error('Error picking and uploading image:', err);
      setError(err.message || 'Failed to upload image');
      setUploading(false);
      return null;
    }
  };

  const takeAndUploadPhoto = async (folder: string = 'bloodlink/profile_pictures'): Promise<string | null> => {
    try {
      setError(null);

      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      setUploading(true);

      const imageUri = result.assets[0].uri;
      const uploadResult = await uploadImageToCloudinary(imageUri, folder);

      setUploading(false);
      return uploadResult.secure_url;

    } catch (err: any) {
      console.error('Error taking and uploading photo:', err);
      setError(err.message || 'Failed to upload photo');
      setUploading(false);
      return null;
    }
  };

  return {
    pickAndUploadImage,
    takeAndUploadPhoto,
    uploading,
    error,
  };
};