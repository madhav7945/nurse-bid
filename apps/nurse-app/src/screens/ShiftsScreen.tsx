import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  BackHandler,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Activity,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  RotateCw,
  Sparkles,
  Stethoscope,
  User,
  X,
  HeartPulse,
} from "lucide-react-native";

import { useShifts } from "../hooks/useShifts";
import { api, ShiftVitals } from "../lib/api";
import { subscribeToCrossAppEvents } from "../lib/realtime";
import { colors, neuShadows } from "../theme/colors";
import { ShiftsSkeleton } from "../components/ui/NurseSkeleton";
import { ContainerModal } from "../components/ui/ContainerModal";
import { LogVitalsModal } from "../components/ui/LogVitalsModal";
import { setTabBarVisible } from "../lib/tabBarState";

export const ShiftsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { shifts, loading, refreshing, refresh, clockIn } = useShifts();
  const [activeTab, setActiveTab] = useState<"Upcoming" | "Completed">("Upcoming");
  const [showTimesheetModal, setShowTimesheetModal] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [timesheetHours, setTimesheetHours] = useState("12");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [timesheetStage, setTimesheetStage] = useState<"idle" | "verifying" | "completed">("idle");
  const [checkingIn, setCheckingIn] = useState(false);
  const [localCheckedInIds, setLocalCheckedInIds] = useState<Record<string, string>>({});
  const [selectedEngagement, setSelectedEngagement] = useState<any | null>(null);

  // Proposal acceptance notification popup state
  const [acceptedBanner, setAcceptedBanner] = useState<{
    visible: boolean;
    patientName: string;
    jobTitle: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    const unsubFocus = navigation?.addListener?.("focus", () => {
      refresh();
    });
    return () => {
      unsubFocus?.();
    };
  }, [navigation, refresh]);

  // Real-time synchronization for cross-app events (Proposal acceptance & vitals)
  useEffect(() => {
    const unsubCross = subscribeToCrossAppEvents((event) => {
      if (event.type === "BID_ACCEPTED") {
        setAcceptedBanner({
          visible: true,
          patientName: event.payload?.patientName || "Patient",
          jobTitle: event.payload?.jobTitle || "Clinical Recovery Shift",
          amount: event.payload?.amount || 0,
        });
        refresh();
      } else if (event.type === "SHIFT_UPDATED" || event.type === "VITALS_LOGGED") {
        refresh();
      }
    });

    return () => {
      unsubCross();
    };
  }, [refresh]);

  // Determine current active or primary focus shift
  const activeShift =
    shifts.find((s) => s.status === "active") ||
    shifts.find((s) => s.status === "confirmed" || s.status === "upcoming");

  // Filter list to exclude the active shift so it is NEVER duplicated below
  const upcomingShifts = shifts.filter((s) => {
    if (activeShift && s.id === activeShift.id) return false;
    return s.status === "confirmed" || s.status === "upcoming";
  });

  const completedShifts = shifts.filter((s) => s.status === "completed");

  const isGpsCheckedIn = Boolean(
    activeShift && (activeShift.gpsCheckinAt || localCheckedInIds[activeShift.id])
  );

  const completedEngagements = React.useMemo(() => {
    const groups: { [key: string]: typeof shifts } = {};
    completedShifts.forEach((s) => {
      const key = s.bookingRef || `${s.patientName}_${s.diagnosis}` || "care_engagement";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    return Object.keys(groups).map((key) => {
      const list = groups[key].sort((a, b) => (a.dayNumber || 1) - (b.dayNumber || 1));
      const first = list[0];
      const totalPayout = list.reduce((sum, s) => sum + (s.netPayout || 0), 0);
      return {
        id: key,
        patientName: first.patientName || "Patient Care",
        diagnosis: first.diagnosis || "Post-Operative Recovery",
        careType: first.careType || "Specialized Nursing",
        address: first.address || "Care Location",
        totalDays: Math.max(first.totalDays || 1, list.length),
        completedDaysCount: list.length,
        totalPayout,
        shifts: list,
      };
    });
  }, [completedShifts]);

  const totalCompletedEarnings = React.useMemo(() => {
    return completedShifts.reduce((sum, s) => sum + (s.netPayout || 0), 0);
  }, [completedShifts]);

  const displayedList = activeTab === "Upcoming" ? upcomingShifts : completedShifts;

  const handleOpenMapDirections = (destAddress?: string) => {
    const rawLoc = destAddress || activeShift?.address || "";
    
    // Check if rawLoc contains GPS coordinates: [GPS: 31.3090, 75.5807] or @lat,lng
    const coordMatch = rawLoc.match(/(?:GPS:\s*|@|coords?:\s*|\[)?(-?\d+\.\d{3,}),\s*(-?\d+\.\d{3,})\]?/i);
    
    let url = "";
    if (coordMatch) {
      const targetLat = parseFloat(coordMatch[1]);
      const targetLng = parseFloat(coordMatch[2]);
      const label = encodeURIComponent(activeShift?.patientName ? `${activeShift.patientName} Care Residence` : "Patient Care Location");
      url = Platform.select({
        ios: `maps:0,0?q=${targetLat},${targetLng}(${label})`,
        android: `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`,
      })!;
    } else {
      const cleanLoc = rawLoc.replace(/\s*\[?GPS:\s*[-0-9.,\s]+\]?/i, "").trim() || "Model Town, Jalandhar";
      const fullQuery = cleanLoc.toLowerCase().includes("punjab")
        ? cleanLoc
        : `${cleanLoc}, Punjab, India`;
      const encoded = encodeURIComponent(fullQuery);
      url = Platform.select({
        ios: `maps:0,0?q=${encoded}`,
        android: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
      })!;
    }

    Linking.openURL(url).catch(() => {
      Alert.alert(
        "Navigation",
        `Patient Address: ${rawLoc.replace(/\s*\[?GPS:\s*[-0-9.,\s]+\]?/i, "").trim() || "Care Location"}\n\nPlease open your device map application to navigate.`
      );
    });
  };

  const handleCallPatient = (phone?: string) => {
    const targetPhone = phone || activeShift?.patientPhone;
    if (!targetPhone) {
      Alert.alert(
        "Contact Unavailable",
        "Patient phone number is not available for this shift. Please coordinate via encrypted chat."
      );
      return;
    }
    const cleanPhone = targetPhone.replace(/[\s\(\)\-]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("Call Notice", `Patient Contact: ${targetPhone}`);
    });
  };

  const handleSubmitTimesheet = async () => {
    Keyboard.dismiss();
    setTimesheetStage("verifying");

    if (activeShift) {
      try {
        const promises: Promise<any>[] = [api.completeShift(activeShift.id)];
        if (handoverNotes.trim()) {
          promises.push(
            api.addClinicalNote(activeShift.id, "Shift Handover Observation", handoverNotes.trim()).catch(() => {})
          );
        }
        await Promise.all(promises);
        setTimesheetStage("completed");
        setTimeout(() => {
          setShowTimesheetModal(false);
          setTimesheetStage("idle");
          setHandoverNotes("");
          refresh();
        }, 400);
      } catch (err) {
        console.warn("Failed to complete shift:", err);
        setTimesheetStage("idle");
        Alert.alert("Notice", "Failed to submit timesheet. Please try again.");
      }
    }
  };

  const handleSaveDailyVitals = async (vitals: ShiftVitals) => {
    if (!activeShift) return;
    try {
      activeShift.vitals = vitals;
      setShowVitalsModal(false);
      await api.logShiftVitals(activeShift.id, vitals);
      refresh();
    } catch (err: any) {
      Alert.alert("Notice", err?.message || "Failed to record shift vitals.");
    }
  };

  const handleOpenTimesheetModal = () => {
    if (!activeShift) {
      Alert.alert("No Active Shift", "Timesheet submission requires an ongoing shift.");
      return;
    }
    setTimesheetStage("idle");
    setShowTimesheetModal(true);
  };

  const handleCheckIn = async () => {
    if (!activeShift) {
      Alert.alert(
        "No Active Shift Assigned",
        "Browse open patient shifts on Job Radar to start your shift.",
        [
          { text: "Dismiss", style: "cancel" },
          { text: "Open Radar", onPress: () => navigation?.navigate?.("Jobs") },
        ]
      );
      return;
    }
    if (checkingIn) return;
    setCheckingIn(true);

    const nowIso = new Date().toISOString();
    // Instant optimistic update so UI never hangs
    setLocalCheckedInIds((prev) => ({ ...prev, [activeShift.id]: nowIso }));
    if (activeShift) {
      activeShift.gpsCheckinAt = nowIso;
    }

    try {
      await Promise.race([
        clockIn(activeShift.id),
        new Promise((resolve) => setTimeout(resolve, 2200)),
      ]);
    } catch (err) {
      console.warn("Bedside arrival verification notice:", err);
    } finally {
      setCheckingIn(false);
    }
  };

  const cleanDisplayAddress = (addr?: string) => {
    if (!addr) return "Model Town, Jalandhar";
    return addr.replace(/\s*\[?GPS:\s*[-0-9.,\s]+\]?/i, "").trim() || "Model Town, Jalandhar";
  };

  const formatUpcomingDate = (dateStr?: string, dayNum?: number) => {
    if (!dateStr) return `Day ${dayNum || 2}`;
    try {
      const d = new Date(dateStr);
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dayName = days[d.getDay()];
      const dayNumStr = d.getDate();
      const monthName = months[d.getMonth()];
      
      if (dayNum === 2) return `Day 2 • Tomorrow, ${dayNumStr} ${monthName}`;
      return `Day ${dayNum || 2} • ${dayName}, ${dayNumStr} ${monthName}`;
    } catch {
      return `Day ${dayNum || 2}`;
    }
  };

  const getHeaderDate = () => {
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
  };

  if (loading) {
    return <ShiftsSkeleton />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      {/* ─── Sleek Header ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Shifts</Text>
          <Text style={styles.headerSubtitle}>{getHeaderDate()}</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => refresh()}
            activeOpacity={0.7}
          >
            <RotateCw size={15} color={colors.gray600} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={styles.avatarPill}>
            <User size={16} color={colors.primary} />
            <View style={styles.avatarOnlineDot} />
          </View>
        </View>
      </View>

      {/* ─── Real-Time Proposal Acceptance In-App Banner ─── */}
      {acceptedBanner?.visible && (
        <View style={styles.acceptanceBannerCard}>
          <View style={styles.acceptanceBannerLeft}>
            <View style={styles.acceptanceIconBox}>
              <Sparkles size={16} color="#059669" />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.acceptanceTitle}>Proposal Accepted! 🎉</Text>
              <Text style={styles.acceptanceSub}>
                {acceptedBanner.patientName} accepted your proposal for "{acceptedBanner.jobTitle}".
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.acceptanceDismissBtn}
            onPress={() => setAcceptedBanner(null)}
          >
            <X size={15} color={colors.gray500} />
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Top Segmented Switcher: Active Shift vs Shift History (Exact Match to Patient App) ─── */}
      <View style={styles.topSegmentedControl}>
        <TouchableOpacity
          onPress={() => setActiveTab("Upcoming")}
          style={[styles.segmentBtn, activeTab === "Upcoming" && styles.segmentBtnActive]}
          activeOpacity={0.8}
        >
          <Activity size={14} color={activeTab === "Upcoming" ? colors.primary : colors.gray500} strokeWidth={2.2} />
          <Text style={[styles.segmentBtnText, activeTab === "Upcoming" && styles.segmentBtnTextActive]}>
            Active Shift
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("Completed")}
          style={[styles.segmentBtn, activeTab === "Completed" && styles.segmentBtnActive]}
          activeOpacity={0.8}
        >
          <Clock3 size={14} color={activeTab === "Completed" ? colors.primary : colors.gray500} strokeWidth={2.2} />
          <Text style={[styles.segmentBtnText, activeTab === "Completed" && styles.segmentBtnTextActive]}>
            Shift History ({completedShifts.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === "Upcoming" ? (
          <>
            {/* ─── Active Shift Focus Card ─── */}
            {activeShift ? (
              <View style={styles.shiftHeroCard}>
                {/* Top Status Strip */}
                <View style={styles.heroTopRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      isGpsCheckedIn ? styles.statusBadgeActive : styles.statusBadgePending,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusBadgeDot,
                        isGpsCheckedIn
                          ? { backgroundColor: colors.success }
                          : { backgroundColor: colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isGpsCheckedIn
                          ? { color: "#065F46" }
                          : { color: colors.primary },
                      ]}
                    >
                      {isGpsCheckedIn ? "On-Site Verified • Bedside Active" : "Scheduled • Ready for Arrival"}
                    </Text>
                  </View>

                  <Text style={styles.dayCounterText}>
                    Day {activeShift.dayNumber} of {activeShift.totalDays}
                  </Text>
                </View>

                {/* Patient Details */}
                <View style={styles.patientInfoBlock}>
                  <Text style={styles.patientLabel}>Patient Details</Text>
                  <Text style={styles.heroPatientName}>{activeShift.patientName}</Text>
                  <Text style={styles.heroDiagnosis}>{activeShift.diagnosis}</Text>
                </View>

                {/* Shift Timing Strip */}
                <View style={styles.timingStrip}>
                  <Text style={styles.timingStripText}>
                    {activeShift.timeWindow} ({activeShift.durationHrs} hrs) • ₹{activeShift.netPayout.toLocaleString("en-IN")} Base Rate
                  </Text>
                </View>

                {/* Location & Quick Action Circle Buttons (1 Clean Row) */}
                <View style={styles.locationActionRow}>
                  <View style={styles.locationLeft}>
                    <MapPin size={15} color={colors.primary} style={{ marginTop: 1 }} />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {cleanDisplayAddress(activeShift.address)}
                    </Text>
                  </View>

                  <View style={styles.actionCirclesRow}>
                    {/* 1-Tap Google Maps Navigation */}
                    <TouchableOpacity
                      style={styles.circleActionBtn}
                      onPress={() => handleOpenMapDirections(activeShift.address)}
                      activeOpacity={0.7}
                    >
                      <Navigation size={15} color={colors.primary} strokeWidth={2.4} />
                    </TouchableOpacity>

                    {/* Call Patient */}
                    <TouchableOpacity
                      style={styles.circleActionBtn}
                      onPress={() => handleCallPatient(activeShift?.patientPhone)}
                      activeOpacity={0.7}
                    >
                      <Phone size={15} color={colors.primary} strokeWidth={2.2} />
                    </TouchableOpacity>

                    {/* Encrypted Chat */}
                    <TouchableOpacity
                      style={styles.circleActionBtn}
                      onPress={() => navigation?.navigate?.("Messages")}
                      activeOpacity={0.7}
                    >
                      <MessageSquare size={15} color={colors.primary} strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Today's Bedside Charted Vitals (if recorded) */}
                {activeShift.vitals && (activeShift.vitals.bp || activeShift.vitals.pulse) ? (
                  <View style={styles.todayVitalsCard}>
                    <View style={styles.todayVitalsTopRow}>
                      <HeartPulse size={15} color="#059669" strokeWidth={2.4} />
                      <Text style={styles.todayVitalsTitle}>Day {activeShift.dayNumber} Bedside Vitals</Text>
                      <Text style={styles.todayVitalsLivePill}>Recorded</Text>
                    </View>
                    <View style={styles.todayVitalsGrid}>
                      <Text style={styles.todayVitalsMetric}>BP: <Text style={{ fontWeight: '800' }}>{activeShift.vitals.bp}</Text></Text>
                      <Text style={styles.todayVitalsMetric}>HR: <Text style={{ fontWeight: '800' }}>{activeShift.vitals.pulse} bpm</Text></Text>
                      <Text style={styles.todayVitalsMetric}>SpO₂: <Text style={{ fontWeight: '800' }}>{activeShift.vitals.spo2}%</Text></Text>
                      {activeShift.vitals.temp && (
                        <Text style={styles.todayVitalsMetric}>Temp: <Text style={{ fontWeight: '800' }}>{activeShift.vitals.temp}°F</Text></Text>
                      )}
                    </View>
                  </View>
                ) : null}

                {/* Primary Shift Action Buttons */}
                <View style={styles.ctaRow}>
                  {/* Daily Bedside Vitals Logging Button */}
                  <TouchableOpacity
                    onPress={() => setShowVitalsModal(true)}
                    style={styles.dailyLogBtn}
                    activeOpacity={0.82}
                  >
                    <HeartPulse size={16} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.dailyLogBtnText}>
                      {activeShift.vitals && (activeShift.vitals.bp || activeShift.vitals.pulse)
                        ? `Update Day ${activeShift.dayNumber} Vitals & Notes`
                        : `Log Day ${activeShift.dayNumber} Bedside Vitals`}
                    </Text>
                  </TouchableOpacity>

                  {!isGpsCheckedIn ? (
                    <TouchableOpacity
                      onPress={handleCheckIn}
                      style={styles.fullPrimaryBtn}
                      activeOpacity={0.8}
                      disabled={checkingIn}
                    >
                      <MapPin size={16} color={colors.white} strokeWidth={2.4} />
                      <Text style={styles.fullPrimaryBtnText}>
                        {checkingIn ? "Verifying Bedside Arrival..." : "Confirm Bedside Arrival (GPS)"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <View style={styles.gpsVerifiedBanner}>
                        <CheckCircle2 size={15} color="#059669" strokeWidth={2.4} />
                        <Text style={styles.gpsVerifiedBannerText}>
                          Bedside Arrival Verified • Live Telemetry Active
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={handleOpenTimesheetModal}
                        style={styles.fullSuccessBtn}
                        activeOpacity={0.8}
                      >
                        <FileCheck2 size={16} color={colors.white} strokeWidth={2.4} />
                        <Text style={styles.fullSuccessBtnText}>Complete Shift & Submit Timesheet</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ) : (
              /* Standby State */
              <View style={styles.standbyCard}>
                <Calendar size={32} color={colors.gray400} />
                <Text style={styles.standbyTitle}>No Active Shift Today</Text>
                <Text style={styles.standbySubtitle}>
                  Browse patient care requests on Radar to accept new clinical shifts.
                </Text>
                <TouchableOpacity
                  style={styles.standbyBtn}
                  onPress={() => navigation?.navigate?.("Jobs")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.standbyBtnText}>Open Job Radar</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ─── Upcoming Schedule Section ─── */}
            <View style={styles.scheduleHeaderRow}>
              <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
              <View style={styles.planPill}>
                <Text style={styles.planPillText}>7-Day Care Plan</Text>
              </View>
            </View>

            {/* ─── Upcoming Shifts List ─── */}
            <View style={styles.timelineList}>
              {upcomingShifts.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>
                    No upcoming shifts remaining in this schedule.
                  </Text>
                </View>
              ) : (
                upcomingShifts.map((shift) => (
                  <View key={shift.id} style={styles.timelineCard}>
                    <View style={styles.timelineLeft}>
                      <Text style={styles.timelineDate}>
                        {formatUpcomingDate(shift.date, shift.dayNumber)}
                      </Text>
                      <Text style={styles.timelineTime}>
                        {shift.timeWindow}
                      </Text>
                    </View>

                    <View style={styles.timelineRight}>
                      <Text style={styles.timelinePayout}>
                        ₹{shift.netPayout.toLocaleString("en-IN")}
                      </Text>
                      <Text style={styles.timelineStatus}>
                        Scheduled
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          /* ─── SHIFT HISTORY TAB (Exact Parity to Patient App History) ─── */
          <>
            {/* History Summary Ledger Card */}
            <View style={styles.historyLedgerCard}>
              <View style={styles.historyLedgerRow}>
                <View style={styles.historyLedgerCol}>
                  <Text style={styles.historyStatLabel}>TOTAL DISBURSED</Text>
                  <Text style={styles.historyStatEarned}>
                    ₹{totalCompletedEarnings.toLocaleString("en-IN")}
                  </Text>
                </View>

                <View style={styles.historyLedgerDivider} />

                <View style={styles.historyLedgerCol}>
                  <Text style={styles.historyStatLabel}>COMPLETED SHIFTS</Text>
                  <Text style={styles.historyStatNum}>
                    {completedShifts.length}
                  </Text>
                </View>
              </View>
            </View>

            {/* Completed Engagements List */}
            <View style={styles.timelineList}>
              {completedEngagements.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Clock3 size={32} color={colors.gray400} style={{ alignSelf: "center", marginBottom: 8 }} />
                  <Text style={styles.emptyCardText}>
                    No completed shifts archived yet. Completed shifts and verified timesheets will appear here.
                  </Text>
                </View>
              ) : (
                completedEngagements.map((eng) => (
                  <TouchableOpacity
                    key={eng.id}
                    style={styles.engagementCard}
                    onPress={() => setSelectedEngagement(eng)}
                    activeOpacity={0.82}
                  >
                    <View style={styles.engCardTop}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.engBadgeRow}>
                          <View style={styles.engCompletedPill}>
                            <CheckCircle2 size={11} color="#059669" strokeWidth={2.5} />
                            <Text style={styles.engCompletedPillText}>
                              {eng.completedDaysCount} {eng.completedDaysCount === 1 ? "Shift" : "Shifts"} Completed
                            </Text>
                          </View>
                          <Text style={styles.engDaysSpanText}>
                            Day 1 – Day {eng.completedDaysCount} of {eng.totalDays}
                          </Text>
                        </View>
                        <Text style={styles.engPatientTitle} numberOfLines={1}>{eng.patientName}</Text>
                        <Text style={styles.engDiagnosisText} numberOfLines={1}>{eng.diagnosis}</Text>
                      </View>

                      <View style={styles.engPayoutBox}>
                        <Text style={styles.engPayoutAmount}>
                          ₹{eng.totalPayout.toLocaleString("en-IN")}
                        </Text>
                        <Text style={styles.engPayoutLabel}>Disbursed</Text>
                      </View>
                    </View>

                    <View style={styles.engCardBottom}>
                      <Text style={styles.engFooterHint}>Tap to view day-by-day logs & vitals</Text>
                      <View style={styles.engFooterCta}>
                        <Text style={styles.engFooterCtaText}>View Dossier</Text>
                        <ChevronRight size={14} color={colors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}

        {/* Generous bottom clearance padding to guarantee navigation bar never overlaps */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ─── Timesheet Modal ─── */}
      <ContainerModal
        visible={showTimesheetModal}
        onClose={() => setShowTimesheetModal(false)}
        position="bottom"
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetContent}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Submit Timesheet</Text>
                <Text style={styles.sheetSub}>Conclude shift and verify care</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTimesheetModal(false)}
                style={styles.closeSheetBtn}
              >
                <X size={18} color={colors.gray500} />
              </TouchableOpacity>
            </View>

            {/* Hours Selector */}
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.sheetLabel}>HOURS COMPLETED</Text>
              <View style={styles.hoursRow}>
                {["4", "8", "12"].map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.hourPill, timesheetHours === h && styles.hourPillActive]}
                    onPress={() => setTimesheetHours(h)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.hourPillText, timesheetHours === h && styles.hourPillTextActive]}
                    >
                      {h} hrs
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Handover Notes */}
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.sheetLabel}>HANDOVER NOTES (OPTIONAL)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Brief summary of shift observations..."
                placeholderTextColor={colors.gray400}
                multiline
                value={handoverNotes}
                onChangeText={setHandoverNotes}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sheetSubmitBtn,
                timesheetStage === "completed" && { backgroundColor: "#059669" },
              ]}
              onPress={handleSubmitTimesheet}
              activeOpacity={0.8}
              disabled={timesheetStage !== "idle"}
            >
              {timesheetStage === "verifying" ? (
                <>
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text style={styles.sheetSubmitText}>Verifying Timesheet with Escrow Vault...</Text>
                </>
              ) : timesheetStage === "completed" ? (
                <>
                  <CheckCircle2 size={16} color={colors.white} strokeWidth={2.4} />
                  <Text style={styles.sheetSubmitText}>Timesheet Verified & Completed!</Text>
                </>
              ) : (
                <>
                  <FileCheck2 size={16} color={colors.white} strokeWidth={2.4} />
                  <Text style={styles.sheetSubmitText}>Verify & Complete Shift</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </ContainerModal>

      {/* ─── Completed Engagement Day-by-Day Pop-up Modal ─── */}
      <ContainerModal
        visible={Boolean(selectedEngagement)}
        onClose={() => setSelectedEngagement(null)}
        position="bottom"
      >
        {selectedEngagement && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.engagementModalContent}
          >
            {/* Modal Header */}
            <View style={styles.engagementModalHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.engBadgeRow}>
                  <View style={styles.engCompletedPill}>
                    <CheckCircle2 size={11} color="#059669" strokeWidth={2.5} />
                    <Text style={styles.engCompletedPillText}>
                      {selectedEngagement.completedDaysCount} Days Completed
                    </Text>
                  </View>
                  <Text style={styles.engDaysSpanText}>
                    ₹{selectedEngagement.totalPayout.toLocaleString("en-IN")} Disbursed
                  </Text>
                </View>
                <Text style={styles.engModalPatientName}>
                  {selectedEngagement.patientName}
                </Text>
                <Text style={styles.engModalDiagnosis}>
                  {selectedEngagement.diagnosis} • {cleanDisplayAddress(selectedEngagement.address)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedEngagement(null)}
                style={styles.closeSheetBtn}
              >
                <X size={18} color={colors.gray500} />
              </TouchableOpacity>
            </View>

            {/* Days Section Header */}
            <View style={styles.daysBreakdownHeader}>
              <Text style={styles.daysBreakdownTitle}>Day-by-Day Clinical Dossier</Text>
              <Text style={styles.daysBreakdownSub}>
                Verified sensor telemetry, timesheets & escrow settlements
              </Text>
            </View>

            {/* Days List */}
            <View style={{ gap: 12 }}>
              {selectedEngagement.shifts.map((shift: any, idx: number) => {
                const dayNum = shift.dayNumber || idx + 1;
                const hasVitals = shift.vitals && (shift.vitals.bp || shift.vitals.spo2 || shift.vitals.pulse);
                return (
                  <View key={shift.id || idx} style={styles.dayCard}>
                    <View style={styles.dayCardTop}>
                      <View>
                        <Text style={styles.dayCardDayTitle}>Day {dayNum}</Text>
                        <Text style={styles.dayCardDate}>
                          {formatUpcomingDate(shift.date, dayNum)}
                        </Text>
                      </View>
                      <View style={styles.dayCardPayoutBadge}>
                        <Text style={styles.dayCardPayoutText}>
                          ₹{shift.netPayout.toLocaleString("en-IN")} Disbursed
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.dayCardHours}>
                      {shift.timeWindow} • 12 hrs Shift
                    </Text>

                    {hasVitals && (
                      <View style={styles.dayVitalsPill}>
                        <HeartPulse size={13} color="#059669" />
                        <Text style={styles.dayVitalsText}>
                          Vitals: BP {shift.vitals?.bp || "--/--"} • Pulse {shift.vitals?.pulse || "--"} bpm • SpO₂ {shift.vitals?.spo2 || "--"}%
                        </Text>
                      </View>
                    )}

                    {shift.notes ? (
                      <View style={styles.dayNotesBox}>
                        <Text style={styles.dayNotesLabel}>Clinical Handover:</Text>
                        <Text style={styles.dayNotesText}>{shift.notes}</Text>
                      </View>
                    ) : null}

                    <View style={styles.dayStatusFooter}>
                      <View style={styles.dayVerifiedRow}>
                        <CheckCircle2 size={13} color="#059669" strokeWidth={2.4} />
                        <Text style={styles.dayVerifiedText}>
                          Timesheet Verified & Deposit Released
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.closeEngagementBtn}
              onPress={() => setSelectedEngagement(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeEngagementBtnText}>Close Dossier</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </ContainerModal>

      {/* Bedside Daily Vitals & Notes Modal */}
      <LogVitalsModal
        visible={showVitalsModal}
        onClose={() => setShowVitalsModal(false)}
        onSave={handleSaveDailyVitals}
        initialVitals={activeShift?.vitals || undefined}
        patientName={activeShift?.patientName}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 10 : 6,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 2,
    fontWeight: "500",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 130,
    gap: 16,
  },

  /* Active Shift Focus Card */
  shiftHeroCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: "#ECFDF5",
  },
  statusBadgePending: {
    backgroundColor: "#EFF6FF",
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  dayCounterText: {
    fontSize: 13,
    color: colors.gray500,
    fontWeight: "600",
  },
  patientInfoBlock: {
    marginTop: 14,
  },
  patientLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray400,
    letterSpacing: 0.2,
  },
  heroPatientName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 3,
  },
  heroDiagnosis: {
    fontSize: 13,
    color: colors.gray600,
    marginTop: 2,
    fontWeight: "500",
  },
  timingStrip: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  timingStripText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },

  /* Location & Action Row */
  locationActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  locationLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 8,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  actionCirclesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  circleActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Census Bridge Card */
  censusBridgeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  censusBridgeLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 8,
  },
  censusBridgeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  censusBridgeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  censusBridgeSub: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 2,
  },

  /* CTAs */
  ctaRow: {
    marginTop: 16,
  },
  fullPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 24,
  },
  fullPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  fullSuccessBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 24,
  },
  fullSuccessBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },

  /* Standby Card */
  standbyCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  standbyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.gray900,
    marginTop: 12,
  },
  standbySubtitle: {
    fontSize: 13,
    color: colors.gray500,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  standbyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  standbyBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },

  /* Upcoming Section Header */
  scheduleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  planPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray600,
  },

  /* Segmented Switcher */
  segmentedTabBar: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: colors.white,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray500,
  },
  segmentBtnTextActive: {
    color: colors.gray900,
    fontWeight: "700",
  },

  /* Timeline List */
  timelineList: {
    gap: 8,
  },
  timelineCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  timelineLeft: {
    flex: 1,
  },
  timelineDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  timelineTime: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },
  timelineRight: {
    alignItems: "flex-end",
  },
  timelinePayout: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  timelineStatus: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyCardText: {
    fontSize: 13,
    color: colors.gray400,
  },

  /* Timesheet Sheet */
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "android" ? 44 : 32,
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray900,
  },
  sheetSub: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },
  closeSheetBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neuInset,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray500,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  hoursRow: {
    flexDirection: "row",
    gap: 8,
  },
  hourPill: {
    flex: 1,
    backgroundColor: colors.neuInset,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  hourPillActive: {
    backgroundColor: colors.primary,
  },
  hourPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray700,
  },
  hourPillTextActive: {
    color: colors.white,
  },
  notesInput: {
    backgroundColor: colors.neuBg,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.gray900,
    minHeight: 80,
    textAlignVertical: "top",
  },
  sheetSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 14,
  },
  sheetSubmitText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },

  /* Acceptance Banner */
  acceptanceBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  acceptanceBannerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  acceptanceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptanceTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46",
  },
  acceptanceSub: {
    fontSize: 11,
    color: "#047857",
    marginTop: 2,
    lineHeight: 15,
  },
  acceptanceDismissBtn: {
    padding: 6,
  },
  todayVitalsCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  todayVitalsTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  todayVitalsTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#166534",
  },
  todayVitalsLivePill: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayVitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  todayVitalsMetric: {
    fontSize: 12,
    color: "#14532D",
  },
  dailyLogBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  dailyLogBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },
  gpsVerifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  gpsVerifiedBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
  engagementCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 12,
    ...neuShadows.card,
  },
  engCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  engBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  engCompletedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  engCompletedPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  engDaysSpanText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray500,
  },
  engPatientTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  engDiagnosisText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  engPayoutBox: {
    alignItems: "flex-end",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  engPayoutAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#059669",
  },
  engPayoutLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray500,
    marginTop: 1,
  },
  engCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  engFooterHint: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.gray500,
  },
  engFooterCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  engFooterCtaText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  engagementModalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  engagementModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 16,
  },
  engModalPatientName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 4,
  },
  engModalDiagnosis: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  daysBreakdownHeader: {
    marginBottom: 14,
  },
  daysBreakdownTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  daysBreakdownSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dayCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
  },
  dayCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dayCardDayTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  dayCardDate: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 1,
  },
  dayCardPayoutBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dayCardPayoutText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  dayCardHours: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  dayVitalsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 8,
  },
  dayVitalsText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
  },
  dayNotesBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  dayNotesLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray500,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  dayNotesText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  dayStatusFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  dayVerifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dayVerifiedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  closeEngagementBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  closeEngagementBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
  topSegmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  historyLedgerCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    marginBottom: 16,
    ...neuShadows.card,
  },
  historyLedgerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyLedgerCol: {
    flex: 1,
    alignItems: "center",
  },
  historyLedgerDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#E2E8F0",
  },
  historyStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray500,
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  historyStatEarned: {
    fontSize: 22,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: -0.5,
  },
  historyStatNum: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
});
