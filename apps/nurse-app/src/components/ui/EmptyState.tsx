import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Inbox } from "lucide-react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; message?: string }> = ({ icon, title, message }) => (
  <View style={styles.wrap}><View style={styles.mark}>{icon || <Inbox size={24} color={colors.primary} />}</View><Text style={styles.title}>{title}</Text>{message ? <Text style={styles.message}>{message}</Text> : null}</View>
);

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingHorizontal: 25, paddingVertical: 42, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18 },
  mark: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.primaryPale, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { ...typography.heading, color: colors.ink, textAlign: "center" },
  message: { ...typography.body, color: colors.muted, textAlign: "center", marginTop: 5, maxWidth: 260 },
});
