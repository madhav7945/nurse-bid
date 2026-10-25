import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ENV } from "../config/env";

export const supabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    storageKey: "sb-nurse-auth-token",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
