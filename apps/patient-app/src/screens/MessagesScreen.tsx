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
  AppState,
  BackHandler,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Search,
  Phone,
  Video,
  Paperclip,
  Send,
  ShieldCheck,
  CheckCheck,
  Circle,
  Clock,
  Sparkles,
  AlertCircle,
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
import { colors } from "../theme/colors";
import { maskContactInfo, containsContactInfo, isBookingDepositFunded } from "../lib/contactMasking";
import { api } from "../lib/api";
import { subscribeToMessages, unsubscribeFromMessages, subscribeToConversations, unsubscribeChannel } from "../lib/realtime";
import { useAuth } from "../context/AuthContext";
import { MessagesListSkeleton } from "../components/ui/Skeleton";
import { setTabBarVisible } from "../lib/tabBarState";

interface MessagesScreenProps {
  navigation?: any;
  route?: any;
}

interface ChatMessage {
  id: string;
  sender: "nurse" | "user";
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
  const { profile, userId } = useAuth();
  // Mobile view state: 'list' (inbox) or 'chat' (conversation)
  const [currentView, setCurrentView] = useState<"chat" | "list">("list");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inquiry">("all");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showContactWarning, setShowContactWarning] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isLoadingConvos, setIsLoadingConvos] = useState(true);

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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const realtimeCleanupRef = useRef<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Determine if the selected conversation has a funded escrow (for contact masking)
  const activeConvo = conversations.find((c) => c.id === selectedConversationId);
  const isBooked = isBookingDepositFunded(activeConvo?.bookingStatus, activeConvo?.escrowStatus);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConvos(true);
      const data = await api.getMyConversations();
      setConversations(data);
      // Preserve currently selected conversation or select first if none active
      setSelectedConversationId((prev) => {
        if (prev && data.some((c) => c.id === prev)) return prev;
        return data.length > 0 ? data[0].id : null;
      });
    } catch (err) {
      console.warn("MessagesScreen load convos error:", err);
    } finally {
      setIsLoadingConvos(false);
    }
  }, []);

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

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for the selected conversation
  const loadMessages = useCallback(async (convoId: string) => {
    if (!convoId) return;
    try {
      setIsLoadingMessages(true);
      const msgs = await api.getMessages(convoId);
      setChatMessages(msgs.map((m: any) => ({
        id: m.id,
        sender: m.senderRole === "patient" ? "user" as const : "nurse" as const,
        name: m.senderName || (m.senderRole === "patient" ? "You" : "Nurse"),
        time: m.time || new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: m.content || m.text || "",
        isAttachment: !!m.attachmentUrl,
        fileName: m.attachmentName || undefined,
        fileSize: m.attachmentSize ? `${Math.round(m.attachmentSize / 1024)} KB` : undefined,
      })));
      // Mark as read
      await api.markMessagesRead(convoId);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (err) {
      console.warn("MessagesScreen load messages error:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  }, [selectedConversationId, loadMessages]);

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
                sender: (m.senderRole === "patient" ? "user" : "nurse") as "user" | "nurse",
                name: m.senderName || (m.senderRole === "patient" ? "You" : "Nurse"),
                time: m.time || new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                text: m.content || m.text || "",
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

  // Realtime subscription
  useEffect(() => {
    if (!selectedConversationId) return;

    // Unsubscribe from previous
    if (realtimeCleanupRef.current && realtimeCleanupRef.current !== selectedConversationId) {
      unsubscribeFromMessages(realtimeCleanupRef.current);
      unsubscribeChannel(`conversations:${realtimeCleanupRef.current}`);
    }
    realtimeCleanupRef.current = selectedConversationId;

    subscribeToMessages(selectedConversationId, (payload: any) => {
      if (!payload) return;
      const text = payload.content || payload.text || "";
      if (!text && !payload.attachment_url) return;
      // Don't add our own messages (already added optimistically)
      if (payload.sender_id === userId || payload.senderId === userId || payload.sender_role === "patient" || payload.senderRole === "patient") return;
      const newMsg: ChatMessage = {
        id: payload.id || `rt-${Date.now()}`,
        sender: "nurse",
        name: payload.sender_name || payload.senderName || "Nurse",
        time: new Date(payload.created_at || payload.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: text,
        isAttachment: !!payload.attachment_url,
        fileName: payload.attachment_name || undefined,
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
  }, [selectedConversationId, userId, loadConversations]);

  // Build nursesList from conversations for the inbox view
  const nursesList = conversations.map((c) => ({
    id: c.id,
    name: c.nurseName || "Nurse",
    initials: (c.nurseName || "N").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
    verified: true,
    roleBadge: c.bookingStatus === "confirmed" ? "Booked Nurse" : "Inquiry",
    careFor: c.subtitle || c.jobRef || "",
    careStatus: (c.bookingStatus === "confirmed" ? "active" : "vetting") as "active" | "vetting",
    careBadge: c.bookingStatus === "confirmed" ? "Active Shift" : "Pre-Hire Inquiry",
    lastMessage: c.lastMessage || "",
    lastTime: c.lastMessageAt ? getRelativeTime(c.lastMessageAt) : "",
    unread: c.unreadCount || 0,
    isPinned: false,
    online: c.online || false,
  }));

  const selectedNurseId = selectedConversationId;
  const activeNurse = nursesList.find((n) => n.id === selectedNurseId) || nursesList[0] || {
    id: "default",
    name: "Care Nurse",
    initials: "CN",
    verified: true,
    roleBadge: "Assigned Nurse",
    careFor: "Care Discussion",
    careStatus: "vetting" as const,
    careBadge: "Care Discussion",
    lastMessage: "",
    lastTime: "",
    unread: 0,
    isPinned: false,
    online: true,
  };
  const bookedNurseIds: Record<string, boolean> = {};
  conversations.forEach((c) => { bookedNurseIds[c.id] = c.escrowStatus === "funded" || c.bookingStatus === "confirmed"; });

  const handleConfirmNurseBooking = () => {
    const nurse = nursesList.find((n) => n.id === selectedNurseId) || nursesList[0];
    if (!nurse) return;
    Alert.alert(
      "Confirm Care Booking",
      `Book ${nurse.name} for clinical care? This unlocks direct phone calling, video tele-consultations, clinical attachments, and voice notes.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Booking",
          style: "default",
          onPress: () => {
            Alert.alert(
              "Booking Confirmed",
              `Booking confirmed with ${nurse.name}! Direct calling, video, voice notes, and document attachments are now unlocked.`
            );
          },
        },
      ]
    );
  };

  const handleInputChange = (text: string) => {
    setMessageInput(text);
    if (!isBooked && containsContactInfo(text)) {
      setShowContactWarning(true);
    } else {
      setShowContactWarning(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId) return;

    // Automatically mask any contact info (emails, phones, addresses) before care is booked
    const finalContent = isBooked
      ? messageInput.trim()
      : maskContactInfo(messageInput.trim(), false);

    // Optimistic update
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: "user",
      name: "You",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: finalContent,
    };
    setChatMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
    setMessageInput("");
    setShowContactWarning(false);

    try {
      const senderName = profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Patient"
        : "Patient";
      await api.sendMessage(selectedConversationId, finalContent, senderName);
    } catch (err) {
      console.warn("Send message error:", err);
    }
  };

  const filteredNurses = nursesList.filter((nurse) => {
    const matchesSearch =
      nurse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nurse.careFor.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === "active") return nurse.careStatus === "active";
    if (activeTab === "inquiry") return nurse.careStatus === "vetting";
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.neuBg}
      />

      {/* ============================================================ */}
      {/* VIEW 1: INBOX LIST (Screen 1 - Clean Neumorphic)             */}
      {/* ============================================================ */}
      {currentView === "list" ? (
        <View style={styles.listWrapper}>
          {/* Top Bar matching Image 1: "Hello, Harinder" + circular icons */}
          <View style={styles.inboxHeader}>
            <View>
              <Text style={styles.greetingSub}>Hello,</Text>
              <Text style={styles.greetingName}>{profile?.first_name || "Patient"}</Text>
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
                    Alert.alert("Chat Settings", "Notification preferences, clinical logs archive, and masked calling rules.");
                  }
                }}
                activeOpacity={0.75}
              >
                <MoreVertical size={18} color={colors.gray700} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar (Collapsible / Toggleable) */}
          {showSearchInput && (
            <View style={styles.searchContainer}>
              <Search size={15} color={colors.gray400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search nurses, conditions, or shifts..."
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

          {/* Segmented Filter Pills (Image 1: All Chats, Groups, Contacts -> All Chats, Active Care, Inquiries) */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === "all" && styles.filterPillActive,
              ]}
              onPress={() => setActiveTab("all")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === "all" && styles.filterPillTextActive,
                ]}
              >
                All Chats
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === "active" && styles.filterPillActive,
              ]}
              onPress={() => setActiveTab("active")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === "active" && styles.filterPillTextActive,
                ]}
              >
                Active Care
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === "inquiry" && styles.filterPillActive,
              ]}
              onPress={() => setActiveTab("inquiry")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === "inquiry" && styles.filterPillTextActive,
                ]}
              >
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
              <MessagesListSkeleton count={4} />
            ) : filteredNurses.length === 0 ? (
              <View style={[styles.emptyCardInner, { alignItems: "center", paddingVertical: 40 }]}>
                <View style={styles.emptyIconWrap}>
                  <MessageSquare size={28} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No Conversations Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Direct messaging with verified clinicians starts when nurses submit proposals or when a care booking is confirmed.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 16 }}
                  onPress={() => navigation?.navigate?.("My Requests")}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>View Care Requests & Bids</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.chatListCard}>
                {filteredNurses.map((nurse, index) => {
                const isSelected = selectedNurseId === nurse.id;
                const isLast = index === filteredNurses.length - 1;

                return (
                  <TouchableOpacity
                    key={nurse.id}
                    style={[
                      styles.chatItemRow,
                      !isLast && styles.chatItemBorder,
                      isSelected && styles.chatItemActiveBg,
                    ]}
                    onPress={() => {
                      setSelectedConversationId(nurse.id);
                      setCurrentView("chat");
                    }}
                    activeOpacity={0.75}
                  >
                    {/* Round Avatar with Online Dot */}
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitial}>{nurse.initials}</Text>
                      </View>
                      {nurse.online && <View style={styles.onlineDot} />}
                    </View>

                    {/* Chat Content Info */}
                    <View style={styles.chatMetaCol}>
                      <View style={styles.chatNameRow}>
                        <View style={styles.nameWithPin}>
                          <Text style={styles.nurseNameText}>{nurse.name}</Text>
                          {nurse.isPinned && (
                            <Pin size={12} color="#3B82F6" strokeWidth={2.4} />
                          )}
                        </View>
                        <Text style={styles.chatTimeText}>{nurse.lastTime}</Text>
                      </View>

                      <View style={styles.chatSubRow}>
                        <Text style={styles.lastMessageSnippet} numberOfLines={1}>
                          {nurse.lastMessage}
                        </Text>
                        {nurse.unread > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{nurse.unread}</Text>
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

          {/* Floating Action Button (Image 1 bottom-right circular button) */}
          <TouchableOpacity
            style={styles.floatingComposeBtn}
            onPress={() => {
              if (conversations.length > 0) {
                setSelectedConversationId(conversations[0].id);
                setCurrentView("chat");
              } else {
                navigation?.navigate?.("My Requests");
              }
            }}
            activeOpacity={0.85}
          >
            <Plus size={22} color={colors.white} strokeWidth={2.8} />
          </TouchableOpacity>
        </View>
      ) : (
        /* ============================================================ */
        /* VIEW 2: ACTIVE CLINICAL CHAT (Screen 2 - All Blue Header)    */
        /* ============================================================ */
        <KeyboardAvoidingView
          style={styles.chatScreenContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Top Neumorphic Header: Clean White with Dark Text & Blue Action Icons */}
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
                  <Text style={styles.headerAvatarInitials}>{activeNurse.initials}</Text>
                </View>
                <View style={styles.headerOnlineDot} />
              </View>

              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerNurseName}>{activeNurse.name}</Text>
                <View style={styles.headerStatusRow}>
                  <View style={styles.statusDotGreen} />
                  <Text style={styles.headerOnlineStatus}>Online • Active Shift</Text>
                </View>
              </View>
            </View>

            {/* Top-Right: Video/Phone strictly hidden when masked; only shown when care booking is funded */}
            <View style={styles.headerRightButtons}>
              {isBooked ? (
                <>
                  <TouchableOpacity
                    style={styles.circleCallBtn}
                    onPress={() => {
                      Alert.alert(
                        "Encrypted Clinical Video",
                        "Initiating WebRTC clinical tele-consultation room."
                      );
                    }}
                    activeOpacity={0.75}
                  >
                    <Video size={17} color="#059669" strokeWidth={2.2} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.circleCallBtn}
                    onPress={() => {
                      Alert.alert(
                        "Masked Phone Call",
                        "Connecting via private Twilio gateway. Your personal number remains protected."
                      );
                    }}
                    activeOpacity={0.75}
                  >
                    <Phone size={17} color="#059669" strokeWidth={2.2} />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.privacyMaskedChip}>
                  <Lock size={11} color="#059669" strokeWidth={2.4} />
                  <Text style={styles.privacyMaskedChipText}>Protected</Text>
                </View>
              )}

              {!isBooked && (
                <TouchableOpacity
                  style={styles.bookNurseHeaderBtn}
                  onPress={handleConfirmNurseBooking}
                  activeOpacity={0.8}
                >
                  <ShieldCheck size={13} color="#2563EB" strokeWidth={2.4} />
                  <Text style={styles.bookNurseHeaderBtnText}>Book Care</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Pre-Hire Notice Strip */}
          {!isBooked && (
            <View style={styles.vettingNoticeStrip}>
              <Lock size={12} color="#92400E" strokeWidth={2.4} />
              <Text style={styles.vettingNoticeText}>
                Pre-Hire Mode: Calls, attachments & voice notes unlock once booked.
              </Text>
              <TouchableOpacity
                onPress={handleConfirmNurseBooking}
                activeOpacity={0.8}
              >
                <Text style={styles.unlockLinkText}>Book Care</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Messages Stream on Neumorphic Canvas */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.neuMessagesScroll}
            contentContainerStyle={styles.neuMessagesContent}
            showsVerticalScrollIndicator={false}
          >
            {(isBooked ? chatMessages : chatMessages.filter((m) => !m.isAttachment)).map((msg) => {
              const isUser = msg.sender === "user";

              if (msg.isAttachment) {
                return (
                  <View key={msg.id} style={styles.nurseBubbleWrap}>
                    <View style={styles.attachmentCard}>
                      <View style={styles.attachmentLeft}>
                        <View style={styles.fileIconBox}>
                          <FileText size={18} color="#2563EB" strokeWidth={2} />
                        </View>
                        <View>
                          <Text style={styles.attachmentFileName}>{msg.fileName}</Text>
                          <Text style={styles.attachmentFileSize}>{msg.fileSize}</Text>
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
                    <Text style={styles.nurseTimestamp}>{msg.time}</Text>
                  </View>
                );
              }

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.userMessageRow : styles.nurseMessageRow,
                  ]}
                >
                  <View
                    style={[
                      styles.messagePill,
                      isUser ? styles.userPill : styles.nursePill,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageBodyText,
                        isUser ? styles.userBodyText : styles.nurseBodyText,
                      ]}
                    >
                      {isBooked ? msg.text : maskContactInfo(msg.text, false)}
                    </Text>
                    <View style={styles.msgFooterRow}>
                      <Text
                        style={[
                          styles.messageTimestamp,
                          isUser ? styles.userTimestamp : styles.nurseTimestamp,
                        ]}
                      >
                        {msg.time}
                      </Text>
                      {isUser && (
                        <CheckCheck size={13} color="rgba(255, 255, 255, 0.85)" strokeWidth={2.4} />
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Contact Warning Alert Banner */}
          {showContactWarning && (
            <View style={styles.contactWarningBanner}>
              <AlertCircle size={14} color="#BE123C" strokeWidth={2.4} />
              <Text style={styles.contactWarningText}>
                Direct phone & payment numbers are masked prior to booking.
              </Text>
              <TouchableOpacity
                style={styles.maskProceedBtn}
                onPress={() => {
                  const masked = maskContactInfo(messageInput, false);
                  setMessageInput(masked);
                  setShowContactWarning(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.maskProceedText}>Mask & Send</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Floating White Input Capsule (Image 2 Bottom Bar) */}
          <View style={styles.floatingInputWrapper}>
            <View style={styles.whiteInputCapsule}>
              {isBooked && (
                <TouchableOpacity
                  style={styles.micBtn}
                  onPress={() => Alert.alert("Voice Message", "Hold to record clinical voice note.")}
                  activeOpacity={0.7}
                >
                  <Mic size={17} color={colors.gray500} strokeWidth={2} />
                </TouchableOpacity>
              )}

              <TextInput
                style={[styles.chatInputField, !isBooked && { paddingLeft: 14 }]}
                value={messageInput}
                onChangeText={handleInputChange}
                placeholder={isBooked ? "Type clinical message..." : "Type a message to nurse..."}
                placeholderTextColor={colors.gray400}
              />

              {isBooked && (
                <TouchableOpacity
                  style={styles.paperclipBtn}
                  onPress={() => Alert.alert("Attach Document", "Select lab report, vitals sheet, or medication chart.")}
                  activeOpacity={0.7}
                >
                  <Paperclip size={17} color={colors.gray400} strokeWidth={2} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.blueCircularSendBtn}
                onPress={handleSendMessage}
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
  /* INBOX SCREEN STYLES (Screen 1)                               */
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

  /* Filter Pills (All Chats, Active Care, Inquiries) */
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
    paddingBottom: 170, // Clearance for floating bottom nav
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

  /* Floating Action Button (Image 1) */
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
  /* ACTIVE CHAT SCREEN STYLES (Swapped: White canvas, Blue User) */
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
  statusDotAmber: {
    backgroundColor: "#F59E0B",
  },
  headerOnlineStatus: {
    fontSize: 10.5,
    color: colors.gray500,
    fontWeight: "500",
  },
  headerRightButtons: {
    flexDirection: "row",
    gap: 8,
  },
  bookNurseHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  bookNurseHeaderBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
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

  vettingNoticeStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  unlockLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
    textDecorationLine: "underline",
  },

  /* Messages Scroll Area on Neumorphic Canvas */
  neuMessagesScroll: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  neuMessagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
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
  /* Outgoing Patient: Rich Blue Pill */
  userPill: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  /* Incoming Nurse: Clean White Neumorphic Pill */
  nursePill: {
    backgroundColor: colors.white,
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
    color: colors.white, // Crisp white on blue pill
    fontWeight: "600",
  },
  nurseBodyText: {
    color: colors.gray900, // Dark readable text on white bubble
    fontWeight: "500",
  },
  messageTimestamp: {
    fontSize: 9.5,
    color: colors.gray400,
    marginTop: 3,
    paddingHorizontal: 4,
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

  /* Clinical Attachment Card (White Neumorphic) */
  nurseBubbleWrap: {
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
  nurseTimestamp: {
    fontSize: 9.5,
    color: colors.gray400,
    marginTop: 3,
    paddingHorizontal: 4,
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
