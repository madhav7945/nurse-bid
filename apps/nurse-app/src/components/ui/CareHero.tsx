import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Activity, ArrowUpRight, ShieldCheck } from "lucide-react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export const CareHero: React.FC<{ eyebrow: string; title: string; subtitle: string; detail?: string; style?: ViewStyle }> = ({ eyebrow, title, subtitle, detail, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, speed: 18, bounciness: 4, useNativeDriver: true }),
    ]).start();
  }, [opacity, y]);
  return <Animated.View style={[styles.hero, style, { opacity, transform: [{ translateY: y }] }]}>
    <View style={styles.topline}><View style={styles.eyebrow}><Activity size={13} color={colors.primarySoft} /><Text style={styles.eyebrowText}>{eyebrow}</Text></View><View style={styles.secure}><ShieldCheck size={13} color={colors.successSoft} /><Text style={styles.secureText}>Protected</Text></View></View>
    <View style={styles.rule} />
    <View style={styles.signal}><View style={styles.signalMark}><Activity size={18} color={colors.white} /></View><View style={styles.signalCopy}><Text style={styles.signalLabel}>Care signal</Text><Text style={styles.signalText}>Priority actions are in view</Text></View><ArrowUpRight size={18} color={colors.primarySoft} /></View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    {detail ? <Text style={styles.detail}>{detail}</Text> : null}
  </Animated.View>;
};

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.ink, borderRadius: 22, padding: 18, marginBottom: 20, overflow: "hidden" },
  topline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { flexDirection: "row", alignItems: "center" },
  eyebrowText: { ...typography.label, color: colors.primarySoft, marginLeft: 6, fontSize: 9 },
  secure: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, minHeight: 24, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.09)" },
  secureText: { color: colors.successSoft, fontSize: 10, fontWeight: "800", marginLeft: 5 },
  rule: { height: 1, backgroundColor: "rgba(218,232,255,0.22)", marginTop: 16 },
  signal: { flexDirection: "row", alignItems: "center", marginTop: 15, padding: 10, borderWidth: 1, borderColor: "rgba(218,232,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 13 },
  signalMark: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 9 },
  signalCopy: { flex: 1 },
  signalLabel: { color: colors.primarySoft, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  signalText: { color: colors.white, fontSize: 11, fontWeight: "700", marginTop: 3 },
  title: { ...typography.display, color: colors.white, marginTop: 17 },
  subtitle: { ...typography.body, color: "#D8E6FB", marginTop: 7, maxWidth: "92%" },
  detail: { ...typography.caption, color: colors.primarySoft, marginTop: 11, fontWeight: "700" },
});
