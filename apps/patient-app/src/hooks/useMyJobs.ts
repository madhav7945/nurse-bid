// ═══════════════════════════════════════════════════════════════════════════════
// useMyJobs Hook — Patient jobs management and realtime synchronization
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { JobRecord } from "../types";
import { subscribeToCrossAppEvents } from "../lib/realtime";

export function useMyJobs() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await api.getMyJobs();
      setJobs(data || []);
    } catch (err: any) {
      const msg = err?.message || "Failed to load patient jobs";
      setError(msg);
      console.warn("useMyJobs error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();

    const unsub = subscribeToCrossAppEvents((event) => {
      if (
        event.type === "NEW_JOB" ||
        event.type === "JOB_POSTED" ||
        event.type === "BID_ACCEPTED" ||
        event.type === "BOOKING_ACCEPTED"
      ) {
        loadJobs(true);
      }
    });

    return () => {
      unsub();
    };
  }, [loadJobs]);

  const deleteJob = useCallback(
    async (jobId: string) => {
      try {
        await api.deleteJob(jobId);
        await loadJobs(true);
      } catch (err: any) {
        console.error("deleteJob error:", err);
        throw err;
      }
    },
    [loadJobs]
  );

  return {
    jobs,
    loading,
    refreshing,
    error,
    refresh: () => loadJobs(true),
    reload: () => loadJobs(false),
    deleteJob,
  };
}
