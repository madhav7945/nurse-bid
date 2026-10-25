import React from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Camera, Image as ImageIcon, Sparkles, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { colors, neuShadows } from "../../theme/colors";

const CLINICAL_PRESETS = [
  "https://images.unsplash.com/photo-1594824813627-81ec6cc27d42?w=400&q=80",
  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80",
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80",
  "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&q=80",
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80",
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80",
];

interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAvatar: (uri: string) => Promise<void>;
  isUploading?: boolean;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  visible,
  onClose,
  onSelectAvatar,
  isUploading = false,
}) => {
  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Permission",
          "Camera permission is required to capture your profile photo."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Prevents Android / MIUI OEM crop crash
        quality: 0.35,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const payload = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        onClose();
        await onSelectAvatar(payload);
      }
    } catch (err: any) {
      console.warn("Camera launch notice:", err);
      Alert.alert("Camera Error", err?.message || "Could not launch camera.");
    }
  };

  const handleLaunchGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Photo Permission",
          "Photo library permission is required to select a profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Prevents Android / MIUI OEM crop crash
        quality: 0.35,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const payload = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        onClose();
        await onSelectAvatar(payload);
      }
    } catch (err: any) {
      console.warn("Gallery launch notice:", err);
      Alert.alert("Gallery Error", err?.message || "Could not open photo gallery.");
    }
  };

  const handleSelectPreset = async (url: string) => {
    onClose();
    await onSelectAvatar(url);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalCard}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Update Profile Photo</Text>
              <Text style={styles.subtitle}>
                Choose camera, gallery, or verified clinical portrait
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsList}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleLaunchCamera}
              activeOpacity={0.8}
              disabled={isUploading}
            >
              <View style={[styles.actionIconBox, { backgroundColor: colors.primarySoft }]}>
                <Camera size={18} color={colors.primary} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Take New Photo</Text>
                <Text style={styles.actionSub}>Use device camera for real-time selfie</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleLaunchGallery}
              activeOpacity={0.8}
              disabled={isUploading}
            >
              <View style={[styles.actionIconBox, { backgroundColor: "#ECFDF5" }]}>
                <ImageIcon size={18} color="#059669" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Choose from Gallery</Text>
                <Text style={styles.actionSub}>Select an existing image from your device</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Clinical Presets */}
          <View style={styles.presetsSection}>
            <View style={styles.presetHeaderRow}>
              <Sparkles size={14} color={colors.primary} />
              <Text style={styles.presetSectionTitle}>VERIFIED CLINICAL AVATARS</Text>
            </View>

            <View style={styles.presetsGrid}>
              {CLINICAL_PRESETS.map((presetUrl, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.presetItem}
                  onPress={() => handleSelectPreset(presetUrl)}
                  activeOpacity={0.8}
                  disabled={isUploading}
                >
                  <Image source={{ uri: presetUrl }} style={styles.presetImage} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: Platform.OS === "ios" ? 40 : 26,
    ...neuShadows.cardRaised,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neuInset,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsList: {
    gap: 10,
    marginBottom: 18,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.neuBg,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.03)",
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray900,
  },
  actionSub: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 1,
  },
  presetsSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  presetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  presetSectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  presetItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.white,
    ...neuShadows.card,
  },
  presetImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
});
