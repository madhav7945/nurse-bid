// ═══════════════════════════════════════════════════════════════════════════════
// Patient Mobile App — Domain & API Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

export interface PatientVitals {
  bp: string;
  pulse: string;
  spo2: string;
  sugar: string;
  sugar_fasting?: string;
  temp: string;
  recordedAt?: string;
  nurseName?: string;
  isLive?: boolean;
}

export interface BookingRecord {
  id: string;
  jobId: string;
  bidId: string;
  patientId: string;
  nurseId: string;
  patientName: string;
  nurseName: string;
  careType: string;
  diagnosis: string;
  location: string;
  agreedRate: number;
  totalAmount: number;
  durationDays: number;
  dailyHours: number;
  completedShifts: number;
  remainingShifts: number;
  status: string;
  escrowStatus: string;
  startDate: string;
  vitals?: PatientVitals;
}

export interface ClinicalNote {
  id: string;
  title: string;
  content: string;
  patientName: string;
  category: string;
  createdAt: string;
}

export interface NurseProposal {
  id: string;
  jobId: string;
  nurseName: string;
  nurseId: string;
  trustScore: number;
  experienceYears: number;
  specialization: string;
  hospitalAlum?: string;
  registrationNumber?: string;
  commuteTime?: string;
  proposedRate: number;
  totalShiftGross: number;
  coverLetter: string;
  status: "pending" | "accepted" | "declined" | "shortlisted" | "rejected" | "withdrawn";
  createdAt: string;
}

export interface JobRecord {
  id: string;
  patientName: string;
  title: string;
  description: string;
  careType: string;
  urgency: string;
  budgetMin: number;
  budgetMax: number;
  city: string;
  locality: string;
  shiftModel: string;
  startDate: string;
  durationDays: number;
  dailyHours: number;
  status: string;
  bidCount: number;
  isEscrowFunded: boolean;
  isVerifiedPatient: boolean;
  checklist: string[];
  createdAt: string;
  requiredCertifications?: string[];
  proceduresRequired?: string[];
  requiredProcedures?: string[];
  equipmentRequired?: string[];
  mobilityLevel?: string;
  mobilityStatus?: string;
  mobilityDirectives?: string;
  physicianOrders?: string;
  address?: string;
  patientAge?: number;
  patientGender?: string;
  patientRelationship?: string;
  postalCode?: string;
  roomProvided?: boolean;
  mealsProvided?: boolean;
  drugAllergies?: string;
  [key: string]: any;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
  timeAgo: string;
}

export interface ConversationRecord {
  id: string;
  participantIds: string[];
  participantNames: string[];
  nurseName: string;
  patientName: string;
  jobRef: string;
  subtitle: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  bookingStatus: string;
  escrowStatus: string;
  escrowAmount: number;
  avatar: string | null;
  online?: boolean;
  createdAt?: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  sender: string;
  name: string;
  content: string;
  text: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
  isRead: boolean;
  createdAt: string;
  time: string;
}

export interface MedicationTodoItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  instructions?: string;
  scheduledTime?: string;
  administered: boolean;
  administeredAt?: string;
  administeredBy?: string;
  status: "Given" | "Due" | "Pending";
}
