import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export const StatCard: React.FC<{ title: string; value: string | number; trend?: string; theme?: "primary" | "success" | "warning" | "info" | "danger"; icon?: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ title, value, trend, theme = "primary", icon, style }) => {
  const map = { primary: colors.primary, success: colors.success, warning: colors.warning, info: colors.info, danger: colors.danger };
  const color = map[theme];
  return <View style={[styles.card, style]}><View style={[styles.icon, { backgroundColor: `${color}18` }]}>{icon}</View><Text numberOfLines={1} style={styles.value}>{value}</Text><Text numberOfLines={1} style={styles.title}>{title}</Text>{trend ? <Text style={[styles.trend, { color }]}>{trend}</Text> : null}</View>;
};

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 132, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 16, padding: 14, justifyContent: "space-between" },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  value: { ...typography.monoLarge, color: colors.ink, fontSize: 19 },
  title: { ...typography.caption, color: colors.muted, marginTop: 2 },
  trend: { fontSize: 10, fontWeight: "800", marginTop: 6 },
});
