/**
 * Offline Database Service
 * Offline-first wrapper around database.ts functions.
 * 
 * READ pattern:  Return cache immediately → fetch fresh if online → update cache
 * WRITE pattern: Update local cache → if online, write to Firebase → if offline, queue for sync
 * 
 * All function signatures match database.ts exactly so screens can swap imports.
 */

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
    DonorBooking,
    InterestedDonor,
    Location,
    NewDocument,
    Notification,
    Post,
    RecipientBooking,
    User,
    VerificationRequest,
} from '@/src/types/types';
import * as db from '../firebase/database';
import { isOnline } from './networkMonitor';
import * as offlineStorage from './offlineStorage';
import * as syncQueue from './syncQueue';

// ─── HELPERS ──────────────────────────────────────────────────────

/**
 * Offline-first read: returns cache immediately, fetches fresh in background if online.
 */
async function offlineFirstRead<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    fallback: T
): Promise<T> {
    // Try cache first
    const cached = await offlineStorage.getCollection<any>(cacheKey);

    if (isOnline()) {
        try {
            const fresh = await fetchFn();
            // Update cache in background
            if (Array.isArray(fresh)) {
                offlineStorage.saveCollection(cacheKey, fresh).catch(() => { });
            }
            return fresh;
        } catch (error) {
            console.warn(`[OfflineDB] Online fetch failed for ${cacheKey}, using cache:`, error);
            return (cached as unknown as T) ?? fallback;
        }
    }

    return (cached as unknown as T) ?? fallback;
}

/**
 * Offline-first single document read.
 */
async function offlineFirstDocRead<T>(
    collection: string,
    docId: string,
    fetchFn: () => Promise<T | null>
): Promise<T | null> {
    if (isOnline()) {
        try {
            const fresh = await fetchFn();
            if (fresh) {
                offlineStorage.saveDocument(collection, docId, fresh).catch(() => { });
            }
            return fresh;
        } catch (error) {
            console.warn(`[OfflineDB] Online doc fetch failed for ${collection}/${docId}, using cache`);
            return offlineStorage.getDocument<T>(collection, docId);
        }
    }
    return offlineStorage.getDocument<T>(collection, docId);
}

/**
 * Offline-first write: write to Firebase if online, queue if offline.
 * Always update local cache immediately.
 */
async function offlineFirstWrite(
    functionName: string,
    args: any[],
    cacheUpdate?: () => Promise<void>
): Promise<any> {
    // Update local cache immediately
    if (cacheUpdate) {
        await cacheUpdate();
    }

    if (isOnline()) {
        try {
            return await (db as any)[functionName](...args);
        } catch (error) {
            console.warn(`[OfflineDB] Online write failed for ${functionName}, queuing`);
            await syncQueue.enqueue({
                operation: 'create',
                collection: functionName,
                functionName,
                args,
            });
            return null;
        }
    }

    // Queue for sync
    await syncQueue.enqueue({
        operation: 'create',
        collection: functionName,
        functionName,
        args,
    });
    return null;
}

// ─── USER OPERATIONS ──────────────────────────────────────────────

export const createUser = async (userId: string, userData: NewDocument<User>): Promise<void> => {
    await offlineFirstWrite('createUser', [userId, userData], async () => {
        await offlineStorage.saveDocument('users', userId, { ...userData, id: userId });
    });
};

export const getUser = async (userId: string): Promise<User | null> => {
    return offlineFirstDocRead<User>('users', userId, () => db.getUser(userId));
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
    await offlineFirstWrite('updateUser', [userId, updates], async () => {
        const cached = await offlineStorage.getDocument<User>('users', userId);
        if (cached) {
            await offlineStorage.saveDocument('users', userId, { ...cached, ...updates });
        }
    });
};

export const markUserAsReviewed = async (userId: string): Promise<void> => {
    await updateUser(userId, { hasReviewed: true });
};

export const hasUserReviewed = async (userId: string): Promise<boolean> => {
    const user = await getUser(userId);
    return user?.hasReviewed || false;
};

export const updateDonorAvailability = async (donorId: string, isAvailable: boolean): Promise<void> => {
    await updateUser(donorId, { isAvailable });
};

export const getUsersByBloodType = async (bloodType: BloodType): Promise<Donor[]> => {
    const cacheKey = `donors_by_type_${bloodType}`;
    return offlineFirstRead<Donor[]>(cacheKey, () => db.getUsersByBloodType(bloodType), []);
};

// ─── BLOOD REQUEST OPERATIONS ─────────────────────────────────────

export const createBloodRequest = async (requestData: NewDocument<BloodRequest>): Promise<string> => {
    const tempId = offlineStorage.generateTempId();

    if (isOnline()) {
        try {
            const realId = await db.createBloodRequest(requestData);
            await offlineStorage.saveDocument('bloodRequests', realId, { ...requestData, id: realId });
            return realId;
        } catch (error) {
            console.warn('[OfflineDB] createBloodRequest online failed, queuing');
        }
    }

    // Save locally with temp ID
    await offlineStorage.saveDocument('bloodRequests', tempId, { ...requestData, id: tempId });
    await syncQueue.enqueue({
        operation: 'create',
        collection: 'bloodRequests',
        tempId,
        functionName: 'createBloodRequest',
        args: [requestData],
    });
    return tempId;
};

export const getBloodRequest = async (requestId: string): Promise<BloodRequest | null> => {
    return offlineFirstDocRead<BloodRequest>('bloodRequests', requestId, () => db.getBloodRequest(requestId));
};

export const updateBloodRequest = async (requestId: string, updates: Partial<BloodRequest>): Promise<void> => {
    await offlineFirstWrite('updateBloodRequest', [requestId, updates], async () => {
        const cached = await offlineStorage.getDocument<BloodRequest>('bloodRequests', requestId);
        if (cached) {
            await offlineStorage.saveDocument('bloodRequests', requestId, { ...cached, ...updates });
        }
    });
};

export const acceptBloodRequest = async (requestId: string, donorId: string, donorName: string): Promise<void> => {
    await offlineFirstWrite('acceptBloodRequest', [requestId, donorId, donorName], async () => {
        const cached = await offlineStorage.getDocument<BloodRequest>('bloodRequests', requestId);
        if (cached) {
            await offlineStorage.saveDocument('bloodRequests', requestId, {
                ...cached, status: 'accepted', acceptedDonorId: donorId, acceptedDonorName: donorName,
            });
        }
    });
};

export const completeBloodRequest = async (requestId: string): Promise<void> => {
    await offlineFirstWrite('completeBloodRequest', [requestId], async () => {
        const cached = await offlineStorage.getDocument<BloodRequest>('bloodRequests', requestId);
        if (cached) {
            await offlineStorage.saveDocument('bloodRequests', requestId, {
                ...cached, status: 'completed', completedAt: new Date().toISOString(),
            });
        }
    });
};

export const deleteBloodRequest = async (requestId: string): Promise<void> => {
    await offlineFirstWrite('deleteBloodRequest', [requestId], async () => {
        await offlineStorage.removeDocument('bloodRequests', requestId);
    });
};

export const getActiveBloodRequests = async (bloodType?: BloodType): Promise<BloodRequest[]> => {
    const cacheKey = `activeBloodRequests_${bloodType || 'ALL'}`;
    return offlineFirstRead<BloodRequest[]>(cacheKey, () => db.getActiveBloodRequests(bloodType), []);
};

export const getUserBloodRequests = async (userId: string): Promise<BloodRequest[]> => {
    const cacheKey = `userBloodRequests_${userId}`;
    return offlineFirstRead<BloodRequest[]>(cacheKey, () => db.getUserBloodRequests(userId), []);
};

// ─── ACCEPTED REQUEST OPERATIONS ──────────────────────────────────

export const createAcceptedRequest = async (
    donorId: string, donorName: string, request: BloodRequest, chatId: string
): Promise<string> => {
    const tempId = offlineStorage.generateTempId();

    if (isOnline()) {
        try {
            return await db.createAcceptedRequest(donorId, donorName, request, chatId);
        } catch (error) {
            console.warn('[OfflineDB] createAcceptedRequest online failed, queuing');
        }
    }

    await syncQueue.enqueue({
        operation: 'create',
        collection: 'acceptedRequests',
        tempId,
        functionName: 'createAcceptedRequest',
        args: [donorId, donorName, request, chatId],
    });
    return tempId;
};

export const getDonorAcceptedRequests = async (
    donorId: string, status?: AcceptedRequestStatus
): Promise<AcceptedRequest[]> => {
    const cacheKey = `donorAcceptedRequests_${donorId}_${status || 'ALL'}`;
    return offlineFirstRead<AcceptedRequest[]>(cacheKey, () => db.getDonorAcceptedRequests(donorId, status), []);
};

export const getDonorActiveCommitments = async (donorId: string): Promise<AcceptedRequest[]> => {
    const cacheKey = `donorActiveCommitments_${donorId}`;
    return offlineFirstRead<AcceptedRequest[]>(cacheKey, () => db.getDonorActiveCommitments(donorId), []);
};

export const updateAcceptedRequest = async (
    acceptedRequestId: string, updates: Partial<AcceptedRequest>
): Promise<void> => {
    await offlineFirstWrite('updateAcceptedRequest', [acceptedRequestId, updates]);
};

export const startAcceptedRequest = async (acceptedRequestId: string, scheduledDate?: string): Promise<void> => {
    await offlineFirstWrite('startAcceptedRequest', [acceptedRequestId, scheduledDate]);
};

export const completeAcceptedRequest = async (acceptedRequestId: string, donationRecordId: string): Promise<void> => {
    await offlineFirstWrite('completeAcceptedRequest', [acceptedRequestId, donationRecordId]);
};

export const cancelAcceptedRequest = async (acceptedRequestId: string, reason: string): Promise<void> => {
    await offlineFirstWrite('cancelAcceptedRequest', [acceptedRequestId, reason]);
};

export const getAcceptedRequest = async (acceptedRequestId: string): Promise<AcceptedRequest | null> => {
    return offlineFirstDocRead<AcceptedRequest>('acceptedRequests', acceptedRequestId, () => db.getAcceptedRequest(acceptedRequestId));
};

// ─── BLOOD REQUEST REJECTION OPERATIONS ───────────────────────────

export const createRejectedRequest = async (donorId: string, requestId: string, reason?: string): Promise<void> => {
    await offlineFirstWrite('createRejectedRequest', [donorId, requestId, reason]);
};

export const getDonorRejectedRequests = async (donorId: string): Promise<string[]> => {
    const cacheKey = `donorRejectedRequests_${donorId}`;
    return offlineFirstRead<string[]>(cacheKey, () => db.getDonorRejectedRequests(donorId), []);
};

export const hasRejectedRequest = async (donorId: string, requestId: string): Promise<boolean> => {
    if (isOnline()) {
        try {
            return await db.hasRejectedRequest(donorId, requestId);
        } catch {
            // Fallback to cache
        }
    }
    const rejected = await offlineStorage.getCollection<string>(`donorRejectedRequests_${donorId}`);
    return rejected?.includes(requestId) || false;
};

export const getActiveBloodRequestsForDonor = async (donorId: string, bloodType?: string): Promise<BloodRequest[]> => {
    const cacheKey = `activeRequestsForDonor_${donorId}_${bloodType || 'ALL'}`;
    return offlineFirstRead<BloodRequest[]>(cacheKey, () => db.getActiveBloodRequestsForDonor(donorId, bloodType), []);
};

// ─── BLOOD BANK OPERATIONS ────────────────────────────────────────

export const getBloodBanks = async (): Promise<BloodBank[]> => {
    return offlineFirstRead<BloodBank[]>('bloodBanks', () => db.getBloodBanks(), []);
};

export const getBloodBankById = async (bloodBankId: string): Promise<BloodBank | null> => {
    return offlineFirstDocRead<BloodBank>('bloodBanks', bloodBankId, () => db.getBloodBankById(bloodBankId));
};

export const searchBloodBanksByType = async (bloodType: BloodType, userLocation?: Location): Promise<BloodBank[]> => {
    const cacheKey = `bloodBanksByType_${bloodType}`;
    return offlineFirstRead<BloodBank[]>(cacheKey, () => db.searchBloodBanksByType(bloodType, userLocation), []);
};

// ─── CHAT OPERATIONS ──────────────────────────────────────────────

export const createChat = async (
    participant1Id: string, participant1Name: string,
    participant2Id: string, participant2Name: string,
    requestId?: string, chatRole?: 'donor' | 'requester'
): Promise<string> => {
    if (isOnline()) {
        try {
            const chatId = await db.createChat(participant1Id, participant1Name, participant2Id, participant2Name, requestId, chatRole);
            return chatId;
        } catch (error) {
            console.warn('[OfflineDB] createChat online failed');
        }
    }

    const tempId = offlineStorage.generateTempId();
    await syncQueue.enqueue({
        operation: 'create',
        collection: 'chats',
        tempId,
        functionName: 'createChat',
        args: [participant1Id, participant1Name, participant2Id, participant2Name, requestId, chatRole],
    });
    return tempId;
};

export const sendMessage = async (
    chatId: string, senderId: string, senderName: string,
    receiverId: string, message: string, referralId?: string
): Promise<void> => {
    await offlineFirstWrite('sendMessage', [chatId, senderId, senderName, receiverId, message, referralId]);
};

export const getUserChats = async (userId: string, role?: 'donor' | 'requester'): Promise<Chat[]> => {
    const cacheKey = `userChats_${userId}_${role || 'ALL'}`;
    return offlineFirstRead<Chat[]>(cacheKey, () => db.getUserChats(userId, role), []);
};

export const getChatMessages = async (chatId: string): Promise<ChatMessage[]> => {
    const cacheKey = `chatMessages_${chatId}`;
    return offlineFirstRead<ChatMessage[]>(cacheKey, () => db.getChatMessages(chatId), []);
};

export const getChatById = async (chatId: string): Promise<Chat | null> => {
    return offlineFirstDocRead<Chat>('chats', chatId, () => db.getChatById(chatId));
};

export const deleteChat = async (chatId: string): Promise<void> => {
    await offlineFirstWrite('deleteChat', [chatId]);
};

export const markMessagesAsRead = async (chatId: string, userId: string): Promise<void> => {
    await offlineFirstWrite('markMessagesAsRead', [chatId, userId]);
};

export const getChatByRequestId = async (requestId: string, donorId: string, requesterId: string): Promise<Chat | null> => {
    if (isOnline()) {
        try {
            return await db.getChatByRequestId(requestId, donorId, requesterId);
        } catch {
            return null;
        }
    }
    return null; // Can't query complex Firestore queries from cache
};

// ─── NOTIFICATION OPERATIONS ──────────────────────────────────────

export const createNotification = async (notificationData: NewDocument<Notification>): Promise<void> => {
    await offlineFirstWrite('createNotification', [notificationData]);
};

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
    const cacheKey = `userNotifications_${userId}`;
    return offlineFirstRead<Notification[]>(cacheKey, () => db.getUserNotifications(userId), []);
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    await offlineFirstWrite('markNotificationAsRead', [notificationId]);
};

// ─── DONATION RECORD OPERATIONS ───────────────────────────────────

export const createDonationRecord = async (donationData: NewDocument<DonationRecord>): Promise<string> => {
    const tempId = offlineStorage.generateTempId();

    if (isOnline()) {
        try {
            return await db.createDonationRecord(donationData);
        } catch (error) {
            console.warn('[OfflineDB] createDonationRecord online failed, queuing');
        }
    }

    await syncQueue.enqueue({
        operation: 'create',
        collection: 'donationRecords',
        tempId,
        functionName: 'createDonationRecord',
        args: [donationData],
    });
    return tempId;
};

export const getDonorHistory = async (donorId: string): Promise<DonationRecord[]> => {
    const cacheKey = `donorHistory_${donorId}`;
    return offlineFirstRead<DonationRecord[]>(cacheKey, () => db.getDonorHistory(donorId), []);
};

// ─── POST/FEED OPERATIONS ─────────────────────────────────────────

export const createPost = async (postData: NewDocument<Post>): Promise<string> => {
    const tempId = offlineStorage.generateTempId();

    if (isOnline()) {
        try {
            return await db.createPost(postData);
        } catch (error) {
            console.warn('[OfflineDB] createPost online failed, queuing');
        }
    }

    await syncQueue.enqueue({
        operation: 'create',
        collection: 'posts',
        tempId,
        functionName: 'createPost',
        args: [postData],
    });
    return tempId;
};

export const getPosts = async (limitCount: number = 20): Promise<Post[]> => {
    return offlineFirstRead<Post[]>('posts', () => db.getPosts(limitCount), []);
};

// ─── REAL-TIME LISTENERS ──────────────────────────────────────────
// These pass through to the original database.ts since they need
// Firebase onSnapshot. They naturally work offline via Firestore's
// built-in persistent cache.

export const subscribeToBloodRequests = db.subscribeToBloodRequests;
export const subscribeToChatMessages = db.subscribeToChatMessages;
export const subscribeToUserChats = db.subscribeToUserChats;

// ─── DONATION VERIFICATION OPERATIONS ─────────────────────────────

export const markDonationPendingVerification = async (acceptedRequestId: string, donorNotes?: string): Promise<void> => {
    await offlineFirstWrite('markDonationPendingVerification', [acceptedRequestId, donorNotes]);
};

export const getRequesterPendingVerifications = async (requesterId: string): Promise<AcceptedRequest[]> => {
    const cacheKey = `requesterPendingVerifications_${requesterId}`;
    return offlineFirstRead<AcceptedRequest[]>(cacheKey, () => db.getRequesterPendingVerifications(requesterId), []);
};

export const verifyDonationByRequester = async (acceptedRequestId: string, verificationNotes?: string): Promise<void> => {
    await offlineFirstWrite('verifyDonationByRequester', [acceptedRequestId, verificationNotes]);
};

export const disputeDonationByRequester = async (acceptedRequestId: string, disputeReason: string): Promise<void> => {
    await offlineFirstWrite('disputeDonationByRequester', [acceptedRequestId, disputeReason]);
};

export const completeDonationAfterVerification = async (
    acceptedRequest: AcceptedRequest, donorId: string, donorName: string
): Promise<string> => {
    if (isOnline()) {
        try {
            return await db.completeDonationAfterVerification(acceptedRequest, donorId, donorName);
        } catch (error) {
            console.warn('[OfflineDB] completeDonationAfterVerification failed, queuing');
        }
    }

    const tempId = offlineStorage.generateTempId();
    await syncQueue.enqueue({
        operation: 'create',
        collection: 'donationRecords',
        tempId,
        functionName: 'completeDonationAfterVerification',
        args: [acceptedRequest, donorId, donorName],
    });
    return tempId;
};

// ─── INTERESTED DONORS OPERATIONS ─────────────────────────────────

export const expressInterestInRequest = async (
    donorId: string, donorName: string, donorPhone: string,
    donorBloodType: BloodType, request: BloodRequest, message?: string
): Promise<string> => {
    if (isOnline()) {
        try {
            return await db.expressInterestInRequest(donorId, donorName, donorPhone, donorBloodType, request, message);
        } catch (error) {
            console.warn('[OfflineDB] expressInterestInRequest failed, queuing');
        }
    }

    const tempId = offlineStorage.generateTempId();
    await syncQueue.enqueue({
        operation: 'create',
        collection: 'interestedDonors',
        tempId,
        functionName: 'expressInterestInRequest',
        args: [donorId, donorName, donorPhone, donorBloodType, request, message],
    });
    return tempId;
};

export const getInterestedDonorsForRequest = async (requestId: string): Promise<InterestedDonor[]> => {
    const cacheKey = `interestedDonors_${requestId}`;
    return offlineFirstRead<InterestedDonor[]>(cacheKey, () => db.getInterestedDonorsForRequest(requestId), []);
};

export const hasExpressedInterest = async (donorId: string, requestId: string): Promise<boolean> => {
    if (isOnline()) {
        try {
            return await db.hasExpressedInterest(donorId, requestId);
        } catch { /* fallback */ }
    }
    return false;
};

export const selectDonorForRequest = async (
    requestId: string,
    selectedDonorId: string,
    selectedDonorName: string,
    requesterId: string,
    requesterName: string
): Promise<string> => {
    if (isOnline()) {
        try {
            return await db.selectDonorForRequest(requestId, selectedDonorId, selectedDonorName, requesterId, requesterName);
        } catch (error) {
            console.warn('[OfflineDB] selectDonorForRequest failed, queuing');
        }
    }

    const tempId = offlineStorage.generateTempId();
    await syncQueue.enqueue({
        operation: 'create',
        collection: 'selectDonor',
        tempId,
        functionName: 'selectDonorForRequest',
        args: [requestId, selectedDonorId, selectedDonorName, requesterId, requesterName],
    });
    return tempId;
};

// ─── REVIEW OPERATIONS ────────────────────────────────────────────

export const addReview = async (reviewData: any): Promise<string> => {
    if (isOnline()) {
        try {
            return await db.addReview(reviewData);
        } catch (error) {
            console.warn('[OfflineDB] addReview failed, queuing');
        }
    }

    const tempId = offlineStorage.generateTempId();
    await syncQueue.enqueue({
        operation: 'create',
        collection: 'reviews',
        tempId,
        functionName: 'addReview',
        args: [reviewData],
    });
    return tempId;
};

export const getApprovedReviews = async (limitCount: number = 20): Promise<any[]> => {
    return offlineFirstRead<any[]>('approvedReviews', () => db.getApprovedReviews(limitCount), []);
};

export const getUserReviews = async (userId: string): Promise<any[]> => {
    const cacheKey = `userReviews_${userId}`;
    return offlineFirstRead<any[]>(cacheKey, () => db.getUserReviews(userId), []);
};

export const subscribeToApprovedReviews = db.subscribeToApprovedReviews;

// ─── VERIFICATION OPERATIONS ──────────────────────────────────────

export const submitVerificationRequest = async (
    userId: string, data: Omit<VerificationRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> => {
    await offlineFirstWrite('submitVerificationRequest', [userId, data]);
};

export const getVerificationRequest = async (userId: string): Promise<VerificationRequest | null> => {
    return offlineFirstDocRead<VerificationRequest>('verificationRequests', userId, () => db.getVerificationRequest(userId));
};

// ─── BOOKINGS & TICKETS OPERATIONS ────────────────────────────────

export const createBooking = async (
    bookingData: Omit<DonorBooking, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
    const tempId = offlineStorage.generateTempId();

    if (isOnline()) {
        try {
            return await db.createBooking(bookingData);
        } catch (error) {
            console.warn('[OfflineDB] createBooking failed, queuing');
        }
    }

    await syncQueue.enqueue({
        operation: 'create',
        collection: 'donorBookings',
        tempId,
        functionName: 'createBooking',
        args: [bookingData],
    });
    return tempId;
};

export const getDonorBookings = async (donorId: string): Promise<DonorBooking[]> => {
    const cacheKey = `donorBookings_${donorId}`;
    return offlineFirstRead<DonorBooking[]>(cacheKey, () => db.getDonorBookings(donorId), []);
};

export const getDonorBookingById = async (bookingId: string): Promise<DonorBooking | null> => {
    return offlineFirstDocRead<DonorBooking>('donorBookings', bookingId, () => db.getDonorBookingById(bookingId));
};

export const updateDonorBookingStatus = async (bookingId: string, status: string): Promise<void> => {
    await offlineFirstWrite('updateDonorBookingStatus', [bookingId, status]);
};

export const deleteDonorBooking = async (bookingId: string): Promise<void> => {
    await offlineFirstWrite('deleteDonorBooking', [bookingId]);
};

export const subscribeToDonorBooking = db.subscribeToDonorBooking;

export const createRecipientBooking = async (
    bookingData: Omit<RecipientBooking, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
    const tempId = offlineStorage.generateTempId();

    if (isOnline()) {
        try {
            return await db.createRecipientBooking(bookingData);
        } catch (error) {
            console.warn('[OfflineDB] createRecipientBooking failed, queuing');
        }
    }

    await syncQueue.enqueue({
        operation: 'create',
        collection: 'recipientBookings',
        tempId,
        functionName: 'createRecipientBooking',
        args: [bookingData],
    });
    return tempId;
};

export const getRecipientBookings = async (requesterId: string): Promise<RecipientBooking[]> => {
    const cacheKey = `recipientBookings_${requesterId}`;
    return offlineFirstRead<RecipientBooking[]>(cacheKey, () => db.getRecipientBookings(requesterId), []);
};

export const updateRecipientBookingStatus = async (bookingId: string, status: string): Promise<void> => {
    await offlineFirstWrite('updateRecipientBookingStatus', [bookingId, status]);
};

export const createTicket = async (userId: string, userName: string, userEmail: string, userPhone: string | undefined, formData: import('@/src/types/types').CreateTicketFormData): Promise<string> => {
    const tempId = offlineStorage.generateTempId();

    if (isOnline()) {
        try {
            return await db.createTicket(userId, userName, userEmail, userPhone, formData);
        } catch (error) {
            console.warn('[OfflineDB] createTicket failed, queuing');
        }
    }

    await syncQueue.enqueue({
        operation: 'create',
        collection: 'tickets',
        tempId,
        functionName: 'createTicket',
        args: [userId, userName, userEmail, userPhone, formData],
    });
    return tempId;
};

export const getUserTickets = async (userId: string): Promise<import('@/src/types/types').Ticket[]> => {
    const cacheKey = `userTickets_${userId}`;
    return offlineFirstRead<import('@/src/types/types').Ticket[]>(cacheKey, () => db.getUserTickets(userId), []);
};

export const getTicketIdByRelatedEntity = async (relatedEntityId: string, relatedEntityType: string): Promise<string | null> => {
    if (isOnline()) {
        try {
            return await db.getTicketIdByRelatedEntity(relatedEntityId, relatedEntityType);
        } catch {
            return null;
        }
    }
    return null;
};

export const getOrCreateChat = async (participant1Id: string, participant1Name: string, participant2Id: string, participant2Name: string, requestId?: string, chatRole?: 'donor' | 'requester'): Promise<string> => {
    if (isOnline()) {
        try {
            return await db.getOrCreateChat(participant1Id, participant1Name, participant2Id, participant2Name, requestId, chatRole);
        } catch {
            // Create new chat locally if offline
            return await createChat(participant1Id, participant1Name, participant2Id, participant2Name, requestId, chatRole);
        }
    }
    return await createChat(participant1Id, participant1Name, participant2Id, participant2Name, requestId, chatRole);
};

// ─── RE-EXPORT PURE FUNCTIONS ─────────────────────────────────────
// These don't need offline wrapping as they're pure computation.

export {
    calculateDistance, deleteUserCollections, getCompatibleDonorBloodTypes,
    getCompatibleRecipientBloodTypes
} from '../firebase/database';

// ─── RE-EXPORT COUNT FUNCTIONS ────────────────────────────────────
// These return 0 when offline as they need live data for accuracy.

export const countAvailableCompatibleDonors = async (
    recipientBloodType: BloodType, location?: Location
): Promise<number> => {
    if (isOnline()) {
        try {
            return await db.countAvailableCompatibleDonors(recipientBloodType, location);
        } catch { /* fallback */ }
    }
    return 0;
};

export const countActiveCompatibleRequests = async (
    donorBloodType: BloodType, location?: Location
): Promise<number> => {
    if (isOnline()) {
        try {
            return await db.countActiveCompatibleRequests(donorBloodType, location);
        } catch { /* fallback */ }
    }
    return 0;
};
