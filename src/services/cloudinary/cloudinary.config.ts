export const cloudinaryConfig = {
  cloudName: 'dzr9qoqkw',
  uploadPreset: 'bloodlink_profiles',
  verificationPreset: 'bloodlink_verification',
};

export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;

export const CLOUDINARY_FOLDERS = {
  profilePictures: 'bloodlink/profile_pictures',
  donorVerification: 'bloodlink/verification/donors',
  requesterVerification: 'bloodlink/verification/requesters',
};