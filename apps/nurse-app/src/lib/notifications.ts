import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

/**
 * Configure foreground notification presentation behavior
 */
if (Platform.OS !== "web") {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (_) {}
}

/**
 * Register device for Expo Push Notifications with Android Priority Channels.
 * Returns valid ExponentPushToken string or null.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    // 1. Android Notification Channels Setup with High Priority & Sound
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("urgent_jobs", {
        name: "Urgent Clinical Shifts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0D9488",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync("default", {
        name: "Standard Clinical Notifications",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0D9488",
        sound: "default",
      });
    }

    // 2. Permission Request
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("[NursePush] Push notification permission not granted.");
      return null;
    }

    // 3. Retrieve Expo Push Token
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const token = tokenResponse.data;
    if (token) {
      await AsyncStorage.setItem("@nursebid_push_token", token);
    }
    return token;
  } catch (error) {
    console.warn("[NursePush] Error obtaining push token:", error);
    return null;
  }
}

export async function savePushToken(nurseId: string, token: string): Promise<boolean> {
  if (!nurseId || !token) return false;

  try {
    const { error: npErr } = await supabase
      .from("nurse_profiles")
      .update({ fcm_token: token, push_token: token })
      .or(`id.eq.${nurseId},user_id.eq.${nurseId}`);

    if (npErr) {
      console.warn("[NursePush] nurse_profiles savePushToken notice:", npErr);
    }

    await supabase
      .from("profiles")
      .update({ push_token: token })
      .eq("id", nurseId);

    return true;
  } catch (err) {
    console.warn("[NursePush] savePushToken error:", err);
    return false;
  }
}

/**
 * Trigger an instant native system notification banner
 */
export async function sendLocalJobNotification(job: {
  id?: string;
  title: string;
  careType?: string;
  city?: string;
  locality?: string;
  hourlyRate?: number;
  budgetMin?: number;
  budgetMax?: number;
}) {
  if (Platform.OS === "web") return;

  try {
    const rateText = job.hourlyRate
      ? `₹${job.hourlyRate}/hr`
      : job.budgetMin
      ? `₹${job.budgetMin}-₹${job.budgetMax || job.budgetMin}/hr`
      : "Competitive rate";

    const locationText = job.locality ? `${job.locality}, ${job.city || "Punjab"}` : job.city || "Punjab";

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔔 New Clinical Shift in ${locationText}!`,
        body: `"${job.title}" (${rateText}). Open Nurse Radar to review and submit proposal.`,
        data: { jobId: job.id, screen: "Jobs" },
        sound: "default",
        channelId: "urgent_jobs",
      } as any,
      trigger: null, // deliver immediately
    });
  } catch (err) {
    console.warn("[NursePush] sendLocalJobNotification notice:", err);
  }
}
