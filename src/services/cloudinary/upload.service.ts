import { CLOUDINARY_UPLOAD_URL, cloudinaryConfig } from '@/src/services/cloudinary/cloudinary.config';
import { Platform } from 'react-native';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  url: string;
}

export type UploadType = 'profile' | 'verification';

export const uploadImageToCloudinary = async (
  imageUri: string,
  folder: string = 'bloodlink/profile_pictures',
  uploadType: UploadType = 'profile'
): Promise<CloudinaryUploadResponse> => {
  try {
    const preset =
      uploadType === 'verification'
        ? cloudinaryConfig.verificationPreset
        : cloudinaryConfig.uploadPreset;

    const formData = new FormData();

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('file', blob);
    } else {
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', {
        uri: imageUri,
        type,
        name: filename || 'photo.jpg',
      } as any);
    }

    formData.append('upload_preset', preset);
    formData.append('folder', folder);

    console.log(`Uploading to Cloudinary [${uploadType}] preset: ${preset}, folder: ${folder}`);

    const uploadResponse = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Cloudinary error response:', errorText);
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const data = await uploadResponse.json();
    console.log('Upload successful:', data.secure_url);

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      url: data.url,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

export const getPublicIdFromUrl = (url: string): string | null => {
  try {
    const matches = url.match(/\/([^\/]+)\.[^.]+$/);
    return matches ? matches[1] : null;
  } catch {
    return null;
  }
};