import { db } from '@/src/services/firebase/firebase';
import {
    collection,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore';

export const COLLECTIONS = {
  USERS: 'users',
  VERIFICATION_REQUESTS: 'verification_requests',
  BLOOD_REQUESTS: 'bloodRequests',
  ACCEPTED_REQUESTS: 'acceptedRequests',
  INTERESTED_DONORS: 'interestedDonors',
  REJECTED_REQUESTS: 'rejectedRequests',
  CHATS: 'chats',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  DONATIONS: 'donations',
  REVIEWS: 'reviews',
  POSTS: 'posts',
};

export const DONOR_VERIFICATION_STRUCTURE = {
  id: '',
  userId: '',
  userType: 'donor',
  nationalIdPhotoUrl: '',
  selfiePhotoUrl: '',
  donorCardPhotoUrl: null,
  bloodTestReportUrl: null,
  medicalDeclarationAccepted: false,
  donorQuestionnaire: {
    ageConfirmed: false,
    weightValue: 0,
    noFeverOrInfection: false,
    noCurrentMedication: false,
    noChronicDisease: false,
    noRecentTattoo: false,
    noRecentSurgery: false,
    noRecentVaccination: false,
    noHIVHepatitis: false,
    noRecentMalaria: false,
    hasInfectiousDiseases: false,
    lastDonationDate: null,
    consentText: '',
  },
  informedConsentAccepted: false,
  status: 'pending',
  adminNotes: null,
  submittedAt: '',
  reviewedAt: null,
  createdAt: '',
  updatedAt: '',
};

export const REQUESTER_VERIFICATION_STRUCTURE = {
  id: '',
  userId: '',
  userType: 'requester',
  selectedHospitalMflCode: '',
  selectedHospitalName: '',
  patientName: '',
  patientMrnNumber: null,
  wardBedNumber: '',
  diagnosis: '',
  bloodComponentNeeded: '',
  urgencyLevel: '',
  doctorName: '',
  hospitalRequisitionFormUrl: '',
  informedConsentAccepted: false,
  status: 'pending',
  adminNotes: null,
  submittedAt: '',
  reviewedAt: null,
  createdAt: '',
  updatedAt: '',
};

export const checkCollectionsExist = async (): Promise<{
  verificationRequests: boolean;
}> => {
  try {
    const testDoc = await getDoc(
      doc(db, COLLECTIONS.VERIFICATION_REQUESTS, '__schema__')
    );
    return { verificationRequests: testDoc.exists() };
  } catch {
    return { verificationRequests: false };
  }
};

export const initializeCollections = async (): Promise<void> => {
  try {
    const schemaRef = doc(
      collection(db, COLLECTIONS.VERIFICATION_REQUESTS),
      '__schema__'
    );
    const existing = await getDoc(schemaRef);
    if (existing.exists()) {
      console.log('[Collections] verification_requests already initialized');
      return;
    }

    await setDoc(schemaRef, {
      _description: 'BloodLink verification_requests collection. Document ID = userId. userType = donor | requester.',
      _donorFields: Object.keys(DONOR_VERIFICATION_STRUCTURE),
      _requesterFields: Object.keys(REQUESTER_VERIFICATION_STRUCTURE),
      _cloudinaryFolders: {
        donors: 'bloodlink/verification/donors/{userId}',
        requesters: 'bloodlink/verification/requesters/{userId}',
      },
      _createdAt: serverTimestamp(),
    });

    console.log('[Collections] verification_requests collection initialized');
  } catch (error) {
    console.error('[Collections] Initialization error:', error);
  }
};