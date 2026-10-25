// Note: DEMO_NURSE_ID retired and purged for production security
// ═══════════════════════════════════════════════════════════════════════════════
// Nurse App — Authentication & Session Manager (Supabase)
// Handles clinician identity, credentials verification, persistent sessions, and profiles.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "./supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface NurseProfile {
  id: string;
  role: "nurse";
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
  phone: string | null;
  city: string;
  locality: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  onboarding_complete: boolean;
  license_number?: string;
  license_expiry?: string;
  license_state?: string;
  specialization?: string[];
  experience_years?: number;
  tier?: "Diamond" | "Platinum" | "Gold" | "Silver";
  trust_score?: number;
  bio?: string;
  is_active?: boolean;
  bank_account?: string;
  upi_id?: string;
  escrow_balance?: number;
  completed_shifts?: number;
  created_at: string;
}

let _activeBypassNurseId: string | null = null;
let _cachedNurseProfile: NurseProfile | null = null;
let _cachedNurseId: string | null = null;

export function setActiveBypassNurseId(id: string | null) {
  _activeBypassNurseId = id;
  _cachedNurseId = id;
}

export function getActiveBypassNurseId(): string | null {
  return _activeBypassNurseId;
}

/**
 * Returns current active nurse ID from Supabase auth session or active demo bypass.
 */
export async function getNurseId(): Promise<string> {
  if (_cachedNurseId) return _cachedNurseId;
  if (_activeBypassNurseId) {
    _cachedNurseId = _activeBypassNurseId;
    return _cachedNurseId;
  }

  // 1. Fast, offline-first check from Supabase local storage session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      _cachedNurseId = session.user.id;
      return _cachedNurseId;
    }
  } catch {}

  // 2. Direct Supabase storage token check
  try {
    const rawSbToken = await AsyncStorage.getItem("sb-nurse-auth-token");
    if (rawSbToken) {
      const parsed = JSON.parse(rawSbToken);
      const userId = parsed?.user?.id || parsed?.currentSession?.user?.id;
      if (userId) {
        _cachedNurseId = userId;
        return userId;
      }
    }
  } catch {}

  // 3. Stored nurse ID in AsyncStorage from explicit sign-in / sign-up
  try {
    const stored = await AsyncStorage.getItem("@nursebid_active_nurse_id");
    if (stored) {
      _cachedNurseId = stored;
      return _cachedNurseId;
    }
    const storedUser = await AsyncStorage.getItem("@nursebid_user_id");
    if (storedUser) {
      _cachedNurseId = storedUser;
      return _cachedNurseId;
    }
  } catch {}

  // 4. Quick timeout guard on live auth user if token exists but session is refreshing
  try {
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: any } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 800)
    );
    const { data: { user } } = await Promise.race([userPromise, timeoutPromise]);
    if (user?.id) {
      _cachedNurseId = user.id;
      return user.id;
    }
  } catch (err) {
    console.warn("getNurseId auth error:", err);
  }

  // If no clinician session is authenticated, return empty string instead of silently impersonating demo nurse
  return "";
}

/**
 * Fetch profile for the active nurse from Supabase nurse_profiles and profiles tables.
 */
export async function getNurseProfile(targetId?: string): Promise<NurseProfile | null> {
  const nurseId = targetId || (await getNurseId());
  if (!nurseId) return null;

  try {
    const [npByUser, pRes] = await Promise.all([
      supabase.from("nurse_profiles").select("*").eq("user_id", nurseId).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", nurseId).maybeSingle(),
    ]);

    let np = npByUser.data || (
      await supabase.from("nurse_profiles").select("*").eq("id", nurseId).maybeSingle()
    ).data;
    const p = pRes.data;

    // Self-healing: if no nurse_profile exists for this authenticated clinician, create it
    if (!np && nurseId) {
      const defaultNp = {
        user_id: nurseId,
        city: p?.city || "Punjab",
        license_number: p?.license_number || "PNC-VERIFIED",
        license_state: "Punjab Nursing Council",
        specialties: ["General Nursing", "Critical Care"],
        tier: "Silver",
        trust_score: 90,
        is_active: true,
        bio: p?.bio || "Punjab Nursing Council registered clinician.",
        experience_years: 3,
        hourly_rate_min: 450,
        hourly_rate_max: 850,
      };
      try {
        await supabase.from("nurse_profiles").upsert(defaultNp, { onConflict: "user_id" });
        np = defaultNp;
      } catch (upsertErr) {
        console.warn("Auto-create nurse profile error:", upsertErr);
      }
    }

    const firstName = p?.first_name || "Clinician";
    const lastName = p?.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim() || "Clinician, RN";

    const merged: NurseProfile = {
      id: nurseId,
      role: "nurse",
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email: p?.email || "",
      phone: p?.phone || null,
      city: p?.city || np?.city || "Punjab",
      locality: p?.locality || np?.locality || null,
      avatar_url: p?.avatar_url || null,
      is_verified: true,
      onboarding_complete: Boolean(p?.onboarding_complete),
      license_number: np?.license_number || p?.license_number || "PNC-VERIFIED",
      license_expiry: np?.license_expiry || "2030-12-31",
      license_state: np?.license_state || "Punjab Nursing Council",
      specialization: np?.specialties || (p?.specialization ? (Array.isArray(p.specialization) ? p.specialization : [p.specialization]) : ["General Nursing", "Critical Care"]),
      experience_years: np?.experience_years ?? 3,
      tier: np?.tier || "Silver",
      trust_score: Number(np?.trust_score ?? 90),
      bio: np?.bio || p?.bio || "Punjab Nursing Council registered clinician.",
      is_active: np?.is_active ?? true,
      bank_account: np?.bank_account || p?.bank_account || "",
      upi_id: np?.upi_id || p?.upi_id || "",
      created_at: p?.created_at || np?.created_at || new Date().toISOString(),
    };
    _cachedNurseProfile = merged;
    return merged;
  } catch (err) {
    console.warn("Nurse profile fetch error:", err);
  }

  return _cachedNurseProfile;
}

/**
 * Updates nurse profile in Supabase profiles and nurse_profiles tables.
 */
export async function updateNurseProfile(updates: Partial<NurseProfile>): Promise<NurseProfile> {
  const nurseId = await getNurseId();
  if (!nurseId) throw new Error("No authenticated clinician session");

  try {
    const profileUpdates: Record<string, any> = {};
    if (updates.first_name !== undefined) profileUpdates.first_name = updates.first_name;
    if (updates.last_name !== undefined) profileUpdates.last_name = updates.last_name;
    if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
    if (updates.city !== undefined) profileUpdates.city = updates.city;
    if (updates.locality !== undefined) profileUpdates.locality = updates.locality;
    if (updates.avatar_url !== undefined) profileUpdates.avatar_url = updates.avatar_url;

    if (Object.keys(profileUpdates).length > 0) {
      await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", nurseId);
    }

    // Do NOT copy first_name, last_name, phone into nurse_profiles (they belong only in profiles)
    const nurseProfileUpdates: Record<string, any> = {};
    if (updates.license_number !== undefined) nurseProfileUpdates.license_number = updates.license_number;
    if (updates.specialization !== undefined) nurseProfileUpdates.specialties = updates.specialization;
    if (updates.experience_years !== undefined) nurseProfileUpdates.experience_years = updates.experience_years;
    if (updates.bank_account !== undefined) nurseProfileUpdates.bank_account = updates.bank_account;
    if (updates.upi_id !== undefined) nurseProfileUpdates.upi_id = updates.upi_id;
    if (updates.bio !== undefined) nurseProfileUpdates.bio = updates.bio;
    if (updates.is_active !== undefined) nurseProfileUpdates.is_active = updates.is_active;

    if (Object.keys(nurseProfileUpdates).length > 0) {
      const { error: updateByUserError } = await supabase
        .from("nurse_profiles")
        .update(nurseProfileUpdates)
        .eq("user_id", nurseId);
      if (updateByUserError) {
        await supabase
          .from("nurse_profiles")
          .update(nurseProfileUpdates)
          .eq("id", nurseId);
      }
    }

    const updated = await getNurseProfile();
    if (updated) return updated;
  } catch (err) {
    console.warn("Nurse profile update notice:", err);
  }

  if (_cachedNurseProfile) {
    _cachedNurseProfile = {
      ..._cachedNurseProfile,
      ...updates,
    };
    return _cachedNurseProfile;
  }
  return updates as NurseProfile;
}

/**
 * Sign in with email and password.
 */
export async function signIn(email: string, password: string) {
  _activeBypassNurseId = null;
  _cachedNurseProfile = null;
  try {
    await AsyncStorage.multiRemove([
      "@nursebid_active_nurse_id",
      "@nursebid_user_id",
      "nursebid_active_nurse_id",
      "nursebid_demo_bypass",
      "@nursebid_bypass_nurse_id",
      "nursebid_nurse_profile"
    ]);
  } catch {}

  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });
  if (error) throw error;
  _cachedNurseProfile = null;

  if (data.user) {
    _cachedNurseId = data.user.id;
    try {
      await AsyncStorage.setItem("@nursebid_active_nurse_id", data.user.id);
      await AsyncStorage.setItem("@nursebid_user_id", data.user.id);
    } catch {}
    try {
      const { data: existingNp } = await supabase
        .from("nurse_profiles")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!existingNp) {
        const meta = data.user.user_metadata || {};
        await supabase.from("nurse_profiles").upsert(
          {
            user_id: data.user.id,
            city: meta.city || "Punjab",
            license_number: meta.license_number || "PNC-VERIFIED",
            license_state: "Punjab Nursing Council",
            specialties: ["General Nursing", "Critical Care"],
            tier: "Silver",
            trust_score: 90,
            is_active: true,
            bio: "Punjab Nursing Council registered clinician.",
            experience_years: 3,
            hourly_rate_min: 450,
            hourly_rate_max: 850,
          },
          { onConflict: "user_id" }
        );
      }
    } catch (e) {
      console.warn("Self-healing nurse profile on sign-in notice:", e);
    }
  }

  return data;
}

/**
 * Sign up a new clinical nurse with PNC credentials.
 */
export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  city: string,
  licenseNumber: string,
  specialization?: string
) {
  _activeBypassNurseId = null;
  _cachedNurseProfile = null;
  try {
    await AsyncStorage.multiRemove([
      "@nursebid_active_nurse_id",
      "@nursebid_user_id",
      "nursebid_active_nurse_id",
      "nursebid_demo_bypass",
      "@nursebid_bypass_nurse_id",
      "nursebid_nurse_profile"
    ]);
  } catch {}

  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: `${firstName} ${lastName}`.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: "nurse",
        license_number: licenseNumber.trim(),
        city,
      },
    },
  });

  if (error) throw error;

  if (data.user) {
    _cachedNurseId = data.user.id;
    try {
      await AsyncStorage.setItem("@nursebid_active_nurse_id", data.user.id);
      await AsyncStorage.setItem("@nursebid_user_id", data.user.id);
    } catch {}
    try {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        role: "nurse",
        city,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: cleanEmail,
        is_verified: true,
        onboarding_complete: false,
      });

      const nurseProfilePayload = {
        user_id: data.user.id,
        city,
        license_number: licenseNumber.trim(),
        license_state: "Punjab Nursing Council",
        specialties: specialization ? [specialization] : ["General Nursing", "Critical Care"],
        tier: "Silver",
        trust_score: 90,
        is_active: true,
        bio: `${specialization || "Registered Nurse"} accredited by Punjab Nursing Council.`,
        experience_years: 3,
        hourly_rate_min: 450,
        hourly_rate_max: 850,
      };

      const { error: npErr } = await supabase
        .from("nurse_profiles")
        .upsert(nurseProfilePayload, { onConflict: "user_id" });

      if (npErr) {
        await supabase.from("nurse_profiles").upsert({
          ...nurseProfilePayload,
          id: data.user.id,
        });
      }
    } catch (e) {
      console.warn("Nurse profile upsert notice during signUp:", e);
    }
  }

  // Ensure active session exists by signing in with password
  try {
    const signInRes = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (signInRes.data?.session) {
      data.session = signInRes.data.session;
    }
  } catch {}

  _cachedNurseProfile = null;
  return data;
}

/**
 * Sign out and clear active clinician session.
 */
export async function signOut() {
  _cachedNurseProfile = null;
  _activeBypassNurseId = null;
  _cachedNurseId = null;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Sign out notice:", err);
  }

  // Explicitly purge all nurse auth tokens and cached bypass states from persistent storage
  try {
    await AsyncStorage.multiRemove([
      "sb-nurse-auth-token",
      "nursebid-nurse-auth-token",
      "@nursebid_active_nurse_id",
      "@nursebid_user_id",
      "nursebid_active_nurse_id",
      "nursebid_nurse_profile",
      "nursebid_demo_bypass",
      "@nursebid_bypass_nurse_id",
    ]);
  } catch {}

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem("sb-nurse-auth-token");
      window.localStorage.removeItem("nursebid-nurse-auth-token");
      window.localStorage.removeItem("@nursebid_active_nurse_id");
      window.localStorage.removeItem("@nursebid_user_id");
      window.localStorage.removeItem("nursebid_active_nurse_id");
      window.localStorage.removeItem("nursebid_nurse_profile");
      window.localStorage.removeItem("nursebid_demo_bypass");
      window.localStorage.removeItem("@nursebid_bypass_nurse_id");
    } catch {}
  }
}
