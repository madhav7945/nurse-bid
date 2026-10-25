// ═══════════════════════════════════════════════════════════════════════════════
// Jobs API Service — Patient Job Creation & Management
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "../lib/supabase";
import { broadcastCrossAppEvent } from "../lib/realtime";
import { JobRecord } from "../types";

export const patientJobsService = {
  /**
   * Fetch all care jobs created by the current patient user
   */
  getMyJobs: async (userId: string): Promise<JobRecord[]> => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("patient_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      return data.map((j: any) => ({
        id: j.id,
        patientName: j.patient_name || "Patient",
        title: j.title || `${j.care_type || "Care"} Request`,
        description: j.description || "",
        careType: j.care_type || "General Nursing",
        urgency: j.urgency || "standard",
        budgetMin: Number(j.budget_min || 1200),
        budgetMax: Number(j.budget_max || 1800),
        city: j.city || "Jalandhar",
        locality: j.locality || "Model Town",
        shiftModel: j.shift_model || `${j.daily_hours || 12}h Shift`,
        startDate: j.start_date || new Date().toISOString().split("T")[0],
        durationDays: Number(j.duration_days || 7),
        dailyHours: Number(j.daily_hours || 12),
        status: j.status || "open",
        bidCount: Number(j.bid_count || 0),
        isEscrowFunded: Boolean(j.is_escrow_funded),
        isVerifiedPatient: Boolean(j.is_verified_patient),
        checklist: Array.isArray(j.checklist) ? j.checklist : [],
        createdAt: j.created_at,
      }));
    } catch (err) {
      console.error("patientJobsService.getMyJobs error:", err);
      throw err;
    }
  },

  /**
   * Delete a care job posting
   */
  deleteJob: async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", jobId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("patientJobsService.deleteJob error:", err);
      throw err;
    }
  },
};
