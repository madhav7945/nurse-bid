import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/spacing";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading,
  disabled,
  style,
  textStyle,
  fullWidth,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const config = {
    primary: { bg: colors.primary, text: colors.white, border: colors.primary },
    secondary: { bg: colors.primarySoft, text: colors.primaryDark, border: colors.primaryBorder },
    outline: { bg: colors.surface, text: colors.ink, border: colors.line },
    ghost: { bg: "transparent", text: colors.primary, border: "transparent" },
    danger: { bg: colors.danger, text: colors.white, border: colors.danger },
  }[variant];

  const sizeStyle = {
    sm: { height: 38, pad: 12, font: 12 },
    md: { height: 46, pad: 16, font: 13 },
    lg: { height: 52, pad: 20, font: 14 },
  }[size];

  const inactive = Boolean(disabled || loading);

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      speed: 25,
      bounciness: 4,
      useNativeDriver: true,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      speed: 22,
      bounciness: 5,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      disabled={inactive}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          styles.base,
          {
            backgroundColor: config.bg,
            borderColor: config.border,
            height: sizeStyle.height,
            paddingHorizontal: sizeStyle.pad,
            opacity: inactive ? 0.5 : 1,
            transform: [{ scale }],
          },
          fullWidth && styles.full,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={config.text} size="small" />
        ) : (
          <View style={styles.content}>
            {icon ? <View style={styles.icon}>{icon}</View> : null}
            <Text
              numberOfLines={1}
              style={[styles.text, { color: config.text, fontSize: sizeStyle.font }, textStyle]}
            >
              {title}
            </Text>
            {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: layout.cardRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  full: { width: "100%" },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  icon: { marginRight: 7 },
  iconRight: { marginLeft: 7 },
  text: { fontWeight: "800", letterSpacing: 0.1 },
});
