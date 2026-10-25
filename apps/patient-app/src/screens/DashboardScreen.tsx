import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Settings,
  Bell,
  Calendar,
  FileText,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Plus,
  BookmarkCheck,
  BarChart3,
  Lock,
  HeartPulse,
  ChevronRight,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  CheckCheck,
  Briefcase,
  MessageSquare,
  Compass,
} from "lucide-react-native";
import { colors } from "../theme/colors";
import { CircularProgressRing } from "../components/ui/CircularProgressRing";
import { DashboardSkeleton } from "../components/ui/Skeleton";
import { SpotlightTutorialOverlay } from "../components/onboarding/SpotlightTutorialOverlay";
import { MedicationTodoListCard } from "../components/dashboard/MedicationTodoListCard";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { subscribeToCrossAppEvents } from "../lib/realtime";

interface DashboardScreenProps {
  navigation?: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { profile, refreshProfile } = useAuth();
  const [filterPeriod, setFilterPeriod] = useState<"Monthly" | "Weekly">("Monthly");
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const [stats, setStats] = useState({
    activeJobsCount: 0,
    completedShiftsCount: 0,
    matchRate: 0,
    nurseRating: "0.0",
    nurseRatingPercentage: 0,
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>(
    "Punjab Nursing Council accredited clinicians on standby for home care."
  );

  const [patientDossier, setPatientDossier] = useState({
    name: profile?.first_name || "Patient",
    fullName: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Patient",
    meta: "",
    primaryCondition: "Loading...",
    bp: "--/--",
    hr: "--",
    spo2: "--",
    sugar: "--",
    hospital: "",
    activeNurse: "",
    shiftStatus: "Loading...",
    latestNote: "Fetching clinical notes...",
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setIsDataLoading(true);
      const [dossier, vitals, notes, booking, dashboardStats, jobs, notifs] = await Promise.all([
        api.getPatientDossier(),
        api.getLatestPatientVitals(),
        api.getClinicalNotes(),
        api.getActiveBooking(),
        api.getDashboardStats(),
        api.getMyJobs(),
        api.getNotifications(),
      ]);

      setStats(dashboardStats);
      setRecentJobs(jobs.slice(0, 3));
      setNotifications(notifs || []);

      if (booking?.nurseName) {
        const nurseLabel = booking.nurseName.startsWith("Nurse")
          ? booking.nurseName
          : `Nurse ${booking.nurseName}`;
        setNotificationMessage(`${nurseLabel} scheduled. Milestone ${booking.completedShifts + 1} active & telemetry connected.`);
      } else if (notifs && notifs.length > 0) {
        setNotificationMessage(notifs[0].message || notifs[0].title);
      } else if (jobs.length > 0) {
        setNotificationMessage(`${jobs.length} care request(s) active. Reviewing qualified clinical bids in Punjab.`);
      }

      const metaParts = [];
      if (dossier.age) metaParts.push(`${dossier.age} Years`);
      if (dossier.gender && dossier.gender !== "Not specified") metaParts.push(dossier.gender);
      if (dossier.city) metaParts.push(dossier.city);

      setPatientDossier({
        name: dossier.patientName?.split(" ")[0] || profile?.first_name || "Patient",
        fullName: dossier.patientName || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim(),
        meta: metaParts.join(" • ") || "",
        primaryCondition: dossier.primaryDiagnosis || "No active diagnosis",
        bp: vitals.bp || "--/--",
        hr: vitals.pulse || "--",
        spo2: vitals.spo2 || "--",
        sugar: vitals.sugar || "--",
        hospital: dossier.hospital || "",
        activeNurse: booking?.nurseName ? `Nurse ${booking.nurseName}` : "",
        shiftStatus: booking ? `${booking.status} • Milestone ${booking.completedShifts + 1} Active` : "No active booking",
        latestNote: notes.length > 0
          ? `${notes[0].title}: ${notes[0].content}`
          : "No clinical notes recorded yet.",
      });
    } catch (err) {
      console.warn("Dashboard data fetch error:", err);
    } finally {
      setIsDataLoading(false);
      setHasLoadedOnce(true);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadDashboardData();

    const unsub = subscribeToCrossAppEvents((event) => {
      if (!profile?.id) return;
      if (event.payload?.patientId && event.payload.patientId !== profile.id) return;
      if (
        event.type === "VITALS_LOGGED" ||
        event.type === "NEW_BID" ||
        event.type === "BID_SUBMITTED" ||
        event.type === "SHIFT_UPDATED" ||
        event.type === "SHIFT_COMPLETED" ||
        event.type === "NOTE_ADDED" ||
        event.type === "ESCROW_UPDATED"
      ) {
        if (event.type === "SHIFT_COMPLETED") {
          Alert.alert(
            "🏥 Shift Completed by Clinician",
            "Your assigned nurse has concluded the shift and submitted the bedside care timesheet. Please review the shift log and release the protected milestone payment.",
            [
              { text: "Later", style: "cancel" },
              { text: "Review & Release Milestone Deposit", onPress: () => navigation?.navigate?.('Escrow') },
            ]
          );
        }
        loadDashboardData();
      }
    });

    return () => {
      unsub();
    };
  }, [loadDashboardData]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", loadDashboardData);
    return unsubscribe;
  }, [navigation, loadDashboardData]);

  useEffect(() => {
    async function checkWalkthrough() {
      if (profile && !profile.onboarding_complete) {
        const uId = profile.id || (profile as any).user_id;
        if (uId) {
          const completedLocally = await AsyncStorage.getItem(`@nursebid_${uId}_walkthrough_completed`);
          if (completedLocally === "true") return;
        }
        setShowTutorial(true);
      }
    }
    checkWalkthrough();
  }, [profile?.id]);

  const handleCompleteTutorial = async () => {
    setShowTutorial(false);
    const uId = profile?.id || (profile as any)?.user_id;
    if (uId) {
      await AsyncStorage.setItem(`@nursebid_${uId}_walkthrough_completed`, "true").catch(() => {});
    }
    try {
      await api.completeOnboarding();
    } catch (err) {
      console.warn("Complete onboarding notice:", err);
    }
    refreshProfile?.().catch?.(() => {});
  };

  const handleDismissTutorial = async () => {
    setShowTutorial(false);
    const uId = profile?.id || (profile as any)?.user_id;
    if (uId) {
      await AsyncStorage.setItem(`@nursebid_${uId}_walkthrough_completed`, "true").catch(() => {});
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.warn("markAllNotificationsRead error:", err);
    }
  };

  const handleNotificationPress = async (notif: any) => {
    try {
      if (!notif.isRead) {
        await api.markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.warn("markNotificationRead error:", err);
    }

    setShowNotificationsModal(false);

    if (notif.link) {
      navigation?.navigate?.(notif.link);
    } else if (notif.type === "shift_completed" || notif.type === 'escrow' || notif.type === "milestone") {
      navigation?.navigate?.('Escrow');
    } else if (notif.type === "job_posted" || notif.type === "proposal" || notif.type === "bid") {
      navigation?.navigate?.("My Requests");
    } else if (notif.type === "shift" || notif.type === "booking") {
      navigation?.navigate?.("Bookings");
    } else if (notif.type === "message" || notif.type === "chat") {
      navigation?.navigate?.("Messages");
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />

      {/* Screen 2 Top Bar: Settings button (left), SOS + Bell notification + Avatar (right) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => navigation?.navigate?.("Settings")}
          activeOpacity={0.75}
        >
          <Settings size={20} color={colors.gray800} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.topRightGroup}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => setShowTutorial(true)}
            activeOpacity={0.75}
          >
            <Compass size={18} color={colors.primary} strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => setShowNotificationsModal(true)}
            activeOpacity={0.75}
          >
            <Bell size={20} color={colors.gray800} strokeWidth={2.2} />
            {unreadCount > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation?.navigate?.("Profile")}
            activeOpacity={0.8}
          >
            <View style={[styles.avatarInner, Boolean(profile?.avatar_url) && { overflow: "hidden" }]}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.headerAvatar}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>
                  {patientDossier.name?.[0]?.toUpperCase() || "P"}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

<ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isDataLoading && !hasLoadedOnce ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Greeting / Heading Row with Date Filter Pill on top-right */}
            <View style={styles.headingRow}>
          <View style={styles.headingTextWrap}>
            <Text style={styles.headingTitle}>Welcome back, {patientDossier.name}</Text>
            <Text style={styles.headingSubtitle}>
              Monitor active clinicians, live vitals telemetry & shifts.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.filterPill}
            onPress={() =>
              setFilterPeriod((prev) => (prev === "Monthly" ? "Weekly" : "Monthly"))
            }
            activeOpacity={0.75}
          >
            <Text style={styles.filterPillText}>{filterPeriod}</Text>
            <Calendar size={13} color={colors.gray600} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* LATEST NOTIFICATION FEED BANNER */}
        <View style={styles.latestNotificationCard}>
          <View style={styles.notifIconWrap}>
            <Bell size={16} color={colors.primary} strokeWidth={2.2} />
            <View style={styles.notifRedDot} />
          </View>

          <View style={styles.notifTextWrap}>
            <Text style={styles.notifLead}>
              <Text style={styles.notifTag}>Update: </Text>
              {notificationMessage}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.liveFeedLink}
            onPress={() => navigation?.navigate?.("Bookings")}
            activeOpacity={0.7}
          >
            <Text style={styles.liveFeedText}>Live Feed</Text>
            <View style={styles.btnIconPillSmall}>
              <ArrowRight size={11} color={colors.primary} strokeWidth={2.4} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 2x2 STAT CARD GRID WITH PERCENTAGE PROGRESS RINGS */}
        <View style={styles.statGrid}>
          {/* Row 1 */}
          <View style={styles.gridRow}>
            {/* Card 1: Active Care Requests */}
            <TouchableOpacity
              style={[styles.statCard, styles.whiteCard]}
              activeOpacity={0.85}
              onPress={() => navigation?.navigate?.("My Requests")}
            >
              <View style={styles.statCardHeader}>
                <View style={styles.iconChipWhite}>
                  <FileText size={18} color={colors.gray700} strokeWidth={2} />
                </View>
                <CircularProgressRing
                  percentage={Math.min(100, stats.activeJobsCount * 25)}
                  size={36}
                  color={colors.gray700}
                  trackColor="rgba(0, 0, 0, 0.06)"
                  textColor={colors.gray800}
                />
              </View>
              <Text style={styles.statLabel}>Care Requests</Text>
              <Text style={styles.statNumber}>
                {stats.activeJobsCount} Active<Text style={styles.statSub}>/month</Text>
              </Text>
            </TouchableOpacity>

            {/* Card 2: Completed Shifts */}
            <TouchableOpacity
              style={[styles.statCard, styles.tintedBlueCard]}
              activeOpacity={0.85}
              onPress={() => navigation?.navigate?.("Bookings")}
            >
              <View style={styles.statCardHeader}>
                <View style={styles.iconChipBlue}>
                  <ShieldCheck size={18} color={colors.primary} strokeWidth={2} />
                </View>
                <CircularProgressRing
                  percentage={Math.min(100, stats.completedShiftsCount * 20)}
                  size={36}
                  color={colors.primary}
                  trackColor="rgba(46, 91, 255, 0.15)"
                  textColor={colors.primaryDark}
                />
              </View>
              <Text style={[styles.statLabel, styles.statLabelBlue]}>Completed Shifts</Text>
              <Text style={[styles.statNumber, styles.statNumberBlue]}>
                {stats.completedShiftsCount}<Text style={styles.statSubBlue}>/month</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={styles.gridRow}>
            {/* Card 3: Shift Match Rate */}
            <TouchableOpacity
              style={[styles.statCard, styles.whiteCard]}
              activeOpacity={0.85}
              onPress={() => navigation?.navigate?.("My Requests")}
            >
              <View style={styles.statCardHeader}>
                <View style={styles.iconChipWhite}>
                  <SlidersHorizontal size={18} color={colors.gray700} strokeWidth={2} />
                </View>
                <CircularProgressRing
                  percentage={stats.matchRate}
                  size={36}
                  color={colors.gray700}
                  trackColor="rgba(0, 0, 0, 0.06)"
                  textColor={colors.gray800}
                />
              </View>
              <Text style={styles.statLabel}>Shift Match Rate</Text>
              <Text style={styles.statNumber}>
                {stats.matchRate}%
              </Text>
            </TouchableOpacity>

            {/* Card 4: Nurse Rating */}
            <TouchableOpacity
              style={[styles.statCard, styles.whiteCard]}
              activeOpacity={0.85}
              onPress={() => navigation?.navigate?.("My Requests")}
            >
              <View style={styles.statCardHeader}>
                <View style={styles.iconChipWhite}>
                  <Star size={18} color={colors.gray700} strokeWidth={2} />
                </View>
                <CircularProgressRing
                  percentage={stats.nurseRatingPercentage || Math.min(100, Math.round(parseFloat(stats.nurseRating || "5.0") * 20))}
                  size={36}
                  color={colors.gray700}
                  trackColor="rgba(0, 0, 0, 0.06)"
                  textColor={colors.gray800}
                />
              </View>
              <Text style={styles.statLabel}>Nurse Rating</Text>
              <Text style={styles.statNumber}>
                {stats.nurseRating}<Text style={styles.statSub}> PNC Avg</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ROW OF 4 ROUNDED SQUARE ACTION BUTTONS */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.quickActionsRow}>
          {/* Action 1: Post Care Job */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnActive]}
            onPress={() => navigation?.navigate?.("Post Job")}
            activeOpacity={0.85}
          >
            <View style={styles.actionIconWrapActive}>
              <Plus size={20} color={colors.white} strokeWidth={2.6} />
            </View>
            <Text style={styles.actionLabelActive}>Post Care</Text>
          </TouchableOpacity>

          {/* Action 2: Care Plans / Requests */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation?.navigate?.("My Requests")}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconWrap}>
              <BookmarkCheck size={18} color={colors.gray700} strokeWidth={2} />
            </View>
            <Text style={styles.actionLabel}>Care Plans</Text>
          </TouchableOpacity>

          {/* Action 3: Proposals */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation?.navigate?.("Proposals")}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconWrap}>
              <FileText size={18} color={colors.gray700} strokeWidth={2} />
            </View>
            <Text style={styles.actionLabel}>Proposals</Text>
          </TouchableOpacity>

          {/* Action 4: Milestones & Deposits */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation?.navigate?.('Escrow' as never)}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconWrap}>
              <Lock size={18} color={colors.gray700} strokeWidth={2} />
            </View>
            <Text style={styles.actionLabel}>Milestones</Text>
          </TouchableOpacity>
        </View>

        {/* RECOVERY VITALS BENTO CARD */}
        <View style={styles.cleanHealthCard}>
          {/* Header Row */}
          <View style={styles.cleanHealthHeader}>
            <View style={styles.cleanHealthHeaderLeft}>
              <View style={styles.cleanHealthIconWrap}>
                <HeartPulse size={18} color={patientDossier.hr !== "--" ? "#059669" : colors.gray400} strokeWidth={2.4} />
              </View>
              <View>
                <Text style={styles.cleanHealthTitle}>Recovery Vitals</Text>
                <Text style={styles.cleanHealthSub}>
                  {patientDossier.primaryCondition}
                  {patientDossier.hospital ? ` - ${patientDossier.hospital}` : ""}
                </Text>
              </View>
            </View>

            <View style={[styles.cleanStableBadge, patientDossier.hr === "--" && styles.cleanStandbyBadge]}>
              <View style={[styles.cleanPulseDot, patientDossier.hr === "--" && styles.cleanStandbyDot]} />
              <Text style={[styles.cleanStableText, patientDossier.hr === "--" && styles.cleanStandbyText]}>
                {patientDossier.hr !== "--" ? "Stable" : "Standby"}
              </Text>
            </View>
          </View>

          {/* 4 Bento Vitals Tiles */}
          <View style={styles.cleanVitalsGrid}>
            {/* Heart Rate */}
            <View style={styles.cleanVitalTile}>
              <Text style={styles.cleanVitalLabel}>Heart Rate</Text>
              <View style={styles.cleanVitalNumRow}>
                <Text style={styles.cleanVitalNum}>{patientDossier.hr}</Text>
                {patientDossier.hr !== "--" && <Text style={styles.cleanVitalUnit}>bpm</Text>}
              </View>
              <Text style={[styles.cleanVitalTag, patientDossier.hr === "--" && styles.cleanVitalTagStandby]}>
                {patientDossier.hr !== "--" ? "Recorded" : "Standby"}
              </Text>
            </View>

            {/* Blood Pressure */}
            <View style={styles.cleanVitalTile}>
              <Text style={styles.cleanVitalLabel}>Blood Pressure</Text>
              <View style={styles.cleanVitalNumRow}>
                <Text style={styles.cleanVitalNum}>{patientDossier.bp}</Text>
                {patientDossier.bp !== "--/--" && <Text style={styles.cleanVitalUnit}>mmHg</Text>}
              </View>
              <Text style={[styles.cleanVitalTag, (patientDossier.bp === "--/--" || patientDossier.bp === "--") && styles.cleanVitalTagStandby]}>
                {patientDossier.bp !== "--/--" && patientDossier.bp !== "--" ? "Recorded" : "Standby"}
              </Text>
            </View>

            {/* SpO2 */}
            <View style={styles.cleanVitalTile}>
              <Text style={styles.cleanVitalLabel}>Oxygen (SpO2)</Text>
              <View style={styles.cleanVitalNumRow}>
                <Text style={styles.cleanVitalNum}>{patientDossier.spo2 === "--" ? "--" : `${patientDossier.spo2}%`}</Text>
              </View>
              <Text style={[styles.cleanVitalTag, patientDossier.spo2 === "--" && styles.cleanVitalTagStandby]}>
                {patientDossier.spo2 !== "--" ? "Recorded" : "Standby"}
              </Text>
            </View>

            {/* Blood Sugar */}
            <View style={styles.cleanVitalTile}>
              <Text style={styles.cleanVitalLabel}>Blood Sugar</Text>
              <View style={styles.cleanVitalNumRow}>
                <Text style={styles.cleanVitalNum}>{patientDossier.sugar}</Text>
                {patientDossier.sugar !== "--" && <Text style={styles.cleanVitalUnit}>mg/dL</Text>}
              </View>
              <Text style={[styles.cleanVitalTag, patientDossier.sugar === "--" && styles.cleanVitalTagStandby]}>
                {patientDossier.sugar !== "--" ? "Recorded" : "Standby"}
              </Text>
            </View>
          </View>

          {/* Clean Footer Row */}
          <TouchableOpacity
            style={styles.cleanDossierLinkRow}
            onPress={() => navigation?.navigate?.("Profile")}
            activeOpacity={0.75}
          >
            <View style={styles.cleanDossierLinkLeft}>
              <CheckCircle2 size={13} color={patientDossier.hr !== "--" ? "#059669" : colors.gray400} />
              <Text style={styles.cleanDossierLinkNote}>
                {patientDossier.hr !== "--" ? "RN telemetry verified" : "Telemetry standby - connects during shift"}
              </Text>
            </View>
            <Text style={styles.cleanDossierLinkAction}>Full dossier -&gt;</Text>
          </TouchableOpacity>
        </View>

        {/* ─── TODAY'S MEDICATION CARE CHECKLIST (NURSE BEDSIDE TO-DO LIST) ─── */}
        <MedicationTodoListCard />

        {/* RECENT CARE POSTINGS */}
        <View style={styles.recentTitleRow}>
          <Text style={styles.sectionTitle}>Recent Care Postings</Text>
          <TouchableOpacity
            onPress={() => navigation?.navigate?.("My Requests")}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentList}>
          {recentJobs.length === 0 ? (
            <View style={styles.recentEmptyCard}>
              <View style={styles.recentEmptyIconWrap}>
                <Briefcase size={22} color={colors.primary} strokeWidth={1.8} />
              </View>
              <Text style={styles.recentEmptyTitle}>No Care Postings Yet</Text>
              <Text style={styles.recentEmptySubtitle}>
                Post a clinical requirement to receive verified nurse proposals in Punjab.
              </Text>
              <TouchableOpacity
                style={styles.recentEmptyBtn}
                onPress={() => navigation?.navigate?.("Post Job")}
                activeOpacity={0.85}
              >
                <Plus size={15} color="#fff" strokeWidth={2.4} />
                <Text style={styles.recentEmptyBtnText}>Post Care Request</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentJobs.map((job) => {
              const isFilled = job.status === "filled";
              const isCompleted = job.status === "completed";
              return (
                <TouchableOpacity
                  key={job.id}
                  style={styles.recentRowCard}
                  onPress={() => {
                    if (isFilled || isCompleted) {
                      navigation?.navigate?.("Bookings");
                    } else if (job.bidCount > 0) {
                      navigation?.navigate?.("Proposals", { jobId: job.id });
                    } else {
                      navigation?.navigate?.("My Requests");
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.recentRowLeft}>
                    <View style={isFilled ? styles.cardIconChipTeal : styles.recentIconChip}>
                      {isFilled ? (
                        <HeartPulse size={20} color={colors.success} strokeWidth={2} />
                      ) : (
                        <FileText size={20} color={colors.primary} strokeWidth={2} />
                      )}
                    </View>
                    <View style={styles.recentTextGroup}>
                      <Text style={styles.recentItemTitle} numberOfLines={1}>
                        {job.title}
                      </Text>
                      <View style={isFilled ? styles.statusActiveBadge : styles.statusBiddingBadge}>
                        <Text style={isFilled ? styles.statusActiveText : styles.statusBiddingText}>
                          {isFilled ? "Active in Care" : job.bidCount > 0 ? "Reviewing Bids" : "Open for Bids"}
                        </Text>
                      </View>
                      <Text style={styles.recentSubMeta} numberOfLines={1}>
                        {job.patientName} - {job.locality ? `${job.locality}, ` : ""}{job.city} - {job.shiftModel || `${job.dailyHours}h shift`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recentRowRight}>
                    <Text style={styles.recentNumber}>
                      {isFilled ? `INR ${(job.budgetMax * job.dailyHours).toLocaleString("en-IN")}` : job.bidCount}
                    </Text>
                    <Text style={styles.recentSubText}>
                      {isFilled ? "Allocated" : "Proposals"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
          </>
        )}
      </ScrollView>

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowNotificationsModal(false)}
            activeOpacity={1}
          />
          <View style={styles.notifModalCard}>
            {/* Modal Header */}
            <View style={styles.notifModalHeader}>
              <View style={styles.notifHeaderTitleRow}>
                <View style={styles.notifHeaderIcon}>
                  <Bell size={18} color="#2563EB" strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={styles.notifModalTitle}>Notifications</Text>
                  <Text style={styles.notifModalSubtitle}>
                    {unreadCount > 0
                      ? `${unreadCount} new clinical update${unreadCount > 1 ? "s" : ""}`
                      : "All updates caught up"}
                  </Text>
                </View>
              </View>

              <View style={styles.notifHeaderActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    style={styles.markReadBtn}
                    onPress={handleMarkAllRead}
                    activeOpacity={0.75}
                  >
                    <CheckCheck size={14} color="#2563EB" strokeWidth={2.2} />
                    <Text style={styles.markReadText}>Mark read</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.notifCloseBtn}
                  onPress={() => setShowNotificationsModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={18} color={colors.gray600} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Scroll List */}
<ScrollView
              style={styles.notifListScroll}
              contentContainerStyle={styles.notifListContent}
              showsVerticalScrollIndicator={false}
            >
              {notifications.length === 0 ? (
                <View style={styles.notifEmptyWrap}>
                  <View style={styles.notifEmptyIcon}>
                    <Bell size={28} color={colors.gray400} strokeWidth={1.8} />
                  </View>
                  <Text style={styles.notifEmptyTitle}>No Notifications</Text>
                  <Text style={styles.notifEmptySub}>
                    You're all caught up. Clinician proposals, care shift updates, and verified vitals will appear here.
                  </Text>
                </View>
              ) : (
                notifications.map((notif) => {
                  const isRead = notif.isRead;
                  return (
                    <TouchableOpacity
                      key={notif.id}
                      style={[styles.notifItemCard, !isRead && styles.notifItemUnread]}
                      onPress={() => handleNotificationPress(notif)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.notifItemIconCircle,
                          notif.type === "job_posted" && { backgroundColor: "#EFF6FF" },
                          (notif.type === "proposal" || notif.type === "bid") && { backgroundColor: "#ECFDF5" },
                          (notif.type === "booking" || notif.type === "shift") && { backgroundColor: "#F3E8FF" },
                          notif.type === "message" && { backgroundColor: "#E0F2FE" },
                        ]}
                      >
                        {notif.type === "job_posted" ? (
                          <Briefcase size={16} color="#2563EB" strokeWidth={2.2} />
                        ) : notif.type === "proposal" || notif.type === "bid" ? (
                          <ShieldCheck size={16} color="#059669" strokeWidth={2.2} />
                        ) : notif.type === "booking" || notif.type === "shift" ? (
                          <Calendar size={16} color="#7C3AED" strokeWidth={2.2} />
                        ) : notif.type === "message" ? (
                          <MessageSquare size={16} color="#0284C7" strokeWidth={2.2} />
                        ) : (
                          <HeartPulse size={16} color="#2563EB" strokeWidth={2.2} />
                        )}
                      </View>

                      <View style={styles.notifItemBody}>
                        <View style={styles.notifItemTopRow}>
                          <Text style={styles.notifItemTitle} numberOfLines={1}>
                            {notif.title}
                          </Text>
                          {!isRead && <View style={styles.unreadBlueDot} />}
                        </View>
                        <Text style={styles.notifItemMessage} numberOfLines={2}>
                          {notif.message}
                        </Text>
                        <Text style={styles.notifItemTime}>{notif.timeAgo || "Recently"}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Game Walkthrough Onboarding Quest Modal */}
      <SpotlightTutorialOverlay
        visible={showTutorial}
        patientName={patientDossier.name}
        onComplete={handleCompleteTutorial}
        onDismiss={handleDismissTutorial}
      />
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
    position: "relative",
  },
  bellDot: {
    position: "absolute",
    top: 11,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.danger,
  },
  topRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.95)",
    padding: 2,
    backgroundColor: colors.white,
    shadowColor: "#7A8AAB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 19,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 170, // Ample clearance above floating bottom tab bar
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headingTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  headingTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  headingSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: colors.gray500,
    marginTop: 4,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 2,
    marginTop: 2,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray700,
  },
  liveCareBanner: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    padding: 18,
    marginBottom: 12,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 4,
  },
  liveStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF0FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
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
  liveCareTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  liveCareMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  liveCareMetaText: {
    fontSize: 12,
    color: colors.gray600,
    fontWeight: "500",
  },
  liveCareBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  viewTimesheetBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2E5BFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    shadowColor: "#2E5BFF",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 4,
  },
  btnIconPillBlue: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  btnIconPillSoft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  viewTimesheetText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
  },
  newPostOutlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 2,
  },
  newPostOutlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray800,
  },
  latestNotificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 12,
    marginBottom: 16,
    gap: 10,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  notifIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  notifRedDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  notifTextWrap: {
    flex: 1,
  },
  notifLead: {
    fontSize: 11,
    color: colors.gray700,
    lineHeight: 16,
  },
  notifTag: {
    fontWeight: "800",
    color: colors.gray900,
  },
  liveFeedLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  btnIconPillSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  liveFeedText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
  },
  statGrid: {
    gap: 14,
    marginBottom: 20,
  },
  gridRow: {
    flexDirection: "row",
    gap: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    padding: 18,
    minHeight: 132,
    justifyContent: "space-between",
  },
  whiteCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  tintedBlueCard: {
    backgroundColor: "#EAF0FF",
    borderWidth: 1,
    borderColor: "rgba(214, 228, 255, 0.9)",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconChipWhite: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.neuInset,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  iconChipBlue: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46, 91, 255, 0.15)",
  },
  iconChipEmerald: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  iconChipSlate: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
  },
  iconChipAmber: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  statStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  statStatusTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray600,
  },
  actionIconWrapBlue: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46, 91, 255, 0.12)",
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.gray500,
    marginBottom: 4,
  },
  statLabelBlue: {
    color: colors.primaryDark,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },
  statNumberBlue: {
    color: colors.primaryDark,
  },
  statSub: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.gray400,
  },
  statSubBlue: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.primary,
  },
  sectionTitleRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  actionBtnActive: {
    backgroundColor: "#2E5BFF",
    borderColor: "#2E5BFF",
    shadowColor: "#2E5BFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 5,
  },
  actionIconWrapActive: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.neuInset,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabelActive: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray700,
  },
  cleanHealthCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    padding: 18,
    marginBottom: 20,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 4,
  },
  cleanHealthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
    flexShrink: 1,
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
  cleanStandbyBadge: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  cleanStandbyDot: {
    backgroundColor: "#94A3B8",
  },
  cleanStandbyText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  cleanVitalTagStandby: {
    color: colors.gray400,
    fontWeight: "600",
  },
  cleanVitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  cleanVitalTile: {
    width: "48%",
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 128,
    backgroundColor: colors.neuInset,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    borderRadius: 16,
    padding: 12,
    justifyContent: "space-between",
  },
  cleanVitalLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray500,
    marginBottom: 6,
  },
  cleanVitalNumRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    marginBottom: 4,
  },
  cleanVitalNum: {
    fontSize: 20,
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
  recentTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  recentList: {
    gap: 12,
  },
  recentRowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    padding: 16,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 3,
  },
  recentEmptyCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  recentEmptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  recentEmptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.gray800,
    marginBottom: 4,
    textAlign: "center",
  },
  recentEmptySubtitle: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.gray500,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 270,
  },
  recentEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  recentEmptyBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
  recentRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  cardIconChipTeal: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  recentIconChip: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  recentTextGroup: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray900,
    marginBottom: 3,
  },
  statusActiveBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 3,
  },
  statusActiveText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.success,
  },
  statusBiddingBadge: {
    backgroundColor: colors.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 3,
  },
  statusBiddingText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  recentSubMeta: {
    fontSize: 11,
    color: colors.gray500,
  },
  recentRowRight: {
    alignItems: "flex-end",
  },
  recentNumber: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gray900,
  },
  recentSubText: {
    fontSize: 10,
    color: colors.gray400,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  notifModalCard: {
    width: "100%",
    maxWidth: 412,
    maxHeight: "82%",
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  notifModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#F8FAFC",
  },
  notifHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  notifHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  notifModalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  notifModalSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  notifHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  markReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  markReadText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  notifCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  notifListScroll: {
    maxHeight: 480,
  },
  notifListContent: {
    padding: 14,
    gap: 10,
  },
  notifEmptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  notifEmptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  notifEmptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
  notifEmptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  notifItemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  notifItemUnread: {
    backgroundColor: "#F8FAFC",
    borderColor: "#BFDBFE",
  },
  notifItemIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  notifItemBody: {
    flex: 1,
    gap: 2,
  },
  notifItemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notifItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  unreadBlueDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    marginLeft: 6,
  },
  notifItemMessage: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 16,
    marginTop: 2,
  },
  notifItemTime: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: 4,
  },
});
