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
      if (
        event.type === "NEW_JOB" ||
        event.type === "JOB_POSTED" ||
        event.type === "BID_ACCEPTED" ||
        event.type === "SHIFT_UPDATED"
      ) {
        // Instant removal of confirmed job from Radar screen
        if (event.type === "BID_ACCEPTED") {
          const confirmedJobId = event.payload?.jobId || event.payload?.bid?.job_id || event.payload?.booking?.job_id;
          if (confirmedJobId) {
            setJobs((prev) => prev.filter((j) => j.id !== confirmedJobId));
          }
        }
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
        const normalize = (s: string) => s.toLowerCase().replace(/[-_&]/g, " ").trim();
        const target = normalize(selectedCareType);
        const care = normalize(job.careType || "");
        const title = normalize(job.title || "");
        const desc = normalize(job.description || "");

        let matches = care.includes(target) || title.includes(target);

        // Smart Clinical Category Matching — connects patient-posted categories with nurse filter pills
        if (!matches) {
          if (target.includes("critical")) {
            matches =
              care.includes("icu") ||
              care.includes("critical") ||
              title.includes("icu") ||
              title.includes("critical") ||
              title.includes("cardiac") ||
              job.urgency === "Emergency" ||
              job.urgency === "Urgent";
          } else if (target.includes("post surgical") || target.includes("surgical")) {
            matches =
              care.includes("surg") ||
              care.includes("cabg") ||
              care.includes("laparotomy") ||
              care.includes("ortho") ||
              care.includes("recovery") ||
              title.includes("surg") ||
              title.includes("post-op") ||
              title.includes("recovery");
          } else if (target.includes("tracheo") || target.includes("trach")) {
            matches =
              care.includes("trach") ||
              care.includes("respiratory") ||
              care.includes("bipap") ||
              care.includes("cpap") ||
              care.includes("ventilator") ||
              title.includes("trach") ||
              desc.includes("tracheostomy") ||
              desc.includes("suctioning");
          } else if (target.includes("elderly") || target.includes("geriatric")) {
            matches =
              care.includes("elder") ||
              care.includes("geriatric") ||
              care.includes("dementia") ||
              care.includes("bedridden") ||
              care.includes("senior") ||
              title.includes("elder") ||
              title.includes("geriatric") ||
              desc.includes("elderly");
          } else if (target.includes("wound") || target.includes("diabetic")) {
            matches =
              care.includes("wound") ||
              care.includes("diabetic") ||
              care.includes("ulcer") ||
              care.includes("dressing") ||
              title.includes("wound") ||
              desc.includes("wound");
          }
        }
        if (!matches) return false;
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
