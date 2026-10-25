import { TextStyle, Platform } from "react-native";

/**
 * NurseBid Patient App — Strict Typographic Hierarchy
 * 28px (screen title) / 20px (card title) / 16px (body) / 13px (label/caption) / 11px (micro-label)
 * Consistent uppercase letter-spaced eyebrows (11px, medium weight, muted).
 * Monospace tabular numbers for financial & clinical metrics.
 */

const fontFamily = Platform.select({
  web: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  ios: "System",
  android: "Roboto",
  default: "System",
});

const monoFamily = Platform.select({
  web: "'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace",
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

export const typography = {
  // Screen Title (28px / 700 / -0.5px)
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 34,
    fontFamily,
  } as TextStyle,

  // Card Title / Section Head (20px / 700 / -0.3px)
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 26,
    fontFamily,
  } as TextStyle,

  // Subheading (18px / 600 / -0.2px)
  heading: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.2,
    lineHeight: 24,
    fontFamily,
  } as TextStyle,

  // Standard Body (16px / 400 / 22px)
  body: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 22,
    fontFamily,
  } as TextStyle,

  // Emphasized Body (14px / 600 / 20px)
  bodyStrong: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    fontFamily,
  } as TextStyle,

  // Small Body / Subtext (13px / 400 / 18px)
  bodySmall: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    fontFamily,
  } as TextStyle,

  // Label / Caption (13px / 500 / 16px)
  caption: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 16,
    fontFamily,
  } as TextStyle,

  // Standard Eyebrow / Category Micro-Header (11px, letter-spaced, medium weight, muted)
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily,
  } as TextStyle,

  // Micro-label (e.g. "BED #42", tags, table headers)
  microLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    lineHeight: 13,
    fontFamily,
  } as TextStyle,

  // Tabular Numerics for Healthcare & Currency
  monoDominant: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
    letterSpacing: -0.5,
    fontFamily: monoFamily,
    fontVariant: ["tabular-nums"],
  } as TextStyle,

  monoLarge: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    letterSpacing: -0.2,
    fontFamily: monoFamily,
    fontVariant: ["tabular-nums"],
  } as TextStyle,

  mono: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    fontFamily: monoFamily,
    fontVariant: ["tabular-nums"],
  } as TextStyle,

  monoSmall: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    fontFamily: monoFamily,
    fontVariant: ["tabular-nums"],
  } as TextStyle,

  // Backward compatibility aliases
  display: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 34,
    fontFamily,
  } as TextStyle,
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 26,
    fontFamily,
  } as TextStyle,
} as const;
