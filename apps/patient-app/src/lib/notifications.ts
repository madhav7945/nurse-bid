import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabase";

/**
 * Configure foreground notification behavior (native only)
 */
if (Platform.OS !== "web") {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (_) {}
}

/**
 * Register device for Expo Push Notifications with full Web & Simulator guards.
 * Returns valid ExponentPushToken string or null.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // 1. Strict Web & Simulator Guards — Never crash on Web
  if (Platform.OS === "web") {
    console.log("[PushNotifications] Skipped: Expo Web does not support native push tokens.");
    return null;
  }

  if (!Device.isDevice) {
    console.log("[PushNotifications] Skipped: Physical device required for native push notifications.");
    return null;
  }

  try {
    // 2. Android Notification Channel Setup
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default Care Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2563EB",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
      });
    }

    // 3. Permission Request
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("[PushNotifications] Push notification permission not granted.");
      return null;
    }

    // 4. Retrieve Expo Push Token
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    return tokenResponse.data;
  } catch (error) {
    console.warn("[PushNotifications] Error obtaining push token:", error);
    return null;
  }
}

/**
 * Persist push token to Supabase across profiles and patient_profiles tables.
 */
export async function savePushToken(userId: string, token: string): Promise<boolean> {
  if (!userId || !token) return false;

  try {
    const timestamp = new Date().toISOString();

    // Update patient_profiles
    const { error: patientErr } = await supabase
      .from("patient_profiles")
      .update({ push_token: token, updated_at: timestamp })
      .eq("id", userId);

    if (patientErr) {
      console.warn("[PushNotifications] Failed updating patient_profiles:", patientErr.message);
    }

    // Update unified profiles
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ push_token: token, updated_at: timestamp })
      .eq("id", userId);

    if (profileErr) {
      console.warn("[PushNotifications] Failed updating profiles:", profileErr.message);
    }

    return !patientErr || !profileErr;
  } catch (err) {
    console.error("[PushNotifications] Exception saving push token:", err);
    return false;
  }
}
