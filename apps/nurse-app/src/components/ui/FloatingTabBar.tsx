import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LayoutGrid,
  CalendarDays,
  UsersRound,
  BriefcaseBusiness,
  MessageSquare,
} from "lucide-react-native";
import { api } from "../../lib/api";
import { colors } from "../../theme/colors";
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
  const currentRouteName = state.routes[state.index]?.name || "Dashboard";

  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const [counts, setCounts] = useState({
    activeShifts: 0,
    availableJobs: 0,
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

  // Guarantee tab bar resets when switching routes unless explicitly hidden
  useEffect(() => {
    setIsKeyboardVisible(false);
  }, [currentRouteName]);

  useEffect(() => {
    let isMounted = true;
    const loadCounts = async () => {
      try {
        const shifts = await api.getShifts().catch(() => []);
        if (isMounted) {
          const activeS = (shifts || []).filter((s: any) => s.status === "active" || s.status === "in_progress").length;
          setCounts((prev) => ({
            ...prev,
            activeShifts: activeS,
          }));
        }
      } catch (e) {}
    };

    loadCounts();
    return () => {
      isMounted = false;
    };
  }, []);

  const tabs: TabItemConfig[] = [
    {
      name: "Dashboard",
      label: "Command",
      icon: (color, size, strokeWidth) => (
        <LayoutGrid size={size} color={color} strokeWidth={strokeWidth} />
      ),
    },
    {
      name: "Shifts",
      label: "Shifts",
      icon: (color, size, strokeWidth) => (
        <CalendarDays size={size} color={color} strokeWidth={strokeWidth} />
      ),
      badge: counts.activeShifts > 0 ? "Live" : undefined,
      badgeColor: colors.successSoft,
      badgeTextColor: colors.success,
    },
    {
      name: "Patients",
      label: "Census",
      icon: (color, size, strokeWidth) => (
        <UsersRound size={size} color={color} strokeWidth={strokeWidth} />
      ),
    },
    {
      name: "Jobs",
      label: "Radar",
      icon: (color, size, strokeWidth) => (
        <BriefcaseBusiness size={size} color={color} strokeWidth={strokeWidth} />
      ),
      badge: counts.availableJobs > 0 ? String(counts.availableJobs) : undefined,
      badgeColor: colors.primarySoft,
      badgeTextColor: colors.primary,
    },
    {
      name: "Messages",
      label: "Messages",
      icon: (color, size, strokeWidth) => (
        <MessageSquare size={size} color={color} strokeWidth={strokeWidth} />
      ),
      badge: counts.unreadMessages > 0 ? String(counts.unreadMessages) : undefined,
      badgeColor: colors.primary,
      badgeTextColor: colors.white,
    },
  ];

  const getEffectiveActiveTab = (route: string) => {
    if (route === "Profile" || route === "Settings") return "Dashboard";
    if (route === "JobDetail") return "Jobs";
    return route;
  };
  const effectiveRouteName = getEffectiveActiveTab(currentRouteName);

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
      style={[styles.floatingWrapper, { bottom: Math.max(14, insets.bottom + 8) }]}
      pointerEvents="box-none"
    >
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
          const isFocused = effectiveRouteName === tab.name;
          const iconColor = isFocused ? colors.white : "#64748B";
          const iconSize = 18;
          const strokeWidth = isFocused ? 2.5 : 2.0;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => handleTabPress(tab.name)}
              style={[styles.tabButton, isFocused && styles.tabButtonActive]}
              activeOpacity={0.75}
            >
              {tab.badge && !isFocused && (
                <View
                  style={[
                    styles.tabBadge,
                    { backgroundColor: tab.badgeColor || colors.primarySoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      { color: tab.badgeTextColor || colors.primary },
                    ]}
                  >
                    {tab.badge}
                  </Text>
                </View>
              )}

              <View style={styles.iconBox}>
                {tab.icon(iconColor, iconSize, strokeWidth)}
              </View>

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
    bottom: Platform.OS === "ios" ? 22 : 14,
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
    backgroundColor: Platform.OS === "android" ? "#FFFFFF" : "rgba(255, 255, 255, 0.94)",
    borderRadius: 32,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.98)",
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
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
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
    color: colors.white,
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
