// ═══════════════════════════════════════════════════════════════════════════════
// useVitals Hook — Patient clinical vitals with polling & realtime sync
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { PatientVitals } from "../types";
import { subscribeToCrossAppEvents } from "../lib/realtime";

export function useVitals() {
  const [vitals, setVitals] = useState<PatientVitals | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVitals = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await api.getLatestPatientVitals();
      setVitals(data || null);
    } catch (err: any) {
      const msg = err?.message || "Failed to load patient vitals";
      setError(msg);
      console.warn("useVitals error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVitals();

    const unsub = subscribeToCrossAppEvents((event) => {
      if (event.type === "VITALS_LOGGED" || event.type === "SHIFT_UPDATED") {
        loadVitals(true);
      }
    });

    return () => {
      unsub();
    };
  }, [loadVitals]);

  return {
    vitals,
    loading,
    refreshing,
    error,
    refresh: () => loadVitals(true),
    reload: () => loadVitals(false),
  };
}
