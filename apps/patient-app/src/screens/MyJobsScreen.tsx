import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Search,
  Plus,
  HeartHandshake,
  Users,
  MapPin,
  Clock,
  Trash2,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Sparkles,
  Stethoscope,
  ArrowRight,
  Filter,
} from "lucide-react-native";
import { colors, neuShadows } from "../theme/colors";
import { api } from "../lib/api";
import { JobsListSkeleton } from "../components/ui/Skeleton";

interface CareRequestUI {
  id: string;
  title: string;
  category: string;
  patient: string;
  locality: string;
  shiftModel: string;
  proposalsCount: number;
  createdAt: string;
  targetBudget: string;
  status: "open" | "converted" | "completed";
  urgency: string;
  diagnosis: string;
  assignedNurse: string;
  budgetNote: string;
  shiftsCompleted: string;
  checklist: string[];
}

interface MyJobsScreenProps {
  navigation?: any;
}

const formatCurrency = (val: number) => {
  return val ? val.toLocaleString("en-IN") : "0";
};

const getTimeAgo = (dateStr: string) => {
  if (!dateStr) return "Recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export const MyJobsScreen: React.FC<MyJobsScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<"open" | "converted" | "completed">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [careRequests, setCareRequests] = useState<CareRequestUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const [jobs, bookings] = await Promise.all([
        api.getMyJobs(),
        api.getBookings(),
      ]);

      // Map jobs to the UI format
      const mapped: CareRequestUI[] = jobs.map((j: any) => {
        const booking = bookings.find((b: any) => b.jobId === j.id);
        let status: "open" | "converted" | "completed" = "open";
        if (j.status === "filled" || j.status === "completed") {
          status = j.status === "completed" ? "completed" : "converted";
        }

        return {
          id: j.id,
          title: j.title,
          category: j.careType,
          patient: j.patientName,
          locality: j.locality ? `${j.locality}, ${j.city}` : j.city,
          shiftModel: j.shiftModel || `${j.dailyHours}h Shift`,
          proposalsCount: j.bidCount || 0,
          createdAt: getTimeAgo(j.createdAt),
          targetBudget: formatCurrency(j.budgetMax * j.dailyHours),
          status,
          urgency: j.urgency === "urgent" ? "Immediate Start" : j.urgency === "emergency" ? "Emergency" : "Flexible Start",
          diagnosis: j.description,
          assignedNurse: booking?.nurseName || "",
          budgetNote: booking ? `₹${formatCurrency(booking.totalAmount)} Care Budget Allocated` : "",
          shiftsCompleted: booking ? `${booking.completedShifts} Shifts Completed` : "",
          checklist: j.checklist || [],
        };
      });

      setCareRequests(mapped);
    } catch (err) {
      console.warn("MyJobs fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Also reload when the screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", loadJobs);
    return unsubscribe;
  }, [navigation, loadJobs]);

  const counts = {
    open: careRequests.filter((r) => r.status === "open").length,
    converted: careRequests.filter((r) => r.status === "converted").length,
    completed: careRequests.filter((r) => r.status === "completed").length,
  };

  const filteredRequests = careRequests
    .filter((req) => {
      if (activeTab === "open") return req.status === "open";
      if (activeTab === "converted") return req.status === "converted";
      if (activeTab === "completed") return req.status === "completed";
      return true;
    })
    .filter((req) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        req.title.toLowerCase().includes(q) ||
        req.patient.toLowerCase().includes(q) ||
        req.locality.toLowerCase().includes(q) ||
        req.category.toLowerCase().includes(q)
      );
    });

  const handleDelete = (id: string, title: string) => {
    const doDelete = async () => {
      // Optimistically remove from state immediately
      setCareRequests((prev) => prev.filter((r) => r.id !== id));
      try {
        await api.deleteJob(id);
        if (Platform.OS !== "web") {
          Alert.alert("Request Retracted", `"${title}" has been removed.`);
        }
        loadJobs();
      } catch (err: any) {
        console.error("Delete job error:", err);
        if (Platform.OS === "web") {
          window.alert(err.message || "Failed to retract request");
        } else {
          Alert.alert("Error", err.message || "Failed to retract request");
        }
        loadJobs();
      }
    };

    if (Platform.OS === "web") {
      const ok = window.confirm(
        `Retract Care Request\n\nAre you sure you want to retract "${title}"?\nAny pending nurse bids will be cancelled.`
      );
      if (ok) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Retract Care Request",
        `Are you sure you want to retract "${title}"? Any pending nurse bids will be cancelled.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Retract Request",
            style: "destructive",
            onPress: doDelete,
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neuBg} />

      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => {
            if (navigation?.canGoBack?.()) {
              navigation.goBack();
            } else {
              navigation?.navigate?.("Dashboard");
            }
          }}
          activeOpacity={0.75}
        >
          <ChevronLeft size={22} color={colors.gray800} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.topTitleWrap}>
          <Text style={styles.topBarTitle}>My Care Requests & Postings</Text>
          <Text style={styles.topBarSub}>Manage open postings & nurse proposals</Text>
        </View>

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => navigation?.navigate?.("Post Job")}
          activeOpacity={0.75}
        >
          <Plus size={20} color={colors.primary} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadJobs}
            tintColor={colors.primary}
          />
        }
      >
        {/* Tab Filters (Exact 3 tabs with counts from Image 2) */}
        <View style={styles.tabFiltersRow}>
          <TouchableOpacity
            style={[
              styles.tabFilterPill,
              activeTab === "open" && styles.tabFilterPillActive,
            ]}
            onPress={() => setActiveTab("open")}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.tabFilterText,
                activeTab === "open" && styles.tabFilterTextActive,
              ]}
            >
              Open Requests
            </Text>
            <View
              style={[
                styles.tabFilterCountBadge,
                activeTab === "open" && styles.tabFilterCountBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabFilterCountText,
                  activeTab === "open" && styles.tabFilterCountTextActive,
                ]}
              >
                {counts.open}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabFilterPill,
              activeTab === "converted" && styles.tabFilterPillActive,
            ]}
            onPress={() => setActiveTab("converted")}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.tabFilterText,
                activeTab === "converted" && styles.tabFilterTextActive,
              ]}
            >
              Converted to Shifts
            </Text>
            <View
              style={[
                styles.tabFilterCountBadge,
                activeTab === "converted" && styles.tabFilterCountBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabFilterCountText,
                  activeTab === "converted" && styles.tabFilterCountTextActive,
                ]}
              >
                {counts.converted}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabFilterPill,
              activeTab === "completed" && styles.tabFilterPillActive,
            ]}
            onPress={() => setActiveTab("completed")}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.tabFilterText,
                activeTab === "completed" && styles.tabFilterTextActive,
              ]}
            >
              Completed
            </Text>
            <View
              style={[
                styles.tabFilterCountBadge,
                activeTab === "completed" && styles.tabFilterCountBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabFilterCountText,
                  activeTab === "completed" && styles.tabFilterCountTextActive,
                ]}
              >
                {counts.completed}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search Input (Exact from Image 2) */}
        <View style={styles.searchContainer}>
          <Search size={16} color={colors.gray400} strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Filter by title, patient, locality..."
            placeholderTextColor={colors.gray400}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Text style={styles.clearSearchText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Converted Shift Alert Card (Only when on Converted tab and there are converted requests) */}
        {activeTab === "converted" && counts.converted > 0 && (
          <View style={styles.convertedBannerBezel}>
            <View style={styles.convertedBannerInner}>
              <View style={styles.convertedBannerTopRow}>
                <View style={styles.convertedIconBox}>
                  <HeartHandshake size={20} color="#059669" strokeWidth={2.2} />
                </View>
                <View style={styles.convertedTextWrap}>
                  <Text style={styles.convertedTitle}>
                    {counts.converted === 1
                      ? "1 Care Request Active in Clinical Care"
                      : `${counts.converted} Care Requests Active in Clinical Care`}
                  </Text>
                  <Text style={styles.convertedDesc}>
                    Nurse assigned and booking confirmed. Live patient care shifts are tracked in your Shift Cockpit.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.cockpitBtn}
                onPress={() => navigation?.navigate?.("Bookings")}
                activeOpacity={0.85}
              >
                <Text style={styles.cockpitBtnText}>Go to Care Cockpit</Text>
                <View style={styles.cockpitIconCircle}>
                  <ChevronRight size={13} color="#059669" strokeWidth={2.6} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Care Requests Listing - Clean Neumorphic Cards */}
        <View style={styles.requestList}>
          {isLoading && careRequests.length === 0 ? (
            <JobsListSkeleton count={3} />
          ) : filteredRequests.length === 0 ? (
            /* Empty State */
            <View style={styles.emptyCardBezel}>
              <View style={styles.emptyCardInner}>
                <View style={styles.emptyIconWrap}>
                  <FileText size={28} color={colors.primary} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyTitle}>No Care Requests Found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery.trim()
                    ? `No requests match "${searchQuery}". Try adjusting your search query.`
                    : `You do not have any requests under ${activeTab}. Post a request to receive clinical bids.`}
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => {
                    setSearchQuery("");
                    navigation?.navigate?.("Post Job");
                  }}
                  activeOpacity={0.85}
                >
                  <Plus size={14} color={colors.white} strokeWidth={3} />
                  <Text style={styles.emptyActionBtnText}>Post New Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            filteredRequests.map((req) => (
              <View key={req.id} style={styles.neuJobCard}>
                {/* Category & Status Badges Row */}
                <View style={styles.neuJobHeaderRow}>
                  <View style={styles.categoryChip}>
                    <Text style={styles.categoryChipText}>{req.category}</Text>
                  </View>

                  <View style={styles.headerBadgesRight}>
                    {req.status === "open" && (
                      <View style={styles.proposalsCountChip}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.proposalsCountText}>
                          {req.proposalsCount} Proposals
                        </Text>
                      </View>
                    )}
                    {req.status === "converted" && (
                      <View style={styles.activeShiftChip}>
                        <CheckCircle2 size={11} color="#059669" strokeWidth={2.4} />
                        <Text style={styles.activeShiftText}>Active Shift</Text>
                      </View>
                    )}
                    {req.status === "completed" && (
                      <View style={styles.completedChip}>
                        <Text style={styles.completedChipText}>Completed</Text>
                      </View>
                    )}
                    <Text style={styles.timeAgoText}>{req.createdAt}</Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={styles.requestTitle}>{req.title}</Text>

                {/* Single line diagnosis */}
                <Text style={styles.diagnosisSnippet} numberOfLines={1}>
                  {req.diagnosis}
                </Text>

                {/* Meta Chips: Location & Shift */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <MapPin size={12} color={colors.gray500} strokeWidth={2} />
                    <Text style={styles.metaText}>{req.locality}</Text>
                  </View>
                  <View style={styles.metaDot} />
                  <View style={styles.metaItem}>
                    <Clock size={12} color={colors.gray500} strokeWidth={2} />
                    <Text style={styles.metaText}>
                      {req.shiftModel.split("•")[0].trim()}
                    </Text>
                  </View>
                </View>

                {/* Subtle Divider */}
                <View style={styles.cardDivider} />

                {/* Footer: Budget & Actions */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.budgetWrap}>
                    <Text style={styles.budgetAmount}>₹{req.targetBudget}</Text>
                    <Text style={styles.budgetLabel}>Target Budget</Text>
                  </View>

                  <View style={styles.actionsGroup}>
                    {req.status === "open" && (
                      <>
                        <TouchableOpacity
                          style={styles.reviewBidsBtn}
                          onPress={() => navigation?.navigate?.("Proposals", { jobId: req.id })}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.reviewBidsBtnText}>
                            Review Proposals ({req.proposalsCount})
                          </Text>
                          <ChevronRight size={13} color={colors.white} strokeWidth={2.4} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(req.id, req.title)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={14} color="#EF4444" strokeWidth={2} />
                        </TouchableOpacity>
                      </>
                    )}

                    {req.status === "converted" && (
                      <TouchableOpacity
                        style={styles.cockpitCardBtn}
                        onPress={() => navigation?.navigate?.("Bookings")}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.cockpitCardBtnText}>Shift Cockpit</Text>
                        <ChevronRight size={13} color="#059669" strokeWidth={2.4} />
                      </TouchableOpacity>
                    )}

                    {req.status === "completed" && (
                      <TouchableOpacity
                        style={styles.completedEhrBtn}
                        onPress={() =>
                          Alert.alert(
                            "Discharge EHR Export",
                            "14 Shifts completed. Medical EHR downloaded."
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <FileText size={12} color={colors.gray700} strokeWidth={2} />
                        <Text style={styles.completedEhrBtnText}>EHR Summary</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 170, // Clearance for bottom floating capsule tab bar
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.neuBg,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7A8AAB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  topTitleWrap: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 8,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  topBarSub: {
    fontSize: 11,
    color: colors.gray500,
    fontWeight: "500",
  },
  /* Filter Tabs matching Image 2 */
  tabFiltersRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tabFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 2,
  },
  tabFilterPillActive: {
    borderColor: "#2E5BFF",
    backgroundColor: "#EAF0FF",
    shadowColor: "#2E5BFF",
    shadowOpacity: 0.16,
  },
  tabFilterText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray600,
  },
  tabFilterTextActive: {
    color: "#2E5BFF",
    fontWeight: "800",
  },
  tabFilterCountBadge: {
    backgroundColor: colors.neuInset,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabFilterCountBadgeActive: {
    backgroundColor: "#2E5BFF",
  },
  tabFilterCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray600,
    fontVariant: ["tabular-nums"],
  },
  tabFilterCountTextActive: {
    color: colors.white,
  },

  /* Search Input matching Image 2 */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.neuInset,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.gray900,
    padding: 0,
  },
  clearSearchText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray500,
  },

  /* Converted Banner */
  convertedBannerBezel: {
    backgroundColor: "#D1FAE5",
    borderRadius: 22,
    padding: 1.5,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 14,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  convertedBannerInner: {
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    padding: 14,
  },
  convertedBannerTopRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  convertedIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  convertedTextWrap: {
    flex: 1,
  },
  convertedTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46",
    marginBottom: 3,
  },
  convertedDesc: {
    fontSize: 11,
    color: "#047857",
    lineHeight: 15,
  },
  cockpitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cockpitBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
  cockpitIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Requests List & Double-Bezel Cards */
  requestList: {
    gap: 12,
  },
  neuJobCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  neuJobHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  requestCardBezel: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    padding: 1.5,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 4,
  },
  requestCardInner: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: "#EAF0FF",
    borderWidth: 1,
    borderColor: "#D6E4FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2E5BFF",
  },
  headerBadgesRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  proposalsCountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2E5BFF",
  },
  proposalsCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2E5BFF",
    fontVariant: ["tabular-nums"],
  },
  activeShiftChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  activeShiftText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },
  completedChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  completedChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray600,
  },
  timeAgoText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray400,
    fontVariant: ["tabular-nums"],
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  diagnosisSnippet: {
    fontSize: 11,
    color: colors.gray600,
    lineHeight: 16,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray600,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.gray300,
  },

  cardDivider: {
    height: 1,
    backgroundColor: "rgba(226, 232, 240, 0.7)",
    marginBottom: 12,
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budgetWrap: {
    justifyContent: "center",
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  budgetLabel: {
    fontSize: 10,
    color: colors.gray400,
    fontWeight: "600",
  },
  actionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewBidsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2E5BFF",
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: "#2E5BFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewBidsBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.white,
    fontVariant: ["tabular-nums"],
  },
  reviewBidsIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  cockpitCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cockpitCardBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.white,
  },
  cockpitCardIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  completedEhrBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
  },
  completedEhrBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray700,
  },

  /* Empty State Card */
  emptyCardBezel: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
    padding: 1.5,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyCardInner: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.gray500,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2E5BFF",
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 16,
    shadowColor: "#2E5BFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
});
