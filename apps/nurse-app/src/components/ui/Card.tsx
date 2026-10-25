import React, { useRef } from "react";
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/spacing";
import { softShadow } from "../../theme/shadows";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "elevated" | "outlined" | "dark";
  pressable?: boolean;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, variant = "default", pressable = false, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const palette = {
    default: { backgroundColor: colors.surface, borderColor: colors.lineSoft, borderWidth: 1 },
    elevated: { backgroundColor: colors.surfaceRaised, borderColor: colors.lineSoft, borderWidth: 1 },
    outlined: { backgroundColor: "transparent", borderColor: colors.line, borderWidth: 1 },
    dark: { backgroundColor: colors.ink, borderColor: colors.ink, borderWidth: 1 },
  }[variant];
  const content = <Animated.View style={[styles.base, palette, variant !== "outlined" && softShadow, { transform: [{ scale }] }, style]}>{children}</Animated.View>;
  if (!pressable || !onPress) return content;
  return <Pressable onPress={onPress} onPressIn={() => Animated.spring(scale, { toValue: 0.985, speed: 24, bounciness: 3, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(scale, { toValue: 1, speed: 20, bounciness: 4, useNativeDriver: true }).start()}>{content}</Pressable>;
};

const styles = StyleSheet.create({
  base: { borderRadius: layout.panelRadius, padding: 16, marginBottom: 14 },
});
