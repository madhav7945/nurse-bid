// ═══════════════════════════════════════════════════════════════════════════════
// Bookings & Escrow API Service — Patient Bookings & Escrow Protection
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "../lib/supabase";
import { broadcastCrossAppEvent } from "../lib/realtime";
import { BookingRecord } from "../types";

export const patientBookingsService = {
  /**
   * Fetch all bookings associated with the patient
   */
  getBookings: async (userId: string): Promise<BookingRecord[]> => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, nurse_profiles(*)")
        .eq("patient_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      return data.map((b: any) => ({
        id: b.id,
        jobId: b.job_id,
        bidId: b.bid_id,
        patientId: b.patient_id,
        nurseId: b.nurse_id,
        patientName: b.patient_name || "Patient",
        nurseName: b.nurse_profiles?.full_name || "Nurse Specialist",
        careType: b.care_type || "Critical Nursing",
        diagnosis: b.diagnosis || "Post-Operative Recovery",
        location: b.location || "Model Town, Jalandhar",
        agreedRate: Number(b.agreed_rate || 1800),
        totalAmount: Number(b.total_amount || 12600),
        durationDays: Number(b.duration_days || 7),
        dailyHours: Number(b.daily_hours || 12),
        completedShifts: Number(b.completed_shifts || 0),
        remainingShifts: Math.max(0, Number(b.duration_days || 7) - Number(b.completed_shifts || 0)),
        status: b.status || "active",
        escrowStatus: b.escrow_status || "funded",
        startDate: b.start_date || new Date().toISOString().split("T")[0],
      }));
    } catch (err) {
      console.error("patientBookingsService.getBookings error:", err);
      throw err;
    }
  },

  /**
   * Fund escrow for a booking confirmation
   */
  fundEscrow: async (bookingId: string, amount: number) => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .update({
          escrow_status: "funded",
          status: "confirmed",
        })
        .eq("id", bookingId)
        .select()
        .single();

      if (error) throw error;

      broadcastCrossAppEvent("ESCROW_FUNDED", { bookingId, amount });

      return data;
    } catch (err) {
      console.error("patientBookingsService.fundEscrow error:", err);
      throw err;
    }
  },

  /**
   * Release escrow milestone payment to clinician
   */
  releaseEscrowMilestone: async (paymentId: string) => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .update({ status: "released" })
        .eq("id", paymentId)
        .select()
        .single();

      if (error) throw error;

      broadcastCrossAppEvent("MILESTONE_RELEASED", { paymentId });

      return data;
    } catch (err) {
      console.error("patientBookingsService.releaseEscrowMilestone error:", err);
      throw err;
    }
  },
};
