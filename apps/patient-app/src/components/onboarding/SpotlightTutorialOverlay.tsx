// ═══════════════════════════════════════════════════════════════════════════════
// SpotlightTutorialOverlay — Elite Clean Enterprise Patient Guide Tour
// Honest, factual walkthrough with rich preview cards, step pill indicators,
// and zero-glitch responsive layout. Complies with Clean Enterprise UX standards.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  PlusCircle,
  FileText,
  Activity,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react-native";
import { setTabBarVisible } from "../../lib/tabBarState";

interface SpotlightTutorialOverlayProps {
  visible: boolean;
  onComplete: () => void;
  onDismiss: () => void;
  patientName?: string;
}

interface StepConfig {
  stepNumber: number;
  totalSteps: number;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  title: string;
  description: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  previewTitle: string;
  previewMeta: string;
  previewTags: string[];
  tipText: string;
}

const PATIENT_STEPS: StepConfig[] = [
  {
    stepNumber: 1,
    totalSteps: 4,
    badge: "STEP 1 OF 4 • POST CARE",
    badgeBg: "#EFF6FF",
    badgeColor: "#2563EB",
    title: "Post a Care Requisition",
    description:
      "Describe what care your loved one requires, shift timing, and your city in Punjab. Your request is immediately broadcast to nearby accredited nurses on Shift Radar.",
    icon: PlusCircle,
    iconBg: "#EFF6FF",
    iconColor: "#2563EB",
    previewTitle: "Post-Operative Cardiac & Wound Care",
    previewMeta: "Model Town, Ludhiana • 12 hr night shift",
    previewTags: ["PNC Verified Only", "Tracheostomy", "Flexible Rates"],
    tipText: "Clear clinical details help you match with specialized hospital-experienced nurses.",
  },
  {
    stepNumber: 2,
    totalSteps: 4,
    badge: "STEP 2 OF 4 • CLINICIAN BIDS",
    badgeBg: "#ECFDF5",
    badgeColor: "#059669",
    title: "Review Verified Proposals",
    description:
      "Compare bids from verified clinicians. Review years of ICU experience, Punjab Nursing Council registration numbers, patient ratings, and proposed hourly rates.",
    icon: FileText,
    iconBg: "#ECFDF5",
    iconColor: "#059669",
    previewTitle: "Clinician Proposals & Credentials",
    previewMeta: "3 Verified ICU nurses available",
    previewTags: ["5.0 ★ Rating", "7 Yrs Critical Care", "PNC Accredited"],
    tipText: "You can message any clinician directly before confirming the booking.",
  },
  {
    stepNumber: 3,
    totalSteps: 4,
    badge: "STEP 3 OF 4 • PROTECTED DEPOSIT",
    badgeBg: "#F3E8FF",
    badgeColor: "#7C3AED",
    title: "Protected Care Deposit",
    description:
      "Your payments are protected. Shift funds are held safely in escrow and only released once your nurse successfully checks in and delivers care.",
    icon: ShieldCheck,
    iconBg: "#F3E8FF",
    iconColor: "#7C3AED",
    previewTitle: "Punjab Nursing Council Protected Escrow",
    previewMeta: "100% Secure & Refundable upon cancellation",
    previewTags: ["Milestone Security", "Zero Advance Risk", "Instant Release"],
    tipText: "Your deposit is held securely until each shift milestone is completed.",
  },
  {
    stepNumber: 4,
    totalSteps: 4,
    badge: "STEP 4 OF 4 • BEDSIDE VITALS",
    badgeBg: "#E0F2FE",
    badgeColor: "#0284C7",
    title: "Live Bedside Telemetry",
    description:
      "Track your loved one's vital signs in real time. Whenever the nurse records blood pressure, pulse, SpO₂, or sugar levels, you receive instant updates.",
    icon: Activity,
    iconBg: "#E0F2FE",
    iconColor: "#0284C7",
    previewTitle: "Real-Time Patient Vitals",
    previewMeta: "Live Bedside Telemetry Stream",
    previewTags: ["BP 120/80", "SpO₂ 98%", "Pulse 72 bpm", "Notes logged"],
    tipText: "Attending family members can review recorded vital trend history anytime.",
  },
];

export const SpotlightTutorialOverlay: React.FC<SpotlightTutorialOverlayProps> = ({
  visible,
  onComplete,
  onDismiss,
  patientName = "Family Member",
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (visible) {
      setTabBarVisible(false);
    } else {
      setTabBarVisible(true);
    }
    return () => {
      setTabBarVisible(true);
    };
  }, [visible]);

  if (!visible) return null;

  const currentStep = PATIENT_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === PATIENT_STEPS.length - 1;
  const isFirstStep = currentStepIndex === 0;
  const StepIcon = currentStep.icon;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onDismiss}
          activeOpacity={1}
        />

        <View style={styles.cardContainer}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View
              style={[
                styles.badgePill,
                { backgroundColor: currentStep.badgeBg, borderColor: currentStep.iconBg },
              ]}
            >
              <Text style={[styles.badgeText, { color: currentStep.badgeColor }]}>
                {currentStep.badge}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onDismiss}
              style={styles.closeBtn}
              activeOpacity={0.7}
              accessibilityLabel="Close Walkthrough"
            >
              <X size={18} color="#64748B" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {/* Feature Showcase Box */}
          <View style={styles.showcaseBox}>
            <View style={styles.showcaseTop}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: currentStep.iconBg },
                ]}
              >
                <StepIcon size={24} color={currentStep.iconColor} strokeWidth={2.2} />
              </View>
              <View style={styles.showcaseTitles}>
                <Text style={styles.showcaseTitleText}>{currentStep.previewTitle}</Text>
                <Text style={styles.showcaseMetaText}>{currentStep.previewMeta}</Text>
              </View>
            </View>

            {/* Tags preview row */}
            <View style={styles.tagsRow}>
              {currentStep.previewTags.map((tag, i) => (
                <View key={i} style={styles.previewTagPill}>
                  <Text style={styles.previewTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Main Content */}
          <Text style={styles.stepTitle}>{currentStep.title}</Text>
          <Text style={styles.stepDescription}>{currentStep.description}</Text>

          {/* Pro Tip Micro-Banner */}
          <View style={styles.tipBanner}>
            <CheckCircle2 size={14} color="#059669" strokeWidth={2.2} />
            <Text style={styles.tipText}>{currentStep.tipText}</Text>
          </View>

          {/* Progress Segmented Bar */}
          <View style={styles.progressRow}>
            {PATIENT_STEPS.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.progressSegment,
                  idx <= currentStepIndex && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>

          {/* Bottom Action Controls */}
          <View style={styles.actionRow}>
            {isFirstStep ? (
              <TouchableOpacity
                onPress={onDismiss}
                style={styles.skipBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.skipBtnText}>Skip Tour</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <ArrowLeft size={15} color="#475569" strokeWidth={2.2} />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleNext}
              style={styles.nextBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>
                {isLastStep ? "Find a Nurse" : "Next Step"}
              </Text>
              {isLastStep ? (
                <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
              ) : (
                <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.62)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  cardContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 22,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  showcaseBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    padding: 14,
    marginBottom: 16,
  },
  showcaseTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  showcaseTitles: {
    flex: 1,
  },
  showcaseTitleText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  showcaseMetaText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  previewTagPill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  previewTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 14,
  },
  tipBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    color: "#065F46",
    lineHeight: 15,
    fontWeight: "500",
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 18,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
  },
  progressSegmentActive: {
    backgroundColor: "#2563EB",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
