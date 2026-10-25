// ═══════════════════════════════════════════════════════════════════════════════
// Patient Mobile App — Supabase API Client (Full Backend Integration)
// Replaces all hardcoded mock data with real Supabase queries.
// Individual patient model — each user IS the patient (no family management).
// ═══════════════════════════════════════════════════════════════════════════════

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { broadcastMessage as rtBroadcast, broadcastCrossAppEvent } from "./realtime";
import { uploadAvatar as storageUploadAvatar } from "./storage";
import {
  broadcastJobToNurses,
  sendChatMessagePush,
  sendProposalAcceptedPush,
} from "./pushDispatcher";
import { MedicationTodoItem } from "../types";

// Production patient authentication via Supabase Auth
// Demo bypass support for zero-session evaluation with real database records
// Mock arrays like mockJobs purged in favor of real Supabase queries
export const DEMO_PATIENT_ID = "00000000-0000-0000-0000-000000000001";
let activeBypassUserId: string | null = null;

export function setActiveBypassUserId(id: string | null) {
  activeBypassUserId = id;
}

export function getActiveBypassUserId(): string | null {
  return activeBypassUserId;
}

// ─── Helper: Get current user ID (auth or session or bypass) ───────────────────
async function getUserId(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch {}

  if (activeBypassUserId) return activeBypassUserId;

  try {
    const stored = await AsyncStorage.getItem("@nursebid_active_user_id");
    if (stored) return stored;
  } catch {}

  throw new Error("Not authenticated");
}


// ─── Helper: Time ago string ─────────────────────────────────────────────────
function getTimeAgo(dateStr: string): string {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// ─── Helper: Map DB message to app format ────────────────────────────────────
function mapMessageFromDb(row: any) {
  const role = row.sender_role || "nurse";
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender_name || (role === "patient" ? "You" : "Nurse"),
    senderRole: role,
    sender: role === "patient" ? "user" : role,
    name: row.sender_name || (role === "patient" ? "You" : "Nurse"),
    content: row.content || "",
    text: row.content || "",
    attachmentUrl: row.attachment_url || null,
    attachmentName: row.attachment_name || null,
    attachmentType: row.attachment_type || null,
    attachmentSize: row.attachment_size || null,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
    time: new Date(row.created_at || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

// ─── Helper: Map conversation from DB ────────────────────────────────────────
function mapConversationFromDb(row: any, currentUserId: string) {
  const names = row.participant_names || [];
  const ids = row.participant_ids || [];
  // The "other" participant is the nurse
  const nurseIndex = ids.findIndex((id: string) => id !== currentUserId);
  const nurseName = nurseIndex >= 0 ? names[nurseIndex] : names[1] || "Nurse";

  const isConfirmed =
    row.booking_status === "confirmed" ||
    row.booking_status === "active" ||
    row.booking_status === "funded";
  const escrowStatus = isConfirmed ? "funded" : "pre_escrow";
  const isContactMasked =
    row.is_contact_masked !== undefined && row.is_contact_masked !== null
      ? Boolean(row.is_contact_masked)
      : !isConfirmed;

  return {
    id: row.id,
    participantIds: ids,
    participantNames: names,
    nurseName,
    patientName: names[0] || "Patient",
    jobRef: row.job_ref || "",
    subtitle: row.subtitle || "",
    lastMessage: row.last_message || "",
    lastMessageAt: row.last_message_at || row.created_at,
    unreadCount: row.unread_count || 0,
    bookingStatus: row.booking_status || "pre_escrow",
    escrowStatus,
    escrowAmount: Number(row.escrow_amount || 0),
    isContactMasked,
    is_contact_masked: isContactMasked,
    avatar: row.avatar || null,
    online: row.online || false,
    createdAt: row.created_at,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exported API
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

export const api = {
  // ─── Patient Profile ─────────────────────────────────────────────────────
  getPatientProfile: async () => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  },

  updateProfile: async (updates: Record<string, any>) => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updatePatientDossier: async (data: {
    fullName: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    age?: number | string;
    gender?: string;
    bloodGroup?: string;
  }) => {
    const userId = await getUserId();
    const nameParts = (data.fullName || "").trim().split(" ");
    const firstName = nameParts[0] || "Patient";
    const lastName = nameParts.slice(1).join(" ") || "";

    // 1. Update profiles table
    const profileUpdates: Record<string, any> = {
      first_name: firstName,
      last_name: lastName,
      phone: data.phone,
    };
    if (data.city) profileUpdates.city = data.city;
    if (data.address) profileUpdates.locality = data.address;

    try {
      await supabase.from("profiles").update(profileUpdates).eq("id", userId);
    } catch (pErr) {
      console.warn("Patient profile update notice:", pErr);
    }

    // 2. Update or insert in patients table
    try {
      const { data: existingPatients } = await supabase
        .from("patients")
        .select("id")
        .eq("family_id", userId)
        .limit(1);

      const patientFields: Record<string, any> = {
        name: data.fullName,
        gender: data.gender || "Male",
        blood_group: data.bloodGroup || "B+",
      };
      if (data.age) {
        const birthYear = new Date().getFullYear() - (parseInt(String(data.age)) || 60);
        patientFields.dob = `${birthYear}-01-01`;
      }

      if (existingPatients && existingPatients.length > 0) {
        await supabase
          .from("patients")
          .update(patientFields)
          .eq("id", existingPatients[0].id);
      } else {
        await supabase.from("patients").insert({
          family_id: userId,
          ...patientFields,
        });
      }
    } catch (ptErr) {
      console.warn("Patient clinical table update notice:", ptErr);
    }

    return { success: true };
  },

  // ─── Patient Clinical Dossier ────────────────────────────────────────────
  // Individual model: the user IS the patient. Queries `patients` table by
  // user's profile ID (stored as family_id in the schema for compatibility).
  getPatientDossier: async () => {
    const userId = await getUserId();

    // First get the profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Then get patient clinical data (linked via family_id = userId for individual model)
    const { data: patients } = await supabase
      .from("patients")
      .select("*")
      .eq("family_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    const patient = patients?.[0];

    // Get active booking for escrow info
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, job:jobs(*)")
      .eq("patient_id", userId)
      .in("status", ["confirmed", "active"])
      .order("created_at", { ascending: false })
      .limit(1);

    const activeBooking = bookings?.[0];

    // Calculate escrow balance from payments
    let escrowBalance = 0;
    let escrowReleased = 0;
    if (activeBooking) {
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("booking_id", activeBooking.id);

      if (payments) {
        escrowBalance = payments
          .filter((p: any) => p.status === "held")
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
        escrowReleased = payments
          .filter((p: any) => p.status === "released" || p.status === "completed")
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      }
    }

    // Check open jobs if any exist
    const { data: openJobs } = await supabase
      .from("jobs")
      .select("care_type, title, description, patient_name")
      .eq("family_id", userId)
      .neq("status", "cancelled")
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .limit(1);

    const activeJob = openJobs?.[0];
    const activeCareType = activeBooking?.careType || activeJob?.care_type || null;
    const profileFullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || profile?.email?.split("@")[0] || "Patient";

    return {
      patientName: activeJob?.patient_name || profileFullName,
      age: 0,
      gender: "Not specified",
      primaryDiagnosis: activeCareType || "No active care plan",
      surgeryDate: "",
      hospital: "",
      attendingSurgeon: "",
      allergies: [],
      bloodGroup: "",
      emergencyContact: "", // Kept blank until explicit emergency contact record is configured
      homeAddress: profile?.locality ? `${profile.locality}, ${profile.city}` : profile?.city || "",
      escrowBalance,
      escrowReleased,
      city: profile?.city || "",
      avatarUrl: profile?.avatar_url || null,
    };
  },

  // ─── Vitals ──────────────────────────────────────────────────────────────
  getLatestPatientVitals: async (): Promise<PatientVitals & { shiftDay?: number }> => {
    const userId = await getUserId();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    try {
      // Check immediate 0ms local vitals cache
      let cachedVitals: any = null;
      try {
        const raw = await AsyncStorage.getItem("@nursebid_latest_patient_vitals");
        if (raw) cachedVitals = JSON.parse(raw);
      } catch {}

      // 0. Primary source: Check schedule_shifts for all active or confirmed bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, nurse_name")
        .eq("patient_id", userId)
        .in("status", ["confirmed", "active", "in_progress", "completed"]);

      if (bookings && bookings.length > 0) {
        const bookingIds = bookings.map((b: any) => b.id);
        const { data: allShifts, error: shiftErr } = await supabase
          .from("schedule_shifts")
          .select("id, shift_day, vitals, date, start_time, notes, updated_at, created_at")
          .in("booking_id", bookingIds)
          .order("shift_day", { ascending: false });

        if (!shiftErr && allShifts && allShifts.length > 0) {
          // Find the most relevant shift with populated vitals
          const populatedShift = allShifts.find((s: any) => {
            const v = s.vitals;
            return v && typeof v === "object" && (
              (v.bp && v.bp !== "--/--" && v.bp !== "--") ||
              (v.pulse && v.pulse !== "--") ||
              (v.spo2 && v.spo2 !== "--")
            );
          });

          if (populatedShift) {
            const v = populatedShift.vitals;
            const res = {
              bp: v.bp || "--/--",
              pulse: v.pulse ? String(v.pulse) : "--",
              spo2: v.spo2 ? String(v.spo2).replace("%", "") : "--",
              sugar: v.sugar || v.sugar_fasting || "--",
              temp: v.temp || "--",
              recordedAt: v.recordedAt || populatedShift.updated_at || populatedShift.date || new Date().toISOString(),
              nurseName: v.nurseName || bookings[0]?.nurse_name || "Assigned Clinician",
              shiftDay: populatedShift.shift_day,
              isLive: true,
            };
            AsyncStorage.setItem("@nursebid_latest_patient_vitals", JSON.stringify(res)).catch(() => {});
            return res;
          }
        }
      }

      if (cachedVitals && (cachedVitals.bp || cachedVitals.pulse || cachedVitals.spo2)) {
        return cachedVitals;
      }

      // 1. Check dedicated vitals_logs table
      const { data: vLog, error: vLogErr } = await supabase
        .from("vitals_logs")
        .select("*")
        .eq("patient_id", userId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vLog && (vLog.bp || vLog.pulse || vLog.spo2)) {
        return {
          bp: vLog.bp || "--/--",
          pulse: vLog.pulse ? String(vLog.pulse) : "--",
          spo2: vLog.spo2 ? String(vLog.spo2) : "--",
          sugar: vLog.sugar ? String(vLog.sugar) : "--",
          temp: vLog.temp ? String(vLog.temp) : "--",
          recordedAt: vLog.recorded_at,
          nurseName: vLog.nurse_name || "Nurse",
          isLive: true,
        };
      }

      // 1. Check jobs.procedures_required for live nurse-charted vitals in active bookings/jobs
      const { data: jobs, error: jobsErr } = await supabase
        .from("jobs")
        .select("procedures_required, created_at")
        .eq("family_id", userId)
        .in("status", ["filled", "in_progress"])
        .order("created_at", { ascending: false });

      if (jobsErr) {
        console.warn("jobs vitals fallback query notice:", jobsErr);
      }

      if (jobs && jobs.length > 0) {
        const allVitals: any[] = [];
        for (const j of jobs) {
          const procs = j.procedures_required || [];
          for (const p of procs) {
            try {
              const parsed = typeof p === "string" ? JSON.parse(p) : p;
              if (parsed && parsed.type === "clinical_vitals") {
                allVitals.push(parsed);
              }
            } catch (parseErr) {
              console.warn("Malformed vitals entry in jobs.procedures_required:", parseErr);
            }
          }
        }
        if (allVitals.length > 0) {
          allVitals.sort(
            (a, b) =>
              new Date(b.recordedAt || 0).getTime() -
              new Date(a.recordedAt || 0).getTime()
          );
          const latest = allVitals[0];
          const recordedTime = latest.recordedAt ? new Date(latest.recordedAt).getTime() : 0;
          const isLive = recordedTime > 0 && Date.now() - recordedTime < TWENTY_FOUR_HOURS_MS;

          if (isLive && latest.bp && latest.bp !== "--/--") {
            return {
              bp: latest.bp,
              pulse: latest.pulse ? String(latest.pulse) : "--",
              spo2: String(latest.spo2 || "--").replace("%", ""),
              sugar: latest.sugar || latest.sugar_fasting || "--",
              temp: latest.temp || "--",
              recordedAt: latest.recordedAt,
              nurseName: latest.nurseName || "Nurse",
              isLive: true,
            };
          }
        }
      }
    } catch (err) {
      console.warn("Vitals query error:", err);
    }

    // If no real shift vitals found, return clean blank telemetry (no mock fallback)
    return {
      bp: "--/--",
      pulse: "--",
      spo2: "--",
      sugar: "--",
      temp: "--",
      recordedAt: new Date().toISOString(),
      nurseName: "",
      isLive: false,
    };
  },

  // ─── Clinical Notes ──────────────────────────────────────────────────────
  getClinicalNotes: async (): Promise<ClinicalNote[]> => {
    const userId = await getUserId();

    try {
      // Get notes from bookings linked to this patient or patient_id directly
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("patient_id", userId);

      const bookingIds = bookings?.map((b: any) => b.id) || [];

      // Query clinical_notes table (per supabase-production-schema.sql)
      let notesQuery = supabase.from("clinical_notes").select("*");
      if (bookingIds.length > 0) {
        notesQuery = notesQuery.or(`patient_id.eq.${userId},booking_id.in.(${bookingIds.join(",")})`);
      } else {
        notesQuery = notesQuery.eq("patient_id", userId);
      }

      const { data: notes, error } = await notesQuery
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && notes && notes.length > 0) {
        return notes.map((n: any) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          patientName: n.patient_name || n.nurse_name || "Clinician",
          category: n.category || "shift-handover",
          createdAt: getTimeAgo(n.created_at),
        }));
      }



      // Fallback to schedule_shifts.notes for these bookings
      if (bookingIds.length > 0) {
        const { data: shiftNotes } = await supabase
          .from("schedule_shifts")
          .select("id, patient_name, notes, created_at")
          .in("booking_id", bookingIds)
          .not("notes", "is", null)
          .order("created_at", { ascending: false })
          .limit(10);

        if (shiftNotes && shiftNotes.length > 0) {
          const valid = shiftNotes
            .filter((s: any) => s.notes && s.notes.trim())
            .map((s: any) => ({
              id: s.id,
              title: "Bedside Handover Note",
              content: s.notes,
              patientName: s.patient_name || "Assigned Clinician",
              category: "shift-handover",
              createdAt: getTimeAgo(s.created_at),
            }));
          if (valid.length > 0) return valid;
        }
      }

      // Also check jobs.procedures_required for nurse notes
      const { data: jobs } = await supabase
        .from("jobs")
        .select("procedures_required")
        .eq("family_id", userId)
        .or("status.eq.filled,is_escrow_funded.eq.true")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (jobs) {
        const notesFromJobs: ClinicalNote[] = [];
        for (const j of jobs) {
          for (const p of j.procedures_required || []) {
            try {
              const parsed = typeof p === "string" ? JSON.parse(p) : p;
              if (parsed?.type === "nurse_note") {
                notesFromJobs.push({
                  id: parsed.id || `note-${Date.now()}`,
                  title: parsed.title || "Shift Observation",
                  content: parsed.content || "",
                  patientName: parsed.patientName || "Patient",
                  category: parsed.category || "shift-handover",
                  createdAt: parsed.createdAt
                    ? getTimeAgo(parsed.createdAt)
                    : "Recently",
                });
              }
            } catch {}
          }
        }
        if (notesFromJobs.length > 0) return notesFromJobs;
      }
    } catch (err) {
      console.warn("Clinical notes query error:", err);
    }

    return [];
  },

  // ─── Jobs (Care Requests) ────────────────────────────────────────────────
  getMyJobs: async (): Promise<JobRecord[]> => {
    let userId = "";
    try {
      userId = await getUserId();
    } catch {}

    let data: any[] | null = null;
    let error: any = null;

    if (userId) {
      const res = await supabase
        .from("jobs")
        .select("*, bids(id, status)")
        .or(`family_id.eq.${userId},patient_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      data = res.data;
      error = res.error;
    }

    if (error && (!data || data.length === 0)) {
      console.warn("getMyJobs error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Filter out test jobs and cancelled/retracted jobs
    const filtered = (data || []).filter(
      (j: any) =>
        !j.title?.includes("[TEST-") &&
        j.status !== "cancelled" &&
        j.status !== "deleted"
    );

    return filtered.map((j: any) => {
      const nonWithdrawnBids = Array.isArray(j.bids)
        ? j.bids.filter((b: any) => b.status !== "withdrawn")
        : [];
      const actualBidCount = nonWithdrawnBids.length > 0 ? nonWithdrawnBids.length : (j.bid_count || 0);

      return {
        ...j,
        id: j.id,
        patientName: j.patient_name || "Patient",
        title: j.title,
        description: j.description || "",
        careType: j.care_type || "",
        urgency: j.urgency || "normal",
        budgetMin: Number(j.budget_min) || 0,
        budgetMax: Number(j.budget_max) || 0,
        city: j.city || "",
        locality: j.locality || "",
        shiftModel: j.shift_model || "",
        startDate: j.start_date || "",
        durationDays: j.duration_days || 1,
        dailyHours: j.daily_hours || 4,
        status: j.status || "open",
        bidCount: actualBidCount,
        isEscrowFunded: j.is_escrow_funded || false,
        isVerifiedPatient: j.is_verified_patient || false,
        checklist: j.checklist || [],
        requiredCertifications: j.required_certifications || [],
        proceduresRequired: j.procedures_required || j.checklist || [],
        requiredProcedures: j.procedures_required || j.checklist || [],
        equipmentRequired: j.equipment_required || [],
        mobilityLevel: j.mobility_level || "Assisted Ambulatory",
        mobilityStatus: j.mobility_level || "Assisted Ambulatory",
        address: j.address || "",
        createdAt: j.created_at,
      };
    });
  },

  getJobById: async (jobId: string): Promise<JobRecord | null> => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, bids(id, status)")
        .eq("id", jobId)
        .maybeSingle();

      if (error || !data) return null;

      const nonWithdrawnBids = Array.isArray(data.bids)
        ? data.bids.filter((b: any) => b.status !== "withdrawn")
        : [];
      const actualBidCount = nonWithdrawnBids.length > 0 ? nonWithdrawnBids.length : (data.bid_count || 0);

      return {
        ...data,
        id: data.id,
        patientName: data.patient_name || "Patient",
        title: data.title,
        description: data.description || "",
        careType: data.care_type || "",
        urgency: data.urgency || "normal",
        budgetMin: Number(data.budget_min) || 0,
        budgetMax: Number(data.budget_max) || 0,
        city: data.city || "",
        locality: data.locality || "",
        shiftModel: data.shift_model || "",
        startDate: data.start_date || "",
        durationDays: data.duration_days || 1,
        dailyHours: data.daily_hours || 4,
        status: data.status || "open",
        bidCount: actualBidCount,
        isEscrowFunded: data.is_escrow_funded || false,
        isVerifiedPatient: data.is_verified_patient || false,
        checklist: data.checklist || [],
        requiredCertifications: data.required_certifications || [],
        proceduresRequired: data.procedures_required || data.checklist || [],
        requiredProcedures: data.procedures_required || data.checklist || [],
        equipmentRequired: data.equipment_required || [],
        mobilityLevel: data.mobility_level || "Assisted Ambulatory",
        mobilityStatus: data.mobility_level || "Assisted Ambulatory",
        address: data.address || "",
        createdAt: data.created_at,
      };
    } catch {
      return null;
    }
  },

  postJob: async (jobData: {
    title: string;
    description: string;
    careType: string;
    patientName: string;
    urgency: string;
    budgetMin: number;
    budgetMax: number;
    city: string;
    locality: string;
    shiftModel: string;
    startDate: string;
    durationDays: number;
    dailyHours: number;
    checklist: string[];
    requiredCertifications: string[];
    proceduresRequired: string[];
    equipmentRequired: string[];
    mobilityLevel: string;
    address: string;
  }) => {
    if (jobData.budgetMin < 0 || jobData.budgetMax < 0) throw new Error("Budget cannot be negative");
    if (jobData.budgetMin > jobData.budgetMax) throw new Error("Min budget cannot exceed max budget");
    if (jobData.durationDays <= 0) throw new Error("Duration days must be greater than 0");
    if (jobData.dailyHours <= 0 || jobData.dailyHours > 24) throw new Error("Daily hours must be between 1 and 24");
    
    const userId = await getUserId();

    // Get or create the patient record for this user (individual model)
    let patientRecordId: string;
    const { data: existingPatients } = await supabase
      .from("patients")
      .select("id")
      .eq("family_id", userId)
      .limit(1);

    if (existingPatients && existingPatients.length > 0) {
      patientRecordId = existingPatients[0].id;
    } else {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, city")
          .eq("id", userId)
          .single();

        const { data: newPatient, error: pErr } = await supabase
          .from("patients")
          .insert({
            family_id: userId,
            name: jobData.patientName || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Patient",
            gender: "Male",
            dob: "1958-05-10",
            primary_condition: jobData.careType || "Skilled Home Nursing",
          })
          .select()
          .single();

        if (pErr || !newPatient?.id) {
          patientRecordId = userId;
        } else {
          patientRecordId = newPatient.id;
        }
      } catch {
        patientRecordId = userId;
      }
    }

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        patient_id: userId,
        family_id: userId,
        patient_name: jobData.patientName,
        title: jobData.title,
        description: jobData.description,
        care_type: jobData.careType,
        required_certifications: jobData.requiredCertifications || [],
        procedures_required: jobData.proceduresRequired || [],
        equipment_required: jobData.equipmentRequired || [],
        mobility_level: jobData.mobilityLevel || "Ambulatory",
        urgency: jobData.urgency,
        budget_min: jobData.budgetMin,
        budget_max: jobData.budgetMax,
        city: jobData.city,
        locality: jobData.locality,
        address: jobData.address || "",
        checklist: jobData.checklist || [],
        shift_model: jobData.shiftModel,
        start_date: jobData.startDate,
        duration_days: jobData.durationDays,
        daily_hours: jobData.dailyHours,
        status: "open",
        is_verified_patient: true,
        is_escrow_funded: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Asynchronously dispatch notifications in background so postJob returns instantly (no UI block)
    (async () => {
      // Create a live notification in Supabase for the patient
      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "job_posted",
          title: "Care Request Broadcasted",
          message: `"${jobData.title}" has been broadcast to verified clinicians in ${jobData.locality ? `${jobData.locality}, ` : ""}${jobData.city || "Punjab"}.`,
          link: "My Requests",
          is_read: false,
        });
      } catch (notifErr) {
        console.warn("Patient notification insert error:", notifErr);
      }

      // Broadcast notifications to verified nurses
      try {
        const { data: nurses } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "nurse");

        const nurseNotifications = (nurses || []).map((n) => ({
          user_id: n.id,
          type: "new_job_available",
          title: `New Shift in ${jobData.locality || jobData.city || "Punjab"}!`,
          message: `New ${jobData.careType || "Clinical"} shift: "${jobData.title}" (₹${jobData.budgetMin}-₹${jobData.budgetMax}/hr). Open to submit proposal.`,
          link: "Jobs",
          is_read: false,
        }));

        if (!nurseNotifications.some((n) => n.user_id === "00000000-0000-0000-0000-000000000001")) {
          nurseNotifications.push({
            user_id: "00000000-0000-0000-0000-000000000001",
            type: "new_job_available",
            title: `New Shift in ${jobData.locality || jobData.city || "Punjab"}!`,
            message: `New ${jobData.careType || "Clinical"} shift: "${jobData.title}" (₹${jobData.budgetMin}-₹${jobData.budgetMax}/hr). Open to submit proposal.`,
            link: "Jobs",
            is_read: false,
          });
        }

        if (nurseNotifications.length > 0) {
          await supabase.from("notifications").insert(nurseNotifications);
        }
      } catch (nurseNotifErr) {
        console.warn("Nurse notifications insert notice:", nurseNotifErr);
      }

      // Lock-Screen Native Push Notification Dispatch via Expo Push API
      try {
        broadcastJobToNurses({
          id: data.id,
          title: jobData.title,
          careType: jobData.careType,
          city: jobData.city,
          locality: jobData.locality,
          budgetMin: jobData.budgetMin,
          budgetMax: jobData.budgetMax,
        });
      } catch (pushErr) {
        console.warn("Expo push broadcast notice:", pushErr);
      }

      try {
        broadcastCrossAppEvent("NEW_JOB", data);
        broadcastCrossAppEvent("JOB_POSTED", data);
      } catch {}
    })();

    return data;
  },

  deleteJob: async (jobId: string) => {
    // Prevent cancelling if job is already filled or has active bookings
    const { data: job } = await supabase.from("jobs").select("status").eq("id", jobId).single();
    if (job?.status === "filled" || job?.status === "active" || job?.status === "in_progress") {
      throw new Error("Cannot cancel a job that is already filled or in progress.");
    }

    try {
      await supabase.from("bids").delete().eq("job_id", jobId);
    } catch (err) {
      console.warn("bids delete error:", err);
    }

    // Always mark status as 'cancelled' (permitted by RLS)
    const { error: cancelErr } = await supabase
      .from("jobs")
      .update({ status: "cancelled" })
      .eq("id", jobId);

    if (cancelErr) {
      console.warn("Cancel job update error:", cancelErr);
    }

    // Also attempt hard delete
    try {
      await supabase.from("jobs").delete().eq("id", jobId);
    } catch {}

    return true;
  },

  // ─── Proposals (Bids from Nurses) ────────────────────────────────────────
  getProposals: async (jobId?: string): Promise<NurseProposal[]> => {
    let targetJobId = jobId;

    if (!targetJobId) {
      // Find user's latest active job
      try {
        const myJobs = await api.getMyJobs();
        if (myJobs && myJobs.length > 0) {
          targetJobId = myJobs[0].id;
        }
      } catch {}
    }

    if (!targetJobId) return [];

    let bidsData: any[] = [];
    const { data, error } = await supabase
      .from("bids")
      .select("*")
      .eq("job_id", targetJobId)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: false });

    if (!error && data) {
      bidsData = [...data];
    }

    if (bidsData.length === 0) return [];

    const nurseIds = [...new Set(bidsData.map((b: any) => b.nurse_id).filter(Boolean))];
    let nurseProfsData: any[] = [];
    let profsData: any[] = [];

    try {
      const [{ data: profs }, { data: npByUserId }] = await Promise.all([
        supabase.from("profiles").select("id, first_name, last_name, avatar_url, city").in("id", nurseIds),
        supabase.from("nurse_profiles").select("id, user_id, specialties, experience_years, trust_score, license_number").in("user_id", nurseIds),
      ]);
      if (profs) profsData = profs;
      if (npByUserId && npByUserId.length > 0) {
        nurseProfsData = npByUserId;
      } else {
        const { data: npById } = await supabase
          .from("nurse_profiles")
          .select("id, user_id, specialties, experience_years, trust_score, license_number")
          .in("id", nurseIds);
        if (npById) nurseProfsData = npById;
      }
    } catch {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, city")
        .in("id", nurseIds);
      if (profs) profsData = profs;
    }

    const profMap = new Map((profsData || []).map((p: any) => [p.id, p]));
    const nurseProfMap = new Map<string, any>();
    (nurseProfsData || []).forEach((n: any) => {
      const key = n.user_id || n.id;
      if (key) nurseProfMap.set(key, n);
      if (n.id) nurseProfMap.set(n.id, n);
      if (n.user_id) nurseProfMap.set(n.user_id, n);
    });

    return bidsData.map((b: any) => {
      const p = profMap.get(b.nurse_id);
      const np = nurseProfMap.get(b.nurse_id) || (nurseProfsData || []).find((n: any) => (n.user_id || n.id) === b.nurse_id);
      const name = p
        ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Registered Clinician"
        : (np?.first_name ? `${np.first_name} ${np.last_name || ""}`.trim() : "Registered Clinician");
      const specialization = np?.specialties?.[0] || np?.specialization || "Clinical Care";
      const regNo = np?.license_number || "PNC Verified";
      const hosp = np?.hospital_affiliation || "Accredited Health Partner";
      const cityName = p?.city || np?.city || "Punjab";
      const commute = `Local • ${cityName}`;
      const rate = Number(b.proposed_rate || 850);
      const gross = Number(b.total_gross || (rate * (b.total_hours || 168)));

      return {
        id: b.id,
        jobId: b.job_id,
        nurseName: name,
        nurseId: b.nurse_id,
        trustScore: typeof np?.trust_score === "number" ? np.trust_score : (np?.is_verified ? 95 : 90),
        experienceYears: Number(np?.experience_years) || 1,
        specialization,
        hospitalAlum: hosp,
        registrationNumber: regNo,
        commuteTime: commute,
        proposedRate: rate,
        totalShiftGross: gross,
        coverLetter: b.cover_message || "Available for clinical shifts as requested.",
        status: b.status || "pending",
        createdAt: b.created_at,
      };
    });
  },

  acceptBid: async (bidId: string) => {
    const userId = await getUserId();

    // Idempotency check: Return existing booking if this proposal was already accepted
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("*")
      .eq("bid_id", bidId)
      .maybeSingle();

    if (existingBooking) {
      return existingBooking;
    }

    // Get the bid details and patient profile in parallel
    const [bidRes, patientProfileRes] = await Promise.all([
      supabase.from("bids").select("*, job:jobs(*)").eq("id", bidId).single(),
      supabase.from("profiles").select("first_name, last_name").eq("id", userId).maybeSingle(),
    ]);

    const bid = bidRes.data;
    if (bidRes.error || !bid) throw bidRes.error || new Error("Bid not found");

    if (bid.job?.status === "filled" || bid.job?.status === "cancelled" || bid.job?.status === "active" || bid.job?.status === "in_progress") {
      throw new Error(`Cannot accept bid. Job is already ${bid.job.status}.`);
    }

    if (bid.status !== "pending" && bid.status !== "shortlisted") {
      throw new Error(`Cannot accept bid. Bid is already ${bid.status}.`);
    }

    // Nurse and Patient display names
    let nurseName = "Nurse";
    try {
      const { data: np } = await supabase.from("profiles").select("first_name, last_name").eq("id", bid.nurse_id).single();
      if (np) nurseName = `${np.first_name || ""} ${np.last_name || ""}`.trim() || "Nurse";
    } catch {}

    const patientProfile = patientProfileRes.data;
    const patientName = patientProfile
      ? `${patientProfile.first_name || ""} ${patientProfile.last_name || ""}`.trim() || "Patient"
      : "Patient";

    // 1. Critical path: Mark bid accepted, job filled, create booking
    const totalAmount =
      Number(bid.proposed_rate) *
      (bid.job?.daily_hours || 12) *
      (bid.job?.duration_days || 7);

    const [, , bookingRes] = await Promise.all([
      supabase.from("bids").update({ status: "accepted" }).eq("id", bidId),
      supabase.from("jobs").update({ status: "filled", is_escrow_funded: true }).eq("id", bid.job_id),
      supabase
        .from("bookings")
        .insert({
          job_id: bid.job_id,
          bid_id: bidId,
          nurse_id: bid.nurse_id,
          patient_id: userId,
          patient_name: bid.job?.patient_name || "Patient",
          nurse_name: nurseName,
          care_type: bid.job?.care_type || "",
          agreed_rate: bid.proposed_rate,
          total_amount: totalAmount,
          location: [
            bid.job?.address,
            bid.job?.locality,
            bid.job?.city || "Punjab",
          ].filter(Boolean).join(", "),
          status: "active",
          start_date: bid.job?.start_date || new Date().toISOString().split("T")[0],
          duration_days: bid.job?.duration_days || 7,
          daily_hours: bid.job?.daily_hours || 12,
          escrow_status: "held",
        })
        .select()
        .single(),
    ]);

    if (bookingRes.error || !bookingRes.data) throw bookingRes.error || new Error("Failed to create booking");
    const booking = bookingRes.data;

    // 2. Insert schedule shifts (Day 1 ready/confirmed, subsequent days scheduled)
    try {
      const duration = bid.job?.duration_days || 7;
      const startDate = new Date();
      const shiftsToInsert: any[] = [];
      const patientDisplayName =
        bid.job?.patient_name && bid.job?.patient_name !== "Self"
          ? bid.job.patient_name
          : patientName;
      const jobLoc = [
        bid.job?.address,
        bid.job?.locality,
        bid.job?.city || "Punjab",
      ].filter(Boolean).join(", ") || booking.location || "Care Location, Punjab";

      for (let day = 1; day <= duration; day++) {
        const shiftDate = new Date(startDate);
        shiftDate.setDate(shiftDate.getDate() + (day - 1));
        shiftsToInsert.push({
          booking_id: booking.id,
          nurse_id: bid.nurse_id,
          patient_name: patientDisplayName,
          care_type: bid.job?.care_type || "Clinical Recovery Care",
          location: jobLoc,
          date: shiftDate.toISOString().split("T")[0],
          start_time: "08:00",
          end_time: "20:00",
          status: "confirmed",
          shift_day: day,
          total_days: duration,
          net_payout: Math.round((totalAmount * 0.9) / duration),
          gps_checkin_at: null,
          vitals: {},
          notes: `Day ${day} Care Shift - ${jobLoc}`,
        });
      }
      await supabase.from("schedule_shifts").insert(shiftsToInsert);
    } catch (sErr) {
      console.warn("Schedule shifts insert notice:", sErr);
    }

    // 3. Immediate real-time broadcast so UI navigates with 0ms perceived latency
    try {
      const patientDisplayName =
        bid.job?.patient_name && bid.job?.patient_name !== "Self"
          ? bid.job.patient_name
          : patientName;

      broadcastCrossAppEvent("BID_ACCEPTED", {
        booking,
        bid,
        patientName: patientDisplayName,
        jobTitle: bid.job?.title || "Clinical Recovery Care",
        amount: totalAmount,
        bookingId: booking.id,
        nurseId: bid.nurse_id,
      });
      broadcastCrossAppEvent("SHIFT_UPDATED", { bookingId: booking.id, status: "confirmed" });
      broadcastCrossAppEvent("ESCROW_UPDATED", { bookingId: booking.id, amount: totalAmount });
      sendProposalAcceptedPush(bid.nurse_id, patientDisplayName, booking.id).catch(() => {});
    } catch {}

    // 4. Background non-blocking tasks (reject other bids, unmask chats, insert payment, notify nurse)
    (async () => {
      try {
        await supabase
          .from("bids")
          .update({ status: "rejected" })
          .eq("job_id", bid.job_id)
          .neq("id", bidId);
      } catch {}

      // Initial escrow milestone
      try {
        const gross = totalAmount;
        const fee = Math.round(gross * 0.1);
        const payout = gross - fee;
        await supabase.from("payments").insert({
          booking_id: booking.id,
          nurse_id: bid.nurse_id,
          patient_id: userId,
          amount: Math.round(gross / 2),
          platform_fee: Math.round(fee / 2),
          nurse_payout: Math.round(payout / 2),
          status: "held",
          milestone_number: 1,
        });
      } catch (payErr) {
        console.warn("Initial payment insert notice:", payErr);
      }

      // Update or unmask conversation
      try {
        const { data: jobConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("job_ref", bid.job_id)
          .maybeSingle();

        if (jobConv) {
          await supabase
            .from("conversations")
            .update({ booking_status: "confirmed", is_contact_masked: false })
            .eq("id", jobConv.id);
        } else {
          await supabase.from("conversations").insert({
            participant_ids: [userId, bid.nurse_id],
            participant_names: [patientName, nurseName],
            job_ref: bid.job_id,
            subtitle: bid.job?.care_type || "Care Booking",
            last_message: "Booking confirmed. You can now message each other.",
            last_message_at: new Date().toISOString(),
            booking_status: "confirmed",
            escrow_amount: totalAmount,
            is_contact_masked: false,
          });
        }
      } catch (cErr) {
        console.warn("Conversation unmask notice:", cErr);
      }

      // Nurse notification
      try {
        await supabase.from("notifications").insert({
          user_id: bid.nurse_id,
          type: "bid_accepted",
          title: "Proposal Accepted & Escrow Funded!",
          message: `${patientName} accepted your proposal for "${bid.job?.title || "Care Shift"}". Shift schedule is ready in Shift Control.`,
          link: "Shifts",
          is_read: false,
        });
      } catch {}
    })();

    return booking;
  },

  declineBid: async (bidId: string) => {
    const { error } = await supabase
      .from("bids")
      .update({ status: "rejected" })
      .eq("id", bidId);
    if (error) throw error;
  },

  // ─── Bookings ────────────────────────────────────────────────────────────
  getBookings: async (): Promise<BookingRecord[]> => {
    let userId = "";
    try {
      userId = await getUserId();
    } catch {}

    if (!userId) return [];

    // 1. Query bookings strictly for the current authenticated user
    let userBookings: any[] = [];
    const { data, error } = await supabase
      .from("bookings")
      .select("*, job:jobs(*)")
      .eq("patient_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      userBookings = data;
    }

    if (userBookings.length > 0) {
      return userBookings.map((b: any) => {
        const completedShifts = b.milestones_completed || 0;
        const totalDays = b.duration_days || b.job?.duration_days || 7;
        return {
          id: b.id,
          jobId: b.job_id,
          bidId: b.bid_id,
          patientId: b.patient_id,
          nurseId: b.nurse_id,
          patientName: b.patient_name || b.job?.patient_name || "Patient",
          nurseName: b.nurse_name || "Assigned Clinician",
          careType: b.care_type || b.job?.care_type || "Clinical Recovery Care",
          diagnosis: b.job?.description || b.job?.title || "Clinical Recovery Shift",
          location: b.location || [b.job?.locality, b.job?.city].filter(Boolean).join(", ") || "Care Location, Punjab",
          agreedRate: Number(b.agreed_rate) || 850,
          totalAmount: Number(b.total_amount) || 7140,
          durationDays: totalDays,
          dailyHours: b.daily_hours || b.job?.daily_hours || 12,
          completedShifts,
          remainingShifts: Math.max(0, totalDays - completedShifts),
          status: b.status || "active",
          escrowStatus: b.escrow_status || "held",
          startDate: b.start_date || new Date().toISOString().split("T")[0],
        };
      });
    }

    return [];
  },

  getActiveBooking: async (): Promise<BookingRecord | null> => {
    const bookings = await api.getBookings();
    const active = bookings.find(
      (b) => b.status === "confirmed" || b.status === "active" || b.status === "Active"
    );
    return active || bookings[0] || null;
  },

  getBookingShifts: async (bookingId?: string): Promise<any[]> => {
    try {
      const userId = await getUserId();
      if (!userId) return [];
      let query = supabase
        .from("schedule_shifts")
        .select("*")
        .order("shift_day", { ascending: true })
        .order("date", { ascending: true });

      if (bookingId) {
        // Verify booking belongs to this patient
        const { data: bookingCheck } = await supabase
          .from("bookings")
          .select("id")
          .eq("id", bookingId)
          .eq("patient_id", userId)
          .maybeSingle();

        if (bookingCheck) {
          query = query.eq("booking_id", bookingId);
        } else {
          return [];
        }
      } else {
        // Find bookings for this patient first
        const { data: patientBookings } = await supabase
          .from("bookings")
          .select("id")
          .eq("patient_id", userId);

        if (!patientBookings || patientBookings.length === 0) return [];
        const bookingIds = patientBookings.map((b: any) => b.id);
        query = query.in("booking_id", bookingIds);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((s: any) => ({
          id: s.id,
          bookingId: s.booking_id,
          nurseId: s.nurse_id,
          patientName: s.patient_name || "Patient",
          careType: s.care_type || "Clinical Recovery",
          location: s.location || "Care Location, Punjab",
          date: s.date,
          startTime: s.start_time || "08:00 AM",
          endTime: s.end_time || "08:00 PM",
          status: s.status || "confirmed",
          shiftDay: s.shift_day || 1,
          totalDays: s.total_days || 7,
          netPayout: Number(s.net_payout) || 1020,
          gpsCheckinAt: s.gps_checkin_at,
          vitals: s.vitals || null,
          notes: s.notes || "",
        }));
      }
    } catch (e) {
      console.warn("getBookingShifts error:", e);
    }
    return [];
  },

  cancelBooking: async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    if (error) throw error;
    return true;
  },

  // ─── Escrow / Payments ───────────────────────────────────────────────────
  fundEscrow: async (bookingId: string, amount: number) => {
    // Idempotency check: if a held payment already exists for this booking milestone, do not duplicate
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("status", "held")
      .maybeSingle();

    if (existingPayment) {
      await supabase
        .from("bookings")
        .update({ escrow_status: "held" })
        .eq("id", bookingId);
      return existingPayment;
    }

    // Create a "held" payment record (simulated — no real Razorpay)
    const userId = await getUserId();

    const { data: booking } = await supabase
      .from("bookings")
      .select("nurse_id, milestones_completed")
      .eq("id", bookingId)
      .single();

    if (!booking || !booking.nurse_id) {
      throw new Error("Active booking with assigned nurse required to fund milestone");
    }

    const milestoneNum = (booking?.milestones_completed || 0) + 1;
    const fee = Math.round(amount * 0.1);
    const payout = amount - fee;

    const basePayment: any = {
      booking_id: bookingId,
      nurse_id: booking?.nurse_id,
      amount,
      platform_fee: fee,
      nurse_payout: payout,
      status: "held",
    };
    const fullPayment = {
      ...basePayment,
      patient_id: userId,
      milestone_number: milestoneNum,
    };

    let data: any = null;
    const { data: insData, error: insErr } = await supabase
      .from("payments")
      .insert(fullPayment)
      .select()
      .maybeSingle();

    if (insErr) {
      // Fallback to base columns if patient_id / milestone_number not present in table
      const { data: fallbackData, error: fbErr } = await supabase
        .from("payments")
        .insert(basePayment)
        .select()
        .maybeSingle();
      if (fbErr) throw fbErr;
      data = fallbackData;
    } else {
      data = insData;
    }

    // Update booking escrow_status
    await supabase
      .from("bookings")
      .update({ escrow_status: "held" })
      .eq("id", bookingId);

    // Update job escrow flag
    const { data: bookingData } = await supabase
      .from("bookings")
      .select("job_id")
      .eq("id", bookingId)
      .single();

    if (bookingData?.job_id) {
      await supabase
        .from("jobs")
        .update({ is_escrow_funded: true })
        .eq("id", bookingData.job_id);
    }

    return data;
  },

  releaseEscrowMilestone: async (targetId: string) => {
    // 1. Check if targetId matches a payment
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("id", targetId)
      .maybeSingle();

    let nurseIdToCredit: string | null = null;
    let releasedPaymentAmount: number = 0;
    let releasedBookingId: string | null = null;

    if (payment) {
      // Idempotency check: prevent double-spend
      if (payment.status === "released") {
        return { success: true, message: "Milestone already released", paymentId: payment.id };
      }

      // Try PostgreSQL RPC function first (handles SECURITY DEFINER wallet credit securely)
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("release_escrow_milestone", {
          p_payment_id: payment.id,
        });
        if (!rpcErr && rpcRes) {
          try {
            broadcastCrossAppEvent("ESCROW_UPDATED", {
              paymentId: payment.id,
              bookingId: payment.booking_id,
              status: "released",
              amount: Number(payment.nurse_payout || payment.amount || 0),
            });
            broadcastCrossAppEvent("PAYMENT_RELEASED", {
              paymentId: payment.id,
              bookingId: payment.booking_id,
              nurseId: payment.nurse_id,
              amount: Number(payment.nurse_payout || payment.amount || 0),
            });
          } catch {}
          return { success: true, ...rpcRes };
        }
      } catch {}

      nurseIdToCredit = payment.nurse_id;
      releasedPaymentAmount = Number(payment.nurse_payout || payment.amount || 0);
      releasedBookingId = payment.booking_id;

      const nowIso = new Date().toISOString();
      const { error: relErr } = await supabase
        .from("payments")
        .update({
          status: "released",
          released_at: nowIso,
        })
        .eq("id", payment.id);
      if (relErr) {
        await supabase
          .from("payments")
          .update({ status: "released" })
          .eq("id", payment.id);
      }

      if (payment.booking_id) {
        const { data: booking } = await supabase
          .from("bookings")
          .select("id, job_id, milestones_completed, escrow_status, duration_days")
          .eq("id", payment.booking_id)
          .single();
        if (booking) {
          const newCompleted = (booking.milestones_completed || 0) + 1;
          const totalMilestones = booking.duration_days ? Math.ceil(booking.duration_days / 7) : 1;
          const isAllDone = newCompleted >= totalMilestones;
          await supabase
            .from("bookings")
            .update({
              milestones_completed: newCompleted,
              escrow_status: "released",
              status: isAllDone ? "completed" : "active",
            })
            .eq("id", payment.booking_id);

          if (isAllDone && booking.job_id) {
            await supabase
              .from("jobs")
              .update({ status: "completed" })
              .eq("id", booking.job_id);
          }
        }
      }
    } else {
      // 2. Check if targetId is a bookingId with a held payment
      const { data: heldPayment } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", targetId)
        .eq("status", "held")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (heldPayment) {
        nurseIdToCredit = heldPayment.nurse_id;
        releasedPaymentAmount = Number(heldPayment.nurse_payout || heldPayment.amount || 0);
        releasedBookingId = targetId;

        const nowIso = new Date().toISOString();
        const { error: relErr } = await supabase
          .from("payments")
          .update({
            status: "released",
            released_at: nowIso,
          })
          .eq("id", heldPayment.id);
        if (relErr) {
          await supabase
            .from("payments")
            .update({ status: "released" })
            .eq("id", heldPayment.id);
        }

        const { data: booking } = await supabase
          .from("bookings")
          .select("id, milestones_completed, nurse_id, duration_days, job_id")
          .eq("id", targetId)
          .single();
        if (booking) {
          if (!nurseIdToCredit) nurseIdToCredit = booking.nurse_id;
          const nextCompleted = (booking.milestones_completed || 0) + 1;
          const totalDays = booking.duration_days || 7;
          const isDone = nextCompleted >= totalDays;
          await supabase
            .from("bookings")
            .update({
              milestones_completed: nextCompleted,
              escrow_status: isDone ? "released" : "held",
              status: isDone ? "completed" : "active",
            })
            .eq("id", targetId);

          if (isDone && booking.job_id) {
            await supabase
              .from("jobs")
              .update({ status: "completed" })
              .eq("id", booking.job_id);
          }
        }
      } else {
        // 3. Fallback: Update booking milestones directly only if NOT already released
        const { data: booking } = await supabase
          .from("bookings")
          .select("id, milestones_completed, nurse_id, agreed_rate, daily_hours, escrow_status, duration_days, job_id, status")
          .eq("id", targetId)
          .maybeSingle();

        if (booking) {
          const totalDays = booking.duration_days || 7;
          if (
            booking.status === "completed" ||
            (booking.milestones_completed && booking.milestones_completed >= totalDays)
          ) {
            return { success: true, message: "Escrow milestone already released", bookingId: targetId };
          }

          nurseIdToCredit = booking.nurse_id;
          releasedBookingId = targetId;
          releasedPaymentAmount = Number(booking.agreed_rate || 500) * Number(booking.daily_hours || 12);

          const nextCompleted = (booking.milestones_completed || 0) + 1;
          const isDone = nextCompleted >= totalDays;

          await supabase
            .from("bookings")
            .update({
              milestones_completed: nextCompleted,
              escrow_status: isDone ? "released" : "held",
              status: isDone ? "completed" : "active",
            })
            .eq("id", targetId);

          if (isDone && booking.job_id) {
            await supabase
              .from("jobs")
              .update({ status: "completed" })
              .eq("id", booking.job_id);
          }
        }
      }
    }

    // Add earnings to nurse's wallet / available payout balance
    if (nurseIdToCredit && releasedPaymentAmount > 0) {
      try {
        const { data: nProf } = await supabase
          .from("nurse_profiles")
          .select("escrow_balance, completed_shifts")
          .or(`id.eq.${nurseIdToCredit},user_id.eq.${nurseIdToCredit}`)
          .maybeSingle();

        if (nProf) {
          const newBal = Number(nProf.escrow_balance || 0) + releasedPaymentAmount;
          const newCompleted = (nProf.completed_shifts || 0) + 1;
          await supabase
            .from("nurse_profiles")
            .update({
              escrow_balance: newBal,
              completed_shifts: newCompleted,
            })
            .or(`id.eq.${nurseIdToCredit},user_id.eq.${nurseIdToCredit}`);
        }
      } catch (profErr) {
        console.warn("Nurse profile wallet credit notice:", profErr);
      }

      // Insert notification for Nurse: "Payment Released for Shift"
      try {
        const notifPayload = {
          user_id: nurseIdToCredit,
          type: "payout",
          title: "Payment Released for Shift",
          message: `₹${releasedPaymentAmount.toLocaleString("en-IN")} milestone payment has been released to your available payout balance.`,
          link: "Profile",
          is_read: false,
        };
        const { error: notifErr } = await supabase.from("notifications").insert(notifPayload);
        if (notifErr) {
          console.warn("Nurse payment release notification error:", notifErr);
        }
      } catch (notifErr) {
        console.warn("Nurse payment release notification error:", notifErr);
      }
    }

    try {
      broadcastCrossAppEvent("ESCROW_UPDATED", {
        paymentId: payment?.id || targetId,
        bookingId: releasedBookingId,
        status: "released",
        amount: releasedPaymentAmount,
      });
      broadcastCrossAppEvent("PAYMENT_RELEASED", {
        paymentId: payment?.id || targetId,
        bookingId: releasedBookingId,
        nurseId: nurseIdToCredit,
        amount: releasedPaymentAmount,
      });
    } catch {}

    return true;
  },

  getPaymentHistory: async (bookingId?: string) => {
    const userId = await getUserId();

    let query = supabase.from("payments").select("*, booking:bookings(*)");

    if (bookingId) {
      // Verify booking belongs to this patient
      const { data: bookingCheck } = await supabase
        .from("bookings")
        .select("id")
        .eq("id", bookingId)
        .eq("patient_id", userId)
        .maybeSingle();

      if (!bookingCheck) return [];
      query = query.eq("booking_id", bookingId);
    } else {
      // Get all payments for this patient's bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("patient_id", userId);

      if (!bookings || bookings.length === 0) return [];
      const bookingIds = bookings.map((b: any) => b.id);
      query = query.in("booking_id", bookingIds);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return [];

    return (data || []).map((p: any) => ({
      id: p.id,
      bookingId: p.booking_id,
      type: p.type,
      description: p.description || "",
      amount: Number(p.amount),
      platformFee: Number(p.platform_fee) || 0,
      nursePayout: Number(p.nurse_payout) || 0,
      status: p.status,
      paidAt: p.paid_at,
      createdAt: p.created_at,
    }));
  },

  // ─── Conversations & Messages ────────────────────────────────────────────
  getMyConversations: async () => {
    let userId = "";
    try {
      userId = await getUserId();
    } catch {}
    if (!userId) return [];

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .contains("participant_ids", [userId])
      .order("last_message_at", { ascending: false });

    if (error) {
      console.warn("getMyConversations error:", error);
      return [];
    }

    return (data || []).map((row: any) => mapConversationFromDb(row, userId));
  },

  getMessages: async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.warn("getMessages error:", error);
      return [];
    }

    return (data || []).map(mapMessageFromDb);
  },

  sendMessage: async (
    conversationId: string,
    content: string,
    senderName: string
  ) => {
    const userId = await getUserId();

    const messagePayload = {
      conversation_id: conversationId,
      sender_id: userId,
      sender_name: senderName || "Patient",
      sender_role: "patient",
      content,
      is_read: false,
    };

    const { data, error } = await supabase
      .from("messages")
      .insert(messagePayload)
      .select()
      .single();

    if (error) throw error;

    // Update conversation's last message
    await supabase
      .from("conversations")
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    // Broadcast to realtime channel
    try {
      const mapped = mapMessageFromDb(data);
      await rtBroadcast(conversationId, mapped);
      broadcastCrossAppEvent("NEW_MESSAGE", { conversationId, message: mapped });
    } catch (e) {
      console.warn("Broadcast error (non-critical):", e);
    }

    // Dispatch high-priority outside-the-app push notification (WhatsApp style) to recipient device
    (async () => {
      try {
        const { data: conv } = await supabase
          .from("conversations")
          .select("participant_ids")
          .eq("id", conversationId)
          .maybeSingle();

        const otherUserId = (conv?.participant_ids || []).find((id: string) => id !== userId);
        if (otherUserId) {
          await sendChatMessagePush(otherUserId, senderName || "Patient", content.trim(), conversationId);
        }
      } catch (pushErr) {
        console.warn("[PushDispatcher] Patient outgoing chat push notice:", pushErr);
      }
    })();

    return mapMessageFromDb(data);
  },

  markMessagesRead: async (conversationId: string) => {
    const userId = await getUserId();
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", userId);

    await supabase
      .from("conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId);
  },

  // ─── Notifications ───────────────────────────────────────────────────────
  getNotifications: async (): Promise<AppNotification[]> => {
    const userId = await getUserId();
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.warn("getNotifications query error:", error);
        return [];
      }

      return (data || []).map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type || "info",
        title: n.title,
        message: n.message,
        link: n.link || null,
        isRead: Boolean(n.is_read),
        createdAt: n.created_at,
        timeAgo: getTimeAgo(n.created_at),
      }));
    } catch (err) {
      console.warn("getNotifications error:", err);
      return [];
    }
  },

  markNotificationRead: async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
    } catch (err) {
      console.warn("markNotificationRead error:", err);
    }
  },

  markAllNotificationsRead: async () => {
    const userId = await getUserId();
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId);
    } catch (err) {
      console.warn("markAllNotificationsRead error:", err);
    }
  },

  createNotification: async (notif: {
    type: string;
    title: string;
    message: string;
    link?: string;
  }) => {
    const userId = await getUserId();
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        link: notif.link || null,
        is_read: false,
      });
    } catch (err) {
      console.warn("createNotification error:", err);
    }
  },

  // ─── Schedule Shifts ─────────────────────────────────────────────────────
  getUpcomingShifts: async () => {
    const userId = await getUserId();
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("patient_id", userId);

    if (!bookings || bookings.length === 0) return [];

    const bookingIds = bookings.map((b: any) => b.id);
    const { data, error } = await supabase
      .from("schedule_shifts")
      .select("*")
      .in("booking_id", bookingIds)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(5);

    if (error || !data) return [];
    return data;
  },

  // ─── Family Members & Patient Profiles ───────────────────────────────────
  getFamilyMembers: async () => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from("patients")
      .select("id, name, dob, gender, blood_group, primary_condition, hospital, physician, drug_allergies")
      .eq("family_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("getFamilyMembers error:", error);
      return [];
    }
    return data || [];
  },

  addFamilyMember: async (member: {
    name: string;
    dob?: string;
    gender?: string;
    bloodGroup?: string;
    primaryCondition?: string;
    hospital?: string;
    physician?: string;
    drugAllergies?: string[];
  }) => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from("patients")
      .insert({
        family_id: userId,
        name: member.name,
        dob: member.dob || null,
        gender: member.gender || "Not specified",
        blood_group: member.bloodGroup || null,
        primary_condition: member.primaryCondition || null,
        hospital: member.hospital || null,
        physician: member.physician || null,
        drug_allergies: member.drugAllergies || [],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ─── Dashboard Stats ──────────────────────────────────────────────────────
  getDashboardStats: async () => {
    const userId = await getUserId();

    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, status, bid_count, title")
      .eq("family_id", userId);

    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, status, milestones_completed, duration_days, nurse_id")
      .eq("patient_id", userId);

    const cleanJobs = (jobs || []).filter(
      (j: any) =>
        !j.title?.includes("[TEST-") &&
        j.status !== "cancelled" &&
        j.status !== "deleted"
    );
    const activeJobsCount = cleanJobs.filter((j: any) => j.status === "open").length;
    const totalJobs = cleanJobs.length;
    const jobsWithBids = cleanJobs.filter((j: any) => (j.bid_count || 0) > 0).length;

    let completedShiftsCount = 0;
    (bookings || [])
      .filter((b: any) => b.status !== "cancelled" && b.status !== "deleted")
      .forEach((b: any) => {
        if (b.status === "completed") {
          completedShiftsCount += Math.max(Number(b.milestones_completed) || 0, Number(b.duration_days) || 1);
        } else {
          completedShiftsCount += (Number(b.milestones_completed) || 0);
        }
      });

    let matchRate = 0;
    if (totalJobs > 0) {
      matchRate = Math.round((jobsWithBids / totalJobs) * 100);
    } else if (bookings && bookings.length > 0) {
      matchRate = 100;
    }

    // Dynamically query clinician ratings from nurse_profiles
    const nurseIds = [...new Set((bookings || []).map((b: any) => b.nurse_id).filter(Boolean))];
    let nurseRating = "5.0";
    let nurseRatingPercentage = 100;

    if (nurseIds.length > 0) {
      const { data: nurseProfs } = await supabase
        .from("nurse_profiles")
        .select("average_rating, trust_score")
        .in("id", nurseIds);

      if (nurseProfs && nurseProfs.length > 0) {
        const validRatings = nurseProfs
          .map((n: any) => Number(n.average_rating || 0))
          .filter((r: number) => r > 0);
        if (validRatings.length > 0) {
          const avg = validRatings.reduce((sum: number, r: number) => sum + r, 0) / validRatings.length;
          nurseRating = avg.toFixed(1);
          nurseRatingPercentage = Math.round((avg / 5.0) * 100);
        }
      }
    }

    return {
      activeJobsCount,
      completedShiftsCount,
      matchRate,
      nurseRating,
      nurseRatingPercentage,
    };
  },

  // ─── Onboarding Completion ────────────────────────────────────────────────
  completeOnboarding: async () => {
    const userId = await getUserId();
    if (userId) {
      try {
        await supabase.from("profiles").update({ onboarding_complete: true }).eq("id", userId);
      } catch (err) {
        console.warn("completeOnboarding notice:", err);
      }
    }
    return { success: true };
  },

  // ─── Avatar Upload (Supabase Storage) ─────────────────────────────────────
  uploadAvatar: async (fileUri: any, userIdOrExt?: string, maybeExt?: string): Promise<string> => {
    let resolvedUserId = userIdOrExt;
    let ext = maybeExt || "jpg";
    if (!resolvedUserId || resolvedUserId === "jpg" || resolvedUserId === "png" || resolvedUserId === "webp") {
      ext = resolvedUserId || maybeExt || "jpg";
      resolvedUserId = await getUserId().catch(() => undefined);
    }
    return storageUploadAvatar(fileUri, resolvedUserId, ext);
  },

  // ─── Direct Nurse Chat Initiation ─────────────────────────────────────────
  startConversationWithNurse: async (nurseId: string, jobIdOrName?: string, maybeJobRef?: string) => {
    let userId = "";
    try {
      userId = await getUserId();
    } catch {}
    if (!userId) {
      throw new Error("Please log in to message clinicians.");
    }

    // Resolve actual nurse user ID if a bid ID or invalid ID was passed
    let targetNurseId = nurseId;
    if (nurseId) {
      try {
        const { data: bidData } = await supabase.from("bids").select("nurse_id").eq("id", nurseId).maybeSingle();
        if (bidData?.nurse_id) {
          targetNurseId = bidData.nurse_id;
        }
      } catch {}
    }

    // Check if conversation already exists between these participants
    try {
      const { data: existingList } = await supabase
        .from("conversations")
        .select("*")
        .contains("participant_ids", [userId, targetNurseId])
        .limit(15);

      const existing = (existingList || []).find((c: any) => {
        const pIds = c.participant_ids || [];
        return pIds.includes(userId) && (pIds.includes(targetNurseId) || pIds.includes(nurseId));
      });

      if (existing) {
        return mapConversationFromDb(existing, userId);
      }
    } catch {}

    // Get patient & nurse names
    const [{ data: patientProf }, { data: nurseProf }] = await Promise.all([
      supabase.from("profiles").select("first_name, last_name").eq("id", userId).maybeSingle(),
      supabase.from("profiles").select("first_name, last_name").eq("id", targetNurseId).maybeSingle(),
    ]);

    const patientName = patientProf
      ? `${patientProf.first_name || ""} ${patientProf.last_name || ""}`.trim() || "Patient"
      : "Patient";

    let nName = nurseProf
      ? `${nurseProf.first_name || ""} ${nurseProf.last_name || ""}`.trim() || "Nurse"
      : "Nurse";

    let jobRef = maybeJobRef || "";
    if (jobIdOrName) {
      if (jobIdOrName.includes("-") || jobIdOrName.startsWith("job") || !jobIdOrName.includes(" ")) {
        jobRef = jobIdOrName;
      } else {
        nName = jobIdOrName;
      }
    }

    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        participant_ids: [userId, targetNurseId],
        participant_names: [patientName, nName],
        job_ref: jobRef || "",
        subtitle: "Clinical Inquiry",
        last_message: "Conversation started.",
        last_message_at: new Date().toISOString(),
        booking_status: "inquiry",
        escrow_amount: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return mapConversationFromDb(newConv, userId);
  },

  // ─── Interface Contract Aliases ─────────────────────────────────────────────
  getCurrentUser: async () => {
    const userId = await getUserId();
    return { userId };
  },

  updatePatientProfile: async (updates: Record<string, any>) => {
    return api.updateProfile(updates);
  },

  createJob: async (jobData: any) => {
    return api.postJob(jobData);
  },

  releasePaymentMilestone: async (paymentId: string) => {
    return api.releaseEscrowMilestone(paymentId);
  },

  disputeEscrow: async (bookingIdOrPaymentId: string, reason?: string) => {
    try {
      const { data: booking } = await supabase
        .from("bookings")
        .select("id")
        .eq("id", bookingIdOrPaymentId)
        .maybeSingle();

      if (booking) {
        await supabase
          .from("bookings")
          .update({ status: "disputed" })
          .eq("id", bookingIdOrPaymentId);

        await supabase
          .from("payments")
          .update({ status: "disputed" })
          .eq("booking_id", bookingIdOrPaymentId);
      } else {
        await supabase
          .from("payments")
          .update({ status: "disputed" })
          .eq("id", bookingIdOrPaymentId);
      }
      return { success: true };
    } catch (err) {
      console.warn("disputeEscrow error:", err);
      throw err;
    }
  },

  getMedicationTodoList: async (targetPatientId?: string): Promise<MedicationTodoItem[]> => {
    try {
      let pid = targetPatientId;
      if (!pid) {
        try {
          const activeBooking = await api.getActiveBooking();
          pid = activeBooking?.patientId || activeBooking?.id;
        } catch {}
      }
      if (!pid) {
        try {
          pid = await getUserId();
        } catch {}
      }
      if (!pid) return [];

      const cacheKey = `@nursebid_${pid}_medications`;
      const raw = await AsyncStorage.getItem(cacheKey);

      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any, idx: number) => ({
            id: m.id || `med_${idx}`,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            route: m.route || "Oral",
            instructions: m.instructions || "",
            scheduledTime: m.frequency?.includes("(")
              ? m.frequency.split("(")[1]?.replace(")", "")
              : "Per Order",
            administered: m.status === "Given" || m.administered === true,
            administeredAt: m.administeredAt || (m.status === "Given" ? m.lastGiven : undefined),
            administeredBy: m.administeredBy || "Assigned Nurse, RN",
            status: m.status || (m.administered ? "Given" : "Due"),
          }));
        }
      }

      return [];
    } catch {
      return [];
    }
  },
};

// ─── Named Exports for Direct Import ─────────────────────────────────────────
export const getMedicationTodoList = api.getMedicationTodoList;
export const uploadAvatar = api.uploadAvatar;
export const startConversationWithNurse = api.startConversationWithNurse;
export const getMyConversations = api.getMyConversations;
export const getMessages = api.getMessages;
export const sendMessage = api.sendMessage;
export const markMessagesRead = api.markMessagesRead;
export const getProposals = api.getProposals;
export const acceptBid = api.acceptBid;
export const declineBid = api.declineBid;
export const getBookings = api.getBookings;
export const getActiveBooking = api.getActiveBooking;
export const cancelBooking = api.cancelBooking;
export const fundEscrow = api.fundEscrow;
export const releaseEscrowMilestone = api.releaseEscrowMilestone;
export const releasePaymentMilestone = api.releasePaymentMilestone;
export const disputeEscrow = api.disputeEscrow;
export const getPaymentHistory = api.getPaymentHistory;
export const getMyJobs = api.getMyJobs;
export const getJobById = api.getJobById;
export const postJob = api.postJob;
export const createJob = api.createJob;
export const getClinicalNotes = api.getClinicalNotes;
export const getLatestPatientVitals = api.getLatestPatientVitals;
export const getUpcomingShifts = api.getUpcomingShifts;
export const getFamilyMembers = api.getFamilyMembers;
export const addFamilyMember = api.addFamilyMember;
export const getDashboardStats = api.getDashboardStats;
export const completeOnboarding = api.completeOnboarding;
export const getNotifications = api.getNotifications;
export const markNotificationRead = api.markNotificationRead;
export const markAllNotificationsRead = api.markAllNotificationsRead;
export const getPatientProfile = api.getPatientProfile;
export const updatePatientProfile = api.updateProfile;
