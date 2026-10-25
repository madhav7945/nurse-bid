// ═══════════════════════════════════════════════════════════════════════════════
// Nurse Mobile App — Centralized Environment Configuration
// Reads from Expo manifest / environment variables with robust fallback guards.
// ═══════════════════════════════════════════════════════════════════════════════

import Constants from "expo-constants";

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isProduction: boolean;
  appName: string;
  appVersion: string;
}

const extra = Constants.expoConfig?.extra ?? {};

export const ENV: EnvConfig = {
  supabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    extra.supabaseUrl ||
    "https://kidlqdjfhovjyzcdvygb.supabase.co",
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    extra.supabaseAnonKey ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZGxxZGpmaG92anl6Y2R2eWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4OTM3MjYsImV4cCI6MjEwMzQ2OTcyNn0.sAQM_5UHd7I3ESTsDNdFT_NearO5PaSSMC2zV0bSaxw",
  isProduction: process.env.NODE_ENV === "production",
  appName: "Nurse Mobile App",
  appVersion: "1.0.0",
};
