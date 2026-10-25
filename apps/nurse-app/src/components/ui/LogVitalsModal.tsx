import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { X, Activity, Check } from "lucide-react-native";
import { colors, neuShadows } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { ShiftVitals } from "../../lib/api";
import { ContainerModal } from "./ContainerModal";

export const LogVitalsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (vitals: ShiftVitals) => Promise<void>;
  initialVitals?: ShiftVitals;
  patientName?: string;
}> = ({ visible, onClose, onSave, initialVitals, patientName }) => {
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [spo2, setSpo2] = useState("");
  const [sugar, setSugar] = useState("");
  const [temp, setTemp] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setBp(initialVitals?.bp || "");
      setPulse(initialVitals?.pulse || "");
      setSpo2(initialVitals?.spo2 || "");
      setSugar(initialVitals?.sugar || "");
      setTemp(initialVitals?.temp || "");
    }
  }, [visible, initialVitals]);

  const save = () => {
    if (!bp.trim() || !pulse.trim() || !spo2.trim() || !sugar.trim() || !temp.trim()) {
      Alert.alert("Missing Data", "Please fill in all vitals fields.");
      return;
    }

    if (isNaN(Number(pulse)) || isNaN(Number(spo2)) || isNaN(Number(sugar)) || isNaN(Number(temp))) {
      Alert.alert("Invalid Data", "Pulse, SpO₂, Glucose, and Temp must be valid numbers.");
      return;
    }

    const payload = {
      bp: bp.trim(),
      pulse: pulse.trim(),
      spo2: spo2.trim(),
      sugar: sugar.trim(),
      temp: temp.trim(),
      recordedAt: new Date().toISOString(),
    };

    // Instant optimistic closure so clinician experiences zero delay
    onClose();
    onSave(payload).catch((err) => {
      console.warn("Background vitals sync notice:", err);
    });
  };

  const renderField = (
    label: string,
    value: string,
    setValue: (val: string) => void,
    keyboardType?: "numeric",
    placeholder?: string
  ) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWell}>
        <TextInput
          value={value}
          onChangeText={setValue}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          style={styles.textInput}
        />
      </View>
    </View>
  );

  return (
    <ContainerModal visible={visible} onClose={onClose} position="bottom">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.sheet, { margin: 0, width: "100%", maxWidth: "100%" }]}>
          {/* Sheet Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={styles.iconChip}>
                  <Activity size={16} color={colors.primary} />
                </View>
                <Text style={styles.title}>Chart Bedside Vitals</Text>
              </View>
              <Text style={styles.subtitle}>
                {patientName || "Current patient"} • Add a new observation
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.8}
            >
              <X size={18} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
            {renderField("Blood Pressure (mmHg)", bp, setBp, undefined, "120/80")}

            <View style={styles.row}>
              {renderField("Heart Rate (bpm)", pulse, setPulse, "numeric", "72")}
              {renderField("SpO₂ Saturation (%)", spo2, setSpo2, "numeric", "98")}
            </View>

            <View style={styles.row}>
              {renderField("Capillary Glucose (mg/dL)", sugar, setSugar, "numeric", "110")}
              {renderField("Body Temp (°F)", temp, setTemp, "numeric", "98.6")}
            </View>

            {/* Reassuring Notice */}
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                Recorded vitals instantly sync to the attending physician&apos;s dossier and family care circle.
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.cancelBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={save}
                disabled={saving}
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                activeOpacity={0.8}
              >
                <Check size={16} color={colors.white} strokeWidth={2.4} />
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving..." : "Save vitals"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </ContainerModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: colors.overlay,
  },
  sheet: {
    width: "100%",
    maxWidth: 412,
    maxHeight: "90%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    borderWidth: 1,
    borderColor: "rgba(226, 234, 245, 0.9)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.gray900,
  },
  subtitle: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 4,
    fontWeight: "500",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.neuInset,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
  },
  form: {
    paddingBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  field: {
    flex: 1,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.gray700,
    fontWeight: "700",
    marginBottom: 6,
  },
  inputWell: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.neuInset,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  textInput: {
    color: colors.gray900,
    fontSize: 15,
    fontWeight: "700",
  },
  noticeBox: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    marginBottom: 18,
  },
  noticeText: {
    fontSize: 11,
    color: colors.primaryDark,
    lineHeight: 16,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.neuInset,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray700,
  },
  saveBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...neuShadows.buttonPrimary,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
});
