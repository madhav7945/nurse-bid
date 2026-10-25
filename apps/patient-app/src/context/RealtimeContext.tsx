// ═══════════════════════════════════════════════════════════════════════════════
// Realtime Context — Patient Mobile App
// Manages global realtime subscriptions for notifications and booking updates.
// Provides unread message count for tab badges.
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
  subscribeToNotifications,
  subscribeToBookings,
  subscribeToGlobalMessages,
  unsubscribeAll,
} from "../lib/realtime";
import { api } from "../lib/api";

interface RealtimeState {
  unreadMessageCount: number;
  notifications: any[];
  hasNewNotification: boolean;
}

interface RealtimeContextValue extends RealtimeState {
  refreshNotifications: () => Promise<void>;
  clearNotificationBadge: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx)
    throw new Error("useRealtime must be used within RealtimeProvider");
  return ctx;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, userId } = useAuth();
  const [state, setState] = useState<RealtimeState>({
    unreadMessageCount: 0,
    notifications: [],
    hasNewNotification: false,
  });

  // Subscribe to global channels when authenticated
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    // Subscribe to notifications
    subscribeToNotifications(userId, (notification: any) => {
      setState((prev) => ({
        ...prev,
        notifications: [notification, ...prev.notifications].slice(0, 20),
        hasNewNotification: true,
      }));
    });

    // Subscribe to booking status changes
    subscribeToBookings(userId, (_payload: any) => {
      // Refresh data when booking status changes — screens will pick up
      // the new data on their next render/fetch cycle
    });

    // Subscribe to global messages for unread count
    subscribeToGlobalMessages((payload: any) => {
      if (payload?.message?.senderId !== userId) {
        setState((prev) => ({
          ...prev,
          unreadMessageCount: prev.unreadMessageCount + 1,
        }));
      }
    });

    // Cleanup all subscriptions on unmount or auth change
    return () => {
      unsubscribeAll();
    };
  }, [isAuthenticated, userId]);

  // Load initial notifications
  useEffect(() => {
    if (!isAuthenticated) return;
    refreshNotifications();
  }, [isAuthenticated]);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      const unread = data.filter((n: any) => !n.is_read).length;
      setState((prev) => ({
        ...prev,
        notifications: data,
        hasNewNotification: unread > 0,
      }));
    } catch (err) {
      console.warn("RealtimeContext: failed to load notifications:", err);
    }
  }, []);

  const clearNotificationBadge = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasNewNotification: false,
    }));
  }, []);

  const value: RealtimeContextValue = {
    ...state,
    refreshNotifications,
    clearNotificationBadge,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}
