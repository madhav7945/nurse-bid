import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "../context/AuthContext";
import { registerForPushNotificationsAsync, savePushToken } from "../lib/notifications";
import { subscribeToCrossAppEvents } from "../lib/realtime";
import { supabase } from "../lib/supabase";

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
  const { userId, isAuthenticated } = useAuth();

  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const lastNotifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let isMounted = true;

    async function initPush() {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token && isMounted) {
          setExpoPushToken(token);
          if (userId) {
            await savePushToken(userId, token);
            setIsRegistered(true);
          }
        }
      } catch (err) {
        console.warn("[PatientPush] Push registration notice:", err);
      }
    }

    if (isAuthenticated && userId) {
      initPush();
    }

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
          navigation.navigate(data.screen, { jobId: data.jobId });
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
      if (!userId) return;
      if (event.payload?.patientId && event.payload.patientId !== userId) return;

      if (event.type === "NEW_BID" || event.type === "BID_SUBMITTED") {
        const rate = event.payload?.rate || event.payload?.proposedRate;
        const rateStr = rate ? `₹${rate}/hr` : "a proposal";
        triggerSystemTrayNotification(
          "📋 New Proposal Received!",
          `A verified clinician submitted ${rateStr} for your care request. Tap to review.`,
          { screen: "My Requests" }
        );
      } else if (event.type === "SHIFT_STARTED") {
        triggerSystemTrayNotification(
          "🏥 Clinician Arrived On-Site",
          "Your assigned nurse has clocked in via GPS and arrived for the scheduled shift.",
          { screen: "Bookings" }
        );
      } else if (event.type === "SHIFT_COMPLETED") {
        triggerSystemTrayNotification(
          "✅ Shift Completed by Clinician",
          "Your nurse has concluded the care shift. Review bedside notes and release protected milestone payment.",
          { screen: "Escrow" }
        );
      } else if (event.type === "VITALS_LOGGED") {
        triggerSystemTrayNotification(
          "🩺 Bedside Telemetry Updated",
          "New patient vital signs were just logged by the clinician at bedside.",
          { screen: "Dashboard" }
        );
      } else if (event.type === "NEW_MESSAGE" && event.source === "nurse-app") {
        triggerSystemTrayNotification(
          "💬 New Message",
          event.payload?.text || "You received a new message from clinician.",
          { screen: "Messages" }
        );
      }
    });

    if (!userId) {
      return () => {
        isMounted = false;
        unsubEvents?.();
      };
    }

    // 2. Supabase Realtime channel on notifications table for this patient
    const targetUserId = userId;
    const notifChannel = supabase
      .channel(`patient_push_notifs_${targetUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${targetUserId}`,
        },
        (payload: any) => {
          const newRow = payload?.new;
          if (newRow && !lastNotifiedIds.current.has(newRow.id)) {
            lastNotifiedIds.current.add(newRow.id);
            triggerSystemTrayNotification(
              newRow.title || "NurseBid Care Alert",
              newRow.message || newRow.content || "You have a new update.",
              { screen: newRow.link || "Dashboard" }
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
  }, [userId, isAuthenticated, navigation]);

  return {
    expoPushToken,
    notification,
    isRegistered,
    isSupported: Platform.OS !== "web",
  };
}
