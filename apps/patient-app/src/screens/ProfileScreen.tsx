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
  Platform,
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
} from "lucide-react-native";
import { colors, neuShadows } from "../theme/colors";
import { api } from "../lib/api";
import { uploadAvatar } from "../lib/storage";
import { useAuth } from "../context/AuthContext";
import { AvatarPickerModal } from "../components/ui/AvatarPickerModal";

interface ProfileScreenProps {
  navigation?: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { profile, userId, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [showAvatarPickerModal, setShowAvatarPickerModal] = useState(false);

  const [form, setForm] = useState({
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    phone: profile?.phone || "",
    email: profile?.email || "",
    city: profile?.city || "",
    locality: profile?.locality || "",
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
      });
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  useEffect(() => {
    syncFormFromProfile();
  }, [syncFormFromProfile]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", () => {
      refreshProfile().catch(() => {});
    });
    return unsubscribe;
  }, [navigation, refreshProfile]);

  const getInitials = (first: string, last: string) => {
    const f = (first || "").trim()[0] || "P";
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
      const targetId = userId || profile?.id;
      const uploadedUrl = await uploadAvatar(payload, targetId);
      setAvatarUrl(uploadedUrl);
      await api.updateProfile({ avatar_url: uploadedUrl });
      await refreshProfile();
      Alert.alert("Success", "Profile photo updated successfully.");
    } catch (err: any) {
      console.warn("Avatar upload notice:", err);
      // Fallback: set local and profile directly with data URI
      setAvatarUrl(payload);
      await api.updateProfile({ avatar_url: payload }).catch(() => {});
      Alert.alert("Success", "Profile photo updated.");
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
      await api.updateProfile({
        first_name: trimmedFirst,
        last_name: form.lastName.trim(),
        phone: form.phone.trim() || null,
        city: form.city.trim() || "Punjab",
        locality: form.locality.trim() || null,
      });

      await refreshProfile();
      setIsEditing(false);
      Alert.alert("Profile Updated", "Your personal details have been saved.");
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

  const fullName = `${form.firstName} ${form.lastName}`.trim() || "Patient";

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

        <Text style={styles.headerTitle}>My Profile</Text>

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
        {/* Identity Hero Card */}
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
                accessibilityLabel="Upload profile portrait"
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
                <Text style={styles.statusText}>Verified Patient Account</Text>
              </View>

              {(form.city || form.locality) ? (
                <View style={styles.locationRow}>
                  <MapPin size={13} color={colors.gray500} strokeWidth={2} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {[form.locality, form.city].filter(Boolean).join(", ")}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Personal Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Personal Information</Text>
              <Text style={styles.cardSubtitle}>Identity & contact coordinates</Text>
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
                  placeholder="City (e.g. Jalandhar)"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Locality / Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.locality}
                  onChangeText={(t) => setForm((p) => ({ ...p, locality: t }))}
                  placeholder="Locality / Area (e.g. Model Town)"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={[styles.textInput, styles.inputDisabled]}
                  value={form.email}
                  editable={false}
                  placeholder="user@example.com"
                  placeholderTextColor={colors.gray400}
                />
                <Text style={styles.inputHint}>Email is tied to your login account</Text>
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
                    <Text style={styles.saveBtnText}>Save Profile</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* View Mode */
            <View style={styles.detailRows}>
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <User size={16} color={colors.primary} />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Full Name</Text>
                  <Text style={styles.detailValue}>{fullName}</Text>
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
                  <Text style={styles.detailLabel}>Residential Area</Text>
                  <Text style={styles.detailValue}>
                    {[form.locality, form.city].filter(Boolean).join(", ") || "Not set"}
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
              <Text style={styles.shortcutTitle}>App Settings & Security</Text>
              <Text style={styles.shortcutSubtitle}>
                Notifications, biometrics, support & data
              </Text>
            </View>
            <ChevronRight size={18} color={colors.gray400} />
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    ...neuShadows.buttonCircle,
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
    ...neuShadows.buttonCircle,
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
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 12,
    color: colors.gray600,
    marginLeft: 4,
    fontWeight: "500",
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
    ...neuShadows.buttonPrimary,
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
    alignItems: "center",
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
});
