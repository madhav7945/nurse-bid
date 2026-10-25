// ═══════════════════════════════════════════════════════════════════════════════
// usePatients Hook — Patient roster and clinical management
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { PatientRecord } from "../types";
import { subscribeToCrossAppEvents } from "../lib/realtime";

export function usePatients() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await api.getPatients();
      setPatients(data || []);
    } catch (err: any) {
      const msg = err?.message || "Failed to load patient roster";
      setError(msg);
      console.warn("usePatients error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();

    const unsub = subscribeToCrossAppEvents((event) => {
      if (
        event.type === "BOOKING_ACCEPTED" ||
        event.type === "SHIFT_UPDATED" ||
        event.type === "VITALS_LOGGED"
      ) {
        loadPatients(true);
      }
    });

    return () => {
      unsub();
    };
  }, [loadPatients]);

  const administerMedication = useCallback(
    async (patientId: string, medName: string, dosage: string, route: string) => {
      try {
        const res = await api.logMedicationAdministered(patientId, medName, dosage, route);
        await loadPatients(true);
        return res;
      } catch (err: any) {
        console.error("administerMedication error:", err);
        throw err;
      }
    },
    [loadPatients]
  );

  return {
    patients,
    loading,
    refreshing,
    error,
    refresh: () => loadPatients(true),
    reload: () => loadPatients(false),
    administerMedication,
  };
}
