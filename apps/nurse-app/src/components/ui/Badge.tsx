import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";

type BadgeVariant = "default" | "neutral" | "success" | "warning" | "danger" | "info" | "primary" | "muted";

export const Badge: React.FC<{ label: string; variant?: BadgeVariant; size?: "xs" | "sm" | "md"; showDot?: boolean; style?: StyleProp<ViewStyle> }> = ({ label, variant = "default", size = "sm", showDot, style }) => {
  const map = {
    default: [colors.surfaceBlue, colors.muted], neutral: [colors.surfaceBlue, colors.muted],
    success: [colors.successSoft, colors.success], warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger], info: [colors.infoSoft, colors.info],
    primary: [colors.primaryPale, colors.primaryDark], muted: [colors.background, colors.faint],
  } as const;
  const [backgroundColor, color] = map[variant];
  const fontSize = size === "xs" ? 9 : size === "md" ? 11 : 10;
  return <View style={[styles.base, { backgroundColor, paddingHorizontal: size === "md" ? 10 : 8, minHeight: size === "xs" ? 21 : 24 }, style]}>{showDot ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}<Text numberOfLines={1} style={[styles.text, { color, fontSize }]}>{label}</Text></View>;
};

const styles = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", borderRadius: 7 },
  dot: { width: 5, height: 5, borderRadius: 3, marginRight: 5 },
  text: { fontWeight: "800", letterSpacing: 0.35 },
});
