import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { CheckCircle2, Clock, Pill, RefreshCw, AlertCircle } from "lucide-react-native";
import { colors, neuShadows } from "../../theme/colors";
import { api } from "../../lib/api";
import { MedicationTodoItem } from "../../types";
import { subscribeToCrossAppEvents } from "../../lib/realtime";

interface MedicationTodoListCardProps {
  patientId?: string;
}

export const MedicationTodoListCard: React.FC<MedicationTodoListCardProps> = ({ patientId }) => {
  const [medications, setMedications] = useState<MedicationTodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMedications = useCallback(async () => {
    try {
      const list = await api.getMedicationTodoList(patientId);
      setMedications(list || []);
    } catch (err) {
      console.warn("Failed to load medication todo list:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadMedications();

    const unsub = subscribeToCrossAppEvents((event) => {
      if (
        event.type === "MEDICATION_ADDED" ||
        event.type === "MEDICATION_UPDATED" ||
        event.type === "NOTE_ADDED"
      ) {
        loadMedications();
      }
    });

    return () => {
      unsub();
    };
  }, [loadMedications]);

  const completedCount = medications.filter((m) => m.administered || m.status === "Given").length;
  const totalCount = medications.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.cardContainer}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            <Pill size={18} color={colors.primary} strokeWidth={2.2} />
          </View>
          <View>
            <Text style={styles.cardTitle}>Medication Care Checklist</Text>
            <Text style={styles.cardSubtitle}>Bedside dosing to-do list for attending nurse</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            setRefreshing(true);
            loadMedications();
          }}
          style={styles.refreshBtn}
          activeOpacity={0.7}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <RefreshCw size={14} color={colors.gray500} />
          )}
        </TouchableOpacity>
      </View>

      {/* Progress Metric Bar */}
      {totalCount > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTextRow}>
            <Text style={styles.progressLabel}>Today's Schedule Progress</Text>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>
                {completedCount} of {totalCount} Administered ({progressPercent}%)
              </Text>
            </View>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.min(100, progressPercent)}%` }]} />
          </View>
        </View>
      )}

      {/* Medication Items List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Syncing bedside care checklist...</Text>
        </View>
      ) : medications.length === 0 ? (
        <View style={styles.emptyBox}>
          <AlertCircle size={20} color={colors.gray400} />
          <Text style={styles.emptyTitle}>No Active Medication Orders</Text>
          <Text style={styles.emptyText}>
            When your assigned nurse prescribes or records medication orders, they will appear here as a real-time dosing checklist.
          </Text>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          {medications.map((item) => {
            const isGiven = item.administered || item.status === "Given";
            return (
              <View key={item.id} style={[styles.itemCard, isGiven && styles.itemCardGiven]}>
                {/* Status Checkbox / Icon */}
                <View style={[styles.statusIconWrap, isGiven ? styles.statusIconGiven : styles.statusIconDue]}>
                  {isGiven ? (
                    <CheckCircle2 size={18} color="#059669" strokeWidth={2.4} />
                  ) : (
                    <Clock size={16} color="#D97706" strokeWidth={2.2} />
                  )}
                </View>

                {/* Medication Details */}
                <View style={{ flex: 1 }}>
                  <View style={styles.itemTitleRow}>
                    <Text style={[styles.medName, isGiven && styles.medNameGiven]}>{item.name}</Text>
                    <View style={[styles.statusBadge, isGiven ? styles.badgeGiven : styles.badgeDue]}>
                      <Text style={[styles.statusBadgeText, isGiven ? styles.badgeTextGiven : styles.badgeTextDue]}>
                        {isGiven ? "Given" : "Scheduled"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.medMeta}>
                    {item.dosage} · {item.route || "Oral"} · {item.frequency}
                  </Text>

                  {item.instructions ? (
                    <Text style={styles.instructionsText} numberOfLines={1}>
                      Note: {item.instructions}
                    </Text>
                  ) : null}

                  {isGiven && (
                    <Text style={styles.administeredTimeText}>
                      ✓ Administered {item.administeredAt || "today"} · RN Verified
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    padding: 18,
    marginBottom: 20,
    ...neuShadows.cardRaised,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 2,
    fontWeight: "500",
  },
  refreshBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.neuBg,
    alignItems: "center",
    justifyContent: "center",
  },
  progressContainer: {
    backgroundColor: colors.neuBg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray700,
  },
  progressBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  progressBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  listWrapper: {
    gap: 10,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.neuBg,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  itemCardGiven: {
    backgroundColor: "#F8FAFC",
    borderColor: "rgba(5, 150, 105, 0.15)",
  },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  statusIconGiven: {
    backgroundColor: "#ECFDF5",
  },
  statusIconDue: {
    backgroundColor: "#FFFBEB",
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  medName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.gray900,
    flex: 1,
  },
  medNameGiven: {
    color: colors.gray700,
  },
  medMeta: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 3,
    fontWeight: "500",
  },
  instructionsText: {
    fontSize: 10,
    color: colors.gray600,
    fontStyle: "italic",
    marginTop: 3,
  },
  administeredTimeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeGiven: {
    backgroundColor: "#ECFDF5",
  },
  badgeDue: {
    backgroundColor: "#FFFBEB",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  badgeTextGiven: {
    color: "#059669",
  },
  badgeTextDue: {
    color: "#D97706",
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.gray500,
  },
  emptyBox: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray700,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 11,
    color: colors.gray500,
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 16,
  },
});
