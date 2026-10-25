// ═══════════════════════════════════════════════════════════════════════════════
// Realtime Context — Nurse Mobile App
// Coordinates real-time subscriptions, unread message badges, incoming patient
// care requests, and shift milestone events.
// ═══════════════════════════════════════════════════════════════════════════════

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  subscribeToCrossAppEvents,
  subscribeToJobs,
  subscribeToShifts,
  unsubscribeAll,
} from "../lib/realtime";
import { api, NotificationRecord } from "../lib/api";

interface RealtimeState {
  unreadMessageCount: number;
  notifications: NotificationRecord[];
  hasNewNotification: boolean;
  activeJobAlertsCount: number;
}

interface RealtimeContextValue extends RealtimeState {
  refreshNotifications: () => Promise<void>;
  clearNotificationBadge: () => void;
  resetUnreadMessages: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used within RealtimeProvider");
  return ctx;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, nurseId } = useAuth();
  const [state, setState] = useState<RealtimeState>({
    unreadMessageCount: 0,
    notifications: [],
    hasNewNotification: false,
    activeJobAlertsCount: 0,
  });

  // Subscribe to realtime streams when nurse is authenticated
  useEffect(() => {
    if (!isAuthenticated || !nurseId) return;

    // 1. Initial notifications fetch
    refreshNotifications();

    // 2. Realtime job alerts
    subscribeToJobs((payload) => {
      setState((prev) => ({
        ...prev,
        activeJobAlertsCount: prev.activeJobAlertsCount + 1,
        hasNewNotification: true,
      }));
    });

    // 3. Realtime shifts telemetry & milestone updates
    subscribeToShifts((payload) => {
      setState((prev) => ({
        ...prev,
        hasNewNotification: true,
      }));
    });

    // 4. Cross-app bridge events (instant multi-tab synchronization)
    const unsubCross = subscribeToCrossAppEvents((event) => {
      if (event.type === "NEW_MESSAGE" && event.source === "patient-app") {
        setState((prev) => ({
          ...prev,
          unreadMessageCount: prev.unreadMessageCount + 1,
        }));
      } else if (event.type === "NEW_JOB") {
        setState((prev) => ({
          ...prev,
          activeJobAlertsCount: prev.activeJobAlertsCount + 1,
          hasNewNotification: true,
        }));
      } else if (event.type === "BID_ACCEPTED") {
        if (event.payload?.nurseId && nurseId && event.payload.nurseId !== nurseId) {
          return; // Skip: notification is for another clinician
        }
        const notif: NotificationRecord = {
          id: `notif-${Date.now()}`,
          title: "Proposal Accepted & Milestone Funded",
          message: "A patient accepted your shift proposal. Protected Care Deposit is secured.",
          timeAgo: "Just now",
          isRead: false,
          type: "shift",
        };
        setState((prev) => ({
          ...prev,
          notifications: [notif, ...prev.notifications].slice(0, 20),
          hasNewNotification: true,
        }));
      }
    });

    return () => {
      unsubCross();
      unsubscribeAll();
    };
  }, [isAuthenticated, nurseId]);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      const unread = data.filter((n) => !n.isRead).length;
      setState((prev) => ({
        ...prev,
        notifications: data,
        hasNewNotification: unread > 0,
      }));
    } catch (err) {
      console.warn("Notifications refresh notice:", err);
    }
  }, []);

  const clearNotificationBadge = useCallback(() => {
    setState((prev) => ({ ...prev, hasNewNotification: false }));
  }, []);

  const resetUnreadMessages = useCallback(() => {
    setState((prev) => ({ ...prev, unreadMessageCount: 0 }));
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        ...state,
        refreshNotifications,
        clearNotificationBadge,
        resetUnreadMessages,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
