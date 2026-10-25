import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  MapPin,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react-native";
import { colors, neuShadows } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, signInWithGoogle, demoLogin } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("Jalandhar");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please fill in your email and password.");
      return;
    }
    if (mode === "register" && (!firstName.trim() || !lastName.trim() || !city.trim())) {
      setErrorMessage("Please fill in all registration fields.");
      return;
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
          city.trim()
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
          "Account already exists for this email. Please sign in with your password below."
        );
      } else if (msg.toLowerCase().includes("invalid login credentials")) {
        setErrorMessage(
          "Incorrect email or password. If you do not have an account, tap 'Register' to create one."
        );
      } else {
        setErrorMessage(
          msg || "Authentication failed. Please verify your credentials."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMessage(err.message || "Google sign-in could not be completed. Please check provider settings.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header & Brand Identity */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <ShieldCheck size={32} color={colors.primary} strokeWidth={2.4} />
            </View>
            <Text style={styles.brandTitle}>NurseBid</Text>
            <Text style={styles.brandSubtitle}>
              Punjab Nursing Council Verified At-Home Clinical Care
            </Text>
          </View>

          {/* Neumorphic Card Container */}
          <View style={[styles.authCard, neuShadows.cardRaised]}>
            {/* Mode Switcher Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, mode === "login" && styles.tabButtonActive]}
                onPress={() => {
                  setMode("login");
                  setErrorMessage(null);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    mode === "login" && styles.tabButtonTextActive,
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  mode === "register" && styles.tabButtonActive,
                ]}
                onPress={() => {
                  setMode("register");
                  setErrorMessage(null);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    mode === "register" && styles.tabButtonTextActive,
                  ]}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message Chip */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={colors.danger} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Form Fields */}
            {mode === "register" && (
              <View style={styles.rowFields}>
                <View style={[styles.fieldContainer, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <View style={styles.inputWrapper}>
                    <User size={16} color={colors.gray400} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Harinder"
                      placeholderTextColor={colors.gray400}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
                <View style={[styles.fieldContainer, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <View style={styles.inputWrapper}>
                    <User size={16} color={colors.gray400} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Grewal"
                      placeholderTextColor={colors.gray400}
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </View>
            )}

            {mode === "register" && (
              <View style={styles.fieldContainer}>
                <Text style={styles.inputLabel}>City (Punjab)</Text>
                <View style={styles.inputWrapper}>
                  <MapPin size={16} color={colors.gray400} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Jalandhar, Ludhiana, Amritsar"
                    placeholderTextColor={colors.gray400}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>
            )}

            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={16} color={colors.gray400} />
                <TextInput
                  style={styles.input}
                  placeholder="patient@example.com"
                  placeholderTextColor={colors.gray400}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={16} color={colors.gray400} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter secure password"
                  placeholderTextColor={colors.gray400}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={16} color={colors.gray400} />
                  ) : (
                    <Eye size={16} color={colors.gray400} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                neuShadows.buttonPrimary,
                loading && styles.btnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>
                    {mode === "login" ? "Sign In to Patient Portal" : "Create Patient Account"}
                  </Text>
                  <ArrowRight size={16} color={colors.white} />
                </>
              )}
            </TouchableOpacity>

            {/* Google OAuth Button */}
            <TouchableOpacity
              style={[styles.googleBtn, { marginTop: 16 }, googleLoading && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading || googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <>
                  <View style={styles.googleIconBadge}>
                    <Text style={styles.googleIconG}>G</Text>
                  </View>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* 1-Click Demo Patient Access */}
            <TouchableOpacity
              style={[styles.demoBtn, { marginTop: 14 }]}
              onPress={async () => {
                setLoading(true);
                try {
                  await demoLogin();
                } catch (e) {
                  Alert.alert("Demo Error", "Could not sign in to demo account.");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || googleLoading}
              activeOpacity={0.85}
              accessibilityLabel="1-Click Demo Patient Login"
            >
              <View style={styles.demoBtnInner}>
                <View style={styles.demoAvatar}>
                  <Text style={styles.demoAvatarText}>HG</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoName}>Harinder Grewal (Patient Family)</Text>
                  <Text style={styles.demoSub}>
                    1-Click Demo Patient • Model Town, Jalandhar • Protected Escrow
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            


            <View style={{ marginTop: 16 }}>
              <Text style={styles.securityNote}>
                Punjab Nursing Council verified clinicians • Protected Care Deposits
              </Text>
            </View>
          </View>

          {/* Security & Regulatory Compliance Banner */}
          <View style={styles.complianceBox}>
            <ShieldCheck size={16} color={colors.success} />
            <Text style={styles.complianceText}>
              256-bit Encrypted Clinical Records & Protected Care Milestone Security
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
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 4,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },
  authCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.neuBorder,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.neuInset,
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
    lineHeight: 16,
    fontWeight: "600",
  },
  rowFields: {
    flexDirection: "row",
    gap: 10,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray700,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neuInset,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.gray900,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 48,
    marginTop: 6,
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray200,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray400,
    letterSpacing: 0.8,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    height: 46,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  googleIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconG: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563EB",
  },
  googleBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray800,
  },
  securityNote: {
    fontSize: 11,
    color: colors.gray500,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 14,
  },
  complianceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 10,
  },
  complianceText: {
    fontSize: 11,
    color: colors.gray500,
    textAlign: "center",
  },
  demoBtn: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 10,
  },
  demoBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  demoAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  demoAvatarText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 12,
  },
  demoName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray900,
  },
  demoSub: {
    fontSize: 10,
    color: colors.gray500,
    marginTop: 1,
  },
  verifiedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803D",
  },
});
