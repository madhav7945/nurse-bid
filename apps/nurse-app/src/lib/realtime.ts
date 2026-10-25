// ═══════════════════════════════════════════════════════════════════════════════
// Supabase Realtime & Cross-App Bridge Manager — Nurse Mobile App
// Dual-Channel Sync:
// 1. Supabase WebSocket postgres_changes & broadcast channels
// 2. Cross-tab/Cross-port Local Storage & BroadcastChannel Bridge
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
  | "ESCROW_FUNDED"
  | "ESCROW_RELEASED"
  | "PAYMENT_RELEASED"
  | "MILESTONE_RELEASED";

export interface CrossAppMessage {
  type: CrossAppEventType;
  payload: any;
  timestamp: number;
  source: "nurse-app" | "patient-app";
}

const activeChannels: Map<string, any> = new Map();
const crossAppListeners = new Set<(event: CrossAppMessage) => void>();

// Browser cross-app event bridge (BroadcastChannel + LocalStorage fallback)
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

    // Secondary listener: Storage events for cross-port / cross-tab communication
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
          source: payloadData.source || "patient-app",
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

/**
 * Broadcast an event to both Supabase Realtime channels and local Cross-App bridge
 */
export function broadcastCrossAppEvent(type: CrossAppEventType, payload: any) {
  const message: CrossAppMessage = {
    type,
    payload,
    timestamp: Date.now(),
    source: "nurse-app",
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

  // 2. Local BroadcastChannel / LocalStorage for web
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(message);
    }
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("nursebid_cross_app_event", JSON.stringify(message));
    }
  } catch {}

  // 3. Notify local app listeners immediately
  notifyCrossAppListeners(message);
}

/**
 * Subscribe to cross-app events (e.g. newly posted jobs by patient, accepted bids)
 */
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
 * Subscribe to live chat messages for a conversation
 */
export function subscribeToMessages(conversationId: string, onMessage: RealtimeCallback) {
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
    existing.on("broadcast", { event: "new_message" }, (e: any) => onMessage(e.payload));
    return () => unsubscribeFromMessages(conversationId);
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
    console.warn("Supabase realtime message subscribe notice:", err);
  }

  return () => unsubscribeFromMessages(conversationId);
}

export function unsubscribeFromMessages(conversationId: string) {
  const channelKey = `messages:${conversationId}`;
  const crossUnsub = crossAppUnsubs.get(channelKey);
  if (crossUnsub) {
    crossUnsub();
    crossAppUnsubs.delete(channelKey);
  }
  const ch = activeChannels.get(channelKey);
  if (ch) {
    try {
      supabase.removeChannel(ch);
    } catch {}
    activeChannels.delete(channelKey);
  }
}

/**
 * Broadcast message to listening participants
 */
export async function broadcastMessage(conversationId: string, message: any) {
  const channelKey = `messages:${conversationId}`;
  let channel = activeChannels.get(channelKey);

  try {
    if (!channel) {
      channel = supabase.channel(channelKey, { config: { broadcast: { self: false } } });
      await channel.subscribe();
      activeChannels.set(channelKey, channel);
    }

    await channel.send({
      type: "broadcast",
      event: "new_message",
      payload: message,
    });
  } catch {}

  // Also broadcast across local bridge
  broadcastCrossAppEvent("NEW_MESSAGE", { conversationId, message });
}

/**
 * Subscribe to new patient job postings in the marketplace
 */
export function subscribeToJobs(onJobChange: RealtimeCallback) {
  const channelKey = "jobs:marketplace";
  if (activeChannels.has(channelKey)) return () => {};

  try {
    const channel = supabase
      .channel(channelKey)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
        },
        (payload: any) => onJobChange(payload)
      )
      .subscribe();

    activeChannels.set(channelKey, channel);
  } catch {}

  // Also hook into local cross-app bridge for instant offline/multi-tab sync
  const unsubCrossApp = subscribeToCrossAppEvents((event) => {
    if (event.type === "NEW_JOB" || event.type === "JOB_POSTED") {
      onJobChange({ eventType: "INSERT", new: event.payload });
    }
  });

  return () => {
    unsubCrossApp?.();
    const ch = activeChannels.get(channelKey);
    if (ch) {
      try {
        supabase.removeChannel(ch);
      } catch {}
      activeChannels.delete(channelKey);
    }
  };
}

/**
 * Subscribe to shifts & vitals telemetry changes
 */
export function subscribeToShifts(onShiftChange: RealtimeCallback) {
  const channelKey = "shifts:live";
  if (activeChannels.has(channelKey)) return;

  try {
    const channel = supabase
      .channel(channelKey)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "schedule_shifts",
        },
        (payload: any) => onShiftChange(payload)
      )
      .subscribe();

    activeChannels.set(channelKey, channel);
  } catch {}

  subscribeToCrossAppEvents((event) => {
    if (event.type === "VITALS_LOGGED" || event.type === "SHIFT_UPDATED" || event.type === "BID_ACCEPTED") {
      onShiftChange({ eventType: "UPDATE", payload: event.payload });
    }
  });
}

/**
 * Unsubscribe from all channels on teardown
 */
export function unsubscribeAll() {
  activeChannels.forEach((ch) => {
    try {
      supabase.removeChannel(ch);
    } catch {}
  });
  activeChannels.clear();
}

/**
 * Subscribe to notifications for the current user.
 */
export function subscribeToNotifications(userId: string, onNotification: RealtimeCallback) {
  const channelKey = `notifications:${userId}`;
  if (activeChannels.has(channelKey)) return;

  try {
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
  } catch {}
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
