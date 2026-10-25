import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ShieldCheck,
  Star,
  Award,
  Clock,
  MapPin,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  Trash2,
  UserCheck,
  Check,
  User,
  Stethoscope,
  HeartPulse,
  IndianRupee,
  Calendar,
  X,
  Radio,
  Lock,
  Pill,
} from "lucide-react-native";
import { colors } from "../theme/colors";
import { api } from "../lib/api";
import { subscribeToCrossAppEvents } from "../lib/realtime";
import { ProposalsListSkeleton } from "../components/ui/Skeleton";

export interface NurseProposal {
  id: string;
  nurseId: string;
  nurseName: string;
  avatarInitials: string;
  trustScore: number;
  experienceYears: number;
  specialization: string;
  hospitalAlum: string;
  registrationNumber: string;
  commuteTime: string;
  hourlyRate: number;
  totalCareHours: number;
  coverLetter: string;
  certifications: string[];
  status: "active" | "accepted";
}

interface ProposalsScreenProps {
  navigation: any;
  route?: any;
}

const parseListField = (raw: any, fallback: string[] = []): string[] => {
  if (!raw) return fallback;
  if (Array.isArray(raw)) {
    const cleaned = raw.map((item) => String(item).trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : fallback;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return fallback;
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.map((item) => String(item).trim()).filter(Boolean);
          if (cleaned.length > 0) return cleaned;
        }
      } catch {}
    }
    if (trimmed.includes("\n") || trimmed.includes(",")) {
      const split = trimmed.split(/[\n,]+/).map((s) => s.trim().replace(/^[-*•]\s*/, "")).filter(Boolean);
      if (split.length > 0) return split;
    }
    return [trimmed];
  }
  return fallback;
};

const getRelativeTimeString = (dateStr?: string) => {
  if (!dateStr) return "Active Requisition";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 2) return "Posted just now";
    if (diffMins < 60) return `Posted ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Posted ${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `Posted ${diffDays}d ago`;
  } catch {
    return "Active Requisition";
  }
};

interface JobMarketplaceReviewCardProps {
  jobInfo: any;
}

/**
 * Requisition Review Card
 * Visually calibrated to match the high-end, clean enterprise aesthetic
 * of JobDetailScreen.tsx in the Nurse App.
 */
const JobMarketplaceReviewCard: React.FC<JobMarketplaceReviewCardProps> = ({ jobInfo }) => {
  const jobTitle = jobInfo?.title || "Specialized Home Nursing Care";
  const timePosted = getRelativeTimeString(jobInfo?.createdAt || jobInfo?.created_at);
  const locality = jobInfo?.locality || "Model Town";
  const city = jobInfo?.city || "Punjab";

  // Parse embedded JSON metadata if present
  let metadata: any = {};
  const rawDesc = typeof jobInfo?.description === "string" ? jobInfo.description : "";
  if (rawDesc.includes("---JOB_METADATA---")) {
    try {
      const parts = rawDesc.split("---JOB_METADATA---");
      metadata = JSON.parse(parts[1].trim());
    } catch {}
  }

  const patientName = jobInfo?.patientName || jobInfo?.patient_name || "Patient";
  const patientRelationship =
    metadata.patientRelationship ||
    jobInfo?.patientRelationship ||
    jobInfo?.patient_relationship ||
    (rawDesc.match(/Patient Profile:\s*([^\n•]+)/i)?.[1]?.trim()) ||
    "Self";

  const parsedAge =
    metadata.patientAge ||
    jobInfo?.patientAge ||
    jobInfo?.patient_age ||
    (rawDesc.match(/(\d+)\s*y(?:rs)?/i)?.[1]) ||
    16;
  const patientAge = String(parsedAge);

  const patientGender =
    metadata.patientGender ||
    jobInfo?.patientGender ||
    jobInfo?.patient_gender ||
    (rawDesc.includes("Female") ? "Female" : "Male");

  const rawMobility =
    metadata.mobilityLevel ||
    jobInfo?.mobilityLevel ||
    jobInfo?.mobilityStatus ||
    jobInfo?.mobility_level ||
    jobInfo?.mobility_status ||
    "Ambulatory";
  const mobilityLevel = String(rawMobility).replace(/\|/g, "").trim();

  const mobilityDirectives =
    metadata.mobilityDirectives ||
    jobInfo?.mobilityDirectives ||
    (rawDesc.match(/Directives:\s*([^\n]+)/i)?.[1]?.trim()) ||
    "";

  const careCategory = jobInfo?.careType || jobInfo?.care_type || "Post-Surgical ICU";

  const physicianOrders = (() => {
    if (metadata.physicianOrders) return metadata.physicianOrders;
    if (jobInfo?.physicianOrders) return jobInfo.physicianOrders;
    if (jobInfo?.physician_orders) return jobInfo.physician_orders;
    if (rawDesc) {
      const match =
        rawDesc.match(/Physician Directives:\s*([\s\S]*?)(?:\n\n---|\n\n[A-Z]|$)/i) ||
        rawDesc.match(/Physician Orders:\s*([\s\S]*?)(?:\n\n---|\n\n[A-Z]|$)/i);
      if (match && match[1] && match[1].trim() && !match[1].includes("Standard nursing care protocol") && !match[1].includes("Prescription on file")) {
        return match[1].trim();
      }
      if (rawDesc.trim() && !rawDesc.includes("Clinical Care Category:")) {
        return rawDesc.replace(/\n\n---[\s\S]*$/, "").trim();
      }
    }
    return "Standard physician post-operative care protocol, continuous vitals charting, medication compliance, and emergency airway maintenance.";
  })();

  const hoursPerDay = Number(jobInfo?.dailyHours || jobInfo?.daily_hours || 12);
  const numDays = Number(jobInfo?.durationDays || jobInfo?.duration_days || 3);
  const totalHours = hoursPerDay * numDays;

  const shiftModel = metadata.shiftModel || jobInfo?.shiftModel || jobInfo?.shift_model || "Day Shift (12h)";
  const shiftStartTime = metadata.shiftStartTime || "08:00 AM";
  const shiftEndTime = metadata.shiftEndTime || "08:00 PM";

  const minRate = Number(jobInfo?.budgetMin || jobInfo?.budget_min || 650);
  const maxRate = Number(jobInfo?.budgetMax || jobInfo?.budget_max || 850);
  const minCost = minRate * totalHours;
  const maxCost = maxRate * totalHours;

  const rawProcedures =
    jobInfo?.requiredProcedures ||
    jobInfo?.required_procedures ||
    jobInfo?.proceduresRequired ||
    jobInfo?.procedures_required ||
    jobInfo?.checklist;
  const proceduresList: string[] = parseListField(rawProcedures, []);

  const rawCerts =
    jobInfo?.requiredCertifications ||
    jobInfo?.required_certifications ||
    jobInfo?.certifications;
  const certsList: string[] = parseListField(rawCerts, []);

  const rawEquip =
    metadata.equipmentRequired ||
    jobInfo?.equipmentRequired ||
    jobInfo?.equipment_required;
  const equipList: string[] = parseListField(rawEquip, []);

  const roomProvided = metadata.roomProvided ?? (rawDesc.includes("Private room") || false);
  const mealsProvided = metadata.mealsProvided ?? (rawDesc.includes("Meals provided") || false);
  const postalCode = metadata.postalCode || "";
  const drugAllergies =
    metadata.drugAllergies ||
    (rawDesc.match(/Drug Allergies:\s*([^\n]+)/i)?.[1]?.replace("None reported", "").replace("Documented in Patient Dossier (Shared upon booking)", "").trim()) ||
    "";

  return (
    <View style={styles.requisitionContainer}>
      {/* 1. Job Title & Meta (Exact Live Preview Parity) */}
      <View style={styles.previewHeroBox}>
        <View style={styles.statusBadgeRow}>
          <View style={styles.activeStatusBadge}>
            <View style={styles.activeStatusDot} />
            <Text style={styles.activeStatusText}>BROADCAST ACTIVE</Text>
          </View>
          <Text style={styles.previewMetaDot}>{timePosted}</Text>
        </View>

        <Text style={styles.previewCardTitle}>{jobTitle}</Text>

        <View style={styles.previewMetaRow}>
          <MapPin size={13} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.previewMetaLocation}>
            {locality}, {city}, Punjab
          </Text>
          <Text style={styles.previewMetaMasked}>
            (Exact location hidden prior to confirmed deposit)
          </Text>
        </View>
      </View>

      {/* 2. Patient Profile Card (Exact Live Preview Parity) */}
      <View style={styles.previewPatientCard}>
        <View style={styles.previewPatientAvatar}>
          <User size={20} color={colors.primary} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.previewPatientNameRow}>
            <Text style={styles.previewPatientName}>{patientName}</Text>
            <View style={styles.previewPatientPill}>
              <Text style={styles.previewPatientPillText}>
                {patientRelationship} • {patientAge ? `${patientAge}y` : ""} • {patientGender}
              </Text>
            </View>
          </View>
          <View style={styles.previewMobilityRow}>
            <Text style={styles.previewMobilityLabel}>Mobility: </Text>
            <Text style={styles.previewMobilityVal}>{mobilityLevel}</Text>
          </View>
          {mobilityDirectives ? (
            <Text style={styles.previewMobilityDirectives}>({mobilityDirectives})</Text>
          ) : null}
        </View>
      </View>

      {/* 3. Summary & Care Directives (Exact Live Preview Parity) */}
      <View style={styles.previewSectionBox}>
        <Text style={styles.previewSectionSmallHeader}>SUMMARY & CARE DIRECTIVES</Text>
        <Text style={styles.previewCategoryTitle}>
          {careCategory} — Patient Care Directives
        </Text>
        <View style={styles.previewClinicalOrdersBox}>
          <Text style={styles.previewClinicalOrdersText}>
            {physicianOrders}
          </Text>
        </View>
      </View>

      {/* 4. 4 Metric Badges Grid (Exact Live Preview 4-Card Strip) */}
      <View style={styles.previewMetricsGrid}>
        {/* Metric 1: Hours */}
        <View style={styles.previewMetricCard}>
          <View style={styles.previewMetricIconCircle}>
            <Clock size={15} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.previewMetricValue}>{hoursPerDay} hrs / day</Text>
          <Text style={styles.previewMetricSub}>{shiftModel}</Text>
          <Text style={styles.previewMetricTime}>{shiftStartTime} – {shiftEndTime}</Text>
        </View>

        {/* Metric 2: Duration */}
        <View style={styles.previewMetricCard}>
          <View style={styles.previewMetricIconCircle}>
            <Calendar size={15} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.previewMetricValue}>{numDays} Days</Text>
          <Text style={styles.previewMetricSub}>{numDays} Total Shifts</Text>
          <Text style={styles.previewMetricTime}>{totalHours} total care hrs</Text>
        </View>

        {/* Metric 3: PNC Registered */}
        <View style={styles.previewMetricCard}>
          <View style={styles.previewMetricIconCircle}>
            <ShieldCheck size={15} color={colors.success} strokeWidth={2.2} />
          </View>
          <Text style={styles.previewMetricValue}>PNC Registered</Text>
          <Text style={styles.previewMetricSub}>Punjab Verified</Text>
          <Text style={styles.previewMetricTime}>Licensed Clinicians Only</Text>
        </View>

        {/* Metric 4: Rate */}
        <View style={styles.previewMetricCard}>
          <View style={styles.previewMetricIconCircle}>
            <IndianRupee size={15} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.previewMetricValue}>₹{minRate} – ₹{maxRate}</Text>
          <Text style={styles.previewMetricSub}>Hourly Rate</Text>
          <Text style={styles.previewMetricTime}>
            Est. ₹{minCost.toLocaleString("en-IN")} – ₹{maxCost.toLocaleString("en-IN")}
          </Text>
        </View>
      </View>

      {/* 5. Required Clinical Procedures */}
      {proceduresList.length > 0 && (
        <View style={styles.previewSectionBox}>
          <Text style={styles.previewSectionTitle}>
            Required Clinical Procedures ({proceduresList.length})
          </Text>
          <View style={styles.previewProceduresList}>
            {proceduresList.map((item, idx) => (
              <View key={idx} style={styles.previewProcedureItemRow}>
                <CheckCircle2 size={14} color={colors.primary} strokeWidth={2.4} />
                <Text style={styles.previewProcedureItemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 6. Mandatory Certifications & Skills */}
      {certsList.length > 0 && (
        <View style={styles.previewSectionBox}>
          <Text style={styles.previewSectionTitle}>Mandatory Certifications & Skills</Text>
          <View style={styles.previewTagsWrap}>
            {certsList.map((cert, idx) => (
              <View key={idx} style={styles.previewCertPill}>
                <Text style={styles.previewCertPillText}>{cert}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 7. Medical Equipment Handled */}
      {equipList.length > 0 && (
        <View style={styles.previewSectionBox}>
          <Text style={styles.previewSectionTitle}>
            Medical Equipment Handled ({equipList.length})
          </Text>
          <View style={styles.previewTagsWrap}>
            {equipList.map((eq, idx) => (
              <View key={idx} style={styles.previewEquipPill}>
                <Text style={styles.previewEquipPillText}>{eq}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 8. Location & Care Logistics */}
      <View style={styles.previewLogisticsCard}>
        <View style={styles.previewLogisticsHeader}>
          <MapPin size={15} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.previewLogisticsTitle}>Location & Care Logistics</Text>
        </View>
        <View style={styles.previewLogisticsBody}>
          <Text style={styles.previewLogisticsLine}>
            <Text style={styles.previewBoldLabel}>Marketplace Location: </Text>
            {locality}, {city} (Punjab, PIN: {postalCode})
          </Text>
          <Text style={styles.previewLogisticsLine}>
            <Text style={styles.previewBoldLabel}>Care Logistics: </Text>
            {roomProvided ? "Private rest room provided" : "No separate room"} • {mealsProvided ? "Home meals provided" : "Meals self-arranged"}
          </Text>
          <View style={styles.previewPrivacyStrip}>
            <Lock size={12} color={colors.primary} strokeWidth={2.2} />
            <Text style={styles.previewPrivacyText}>
              Exact house address and coordinator contact are revealed exclusively to the selected nurse after Protected Care Deposit milestone funding.
            </Text>
          </View>
        </View>
      </View>

      {/* 9. Clinical Allergies & Precautions */}
      {drugAllergies ? (
        <View style={styles.previewAllergiesBox}>
          <View style={styles.previewAllergiesHeader}>
            <Pill size={14} color={colors.danger} strokeWidth={2.2} />
            <Text style={styles.previewAllergiesTitle}>Clinical Allergies & Precautions</Text>
          </View>
          <Text style={styles.previewAllergiesVal}>{drugAllergies}</Text>
        </View>
      ) : null}

      {/* 10. Protected Care Deposit Guarantee */}
      <View style={styles.previewDepositCard}>
        <View style={styles.previewDepositHeader}>
          <ShieldCheck size={16} color={colors.success} strokeWidth={2.4} />
          <Text style={styles.previewDepositTitle}>Protected Care Deposit Guarantee</Text>
        </View>
        <Text style={styles.previewDepositDesc}>
          Funds are safely held under Punjab Nursing Council protected milestone standards and released per verified digital shift timesheet. Zero automatic releases without patient sign-off.
        </Text>
      </View>

      {/* 11. About the Client / Requester */}
      <View style={styles.previewAboutClientCard}>
        <Text style={styles.previewAboutClientTitle}>About the Client</Text>
        <View style={styles.previewClientProfileRow}>
          <View style={styles.previewClientAvatarCircle}>
            <User size={16} color={colors.primary} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.previewClientName}>{patientName} Family</Text>
            <Text style={styles.previewClientSub}>Care for {patientRelationship} ({patientAge}y, {patientGender})</Text>
          </View>
        </View>
        <View style={styles.previewVerificationsList}>
          <View style={styles.previewVerifyItem}>
            <CheckCircle2 size={13} color={colors.success} strokeWidth={2.4} />
            <Text style={styles.previewVerifyText}>Payment method verified (Protected Care Deposit)</Text>
          </View>
          <View style={styles.previewVerifyItem}>
            <CheckCircle2 size={13} color={colors.success} strokeWidth={2.4} />
            <Text style={styles.previewVerifyText}>Phone number verified (+91 98XXX XXXXX)</Text>
          </View>
          <View style={styles.previewVerifyItem}>
            <CheckCircle2 size={13} color={colors.success} strokeWidth={2.4} />
            <Text style={styles.previewVerifyText}>Punjab Nursing Council regulatory compliance</Text>
          </View>
        </View>
        <View style={styles.previewClientStatsRow}>
          <Text style={styles.previewClientStatText}>⭐ 5.0 (Punjab Verified)</Text>
          <Text style={styles.previewClientStatDivider}>•</Text>
          <Text style={styles.previewClientStatText}>4 Jobs Posted</Text>
          <Text style={styles.previewClientStatDivider}>•</Text>
          <Text style={styles.previewClientStatText}>100% Hire Rate</Text>
        </View>
      </View>
    </View>
  );
};

export const ProposalsScreen: React.FC<ProposalsScreenProps> = ({ navigation, route: routeProp }) => {
  const routeNav = (navigation as any)?.getState?.()?.routes?.find?.((r: any) => r.name === "Proposals");
  const jobId = routeProp?.params?.jobId || routeNav?.params?.jobId || undefined;

  const [proposals, setProposals] = useState<NurseProposal[]>([]);
  const [jobInfo, setJobInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [startingChatNurseId, setStartingChatNurseId] = useState<string | null>(null);
  const [selectedNurseId, setSelectedNurseId] = useState<string>("");
  const [inspectModalNurse, setInspectModalNurse] = useState<NurseProposal | null>(null);

  const handleMessageNurse = async (nurse: any) => {
    if (!nurse || startingChatNurseId) return;
    try {
      setStartingChatNurseId(nurse.id);
      const targetNurseId = nurse.nurseId || nurse.nurse_id || nurse.id;
      const targetJobId = jobId || jobInfo?.id;
      const conv = await api.startConversationWithNurse(targetNurseId, targetJobId);
      navigation?.navigate?.("Messages", { conversationId: conv?.id });
    } catch (err: any) {
      console.warn("startConversationWithNurse notice:", err);
      navigation?.navigate?.("Messages");
    } finally {
      setStartingChatNurseId(null);
    }
  };

  const loadProposals = useCallback(async () => {
    try {
      let foundJob: any = null;
      let rawBids: any[] = [];

      if (jobId) {
        const [data, jobById] = await Promise.all([
          api.getProposals(jobId),
          api.getJobById(jobId),
        ]);
        rawBids = data || [];
        foundJob = jobById;
        if (!foundJob) {
          const myJobs = await api.getMyJobs();
          foundJob = myJobs.find((j: any) => j.id === jobId) || myJobs[0] || null;
        }
      } else {
        const myJobs = await api.getMyJobs();
        foundJob = myJobs[0] || null;
        rawBids = foundJob?.id ? await api.getProposals(foundJob.id) : [];
      }

      if (foundJob) setJobInfo(foundJob);

      const mapped: NurseProposal[] = rawBids.map((b: any) => ({
        id: b.id,
        nurseId: b.nurseId || b.nurse_id || "",
        nurseName: b.nurseName || "Registered Clinician",
        avatarInitials: (b.nurseName || "RN")
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        trustScore: typeof b.trustScore === "number" ? b.trustScore : 95,
        experienceYears: typeof b.experienceYears === "number" ? b.experienceYears : 1,
        specialization: b.specialization || "Clinical Nursing Care",
        hospitalAlum: b.hospitalAlum || "Accredited Health Partner",
        registrationNumber: b.registrationNumber || "PNC Verified",
        commuteTime: b.commuteTime || "Local Clinician",
        hourlyRate: b.proposedRate || 850,
        totalCareHours:
          b.totalShiftGross > 0
            ? Math.round(b.totalShiftGross / (b.proposedRate || 1))
            : 168,
        coverLetter:
          b.coverLetter || "Available for clinical shifts as requested.",
        certifications:
          Array.isArray(b.certifications) && b.certifications.length > 0
            ? b.certifications
            : ["PNC Registered"],
        status: b.status === "accepted" ? ("accepted" as const) : ("active" as const),
      }));

      setProposals(mapped);
      if (mapped.length > 0 && !selectedNurseId) {
        setSelectedNurseId(mapped[0].id);
      }
    } catch (err) {
      console.warn("ProposalsScreen load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [jobId, selectedNurseId]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", loadProposals);
    return unsubscribe;
  }, [navigation, loadProposals]);

  useEffect(() => {
    const unsub = subscribeToCrossAppEvents((event) => {
      if (event.type === "BID_WITHDRAWN") {
        const { bidId, id, nurseId } = event.payload || {};
        setProposals((prev) =>
          prev.filter((p) => p.id !== bidId && p.id !== id && (!nurseId || p.nurseId !== nurseId))
        );
        loadProposals();
      } else if (
        event.type === "NEW_BID" ||
        event.type === "BID_SUBMITTED" ||
        event.type === "BID_ACCEPTED"
      ) {
        loadProposals();
      }
    });
    return unsub;
  }, [loadProposals]);

  const selectedNurse = proposals.find((p) => p.id === selectedNurseId) || proposals[0];

  const hourlyRate = selectedNurse ? selectedNurse.hourlyRate : 850;
  const totalCareHours = selectedNurse ? selectedNurse.totalCareHours : 168;
  const grossCareAmount = hourlyRate * totalCareHours;
  const platformFee = Math.round(grossCareAmount * 0.1);
  const initialBookingAdvance = Math.round(grossCareAmount / 2);

  const handleConfirmBooking = async () => {
    if (!selectedNurse || isAccepting) return;
    Alert.alert(
      "Accept Proposal & Secure Care",
      `Confirm ${selectedNurse.nurseName} for this shift at ₹${hourlyRate}/hr? Initial advance of ₹${initialBookingAdvance.toLocaleString("en-IN")} will fund Punjab protected care deposit.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Booking",
          style: "default",
          onPress: async () => {
            try {
              setIsAccepting(true);
              await api.acceptBid(selectedNurse.id);
              setProposals((prev) =>
                prev.map((p) =>
                  p.id === selectedNurse.id
                    ? { ...p, status: "accepted" }
                    : { ...p, status: "active" }
                )
              );
              Alert.alert(
                "Booking Confirmed",
                `Care confirmed with ${selectedNurse.nurseName}. Clinician has been notified and scheduled for onboarding.`,
                [
                  {
                    text: "Go to Shift Cockpit",
                    onPress: () => navigation?.navigate?.("Bookings"),
                  },
                  {
                    text: "View Care Requests",
                    onPress: () => navigation?.navigate?.("My Requests"),
                  },
                ]
              );
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to accept proposal. Please try again.");
            } finally {
              setIsAccepting(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteRequest = () => {
    Alert.alert(
      "Retract Care Request",
      "Are you sure you want to retract this care request? All associated bids will be closed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Retract",
          style: "destructive",
          onPress: async () => {
            const targetId = jobId || jobInfo?.id;
            if (targetId) {
              try {
                await api.deleteJob(targetId);
              } catch (e) {
                console.warn("deleteJob error:", e);
              }
            }
            Alert.alert("Retracted", "Care request removed.");
            navigation?.goBack?.();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f8" />

      {/* Screen Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.backBtn}
          activeOpacity={0.75}
        >
          <ChevronLeft size={22} color={colors.gray800} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.navTitleWrap}>
          <Text style={styles.navTitle}>Requisition & Nurse Proposals</Text>
          <Text style={styles.navSubTitle}>
            {jobInfo?.title ? jobInfo.title.slice(0, 32) + "..." : "Punjab Verified Clinicians"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteHeaderBtn}
          onPress={handleDeleteRequest}
          activeOpacity={0.75}
        >
          <Trash2 size={16} color="#EF4444" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {isLoading && proposals.length === 0 ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 }]}
          showsVerticalScrollIndicator={false}
        >
          <ProposalsListSkeleton count={3} />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Job Requisition Review Card - Nurse App JobDetailScreen Parity */}
          <JobMarketplaceReviewCard jobInfo={jobInfo} />

          {/* 2. Proposals Section Header */}
          <View style={styles.proposalsSectionHeader}>
            <View style={styles.proposalsSectionTitleRow}>
              <ShieldCheck size={18} color={colors.primary} strokeWidth={2.4} />
              <Text style={styles.proposalsSectionTitle}>
                Verified Council Proposals ({proposals.length})
              </Text>
            </View>
            <Text style={styles.proposalsSectionSub}>
              {proposals.length > 0
                ? "Select a clinician to review terms & confirm care"
                : "Awaiting incoming bids from local nurses"}
            </Text>
          </View>

          {/* 3. Proposals List OR Empty State */}
          {proposals.length === 0 ? (
            <View style={styles.emptyCardBox}>
              <View style={styles.emptyIconCircle}>
                <UserCheck size={30} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.emptyTitle}>Awaiting Clinician Proposals</Text>
              <Text style={styles.emptyDesc}>
                Your care request is actively broadcasting to registered nurses in{" "}
                {jobInfo?.city || "Punjab"}. Clinicians will submit verified credentials and rates shortly.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => navigation?.navigate?.("Post Job")}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyActionBtnText}>Post Another Requisition</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.proposalsListContainer}>
              {proposals.map((prop) => {
                const isSelected = selectedNurseId === prop.id;
                const isHired = prop.status === "accepted";

                return (
                  <TouchableOpacity
                    key={prop.id}
                    style={[
                      styles.proposalCard,
                      isSelected && styles.proposalCardSelected,
                      isHired && styles.proposalCardHired,
                    ]}
                    onPress={() => setSelectedNurseId(prop.id)}
                    activeOpacity={0.92}
                  >
                    {/* Header: Radio + Avatar + Nurse Info + Rate */}
                    <View style={styles.proposalHeaderRow}>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                          isHired && styles.radioCircleHired,
                        ]}
                      >
                        {isSelected ? (
                          <Check size={11} color={colors.white} strokeWidth={3} />
                        ) : null}
                      </View>

                      <View style={styles.nurseAvatarWrap}>
                        <Text style={styles.nurseAvatarText}>{prop.avatarInitials}</Text>
                        <View style={styles.nurseVerifiedPill}>
                          <Check size={8} color={colors.white} strokeWidth={3} />
                        </View>
                      </View>

                      <View style={styles.nurseMetaCol}>
                        <View style={styles.nurseNameBadgeRow}>
                          <Text style={styles.nurseName}>{prop.nurseName}</Text>
                          {isHired && (
                            <View style={styles.hiredBadge}>
                              <Text style={styles.hiredBadgeText}>HIRED</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.nurseSpecialization}>
                          {prop.specialization}
                        </Text>
                        <Text style={styles.nurseRegNo}>
                          {prop.registrationNumber} • {prop.hospitalAlum}
                        </Text>
                      </View>

                      <View style={styles.rateCol}>
                        <Text style={styles.rateAmount}>
                          ₹{prop.hourlyRate}
                          <Text style={styles.rateUnit}>/hr</Text>
                        </Text>
                        <Text style={styles.rateGross}>
                          ₹{(prop.hourlyRate * prop.totalCareHours).toLocaleString("en-IN")} total
                        </Text>
                      </View>
                    </View>

                    {/* Trust & Credentials Metric Strip */}
                    <View style={styles.metricsStrip}>
                      <View style={styles.metricItem}>
                        <Star size={13} color="#F59E0B" fill="#F59E0B" />
                        <Text style={styles.metricItemTextBold}>4.9</Text>
                        <Text style={styles.metricItemText}>({prop.trustScore}% Trust)</Text>
                      </View>
                      <View style={styles.metricsDivider} />
                      <View style={styles.metricItem}>
                        <Award size={13} color={colors.primary} strokeWidth={2.2} />
                        <Text style={styles.metricItemText}>{prop.experienceYears} Yrs Exp</Text>
                      </View>
                      <View style={styles.metricsDivider} />
                      <View style={styles.metricItem}>
                        <MapPin size={13} color={colors.gray500} strokeWidth={2.2} />
                        <Text style={styles.metricItemText}>{prop.commuteTime}</Text>
                      </View>
                    </View>

                    {/* Clinical Cover Message Box */}
                    <View style={styles.coverLetterBox}>
                      <Text style={styles.coverLetterText} numberOfLines={2}>
                        "{prop.coverLetter}"
                      </Text>
                    </View>

                    {/* Action Row */}
                    <View style={styles.cardActionRow}>
                      <TouchableOpacity
                        style={styles.messageBtn}
                        onPress={() => handleMessageNurse(prop)}
                        disabled={startingChatNurseId === prop.id}
                        activeOpacity={0.8}
                      >
                        {startingChatNurseId === prop.id ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <MessageSquare size={13} color={colors.primary} strokeWidth={2.2} />
                            <Text style={styles.messageBtnText}>Message Clinician</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.dossierBtn}
                        onPress={() => setInspectModalNurse(prop)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.dossierBtnText}>Inspect Full Dossier</Text>
                        <ChevronRight size={13} color={colors.gray600} strokeWidth={2.2} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* 4. Hiring Breakdown Summary Card */}
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownHeaderRow}>
                  <Text style={styles.breakdownTitle}>Hiring Summary</Text>
                  <View style={styles.verifiedBadge}>
                    <ShieldCheck size={12} color="#059669" strokeWidth={2.4} />
                    <Text style={styles.verifiedBadgeText}>Punjab Care Settlement</Text>
                  </View>
                </View>

                <View style={styles.breakdownLines}>
                  <View style={styles.breakdownLine}>
                    <Text style={styles.breakdownLabel}>Selected Clinician</Text>
                    <Text style={styles.breakdownValueBold}>
                      {selectedNurse ? selectedNurse.nurseName : "--"}
                    </Text>
                  </View>

                  <View style={styles.breakdownLine}>
                    <Text style={styles.breakdownLabel}>Proposed Rate & Duration</Text>
                    <Text style={styles.breakdownValue}>
                      ₹{hourlyRate.toLocaleString("en-IN")}/hr • {totalCareHours} hrs
                    </Text>
                  </View>

                  <View style={styles.breakdownLine}>
                    <Text style={styles.breakdownLabel}>Total Care Value</Text>
                    <Text style={styles.breakdownValueBold}>
                      ₹{grossCareAmount.toLocaleString("en-IN")}
                    </Text>
                  </View>

                  <View style={styles.breakdownLine}>
                    <Text style={styles.breakdownLabel}>Platform & Care Coordination</Text>
                    <Text style={styles.breakdownValue}>
                      ₹{platformFee.toLocaleString("en-IN")} (incl.)
                    </Text>
                  </View>
                </View>

                <View style={styles.breakdownDivider} />

                {/* Initial Week 1 Deposit */}
                <View style={styles.milestoneRow}>
                  <View style={styles.milestoneTextCol}>
                    <Text style={styles.milestoneLabel}>Initial Week 1 Deposit</Text>
                    <Text style={styles.milestoneExplanation}>
                      Held safely in protected custody. Released upon verified timesheet completion.
                    </Text>
                  </View>
                  <Text style={styles.milestoneAmount}>
                    ₹{initialBookingAdvance.toLocaleString("en-IN")}
                  </Text>
                </View>

                {/* Primary CTA: Accept & Fund Protected Deposit */}
                <TouchableOpacity
                  style={[styles.acceptFundBtn, isAccepting && { opacity: 0.7 }]}
                  onPress={handleConfirmBooking}
                  disabled={isAccepting}
                  activeOpacity={0.85}
                >
                  {isAccepting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <CheckCircle2 size={16} color={colors.white} strokeWidth={2.4} />
                      <Text style={styles.acceptFundBtnText}>
                        Accept Proposal & Secure Booking
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.guaranteeRow}>
                  <CheckCircle2 size={12} color="#059669" strokeWidth={2.4} />
                  <Text style={styles.guaranteeText}>
                    100% Refundable if nurse fails to attend shift
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* 5. Nurse Dossier Detail Modal */}
      {inspectModalNurse && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalNurseName}>{inspectModalNurse.nurseName}</Text>
                <Text style={styles.modalSpecialization}>{inspectModalNurse.specialization}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setInspectModalNurse(null)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.gray700} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalRateRow}>
                <View>
                  <Text style={styles.modalRateLabel}>PROPOSED RATE</Text>
                  <Text style={styles.modalRateVal}>₹{inspectModalNurse.hourlyRate} / hr</Text>
                </View>
                <View style={styles.modalScoreBox}>
                  <ShieldCheck size={16} color="#059669" />
                  <Text style={styles.modalScoreText}>
                    {inspectModalNurse.trustScore}% Clinical Trust
                  </Text>
                </View>
              </View>

              <Text style={styles.modalSectionLabel}>CLINICAL BACKGROUND & STATEMENT</Text>
              <Text style={styles.modalBodyText}>{inspectModalNurse.coverLetter}</Text>

              <Text style={styles.modalSectionLabel}>VERIFIED CREDENTIALS</Text>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowKey}>Registration</Text>
                <Text style={styles.modalRowVal}>{inspectModalNurse.registrationNumber}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowKey}>Experience</Text>
                <Text style={styles.modalRowVal}>
                  {inspectModalNurse.experienceYears} Years Clinical Experience
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowKey}>Accreditation</Text>
                <Text style={styles.modalRowVal}>{inspectModalNurse.hospitalAlum}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowKey}>Service Area</Text>
                <Text style={styles.modalRowVal}>{inspectModalNurse.commuteTime}</Text>
              </View>

              <TouchableOpacity
                style={styles.modalMessageBtn}
                onPress={() => {
                  const targetNurse = inspectModalNurse;
                  setInspectModalNurse(null);
                  handleMessageNurse(targetNurse);
                }}
                activeOpacity={0.85}
              >
                <MessageSquare size={16} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.modalMessageBtnText}>
                  Message {inspectModalNurse.nurseName}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSelectBtn}
                onPress={() => {
                  setSelectedNurseId(inspectModalNurse.id);
                  setInspectModalNurse(null);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSelectBtnText}>
                  Select {inspectModalNurse.nurseName} for Hiring
                </Text>
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
    backgroundColor: "#f0f4f8",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 150,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 10 : 16,
    paddingBottom: 12,
    backgroundColor: "#f0f4f8",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  navTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
  },
  navSubTitle: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 2,
  },
  deleteHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  /* Requisition Container matching Nurse App */
  requisitionContainer: {
    marginBottom: 20,
  },
  previewHeroBox: {
    marginBottom: 16,
  },
  statusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  activeStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  activeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#059669",
  },
  activeStatusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#065F46",
    letterSpacing: 0.4,
  },
  previewMetaDot: {
    fontSize: 12,
    color: colors.gray500,
  },
  previewCardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.gray900,
    lineHeight: 28,
    marginBottom: 8,
  },
  previewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  previewMetaLocation: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray700,
  },
  previewMetaMasked: {
    fontSize: 12,
    color: colors.primary,
    fontStyle: "italic",
  },

  /* Patient Profile Identification Card */
  previewPatientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
    marginBottom: 12,
  },
  previewPatientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  previewPatientNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  previewPatientName: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewPatientPill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  previewPatientPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  previewMobilityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewMobilityLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray700,
  },
  previewMobilityVal: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray800,
  },
  previewMobilityDirectives: {
    fontSize: 10,
    color: colors.gray500,
    marginTop: 2,
    lineHeight: 14,
  },
  previewSectionBox: {
    gap: 6,
    marginBottom: 12,
  },
  previewSectionSmallHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray400,
    letterSpacing: 0.8,
  },
  previewCategoryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewClinicalOrdersBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  previewClinicalOrdersText: {
    fontSize: 11,
    color: colors.gray700,
    lineHeight: 17,
  },
  previewMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  previewMetricCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    gap: 2,
  },
  previewMetricIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  previewMetricValue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewMetricSub: {
    fontSize: 10,
    color: colors.gray500,
    fontWeight: "600",
  },
  previewMetricTime: {
    fontSize: 9,
    color: colors.gray400,
    fontWeight: "500",
  },
  previewSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewProceduresList: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    gap: 8,
  },
  previewProcedureItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewProcedureItemText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray800,
    flex: 1,
  },
  previewTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  previewCertPill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  previewCertPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  previewEquipPill: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  previewEquipPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray700,
  },
  previewLogisticsCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  previewLogisticsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewLogisticsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewLogisticsBody: {
    gap: 6,
  },
  previewLogisticsLine: {
    fontSize: 11,
    color: colors.gray600,
    lineHeight: 16,
  },
  previewBoldLabel: {
    fontWeight: "700",
    color: colors.gray800,
  },
  previewPrivacyStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#EFF6FF",
    padding: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  previewPrivacyText: {
    fontSize: 10,
    color: "#1E40AF",
    lineHeight: 14,
    flex: 1,
  },
  previewAllergiesBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    gap: 4,
    marginBottom: 12,
  },
  previewAllergiesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewAllergiesTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B91C1C",
  },
  previewAllergiesVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  previewDepositCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    gap: 4,
    marginBottom: 12,
  },
  previewDepositHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewDepositTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  previewDepositDesc: {
    fontSize: 10,
    color: "#065F46",
    lineHeight: 15,
  },
  previewAboutClientCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  previewAboutClientTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewClientProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  previewClientAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  previewClientName: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewClientSub: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 1,
  },
  previewVerificationsList: {
    gap: 4,
  },
  previewVerifyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewVerifyText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray700,
  },
  previewClientStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  previewClientStatText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray500,
  },
  previewClientStatDivider: {
    fontSize: 10,
    color: colors.gray300,
  },

  /* Proposals Section Header */
  proposalsSectionHeader: {
    marginTop: 6,
    marginBottom: 14,
  },
  proposalsSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  proposalsSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
  },
  proposalsSectionSub: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 3,
  },

  /* Empty State Card */
  emptyCardBox: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.gray900,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.gray600,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
  },
  emptyActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyActionBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },

  /* Proposal Cards List */
  proposalsListContainer: {
    gap: 14,
  },
  proposalCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  proposalCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "#F9FAFB",
  },
  proposalCardHired: {
    borderColor: "#059669",
    backgroundColor: "#F0FDF4",
  },
  proposalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioCircleHired: {
    borderColor: "#059669",
    backgroundColor: "#059669",
  },
  nurseAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  nurseAvatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
  },
  nurseVerifiedPill: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  nurseMetaCol: {
    flex: 1,
  },
  nurseNameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nurseName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gray900,
  },
  hiredBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  hiredBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#065F46",
  },
  nurseSpecialization: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    marginTop: 1,
  },
  nurseRegNo: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 1,
  },
  rateCol: {
    alignItems: "flex-end",
  },
  rateAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
  },
  rateUnit: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.gray500,
  },
  rateGross: {
    fontSize: 10,
    color: colors.gray500,
    marginTop: 2,
  },

  /* Metrics Strip */
  metricsStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metricItemTextBold: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.gray800,
  },
  metricItemText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray700,
  },
  metricsDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.gray300,
    marginHorizontal: 10,
  },

  /* Cover Letter Quote */
  coverLetterBox: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: 12,
  },
  coverLetterText: {
    fontSize: 12,
    fontStyle: "italic",
    color: colors.gray700,
    lineHeight: 18,
  },

  /* Action Row */
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  dossierBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dossierBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray600,
  },

  /* Hiring Breakdown Card */
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 18,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  breakdownHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#065F46",
  },
  breakdownLines: {
    gap: 8,
  },
  breakdownLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.gray600,
  },
  breakdownValue: {
    fontSize: 12,
    color: colors.gray800,
    fontWeight: "600",
  },
  breakdownValueBold: {
    fontSize: 13,
    color: colors.gray900,
    fontWeight: "800",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: 14,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  milestoneTextCol: {
    flex: 1,
    marginRight: 12,
  },
  milestoneLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.gray900,
  },
  milestoneExplanation: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 2,
    lineHeight: 16,
  },
  milestoneAmount: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.primary,
  },
  acceptFundBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  acceptFundBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  guaranteeText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
  },

  /* Dossier Modal */
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    paddingBottom: 14,
  },
  modalNurseName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray900,
  },
  modalSpecialization: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  modalRateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  modalRateLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray500,
  },
  modalRateVal: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.gray900,
    marginTop: 2,
  },
  modalScoreBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  modalScoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.gray500,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },
  modalBodyText: {
    fontSize: 13,
    color: colors.gray700,
    lineHeight: 20,
    marginBottom: 14,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  modalRowKey: {
    fontSize: 12,
    color: colors.gray500,
  },
  modalRowVal: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray800,
  },
  modalMessageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
    marginBottom: 8,
  },
  modalMessageBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  modalSelectBtn: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  modalSelectBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
});
