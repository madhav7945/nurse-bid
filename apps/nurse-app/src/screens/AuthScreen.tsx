// ═══════════════════════════════════════════════════════════════════════════════
// Clinician Authentication & Accreditation Screen — Nurse Mobile App
// Strictly adheres to Clean Enterprise Architecture & Soft-Neumorphic Standards:
// - Professional clinical trust blues & muted health emeralds
// - Tactile soft-neumorphic card surfaces with subtle perimeter borders
// - Live Supabase sign-in, accreditation registration, and 1-click verified demo
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  Eye,
  EyeOff,
  FileBadge2,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react-native";
import { colors, neuShadows } from "../theme/colors";
import { layout } from "../theme/spacing";
import { useAuth } from "../context/AuthContext";

const SPECIALIZATIONS = [
  "Cardiothoracic Step-Down (Post-CABG)",
  "Critical Respiratory Care (Tracheostomy)",
  "Post-Surgical ICU Recovery",
  "Wound Care & Staging (Diabetic Ulcer)",
  "Elderly Geriatric & Telemetry",
];

const PUNJAB_CITIES = ["Jalandhar", "Ludhiana", "Amritsar", "Mohali / Chandigarh"];

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, demoLogin } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialization, setSpecialization] = useState(SPECIALIZATIONS[0]);
  const [city, setCity] = useState("Jalandhar");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDemoLogin = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      await demoLogin();
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Demo sign-in could not be completed. Please check connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (mode === "register") {
      if (!firstName.trim() || !lastName.trim() || !licenseNumber.trim()) {
        setErrorMessage("Please complete all clinician verification fields.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        await signUp(
          email.trim(),
          password,
          firstName.trim(),
          lastName.trim(),
          city,
          licenseNumber.trim(),
          specialization
        );
      }
    } catch (err: any) {
      const msg = err?.message || String(err || "");
      if (
        mode === "register" &&
        (msg.toLowerCase().includes("already registered") ||
          msg.toLowerCase().includes("already exists") ||
          err?.code === "user_already_exists")
      ) {
        setMode("login");
        setErrorMessage(
          "Account already registered for this email. Please sign in with your password below."
        );
      } else if (msg.toLowerCase().includes("invalid login credentials")) {
        setErrorMessage(
          "Incorrect email or password. If you do not have an account, tap 'Accreditation Register' above."
        );
      } else {
        setErrorMessage(
          msg || "Authentication could not be completed. Please verify credentials."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Clinician Identity Header ─── */}
          <View style={styles.header}>
            <View style={styles.brandIconContainer}>
              <Stethoscope size={28} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.brandTitle}>NurseBid Clinician</Text>
            <Text style={styles.brandSubtitle}>
              Punjab Nursing Council Verified Clinical Operations
            </Text>

            <View style={styles.accreditationPill}>
              <ShieldCheck size={13} color={colors.success} />
              <Text style={styles.accreditationText}>
                Official PNC & INC Registered Nurse Portal
              </Text>
            </View>
          </View>

          {/* ─── Mode Segmented Switch ─── */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                mode === "login" && styles.segmentButtonActive,
              ]}
              onPress={() => {
                setMode("login");
                setErrorMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  mode === "login" && styles.segmentTextActive,
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                mode === "register" && styles.segmentButtonActive,
              ]}
              onPress={() => {
                setMode("register");
                setErrorMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  mode === "register" && styles.segmentTextActive,
                ]}
              >
                Accreditation Register
              </Text>
            </TouchableOpacity>
          </View>

          {/* ─── Error Alert Banner ─── */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <AlertCircle size={15} color={colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* ─── Tactile Form Card ─── */}
          <View style={styles.formCard}>
            {mode === "register" ? (
              <>
                <View style={styles.nameRow}>
                  <View style={[styles.fieldWrap, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>First Name</Text>
                    <View style={styles.inputContainer}>
                      <User size={15} color={colors.gray400} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Harpreet"
                        placeholderTextColor={colors.gray400}
                        value={firstName}
                        onChangeText={setFirstName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={[styles.fieldWrap, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Last Name</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Singh"
                        placeholderTextColor={colors.gray400}
                        value={lastName}
                        onChangeText={setLastName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                </View>

                {/* Nursing Council License Number */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>INC / PNC License Number</Text>
                  <View style={styles.inputContainer}>
                    <FileBadge2 size={15} color={colors.primary} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="INC RN-889104"
                      placeholderTextColor={colors.gray400}
                      value={licenseNumber}
                      onChangeText={setLicenseNumber}
                      autoCapitalize="characters"
                    />
                  </View>
                  <Text style={styles.helperText}>
                    Cross-referenced with Punjab Nursing Council registry
                  </Text>
                </View>

                {/* Primary Clinical Specialization */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Primary Clinical Specialization</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.specChipsRow}
                  >
                    {SPECIALIZATIONS.map((spec) => (
                      <TouchableOpacity
                        key={spec}
                        style={[
                          styles.specChip,
                          specialization === spec && styles.specChipActive,
                        ]}
                        onPress={() => setSpecialization(spec)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.specChipText,
                            specialization === spec && styles.specChipTextActive,
                          ]}
                        >
                          {spec}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Clinical Operational City */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Operating Region (Punjab)</Text>
                  <View style={styles.cityChipsRow}>
                    {PUNJAB_CITIES.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.cityChip,
                          city === c && styles.cityChipActive,
                        ]}
                        onPress={() => setCity(c)}
                        activeOpacity={0.75}
                      >
                        <MapPin
                          size={11}
                          color={city === c ? colors.primary : colors.gray500}
                        />
                        <Text
                          style={[
                            styles.cityChipText,
                            city === c && styles.cityChipTextActive,
                          ]}
                        >
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            ) : null}

            {/* Email Address Field */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Registered Email</Text>
              <View style={styles.inputContainer}>
                <Mail size={15} color={colors.gray400} />
                <TextInput
                  style={styles.textInput}
                  placeholder="nurse.name@punjabnurse.org"
                  placeholderTextColor={colors.gray400}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={15} color={colors.gray400} />
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="Enter strong password"
                  placeholderTextColor={colors.gray400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={16} color={colors.gray500} />
                  ) : (
                    <Eye size={16} color={colors.gray500} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Action Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {mode === "login"
                      ? "Sign In to Clinician Console"
                      : "Register Verified Clinician"}
                  </Text>
                  <ArrowRight size={16} color={colors.white} />
                </>
              )}
            </TouchableOpacity>

            {/* 1-Click Verified Demo Clinician Access */}
            <TouchableOpacity
              style={styles.demoButton}
              onPress={handleDemoLogin}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityLabel="1-Click Demo Verified Clinician Login"
            >
              <View style={styles.demoBtnInner}>
                <View style={styles.demoAvatar}>
                  <Text style={styles.demoAvatarText}>HS</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.demoTitleRow}>
                    <Text style={styles.demoName}>Harpreet Singh, RN</Text>
                    <View style={styles.verifiedBadge}>
                      <CheckCircle2 size={10} color={colors.success} />
                      <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
                    </View>
                  </View>
                  <Text style={styles.demoSub}>
                    1-Click Demo Clinician • PNC-RN-2019-4821 • Gold Tier
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Accreditation Notice */}
            <View style={{ marginTop: 4, alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: colors.gray500, textAlign: "center", lineHeight: 17 }}>
                Directly registered with the Punjab Nursing Council. Instant credential verification.
              </Text>
            </View>
          </View>

          {/* ─── Security & Protected Care Deposit Guarantee Footer ─── */}
          <View style={styles.securityFooter}>
            <ShieldCheck size={14} color={colors.gray500} />
            <Text style={styles.securityFooterText}>
              All shifts protected by Punjab Nursing Council Protected Balance
              deposits. No platform leakage. 100% telemetry verified payouts.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 32,
    paddingBottom: 48,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  brandIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    marginBottom: 12,
    ...neuShadows.card,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.gray900,
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.gray500,
    textAlign: "center",
    marginTop: 4,
  },
  accreditationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: layout.radiusPill,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  accreditationText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.success,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    padding: 3,
    marginBottom: 18,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 11,
  },
  segmentButtonActive: {
    backgroundColor: colors.white,
    ...neuShadows.card,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
  },
  segmentTextActive: {
    color: colors.gray900,
    fontWeight: "700",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
    fontWeight: "500",
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: layout.radiusCard,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    ...neuShadows.cardRaised,
    gap: 16,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray700,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neuBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: colors.gray900,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 4,
  },
  helperText: {
    fontSize: 11,
    color: colors.gray400,
    marginTop: 2,
  },
  specChipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  specChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: layout.radiusPill,
    backgroundColor: colors.neuBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  specChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  specChipText: {
    fontSize: 11,
    color: colors.gray600,
    fontWeight: "500",
  },
  specChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  cityChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: layout.radiusPill,
    backgroundColor: colors.neuBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cityChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  cityChipText: {
    fontSize: 11,
    color: colors.gray600,
    fontWeight: "500",
  },
  cityChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
    ...neuShadows.card,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray400,
    letterSpacing: 0.5,
  },
  demoButton: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  demoBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  demoAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  demoAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  demoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  demoName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray900,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: layout.radiusPill,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.success,
  },
  demoSub: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 2,
  },
  securityFooter: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 8,
  },
  securityFooterText: {
    flex: 1,
    fontSize: 11,
    color: colors.gray500,
    lineHeight: 16,
  },
});
