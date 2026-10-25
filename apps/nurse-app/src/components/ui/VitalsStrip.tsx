import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Activity, Droplets, Heart, Thermometer } from "lucide-react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

import { ShiftVitals } from "../../lib/api";

export const VitalsStrip: React.FC<{ vitals?: ShiftVitals; onRechart?: () => void }> = ({ vitals, onRechart }) => {
  if (!vitals) return null;
  const values = [
    { label: "HR", value: vitals.pulse || "--", unit: "bpm", icon: <Heart size={13} color={colors.success} /> },
    { label: "BP", value: vitals.bp || "--/--", unit: "mmHg", icon: <Activity size={13} color={colors.primary} /> },
    { label: "SpO₂", value: vitals.spo2 || "--", unit: "%", icon: <Droplets size={13} color={colors.success} /> },
    { label: "Temp", value: vitals.temp || "--", unit: "°F", icon: <Thermometer size={13} color={colors.warning} /> },
  ];
  return <View style={styles.wrap}><View style={styles.header}><Text style={styles.label}>Latest telemetry</Text>{onRechart ? <Pressable onPress={onRechart} style={styles.rechart}><Text style={styles.rechartText}>Re-chart</Text></Pressable> : null}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>{values.map((item) => <View key={item.label} style={styles.item}>{item.icon}<Text style={styles.value}>{item.value}</Text><Text style={styles.unit}>{item.unit}</Text></View>)}</ScrollView></View>;
};

const styles = StyleSheet.create({
  wrap: { marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  label: { ...typography.label, color: colors.muted, fontSize: 9, letterSpacing: 0.6 },
  rechart: { minHeight: 32, justifyContent: "center" },
  rechartText: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  content: { paddingRight: 8 },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryPale, borderWidth: 1, borderColor: colors.primarySoft, borderRadius: 9, paddingHorizontal: 9, minHeight: 35, marginRight: 7 },
  value: { ...typography.mono, color: colors.ink, fontSize: 13, marginLeft: 5 },
  unit: { fontSize: 9, color: colors.muted, fontWeight: "700", marginLeft: 3 },
});
