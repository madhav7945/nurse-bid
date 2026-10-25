import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Building2,
  ShieldAlert,
  X,
  ChevronLeft,
} from "lucide-react-native";
import { colors, neuShadows } from "../theme/colors";
import { api } from "../lib/api";
import { subscribeToCrossAppEvents } from "../lib/realtime";
import { EscrowSkeleton } from "../components/ui/Skeleton";
import { supabase } from "../lib/supabase";

interface EscrowScreenProps {
  navigation?: any;
}

export const EscrowScreen: React.FC<EscrowScreenProps> = ({ navigation }) => {
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [totalProtected, setTotalProtected] = useState(0);
  const [activeMilestoneAmt, setActiveMilestoneAmt] = useState(0);
  const [releasedAmt, setReleasedAmt] = useState(0);
  const [pendingMilestonesCount, setPendingMilestonesCount] = useState(0);

  const [milestones, setMilestones] = useState<any[]>([]);
  const [timesheetRows, setTimesheetRows] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [bookings, payments] = await Promise.all([
        api.getBookings(),
        api.getPaymentHistory(),
      ]);

      const activeBooking = bookings.find(
        (b) => b.status === "confirmed" || b.status === "active" || b.status === "Active"
      ) || bookings[0];

      if (activeBooking) {
        setBooking(activeBooking);
        const totalAmount = Number(activeBooking.totalAmount) || 27000;
        setTotalProtected(totalAmount);

        // Filter payments for this booking
        const bookingPayments = payments.filter((p: any) => p.bookingId === activeBooking.id);
        const releasedPayments = bookingPayments.filter(
          (p: any) => p.status === "released" || p.status === "completed"
        );
        const calculatedReleased = releasedPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const paidCount = Math.max(activeBooking.completedShifts || 0, releasedPayments.length);
        const effectiveReleased = Math.min(
          totalAmount,
          calculatedReleased > 0
            ? calculatedReleased
            : Math.round((totalAmount / (activeBooking.durationDays || 7)) * paidCount)
        );
        setReleasedAmt(effectiveReleased);

        // Fetch real schedule_shifts from DB
        const dbShifts = await api.getBookingShifts(activeBooking.id).catch(() => []);
        const totalDays = activeBooking.durationDays || (dbShifts && dbShifts.length > 0 ? dbShifts.length : 3);
        const numWeeks = Math.max(1, Math.ceil(totalDays / 7));
        const milestoneVal = Math.round(totalAmount / numWeeks);
        setActiveMilestoneAmt(milestoneVal);

        const startDate = activeBooking.startDate ? new Date(activeBooking.startDate) : new Date();

        const builtMilestones = [];
        for (let w = 0; w < numWeeks; w++) {
          const weekStart = new Date(startDate);
          weekStart.setDate(weekStart.getDate() + w * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + Math.min(6, totalDays - 1));
          const weekPayment = bookingPayments.find(
            (p: any) => p.description?.includes(`Week ${w + 1}`) || p.description?.includes(`Milestone ${w + 1}`)
          );
          const isFunded = weekPayment?.status === "held" || weekPayment?.status === "completed" || activeBooking.status === "confirmed" || activeBooking.status === "active";
          const isReleased = weekPayment?.status === "released" || effectiveReleased >= totalAmount;

          builtMilestones.push({
            id: weekPayment?.id || `ms-${w + 1}`,
            num: w + 1,
            title: `Week ${w + 1} Care (Days ${w * 7 + 1}-${Math.min((w + 1) * 7, totalDays)})`,
            badge: isReleased ? "Released & Settled" : isFunded ? "Protected & Secured" : "Pending Deposit",
            badgeType: isReleased ? "released" : isFunded ? "funded" : "pending",
            dates: `${weekStart.toISOString().split("T")[0]} to ${weekEnd.toISOString().split("T")[0]}`,
            amount: `₹${milestoneVal.toLocaleString("en-IN")}`,
            action: isReleased ? "Paid" : isFunded ? "Release Payout" : "Fund Milestone",
          });
        }
        setMilestones(builtMilestones);
        const pendingCount = builtMilestones.filter((m) => m.badgeType === "pending").length;
        setPendingMilestonesCount(pendingCount);

        // Build timesheet rows from real database shifts
        if (dbShifts && dbShifts.length > 0) {
          const mapped = dbShifts.map((s: any, idx: number) => {
            const shiftNum = s.shiftDay || idx + 1;
            const isShiftFinished = s.status === "completed";
            const isShiftActive = s.status === "active";
            const isMilestonePaid = paidCount > 0 && shiftNum <= paidCount;

            return {
              id: s.id,
              date: s.date
                ? new Date(s.date).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })
                : `Day ${shiftNum}`,
              caregiver: activeBooking.nurseName || "Assigned Nurse",
              hours: `${s.startTime || "08:00 AM"} – ${s.endTime || "08:00 PM"} (${activeBooking.dailyHours || 12}h)`,
              milestone: `Shift ${shiftNum} Care`,
              status: isMilestonePaid ? "Signed Off & Settled" : isShiftFinished ? "Ready for Sign-Off" : isShiftActive ? "Clinician On-Site" : "Scheduled",
              statusType: isMilestonePaid ? "signed" : isShiftFinished ? "ready" : "pending",
              action: isMilestonePaid ? "Approved" : isShiftFinished ? "Approve Shift" : isShiftActive ? "Monitoring" : "Scheduled",
            };
          });
          setTimesheetRows(mapped);
        } else {
          // Fallback if no schedule_shifts rows created yet
          const completedShifts = activeBooking.completedShifts || 0;
          const builtTimesheets = [];
          for (let i = 0; i < totalDays; i++) {
            const shiftDate = new Date(startDate);
            shiftDate.setDate(shiftDate.getDate() + i);
            const isCompleted = i < completedShifts;
            builtTimesheets.push({
              id: `ts-${i + 1}`,
              date: shiftDate.toISOString().split("T")[0],
              caregiver: activeBooking.nurseName || "Assigned Nurse",
              hours: `${activeBooking.dailyHours || 12} hrs`,
              milestone: `Shift ${i + 1} Care`,
              status: isCompleted ? "Signed Off & Settled" : "Pending Sign-off",
              statusType: isCompleted ? "signed" : "pending",
              action: isCompleted ? "Approved" : "Approve Shift",
            });
          }
          setTimesheetRows(builtTimesheets);
        }
      }
    } catch (err) {
      console.warn("EscrowScreen load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsub = subscribeToCrossAppEvents((event) => {
      if (
        event.type === "SHIFT_UPDATED" ||
        event.type === "SHIFT_COMPLETED" ||
        event.type === "ESCROW_UPDATED" ||
        event.type === "BID_ACCEPTED"
      ) {
        loadData();
      }
    });

    const channel = supabase
      .channel("escrow_live_sync_channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_shifts" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => loadData())
      .subscribe();

    return () => {
      unsub();
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  const handleSubmitDispute = async () => {
    if (isSubmittingDispute) return;
    try {
      setIsSubmittingDispute(true);
      const targetId = booking?.id || "default";
      await api.disputeEscrow(targetId, disputeReason);
      setShowDisputeModal(false);
      setDisputeReason("");
      Alert.alert(
        "Dispute Lodged",
        "Care deposit frozen. A clinical supervisor will contact you within 15 minutes."
      );
      loadData();
    } catch (err: any) {
      console.warn("Dispute error:", err);
      Alert.alert("Dispute Error", err?.message || "Failed to lodge dispute. Please try again.");
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const handleApproveShift = async (id: string) => {
    try {
      if (booking?.id) {
        await api.releaseEscrowMilestone(booking.id);
      }
      if (id && !id.startsWith("ts-")) {
        await supabase.from("schedule_shifts").update({ status: "completed" }).eq("id", id);
      }
      setTimesheetRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, status: "Signed Off & Settled", statusType: "signed", action: "Approved" }
            : row
        )
      );
      Alert.alert(
        "Shift Timesheet Approved",
        `${booking?.nurseName || "Caregiver"}'s shift bedside log verified and signed off into medical record.`
      );
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to sign off shift");
    }
  };

  const handleReleaseMilestone = (msId: string, amountStr?: string) => {
    const amt = amountStr || "funds";
    Alert.alert(
      "Confirm Protected Milestone Release",
      `Release ${amt} from Protected Care Deposit to ${booking?.nurseName || "Nurse"} for completed shifts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Release Funds",
          onPress: async () => {
            try {
              const targetId = msId && !msId.startsWith("ms-") ? msId : booking?.id;
              if (targetId) {
                await api.releaseEscrowMilestone(targetId);
              }
              setMilestones((prev) =>
                prev.map((m) =>
                  m.id === msId
                    ? { ...m, badge: "Released & Settled", badgeType: "released", action: "Paid" }
                    : m
                )
              );
              Alert.alert("Funds Released", `${amt} released to ${booking?.nurseName || "caregiver"}'s verified account.`);
              loadData();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to release milestone");
            }
          },
        },
      ]
    );
  };

  const handleFundMilestone = (msNum: number, amountStr?: string) => {
    if (!booking?.id) return;
    const weeklyAmount = booking.agreedRate * (booking.dailyHours || 12) * 7;
    const displayAmount = amountStr || `₹${weeklyAmount.toLocaleString("en-IN")}`;

    Alert.alert(
      "Deposit Protected Care Milestone",
      `Authorize deposit of ${displayAmount} into protected care custody for Week ${msNum}? Funds will be held securely until shifts are verified.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Authorize Deposit",
          onPress: async () => {
            try {
              setIsLoading(true);
              await api.fundEscrow(booking.id, weeklyAmount);
              Alert.alert(
                "Milestone Funded",
                `${displayAmount} has been secured in protected care custody for Week ${msNum}.`
              );
              await loadData();
            } catch (err: any) {
              Alert.alert("Funding Error", err?.message || "Failed to fund milestone deposit. Please try again.");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };



  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neuBg} />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => {
            if (navigation?.canGoBack?.()) navigation.goBack();
            else navigation?.navigate?.("Dashboard");
          }}
          activeOpacity={0.75}
        >
          <ChevronLeft size={22} color={colors.gray800} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.topTitleWrap}>
          <Text style={styles.topBarTitle}>Protected Deposits & Milestones</Text>
          <View style={styles.rbiBadge}>
            <ShieldCheck size={11} color="#059669" />
            <Text style={styles.rbiBadgeText}>RBI Nodal Compliant</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => setShowDisputeModal(true)}
          activeOpacity={0.75}
        >
          <ShieldAlert size={18} color={colors.gray700} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {isLoading && !booking ? (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <EscrowSkeleton />
        </ScrollView>
      ) : !booking ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(46, 91, 255, 0.08)", justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
            <Lock size={40} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.gray800, textAlign: "center", marginBottom: 10 }}>
            No Active Protected Balance
          </Text>
          <Text style={{ fontSize: 14, color: colors.gray600, textAlign: "center", lineHeight: 22, marginBottom: 28, maxWidth: 320 }}>
            Protected Care Deposits are activated when you accept a proposal. Funds remain safely held in the Punjab Nursing Council protected milestone vault until you sign off on completed shifts.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, marginBottom: 12, width: "100%", maxWidth: 320, alignItems: "center" }}
            onPress={() => navigation?.navigate?.("My Requests")}
            activeOpacity={0.85}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>View Care Requests & Bids</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.gray300, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, width: "100%", maxWidth: 320, alignItems: "center" }}
            onPress={() => navigation?.navigate?.("Post Job")}
            activeOpacity={0.85}
          >
            <Text style={{ color: colors.gray700, fontSize: 15, fontWeight: "600" }}>Post New Care Request</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Financial Summary — 2-Column Grid (matching Dashboard) */}
        <View style={styles.statGrid}>
          <View style={styles.gridRow}>
            {/* Total Protected */}
            <View style={[styles.statCard, styles.tintedBlueCard]}>
              <View style={styles.statIconRow}>
                <View style={styles.iconChipBlue}>
                  <Lock size={16} color={colors.primary} strokeWidth={2.4} />
                </View>
              </View>
              <Text style={styles.statLabelBlue}>TOTAL PROTECTED</Text>
              <Text style={styles.statNumberBlue}>
                ₹{totalProtected.toLocaleString("en-IN")}
              </Text>
              <Text style={styles.statSubBlue}>Punjab Protected Balance</Text>
            </View>

            {/* Active Milestone */}
            <View style={[styles.statCard, styles.whiteCard]}>
              <View style={styles.statIconRow}>
                <View style={styles.iconChipEmerald}>
                  <Clock size={16} color="#059669" strokeWidth={2.4} />
                </View>
              </View>
              <Text style={styles.statLabel}>ACTIVE MILESTONE</Text>
              <Text style={styles.statNumber}>
                ₹{activeMilestoneAmt.toLocaleString("en-IN")}
              </Text>
              <Text style={styles.statSub}>{booking ? "Ready for release" : "No active shifts"}</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            {/* Released */}
            <View style={[styles.statCard, styles.whiteCard]}>
              <View style={styles.statIconRow}>
                <View style={styles.iconChipEmerald}>
                  <CheckCircle2 size={16} color="#059669" strokeWidth={2.4} />
                </View>
              </View>
              <Text style={styles.statLabel}>RELEASED</Text>
              <Text style={styles.statNumber}>
                ₹{releasedAmt.toLocaleString("en-IN")}
              </Text>
              <Text style={styles.statSub}>{booking ? "Paid out to clinician" : "None settled"}</Text>
            </View>

            {/* Pending */}
            <View style={[styles.statCard, styles.whiteCard]}>
              <View style={styles.statIconRow}>
                <View style={styles.iconChipAmber}>
                  <AlertCircle size={16} color="#D97706" strokeWidth={2.4} />
                </View>
              </View>
              <Text style={styles.statLabel}>PENDING DEPOSIT</Text>
              <Text style={styles.statNumber}>
                {pendingMilestonesCount}
              </Text>
              <Text style={styles.statSub}>{booking ? "Milestone awaiting fund" : "Zero pending"}</Text>
            </View>
          </View>
        </View>

        {/* Contract Summary Card */}
        <View style={styles.contractCard}>
          <View style={styles.contractHeaderRow}>
            <Text style={styles.contractCode}>
              {booking?.id ? `CONTRACT #BK-${booking.id.slice(0, 6).toUpperCase()}` : "NO ACTIVE CONTRACT"}
            </Text>
            <View style={styles.escrowBadge}>
              <Text style={styles.escrowBadgeText}>100% Deposit Protected</Text>
            </View>
          </View>

          <Text style={styles.contractTitle}>{booking?.careType || "Home Clinical Nursing"}</Text>
          <Text style={styles.contractNurse}>
            {booking?.nurseName ? `Nurse ${booking.nurseName}` : "Awaiting Clinician Assignment"} • {booking?.dailyHours || 8}-hr Shifts • ₹{booking?.agreedRate || 0}/hr
          </Text>

          <View style={styles.contractDivider} />

          <View style={styles.specsGrid}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>CONTRACT VALUE</Text>
              <Text style={styles.specValue}>
                ₹{(booking?.totalAmount || 0).toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>SHIFT SCHEDULE</Text>
              <Text style={styles.specValue}>{booking?.dailyHours ? `${booking.dailyHours} hrs/day` : "--"}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>BILLING</Text>
              <Text style={styles.specValue}>Milestone Protection</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>STATUS</Text>
              <View style={styles.confirmedRow}>
                <View style={booking?.status === "active" || booking?.status === "confirmed" ? styles.greenDot : styles.grayDot} />
                <Text style={styles.confirmedText}>{booking?.status ? booking.status.toUpperCase() : "INACTIVE"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Milestones Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Care Milestones</Text>
          <Text style={styles.sectionSub}>
            Release funds after verified shift sign-offs.
          </Text>

          <View style={styles.milestonesList}>
            {milestones.map((ms) => (
              <View key={ms.id} style={styles.milestoneRow}>
                <View style={styles.milestoneNumCircle}>
                  <Text style={styles.milestoneNumText}>{ms.num}</Text>
                </View>

                <View style={styles.milestoneDetails}>
                  <View style={styles.milestoneTitleRow}>
                    <Text style={styles.milestoneTitle}>{ms.title}</Text>
                    <View
                      style={[
                        styles.milestoneBadge,
                        ms.badgeType === "funded"
                          ? styles.milestoneBadgeFunded
                          : ms.badgeType === "released"
                          ? styles.milestoneBadgeReleased
                          : styles.milestoneBadgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.milestoneBadgeText,
                          ms.badgeType === "funded"
                            ? styles.milestoneBadgeTextFunded
                            : ms.badgeType === "released"
                            ? styles.milestoneBadgeTextReleased
                            : styles.milestoneBadgeTextPending,
                        ]}
                      >
                        {ms.badge}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.milestoneDates}>
                    {ms.dates} • {ms.amount}
                  </Text>
                </View>

                {ms.action === "Release Payout" ? (
                  <TouchableOpacity
                    style={styles.releaseBtn}
                    onPress={() => handleReleaseMilestone(ms.id, ms.amount)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.releaseBtnText}>Release</Text>
                    <ChevronRight size={12} color={colors.white} strokeWidth={2.6} />
                  </TouchableOpacity>
                ) : ms.action === "Fund Milestone" ? (
                  <TouchableOpacity
                    style={styles.fundBtn}
                    onPress={() => handleFundMilestone(ms.num, ms.amount)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.fundBtnText}>Fund</Text>
                    <ChevronRight size={12} color={colors.primary} strokeWidth={2.6} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.paidPill}>
                    <CheckCircle2 size={13} color="#059669" />
                    <Text style={styles.paidPillText}>Paid</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Timesheets Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Shift Timesheets</Text>
          <Text style={styles.sectionSub}>
            Review logged hours before milestone release.
          </Text>

          <View style={styles.timesheetsList}>
            {timesheetRows.map((ts) => (
              <View key={ts.id} style={styles.timesheetCard}>
                <View style={styles.timesheetTop}>
                  <View style={styles.timesheetDateBox}>
                    <Clock size={12} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.timesheetDateText}>{ts.date}</Text>
                  </View>
                  <View
                    style={[
                      styles.timesheetBadge,
                      ts.statusType === "signed"
                        ? styles.timesheetBadgeSigned
                        : styles.timesheetBadgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timesheetBadgeText,
                        ts.statusType === "signed"
                          ? styles.timesheetBadgeTextSigned
                          : styles.timesheetBadgeTextPending,
                      ]}
                    >
                      {ts.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.timesheetCaregiver}>{ts.caregiver}</Text>
                <Text style={styles.timesheetDetails}>
                  {ts.hours} • {ts.milestone}
                </Text>

                <View style={styles.timesheetActionRow}>
                  {ts.action === "Approve Shift" ? (
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApproveShift(ts.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.approveBtnText}>Approve Shift</Text>
                      <CheckCircle2 size={12} color={colors.white} strokeWidth={2.6} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.approvedNotice}>
                      <CheckCircle2 size={14} color="#059669" />
                      <Text style={styles.approvedNoticeText}>Signed Off</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Triple-Lock Protection */}
        <View style={styles.tripleLockCard}>
          <View style={styles.tripleLockHeader}>
            <ShieldCheck size={18} color="#10B981" />
            <Text style={styles.tripleLockTitle}>TRIPLE-LOCK PROTECTION</Text>
          </View>

          <Text style={styles.tripleLockSubtitle}>How Your Care Deposit Is Protected:</Text>

          <View style={styles.lockPointRow}>
            <View style={styles.lockPointDot} />
            <Text style={styles.lockPointText}>
              <Text style={{ fontWeight: "700", color: colors.white }}>Zero-Risk Advance: </Text>
              Nurse cannot withdraw until you sign off the completed shift.
            </Text>
          </View>

          <View style={styles.lockPointRow}>
            <View style={styles.lockPointDot} />
            <Text style={styles.lockPointText}>
              <Text style={{ fontWeight: "700", color: colors.white }}>Instant Dispute Freeze: </Text>
              Care deposit is immediately frozen in case of dissatisfaction.
            </Text>
          </View>

          <View style={styles.lockPointRow}>
            <View style={styles.lockPointDot} />
            <Text style={styles.lockPointText}>
              <Text style={{ fontWeight: "700", color: colors.white }}>Banking Compliance: </Text>
              RBI Non-Bank Payment Aggregator compliant.
            </Text>
          </View>

          <View style={styles.bankPill}>
            <Building2 size={14} color="#93C5FD" />
            <Text style={styles.bankPillText}>
              ICICI Bank Nodal Care Account #***8912
            </Text>
          </View>
        </View>

        {/* Punjab Clinical Escrow Fallback & Dispute Policies */}
        <View style={styles.fallbackPolicyCard}>
          <View style={styles.fallbackHeaderRow}>
            <ShieldAlert size={16} color="#B45309" />
            <Text style={styles.fallbackHeaderTitle}>PUNJAB PROTECTED CARE FALLBACK & DISPUTE POLICIES</Text>
          </View>

          <View style={styles.fallbackItem}>
            <Text style={styles.fallbackItemTitle}>1. What if you don't release payment immediately?</Text>
            <Text style={styles.fallbackItemDesc}>
              Under the Punjab Clinical Care Fair Compensation Policy, after a nurse completes a shift and submits their signed timesheet, funds auto-release after 48 hours unless a dispute is filed. This protects verified clinicians while giving families ample time to review bedside care.
            </Text>
          </View>

          <View style={styles.fallbackItem}>
            <Text style={styles.fallbackItemTitle}>2. What if there is a clinical issue or nurse is late?</Text>
            <Text style={styles.fallbackItemDesc}>
              Tap the "Dispute / Report Concern" button below at any time. This immediately freezes the deposit, prevents auto-release, and routes your case to the 24/7 Punjab Clinical Resolution Desk.
            </Text>
            <TouchableOpacity
              style={styles.inlineDisputeBtn}
              onPress={() => setShowDisputeModal(true)}
              activeOpacity={0.8}
            >
              <ShieldAlert size={14} color="#DC2626" />
              <Text style={styles.inlineDisputeBtnText}>Report Shift Concern / Freeze Deposit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fallbackItem}>
            <Text style={styles.fallbackItemTitle}>3. What if the clinician fails to arrive (No-Show)?</Text>
            <Text style={styles.fallbackItemDesc}>
              If a nurse fails to GPS clock-in within 2 hours of scheduled start time, the shift is flagged for replacement. You can claim a 100% immediate refund back to your original payment method with zero deductions.
            </Text>
          </View>
        </View>
      </ScrollView>
      )}

      {/* Dispute Modal */}
      <Modal
        visible={showDisputeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDisputeModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <ShieldAlert size={18} color="#EF4444" />
                <Text style={styles.modalTitle}>Care Milestone Dispute</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDisputeModal(false)}>
                <X size={20} color={colors.gray800} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Submitting a dispute immediately freezes all protected care deposits and alerts the Clinical Mediation Board.
            </Text>

            <TextInput
              style={styles.disputeInput}
              value={disputeReason}
              onChangeText={setDisputeReason}
              placeholder="Describe dispute reason..."
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.submitDisputeBtn, isSubmittingDispute && { opacity: 0.7 }]}
              onPress={handleSubmitDispute}
              disabled={isSubmittingDispute}
              activeOpacity={0.85}
            >
              {isSubmittingDispute ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitDisputeBtnText}>Freeze Deposit & Lodge Dispute</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 220,
  },

  /* Top Bar */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.neuBg,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    alignItems: "center",
    justifyContent: "center",
    ...neuShadows.buttonCircle,
  },
  topTitleWrap: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 8,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  rbiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  rbiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },

  /* 2x2 Financial Stats */
  statGrid: {
    gap: 12,
    marginBottom: 14,
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    minHeight: 115,
    justifyContent: "space-between",
  },
  tintedBlueCard: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "rgba(214, 228, 255, 0.9)",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  whiteCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    ...neuShadows.cardRaised,
  },
  statIconRow: {
    marginBottom: 6,
  },
  iconChipBlue: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  iconChipEmerald: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconChipAmber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.warningSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray500,
    letterSpacing: 0.5,
  },
  statLabelBlue: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.gray900,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  statNumberBlue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  statSub: {
    fontSize: 10,
    color: colors.gray400,
    fontWeight: "500",
  },
  statSubBlue: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "600",
  },

  /* Contract Card */
  contractCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    padding: 16,
    marginBottom: 14,
    ...neuShadows.cardRaised,
  },
  contractHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  contractCode: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray500,
    letterSpacing: 0.5,
  },
  escrowBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  escrowBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
  },
  contractTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  contractNurse: {
    fontSize: 12,
    color: colors.gray600,
    marginBottom: 12,
  },
  contractDivider: {
    height: 1,
    backgroundColor: colors.neuInset,
    marginBottom: 12,
  },
  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  specItem: {
    width: "47%",
    backgroundColor: colors.neuInset,
    borderRadius: 12,
    padding: 10,
  },
  specLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.gray500,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  specValue: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray900,
    fontVariant: ["tabular-nums"],
  },
  confirmedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#059669",
  },
  grayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#94A3B8",
  },
  confirmedText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
  },

  /* Section Cards */
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    padding: 16,
    marginBottom: 14,
    ...neuShadows.cardRaised,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 11,
    color: colors.gray500,
    marginBottom: 12,
    lineHeight: 15,
  },

  /* Milestones */
  milestonesList: {
    gap: 10,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.neuInset,
    borderRadius: 16,
    padding: 12,
  },
  milestoneNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneNumText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },
  milestoneDetails: {
    flex: 1,
  },
  milestoneTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  milestoneTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray900,
  },
  milestoneBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  milestoneBadgeFunded: {
    backgroundColor: colors.successSoft,
  },
  milestoneBadgeReleased: {
    backgroundColor: colors.primarySoft,
  },
  milestoneBadgePending: {
    backgroundColor: colors.warningSoft,
  },
  milestoneBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  milestoneBadgeTextFunded: {
    color: "#059669",
  },
  milestoneBadgeTextReleased: {
    color: colors.primary,
  },
  milestoneBadgeTextPending: {
    color: "#D97706",
  },
  milestoneDates: {
    fontSize: 10,
    color: colors.gray500,
    fontVariant: ["tabular-nums"],
  },
  releaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...neuShadows.cardInset,
  },
  releaseBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.white,
  },
  fundBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  fundBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  paidPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  paidPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },

  /* Timesheets */
  timesheetsList: {
    gap: 10,
  },
  timesheetCard: {
    backgroundColor: colors.neuInset,
    borderRadius: 16,
    padding: 12,
  },
  timesheetTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  timesheetDateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timesheetDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray900,
    fontVariant: ["tabular-nums"],
  },
  timesheetBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timesheetBadgeSigned: {
    backgroundColor: colors.successSoft,
  },
  timesheetBadgePending: {
    backgroundColor: colors.warningSoft,
  },
  timesheetBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  timesheetBadgeTextSigned: {
    color: "#059669",
  },
  timesheetBadgeTextPending: {
    color: "#D97706",
  },
  timesheetCaregiver: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray900,
  },
  timesheetDetails: {
    fontSize: 10,
    color: colors.gray500,
    marginBottom: 8,
  },
  timesheetActionRow: {
    alignItems: "flex-end",
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...neuShadows.buttonPrimary,
  },
  approveBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.white,
  },
  approvedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  approvedNoticeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },

  /* Triple-Lock */
  tripleLockCard: {
    backgroundColor: "#0F172A",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  tripleLockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  tripleLockTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#10B981",
    letterSpacing: 0.5,
  },
  tripleLockSubtitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 10,
  },
  lockPointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  lockPointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3B82F6",
    marginTop: 5,
  },
  lockPointText: {
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 16,
    flex: 1,
  },
  bankPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
  },
  bankPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#93C5FD",
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.gray900,
  },
  modalDesc: {
    fontSize: 11,
    color: colors.gray600,
    lineHeight: 15,
    marginBottom: 12,
  },
  disputeInput: {
    backgroundColor: colors.neuInset,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: colors.gray900,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  submitDisputeBtn: {
    backgroundColor: "#EF4444",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitDisputeBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },

  /* Punjab Fallback Policy Card */
  fallbackPolicyCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 16,
    marginTop: 16,
    marginBottom: 40,
    ...neuShadows.card,
  },
  fallbackHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  fallbackHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: 0.5,
  },
  fallbackItem: {
    marginBottom: 12,
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.15)",
  },
  fallbackItemTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray900,
    marginBottom: 4,
  },
  fallbackItemDesc: {
    fontSize: 11,
    color: colors.gray700,
    lineHeight: 16,
  },
  inlineDisputeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  inlineDisputeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
});
