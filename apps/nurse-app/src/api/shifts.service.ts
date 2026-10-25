// ═══════════════════════════════════════════════════════════════════════════════
// Shifts API Service — Canonical delegate to src/lib/api.ts
// ═══════════════════════════════════════════════════════════════════════════════

import { api } from "../lib/api";
import { ShiftRecord, ShiftVitals } from "../types";

export const shiftsService = {
  getShifts: async (): Promise<ShiftRecord[]> => {
    return api.getShifts() as any;
  },

  clockIn: async (shiftId: string, lat?: number, lng?: number) => {
    return api.clockInShift(shiftId, lat, lng);
  },

  logVitals: async (shiftId: string, vitals: ShiftVitals) => {
    return api.logShiftVitals(shiftId, vitals);
  },
};
