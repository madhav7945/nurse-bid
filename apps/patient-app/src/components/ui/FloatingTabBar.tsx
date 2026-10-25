import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
} from "react-native";
import {
  LayoutGrid,
  PlusCircle,
  FileText,
  Activity,
  MessageSquare,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { subscribeTabBarVisible, setTabBarVisible } from "../../lib/tabBarState";

interface FloatingTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

interface TabItemConfig {
  name: string;
  label: string;
  icon: (color: string, size: number, strokeWidth: number) => React.ReactNode;
  badge?: string;
  badgeColor?: string;
  badgeTextColor?: string;
}

export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({
  state,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  // Determine current active route name
  const currentRouteName = state.routes[state.index]?.name || "Dashboard";

  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const [counts, setCounts] = useState({
    requests: 0,
    liveShifts: 0,
    unreadMessages: 0,
  });

  useEffect(() => {
    const unsub = subscribeTabBarVisible(setIsTabBarVisible);

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      unsub();
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Guarantee tab bar resets keyboard state when switching routes
  useEffect(() => {
    setIsKeyboardVisible(false);
  }, [currentRouteName]);

  useEffect(() => {
    let isMounted = true;
    const loadCounts = async () => {
      try {
        const [jobs, bookings, convos] = await Promise.all([
          api.getMyJobs(),
          api.getBookings(),
          api.getMyConversations(),
        ]);
        if (isMounted) {
          const openJobs = (jobs || []).filter((j: any) => j.status === "open").length;
          const activeBookings = (bookings || []).filter((b: any) => b.status === "confirmed" || b.status === "active" || b.status === "Active").length;
          const unread = (convos || []).reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
          setCounts({
            requests: openJobs,
            liveShifts: activeBookings,
            unreadMessages: unread,
          });
        }
      } catch (e) {}
    };

    loadCounts();
    const interval = setInterval(loadCounts, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentRouteName]);

  // Map sub-routes to parent tab highlights so the menu bar is always active & visible
  const getEffectiveActiveTab = (route: string): string => {
    if (route === "Proposals") return "My Requests";
    if (route === "Escrow") return "Bookings";
    if (route === "Profile" || route === "Settings") return "Dashboard";
    return route;
  };

  const activeTabName = getEffectiveActiveTab(currentRouteName);
  const bottomOffset = Math.max(14, insets.bottom + 8);

  // 5 exact pages from Image 2
  const tabs: TabItemConfig[] = [
    {
      name: "Dashboard",
      label: "Dashboard",
      icon: (color, size, strokeWidth) => (
        <LayoutGrid size={size} color={color} strokeWidth={strokeWidth} />
      ),
    },
    {
      name: "Post Job",
      label: "Post Care",
      icon: (color, size, strokeWidth) => (
        <PlusCircle size={size} color={color} strokeWidth={strokeWidth} />
      ),
    },
    {
      name: "My Requests",
      label: "Requests",
      icon: (color, size, strokeWidth) => (
        <FileText size={size} color={color} strokeWidth={strokeWidth} />
      ),
      badge: counts.requests > 0 ? String(counts.requests) : undefined,
      badgeColor: "#F1F5F9",
      badgeTextColor: "#64748B",
    },
    {
      name: "Bookings",
      label: "Shifts",
      icon: (color, size, strokeWidth) => (
        <Activity size={size} color={color} strokeWidth={strokeWidth} />
      ),
      badge: counts.liveShifts > 0 ? `${counts.liveShifts} Live` : undefined,
      badgeColor: "#ECFDF5",
      badgeTextColor: "#059669",
    },
    {
      name: "Messages",
      label: "Messages",
      icon: (color, size, strokeWidth) => (
        <MessageSquare size={size} color={color} strokeWidth={strokeWidth} />
      ),
      badge: counts.unreadMessages > 0 ? String(counts.unreadMessages) : undefined,
      badgeColor: "#2E5BFF",
      badgeTextColor: "#FFFFFF",
    },
  ];

  const handleTabPress = (tabName: string) => {
    if (currentRouteName !== tabName) {
      navigation.navigate(tabName);
    }
  };

  // Hide tab bar when explicitly commanded by modals, sheets, or 1-on-1 chat
  if (!isTabBarVisible) {
    return null;
  }

  return (
    <View
      testID="floating-tab-bar"
      accessibilityLabel="Floating Tab Bar"
      style={[styles.floatingWrapper, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      {/* Frosted Glass Capsule Bar */}
      <View
        style={[
          styles.glassCapsule,
          Platform.select({
            web: {
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
            } as any,
          }),
        ]}
      >
        {tabs.map((tab) => {
          const isFocused = activeTabName === tab.name;
          const iconColor = isFocused ? "#FFFFFF" : "#64748B";
          const iconSize = 18;
          const strokeWidth = isFocused ? 2.5 : 2.0;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => handleTabPress(tab.name)}
              style={[styles.tabButton, isFocused && styles.tabButtonActive]}
              activeOpacity={0.75}
            >
              {/* Notification / Status Badges from Image 2 */}
              {tab.badge && !isFocused && (
                <View
                  style={[
                    styles.tabBadge,
                    { backgroundColor: tab.badgeColor || "#EAF0FF" },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      { color: tab.badgeTextColor || "#2E5BFF" },
                    ]}
                  >
                    {tab.badge}
                  </Text>
                </View>
              )}

              {/* Icon */}
              <View style={styles.iconBox}>
                {tab.icon(iconColor, iconSize, strokeWidth)}
              </View>

              {/* Label */}
              <Text
                style={[
                  styles.tabLabel,
                  isFocused && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  glassCapsule: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "94%",
    maxWidth: 420,
    backgroundColor: Platform.OS === "android" ? "#FFFFFF" : "rgba(255, 255, 255, 0.94)", // Crisp opaque surface on Android to prevent bleed-through
    borderRadius: 32,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.98)", // Crisp specular edge
    shadowColor: "#7A8AAB",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 22,
    position: "relative",
  },
  tabButtonActive: {
    backgroundColor: "#2E5BFF", // Rich active cobalt blue pill
    shadowColor: "#2E5BFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 5,
  },
  iconBox: {
    alignItems: "center",
    justifyContent: "center",
    height: 20,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  tabBadge: {
    position: "absolute",
    top: 2,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    zIndex: 2,
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  tabBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
