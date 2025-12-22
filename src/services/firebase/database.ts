import {
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
import { db } from './firebase';

// Helper Functions 

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

//  User Operations 

export const createUser = async (userId: string, userData: NewDocument<User>): Promise<void> => {
  try {
    const timestamp = getCurrentTimestamp();
    
    // Filter out undefined values
    const cleanedUserData = Object.entries({
      ...userData,
      id: userId,
      isActive: true,
      points: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    }).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

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
    await updateDoc(doc(db, 'users', userId), {
      ...updates,
      updatedAt: timestamp,
    });
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

// Blood Request Operations 

export const createBloodRequest = async (
  requestData: NewDocument<BloodRequest>
): Promise<string> => {
  try {
    const timestamp = getCurrentTimestamp();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const requestDoc = {
      ...requestData,
      status: 'pending' as const,
      createdAt: timestamp,
      expiresAt,
    };

    const docRef = await addDoc(collection(db, 'bloodRequests'), requestDoc);
    await updateDoc(docRef, { id: docRef.id });
    
    console.log('Blood request created:', docRef.id);
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
    await updateDoc(doc(db, 'bloodRequests', requestId), updates);
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

// Blood Bank Operations 

export const getBloodBanks = async (): Promise<BloodBank[]> => {
  try {
    const q = query(
      collection(db, 'bloodBanks'),
      where('isVerified', '==', true),
      orderBy('name')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as BloodBank);
  } catch (error) {
    console.error('Error getting blood banks:', error);
    throw error;
  }
};

export const getBloodBankById = async (bloodBankId: string): Promise<BloodBank | null> => {
  try {
    const bloodBankDoc = await getDoc(doc(db, 'bloodBanks', bloodBankId));
    if (bloodBankDoc.exists()) {
      return bloodBankDoc.data() as BloodBank;
    }
    return null;
  } catch (error) {
    console.error('Error getting blood bank:', error);
    throw error;
  }
};

export const searchBloodBanksByType = async (
  bloodType: BloodType,
  userLocation?: Location
): Promise<BloodBank[]> => {
  try {
    const allBloodBanks = await getBloodBanks();
    
    // Filter blood banks that have the required blood type in stock
    let filteredBanks = allBloodBanks.filter((bank) => {
      const inventory = bank.inventory[bloodType];
      return inventory && inventory.units > 0;
    });

    // If user location is provided, sort by distance
    if (userLocation) {
      filteredBanks = filteredBanks.map((bank) => ({
        ...bank,
        distance: calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          bank.location.latitude,
          bank.location.longitude
        ),
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return filteredBanks;
  } catch (error) {
    console.error('Error searching blood banks:', error);
    throw error;
  }
};

//  Chat Operations 

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

    const chatDoc: Chat = {
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
      requestId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await setDoc(doc(db, 'chats', chatId), chatDoc);
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

    await setDoc(doc(db, 'messages', messageId), messageDoc);

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

// Notification Operations 

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

    await setDoc(doc(db, 'notifications', notificationId), notificationDoc);
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

//  Donation Record Operations 

export const createDonationRecord = async (
  donationData: NewDocument<DonationRecord>
): Promise<string> => {
  try {
    const timestamp = getCurrentTimestamp();
    const donationDoc = {
      ...donationData,
      createdAt: timestamp,
    };

    const docRef = await addDoc(collection(db, 'donations'), donationDoc);
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

//Post/Feed Operations 

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

    const docRef = await addDoc(collection(db, 'posts'), postDoc);
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

// Real-time Listeners 

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