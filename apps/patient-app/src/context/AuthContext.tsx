// ═══════════════════════════════════════════════════════════════════════════════
// Auth Context — Patient Mobile App
// Provides authentication state, user profile, and auth actions to all screens.
// Full production Supabase Authentication & persistent session management.
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
import { DEMO_PATIENT_ID, setActiveBypassUserId } from "../lib/api";


interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  user: { id: string; email?: string } | null;
  profile: auth.UserProfile | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    city: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  demoLogin: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
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
        !k.includes("_mask_contact") &&
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
    userId: null,
    user: null,
    profile: null,
  });

  // Check initial session
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
        // Fast local session check from AsyncStorage (no network stall)
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!cancelled && user) {
          setActiveBypassUserId(null);
          let profile = await auth.getProfileById(user.id);
          if (!profile) {
            profile = await auth.ensureUserProfile(user);
          }
          clearTimeout(safetyTimer);
          setState({
            isLoading: false,
            isAuthenticated: true,
            userId: user.id,
            user: { id: user.id, email: user.email },
            profile,
          });
          return;
        }

        const storedBypassId = await AsyncStorage.getItem("@nursebid_active_user_id");
        if (!cancelled && storedBypassId) {
          const profile = await auth.getProfileById(storedBypassId);
          if (profile) {
            setActiveBypassUserId(storedBypassId);
            clearTimeout(safetyTimer);
            setState({
              isLoading: false,
              isAuthenticated: true,
              userId: storedBypassId,
              user: { id: storedBypassId, email: profile.email },
              profile,
            });
            return;
          } else {
            setActiveBypassUserId(null);
            await clearAllNursebidUserKeys();
          }
        }
      } catch (err) {
        console.warn("Patient AuthContext init error:", err);
      } finally {
        clearTimeout(safetyTimer);
        if (!cancelled) {
          setState((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev));
        }
      }
    }

    init();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" && session?.user) {
        setActiveBypassUserId(null);
        let profile = await auth.getProfileById(session.user.id);
        if (!profile) {
          profile = await auth.ensureUserProfile(session.user);
        }
        setState({
          isLoading: false,
          isAuthenticated: true,
          userId: session.user.id,
          user: { id: session.user.id, email: session.user.email },
          profile: profile || null,
        });
      } else if (event === "SIGNED_OUT") {
        setActiveBypassUserId(null);
        await clearAllNursebidUserKeys();
        setState({
          isLoading: false,
          isAuthenticated: false,
          userId: null,
          user: null,
          profile: null,
        });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setActiveBypassUserId(null);
    await clearAllNursebidUserKeys();
    const result = await auth.signIn(email, password);
    let profile = await auth.getProfileById(result.user.id);
    if (!profile) {
      profile = await auth.ensureUserProfile(result.user);
    }
    setState({
      isLoading: false,
      isAuthenticated: true,
      userId: result.user.id,
      user: { id: result.user.id, email: result.user.email },
      profile: profile || null,
    });
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      city: string
    ) => {
      setActiveBypassUserId(null);
      await clearAllNursebidUserKeys();
      await auth.signUp(email, password, firstName, lastName, city);
      await signIn(email, password);
    },
    [signIn]
  );

  const signOutFn = useCallback(async () => {
    try {
      await auth.signOut();
    } catch {}
    setActiveBypassUserId(null);
    await clearAllNursebidUserKeys();
    setState({
      isLoading: false,
      isAuthenticated: false,
      userId: null,
      user: null,
      profile: null,
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await auth.signInWithGoogle();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.userId) return;
    const profile = await auth.getProfileById(state.userId);
    setState((s) => ({ ...s, profile: profile || s.profile }));
  }, [state.userId]);

  const demoLogin = useCallback(async () => {
    // 1. Fetch real seeded demo profile from Supabase
    let profile = await auth.getProfileById(DEMO_PATIENT_ID);
    if (!profile) {
      profile = {
        id: DEMO_PATIENT_ID,
        role: "patient",
        first_name: "Harinder",
        last_name: "Grewal",
        email: "harinder.grewal@example.com",
        city: "Jalandhar",
        locality: "Model Town",
        phone: "+91 98765 43210",
        avatar_url: null,
        is_verified: true,
        onboarding_complete: true,
        created_at: new Date().toISOString(),
      };
    }

    // 2. Wire the active bypass ID into both memory and persistent storage
    await clearAllNursebidUserKeys();
    setActiveBypassUserId(DEMO_PATIENT_ID);
    try {
      await AsyncStorage.setItem("@nursebid_active_user_id", DEMO_PATIENT_ID);
    } catch {}

    setState({
      isLoading: false,
      isAuthenticated: true,
      userId: DEMO_PATIENT_ID,
      user: { id: DEMO_PATIENT_ID, email: profile.email },
      profile,
    });
  }, []);

  const deleteAccount = useCallback(async () => {
    const targetUserId = state.userId;
    try {
      if (targetUserId && targetUserId !== DEMO_PATIENT_ID) {
        await supabase
          .from("profiles")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", targetUserId);
      }
    } catch (e) {
      console.warn("Delete account profile update error:", e);
    }
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const userSpecificKeys = allKeys.filter((k) =>
        targetUserId ? k.includes(targetUserId) : false
      );
      if (userSpecificKeys.length > 0) {
        await AsyncStorage.multiRemove(userSpecificKeys);
      }
    } catch {}
    await signOutFn();
  }, [state.userId, signOutFn]);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signInWithGoogle,
    signUp,
    signOut: signOutFn,
    refreshProfile,
    demoLogin,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
