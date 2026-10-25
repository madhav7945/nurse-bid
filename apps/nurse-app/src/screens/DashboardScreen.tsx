import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Image,
  Alert,
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
  Lock,
  HeartPulse,
  ArrowRight,
  CheckCircle2,
  X,
  Briefcase,
  Users,
  Clock,
  MapPin,
  ChevronRight,
  Activity,
  Wallet,
  Compass,
  CheckCheck,
  MessageSquare,
} from "lucide-react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { CircularProgressRing } from "../components/ui/CircularProgressRing";
import { DashboardSkeleton } from "../components/ui/NurseSkeleton";
import { LogVitalsModal } from "../components/ui/LogVitalsModal";
import { ContainerModal } from "../components/ui/ContainerModal";
import { SpotlightTutorialOverlay } from "../components/onboarding/SpotlightTutorialOverlay";
import { api, ShiftRecord, ShiftVitals, ClinicalJob } from "../lib/api";
import { subscribeToCrossAppEvents, subscribeToJobs, subscribeToShifts } from "../lib/realtime";
import { useAuth } from "../context/AuthContext";

interface DashboardScreenProps {
  navigation?: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { profile, refreshProfile } = useAuth();
  const [filterPeriod, setFilterPeriod] = useState<"Monthly" | "Weekly">("Monthly");
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [stats, setStats] = useState({
    activeClients: 0,
    pendingBids: 0,
    matchRate: 0,
    escrowBalance: 0,
    trustScore: 0,
    tier: "Silver",
  });

  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);
  const [recentJobs, setRecentJobs] = useState<ClinicalJob[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showVitalsModal, setShowVitalsModal] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>(
    "Your assignments and messages will appear here."
  );

  const loadDashboardData = useCallback(async () => {
    try {
      setIsDataLoading(true);
      const [statsData, shiftsData, jobsData, notifs] = await Promise.all([
        api.getNurseStats(),
        api.getShifts(),
        api.getJobs(),
        api.getNotifications?.() || Promise.resolve([]),
      ]);

      setStats({
        activeClients: statsData?.activeClients ?? 0,
        pendingBids: statsData?.pendingBids ?? 0,
        matchRate: statsData?.matchRate ?? 0,
        escrowBalance: statsData?.escrowBalance ?? 0,
        trustScore: statsData?.trustScore ?? (profile?.trust_score || 0),
        tier: statsData?.tier || profile?.tier || "Silver",
      });

      const active =
        (shiftsData || []).find((s: ShiftRecord) => s.status === "active") ||
        (shiftsData || []).find((s: ShiftRecord) => s.status === "confirmed" || s.status === "upcoming") ||
        null;
      setActiveShift(active);

      // Strict LIFO Stack Order for Dashboard Shift Radar
      const sortedJobs = [...(jobsData || [])].sort((a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setRecentJobs(sortedJobs.slice(0, 8));
      setNotifications(notifs || []);

      if (active) {
        setNotificationMessage(
          `Active shift: ${active.patientName} (${active.timeWindow}).`
        );
      } else if (sortedJobs.length > 0) {
        const topJob = sortedJobs[0];
        const loc = topJob.locality ? `${topJob.locality}, ` : "";
        setNotificationMessage(`New shift in ${loc}${topJob.city}: "${topJob.title}" (₹${topJob.hourlyRate}/hr)`);
      }
    } catch (err) {
      console.warn("Nurse Dashboard data fetch error:", err);
    } finally {
      setIsDataLoading(false);
      setHasLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    subscribeToShifts(() => {
      loadDashboardData();
    });

    subscribeToJobs(() => {
      loadDashboardData();
    });

    const unsub = subscribeToCrossAppEvents((event) => {
      if (event.type === "NEW_JOB" || event.type === "JOB_POSTED") {
        loadDashboardData();
        const j = event.payload;
        if (j) {
          const loc = j.locality ? `${j.locality}, ` : "";
          setNotificationMessage(`New shift in ${loc}${j.city || "Punjab"}: "${j.title || "Clinical Shift"}"`);

          Alert.alert(
            "🔔 New Shift in Your City!",
            `"${j.title || "Clinical Shift"}" was just posted in ${loc}${j.city || "Punjab"}. Tap View Radar to review details and submit proposal.`,
            [
              { text: "Dismiss", style: "cancel" },
              { text: "View Radar", onPress: () => navigation?.navigate?.("Jobs") },
            ]
          );
        }
      } else if (
        event.type === "BID_ACCEPTED" ||
        event.type === "VITALS_LOGGED" ||
        event.type === "SHIFT_UPDATED" ||
        event.type === "ESCROW_UPDATED"
      ) {
        if (event.type === "VITALS_LOGGED" && event.payload?.vitals) {
          const v = event.payload.vitals;
          setActiveShift((prev: any) =>
            prev
              ? {
                  ...prev,
                  vitals: { ...(prev.vitals || {}), ...v },
                }
              : prev
          );
        }
        if (event.type === "BID_ACCEPTED") {
          const patientName = event.payload?.patientName || "Patient";
          const jobTitle = event.payload?.jobTitle || "Clinical Recovery Shift";
          Alert.alert(
            "🎉 Proposal Accepted!",
            `${patientName} accepted your proposal for "${jobTitle}". Escrow deposit secured. Shift #1 is ready in your roster.`,
            [
              { text: "Dismiss", style: "cancel" },
              { text: "Open Shifts", onPress: () => navigation?.navigate?.("Shifts") },
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
  }, [profile]);

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

  const saveVitals = async (vitals: ShiftVitals) => {
    if (!activeShift) return;
    const formatted = await api.logShiftVitals(activeShift.id, vitals);
    setActiveShift((prev: any) => (prev ? { ...prev, vitals: formatted } : prev));
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
      if (!notif.isRead && notif.id) {
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
    } else if (notif.type === "shift_completed" || notif.type === "escrow" || notif.type === "payout") {
      navigation?.navigate?.("Earnings");
    } else if (notif.type === "job_posted" || notif.type === "job" || notif.type === "proposal" || notif.type === "bid") {
      navigation?.navigate?.("Jobs");
    } else if (notif.type === "shift" || notif.type === "booking") {
      navigation?.navigate?.("Shifts");
    } else if (notif.type === "message" || notif.type === "chat") {
      navigation?.navigate?.("Messages");
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />

      {/* Screen Top Bar: Settings button (left), SOS/Bell notification + Avatar (right) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => navigation?.navigate?.("Settings")}
          activeOpacity={0.75}
          accessibilityLabel="Clinician Settings"
        >
          <Settings size={20} color={colors.gray800} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.topRightGroup}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => setShowTutorial(true)}
            activeOpacity={0.75}
            accessibilityLabel="Clinician Walkthrough Guide"
          >
            <Compass size={20} color={colors.primary} strokeWidth={2.2} />
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
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>
                  {(profile?.first_name?.[0] || "N").toUpperCase()}
                  {(profile?.last_name?.[0] || "R").toUpperCase()}
                </Text>
              </View>
            )}
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
            {/* Greeting / Heading Row with Period Filter Pill on top-right */}
            <View style={styles.headingRow}>
              <View style={styles.headingTextWrap}>
                <Text style={styles.headingTitle}>
                  Welcome back, {profile?.first_name || "Nurse"}
                </Text>
                <Text style={styles.headingSubtitle}>
                  {profile?.specialization?.[0] || "Nurse"}{stats.tier ? ` • ${stats.tier} tier` : ""}
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

            {/* LATEST NOTIFICATION FEED BANNER (1:1 Patient App Parity) */}
            <View style={styles.latestNotificationCard}>
              <TouchableOpacity
                style={styles.notifIconWrap}
                onPress={() => setShowNotificationsModal(true)}
                activeOpacity={0.75}
              >
                <Bell size={16} color={colors.primary} strokeWidth={2.2} />
                {unreadCount > 0 && <View style={styles.notifRedDot} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notifTextWrap}
                onPress={() => setShowNotificationsModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.notifLead} numberOfLines={2}>
                  <Text style={styles.notifTag}>Update: </Text>
                  {notificationMessage}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.liveFeedLink}
                onPress={() => navigation?.navigate?.("Shifts")}
                activeOpacity={0.7}
              >
                <Text style={styles.liveFeedText}>Cockpit</Text>
                <View style={styles.btnIconPillSmall}>
                  <ArrowRight size={11} color={colors.primary} strokeWidth={2.4} />
                </View>
              </TouchableOpacity>
            </View>

            {/* 2x2 STAT CARD GRID WITH PERCENTAGE PROGRESS RINGS */}
            <View style={styles.statGrid}>
              {/* Row 1 */}
              <View style={styles.gridRow}>
                {/* Card 1: Active Patients */}
                <TouchableOpacity
                  style={[styles.statCard, styles.whiteCard]}
                  activeOpacity={0.85}
                  onPress={() => navigation?.navigate?.("Patients")}
                >
                  <View style={styles.statCardHeader}>
                    <View style={styles.iconChipWhite}>
                      <Users size={18} color={colors.gray700} strokeWidth={2} />
                    </View>
                    <CircularProgressRing
                      percentage={Math.min(100, Math.round((stats.activeClients / 3) * 100))}
                      size={36}
                      color={colors.gray700}
                      trackColor="rgba(0, 0, 0, 0.06)"
                      textColor={colors.gray800}
                    />
                  </View>
                  <Text style={styles.statLabel}>Active Patients</Text>
                  <Text style={styles.statNumber}>
                    {stats.activeClients} Active<Text style={styles.statSub}>/census</Text>
                  </Text>
                </TouchableOpacity>

                {/* Card 2: Protected Deposit Balance (Tinted Blue) */}
                <TouchableOpacity
                  style={[styles.statCard, styles.tintedBlueCard]}
                  activeOpacity={0.85}
                  onPress={() => navigation?.navigate?.("Profile")}
                >
                  <View style={styles.statCardHeader}>
                    <View style={styles.iconChipBlue}>
                      <ShieldCheck size={18} color={colors.primary} strokeWidth={2} />
                    </View>
                    <CircularProgressRing
                      percentage={Math.min(100, Math.max(10, Math.round((Number(stats.escrowBalance) / 30000) * 100)))}
                      size={36}
                      color={colors.primary}
                      trackColor="rgba(46, 91, 255, 0.15)"
                      textColor={colors.primaryDark}
                    />
                  </View>
                  <Text style={[styles.statLabel, styles.statLabelBlue]}>Pending earnings</Text>
                  <Text style={[styles.statNumber, styles.statNumberBlue]}>
                    ₹{Number(filterPeriod === "Weekly" ? Math.min(stats.escrowBalance, Math.round(stats.escrowBalance * 7 / Math.max(7, activeShift?.totalDays || 14))) : stats.escrowBalance).toLocaleString("en-IN")}
                    <Text style={styles.statSubBlue}>/{filterPeriod === "Weekly" ? "wk" : "mo"}</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Row 2 */}
              <View style={styles.gridRow}>
                {/* Card 3: Shift Match Rate */}
                <TouchableOpacity
                  style={[styles.statCard, styles.whiteCard]}
                  activeOpacity={0.85}
                  onPress={() => navigation?.navigate?.("Jobs")}
                >
                  <View style={styles.statCardHeader}>
                    <View style={styles.iconChipWhite}>
                      <SlidersHorizontal size={18} color={colors.gray700} strokeWidth={2} />
                    </View>
                    <CircularProgressRing
                      percentage={Math.min(100, Math.max(0, stats.matchRate))}
                      size={36}
                      color={colors.gray700}
                      trackColor="rgba(0, 0, 0, 0.06)"
                      textColor={colors.gray800}
                    />
                  </View>
                  <Text style={styles.statLabel}>Match rate</Text>
                  <Text style={styles.statNumber}>
                    {stats.matchRate}%<Text style={styles.statSub}>/Punjab</Text>
                  </Text>
                </TouchableOpacity>

                {/* Card 4: Trust Score */}
                <TouchableOpacity
                  style={[styles.statCard, styles.whiteCard]}
                  activeOpacity={0.85}
                  onPress={() => navigation?.navigate?.("Profile")}
                >
                  <View style={styles.statCardHeader}>
                    <View style={styles.iconChipWhite}>
                      <Star size={18} color={colors.gray700} strokeWidth={2} />
                    </View>
                    <CircularProgressRing
                      percentage={Math.min(100, Math.max(0, stats.trustScore))}
                      size={36}
                      color={colors.gray700}
                      trackColor="rgba(0, 0, 0, 0.06)"
                      textColor={colors.gray800}
                    />
                  </View>
                  <Text style={styles.statLabel}>Trust score</Text>
                  <Text style={styles.statNumber}>
                    {stats.trustScore}/100<Text style={styles.statSub}>/{stats.tier || "Diamond"}</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ROW OF 4 ROUNDED SQUARE ACTION BUTTONS */}
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>

            <View style={styles.quickActionsRow}>
              {/* Action 1: Browse Radar */}
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnActive]}
                onPress={() => navigation?.navigate?.("Jobs")}
                activeOpacity={0.85}
              >
                <View style={styles.actionIconWrapActive}>
                  <Briefcase size={20} color={colors.white} strokeWidth={2.4} />
                </View>
                <Text style={styles.actionLabelActive}>Radar</Text>
              </TouchableOpacity>

              {/* Action 2: Active Shifts */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation?.navigate?.("Shifts")}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconWrap}>
                  <Calendar size={18} color={colors.gray700} strokeWidth={2} />
                </View>
                <Text style={styles.actionLabel}>Shifts</Text>
              </TouchableOpacity>

              {/* Action 3: Patients Census */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation?.navigate?.("Patients")}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconWrap}>
                  <Users size={18} color={colors.gray700} strokeWidth={2} />
                </View>
                <Text style={styles.actionLabel}>Census</Text>
              </TouchableOpacity>

              {/* Action 4: Protected Wallet */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation?.navigate?.("Profile")}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconWrap}>
                  <Wallet size={18} color={colors.gray700} strokeWidth={2} />
                </View>
                <Text style={styles.actionLabel}>Wallet</Text>
              </TouchableOpacity>
            </View>

            {/* TODAY'S ACTIVITY SUMMARY STRIP */}
            <View style={styles.activityStrip}>
              <View style={styles.activityItem}>
                <Text style={styles.activityNum}>{activeShift ? activeShift.durationHrs : "0"}</Text>
                <Text style={styles.activityLabel}>Hrs Worked</Text>
              </View>
              <View style={styles.activityDivider} />
              <View style={styles.activityItem}>
                <Text style={styles.activityNum}>{stats.activeClients}</Text>
                <Text style={styles.activityLabel}>Patients</Text>
              </View>
              <View style={styles.activityDivider} />
              <View style={styles.activityItem}>
                <Text style={styles.activityNum}>{activeShift?.vitals ? "1" : "0"}</Text>
                <Text style={styles.activityLabel}>Vitals Logged</Text>
              </View>
              <View style={styles.activityDivider} />
              <View style={styles.activityItem}>
                <Text style={[styles.activityNum, { color: colors.success }]}>
                  {activeShift?.vitals ? "Yes" : "No"}
                </Text>
                <Text style={styles.activityLabel}>Vitals logged</Text>
              </View>
            </View>

            {/* RECOVERY VITALS & ACTIVE SHIFT TELEMETRY BENTO CARD */}
            {activeShift ? (
              <View style={styles.cleanHealthCard}>
                {/* Header Row */}
                <View style={styles.cleanHealthHeader}>
                  <View style={styles.cleanHealthHeaderLeft}>
                    <View style={styles.cleanHealthIconWrap}>
                      <HeartPulse size={18} color="#059669" strokeWidth={2.4} />
                    </View>
                    <View style={styles.cleanHealthCopy}>
                      <Text style={styles.cleanHealthTitle}>Current shift</Text>
                      <Text style={styles.cleanHealthSub} numberOfLines={1}>
                        {activeShift.patientName} • {activeShift.diagnosis}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cleanStableBadge}>
                    <View style={styles.cleanPulseDot} />
                    <Text style={styles.cleanStableText}>On Duty</Text>
                  </View>
                </View>

                {/* 4 Bento Vitals Tiles */}
                <View style={styles.cleanVitalsGrid}>
                  {/* Heart Rate */}
                  <View style={styles.cleanVitalTile}>
                    <Text style={styles.cleanVitalLabel}>Heart Rate</Text>
                    <View style={styles.cleanVitalNumRow}>
                      <Text style={styles.cleanVitalNum}>
                        {activeShift.vitals?.pulse || "--"}
                      </Text>
                      <Text style={styles.cleanVitalUnit}>bpm</Text>
                    </View>
                    <Text style={styles.cleanVitalTag}>{activeShift.vitals?.pulse ? "Normal" : "Pending"}</Text>
                  </View>

                  {/* Blood Pressure */}
                  <View style={styles.cleanVitalTile}>
                    <Text style={styles.cleanVitalLabel}>Blood Pressure</Text>
                    <View style={styles.cleanVitalNumRow}>
                      <Text style={styles.cleanVitalNum}>
                        {activeShift.vitals?.bp || "--/--"}
                      </Text>
                      <Text style={styles.cleanVitalUnit}>mmHg</Text>
                    </View>
                    <Text style={styles.cleanVitalTag}>{activeShift.vitals?.bp ? "Optimal" : "Pending"}</Text>
                  </View>

                  {/* SpO2 */}
                  <View style={styles.cleanVitalTile}>
                    <Text style={styles.cleanVitalLabel}>Oxygen (SpO2)</Text>
                    <View style={styles.cleanVitalNumRow}>
                      <Text style={styles.cleanVitalNum}>
                        {activeShift.vitals?.spo2 || "--"}%
                      </Text>
                    </View>
                    <Text style={styles.cleanVitalTag}>{activeShift.vitals?.spo2 ? "Room Air" : "Pending"}</Text>
                  </View>

                  {/* Blood Sugar */}
                  <View style={styles.cleanVitalTile}>
                    <Text style={styles.cleanVitalLabel}>Blood Sugar</Text>
                    <View style={styles.cleanVitalNumRow}>
                      <Text style={styles.cleanVitalNum}>
                        {activeShift.vitals?.sugar || "--"}
                      </Text>
                      <Text style={styles.cleanVitalUnit}>mg/dL</Text>
                    </View>
                    <Text style={styles.cleanVitalTag}>{activeShift.vitals?.sugar ? "Fasting" : "Pending"}</Text>
                  </View>
                </View>

                {/* Clean Footer Row with "Log Bedside Vitals" CTA */}
                <TouchableOpacity
                  style={styles.cleanDossierLinkRow}
                  onPress={() => setShowVitalsModal(true)}
                  activeOpacity={0.75}
                >
                  <View style={styles.cleanDossierLinkLeft}>
                    <CheckCircle2 size={13} color="#059669" />
                    <Text style={styles.cleanDossierLinkNote}>
                      {activeShift.gpsCheckinAt ? "Checked in" : "Ready to check in"}
                    </Text>
                  </View>
                  <Text style={styles.cleanDossierLinkAction}>Log Bedside Vitals →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.standbyEmptyCard}>
                <View style={styles.standbyEmptyIcon}>
                  <HeartPulse size={22} color={colors.primary} strokeWidth={2} />
                </View>
                <Text style={styles.standbyEmptyTitle}>No Active Shift In Progress</Text>
                <Text style={styles.standbyEmptySub}>
                  Your current assignments and shift actions will appear here.
                </Text>
                <TouchableOpacity
                  style={styles.standbyEmptyBtn}
                  onPress={() => navigation?.navigate?.("Jobs")}
                  activeOpacity={0.85}
                >
                  <Text style={styles.standbyEmptyBtnText}>Browse Open Care Requests</Text>
                  <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            )}

            {/* OPEN SHIFT RADAR LIST (Matches Recent Postings from Patient App) */}
            <View style={styles.recentTitleRow}>
              <Text style={styles.sectionTitle}>Open Shift Radar</Text>
              <TouchableOpacity
                onPress={() => navigation?.navigate?.("Jobs")}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recentList}>
              {recentJobs.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  activeOpacity={0.85}
                  onPress={() => navigation?.navigate?.("JobDetail", { job })}
                >
                  <View style={styles.jobTopRow}>
                    <View style={styles.jobTagGroup}>
                      <View
                        style={[
                          styles.urgencyPill,
                          job.urgency === "Urgent" ? styles.urgencyRed : styles.urgencyBlue,
                        ]}
                      >
                        <Text
                          style={[
                            styles.urgencyText,
                            job.urgency === "Urgent" ? styles.urgencyTextRed : styles.urgencyTextBlue,
                          ]}
                        >
                          {job.urgency}
                        </Text>
                      </View>
                      <View style={styles.careTypePill}>
                        <Text style={styles.careTypePillText}>{job.careType}</Text>
                      </View>
                    </View>

                    {job.isEscrowFunded && (
                      <View style={styles.escrowPill}>
                        <ShieldCheck size={12} color={colors.success} />
                        <Text style={styles.escrowPillText}>Deposit Protected</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobPatient}>
                    Patient: {job.patientName} • Identity Verified
                  </Text>

                  {job.description && (
                    <Text style={styles.jobSnippet} numberOfLines={2}>
                      {job.description}
                    </Text>
                  )}

                  <View style={styles.jobMetaRow}>
                    <View style={styles.jobMetaItem}>
                      <MapPin size={12} color={colors.gray500} />
                      <Text style={styles.jobMetaText}>
                        {job.locality}, {job.city} ({job.distanceKm} km)
                      </Text>
                    </View>
                    <View style={styles.jobMetaItem}>
                      <Clock size={12} color={colors.gray500} />
                      <Text style={styles.jobMetaText}>
                        {job.shiftModel} • {job.durationDays} days
                      </Text>
                    </View>
                  </View>

                  <View style={styles.jobFooter}>
                    <View>
                      <Text style={styles.jobRateLabel}>Client Budget</Text>
                      <Text style={styles.jobRateValue}>
                        ₹{job.hourlyRate}
                        <Text style={styles.jobRateUnit}> / hr</Text>
                      </Text>
                    </View>
                    <View style={styles.viewDossierLink}>
                      <Text style={styles.viewDossierText}>View Dossier</Text>
                      <ChevronRight size={13} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Log Vitals Modal */}
      <LogVitalsModal
        visible={showVitalsModal}
        onClose={() => setShowVitalsModal(false)}
        onSave={saveVitals}
        initialVitals={activeShift?.vitals}
        patientName={activeShift?.patientName}
      />

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
                    You're all caught up. Patient assignments, care shift updates, and milestone alerts will appear here.
                  </Text>
                </View>
              ) : (
                notifications.map((notif: any, idx: number) => {
                  const isRead = notif.isRead;
                  const itemKey = notif.id || `notif-${idx}`;
                  return (
                    <TouchableOpacity
                      key={itemKey}
                      style={[styles.notifItemCard, !isRead && styles.notifItemUnread]}
                      onPress={() => handleNotificationPress(notif)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.notifItemIconCircle,
                          (notif.type === "job_posted" || notif.type === "job") && { backgroundColor: "#EFF6FF" },
                          (notif.type === "proposal" || notif.type === "bid") && { backgroundColor: "#ECFDF5" },
                          (notif.type === "booking" || notif.type === "shift" || notif.type === "shift_completed") && { backgroundColor: "#F3E8FF" },
                          (notif.type === "message" || notif.type === "chat") && { backgroundColor: "#E0F2FE" },
                        ]}
                      >
                        {notif.type === "job_posted" || notif.type === "job" ? (
                          <Briefcase size={16} color="#2563EB" strokeWidth={2.2} />
                        ) : notif.type === "proposal" || notif.type === "bid" ? (
                          <ShieldCheck size={16} color="#059669" strokeWidth={2.2} />
                        ) : notif.type === "booking" || notif.type === "shift" || notif.type === "shift_completed" ? (
                          <Calendar size={16} color="#7C3AED" strokeWidth={2.2} />
                        ) : notif.type === "message" || notif.type === "chat" ? (
                          <MessageSquare size={16} color="#0284C7" strokeWidth={2.2} />
                        ) : (
                          <HeartPulse size={16} color="#2563EB" strokeWidth={2.2} />
                        )}
                      </View>

                      <View style={styles.notifItemBody}>
                        <View style={styles.notifItemTopRow}>
                          <Text style={styles.notifItemTitle} numberOfLines={1}>
                            {notif.title || "Clinical Notification"}
                          </Text>
                          {!isRead && <View style={styles.unreadBlueDot} />}
                        </View>
                        <Text style={styles.notifItemMessage} numberOfLines={2}>
                          {notif.message || notif.content || "Shift telemetry and care coordination notification."}
                        </Text>
                        <Text style={styles.notifItemTime}>
                          {notif.timeAgo || (notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently")}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Clinician Onboarding Pinned Spotlight Walkthrough */}
      <SpotlightTutorialOverlay
        visible={showTutorial}
        onComplete={handleCompleteTutorial}
        onDismiss={handleDismissTutorial}
        nurseName={
          profile
            ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Clinician"
            : "Clinician"
        }
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
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 19,
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
    marginBottom: 14,
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
  activityStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neuBorder,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  activityItem: {
    flex: 1,
    alignItems: "center",
  },
  activityNum: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  activityLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.gray500,
    marginTop: 2,
    textTransform: "uppercase" as const,
    letterSpacing: 0.2,
  },
  activityDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.neuBorder,
  },
  jobSnippet: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.gray600,
    marginTop: 6,
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
  standbyEmptyCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    padding: 22,
    marginBottom: 20,
    alignItems: "center",
    textAlign: "center",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 4,
  },
  standbyEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  standbyEmptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.gray900,
    marginBottom: 6,
    textAlign: "center",
  },
  standbyEmptySub: {
    fontSize: 12,
    color: colors.gray600,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  standbyEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  standbyEmptyBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cleanHealthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cleanHealthHeaderLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cleanHealthCopy: {
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
  cleanStableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    marginLeft: 8,
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
  cleanVitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  cleanVitalTile: {
    width: "48%",
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 142,
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
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(226, 234, 245, 0.7)",
  },
  cleanDossierLinkLeft: {
    flex: 1,
    minWidth: 130,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cleanDossierLinkNote: {
    fontSize: 11,
    color: colors.gray600,
    fontWeight: "500",
  },
  cleanDossierLinkAction: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },
  recentTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  recentList: {
    gap: 12,
  },
  jobCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 4,
  },
  jobTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobTagGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  urgencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  urgencyRed: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 0.5,
    borderColor: colors.dangerBorder,
  },
  urgencyBlue: {
    backgroundColor: colors.primarySoft,
    borderWidth: 0.5,
    borderColor: colors.primaryBorder,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: "800",
  },
  urgencyTextRed: {
    color: colors.danger,
  },
  urgencyTextBlue: {
    color: colors.primary,
  },
  careTypePill: {
    backgroundColor: colors.neuInset,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.neuInsetBorder,
  },
  careTypePillText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray600,
  },
  escrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.successBorder,
  },
  escrowPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.success,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gray900,
    marginTop: 10,
    letterSpacing: -0.2,
  },
  jobPatient: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
    marginTop: 3,
  },
  jobMetaRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 8,
  },
  jobMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  jobMetaText: {
    fontSize: 11,
    color: colors.gray500,
    fontWeight: "500",
  },
  jobFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    marginTop: 12,
    paddingTop: 10,
  },
  jobRateLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.gray400,
    textTransform: "uppercase",
  },
  jobRateValue: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.gray900,
    marginTop: 1,
  },
  jobRateUnit: {
    fontSize: 11,
    color: colors.gray500,
    fontWeight: "500",
  },
  viewDossierLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  viewDossierText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
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
    marginTop: 4,
  },
});
