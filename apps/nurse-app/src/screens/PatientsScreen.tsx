import React, { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Activity,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HeartPulse,
  Phone,
  Pill,
  Plus,
  RotateCw,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  User,
  UsersRound,
} from "lucide-react-native";
import { api, PatientRecord, ShiftVitals } from "../lib/api";
import { useShifts } from "../hooks/useShifts";
import { colors, neuShadows } from "../theme/colors";
import { PatientsSkeleton } from "../components/ui/NurseSkeleton";
import { LogVitalsModal } from "../components/ui/LogVitalsModal";
import { AddMedicationModal } from "../components/census/AddMedicationModal";
import { setTabBarVisible } from "../lib/tabBarState";

export const PatientsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { shifts, refresh: refreshShifts } = useShifts();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [activeTab, setActiveTab] = useState<"Vitals" | "Meds" | "History" | "Contact">("Vitals");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showAddMedModal, setShowAddMedModal] = useState(false);

  const activeShift = shifts.find((s) => s.status === "active");

  const getPatientActiveShift = (p: PatientRecord) => {
    if (!activeShift) return null;
    const pName = (p.name || "").toLowerCase().trim();
    const activePName = (activeShift.patientName || "").toLowerCase().trim();
    const pBookingRef = (p.bookingRef || "").replace(/^BK-/, "").toLowerCase();
    const activeBookingRef = (activeShift.bookingRef || "").replace(/^BK-/, "").toLowerCase();
    if (
      (pName && activePName && (pName.includes(activePName) || activePName.includes(pName))) ||
      (pBookingRef && activeBookingRef && pBookingRef === activeBookingRef) ||
      p.id === activeShift.id
    ) {
      return activeShift;
    }
    return null;
  };

  const loadPatients = async () => {
    try {
      const data = await api.getPatients();
      setPatients(data || []);
      if (data?.length && !selectedId) {
        const inActive = data.find((p) => getPatientActiveShift(p));
        setSelectedId(inActive ? inActive.id : data[0].id);
      }
    } catch (err) {
      console.error("Failed to load patients:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPatients();
    const unsubscribe = navigation?.addListener?.("focus", () => {
      loadPatients();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (showVitalsModal || showAddMedModal) {
      setTabBarVisible(false);
    } else {
      setTabBarVisible(true);
    }
    return () => {
      setTabBarVisible(true);
    };
  }, [showVitalsModal, showAddMedModal]);

  const currentPatient =
    patients.find((p) => p.id === selectedId) || patients[0] || null;

  const handleAdministerMedication = async (med: any) => {
    if (!currentPatient) return;
    if (med.status === "Given") {
      Alert.alert("Already Given", `${med.name} was already recorded as administered.`);
      return;
    }

    Alert.alert(
      "Confirm Dose",
      `Administer ${med.name} (${med.dosage}) to ${currentPatient.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              const targetPatientId = (currentPatient as any).patientId || currentPatient.id;
              await api.logMedicationAdministered(
                targetPatientId,
                med.name,
                med.dosage,
                med.route
              );
              setPatients((prev) =>
                prev.map((p) => {
                  if (p.id !== currentPatient.id) return p;
                  return {
                    ...p,
                    medications: p.medications.map((m) =>
                      m.name === med.name
                        ? { ...m, status: "Given", lastGiven: "Just now" }
                        : m
                    ),
                  };
                })
              );
            } catch (err) {
              Alert.alert("Error", "Could not record medication.");
            }
          },
        },
      ]
    );
  };

  const handleSaveMedicationOrder = async (medData: {
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    instructions?: string;
  }) => {
    if (!currentPatient) return;
    try {
      const targetPatientId = (currentPatient as any).patientId || currentPatient.id;
      const createdMed = await api.addMedicationOrder(targetPatientId, medData);
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== currentPatient.id) return p;
          return {
            ...p,
            medications: [createdMed, ...(p.medications || [])],
          };
        })
      );
      Alert.alert(
        "Medication Prescribed",
        `${medData.name} (${medData.dosage}) added to patient's daily care regimen.`
      );
    } catch (err) {
      console.warn("Failed to add medication order:", err);
      throw err;
    }
  };

  const handleSaveVitals = async (vitals: ShiftVitals) => {
    if (!currentPatient) return;
    try {
      const activeForPatient = getPatientActiveShift(currentPatient);
      const targetId = activeForPatient ? activeForPatient.id : (currentPatient as any).patientId || currentPatient.id;
      await api.logVitals(targetId, vitals);
      refreshShifts();
      const newEntry = {
        date: "Today",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        bp: vitals.bp || "--/--",
        pulse: vitals.pulse ? `${vitals.pulse} bpm` : "--",
        sugar: vitals.sugar ? `${vitals.sugar} mg/dL` : "--",
        spo2: vitals.spo2 ? `${vitals.spo2}%` : "--",
        temp: vitals.temp ? `${vitals.temp}°F` : "--",
        notes: vitals.notes || "Bedside reading (Active Shift)",
      };
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== currentPatient.id) return p;
          return {
            ...p,
            recentVitals: [newEntry, ...(p.recentVitals || [])],
          };
        })
      );
      Alert.alert(
        "Vitals Recorded & Synced",
        "Bedside vitals recorded and synchronized live with the Patient App."
      );
    } catch (err) {
      console.warn("Failed to log vitals:", err);
    }
  };

  if (loading) {
    return <PatientsSkeleton />;
  }

  const currentActiveShift = currentPatient ? getPatientActiveShift(currentPatient) : null;
  const latestVitals = currentActiveShift?.vitals || currentPatient?.recentVitals?.[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F3F8" />

      {/* ─── Minimalist Header ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Patients</Text>
          <Text style={styles.headerSubtitle}>
            {patients.length} assigned {patients.length === 1 ? "patient" : "patients"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setRefreshing(true);
            loadPatients();
          }}
          activeOpacity={0.7}
        >
          <RotateCw size={16} color={colors.gray600} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPatients();
            }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {patients.length === 0 ? (
          <View style={styles.emptyCard}>
            <UsersRound size={32} color={colors.gray400} />
            <Text style={styles.emptyTitle}>No Assigned Patients</Text>
            <Text style={styles.emptySubtitle}>
              Your assigned patient records will appear here once booked.
            </Text>
          </View>
        ) : (
          <>
            {/* ─── Soft Neumorphic Patient Selector ─── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.patientPillRail}
            >
              {patients.map((item) => {
                const isSelected = item.id === currentPatient?.id;
                const shiftForPatient = getPatientActiveShift(item);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedId(item.id)}
                    style={[
                      styles.patientPill,
                      isSelected ? styles.patientPillActive : styles.patientPillInactive,
                      Boolean(shiftForPatient) && styles.patientPillHasActiveShift,
                    ]}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.patientPillDot,
                        shiftForPatient
                          ? { backgroundColor: colors.success }
                          : isSelected && { backgroundColor: colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.patientPillText,
                        isSelected && styles.patientPillTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {Boolean(shiftForPatient) && (
                      <View style={styles.activeShiftMicroBadge}>
                        <Text style={styles.activeShiftMicroText}>ACTIVE SHIFT</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {currentPatient && (
              <>
                {/* ─── Floating Neumorphic Patient Card ─── */}
                <View style={styles.patientCard}>
                  {/* Active Shift Synchronization Banner */}
                  {Boolean(getPatientActiveShift(currentPatient)) && (
                    <View style={styles.censusActiveShiftBanner}>
                      <View style={styles.censusActiveShiftLeft}>
                        <View style={styles.censusPulseGreenDot} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.censusActiveShiftTitle}>
                            ACTIVE SHIFT · ON-SITE NOW
                          </Text>
                          <Text style={styles.censusActiveShiftSub}>
                            Shift #{getPatientActiveShift(currentPatient)?.dayNumber || 1} of {getPatientActiveShift(currentPatient)?.totalDays || 7} • {getPatientActiveShift(currentPatient)?.timeWindow}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.censusViewShiftBtn}
                        onPress={() => navigation?.navigate?.("Shifts")}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.censusViewShiftBtnText}>Shift Console →</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.patientTopRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {currentPatient.name
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientName}>{currentPatient.name}</Text>
                      <Text style={styles.patientMeta}>
                        {currentPatient.age > 0 ? `${currentPatient.age} yrs · ` : ""}
                        {currentPatient.gender !== "Not specified" ? `${currentPatient.gender} · ` : ""}
                        {currentPatient.bookingRef}
                      </Text>
                    </View>

                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>
                        {currentPatient.status || "Active"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.diagnosisPill}>
                    <Stethoscope size={13} color={colors.primary} />
                    <Text style={styles.diagnosisPillText} numberOfLines={1}>
                      {currentPatient.diagnosis || "Post-Operative Recovery"}
                    </Text>
                  </View>

                  {/* Quick Action Buttons */}
                  <View style={styles.quickActionRow}>
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() => setShowVitalsModal(true)}
                      activeOpacity={0.8}
                    >
                      <HeartPulse size={15} color={colors.white} strokeWidth={2.4} />
                      <Text style={styles.actionBtnPrimaryText}>Log Vitals</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnSecondary}
                      onPress={() => {
                        Alert.alert(
                          "Patient Contact",
                          `Family Contact: ${currentPatient.contactPerson} (${currentPatient.contactRelation})\nPhone: +91 98*** *****\nAddress: ${currentPatient.address}`
                        );
                      }}
                      activeOpacity={0.8}
                    >
                      <Phone size={14} color={colors.gray700} strokeWidth={2} />
                      <Text style={styles.actionBtnSecondaryText}>Contact</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ─── Minimal Segmented Pill Tabs ─── */}
                <View style={styles.tabBar}>
                  {[
                    { id: "Vitals", label: "Vitals" },
                    { id: "Meds", label: "Medications" },
                    { id: "History", label: "Care History" },
                    { id: "Contact", label: "Details" },
                  ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id as any)}
                        style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* ─── TAB 1: Clean Vitals Grid ─── */}
                {activeTab === "Vitals" && (
                  <View style={styles.contentSection}>
                    <View style={styles.vitalsGrid}>
                      <View style={styles.vitalTile}>
                        <Text style={styles.vitalLabel}>BLOOD PRESSURE</Text>
                        <Text style={styles.vitalValue}>{latestVitals?.bp || "--/--"}</Text>
                        <Text style={styles.vitalUnit}>mmHg</Text>
                      </View>

                      <View style={styles.vitalTile}>
                        <Text style={styles.vitalLabel}>HEART RATE</Text>
                        <Text style={styles.vitalValue}>{latestVitals?.pulse ? String(latestVitals.pulse).replace(" bpm", "") : "--"}</Text>
                        <Text style={styles.vitalUnit}>bpm</Text>
                      </View>

                      <View style={styles.vitalTile}>
                        <Text style={styles.vitalLabel}>OXYGEN SpO₂</Text>
                        <Text style={[styles.vitalValue, { color: latestVitals?.spo2 ? colors.success : colors.gray700 }]}>
                          {latestVitals?.spo2 ? `${String(latestVitals.spo2).replace("%", "")}%` : "--%"}
                        </Text>
                        <Text style={styles.vitalUnit}>Target ≥95%</Text>
                      </View>

                      <View style={styles.vitalTile}>
                        <Text style={styles.vitalLabel}>TEMPERATURE</Text>
                        <Text style={styles.vitalValue}>{latestVitals?.temp ? (String(latestVitals.temp).includes("°") ? latestVitals.temp : `${latestVitals.temp}°F`) : "--"}</Text>
                        <Text style={styles.vitalUnit}>Recorded</Text>
                      </View>
                    </View>

                    {latestVitals ? (
                      <View style={styles.readingTimestamp}>
                        <Clock3 size={12} color={colors.gray400} />
                        <Text style={styles.readingTimestampText}>
                          Last recorded {('date' in latestVitals && latestVitals.date) ? `${latestVitals.date} at ${latestVitals.time}` : ('recordedAt' in latestVitals && latestVitals.recordedAt) ? new Date(latestVitals.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.readingTimestamp, { justifyContent: "center" }]}>
                        <Text style={styles.readingTimestampText}>
                          No vitals logged yet. Tap "Log Vitals" above to record bedside telemetry.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* ─── TAB 2: Clean Medications ─── */}
                {activeTab === "Meds" && (
                  <View style={styles.contentSection}>
                    {/* Header bar with + Add Medication */}
                    <View style={styles.medsHeaderRow}>
                      <View>
                        <Text style={styles.medsHeaderTitle}>Prescribed Regimen</Text>
                        <Text style={styles.medsHeaderSub}>eMAR Bedside Dosing Checklist</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.addMedBtn}
                        onPress={() => setShowAddMedModal(true)}
                        activeOpacity={0.8}
                      >
                        <Plus size={14} color={colors.white} strokeWidth={2.4} />
                        <Text style={styles.addMedBtnText}>Add Medication</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.medCardList}>
                      {(!currentPatient.medications || currentPatient.medications.length === 0) ? (
                        <View style={{ padding: 24, alignItems: "center", justifyContent: "center" }}>
                          <Pill size={32} color={colors.gray400} style={{ marginBottom: 8 }} />
                          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.gray700 }}>No Prescribed Medications</Text>
                          <Text style={{ fontSize: 12, color: colors.gray500, textAlign: "center", marginTop: 4 }}>
                            No active medications ordered yet. Tap "+ Add Medication" to record a prescribed dose.
                          </Text>
                        </View>
                      ) : (
                        currentPatient.medications.map((med, idx) => {
                          const isGiven = med.status === "Given";
                          return (
                            <View key={med.id || idx} style={styles.medCard}>
                              <View style={[styles.medIcon, isGiven && styles.medIconGiven]}>
                                <Pill size={16} color={isGiven ? colors.success : colors.primary} />
                              </View>

                              <View style={{ flex: 1 }}>
                                <Text style={styles.medName}>{med.name}</Text>
                                <Text style={styles.medMeta}>
                                  {med.dosage} · {med.frequency} · {med.route}
                                </Text>
                                {med.instructions ? (
                                  <Text style={styles.medInstructions} numberOfLines={1}>
                                    Note: {med.instructions}
                                  </Text>
                                ) : null}
                              </View>

                              <TouchableOpacity
                                onPress={() => handleAdministerMedication(med)}
                                style={[
                                  styles.medActionBtn,
                                  isGiven ? styles.medActionBtnGiven : styles.medActionBtnDue,
                                ]}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.medActionText,
                                    isGiven ? styles.medActionTextGiven : styles.medActionTextDue,
                                  ]}
                                >
                                  {isGiven ? "Given" : "Give Dose"}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </View>
                )}

                {/* ─── TAB 3: Patient Care History ─── */}
                {activeTab === "History" && (() => {
                  const patientShifts = shifts.filter((s) => {
                    const pName = (currentPatient.name || "").toLowerCase().trim();
                    const sName = (s.patientName || "").toLowerCase().trim();
                    const sRef = (s.bookingRef || "").replace(/^BK-/, "").toLowerCase();
                    const pRef = (currentPatient.bookingRef || "").replace(/^BK-/, "").toLowerCase();
                    return (
                      (pName && sName && (pName.includes(sName) || sName.includes(pName))) ||
                      (sRef && pRef && sRef === pRef) ||
                      s.id === currentPatient.id
                    );
                  });

                  return (
                    <View style={styles.contentSection}>
                      <View style={styles.historySectionHeader}>
                        <View>
                          <Text style={styles.historySectionTitle}>Clinical Care History</Text>
                          <Text style={styles.historySectionSub}>
                            Archived shifts, charted vitals & handover logs
                          </Text>
                        </View>
                        <View style={styles.historyCountBadge}>
                          <Text style={styles.historyCountBadgeText}>
                            {patientShifts.length} {patientShifts.length === 1 ? "Shift" : "Shifts"}
                          </Text>
                        </View>
                      </View>

                      {patientShifts.length === 0 ? (
                        <View style={styles.emptyHistoryCard}>
                          <Clock3 size={28} color={colors.gray400} style={{ marginBottom: 8 }} />
                          <Text style={styles.emptyHistoryTitle}>No Shift History Yet</Text>
                          <Text style={styles.emptyHistorySub}>
                            Completed shift logs, recorded vitals, and handover sign-offs for {currentPatient.name} will appear here.
                          </Text>
                        </View>
                      ) : (
                        <View style={{ gap: 12 }}>
                          {patientShifts.map((shift, idx) => {
                            const isDone = shift.status === "completed";
                            const hasVitals = shift.vitals && (shift.vitals.bp || shift.vitals.pulse || shift.vitals.spo2);
                            return (
                              <View key={shift.id || idx} style={styles.patientHistoryCard}>
                                <View style={styles.patientHistoryTop}>
                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                      <Text style={styles.patientHistoryDay}>
                                        Day {shift.dayNumber || idx + 1}
                                      </Text>
                                      <Text style={styles.patientHistoryDate}>
                                        • {shift.date ? new Date(shift.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : `Shift ${idx + 1}`}
                                      </Text>
                                    </View>
                                    <Text style={styles.patientHistoryHours}>
                                      {shift.timeWindow} ({shift.durationHrs || 12} hrs)
                                    </Text>
                                  </View>

                                  <View
                                    style={[
                                      styles.historyStatusPill,
                                      isDone ? styles.historyStatusDone : styles.historyStatusUpcoming,
                                    ]}
                                  >
                                    {isDone && <CheckCircle2 size={11} color="#059669" strokeWidth={2.4} />}
                                    <Text
                                      style={[
                                        styles.historyStatusText,
                                        isDone ? { color: "#059669" } : { color: colors.primary },
                                      ]}
                                    >
                                      {isDone ? "Completed" : "Scheduled"}
                                    </Text>
                                  </View>
                                </View>

                                {hasVitals && (
                                  <View style={styles.patientHistoryVitalsPill}>
                                    <HeartPulse size={12} color="#059669" />
                                    <Text style={styles.patientHistoryVitalsText}>
                                      BP {shift.vitals?.bp || "--/--"} • HR {shift.vitals?.pulse || "--"} bpm • SpO₂ {shift.vitals?.spo2 || "--"}%
                                      {shift.vitals?.temp ? ` • ${shift.vitals.temp}°F` : ""}
                                    </Text>
                                  </View>
                                )}

                                {shift.notes ? (
                                  <View style={styles.patientHistoryNotesBox}>
                                    <Text style={styles.patientHistoryNotesLabel}>CLINICAL HANDOVER</Text>
                                    <Text style={styles.patientHistoryNotesText}>{shift.notes}</Text>
                                  </View>
                                ) : null}

                                <View style={styles.patientHistoryFooter}>
                                  <Text style={styles.patientHistoryPayout}>
                                    ₹{(shift.netPayout || 0).toLocaleString("en-IN")} Disbursed
                                  </Text>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                    <ShieldCheck size={12} color="#059669" />
                                    <Text style={styles.patientHistoryVerifiedText}>Verified Timesheet</Text>
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* ─── TAB 4: Care Details & Hospital ─── */}
                {activeTab === "Contact" && (
                  <View style={styles.contentSection}>
                    <View style={styles.detailsCard}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Hospital</Text>
                        <Text style={styles.detailValue}>
                          {currentPatient.hospital || "Not recorded"}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Physician</Text>
                        <Text style={styles.detailValue}>
                          {currentPatient.attendingDoctor || "Not assigned"}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Allergies</Text>
                        <Text style={styles.detailValue}>
                          {currentPatient.allergies && currentPatient.allergies.length > 0
                            ? currentPatient.allergies.join(", ")
                            : "No known drug allergies (NKDA)"}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Care Plan</Text>
                        <Text style={styles.detailValue}>
                          Day {currentPatient.currentShiftDay} of {currentPatient.totalShiftDays}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Emergency Contact</Text>
                        <Text style={styles.detailValue}>
                          {currentPatient.contactPerson} ({currentPatient.contactRelation})
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* Scroll clearance spacer */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bedside Vitals Logger Modal */}
      <LogVitalsModal
        visible={showVitalsModal}
        onClose={() => setShowVitalsModal(false)}
        onSave={handleSaveVitals}
        patientName={currentPatient?.name}
      />

      {/* Bedside Medication Order Modal */}
      <AddMedicationModal
        visible={showAddMedModal}
        onClose={() => setShowAddMedModal(false)}
        onSave={handleSaveMedicationOrder}
        patientName={currentPatient?.name}
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 1,
    fontWeight: "500",
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    ...neuShadows.buttonCircle,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 220,
    gap: 16,
  },

  /* Patient Selector Pill Rail */
  patientPillRail: {
    gap: 10,
    paddingVertical: 4,
  },
  patientPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  patientPillActive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    ...neuShadows.cardInset,
  },
  patientPillInactive: {
    backgroundColor: colors.neuInset,
  },
  patientPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gray400,
  },
  patientPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray600,
  },
  patientPillTextActive: {
    color: colors.gray900,
    fontWeight: "800",
  },
  patientPillHasActiveShift: {
    borderColor: "#A7F3D0",
    borderWidth: 1,
    backgroundColor: "#ECFDF5",
  },
  activeShiftMicroBadge: {
    backgroundColor: "#059669",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 2,
  },
  activeShiftMicroText: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.4,
  },

  /* Census Active Shift Banner */
  censusActiveShiftBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  censusActiveShiftLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 6,
  },
  censusPulseGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  censusActiveShiftTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#065F46",
    letterSpacing: 0.3,
  },
  censusActiveShiftSub: {
    fontSize: 11,
    color: "#047857",
    marginTop: 1,
    fontWeight: "500",
  },
  censusViewShiftBtn: {
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  censusViewShiftBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },

  /* Patient Card */
  patientCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    padding: 20,
    ...neuShadows.cardRaised,
  },
  patientTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
  },
  patientName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  patientMeta: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
    fontWeight: "500",
  },
  statusPill: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.success,
  },
  diagnosisPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.neuBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 14,
  },
  diagnosisPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray700,
    flex: 1,
  },
  quickActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    ...neuShadows.buttonPrimary,
  },
  actionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
  },
  actionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.neuBg,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray800,
  },

  /* Minimal Tab Bar */
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.neuInset,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: colors.white,
    ...neuShadows.cardInset,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray500,
  },
  tabBtnTextActive: {
    color: colors.gray900,
    fontWeight: "800",
  },

  /* Content Sections */
  contentSection: {
    gap: 12,
  },

  /* Vitals Grid */
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  vitalTile: {
    width: "48.2%",
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    padding: 16,
    alignItems: "center",
    ...neuShadows.card,
  },
  vitalLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.gray400,
    letterSpacing: 0.5,
  },
  vitalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.gray900,
    marginTop: 6,
  },
  vitalUnit: {
    fontSize: 10,
    color: colors.gray500,
    marginTop: 2,
    fontWeight: "600",
  },
  readingTimestamp: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 4,
  },
  readingTimestampText: {
    fontSize: 11,
    color: colors.gray400,
  },

  /* Meds Section */
  medsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  medsHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  medsHeaderSub: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 1,
  },
  addMedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  addMedBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
  medCardList: {
    gap: 10,
  },
  medCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    padding: 14,
    gap: 12,
    ...neuShadows.card,
  },
  medIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  medIconGiven: {
    backgroundColor: colors.successSoft,
  },
  medName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.gray900,
  },
  medMeta: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 2,
  },
  medInstructions: {
    fontSize: 10,
    color: colors.gray500,
    fontStyle: "italic",
    marginTop: 2,
  },
  medActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  medActionBtnDue: {
    backgroundColor: colors.primary,
  },
  medActionBtnGiven: {
    backgroundColor: colors.successSoft,
  },
  medActionText: {
    fontSize: 11,
    fontWeight: "800",
  },
  medActionTextDue: {
    color: colors.white,
  },
  medActionTextGiven: {
    color: colors.success,
  },

  /* Details Card */
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    padding: 18,
    gap: 14,
    ...neuShadows.card,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 13,
    color: colors.gray500,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray900,
    maxWidth: "60%",
    textAlign: "right",
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    marginTop: 40,
    ...neuShadows.cardRaised,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.gray900,
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.gray500,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },

  /* Census History Tab Styles */
  historySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  historySectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gray900,
  },
  historySectionSub: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 2,
  },
  historyCountBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyCountBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  emptyHistoryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray800,
  },
  emptyHistorySub: {
    fontSize: 12,
    color: colors.gray500,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  patientHistoryCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    ...neuShadows.card,
  },
  patientHistoryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  patientHistoryDay: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.gray900,
  },
  patientHistoryDate: {
    fontSize: 11,
    color: colors.gray500,
  },
  patientHistoryHours: {
    fontSize: 11,
    color: colors.gray600,
    marginTop: 2,
  },
  historyStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyStatusDone: {
    backgroundColor: "#ECFDF5",
  },
  historyStatusUpcoming: {
    backgroundColor: "#EFF6FF",
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  patientHistoryVitalsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  patientHistoryVitalsText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
  },
  patientHistoryNotesBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  patientHistoryNotesLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.gray500,
    marginBottom: 2,
  },
  patientHistoryNotesText: {
    fontSize: 11,
    color: colors.gray800,
    lineHeight: 15,
  },
  patientHistoryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  patientHistoryPayout: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
  },
  patientHistoryVerifiedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
  },
});
