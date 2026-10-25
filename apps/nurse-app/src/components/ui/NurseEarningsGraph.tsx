import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { TrendingUp, Wallet, ArrowUpRight, CheckCircle2, ShieldCheck } from "lucide-react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export interface MonthData {
  month: string;
  amount: number;
  shifts: number;
  heightPct: number;
}

export interface NurseEarningsGraphProps {
  history?: MonthData[];
  availableBalance?: number;
  ytdGrowth?: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function generateDefaultHistory(currentBalance: number): MonthData[] {
  const now = new Date();
  const history: MonthData[] = [];
  const base = Math.max(currentBalance, 30000);

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = MONTH_NAMES[d.getMonth()];
    const factor = i === 0 ? 1 : 0.65 + ((5 - i) * 0.07);
    const amount = Math.round(base * factor);
    const shifts = Math.max(2, Math.round(factor * 14));
    history.push({
      month,
      amount,
      shifts,
      heightPct: Math.min(1.0, 0.4 + (factor * 0.5)),
    });
  }
  return history;
}

export const NurseEarningsGraph: React.FC<NurseEarningsGraphProps> = ({
  history: propHistory,
  availableBalance = 0,
  ytdGrowth = "+18.4% YTD",
}) => {
  const historyData = propHistory && propHistory.length > 0
    ? propHistory
    : generateDefaultHistory(availableBalance);

  const [selectedIdx, setSelectedIdx] = useState<number>(historyData.length - 1);
  const selected = historyData[selectedIdx] || historyData[0] || { month: "Current", amount: 0, shifts: 0, heightPct: 0.5 };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.tagRow}>
            <Wallet size={12} color={colors.primary} />
            <Text style={styles.tagText}>PROTECTED CARE DISBURSEMENTS LEDGER</Text>
          </View>
          <Text style={styles.title}>Earnings Velocity & Yield</Text>
        </View>
        <View style={styles.growthBadge}>
          <TrendingUp size={12} color={colors.success} />
          <Text style={styles.growthText}>{ytdGrowth}</Text>
        </View>
      </View>

      {/* Selected Month Highlight */}
      <View style={styles.highlightRow}>
        <View>
          <Text style={styles.highlightLabel}>{selected.month} Payout</Text>
          <Text style={styles.highlightValue}>₹{selected.amount.toLocaleString("en-IN")}</Text>
        </View>
        <View style={styles.shiftsBadge}>
          <Text style={styles.shiftsBadgeText}>{selected.shifts} Shifts Completed</Text>
        </View>
      </View>

      {/* Chart Canvas */}
      <View style={styles.chartCanvas}>
        {/* Gridlines */}
        <View style={styles.gridContainer}>
          <View style={styles.gridLine}><Text style={styles.axisText}>₹85K</Text></View>
          <View style={styles.gridLine}><Text style={styles.axisText}>₹60K</Text></View>
          <View style={styles.gridLine}><Text style={styles.axisText}>₹35K</Text></View>
        </View>

        {/* Bars */}
        <View style={styles.barsContainer}>
          {historyData.map((item, idx) => {
            const isSelected = idx === selectedIdx;
            const barHeight = Math.max(30, item.heightPct * 115);
            return (
              <TouchableOpacity
                key={`${item.month}-${idx}`}
                onPress={() => setSelectedIdx(idx)}
                style={styles.barCol}
                activeOpacity={0.7}
              >
                {isSelected && (
                  <View style={styles.barTooltip}>
                    <Text style={styles.barTooltipText}>₹{(item.amount / 1000).toFixed(1)}k</Text>
                  </View>
                )}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: barHeight },
                      isSelected ? styles.barFillActive : styles.barFillInactive,
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, isSelected && styles.barLabelActive]}>
                  {item.month}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <ShieldCheck size={14} color={colors.success} />
          <Text style={styles.footerText}>Instant Razorpay Direct Bank Transfer</Text>
        </View>
        <Text style={styles.footerSub}>0% Commission on ICU shifts</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  tagText: {
    fontFamily: typography.mono.fontFamily,
    fontSize: 9,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.6,
  },
  title: {
    ...typography.title,
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink,
  },
  growthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  growthText: {
    fontFamily: typography.mono.fontFamily,
    fontSize: 10,
    fontWeight: "700",
    color: colors.success,
  },
  highlightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
  },
  highlightLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    color: colors.muted,
  },
  highlightValue: {
    fontFamily: typography.monoLarge.fontFamily,
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  shiftsBadge: {
    backgroundColor: colors.lineSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  shiftsBadgeText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    fontWeight: "600",
    color: colors.ink,
  },
  chartCanvas: {
    height: 155,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 8,
    paddingTop: 8,
    position: "relative",
    justifyContent: "flex-end",
  },
  gridContainer: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 8,
    bottom: 24,
    justifyContent: "space-between",
    pointerEvents: "none",
  },
  gridLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    borderStyle: "dashed",
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  axisText: {
    fontFamily: typography.monoSmall.fontFamily,
    fontSize: 8,
    color: "#94A3B8",
    fontWeight: "600",
  },
  barsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
    paddingBottom: 4,
  },
  barCol: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    height: "100%",
    position: "relative",
  },
  barTooltip: {
    position: "absolute",
    top: -6,
    backgroundColor: colors.ink,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignItems: "center",
  },
  barTooltipText: {
    fontFamily: typography.mono.fontFamily,
    fontSize: 9,
    fontWeight: "700",
    color: colors.white,
  },
  barTrack: {
    width: 14,
    height: 100,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: 12,
    borderRadius: 6,
  },
  barFillActive: {
    backgroundColor: colors.primary,
    width: 14,
  },
  barFillInactive: {
    backgroundColor: "#CBD5E1",
  },
  barLabel: {
    fontFamily: typography.monoSmall.fontFamily,
    fontSize: 9,
    color: colors.muted,
    marginTop: 4,
    fontWeight: "600",
  },
  barLabelActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10,
    color: colors.muted,
    fontWeight: "600",
  },
  footerSub: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 9,
    color: colors.success,
    fontWeight: "700",
  },
});
