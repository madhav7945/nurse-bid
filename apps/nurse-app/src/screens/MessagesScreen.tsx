import React, { useState, useEffect, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  AppState,
  BackHandler,
  Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Search,
  Phone,
  Video,
  Paperclip,
  Send,
  ShieldCheck,
  CheckCheck,
  Lock,
  MoreVertical,
  Pin,
  FileText,
  Download,
  Plus,
  Mic,
  X,
  MessageSquare,
} from "lucide-react-native";
import { colors, neuShadows } from "../theme/colors";
import { maskSensitiveContacts, containsContactInfo, isBookingDepositFunded } from "../lib/contactMasking";
import { api, MessageRecord } from "../lib/api";
import { subscribeToMessages, unsubscribeFromMessages, subscribeToConversations } from "../lib/realtime";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { setTabBarVisible } from "../lib/tabBarState";

interface MessagesScreenProps {
  navigation?: any;
  route?: any;
}

interface ChatMessage {
  id: string;
  sender: "nurse" | "user"; // "user" in Nurse App is the Nurse ("You")
  name: string;
  time: string;
  text: string;
  isAttachment?: boolean;
  fileName?: string;
  fileSize?: string;
}

function getRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export const MessagesScreen: React.FC<MessagesScreenProps> = ({ navigation, route }) => {
  const { profile, nurseId } = useAuth();
  const insets = useSafeAreaInsets();
  // View states: 'list' (inbox) or 'chat' (conversation)
  const [currentView, setCurrentView] = useState<"chat" | "list">("list");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inquiry">("all");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showContactWarning, setShowContactWarning] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isLoadingConvos, setIsLoadingConvos] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const realtimeCleanupRef = useRef<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (currentView === "chat") {
      setTabBarVisible(false);
    } else {
      setTabBarVisible(true);
    }
    return () => {
      setTabBarVisible(true);
    };
  }, [currentView]);

  useEffect(() => {
    const convoIdParam = route?.params?.conversationId;
    if (convoIdParam) {
      setSelectedConversationId(convoIdParam);
      setCurrentView("chat");
    }
  }, [route?.params?.conversationId]);

  const handleBackToList = useCallback(() => {
    Keyboard.dismiss();
    if (route?.params?.conversationId) {
      navigation?.setParams?.({ conversationId: undefined });
    }
    setCurrentView("list");
    setTabBarVisible(true);
    if (route?.params?.fromScreen && navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  }, [navigation, route?.params]);

  useEffect(() => {
    if (currentView === "chat") {
      const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
        handleBackToList();
        return true;
      });
      return () => backHandler.remove();
    }
  }, [currentView, handleBackToList]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConvos(true);
      const convos = await api.getMyConversations();

      if (convos && convos.length > 0) {
        setConversations(convos);
        setSelectedConversationId((prev) => {
          if (prev && convos.some((c: any) => c.id === prev)) return prev;
          return convos[0].id;
        });
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.warn("MessagesScreen load convos error:", err);
    } finally {
      setIsLoadingConvos(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for selected convo
  const loadMessages = useCallback(async (convoId: string) => {
    if (!convoId) return;
    try {
      setIsLoadingMessages(true);
      const msgs = await api.getMessages(convoId);
      setChatMessages(
        msgs.map((m: any) => ({
          id: m.id,
          sender: m.senderRole === "nurse" ? ("user" as const) : ("nurse" as const),
          name: m.senderName || (m.senderRole === "nurse" ? "You (RN)" : "Patient Contact"),
          time: m.time || new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: m.content || "",
          isAttachment: !!m.attachmentUrl,
          fileName: m.attachmentName || undefined,
          fileSize: m.attachmentSize ? `${Math.round(m.attachmentSize / 1024)} KB` : undefined,
        }))
      );
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (err) {
      console.warn("MessagesScreen load messages error:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    const focusSub = navigation?.addListener?.("focus", () => {
      loadConversations();
      if (selectedConversationId) {
        loadMessages(selectedConversationId);
      }
      if (currentView === "list") {
        setTabBarVisible(true);
      }
    });
    const blurSub = navigation?.addListener?.("blur", () => {
      setTabBarVisible(true);
    });
    return () => {
      focusSub?.();
      blurSub?.();
    };
  }, [navigation, loadConversations, loadMessages, selectedConversationId, currentView]);

  // AppState foreground resume listener to instantly fetch new messages from other app
  useEffect(() => {
    const handleAppStateChange = (nextState: string) => {
      if (nextState === "active") {
        loadConversations();
        if (selectedConversationId) {
          loadMessages(selectedConversationId);
        }
      }
    };
    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [selectedConversationId, loadMessages, loadConversations]);

  // Active high-frequency polling while in chat view to guarantee zero delay
  useEffect(() => {
    if (currentView !== "chat" || !selectedConversationId) return;

    const poll = async () => {
      try {
        const msgs = await api.getMessages(selectedConversationId);
        if (msgs && msgs.length > 0) {
          setChatMessages((prev) => {
            const prevIds = new Set(prev.map((m) => m.id));
            const hasNew = msgs.some((m: any) => !prevIds.has(m.id));
            if (hasNew) {
              const mapped = msgs.map((m: any) => ({
                id: m.id,
                sender: (m.senderRole === "nurse" ? "user" : "nurse") as "user" | "nurse",
                name: m.senderName || (m.senderRole === "nurse" ? "You (RN)" : "Patient Contact"),
                time: m.time || new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                text: m.content || "",
                isAttachment: !!m.attachmentUrl,
                fileName: m.attachmentName || undefined,
                fileSize: m.attachmentSize ? `${Math.round(m.attachmentSize / 1024)} KB` : undefined,
              }));
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
              return mapped;
            }
            return prev;
          });
        }
      } catch {}
    };

    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [currentView, selectedConversationId]);

  // Active convo details
  const activeConvo = conversations.find((c) => c.id === selectedConversationId);
  const isBooked = isBookingDepositFunded(
    activeConvo?.bookingStatus || activeConvo?.booking_status,
    activeConvo?.escrowStatus || activeConvo?.escrow_status
  );

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  }, [selectedConversationId, loadMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedConversationId) return;

    if (realtimeCleanupRef.current && realtimeCleanupRef.current !== selectedConversationId) {
      unsubscribeFromMessages(realtimeCleanupRef.current);
    }
    realtimeCleanupRef.current = selectedConversationId;

    const unsub = subscribeToMessages(selectedConversationId, (payload: any) => {
      if (!payload) return;
      const text = payload.content || payload.text || "";
      if (!text) return;
      if (payload.sender_id === nurseId || payload.senderId === nurseId) return;

      const newMsg: ChatMessage = {
        id: payload.id || `rt-${Date.now()}`,
        sender: "nurse", // Incoming from patient
        name: payload.sender_name || payload.senderName || "Patient Contact",
        time: new Date(payload.created_at || payload.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: text,
      };
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id || (m.text === newMsg.text && m.sender === newMsg.sender))) return prev;
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        return [...prev, newMsg];
      });
    });

    subscribeToConversations(selectedConversationId, () => {
      loadConversations();
    });

    return () => {
      if (realtimeCleanupRef.current) {
        unsubscribeFromMessages(realtimeCleanupRef.current);
        realtimeCleanupRef.current = null;
      }
    };
  }, [selectedConversationId, nurseId, loadConversations]);

  // Build patientsList from conversations for the inbox view
  const patientsList = conversations.map((c) => {
    const pName = c.patientName || c.patient_name || (c.participant_names && c.participant_names.find((n: string) => n && !n.includes("RN") && n !== "Nurse")) || c.job_ref || "Patient";
    const initials = (pName || "P")
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const isConfirmed = c.booking_status === "confirmed" || c.bookingStatus === "confirmed" || Number(c.escrow_amount || 0) > 0;

    return {
      id: c.id,
      name: pName,
      initials,
      verified: true,
      roleBadge: isConfirmed ? "Active Care Shift" : "Shift Proposal",
      careFor: c.subtitle || c.job_ref || "Clinical Assignment",
      careStatus: (isConfirmed ? "active" : "vetting") as "active" | "vetting",
      careBadge: isConfirmed ? "Escrow Secured" : "Pending Deposit",
      lastMessage: c.last_message || c.lastMessage || "Encrypted clinical communication channel initiated.",
      lastTime: c.last_message_at ? getRelativeTime(c.last_message_at) : "",
      unread: c.unread_count || 0,
      isPinned: false,
      online: true,
    };
  });

  const activePatient = patientsList.find((p) => p.id === selectedConversationId) || patientsList[0] || {
    id: "default",
    name: "Patient Contact",
    initials: "PT",
    verified: true,
    roleBadge: "Patient Contact",
    careFor: "Care Discussion",
    careStatus: "vetting" as const,
    careBadge: "Pending Deposit",
    lastMessage: "",
    lastTime: "",
    unread: 0,
    isPinned: false,
    online: true,
  };

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    if (!isBooked && containsContactInfo(val)) {
      setShowContactWarning(true);
    } else {
      setShowContactWarning(false);
    }
  };

  const handleSendMessage = async () => {
    const raw = messageInput.trim();
    if (!raw || !selectedConversationId) return;

    if (!isBooked && containsContactInfo(raw)) {
      Alert.alert(
        "Privacy Protection Enabled",
        "Direct contact information (phone numbers, emails) cannot be shared until the patient secures the booking deposit with escrow.",
        [
          { text: "Edit Message", style: "cancel" },
          {
            text: "Mask & Send",
            onPress: () => {
              const masked = maskSensitiveContacts(raw);
              proceedSend(masked);
            },
          },
        ]
      );
      return;
    }

    const payload = isBooked ? raw : maskSensitiveContacts(raw);
    proceedSend(payload);
  };

  const proceedSend = async (payloadText: string) => {
    setMessageInput("");
    setShowContactWarning(false);

    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: "user",
      name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}, RN`.trim() : "You (RN)",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: payloadText,
    };

    setChatMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      await api.sendMessage(selectedConversationId, payloadText, tempMsg.name);
    } catch (err: any) {
      console.error("Send failed:", err.message);
      setChatMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setMessageInput(payloadText);
    }
  };

  const filteredPatients = patientsList.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.careFor.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === "active") return item.careStatus === "active";
    if (activeTab === "inquiry") return item.careStatus === "vetting";
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neuBg} />

      {/* ============================================================ */}
      {/* VIEW 1: INBOX LIST (1:1 Patient App Neumorphic Style)        */}
      {/* ============================================================ */}
      {currentView === "list" ? (
        <View style={styles.listWrapper}>
          {/* Top Bar: "Hello, Clinician" + circular action icons */}
          <View style={styles.inboxHeader}>
            <View>
              <Text style={styles.greetingSub}>Clinical Messages</Text>
              <Text style={styles.greetingName}>{profile?.first_name || "Nurse"}</Text>
            </View>

            <View style={styles.inboxHeaderIcons}>
              <TouchableOpacity
                style={styles.circleNeuBtn}
                onPress={() => setShowSearchInput(!showSearchInput)}
                activeOpacity={0.75}
              >
                <Search size={18} color={colors.gray700} strokeWidth={2.2} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.circleNeuBtn}
                onPress={() => {
                  if (navigation?.navigate) {
                    navigation.navigate("Settings");
                  } else {
                    Alert.alert(
                      "Clinical Messaging Console",
                      "Realtime WebSocket encryption active. Patient phone numbers remain masked until escrow deposit is funded."
                    );
                  }
                }}
                activeOpacity={0.75}
              >
                <MoreVertical size={18} color={colors.gray700} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar (Collapsible) */}
          {showSearchInput && (
            <View style={styles.searchContainer}>
              <Search size={15} color={colors.gray400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search patients, conditions, or shifts..."
                placeholderTextColor={colors.gray400}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                  <X size={14} color={colors.gray400} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Segmented Filter Pills */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, activeTab === "all" && styles.filterPillActive]}
              onPress={() => setActiveTab("all")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeTab === "all" && styles.filterPillTextActive]}>
                All Chats
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeTab === "active" && styles.filterPillActive]}
              onPress={() => setActiveTab("active")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeTab === "active" && styles.filterPillTextActive]}>
                Active Shifts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeTab === "inquiry" && styles.filterPillActive]}
              onPress={() => setActiveTab("inquiry")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeTab === "inquiry" && styles.filterPillTextActive]}>
                Inquiries
              </Text>
            </TouchableOpacity>
          </View>

          {/* Chats List */}
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoadingConvos && conversations.length === 0 ? (
              <View style={[styles.emptyCardInner, { alignItems: "center", paddingVertical: 40 }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.emptySubtitle, { marginTop: 10 }]}>Loading clinical communications...</Text>
              </View>
            ) : filteredPatients.length === 0 ? (
              <View style={[styles.emptyCardInner, { alignItems: "center", paddingVertical: 40 }]}>
                <View style={styles.emptyIconWrap}>
                  <MessageSquare size={28} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No Conversations Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Direct communications unlock automatically when patients accept your shift proposals or send care inquiries.
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 20,
                    marginTop: 16,
                  }}
                  onPress={() => navigation?.navigate?.("Jobs")}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Find Open Shifts on Radar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.chatListCard}>
                {filteredPatients.map((patientItem, index) => {
                  const isSelected = selectedConversationId === patientItem.id;
                  const isLast = index === filteredPatients.length - 1;

                  return (
                    <TouchableOpacity
                      key={patientItem.id}
                      style={[
                        styles.chatItemRow,
                        !isLast && styles.chatItemBorder,
                        isSelected && styles.chatItemActiveBg,
                      ]}
                      onPress={() => {
                        setSelectedConversationId(patientItem.id);
                        setCurrentView("chat");
                      }}
                      activeOpacity={0.75}
                    >
                      {/* Round Avatar with Online Dot */}
                      <View style={styles.avatarContainer}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarInitial}>{patientItem.initials}</Text>
                        </View>
                        {patientItem.online && <View style={styles.onlineDot} />}
                      </View>

                      {/* Chat Content Info */}
                      <View style={styles.chatMetaCol}>
                        <View style={styles.chatNameRow}>
                          <View style={styles.nameWithPin}>
                            <Text style={styles.nurseNameText}>{patientItem.name}</Text>
                            {patientItem.isPinned && <Pin size={12} color="#3B82F6" strokeWidth={2.4} />}
                          </View>
                          <Text style={styles.chatTimeText}>{patientItem.lastTime}</Text>
                        </View>

                        <View style={styles.chatSubRow}>
                          <Text style={styles.lastMessageSnippet} numberOfLines={1}>
                            {patientItem.lastMessage}
                          </Text>
                          {patientItem.unread > 0 && (
                            <View style={styles.unreadBadge}>
                              <Text style={styles.unreadBadgeText}>{patientItem.unread}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Floating Action Button */}
          <TouchableOpacity
            style={styles.floatingComposeBtn}
            onPress={() => {
              if (conversations.length > 0) {
                setSelectedConversationId(conversations[0].id);
                setCurrentView("chat");
              } else {
                navigation?.navigate?.("Jobs");
              }
            }}
            activeOpacity={0.85}
          >
            <Plus size={22} color={colors.white} strokeWidth={2.8} />
          </TouchableOpacity>
        </View>
      ) : (
        /* ============================================================ */
        /* VIEW 2: ACTIVE CLINICAL CHAT (1:1 Patient App Parity)        */
        /* ============================================================ */
        <KeyboardAvoidingView
          style={styles.chatScreenContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Top Neumorphic Header */}
          <View style={styles.neuChatHeader}>
            <View style={styles.headerLeftWrap}>
              <TouchableOpacity
                testID="chat-back-button"
                accessibilityLabel="Back to Conversations"
                style={styles.neuBackBtn}
                onPress={handleBackToList}
                activeOpacity={0.75}
              >
                <ChevronLeft size={22} color={colors.gray800} strokeWidth={2.4} />
              </TouchableOpacity>

              <View style={styles.headerAvatarWrap}>
                <View style={styles.headerAvatarCircle}>
                  <Text style={styles.headerAvatarInitials}>{activePatient.initials}</Text>
                </View>
                <View style={styles.headerOnlineDot} />
              </View>

              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerNurseName}>{activePatient.name}</Text>
                <View style={styles.headerStatusRow}>
                  <View style={styles.statusDotGreen} />
                  <Text style={styles.headerOnlineStatus}>
                    {isBooked ? "Online • Escrow Funded" : "Online • Inquiry"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Top-Right: Protected Voice & Video Call buttons (strictly hidden when masked) */}
            <View style={styles.headerRightButtons}>
              {isBooked ? (
                <>
                  <TouchableOpacity
                    style={styles.circleCallBtn}
                    onPress={() => {
                      Alert.alert("Encrypted Clinical Video", "Initiating secure WebRTC tele-consultation room.");
                    }}
                    activeOpacity={0.75}
                  >
                    <Video size={17} color="#059669" strokeWidth={2.2} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.circleCallBtn}
                    onPress={() => {
                      Alert.alert(
                        "Masked Clinical Call",
                        "Connecting via private Twilio gateway. Your personal number remains protected."
                      );
                    }}
                    activeOpacity={0.75}
                  >
                    <Phone size={17} color="#059669" strokeWidth={2.2} />
                  </TouchableOpacity>

                  <View style={styles.statusBadgeSecured}>
                    <ShieldCheck size={13} color="#059669" strokeWidth={2.4} />
                    <Text style={styles.statusBadgeSecuredText}>Secured</Text>
                  </View>
                </>
              ) : (
                <View style={styles.privacyMaskedChip}>
                  <Lock size={11} color="#059669" strokeWidth={2.4} />
                  <Text style={styles.privacyMaskedChipText}>Protected</Text>
                </View>
              )}
            </View>
          </View>

          {/* Pre-Escrow Protection Notice Strip */}
          {!isBooked && (
            <View style={styles.vettingNoticeStrip}>
              <Lock size={12} color="#92400E" strokeWidth={2.4} />
              <Text style={styles.vettingNoticeText}>
                Privacy Mode Active: Direct calling & documents unlock once patient secures escrow deposit.
              </Text>
            </View>
          )}

          {/* Messages Stream on Neumorphic Canvas */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.neuMessagesScroll}
            contentContainerStyle={styles.neuMessagesContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Clinical Trust Handover Banner */}
            <View style={styles.trustIndicatorRow}>
              <View style={styles.trustLine} />
              <View style={styles.trustPill}>
                <Lock size={11} color={colors.gray500} style={{ marginRight: 5 }} />
                <Text style={styles.trustText}>SECURE CLINICAL TELEMETRY</Text>
              </View>
              <View style={styles.trustLine} />
            </View>

            {chatMessages.length === 0 ? (
              <View style={styles.emptyCardInner}>
                <MessageSquare size={24} color={colors.gray400} />
                <Text style={[styles.emptySubtitle, { marginTop: 8 }]}>
                  This is the start of your secure communication with {activePatient.name}.
                </Text>
              </View>
            ) : (
              chatMessages.map((msg) => {
                const isNurseUser = msg.sender === "user";

                if (msg.isAttachment) {
                  return (
                    <View key={msg.id} style={styles.attachmentWrap}>
                      <View style={styles.attachmentCard}>
                        <View style={styles.attachmentLeft}>
                          <View style={styles.fileIconBox}>
                            <FileText size={18} color="#2563EB" strokeWidth={2} />
                          </View>
                          <View>
                            <Text style={styles.attachmentFileName}>{msg.fileName || "Clinical Document"}</Text>
                            <Text style={styles.attachmentFileSize}>{msg.fileSize || "PDF Report"}</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.downloadCircleBtn}
                          onPress={() => Alert.alert("Download Attachment", `Opening ${msg.fileName}...`)}
                          activeOpacity={0.75}
                        >
                          <Download size={14} color={colors.white} strokeWidth={2.4} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.messageTimestamp}>{msg.time}</Text>
                    </View>
                  );
                }

                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      isNurseUser ? styles.userMessageRow : styles.nurseMessageRow,
                    ]}
                  >
                    <View
                      style={[
                        styles.messagePill,
                        isNurseUser ? styles.userPill : styles.nursePill,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageBodyText,
                          isNurseUser ? styles.userBodyText : styles.nurseBodyText,
                        ]}
                      >
                        {isBooked ? msg.text : maskSensitiveContacts(msg.text, true)}
                      </Text>
                      <View style={styles.msgFooterRow}>
                        <Text
                          style={[
                            styles.messageTimestamp,
                            isNurseUser ? styles.userTimestamp : styles.nurseTimestamp,
                          ]}
                        >
                          {msg.time}
                        </Text>
                        {isNurseUser && (
                          <CheckCheck size={13} color="rgba(255, 255, 255, 0.85)" strokeWidth={2.4} />
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Contact Warning Banner */}
          {showContactWarning && (
            <View style={styles.contactWarningBanner}>
              <Text style={styles.contactWarningText}>
                ⚠️ Contact details (phone/email) are protected before escrow funding.
              </Text>
              <TouchableOpacity
                style={styles.maskProceedBtn}
                onPress={() => {
                  const masked = maskSensitiveContacts(messageInput);
                  setMessageInput(masked);
                  setShowContactWarning(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.maskProceedText}>Mask & Send</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Floating White Input Capsule */}
          <View style={styles.floatingInputWrapper}>
            <View style={styles.whiteInputCapsule}>
              {isBooked && (
                <TouchableOpacity
                  style={styles.micBtn}
                  onPress={() => Alert.alert("Voice Telemetry", "Hold to record clinical voice handover.")}
                  activeOpacity={0.7}
                >
                  <Mic size={17} color={colors.gray500} strokeWidth={2} />
                </TouchableOpacity>
              )}

              <TextInput
                style={[styles.chatInputField, !isBooked && { paddingLeft: 14 }]}
                value={messageInput}
                onChangeText={handleInputChange}
                placeholder={isBooked ? "Type clinical update..." : "Type message (contacts masked)..."}
                placeholderTextColor={colors.gray400}
              />

              {isBooked && (
                <TouchableOpacity
                  style={styles.paperclipBtn}
                  onPress={() => Alert.alert("Attach Telemetry", "Select ECG report, vitals sheet, or nursing chart.")}
                  activeOpacity={0.7}
                >
                  <Paperclip size={17} color={colors.gray400} strokeWidth={2} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.blueCircularSendBtn, !messageInput.trim() && { opacity: 0.55 }]}
                onPress={handleSendMessage}
                disabled={!messageInput.trim()}
                activeOpacity={0.85}
              >
                <Send size={15} color={colors.white} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  /* Safe Area Containers */
  safeArea: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  listWrapper: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  container: {
    flex: 1,
  },

  /* ============================================================ */
  /* INBOX SCREEN STYLES (Screen 1 - 1:1 with Patient App)        */
  /* ============================================================ */
  inboxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greetingSub: {
    fontSize: 13,
    color: colors.gray500,
    fontWeight: "500",
  },
  greetingName: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.gray900,
    letterSpacing: -0.4,
  },
  inboxHeaderIcons: {
    flexDirection: "row",
    gap: 10,
  },
  circleNeuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },

  /* Search Container */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginHorizontal: 18,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: colors.gray900,
    padding: 0,
  },

  /* Filter Pills */
  filterPillsRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  filterPillActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray600,
  },
  filterPillTextActive: {
    color: colors.white,
    fontWeight: "800",
  },

  /* Chat List Scroll */
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 190,
  },
  chatListCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    overflow: "hidden",
  },
  chatItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  chatItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(241, 245, 249, 0.9)",
  },
  chatItemActiveBg: {
    backgroundColor: "#F8FAFC",
  },
  avatarContainer: {
    position: "relative",
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563EB",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: colors.white,
  },
  chatMetaCol: {
    flex: 1,
  },
  chatNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nameWithPin: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nurseNameText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: colors.gray900,
  },
  chatTimeText: {
    fontSize: 10.5,
    color: colors.gray400,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  chatSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessageSnippet: {
    fontSize: 11.5,
    color: colors.gray500,
    flex: 1,
    paddingRight: 8,
  },
  unreadBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.white,
  },

  /* Floating Action Button */
  floatingComposeBtn: {
    position: "absolute",
    bottom: 95,
    right: 22,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },

  /* ============================================================ */
  /* ACTIVE CHAT SCREEN STYLES (1:1 with Patient App)             */
  /* ============================================================ */
  chatScreenContainer: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  neuChatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226, 232, 240, 0.8)",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  headerLeftWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  neuBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.neuBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  headerAvatarWrap: {
    position: "relative",
  },
  headerAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarInitials: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#2563EB",
  },
  headerOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#10B981",
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerNurseName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.2,
  },
  headerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 1,
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  headerOnlineStatus: {
    fontSize: 10.5,
    color: colors.gray500,
    fontWeight: "500",
  },
  headerRightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  circleCallBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  circleCallBtnLocked: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
    opacity: 0.65,
  },
  statusBadgeSecured: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeSecuredText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },
  statusBadgePending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgePendingText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#92400E",
  },

  vettingNoticeStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  vettingNoticeText: {
    fontSize: 10.5,
    color: "#92400E",
    fontWeight: "500",
    flex: 1,
  },

  /* Messages Scroll Area */
  neuMessagesScroll: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  neuMessagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 12,
  },

  /* Trust Line */
  trustIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  trustLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(226, 232, 240, 0.9)",
  },
  trustPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  trustText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.gray400,
    letterSpacing: 0.8,
  },

  /* Message Rows */
  messageRow: {
    maxWidth: "82%",
    marginBottom: 4,
  },
  userMessageRow: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  nurseMessageRow: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },

  /* Pills */
  messagePill: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userPill: {
    backgroundColor: "#2563EB", // Blue outgoing bubble (Clinician)
    borderBottomRightRadius: 4,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  nursePill: {
    backgroundColor: colors.white, // White incoming bubble (Patient)
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
    borderBottomLeftRadius: 4,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  messageBodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  userBodyText: {
    color: colors.white,
    fontWeight: "600",
  },
  nurseBodyText: {
    color: colors.gray900,
    fontWeight: "500",
  },
  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    paddingHorizontal: 4,
  },
  messageTimestamp: {
    fontSize: 9.5,
    color: colors.gray400,
  },
  msgFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 3,
  },
  userTimestamp: {
    fontSize: 9.5,
    color: "rgba(255, 255, 255, 0.75)",
  },
  nurseTimestamp: {
    fontSize: 9.5,
    color: colors.gray400,
  },
  privacyMaskedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  privacyMaskedChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },

  /* Attachment Card */
  attachmentWrap: {
    alignSelf: "flex-start",
    maxWidth: "85%",
    marginBottom: 4,
  },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  attachmentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  fileIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentFileName: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray900,
  },
  attachmentFileSize: {
    fontSize: 10,
    color: colors.gray500,
    marginTop: 1,
  },
  downloadCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  /* Contact Warning */
  contactWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFE4E6",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  contactWarningText: {
    fontSize: 10.5,
    color: "#881337",
    flex: 1,
  },
  maskProceedBtn: {
    backgroundColor: "#BE123C",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  maskProceedText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.white,
  },

  /* Floating Input Capsule (White Neumorphic on Canvas) */
  floatingInputWrapper: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 14 : 10,
    backgroundColor: colors.neuBg,
  },
  whiteInputCapsule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 5,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    gap: 4,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chatInputField: {
    flex: 1,
    fontSize: 13,
    color: colors.gray900,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  paperclipBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  blueCircularSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyCardInner: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginTop: 24,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
