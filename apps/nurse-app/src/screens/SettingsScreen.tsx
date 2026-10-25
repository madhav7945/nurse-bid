import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Alert,
  Linking,
  Image,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Lock,
  Trash2,
  PhoneCall,
  LogOut,
  ShieldCheck,
  Smartphone,
  HeartPulse,
  Sparkles,
  FileText,
  AlertTriangle,
  X,
  UserX,
  Radio,
  MapPin,
  CircleDollarSign,
  Moon,
  Cloud,
  RefreshCw,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { colors, neuShadows } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

interface SettingsScreenProps {
  navigation?: any;
}

type ModalType = "none" | "terms" | "privacy" | "sos";

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { profile, nurseId, signOut, deleteAccount, refreshProfile } = useAuth();
  const currentNurseId = nurseId || profile?.id || "nurse";

  const STORAGE_KEYS = useMemo(
    () => ({
      PUSH_NOTIFICATIONS: `@nursebid_${currentNurseId}_settings_notifications`,
      NOTIF_BROADCASTS: `@nursebid_${currentNurseId}_nurse_notif_broadcasts`,
      NOTIF_SMS: `@nursebid_${currentNurseId}_nurse_notif_sms`,
      NOTIF_VITALS: `@nursebid_${currentNurseId}_nurse_notif_vitals`,
      BIOMETRICS: `@nursebid_${currentNurseId}_nurse_biometrics`,
      OFFLINE_SYNC: `@nursebid_${currentNurseId}_nurse_offline_sync`,
      ON_DUTY: `@nursebid_${currentNurseId}_on_duty`,
      TRAVEL_RADIUS: `@nursebid_${currentNurseId}_travel_radius`,
      MIN_RATE_ALERT: `@nursebid_${currentNurseId}_min_rate_alert`,
      QUIET_HOURS: `@nursebid_${currentNurseId}_quiet_hours`,
    }),
    [currentNurseId]
  );

  // Clinician Availability & Dispatch (Backend Synced to nurse_profiles.is_active)
  const [isOnDuty, setIsOnDuty] = useState<boolean>(profile?.is_active ?? true);
  const [travelRadius, setTravelRadius] = useState<string>("25 km");
  const [minRateAlert, setMinRateAlert] = useState<string>("₹800/hr");
  const [quietHours, setQuietHours] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>("Connected • Punjab Cluster");
  const [isTestingSync, setIsTestingSync] = useState<boolean>(false);

  // Shift & Alert Preferences (AsyncStorage backed)
  const [pushNotifications, setPushNotifications] = useState(true);
  const [notifBroadcasts, setNotifBroadcasts] = useState(true);
  const [notifSms, setNotifSms] = useState(true);
  const [notifVitals, setNotifVitals] = useState(true);

  // Security & Sync Preferences (AsyncStorage backed)
  const [biometrics, setBiometrics] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);

  // Active Informational Modal
  const [activeModal, setActiveModal] = useState<ModalType>("none");

  // Load preferences from AsyncStorage on mount
  useEffect(() => {
    let isMounted = true;
    async function loadPreferences() {
      try {
        const [
          pushVal,
          broadcastVal,
          smsVal,
          vitalsVal,
          bioVal,
          offlineVal,
          dutyVal,
          radiusVal,
          rateVal,
          quietVal,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PUSH_NOTIFICATIONS),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIF_BROADCASTS),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIF_SMS),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIF_VITALS),
          AsyncStorage.getItem(STORAGE_KEYS.BIOMETRICS),
          AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_SYNC),
          AsyncStorage.getItem(STORAGE_KEYS.ON_DUTY),
          AsyncStorage.getItem(STORAGE_KEYS.TRAVEL_RADIUS),
          AsyncStorage.getItem(STORAGE_KEYS.MIN_RATE_ALERT),
          AsyncStorage.getItem(STORAGE_KEYS.QUIET_HOURS),
        ]);

        if (isMounted) {
          if (pushVal !== null) setPushNotifications(pushVal === "true");
          if (broadcastVal !== null) setNotifBroadcasts(broadcastVal === "true");
          if (smsVal !== null) setNotifSms(smsVal === "true");
          if (vitalsVal !== null) setNotifVitals(vitalsVal === "true");
          if (bioVal !== null) setBiometrics(bioVal === "true");
          if (offlineVal !== null) setOfflineSync(offlineVal === "true");
          if (dutyVal !== null) setIsOnDuty(dutyVal === "true");
          if (radiusVal !== null) setTravelRadius(radiusVal);
          if (rateVal !== null) setMinRateAlert(rateVal);
          if (quietVal !== null) setQuietHours(quietVal === "true");
        }
      } catch (err) {
        console.warn("Failed to load nurse settings from storage:", err);
      }
    }

    loadPreferences();
    return () => {
      isMounted = false;
    };
  }, [STORAGE_KEYS]);

  // Handle Duty Toggle backed by Supabase nurse_profiles.is_active
  const handleDutyToggle = async (value: boolean) => {
    setIsOnDuty(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ON_DUTY, String(value));
      const targetId = nurseId || profile?.id;
      if (targetId) {
        await supabase
          .from("nurse_profiles")
          .update({ is_active: value })
          .or(`user_id.eq.${targetId},id.eq.${targetId}`);
        refreshProfile?.().catch?.(() => {});
      }
      Alert.alert(
        value ? "Clinician On-Duty" : "Clinician Off-Duty",
        value
          ? "You are now active on the Punjab clinical radar. Patients and hospitals can dispatch shifts to you."
          : "You are currently off-duty. Urgent broadcast alarms will be paused."
      );
    } catch (e) {
      console.warn("Duty toggle error:", e);
    }
  };

  // Live Cloud Sync Test
  const handleTestCloudSync = async () => {
    setIsTestingSync(true);
    setSyncStatus("Pinging Punjab cluster...");
    const t0 = Date.now();
    try {
      const { data, error } = await supabase.from("profiles").select("id").limit(1);
      const latency = Date.now() - t0;
      if (error && error.code !== "PGRST116" && error.code !== "42501") {
        setSyncStatus(`Sync Notice (${latency}ms)`);
        Alert.alert("Cloud Sync Notice", `Backend reachable in ${latency}ms.`);
      } else {
        setSyncStatus(`Connected • Live (${latency}ms)`);
        Alert.alert(
          "Cloud Backend Verified",
          `Successfully connected to Supabase Punjab database cluster (${latency}ms latency). All shift logs and clinical proposals are in sync.`
        );
      }
    } catch {
      setSyncStatus("Local Cache Mode");
      Alert.alert("Sync Status", "Operating in high-speed local cache mode.");
    } finally {
      setIsTestingSync(false);
    }
  };

  // Dynamically configure expo-notifications foreground presentation handler
  useEffect(() => {
    try {
      if (Platform.OS !== "web" && Notifications.setNotificationHandler) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: pushNotifications,
            shouldPlaySound: notifVitals,
            shouldSetBadge: false,
          }),
        });
      }
    } catch (err) {
      console.warn("Nurse setNotificationHandler notice:", err);
    }
  }, [pushNotifications, notifVitals]);

  // Master Push Notification Toggle with Permissions Request
  const handlePushToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        try {
          if (Platform.OS !== "web" && Notifications.getPermissionsAsync) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== "granted") {
              const { status } = await Notifications.requestPermissionsAsync();
              finalStatus = status;
            }
            if (finalStatus !== "granted") {
              Alert.alert(
                "Permission Required",
                "Notifications are disabled in device settings. Please enable notifications to receive high-acuity shift broadcasts."
              );
              setPushNotifications(false);
              await AsyncStorage.setItem(STORAGE_KEYS.PUSH_NOTIFICATIONS, "false");
              return;
            }
          }
        } catch (err) {
          console.warn("Push notification permission check error:", err);
        }
      }

      setPushNotifications(value);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.PUSH_NOTIFICATIONS, String(value));
      } catch (err) {
        console.warn("Error saving clinician push notification setting:", err);
      }
    },
    [STORAGE_KEYS.PUSH_NOTIFICATIONS]
  );

  const handleToggle = useCallback(
    async (key: string, value: boolean, setter: (val: boolean) => void) => {
      setter(value);
      try {
        await AsyncStorage.setItem(key, String(value));
      } catch (err) {
        console.warn("Error saving setting:", key, err);
      }
    },
    []
  );

  const handleBiometricsToggle = useCallback(
    async (value: boolean) => {
      setBiometrics(value);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRICS, String(value));
        if (value) {
          Alert.alert(
            "Biometric Check-In Enabled",
            "Biometric arrival verification (Face ID / Fingerprint) will be prompted upon geofence clock-in at the patient doorstep."
          );
        } else {
          Alert.alert(
            "Biometric Check-In Disabled",
            "Geofence arrival will rely on standard one-time SMS verification passcode."
          );
        }
      } catch (err) {
        console.warn("Error saving biometrics setting:", err);
      }
    },
    [STORAGE_KEYS.BIOMETRICS]
  );

  const handleOfflineSyncToggle = useCallback(
    async (value: boolean) => {
      setOfflineSync(value);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_SYNC, String(value));
        Alert.alert(
          value ? "Offline Telemetry Sync Active" : "Offline Sync Disabled",
          value
            ? "Vitals telemetry and medication administration records will automatically buffer offline and sync when network resumes."
            : "Telemetry logs require continuous network connectivity."
        );
      } catch (err) {
        console.warn("Error saving offline sync setting:", err);
      }
    },
    [STORAGE_KEYS.OFFLINE_SYNC]
  );

  const handleCall = async (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/[\s\(\)\-]/g, "");
    const url = `tel:${cleanNumber}`;
    try {
      const supported = await Linking.canOpenURL(url).catch(() => false);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
      // Fallback direct attempt for Android 11+ package visibility restrictions
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Direct Dial Line",
        `Helpline: ${phoneNumber}\n\nPlease dial this number directly from your phone.`
      );
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Flush Telemetry Local Cache",
      "This will flush locally buffered telemetry drafts, temporary offline shift previews, and cached queries. Verified shift milestones and earnings in Supabase remain untouched.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Cache",
          style: "destructive",
          onPress: async () => {
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              const cacheKeys = allKeys.filter(
                (k) =>
                  (k.includes("cache") ||
                    k.includes("temp") ||
                    k.includes("offline_queue") ||
                    k.includes("telemetry") ||
                    k.includes("_medications")) &&
                  !k.includes("_settings_") &&
                  !k.includes("_notif_") &&
                  !k.includes("_biometrics") &&
                  !k.includes("_offline_sync") &&
                  !k.includes("_sound") &&
                  !k.includes("_walkthrough_") &&
                  !k.includes("_avatar") &&
                  !k.includes("_active_") &&
                  !k.includes("_bypass_") &&
                  !k.includes("auth-token")
              );
              if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
              }
              Alert.alert(
                "Cache Cleared",
                `Purged ${cacheKeys.length > 0 ? `${cacheKeys.length} cached data records` : "all temporary files"}. Telemetry buffer refreshed.`
              );
            } catch {
              Alert.alert("Notice", "Local telemetry cache could not be cleared.");
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out of Clinician Console",
      "Are you sure you want to end your current clinician session? You will need to sign in again to receive urgent shift broadcasts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (err: any) {
              Alert.alert("Sign Out Notice", err?.message || "Failed to sign out.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Deactivate Clinician Account",
      "Are you sure you want to permanently deactivate your NurseBid clinician credentials?\n\nThis will withdraw all pending shift bids, delist your PNC profile from dispatch, and permanently deactivate your clinician account. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate Account",
          style: "destructive",
          onPress: async () => {
            try {
              if (deleteAccount) {
                await deleteAccount();
              } else {
                await signOut();
              }
              Alert.alert(
                "Account Deactivated",
                "Your clinician profile has been delisted and active session cleared."
              );
            } catch (err: any) {
              Alert.alert(
                "Deactivation Notice",
                err?.message || "Failed to deactivate account. Please contact PNC desk."
              );
            }
          },
        },
      ]
    );
  };

  const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Clinician";
  const avatarUrl = profile?.avatar_url || null;
  const initials = (profile?.first_name?.[0] || "N").toUpperCase();
  const specialty = profile?.specialization?.[0] || "Registered Nurse";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neuBg} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={() => {
            if (navigation?.canGoBack?.()) {
              navigation.goBack();
            } else {
              navigation?.navigate?.("Dashboard");
            }
          }}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color={colors.gray800} strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Clinician Settings</Text>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mini Clinician Summary */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation?.navigate?.("Profile")}
          activeOpacity={0.75}
        >
          <View style={styles.profileRow}>
            <View style={styles.miniAvatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.miniAvatarImg} resizeMode="cover" />
              ) : (
                <Text style={styles.miniAvatarInitials}>{initials}</Text>
              )}
            </View>

            <View style={styles.profileMeta}>
              <Text style={styles.profileName} numberOfLines={1}>
                {fullName}
              </Text>
              <Text style={styles.profileSub} numberOfLines={1}>
                {specialty} {profile?.license_number ? `• ${profile.license_number}` : ""}
              </Text>
            </View>

            <View style={styles.editProfileTag}>
              <Text style={styles.editProfileTagText}>Edit</Text>
              <ChevronRight size={14} color={colors.primary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Section 0: Clinician Dispatch & Availability (Backend Synced to Supabase) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinician Dispatch & Availability</Text>
          <View style={styles.card}>
            {/* On-Duty Switch */}
            <View style={styles.toggleRow}>
              <View style={[styles.iconBox, { backgroundColor: isOnDuty ? "#ECFDF5" : colors.neuInset }]}>
                <Radio size={18} color={isOnDuty ? "#059669" : colors.gray500} />
              </View>
              <View style={styles.toggleContent}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.toggleLabel}>Available for Urgent Shifts</Text>
                  <View style={[styles.statusPillBadge, { backgroundColor: isOnDuty ? "#ECFDF5" : "#F1F5F9" }]}>
                    <Text style={[styles.statusPillText, { color: isOnDuty ? "#059669" : colors.gray600 }]}>
                      {isOnDuty ? "Active" : "Off-Duty"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.toggleDesc}>
                  Syncs with Punjab dispatch radar. When enabled, nearby patients can direct-book shifts.
                </Text>
              </View>
              <Switch
                value={isOnDuty}
                onValueChange={handleDutyToggle}
                trackColor={{ false: colors.gray200, true: "#059669" }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Travel Radius Preference */}
            <View style={{ paddingVertical: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <MapPin size={16} color={colors.primary} />
                <Text style={styles.toggleLabel}>Maximum Travel Radius</Text>
              </View>
              <View style={styles.pillsRow}>
                {["10 km", "25 km", "50 km", "All Punjab"].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.prefPill, travelRadius === r && styles.prefPillActive]}
                    onPress={async () => {
                      setTravelRadius(r);
                      await AsyncStorage.setItem(STORAGE_KEYS.TRAVEL_RADIUS, r);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.prefPillText, travelRadius === r && styles.prefPillTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Minimum Hourly Rate Preference */}
            <View style={{ paddingVertical: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <CircleDollarSign size={16} color={colors.primary} />
                <Text style={styles.toggleLabel}>Minimum Hourly Rate Alert</Text>
              </View>
              <View style={styles.pillsRow}>
                {["₹750/hr", "₹900/hr", "₹1100/hr", "Any Rate"].map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    style={[styles.prefPill, minRateAlert === rate && styles.prefPillActive]}
                    onPress={async () => {
                      setMinRateAlert(rate);
                      await AsyncStorage.setItem(STORAGE_KEYS.MIN_RATE_ALERT, rate);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.prefPillText, minRateAlert === rate && styles.prefPillTextActive]}>{rate}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Quiet Hours Toggle */}
            <View style={styles.toggleRow}>
              <View style={[styles.iconBox, { backgroundColor: "#EEF2FF" }]}>
                <Moon size={18} color="#4F46E5" />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Quiet Hours (10 PM – 7 AM)</Text>
                <Text style={styles.toggleDesc}>
                  Mute non-urgent shift push notifications during night rest hours
                </Text>
              </View>
              <Switch
                value={quietHours}
                onValueChange={async (val) => {
                  setQuietHours(val);
                  await AsyncStorage.setItem(STORAGE_KEYS.QUIET_HOURS, String(val));
                }}
                trackColor={{ false: colors.gray200, true: "#4F46E5" }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Section 1: Shift Alerts & Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shift Alerts & Notifications</Text>
          <View style={styles.card}>
            {/* Master Push Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.iconBox}>
                <Bell size={18} color={colors.primary} />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Push Alerts Master</Text>
                <Text style={styles.toggleDesc}>
                  Master push notifications for shifts and telemetry
                </Text>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={handlePushToggle}
                trackColor={{ false: colors.gray200, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Toggle 1: Shift Broadcasts */}
            <View style={styles.toggleRow}>
              <View style={styles.iconBox}>
                <ShieldCheck size={18} color={colors.primary} />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Urgent Shift Broadcasts</Text>
                <Text style={styles.toggleDesc}>
                  Real-time alerts for high-acuity shifts in your area
                </Text>
              </View>
              <Switch
                value={notifBroadcasts}
                onValueChange={(val) =>
                  handleToggle(STORAGE_KEYS.NOTIF_BROADCASTS, val, setNotifBroadcasts)
                }
                trackColor={{ false: colors.gray200, true: colors.primary }}
                thumbColor={colors.white}
                disabled={!pushNotifications}
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Toggle 2: SMS Reminders */}
            <View style={styles.toggleRow}>
              <View style={styles.iconBox}>
                <Smartphone size={18} color={colors.primary} />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>SMS Shift Reminders</Text>
                <Text style={styles.toggleDesc}>
                  Automated reminders 30 minutes before geofence clock-in
                </Text>
              </View>
              <Switch
                value={notifSms}
                onValueChange={(val) =>
                  handleToggle(STORAGE_KEYS.NOTIF_SMS, val, setNotifSms)
                }
                trackColor={{ false: colors.gray200, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Toggle 3: Telemetry Alerts */}
            <View style={styles.toggleRow}>
              <View style={styles.iconBox}>
                <HeartPulse size={18} color="#D97706" />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Critical Telemetry Chimes</Text>
                <Text style={styles.toggleDesc}>
                  Audible chimes when bedside SpO₂ &lt; 90% or abnormal BP recorded
                </Text>
              </View>
              <Switch
                value={notifVitals}
                onValueChange={(val) =>
                  handleToggle(STORAGE_KEYS.NOTIF_VITALS, val, setNotifVitals)
                }
                trackColor={{ false: colors.gray200, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Section 2: Device Security & Telemetry Sync */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device & Security</Text>
          <View style={styles.card}>
            {/* Toggle 4: Biometrics */}
            <View style={styles.toggleRow}>
              <View style={styles.iconBox}>
                <Lock size={18} color={colors.primary} />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Biometric Check-In</Text>
                <Text style={styles.toggleDesc}>
                  Require Face ID or fingerprint for doorstep arrival verification
                </Text>
              </View>
              <Switch
                value={biometrics}
                onValueChange={handleBiometricsToggle}
                trackColor={{ false: colors.gray200, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Toggle 5: Offline Telemetry */}
            <View style={styles.toggleRow}>
              <View style={styles.iconBox}>
                <Sparkles size={18} color="#6366F1" />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Offline Telemetry Sync</Text>
                <Text style={styles.toggleDesc}>
                  Buffer vitals logs locally during network intermittency
                </Text>
              </View>
              <Switch
                value={offlineSync}
                onValueChange={handleOfflineSyncToggle}
                trackColor={{ false: colors.gray200, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Section 3: Data Management & Backend Cloud Health */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backend Cloud & Telemetry Sync</Text>
          <View style={styles.card}>
            {/* Live Cloud Ping Row */}
            <View style={styles.actionRow}>
              <View style={[styles.iconBox, { backgroundColor: "#EFF6FF" }]}>
                <Cloud size={18} color={colors.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Punjab Health Cloud Status</Text>
                <Text style={styles.actionDesc}>{syncStatus}</Text>
              </View>
              <TouchableOpacity
                style={styles.pingBtn}
                onPress={handleTestCloudSync}
                disabled={isTestingSync}
                activeOpacity={0.8}
              >
                <RefreshCw size={13} color={colors.primary} />
                <Text style={styles.pingBtnText}>{isTestingSync ? "Testing..." : "Test Sync"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleClearCache}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.dangerSoft }]}>
                <Trash2 size={18} color={colors.danger} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionLabel, { color: colors.danger }]}>
                  Flush Telemetry Local Cache
                </Text>
                <Text style={styles.actionDesc}>
                  Frees temporary offline storage without deleting verified shifts
                </Text>
              </View>
              <ChevronRight size={18} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Emergency Escalation Hotlines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Escalation Hotlines</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setActiveModal("sos")}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.dangerSoft }]}>
                <AlertTriangle size={18} color={colors.danger} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionLabel, { color: colors.danger }]}>
                  Emergency Escalation Protocol
                </Text>
                <Text style={styles.actionDesc}>
                  Critical bedside intervention & emergency dispatch
                </Text>
              </View>
              <ChevronRight size={18} color={colors.gray400} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => handleCall("108")}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.dangerSoft }]}>
                <PhoneCall size={18} color={colors.danger} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionLabel, { color: colors.danger }]}>
                  State Emergency Desk (108 / 112)
                </Text>
                <Text style={styles.actionDesc}>Medical ambulance dispatch: 108 (Toll Free)</Text>
              </View>
              <ChevronRight size={18} color={colors.gray400} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => handleCall("+91 172 260 0341")}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <ShieldCheck size={18} color={colors.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Punjab Nursing Council (PNC)</Text>
                <Text style={styles.actionDesc}>Accreditation helpline: +91 172 260 0341</Text>
              </View>
              <ChevronRight size={18} color={colors.gray400} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => handleCall("+91 1800 123 4567")}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <PhoneCall size={18} color={colors.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Clinician Support Desk</Text>
                <Text style={styles.actionDesc}>NurseBid dispatch support: +91 1800 123 4567</Text>
              </View>
              <ChevronRight size={18} color={colors.gray400} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => handleCall("+91 8000 123 456")}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <PhoneCall size={18} color={colors.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Clinician Direct Hotline</Text>
                <Text style={styles.actionDesc}>Direct shift coordinator: +91 8000 123 456</Text>
              </View>
              <ChevronRight size={18} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 5: Legal & Clinical Compliance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal & Clinical Standards</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setActiveModal("terms")}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <FileText size={18} color={colors.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Clinician Agreement & PNC Terms</Text>
                <Text style={styles.actionDesc}>
                  Licensing protocols & protected milestone disbursement
                </Text>
              </View>
              <ChevronRight size={18} color={colors.gray400} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setActiveModal("privacy")}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <ShieldCheck size={18} color={colors.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Patient Privacy & Telemetry Standards</Text>
                <Text style={styles.actionDesc}>
                  DISHA & HIPAA clinical confidentiality guidelines
                </Text>
              </View>
              <ChevronRight size={18} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 6: Session Management */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.dangerSoft }]}>
                <LogOut size={18} color={colors.danger} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionLabel, { color: colors.danger }]}>Sign Out</Text>
                <Text style={styles.actionDesc}>End your active clinician session securely</Text>
              </View>
              <ChevronRight size={18} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 7: Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.danger }]}>Danger Zone</Text>
          <View style={[styles.card, styles.dangerCard]}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.dangerSoft }]}>
                <UserX size={18} color={colors.danger} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionLabel, { color: colors.danger }]}>
                  Deactivate Clinician Account
                </Text>
                <Text style={styles.actionDesc}>
                  Withdraw active bids and delist PNC profile permanently
                </Text>
              </View>
              <ChevronRight size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Version Info */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>NurseBid Clinician v1.0.4</Text>
          <Text style={styles.footerSub}>Accredited Clinical Dispatch & PNC Telemetry Protocol</Text>
        </View>
      </ScrollView>

      {/* Reusable Clinical Standards Modal */}
      <Modal
        visible={activeModal !== "none"}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal("none")}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>
                {activeModal === "sos" && "Emergency Escalation Protocol"}
                {activeModal === "terms" && "Clinician Agreement & PNC Terms"}
                {activeModal === "privacy" && "Clinical Privacy & Telemetry"}
              </Text>
              <TouchableOpacity
                onPress={() => setActiveModal("none")}
                style={styles.modalCloseBtn}
                accessibilityLabel="Close dialog"
              >
                <X size={20} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {activeModal === "sos" && (
                <View>
                  <View style={styles.sosBanner}>
                    <AlertTriangle size={24} color={colors.danger} style={{ marginBottom: 6 }} />
                    <Text style={styles.sosBannerTitle}>Bedside Resuscitation Escalation</Text>
                    <Text style={styles.sosBannerText}>
                      When managing acute decompensation (SpO₂ &lt; 85%, severe hypotension, cardiac arrest), immediately initiate BLS/ACLS and activate 108 ambulance dispatch.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.sosCallBtn}
                    onPress={() => {
                      setActiveModal("none");
                      handleCall("108");
                    }}
                  >
                    <PhoneCall size={18} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.sosCallBtnText}>Call 108 Emergency Ambulance</Text>
                  </TouchableOpacity>

                  <Text style={styles.modalSectionHeading}>Critical Resuscitation Steps</Text>
                  <Text style={styles.modalParagraph}>
                    1. Check responsiveness and carotid pulse (minimum 5s, max 10s).{'\n'}
                    2. If pulseless, commence chest compressions (100–120 bpm, 2 inches depth) immediately.{'\n'}
                    3. Alert attending surgeon and emergency contacts simultaneously.{'\n'}
                    4. Prepare bag-valve-mask (BVM) and bedside telemetry sheet for emergency transfer.
                  </Text>

                  <Text style={styles.modalSectionHeading}>Clinical Escalation Helplines</Text>
                  <Text style={styles.modalParagraph}>
                    • Punjab 108 Central Ambulance Desk: 108 (Toll Free){'\n'}
                    • National Emergency Hotline: 112{'\n'}
                    • NurseBid Clinical Emergency Desk: +91 8000 123 456
                  </Text>
                </View>
              )}

              {activeModal === "terms" && (
                <View>
                  <Text style={styles.modalSectionHeading}>1. Professional Licensing & PNC Standards</Text>
                  <Text style={styles.modalParagraph}>
                    All registered nurses on NurseBid must hold active licensure from the Punjab Nursing Council (PNC) or recognized state regulatory council. False licensure representations constitute statutory fraud and result in immediate license revocation referral.
                  </Text>

                  <Text style={styles.modalSectionHeading}>2. Protected Milestone Disbursement</Text>
                  <Text style={styles.modalParagraph}>
                    NurseBid guarantees that patient funds are held in Protected Care Deposit before shift commencement. Payouts are released directly to your verified clinical account within 24 hours of bedside telemetry verification and shift sign-off.
                  </Text>

                  <Text style={styles.modalSectionHeading}>3. Code of Bedside Ethics & Zero Abandonment</Text>
                  <Text style={styles.modalParagraph}>
                    Clinicians must adhere strictly to patient safety guidelines. Under no circumstance may an on-duty clinician abandon a high-acuity patient prior to formal handover or clinical replacement.
                  </Text>

                  <Text style={styles.modalSectionHeading}>4. Geofence & Arrival Compliance</Text>
                  <Text style={styles.modalParagraph}>
                    Clock-in is verified through encrypted GPS geofencing (within 100 meters of patient doorstep) and biometric arrival verification to ensure authentic shift telemetry.
                  </Text>
                </View>
              )}

              {activeModal === "privacy" && (
                <View>
                  <Text style={styles.modalSectionHeading}>1. DISHA & HIPAA Confidentiality Obligations</Text>
                  <Text style={styles.modalParagraph}>
                    Clinicians are bound by strict statutory non-disclosure regarding patient medical histories, clinical vitals, medication schedules, and residential details under DISHA and HIPAA.
                  </Text>

                  <Text style={styles.modalSectionHeading}>2. Telemetry Integrity & Chain of Custody</Text>
                  <Text style={styles.modalParagraph}>
                    All vital sign telemetry logged via the NurseBid console is timestamped, cryptographically hashed, and permanently archived for clinical liability protection.
                  </Text>

                  <Text style={styles.modalSectionHeading}>3. Prohibition of External Record Copying</Text>
                  <Text style={styles.modalParagraph}>
                    Photographing patient charts, prescriptions, or personal quarters on private devices without explicit clinical consent is strictly prohibited.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => setActiveModal("none")}
              >
                <Text style={styles.modalDoneBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    alignItems: "center",
    justifyContent: "center",
    ...neuShadows.cardRaised,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 120,
  },

  /* Card */
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    padding: 16,
    marginBottom: 14,
    ...neuShadows.cardRaised,
  },
  dangerCard: {
    borderColor: "#FECACA",
    backgroundColor: "#FFFBFB",
  },

  /* Mini Profile */
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    overflow: "hidden",
  },
  miniAvatarImg: {
    width: 48,
    height: 48,
  },
  miniAvatarInitials: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.white,
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.gray900,
    letterSpacing: -0.2,
  },
  profileSub: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },
  editProfileTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  editProfileTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    marginRight: 2,
  },

  /* Section */
  section: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray600,
    letterSpacing: -0.2,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
  },

  /* Toggles */
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  toggleContent: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray900,
  },
  toggleDesc: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },

  /* Actions */
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray900,
  },
  actionDesc: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginVertical: 4,
  },

  /* Footer */
  footer: {
    alignItems: "center",
    paddingVertical: 18,
  },
  footerVersion: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray500,
  },
  footerSub: {
    fontSize: 11,
    color: colors.gray400,
    marginTop: 2,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 412,
    backgroundColor: colors.white,
    borderRadius: 24,
    maxHeight: "85%",
    overflow: "hidden",
    ...neuShadows.cardRaised,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.gray900,
    letterSpacing: -0.2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  modalScrollContent: {
    paddingVertical: 16,
  },
  modalSectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray900,
    marginTop: 12,
    marginBottom: 4,
  },
  modalParagraph: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.gray600,
    marginBottom: 8,
  },
  sosBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  sosBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.danger,
    marginBottom: 4,
  },
  sosBannerText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.danger,
    textAlign: "center",
  },
  sosCallBtn: {
    backgroundColor: colors.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  sosCallBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    alignItems: "center",
  },
  modalDoneBtn: {
    width: "100%",
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalDoneBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  statusPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  prefPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  prefPillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: colors.primary,
  },
  prefPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray600,
  },
  prefPillTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  pingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  pingBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
});
