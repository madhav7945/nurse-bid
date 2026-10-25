import { Platform, ViewStyle } from "react-native";
import { colors, neuShadows } from "./colors";

type Shadow = Pick<ViewStyle, "shadowColor" | "shadowOffset" | "shadowOpacity" | "shadowRadius" | "elevation">;

export const softShadow: Shadow = Platform.select({
  ios: { shadowColor: "#7B8AA8", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.11, shadowRadius: 16 },
  android: { elevation: 3 },
  default: { shadowColor: "#7B8AA8", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.11, shadowRadius: 16, elevation: 3 },
}) as Shadow;

export const bottomTabShadow: Shadow = Platform.select({
  ios: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20 },
  android: { elevation: 10 },
  default: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 },
}) as Shadow;

export { neuShadows };
