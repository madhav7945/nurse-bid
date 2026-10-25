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

// ─── 1. Dashboard Screen Skeleton (1:1 Exact Match with Nurse Dashboard Cards) ──
export const DashboardSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Eyebrow & Hero Header */}
      <View style={styles.heroRow}>
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="65%" height={24} borderRadius={8} />
          <Skeleton width="40%" height={14} borderRadius={6} />
        </View>
        <Skeleton width={84} height={32} borderRadius={20} />
      </View>

      {/* Notification Update Banner Skeleton */}
      <View style={styles.notificationBannerSkeleton}>
        <Skeleton width={36} height={36} borderRadius={12} />
        <View style={{ flex: 1, gap: 5 }}>
          <Skeleton width="75%" height={13} borderRadius={5} />
          <Skeleton width="45%" height={11} borderRadius={4} />
        </View>
        <Skeleton width={68} height={26} borderRadius={12} />
      </View>

      {/* 2x2 Stat Cards Grid (Exact matching statGrid & minHeight: 132) */}
      <View style={styles.grid2x2}>
        <View style={styles.gridRow}>
          {/* Card 1: Active Patients */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Skeleton width={32} height={32} borderRadius={12} />
              <Skeleton width={32} height={32} borderRadius={16} />
            </View>
            <View style={{ marginTop: 10 }}>
              <Skeleton width="60%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
              <Skeleton width="75%" height={22} borderRadius={6} />
            </View>
          </View>

          {/* Card 2: Pending Earnings (Tinted Blue) */}
          <View style={[styles.statCard, { backgroundColor: "#EAF0FF", borderColor: "rgba(214, 228, 255, 0.9)" }]}>
            <View style={styles.statHeader}>
              <Skeleton width={32} height={32} borderRadius={12} />
              <Skeleton width={32} height={32} borderRadius={16} />
            </View>
            <View style={{ marginTop: 10 }}>
              <Skeleton width="60%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
              <Skeleton width="75%" height={22} borderRadius={6} />
            </View>
          </View>
        </View>

        <View style={styles.gridRow}>
          {/* Card 3: Match Rate */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Skeleton width={32} height={32} borderRadius={12} />
              <Skeleton width={32} height={32} borderRadius={16} />
            </View>
            <View style={{ marginTop: 10 }}>
              <Skeleton width="60%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
              <Skeleton width="75%" height={22} borderRadius={6} />
            </View>
          </View>

          {/* Card 4: Trust Score */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Skeleton width={32} height={32} borderRadius={12} />
              <Skeleton width={32} height={32} borderRadius={16} />
            </View>
            <View style={{ marginTop: 10 }}>
              <Skeleton width="60%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
              <Skeleton width="75%" height={22} borderRadius={6} />
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions Row Skeleton */}
      <View style={{ marginBottom: 20 }}>
        <Skeleton width={100} height={16} borderRadius={6} style={{ marginBottom: 12 }} />
        <View style={styles.quickActionsSkeletonRow}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.actionBtnSkeleton, i === 1 && { backgroundColor: colors.white }]}>
              <Skeleton width={22} height={22} borderRadius={8} />
              <Skeleton width={38} height={11} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>

      {/* Activity Metrics Strip Skeleton */}
      <View style={styles.activityStripSkeleton}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: 5 }}>
            <Skeleton width={32} height={18} borderRadius={5} />
            <Skeleton width={52} height={10} borderRadius={4} />
          </View>
        ))}
      </View>

      {/* Real 1:1 CleanHealth Bento Vitals Card Skeleton (Height ~380px matching real card) */}
      <View style={styles.activeShiftCard}>
        {/* Card Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Skeleton width={36} height={36} borderRadius={12} />
            <View style={{ gap: 4 }}>
              <Skeleton width={90} height={15} borderRadius={5} />
              <Skeleton width={140} height={12} borderRadius={4} />
            </View>
          </View>
          <Skeleton width={72} height={24} borderRadius={12} />
        </View>

        {/* 2x2 Bento Vitals Tiles Grid (minHeight: 142 each) */}
        <View style={styles.cleanVitalsGridSkeleton}>
          {["Heart Rate", "Blood Pressure", "Oxygen (SpO2)", "Blood Sugar"].map((_, idx) => (
            <View key={idx} style={styles.cleanVitalTileSkeleton}>
              <Skeleton width="65%" height={12} borderRadius={4} />
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                <Skeleton width="55%" height={22} borderRadius={5} />
                <Skeleton width={24} height={12} borderRadius={3} />
              </View>
              <Skeleton width={52} height={16} borderRadius={6} />
            </View>
          ))}
        </View>

        {/* Card Footer Link Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.04)" }}>
          <Skeleton width={80} height={13} borderRadius={4} />
          <Skeleton width={120} height={15} borderRadius={5} />
        </View>
      </View>

      {/* Open Shift Radar Preview Skeleton */}
      <View style={{ marginTop: 4, marginBottom: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Skeleton width={130} height={18} borderRadius={6} />
          <Skeleton width={55} height={14} borderRadius={5} />
        </View>
        {[1, 2].map((i) => (
          <View key={i} style={styles.radarJobCardSkeleton}>
            {/* Top Tag Group: Urgency & Care Type */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Skeleton width={70} height={22} borderRadius={11} />
                <Skeleton width={110} height={22} borderRadius={11} />
              </View>
              <Skeleton width={115} height={22} borderRadius={11} />
            </View>

            {/* Job Title & Patient Subtitle */}
            <Skeleton width="80%" height={18} borderRadius={6} style={{ marginBottom: 6 }} />
            <Skeleton width="55%" height={13} borderRadius={5} style={{ marginBottom: 10 }} />

            {/* Job Description Snippet (2 lines) */}
            <Skeleton width="100%" height={13} borderRadius={4} style={{ marginBottom: 4 }} />
            <Skeleton width="75%" height={13} borderRadius={4} style={{ marginBottom: 12 }} />

            {/* Meta Row: Location & Duration */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Skeleton width={12} height={12} borderRadius={6} />
                <Skeleton width={120} height={12} borderRadius={4} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Skeleton width={12} height={12} borderRadius={6} />
                <Skeleton width={100} height={12} borderRadius={4} />
              </View>
            </View>

            {/* Job Footer: Budget & Action Button */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.04)" }}>
              <View style={{ gap: 4 }}>
                <Skeleton width={70} height={11} borderRadius={4} />
                <Skeleton width={90} height={18} borderRadius={5} />
              </View>
              <Skeleton width={96} height={34} borderRadius={17} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── 2. Jobs Screen Skeleton ────────────────────────────────
export const JobsSkeleton: React.FC = () => {
  return (
    <View style={{ flex: 1, backgroundColor: colors.neuBg }}>
      {/* Header Skeleton */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, gap: 6 }}>
        <Skeleton width="55%" height={22} borderRadius={8} />
        <Skeleton width="75%" height={13} borderRadius={5} />

        {/* Recessed Search Bar */}
        <View style={[styles.searchBarSkeleton, { marginTop: 8 }]}>
          <Skeleton width={18} height={18} borderRadius={9} />
          <Skeleton width="70%" height={14} borderRadius={6} style={{ marginLeft: 10 }} />
        </View>

        {/* Segmented Filter Pills */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          <Skeleton width={80} height={32} borderRadius={16} />
          <Skeleton width={100} height={32} borderRadius={16} />
          <Skeleton width={90} height={32} borderRadius={16} />
        </View>
      </View>

      {/* Job Cards */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 16 }}>
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.jobCardSkeleton}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Skeleton width={75} height={22} borderRadius={20} />
                <Skeleton width={115} height={22} borderRadius={20} />
              </View>
              <Skeleton width={60} height={14} borderRadius={6} />
            </View>
            <Skeleton width="85%" height={20} borderRadius={6} style={{ marginBottom: 6 }} />
            <Skeleton width="55%" height={14} borderRadius={6} style={{ marginBottom: 12 }} />
            {/* Description snippet */}
            <Skeleton width="100%" height={14} borderRadius={4} style={{ marginBottom: 4 }} />
            <Skeleton width="75%" height={14} borderRadius={4} style={{ marginBottom: 16 }} />

            {/* Metadata (Location & Time - stacked matching JobsScreen) */}
            <View style={{ gap: 8, marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Skeleton width={14} height={14} borderRadius={7} />
                <Skeleton width={190} height={13} borderRadius={6} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Skeleton width={14} height={14} borderRadius={7} />
                <Skeleton width={160} height={13} borderRadius={6} />
              </View>
            </View>

            <View style={styles.jobCardFooter}>
              <View style={{ gap: 4 }}>
                <Skeleton width={80} height={11} borderRadius={4} />
                <Skeleton width={110} height={20} borderRadius={6} />
              </View>
              <Skeleton width={125} height={38} borderRadius={14} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── 2b. Nurse Proposals Sheet Skeleton ──────────────────────
export const NurseProposalListSkeleton: React.FC = () => {
  return (
    <View style={{ gap: 14 }}>
      {[1, 2, 3].map((key) => (
        <View
          key={key}
          style={{
            backgroundColor: colors.white,
            padding: 18,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(226, 234, 245, 0.9)",
            gap: 14,
          }}
        >
          {/* Header: Title + Patient info & Status Chip */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ gap: 6, flex: 1, marginRight: 10 }}>
              <Skeleton width="75%" height={17} borderRadius={6} />
              <Skeleton width="55%" height={12} borderRadius={4} />
            </View>
            <Skeleton width={105} height={26} borderRadius={13} />
          </View>

          {/* 3-Column Metrics Grid matching proposalMetricsRow */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#F8FAFC",
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 12,
            }}
          >
            <View style={{ flex: 1, alignItems: "center", gap: 5 }}>
              <Skeleton width={50} height={10} borderRadius={4} />
              <Skeleton width={60} height={15} borderRadius={5} />
            </View>
            <View style={{ width: 1, height: 26, backgroundColor: "#E2E8F0" }} />
            <View style={{ flex: 1, alignItems: "center", gap: 5 }}>
              <Skeleton width={55} height={10} borderRadius={4} />
              <Skeleton width={65} height={15} borderRadius={5} />
            </View>
            <View style={{ width: 1, height: 26, backgroundColor: "#E2E8F0" }} />
            <View style={{ flex: 1, alignItems: "center", gap: 5 }}>
              <Skeleton width={50} height={10} borderRadius={4} />
              <Skeleton width={55} height={15} borderRadius={5} />
            </View>
          </View>

          {/* Cover Note Box */}
          <View
            style={{
              backgroundColor: "rgba(241, 245, 249, 0.6)",
              borderRadius: 12,
              padding: 10,
              gap: 5,
            }}
          >
            <Skeleton width="92%" height={12} borderRadius={4} />
            <Skeleton width="65%" height={12} borderRadius={4} />
          </View>

          {/* Action Button Skeleton */}
          <Skeleton width="100%" height={42} borderRadius={12} />
        </View>
      ))}
    </View>
  );
};

// ─── 3. Shifts Screen Skeleton ──────────────────────────────
export const ShiftsSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={{ gap: 6, marginBottom: 4 }}>
        <Skeleton width="45%" height={26} borderRadius={8} />
        <Skeleton width="35%" height={13} borderRadius={5} />
      </View>

      {/* Hero Shift Card matching shiftHeroCard */}
      <View style={styles.shiftHeroSkeletonCard}>
        {/* Top Status Strip */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Skeleton width={110} height={24} borderRadius={12} />
          <Skeleton width={70} height={14} borderRadius={6} />
        </View>

        {/* Patient Info */}
        <View style={{ marginTop: 14, gap: 6 }}>
          <Skeleton width={60} height={11} borderRadius={4} />
          <Skeleton width="65%" height={24} borderRadius={6} />
          <Skeleton width="45%" height={14} borderRadius={5} />
        </View>

        {/* Timing Strip */}
        <View style={styles.timingStripSkeleton}>
          <Skeleton width="85%" height={14} borderRadius={6} />
        </View>

        {/* Location & Quick Action Circles */}
        <View style={styles.locationActionRowSkeleton}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Skeleton width={16} height={16} borderRadius={8} />
            <Skeleton width="60%" height={14} borderRadius={6} />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Skeleton width={38} height={38} borderRadius={19} />
            <Skeleton width={38} height={38} borderRadius={19} />
            <Skeleton width={38} height={38} borderRadius={19} />
          </View>
        </View>

        {/* Patient Clinical Census Bridge */}
        <View style={styles.censusBridgeSkeleton}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <Skeleton width={32} height={32} borderRadius={16} />
            <View style={{ gap: 4, flex: 1 }}>
              <Skeleton width="65%" height={13} borderRadius={5} />
              <Skeleton width="85%" height={10} borderRadius={4} />
            </View>
          </View>
          <Skeleton width={16} height={16} borderRadius={8} />
        </View>

        {/* Primary CTA Button */}
        <Skeleton width="100%" height={48} borderRadius={24} style={{ marginTop: 16 }} />
      </View>

      {/* Upcoming Schedule Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <Skeleton width={130} height={18} borderRadius={6} />
        <Skeleton width={90} height={22} borderRadius={11} />
      </View>

      {/* Segmented Tab Bar - Exactly 2 tabs ("Upcoming", "Completed") matching ShiftsScreen */}
      <View style={styles.segmentedTwoTabs}>
        <Skeleton width="48%" height={38} borderRadius={19} />
        <Skeleton width="48%" height={38} borderRadius={19} />
      </View>

      {/* Upcoming Schedule Cards */}
      {[1, 2].map((key) => (
        <View key={key} style={styles.timelineCardSkeleton}>
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="45%" height={14} borderRadius={6} />
            <Skeleton width="60%" height={12} borderRadius={5} />
            <Skeleton width="50%" height={12} borderRadius={5} />
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <Skeleton width={75} height={20} borderRadius={10} />
            <Skeleton width={60} height={14} borderRadius={6} />
          </View>
        </View>
      ))}
    </View>
  );
};

// ─── 4. Patients Screen Skeleton ────────────────────────────
export const PatientsSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      <Skeleton width="40%" height={12} borderRadius={6} />
      <Skeleton width="70%" height={24} borderRadius={8} style={{ marginTop: 6 }} />
      <Skeleton width="85%" height={14} borderRadius={6} style={{ marginTop: 4, marginBottom: 14 }} />

      {/* Horizontal Patient Pills Rail */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <Skeleton width={120} height={38} borderRadius={14} />
        <Skeleton width={120} height={38} borderRadius={14} />
        <Skeleton width={100} height={38} borderRadius={14} />
      </View>

      {/* Patient Dossier Card */}
      <View style={styles.jobCardSkeleton}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Skeleton width={48} height={48} borderRadius={16} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="60%" height={18} borderRadius={6} />
            <Skeleton width="80%" height={12} borderRadius={4} />
          </View>
        </View>
        <Skeleton width="100%" height={8} borderRadius={4} style={{ marginTop: 16 }} />
        <View style={{ gap: 10, marginTop: 14 }}>
          <Skeleton width="100%" height={14} borderRadius={6} />
          <Skeleton width="100%" height={14} borderRadius={6} />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.segmentedSkeleton}>
        <Skeleton width="30%" height={32} borderRadius={16} />
        <Skeleton width="30%" height={32} borderRadius={16} />
        <Skeleton width="30%" height={32} borderRadius={16} />
      </View>

      {/* eMAR Rows */}
      <View style={styles.jobCardSkeleton}>
        <Skeleton width="50%" height={16} borderRadius={6} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={36} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={36} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={36} borderRadius={8} />
      </View>
    </View>
  );
};

// ─── 5. Profile Screen Skeleton ─────────────────────────────
export const ProfileSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      <Skeleton width="35%" height={12} borderRadius={6} />
      <Skeleton width="65%" height={24} borderRadius={8} style={{ marginTop: 6 }} />
      <Skeleton width="80%" height={14} borderRadius={6} style={{ marginTop: 4, marginBottom: 16 }} />

      {/* Nurse Hero Card */}
      <View style={[styles.jobCardSkeleton, { alignItems: "center" }]}>
        <Skeleton width={68} height={68} borderRadius={24} style={{ marginBottom: 12 }} />
        <Skeleton width={160} height={20} borderRadius={6} />
        <Skeleton width={190} height={13} borderRadius={6} style={{ marginTop: 6 }} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Skeleton width={100} height={22} borderRadius={11} />
          <Skeleton width={80} height={22} borderRadius={11} />
        </View>
      </View>

      {/* Escrow Wallet Card */}
      <View style={[styles.jobCardSkeleton, { backgroundColor: colors.primarySoft }]}>
        <Skeleton width={100} height={14} borderRadius={6} />
        <Skeleton width={140} height={28} borderRadius={8} style={{ marginTop: 8 }} />
        <Skeleton width="100%" height={40} borderRadius={12} style={{ marginTop: 14 }} />
      </View>

      {/* Verified Credentials */}
      <View style={styles.jobCardSkeleton}>
        <Skeleton width={140} height={16} borderRadius={6} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={32} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={32} borderRadius={8} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: "#E2E8F0",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 110,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  notificationBannerSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    gap: 10,
    marginBottom: 16,
  },
  grid2x2: {
    gap: 14,
    marginBottom: 20,
  },
  gridRow: {
    flexDirection: "row",
    gap: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    minHeight: 132,
    justifyContent: "space-between",
    elevation: 2,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quickActionsSkeletonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionBtnSkeleton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 234, 245, 0.9)",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 68,
  },
  activityStripSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 234, 245, 0.9)",
    marginBottom: 14,
  },
  activeShiftCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    marginBottom: 14,
    elevation: 2,
  },
  cleanVitalsGridSkeleton: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
  },
  cleanVitalTileSkeleton: {
    width: "48%",
    minHeight: 120,
    backgroundColor: colors.neuInset,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    borderRadius: 14,
    padding: 10,
    justifyContent: "space-between",
  },
  radarJobCardSkeleton: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(226, 234, 245, 0.9)",
    padding: 16,
    marginBottom: 12,
  },
  shiftHeroSkeletonCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 6,
  },
  timingStripSkeleton: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  locationActionRowSkeleton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  censusBridgeSkeleton: {
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
  segmentedTwoTabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F1F5F9",
    padding: 4,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 14,
  },
  timelineCardSkeleton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 234, 245, 0.9)",
    marginBottom: 10,
  },
  roundsCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(226, 234, 245, 0.9)",
  },
  searchBarSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neuInset,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  segmentedSkeleton: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  jobCardSkeleton: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(226, 234, 245, 0.9)",
    marginBottom: 12,
  },
  jobCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    marginTop: 4,
    paddingTop: 14,
  },
  shiftRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 234, 245, 0.9)",
  },
});
