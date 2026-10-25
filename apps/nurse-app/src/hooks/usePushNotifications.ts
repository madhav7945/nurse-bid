import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "../context/AuthContext";
import { registerForPushNotificationsAsync, savePushToken, sendLocalJobNotification } from "../lib/notifications";
import { subscribeToCrossAppEvents } from "../lib/realtime";
import { supabase } from "../lib/supabase";

export { savePushToken } from "../lib/notifications";

export interface PushNotificationHookResult {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isRegistered: boolean;
  isSupported: boolean;
}

export function usePushNotifications(navigation?: any): PushNotificationHookResult {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const { nurseId, isAuthenticated } = useAuth();

  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const lastNotifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (Platform.OS === "web" || !nurseId || !isAuthenticated) {
      return;
    }

    let isMounted = true;

    async function initPush() {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token && isMounted && nurseId) {
          setExpoPushToken(token);
          await savePushToken(nurseId, token);
          setIsRegistered(true);
        }
      } catch (err) {
        console.warn("[usePushNotifications] Push registration notice:", err);
      }
    }

    initPush();

    // Foreground notification listener
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener((notif) => {
        if (isMounted) {
          setNotification(notif);
        }
      });
    } catch (_) {}

    // Notification click/response listener: routes to proper screen
    try {
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response?.notification?.request?.content?.data;
        if (data?.screen && navigation?.navigate) {
          navigation.navigate(data.screen, { jobId: data.jobId, shiftId: data.shiftId });
        } else if (data?.link && navigation?.navigate) {
          navigation.navigate(data.link);
        }
      });
    } catch (_) {}

    // Helper: Trigger native Android system tray notification
    const triggerSystemTrayNotification = async (title: string, body: string, data: any = {}) => {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data,
            sound: "default",
            channelId: "urgent_jobs",
          } as any,
          trigger: null, // immediate delivery
        });
      } catch (e) {
        console.warn("Failed to schedule system tray notification:", e);
      }
    };

    // 1. Realtime cross-app events -> trigger immediate native system notification
    const unsubEvents = subscribeToCrossAppEvents((event) => {
      if (event.type === "BID_ACCEPTED") {
        if (event.payload?.nurseId && nurseId && event.payload.nurseId !== nurseId) {
          return; // Skip: event intended for another clinician
        }
        const pName = event.payload?.patientName || "Patient";
        const title = event.payload?.jobTitle || "Clinical Recovery Shift";
        triggerSystemTrayNotification(
          "🎉 Proposal Accepted!",
          `${pName} accepted your proposal for "${title}". Shift schedule is confirmed and escrow is secured.`,
          { screen: "Shifts" }
        );
      } else if (event.type === "NEW_JOB" || event.type === "JOB_POSTED") {
        const job = event.payload;
        if (job) {
          sendLocalJobNotification({
            id: job.id,
            title: job.title || "Clinical Shift",
            careType: job.careType || job.care_type,
            city: job.city,
            locality: job.locality,
            hourlyRate: job.hourlyRate || job.hourly_rate,
            budgetMin: job.budgetMin || job.budget_min,
            budgetMax: job.budgetMax || job.budget_max,
          });
        }
      } else if (event.type === "ESCROW_RELEASED" || event.type === "PAYMENT_RELEASED") {
        if (event.payload?.nurseId && nurseId && event.payload.nurseId !== nurseId) {
          return; // Skip: payment for another clinician
        }
        const amt = event.payload?.amount ? `₹${event.payload.amount.toLocaleString("en-IN")}` : "Milestone deposit";
        triggerSystemTrayNotification(
          "💰 Payment Released!",
          `${amt} has been released from escrow into your verified earnings wallet.`,
          { screen: "Profile" }
        );
      } else if (event.type === "NEW_MESSAGE" && event.source === "patient-app") {
        if (event.payload?.nurseId && nurseId && event.payload.nurseId !== nurseId) {
          return; // Skip: message for another clinician
        }
        triggerSystemTrayNotification(
          "💬 New Message",
          event.payload?.text || "You received a new message from patient.",
          { screen: "Messages" }
        );
      }
    });

    // 2. Supabase Realtime channel on notifications table for this clinician
    const notifChannel = supabase
      .channel(`nurse_push_notifs_${nurseId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${nurseId}`,
        },
        (payload: any) => {
          const newRow = payload?.new;
          if (newRow && !lastNotifiedIds.current.has(newRow.id)) {
            lastNotifiedIds.current.add(newRow.id);
            triggerSystemTrayNotification(
              newRow.title || "NurseBid Alert",
              newRow.message || newRow.content || "You have a new update.",
              { screen: newRow.link || "Shifts" }
            );
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      unsubEvents?.();
      supabase.removeChannel(notifChannel);
    };
  }, [nurseId, isAuthenticated, navigation]);

  return {
    expoPushToken,
    notification,
    isRegistered,
    isSupported: Platform.OS !== "web",
  };
}
