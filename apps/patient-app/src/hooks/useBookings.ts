// ═══════════════════════════════════════════════════════════════════════════════
// useBookings Hook — Patient bookings, escrow status, and actions
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { BookingRecord } from "../types";
import { subscribeToCrossAppEvents } from "../lib/realtime";

export function useBookings() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [activeBooking, setActiveBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [list, active] = await Promise.all([
        api.getBookings(),
        api.getActiveBooking(),
      ]);
      setBookings(list || []);
      setActiveBooking(active || null);
    } catch (err: any) {
      const msg = err?.message || "Failed to load bookings";
      setError(msg);
      console.warn("useBookings error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();

    const unsub = subscribeToCrossAppEvents((event) => {
      if (
        event.type === "BOOKING_ACCEPTED" ||
        event.type === "ESCROW_FUNDED" ||
        event.type === "SHIFT_UPDATED" ||
        event.type === "MILESTONE_RELEASED"
      ) {
        loadBookings(true);
      }
    });

    return () => {
      unsub();
    };
  }, [loadBookings]);

  const fundEscrow = useCallback(
    async (bookingId: string, amount: number) => {
      try {
        const res = await api.fundEscrow(bookingId, amount);
        await loadBookings(true);
        return res;
      } catch (err: any) {
        console.error("fundEscrow error:", err);
        throw err;
      }
    },
    [loadBookings]
  );

  const releaseMilestone = useCallback(
    async (paymentId: string) => {
      try {
        const res = await api.releaseEscrowMilestone(paymentId);
        await loadBookings(true);
        return res;
      } catch (err: any) {
        console.error("releaseMilestone error:", err);
        throw err;
      }
    },
    [loadBookings]
  );

  return {
    bookings,
    activeBooking,
    loading,
    refreshing,
    error,
    refresh: () => loadBookings(true),
    reload: () => loadBookings(false),
    fundEscrow,
    releaseMilestone,
  };
}
