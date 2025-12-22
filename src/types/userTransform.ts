import { User } from '@/src/types/types';

export const transformFirebaseUser = (firebaseUserData: any): User => {
  return {
    id: firebaseUserData.uid || firebaseUserData.id,
    firstName: firebaseUserData.firstName,
    lastName: firebaseUserData.lastName,
    email: firebaseUserData.email,
    phoneNumber: firebaseUserData.phoneNumber || '',
    bloodType: firebaseUserData.bloodType,
    userType: firebaseUserData.userType,
    profilePicture: firebaseUserData.profilePicture,
    isAvailable: firebaseUserData.isAvailable,
    location: firebaseUserData.location,
    isActive: firebaseUserData.isActive ?? true,
    createdAt: firebaseUserData.createdAt || new Date().toISOString(),
    updatedAt: firebaseUserData.updatedAt || new Date().toISOString(),
    lastDonationDate: firebaseUserData.lastDonationDate,
    points: firebaseUserData.points ?? 0,
  };
};


  // Validate that user data has all required fields
 
export const isValidUser = (user: any): user is User => {
  return (
    user &&
    typeof user.id === 'string' &&
    typeof user.firstName === 'string' &&
    typeof user.lastName === 'string' &&
    typeof user.email === 'string' &&
    typeof user.phoneNumber === 'string' &&
    typeof user.bloodType === 'string' &&
    (user.userType === 'donor' || user.userType === 'requester') &&
    typeof user.isActive === 'boolean' &&
    typeof user.createdAt === 'string' &&
    typeof user.updatedAt === 'string'
  );
};