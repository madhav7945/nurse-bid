/**
 * NurseBid Nurse App — Soft Neumorphic Design System Tokens
 * Aligned 1:1 with Patient App and Clean Enterprise Standards
 */

export const colors = {
  // Brand Primary & Accents
  primary: "#2E5BFF",          // Clinical Trust Blue
  primaryDark: "#1E40AF",
  primarySoft: "#EAF0FF",      // Light blue tint
  primaryPale: "#F4F7FF",
  primaryCard: "#EAF0FF",      // Tinted card background
  primaryBorder: "#D6E4FF",
  darkCapsule: "#0F172A",      // Dark navy/black floating capsule nav
  trustBlue: "#2563EB",        // Clinical trust blue
  tealClinical: "#0D9488",

  // Semantic Status
  success: "#10B981",          // Emerald
  successSoft: "#ECFDF5",
  successBorder: "#A7F3D0",

  warning: "#F59E0B",          // Amber
  warningSoft: "#FFFBEB",
  warningBorder: "#FDE68A",

  danger: "#EF4444",           // Red
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FECACA",

  info: "#06B6D4",             // Cyan info
  infoSoft: "#CFFAFE",
  infoBorder: "#BAE6FD",

  diamond: "#38BDF8",
  diamondSoft: "#E0F2FE",
  gold: "#F59E0B",

  // Neutrals (Inter/SF Pro style)
  gray900: "#111827",          // Near black headings
  gray800: "#1F2937",          // Dark gray text
  gray700: "#374151",          // Body text
  gray600: "#4B5563",          // Secondary body
  gray500: "#6B7280",          // Muted gray labels
  gray400: "#9CA3AF",          // Light gray placeholder/icons
  gray300: "#D1D5DB",          // Borders
  gray200: "#E5E7EB",          // Hairline card borders
  gray100: "#F0F2F6",          // Soft input & button backgrounds
  gray50: "#F7F8FA",           // Base canvas (#F7F8FA)

  background: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  surfaceBlue: "#EAF0FF",
  surfaceDark: "#0F172A",
  surfaceInk: "#0B132B",
  white: "#FFFFFF",
  black: "#000000",
  shadow: "#0F172A",

  // Compatibility aliases
  ink: "#0F172A",
  inkSoft: "#334155",
  muted: "#64748B",
  faint: "#94A3B8",
  disabled: "#D1D5DB",
  line: "#E2E8F0",
  lineSoft: "#EDF2F7",
  surfaceMuted: "#F7F8FA",
  financial: "#0F766E",
  financialSoft: "#CCFBF1",
  overlay: "rgba(15, 23, 42, 0.55)",
  tabBar: "#FFFFFF",
  tabInactive: "#94A3B8",

  // Soft Neumorphic & Pillowy Design Tokens
  neuBg: "#F0F3F8",                    // Soft lavender/blue-gray canvas
  neuSurface: "#FFFFFF",               // Pillowy white raised card surface
  neuSurfaceTint: "#EAF0FF",           // Soft blue-tinted card surface
  neuInset: "#EBF0F8",                 // Recessed input & control background
  neuInsetBorder: "rgba(215, 225, 240, 0.8)", // Inset control boundary
  neuBorder: "rgba(226, 234, 245, 0.9)",       // Pillowy card boundary
  neuBorderWhite: "rgba(255, 255, 255, 0.95)", // Top/left ambient rim highlight
  neuBorderGlow: "rgba(46, 91, 255, 0.25)",
  cardBorder: "#EDF2F7",
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
  card: {
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 4,
  },
  cardElevated: {
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
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
};
