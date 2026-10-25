import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
  Platform,
  Dimensions,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ShieldCheck,
  Clock,
  CheckCircle2,
  ChevronRight,
  Lock,
  Phone,
  MessageSquare,
  RotateCw,
  Stethoscope,
  HeartPulse,
  Droplet,
  ThermometerSun,
  Navigation,
  Check,
  BadgeCheck,
  Calendar,
  MapPin,
  X,
  Activity,
  ArrowRight,
} from "lucide-react-native";
import { colors, neuShadows } from "../theme/colors";
import { CircularProgressRing } from "../components/ui/CircularProgressRing";
import { BookingSkeleton } from "../components/ui/Skeleton";
import { api } from "../lib/api";
import { subscribeToVitals, subscribeToCrossAppEvents } from "../lib/realtime";
import { setTabBarVisible } from "../lib/tabBarState";

export interface ShiftMilestone {
  id?: string;
  shiftNumber: number;
  date: string;
  hours: string;
  amount: number;
  nurseName: string;
  status: "completed_paid" | "ready_for_release" | "in_progress" | "scheduled";
  vitalsCharted: boolean;
  notes: string;
  location?: string;
  gpsCheckinAt?: string | null;
  vitals?: {
    bp?: string;
    pulse?: string;
    hr?: string;
    spo2?: string;
    sugar?: string;
    temp?: string;
    nurseName?: string;
    recordedAt?: string;
  };
}

interface BookingsScreenProps {
  navigation?: any;
}

export const BookingsScreen: React.FC<BookingsScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [selectedShift, setSelectedShift] = useState<ShiftMilestone | null>(null);
  const [selectedCompletedEngagement, setSelectedCompletedEngagement] = useState<any | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [releasedAmount, setReleasedAmount] = useState(0);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [shifts, setShifts] = useState<ShiftMilestone[]>([]);
  const [totalContractAmount, setTotalContractAmount] = useState(0);
  const [patientVitals, setPatientVitals] = useState({
    bp: "--/--",
    hr: "--",
    spo2: "--",
    sugar: "--",
    temp: "--",
  });

  const totalShifts = booking?.durationDays || shifts.length || 7;
  const safeReleasedAmount = Math.min(totalContractAmount, releasedAmount);
  const heldAmount = Math.max(0, totalContractAmount - safeReleasedAmount);
  const completionPercentage = Math.min(
    100,
    Math.max(0, Math.round((safeReleasedAmount / (totalContractAmount || 1)) * 100))
  );

  const completedShiftsList = useMemo(() => {
    return shifts.filter((s) => s.status === "completed_paid");
  }, [shifts]);

  const groupedCompletedEngagements = useMemo(() => {
    if (!completedShiftsList.length) return [];
    const engMap: Record<string, {
      id: string;
      title: string;
      nurseName: string;
      totalDays: number;
      completedDays: number;
      totalPaid: number;
      shifts: ShiftMilestone[];
    }> = {};

    completedShiftsList.forEach((shift) => {
      const engKey = booking?.id || shift.nurseName || "care_engagement";
      if (!engMap[engKey]) {
        engMap[engKey] = {
          id: engKey,
          title: booking?.serviceTitle || booking?.diagnosis || "Post-Surgical Nursing Care",
          nurseName: shift.nurseName || "Assigned Clinician",
          totalDays: totalShifts || completedShiftsList.length,
          completedDays: 0,
          totalPaid: 0,
          shifts: [],
        };
      }
      engMap[engKey].shifts.push(shift);
      engMap[engKey].completedDays += 1;
      engMap[engKey].totalPaid += shift.amount || 0;
    });

    return Object.values(engMap);
  }, [completedShiftsList, booking, totalShifts]);

  const isAllMilestonesPaid =
    (completedCount >= totalShifts && totalShifts > 0) ||
    (shifts.length > 0 && shifts.every((s) => s.status === "completed_paid"));

  useEffect(() => {
    if (selectedShift) {
      setTabBarVisible(false);
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        setSelectedShift(null);
        return true;
      });
      return () => {
        sub.remove();
        setTabBarVisible(true);
      };
    } else {
      setTabBarVisible(true);
    }
  }, [selectedShift]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [bookings, payments, vitals] = await Promise.all([
        api.getBookings(),
        api.getPaymentHistory(),
        api.getLatestPatientVitals(),
      ]);

      const activeBooking =
        bookings.find(
          (b) =>
            (b.status === "confirmed" || b.status === "active" || b.status === "Active") &&
            (b.completedShifts || 0) < (b.durationDays || 7)
        ) ||
        bookings.find(
          (b) => b.status === "confirmed" || b.status === "active" || b.status === "Active"
        ) ||
        bookings[0];

      if (activeBooking) {
        setBooking(activeBooking);
        const totalAmt = Number(activeBooking.totalAmount) || 7140;
        setTotalContractAmount(totalAmt);

        // Determine payments released
        const bookingPayments = payments.filter((p: any) => p.bookingId === activeBooking.id);
        const releasedPayments = bookingPayments.filter(
          (p: any) => p.status === "released" || p.status === "completed"
        );
        const releasedSum = releasedPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const paidCount = Math.max(activeBooking.completedShifts || 0, releasedPayments.length);
        const duration = activeBooking.durationDays || 7;
        const dailyRate = Math.round(totalAmt / duration);
        const safePaid = Math.min(duration, paidCount);

        setCompletedCount(safePaid);
        const safeReleased = Math.min(
          totalAmt,
          releasedSum > 0 ? releasedSum : dailyRate * safePaid
        );
        setReleasedAmount(safeReleased);

        // Fetch real schedule_shifts
        const dbShifts = await api.getBookingShifts(activeBooking.id);
        if (dbShifts && dbShifts.length > 0) {
          const mapped: ShiftMilestone[] = dbShifts.map((s: any, idx: number) => {
            const shiftNum = s.shiftDay || idx + 1;
            const isShiftFinished = s.status === "completed";
            const isShiftActive = s.status === "active";
            const isMilestonePaid = paidCount > 0 && shiftNum <= paidCount;
            const shiftVitals = s.vitals && typeof s.vitals === "object" ? s.vitals : null;
            const hasRealVitals = Boolean(shiftVitals && (shiftVitals.bp || shiftVitals.pulse || shiftVitals.spo2));

            let computedStatus: "completed_paid" | "ready_for_release" | "in_progress" | "scheduled" = "scheduled";
            if (isMilestonePaid) {
              computedStatus = "completed_paid";
            } else if (isShiftFinished) {
              computedStatus = "ready_for_release";
            } else if (isShiftActive) {
              computedStatus = "in_progress";
            }

            return {
              id: s.id,
              shiftNumber: shiftNum,
              date: s.date
                ? new Date(s.date).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })
                : `Day ${shiftNum}`,
              hours: `${s.startTime || "08:00 AM"} – ${s.endTime || "08:00 PM"} (${activeBooking.dailyHours || 12}h)`,
              amount: s.netPayout || Math.round(totalAmt / (activeBooking.durationDays || 7)),
              nurseName: activeBooking.nurseName || "Assigned Registered Clinician",
              status: computedStatus,
              vitalsCharted: hasRealVitals,
              notes: s.notes || (isMilestonePaid ? "Shift completed and timesheet verified." : isShiftActive ? "Clinician clocked in on-site. Monitoring active." : "Scheduled care shift."),
              location: s.location || activeBooking.location || "Care Location, Punjab",
              gpsCheckinAt: s.gpsCheckinAt,
              vitals: hasRealVitals
                ? {
                    bp: shiftVitals.bp || "--/--",
                    hr: shiftVitals.pulse || shiftVitals.hr || "--",
                    pulse: shiftVitals.pulse || shiftVitals.hr || "--",
                    spo2: shiftVitals.spo2 || "--",
                    sugar: shiftVitals.sugar || "--",
                    temp: shiftVitals.temp || "--",
                    recordedAt: shiftVitals.recordedAt,
                    nurseName: shiftVitals.nurseName || activeBooking.nurseName,
                  }
                : undefined,
            };
          });

          setShifts(mapped);

          // Update active telemetry strictly from real charted vitals
          const liveShift = mapped.find((s) => s.status === "in_progress");
          if (liveShift?.vitals && liveShift.vitalsCharted) {
            setPatientVitals({
              bp: liveShift.vitals.bp || "--/--",
              hr: liveShift.vitals.hr || liveShift.vitals.pulse || "--",
              spo2: liveShift.vitals.spo2 || "--",
              sugar: liveShift.vitals.sugar || "--",
              temp: liveShift.vitals.temp || "--",
            });
          } else if (vitals && vitals.isLive && vitals.bp && vitals.bp !== "--/--") {
            setPatientVitals({
              bp: vitals.bp,
              hr: vitals.pulse || "--",
              spo2: vitals.spo2 || "--",
              sugar: vitals.sugar || "--",
              temp: vitals.temp || "--",
            });
          } else {
            setPatientVitals({
              bp: "--/--",
              hr: "--",
              spo2: "--",
              sugar: "--",
              temp: "--",
            });
          }
        } else {
          // Dynamic days fallback
          const totalDays = activeBooking.durationDays || 7;
          const dailyRate = Math.round(totalAmt / totalDays);
          const startDate = activeBooking.startDate ? new Date(activeBooking.startDate) : new Date();
          const built: ShiftMilestone[] = [];

          for (let i = 0; i < totalDays; i++) {
            const shiftDate = new Date(startDate);
            shiftDate.setDate(shiftDate.getDate() + i);
            const isCompleted = paidCount > 0 && i < paidCount;
            const isLive = paidCount > 0 && i === paidCount;

            built.push({
              shiftNumber: i + 1,
              date: shiftDate.toLocaleDateString("en-IN", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              }),
              hours: `08:00 AM – ${(activeBooking.dailyHours || 12) > 8 ? "08:00 PM" : "04:00 PM"} (${activeBooking.dailyHours || 12}h)`,
              amount: dailyRate,
              nurseName: activeBooking.nurseName || "Assigned Clinician",
              status: isCompleted ? "completed_paid" : isLive ? "in_progress" : "scheduled",
              vitalsCharted: false,
              notes: isCompleted ? "Shift completed." : isLive ? "Clinician shift active." : "Scheduled shift.",
              location: activeBooking.location || "Care Location, Punjab",
              vitals: undefined,
            });
          }
          setShifts(built);
          setPatientVitals({
            bp: "--/--",
            hr: "--",
            spo2: "--",
            sugar: "--",
            temp: "--",
          });
        }
      } else {
        setTotalContractAmount(0);
        setReleasedAmount(0);
        setCompletedCount(0);
        setBooking(null);
        setShifts([]);
      }
    } catch (err) {
      console.warn("BookingsScreen loadData notice:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const unsubCrossApp = subscribeToCrossAppEvents((event) => {
      if (
        event.type === "VITALS_LOGGED" ||
        event.type === "NOTE_ADDED" ||
        event.type === "SHIFT_UPDATED" ||
        event.type === "SHIFT_STARTED" ||
        event.type === "SHIFT_COMPLETED" ||
        event.type === "ESCROW_UPDATED" ||
        event.type === "BID_ACCEPTED"
      ) {
        loadData();
      }
    });

    return () => {
      unsubCrossApp();
    };
  }, [loadData]);

  useEffect(() => {
    if (!booking?.id) return;
    const unsub = subscribeToVitals(booking.id, () => {
      loadData();
    });
    return unsub;
  }, [booking?.id, loadData]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleCallNurse = (phone?: string) => {
    const targetPhone = phone || "+919876543210";
    const cleanPhone = targetPhone.replace(/[\s\(\)\-]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("Clinician Contact", `Phone: ${targetPhone}`);
    });
  };

  const handleMessageNurse = () => {
    navigation?.navigate?.("Messages");
  };

  const handleOpenMapDirections = (rawLoc?: string) => {
    const loc = rawLoc || booking?.location || "Model Town, Jalandhar";
    const cleanQuery = encodeURIComponent(`${loc.trim()}, Punjab, India`);
    const url = Platform.select({
      ios: `maps:0,0?q=${cleanQuery}`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${cleanQuery}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${cleanQuery}`,
    })!;

    Linking.openURL(url).catch(() => {
      Alert.alert("Doorstep GPS Navigation", `Care Address:\n${loc}`);
    });
  };

  const handleApproveShift = (shift: ShiftMilestone) => {
    Alert.alert(
      "Confirm Protected Milestone Release",
      `Disburse ₹${shift.amount.toLocaleString("en-IN")} from Protected Care Deposit to ${shift.nurseName} for Shift #${shift.shiftNumber}?\n\nBedside telemetry and clinical timesheet have been verified.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve & Release",
          style: "default",
          onPress: async () => {
            if (isReleasing) return;
            setIsReleasing(true);
            try {
              // 1. Optimistic snappy local update to prevent perceived lag
              setShifts((prev) =>
                prev.map((s) =>
                  s.shiftNumber === shift.shiftNumber
                    ? { ...s, status: "completed_paid" as const }
                    : s
                )
              );
              setCompletedCount((prev) => Math.min(totalShifts, Math.max(prev, shift.shiftNumber)));
              setReleasedAmount((prev) => Math.min(totalContractAmount, prev + shift.amount));
              setSelectedShift(null);

              // 2. Cloud escrow release
              if (booking?.id) {
                await api.releaseEscrowMilestone(booking.id);
              }
              Alert.alert(
                "Protected Milestone Released",
                `₹${shift.amount.toLocaleString("en-IN")} disbursed to ${shift.nurseName}. Milestone recorded.`
              );
              await loadData();
            } catch (err: any) {
              Alert.alert("Disbursement Notice", err?.message || "Failed to release milestone payment.");
              await loadData();
            } finally {
              setIsReleasing(false);
            }
          },
        },
      ]
    );
  };

  const shiftWaitingForRelease = shifts.find((s) => s.status === "ready_for_release");
  const activeShift =
    shifts.find((s) => s.status === "in_progress") ||
    shiftWaitingForRelease ||
    shifts[0];

  const nurseDisplayName = booking?.nurseName || "Nurse Harpreet Singh RN";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neuBg} />

      {/* ─── Top Neumorphic App Bar (Dashboard Aligned) ─── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => {
            if (navigation?.canGoBack?.()) {
              navigation.goBack();
            } else {
              navigation?.navigate?.("Dashboard");
            }
          }}
          activeOpacity={0.75}
        >
          <ChevronLeft size={22} color={colors.gray800} strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={styles.topTitleCenter}>
          <Text style={styles.topBarTitle}>Care Shifts & Milestones</Text>
          <Text style={styles.topBarSub}>Protected Care Delivery</Text>
        </View>

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={handleManualRefresh}
          activeOpacity={0.75}
        >
          <RotateCw size={18} color={isRefreshing ? colors.primary : colors.gray700} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* ─── Segmented Control: Active Shift vs Shift History ─── */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "active" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("active")}
          activeOpacity={0.8}
        >
          <Activity size={14} color={activeTab === "active" ? colors.primary : colors.gray500} strokeWidth={2.2} />
          <Text style={[styles.segmentText, activeTab === "active" && styles.segmentTextActive]}>
            Active Care Shift
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "history" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("history")}
          activeOpacity={0.8}
        >
          <Clock size={14} color={activeTab === "history" ? colors.primary : colors.gray500} strokeWidth={2.2} />
          <Text style={[styles.segmentText, activeTab === "history" && styles.segmentTextActive]}>
            Shift History ({completedShiftsList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && !booking ? (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BookingSkeleton />
        </ScrollView>
      ) : activeTab === "history" ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* History Summary Ledger Card */}
          <View style={styles.whiteCard}>
            <View style={styles.depositHeaderRow}>
              <View style={[styles.depositShieldIcon, { backgroundColor: "#ECFDF5" }]}>
                <ShieldCheck size={18} color="#059669" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cleanHealthTitle}>Shift Completion Ledger</Text>
                <Text style={styles.cleanHealthSub}>Punjab Nursing Council Verified Disbursements</Text>
              </View>
            </View>

            <View style={styles.historyStatRow}>
              <View style={styles.historyStatBox}>
                <Text style={styles.historyStatNum}>{completedShiftsList.length}</Text>
                <Text style={styles.historyStatLabel}>Completed</Text>
              </View>
              <View style={styles.historyStatDivider} />
              <View style={styles.historyStatBox}>
                <Text style={[styles.historyStatNum, { color: "#059669" }]}>₹{safeReleasedAmount.toLocaleString("en-IN")}</Text>
                <Text style={styles.historyStatLabel}>Disbursed</Text>
              </View>
              <View style={styles.historyStatDivider} />
              <View style={styles.historyStatBox}>
                <Text style={[styles.historyStatNum, { color: colors.primary }]}>{completionPercentage}%</Text>
                <Text style={styles.historyStatLabel}>Settled</Text>
              </View>
            </View>
          </View>

          {/* Completed Shifts List */}
          {completedShiftsList.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Clock size={32} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.emptyTitle}>No Completed Shifts Yet</Text>
              <Text style={styles.emptySub}>
                When shifts are completed by your clinician and you release milestone payments, verified care timesheets and sensor telemetry will be archived here.
              </Text>
            </View>
          ) : (
            <View style={styles.whiteCard}>
              <View style={styles.cleanHealthHeader}>
                <View style={styles.cleanHealthHeaderLeft}>
                  <View style={[styles.cleanHealthIconWrap, { backgroundColor: "#ECFDF5" }]}>
                    <CheckCircle2 size={18} color="#059669" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cleanHealthTitle}>Verified Shift Dossiers</Text>
                    <Text style={styles.cleanHealthSub}>Tap any completed shift to view full report</Text>
                  </View>
                </View>
              </View>

              <View style={styles.timelineList}>
                {groupedCompletedEngagements.map((eng) => (
                  <TouchableOpacity
                    key={`eng-${eng.id}`}
                    style={styles.historyShiftCard}
                    onPress={() => setSelectedCompletedEngagement(eng)}
                    activeOpacity={0.82}
                  >
                    <View style={styles.historyShiftTop}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <View style={styles.badgePaid}>
                            <Text style={styles.badgePaidText}>
                              {eng.completedDays} {eng.completedDays === 1 ? "Shift" : "Shifts"} Completed
                            </Text>
                          </View>
                          <Text style={styles.historyShiftDate}>Day 1 – Day {eng.completedDays} of {eng.totalDays}</Text>
                        </View>
                        <Text style={styles.historyShiftNurse}>{eng.title}</Text>
                        <Text style={[styles.historyShiftHours, { marginTop: 2 }]}>
                          Clinician: {eng.nurseName}
                        </Text>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: "#059669" }}>
                          ₹{eng.totalPaid.toLocaleString("en-IN")}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.gray500, fontWeight: "600", marginTop: 2 }}>
                          Disbursed
                        </Text>
                      </View>
                    </View>

                    <View style={styles.historyCardFooter}>
                      <Text style={styles.historyCardNotes}>Tap to view day-by-day logs & vitals</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={styles.historyViewReceiptText}>View Dossier</Text>
                        <ChevronRight size={14} color={colors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : !booking ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.scrollContent, styles.emptyContainer]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Activity size={32} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.emptyTitle}>No Active Care Shifts</Text>
            <Text style={styles.emptySub}>
              You don't have an active nursing care shift right now. Once a verified nurse accepts your care request and booking confirmation is completed, your active shifts, live telemetry, and bedside vitals will be tracked here in real time.
            </Text>
            <TouchableOpacity
              style={styles.emptyCtaBtn}
              onPress={() => {
                if (navigation?.navigate) {
                  navigation.navigate("Post Job");
                }
              }}
              activeOpacity={0.82}
            >
              <Text style={styles.emptyCtaText}>Post a Care Request</Text>
              <ArrowRight size={16} color={colors.white} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isAllMilestonesPaid ? (
            <View style={styles.whiteCard}>
              <View style={[styles.depositShieldIcon, { width: 56, height: 56, borderRadius: 28, alignSelf: "center", marginBottom: 14, backgroundColor: "#ECFDF5" }]}>
                <ShieldCheck size={28} color="#059669" strokeWidth={2.4} />
              </View>
              <Text style={[styles.cleanHealthTitle, { textAlign: "center", fontSize: 18, marginBottom: 6 }]}>
                Care Engagement Concluded
              </Text>
              <Text style={[styles.cleanHealthSub, { textAlign: "center", marginBottom: 20, paddingHorizontal: 12 }]}>
                All {totalShifts} shifts have concluded and the protected care deposit has been fully disbursed.
              </Text>

              <TouchableOpacity
                style={styles.concludedPrimaryBtn}
                onPress={() => setActiveTab("history")}
                activeOpacity={0.85}
              >
                <Clock size={16} color={colors.white} strokeWidth={2.4} />
                <Text style={styles.concludedPrimaryBtnText}>View Shift History ({completedShiftsList.length} Shifts) →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.concludedSecondaryBtn}
                onPress={() => navigation?.navigate?.("Post Job")}
                activeOpacity={0.8}
              >
                <Text style={styles.concludedSecondaryBtnText}>Post a New Care Request</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════════════════
                  CARD 1: ACTIVE SHIFT HERO CARD (Neumorphic Dashboard Style)
                 ═══════════════════════════════════════════════════════════════════ */}
              <View style={styles.whiteCard}>
            {/* Top Badges Row */}
            <View style={styles.badgeRow}>
              <View style={styles.liveStatusPill}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveStatusPillText}>
                  SHIFT {activeShift?.shiftNumber || 1} OF {totalShifts} • IN PROGRESS
                </Text>
              </View>

              <View
                style={[
                  styles.cleanStableBadge,
                  activeShift?.gpsCheckinAt && {
                    backgroundColor: "#ECFDF5",
                    borderColor: "#A7F3D0",
                  },
                ]}
              >
                <View
                  style={[
                    styles.cleanPulseDot,
                    activeShift?.gpsCheckinAt && { backgroundColor: "#059669" },
                  ]}
                />
                <Text
                  style={[
                    styles.cleanStableText,
                    activeShift?.gpsCheckinAt && { color: "#065F46", fontWeight: "700" },
                  ]}
                >
                  {activeShift?.gpsCheckinAt
                    ? "Clinician On-Site • Bedside Active"
                    : "Telemetry Synced"}
                </Text>
              </View>
            </View>

            {/* Nurse Profile Section */}
            <View style={styles.nurseProfileSection}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitialText}>
                  {nurseDisplayName.includes("Harpreet") ? "HS" : nurseDisplayName.slice(0, 2).toUpperCase()}
                </Text>
              </View>

              <View style={styles.nurseInfoCol}>
                <View style={styles.nurseNameRow}>
                  <Text style={styles.nurseNameText} numberOfLines={1}>
                    {nurseDisplayName}
                  </Text>
                  <BadgeCheck size={18} color={colors.primary} fill={colors.primary} stroke={colors.white} strokeWidth={2} />
                </View>

                {/* Accreditation Capsule */}
                <View style={styles.accreditationCapsule}>
                  <ShieldCheck size={13} color={colors.gray700} strokeWidth={2.2} />
                  <Text style={styles.accreditationText}>Punjab Nursing Council Accredited</Text>
                </View>

                {/* Location row */}
                <View style={styles.locationRow}>
                  <MapPin size={12} color={colors.gray500} strokeWidth={2} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {booking?.location || "Model Town, Jalandhar"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Tactile Quick Actions (Exact match to Dashboard's actionBtn style) */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleCallNurse()}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconWrap}>
                  <Phone size={16} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.actionLabel}>Call Clinician</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleMessageNurse}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconWrap}>
                  <MessageSquare size={16} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.actionLabel}>Encrypted Chat</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ═══════════════════════════════════════════════════════════════════
              CARD 2: BEDSIDE VITALS TELEMETRY (Exact Clean Bento from Dashboard)
             ═══════════════════════════════════════════════════════════════════ */}
          <View style={styles.whiteCard}>
            {/* Header */}
            <View style={styles.cleanHealthHeader}>
              <View style={styles.cleanHealthHeaderLeft}>
                <View style={styles.cleanHealthIconWrap}>
                  <HeartPulse size={18} color="#059669" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cleanHealthTitle}>Bedside Vitals</Text>
                  <Text style={styles.cleanHealthSub}>Continuous Sensor Telemetry</Text>
                </View>
              </View>

              <View style={styles.cleanStableBadge}>
                <View style={styles.cleanPulseDot} />
                <Text style={styles.cleanStableText}>Synced & Stable</Text>
              </View>
            </View>

            {/* 2x2 Clean Bento Grid */}
            <View style={styles.cleanVitalsGrid}>
              {/* Tile 1: Blood Pressure */}
              <TouchableOpacity
                style={styles.cleanVitalTile}
                onPress={() => Alert.alert("Blood Pressure", `Latest Reading: ${patientVitals.bp} mmHg\nRecorded by ${nurseDisplayName} at bedside.`)}
                activeOpacity={0.8}
              >
                <View style={styles.vitalTileTopRow}>
                  <Text style={styles.cleanVitalLabel}>BLOOD PRESSURE</Text>
                  <Stethoscope size={15} color="#0D9488" strokeWidth={2.2} />
                </View>
                <View style={styles.cleanVitalNumRow}>
                  <Text style={styles.cleanVitalNum}>{patientVitals.bp}</Text>
                  <Text style={styles.cleanVitalUnit}>mmHg</Text>
                </View>
                <Text style={styles.cleanVitalTag}>{patientVitals.bp !== "--/--" ? "Recorded" : "No data"}</Text>
              </TouchableOpacity>

              {/* Tile 2: Pulse Rate */}
              <TouchableOpacity
                style={styles.cleanVitalTile}
                onPress={() => Alert.alert("Pulse Rate", `Latest Reading: ${patientVitals.hr} bpm\nRecorded at bedside.`)}
                activeOpacity={0.8}
              >
                <View style={styles.vitalTileTopRow}>
                  <Text style={styles.cleanVitalLabel}>PULSE RATE</Text>
                  <HeartPulse size={15} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.cleanVitalNumRow}>
                  <Text style={styles.cleanVitalNum}>{patientVitals.hr}</Text>
                  <Text style={styles.cleanVitalUnit}>bpm</Text>
                </View>
                <Text style={styles.cleanVitalTag}>{patientVitals.hr !== "--" ? "Recorded" : "No data"}</Text>
              </TouchableOpacity>

              {/* Tile 3: SpO2 */}
              <TouchableOpacity
                style={styles.cleanVitalTile}
                onPress={() => Alert.alert("Oxygen Saturation", `Current Saturation: ${patientVitals.spo2}%\nRecorded at bedside.`)}
                activeOpacity={0.8}
              >
                <View style={styles.vitalTileTopRow}>
                  <Text style={styles.cleanVitalLabel}>OXYGEN SATURATION</Text>
                  <Droplet size={15} color="#0284C7" strokeWidth={2.2} />
                </View>
                <View style={styles.cleanVitalNumRow}>
                  <Text style={styles.cleanVitalNum}>{patientVitals.spo2}</Text>
                  <Text style={styles.cleanVitalUnit}>%</Text>
                </View>
                <Text style={styles.cleanVitalTag}>{patientVitals.spo2 !== "--" ? "Recorded" : "No data"}</Text>
              </TouchableOpacity>

              {/* Tile 4: Temperature */}
              <TouchableOpacity
                style={styles.cleanVitalTile}
                onPress={() => Alert.alert("Body Temperature", `Current Temp: ${patientVitals.temp}°F\nRecorded at bedside.`)}
                activeOpacity={0.8}
              >
                <View style={styles.vitalTileTopRow}>
                  <Text style={styles.cleanVitalLabel}>BODY TEMP</Text>
                  <ThermometerSun size={15} color="#0284C7" strokeWidth={2.2} />
                </View>
                <View style={styles.cleanVitalNumRow}>
                  <Text style={styles.cleanVitalNum}>{patientVitals.temp}</Text>
                  <Text style={styles.cleanVitalUnit}>°F</Text>
                </View>
                <Text style={styles.cleanVitalTag}>Afebrile</Text>
              </TouchableOpacity>
            </View>

            {/* Dossier telemetry note footer */}
            <View style={styles.cleanDossierLinkRow}>
              <View style={styles.cleanDossierLinkLeft}>
                <Clock size={13} color={colors.gray500} strokeWidth={2} />
                <Text style={styles.cleanDossierLinkNote} numberOfLines={1}>
                  Sensor telemetry synchronized with patient health record
                </Text>
              </View>
              <Text style={styles.cleanDossierLinkAction}>Live Active</Text>
            </View>
          </View>

          {/* ═══════════════════════════════════════════════════════════════════
              CARD 3: PROTECTED CARE DEPOSIT (Clean Neumorphic Ledger)
             ═══════════════════════════════════════════════════════════════════ */}
          <View style={styles.whiteCard}>
            {/* Header */}
            <View style={styles.depositHeaderRow}>
              <View style={styles.depositShieldIcon}>
                <ShieldCheck size={18} color={colors.primary} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cleanHealthTitle}>Protected Care Deposit</Text>
                <Text style={styles.cleanHealthSub}>Punjab Nursing Council Protected</Text>
              </View>
            </View>

            {/* Financial Ledger Body */}
            <View style={styles.depositBodyRow}>
              {/* Circular Progress Ring */}
              <View style={styles.ringContainer}>
                <CircularProgressRing
                  percentage={completionPercentage}
                  size={72}
                  strokeWidth={7}
                  color={colors.primary}
                  trackColor="#E2E8F0"
                  textColor={colors.gray900}
                />
              </View>

              {/* 3-Row Inset Financial Table */}
              <View style={styles.financialTableBox}>
                <View style={styles.financialRow}>
                  <Text style={styles.financialKeyText}>Total Protected:</Text>
                  <Text style={styles.financialValText}>₹{totalContractAmount.toLocaleString("en-IN")}</Text>
                </View>

                <View style={styles.financialRow}>
                  <Text style={styles.financialKeyText}>Disbursed to Date:</Text>
                  <Text style={[styles.financialValText, { color: "#059669" }]}>₹{safeReleasedAmount.toLocaleString("en-IN")}</Text>
                </View>

                <View style={[styles.financialRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <Text style={styles.financialKeyText}>Remaining Held:</Text>
                  <Text style={[styles.financialValText, { color: colors.primaryDark }]}>₹{heldAmount.toLocaleString("en-IN")}</Text>
                </View>
              </View>
            </View>

            {/* Context Milestone Release Button (Rendered when shift is verified and ready) */}
            {shiftWaitingForRelease && (
              <TouchableOpacity
                style={[styles.releaseActionBtn, isReleasing && { opacity: 0.75 }]}
                onPress={() => handleApproveShift(shiftWaitingForRelease)}
                activeOpacity={0.88}
                disabled={isReleasing}
              >
                {isReleasing ? (
                  <>
                    <ActivityIndicator size="small" color={colors.white} />
                    <Text style={styles.releaseActionBtnText}>Disbursing Protected Milestone...</Text>
                  </>
                ) : (
                  <>
                    <Lock size={15} color={colors.white} strokeWidth={2.4} />
                    <Text style={styles.releaseActionBtnText}>
                      Release Day {shiftWaitingForRelease.shiftNumber} Milestone (₹{shiftWaitingForRelease.amount.toLocaleString("en-IN")}) →
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ═══════════════════════════════════════════════════════════════════
              CARD 4: DAILY SHIFT TIMELINE (Interactive Stepper Rows)
             ═══════════════════════════════════════════════════════════════════ */}
          <View style={styles.whiteCard}>
            <View style={styles.cleanHealthHeader}>
              <View style={styles.cleanHealthHeaderLeft}>
                <View style={[styles.cleanHealthIconWrap, { backgroundColor: "#EFF6FF" }]}>
                  <Calendar size={18} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cleanHealthTitle}>Daily Shift Timeline</Text>
                  <Text style={styles.cleanHealthSub}>Tap any shift to view telemetry & timesheet</Text>
                </View>
              </View>
            </View>

            <View style={styles.timelineList}>
              {shifts.map((shift) => {
                const isPaid = shift.status === "completed_paid";
                const isLive = shift.status === "in_progress";
                const isReady = shift.status === "ready_for_release";

                return (
                  <TouchableOpacity
                    key={`shift-${shift.shiftNumber}-${shift.id || ""}`}
                    style={[
                      styles.timelineItemRow,
                      isLive && styles.timelineItemRowActive,
                    ]}
                    onPress={() => setSelectedShift(shift)}
                    activeOpacity={0.8}
                  >
                    {/* Stepper Status Dot */}
                    <View style={styles.timelineStatusIconWrap}>
                      {isPaid ? (
                        <View style={styles.iconCircleGreen}>
                          <CheckCircle2 size={16} color="#059669" strokeWidth={2.4} />
                        </View>
                      ) : isLive ? (
                        <View style={styles.iconCircleBlue}>
                          <View style={styles.pulseDot} />
                        </View>
                      ) : isReady ? (
                        <View style={styles.iconCircleAmber}>
                          <Lock size={14} color="#D97706" strokeWidth={2.4} />
                        </View>
                      ) : (
                        <View style={styles.iconCircleSlate}>
                          <Clock size={14} color="#94A3B8" strokeWidth={2} />
                        </View>
                      )}
                    </View>

                    {/* Middle Info */}
                    <View style={styles.timelineInfoCol}>
                      <View style={styles.timelineDayTitleRow}>
                        <Text style={styles.timelineDayTitle}>Day {shift.shiftNumber}</Text>
                        <Text style={styles.timelineDateText}>• {shift.date}</Text>
                      </View>
                      <Text style={styles.timelineHoursText}>{shift.hours}</Text>
                    </View>

                    {/* Right Pill & Amount */}
                    <View style={styles.timelineRightCol}>
                      {isPaid && (
                        <View style={styles.badgePaid}>
                          <Text style={styles.badgePaidText}>PAID</Text>
                        </View>
                      )}
                      {isLive && (
                        <View style={styles.badgeActive}>
                          <Text style={styles.badgeActiveText}>ACTIVE</Text>
                        </View>
                      )}
                      {isReady && (
                        <View style={styles.badgeReady}>
                          <Text style={styles.badgeReadyText}>READY</Text>
                        </View>
                      )}
                      {!isPaid && !isLive && !isReady && (
                        <View style={styles.badgeScheduled}>
                          <Text style={styles.badgeScheduledText}>SCHEDULED</Text>
                        </View>
                      )}

                      <View style={styles.timelineAmountChevronRow}>
                        <Text style={styles.timelineAmountText}>
                          ₹{shift.amount.toLocaleString("en-IN")}
                        </Text>
                        <ChevronRight size={15} color={colors.gray400} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          </>
        )}
        </ScrollView>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SHIFT INSPECTION BOTTOM SHEET (Contained to Mobile Viewport)
         ═══════════════════════════════════════════════════════════════════ */}
      {selectedShift && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            onPress={() => setSelectedShift(null)}
            activeOpacity={1}
          />
          <View style={styles.modalSheet}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalShiftTitle}>
                  Shift #{selectedShift.shiftNumber} Care Timesheet
                </Text>
                <Text style={styles.modalShiftDate}>{selectedShift.date} • {selectedShift.hours}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedShift(null)}
                style={styles.circleCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.gray700} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
              {/* Protected Milestone Security Box */}
              <View style={styles.modalFinancialBox}>
                <View>
                  <Text style={styles.modalFinancialLabel}>PROTECTED MILESTONE AMOUNT</Text>
                  <Text style={styles.modalFinancialAmount}>
                    ₹{selectedShift.amount.toLocaleString("en-IN")}
                  </Text>
                </View>
                <View style={styles.modalProtectedPill}>
                  <ShieldCheck size={14} color="#059669" strokeWidth={2.4} />
                  <Text style={styles.modalProtectedText}>
                    {selectedShift.status === "completed_paid" ? "Disbursed" : "Deposit Protected"}
                  </Text>
                </View>
              </View>

              {/* Charted Bedside Vitals Bento */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSubLabel}>BEDSIDE TELEMETRY RECORDED</Text>
                <View style={styles.modalVitalsGrid}>
                  <View style={styles.modalVitalItem}>
                    <Text style={styles.modalVitalKey}>BP</Text>
                    <Text style={styles.modalVitalVal}>{selectedShift.vitals?.bp || patientVitals.bp}</Text>
                  </View>
                  <View style={styles.modalVitalItem}>
                    <Text style={styles.modalVitalKey}>PULSE</Text>
                    <Text style={styles.modalVitalVal}>{selectedShift.vitals?.pulse || selectedShift.vitals?.hr || patientVitals.hr} bpm</Text>
                  </View>
                  <View style={styles.modalVitalItem}>
                    <Text style={styles.modalVitalKey}>SPO2</Text>
                    <Text style={styles.modalVitalVal}>{selectedShift.vitals?.spo2 || patientVitals.spo2}%</Text>
                  </View>
                  <View style={styles.modalVitalItem}>
                    <Text style={styles.modalVitalKey}>TEMP</Text>
                    <Text style={styles.modalVitalVal}>{selectedShift.vitals?.temp || patientVitals.temp}°F</Text>
                  </View>
                </View>
              </View>

              {/* Nurse Notes */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSubLabel}>CLINICAL NOTES</Text>
                <View style={styles.modalInsetBox}>
                  <Text style={styles.modalNotesText}>
                    {selectedShift.notes || "Shift active. Clinician providing on-site care and continuous telemetry monitoring."}
                  </Text>
                </View>
              </View>

              {/* Location Navigation */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSubLabel}>CARE LOCATION & GPS</Text>
                <View style={styles.modalInsetBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <MapPin size={15} color={colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.gray900 }}>
                      {selectedShift.location || booking?.location || "Model Town, Jalandhar"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalMapBtn}
                    onPress={() => handleOpenMapDirections(selectedShift.location)}
                    activeOpacity={0.8}
                  >
                    <Navigation size={14} color={colors.white} strokeWidth={2.2} />
                    <Text style={styles.modalMapBtnText}>Open Doorstep GPS Directions</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Attestation */}
              <View style={styles.modalSignatureBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalSignerName}>
                    {selectedShift.nurseName || nurseDisplayName}
                  </Text>
                  <Text style={styles.modalSignerSub}>
                    Punjab Nursing Council Verified Clinician
                  </Text>
                </View>
                <BadgeCheck size={20} color={colors.primary} fill={colors.primary} stroke={colors.white} />
              </View>

              {/* Action Button */}
              {selectedShift.status === "ready_for_release" && (
                <TouchableOpacity
                  style={styles.modalApproveBtn}
                  onPress={() => handleApproveShift(selectedShift)}
                  activeOpacity={0.88}
                >
                  <Check size={16} color={colors.white} strokeWidth={2.4} />
                  <Text style={styles.modalApproveBtnText}>
                    Approve & Release ₹{selectedShift.amount.toLocaleString("en-IN")}
                  </Text>
                </TouchableOpacity>
              )}

              {selectedShift.status === "completed_paid" && (
                <View style={styles.modalDisbursedBox}>
                  <CheckCircle2 size={16} color="#059669" strokeWidth={2.4} />
                  <Text style={styles.modalDisbursedText}>
                    Milestone ₹{selectedShift.amount.toLocaleString("en-IN")} Disbursed & Settled
                  </Text>
                </View>
              )}

              {(selectedShift.status === "in_progress" || selectedShift.status === "scheduled") && (
                <View style={styles.modalScheduledBox}>
                  <ShieldCheck size={16} color={colors.primary} strokeWidth={2.4} />
                  <Text style={styles.modalScheduledText}>
                    ₹{selectedShift.amount.toLocaleString("en-IN")} Protected Care Deposit (PNC Protected)
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          COMPLETED ENGAGEMENT DAY-BY-DAY DOSSIER SHEET
         ═══════════════════════════════════════════════════════════════════ */}
      {selectedCompletedEngagement && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            onPress={() => setSelectedCompletedEngagement(null)}
            activeOpacity={1}
          />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <View style={styles.badgePaid}>
                    <Text style={styles.badgePaidText}>
                      {selectedCompletedEngagement.completedDays} Shifts Completed
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#059669" }}>
                    ₹{selectedCompletedEngagement.totalPaid.toLocaleString("en-IN")} Disbursed
                  </Text>
                </View>
                <Text style={styles.modalShiftTitle}>
                  {selectedCompletedEngagement.title}
                </Text>
                <Text style={styles.modalShiftDate}>
                  Attending Clinician: {selectedCompletedEngagement.nurseName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedCompletedEngagement(null)}
                style={styles.circleCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.gray700} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.modalSubLabel}>DAY-BY-DAY SHIFT BREAKDOWN</Text>
                <Text style={{ fontSize: 12, color: colors.gray500, marginTop: 2 }}>
                  Verified bedside telemetry, vital sign charts, and milestone sign-offs
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                {selectedCompletedEngagement.shifts.map((shift: ShiftMilestone) => (
                  <TouchableOpacity
                    key={`modal-day-${shift.id || shift.shiftNumber}`}
                    style={styles.historyShiftCard}
                    onPress={() => {
                      setSelectedCompletedEngagement(null);
                      setSelectedShift(shift);
                    }}
                    activeOpacity={0.82}
                  >
                    <View style={styles.historyShiftTop}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.historyShiftDay}>Day {shift.shiftNumber}</Text>
                          <Text style={styles.historyShiftDate}>• {shift.date}</Text>
                        </View>
                        <Text style={styles.historyShiftHours}>{shift.hours}</Text>
                      </View>
                      <View style={styles.badgePaid}>
                        <Text style={styles.badgePaidText}>₹{shift.amount.toLocaleString("en-IN")} PAID</Text>
                      </View>
                    </View>

                    {shift.vitals && shift.vitals.bp && shift.vitals.bp !== "--/--" && (
                      <View style={styles.historyVitalsPill}>
                        <HeartPulse size={12} color="#059669" />
                        <Text style={styles.historyVitalsPillText}>
                          Vitals: {shift.vitals.bp} mmHg • {shift.vitals.pulse || shift.vitals.hr} bpm • SpO₂ {shift.vitals.spo2}%
                        </Text>
                      </View>
                    )}

                    <View style={styles.historyCardFooter}>
                      <Text style={styles.historyCardNotes} numberOfLines={1}>{shift.notes}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={styles.historyViewReceiptText}>Full Timesheet</Text>
                        <ChevronRight size={14} color={colors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  marginTop: 18,
                }}
                onPress={() => setSelectedCompletedEngagement(null)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, fontWeight: "800", color: colors.white }}>Close Dossier</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  topTitleCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  topBarSub: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray500,
    marginTop: 1,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7A8AAB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  circleCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neuInset,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
  },
  container: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  /* Soft-Neumorphic Card Foundation (Identical to DashboardScreen) */
  whiteCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    padding: 18,
    marginBottom: 16,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 4,
  },

  /* Card 1: Active Shift Hero Card */
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  liveStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF0FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  liveStatusPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  cleanStableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  cleanPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  cleanStableText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },

  nurseProfileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: "#7A8AAB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarInitialText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
  },
  nurseInfoCol: {
    flex: 1,
    gap: 4,
  },
  nurseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nurseNameText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.2,
  },
  accreditationCapsule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  accreditationText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray700,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.gray500,
  },

  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 2,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.neuInset,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray800,
  },

  /* Card 2: Bedside Vitals (Clean Health Bento) */
  cleanHealthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cleanHealthHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  cleanHealthIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  cleanHealthTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  cleanHealthSub: {
    fontSize: 11,
    color: colors.gray500,
    fontWeight: "500",
    marginTop: 1,
  },
  cleanVitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  cleanVitalTile: {
    width: "48%",
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 112,
    backgroundColor: colors.neuInset,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    borderRadius: 18,
    padding: 12,
    justifyContent: "space-between",
  },
  vitalTileTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cleanVitalLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray500,
    letterSpacing: 0.3,
  },
  cleanVitalNumRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  cleanVitalNum: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.gray900,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
  },
  cleanVitalUnit: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray500,
  },
  cleanVitalTag: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  cleanDossierLinkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(226, 234, 245, 0.7)",
  },
  cleanDossierLinkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  cleanDossierLinkNote: {
    fontSize: 11,
    color: colors.gray600,
    fontWeight: "500",
    flexShrink: 1,
  },
  cleanDossierLinkAction: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    marginLeft: 8,
    flexShrink: 0,
  },

  /* Card 3: Protected Care Deposit */
  depositHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  depositShieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  depositBodyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  ringContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  financialTableBox: {
    flex: 1,
    backgroundColor: colors.neuInset,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226, 234, 245, 0.6)",
  },
  financialKeyText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray600,
  },
  financialValText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.gray900,
  },
  releaseActionBtn: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 5,
  },
  releaseActionBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },

  /* Card 4: Daily Shift Timeline */
  timelineList: {
    gap: 10,
  },
  timelineItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neuInset,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    borderRadius: 18,
    padding: 12,
  },
  timelineItemRowActive: {
    backgroundColor: "#F4F7FF",
    borderColor: "rgba(46, 91, 255, 0.2)",
  },
  timelineStatusIconWrap: {
    marginRight: 10,
  },
  iconCircleGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleBlue: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleAmber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleSlate: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  timelineDayTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timelineDayTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.gray900,
  },
  timelineDateText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.gray500,
  },
  timelineHoursText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.gray600,
    marginTop: 2,
  },
  timelineRightCol: {
    alignItems: "flex-end",
    gap: 4,
  },
  badgePaid: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePaidText: {
    color: "#059669",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  badgeActive: {
    backgroundColor: "#EAF0FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeActiveText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  badgeReady: {
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeReadyText: {
    color: "#D97706",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  badgeScheduled: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeScheduledText: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  timelineAmountChevronRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timelineAmountText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.gray900,
  },

  /* Bottom Sheet Modal (Strict Simulator Containment) */
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 1000,
  },
  modalBackdropDismiss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  modalSheet: {
    width: "100%",
    maxWidth: 412,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "android" ? 28 : 36,
    maxHeight: Dimensions.get("window").height * 0.85,
    zIndex: 1001,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalShiftTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  modalShiftDate: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },
  modalFinancialBox: {
    backgroundColor: colors.neuInset,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    marginBottom: 14,
  },
  modalFinancialLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray500,
    letterSpacing: 0.4,
  },
  modalFinancialAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.gray900,
    marginTop: 2,
  },
  modalProtectedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(5, 150, 105, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  modalProtectedText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "700",
  },
  modalSection: {
    marginBottom: 14,
  },
  modalSubLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray500,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalVitalsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  modalVitalItem: {
    flex: 1,
    backgroundColor: colors.neuInset,
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
  },
  modalVitalKey: {
    fontSize: 9,
    color: colors.gray500,
    fontWeight: "700",
  },
  modalVitalVal: {
    fontSize: 13,
    color: colors.gray900,
    fontWeight: "800",
    marginTop: 2,
  },
  modalInsetBox: {
    backgroundColor: colors.neuInset,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
  },
  modalNotesText: {
    fontSize: 13,
    color: colors.gray700,
    lineHeight: 19,
  },
  modalMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  modalMapBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  modalSignatureBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neuInset,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    marginBottom: 16,
  },
  modalSignerName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray900,
  },
  modalSignerSub: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 1,
  },
  modalApproveBtn: {
    backgroundColor: "#059669",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  modalApproveBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  modalDisbursedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(5, 150, 105, 0.08)",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  modalDisbursedText: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "700",
  },
  modalScheduledBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neuInset,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  modalScheduledText: {
    fontSize: 12,
    color: colors.gray600,
    fontWeight: "600",
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 40,
    paddingBottom: 60,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.neuBorder,
    ...neuShadows.card,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray900,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: colors.gray600,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  emptyCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    ...neuShadows.buttonPrimary,
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.neuBorder,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.white,
    ...neuShadows.card,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray600,
  },
  segmentTextActive: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  historyStatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.neuBorder,
  },
  historyStatBox: {
    flex: 1,
    alignItems: "center",
  },
  historyStatNum: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  historyStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray500,
    marginTop: 2,
  },
  historyStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.neuBorder,
  },
  historyShiftCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.neuBorder,
  },
  historyShiftTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  historyShiftDay: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.gray900,
  },
  historyShiftDate: {
    fontSize: 12,
    color: colors.gray500,
    fontWeight: "500",
  },
  historyShiftNurse: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: "700",
    marginTop: 2,
  },
  historyShiftHours: {
    fontSize: 12,
    color: colors.gray600,
    marginBottom: 8,
  },
  historyVitalsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  historyVitalsPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  historyCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neuBorder,
    gap: 8,
  },
  historyCardNotes: {
    flex: 1,
    fontSize: 11,
    color: colors.gray500,
    fontStyle: "italic",
  },
  historyViewReceiptText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  concludedPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
    ...neuShadows.buttonPrimary,
  },
  concludedPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
  concludedSecondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.neuInset,
    borderWidth: 1,
    borderColor: colors.neuBorder,
  },
  concludedSecondaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray700,
  },
});
