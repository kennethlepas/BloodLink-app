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
  [x: string]: any;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  bloodType: BloodType;
  userType: UserType;
  //Location 
  county?: string;
  subCounty?: string;
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
  isLocked?: boolean;
  lockedUntil?: string;
  hasReviewed?: boolean;                   // Added to track if user has rated the app
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
  urgencyLevel?: string;
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
export type RequestStatus = 'pending' | 'accepted' | 'completed' | 'cancelled' | 'cancel' | 'expired';
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
  verificationStatus?: VerificationStatus;
  verificationRejectionReason?: string;
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
export type AcceptedRequestStatus = 'pending' | 'in_progress' | 'pending_verification' | 'verified' | 'disputed' | 'completed' | 'cancelled' | 'cancel';

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
  code: string; // Official MFL Code or unique hospital code
  name: string;
  address: string;
  location: Location;
  county: string;
  subCounty: string;
  ward?: string;
  facilityType?: string; // e.g. Level 4 Secondary Care
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
  criticalNeed?: boolean; // Badge for low inventory
  createdAt: string;
  updatedAt: string;
}

// Donor Booking Interface
export type DonorBookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'cancel' | 'no_show' | 'deferred' | 'rejected';

export interface DonorBooking {
  id: string;
  bookingId: string; // e.g. DON-25539-001
  donorId: string;
  donorName: string;
  donorPhone: string;
  bloodType: BloodType;
  hospitalId: string;
  hospitalName: string;
  hospitalCode: string;
  hospitalAddress: string;
  scheduledDate: string;
  scheduledTime: string;
  status: DonorBookingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  completedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string; // admin who verified
  rejectionReason?: string;
  screeningNotes?: string;
  donationRecordId?: string; // links to DonationRecord after completion
}

// Recipient Booking Interface
export type RecipientBookingStatus = 'pending' | 'confirmed' | 'processing' | 'ready' | 'completed' | 'cancelled' | 'cancel' | 'no_show' | 'rejected' | 'fulfilled' | 'partially_fulfilled';

export interface RecipientBooking {
  id: string;
  bookingId: string; // e.g. REC-12345-001
  requesterId: string;
  requesterName: string;
  requesterPhone: string;
  bloodType: BloodType;
  bloodComponent: string;
  hospitalId: string;
  hospitalName: string;
  hospitalCode: string;
  hospitalAddress: string;
  scheduledDate: string;
  scheduledTime: string;
  status: RecipientBookingStatus;
  unitsNeeded?: number;
  patientName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  completedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string; // admin who verified
  rejectionReason?: string;
  unitsFulfilled?: number;
  referralId?: string; // links to hospital_referrals if applicable
}

// Chat Types
export interface Chat {
  id: string;
  participants: string[];
  participantNames: { [userId: string]: string };
  participantTypes?: { [userId: string]: 'hospital' | 'user' };
  chatRole?: 'donor' | 'requester';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: { [userId: string]: number };
  requestId?: string | null;
  referralId?: string | null;
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
  | 'system_alert'
  | 'ticket_created'
  | 'ticket_updated'
  | 'ticket_message'
  | 'ticket_assigned'
  | 'ticket_resolved'
  | 'hospital_broadcast'
  | 'booking_confirmed'
  | 'booking_rejected'
  | 'booking_completed'
  | 'booking_fulfilled';

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
  subCounty?: string;
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
  referralId?: string | null;
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

// ==================== DISPUTE/TICKET SYSTEM TYPES ====================

// Ticket Status Lifecycle: open → under_review → awaiting_user → resolved/closed
export type TicketStatus =
  | 'open'           // Newly created, awaiting admin assignment
  | 'under_review'   // Admin is investigating
  | 'awaiting_user'  // Waiting for user response/evidence
  | 'resolved'       // Issue resolved, awaiting user confirmation
  | 'closed';        // Fully closed (user confirmed or auto-closed)

export type TicketType =
  | 'dispute'              // Dispute about a donation/request
  | 'bug_report'           // Technical issue
  | 'feature_request'      // Suggestion for improvement
  | 'general_inquiry'      // General question
  | 'account_issue'        // Account-related problem
  | 'verification_issue';  // Verification status dispute

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

// Entity types that a ticket can be related to
export type TicketEntityType =
  | 'blood_request'
  | 'accepted_request'
  | 'donation_record'
  | 'user_account'
  | 'verification_request'
  | 'general';

// Audit log entry for tracking all ticket actions
export interface TicketAuditLog {
  id: string;
  ticketId: string;
  action:
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'assigned'
  | 'message_added'
  | 'attachment_added'
  | 'resolved'
  | 'closed'
  | 'reopened';
  performedBy: string;        // User ID
  performedByType: 'user' | 'admin' | 'system';
  previousValue?: string;     // For status/priority changes
  newValue: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Ticket message (chat-like interface)
export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'admin';
  message: string;
  attachments?: TicketAttachment[];
  isEdited?: boolean;
  editedAt?: string;
  createdAt: string;
}

// Attachment for ticket messages
export interface TicketAttachment {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

// Main Ticket interface
export interface Ticket {
  id: string;
  // User info (denormalized for easy querying)
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;

  // Ticket classification
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;

  // Content
  subject: string;
  description: string;

  // Dispute details
  disputeReason?: string;
  additionalDetails?: string;

  // Related entity (optional - for disputes)
  relatedEntityId?: string;
  relatedEntityType?: TicketEntityType;
  relatedEntityDetails?: {
    bloodType?: BloodType;
    hospitalName?: string;
    patientName?: string;
    donationDate?: string;
    [key: string]: any;
  };

  // Assignment
  assignedAdminId?: string;
  assignedAdminName?: string;
  assignedAt?: string;

  // Timeline
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string;     // When admin first responded
  resolvedAt?: string;
  closedAt?: string;

  // Counters
  messageCount: number;
  attachmentCount: number;

  // Duplicate prevention
  duplicateOfTicketId?: string; // If this ticket is a duplicate

  // Metadata
  tags?: string[];              // For categorization
  source: 'app' | 'web' | 'email' | 'api';
  language?: string;            // User's language preference
}

// Hospital Referral (Admin to Admin, but visible to User)
export interface HospitalReferral {
  id: string;
  fromHospitalId: string;
  fromHospitalName: string;
  targetHospital: string;
  patientName: string;
  bloodType: BloodType;
  urgency: UrgencyLevel;
  reason: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// Ticket creation form data
export interface CreateTicketFormData {
  type: TicketType;
  priority: TicketPriority;
  subject: string;
  description: string;
  relatedEntityId?: string;
  relatedEntityType?: TicketEntityType;
  disputeReason?: string;
  additionalDetails?: string;
  attachmentUris?: string[];    // Local URIs before upload
}

// Ticket filter options
export interface TicketFilters {
  status?: TicketStatus[];
  type?: TicketType[];
  priority?: TicketPriority[];
  assignedToMe?: boolean;       // For admin view
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Ticket statistics for dashboard
export interface TicketStats {
  total: number;
  open: number;
  under_review: number;
  awaiting_user: number;
  resolved: number;
  closed: number;
  avgResolutionTimeHours: number;
  avgFirstResponseTimeHours: number;
}

// Dispute-specific reasons (for donation/request disputes)
export type DisputeReason =
  | 'donor_no_show'           // Donor didn't show up
  | 'wrong_blood_type'        // Donor provided wrong type
  | 'inappropriate_behavior'  // Harassment or misconduct
  | 'payment_request'         // Donor asked for money
  | 'location_change'         // Donor changed location last minute
  | 'delayed_response'        // Donor was unresponsive
  | 'medical_concern'         // Health issue during donation
  | 'false_information'       // Request had false details
  | 'other';

export interface DisputeTicketData extends CreateTicketFormData {
  type: 'dispute';
  disputeReason: DisputeReason;
  acceptedRequestId: string;   // The donation being disputed
  additionalDetails?: string;
}