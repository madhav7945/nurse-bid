import { supabase } from "./supabase";

/**
 * Dispatch Expo Push Notifications via Expo's official HTTP/2 Push API.
 * Wakes up locked Android & iOS devices with sound, vibration, and high priority outside the app.
 */
export async function sendExpoPushNotification(
  pushTokens: string | string[],
  title: string,
  body: string,
  data: any = {}
): Promise<boolean> {
  const tokens = (Array.isArray(pushTokens) ? pushTokens : [pushTokens]).filter(
    (t) => typeof t === "string" && (t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["))
  );

  if (tokens.length === 0) {
    return false;
  }

  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title,
    body,
    data,
    priority: "high",
    channelId: "urgent_jobs",
    _displayInForeground: true,
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    return response.ok;
  } catch (err) {
    console.warn("[PushDispatcher] Expo Push dispatch notice:", err);
    return false;
  }
}

/**
 * Lookup user's push token across all user tables and send push notification
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data: any = {}
): Promise<boolean> {
  if (!userId) return false;
  try {
    const tokenSet = new Set<string>();

    // 1. Check patient_profiles
    const { data: pProf } = await supabase
      .from("patient_profiles")
      .select("push_token")
      .eq("id", userId)
      .maybeSingle();
    if (pProf?.push_token) tokenSet.add(pProf.push_token);

    // 2. Check nurse_profiles
    const { data: nProf } = await supabase
      .from("nurse_profiles")
      .select("push_token, fcm_token")
      .or(`id.eq.${userId},user_id.eq.${userId}`);
    (nProf || []).forEach((row: any) => {
      if (row.push_token) tokenSet.add(row.push_token);
      if (row.fcm_token) tokenSet.add(row.fcm_token);
    });

    // 3. Check profiles
    const { data: prof } = await supabase
      .from("profiles")
      .select("push_token")
      .eq("id", userId)
      .maybeSingle();
    if (prof?.push_token) tokenSet.add(prof.push_token);

    const tokens = Array.from(tokenSet).filter(
      (t) => typeof t === "string" && (t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["))
    );

    if (tokens.length === 0) {
      return false;
    }

    return await sendExpoPushNotification(tokens, title, body, data);
  } catch (err) {
    console.warn(`[PushDispatcher] sendPushToUser notice for ${userId}:`, err);
    return false;
  }
}

/**
 * Send WhatsApp-style message notification outside the app
 */
export async function sendChatMessagePush(
  recipientUserId: string,
  senderName: string,
  messageText: string,
  conversationId: string
) {
  return sendPushToUser(
    recipientUserId,
    `💬 ${senderName || "New Message"}`,
    messageText,
    { screen: "Messages", conversationId }
  );
}

/**
 * Send shift completion notification to patient
 */
export async function sendShiftCompletedPush(
  patientUserId: string,
  nurseName: string,
  shiftId: string,
  bookingId?: string
) {
  return sendPushToUser(
    patientUserId,
    "✅ Shift Completed by Clinician",
    `${nurseName || "Assigned nurse"} has concluded care shift. Review timesheet & release milestone.`,
    { screen: "Escrow", shiftId, bookingId }
  );
}

/**
 * Send shift clock-in notification to patient
 */
export async function sendShiftClockInPush(
  patientUserId: string,
  nurseName: string,
  shiftId: string,
  bookingId?: string
) {
  return sendPushToUser(
    patientUserId,
    "🏥 Clinician Arrived On-Site",
    `${nurseName || "Nurse"} has GPS checked in and arrived for the scheduled shift.`,
    { screen: "Bookings", shiftId, bookingId }
  );
}

/**
 * Send proposal accepted notification to nurse
 */
export async function sendProposalAcceptedPush(
  nurseUserId: string,
  patientName: string,
  bookingId?: string
) {
  return sendPushToUser(
    nurseUserId,
    "🎉 Proposal Accepted!",
    `${patientName || "Patient"} accepted your proposal! Shift is confirmed.`,
    { screen: "Shifts", bookingId }
  );
}

/**
 * Send new proposal notification to patient
 */
export async function sendNewProposalPush(
  patientUserId: string,
  nurseName: string,
  rate: number,
  jobId?: string
) {
  return sendPushToUser(
    patientUserId,
    "📋 New Proposal Received!",
    `Nurse ${nurseName || "Clinician"} submitted a proposal (₹${rate}/hr). Tap to review.`,
    { screen: "My Requests", jobId }
  );
}
