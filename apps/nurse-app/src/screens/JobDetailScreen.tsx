import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  HeartPulse,
  Info,
  MapPin,
  Send,
  ShieldCheck,
  Stethoscope,
  Undo2,
  X,
} from 'lucide-react-native';
import { api, ClinicalJob, NurseProposalItem } from '../lib/api';
import { colors } from '../theme/colors';
import { ContainerModal } from '../components/ui/ContainerModal';
import { subscribeToCrossAppEvents } from '../lib/realtime';

const sanitize = (str: any): string =>
  typeof str === 'string' ? str.replace(/<[^>]*>?/gm, '').trim() : String(str || '');

export const JobDetailScreen: React.FC<{
  route: any;
  navigation: any;
}> = ({
  route,
  navigation,
}) => {
  const job = route.params?.job as ClinicalJob | undefined;
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [rate, setRate] = useState(String(job?.hourlyRate || job?.budgetMin || 450));
  const [coverLetter, setCoverLetter] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingProposal, setExistingProposal] = useState<NurseProposalItem | null>(null);
  const [loadingProposal, setLoadingProposal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchExistingProposal = useCallback(async () => {
    if (!job?.id) return;
    try {
      setLoadingProposal(true);
      const bid = await api.getBidForJob(job.id);
      if (bid) {
        setExistingProposal(bid);
        setRate(String(bid.proposedRate));
        if (bid.coverMessage) setCoverLetter(bid.coverMessage);
      } else {
        setExistingProposal((prev) => (prev?.jobId === job.id && prev?.status !== "withdrawn" ? prev : null));
      }
    } catch (e) {
      console.warn("fetchExistingProposal notice:", e);
    } finally {
      setLoadingProposal(false);
    }
  }, [job?.id]);

  useEffect(() => {
    fetchExistingProposal();

    const unsub = subscribeToCrossAppEvents((event) => {
      if (
        (event.type === "BID_ACCEPTED" || event.type === "BID_WITHDRAWN") &&
        (event.payload?.jobId === job?.id || event.payload?.job_id === job?.id)
      ) {
        fetchExistingProposal();
      }
    });
    return unsub;
  }, [fetchExistingProposal, job?.id]);

  if (!job) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.gray800, marginBottom: 8 }}>
          Requisition Unavailable
        </Text>
        <Text style={{ fontSize: 13, color: colors.gray500, textAlign: 'center', marginBottom: 20 }}>
          This clinical shift post may have been fulfilled or removed from the Punjab registry.
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 12,
          }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>Back to Shift Radar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rateNum = parseInt(rate, 10) || 0;
  const takeHome = Math.floor(rateNum * 0.9);
  const fee = rateNum - takeHome;
  const totalHours = (job.dailyHours || 12) * (job.durationDays || 5);
  const totalContract = takeHome * totalHours;

  const handleSubmit = async () => {
    if (submitting) return;
    if (job.status && job.status !== "open") {
      Alert.alert(
        "Requisition Confirmed",
        "This care requisition has already been confirmed with a clinician and is no longer accepting proposals."
      );
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      const newBid = await api.submitBid(job.id, rateNum, sanitize(coverLetter), totalHours);

      const proposalObj: NurseProposalItem = {
        id: newBid.id,
        jobId: newBid.jobId,
        nurseId: newBid.nurseId,
        proposedRate: newBid.proposedRate,
        totalHours: newBid.totalHours,
        totalGross: newBid.totalGross,
        platformFee: newBid.platformFee,
        netPayout: newBid.netPayout,
        coverMessage: newBid.coverMessage,
        status: "pending",
        createdAt: newBid.createdAt,
        job: {
          id: job.id,
          title: job.title,
          patientName: job.patientName,
          city: job.city,
          locality: job.locality,
          careType: job.careType,
          budgetMin: job.hourlyRate || job.budget || 500,
          budgetMax: job.hourlyRate || job.budget || 700,
          status: "open",
        },
      };
      setExistingProposal(proposalObj);
      setSubmitted(true);
      setShowProposalModal(false);
      setSubmitting(false);
      setSubmitted(false);
      Alert.alert("Proposal Submitted", "Your care proposal has been transmitted to the patient.");
    } catch (err: any) {
      Alert.alert('Proposal Notice', err?.message || "Could not transmit proposal. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = () => {
    if (!existingProposal || withdrawing) return;
    Alert.alert(
      "Withdraw Care Proposal?",
      `Are you sure you want to withdraw your ₹${existingProposal.proposedRate}/hr proposal for "${job.title}"? The patient coordinator will be notified and your proposed slot released.`,
      [
        { text: "Keep Proposal", style: "cancel" },
        {
          text: "Yes, Withdraw",
          style: "destructive",
          onPress: async () => {
            const previousProposal = existingProposal;
            setWithdrawing(true);
            // Optimistic instant state clear
            setExistingProposal(null);
            setSubmitted(false);
            try {
              const success = await api.withdrawBid(previousProposal.id, job.id);
              if (success) {
                Alert.alert("Proposal Withdrawn", "Your care proposal has been safely withdrawn.");
              } else {
                setExistingProposal(previousProposal);
                setSubmitted(true);
                Alert.alert("Notice", "Unable to withdraw proposal. Please try again.");
              }
            } catch (err: any) {
              setExistingProposal(previousProposal);
              setSubmitted(true);
              Alert.alert("Error", err?.message || "Failed to withdraw proposal.");
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  let metadata: any = {};
  let cleanDescription = job.description || "";
  if (cleanDescription.includes("---JOB_METADATA---")) {
    const parts = cleanDescription.split("---JOB_METADATA---");
    cleanDescription = parts[0].trim();
    try {
      metadata = JSON.parse(parts[1].trim());
    } catch {}
  }

  const patientRelationship = metadata.patientRelationship || (cleanDescription.match(/Patient Profile:\s*([^\n•]+)/i)?.[1]?.trim()) || "Self";
  const patientAge = metadata.patientAge || job.patientAge || (cleanDescription.match(/(\d+)\s*y(?:rs)?/i)?.[1]) || "";
  const patientGender = metadata.patientGender || job.patientGender || (cleanDescription.includes("Female") ? "Female" : "Male");

  const physicianDirectives = (() => {
    if (metadata.physicianOrders) return metadata.physicianOrders;
    const match = cleanDescription.match(/Physician Directives:\s*([\s\S]*?)(?:\n\n---|\n\n[A-Z]|$)/i) ||
                  cleanDescription.match(/Physician Orders:\s*([\s\S]*?)(?:\n\n---|\n\n[A-Z]|$)/i);
    if (match && match[1] && match[1].trim() && !match[1].includes("Prescription on file")) {
      return match[1].trim();
    }
    return cleanDescription;
  })();

  const equipList = metadata.equipmentRequired || job.equipmentRequired || job.equipment_required || [];

  return (
    <View style={styles.screen}>
      {/* Header with notch & status-bar safe padding */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.white }}>
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.gray800} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Job Requisition Review</Text>
          <View style={{ width: 38 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.previewModalScroll}
      >
        {/* Job Title & Location Line */}
        <View style={styles.previewHeroBox}>
          <Text style={styles.previewCardTitle}>{job.title}</Text>
          <View style={styles.previewMetaRow}>
            <Text style={styles.previewMetaDot}>{job.postedTimeAgo}</Text>
            <Text style={styles.previewMetaDot}>•</Text>
            <View style={styles.previewMetaPinRow}>
              <MapPin size={12} color={colors.gray500} strokeWidth={2.2} />
              <Text style={styles.previewMetaLocation}>
                {job.locality}, {job.city}{' '}
                <Text style={styles.previewMetaMasked}>(Exact location hidden prior to escrow)</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Patient Block */}
        <View style={styles.previewPatientCard}>
          <View style={styles.previewPatientAvatar}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>
              {job.patientName[0]}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.gray900 }}>
              {job.patientName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Text style={styles.previewClientStatText}>
                {patientRelationship}{patientAge ? ` • ${patientAge} yrs` : ""}{patientGender ? ` • ${patientGender}` : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.previewGrid}>
          <View style={styles.previewGridItem}>
            <Stethoscope size={16} color={colors.gray500} />
            <Text style={styles.previewGridItemTitle}>Care Designation</Text>
            <Text style={styles.previewGridItemVal}>{job.careType}</Text>
          </View>
          <View style={styles.previewGridItem}>
            <HeartPulse size={16} color={colors.gray500} />
            <Text style={styles.previewGridItemTitle}>Primary Diagnosis</Text>
            <Text style={styles.previewGridItemVal}>{job.diagnosis || job.title}</Text>
          </View>
          <View style={styles.previewGridItem}>
            <Clock size={16} color={colors.gray500} />
            <Text style={styles.previewGridItemTitle}>Shift Duration</Text>
            <Text style={styles.previewGridItemVal}>{job.dailyHours}h • {job.durationDays} Days</Text>
          </View>
          <View style={styles.previewGridItem}>
            <ShieldCheck size={16} color={colors.gray500} />
            <Text style={styles.previewGridItemTitle}>Priority Level</Text>
            <Text
              style={[
                styles.previewGridItemVal,
                (job.urgency === 'Urgent' || job.urgency === 'Emergency') && { color: colors.danger },
              ]}
            >
              {job.urgency}
            </Text>
          </View>
        </View>

        {/* Active Proposal Alert Banner if nurse already has an active bid */}
        {existingProposal && existingProposal.status !== 'withdrawn' && (
          <View
            style={[
              styles.activeBannerBox,
              existingProposal.status === 'accepted' ? styles.activeBannerAccepted : styles.activeBannerPending,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckCircle2
                size={16}
                color={existingProposal.status === 'accepted' ? '#059669' : colors.primary}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.activeBannerTitle,
                  existingProposal.status === 'accepted'
                    ? { color: '#065F46' }
                    : { color: colors.primaryDark },
                ]}
              >
                {existingProposal.status === 'accepted'
                  ? 'Proposal Accepted & Milestone Funded'
                  : 'Proposal Submitted (Under Review)'}
              </Text>
            </View>
            <Text style={styles.activeBannerDesc}>
              {existingProposal.status === 'accepted'
                ? `The patient coordinator accepted your ₹${existingProposal.proposedRate}/hr bid and funded the Punjab regulatory escrow deposit.`
                : `Your proposed bid of ₹${existingProposal.proposedRate}/hr is currently under review by the patient coordinator.`}
            </Text>
          </View>
        )}

        {/* Clinical Dossier */}
        <View style={styles.previewDossier}>
          <Text style={styles.previewSectionHeader}>Clinical Requirements & Directives</Text>
          <Text style={styles.previewDossierText}>{physicianDirectives}</Text>
        </View>

        {/* Medical Equipment */}
        {equipList.length > 0 && (
          <View style={styles.previewWarningBox}>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
              <ShieldCheck size={15} color={colors.primary} />
              <Text style={[styles.previewWarningTitle, { color: colors.primary }]}>
                Medical Equipment Handled ({equipList.length})
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {equipList.map((eq: string, idx: number) => (
                <View key={idx} style={{ backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.gray700 }}>{eq}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {job.checklist?.length ? (
          <View style={styles.previewWarningBox}>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
              <Info size={14} color={colors.primary} />
              <Text style={[styles.previewWarningTitle, { color: colors.primary }]}>Requirements</Text>
            </View>
            {job.checklist.map((item) => (
              <Text key={item} style={[styles.previewWarningText, { color: colors.gray700 }]}>• {item}</Text>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Footer: Either Active Proposal Dossier OR Submit Proposal Button */}
      <View style={styles.previewModalFooter}>
        {existingProposal && existingProposal.status !== 'withdrawn' ? (
          <View style={styles.activeProposalContainer}>
            <View style={styles.activeProposalHeader}>
              <View
                style={[
                  styles.proposalStatusBadge,
                  existingProposal.status === 'accepted' ? styles.badgeAccepted : styles.badgePending,
                ]}
              >
                <CheckCircle2
                  size={12}
                  color={existingProposal.status === 'accepted' ? '#059669' : colors.primary}
                  strokeWidth={2.4}
                />
                <Text
                  style={[
                    styles.proposalStatusBadgeText,
                    existingProposal.status === 'accepted' ? styles.textAccepted : styles.textPending,
                  ]}
                >
                  {existingProposal.status === 'accepted'
                    ? 'ACCEPTED & FUNDED'
                    : 'PROPOSAL SUBMITTED'}
                </Text>
              </View>
              <Text style={styles.proposalRateText}>₹{existingProposal.proposedRate}/hr</Text>
            </View>

            {existingProposal.coverMessage ? (
              <View style={styles.proposalQuoteBox}>
                <Text style={styles.proposalQuoteLabel}>Your Note:</Text>
                <Text style={styles.proposalQuoteText} numberOfLines={2}>
                  "{existingProposal.coverMessage}"
                </Text>
              </View>
            ) : null}

            {existingProposal.status === 'accepted' ? (
              <TouchableOpacity
                style={styles.viewShiftBtn}
                onPress={() => navigation.navigate('Shifts')}
                activeOpacity={0.85}
              >
                <Clock size={15} color={colors.white} strokeWidth={2.2} />
                <Text style={styles.viewShiftBtnText}>Open Shift Schedule</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.proposalActionRow}>
                <TouchableOpacity
                  style={styles.withdrawBtn}
                  onPress={handleWithdraw}
                  disabled={withdrawing}
                  activeOpacity={0.8}
                >
                  <Undo2 size={14} color="#DC2626" strokeWidth={2.2} />
                  <Text style={styles.withdrawBtnText}>
                    {withdrawing ? 'Withdrawing...' : 'Withdraw Proposal'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editBidBtn}
                  onPress={() => {
                    setSubmitted(false);
                    setShowProposalModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.editBidBtnText}>Modify Rate</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.modalPublishBtn}
            onPress={() => setShowProposalModal(true)}
            activeOpacity={0.85}
          >
            <View style={styles.modalPublishBtnRow}>
              <Send size={15} color={colors.white} strokeWidth={2.4} />
              <Text style={styles.modalPublishBtnText}>
                Apply & Submit Proposal
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Proposal Modal - Using ContainerModal to prevent desktop stretching */}
      <ContainerModal visible={showProposalModal} onClose={() => setShowProposalModal(false)} position="bottom">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20 }}
          >
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Submit Shift Proposal</Text>
                <Text style={styles.sheetSubtitle}>{job.title}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowProposalModal(false)}
                style={styles.closeSheetBtn}
              >
                <X size={18} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Your Hourly Bid Rate (₹)</Text>
            <View style={styles.inputWell}>
              <TextInput
                value={rate}
                onChangeText={setRate}
                keyboardType="numeric"
                style={[styles.inputField, { outlineStyle: 'none' } as any]}
                placeholder="e.g. 850"
                placeholderTextColor={colors.gray400}
                editable={!submitted}
              />
            </View>

            <View style={styles.calculatorBox}>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Proposed Rate</Text>
                <Text style={styles.calcVal}>₹{rateNum}/hr</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>NurseBid Platform Fee (10%)</Text>
                <Text style={styles.calcValRed}>- ₹{fee}/hr</Text>
              </View>
              <View style={styles.calcDivider} />
              <View style={styles.calcRow}>
                <Text style={styles.calcLabelBold}>Your Net Take-Home</Text>
                <Text style={styles.calcValBold}>₹{takeHome}/hr</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabelSmall}>Estimated Contract Total</Text>
                <Text style={styles.calcValSmall}>₹{totalContract.toLocaleString()}</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Clinical Cover Letter</Text>
            <View style={[styles.inputWell, styles.tallWell]}>
              <TextInput
                value={coverLetter}
                onChangeText={setCoverLetter}
                multiline
                style={[styles.inputField, styles.areaField, { outlineStyle: 'none', resizeMode: 'none' } as any]}
                placeholder="Detail your clinical experience..."
                placeholderTextColor={colors.gray400}
                editable={!submitted}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitted && styles.submitBtnSuccess]}
              onPress={handleSubmit}
              disabled={submitted || submitting}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? 'Submitting...' : submitted ? 'Proposal Sent ✓' : 'Submit Shift Proposal'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </ContainerModal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4f8' },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 16) : 8,
    paddingBottom: 14,
    minHeight: 56,
  },
  backBtn: { padding: 8, borderRadius: 20, backgroundColor: colors.neuBg },
  navTitle: { fontSize: 16, fontWeight: '700', color: colors.gray900, textAlign: 'center' },
  previewModalScroll: { padding: 16, paddingBottom: 130 },
  previewHeroBox: { marginBottom: 20 },
  previewCardTitle: { fontSize: 24, fontWeight: '800', color: colors.gray900, marginBottom: 8 },
  previewMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  previewMetaDot: { fontSize: 13, color: colors.gray500 },
  previewMetaPinRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  previewMetaLocation: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  previewMetaMasked: { fontSize: 12, color: colors.primary, fontStyle: 'italic' },

  previewPatientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.gray200 },
  previewPatientAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  previewClientStatText: { fontSize: 12, fontWeight: '600', color: colors.gray800 },
  previewClientStatDivider: { fontSize: 12, color: colors.gray400 },

  activeBannerBox: { padding: 14, borderRadius: 14, marginBottom: 16, borderWidth: 1 },
  activeBannerPending: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  activeBannerAccepted: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  activeBannerTitle: { fontSize: 14, fontWeight: '800' },
  activeBannerDesc: { fontSize: 12, color: colors.gray600, marginTop: 4, lineHeight: 18 },

  previewModalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.gray200,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  modalPublishBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  modalPublishBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalPublishBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },

  // Active Proposal Container inside Footer
  activeProposalContainer: { width: '100%' },
  activeProposalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  proposalStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgePending: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  badgeAccepted: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  proposalStatusBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  textPending: { color: colors.primaryDark },
  textAccepted: { color: '#065F46' },
  proposalRateText: { fontSize: 17, fontWeight: '800', color: colors.gray900 },
  proposalQuoteBox: { backgroundColor: colors.gray50, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: colors.gray200 },
  proposalQuoteLabel: { fontSize: 10, fontWeight: '700', color: colors.gray500, textTransform: 'uppercase' },
  proposalQuoteText: { fontSize: 12, color: colors.gray700, fontStyle: 'italic', marginTop: 2 },
  proposalActionRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  withdrawBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingVertical: 11,
  },
  withdrawBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
  editBidBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBidBtnText: { color: colors.gray700, fontSize: 13, fontWeight: '700' },
  viewShiftBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  viewShiftBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },

  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.gray900 },
  sheetSubtitle: { fontSize: 13, color: colors.gray500, marginTop: 4 },
  closeSheetBtn: { padding: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.gray700, marginBottom: 8 },
  inputWell: { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, paddingHorizontal: 12, height: 48, justifyContent: 'center', marginBottom: 16 },
  inputField: { fontSize: 15, color: colors.gray900, fontWeight: '600', flex: 1 },
  calculatorBox: { backgroundColor: colors.primarySoft, borderRadius: 12, padding: 16, marginBottom: 16 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  calcLabel: { fontSize: 13, color: colors.gray700, fontWeight: '500' },
  calcVal: { fontSize: 13, fontWeight: '700', color: colors.gray900 },
  calcValRed: { fontSize: 13, fontWeight: '700', color: colors.danger },
  calcDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginVertical: 8 },
  calcLabelBold: { fontSize: 14, color: colors.primaryDark, fontWeight: '700' },
  calcValBold: { fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  calcLabelSmall: { fontSize: 11, color: colors.gray500, fontWeight: '600', marginTop: 4 },
  calcValSmall: { fontSize: 11, fontWeight: '800', color: colors.gray900, marginTop: 4 },
  tallWell: { height: 100, paddingVertical: 12, alignItems: 'flex-start' },
  areaField: { textAlignVertical: 'top' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitBtnSuccess: { backgroundColor: colors.success },
  submitBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },

  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  previewGridItem: { width: '48%', backgroundColor: colors.white, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.gray200 },
  previewGridItemTitle: { fontSize: 12, color: colors.gray500, fontWeight: '600', marginTop: 10, marginBottom: 4 },
  previewGridItemVal: { fontSize: 14, fontWeight: '700', color: colors.gray900 },

  previewDossier: { backgroundColor: colors.white, padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.gray200 },
  previewSectionHeader: { fontSize: 16, fontWeight: '800', color: colors.gray900, marginBottom: 12 },
  previewDossierText: { fontSize: 14, color: colors.gray600, lineHeight: 22 },

  previewWarningBox: { backgroundColor: colors.dangerSoft, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.dangerBorder, marginBottom: 30 },
  previewWarningTitle: { fontSize: 13, fontWeight: '800', color: colors.danger },
  previewWarningText: { fontSize: 13, color: colors.danger, lineHeight: 18, fontWeight: '500' },
});
