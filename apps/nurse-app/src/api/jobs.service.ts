// ═══════════════════════════════════════════════════════════════════════════════
// Jobs API Service — Canonical delegate to src/lib/api.ts
// ═══════════════════════════════════════════════════════════════════════════════

import { api } from "../lib/api";
import { ClinicalJob, BidRecord } from "../types";

export const jobsService = {
  getJobs: async (): Promise<ClinicalJob[]> => {
    return api.getJobs() as any;
  },

  submitBid: async (
    jobId: string,
    ratePerHour: number,
    coverNote: string,
    hours = 168
  ): Promise<BidRecord> => {
    return api.submitBid(jobId, ratePerHour, coverNote, hours);
  },
};
