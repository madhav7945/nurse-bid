// ═══════════════════════════════════════════════════════════════════════════════
// Patient App — Authentication Module (Supabase)
// Handles sign-up, sign-in, sign-out, and session management.
// ═══════════════════════════════════════════════════════════════════════════════

import { Platform } from "react-native";
import { supabase } from "./supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Production Authentication with Supabase


export interface UserProfile {
  id: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  city: string;
  locality: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  onboarding_complete: boolean;
  created_at: string;
}

/**
 * Sign in with Google OAuth.
 */
export async function signInWithGoogle() {
  const origin = typeof window !== "undefined" && window.location ? window.location.origin : undefined;
  const redirectTo = Platform.OS === "web" ? origin : "nursebid://auth/callback";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== "web",
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Ensure a profile exists for the authenticated user (e.g. after Google OAuth or email sign-up).
 */
export async function ensureUserProfile(user: any): Promise<UserProfile> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return existing as UserProfile;
  }

  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
  const nameParts = fullName.trim().split(" ");
  const firstName = nameParts[0] || user.email?.split("@")[0] || "Patient";
  const lastName = nameParts.slice(1).join(" ") || "";
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  const newProfile = {
    id: user.id,
    role: "patient",
    first_name: firstName,
    last_name: lastName,
    email: user.email || "",
    phone: user.phone || null,
    city: "Punjab",
    locality: null,
    avatar_url: avatarUrl,
    is_verified: true,
    onboarding_complete: false,
  };

  try {
    const { data: created } = await supabase
      .from("profiles")
      .upsert(newProfile)
      .select()
      .single();

    if (created) return created as UserProfile;
  } catch (err) {
    console.warn("Profile upsert notice:", err);
  }

  return newProfile as UserProfile;
}

/**
 * Sign up a new patient account.
 */
export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  city: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: `${firstName} ${lastName}`,
        name: `${firstName} ${lastName}`,
        role: "patient",
      },
    },
  });

  if (error) throw error;

  // Update the auto-created profile with patient role and city
  if (data.user) {
    await supabase
      .from("profiles")
      .upsert({
        id: data.user.id,
        role: "patient",
        city,
        first_name: firstName,
        last_name: lastName,
        email,
        is_verified: true,
        onboarding_complete: false,
      });
  }

  return data;
}

/**
 * Sign in with email and password.
 */
export async function signIn(email: string, password: string) {
  try {
    await AsyncStorage.multiRemove([
      "@nursebid_active_user_id",
      "@nursebid_user_id",
      "nursebid_active_user_id",
      "nursebid_demo_bypass",
      "@nursebid_temp_cache",
    ]);
  } catch {}
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign out and clear session.
 */
export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Patient sign out notice:", err);
  }

  try {
    await AsyncStorage.multiRemove([
      "sb-patient-auth-token",
      "nursebid-patient-auth-token",
      "@nursebid_active_user_id",
      "@nursebid_user_id",
      "nursebid_active_user_id",
      "nursebid_patient_profile",
      "nursebid_demo_bypass",
      "@nursebid_temp_cache",
    ]);
  } catch {}

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem("sb-patient-auth-token");
      window.localStorage.removeItem("nursebid-patient-auth-token");
      window.localStorage.removeItem("@nursebid_active_user_id");
      window.localStorage.removeItem("@nursebid_user_id");
    } catch {}
  }
}


/**
 * Get the current authenticated user's profile.
 */
export async function getCurrentUser(): Promise<{
  userId: string;
  profile: UserProfile;
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let userProfile: UserProfile | null = profile as UserProfile;
  if (!userProfile) {
    userProfile = await ensureUserProfile(user);
  }

  return {
    userId: user.id,
    profile: userProfile,
  };
}

/**
 * Get profile by ID (by user UUID).
 */
export async function getProfileById(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}
