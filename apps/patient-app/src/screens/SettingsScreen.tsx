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
  Mail,
  LogOut,
  ShieldCheck,
  Smartphone,
  EyeOff,
  Volume2,
  FileText,
  AlertTriangle,
  X,
  UserX,
  Cloud,
  RefreshCw,
  Globe,
  Clock,
  HeartPulse,
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
  const { profile, userId, signOut, deleteAccount } = useAuth();
  const currentUserId = userId || profile?.id || "patient";

  const STORAGE_KEYS = useMemo(
    () => ({
      PUSH_NOTIFICATIONS: `@nursebid_${currentUserId}_settings_notifications`,
      NOTIF_CARE: `@nursebid_${currentUserId}_patient_notif_care`,
      NOTIF_BIDS: `@nursebid_${currentUserId}_patient_notif_bids`,
      NOTIF_SMS: `@nursebid_${currentUserId}_patient_notif_sms`,
      NOTIF_SOUND: `@nursebid_${currentUserId}_patient_notif_sound`,
      BIOMETRICS: `@nursebid_${currentUserId}_patient_biometrics`,
      MASK_CONTACT: `@nursebid_${currentUserId}_patient_mask_contact`,
      EMERGENCY_CONTACT: `@nursebid_${currentUserId}_patient_emergency_contact`,
      PAYOUT_REVIEW_WINDOW: `@nursebid_${currentUserId}_patient_review_window`,
      CLINICIAN_LANGUAGE: `@nursebid_${currentUserId}_patient_clinician_lang`,
    }),
    [currentUserId]
  );

  // Notification Preferences (AsyncStorage backed)
  const [pushNotifications, setPushNotifications] = useState(true);
  const [notifCare, setNotifCare] = useState(true);
  const [notifBids, setNotifBids] = useState(true);
  const [notifSms, setNotifSms] = useState(true);
  const [notifSound, setNotifSound] = useState(true);

  // Security Preferences (AsyncStorage backed)
  const [biometrics, setBiometrics] = useState(true);
  const [maskContact, setMaskContact] = useState(true);

  // Clinical & Payout Preferences (AsyncStorage backed)
  const [emergencyContact, setEmergencyContact] = useState("+91 98765 43210");
  const [reviewWindow, setReviewWindow] = useState("24-Hour Review");
  const [clinicianLanguage, setClinicianLanguage] = useState("Punjabi");

  // Cloud Health Status
  const [syncStatus, setSyncStatus] = useState<string>("Synced with Punjab Care Cloud");
  const [isTestingSync, setIsTestingSync] = useState(false);

  // Active Informational Modal
  const [activeModal, setActiveModal] = useState<ModalType>("none");

  // Load preferences from AsyncStorage on mount
  useEffect(() => {
    let isMounted = true;
    async function loadPreferences() {
      try {
        const [
          pushVal,
          careVal,
          bidsVal,
          smsVal,
          soundVal,
          bioVal,
          maskVal,
          emerVal,
          reviewVal,
          langVal,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PUSH_NOTIFICATIONS),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIF_CARE),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIF_BIDS),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIF_SMS),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIF_SOUND),
          AsyncStorage.getItem(STORAGE_KEYS.BIOMETRICS),
          AsyncStorage.getItem(STORAGE_KEYS.MASK_CONTACT),
          AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACT),
          AsyncStorage.getItem(STORAGE_KEYS.PAYOUT_REVIEW_WINDOW),
          AsyncStorage.getItem(STORAGE_KEYS.CLINICIAN_LANGUAGE),
        ]);

        if (isMounted) {
          if (pushVal !== null) setPushNotifications(pushVal === "true");
          if (careVal !== null) setNotifCare(careVal === "true");
          if (bidsVal !== null) setNotifBids(bidsVal === "true");
          if (smsVal !== null) setNotifSms(smsVal === "true");
          if (soundVal !== null) setNotifSound(soundVal === "true");
          if (bioVal !== null) setBiometrics(bioVal === "true");
          if (maskVal !== null) setMaskContact(maskVal === "true");
          if (emerVal !== null) setEmergencyContact(emerVal);
          if (reviewVal !== null) setReviewWindow(reviewVal);
          if (langVal !== null) setClinicianLanguage(langVal);
        }
      } catch (err) {
        console.warn("Failed to load settings from storage:", err);
      }
    }

    loadPreferences();
    return () => {
      isMounted = false;
    };
  }, [STORAGE_KEYS]);

  // Dynamically configure expo-notifications foreground presentation handler
  useEffect(() => {
    try {
      if (Platform.OS !== "web" && Notifications.setNotificationHandler) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: pushNotifications,
            shouldPlaySound: notifSound,
            shouldSetBadge: false,
          }),
        });
      }
    } catch (err) {
      console.warn("setNotificationHandler notice:", err);
    }
  }, [pushNotifications, notifSound]);

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
                "Notifications are disabled at the system level. Please grant notification access in your device settings to receive instant care alerts."
              );
              setPushNotifications(false);
              await AsyncStorage.setItem(STORAGE_KEYS.PUSH_NOTIFICATIONS, "false");
              return;
            }
          }
        } catch (err) {
          console.warn("Push notification permission check warning:", err);
        }
      }

      setPushNotifications(value);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.PUSH_NOTIFICATIONS, String(value));
      } catch (err) {
        console.warn("Error saving push notification setting:", err);
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
            "Biometric Security Active",
            "Biometric authentication (Face ID / Fingerprint) has been activated for patient record access."
          );
        } else {
          Alert.alert(
            "Biometric Security Disabled",
            "Standard account authentication will be requested on app launch."
          );
        }
      } catch (err) {
        console.warn("Error saving biometrics setting:", err);
      }
    },
    [STORAGE_KEYS.BIOMETRICS]
  );

  const handleMaskContactToggle = useCallback(
    async (value: boolean) => {
      setMaskContact(value);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.MASK_CONTACT, String(value));
        Alert.alert(
          value ? "Privacy Masking Enabled" : "Privacy Masking Disabled",
          value
            ? "Direct phone numbers and exact doorstep address remain masked until your care deposit is secured."
            : "Direct communication numbers will be visible to reviewing clinicians prior to booking confirmation."
        );
      } catch (err) {
        console.warn("Error saving mask contact setting:", err);
      }
    },
    [STORAGE_KEYS.MASK_CONTACT]
  );

  const handleTestCloudSync = async () => {
    setIsTestingSync(true);
    setSyncStatus("Connecting to Punjab Care Cloud...");
    try {
      const start = Date.now();
      const { count, error } = await supabase
        .from("patient_profiles")
        .select("count", { count: "exact", head: true });
      const latency = Date.now() - start;
      if (error) {
        setSyncStatus(`Sync issue: ${error.message.substring(0, 30)}`);
      } else {
        setSyncStatus(`Live • ${latency}ms latency (${count ?? 0} profiles synchronized)`);
      }
    } catch (err: any) {
      setSyncStatus(`Offline (${err?.message || "Check network"})`);
    } finally {
      setIsTestingSync(false);
    }
  };

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

  const handleEmailSupport = async () => {
    const url = "mailto:support@nursebid.com?subject=NurseBid%20Support%20Request";
    try {
      const supported = await Linking.canOpenURL(url).catch(() => false);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Email Support", "Please contact support@nursebid.com directly.");
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Local Cache",
      "This will remove temporary offline assets, query caches, and local drafts. Your account, active care requests, and protected deposits remain completely untouched.",
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
                    k.includes("draft") ||
                    k.includes("_medications")) &&
                  !k.includes("_settings_") &&
                  !k.includes("_notif_") &&
                  !k.includes("_biometrics") &&
                  !k.includes("_mask_contact") &&
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
                `Purged ${cacheKeys.length > 0 ? `${cacheKeys.length} cached data items` : "all temporary files"}. Local performance refreshed.`
              );
            } catch {
              Alert.alert("Notice", "Local cache could not be cleared.");
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of your NurseBid account?",
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
      "Deactivate & Delete Account",
      "Are you sure you want to permanently delete your NurseBid patient account?\n\nThis will cancel open care requests, purge offline telemetry, and permanently deactivate your clinical profile. This action cannot be reversed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
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
                "Your profile has been deactivated and session cleared."
              );
            } catch (err: any) {
              Alert.alert(
                "Deactivation Notice",
                err?.message || "Failed to deactivate account. Please contact support."
              );
            }
          },
        },
      ]
    );
  };

  const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Patient";
  const avatarUrl = profile?.avatar_url || null;
  const initials = (profile?.first_name?.[0] || "P").toUpperCase();

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

        <Text style={styles.headerTitle}>Settings</Text>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mini Profile Summary */}
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
              <Text style={styles.profileEmail} numberOfLines={1}>
                {profile?.email || "Account Profile"}
              </Text>
            </View>

            <View style={styles.editProfileTag}>
              <Text style={styles.editProfileTagText}>Edit</Text>
              <ChevronRight size={14} color={colors.primary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Section 1: Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications & Alerts</Text>
          <View style={styles.card}>
            {/* Master Push Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.iconBox}>
                <Bell size={18} color={colors.primary} />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Push Notifications</Text>
                <Text style={styles.toggleDesc}>
                  Master toggle for all device push notifications
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

            {/* Toggle: Care Updates */}
            <View style={styles.toggleRow}>
              <View style={styles.iconBox}>
                <ShieldCheck size={18} color={colors.primary} />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Care & Shift Updates</Text>
                <Text style={styles.toggleDesc}>
                  Alerts when clinician arrives or logs bedside vitals
                </Text>
              </View>
              <Switch
                value={notifCare}
                onValueChange={(val) =>
                  handleToggle(STORAGE_KEYS.NOTIF_CARE, val, setNotifCare)
                }
                trackColor={{ false: colors.gray200, true: colors.primary }}
                thumbColor={colors.white}
                disabled={!pushNotifications}
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Toggle: Bid Proposals */}
            <View style={styles.toggleRow}>
              <View style={styles.iconBox}>
                <Bell size={18} color={colors.primary} />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Bid Proposals</Text>
                <Text style={styles.toggleDesc}>
                  Alerts when nurses submit bids on care requests
                </Text>
              </View>
              <Switch
                value={notifBids}
                onValueChange={(val) =>
                  handleToggle(STORAGE_KEYS.NOTIF_BIDS, val, setNotifBids)
                }
                trackColor={{ false: colors.gray200, true: colors.primary }}
                thumbColor={colors.white}
                disabled={!pushNotifications}
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Toggle: SMS Reminders */}
            <View style={styles.toggleRow}>
              <View style={styles.iconBox}>
                <Smartphone size={18} color={colors.primary} />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>SMS Notifications</Text>
                <Text style={styles.toggleDesc}>
                  Automated text reminders for upcoming shifts
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

            {/* Toggle: Sound Alerts */}
            <View style={styles.toggleRow}>
              <View style={styles.iconBox}>
                <Volume2 size={18} color={colors.primary} />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Audible Alert Chimes</Text>
                <Text style={styles.toggleDesc}>
                  Sound notification for vital sign updates and messages
                </Text>
              </View>
              <Switch
                value={notifSound}
                onValueChange={(val) =>
                  handleToggle(STORAGE_KEYS.NOTIF_SOUND, val, setNotifSound)
                }
                trackColor={{ false: colors.gray200, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Section 2: Security & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>
          <View style={styles.card}>
            {/* Toggle: Biometrics */}
            <View style={styles.toggleRow}>
              <View style={styles.iconBox}>
                <Lock size={18} color={colors.primary} />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Biometric App Lock</Text>
                <Text style={styles.toggleDesc}>
                  Require Face ID or fingerprint to open app
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

            {/* Toggle: Mask Contact */}
            <View style={styles.toggleRow}>
              <View style={styles.iconBox}>
                <EyeOff size={18} color={colors.primary} />
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Mask Contact Info</Text>
                <Text style={styles.toggleDesc}>
                  Keep phone number private until booking is confirmed
                </Text>
              </View>
              <Switch
                value={maskContact}
                onValueChange={handleMaskContactToggle}
                trackColor={{ false: colors.gray200, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Section: Care Preferences & Quality Safeguards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Care Preferences & Safeguards</Text>
          <View style={styles.card}>
            {/* Emergency Escalation Contact */}
            <View style={{ paddingVertical: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <HeartPulse size={16} color={colors.primary} />
                  <Text style={styles.toggleLabel}>Emergency Escalation Contact</Text>
                </View>
                <View style={[styles.statusPillBadge, { backgroundColor: "#EFF6FF" }]}>
                  <Text style={[styles.statusPillText, { color: colors.primary }]}>{emergencyContact}</Text>
                </View>
              </View>
              <Text style={styles.toggleDesc}>
                Secondary family contact automatically alerted if vital telemetry flags abnormal critical values
              </Text>
            </View>

            <View style={styles.rowDivider} />

            {/* Milestone Deposit Review Window */}
            <View style={{ paddingVertical: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Clock size={16} color={colors.primary} />
                <Text style={styles.toggleLabel}>Milestone Deposit Review Window</Text>
              </View>
              <Text style={[styles.toggleDesc, { marginBottom: 10 }]}>
                Hold window before shift deposit is auto-released to clinician upon shift sign-off
              </Text>
              <View style={styles.pillsRow}>
                {["Instant", "24-Hour Review", "48-Hour Review"].map((w) => (
                  <TouchableOpacity
                    key={w}
                    style={[styles.prefPill, reviewWindow === w && styles.prefPillActive]}
                    onPress={async () => {
                      setReviewWindow(w);
                      await AsyncStorage.setItem(STORAGE_KEYS.PAYOUT_REVIEW_WINDOW, w);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.prefPillText, reviewWindow === w && styles.prefPillTextActive]}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Clinician Language Preference */}
            <View style={{ paddingVertical: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Globe size={16} color={colors.primary} />
                <Text style={styles.toggleLabel}>Clinician Language Preference</Text>
              </View>
              <Text style={[styles.toggleDesc, { marginBottom: 10 }]}>
                Prioritizes clinician dispatch matching your family's daily spoken language
              </Text>
              <View style={styles.pillsRow}>
                {["Punjabi", "Hindi", "English"].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.prefPill, clinicianLanguage === lang && styles.prefPillActive]}
                    onPress={async () => {
                      setClinicianLanguage(lang);
                      await AsyncStorage.setItem(STORAGE_KEYS.CLINICIAN_LANGUAGE, lang);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.prefPillText, clinicianLanguage === lang && styles.prefPillTextActive]}>{lang}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Section 3: Backend Cloud & Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backend Cloud & Telemetry</Text>
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
                <Text style={styles.actionLabel}>Clear Local Cache</Text>
                <Text style={styles.actionDesc}>
                  Frees up offline memory without affecting active bookings
                </Text>
              </View>
              <ChevronRight size={18} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Help, Emergency & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
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
                  Emergency SOS Protocol
                </Text>
                <Text style={styles.actionDesc}>
                  Immediate ambulance dispatch & clinical escalation
                </Text>
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
                <Text style={styles.actionLabel}>24/7 Care Hotline</Text>
                <Text style={styles.actionDesc}>Toll-free: +91 1800 123 4567</Text>
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
                <Text style={styles.actionLabel}>Clinician Dispatch Desk</Text>
                <Text style={styles.actionDesc}>Direct helpline: +91 8000 123 456</Text>
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
                  Medical Emergency (108)
                </Text>
                <Text style={styles.actionDesc}>State emergency ambulance dispatch</Text>
              </View>
              <ChevronRight size={18} color={colors.gray400} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleEmailSupport}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <Mail size={18} color={colors.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Email Support</Text>
                <Text style={styles.actionDesc}>support@nursebid.com</Text>
              </View>
              <ChevronRight size={18} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 5: Legal & Compliance */}
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
                <Text style={styles.actionLabel}>Terms of Clinical Service</Text>
                <Text style={styles.actionDesc}>
                  Punjab Nursing Council oversight & protected custody terms
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
                <Text style={styles.actionLabel}>Privacy & Telemetry Policy</Text>
                <Text style={styles.actionDesc}>
                  DISHA & HIPAA clinical confidentiality standards
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
                <Text style={styles.actionDesc}>End your active session securely</Text>
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
                  Deactivate & Delete Account
                </Text>
                <Text style={styles.actionDesc}>
                  Permanently delete clinical history and profile
                </Text>
              </View>
              <ChevronRight size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Version Info */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>NurseBid Patient v1.0.4</Text>
          <Text style={styles.footerSub}>Secure Healthcare Protocol • DISHA & HIPAA Certified</Text>
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
                {activeModal === "sos" && "Emergency SOS Protocol"}
                {activeModal === "terms" && "Terms of Clinical Service"}
                {activeModal === "privacy" && "Privacy & Telemetry Policy"}
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
                    <Text style={styles.sosBannerTitle}>Critical Clinical Escalation</Text>
                    <Text style={styles.sosBannerText}>
                      For life-threatening crises (cardiac arrest, severe respiratory distress, unresponsiveness), immediately dial state emergency dispatch.
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

                  <Text style={styles.modalSectionHeading}>Emergency Hotlines</Text>
                  <Text style={styles.modalParagraph}>
                    • National Emergency Services: 112{'\n'}
                    • Punjab State Health Helpline: 104{'\n'}
                    • NurseBid Emergency Care Escalation Desk: +91 8000 123 456
                  </Text>

                  <Text style={styles.modalSectionHeading}>Bedside Precautionary Guidelines</Text>
                  <Text style={styles.modalParagraph}>
                    1. Maintain clear airway and place patient in recovery position if unconscious.{'\n'}
                    2. Check telemetry vitals (SpO₂, Blood Pressure, Heart Rate) and prepare hospital discharge summary.{'\n'}
                    3. Do not administer oral liquids to semi-conscious or convulsing patients.
                  </Text>
                </View>
              )}

              {activeModal === "terms" && (
                <View>
                  <Text style={styles.modalSectionHeading}>1. Clinical Dispatch & Accreditations</Text>
                  <Text style={styles.modalParagraph}>
                    NurseBid connects patients with registered nurses and clinical attendants accredited by the Punjab Nursing Council (PNC) or equivalent state statutory boards. All clinicians undergo credential verification, criminal record screening, and bedside clinical background checks.
                  </Text>

                  <Text style={styles.modalSectionHeading}>2. Protected Care Deposit (Milestone Security)</Text>
                  <Text style={styles.modalParagraph}>
                    To safeguard both families and caregivers, service payments are secured as a Protected Care Deposit. Funds remain locked in milestone custody until the shift is completed, telemetry vitals are logged, and the patient or family signs off on the completed shift.
                  </Text>

                  <Text style={styles.modalSectionHeading}>3. Shift Cancellations & Clinical Continuity</Text>
                  <Text style={styles.modalParagraph}>
                    Care requests may be cancelled free of charge up to 2 hours prior to scheduled shift commencement. In the rare event of caregiver illness, the NurseBid dispatch desk immediately initiates backup matching with equivalent clinical competencies.
                  </Text>

                  <Text style={styles.modalSectionHeading}>4. Emergency Medical Disclaimer</Text>
                  <Text style={styles.modalParagraph}>
                    NurseBid provides private duty nursing and bedside convalescent care. It does not replace tertiary emergency hospital care. In acute life-threatening situations, dial 108 or transfer the patient to an ICU facility immediately.
                  </Text>
                </View>
              )}

              {activeModal === "privacy" && (
                <View>
                  <Text style={styles.modalSectionHeading}>1. DISHA & HIPAA Health Data Standard</Text>
                  <Text style={styles.modalParagraph}>
                    NurseBid enforces strict clinical privacy governed by the Digital Information Security in Healthcare Act (DISHA) and international HIPAA privacy principles. All patient medical data, diagnostic files, and vitals telemetry remain strictly confidential.
                  </Text>

                  <Text style={styles.modalSectionHeading}>2. Privacy-Preserving Contact Masking</Text>
                  <Text style={styles.modalParagraph}>
                    To protect patient dignity and security, direct telephone numbers and residential house numbers are automatically masked from bidding caregivers until a formal booking deposit is funded.
                  </Text>

                  <Text style={styles.modalSectionHeading}>3. End-to-End Encryption of Telemetry</Text>
                  <Text style={styles.modalParagraph}>
                    Blood pressure readings, SpO₂ telemetry, blood glucose levels, and bedside notes are encrypted using 256-bit AES encryption both in transit and at rest in Supabase infrastructure.
                  </Text>

                  <Text style={styles.modalSectionHeading}>4. Zero Commercial Data Brokering</Text>
                  <Text style={styles.modalParagraph}>
                    We never sell, rent, or trade patient telemetry or prescription records to pharmaceutical corporations, insurers, or third-party advertising networks.
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
    ...neuShadows.buttonCircle,
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
  profileEmail: {
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
