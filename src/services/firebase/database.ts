import { KENYA_COUNTIES } from '@/src/constants/kenyaLocations';
import {
  AcceptedRequest,
  AcceptedRequestStatus,
  BloodBank,
  BloodRequest,
  BloodType,
  Chat,
  ChatMessage,
  CreateTicketFormData,
  DonationRecord,
  Donor,
  DonorBooking,
  HospitalReferral,
  InterestedDonor,
  Location,
  NewDocument,
  Notification,
  NotificationType,
  Post,
  RecipientBooking,
  RequestStatus,
  Ticket,
  TicketFilters,
  TicketMessage,
  TicketStats,
  User,
  VerificationRequest
} from '@/src/types/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, ref } from 'firebase/database';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  GeoPoint,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryConstraint,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db, realtimeDb } from './firebase';

const CACHE_KEY_BLOOD_BANKS = 'bloodlink_blood_banks_cache';
const CACHE_KEY_ACTIVE_REQUESTS = 'bloodlink_active_requests_cache';
const CACHE_KEY_USER_REQUESTS = 'bloodlink_user_requests_cache';
const CACHE_KEY_DONORS_BY_TYPE = 'bloodlink_donors_by_type_cache';
const CACHE_KEY_DONOR_HISTORY = 'bloodlink_donor_history_cache';
const CACHE_KEY_APPROVED_REVIEWS = 'bloodlink_approved_reviews_cache';


// HELPER FUNCTIONS

const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Normalizes Firestore timestamps or ISO strings into ISO strings
 * for consistent usage across the app's React Native components.
 */
const normalizeTimestamp = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  try {
    // If it's a number that looks like seconds (< year 2100 in seconds), convert to ms
    if (typeof timestamp === 'number' && timestamp < 4102444800) {
      return new Date(timestamp * 1000).toISOString();
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

const locationToGeoPoint = (location: Location): GeoPoint => {
  return new GeoPoint(location.latitude, location.longitude);
};

const geoPointToLocation = (geoPoint: GeoPoint): Location => {
  return {
    latitude: geoPoint.latitude,
    longitude: geoPoint.longitude,
  };
};

// Helper function to remove undefined fields
const removeUndefinedFields = (obj: any): any => {
  const cleaned: any = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      // Recursively clean nested objects
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = removeUndefinedFields(value);
      } else {
        cleaned[key] = value;
      }
    }
  });
  return cleaned;
};

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;  // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

/**
 * Get compatible donor blood types for a recipient
 * Returns array of blood types that can donate to the given recipient blood type
 */
export const getCompatibleDonorBloodTypes = (recipientBloodType: BloodType): BloodType[] => {
  const compatibility: { [key: string]: BloodType[] } = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal recipient
  };

  return compatibility[recipientBloodType] || [];
};

/**
 * Count available compatible donors for a blood request
 * Returns the number of donors who are available, active, and have compatible blood type
 */
export const countAvailableCompatibleDonors = async (
  recipientBloodType: BloodType,
  location?: Location
): Promise<number> => {
  try {
    const compatibleBloodTypes = getCompatibleDonorBloodTypes(recipientBloodType);

    // Query for available donors with compatible blood types
    const q = query(
      collection(db, 'users'),
      where('userType', '==', 'donor'),
      where('isAvailable', '==', true),
      where('isActive', '==', true),
      where('bloodType', 'in', compatibleBloodTypes.length > 0 ? compatibleBloodTypes : ['O-'])
    );

    const snapshot = await getDocs(q);
    let count = snapshot.size;

    console.log(`Found ${count} available compatible donors for ${recipientBloodType}`);

    return count;
  } catch (error) {
    console.error('Error counting available compatible donors:', error);
    // Return 0 instead of throwing to prevent blocking request creation
    return 0;
  }
};

/**
 * Get compatible recipient blood types for a donor
 * Returns array of blood types that the given donor blood type can donate to
 */
export const getCompatibleRecipientBloodTypes = (donorBloodType: BloodType): BloodType[] => {
  const compatibility: { [key: string]: BloodType[] } = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+'],
  };

  return compatibility[donorBloodType] || [];
};

/**
 * Count active compatible blood requests for a donor
 */
export const countActiveCompatibleRequests = async (
  donorBloodType: BloodType,
  location?: Location
): Promise<number> => {
  try {
    const compatibleRecipientTypes = getCompatibleRecipientBloodTypes(donorBloodType);

    const q = query(
      collection(db, 'bloodRequests'),
      where('status', '==', 'pending'),
      where('verificationStatus', '==', 'approved'),
      where('bloodType', 'in', compatibleRecipientTypes.length > 0 ? compatibleRecipientTypes : ['AB+'])
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error counting active compatible requests:', error);
    return 0;
  }
};



// USER OPERATIONS

export const createUser = async (userId: string, userData: NewDocument<User>): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();

    const userDataWithDefaults = {
      ...userData,
      id: userId,
      isActive: true,
      points: 0,
      hasReviewed: false, // Add hasReviewed field
      verificationStatus: 'unsubmitted',
      isVerified: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Filter out undefined values
    const cleanedUserData = removeUndefinedFields(userDataWithDefaults);

    await setDoc(doc(db, 'users', userId), cleanedUserData);
    console.log('User created successfully:', userId);
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    const updateData = {
      ...updates,
      updatedAt: timestamp,
    };

    // Remove undefined fields
    const cleanedUpdates = removeUndefinedFields(updateData);

    await updateDoc(doc(db, 'users', userId), cleanedUpdates);
    console.log('User updated successfully:', userId);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Mark user as having reviewed the app
 */
export const markUserAsReviewed = async (userId: string): Promise<void> => {
  try {
    await updateUser(userId, { hasReviewed: true });
    console.log('User marked as reviewed:', userId);
  } catch (error) {
    console.error('Error marking user as reviewed:', error);
    throw error;
  }
};

/**
 * Check if user has already reviewed the app
 */
export const hasUserReviewed = async (userId: string): Promise<boolean> => {
  try {
    const user = await getUser(userId);
    return user?.hasReviewed || false;
  } catch (error) {
    console.error('Error checking if user reviewed:', error);
    return false;
  }
};

export const updateDonorAvailability = async (
  donorId: string,
  isAvailable: boolean
): Promise<void> => {
  try {
    await updateUser(donorId, { isAvailable });
  } catch (error) {
    console.error('Error updating donor availability:', error);
    throw error;
  }
};

export const getUsersByBloodType = async (bloodType: BloodType): Promise<Donor[]> => {
  const cacheKey = `${CACHE_KEY_DONORS_BY_TYPE}_${bloodType}`;
  try {
    const q = query(
      collection(db, 'users'),
      where('bloodType', '==', bloodType),
      where('userType', '==', 'donor'),
      where('isAvailable', '==', true),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    const donors = snapshot.docs.map((doc) => doc.data() as Donor);

    await AsyncStorage.setItem(cacheKey, JSON.stringify(donors));
    return donors;
  } catch (error) {
    console.warn('Error getting users by blood type (trying cache):', error);
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) { console.error('Cache retrieval failed:', e); }
    throw error;
  }
};

// BLOOD REQUEST OPERATIONS

export const createBloodRequest = async (
  requestData: NewDocument<BloodRequest>
): Promise<string> => {
  try {
    const timestamp = getCurrentTimestamp();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Build the request document
    const requestDoc: any = {
      ...requestData,
      status: 'pending' as const,
      // Link to the requester's verification record (docId = userId)
      verificationRequestId: requestData.requesterId,
      createdAt: timestamp,
      expiresAt,
    };

    // Remove any undefined fields (critical for Firebase)
    const cleanedRequestDoc = removeUndefinedFields(requestDoc);

    console.log('Creating blood request with data:', cleanedRequestDoc);

    const docRef = await addDoc(collection(db, 'bloodRequests'), cleanedRequestDoc);

    // Update the document with its ID
    await updateDoc(docRef, { id: docRef.id });

    console.log('Blood request created successfully:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating blood request:', error);
    throw error;
  }
};

export const getBloodRequest = async (requestId: string): Promise<BloodRequest | null> => {
  try {
    const requestDoc = await getDoc(doc(db, 'bloodRequests', requestId));
    if (requestDoc.exists()) {
      return requestDoc.data() as BloodRequest;
    }
    return null;
  } catch (error) {
    console.error('Error getting blood request:', error);
    throw error;
  }
};

export const updateBloodRequest = async (
  requestId: string,
  updates: Partial<BloodRequest>
): Promise<void> => {
  try {
    // Remove undefined fields from updates
    const cleanedUpdates = removeUndefinedFields(updates);

    await updateDoc(doc(db, 'bloodRequests', requestId), cleanedUpdates);
    console.log('Blood request updated:', requestId);
  } catch (error) {
    console.error('Error updating blood request:', error);
    throw error;
  }
};

export const acceptBloodRequest = async (
  requestId: string,
  donorId: string,
  donorName: string
): Promise<void> => {
  try {
    await updateBloodRequest(requestId, {
      status: 'accepted',
      acceptedDonorId: donorId,
      acceptedDonorName: donorName,
    });
  } catch (error) {
    console.error('Error accepting blood request:', error);
    throw error;
  }
};

export const completeBloodRequest = async (requestId: string): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    await updateBloodRequest(requestId, {
      status: 'completed',
      completedAt: timestamp,
    });
  } catch (error) {
    console.error('Error completing blood request:', error);
    throw error;
  }
};

/**
 * Permanently delete a blood request
 */
export const deleteBloodRequest = async (requestId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'bloodRequests', requestId));
    console.log('Blood request deleted successfully:', requestId);
  } catch (error) {
    console.error('Error deleting blood request:', error);
    throw error;
  }
};

export const getActiveBloodRequests = async (bloodType?: BloodType): Promise<BloodRequest[]> => {
  const cacheKey = `${CACHE_KEY_ACTIVE_REQUESTS}_${bloodType || 'ALL'}`;
  try {
    const constraints: QueryConstraint[] = [
      where('status', '==', 'pending'),
      where('verificationStatus', '==', 'approved'),
      orderBy('createdAt', 'desc'),
    ];

    if (bloodType) {
      constraints.unshift(where('bloodType', '==', bloodType));
    }

    const q = query(collection(db, 'bloodRequests'), ...constraints);
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map((doc) => doc.data() as BloodRequest);

    // Update cache
    await AsyncStorage.setItem(cacheKey, JSON.stringify(requests));

    return requests;
  } catch (error) {
    console.warn('Error getting active blood requests (trying cache):', error);
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        console.log('✅ Returning cached active requests');
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Cache retrieval failed:', e);
    }
    throw error;
  }
};

export const getUserBloodRequests = async (userId: string): Promise<BloodRequest[]> => {
  const cacheKey = `${CACHE_KEY_USER_REQUESTS}_${userId}`;
  try {
    const q = query(
      collection(db, 'bloodRequests'),
      where('requesterId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map((doc) => doc.data() as BloodRequest);

    await AsyncStorage.setItem(cacheKey, JSON.stringify(requests));
    return requests;
  } catch (error) {
    console.warn('Error getting user blood requests (trying cache):', error);
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) { console.error('Cache retrieval failed:', e); }
    throw error;
  }
};

// ACCEPTED REQUEST OPERATIONS (NEW)

/**
 * Create an accepted request record when donor accepts a blood request
 */
export const createAcceptedRequest = async (
  donorId: string,
  donorName: string,
  request: BloodRequest,
  chatId: string
): Promise<string> => {
  try {
    const timestamp = getCurrentTimestamp();

    const acceptedRequestDoc: any = {
      donorId,
      donorName,
      requesterId: request.requesterId,
      requestId: request.id,
      bloodType: request.bloodType,
      urgencyLevel: request.urgencyLevel,
      requesterName: request.requesterName,
      requesterPhone: request.requesterPhone,
      hospitalName: request.hospitalName,
      hospitalAddress: request.hospitalAddress,
      patientName: request.patientName,
      location: request.location,
      unitsNeeded: request.unitsNeeded,
      bloodComponent: request.bloodComponent || 'Whole Blood',
      notes: request.notes,
      status: 'pending' as AcceptedRequestStatus,
      acceptedDate: timestamp,
      chatId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const cleanedDoc = removeUndefinedFields(acceptedRequestDoc);
    const docRef = await addDoc(collection(db, 'acceptedRequests'), cleanedDoc);
    await updateDoc(docRef, { id: docRef.id });

    console.log('Accepted request created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating accepted request:', error);
    throw error;
  }
};

/**
 * Get all accepted requests for a donor
 */
export const getDonorAcceptedRequests = async (
  donorId: string,
  status?: AcceptedRequestStatus
): Promise<AcceptedRequest[]> => {
  try {
    let q;

    if (status) {
      q = query(
        collection(db, 'acceptedRequests'),
        where('donorId', '==', donorId),
        where('status', '==', status),
        orderBy('acceptedDate', 'desc')
      );
    } else {
      q = query(
        collection(db, 'acceptedRequests'),
        where('donorId', '==', donorId),
        orderBy('acceptedDate', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as AcceptedRequest);
  } catch (error) {
    console.error('Error getting donor accepted requests:', error);
    throw error;
  }
};

/**
 * Get active (pending or in_progress) accepted requests for a donor
 */
export const getDonorActiveCommitments = async (donorId: string): Promise<AcceptedRequest[]> => {
  try {
    const q = query(
      collection(db, 'acceptedRequests'),
      where('donorId', '==', donorId),
      where('status', 'in', ['pending', 'in_progress']),
      orderBy('acceptedDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as AcceptedRequest);
  } catch (error) {
    console.error('Error getting active commitments:', error);
    throw error;
  }
};

/**
 * Update accepted request status
 */
export const updateAcceptedRequest = async (
  acceptedRequestId: string,
  updates: Partial<AcceptedRequest>
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    const updateData = {
      ...updates,
      updatedAt: timestamp,
    };

    const cleanedUpdates = removeUndefinedFields(updateData);
    await updateDoc(doc(db, 'acceptedRequests', acceptedRequestId), cleanedUpdates);

    console.log('Accepted request updated:', acceptedRequestId);
  } catch (error) {
    console.error('Error updating accepted request:', error);
    throw error;
  }
};

/**
 * Mark accepted request as in progress
 */
export const startAcceptedRequest = async (
  acceptedRequestId: string,
  scheduledDate?: string
): Promise<void> => {
  try {
    const updates: Partial<AcceptedRequest> = {
      status: 'in_progress',
    };

    if (scheduledDate) {
      updates.scheduledDate = scheduledDate;
    }

    await updateAcceptedRequest(acceptedRequestId, updates);
  } catch (error) {
    console.error('Error starting accepted request:', error);
    throw error;
  }
};

/**
 * Complete an accepted request and link it to donation record
 */
export const completeAcceptedRequest = async (
  acceptedRequestId: string,
  donationRecordId: string
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    await updateAcceptedRequest(acceptedRequestId, {
      status: 'completed',
      completedDate: timestamp,
      donationRecordId,
    });
  } catch (error) {
    console.error('Error completing accepted request:', error);
    throw error;
  }
};

/**
 * Cancel an accepted request
 */
export const cancelAcceptedRequest = async (
  acceptedRequestId: string,
  reason: string
): Promise<void> => {
  try {
    await updateAcceptedRequest(acceptedRequestId, {
      status: 'cancel',
      cancellationReason: reason,
    });
  } catch (error) {
    console.error('Error cancelling accepted request:', error);
    throw error;
  }
};

/**
 * Get single accepted request by ID
 */
export const getAcceptedRequest = async (
  acceptedRequestId: string
): Promise<AcceptedRequest | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'acceptedRequests', acceptedRequestId));
    if (docSnap.exists()) {
      return docSnap.data() as AcceptedRequest;
    }
    return null;
  } catch (error) {
    console.error('Error getting accepted request:', error);
    throw error;
  }
};

// BLOOD REQUEST REJECTION OPERATIONS 

/**
 * Reject a blood request (just marks it as seen/declined for this donor)
 * This doesn't change the request status, just prevents it from showing again
 */
export const createRejectedRequest = async (
  donorId: string,
  requestId: string,
  reason?: string
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    const rejectionId = `${donorId}_${requestId}`;

    const rejectionDoc = {
      id: rejectionId,
      donorId,
      requestId,
      reason,
      rejectedAt: timestamp,
    };

    const cleanedDoc = removeUndefinedFields(rejectionDoc);
    await setDoc(doc(db, 'rejectedRequests', rejectionId), cleanedDoc);

    console.log('Request rejected:', rejectionId);
  } catch (error) {
    console.error('Error rejecting request:', error);
    throw error;
  }
};

/**
 * Get all rejected requests for a donor
 */
export const getDonorRejectedRequests = async (donorId: string): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'rejectedRequests'),
      where('donorId', '==', donorId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data().requestId as string);
  } catch (error) {
    console.error('Error getting rejected requests:', error);
    throw error;
  }
};

/**
 * Check if donor has rejected a specific request
 */
export const hasRejectedRequest = async (
  donorId: string,
  requestId: string
): Promise<boolean> => {
  try {
    const rejectionId = `${donorId}_${requestId}`;
    const docSnap = await getDoc(doc(db, 'rejectedRequests', rejectionId));
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking rejected request:', error);
    return false;
  }
};

/**
 * Get active blood requests excluding rejected ones for a specific donor
 * Only returns requests if the donor is available
 */
export const getActiveBloodRequestsForDonor = async (
  donorId: string,
  bloodType?: string
): Promise<BloodRequest[]> => {
  try {
    // check if donor is available
    const donor = await getUser(donorId);

    // If donor doesn't exist or is unavailable, return empty array
    if (!donor || !donor.isAvailable) {
      console.log(`Donor ${donorId} is not available. No requests will be shown.`);
      return [];
    }

    // Get all active requests (approved and pending)
    const constraints: QueryConstraint[] = [
      where('status', '==', 'pending'),
      where('verificationStatus', '==', 'approved'),
      orderBy('createdAt', 'desc'),
    ];

    const q = query(collection(db, 'bloodRequests'), ...constraints);
    const snapshot = await getDocs(q);
    const allRequests = snapshot.docs.map((doc) => doc.data() as BloodRequest);

    // Get rejected request IDs for this donor
    const rejectedIds = await getDonorRejectedRequests(donorId);

    // Filter out rejected requests
    return allRequests.filter((request) => !rejectedIds.includes(request.id));
  } catch (error) {
    console.error('Error getting active blood requests for donor:', error);
    throw error;
  }
};


// BLOOD BANK OPERATIONS - REALTIME DATABASE

// Helper to normalize location strings to Title Case for consistent matching
const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const getBloodBanks = async (): Promise<BloodBank[]> => {
  try {
    const bloodBanksRef = ref(realtimeDb, 'bloodBanks');
    const snapshot = await get(bloodBanksRef);

    if (!snapshot.exists()) {
      console.log('No blood banks found in Realtime Database');
      return [];
    }

    const bloodBanksData = snapshot.val();
    const bloodBanks: BloodBank[] = [];

    // Convert object to array
    Object.keys(bloodBanksData).forEach((key) => {
      const bank = bloodBanksData[key];

      // Ensure all required fields exist
      if (bank && bank.name && bank.location) {
        let county = (bank.county || '').trim();
        let subCounty = (bank.subCounty || '').trim();

        // Try to infer from address if missing
        if (!county || !subCounty) {
          const addr = (bank.address || '').toLowerCase();
          const parts = addr.split(',').map((p: string) => p.trim());

          if (!county) {
            // Check if any of the parts match a known county
            const matchedCounty = KENYA_COUNTIES.find(c => addr.includes(c.toLowerCase()));
            county = matchedCounty || 'Nairobi';
          }

          if (!subCounty) {
            // Just take a part of the address if possible
            subCounty = parts.length > 1 ? parts[parts.length - 2] : 'Central';
          }
        }

        // Normalize to Title Case for consistent matching with kenyaLocations constants
        county = toTitleCase(county);
        subCounty = toTitleCase(subCounty);

        bloodBanks.push({
          id: key,
          code: bank.code || 'HOSP-' + key.substring(0, 4).toUpperCase(),
          name: bank.name,
          address: bank.address || '',
          location: {
            latitude: bank.location.latitude,
            longitude: bank.location.longitude,
            address: bank.location.address,
            city: bank.location.city,
            region: bank.location.region,
          },
          county: county,
          subCounty: subCounty,
          phoneNumber: bank.phoneNumber || '',
          email: bank.email || '',
          operatingHours: bank.operatingHours || { open: '00:00', close: '23:59' },
          inventory: bank.inventory || {},
          isVerified: bank.isVerified || false,
          rating: bank.rating,
          criticalNeed: bank.criticalNeed || false,
          createdAt: bank.createdAt || new Date().toISOString(),
          updatedAt: bank.updatedAt || new Date().toISOString(),
        });
      }
    });

    console.log(`✅ Fetched ${bloodBanks.length} blood banks from Realtime Database`);

    // Cache the results
    await AsyncStorage.setItem(CACHE_KEY_BLOOD_BANKS, JSON.stringify(bloodBanks));

    return bloodBanks;
  } catch (error) {
    console.warn('❌ Error getting blood banks from Realtime Database (trying cache):', error);

    // Try to get from cache
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY_BLOOD_BANKS);
      if (cached) {
        console.log('✅ Returning cached blood banks');
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.error('Failed to retrieve cache:', cacheError);
    }

    throw error;
  }
};

export const getBloodBankById = async (bloodBankId: string): Promise<BloodBank | null> => {
  try {
    const bloodBankRef = ref(realtimeDb, `bloodBanks/${bloodBankId}`);
    const snapshot = await get(bloodBankRef);

    if (snapshot.exists()) {
      const bank = snapshot.val();
      return {
        id: bloodBankId,
        code: bank.code || 'HOSP-' + bloodBankId.substring(0, 4).toUpperCase(),
        name: bank.name,
        address: bank.address || '',
        location: {
          latitude: bank.location.latitude,
          longitude: bank.location.longitude,
          address: bank.location.address,
          city: bank.location.city,
          region: bank.location.region,
        },
        county: bank.county || 'Nairobi',
        subCounty: bank.subCounty || 'Central',
        phoneNumber: bank.phoneNumber || '',
        email: bank.email || '',
        operatingHours: bank.operatingHours || { open: '08:00', close: '17:00' },
        inventory: bank.inventory || {},
        isVerified: bank.isVerified || false,
        rating: bank.rating,
        criticalNeed: bank.criticalNeed || false,
        createdAt: bank.createdAt || new Date().toISOString(),
        updatedAt: bank.updatedAt || new Date().toISOString(),
      };
    }

    console.log('Blood bank not found in live DB:', bloodBankId);
    return null; // Don't throw, just return null if not found online

  } catch (error) {
    console.warn('Error getting blood bank by ID (trying cache):', error);

    // Try to find in cache
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY_BLOOD_BANKS);
      if (cached) {
        const banks = JSON.parse(cached) as BloodBank[];
        const found = banks.find(b => b.id === bloodBankId);
        if (found) {
          console.log('✅ Found blood bank in cache');
          return found;
        }
      }
    } catch (cacheError) {
      console.error('Failed to retrieve cache:', cacheError);
    }

    throw error;
  }
};

export const searchBloodBanksByType = async (
  bloodType: BloodType,
  userLocation?: Location
): Promise<BloodBank[]> => {
  try {
    console.log(`🔍 Searching for ${bloodType} blood banks...`);

    // Get all blood banks
    const allBloodBanks = await getBloodBanks();

    console.log(`📊 Total blood banks found: ${allBloodBanks.length}`);

    // Filter blood banks that have the required blood type in stock
    let filteredBanks = allBloodBanks.filter((bank) => {
      // Check if bank has inventory
      if (!bank.inventory) {
        console.log(`⚠️ Bank "${bank.name}" has no inventory`);
        return false;
      }

      // Check if blood type exists in inventory
      const inventory = bank.inventory[bloodType];

      if (!inventory) {
        console.log(`⚠️ Bank "${bank.name}" does not have ${bloodType} in inventory`);
        return false;
      }

      const hasStock = inventory.units > 0;
      console.log(`${hasStock ? '✅' : '❌'} Bank "${bank.name}" - ${bloodType}: ${inventory.units} units`);

      return hasStock;
    });

    console.log(`✅ Filtered banks with ${bloodType}: ${filteredBanks.length}`);

    // If user location is provided, calculate distance and sort
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      console.log(`📍 User location provided, calculating distances...`);

      filteredBanks = filteredBanks.map((bank) => {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          bank.location.latitude,
          bank.location.longitude
        );

        console.log(`📏 Distance to "${bank.name}": ${distance.toFixed(2)} km`);

        return {
          ...bank,
          distance,
        };
      }).sort((a, b) => (a.distance || 0) - (b.distance || 0));

      console.log('✅ Banks sorted by distance');
    }

    return filteredBanks;
  } catch (error) {
    console.error('❌ Error searching blood banks by type:', error);
    throw error;
  }
};


// CHAT OPERATIONS

export const createChat = async (
  participant1Id: string,
  participant1Name: string,
  participant2Id: string,
  participant2Name: string,
  requestId?: string,
  chatRole?: 'donor' | 'requester'
): Promise<string> => {
  try {
    const timestamp = getCurrentTimestamp();
    const chatId = `${participant1Id}_${participant2Id}_${Date.now()}`;

    const chatDoc: any = {
      id: chatId,
      participants: [participant1Id, participant2Id],
      participantNames: {
        [participant1Id]: participant1Name,
        [participant2Id]: participant2Name,
      },
      chatRole: chatRole || null,
      lastMessage: '',
      lastMessageTime: timestamp,
      unreadCount: {
        [participant1Id]: 0,
        [participant2Id]: 0,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Only add requestId if it's provided
    if (requestId) {
      chatDoc.requestId = requestId;
    }

    const cleanedChatDoc = removeUndefinedFields(chatDoc);

    await setDoc(doc(db, 'chats', chatId), cleanedChatDoc);
    console.log('Chat created:', chatId);
    return chatId;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
};

export const sendMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  receiverId: string,
  message: string,
  referralId?: string
): Promise<void> => {
  try {
    const timestamp = serverTimestamp();
    const messageId = `${chatId}_${Date.now()}`;

    const messageDoc = {
      id: messageId,
      chatId,
      referralId: referralId || null,
      senderId,
      senderName,
      receiverId,
      message,
      timestamp, // Using serverTimestamp()
      isRead: false,
      type: 'text',
    };

    const cleanedMessageDoc = removeUndefinedFields(messageDoc);

    await setDoc(doc(db, 'messages', messageId), cleanedMessageDoc);

    // 🏆 New: Trigger notification for receiver
    try {
      await createNotification({
        userId: receiverId,
        type: 'new_message',
        title: `New message from ${senderName}`,
        message: message.length > 50 ? `${message.substring(0, 47)}...` : message,
        data: { chatId, senderId, senderName },
        isRead: false,
        timestamp: timestamp as any
      });
    } catch (notifErr) {
      console.warn('[Database] Failed to send message notification:', notifErr);
    }

    // Update chat's last message
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: message,
      lastMessageTime: timestamp as any,
      updatedAt: timestamp as any,
      [`unreadCount.${receiverId}`]: increment(1),
    });

    console.log('Message sent:', messageId);
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Get all chats for a user, optionally filtered by role
 * This helps isolate donor-related chats from requester-related chats
 */
export const getUserChats = async (userId: string, role?: 'donor' | 'requester'): Promise<Chat[]> => {
  try {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );
    const snapshot = await getDocs(q);
    const chats = snapshot.docs
      .map((doc) => {
        const data = doc.data() as Chat;
        return {
          ...data,
          id: doc.id,
          lastMessageTime: normalizeTimestamp(data.lastMessageTime),
          createdAt: normalizeTimestamp(data.createdAt),
          updatedAt: normalizeTimestamp(data.updatedAt),
        } as Chat;
      })
      .filter((chat: Chat) => {
        // 1. Filter out malformed documents
        if (!chat.id || chat.id === 'undefined' || chat.id === 'null' || !chat.participants) {
          return false;
        }

        // 2. Filter out chats with invalid/missing lastMessageTime (these cause "Invalid Date" UI)
        if (!chat.lastMessageTime || isNaN(new Date(chat.lastMessageTime).getTime())) {
          return false;
        }

        // 3. Filter out stale placeholder chats
        if (chat.lastMessage === 'Chat started' && (chat.updatedAt === chat.createdAt || !chat.updatedAt)) {
          const createdDate = new Date(chat.createdAt || Date.now()).getTime();
          const oneHourAgo = Date.now() - (3600 * 1000);
          if (createdDate < oneHourAgo) return false;
        }

        return true;
      });

    // If role is provided, filter chats by chatRole
    if (role) {
      return chats.filter((chat: Chat) => !chat.chatRole || chat.chatRole === role);
    }

    return chats;
  } catch (error) {
    console.error('Error getting user chats:', error);
    throw error;
  }
};



/**
 * Cleanup malformed chats and messages
 */
export const cleanupMalformedData = async (userId: string): Promise<{ deleted: number }> => {
  let deletedCount = 0;
  try {
    console.log('[Database] Starting malformed data cleanup for user:', userId);

    // 1. Cleanup chats
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    );
    const snapshot = await getDocs(q);

    for (const snap of snapshot.docs) {
      const id = snap.id;
      const data = snap.data() as Chat;
      let shouldDelete = false;

      if (id === 'undefined' || id === 'null' || id.includes('undefined') || id.includes('null')) {
        shouldDelete = true;
      } else if (data.participants && (data.participants.includes('undefined') || data.participants.includes('null') || data.participants.includes(null as any))) {
        shouldDelete = true;
      }

      if (shouldDelete) {
        console.log('[Database] Deleting malformed chat:', id);
        await deleteDoc(snap.ref);
        deletedCount++;
      }
    }

    // 2. Cleanup messages where chatId is malformed
    // Note: We can't easily query all messages globally on client due to rules,
    // but we can try to find messages sent by or to the user that have malformed chatId.
    // However, the "chats/undefined" error is the main one.

    return { deleted: deletedCount };
  } catch (error) {
    console.error('[Database] Cleanup failed:', error);
    throw error;
  }
};

/**
 * Delete a chat and all its messages
 */
export const deleteChat = async (chatId: string): Promise<void> => {
  try {
    // Delete all messages in the chat
    const messagesQuery = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    const deleteMessagePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deleteMessagePromises);

    // Delete the chat document
    await deleteDoc(doc(db, 'chats', chatId));
    console.log('Chat deleted:', chatId);
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw error;
  }
};

export const getChatMessages = async (chatId: string): Promise<ChatMessage[]> => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data() as ChatMessage;
      return {
        ...data,
        id: doc.id,
        timestamp: normalizeTimestamp(data.timestamp),
      } as ChatMessage;
    });
  } catch (error) {
    console.error('Error getting chat messages:', error);
    throw error;
  }
};


// NOTIFICATION OPERATIONS

export const createNotification = async (
  notificationData: NewDocument<Notification>
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    const notificationId = `${notificationData.userId}_${Date.now()}`;

    const notificationDoc: Notification = {
      ...notificationData,
      id: notificationId,
      isRead: false,
      timestamp,
    };

    const cleanedNotificationDoc = removeUndefinedFields(notificationDoc);

    await setDoc(doc(db, 'notifications', notificationId), cleanedNotificationDoc);
    console.log('Notification created:', notificationId);
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Notification);
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};


// DONATION RECORD OPERATIONS

export const createDonationRecord = async (
  donationData: NewDocument<DonationRecord>
): Promise<string> => {
  try {
    const timestamp = getCurrentTimestamp();
    const donationDoc = {
      ...donationData,
      createdAt: timestamp,
    };

    const cleanedDonationDoc = removeUndefinedFields(donationDoc);

    const docRef = await addDoc(collection(db, 'donations'), cleanedDonationDoc);
    await updateDoc(docRef, { id: docRef.id });

    // Update donor's points and last donation date
    const donor = await getUser(donationData.donorId);
    if (donor) {
      await updateUser(donationData.donorId, {
        points: (donor.points || 0) + donationData.pointsEarned,
        lastDonationDate: donationData.donationDate,
      });
    }

    console.log('Donation record created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating donation record:', error);
    throw error;
  }
};

export const getDonorHistory = async (donorId: string): Promise<DonationRecord[]> => {
  const cacheKey = `${CACHE_KEY_DONOR_HISTORY}_${donorId}`;
  try {
    const q = query(
      collection(db, 'donations'),
      where('donorId', '==', donorId),
      orderBy('donationDate', 'desc')
    );
    const snapshot = await getDocs(q);
    const history = snapshot.docs.map((doc) => doc.data() as DonationRecord);

    await AsyncStorage.setItem(cacheKey, JSON.stringify(history));
    return history;
  } catch (error) {
    console.warn('Error getting donor history (trying cache):', error);
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) { console.error('Cache retrieval failed:', e); }
    throw error;
  }
};


// POST/FEED OPERATIONS

export const createPost = async (postData: NewDocument<Post>): Promise<string> => {
  try {
    const timestamp = getCurrentTimestamp();
    const postDoc = {
      ...postData,
      likes: [],
      comments: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const cleanedPostDoc = removeUndefinedFields(postDoc);

    const docRef = await addDoc(collection(db, 'posts'), cleanedPostDoc);
    await updateDoc(docRef, { id: docRef.id });

    console.log('Post created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

export const getPosts = async (limitCount: number = 20): Promise<Post[]> => {
  try {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Post);
  } catch (error) {
    console.error('Error getting posts:', error);
    throw error;
  }
};

// REAL-TIME LISTENERS


export const subscribeToBloodRequests = (
  bloodType: BloodType,
  callback: (requests: BloodRequest[]) => void
) => {
  const q = query(
    collection(db, 'bloodRequests'),
    where('bloodType', '==', bloodType),
    where('status', '==', 'pending'),
    where('verificationStatus', '==', 'approved'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((doc) => doc.data() as BloodRequest);
    callback(requests);
  });
};

export const subscribeToChatMessages = (
  chatId: string,
  callback: (messages: ChatMessage[]) => void
) => {
  const q = query(
    collection(db, 'messages'),
    where('chatId', '==', chatId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => {
      const data = doc.data() as ChatMessage;
      return {
        ...data,
        id: doc.id,
        timestamp: normalizeTimestamp(data.timestamp),
      } as ChatMessage;
    });
    callback(messages);
  });
};

export const subscribeToUserChats = (
  userId: string,
  callback: (chats: Chat[]) => void
) => {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTime', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map((doc) => {
      const data = doc.data() as Chat;
      return {
        ...data,
        id: doc.id,
      } as Chat;
    });
    callback(chats);
  });
};


// TWO-PARTY VERIFICATION OPERATIONS 
/**
 * Donor marks donation as complete (pending requester verification)
 */
export const markDonationPendingVerification = async (
  acceptedRequestId: string,
  donorNotes?: string
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    await updateAcceptedRequest(acceptedRequestId, {
      status: 'pending_verification',
      donorCompletedAt: timestamp,
      donorNotes: donorNotes || undefined,
    });
    console.log('Donation marked pending verification:', acceptedRequestId);
  } catch (error) {
    console.error('Error marking donation pending verification:', error);
    throw error;
  }
};

/**
 * Get pending verifications for a requester
 */
export const getRequesterPendingVerifications = async (
  requesterId: string
): Promise<AcceptedRequest[]> => {
  try {
    const q = query(
      collection(db, 'acceptedRequests'),
      where('requesterId', '==', requesterId),
      where('status', '==', 'pending_verification'),
      orderBy('donorCompletedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as AcceptedRequest);
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    throw error;
  }
};

/**
 * Requester verifies the donation (approve)
 */
export const verifyDonationByRequester = async (
  acceptedRequestId: string,
  verificationNotes?: string
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    await updateAcceptedRequest(acceptedRequestId, {
      status: 'verified',
      requesterVerifiedAt: timestamp,
      requesterVerificationNotes: verificationNotes || undefined,
    });
    console.log('Donation verified by requester:', acceptedRequestId);
  } catch (error) {
    console.error('Error verifying donation:', error);
    throw error;
  }
};

/**
 * Requester disputes the donation
 */
export const disputeDonationByRequester = async (
  acceptedRequestId: string,
  disputeReason: string
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    await updateAcceptedRequest(acceptedRequestId, {
      status: 'disputed',
      requesterVerifiedAt: timestamp,
      requesterVerificationNotes: disputeReason,
    });
    console.log('Donation disputed by requester:', acceptedRequestId);
  } catch (error) {
    console.error('Error disputing donation:', error);
    throw error;
  }
};

/**
 * Requester disputes the donation AND creates a support ticket
 * This is the enhanced version that integrates with the ticket system
 */
export const disputeDonationByRequesterWithTicket = async (
  acceptedRequest: AcceptedRequest,
  userId: string,
  userName: string,
  userEmail: string,
  userPhone: string | undefined,
  disputeReason: string,
  additionalDetails?: string
): Promise<{ ticketId: string }> => {
  try {
    const timestamp = getCurrentTimestamp();

    // Update the accepted request status
    await updateAcceptedRequest(acceptedRequest.id, {
      status: 'disputed',
      requesterVerifiedAt: timestamp,
      requesterVerificationNotes: disputeReason,
    });

    // Create a support ticket for the dispute
    const ticketData: CreateTicketFormData = {
      type: 'dispute',
      priority: 'high',
      subject: `Dispute: Donation for ${acceptedRequest.patientName}`,
      description: `I'm disputing the donation for ${acceptedRequest.patientName} at ${acceptedRequest.hospitalName}.\n\nReason: ${disputeReason}\n\nAdditional Details: ${additionalDetails || 'No additional details provided.'}`,
      relatedEntityId: acceptedRequest.id,
      relatedEntityType: 'accepted_request',
    };

    const ticketId = await createTicket(
      userId,
      userName,
      userEmail,
      userPhone,
      ticketData
    );

    console.log('Donation disputed with ticket created:', ticketId);
    return { ticketId };
  } catch (error) {
    console.error('Error disputing donation with ticket:', error);
    throw error;
  }
};

/**
 * Get a ticket ID by its related entity ID and type
 */
export const getTicketIdByRelatedEntity = async (
  relatedEntityId: string,
  relatedEntityType: string
): Promise<string | null> => {
  try {
    const q = query(
      collection(db, 'tickets'),
      where('relatedEntityId', '==', relatedEntityId),
      where('relatedEntityType', '==', relatedEntityType),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error getting ticket ID by related entity:', error);
    return null;
  }
};

/**
 * Complete donation after verification (called after requester verifies)
 */
export const completeDonationAfterVerification = async (
  acceptedRequest: AcceptedRequest,
  donorId: string,
  donorName: string
): Promise<string> => {
  try {
    // Create donation record
    const donationRecordId = await createDonationRecord({
      donorId,
      donorName,
      requestId: acceptedRequest.requestId,
      bloodType: acceptedRequest.bloodType,
      donationDate: acceptedRequest.donorCompletedAt || new Date().toISOString(),
      location: acceptedRequest.location,
      bloodBankName: acceptedRequest.hospitalName,
      unitsCollected: acceptedRequest.unitsNeeded,
      pointsEarned: 50,
      notes: acceptedRequest.donorNotes,
    });

    // Mark accepted request as completed
    await completeAcceptedRequest(acceptedRequest.id, donationRecordId);

    // Complete the blood request
    await completeBloodRequest(acceptedRequest.requestId);

    console.log('Donation completed after verification:', donationRecordId);
    return donationRecordId;
  } catch (error) {
    console.error('Error completing donation after verification:', error);
    throw error;
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  chatId: string,
  userId: string
): Promise<void> => {
  if (!chatId || chatId === 'undefined' || chatId === 'null' || chatId.includes('undefined')) {
    console.warn('[Database] Skipping markMessagesAsRead: Invalid chatId:', chatId);
    return;
  }
  try {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      where('receiverId', '==', userId),
      where('isRead', '==', false)
    );

    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, { isRead: true })
    );

    await Promise.all(updatePromises);

    // Reset unread count in chat
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      await updateDoc(chatRef, {
        [`unreadCount.${userId}`]: 0
      });
    } else {
      console.warn('[Database] Chat document does not exist, skipping unread count reset:', chatId);
    }
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

/**
 * Get chat by ID
 */
export const getChatById = async (chatId: string): Promise<Chat | null> => {
  try {
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (chatDoc.exists()) {
      return chatDoc.data() as Chat;
    }
    return null;
  } catch (error) {
    console.error('Error getting chat:', error);
    throw error;
  }
};

/**
 * Delete a message
 */
export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'messages', messageId), {
      message: 'This message was deleted',
      type: 'text',
      isDeleted: true
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

/**
 * Get chat by request ID (find existing chat for a blood request)
 */
export const getChatByRequestId = async (
  requestId: string,
  donorId: string,
  requesterId: string
): Promise<Chat | null> => {
  try {
    const q = query(
      collection(db, 'chats'),
      where('requestId', '==', requestId),
      where('participants', 'array-contains', donorId)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Find the chat that includes both participants
      const chats = snapshot.docs
        .map(doc => doc.data() as Chat)
        .filter(chat =>
          chat.participants.includes(donorId) &&
          chat.participants.includes(requesterId)
        );

      if (chats.length > 0) {
        return chats[0];
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting chat by request ID:', error);
    throw error;
  }
};


// INTERESTED DONORS OPERATIONS 

/**
 * Donor expresses interest in a blood request
 */
export const expressInterestInRequest = async (
  donorId: string,
  donorName: string,
  donorPhone: string,
  donorBloodType: BloodType,
  request: BloodRequest,
  message?: string
): Promise<string> => {
  try {
    const timestamp = getCurrentTimestamp();
    const interestId = `${request.id}_${donorId}`;

    const interestedDonorDoc: InterestedDonor = {
      id: interestId,
      donorId,
      donorName,
      donorPhone,
      donorBloodType,
      requestId: request.id,
      interestedAt: timestamp,
      status: 'pending',
      message,
    };

    const cleanedDoc = removeUndefinedFields(interestedDonorDoc);
    await setDoc(doc(db, 'interestedDonors', interestId), cleanedDoc);

    // Update the blood request to include this donor
    const currentInterestedIds = request.interestedDonorIds || [];
    await updateBloodRequest(request.id, {
      interestedDonorIds: [...currentInterestedIds, donorId],
    });

    // Notify requester
    await createNotification({
      userId: request.requesterId,
      type: 'donor_interested',
      title: 'New Donor Interested',
      message: `${donorName} is interested in your blood request for ${request.bloodType}`,
      data: {
        requestId: request.id,
        donorId,
        interestId,
      },
      isRead: false,
      timestamp: ''
    });

    console.log('Interest expressed:', interestId);
    return interestId;
  } catch (error) {
    console.error('Error expressing interest:', error);
    throw error;
  }
};

/**
 * Get all interested donors for a specific request
 */
export const getInterestedDonorsForRequest = async (
  requestId: string
): Promise<InterestedDonor[]> => {
  try {
    const q = query(
      collection(db, 'interestedDonors'),
      where('requestId', '==', requestId),
      where('status', '==', 'pending'),
      orderBy('interestedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as InterestedDonor);
  } catch (error) {
    console.error('Error getting interested donors:', error);
    throw error;
  }
};

/**
 * Requester selects a donor from interested donors
 */
export const selectDonorForRequest = async (
  requestId: string,
  selectedDonorId: string,
  selectedDonorName: string,
  requesterId: string,
  requesterName: string
): Promise<string> => {
  try {
    // Get all interested donors for this request
    const allInterested = await query(
      collection(db, 'interestedDonors'),
      where('requestId', '==', requestId)
    );
    const interestedSnapshot = await getDocs(allInterested);

    // Update selected donor's status
    const selectedInterestId = `${requestId}_${selectedDonorId}`;
    await updateDoc(doc(db, 'interestedDonors', selectedInterestId), {
      status: 'selected',
    });

    // Decline all other interested donors
    const declinePromises = interestedSnapshot.docs
      .filter(doc => doc.data().donorId !== selectedDonorId)
      .map(async (doc) => {
        const donorData = doc.data() as InterestedDonor;

        // Update their status
        await updateDoc(doc.ref, { status: 'declined' });

        // Notify them
        await createNotification({
          userId: donorData.donorId,
          type: 'request_fulfilled',
          title: 'Request Fulfilled',
          message: 'The requester has chosen another donor for this request. Thank you for your interest!',
          data: { requestId },
          isRead: false,
          timestamp: ''
        });
      });

    await Promise.all(declinePromises);

    // Create chat between selected donor and requester
    const chatId = await createChat(
      selectedDonorId,
      selectedDonorName,
      requesterId,
      requesterName,
      requestId
    );

    // Get the request details
    const request = await getBloodRequest(requestId);
    if (!request) throw new Error('Request not found');

    // Create accepted request record for selected donor
    await createAcceptedRequest(
      selectedDonorId,
      selectedDonorName,
      request,
      chatId
    );

    // Update blood request
    await updateBloodRequest(requestId, {
      status: 'accepted',
      selectedDonorId,
      acceptedDonorId: selectedDonorId,
      acceptedDonorName: selectedDonorName,
    });

    // Notify selected donor
    await createNotification({
      userId: selectedDonorId,
      type: 'request_accepted',
      title: 'You Were Selected! 🎉',
      message: `${requesterName} has selected you as the donor. You can now chat with them.`,
      data: {
        requestId,
        chatId,
      },
      isRead: false,
      timestamp: ''
    });

    console.log('Donor selected successfully:', selectedDonorId);
    return chatId;
  } catch (error) {
    console.error('Error selecting donor:', error);
    throw error;
  }
};

/**
 * Check if donor has already expressed interest
 */
export const hasExpressedInterest = async (
  donorId: string,
  requestId: string
): Promise<boolean> => {
  try {
    const interestId = `${requestId}_${donorId}`;
    const docSnap = await getDoc(doc(db, 'interestedDonors', interestId));
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking interest:', error);
    return false;
  }
};


// REVIEW OPERATIONS 

/**
 * Add a new review
 */
export const addReview = async (reviewData: {
  userId: string;
  userName: string;
  userType: 'donor' | 'requester';
  bloodType: string;
  rating: number;
  review: string;
  category?: string | null;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}): Promise<string> => {
  try {
    const reviewDoc = {
      ...reviewData,
      updatedAt: getCurrentTimestamp(),
    };

    const cleanedDoc = removeUndefinedFields(reviewDoc);
    const docRef = await addDoc(collection(db, 'reviews'), cleanedDoc);
    await updateDoc(docRef, { id: docRef.id });

    console.log('Review submitted:', docRef.id);

    // Mark user as reviewed after successful submission
    await markUserAsReviewed(reviewData.userId);

    return docRef.id;
  } catch (error) {
    console.error('Error adding review:', error);
    throw error;
  }
};

/**
 * Get approved reviews for display
 */
export const getApprovedReviews = async (limitCount: number = 20): Promise<any[]> => {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    await AsyncStorage.setItem(CACHE_KEY_APPROVED_REVIEWS, JSON.stringify(reviews));
    return reviews;
  } catch (error) {
    console.warn('Error getting approved reviews (trying cache):', error);
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY_APPROVED_REVIEWS);
      if (cached) return JSON.parse(cached);
    } catch (e) { console.error('Cache retrieval failed:', e); }
    throw error;
  }
};

/**
 * Get reviews by user
 */
export const getUserReviews = async (userId: string): Promise<any[]> => {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting user reviews:', error);
    throw error;
  }
};

/**
 * Get reviews by rating
 */
export const getReviewsByRating = async (rating: number, limitCount: number = 10): Promise<any[]> => {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('status', '==', 'approved'),
      where('rating', '==', rating),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting reviews by rating:', error);
    throw error;
  }
};

/**
 * Update review status (admin function)
 */
export const updateReviewStatus = async (
  reviewId: string,
  status: 'pending' | 'approved' | 'rejected'
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'reviews', reviewId), {
      status,
      updatedAt: getCurrentTimestamp(),
    });
    console.log('Review status updated:', reviewId);
  } catch (error) {
    console.error('Error updating review status:', error);
    throw error;
  }
};

/**
 * Get average rating
 */
export const getAverageRating = async (): Promise<{ average: number; count: number }> => {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('status', '==', 'approved')
    );

    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map((doc) => doc.data());

    if (reviews.length === 0) {
      return { average: 0, count: 0 };
    }

    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const average = totalRating / reviews.length;

    return {
      average: Math.round(average * 10) / 10,
      count: reviews.length,
    };
  } catch (error) {
    console.error('Error getting average rating:', error);
    throw error;
  }
};

/**
 * Subscribe to approved reviews (real-time)
 */
export const subscribeToApprovedReviews = (
  callback: (reviews: any[]) => void,
  limitCount: number = 20
) => {
  const q = query(
    collection(db, 'reviews'),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const reviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(reviews);
  });
};


// VERIFICATION OPERATIONS

export const submitVerificationRequest = async (
  userId: string,
  data: Omit<VerificationRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    const docData = removeUndefinedFields({
      ...data,
      id: userId,
      status: 'pending',
      submittedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await setDoc(doc(db, 'verification_requests', userId), docData);
    // Mirror verification status on the user record so guards can read it cheaply
    await updateDoc(doc(db, 'users', userId), {
      verificationStatus: 'pending',
      isVerified: false,
      updatedAt: timestamp,
    });
    console.log('[Verification] Request submitted for user:', userId);
  } catch (error) {
    console.log('[Verification] Error submitting request:', error);
    throw error;
  }
};

/**
 * Fetch the verification request for a user (returns null if not yet submitted).
 */
export const getVerificationRequest = async (
  userId: string
): Promise<VerificationRequest | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'verification_requests', userId));
    if (docSnap.exists()) return docSnap.data() as VerificationRequest;
    return null;
  } catch (error) {
    console.log('[Verification] Error fetching request:', error);
    return null;
  }
};

/**
 * Admin: approve or reject a verification request.
 * Updates both `verification_requests` and the `users` doc.
 */
export const updateVerificationStatus = async (
  userId: string,
  status: 'approved' | 'rejected',
  adminNotes?: string
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    // Update the verification request document
    await updateDoc(doc(db, 'verification_requests', userId), removeUndefinedFields({
      status,
      adminNotes,
      reviewedAt: timestamp,
      updatedAt: timestamp,
    }));
    // Mirror on user doc
    await updateDoc(doc(db, 'users', userId), removeUndefinedFields({
      verificationStatus: status,
      isVerified: status === 'approved',
      verificationRejectionReason: status === 'rejected' ? (adminNotes || 'No reason provided') : null,
      updatedAt: timestamp,
    }));
    console.log(`[Verification] User ${userId} marked as ${status}`);
  } catch (error) {
    console.log('[Verification] Error updating status:', error);
    throw error;
  }
};

/**
 * Deletes all Firestore data associated with a user
 */
export const deleteUserCollections = async (userId: string): Promise<void> => {
  try {
    console.log('[Database] Starting cleanup for user:', userId);

    // 1. Delete user document
    await deleteDoc(doc(db, 'users', userId));

    // 2. Delete verification request if it exists
    const verifRef = doc(db, 'verification_requests', userId);
    const verifSnap = await getDoc(verifRef);
    if (verifSnap.exists()) {
      await deleteDoc(verifRef);
    }

    // 3. Delete notifications for this user
    const notifsQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
    const notifsSnap = await getDocs(notifsQuery);
    const deleteNotifPromises = notifsSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deleteNotifPromises);

    console.log('[Database] Cleanup successful for user:', userId);
  } catch (error) {
    console.error('[Database] Error during user cleanup:', error);
    throw error;
  }
};


// ==================== TICKET/DISPUTE SYSTEM OPERATIONS ====================

/**
 * Create a new support/dispute ticket
 */
export const createTicket = async (
  userId: string,
  userName: string,
  userEmail: string,
  userPhone: string | undefined,
  ticketData: CreateTicketFormData
): Promise<string> => {
  try {
    const timestamp = getCurrentTimestamp();

    // Check for potential duplicates (same subject + type within last 24 hours)
    const duplicateCheck = await checkDuplicateTicket(userId, ticketData.subject, ticketData.type);

    const ticket: any = {
      userId,
      userName,
      userEmail,
      userPhone,
      type: ticketData.type,
      priority: ticketData.priority,
      status: 'open' as const,
      subject: ticketData.subject,
      description: ticketData.description,
      relatedEntityId: ticketData.relatedEntityId,
      relatedEntityType: ticketData.relatedEntityType,
      disputeReason: ticketData.disputeReason,
      additionalDetails: ticketData.additionalDetails,
      messageCount: 0,
      attachmentCount: 0,
      source: 'app' as const,
      duplicateOfTicketId: duplicateCheck?.duplicateOfTicketId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const cleanedTicket = removeUndefinedFields(ticket);
    const docRef = await addDoc(collection(db, 'tickets'), cleanedTicket);
    await updateDoc(docRef, { id: docRef.id });

    // Create initial message from user's description
    if (ticketData.description) {
      await createTicketMessage(docRef.id, userId, userName, 'user', ticketData.description);
    }

    console.log('Ticket created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
};

/**
 * Check for duplicate tickets (same subject + type within 24 hours)
 */
const checkDuplicateTicket = async (
  userId: string,
  subject: string,
  type: string
): Promise<{ duplicateOfTicketId: string } | null> => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const q = query(
      collection(db, 'tickets'),
      where('userId', '==', userId),
      where('type', '==', type),
      where('createdAt', '>=', twentyFourHoursAgo)
    );

    const snapshot = await getDocs(q);

    for (const doc of snapshot.docs) {
      const ticket = doc.data() as Ticket;
      // Check if subject is similar (case-insensitive)
      if (ticket.subject.toLowerCase() === subject.toLowerCase()) {
        return { duplicateOfTicketId: ticket.id };
      }
    }

    return null;
  } catch (error) {
    console.error('Error checking duplicate ticket:', error);
    return null;
  }
};

/**
 * Get a single ticket by ID
 */
export const getTicket = async (ticketId: string): Promise<Ticket | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'tickets', ticketId));
    if (docSnap.exists()) {
      return docSnap.data() as Ticket;
    }
    return null;
  } catch (error) {
    console.error('Error getting ticket:', error);
    throw error;
  }
};

/**
 * Get all tickets for a user
 */
export const getUserTickets = async (userId: string): Promise<Ticket[]> => {
  try {
    const q = query(
      collection(db, 'tickets'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Ticket);
  } catch (error) {
    console.error('Error getting user tickets:', error);
    throw error;
  }
};

/**
 * Get all tickets (for admin view)
 */
export const getAdminTickets = async (filters?: TicketFilters): Promise<Ticket[]> => {
  try {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

    if (filters?.status && filters.status.length > 0) {
      // Note: Firestore 'in' query limited to 10 values
      if (filters.status.length === 1) {
        constraints.unshift(where('status', '==', filters.status[0]));
      } else {
        // For multiple statuses, we'll need to fetch and filter client-side
        // This is a limitation of Firestore
      }
    }

    if (filters?.assignedToMe && filters.assignedToMe) {
      // This requires a composite index or client-side filtering
    }

    const q = query(collection(db, 'tickets'), ...constraints);
    const snapshot = await getDocs(q);
    let tickets = snapshot.docs.map(doc => doc.data() as Ticket);

    // Client-side filtering for complex queries
    if (filters) {
      if (filters.status && filters.status.length > 1) {
        tickets = tickets.filter(t => filters.status!.includes(t.status));
      }
      if (filters.type && filters.type.length > 0) {
        tickets = tickets.filter(t => filters.type!.includes(t.type));
      }
      if (filters.priority && filters.priority.length > 0) {
        tickets = tickets.filter(t => filters.priority!.includes(t.priority));
      }
      if (filters.assignedToMe) {
        tickets = tickets.filter(t => t.assignedAdminId === filters.assignedToMe);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        tickets = tickets.filter(t =>
          t.subject.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
        );
      }
    }

    return tickets;
  } catch (error) {
    console.error('Error getting admin tickets:', error);
    throw error;
  }
};

/**
 * Update ticket status
 */
export const updateTicketStatus = async (
  ticketId: string,
  newStatus: Ticket['status'],
  performedBy: string,
  performedByType: 'user' | 'admin' | 'system'
): Promise<void> => {
  try {
    const ticket = await getTicket(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const timestamp = getCurrentTimestamp();
    const updates: any = {
      status: newStatus,
      updatedAt: timestamp,
    };

    // Set status-specific timestamps
    if (newStatus === 'resolved' && !ticket.resolvedAt) {
      updates.resolvedAt = timestamp;
    }
    if (newStatus === 'closed' && !ticket.closedAt) {
      updates.closedAt = timestamp;
    }

    await updateDoc(doc(db, 'tickets', ticketId), updates);

    // Create audit log entry
    await createTicketAuditLog({
      ticketId,
      action: 'status_changed',
      performedBy,
      performedByType,
      previousValue: ticket.status,
      newValue: newStatus,
    });

    console.log(`Ticket ${ticketId} status updated to ${newStatus}`);
  } catch (error) {
    console.error('Error updating ticket status:', error);
    throw error;
  }
};

/**
 * Assign ticket to admin
 */
export const assignTicketToAdmin = async (
  ticketId: string,
  adminId: string,
  adminName: string
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();

    await updateDoc(doc(db, 'tickets', ticketId), {
      assignedAdminId: adminId,
      assignedAdminName: adminName,
      assignedAt: timestamp,
      status: 'under_review',
      updatedAt: timestamp,
    });

    // Create audit log entry
    await createTicketAuditLog({
      ticketId,
      action: 'assigned',
      performedBy: adminId,
      performedByType: 'admin',
      newValue: `${adminName} (${adminId})`,
    });

    console.log(`Ticket ${ticketId} assigned to admin ${adminName}`);
  } catch (error) {
    console.error('Error assigning ticket to admin:', error);
    throw error;
  }
};

/**
 * Create a ticket message
 */
export const createTicketMessage = async (
  ticketId: string,
  senderId: string,
  senderName: string,
  senderType: 'user' | 'admin',
  message: string
): Promise<string> => {
  try {
    const timestamp = serverTimestamp();
    const messageId = `${ticketId}_${Date.now()}`;

    const ticketMessage = {
      id: messageId,
      ticketId,
      senderId,
      senderName,
      senderType,
      message,
      createdAt: timestamp,
    };

    const cleanedMessage = removeUndefinedFields(ticketMessage);
    await setDoc(doc(db, 'ticketMessages', messageId), cleanedMessage);

    // Update ticket message count and timestamp
    const ticket = await getTicket(ticketId);
    if (ticket) {
      await updateDoc(doc(db, 'tickets', ticketId), {
        messageCount: increment(1),
        updatedAt: timestamp as any,
        // Set first response time if this is the first admin message
        firstResponseAt: (senderType === 'admin' && !ticket.firstResponseAt) ? timestamp as any : ticket.firstResponseAt,
      });
    }

    // Create audit log entry
    await createTicketAuditLog({
      ticketId,
      action: 'message_added',
      performedBy: senderId,
      performedByType: senderType,
      newValue: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
    });

    console.log('Ticket message created:', messageId);
    return messageId;
  } catch (error) {
    console.error('Error creating ticket message:', error);
    throw error;
  }
};



/**
 * Subscribe to real-time notifications for a user
 */
export const subscribeToUserNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(d => d.data() as Notification);
    callback(notifications);
  });
};


/**
 * Get all messages for a ticket
 */
export const getTicketMessages = async (ticketId: string): Promise<TicketMessage[]> => {
  try {
    const q = query(
      collection(db, 'ticketMessages'),
      where('ticketId', '==', ticketId),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data() as TicketMessage;
      return {
        ...data,
        id: doc.id,
        createdAt: normalizeTimestamp(data.createdAt),
      } as TicketMessage;
    });
  } catch (error) {
    console.error('Error getting ticket messages:', error);
    throw error;
  }
};

/**
 * Create ticket audit log entry
 */
export const createTicketAuditLog = async (auditData: {
  ticketId: string;
  action: string;
  performedBy: string;
  performedByType: 'user' | 'admin' | 'system';
  previousValue?: string;
  newValue: string;
  metadata?: Record<string, any>;
}): Promise<string> => {
  try {
    const timestamp = getCurrentTimestamp();
    const auditId = `${auditData.ticketId}_${Date.now()}`;

    const auditLog = {
      id: auditId,
      ...auditData,
      timestamp,
    };

    const cleanedAudit = removeUndefinedFields(auditLog);
    await setDoc(doc(db, 'ticketAuditLogs', auditId), cleanedAudit);

    return auditId;
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw error;
  }
};

/**
 * Get audit logs for a ticket
 */
export const getTicketAuditLogs = async (ticketId: string): Promise<any[]> => {
  try {
    const q = query(
      collection(db, 'ticketAuditLogs'),
      where('ticketId', '==', ticketId),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting ticket audit logs:', error);
    throw error;
  }
};

/**
 * Get ticket statistics for dashboard
 */
export const getTicketStats = async (): Promise<TicketStats> => {
  try {
    const allTickets = await getAdminTickets();

    const stats: TicketStats = {
      total: allTickets.length,
      open: allTickets.filter(t => t.status === 'open').length,
      under_review: allTickets.filter(t => t.status === 'under_review').length,
      awaiting_user: allTickets.filter(t => t.status === 'awaiting_user').length,
      resolved: allTickets.filter(t => t.status === 'resolved').length,
      closed: allTickets.filter(t => t.status === 'closed').length,
      avgResolutionTimeHours: 0,
      avgFirstResponseTimeHours: 0,
    };

    // Calculate average resolution time
    const resolvedTickets = allTickets.filter(t => t.resolvedAt);
    if (resolvedTickets.length > 0) {
      const totalResolutionTime = resolvedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.createdAt).getTime();
        const resolved = new Date(ticket.resolvedAt!).getTime();
        return sum + (resolved - created);
      }, 0);
      stats.avgResolutionTimeHours = Math.round(totalResolutionTime / resolvedTickets.length / (1000 * 60 * 60));
    }

    // Calculate average first response time
    const ticketsWithResponse = allTickets.filter(t => t.firstResponseAt);
    if (ticketsWithResponse.length > 0) {
      const totalResponseTime = ticketsWithResponse.reduce((sum, ticket) => {
        const created = new Date(ticket.createdAt).getTime();
        const responded = new Date(ticket.firstResponseAt!).getTime();
        return sum + (responded - created);
      }, 0);
      stats.avgFirstResponseTimeHours = Math.round(totalResponseTime / ticketsWithResponse.length / (1000 * 60 * 60));
    }

    return stats;
  } catch (error) {
    console.error('Error getting ticket stats:', error);
    throw error;
  }
};

/**
 * Subscribe to ticket updates in real-time
 */
export const subscribeToTicket = (
  ticketId: string,
  callback: (ticket: Ticket | null) => void
) => {
  const unsubscribe = onSnapshot(doc(db, 'tickets', ticketId), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as Ticket);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
};

/**
 * Subscribe to ticket messages in real-time
 */
export const subscribeToTicketMessages = (
  ticketId: string,
  callback: (messages: TicketMessage[]) => void
) => {
  const q = query(
    collection(db, 'ticketMessages'),
    where('ticketId', '==', ticketId),
    orderBy('createdAt', 'asc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => doc.data() as TicketMessage);
    callback(messages);
  });

  return unsubscribe;
};

/**
 * Close a ticket (user confirmed resolution)
 */
export const closeTicket = async (
  ticketId: string,
  performedBy: string,
  performedByType: 'user' | 'admin'
): Promise<void> => {
  try {
    await updateTicketStatus(ticketId, 'closed', performedBy, performedByType);
    console.log(`Ticket ${ticketId} closed by ${performedBy}`);
  } catch (error) {
    console.error('Error closing ticket:', error);
    throw error;
  }
};

/**
 * Reopen a closed ticket
 */
export const reopenTicket = async (
  ticketId: string,
  performedBy: string,
  performedByType: 'user' | 'admin'
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();

    await updateDoc(doc(db, 'tickets', ticketId), {
      status: 'under_review',
      closedAt: null,
      updatedAt: timestamp,
    });

    // Create audit log entry
    await createTicketAuditLog({
      ticketId,
      action: 'reopened',
      performedBy,
      performedByType,
      newValue: 'under_review',
    });

    console.log(`Ticket ${ticketId} reopened by ${performedBy}`);
  } catch (error) {
    console.error('Error reopening ticket:', error);
    throw error;
  }
};

/**
 * Get tickets by related entity (e.g., all disputes for a donation)
 */
export const getTicketsByRelatedEntity = async (
  entityId: string,
  entityType: string
): Promise<Ticket[]> => {
  try {
    const q = query(
      collection(db, 'tickets'),
      where('relatedEntityId', '==', entityId),
      where('relatedEntityType', '==', entityType),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Ticket);
  } catch (error) {
    console.error('Error getting tickets by related entity:', error);
    throw error;
  }
};

/**
 * Book a hospital donation for a donor
 */
export const bookHospitalDonation = async (
  donorId: string,
  bloodBankId: string,
  scheduledDate: string
): Promise<string> => {
  try {
    const timestamp = getCurrentTimestamp();
    const bookingDoc = {
      donorId,
      bloodBankId,
      scheduledDate,
      status: 'pending' as RequestStatus,
      type: 'hospital_donation',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const docRef = await addDoc(collection(db, 'bookings'), removeUndefinedFields(bookingDoc));
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  } catch (error) {
    console.error('Error booking hospital donation:', error);
    throw error;
  }
};

/**
 * Book blood from a bank for a requester
 */
export const bookBloodFromBank = async (
  requesterId: string,
  bloodBankId: string,
  bloodType: BloodType,
  units: number
): Promise<string> => {
  try {
    const timestamp = getCurrentTimestamp();
    const bookingDoc = {
      requesterId,
      bloodBankId,
      bloodType,
      units,
      status: 'pending' as RequestStatus,
      type: 'blood_booking',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const docRef = await addDoc(collection(db, 'bookings'), removeUndefinedFields(bookingDoc));
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  } catch (error) {
    console.error('Error booking blood from bank:', error);
    throw error;
  }
};

/**
 * Generic cancel action for bookings or requests
 */
export const cancelAction = async (
  actionId: string,
  collectionName: 'bookings' | 'bloodRequests' | 'acceptedRequests',
  reason: string
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    await updateDoc(doc(db, collectionName, actionId), {
      status: 'cancel',
      cancellationReason: reason,
      updatedAt: timestamp,
    });
  } catch (error) {
    console.error(`Error cancelling action in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get or create a chat between two participants
 */
let chatRegistryCache: any[] | null = null;
let lastRegistryFetch: number = 0;
const CACHE_TTL = 30000; // 30 seconds

export const getOrCreateChat = async (
  participant1Id: string,
  participant1Name: string,
  participant2Id: string,
  participant2Name: string,
  requestId?: string,
  referralId?: string,
  participantTypes?: { [key: string]: 'hospital' | 'user' },
  chatRole?: 'donor' | 'requester'
): Promise<string> => {
  try {
    // Guard against empty IDs
    if (!participant1Id || !participant2Id) {
      console.warn('[database] getOrCreateChat called with empty participant ID', { participant1Id, participant2Id });
      throw new Error('Invalid participant ID');
    }

    // Role-isolated chatId format: ID1___ID2___ROLE
    const sortedIds = [participant1Id, participant2Id].sort();
    const baseId = sortedIds.join('___');
    const chatId = chatRole ? `${baseId}___${chatRole}` : baseId;

    // 1. Direct lookup for deterministic ID (Fastest & most reliable)
    const directRef = doc(db, 'chats', chatId);
    const directSnap = await getDoc(directRef);

    if (directSnap.exists()) {
      const data = directSnap.data();
      // Ensure it matches optional filters if they are critical
      if ((!requestId || data.requestId === requestId) &&
        (!referralId || data.referralId === referralId)) {
        return directSnap.id;
      }
    }

    // 2. Search for existing chat (Legacy or multi-role support)
    // If we're looking for a specific role, we shouldn't fallback to a different role
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', participant1Id)
    );

    const snapshot = await getDocs(q);
    const existingChat = snapshot.docs.find(doc => {
      const data = doc.data();
      return doc.id !== 'undefined' && doc.id !== 'null' &&
        data.participants && data.participants.includes(participant2Id) &&
        (!requestId || data.requestId === requestId) &&
        (!referralId || data.referralId === referralId) &&
        (chatRole ? data.chatRole === chatRole : !data.chatRole); // Strict role matching
    });

    if (existingChat) {
      return existingChat.id;
    }

    // 3. Create new chat if not found
    const timestamp = serverTimestamp();
    const newChat = {
      id: chatId,
      participants: [participant1Id, participant2Id],
      participantNames: {
        [participant1Id]: participant1Name,
        [participant2Id]: participant2Name,
      },
      participantTypes: participantTypes || {},
      chatRole: chatRole || null,
      lastMessage: 'Chat started',
      lastMessageTime: timestamp,
      unreadCount: {
        [participant1Id]: 0,
        [participant2Id]: 0,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      requestId: requestId || null,
      referralId: referralId || null,
    };

    await setDoc(doc(db, 'chats', chatId), removeUndefinedFields(newChat));
    return chatId;
  } catch (error) {
    console.error('Error in getOrCreateChat:', error);
    throw error;
  }
};

/**
 * Patch participantTypes on an existing chat document
 * Used to backfill type info on legacy chats that were created before participantTypes was tracked
 */
export const patchChatParticipantTypes = async (
  chatId: string,
  participantId: string,
  participantType: 'hospital' | 'user'
): Promise<void> => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`participantTypes.${participantId}`]: participantType,
    });
    console.log(`[Database] Patched participantTypes for chat ${chatId}: ${participantId} => ${participantType}`);
  } catch (error) {
    console.error('[Database] Error patching participantTypes:', error);
  }
};

/**
 * Universal Chat Registry
 * Fetches both Blood Banks and Users (Donors/Requesters) for the new chat picker
 * Includes caching to avoid redundant fetches
 */
export const getChatRegistry = async (currentUserId: string, forceRefresh = false): Promise<{ id: string; name: string; type: 'hospital' | 'user'; bloodType?: BloodType; location?: string; }[]> => {
  const now = Date.now();
  if (!forceRefresh && chatRegistryCache && (now - lastRegistryFetch < CACHE_TTL)) {
    console.log('[Database] Returning cached chat registry');
    return chatRegistryCache;
  }

  try {
    console.log('[Database] Fetching fresh chat registry');
    const registry: any[] = [];

    // 1. Fetch Hospitals from users collection (Primary)
    const hospitalsPromise = getDocs(query(collection(db, 'users'), where('userType', '==', 'hospital')));
    const usersPromise = getDocs(query(collection(db, 'users'), where('userType', '!=', 'hospital'), where('isActive', '==', true)));
    // 2. Fetch Blood Banks from RTDB (Fallback/Legacy)
    const banksPromise = getBloodBanks();

    const [hospitalsSnap, usersSnap, banks] = await Promise.all([hospitalsPromise, usersPromise, banksPromise]);

    // Process Hospitals from Firestore
    hospitalsSnap.forEach(doc => {
      const data = doc.data();
      registry.push({
        id: doc.id,
        name: data.hospitalName || data.name || 'Unknown Hospital',
        type: 'hospital',
        location: data.location?.city || data.location?.address
      });
    });

    // Process Users from Firestore
    usersSnap.forEach(doc => {
      const data = doc.data() as User;
      if (data.id !== currentUserId) {
        registry.push({
          id: data.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email,
          type: 'user',
          bloodType: data.bloodType,
          location: data.location?.city || data.location?.address
        });
      }
    });

    // Add RTDB banks ONLY if not already present from Firestore
    const knownIds = new Set(registry.map(r => r.id));
    banks.forEach(bank => {
      if (!knownIds.has(bank.id)) {
        registry.push({
          id: bank.id,
          name: bank.name,
          type: 'hospital',
          location: bank.address
        });
      }
    });

    chatRegistryCache = registry;
    lastRegistryFetch = now;
    return registry;
  } catch (error) {
    console.error('Error fetching chat registry:', error);
    return chatRegistryCache || [];
  }
};

// ==================== DONOR BOOKING FUNCTIONS ====================

/**
 * Creates a new donor booking in Firestore
 */
export const createBooking = async (
  bookingData: Omit<DonorBooking, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    console.log('[Database] Creating booking for donor:', bookingData.donorId);

    const bookingsRef = collection(db, 'donorBookings');
    const bookingDoc = {
      ...bookingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Remove any undefined fields
    const cleanedData = removeUndefinedFields(bookingDoc);
    const docRef = await addDoc(bookingsRef, cleanedData);

    // Update doc with its own ID
    await updateDoc(docRef, { id: docRef.id });

    // 🏆 New: Notify the hospital
    try {
      await createNotification({
        userId: bookingData.hospitalId,
        type: 'system_alert',
        title: 'New Donation Appointment',
        message: `Donor ${bookingData.donorName} has booked a ${bookingData.bloodType} donation for ${bookingData.scheduledDate} at ${bookingData.scheduledTime}.`,
        data: { bookingId: docRef.id, hospitalId: bookingData.hospitalId },
        isRead: false,
        timestamp: getCurrentTimestamp()
      });
    } catch (notifErr) {
      console.warn('[Database] Failed to notify hospital of new booking:', notifErr);
    }

    console.log('[Database] Booking created successfully:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[Database] Error creating booking:', error);
    throw error;
  }
};

/**
 * Get all donor bookings for a specific donor
 */
export const getDonorBookings = async (donorId: string): Promise<DonorBooking[]> => {
  try {
    console.log('[Database] Fetching bookings for donor:', donorId);

    const q = query(
      collection(db, 'donorBookings'),
      where('donorId', '==', donorId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    const bookings = snapshot.docs.map(doc => {
      const data = doc.data();

      // Convert Firestore timestamps to ISO strings for consistent handling
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        scheduledDate: data.scheduledDate || '',
        scheduledTime: data.scheduledTime || '',
      } as DonorBooking;
    });

    console.log('[Database] Found bookings:', bookings.length);
    return bookings;
  } catch (error) {
    console.error('[Database] Error getting donor bookings:', error);
    return [];
  }
};

/**
 * Get donor bookings with real-time updates
 */
export const subscribeToDonorBookings = (
  donorId: string,
  callback: (bookings: DonorBooking[]) => void
) => {
  console.log('[Database] Subscribing to bookings for donor:', donorId);

  const q = query(
    collection(db, 'donorBookings'),
    where('donorId', '==', donorId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        scheduledDate: data.scheduledDate || '',
        scheduledTime: data.scheduledTime || '',
      } as DonorBooking;
    });
    callback(bookings);
  });
};

/**
 * Get a single donor booking by ID
 */
export const getDonorBookingById = async (bookingId: string): Promise<DonorBooking | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'donorBookings', bookingId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
      } as DonorBooking;
    }
    return null;
  } catch (error) {
    console.error('[Database] Error getting donor booking:', error);
    return null;
  }
};

/**
 * Update a donor booking status (used by admin verification)
 */
export const updateDonorBookingStatus = async (
  bookingId: string,
  status: string,
  extras?: { rejectionReason?: string; screeningNotes?: string; verifiedBy?: string; donationRecordId?: string }
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    const updates: any = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (status === 'confirmed') updates.confirmedAt = serverTimestamp();
    if (status === 'completed') updates.completedAt = serverTimestamp();
    if (status === 'confirmed' || status === 'completed') updates.verifiedAt = serverTimestamp();
    if (extras) Object.assign(updates, removeUndefinedFields(extras));

    await updateDoc(doc(db, 'donorBookings', bookingId), updates);

    // 🏆 New: Notify the donor of status updates
    try {
      const booking = await getDonorBookingById(bookingId);
      if (booking) {
        let title = '';
        let message = '';
        let type: NotificationType = 'system_alert';

        if (status === 'confirmed') {
          title = 'Booking Confirmed! ✅';
          message = `Your donation appointment at ${booking.hospitalName} for ${booking.scheduledDate} has been confirmed.`;
          type = 'booking_confirmed';
        } else if (status === 'completed') {
          title = 'Donation Completed! 🏆';
          message = `Thank you for donating blood at ${booking.hospitalName}. You've earned points for saving lives!`;
          type = 'booking_completed';
        } else if (status === 'rejected') {
          title = 'Booking Update';
          message = `Your appointment at ${booking.hospitalName} was not approved. ${extras?.rejectionReason ? `Reason: ${extras.rejectionReason}` : ''}`;
          type = 'booking_rejected';
        } else if (status === 'no_show') {
          title = 'Appointment Missed';
          message = `It seems you missed your appointment at ${booking.hospitalName}. You can re-book when available.`;
        } else if (status === 'deferred') {
          title = 'Donation Deferred';
          message = `Your donation was deferred at ${booking.hospitalName}. ${extras?.screeningNotes ? `Notes: ${extras.screeningNotes}` : ''}`;
        } else if (status === 'cancel') {
          // If user cancelled, notify hospital. If hospital cancelled, notify user.
          // For now, if status is 'cancel', we notify the hospital as per existing logic
          await createNotification({
            userId: booking.hospitalId,
            type: 'system_alert',
            title: 'Donation Booking Cancelled',
            message: `Donor ${booking.donorName} has cancelled their booking (ID: ${booking.bookingId}).`,
            data: { bookingId: booking.id, hospitalId: booking.hospitalId },
            isRead: false,
            timestamp: timestamp
          });
          return; // Skip the user notification for self-cancellation
        }

        if (title && message) {
          await createNotification({
            userId: booking.donorId,
            type,
            title,
            message,
            data: { bookingId: booking.id, status },
            isRead: false,
            timestamp: timestamp
          });
        }
      }
    } catch (notifyError) {
      console.error('[Database] Error sending donor booking notification:', notifyError);
    }

    console.log('[Database] Donor booking updated:', bookingId, status);
  } catch (error) {
    console.error('[Database] Error updating donor booking status:', error);
    throw error;
  }
};

/**
 * Permanently delete a donor booking
 */
export const deleteDonorBooking = async (bookingId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'donorBookings', bookingId));
    console.log('[Database] Donor booking deleted successfully:', bookingId);
  } catch (error) {
    console.error('[Database] Error deleting donor booking:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates on a donor booking
 */
export const subscribeToDonorBooking = (
  bookingId: string,
  callback: (booking: DonorBooking | null) => void
) => {
  return onSnapshot(doc(db, 'donorBookings', bookingId), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
      } as DonorBooking);
    } else {
      callback(null);
    }
  });
};

// ==================== RECIPIENT BOOKING FUNCTIONS ====================

/**
 * Creates a new recipient booking in Firestore
 */
export const createRecipientBooking = async (
  bookingData: Omit<RecipientBooking, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    console.log('[Database] Creating recipient booking for:', bookingData.requesterId);

    const bookingsRef = collection(db, 'recipientBookings');
    const bookingDoc = {
      ...bookingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const cleanedData = removeUndefinedFields(bookingDoc);
    const docRef = await addDoc(bookingsRef, cleanedData);
    await updateDoc(docRef, { id: docRef.id });

    // 🏆 New: Notify the hospital
    try {
      await createNotification({
        userId: bookingData.hospitalId,
        type: 'system_alert',
        title: 'New Transfusion Request',
        message: `A new transfusion booking for ${bookingData.bloodType} has been requested by ${bookingData.requesterName} for ${bookingData.scheduledDate}.`,
        data: { bookingId: docRef.id, hospitalId: bookingData.hospitalId },
        isRead: false,
        timestamp: getCurrentTimestamp()
      });
    } catch (notifErr) {
      console.warn('[Database] Failed to notify hospital of new recipient booking:', notifErr);
    }

    console.log('[Database] Recipient booking created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[Database] Error creating recipient booking:', error);
    throw error;
  }
};

/**
 * Get all recipient bookings for a specific requester
 */
export const getRecipientBookings = async (requesterId: string): Promise<RecipientBooking[]> => {
  try {
    const q = query(
      collection(db, 'recipientBookings'),
      where('requesterId', '==', requesterId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
      } as RecipientBooking;
    });
  } catch (error) {
    console.error('[Database] Error getting recipient bookings:', error);
    return [];
  }
};

/**
 * Subscribe to recipient bookings in real-time
 */
export const subscribeToRecipientBookings = (
  requesterId: string,
  callback: (bookings: RecipientBooking[]) => void
) => {
  const q = query(
    collection(db, 'recipientBookings'),
    where('requesterId', '==', requesterId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
      } as RecipientBooking;
    });
    callback(bookings);
  });
};

/**
 * Update a recipient booking status
 */
export const updateRecipientBookingStatus = async (
  bookingId: string,
  status: string,
  extras?: { rejectionReason?: string; verifiedBy?: string; donationRecordId?: string }
): Promise<void> => {
  try {
    const updates: any = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (status === 'confirmed') updates.confirmedAt = serverTimestamp();
    if (status === 'completed' || status === 'fulfilled') updates.completedAt = serverTimestamp();
    if (extras) Object.assign(updates, removeUndefinedFields(extras));

    await updateDoc(doc(db, 'recipientBookings', bookingId), updates);

    // 🏆 New: Notify the requester of status updates
    try {
      const bookingSnap = await getDoc(doc(db, 'recipientBookings', bookingId));
      if (bookingSnap.exists()) {
        const b = bookingSnap.data();
        let title = '';
        let message = '';
        let type: NotificationType = 'system_alert';

        if (status === 'confirmed') {
          title = 'Transfusion Confirmed ✅';
          message = `Your request for ${b.bloodType} at ${b.hospitalName} has been confirmed for ${b.scheduledDate}.`;
          type = 'booking_confirmed';
        } else if (status === 'processing') {
          title = 'Blood Prep in Progress ⏳';
          message = `${b.hospitalName} is preparing the blood units for your transfusion.`;
        } else if (status === 'ready') {
          title = 'Blood Ready for Transfusion! 🩸';
          message = `The requested blood is ready at ${b.hospitalName}. Please proceed as scheduled.`;
          type = 'booking_fulfilled';
        } else if (status === 'fulfilled' || status === 'completed') {
          title = 'Transfusion Completed! ✨';
          message = `Your transfusion process at ${b.hospitalName} has been marked as complete.`;
          type = 'booking_completed';
        } else if (status === 'rejected') {
          title = 'Request Not Approved';
          message = `Your transfusion request at ${b.hospitalName} was not approved. ${extras?.rejectionReason ? `Reason: ${extras.rejectionReason}` : ''}`;
          type = 'booking_rejected';
        } else if (status === 'cancel') {
          // Notify hospital of cancellation
          await createNotification({
            userId: b.hospitalId,
            type: 'system_alert',
            title: 'Transfusion Booking Cancelled',
            message: `Patient/Requester ${b.requesterName} has cancelled their booking (ID: ${b.bookingId}).`,
            data: { bookingId, hospitalId: b.hospitalId },
            isRead: false,
            timestamp: getCurrentTimestamp()
          });
          return;
        }

        if (title && message) {
          await createNotification({
            userId: b.requesterId,
            type,
            title,
            message,
            data: { bookingId, status },
            isRead: false,
            timestamp: getCurrentTimestamp()
          });
        }
      }
    } catch (notifyError) {
      console.error('[Database] Error sending recipient booking notification:', notifyError);
    }

    console.log('[Database] Recipient booking updated:', bookingId, status);
  } catch (error) {
    console.error('[Database] Error updating recipient booking status:', error);
    throw error;
  }
};

/**
 * Get all hospital referrals for a user (as patient)
 */
export const getHospitalReferrals = async (userId: string): Promise<HospitalReferral[]> => {
  try {
    const user = await getUser(userId);
    if (!user) return [];

    const fullName = `${user.firstName} ${user.lastName}`.trim();

    // Query for referrals matching patient name or other identifiers
    const q = query(
      collection(db, 'hospital_referrals'),
      where('patientName', 'in', [fullName, user.firstName, user.lastName, user.id, user.phoneNumber].filter(Boolean))
    );

    const snapshot = await getDocs(q);
    let list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as HospitalReferral));

    // Client-side filter for extra safety
    list = list.filter(ref =>
      ref.patientName === fullName ||
      (ref as any).userId === user.id ||
      (ref as any).patientPhone === user.phoneNumber
    );

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching hospital referrals:', error);
    throw error;
  }
};

/**
 * Update hospital referral status and trigger notification
 * Typically called by Admin, but added here for consistency and manual triggers
 */
export const updateHospitalReferralStatus = async (
  referralId: string,
  status: 'pending' | 'accepted' | 'declined' | 'completed',
  patientId: string
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    await updateDoc(doc(db, 'hospital_referrals', referralId), {
      status,
      updatedAt: timestamp,
    });

    // Trigger notification for the patient
    const referralSnap = await getDoc(doc(db, 'hospital_referrals', referralId));
    if (referralSnap.exists()) {
      const data = referralSnap.data() as HospitalReferral;
      let title = '';
      let message = '';

      if (status === 'accepted') {
        title = 'Referral Accepted 🏥';
        message = `${data.targetHospital} has accepted your referral from ${data.fromHospitalName}.`;
      } else if (status === 'completed') {
        title = 'Referral Completed ✅';
        message = `Your referral to ${data.targetHospital} has been marked as complete.`;
      } else if (status === 'declined') {
        title = 'Referral Not Accepted';
        message = `Your referral to ${data.targetHospital} could not be processed at this time.`;
      }

      if (title && message) {
        await createNotification({
          userId: patientId,
          type: 'system_alert',
          title,
          message,
          data: { referralId, status },
          isRead: false,
          timestamp: timestamp
        });
      }
    }
  } catch (error) {
    console.error('Error updating hospital referral status:', error);
    throw error;
  }
};
