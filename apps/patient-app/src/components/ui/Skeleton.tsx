import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, DimensionValue, StyleProp, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

// ─── 1. Dashboard Screen Skeleton (1:1 Exact Match with Dashboard Cards) ───────
export const DashboardSkeleton: React.FC = () => {
  return (
    <View style={styles.dashboardContainer}>
      {/* Heading Row */}
      <View style={styles.dashHeadingRow}>
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="60%" height={26} borderRadius={8} />
          <Skeleton width="85%" height={13} borderRadius={6} />
        </View>
        <View style={styles.filterPillDummy}>
          <Skeleton width={50} height={13} borderRadius={6} />
          <Skeleton width={13} height={13} borderRadius={4} />
        </View>
      </View>

      {/* Notification Banner */}
      <View style={styles.dashNotifCard}>
        <Skeleton width={32} height={32} borderRadius={16} />
        <View style={{ flex: 1, gap: 4 }}>
          <Skeleton width="90%" height={12} borderRadius={6} />
        </View>
        <Skeleton width={68} height={26} borderRadius={12} />
      </View>

      {/* 2x2 Stat Cards Grid */}
      <View style={styles.statGrid}>
        {/* Row 1 */}
        <View style={styles.gridRow}>
          {/* Card 1: White Card */}
          <View style={[styles.statCard, styles.whiteCard]}>
            <View style={styles.statCardHeader}>
              <View style={styles.iconChipWhite}>
                <Skeleton width={20} height={20} borderRadius={6} />
              </View>
              <Skeleton width={36} height={36} borderRadius={18} />
            </View>
            <View style={{ marginTop: 14, gap: 6 }}>
              <Skeleton width="65%" height={14} borderRadius={5} />
              <Skeleton width="85%" height={26} borderRadius={6} />
            </View>
          </View>

          {/* Card 2: Tinted Blue Card */}
          <View style={[styles.statCard, styles.tintedBlueCard]}>
            <View style={styles.statCardHeader}>
              <View style={styles.iconChipBlue}>
                <Skeleton width={20} height={20} borderRadius={6} />
              </View>
              <Skeleton width={36} height={36} borderRadius={18} />
            </View>
            <View style={{ marginTop: 14, gap: 6 }}>
              <Skeleton width="65%" height={14} borderRadius={5} />
              <Skeleton width="85%" height={26} borderRadius={6} />
            </View>
          </View>
        </View>

        {/* Row 2 */}
        <View style={styles.gridRow}>
          {/* Card 3: White Card */}
          <View style={[styles.statCard, styles.whiteCard]}>
            <View style={styles.statCardHeader}>
              <View style={styles.iconChipWhite}>
                <Skeleton width={20} height={20} borderRadius={6} />
              </View>
              <Skeleton width={36} height={36} borderRadius={18} />
            </View>
            <View style={{ marginTop: 14, gap: 6 }}>
              <Skeleton width="65%" height={14} borderRadius={5} />
              <Skeleton width="85%" height={26} borderRadius={6} />
            </View>
          </View>

          {/* Card 4: White Card */}
          <View style={[styles.statCard, styles.whiteCard]}>
            <View style={styles.statCardHeader}>
              <View style={styles.iconChipWhite}>
                <Skeleton width={20} height={20} borderRadius={6} />
              </View>
              <Skeleton width={36} height={36} borderRadius={18} />
            </View>
            <View style={{ marginTop: 14, gap: 6 }}>
              <Skeleton width="65%" height={14} borderRadius={5} />
              <Skeleton width="85%" height={26} borderRadius={6} />
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions Row */}
      <View style={{ marginBottom: 14 }}>
        <Skeleton width="35%" height={16} borderRadius={6} style={{ marginBottom: 12 }} />
        <View style={styles.quickActionsRow}>
          {/* Action 1: Active Blue */}
          <View style={[styles.actionBtn, styles.actionBtnActiveDummy]}>
            <View style={styles.actionIconWrap}>
              <Skeleton width={20} height={20} borderRadius={10} style={{ backgroundColor: "rgba(255,255,255,0.6)" }} />
            </View>
            <Skeleton width={50} height={10} borderRadius={5} style={{ marginTop: 4, backgroundColor: "rgba(255,255,255,0.6)" }} />
          </View>

          {/* Action 2, 3, 4: Soft White Cards */}
          {[1, 2, 3].map((idx) => (
            <View key={idx} style={styles.actionBtn}>
              <View style={styles.actionIconWrap}>
                <Skeleton width={18} height={18} borderRadius={9} />
              </View>
              <Skeleton width={52} height={10} borderRadius={5} style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>
      </View>

      {/* Recovery Vitals Bento Card */}
      <View style={styles.cleanHealthCard}>
        {/* Header Row */}
        <View style={styles.cleanHealthHeader}>
          <View style={styles.cleanHealthHeaderLeft}>
            <View style={styles.cleanHealthIconWrap}>
              <Skeleton width={18} height={18} borderRadius={6} />
            </View>
            <View style={{ gap: 4 }}>
              <Skeleton width={110} height={15} borderRadius={6} />
              <Skeleton width={160} height={11} borderRadius={5} />
            </View>
          </View>
          <Skeleton width={70} height={24} borderRadius={12} />
        </View>

        {/* 4 Bento Vitals Tiles */}
        <View style={styles.cleanVitalsGrid}>
          {[1, 2, 3, 4].map((idx) => (
            <View key={idx} style={styles.cleanVitalTile}>
              <Skeleton width="60%" height={12} borderRadius={5} />
              <View style={{ gap: 4, marginVertical: 6 }}>
                <Skeleton width="75%" height={26} borderRadius={6} />
              </View>
              <Skeleton width="50%" height={18} borderRadius={6} />
            </View>
          ))}
        </View>

        {/* Footer Row */}
        <View style={styles.cleanDossierLinkRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Skeleton width={14} height={14} borderRadius={7} />
            <Skeleton width={170} height={11} borderRadius={5} />
          </View>
          <Skeleton width={75} height={12} borderRadius={6} />
        </View>
      </View>

      {/* Recent Care Postings Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Skeleton width="45%" height={16} borderRadius={6} />
        <Skeleton width="20%" height={14} borderRadius={6} />
      </View>

      {/* 2 Recent Posting Row Cards */}
      {[1, 2].map((idx) => (
        <View key={idx} style={styles.recentRowCard}>
          <View style={styles.recentRowLeft}>
            <View style={styles.recentIconChip}>
              <Skeleton width={20} height={20} borderRadius={6} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width="70%" height={14} borderRadius={6} />
              <Skeleton width={75} height={16} borderRadius={6} />
              <Skeleton width="85%" height={11} borderRadius={5} />
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Skeleton width={55} height={16} borderRadius={6} />
            <Skeleton width={40} height={10} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
};

// ─── 2. Care Requests Skeleton (Exact Match with MyJobsScreen Cards) ──────────
export const JobsListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View style={styles.jobsContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.neuJobCard}>
          {/* Category Chip & Proposals Badge */}
          <View style={styles.neuJobHeaderRow}>
            <Skeleton width={80} height={20} borderRadius={8} />
            <Skeleton width={90} height={20} borderRadius={8} />
          </View>

          {/* Title */}
          <Skeleton width="80%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />

          {/* Description snippet */}
          <Skeleton width="95%" height={11} borderRadius={5} style={{ marginBottom: 4 }} />
          <Skeleton width="65%" height={11} borderRadius={5} style={{ marginBottom: 10 }} />

          {/* Meta row: Patient, Locality, Shift */}
          <View style={styles.metaRow}>
            <Skeleton width={70} height={12} borderRadius={6} />
            <View style={styles.metaDot} />
            <Skeleton width={90} height={12} borderRadius={6} />
            <View style={styles.metaDot} />
            <Skeleton width={65} height={12} borderRadius={6} />
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Footer: Budget on left, Review bids on right */}
          <View style={styles.cardFooterRow}>
            <View style={{ gap: 2 }}>
              <Skeleton width={85} height={18} borderRadius={6} />
              <Skeleton width={60} height={10} borderRadius={4} />
            </View>
            <Skeleton width={105} height={32} borderRadius={16} />
          </View>
        </View>
      ))}
    </View>
  );
};

// ─── 3. Bookings & Shifts Skeleton (Exact Match with BookingsScreen) ──────────
export const BookingSkeleton: React.FC = () => {
  return (
    <View style={styles.jobsContainer}>
      {/* Hero Active Booking Card */}
      <View style={styles.heroCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Skeleton width={120} height={22} borderRadius={11} />
          <Skeleton width={90} height={12} borderRadius={6} />
        </View>
        <Skeleton width="70%" height={18} borderRadius={6} style={{ marginBottom: 4 }} />
        <Skeleton width="50%" height={12} borderRadius={5} style={{ marginBottom: 14 }} />

        {/* Nurse Strip */}
        <View style={styles.nurseStrip}>
          <Skeleton width={42} height={42} borderRadius={21} />
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton width={120} height={14} borderRadius={6} />
            <Skeleton width={160} height={11} borderRadius={5} />
          </View>
          <Skeleton width={75} height={30} borderRadius={15} />
        </View>
      </View>

      {/* 2-Column Financial Stat Cards */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <View style={[styles.statCard, styles.whiteCard]}>
          <View style={styles.statCardHeader}>
            <View style={styles.iconChipBlue}>
              <Skeleton width={18} height={18} borderRadius={6} />
            </View>
            <Skeleton width={36} height={36} borderRadius={18} />
          </View>
          <Skeleton width="60%" height={10} borderRadius={4} style={{ marginTop: 12 }} />
          <Skeleton width="80%" height={18} borderRadius={6} style={{ marginTop: 6 }} />
          <Skeleton width="90%" height={10} borderRadius={4} style={{ marginTop: 6 }} />
        </View>

        <View style={[styles.statCard, styles.whiteCard]}>
          <View style={styles.statCardHeader}>
            <View style={styles.iconChipEmerald}>
              <Skeleton width={18} height={18} borderRadius={6} />
            </View>
            <Skeleton width={36} height={36} borderRadius={18} />
          </View>
          <Skeleton width="60%" height={10} borderRadius={4} style={{ marginTop: 12 }} />
          <Skeleton width="80%" height={18} borderRadius={6} style={{ marginTop: 6 }} />
          <Skeleton width="90%" height={10} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
      </View>

      {/* Milestone Progress Card */}
      <View style={styles.progressCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Skeleton width={130} height={14} borderRadius={6} />
          <Skeleton width={40} height={14} borderRadius={6} />
        </View>
        <Skeleton width="100%" height={7} borderRadius={3.5} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <Skeleton width={14} height={14} borderRadius={7} />
          <Skeleton width="90%" height={11} borderRadius={5} />
        </View>
      </View>

      {/* Shifts Section Header */}
      <Skeleton width="40%" height={16} borderRadius={6} style={{ marginVertical: 12 }} />

      {/* Shift Milestone Row Cards */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.shiftCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Skeleton width={38} height={38} borderRadius={12} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={100} height={14} borderRadius={6} />
              <Skeleton width={140} height={11} borderRadius={5} />
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Skeleton width={65} height={15} borderRadius={6} />
            <Skeleton width={80} height={20} borderRadius={10} />
          </View>
        </View>
      ))}
    </View>
  );
};

// ─── 4. Nurse Proposals Skeleton (Exact Match with ProposalsScreen) ───────────
// ─── 4. Nurse Proposals Skeleton (Exact Match with ProposalsScreen) ───────────
export const ProposalsListSkeleton: React.FC<{ count?: number }> = ({ count = 2 }) => {
  return (
    <View style={styles.jobsContainer}>
      {/* Requisition Review Card - Full Marketplace Preview Blueprint */}
      <View style={styles.previewCardContainer}>
        {/* Top Header Card Strip */}
        <View style={styles.previewCardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Skeleton width={32} height={32} borderRadius={10} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={180} height={14} borderRadius={6} />
              <Skeleton width={130} height={10} borderRadius={4} />
            </View>
          </View>
          <Skeleton width={110} height={20} borderRadius={10} />
        </View>

        <View style={styles.previewCardBody}>
          {/* Job Title & Location Line */}
          <View style={{ gap: 6, marginBottom: 12 }}>
            <Skeleton width="85%" height={22} borderRadius={8} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Skeleton width={70} height={12} borderRadius={6} />
              <View style={styles.metaDot} />
              <Skeleton width={120} height={12} borderRadius={6} />
              <View style={styles.metaDot} />
              <Skeleton width={100} height={11} borderRadius={5} />
            </View>
          </View>

          {/* Patient Profile Identification Card */}
          <View style={styles.patientPreviewBox}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={{ flex: 1, gap: 5 }}>
              <Skeleton width={130} height={16} borderRadius={6} />
              <Skeleton width={160} height={12} borderRadius={6} />
              <Skeleton width={110} height={11} borderRadius={4} />
            </View>
          </View>

          {/* Summary & Care Directives */}
          <View style={styles.directivesBox}>
            <Skeleton width={140} height={10} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="90%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
            <Skeleton width="75%" height={12} borderRadius={4} />
          </View>

          {/* 4 Metric Badges Grid (2x2) */}
          <View style={styles.metricTilesGrid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.metricTile}>
                <Skeleton width={26} height={26} borderRadius={13} style={{ marginBottom: 6 }} />
                <Skeleton width="70%" height={14} borderRadius={6} />
                <Skeleton width="50%" height={10} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
            ))}
          </View>

          {/* Skill Tag Pills */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <Skeleton width={90} height={24} borderRadius={8} />
            <Skeleton width={110} height={24} borderRadius={8} />
            <Skeleton width={80} height={24} borderRadius={8} />
          </View>

          {/* Protected Care Deposit Banner */}
          <View style={styles.depositGuaranteeBox}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Skeleton width={16} height={16} borderRadius={8} />
              <Skeleton width={160} height={13} borderRadius={6} />
            </View>
            <Skeleton width="95%" height={10} borderRadius={4} />
          </View>
        </View>
      </View>

      {/* Verified Proposals Section Title */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 12 }}>
        <Skeleton width="55%" height={16} borderRadius={6} />
        <Skeleton width="30%" height={12} borderRadius={4} />
      </View>

      {/* Proposal Cards */}
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.neuProposalCard}>
          {/* Top row: Radio + Avatar + Info + Rate */}
          <View style={styles.nurseHeaderRow}>
            <Skeleton width={20} height={20} borderRadius={10} />
            <Skeleton width={38} height={38} borderRadius={19} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={120} height={15} borderRadius={6} />
              <Skeleton width={150} height={11} borderRadius={5} />
            </View>
            <View style={{ alignItems: "flex-end", gap: 3 }}>
              <Skeleton width={60} height={16} borderRadius={6} />
              <Skeleton width={50} height={10} borderRadius={4} />
            </View>
          </View>

          {/* Credentials / Metrics Row */}
          <View style={styles.metricsRow}>
            <Skeleton width={75} height={11} borderRadius={5} />
            <View style={styles.metricsDivider} />
            <Skeleton width={70} height={11} borderRadius={5} />
            <View style={styles.metricsDivider} />
            <Skeleton width={65} height={11} borderRadius={5} />
          </View>

          {/* Clinical statement snippet */}
          <Skeleton width="92%" height={12} borderRadius={6} style={{ marginVertical: 8 }} />

          {/* Action Bar */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(226, 232, 240, 0.7)" }}>
            <Skeleton width={110} height={28} borderRadius={8} />
            <Skeleton width={90} height={22} borderRadius={6} />
          </View>
        </View>
      ))}

      {/* Hiring Summary Card Skeleton at bottom */}
      <View style={styles.neuProposalCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
          <Skeleton width={110} height={15} borderRadius={6} />
          <Skeleton width={120} height={18} borderRadius={9} />
        </View>
        <View style={{ gap: 8, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Skeleton width={90} height={12} borderRadius={4} />
            <Skeleton width={100} height={12} borderRadius={4} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Skeleton width={110} height={12} borderRadius={4} />
            <Skeleton width={80} height={12} borderRadius={4} />
          </View>
        </View>
        <Skeleton width="100%" height={44} borderRadius={14} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
};

// ─── 5. Messages List Skeleton (Exact Match with MessagesScreen) ──────────────
export const MessagesListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <View style={styles.jobsContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.chatItemCard}>
          <Skeleton width={46} height={46} borderRadius={23} />
          <View style={{ flex: 1, gap: 5 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Skeleton width={130} height={15} borderRadius={6} />
              <Skeleton width={45} height={11} borderRadius={4} />
            </View>
            <Skeleton width={90} height={12} borderRadius={6} />
            <Skeleton width="80%" height={12} borderRadius={6} />
          </View>
        </View>
      ))}
    </View>
  );
};

// ─── 6. Escrow Screen Skeleton (Exact Match with EscrowScreen) ────────────────
export const EscrowSkeleton: React.FC = () => {
  return (
    <View style={styles.jobsContainer}>
      {/* Protected Deposit Hero Card */}
      <View style={styles.escrowHeroCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Skeleton width={140} height={13} borderRadius={6} />
          <Skeleton width={90} height={20} borderRadius={10} />
        </View>
        <Skeleton width="55%" height={32} borderRadius={8} style={{ marginVertical: 6 }} />
        <Skeleton width="80%" height={13} borderRadius={6} />
      </View>

      <Skeleton width="45%" height={16} borderRadius={6} style={{ marginVertical: 14 }} />

      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.escrowMilestoneCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Skeleton width={36} height={36} borderRadius={12} />
              <View style={{ gap: 4 }}>
                <Skeleton width={120} height={14} borderRadius={6} />
                <Skeleton width={80} height={11} borderRadius={5} />
              </View>
            </View>
            <Skeleton width={75} height={22} borderRadius={11} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
            <Skeleton width={70} height={15} borderRadius={6} />
            <Skeleton width={85} height={28} borderRadius={14} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: "#E2E8F0",
  },
  dashboardContainer: {
    gap: 0,
  },
  jobsContainer: {
    gap: 12,
  },
  dashHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  filterPillDummy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dashNotifCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 12,
    marginBottom: 16,
    gap: 10,
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
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 8,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  actionBtnActiveDummy: {
    backgroundColor: "#2E5BFF",
    borderColor: "#2E5BFF",
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.neuInset,
    alignItems: "center",
    justifyContent: "center",
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
  },
  cleanHealthIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  cleanVitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  cleanVitalTile: {
    width: "48%",
    minHeight: 128,
    backgroundColor: colors.neuInset,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    borderRadius: 16,
    padding: 12,
    justifyContent: "space-between",
  },
  cleanDossierLinkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(226, 234, 245, 0.7)",
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
    marginBottom: 12,
  },
  recentRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  recentIconChip: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  neuJobCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 12,
  },
  neuJobHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.gray300,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(226, 232, 240, 0.7)",
    marginBottom: 12,
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 14,
  },
  nurseStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  progressCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 14,
  },
  shiftCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 10,
  },
  neuReqCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 14,
  },
  neuProposalCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 12,
  },
  nurseHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 8,
  },
  metricsDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#E2E8F0",
  },
  chatItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
    marginBottom: 10,
  },
  escrowHeroCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 14,
  },
  escrowMilestoneCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  previewCardContainer: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  previewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  previewCardBody: {
    padding: 16,
    gap: 12,
  },
  patientPreviewBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  directivesBox: {
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metricTilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricTile: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  depositGuaranteeBox: {
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginTop: 4,
  },
});
