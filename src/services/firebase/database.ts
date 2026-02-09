import {
  AcceptedRequest,
  AcceptedRequestStatus,
  BloodBank,
  BloodRequest,
  BloodType,
  Chat,
  ChatMessage,
  DonationRecord,
  Donor,
  Location,
  NewDocument,
  Notification,
  Post,
  User
} from '@/src/types/types';
import { get, ref } from 'firebase/database';
import {
  addDoc,
  collection,
  doc,
  GeoPoint,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryConstraint,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db, realtimeDb } from './firebase';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
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

// ============================================================================
// USER OPERATIONS
// ============================================================================

export const createUser = async (userId: string, userData: NewDocument<User>): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    
    const userDataWithDefaults = {
      ...userData,
      id: userId,
      isActive: true,
      points: 0,
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
  try {
    const q = query(
      collection(db, 'users'),
      where('bloodType', '==', bloodType),
      where('userType', '==', 'donor'),
      where('isAvailable', '==', true),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Donor);
  } catch (error) {
    console.error('Error getting users by blood type:', error);
    throw error;
  }
};

// ============================================================================
// BLOOD REQUEST OPERATIONS
// ============================================================================

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

export const getActiveBloodRequests = async (bloodType?: BloodType): Promise<BloodRequest[]> => {
  try {
    const constraints: QueryConstraint[] = [
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
    ];

    if (bloodType) {
      constraints.unshift(where('bloodType', '==', bloodType));
    }

    const q = query(collection(db, 'bloodRequests'), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as BloodRequest);
  } catch (error) {
    console.error('Error getting active blood requests:', error);
    throw error;
  }
};

export const getUserBloodRequests = async (userId: string): Promise<BloodRequest[]> => {
  try {
    const q = query(
      collection(db, 'bloodRequests'),
      where('requesterId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as BloodRequest);
  } catch (error) {
    console.error('Error getting user blood requests:', error);
    throw error;
  }
};

// ============================================================================
// ACCEPTED REQUEST OPERATIONS (NEW)
// ============================================================================

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
      status: 'cancelled',
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

// ============================================================================
// BLOOD REQUEST REJECTION OPERATIONS (NEW)
// ============================================================================

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
 */
export const getActiveBloodRequestsForDonor = async (
  donorId: string,
  bloodType?: string
): Promise<BloodRequest[]> => {
  try {
    // Get all active requests
    const constraints: any[] = [
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
    ];

    if (bloodType) {
      constraints.unshift(where('bloodType', '==', bloodType));
    }

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

// ============================================================================
// BLOOD BANK OPERATIONS - REALTIME DATABASE
// ============================================================================

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
        bloodBanks.push({
          id: key,
          name: bank.name,
          address: bank.address || '',
          location: {
            latitude: bank.location.latitude,
            longitude: bank.location.longitude,
            address: bank.location.address,
            city: bank.location.city,
            region: bank.location.region,
          },
          phoneNumber: bank.phoneNumber || '',
          email: bank.email || '',
          operatingHours: bank.operatingHours || { open: '08:00', close: '17:00' },
          inventory: bank.inventory || {},
          isVerified: bank.isVerified || false,
          rating: bank.rating,
          createdAt: bank.createdAt || new Date().toISOString(),
          updatedAt: bank.updatedAt || new Date().toISOString(),
        });
      }
    });
    
    console.log(`✅ Fetched ${bloodBanks.length} blood banks from Realtime Database`);
    return bloodBanks;
  } catch (error) {
    console.error('❌ Error getting blood banks from Realtime Database:', error);
    throw error;
  }
};

export const getBloodBankById = async (bloodBankId: string): Promise<BloodBank | null> => {
  try {
    const bloodBankRef = ref(realtimeDb, `bloodBanks/${bloodBankId}`);
    const snapshot = await get(bloodBankRef);
    
    if (!snapshot.exists()) {
      console.log('Blood bank not found:', bloodBankId);
      return null;
    }
    
    const bank = snapshot.val();
    return {
      id: bloodBankId,
      name: bank.name,
      address: bank.address || '',
      location: {
        latitude: bank.location.latitude,
        longitude: bank.location.longitude,
        address: bank.location.address,
        city: bank.location.city,
        region: bank.location.region,
      },
      phoneNumber: bank.phoneNumber || '',
      email: bank.email || '',
      operatingHours: bank.operatingHours || { open: '08:00', close: '17:00' },
      inventory: bank.inventory || {},
      isVerified: bank.isVerified || false,
      rating: bank.rating,
      createdAt: bank.createdAt || new Date().toISOString(),
      updatedAt: bank.updatedAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting blood bank by ID:', error);
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

// ============================================================================
// CHAT OPERATIONS
// ============================================================================

export const createChat = async (
  participant1Id: string,
  participant1Name: string,
  participant2Id: string,
  participant2Name: string,
  requestId?: string
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
  message: string
): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    const messageId = `${chatId}_${Date.now()}`;

    const messageDoc: ChatMessage = {
      id: messageId,
      chatId,
      senderId,
      senderName,
      receiverId,
      message,
      timestamp,
      isRead: false,
      type: 'text',
    };

    const cleanedMessageDoc = removeUndefinedFields(messageDoc);

    await setDoc(doc(db, 'messages', messageId), cleanedMessageDoc);

    // Update chat's last message
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      const chatData = chatSnap.data() as Chat;
      await updateDoc(chatRef, {
        lastMessage: message,
        lastMessageTime: timestamp,
        updatedAt: timestamp,
        [`unreadCount.${receiverId}`]: (chatData.unreadCount[receiverId] || 0) + 1,
      });
    }

    console.log('Message sent:', messageId);
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getUserChats = async (userId: string): Promise<Chat[]> => {
  try {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Chat);
  } catch (error) {
    console.error('Error getting user chats:', error);
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
    return snapshot.docs.map((doc) => doc.data() as ChatMessage);
  } catch (error) {
    console.error('Error getting chat messages:', error);
    throw error;
  }
};

// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================

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

// ============================================================================
// DONATION RECORD OPERATIONS
// ============================================================================

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
  try {
    const q = query(
      collection(db, 'donations'),
      where('donorId', '==', donorId),
      orderBy('donationDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as DonationRecord);
  } catch (error) {
    console.error('Error getting donor history:', error);
    throw error;
  }
};

// ============================================================================
// POST/FEED OPERATIONS
// ============================================================================

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

// ============================================================================
// REAL-TIME LISTENERS
// ============================================================================

export const subscribeToBloodRequests = (
  bloodType: BloodType,
  callback: (requests: BloodRequest[]) => void
) => {
  const q = query(
    collection(db, 'bloodRequests'),
    where('bloodType', '==', bloodType),
    where('status', '==', 'pending'),
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
    const messages = snapshot.docs.map((doc) => doc.data() as ChatMessage);
    callback(messages);
  });
};

// ============================================================================
// TWO-PARTY VERIFICATION OPERATIONS (NEW)
// ============================================================================

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
      pointsEarned: 50, // Adjust based on your points system
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

// Add these functions to your existing database file

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  chatId: string,
  userId: string
): Promise<void> => {
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
    await updateDoc(chatRef, {
      [`unreadCount.${userId}`]: 0
    });
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