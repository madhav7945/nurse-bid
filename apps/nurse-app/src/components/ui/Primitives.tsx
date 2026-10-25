import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowUpRight, ChevronRight } from "lucide-react-native";
import { colors } from "../../theme/colors";
import { layout, spacing } from "../../theme/spacing";
import { softShadow } from "../../theme/shadows";
import { typography } from "../../theme/typography";

export const Screen: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => (
  <View style={[styles.screen, style]}>{children}</View>
);

export const CommandHeader: React.FC<{
  section: string;
  title: string;
  subtitle?: string;
  onProfile?: () => void;
}> = ({ section, title, subtitle, onProfile }) => {
  const navigation = useNavigation<any>();
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 360, useNativeDriver: true }),
    ]).start();
  }, [opacity, y]);
  return (
    <Animated.View style={[styles.commandHeader, { opacity, transform: [{ translateY: y }] }]}>
      <View style={styles.headerMark}><Text style={styles.headerMarkText}>N</Text></View>
      <View style={styles.headerCopy}>
        <Text style={styles.headerSection}>{section}</Text>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={onProfile || (() => navigation.navigate("Profile"))} style={styles.profileMark}>
        <Text style={styles.profileText}>RN</Text>
      </Pressable>
    </Animated.View>
  );
};

export const SectionLabel: React.FC<{ children: string; style?: StyleProp<TextStyle> }> = ({ children, style }) => (
  <Text style={[typography.label, styles.sectionLabel, style]}>{children}</Text>
);

export const Panel: React.FC<{ children: React.ReactNode; tone?: "paper" | "blue" | "ink"; style?: StyleProp<ViewStyle>; noPadding?: boolean }> = ({
  children, tone = "paper", style, noPadding,
}) => (
  <View style={[styles.panelShell, tone === "blue" && styles.panelBlueShell, tone === "ink" && styles.panelInkShell, style]}>
    <View style={[styles.panel, tone === "blue" && styles.panelBlue, tone === "ink" && styles.panelInk, noPadding && styles.noPadding]}>
      {children}
    </View>
  </View>
);

export const StatusTag: React.FC<{ label: string; tone?: "blue" | "green" | "amber" | "red" | "slate"; dot?: boolean }> = ({ label, tone = "slate", dot = false }) => {
  const map = {
    blue: [colors.primaryPale, colors.primaryDark],
    green: [colors.successSoft, colors.success],
    amber: [colors.warningSoft, colors.warning],
    red: [colors.dangerSoft, colors.danger],
    slate: [colors.surfaceBlue, colors.muted],
  } as const;
  const [backgroundColor, color] = map[tone];
  return <View style={[styles.tag, { backgroundColor }]}>{dot ? <View style={[styles.tagDot, { backgroundColor: color }]} /> : null}<Text style={[styles.tagText, { color }]}>{label}</Text></View>;
};

export const DataRow: React.FC<{ label: string; value: string; icon?: React.ReactNode; accent?: string; onPress?: () => void }> = ({ label, value, icon, accent, onPress }) => {
  const content = <View style={styles.dataRow}>{icon ? <View style={styles.dataIcon}>{icon}</View> : null}<View style={styles.dataCopy}><Text style={styles.dataLabel}>{label}</Text><Text style={[styles.dataValue, accent ? { color: accent } : null]}>{value}</Text></View>{onPress ? <ChevronRight size={16} color={colors.faint} /> : null}</View>;
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button">{content}</Pressable> : content;
};

export const ActionButton: React.FC<{ title: string; onPress: () => void; tone?: "primary" | "quiet" | "outline"; icon?: React.ReactNode; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>; accessibilityLabel?: string }> = ({
  title, onPress, tone = "primary", icon, style, textStyle, accessibilityLabel,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const config = {
    primary: { backgroundColor: colors.primary, color: colors.white, borderColor: colors.primary },
    quiet: { backgroundColor: colors.surfaceBlue, color: colors.primaryDark, borderColor: colors.surfaceBlue },
    outline: { backgroundColor: colors.white, color: colors.ink, borderColor: colors.line },
  }[tone];
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || title} onPress={onPress} onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 24, bounciness: 4 }).start()} onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 5 }).start()}><Animated.View style={[styles.action, config, { transform: [{ scale }] }, style]}>{icon ? <View style={styles.actionIcon}>{icon}</View> : null}<Text style={[styles.actionText, { color: config.color }, textStyle]}>{title}</Text></Animated.View></Pressable>;
};

export const MetricRail: React.FC<{ items: { label: string; value: string; note?: string; tone?: "blue" | "green" | "amber" }[] }> = ({ items }) => (
  <View style={styles.metricRail}>{items.map((item, index) => <View key={`${item.label}-${index}`} style={styles.metricCell}><View style={[styles.metricRule, { backgroundColor: item.tone === "green" ? colors.success : item.tone === "amber" ? colors.warning : colors.primary }]} /><Text style={styles.metricLabel}>{item.label}</Text><Text style={styles.metricValue}>{item.value}</Text>{item.note ? <Text style={styles.metricNote}>{item.note}</Text> : null}</View>)}</View>
);

export const Segmented: React.FC<{ items: string[]; active: string; onChange: (item: string) => void }> = ({ items, active, onChange }) => (
  <View style={styles.segmented}>{items.map((item) => <Pressable key={item} onPress={() => onChange(item)} style={[styles.segment, active === item && styles.segmentActive]}><Text style={[styles.segmentText, active === item && styles.segmentTextActive]}>{item}</Text></Pressable>)}</View>
);

export const SkeletonRows: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={{ opacity }}>{Array.from({ length: count }).map((_, index) => <View key={index} style={styles.skeletonRow}><View style={styles.skeletonIcon} /><View style={styles.skeletonCopy}><View style={styles.skeletonLine} /><View style={styles.skeletonShort} /></View></View>)}</Animated.View>;
};

export const ErrorState: React.FC<{ message?: string; onRetry: () => void }> = ({ message = "We could not refresh this clinical view.", onRetry }) => (
  <View style={styles.errorState}><Text style={styles.errorTitle}>Connection unavailable</Text><Text style={styles.errorMessage}>{message}</Text><ActionButton title="Try again" tone="outline" onPress={onRetry} style={styles.errorAction} /></View>
);

export const ArrowAction: React.FC<{ title: string; onPress: () => void }> = ({ title, onPress }) => <Pressable onPress={onPress} style={styles.arrowAction}><Text style={styles.arrowText}>{title}</Text><ArrowUpRight size={15} color={colors.primary} /></Pressable>;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  commandHeader: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: layout.screenPadding, paddingTop: 16, paddingBottom: 18 },
  headerMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", marginRight: 11 },
  headerMarkText: { color: colors.white, fontSize: 18, fontWeight: "800", letterSpacing: -1 },
  headerCopy: { flex: 1 },
  headerSection: { ...typography.label, color: colors.primary, marginBottom: 3 },
  headerTitle: { ...typography.title, color: colors.ink },
  headerSubtitle: { ...typography.caption, color: colors.muted, marginTop: 3 },
  profileMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  profileText: { color: colors.primaryDark, fontSize: 11, fontWeight: "800" },
  sectionLabel: { color: colors.muted, marginBottom: 9 },
  panelShell: { backgroundColor: colors.surfaceBlue, borderRadius: layout.panelRadius + 2, padding: 2, marginBottom: 14 },
  panelBlueShell: { backgroundColor: colors.primarySoft },
  panelInkShell: { backgroundColor: colors.inkSoft },
  panel: { backgroundColor: colors.surface, borderRadius: layout.panelRadius, padding: spacing.lg, borderWidth: 1, borderColor: colors.lineSoft },
  panelBlue: { backgroundColor: colors.surfaceBlue, borderColor: colors.primarySoft },
  panelInk: { backgroundColor: colors.ink, borderColor: colors.ink },
  noPadding: { padding: 0 },
  tag: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", minHeight: 24, paddingHorizontal: 8, borderRadius: 7 },
  tagDot: { width: 5, height: 5, borderRadius: 3, marginRight: 5 },
  tagText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  dataRow: { minHeight: 58, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.lineSoft, paddingVertical: 9 },
  dataIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryPale, alignItems: "center", justifyContent: "center", marginRight: 10 },
  dataCopy: { flex: 1 },
  dataLabel: { ...typography.caption, color: colors.muted },
  dataValue: { ...typography.bodyStrong, color: colors.ink, marginTop: 2 },
  action: { minHeight: layout.touchTarget, paddingHorizontal: 15, borderRadius: layout.buttonRadius, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  actionIcon: { marginRight: 7 },
  actionText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.1 },
  metricRail: { flexDirection: "row", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 4, marginBottom: 18, ...softShadow },
  metricCell: { flex: 1, paddingHorizontal: 10, minHeight: 76 },
  metricRule: { width: 22, height: 3, borderRadius: 2, marginBottom: 9 },
  metricLabel: { ...typography.label, color: colors.muted, fontSize: 9, letterSpacing: 0.5 },
  metricValue: { ...typography.monoLarge, color: colors.ink, marginTop: 3 },
  metricNote: { ...typography.caption, color: colors.faint, marginTop: 2 },
  segmented: { flexDirection: "row", padding: 3, borderRadius: 11, backgroundColor: colors.surfaceBlue, marginBottom: 14 },
  segment: { flex: 1, minHeight: 36, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  segmentActive: { backgroundColor: colors.surface, ...softShadow },
  segmentText: { fontSize: 11, fontWeight: "700", color: colors.muted },
  segmentTextActive: { color: colors.ink },
  skeletonRow: { flexDirection: "row", alignItems: "center", minHeight: 64, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  skeletonIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, marginRight: 10 },
  skeletonCopy: { flex: 1 },
  skeletonLine: { width: "72%", height: 11, borderRadius: 4, backgroundColor: colors.line, marginBottom: 8 },
  skeletonShort: { width: "42%", height: 9, borderRadius: 4, backgroundColor: colors.lineSoft },
  errorState: { alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.dangerSoft, borderRadius: 16, padding: 22, marginBottom: 14 },
  errorTitle: { ...typography.heading, color: colors.ink },
  errorMessage: { ...typography.caption, color: colors.muted, textAlign: "center", marginTop: 5 },
  errorAction: { marginTop: 14 },
  arrowAction: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  arrowText: { color: colors.primary, fontSize: 12, fontWeight: "800", marginRight: 4 },
});
