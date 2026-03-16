export type UserType = 'donor' | 'requester';

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';



export interface InterestedDonor {
  id: string;
  donorId: string;
  donorName: string;
  donorPhone?: string;
  donorBloodType: BloodType;
  donorProfilePicture?: string;
  requestId: string;
  interestedAt: string;
  status: 'pending' | 'selected' | 'declined';
  message?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  region?: string;
}

export type VerificationStatus = 'unsubmitted' | 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  bloodType: BloodType;
  userType: UserType;
  //Location 
  county?: string;
  town?: string;
  location?: Location;
  profilePicture?: string;
  isActive: boolean;
  isAvailable?: boolean;
  lastDonationDate?: string; // ISO date string
  points?: number; // Reward points for donations
  createdAt: string;
  updatedAt: string;
  // Verification
  verificationStatus?: VerificationStatus;
  isVerified?: boolean;
  verificationRejectionReason?: string;
  weight?: number;                         // Current weight in kg
}

// Donor Suitability Questionnaire (KNBTS standard) 
export interface DonorQuestionnaire {
  ageConfirmed: boolean;
  weightValue?: number;         // Actual weight in kg
  noFeverOrInfection: boolean;
  noCurrentMedication: boolean;
  noChronicDisease: boolean;    // No hypertension, diabetes, heart disease
  noRecentTattoo: boolean;      // No tattoo/piercing in last 6 months
  noRecentSurgery: boolean;     // No surgery in last 6 months
  noRecentVaccination: boolean; // No vaccination in last 1 month
  noHIVHepatitis: boolean;
  noRecentMalaria: boolean;
  hasInfectiousDiseases: boolean; // Explicit declaration
  lastDonationDate?: string;    // Optional: when they last donated
  consentText: string;          // Stored verbatim for audit trail
}

//Verification Request 
export interface VerificationRequest {
  id: string;
  userId: string;
  userType: UserType;
  // Donor fields
  nationalIdPhotoUrl?: string;
  selfiePhotoUrl?: string;
  donorCardPhotoUrl?: string;         // optional
  bloodTestReportUrl?: string;         //optional
  medicalDeclarationAccepted?: boolean;
  donorQuestionnaire?: DonorQuestionnaire;
  // Requester fields
  hospitalRequisitionFormUrl?: string; // Cloudinary URL 
  selectedHospitalMflCode?: string;
  selectedHospitalName?: string;
  patientName?: string;
  patientMrnNumber?: string;
  wardBedNumber?: string;
  diagnosis?: string;
  bloodComponentNeeded?: string;
  bloodComponent?: string;
  doctorName?: string;
  informedConsentAccepted?: boolean;
  // Status
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Donor specific interface
export interface Donor extends User {
  userType: 'donor';
  isAvailable: boolean;
  lastDonationDate?: string;
  totalDonations: number;
  medicalHistory?: {
    hasChronicIllness: boolean;
    currentMedication: string;
    allergies: string;
    weight: number; // in kg
    lastHealthCheck?: string;
  };
}

// Requester specific interface
export interface Requester extends User {
  userType: 'requester';
  emergencyContact?: {
    name: string;
    phoneNumber: string;
    relationship: string;
  };
}

// Blood Request Types
export type RequestStatus = 'pending' | 'accepted' | 'completed' | 'cancelled' | 'expired';
export type UrgencyLevel = 'critical' | 'urgent' | 'moderate';

export interface BloodRequest {
  urgency: string;
  id: string;
  requesterId: string;
  requesterName: string;
  requesterPhone: string;
  bloodType: BloodType;
  urgencyLevel: UrgencyLevel;
  unitsNeeded: number;
  location: Location;
  hospitalName: string;
  hospitalAddress: string;
  patientName: string;
  description?: string;
  notes?: string;
  status: RequestStatus;
  hospitalFormUrl?: string;
  bloodComponent?: string;
  selectedHospitalId?: string;
  interestedDonorIds?: string[];
  selectedDonorId?: string;
  acceptedDonorId?: string;
  acceptedDonorName?: string;
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
}


// Accepted Request (Donor Commitment) Type
export type AcceptedRequestStatus = 'pending' | 'in_progress' | 'pending_verification' | 'verified' | 'disputed' | 'completed' | 'cancelled';

export interface AcceptedRequest {
  id: string;
  donorId: string;
  donorName: string;
  requesterId: string;
  requestId: string;
  bloodType: BloodType;
  urgencyLevel: UrgencyLevel;
  requesterName: string;
  requesterPhone: string;
  hospitalName: string;
  hospitalAddress: string;
  patientName: string;
  location: Location;
  unitsNeeded: number;
  bloodComponent?: string;
  notes?: string;
  status: AcceptedRequestStatus;
  acceptedDate: string;
  chatId: string;
  scheduledDate?: string;
  completedDate?: string;
  donationRecordId?: string;
  cancellationReason?: string;
  donorCompletedAt?: string;
  donorNotes?: string;
  requesterVerifiedAt?: string;
  requesterVerificationNotes?: string;
  createdAt: string;
  updatedAt: string;
}


// Donation Record

export interface DonationRecord {
  id: string;
  donorId: string;
  donorName: string;
  requestId?: string;
  bloodType: BloodType;
  donationDate: string;
  location?: Location;
  bloodBankId?: string;
  bloodBankName?: string;
  unitsCollected?: number;
  certificateUrl?: string;
  pointsEarned: number;
  bloodComponent?: string;
  notes?: string;
  createdAt: string;
}

// Blood Bank Types
export interface BloodBankInventory {
  [key: string]: {
    units: number;
    lastUpdated: string;
  };
}

export interface BloodBank {
  id: string;
  name: string;
  address: string;
  location: Location;
  phoneNumber: string;
  email?: string;
  operatingHours: {
    open: string;
    close: string;
  };
  inventory: BloodBankInventory;
  isVerified: boolean;
  rating?: number;
  distance?: number;
  createdAt: string;
  updatedAt: string;
}

// Chat Types
export interface Chat {
  id: string;
  participants: string[];
  participantNames: { [userId: string]: string };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: { [userId: string]: number };
  requestId?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification Types
export type NotificationType =
  | 'blood_request'
  | 'request_accepted'
  | 'request_completed'
  | 'request_fulfilled'
  | 'donor_interested'
  | 'verify_donation'
  | 'donation_verified'
  | 'donation_disputed'
  | 'new_message'
  | 'donor_nearby'
  | 'donation_reminder'
  | 'system_alert';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  timestamp: string;
  data?: {
    requestId?: string;
    chatId?: string;
    donorId?: string;
    [key: string]: any;
  };
}

// Feed/Post Types
export interface Post {
  id: string;
  userId: string;
  userName: string;
  userProfilePicture?: string;
  content: string;
  imageUrl?: string;
  type: 'general' | 'success_story' | 'urgent_request' | 'awareness';
  likes: string[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userProfilePicture?: string;
  content: string;
  timestamp: string;
}

// Form Data Types
export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  bloodType: BloodType;
  userType: UserType;
  county?: string;
  town?: string;
  location?: Location;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface BloodRequestFormData {
  bloodType: BloodType;
  urgencyLevel: UrgencyLevel;
  unitsNeeded: number;
  hospitalName: string;
  hospitalAddress: string;
  bloodComponent: string;
  description: string;
  location: Location;
}

// Search/Filter Types
export interface SearchFilters {
  bloodType?: BloodType;
  location?: Location;
  radius?: number; // in kilometers
  availability?: boolean;
}

export interface BloodBankSearchFilters {
  bloodType: BloodType;
  location: Location;
  radius?: number; // in kilometers
  hasStock?: boolean;
}

// Statistics Types
export interface UserStats {
  totalDonations: number;
  totalPoints: number;
  livesImpacted: number;
  lastDonationDate?: string;
  eligibleToDonate: boolean;
  nextEligibleDate?: string;
}

export interface SystemStats {
  totalDonors: number;
  totalRequesters: number;
  activeRequests: number;
  completedDonations: number;
  bloodBanksRegistered: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Validation Error Types
export interface ValidationErrors {
  [field: string]: string;
}

// Auth Context Types
export interface AuthContextType {
  user: User | null;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  isLoading: boolean;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'text' | 'image' | 'location';
  imageUrl?: string;
  location?: Location;
  replyTo?: string;
  isEdited?: boolean;
  editedAt?: string;
  deliveredAt?: string;
}

// Add typing indicator type
export interface TypingIndicator {
  chatId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: string;
}

// Geolocation Types
export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

// Firebase Document References
export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
}

// Helper type for creating new documents (without id and timestamps)
export type NewDocument<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

// Helper type for updating documents (all fields optional except id)
export type UpdateDocument<T> = Partial<Omit<T, 'id'>> & { id: string };