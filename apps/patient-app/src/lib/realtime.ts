// ═══════════════════════════════════════════════════════════════════════════════
// Supabase Realtime Subscription Manager — Patient Mobile App
// Manages WebSocket subscriptions for live chat, bids, and notifications.
// Ported from patient-portal/src/lib/realtime.ts for React Native.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "./supabase";

export type RealtimeCallback = (payload: any) => void;

export type CrossAppEventType =
  | "NEW_JOB"
  | "JOB_POSTED"
  | "NEW_BID"
  | "BID_SUBMITTED"
  | "BID_WITHDRAWN"
  | "BID_ACCEPTED"
  | "BOOKING_ACCEPTED"
  | "BOOKING_CONFIRMED"
  | "ESCROW_FUNDED"
  | "MILESTONE_RELEASED"
  | "VITALS_LOGGED"
  | "NEW_MESSAGE"
  | "SHIFT_UPDATED"
  | "SHIFT_UPDATE"
  | "SHIFT_STARTED"
  | "SHIFT_COMPLETED"
  | "NOTE_ADDED"
  | "MEDICATION_ADDED"
  | "MEDICATION_UPDATED"
  | "ESCROW_UPDATED"
  | "ESCROW_RELEASED"
  | "PAYMENT_RELEASED";

export interface CrossAppMessage {
  type: CrossAppEventType;
  payload: any;
  timestamp: number;
  source: "nurse-app" | "patient-app";
}

const activeChannels: Map<string, any> = new Map();
const crossAppListeners = new Set<(event: CrossAppMessage) => void>();

let broadcastChannel: any = null;

if (typeof window !== "undefined") {
  try {
    if ("BroadcastChannel" in window) {
      broadcastChannel = new (window as any).BroadcastChannel("nursebid_cross_app_sync");
      broadcastChannel.onmessage = (event: MessageEvent) => {
        if (event.data && event.data.type) {
          notifyCrossAppListeners(event.data);
        }
      };
    }

    window.addEventListener("storage", (e: StorageEvent) => {
      if (e.key === "nursebid_cross_app_event" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          notifyCrossAppListeners(parsed);
        } catch {}
      }
    });
  } catch (err) {
    console.warn("Cross-app bridge init notice:", err);
  }
}

function notifyCrossAppListeners(msg: CrossAppMessage) {
  crossAppListeners.forEach((fn) => {
    try {
      fn(msg);
    } catch (e) {
      console.warn("Cross-app listener error:", e);
    }
  });
}

// Supabase Broadcast Channel singleton for cross-device mobile synchronization
let crossAppSyncChannel: any = null;

function getCrossAppSyncChannel() {
  if (!crossAppSyncChannel) {
    crossAppSyncChannel = supabase.channel("cross_app_sync", {
      config: { broadcast: { self: false } },
    });
    crossAppSyncChannel
      .on("broadcast", { event: "*" }, (e: any) => {
        const payloadData = e.payload || {};
        const eventMessage: CrossAppMessage = {
          type: (e.event || payloadData.type) as CrossAppEventType,
          payload: payloadData.payload !== undefined ? payloadData.payload : payloadData,
          timestamp: payloadData.timestamp || Date.now(),
          source: payloadData.source || "nurse-app",
          ...payloadData,
        };
        notifyCrossAppListeners(eventMessage);
      })
      .subscribe();
  }
  return crossAppSyncChannel;
}

try {
  getCrossAppSyncChannel();
} catch (e) {
  console.warn("Cross-app channel init notice:", e);
}

export function broadcastCrossAppEvent(type: CrossAppEventType, payload: any) {
  const message: CrossAppMessage = {
    type,
    payload,
    timestamp: Date.now(),
    source: "patient-app",
  };

  // 1. Cross-Device Mobile Realtime Sync via Supabase Broadcast
  try {
    const channel = getCrossAppSyncChannel();
    channel.send({
      type: "broadcast",
      event: type,
      payload: { ...message, ...payload },
    });
  } catch (err) {
    console.warn("Cross-device broadcast error:", err);
  }

  // 2. Web local fallback (BroadcastChannel + LocalStorage)
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(message);
    }
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("nursebid_cross_app_event", JSON.stringify(message));
    }
  } catch {}

  // 3. Notify local listeners
  notifyCrossAppListeners(message);
}

export function subscribeToCrossAppEvents(callback: (event: CrossAppMessage) => void) {
  try {
    getCrossAppSyncChannel();
  } catch {}
  crossAppListeners.add(callback);
  return () => {
    crossAppListeners.delete(callback);
  };
}

const crossAppUnsubs: Map<string, () => void> = new Map();

/**
 * Subscribe to new messages in a specific conversation.
 * Uses both Supabase broadcast (instant) and postgres_changes (persistent), plus cross-app bridge.
 */
export function subscribeToMessages(
  conversationId: string,
  onMessage: RealtimeCallback
) {
  const channelKey = `messages:${conversationId}`;

  // Hook into cross-app bridge for instant local message delivery
  if (!crossAppUnsubs.has(channelKey)) {
    const unsub = subscribeToCrossAppEvents((event) => {
      if (event.type === "NEW_MESSAGE") {
        const msg = event.payload?.message || event.payload;
        if (msg && (event.payload?.conversationId === conversationId || msg.conversationId === conversationId)) {
          onMessage(msg);
        }
      }
    });
    crossAppUnsubs.set(channelKey, unsub);
  }

  if (activeChannels.has(channelKey)) {
    const existing = activeChannels.get(channelKey);
    existing.on("broadcast", { event: "new_message" }, (e: any) =>
      onMessage(e.payload)
    );
    return;
  }

  try {
    const channel = supabase
      .channel(channelKey, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "new_message" }, (e: any) => {
        onMessage(e.payload);
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => onMessage(payload.new)
      )
      .subscribe();

    activeChannels.set(channelKey, channel);
  } catch (err) {
    console.warn("Supabase message subscription notice:", err);
  }
}

/**
 * Broadcast a real-time message to any listening portal on the conversation channel.
 */
export async function broadcastMessage(
  conversationId: string,
  message: any
) {
  const channelKey = `messages:${conversationId}`;
  let channel = activeChannels.get(channelKey);

  if (!channel) {
    channel = supabase.channel(channelKey, {
      config: { broadcast: { self: false } },
    });
    await channel.subscribe();
    activeChannels.set(channelKey, channel);
  }

  await channel.send({
    type: "broadcast",
    event: "new_message",
    payload: message,
  });

  // Also broadcast on global channel for sidebar conversation lists
  await broadcastGlobalMessage({ conversationId, message });
}

/**
 * Subscribe to global messages across all conversations.
 */
export function subscribeToGlobalMessages(onMessage: RealtimeCallback) {
  const channelKey = "messages:global";
  if (activeChannels.has(channelKey)) return;

  const channel = supabase
    .channel(channelKey, { config: { broadcast: { self: false } } })
    .on("broadcast", { event: "new_message" }, (e: any) => {
      onMessage(e.payload);
    })
    .subscribe();

  activeChannels.set(channelKey, channel);
}

/**
 * Broadcast to global message channel.
 */
export async function broadcastGlobalMessage(payload: any) {
  const channelKey = "messages:global";
  let channel = activeChannels.get(channelKey);

  if (!channel) {
    channel = supabase.channel(channelKey, {
      config: { broadcast: { self: false } },
    });
    await channel.subscribe();
    activeChannels.set(channelKey, channel);
  }

  await channel.send({
    type: "broadcast",
    event: "new_message",
    payload,
  });
}

/**
 * Subscribe to bid updates on a specific job.
 */
export function subscribeToBids(jobId: string, onBid: RealtimeCallback) {
  const channelKey = `bids:${jobId}`;

  // Hook into cross-app bridge for instant local bid delivery
  if (!crossAppUnsubs.has(channelKey)) {
    const unsub = subscribeToCrossAppEvents((event) => {
      if (event.type === "NEW_BID" || event.type === "BID_SUBMITTED") {
        const bid = event.payload;
        if (bid && (bid.jobId === jobId || bid.job_id === jobId)) {
          onBid({ eventType: "INSERT", new: bid });
        }
      }
    });
    crossAppUnsubs.set(channelKey, unsub);
  }

  if (activeChannels.has(channelKey)) return;

  try {
    const channel = supabase
      .channel(channelKey)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bids",
          filter: `job_id=eq.${jobId}`,
        },
        (payload: any) => onBid(payload)
      )
      .subscribe();

    activeChannels.set(channelKey, channel);
  } catch {}
}

/**
 * Subscribe to notifications for the current user.
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: RealtimeCallback
) {
  const channelKey = `notifications:${userId}`;
  if (activeChannels.has(channelKey)) return;

  const channel = supabase
    .channel(channelKey)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => onNotification(payload.new)
    )
    .subscribe();

  activeChannels.set(channelKey, channel);
}

/**
 * Subscribe to booking status changes for a user.
 */
export function subscribeToBookings(
  userId: string,
  onUpdate: RealtimeCallback
) {
  const channelKey = `bookings:${userId}`;
  if (activeChannels.has(channelKey)) return;

  const channel = supabase
    .channel(channelKey)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `patient_id=eq.${userId}`,
      },
      (payload: any) => onUpdate(payload)
    )
    .subscribe();

  activeChannels.set(channelKey, channel);
}

/**
 * Subscribe to live vitals logs for a specific booking.
 */
export function subscribeToVitals(
  bookingId: string,
  onVitals: RealtimeCallback
) {
  const channelKey = `vitals:${bookingId}`;

  if (!crossAppUnsubs.has(channelKey)) {
    const unsub = subscribeToCrossAppEvents((event) => {
      if (event.type === "VITALS_LOGGED") {
        const vitals = event.payload;
        // We pass the whole event payload which includes shiftId and vitals. 
        // If we need to match bookingId we might need to adjust, 
        // but cross app events already do the local broadcasting.
        if (vitals) {
          onVitals({ eventType: "INSERT", new: vitals.vitals ? vitals.vitals : vitals });
        }
      }
    });
    crossAppUnsubs.set(channelKey, unsub);
  }

  if (activeChannels.has(channelKey)) return;

  try {
    const channel = supabase
      .channel(channelKey)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vitals_logs",
        },
        (payload: any) => onVitals(payload)
      )
      .subscribe();

    activeChannels.set(channelKey, channel);
  } catch {}
}

/**
 * Unsubscribe from a conversation's messages.
 */
export function unsubscribeFromMessages(conversationId: string) {
  const channelKey = `messages:${conversationId}`;
  const channel = activeChannels.get(channelKey);
  if (channel) {
    supabase.removeChannel(channel);
    activeChannels.delete(channelKey);
  }
  const crossUnsub = crossAppUnsubs.get(channelKey);
  if (crossUnsub) {
    crossUnsub();
    crossAppUnsubs.delete(channelKey);
  }
}

/**
 * Unsubscribe from a specific channel.
 */
export function unsubscribeChannel(channelKey: string) {
  const channel = activeChannels.get(channelKey);
  if (channel) {
    supabase.removeChannel(channel);
    activeChannels.delete(channelKey);
  }
  const crossUnsub = crossAppUnsubs.get(channelKey);
  if (crossUnsub) {
    crossUnsub();
    crossAppUnsubs.delete(channelKey);
  }
}

/**
 * Unsubscribe from all active channels. Call on app background/unmount.
 */
export function unsubscribeAll() {
  activeChannels.forEach((channel) => {
    supabase.removeChannel(channel);
  });
  activeChannels.clear();
  crossAppUnsubs.forEach((unsub) => unsub());
  crossAppUnsubs.clear();
}

/**
 * Subscribe to conversation changes (like masking/unmasking on escrow funding).
 */
export function subscribeToConversations(conversationId: string, onUpdate: RealtimeCallback) {
  const channelKey = `conversations:${conversationId}`;
  if (activeChannels.has(channelKey)) return;

  try {
    const channel = supabase
      .channel(channelKey)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload: any) => onUpdate(payload.new)
      )
      .subscribe();

    activeChannels.set(channelKey, channel);
  } catch {}
}
