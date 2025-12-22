import { CLOUDINARY_UPLOAD_URL, cloudinaryConfig } from '@/src/services/cloudinary/cloudinary.config';
import { Platform } from 'react-native';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  url: string;
}

export const uploadImageToCloudinary = async (
  imageUri: string,
  folder: string = 'bloodlink/profile_pictures'
): Promise<CloudinaryUploadResponse> => {
  try {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // For web: Convert data URI to Blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('file', blob);
    } else {
      // For mobile: Use file object
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        type,
        name: filename || 'photo.jpg',
      } as any);
    }

    // Add upload preset (required for unsigned uploads)
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    
    // Add folder
    formData.append('folder', folder);

       console.log('Uploading to Cloudinary...');

    const uploadResponse = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
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

// Helper function to extract public_id from Cloudinary URL
export const getPublicIdFromUrl = (url: string): string | null => {
  try {
    const matches = url.match(/\/([^\/]+)\.[^.]+$/);
    return matches ? matches[1] : null;
  } catch {
    return null;
  }
};