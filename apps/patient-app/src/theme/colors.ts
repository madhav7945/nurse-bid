/**
 * NurseBid Patient App — Blue Design System Tokens
 * Exact match to user specification:
 * - Primary blue: #2E5BFF
 * - Light blue tint: #EAF0FF
 * - Background: #F7F8FA
 * - Dark capsule nav: #0F172A
 */

export const colors = {
  // Brand Primary & Accents
  primary: "#2E5BFF",        // User specified exact primary blue
  primaryDark: "#1E40AF",
  primarySoft: "#EAF0FF",    // User specified exact light blue tint
  primaryPale: "#F4F7FF",
  primaryCard: "#EAF0FF",    // Tinted card background (Card 2 & Questions)
  primaryBorder: "#D6E4FF",
  darkCapsule: "#0F172A",    // Dark navy/black floating capsule nav
  trustBlue: "#2563EB",      // Clinical trust blue

  // Semantic Status
  success: "#10B981",        // Emerald
  successSoft: "#ECFDF5",
  successBorder: "#A7F3D0",
  emerald50: "#ECFDF5",
  emerald100: "#D1FAE5",
  emerald600: "#059669",
  emerald700: "#047857",
  emerald800: "#065F46",

  warning: "#F59E0B",        // Amber
  warningSoft: "#FFFBEB",
  warningBorder: "#FDE68A",

  danger: "#EF4444",         // Red
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FECACA",

  // Neutrals (Inter/SF Pro style)
  gray900: "#111827",        // Near black headings
  gray800: "#1F2937",        // Dark gray text
  gray700: "#374151",        // Body text
  gray600: "#4B5563",        // Secondary body
  gray500: "#6B7280",        // Muted gray labels
  gray400: "#9CA3AF",        // Light gray placeholder/icons
  gray300: "#D1D5DB",        // Borders
  gray200: "#E5E7EB",        // Hairline card borders
  gray100: "#F0F2F6",        // Soft input & button backgrounds
  gray50: "#F7F8FA",         // App background (#F7F8FA)

  background: "#F7F8FA",
  surface: "#FFFFFF",
  white: "#FFFFFF",
  black: "#000000",
  shadow: "#0F172A",

  // Compatibility aliases
  ink: "#111827",
  inkSoft: "#374151",
  muted: "#6B7280",
  faint: "#9CA3AF",
  disabled: "#D1D5DB",
  line: "#E5E7EB",
  lineSoft: "#F0F2F6",
  surfaceMuted: "#F7F8FA",
  surfaceRaised: "#FFFFFF",
  financial: "#0F766E",
  financialSoft: "#CCFBF1",
  overlay: "rgba(15, 23, 42, 0.48)",

  // Soft Neumorphic & Pillowy Design Tokens (Sk Raju Hossin system)
  neuBg: "#F0F3F8",                  // Soft lavender/blue-gray canvas
  neuSurface: "#FFFFFF",             // Pillowy white raised card surface
  neuSurfaceTint: "#EAF0FF",         // Soft blue-tinted card surface (Card 2)
  neuInset: "#EBF0F8",               // Recessed input & control background
  neuInsetBorder: "rgba(215, 225, 240, 0.8)", // Inset control boundary
  neuBorder: "rgba(226, 234, 245, 0.9)",     // Pillowy card boundary
  neuBorderWhite: "rgba(255, 255, 255, 0.95)", // Top/left ambient rim highlight
  neuBorderGlow: "rgba(46, 91, 255, 0.25)",
} as const;

/**
 * Shared Soft Neumorphic Elevation & Shadow Presets
 */
export const neuShadows = {
  // Pillowy card / large bento tile elevation
  cardRaised: {
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 4,
  },
  // Soft circular action buttons (44x44)
  buttonCircle: {
    shadowColor: "#8492AB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  // Vibrant primary button with colored blue glow
  buttonPrimary: {
    shadowColor: "#2E5BFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 5,
  },
  // Inset recessed controls (subtle depth)
  cardInset: {
    shadowColor: "#8FA0B8",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  subtle: {
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
};

