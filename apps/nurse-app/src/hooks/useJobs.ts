// ═══════════════════════════════════════════════════════════════════════════════
// useJobs Hook — Encapsulates job listing, realtime sync, and filtering
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../lib/api";
import { ClinicalJob } from "../types";
import { subscribeToCrossAppEvents, subscribeToJobs } from "../lib/realtime";

export interface UseJobsOptions {
  activeFilter?: string;
  selectedCareType?: string;
  searchQuery?: string;
}

export function useJobs(options: UseJobsOptions = {}) {
  const { activeFilter = "All Roles", selectedCareType = "All", searchQuery = "" } = options;
  const [jobs, setJobs] = useState<ClinicalJob[]>([]);
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
      const data = await api.getJobs();
      setJobs(data || []);
    } catch (err: any) {
      const msg = err?.message || "Failed to load clinical jobs";
      setError(msg);
      console.error("useJobs error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();

    const unsubJobs = subscribeToJobs(() => {
      loadJobs(true);
    });

    const unsubCrossApp = subscribeToCrossAppEvents((event) => {
      if (event.type === "NEW_JOB" || event.type === "JOB_POSTED") {
        loadJobs(true);
      }
    });

    return () => {
      unsubJobs?.();
      unsubCrossApp?.();
    };
  }, [loadJobs]);

  const filteredJobs = useMemo(() => {
    const list = jobs.filter((job) => {
      if (activeFilter === "Urgent" && job.urgency !== "Urgent" && job.urgency !== "Emergency") {
        return false;
      }
      if (activeFilter === "Standard" && job.urgency !== "Standard") {
        return false;
      }
      if (selectedCareType !== "All") {
        const normalize = (s: string) => s.toLowerCase().replace(/[-_]/g, " ").trim();
        const target = normalize(selectedCareType);
        const matchCare = normalize(job.careType || "").includes(target);
        const matchTitle = normalize(job.title || "").includes(target);
        if (!matchCare && !matchTitle) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = `${job.title} ${job.careType} ${job.city} ${job.locality} ${job.description} ${job.patientName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [jobs, activeFilter, selectedCareType, searchQuery]);

  return {
    jobs,
    filteredJobs,
    loading,
    refreshing,
    error,
    refresh: () => loadJobs(true),
    reload: () => loadJobs(false),
  };
}
