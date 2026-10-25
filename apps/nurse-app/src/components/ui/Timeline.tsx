import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CheckCircle2, Circle, Clock3 } from "lucide-react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export interface TimelineEntry { title: string; meta: string; complete?: boolean; active?: boolean }

export const Timeline: React.FC<{ entries: TimelineEntry[] }> = ({ entries }) => <View>{entries.map((entry, index) => <View key={`${entry.title}-${index}`} style={styles.row}><View style={styles.rail}>{entry.complete ? <CheckCircle2 size={18} color={colors.success} /> : entry.active ? <Clock3 size={18} color={colors.primary} /> : <Circle size={18} color={colors.line} />}{index < entries.length - 1 ? <View style={styles.line} /> : null}</View><View style={styles.copy}><Text style={[styles.title, entry.active && styles.active]}>{entry.title}</Text><Text style={styles.meta}>{entry.meta}</Text></View></View>)}</View>;

const styles = StyleSheet.create({
  row: { flexDirection: "row", minHeight: 58 },
  rail: { width: 26, alignItems: "center" },
  line: { flex: 1, width: 1, backgroundColor: colors.primarySoft, marginVertical: 3 },
  copy: { flex: 1, paddingLeft: 10, paddingBottom: 13 },
  title: { ...typography.bodyStrong, color: colors.ink },
  active: { color: colors.primaryDark },
  meta: { ...typography.caption, color: colors.muted, marginTop: 3 },
});
