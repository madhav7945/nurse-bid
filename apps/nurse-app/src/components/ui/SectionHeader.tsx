import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export const SectionHeader: React.FC<{ title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }> = ({ title, subtitle, actionLabel, onAction }) => (
  <View style={styles.row}><View style={styles.copy}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>{actionLabel && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}><Text style={styles.actionText}>{actionLabel}</Text><ChevronRight size={14} color={colors.primary} /></Pressable> : null}</View>
);

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  copy: { flex: 1 },
  title: { ...typography.heading, color: colors.ink },
  subtitle: { ...typography.caption, color: colors.muted, marginTop: 2 },
  action: { flexDirection: "row", alignItems: "center", minHeight: 44, paddingLeft: 8 },
  actionText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
});
