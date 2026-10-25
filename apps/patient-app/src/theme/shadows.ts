import { ViewStyle } from "react-native";
import { colors } from "./colors";

/**
 * NurseBid — Shadows
 * Near-zero use. Separate things with whitespace and hairline borders.
 */
export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  } as ViewStyle,

  cardSubtle: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 0,
  } as ViewStyle,

  bottomTab: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  } as ViewStyle,

  none: {
    shadowOpacity: 0,
    elevation: 0,
  } as ViewStyle,
} as const;
