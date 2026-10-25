// ═══════════════════════════════════════════════════════════════════════════════
// useShifts Hook — Clinical shifts state, realtime synchronization, and operations
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { ClinicalShift, ShiftVitals } from "../types";
import { subscribeToCrossAppEvents } from "../lib/realtime";

export function useShifts() {
  const [shifts, setShifts] = useState<ClinicalShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadShifts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await api.getShifts();
      setShifts(data || []);
    } catch (err: any) {
      const msg = err?.message || "Failed to load clinical shifts";
      setError(msg);
      console.warn("useShifts load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadShifts();

    const unsub = subscribeToCrossAppEvents((event) => {
      if (
        event.type === "BOOKING_ACCEPTED" ||
        event.type === "SHIFT_UPDATE" ||
        event.type === "BID_ACCEPTED" ||
        event.type === "SHIFT_UPDATED" ||
        event.type === "VITALS_LOGGED"
      ) {
        loadShifts(true);
      }
    });

    return () => {
      unsub();
    };
  }, [loadShifts]);

  const clockIn = useCallback(async (shiftId: string, latOrCoords?: any, lng?: number | string) => {
    try {
      const res = await api.clockInShift(shiftId, latOrCoords, lng);
      await loadShifts(true);
      return res;
    } catch (err: any) {
      console.error("clockIn error:", err);
      throw err;
    }
  }, [loadShifts]);

  const clockOut = useCallback(async (shiftId: string, handoverNote?: string) => {
    try {
      const res = await api.clockOutShift(shiftId, handoverNote);
      await loadShifts(true);
      return res;
    } catch (err: any) {
      console.error("clockOut error:", err);
      throw err;
    }
  }, [loadShifts]);

  const logVitals = useCallback(async (shiftId: string, vitals: ShiftVitals) => {
    try {
      const res = await api.logShiftVitals(shiftId, vitals);
      await loadShifts(true);
      return res;
    } catch (err: any) {
      console.error("logVitals error:", err);
      throw err;
    }
  }, [loadShifts]);

  return {
    shifts,
    loading,
    refreshing,
    error,
    refresh: () => loadShifts(true),
    reload: () => loadShifts(false),
    clockIn,
    clockOut,
    logVitals,
  };
}
