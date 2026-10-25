import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from "react-native";
import {
  X,
  Pill,
  Clock,
  Route as RouteIcon,
  FileText,
  Check,
  Sparkles,
  ShieldCheck,
} from "lucide-react-native";
import { colors } from "../../theme/colors";

interface AddMedicationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (med: {
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    instructions?: string;
  }) => Promise<void>;
  patientName?: string;
}

interface MedTemplate {
  name: string;
  dosage: string;
  route: string;
  frequency: string;
  instructions: string;
}

const CLINICAL_TEMPLATES: MedTemplate[] = [
  {
    name: "Tab Metoprolol Tartrate",
    dosage: "25 mg",
    route: "Oral",
    frequency: "Twice daily (08:00 / 20:00)",
    instructions: "Check HR and BP prior to administration. Hold if pulse < 60 bpm.",
  },
  {
    name: "Inj Clexane (Enoxaparin)",
    dosage: "40 mg / 0.4 mL",
    route: "Subcutaneous",
    frequency: "Once daily (Morning)",
    instructions: "Administer deep SC in anterolateral abdominal wall. Do not rub.",
  },
  {
    name: "Tab Augmentin (Amoxicillin/Clav)",
    dosage: "625 mg",
    route: "Oral",
    frequency: "Twice daily (08:00 / 20:00)",
    instructions: "Take with food to minimize GI distress.",
  },
  {
    name: "Tab Pantoprazole",
    dosage: "40 mg",
    route: "Oral",
    frequency: "Once daily (Morning)",
    instructions: "Take 30 minutes before morning breakfast with water.",
  },
  {
    name: "Tab Paracetamol (Dolo)",
    dosage: "650 mg",
    route: "Oral",
    frequency: "SOS (As Needed)",
    instructions: "For post-op surgical pain or temp > 100°F. Minimum 6h interval.",
  },
  {
    name: "Syp Duphalac (Lactulose)",
    dosage: "15 mL",
    route: "Oral",
    frequency: "Once daily (Night)",
    instructions: "Take at bedtime with water for bowel regulation.",
  },
];

const ROUTE_PRESETS = [
  { label: "Oral (PO)", value: "Oral" },
  { label: "Subcutaneous (SC)", value: "Subcutaneous" },
  { label: "Intravenous (IV)", value: "Intravenous" },
  { label: "Intramuscular (IM)", value: "Intramuscular" },
  { label: "Inhalation", value: "Inhalation" },
  { label: "Topical", value: "Topical" },
];

const FREQUENCY_PRESETS = [
  "Twice daily (08:00 / 20:00)",
  "Once daily (Morning 09:00)",
  "Thrice daily (TDS: 08/14/20)",
  "Every 8 hours (Q8H)",
  "SOS (As Needed)",
  "Once daily (Night)",
];

const COMMON_DOSES = ["1 Tab", "25 mg", "40 mg", "50 mg", "500 mg", "650 mg", "15 mL"];

const INSTRUCTION_TAGS = [
  "After food (PC)",
  "Before food (AC)",
  "Check pulse first",
  "Check BP first",
  "Take with full glass of water",
];

export const AddMedicationModal: React.FC<AddMedicationModalProps> = ({
  visible,
  onClose,
  onSave,
  patientName,
}) => {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Twice daily (08:00 / 20:00)");
  const [route, setRoute] = useState("Oral");
  const [instructions, setInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomFrequency, setShowCustomFrequency] = useState(false);

  const resetForm = () => {
    setName("");
    setDosage("");
    setFrequency("Twice daily (08:00 / 20:00)");
    setRoute("Oral");
    setInstructions("");
    setShowCustomFrequency(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const applyTemplate = (tpl: MedTemplate) => {
    setName(tpl.name);
    setDosage(tpl.dosage);
    setRoute(tpl.route);
    setFrequency(tpl.frequency);
    setInstructions(tpl.instructions);
    setShowCustomFrequency(false);
  };

  const handleAddInstructionTag = (tag: string) => {
    if (!instructions.includes(tag)) {
      setInstructions((prev) => (prev ? `${prev} · ${tag}` : tag));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Name", "Please enter the medication name (e.g., Tab Metoprolol).");
      return;
    }
    if (!dosage.trim()) {
      Alert.alert("Missing Dosage", "Please specify the dosage strength (e.g., 25 mg or 1 tab).");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        route: route.trim(),
        instructions: instructions.trim() || undefined,
      });
      handleClose();
    } catch (err) {
      Alert.alert("Save Failed", "Could not record medication order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdropDismiss}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.sheetContainer}>
          {/* Top Drag Pill */}
          <View style={styles.sheetHandle} />

          {/* Clean Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.sheetTitle}>Prescribe Medication</Text>
                <View style={styles.eMarPill}>
                  <ShieldCheck size={11} color="#059669" strokeWidth={2.4} />
                  <Text style={styles.eMarPillText}>eMAR Verified</Text>
                </View>
              </View>
              <Text style={styles.sheetSubtitle}>
                {patientName ? `Attending care regimen for ${patientName}` : "Patient Census & Administration Record"}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.75}>
              <X size={18} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollBody}
          >
            {/* 1-Tap Quick Clinical Recovery Templates */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Sparkles size={13} color="#2563EB" strokeWidth={2.4} />
                <Text style={styles.sectionHeaderTitle}>1-TAP RECOVERY TEMPLATES</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.templateScrollRow}
              >
                {CLINICAL_TEMPLATES.map((tpl) => (
                  <TouchableOpacity
                    key={tpl.name}
                    style={styles.templateCard}
                    onPress={() => applyTemplate(tpl)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.templateName}>{tpl.name}</Text>
                    <Text style={styles.templateMeta}>
                      {tpl.dosage} · {tpl.route}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Medication Name & Formulation */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Pill size={13} color="#2563EB" />
                <Text style={styles.fieldLabel}>Medication Name & Formulation *</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Tab Metoprolol Tartrate, Inj Clexane"
                placeholderTextColor={colors.gray400}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Dosage Strength & Quick Chips */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <FileText size={13} color="#2563EB" />
                <Text style={styles.fieldLabel}>Dosage / Strength *</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 25 mg, 500 mg, 40 mg / 0.4 mL"
                placeholderTextColor={colors.gray400}
                value={dosage}
                onChangeText={setDosage}
              />
              <View style={styles.quickChipsRow}>
                {COMMON_DOSES.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={styles.quickDoseChip}
                    onPress={() => setDosage(d)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.quickDoseChipText}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Administration Route */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <RouteIcon size={13} color="#2563EB" />
                <Text style={styles.fieldLabel}>Administration Route</Text>
              </View>
              <View style={styles.presetPillRow}>
                {ROUTE_PRESETS.map((r) => {
                  const isSelected = route === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      onPress={() => setRoute(r.value)}
                      style={[styles.presetPill, isSelected && styles.presetPillActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.presetPillText, isSelected && styles.presetPillTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Schedule & Frequency */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Clock size={13} color="#2563EB" />
                <Text style={styles.fieldLabel}>Schedule & Frequency</Text>
              </View>
              <View style={styles.presetPillRow}>
                {FREQUENCY_PRESETS.map((f) => {
                  const isSelected = frequency === f && !showCustomFrequency;
                  return (
                    <TouchableOpacity
                      key={f}
                      onPress={() => {
                        setFrequency(f);
                        setShowCustomFrequency(false);
                      }}
                      style={[styles.presetPill, isSelected && styles.presetPillActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.presetPillText, isSelected && styles.presetPillTextActive]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  onPress={() => setShowCustomFrequency(true)}
                  style={[styles.presetPill, showCustomFrequency && styles.presetPillActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetPillText, showCustomFrequency && styles.presetPillTextActive]}>
                    Custom Schedule...
                  </Text>
                </TouchableOpacity>
              </View>

              {showCustomFrequency && (
                <TextInput
                  style={[styles.textInput, { marginTop: 8 }]}
                  placeholder="e.g. 06:00 / 14:00 / 22:00 or Every 12 hours"
                  placeholderTextColor={colors.gray400}
                  value={frequency}
                  onChangeText={setFrequency}
                  autoFocus
                />
              )}
            </View>

            {/* Clinical Instructions & Warnings */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <FileText size={13} color={colors.gray500} />
                <Text style={styles.fieldLabel}>Clinical Instructions / Precautions</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="e.g. Take with warm water after food. Check pulse prior to administration."
                placeholderTextColor={colors.gray400}
                value={instructions}
                onChangeText={setInstructions}
                multiline
                numberOfLines={3}
              />
              <View style={styles.quickChipsRow}>
                {INSTRUCTION_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.quickInstructionChip}
                    onPress={() => handleAddInstructionTag(tag)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.quickInstructionChipText}>+ {tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Primary Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Check size={16} color={colors.white} strokeWidth={2.4} />
              <Text style={styles.submitBtnText}>
                {isSubmitting ? "Prescribing Regimen..." : "Save Medication Order"}
              </Text>
            </TouchableOpacity>

            {/* Clearance buffer */}
            <View style={{ height: Platform.OS === "android" ? 40 : 50 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    width: "100%",
    maxWidth: 412,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: Dimensions.get("window").height * 0.9,
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  titleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  eMarPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  eMarPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  sheetSubtitle: {
    fontSize: 11.5,
    fontWeight: "500",
    color: colors.gray500,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBody: {
    paddingTop: 14,
    paddingBottom: 24,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: 0.6,
  },
  templateScrollRow: {
    gap: 8,
    paddingBottom: 2,
  },
  templateCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  templateName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  templateMeta: {
    fontSize: 10.5,
    color: colors.gray500,
    marginTop: 2,
  },
  fieldGroup: {
    marginBottom: 15,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    letterSpacing: -0.2,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#0F172A",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
    paddingTop: 9,
  },
  quickChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  quickDoseChip: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quickDoseChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },
  quickInstructionChip: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  quickInstructionChipText: {
    fontSize: 10.5,
    color: colors.gray600,
    fontWeight: "500",
  },
  presetPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  presetPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetPillActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  presetPillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  presetPillTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 13,
    marginTop: 6,
    gap: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.2,
  },
});
