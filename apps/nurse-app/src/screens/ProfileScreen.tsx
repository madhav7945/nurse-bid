import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Camera,
  User,
  Mail,
  Phone,
  MapPin,
  Check,
  Edit3,
  X,
  ShieldCheck,
  Settings,
  ChevronRight,
  Award,
  Stethoscope,
  FileText,
  CreditCard,
  Building2,
  Wallet,
  Zap,
  CheckCircle2,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { colors, neuShadows } from "../theme/colors";
import { uploadAvatar } from "../lib/storage";
import { useAuth } from "../context/AuthContext";
import { api, EarningsData } from "../lib/api";
import { AvatarPickerModal } from "../components/ui/AvatarPickerModal";

interface ProfileScreenProps {
  navigation?: any;
  route?: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, route }) => {
  const { profile, nurseId, updateProfile, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [showAvatarPickerModal, setShowAvatarPickerModal] = useState(false);

  // Earnings & Wallet state
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loadingEarnings, setLoadingEarnings] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutUpi, setPayoutUpi] = useState(profile?.upi_id || "");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);

  const [form, setForm] = useState({
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    phone: profile?.phone || "",
    email: profile?.email || "",
    city: profile?.city || "",
    locality: profile?.locality || "",
    licenseNumber: profile?.license_number || "",
    specialization: profile?.specialization?.[0] || "",
    experienceYears: profile?.experience_years ? String(profile.experience_years) : "",
    bio: profile?.bio || "",
    upiId: profile?.upi_id || "",
    bankAccount: profile?.bank_account || "",
  });

  const syncFormFromProfile = useCallback(() => {
    if (profile) {
      setForm({
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        phone: profile.phone || "",
        email: profile.email || "",
        city: profile.city || "",
        locality: profile.locality || "",
        licenseNumber: profile.license_number || "",
        specialization: profile.specialization?.[0] || "",
        experienceYears: profile.experience_years ? String(profile.experience_years) : "",
        bio: profile.bio || "",
        upiId: profile.upi_id || "",
        bankAccount: profile.bank_account || "",
      });
      setAvatarUrl(profile.avatar_url || null);
      if (profile.upi_id) setPayoutUpi(profile.upi_id);
    }
  }, [profile]);

  const loadEarnings = useCallback(async () => {
    try {
      setLoadingEarnings(true);
      const data = await api.getEarnings();
      setEarnings(data);
      if (data?.upiId && !payoutUpi) {
        setPayoutUpi(data.upiId);
      }
    } catch (err) {
      console.warn("Failed to load earnings:", err);
    } finally {
      setLoadingEarnings(false);
    }
  }, [payoutUpi]);

  useEffect(() => {
    syncFormFromProfile();
  }, [syncFormFromProfile]);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", () => {
      refreshProfile().catch(() => {});
      loadEarnings();
    });
    return unsubscribe;
  }, [navigation, refreshProfile, loadEarnings]);

  const handleOpenPayout = () => {
    const avail = earnings?.availableForPayout || 0;
    if (avail <= 0) {
      if ((earnings?.pendingEscrow || 0) > 0) {
        Alert.alert(
          "Protected Funds in Escrow",
          `You have ₹${(earnings?.pendingEscrow || 0).toLocaleString("en-IN")} held in protected client escrow. Once your active shift timesheets are approved, funds automatically move to Available Balance for instant transfer.`
        );
      } else {
        Alert.alert(
          "Zero Available Balance",
          "You currently have no available balance to withdraw. Complete shifts to earn protected payouts."
        );
      }
      return;
    }
    setPayoutAmount(String(avail));
    setPayoutUpi(earnings?.upiId || profile?.upi_id || form.upiId || "");
    setShowPayoutModal(true);
  };

  const handleConfirmPayout = async () => {
    const cleanUpi = payoutUpi.trim();
    if (!cleanUpi) {
      Alert.alert(
        "UPI ID Required",
        "Please enter your UPI ID (e.g. yourname@okhdfcbank or mobile@upi) to disburse funds."
      );
      return;
    }
    if (!cleanUpi.includes("@")) {
      Alert.alert(
        "Invalid UPI ID",
        "UPI ID must include an '@' symbol (e.g. mobile@upi)."
      );
      return;
    }
    const amt = parseInt(payoutAmount, 10);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }
    const maxAmt = earnings?.availableForPayout || 0;
    if (amt > maxAmt) {
      Alert.alert("Exceeds Balance", `Maximum available for withdrawal is ₹${maxAmt.toLocaleString("en-IN")}`);
      return;
    }

    try {
      setIsRequestingPayout(true);
      await api.requestPayout(amt, cleanUpi);
      if (!profile?.upi_id) {
        await updateProfile({ upi_id: cleanUpi }).catch(() => {});
      }
      setShowPayoutModal(false);
      Alert.alert(
        "Instant Transfer Queued",
        `₹${amt.toLocaleString("en-IN")} has been dispatched to ${cleanUpi}. PNC Escrow settlement reference generated.`
      );
      await loadEarnings();
    } catch (err: any) {
      Alert.alert("Transfer Failed", err?.message || "Could not process transfer.");
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const getInitials = (first: string, last: string) => {
    const f = (first || "").trim()[0] || "N";
    const l = (last || "").trim()[0] || "";
    return `${f}${l}`.toUpperCase();
  };

  const handlePickAvatar = () => {
    setShowAvatarPickerModal(true);
  };

  const handleSelectAvatar = async (payload: string) => {
    try {
      setUploadingAvatar(true);
      setAvatarUrl(payload);
      const targetId = nurseId || profile?.id;
      const uploadedUrl = await uploadAvatar(payload, targetId);
      setAvatarUrl(uploadedUrl);
      await updateProfile({ avatar_url: uploadedUrl });
      await refreshProfile();
      Alert.alert("Success", "Clinician portrait updated successfully.");
    } catch (err: any) {
      console.warn("Avatar upload notice:", err);
      // Fallback: update local and profile directly with data URI
      setAvatarUrl(payload);
      await updateProfile({ avatar_url: payload }).catch(() => {});
      Alert.alert("Success", "Clinician portrait updated.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    const trimmedFirst = form.firstName.trim();
    if (!trimmedFirst) {
      Alert.alert("Validation", "First name is required.");
      return;
    }

    try {
      setIsSaving(true);
      const expNumber = parseInt(form.experienceYears, 10);

      await updateProfile({
        first_name: trimmedFirst,
        last_name: form.lastName.trim(),
        phone: form.phone.trim() || null,
        city: form.city.trim() || "Punjab",
        locality: form.locality.trim() || null,
        license_number: form.licenseNumber.trim() || undefined,
        specialization: form.specialization.trim() ? [form.specialization.trim()] : undefined,
        experience_years: isNaN(expNumber) ? 0 : expNumber,
        bio: form.bio.trim() || undefined,
        upi_id: form.upiId.trim() || undefined,
        bank_account: form.bankAccount.trim() || undefined,
      });

      await refreshProfile();
      setIsEditing(false);
      Alert.alert("Profile Updated", "Your clinician credentials have been synchronized.");
    } catch (err: any) {
      console.warn("Profile save error:", err);
      Alert.alert("Save Notice", err?.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    syncFormFromProfile();
    setIsEditing(false);
  };

  const fullName = `${form.firstName} ${form.lastName}`.trim() || "Clinician";
  const tierName = profile?.tier || "Gold";
  const trustScore = profile?.trust_score ?? 96;

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

        <Text style={styles.headerTitle}>Clinician Profile</Text>

        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={() => navigation?.navigate?.("Settings")}
          activeOpacity={0.7}
          accessibilityLabel="Open settings"
        >
          <Settings size={20} color={colors.gray800} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Clinician Identity Card */}
        <View style={styles.card}>
          <View style={styles.identityRow}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarBox, Boolean(avatarUrl) && styles.avatarBoxImage]}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarInitials}>
                    {getInitials(form.firstName, form.lastName)}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.cameraBadge}
                onPress={handlePickAvatar}
                disabled={uploadingAvatar}
                activeOpacity={0.8}
                accessibilityLabel="Upload clinician portrait"
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Camera size={13} color="#FFFFFF" strokeWidth={2.4} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.identityMeta}>
              <Text style={styles.userName} numberOfLines={1}>
                {fullName}
              </Text>

              <View style={styles.statusPill}>
                <ShieldCheck size={13} color={colors.success} strokeWidth={2.4} />
                <Text style={styles.statusText}>PNC Accredited Clinician</Text>
              </View>

              <View style={styles.badgeRow}>
                <View style={styles.tierChip}>
                  <Award size={12} color={colors.primary} strokeWidth={2.2} />
                  <Text style={styles.tierChipText}>{tierName} Tier</Text>
                </View>

                <View style={styles.trustChip}>
                  <Text style={styles.trustChipText}>Trust {trustScore}%</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Protected Care Wallet & Earnings Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Protected Care Wallet & Earnings</Text>
              <Text style={styles.cardSubtitle}>Punjab Nursing Council escrow milestone settlement</Text>
            </View>
            <View style={styles.walletBadge}>
              <ShieldCheck size={13} color="#059669" strokeWidth={2.4} />
              <Text style={styles.walletBadgeText}>Escrow Active</Text>
            </View>
          </View>

          {/* Balance Hero Box */}
          <View style={styles.walletHeroBox}>
            <View style={styles.walletHeroHeader}>
              <View style={styles.walletHeroIconBox}>
                <Wallet size={18} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.walletHeroSub}>Available for Instant Payout</Text>
                <Text style={styles.walletHeroBalance}>
                  ₹{(earnings?.availableForPayout || 0).toLocaleString("en-IN")}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.instantTransferBtn,
                (earnings?.availableForPayout || 0) <= 0 && styles.instantTransferBtnDisabled,
              ]}
              onPress={handleOpenPayout}
              activeOpacity={0.85}
            >
              <Zap size={15} color={colors.white} strokeWidth={2.4} />
              <Text style={styles.instantTransferBtnText}>Request Instant Transfer</Text>
            </TouchableOpacity>
          </View>

          {/* Metrics Strip (Pending Escrow & Career Total) */}
          <View style={styles.walletMetricsGrid}>
            <View style={styles.walletMetricItem}>
              <Text style={styles.walletMetricLabel}>Pending in Escrow</Text>
              <Text style={styles.walletMetricVal}>
                ₹{(earnings?.pendingEscrow || 0).toLocaleString("en-IN")}
              </Text>
              <Text style={styles.walletMetricSub}>Protected by PNC</Text>
            </View>

            <View style={styles.walletMetricDivider} />

            <View style={styles.walletMetricItem}>
              <Text style={styles.walletMetricLabel}>Career Earnings</Text>
              <Text style={[styles.walletMetricVal, { color: "#059669" }]}>
                ₹{(earnings?.totalEarned || 0).toLocaleString("en-IN")}
              </Text>
              <Text style={styles.walletMetricSub}>
                {earnings?.completedMilestones || 0} Milestones Paid
              </Text>
            </View>
          </View>

          {/* Payout Destination Accounts */}
          <View style={styles.payoutAccountsBox}>
            <View style={styles.accountRow}>
              <CreditCard size={15} color={colors.primary} strokeWidth={2.2} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.accountLabel}>Bank Account</Text>
                <Text style={styles.accountVal}>
                  {earnings?.bankAccount || form.bankAccount || "Add Bank Account in Credentials"}
                </Text>
              </View>
            </View>

            <View style={styles.accountRowDivider} />

            <View style={styles.accountRow}>
              <Building2 size={15} color={colors.primary} strokeWidth={2.2} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.accountLabel}>UPI Virtual Payment Address</Text>
                <Text style={styles.accountVal}>
                  {earnings?.upiId || form.upiId || profile?.upi_id || "Configure UPI ID for instant IMPS"}
                </Text>
              </View>
            </View>
          </View>

          {/* Recent Payout History Ledger */}
          <View style={styles.ledgerHeaderRow}>
            <Text style={styles.ledgerSectionTitle}>Payout & Settlement History</Text>
            <Text style={styles.ledgerCount}>
              {earnings?.recentPayouts?.length || 0} Records
            </Text>
          </View>

          {earnings?.recentPayouts && earnings.recentPayouts.length > 0 ? (
            <View style={styles.ledgerList}>
              {earnings.recentPayouts.map((p: any) => (
                <View key={p.id} style={styles.ledgerItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ledgerItemTitle}>{p.description}</Text>
                    <Text style={styles.ledgerItemDate}>
                      {p.date} • {p.id.slice(0, 16)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.ledgerItemAmt}>
                      ₹{p.amount.toLocaleString("en-IN")}
                    </Text>
                    <View
                      style={[
                        styles.ledgerStatusPill,
                        p.status?.toLowerCase().includes("protect")
                          ? styles.ledgerStatusHeld
                          : styles.ledgerStatusReleased,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ledgerStatusText,
                          p.status?.toLowerCase().includes("protect")
                            ? styles.ledgerStatusTextHeld
                            : styles.ledgerStatusTextReleased,
                        ]}
                      >
                        {p.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.ledgerEmptyBox}>
              <Text style={styles.ledgerEmptyText}>
                No payouts recorded yet. Completed shifts are automatically credited to your protected escrow ledger.
              </Text>
            </View>
          )}
        </View>

        {/* Credentials & Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Credentials & Details</Text>
              <Text style={styles.cardSubtitle}>Registry & clinical specialization</Text>
            </View>

            {!isEditing ? (
              <TouchableOpacity
                style={styles.editToggleBtn}
                onPress={() => setIsEditing(true)}
                activeOpacity={0.7}
              >
                <Edit3 size={14} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.editToggleText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.cancelToggleBtn}
                onPress={handleCancelEdit}
                activeOpacity={0.7}
              >
                <X size={14} color={colors.gray600} strokeWidth={2.2} />
                <Text style={styles.cancelToggleText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            /* Editing Form */
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.firstName}
                  onChangeText={(t) => setForm((p) => ({ ...p, firstName: t }))}
                  placeholder="Enter first name"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.lastName}
                  onChangeText={(t) => setForm((p) => ({ ...p, lastName: t }))}
                  placeholder="Enter last name"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PNC License Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.licenseNumber}
                  onChangeText={(t) => setForm((p) => ({ ...p, licenseNumber: t }))}
                  placeholder="e.g. PNC-RN-48921"
                  placeholderTextColor={colors.gray400}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Primary Specialization</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.specialization}
                  onChangeText={(t) => setForm((p) => ({ ...p, specialization: t }))}
                  placeholder="e.g. Post-Operative Care / Critical Care"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Years of Experience</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.experienceYears}
                  onChangeText={(t) => setForm((p) => ({ ...p, experienceYears: t }))}
                  placeholder="e.g. 6"
                  placeholderTextColor={colors.gray400}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.phone}
                  onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.gray400}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.city}
                  onChangeText={(t) => setForm((p) => ({ ...p, city: t }))}
                  placeholder="City (e.g. Ludhiana)"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Locality / Base Area</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.locality}
                  onChangeText={(t) => setForm((p) => ({ ...p, locality: t }))}
                  placeholder="Locality (e.g. Civil Lines)"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Clinical Bio</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={form.bio}
                  onChangeText={(t) => setForm((p) => ({ ...p, bio: t }))}
                  placeholder="Brief summary of clinical background and competencies..."
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={[styles.textInput, styles.inputDisabled]}
                  value={form.email}
                  editable={false}
                  placeholder="nurse@example.com"
                  placeholderTextColor={colors.gray400}
                />
                <Text style={styles.inputHint}>Email is linked to your login session</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>UPI Virtual Payment Address (VPA)</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.upiId}
                  onChangeText={(t) => setForm((p) => ({ ...p, upiId: t }))}
                  placeholder="e.g. mobile@upi or name@okaxis"
                  placeholderTextColor={colors.gray400}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Linked Bank Account</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.bankAccount}
                  onChangeText={(t) => setForm((p) => ({ ...p, bankAccount: t }))}
                  placeholder="e.g. HDFC Bank ending 4091"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.saveBtnText}>Save Credentials</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* View Mode */
            <View style={styles.detailRows}>
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Award size={16} color={colors.primary} />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>License Number</Text>
                  <Text style={styles.detailValue}>
                    {form.licenseNumber || "Not provided"}
                  </Text>
                </View>
              </View>

              <View style={styles.rowDivider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Stethoscope size={16} color={colors.primary} />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Primary Specialization</Text>
                  <Text style={styles.detailValue}>
                    {form.specialization || "General Bedside Nursing"}
                  </Text>
                </View>
              </View>

              <View style={styles.rowDivider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <User size={16} color={colors.primary} />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Clinical Experience</Text>
                  <Text style={styles.detailValue}>
                    {form.experienceYears ? `${form.experienceYears} Years Clinical Practice` : "Not specified"}
                  </Text>
                </View>
              </View>

              <View style={styles.rowDivider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Phone size={16} color={colors.primary} />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Phone Number</Text>
                  <Text style={styles.detailValue}>
                    {form.phone ? form.phone : "Not provided"}
                  </Text>
                </View>
              </View>

              <View style={styles.rowDivider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Mail size={16} color={colors.primary} />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Email Address</Text>
                  <Text style={styles.detailValue}>
                    {form.email ? form.email : "Not provided"}
                  </Text>
                </View>
              </View>

              <View style={styles.rowDivider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <MapPin size={16} color={colors.primary} />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Operational Area</Text>
                  <Text style={styles.detailValue}>
                    {[form.locality, form.city].filter(Boolean).join(", ") || "Punjab"}
                  </Text>
                </View>
              </View>

              {form.bio ? (
                <>
                  <View style={styles.rowDivider} />
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <FileText size={16} color={colors.primary} />
                    </View>
                    <View style={styles.detailTextBox}>
                      <Text style={styles.detailLabel}>Clinical Bio</Text>
                      <Text style={styles.bioText}>{form.bio}</Text>
                    </View>
                  </View>
                </>
              ) : null}

              <View style={styles.rowDivider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Building2 size={16} color={colors.primary} />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Disbursement UPI ID</Text>
                  <Text style={styles.detailValue}>
                    {form.upiId || profile?.upi_id || "Configure UPI ID"}
                  </Text>
                </View>
              </View>

              <View style={styles.rowDivider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <CreditCard size={16} color={colors.primary} />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Linked Bank Account</Text>
                  <Text style={styles.detailValue}>
                    {form.bankAccount || profile?.bank_account || "Bank Account on File"}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* App Settings Shortcut */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.settingsShortcutRow}
            onPress={() => navigation?.navigate?.("Settings")}
            activeOpacity={0.7}
          >
            <View style={styles.shortcutIconBox}>
              <Settings size={18} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.shortcutTextBox}>
              <Text style={styles.shortcutTitle}>Clinician Settings & Security</Text>
              <Text style={styles.shortcutSubtitle}>
                Shift alerts, biometric lock, hotlines & cache
              </Text>
            </View>
            <ChevronRight size={18} color={colors.gray400} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Instant Transfer Modal */}
      <Modal
        visible={showPayoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPayoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.payoutModalCard}>
            <View style={styles.payoutModalHeader}>
              <View>
                <Text style={styles.payoutModalTitle}>Request Instant Transfer</Text>
                <Text style={styles.payoutModalSubtitle}>
                  Instant IMPS / UPI care wallet disbursement
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPayoutModal(false)}
                style={styles.payoutModalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.gray600} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <View style={styles.payoutModalBalanceBox}>
              <Text style={styles.payoutModalBalanceLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.payoutModalBalanceVal}>
                ₹{(earnings?.availableForPayout || 0).toLocaleString("en-IN")}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Withdrawal Amount (₹) *</Text>
              <TextInput
                style={styles.textInput}
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                keyboardType="numeric"
                placeholder="Enter amount"
                placeholderTextColor={colors.gray400}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Destination UPI ID (VPA) *</Text>
              <TextInput
                style={styles.textInput}
                value={payoutUpi}
                onChangeText={setPayoutUpi}
                placeholder="e.g. mobile@upi or name@bank"
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
              />
              <Text style={styles.inputHint}>
                Disbursed instantly to this UPI address under PNC escrow protocol.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmPayoutBtn, isRequestingPayout && { opacity: 0.7 }]}
              onPress={handleConfirmPayout}
              disabled={isRequestingPayout}
              activeOpacity={0.85}
            >
              {isRequestingPayout ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <Zap size={16} color={colors.white} strokeWidth={2.4} />
                  <Text style={styles.confirmPayoutBtnText}>
                    Disburse ₹{payoutAmount || "0"} Now
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Avatar Picker Sheet Modal */}
      <AvatarPickerModal
        visible={showAvatarPickerModal}
        onClose={() => setShowAvatarPickerModal(false)}
        onSelectAvatar={handleSelectAvatar}
        isUploading={uploadingAvatar}
      />
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

  /* Card Container */
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    padding: 18,
    marginBottom: 14,
    ...neuShadows.cardRaised,
  },

  /* Identity Hero */
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 16,
  },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...neuShadows.cardRaised,
  },
  avatarBoxImage: {
    overflow: "hidden",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.5,
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  identityMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.success,
    marginLeft: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tierChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
  },
  tierChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    marginLeft: 4,
  },
  trustChip: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trustChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray700,
  },

  /* Card Header */
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.gray900,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 1,
  },
  editToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  editToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: 4,
  },
  cancelToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cancelToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray600,
    marginLeft: 4,
  },

  /* Form Elements */
  formContainer: {
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray700,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.neuInset,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray900,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },
  inputDisabled: {
    backgroundColor: colors.gray100,
    color: colors.gray500,
  },
  inputHint: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 4,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
    ...neuShadows.cardRaised,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
    marginLeft: 6,
  },

  /* View Mode Detail Rows */
  detailRows: {
    marginTop: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    marginTop: 2,
  },
  detailTextBox: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.gray500,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray900,
  },
  bioText: {
    fontSize: 13,
    color: colors.gray700,
    lineHeight: 18,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginVertical: 4,
  },

  /* Settings Shortcut Card */
  settingsShortcutRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  shortcutIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  shortcutTextBox: {
    flex: 1,
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray900,
  },
  shortcutSubtitle: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 2,
  },

  /* Care Wallet Card Styles */
  walletBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(5, 150, 105, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  walletBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  walletHeroBox: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginTop: 12,
  },
  walletHeroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  walletHeroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  walletHeroSub: {
    fontSize: 12,
    color: colors.gray500,
    fontWeight: "500",
  },
  walletHeroBalance: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  instantTransferBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    ...neuShadows.cardRaised,
  },
  instantTransferBtnDisabled: {
    backgroundColor: colors.gray400,
    opacity: 0.8,
  },
  instantTransferBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  walletMetricsGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neuBg,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  walletMetricItem: {
    flex: 1,
    alignItems: "center",
  },
  walletMetricDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.gray200,
  },
  walletMetricLabel: {
    fontSize: 11,
    color: colors.gray500,
    fontWeight: "500",
    marginBottom: 2,
  },
  walletMetricVal: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
  },
  walletMetricSub: {
    fontSize: 10,
    color: colors.gray400,
    marginTop: 1,
  },
  payoutAccountsBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginTop: 12,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  accountRowDivider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginVertical: 8,
  },
  accountLabel: {
    fontSize: 10,
    color: colors.gray500,
    fontWeight: "500",
  },
  accountVal: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray800,
    marginTop: 1,
  },
  ledgerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
  },
  ledgerSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray800,
  },
  ledgerCount: {
    fontSize: 11,
    color: colors.gray500,
    fontWeight: "500",
  },
  ledgerList: {
    gap: 8,
  },
  ledgerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  ledgerItemTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray900,
  },
  ledgerItemDate: {
    fontSize: 10,
    color: colors.gray400,
    marginTop: 2,
  },
  ledgerItemAmt: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray900,
  },
  ledgerStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  ledgerStatusHeld: {
    backgroundColor: "rgba(46, 91, 255, 0.08)",
  },
  ledgerStatusReleased: {
    backgroundColor: "rgba(5, 150, 105, 0.08)",
  },
  ledgerStatusText: {
    fontSize: 9,
    fontWeight: "700",
  },
  ledgerStatusTextHeld: {
    color: colors.primary,
  },
  ledgerStatusTextReleased: {
    color: "#059669",
  },
  ledgerEmptyBox: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  ledgerEmptyText: {
    fontSize: 11,
    color: colors.gray500,
    textAlign: "center",
    lineHeight: 16,
  },
  /* Modal Overlay */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  payoutModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    ...neuShadows.cardRaised,
  },
  payoutModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  payoutModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.gray900,
  },
  payoutModalSubtitle: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },
  payoutModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  payoutModalBalanceBox: {
    backgroundColor: colors.primarySoft,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  payoutModalBalanceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  payoutModalBalanceVal: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
    marginTop: 2,
  },
  confirmPayoutBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    ...neuShadows.cardRaised,
  },
  confirmPayoutBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 6,
  },
});
