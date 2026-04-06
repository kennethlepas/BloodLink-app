import { BloodType } from '../types/types';

/**
 * Blood Compatibility Mapping
 * Key: Recipient Blood Type
 * Value: Array of compatible Donor Blood Types
 */
export const BLOOD_COMPATIBILITY: Record<BloodType, BloodType[]> = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal recipient
};

/**
 * Get all blood types that can donate to a specific recipient type
 */
export const getCompatibleDonors = (recipientType: BloodType): BloodType[] => {
    return BLOOD_COMPATIBILITY[recipientType] || [];
};

/**
 * Check if a donor type can donate to a recipient type
 */
export const canDonateTo = (donorType: BloodType, recipientType: BloodType): boolean => {
    const compatibleDonors = BLOOD_COMPATIBILITY[recipientType];
    return compatibleDonors ? compatibleDonors.includes(donorType) : false;
};

/**
 * Get all blood types that a specific donor can donate to (Inverted mapping)
 */
export const getRecipientTypes = (donorType: BloodType): BloodType[] => {
    return (Object.keys(BLOOD_COMPATIBILITY) as BloodType[]).filter(recipientType =>
        BLOOD_COMPATIBILITY[recipientType].includes(donorType)
    );
};
