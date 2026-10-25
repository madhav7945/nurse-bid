// ═══════════════════════════════════════════════════════════════════════════════
// Nurse Mobile App — Domain & API Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

export interface ShiftVitals {
  bp?: string;
  pulse?: string;
  spo2?: string;
  sugar?: string;
  sugar_fasting?: string;
  temp?: string;
  recordedAt?: string;
  nurseName?: string;
  notes?: string;
}

export interface ShiftRecord {
  id: string;
  bookingRef: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  diagnosis: string;
  careType: string;
  address: string;
  date: string;
  formattedDate: string;
  dateLabel?: string;
  timeWindow: string;
  durationHrs: number;
  netPayout: number;
  dayNumber: number;
  totalDays: number;
  status: "active" | "upcoming" | "confirmed" | "completed" | "cancelled";
  vitals?: ShiftVitals;
  notes?: string;
  payoutTxn?: string;
  gpsCheckinAt?: string;
  patientPhone?: string;
}

export type ClinicalShift = ShiftRecord;

export interface PatientMedication {
  id?: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  instructions?: string;
  lastGiven: string;
  status: "Given" | "Due" | "Pending";
  administered?: boolean;
  administeredAt?: string;
}

export interface PatientVitalHistory {
  date: string;
  time: string;
  bp: string;
  pulse: string;
  sugar: string;
  spo2: string;
  temp: string;
  notes: string;
}

export interface PatientRecord {
  id: string;
  name: string;
  age: number;
  gender: string;
  diagnosis: string;
  careType: string;
  hospital: string;
  attendingDoctor: string;
  bookingRef: string;
  address: string;
  contactPerson: string;
  contactRelation: string;
  allergies: string[];
  alerts: string[];
  status: "Active" | "Scheduled" | "Discharged";
  currentShiftDay: number;
  totalShiftDays: number;
  medications: PatientMedication[];
  recentVitals: PatientVitalHistory[];
}

export interface ClinicalJob {
  id: string;
  title: string;
  patientName: string;
  careType: string;
  urgency: "Emergency" | "Urgent" | "Standard";
  city: string;
  locality: string;
  shiftModel: string;
  durationDays: number;
  dailyHours: number;
  hourlyRate: number;
  budget: number;
  budgetMin?: number;
  budgetMax?: number;
  isEscrowFunded: boolean;
  isVerified: boolean;
  distanceKm: number;
  commuteMinutes: number;
  postedTimeAgo: string;
  bidsCount: number;
  description: string;
  checklist: string[];
  equipmentRequired?: string[];
  equipment_required?: string[];
  patientAge?: number;
  patientGender?: string;
  patientWeight?: number | string;
  diagnosis?: string;
  createdAt?: string;
}

export interface BidRecord {
  id: string;
  jobId: string;
  nurseId: string;
  proposedRate: number;
  totalHours: number;
  totalGross: number;
  platformFee: number;
  netPayout: number;
  coverMessage: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  createdAt: string;
}

export interface NurseProposalItem {
  id: string;
  jobId: string;
  nurseId: string;
  proposedRate: number;
  totalHours: number;
  totalGross: number;
  platformFee: number;
  netPayout: number;
  coverMessage: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  createdAt: string;
  job?: {
    id: string;
    title: string;
    patientName: string;
    city: string;
    locality: string;
    careType: string;
    budgetMin: number;
    budgetMax: number;
    status: string;
  };
}

export interface ClinicalNote {
  id: string;
  title: string;
  content: string;
  patientName: string;
  category: string;
  createdAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId?: string;
  senderId?: string;
  senderName: string;
  senderRole: "nurse" | "patient" | "system";
  content: string;
  time: string;
  isRead: boolean;
  createdAt?: string;
}

export interface ConversationRecord {
  id: string;
  patientName: string;
  nurseName: string;
  jobRef: string;
  subtitle: string;
  lastMessage: string;
  lastMessageAt: string;
  bookingStatus: string;
  escrowAmount: number;
  unreadCount?: number;
  escrowStatus?: string;
  avatar?: string | null;
  createdAt?: string;
  participantIds?: string[];
  participantNames?: string[];
}

export interface NurseStats {
  activeClients: number;
  activeClientsChange: number;
  pendingBids: number;
  pendingBidsChange: number;
  escrowBalance: number;
  escrowBalanceChange: number;
  trustScore: number;
  tier: "Diamond" | "Platinum" | "Gold" | "Silver";
  completedShifts: number;
  activeShifts: number;
  totalEarnings: number;
  matchRate?: number;
}

export interface PayoutRecord {
  id: string;
  date: string;
  amount: number;
  status: string;
  description: string;
}

export interface EarningsData {
  availableForPayout: number;
  pendingEscrow: number;
  totalEarned: number;
  platformFees: number;
  completedMilestones: number;
  bankAccount: string;
  upiId: string;
  recentPayouts: PayoutRecord[];
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  isRead: boolean;
  type: "shift" | "bid" | "payout" | "clinical";
}
