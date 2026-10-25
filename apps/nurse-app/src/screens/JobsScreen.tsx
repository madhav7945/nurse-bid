import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BriefcaseBusiness,
  Clock3,
  MapPin,
  Search,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  FileText,
  CheckCircle2,
  X,
  Undo2,
  AlertCircle,
} from "lucide-react-native";
import { useJobs } from "../hooks/useJobs";
import { colors, neuShadows } from "../theme/colors";
import { typography } from "../theme/typography";
import { JobsSkeleton, NurseProposalListSkeleton } from "../components/ui/NurseSkeleton";
import { api, NurseProposalItem } from "../lib/api";
import { subscribeToCrossAppEvents } from "../lib/realtime";
import { useAuth } from "../context/AuthContext";

// In-memory SWR cache strictly namespaced by nurse ID to prevent multi-tenant bleed
const cachedMyBidsByNurse: Record<string, NurseProposalItem[]> = {};

export const JobsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { nurseId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Roles");
  const [selectedCareType, setSelectedCareType] = useState<string>("All");

  // Nurse's own proposals state initialized from nurse-scoped cache for instant 0ms render
  const [myBids, setMyBids] = useState<NurseProposalItem[]>(() =>
    nurseId ? cachedMyBidsByNurse[nurseId] || [] : []
  );
  const [loadingBids, setLoadingBids] = useState(
    nurseId ? !cachedMyBidsByNurse[nurseId] || cachedMyBidsByNurse[nurseId].length === 0 : false
  );
  const [showProposalsModal, setShowProposalsModal] = useState(false);
  const [withdrawingBidId, setWithdrawingBidId] = useState<string | null>(null);

  const careTypePills = ["All", "Critical Care", "Post-Surgical", "Tracheostomy", "Elderly Care"];

  const { filteredJobs, loading, refreshing, refresh } = useJobs({
    activeFilter,
    selectedCareType,
    searchQuery,
  });

  const loadMyBids = useCallback(async () => {
    let safetyTimer: any;
    try {
      const hasCache = nurseId && cachedMyBidsByNurse[nurseId] && cachedMyBidsByNurse[nurseId].length > 0;
      if (!hasCache) {
        setLoadingBids(true);
      }
      safetyTimer = setTimeout(() => {
        setLoadingBids(false);
      }, 2500);

      const data = await api.getMyBids();
      if (data) {
        if (nurseId) cachedMyBidsByNurse[nurseId] = data;
        setMyBids(data);
      }
    } catch (err) {
      console.warn("loadMyBids error:", err);
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      setLoadingBids(false);
    }
  }, []);

  useEffect(() => {
    loadMyBids();

    const unsubFocus = navigation?.addListener?.("focus", () => {
      refresh();
      loadMyBids();
    });

    const unsubRealtime = subscribeToCrossAppEvents((event) => {
      if (
        event.type === "BID_SUBMITTED" ||
        event.type === "NEW_BID" ||
        event.type === "BID_WITHDRAWN" ||
        event.type === "BID_ACCEPTED" ||
        event.type === "NEW_JOB" ||
        event.type === "JOB_POSTED"
      ) {
        loadMyBids();
        refresh();
      }
    });

    return () => {
      unsubFocus?.();
      unsubRealtime?.();
    };
  }, [navigation, refresh, loadMyBids]);

  const myBidsByJobId = useMemo(() => {
    const map = new Map<string, NurseProposalItem>();
    (myBids || []).forEach((b) => {
      if (b.jobId && b.status !== "withdrawn") {
        map.set(b.jobId, b);
      }
    });
    return map;
  }, [myBids]);

  const activeBidsCount = useMemo(() => {
    return (myBids || []).filter((b) => b.status === "pending" || b.status === "accepted").length;
  }, [myBids]);

  const handleWithdrawProposal = useCallback((bid: NurseProposalItem) => {
    Alert.alert(
      "Withdraw Care Proposal?",
      `Are you sure you want to withdraw your ₹${bid.proposedRate}/hr proposal for "${bid.job?.title || "this requisition"}"? The requisition poster will be notified and your proposed slot released.`,
      [
        { text: "Keep Proposal", style: "cancel" },
        {
          text: "Yes, Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              setWithdrawingBidId(bid.id);
              const success = await api.withdrawBid(bid.id, bid.jobId);
              if (success) {
                Alert.alert("Proposal Withdrawn", "Your care proposal was cancelled.");
                await loadMyBids();
                refresh();
              } else {
                Alert.alert("Notice", "Unable to withdraw proposal. Please try again.");
              }
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to withdraw proposal.");
            } finally {
              setWithdrawingBidId(null);
            }
          },
        },
      ]
    );
  }, [loadMyBids, refresh]);

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "Recently";
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch {
      return "Recently";
    }
  };



  if (loading) {
    return <JobsSkeleton />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      {/* Header & Search */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.headerTitle}>Open Shift Radar</Text>
            <Text style={styles.headerSubtitle}>Real-time clinical shifts in Punjab</Text>
          </View>
          <TouchableOpacity
            style={styles.myProposalsHeaderBtn}
            onPress={() => setShowProposalsModal(true)}
            activeOpacity={0.8}
            accessibilityLabel="View my submitted proposals"
          >
            <FileText size={15} color={colors.primary} />
            <Text style={styles.myProposalsBtnText}>My Proposals</Text>
            {activeBidsCount > 0 ? (
              <View style={styles.proposalsBadge}>
                <Text style={styles.proposalsBadgeText}>{activeBidsCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color={colors.gray400} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { outlineStyle: 'none' } as any]}
            placeholder="Search specialties, locations..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => {
              const filters: ("All Roles" | "Urgent" | "Standard")[] = ["All Roles", "Urgent", "Standard"];
              const currentIndex = filters.indexOf(activeFilter as any);
              const nextIndex = (currentIndex + 1) % filters.length;
              setActiveFilter(filters[nextIndex]);
            }}
            activeOpacity={0.7}
            accessibilityLabel="Cycle shift urgency filter"
          >
            <SlidersHorizontal size={18} color={activeFilter !== "All Roles" ? colors.primary : colors.gray700} />
          </TouchableOpacity>
        </View>

        {/* Horizontal Scroll Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsScroll}
          contentContainerStyle={styles.pillsContent}
        >
          {careTypePills.map((pill) => (
            <TouchableOpacity
              key={pill}
              style={[styles.pillBtn, selectedCareType === pill && styles.pillBtnActive]}
              onPress={() => setSelectedCareType(pill)}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedCareType === pill && styles.pillTextActive,
                ]}
              >
                {pill}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Primary Tab Navigation */}
      <View style={styles.tabContainer}>
        {["All Roles", "Urgent", "Standard"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeFilter === tab && styles.tabBtnActive]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeFilter === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Job List */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        {filteredJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Sparkles size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Shifts Found</Text>
            <Text style={styles.emptySub}>
              Try adjusting your filters or check back later for new opportunities in your area.
            </Text>
          </View>
        ) : (
          filteredJobs.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              {/* Card Header (Urgency & Role) */}
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  {job.urgency === "Urgent" || job.urgency === "Emergency" ? (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentText}>{job.urgency}</Text>
                    </View>
                  ) : null}
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{job.careType || "General Care"}</Text>
                  </View>
                </View>
              </View>

              {/* Title & Patient Info */}
              <Text style={styles.jobTitle} numberOfLines={2}>
                {job.title}
              </Text>

              <View style={styles.patientInfoRow}>
                <Text style={styles.patientInfoText}>
                  Patient: {job.patientName} • Identity Verified
                </Text>
              </View>

              {/* Description Snippet */}
              <Text style={styles.descriptionText} numberOfLines={2}>
                {job.description}
              </Text>

              {/* Metadata (Location & Time) */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <MapPin size={14} color={colors.gray500} />
                  <Text style={styles.metaText}>
                    {job.locality}, {job.city} ({job.distanceKm || "1.5"} km)
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock3 size={14} color={colors.gray500} />
                  <Text style={styles.metaText}>
                    Day Shift ({job.dailyHours}h) • {job.durationDays} days
                  </Text>
                </View>
              </View>

              {/* Proposal Status Badge on Card if Nurse already bid on this job */}
              {myBidsByJobId.has(job.id) ? (
                <TouchableOpacity
                  style={styles.cardProposalBanner}
                  onPress={() => setShowProposalsModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardProposalLeft}>
                    <CheckCircle2 size={13} color="#059669" />
                    <Text style={styles.cardProposalText}>
                      Your Proposal: ₹{myBidsByJobId.get(job.id)?.proposedRate}/hr •{" "}
                      <Text style={{ fontWeight: "800" }}>
                        {myBidsByJobId.get(job.id)?.status === "pending"
                          ? "PENDING"
                          : myBidsByJobId.get(job.id)?.status.toUpperCase()}
                      </Text>
                    </Text>
                  </View>
                  <Text style={styles.cardProposalManageText}>View / Manage →</Text>
                </TouchableOpacity>
              ) : null}

              {/* Card Footer (Budget & Action) */}
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.budgetLabel}>CLIENT BUDGET</Text>
                  <Text style={styles.budgetAmount}>
                    ₹{(job.hourlyRate || job.budget || 550).toLocaleString("en-IN")}{" "}
                    <Text style={styles.budgetUnit}>/ hr</Text>
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => navigation.navigate("JobDetail", { job })}
                >
                  <Text style={styles.applyBtnText}>
                    {myBidsByJobId.has(job.id) ? "Proposal Dossier" : "View Dossier"}
                  </Text>
                  <ChevronRight size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ─── My Proposals Modal (Slide-up Sheet) ─── */}
      <Modal
        visible={showProposalsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProposalsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetContainer}>
            {/* Modal Header */}
            <View style={styles.modalSheetHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <FileText size={20} color={colors.primary} />
                  <Text style={styles.modalSheetTitle}>My Care Proposals</Text>
                </View>
                <Text style={styles.modalSheetSubtitle}>
                  Track patient review status, rates, or withdraw active bids
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowProposalsModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={20} color={colors.gray700} />
              </TouchableOpacity>
            </View>

            {/* Proposals List */}
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {loadingBids && myBids.length === 0 ? (
                <View style={{ paddingVertical: 10 }}>
                  <NurseProposalListSkeleton />
                </View>
              ) : myBids.length === 0 ? (
                <View style={styles.modalEmptyBox}>
                  <View style={styles.modalEmptyIconCircle}>
                    <Sparkles size={28} color={colors.primary} />
                  </View>
                  <Text style={styles.modalEmptyTitle}>No Submitted Proposals</Text>
                  <Text style={styles.modalEmptySubtitle}>
                    Browse open shifts on the radar behind this sheet and tap "View Dossier" to submit your clinical rate.
                  </Text>
                </View>
              ) : (
                myBids.map((bid) => {
                  const isPending = bid.status === "pending";
                  const isAccepted = bid.status === "accepted";
                  const isWithdrawn = bid.status === "withdrawn";

                  return (
                    <View key={bid.id} style={styles.proposalCard}>
                      {/* Card Top: Job Title & Status Chip */}
                      <View style={styles.proposalCardHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.proposalJobTitle} numberOfLines={1}>
                            {bid.job?.title || "Specialized Home Nursing"}
                          </Text>
                          <Text style={styles.proposalPatientInfo}>
                            Patient: {bid.job?.patientName || "Confidential"} • {bid.job?.city || "Punjab"}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusChip,
                            isAccepted
                              ? styles.statusChipAccepted
                              : isPending
                              ? styles.statusChipPending
                              : styles.statusChipWithdrawn,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusChipText,
                              isAccepted
                                ? styles.statusChipTextAccepted
                                : isPending
                                ? styles.statusChipTextPending
                                : styles.statusChipTextWithdrawn,
                            ]}
                          >
                            {isAccepted
                              ? "HIRED & FUNDED"
                              : isPending
                              ? "UNDER REVIEW"
                              : isWithdrawn
                              ? "WITHDRAWN"
                              : bid.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {/* Proposal Financials */}
                      <View style={styles.proposalMetricsRow}>
                        <View style={styles.proposalMetricItem}>
                          <Text style={styles.proposalMetricLabel}>YOUR RATE</Text>
                          <Text style={styles.proposalMetricValue}>₹{bid.proposedRate}/hr</Text>
                        </View>
                        <View style={styles.proposalMetricDivider} />
                        <View style={styles.proposalMetricItem}>
                          <Text style={styles.proposalMetricLabel}>EST. PAYOUT</Text>
                          <Text style={styles.proposalMetricValue}>
                            ₹{(bid.netPayout || bid.totalGross || 0).toLocaleString("en-IN")}
                          </Text>
                        </View>
                        <View style={styles.proposalMetricDivider} />
                        <View style={styles.proposalMetricItem}>
                          <Text style={styles.proposalMetricLabel}>SUBMITTED</Text>
                          <Text style={styles.proposalMetricTime}>{getTimeAgo(bid.createdAt)}</Text>
                        </View>
                      </View>

                      {/* Cover Message Preview */}
                      {bid.coverMessage ? (
                        <View style={styles.proposalCoverBox}>
                          <Text style={styles.proposalCoverText} numberOfLines={2}>
                            "{bid.coverMessage}"
                          </Text>
                        </View>
                      ) : null}

                      {/* Action Buttons */}
                      <View style={styles.proposalActionRow}>
                        {isPending ? (
                          <TouchableOpacity
                            style={styles.withdrawActionBtn}
                            onPress={() => handleWithdrawProposal(bid)}
                            disabled={withdrawingBidId === bid.id}
                            activeOpacity={0.8}
                          >
                            {withdrawingBidId === bid.id ? (
                              <ActivityIndicator size="small" color="#DC2626" />
                            ) : (
                              <>
                                <Undo2 size={14} color="#DC2626" />
                                <Text style={styles.withdrawActionBtnText}>Withdraw Proposal</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : isAccepted ? (
                          <TouchableOpacity
                            style={styles.viewShiftBtn}
                            onPress={() => {
                              setShowProposalsModal(false);
                              navigation.navigate("Shifts");
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.viewShiftBtnText}>Open Shift Control →</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.withdrawnStatusNote}>
                            <AlertCircle size={13} color={colors.gray400} />
                            <Text style={styles.withdrawnStatusNoteText}>
                              Slot released back to Punjab marketplace
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.neuBg,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neuBorder,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.gray900,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neuInset,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.gray900,
  },
  filterBtn: {
    padding: 4,
  },
  pillsScroll: {
    marginBottom: 12,
  },
  pillsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  pillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    ...neuShadows.cardInset,
  },
  pillBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...neuShadows.buttonPrimary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray600,
  },
  pillTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.neuInset,
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: colors.white,
    ...neuShadows.cardRaised,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  listContent: {
    padding: 20,
    paddingBottom: 170,
    gap: 16,
  },
  jobCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    ...neuShadows.cardRaised,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  urgentBadge: {
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.danger,
  },
  roleBadge: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray700,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray900,
    marginBottom: 4,
  },
  patientInfoRow: {
    marginBottom: 12,
  },
  patientInfoText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.gray600,
    lineHeight: 20,
    marginBottom: 16,
  },
  metaRow: {
    gap: 8,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: colors.gray600,
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: 16,
  },
  budgetLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray400,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  budgetAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.gray900,
  },
  budgetUnit: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray500,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    ...neuShadows.cardRaised,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray900,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: "center",
    lineHeight: 22,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.gray500,
    fontWeight: "500",
    marginTop: 2,
  },
  myProposalsHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    ...neuShadows.cardRaised,
  },
  myProposalsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray800,
  },
  proposalsBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  proposalsBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "800",
  },
  cardProposalBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  cardProposalLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  cardProposalText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
  },
  cardProposalManageText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheetContainer: {
    backgroundColor: colors.neuBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    paddingTop: 20,
    paddingBottom: 32,
    ...neuShadows.cardRaised,
  },
  modalSheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neuBorder,
  },
  modalSheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray900,
  },
  modalSheetSubtitle: {
    fontSize: 12,
    color: colors.gray500,
    fontWeight: "500",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    ...neuShadows.cardRaised,
  },
  modalScrollView: {
    maxHeight: 520,
  },
  modalScrollContent: {
    padding: 20,
    gap: 14,
  },
  modalLoadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  modalLoadingText: {
    fontSize: 13,
    color: colors.gray500,
    fontWeight: "500",
  },
  modalEmptyBox: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  modalEmptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    ...neuShadows.cardRaised,
  },
  modalEmptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    marginBottom: 6,
  },
  modalEmptySubtitle: {
    fontSize: 13,
    color: colors.gray500,
    textAlign: "center",
    lineHeight: 20,
  },
  proposalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    ...neuShadows.cardRaised,
  },
  proposalCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  proposalJobTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
  },
  proposalPatientInfo: {
    fontSize: 12,
    color: colors.gray500,
    fontWeight: "500",
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusChipPending: {
    backgroundColor: "#FEF3C7",
  },
  statusChipAccepted: {
    backgroundColor: "#D1FAE5",
  },
  statusChipWithdrawn: {
    backgroundColor: colors.gray100,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusChipTextPending: {
    color: "#B45309",
  },
  statusChipTextAccepted: {
    color: "#047857",
  },
  statusChipTextWithdrawn: {
    color: colors.gray500,
  },
  proposalMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neuInset,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
  },
  proposalMetricItem: {
    flex: 1,
    alignItems: "center",
  },
  proposalMetricLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.gray400,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  proposalMetricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.gray900,
  },
  proposalMetricTime: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray600,
  },
  proposalMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.neuBorder,
  },
  proposalCoverBox: {
    backgroundColor: colors.gray50,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  proposalCoverText: {
    fontSize: 12,
    color: colors.gray700,
    fontStyle: "italic",
    lineHeight: 18,
  },
  proposalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: 12,
  },
  withdrawActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  withdrawActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  viewShiftBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewShiftBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
  },
  withdrawnStatusNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  withdrawnStatusNoteText: {
    fontSize: 11,
    color: colors.gray400,
    fontStyle: "italic",
  },
});
