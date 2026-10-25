import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export const ListItem: React.FC<{ icon?: React.ReactNode; title: string; subtitle?: string; rightLabel?: string; rightSublabel?: string; rightAccessory?: React.ReactNode; showChevron?: boolean; onPress?: () => void; style?: ViewStyle }> = ({ icon, title, subtitle, rightLabel, rightSublabel, rightAccessory, showChevron = true, onPress, style }) => {
  const content = <View style={[styles.row, style]}>{icon ? <View style={styles.icon}>{icon}</View> : null}<View style={styles.copy}><Text numberOfLines={1} style={styles.title}>{title}</Text>{subtitle ? <Text numberOfLines={2} style={styles.subtitle}>{subtitle}</Text> : null}</View><View style={styles.right}>{rightLabel ? <Text style={styles.rightLabel}>{rightLabel}</Text> : null}{rightSublabel ? <Text style={styles.rightSub}>{rightSublabel}</Text> : null}{rightAccessory}{showChevron && onPress ? <ChevronRight size={15} color={colors.faint} /> : null}</View></View>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{content}</Pressable> : content;
};

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.lineSoft, paddingVertical: 10 },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryPale, alignItems: "center", justifyContent: "center", marginRight: 10 },
  copy: { flex: 1 },
  title: { ...typography.bodyStrong, color: colors.ink },
  subtitle: { ...typography.caption, color: colors.muted, marginTop: 2 },
  right: { alignItems: "flex-end", marginLeft: 8 },
  rightLabel: { ...typography.bodyStrong, color: colors.ink },
  rightSub: { ...typography.caption, color: colors.faint, marginTop: 1 },
});
