// ═══════════════════════════════════════════════════════════════════════════════
// Auth Context — Nurse Mobile App
// Provides authenticated clinician state, registration, license credentials,
// and session management across all nurse screens.
// ═══════════════════════════════════════════════════════════════════════════════

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import * as auth from "../lib/auth";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  nurseId: string | null;
  nurse: { id: string; email?: string } | null;
  user: { id: string; email?: string } | null;
  profile: auth.NurseProfile | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    city: string,
    licenseNumber: string,
    specialization?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<auth.NurseProfile>) => Promise<auth.NurseProfile>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within Nurse AuthProvider");
  return ctx;
}

async function clearAllNursebidUserKeys() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const sessionKeys = allKeys.filter(
      (k) =>
        (k.startsWith("@nursebid_") || k.startsWith("nursebid_")) &&
        !k.includes("_settings_") &&
        !k.includes("_notif_") &&
        !k.includes("_biometrics") &&
        !k.includes("_offline_sync") &&
        !k.includes("_sound")
    );
    if (sessionKeys.length > 0) {
      await AsyncStorage.multiRemove(sessionKeys);
    }
  } catch (e) {
    console.warn("clearAllNursebidUserKeys error:", e);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    isDemoMode: false,
    nurseId: null,
    nurse: null,
    user: null,
    profile: null,
  });

  // Check initial session on boot
  useEffect(() => {
    let cancelled = false;

    // Safety timeout: Never let the app hang on "Loading..." for more than 2 seconds
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        setState((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev));
      }
    }, 2000);

    async function init() {
      try {
        // Fast offline-first check from locally stored session
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!cancelled && user) {
          auth.setActiveBypassNurseId(null);
          const profile = await auth.getNurseProfile(user.id);
          const userObj = { id: user.id, email: user.email };
          clearTimeout(safetyTimer);
          setState({
            isLoading: false,
            isAuthenticated: true,
            isDemoMode: false,
            nurseId: user.id,
            nurse: userObj,
            user: userObj,
            profile,
          });
          return;
        }

        const savedBypassId = await AsyncStorage.getItem("@nursebid_bypass_nurse_id");
        if (!cancelled && savedBypassId) {
          auth.setActiveBypassNurseId(savedBypassId);
          const profile = await auth.getNurseProfile(savedBypassId);
          const userObj = { id: savedBypassId, email: profile?.email || "harpreet.singh@nursebid.health" };
          clearTimeout(safetyTimer);
          setState({
            isLoading: false,
            isAuthenticated: true,
            isDemoMode: true,
            nurseId: savedBypassId,
            nurse: userObj,
            user: userObj,
            profile,
          });
          return;
        }
      } catch (err) {
        console.warn("Auth init error:", err);
      } finally {
        clearTimeout(safetyTimer);
        if (!cancelled) {
          setState((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev));
        }
      }

      if (!cancelled) {
        setState({
          isLoading: false,
          isAuthenticated: false,
          isDemoMode: false,
          nurseId: null,
          nurse: null,
          user: null,
          profile: null,
        });
      }
    }

    init();

    // Listen for auth state changes from Supabase Gotrue
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        if (event === "SIGNED_IN" && session?.user) {
          auth.setActiveBypassNurseId(null);
          const profile = await auth.getNurseProfile(session.user.id);
          const userObj = { id: session.user.id, email: session.user.email };
          setState({
            isLoading: false,
            isAuthenticated: true,
            isDemoMode: false,
            nurseId: session.user.id,
            nurse: userObj,
            user: userObj,
            profile,
          });
        } else if (event === "SIGNED_OUT") {
          auth.setActiveBypassNurseId(null);
          await clearAllNursebidUserKeys();
          setState({
            isLoading: false,
            isAuthenticated: false,
            isDemoMode: false,
            nurseId: null,
            nurse: null,
            user: null,
            profile: null,
          });
        }
      }
    );

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      auth.setActiveBypassNurseId(null);
      await clearAllNursebidUserKeys();
      const { user } = await auth.signIn(email, password);
      const targetId = user?.id;
      const profile = await auth.getNurseProfile(targetId);
      const userObj = user ? { id: user.id, email: user.email } : null;
      setState({
        isLoading: false,
        isAuthenticated: true,
        isDemoMode: false,
        nurseId: user?.id || null,
        nurse: userObj,
        user: userObj,
        profile,
      });
    } catch (err) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw err;
    }
  }, []);

  const demoLogin = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const demoClinicianId = "c7ce8589-3d6f-4909-8bee-c06cdf8fdd48";
      auth.setActiveBypassNurseId(demoClinicianId);
      await AsyncStorage.setItem("@nursebid_bypass_nurse_id", demoClinicianId);
      let profile = await auth.getNurseProfile(demoClinicianId);
      if (!profile) {
        profile = {
          id: demoClinicianId,
          role: "nurse",
          first_name: "Harpreet",
          last_name: "Singh",
          full_name: "Harpreet Singh, RN",
          email: "harpreet.singh@nursebid.health",
          phone: "+91 98765 43210",
          city: "Jalandhar",
          locality: "Model Town",
          avatar_url: null,
          is_verified: true,
          onboarding_complete: true,
          license_number: "PNC-RN-2019-4821",
          license_expiry: "2029-12-31",
          license_state: "Punjab Nursing Council",
          specialization: ["Post-Surgical ICU", "Cardiothoracic Care", "Telemetry"],
          experience_years: 6,
          tier: "Gold",
          trust_score: 96,
          bio: "Punjab Nursing Council accredited registered nurse specializing in post-operative monitoring, aseptic wound care, and bedside patient rehabilitation.",
          bank_account: "HDFC Bank ending 4091",
          upi_id: "harpreet.singh@okaxis",
          created_at: new Date().toISOString(),
        };
      }
      const userObj = { id: demoClinicianId, email: profile.email };
      setState({
        isLoading: false,
        isAuthenticated: true,
        isDemoMode: true,
        nurseId: demoClinicianId,
        nurse: userObj,
        user: userObj,
        profile,
      });
    } catch (err) {
      console.warn("Demo clinician login notice:", err);
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      city: string,
      licenseNumber: string,
      specialization?: string
    ) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        auth.setActiveBypassNurseId(null);
        await clearAllNursebidUserKeys();
        const { user } = await auth.signUp(
          email,
          password,
          firstName,
          lastName,
          city,
          licenseNumber,
          specialization
        );
        const targetId = user?.id;
        const profile = await auth.getNurseProfile(targetId);
        if (specialization && profile) {
          profile.specialization = [specialization];
        }
        const userObj = user ? { id: user.id, email: user.email } : null;
        setState({
          isLoading: false,
          isAuthenticated: true,
          isDemoMode: false,
          nurseId: user?.id || null,
          nurse: userObj,
          user: userObj,
          profile,
        });
      } catch (err) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw err;
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      auth.setActiveBypassNurseId(null);
      await auth.signOut();
      await clearAllNursebidUserKeys();
    } finally {
      auth.setActiveBypassNurseId(null);
      setState({
        isLoading: false,
        isAuthenticated: false,
        isDemoMode: false,
        nurseId: null,
        nurse: null,
        user: null,
        profile: null,
      });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await auth.getNurseProfile();
      setState((prev) => ({ ...prev, profile }));
    } catch (err) {
      console.warn("Nurse profile refresh warning:", err);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<auth.NurseProfile>) => {
    const updated = await auth.updateNurseProfile(updates);
    setState((prev) => ({ ...prev, profile: updated }));
    return updated;
  }, []);

  const deleteAccount = useCallback(async () => {
    const targetNurseId = state.nurseId;
    try {
      if (targetNurseId && !state.isDemoMode) {
        await supabase
          .from("nurse_profiles")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("user_id", targetNurseId);
        await supabase
          .from("profiles")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", targetNurseId);
      }
    } catch (e) {
      console.warn("Delete nurse profile remote update error:", e);
    }
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const userSpecificKeys = allKeys.filter((k) =>
        targetNurseId ? k.includes(targetNurseId) : false
      );
      if (userSpecificKeys.length > 0) {
        await AsyncStorage.multiRemove(userSpecificKeys);
      }
    } catch {}
    await signOut();
  }, [state.nurseId, state.isDemoMode, signOut]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        demoLogin,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
