// ═══════════════════════════════════════════════════════════════════════════════
// Clinical Care AI Assistant Modal (Powered by Groq LPUs)
// Patient Mobile App — Guided Step-by-Step Clinical Intake & Autofill Card
// Designed per Clean Enterprise & Soft-Neumorphic standards.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Sparkles,
  Send,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Clock,
  MapPin,
  IndianRupee,
  Stethoscope,
  HeartPulse,
  User,
  FileText,
  Calendar,
} from "lucide-react-native";
import { colors, neuShadows } from "../../theme/colors";
import { parseCareRequestWithGroq, ParsedJobData, GroqChatMessage } from "../../lib/groq";

interface AiJobAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyExtracted: (data: ParsedJobData) => void;
}

const STARTER_PROMPTS = [
  {
    id: "cabg",
    label: "🩺 Heart Bypass Recovery",
    prompt: "My 72-year-old father had open-heart bypass surgery and needs a nurse for 12-hour day shifts in Ludhiana.",
  },
  {
    id: "dementia",
    label: "👵 Elderly Fall & Memory Care",
    prompt: "My 80-year-old mother has memory loss and needs 24/7 live-in nurse care in Amritsar.",
  },
  {
    id: "trach",
    label: "🫁 Night Tracheostomy Suctioning",
    prompt: "Patient has a breathing pipe (tracheostomy) and needs a 12-hour night nurse in Jalandhar.",
  },
  {
    id: "ulcer",
    label: "🩹 Sterile Wound & Diabetic Dressing",
    prompt: "My family member needs daily 4-hour visits for sterile surgical dressing in Mohali.",
  },
];

/**
 * Merges newly extracted fields into existing draft without overwriting previously captured data.
 */
function mergeDraftData(
  prev: ParsedJobData | null,
  next: ParsedJobData
): ParsedJobData {
  if (!prev) return next;
  return {
    ...prev,
    ...next,
    jobTitle:
      next.jobTitle && !next.jobTitle.includes("undefined")
        ? next.jobTitle
        : prev.jobTitle,
    patientName:
      next.patientName &&
      next.patientName !== "Patient" &&
      next.patientName !== "Self"
        ? next.patientName
        : (prev.patientName || next.patientName),
    patientAge: next.patientAge ? next.patientAge : prev.patientAge,
    patientGender: next.patientGender || prev.patientGender,
    patientRelationship: next.patientRelationship || prev.patientRelationship,
    mobilityLevel: next.mobilityLevel || prev.mobilityLevel,
    mobilityDirectives: next.mobilityDirectives || prev.mobilityDirectives,
    careCategory: next.careCategory || prev.careCategory,
    drugAllergies:
      next.drugAllergies && next.drugAllergies !== "None reported"
        ? next.drugAllergies
        : (prev.drugAllergies || next.drugAllergies),
    shiftModel: next.shiftModel || prev.shiftModel,
    customHoursPerDay: next.customHoursPerDay || prev.customHoursPerDay,
    shiftStartTime: next.shiftStartTime || prev.shiftStartTime,
    shiftEndTime: next.shiftEndTime || prev.shiftEndTime,
    startDate: next.startDate || prev.startDate,
    selectedDaysCount: next.selectedDaysCount || prev.selectedDaysCount,
    roomProvided:
      next.roomProvided !== undefined ? next.roomProvided : prev.roomProvided,
    mealsProvided:
      next.mealsProvided !== undefined ? next.mealsProvided : prev.mealsProvided,
    activeTasks:
      next.activeTasks && next.activeTasks.length > 0
        ? next.activeTasks
        : prev.activeTasks,
    certifications:
      next.certifications && next.certifications.length > 0
        ? next.certifications
        : prev.certifications,
    selectedEquipment:
      next.selectedEquipment && next.selectedEquipment.length > 0
        ? next.selectedEquipment
        : prev.selectedEquipment,
    physicianOrders: next.physicianOrders || prev.physicianOrders,
    rateType: next.rateType || prev.rateType,
    minRate: next.minRate || prev.minRate,
    maxRate: next.maxRate || prev.maxRate,
    city: next.city ? next.city : prev.city,
    locality: next.locality ? next.locality : prev.locality,
    houseAddress: next.houseAddress ? next.houseAddress : prev.houseAddress,
    postalCode: next.postalCode ? next.postalCode : prev.postalCode,
  };
}

export const AiJobAssistantModal: React.FC<AiJobAssistantModalProps> = ({
  visible,
  onClose,
  onApplyExtracted,
}) => {
  const [messages, setMessages] = useState<GroqChatMessage[]>([
    {
      id: "welcome_1",
      role: "assistant",
      content:
        "Hello! I am your NurseBid clinical intake specialist. Tell me who needs care and what medical condition they have. I'll guide you step by step to build your complete nursing care post!",
      timestamp: "Just now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeExtracted, setActiveExtracted] = useState<ParsedJobData | null>(null);
  const [activeIsComplete, setActiveIsComplete] = useState<boolean>(false);
  const [showManualDraftPreview, setShowManualDraftPreview] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [visible, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isLoading) return;

    setInputText("");

    const userMsg: GroqChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const result = await parseCareRequestWithGroq(prompt, history);

      const botMsg: GroqChatMessage = {
        id: `bot_${Date.now()}`,
        role: "assistant",
        content: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        extractedData: result.extracted,
        isComplete: result.isComplete,
      };

      setMessages((prev) => [...prev, botMsg]);
      if (result.extracted) {
        setActiveExtracted((prevDraft) => mergeDraftData(prevDraft, result.extracted));
      }
      if (result.isComplete) {
        setActiveIsComplete(true);
      }
    } catch (err) {
      const errorMsg: GroqChatMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content:
          "I'm here with you. Please tell me your city in Punjab and the preferred shift hours so we can finalize the care plan.",
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        content:
          "Intake reset. Describe any patient diagnosis, required clinical tasks, and location to draft a new care request.",
        timestamp: "Just now",
      },
    ]);
    setActiveExtracted(null);
    setActiveIsComplete(false);
    setShowManualDraftPreview(false);
  };

  const handleApply = () => {
    if (!activeExtracted) {
      Alert.alert("Care Draft Incomplete", "Please share your care requirements before applying.");
      return;
    }

    if (!activeExtracted.city) {
      Alert.alert(
        "City Needed",
        "Please select or tell us which city in Punjab you are in (e.g. Ludhiana, Amritsar, Mohali, Jalandhar) so the closest nurses can apply.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!activeExtracted.patientAge) {
      Alert.alert(
        "Patient Age Needed",
        "Please provide the approximate age of your loved one so nursing care protocols can be calibrated accurately.",
        [{ text: "OK" }]
      );
      return;
    }

    onApplyExtracted(activeExtracted);
    onClose();
  };

  // Step completion flags
  const hasPatient = Boolean(activeExtracted?.patientAge && activeExtracted?.careCategory);
  const hasCity = Boolean(activeExtracted?.city && activeExtracted.city.trim().length > 0);
  const hasShift = Boolean(
    activeExtracted?.shiftModel &&
    !activeExtracted.shiftModel.toLowerCase().includes("not set") &&
    !activeExtracted.shiftModel.toLowerCase().includes("hours not set")
  );
  const isDraftComplete = Boolean(activeIsComplete || (hasPatient && hasCity && hasShift));

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Top Navigation Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Close assistant"
            >
              <ChevronLeft size={22} color={colors.gray800} strokeWidth={2.4} />
            </TouchableOpacity>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Clinical Care AI</Text>
              <View style={styles.groqStatusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.groqStatusText}>Guided Intake</Text>
              </View>
            </View>

            <View style={styles.headerRightActions}>
              {activeExtracted && !isDraftComplete && (
                <TouchableOpacity
                  style={[
                    styles.previewPillBtn,
                    showManualDraftPreview && styles.previewPillBtnActive,
                  ]}
                  onPress={() => setShowManualDraftPreview((prev) => !prev)}
                  activeOpacity={0.7}
                  accessibilityLabel="Toggle draft preview"
                >
                  <FileText
                    size={13}
                    color={showManualDraftPreview ? colors.primary : colors.gray600}
                  />
                  <Text
                    style={[
                      styles.previewPillText,
                      showManualDraftPreview && styles.previewPillTextActive,
                    ]}
                  >
                    {showManualDraftPreview ? "Hide" : "Draft"}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetChat}
                activeOpacity={0.7}
                accessibilityLabel="Reset conversation"
              >
                <RefreshCw size={16} color={colors.gray600} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Clean 4-Step Intake Progress Stepper */}
          <View style={styles.checklistContainer}>
            <View style={styles.checklistRow}>
              {/* Step 1: Patient */}
              <View
                style={[
                  styles.checkBadge,
                  hasPatient ? styles.checkBadgeDone : styles.checkBadgePending,
                ]}
              >
                {hasPatient ? (
                  <CheckCircle2 size={11} color="#059669" strokeWidth={2.4} />
                ) : (
                  <User size={11} color="#64748B" />
                )}
                <Text
                  style={[
                    styles.checkBadgeText,
                    hasPatient ? styles.checkBadgeTextDone : styles.checkBadgeTextPending,
                  ]}
                  numberOfLines={1}
                >
                  {activeExtracted?.patientAge
                    ? `${activeExtracted.patientName || "Patient"} (${activeExtracted.patientAge}y)`
                    : "1. Patient"}
                </Text>
              </View>

              {/* Step 2: City */}
              <View
                style={[
                  styles.checkBadge,
                  hasCity ? styles.checkBadgeDone : styles.checkBadgePending,
                ]}
              >
                {hasCity ? (
                  <CheckCircle2 size={11} color="#059669" strokeWidth={2.4} />
                ) : (
                  <MapPin size={11} color="#64748B" />
                )}
                <Text
                  style={[
                    styles.checkBadgeText,
                    hasCity ? styles.checkBadgeTextDone : styles.checkBadgeTextPending,
                  ]}
                  numberOfLines={1}
                >
                  {hasCity ? activeExtracted?.city?.split(" ")[0] : "2. City"}
                </Text>
              </View>

              {/* Step 3: Shift & Timings */}
              <View
                style={[
                  styles.checkBadge,
                  hasShift ? styles.checkBadgeDone : styles.checkBadgePending,
                ]}
              >
                {hasShift ? (
                  <CheckCircle2 size={11} color="#059669" strokeWidth={2.4} />
                ) : (
                  <Clock size={11} color="#64748B" />
                )}
                <Text
                  style={[
                    styles.checkBadgeText,
                    hasShift ? styles.checkBadgeTextDone : styles.checkBadgeTextPending,
                  ]}
                  numberOfLines={1}
                >
                  {hasShift ? activeExtracted?.shiftModel?.split(" ")[0] : "3. Shift"}
                </Text>
              </View>

              {/* Step 4: Ready to Post */}
              <View
                style={[
                  styles.checkBadge,
                  isDraftComplete ? styles.checkBadgeDone : styles.checkBadgePending,
                ]}
              >
                {isDraftComplete ? (
                  <CheckCircle2 size={11} color="#059669" strokeWidth={2.4} />
                ) : (
                  <Sparkles size={11} color="#64748B" />
                )}
                <Text
                  style={[
                    styles.checkBadgeText,
                    isDraftComplete ? styles.checkBadgeTextDone : styles.checkBadgeTextPending,
                  ]}
                  numberOfLines={1}
                >
                  {isDraftComplete ? "4. Ready" : "4. Review"}
                </Text>
              </View>
            </View>
          </View>

          {/* Chat Stream & Extracted Plan View */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.messageRow,
                  item.role === "user" ? styles.messageRowUser : styles.messageRowAssistant,
                ]}
              >
                {item.role === "assistant" && (
                  <View style={styles.botAvatar}>
                    <Stethoscope size={16} color={colors.primary} strokeWidth={2.2} />
                  </View>
                )}

                <View
                  style={[
                    styles.bubble,
                    item.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      item.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                    ]}
                  >
                    {item.content}
                  </Text>
                  <Text
                    style={[
                      styles.timestampText,
                      item.role === "user" ? styles.timestampUser : styles.timestampAssistant,
                    ]}
                  >
                    {item.timestamp}
                  </Text>
                </View>
              </View>
            ))}

            {/* AI Typing Indicator */}
            {isLoading && (
              <View style={[styles.messageRow, styles.messageRowAssistant]}>
                <View style={styles.botAvatar}>
                  <Stethoscope size={16} color={colors.primary} />
                </View>
                <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.typingText}>Calibrating clinical protocols & shifts...</Text>
                </View>
              </View>
            )}

            {/* Auto-Fill Care Plan Draft Card — ONLY rendered when all details are gathered OR user toggles peek */}
            {(isDraftComplete || showManualDraftPreview) && activeExtracted && (
              <View style={styles.extractedCard}>
                <View style={styles.extractedHeader}>
                  <View style={styles.extractedHeaderBadge}>
                    <CheckCircle2 size={16} color={colors.emerald600} strokeWidth={2.4} />
                    <Text style={styles.extractedHeaderText}>
                      {isDraftComplete ? "Care Plan Ready to Post" : "Draft In Progress"}
                    </Text>
                  </View>
                  <Text style={styles.verifiedTag}>PNC Accredited</Text>
                </View>

                <Text style={styles.extractedTitle}>
                  {activeExtracted.jobTitle || "Dedicated Clinical Nursing Care"}
                </Text>

                {/* Bento Grid Pills */}
                <View style={styles.bentoGrid}>
                  <View style={styles.bentoPill}>
                    <HeartPulse size={12} color={colors.primary} />
                    <Text style={styles.bentoText}>
                      {activeExtracted.careCategory || "Post-Surgical ICU"}
                    </Text>
                  </View>

                  <View style={styles.bentoPill}>
                    <Clock size={12} color={colors.primary} />
                    <Text style={styles.bentoText}>
                      {activeExtracted.shiftModel || "12h Day Shift"} ({activeExtracted.shiftStartTime || "08:00 AM"} – {activeExtracted.shiftEndTime || "08:00 PM"})
                    </Text>
                  </View>

                  <View style={styles.bentoPill}>
                    <MapPin size={12} color={hasCity ? colors.primary : colors.warning} />
                    <Text
                      style={[
                        styles.bentoText,
                        !hasCity && { color: colors.warning, fontWeight: "700" },
                      ]}
                    >
                      {hasCity
                        ? `${activeExtracted.locality ? `${activeExtracted.locality}, ` : ""}${activeExtracted.city}`
                        : "City Needed ⚠️"}
                    </Text>
                  </View>

                  <View style={styles.bentoPill}>
                    <IndianRupee size={12} color={colors.emerald600} />
                    <Text style={[styles.bentoText, { color: colors.emerald700, fontWeight: "700" }]}>
                      ₹{activeExtracted.minRate || "750"} – ₹{activeExtracted.maxRate || "950"}/hr
                    </Text>
                  </View>
                </View>

                {/* Schedule & Timing Summary Strip */}
                <View style={styles.scheduleStrip}>
                  <Calendar size={13} color={colors.primary} />
                  <Text style={styles.scheduleStripText}>
                    Duration: {activeExtracted.selectedDaysCount || 7} Days • Starts {activeExtracted.startDate || "Tomorrow"}
                  </Text>
                </View>

                {/* Extracted Tasks Preview */}
                {activeExtracted.activeTasks && activeExtracted.activeTasks.length > 0 && (
                  <View style={styles.tasksSection}>
                    <Text style={styles.tasksLabel}>Calibrated Clinical Protocols:</Text>
                    {activeExtracted.activeTasks.slice(0, 3).map((task, idx) => (
                      <View key={idx} style={styles.taskItem}>
                        <View style={styles.taskBullet} />
                        <Text style={styles.taskItemText}>{task}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Autofill CTA Button */}
                <TouchableOpacity
                  style={[
                    styles.applyButton,
                    (!hasCity || !activeExtracted.patientAge) && styles.applyButtonIncomplete,
                  ]}
                  onPress={handleApply}
                  activeOpacity={0.82}
                >
                  <Text style={styles.applyButtonText}>
                    {!hasCity
                      ? "Select City to Autofill →"
                      : !activeExtracted.patientAge
                      ? "Add Age to Autofill →"
                      : "Apply & Autofill Job Post"}
                  </Text>
                  <ArrowRight size={17} color={colors.white} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Contextual Quick-Answer Suggestion Chips (Only ONE active category at a time) */}
          <View style={styles.quickAnswerArea}>
            {!hasCity ? (
              <View style={styles.quickAnswerRow}>
                <Text style={styles.quickAnswerLabel}>📍 Select your city in Punjab:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickAnswerScroll}
                >
                  {["Ludhiana", "Amritsar", "Mohali / Chandigarh", "Jalandhar", "Bathinda", "Patiala"].map(
                    (cityName) => (
                      <TouchableOpacity
                        key={cityName}
                        style={styles.answerChip}
                        onPress={() => handleSendMessage(`We are located in ${cityName}`)}
                        activeOpacity={0.7}
                        disabled={isLoading}
                      >
                        <MapPin size={11} color={colors.primary} />
                        <Text style={styles.answerChipText}>{cityName}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>
              </View>
            ) : !hasShift ? (
              <View style={styles.quickAnswerRow}>
                <Text style={styles.quickAnswerLabel}>⏰ Select shift timing:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickAnswerScroll}
                >
                  {[
                    { label: "☀️ 12h Day (8am - 8pm)", val: "Need 12-hour day shifts from 8 AM to 8 PM" },
                    { label: "🌙 12h Night (8pm - 8am)", val: "Need 12-hour night shifts from 8 PM to 8 AM" },
                    { label: "🏡 24h Live-in", val: "Need 24-hour round-the-clock live-in nurse care" },
                    { label: "⏱️ 4h Daily Visit", val: "Need 4-hour daily visit" },
                  ].map((s) => (
                    <TouchableOpacity
                      key={s.label}
                      style={styles.answerChip}
                      onPress={() => handleSendMessage(s.val)}
                      activeOpacity={0.7}
                      disabled={isLoading}
                    >
                      <Text style={styles.answerChipText}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : !activeExtracted?.selectedDaysCount || !activeExtracted?.startDate ? (
              <View style={styles.quickAnswerRow}>
                <Text style={styles.quickAnswerLabel}>📅 Care schedule & duration:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickAnswerScroll}
                >
                  {[
                    { label: "Starts Tomorrow (7 Days)", val: "Need care starting tomorrow for 7 days" },
                    { label: "Starts Tomorrow (14 Days)", val: "Need care starting tomorrow for 14 days" },
                    { label: "Immediate (30 Days)", val: "Need care starting immediately for 30 days" },
                  ].map((d) => (
                    <TouchableOpacity
                      key={d.label}
                      style={styles.answerChip}
                      onPress={() => handleSendMessage(d.val)}
                      activeOpacity={0.7}
                      disabled={isLoading}
                    >
                      <Calendar size={11} color={colors.primary} />
                      <Text style={styles.answerChipText}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : !activeExtracted?.patientAge ? (
              <View style={styles.quickAnswerRow}>
                <Text style={styles.quickAnswerLabel}>👤 Approximate patient age:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickAnswerScroll}
                >
                  {[
                    { label: "Father (72 yrs)", val: "My father is 72 years old" },
                    { label: "Mother (75 yrs)", val: "My mother is 75 years old" },
                    { label: "Elderly (80+ yrs)", val: "Patient is 82 years old" },
                    { label: "Adult (55 yrs)", val: "Patient is 55 years old" },
                  ].map((a) => (
                    <TouchableOpacity
                      key={a.label}
                      style={styles.answerChip}
                      onPress={() => handleSendMessage(a.val)}
                      activeOpacity={0.7}
                      disabled={isLoading}
                    >
                      <Text style={styles.answerChipText}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>

          {/* Starter Prompts Carousel (Only displayed at the start before conversation commences) */}
          {messages.length <= 1 && (
            <View style={styles.quickPromptsWrap}>
              <Text style={styles.quickPromptsTitle}>Or tap a common care need to start:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickPromptsScroll}
              >
                {STARTER_PROMPTS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.quickPromptPill}
                    onPress={() => handleSendMessage(item.prompt)}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    <Sparkles size={12} color={colors.primary} />
                    <Text style={styles.quickPromptText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Bottom Docked Input Bar */}
          <View style={styles.inputContainer}>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="Type details, answers, or medical conditions..."
                placeholderTextColor={colors.gray400}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSendMessage()}
                returnKeyType="send"
                multiline={false}
                editable={!isLoading}
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !inputText.trim() || isLoading ? styles.sendButtonDisabled : null,
                ]}
                onPress={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Send size={16} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.neuBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neuBorder,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...neuShadows.buttonCircle,
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  groqStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
    backgroundColor: colors.emerald50,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald600,
  },
  groqStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.emerald700,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neuBorder,
    ...neuShadows.subtle,
  },
  previewPillBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  previewPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray600,
  },
  previewPillTextActive: {
    color: colors.primary,
  },
  resetButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...neuShadows.buttonCircle,
  },
  checklistContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.neuBorder,
  },
  checklistRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  checkBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  checkBadgeDone: {
    backgroundColor: colors.emerald50,
    borderColor: colors.successBorder,
  },
  checkBadgePending: {
    backgroundColor: colors.neuBg,
    borderColor: colors.neuBorder,
  },
  checkBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  checkBadgeTextDone: {
    color: colors.emerald700,
  },
  checkBadgeTextPending: {
    color: "#64748B",
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  messageRowAssistant: {
    justifyContent: "flex-start",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleAssistant: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.neuBorder,
    ...neuShadows.card,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 4,
    ...neuShadows.card,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextAssistant: {
    color: colors.gray800,
  },
  bubbleTextUser: {
    color: colors.white,
    fontWeight: "500",
  },
  timestampText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timestampAssistant: {
    color: colors.gray400,
  },
  timestampUser: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 11.5,
    color: colors.gray500,
    fontStyle: "italic",
  },
  extractedCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    ...neuShadows.cardRaised,
  },
  extractedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  extractedHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  extractedHeaderText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.gray900,
  },
  verifiedTag: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.emerald700,
    backgroundColor: colors.emerald50,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  extractedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 12,
    lineHeight: 19,
  },
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  bentoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.neuBg,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neuBorder,
  },
  bentoText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray700,
  },
  scheduleStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  scheduleStripText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  tasksSection: {
    backgroundColor: colors.primaryPale,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  tasksLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryDark,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  taskBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  taskItemText: {
    fontSize: 11,
    color: colors.gray700,
    flex: 1,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    ...neuShadows.buttonPrimary,
  },
  applyButtonIncomplete: {
    backgroundColor: "#2563EB",
  },
  applyButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.2,
  },
  quickAnswerArea: {
    backgroundColor: colors.neuBg,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
  },
  quickAnswerRow: {
    marginBottom: 6,
  },
  quickAnswerLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.gray600,
    marginBottom: 5,
    marginLeft: 2,
  },
  quickAnswerScroll: {
    gap: 6,
    paddingRight: 10,
  },
  answerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...neuShadows.subtle,
  },
  answerChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  quickPromptsWrap: {
    backgroundColor: colors.neuBg,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 6,
  },
  quickPromptsTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray500,
    marginBottom: 4,
    marginLeft: 2,
  },
  quickPromptsScroll: {
    gap: 6,
    paddingRight: 10,
  },
  quickPromptPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.neuBorder,
    ...neuShadows.subtle,
  },
  quickPromptText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.gray700,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neuBorder,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neuBg,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.neuBorder,
  },
  textInput: {
    flex: 1,
    fontSize: 12.5,
    color: colors.gray900,
    paddingVertical: 8,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray300,
  },
});
