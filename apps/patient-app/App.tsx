import React from "react";
import { Platform, View, StyleSheet, useWindowDimensions, ActivityIndicator, Text, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FloatingTabBar } from "./src/components/ui/FloatingTabBar";
import { colors } from "./src/theme/colors";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { RealtimeProvider } from "./src/context/RealtimeContext";

// Screens
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { PostJobScreen } from "./src/screens/PostJobScreen";
import { MyJobsScreen } from "./src/screens/MyJobsScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { BookingsScreen } from "./src/screens/BookingsScreen";
import { EscrowScreen } from "./src/screens/EscrowScreen";
import { ProposalsScreen } from "./src/screens/ProposalsScreen";
import { MessagesScreen } from "./src/screens/MessagesScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { usePushNotifications } from "./src/hooks/usePushNotifications";
import { useAppPermissions } from "./src/hooks/useAppPermissions";

const Tab = createBottomTabNavigator() as any;
const Stack = createNativeStackNavigator() as any;
const NavigationContainerAny = NavigationContainer as any;
const SafeAreaProviderAny = SafeAreaProvider as any;

// Global Web Alert Polyfill: Enables button onPress callbacks (confirmation modals, actions) in web browsers
if (Platform.OS === "web") {
  Alert.alert = (title?: string, message?: string, buttons?: any[]) => {
    const fullMsg = title ? (message ? `${title}\n\n${message}` : title) : message || "";

    if (!buttons || buttons.length === 0) {
      if (typeof window !== "undefined") {
        window.alert(fullMsg);
      }
      return;
    }

    if (buttons.length === 1) {
      if (typeof window !== "undefined") {
        window.alert(fullMsg);
      }
      buttons[0]?.onPress?.();
      return;
    }

    // Two or more buttons (e.g. Cancel + Confirm action)
    const cancelButton = buttons.find((b: any) => b.style === "cancel");
    const actionButton = buttons.find((b: any) => b.style !== "cancel") || buttons[buttons.length - 1];

    if (typeof window !== "undefined") {
      const ok = window.confirm(fullMsg);
      if (ok) {
        actionButton?.onPress?.();
      } else {
        cancelButton?.onPress?.();
      }
    }
  };
}

// Global Web CSS Reset to remove browser's native black focus ring on all inputs/textareas
if (Platform.OS === "web" && typeof document !== "undefined") {
  const styleId = "rn-web-outline-reset";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      input, textarea, select, [contenteditable="true"] {
        outline: none !important;
        outline-width: 0 !important;
        outline-style: none !important;
        box-shadow: none !important;
      }
      input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus {
        outline: none !important;
        outline-width: 0 !important;
        outline-style: none !important;
        box-shadow: none !important;
      }
      * {
        -webkit-tap-highlight-color: transparent !important;
      }
    `;
    document.head.appendChild(style);
  }
}

function BottomTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      tabBar={(props: any) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* 5 Core Pages from Image 2 */}
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Post Job" component={PostJobScreen} />
      <Tab.Screen name="My Requests" component={MyJobsScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />

      {/* Sub-screens registered within BottomTabs so the glass menu bar stays permanently mounted */}
      <Tab.Screen name="Proposals" component={ProposalsScreen} />
      <Tab.Screen name="Escrow" component={EscrowScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("PatientApp RootErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Application Notice</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || "An unexpected error occurred. Tap below to reload."}
          </Text>
          <Text
            onPress={() => this.setState({ hasError: false, error: null })}
            style={styles.retryButton}
          >
            Reload Patient Portal
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { width, height } = useWindowDimensions();
  const { isLoading, isAuthenticated } = useAuth();

  // First launch permission prompts (Camera, Photos, Push Notifications)
  useAppPermissions();

  // Register push notification token to patient profile
  usePushNotifications();

  const isDesktopWeb = Platform.OS === "web" && width > 520;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.gray500, marginTop: 12, fontSize: 14 }}>
          Loading...
        </Text>
      </View>
    );
  }

  const content = (
    <NavigationContainerAny>
      <StatusBar style="dark" backgroundColor={colors.neuBg} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="MainTabs" component={BottomTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainerAny>
  );

  if (!isDesktopWeb) {
    return content;
  }

  // When viewed on desktop/laptop browser: enforce a realistic, centered mobile phone frame!
  return (
    <View style={styles.desktopCanvas}>
      {/* Realistic Mobile Device Simulator Frame */}
      <View
        style={[
          styles.phoneFrame,
          { height: Math.min(height - 32, 880) },
        ]}
      >
        {/* App Content inside Phone Screen */}
        <View style={styles.phoneScreen}>{content}</View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProviderAny>
      <RootErrorBoundary>
        <AuthProvider>
          <RealtimeProvider>
            <AppContent />
          </RealtimeProvider>
        </AuthProvider>
      </RootErrorBoundary>
    </SafeAreaProviderAny>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.neuBg,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.neuBg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.gray900,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 13,
    color: colors.gray600,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    color: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
  desktopCanvas: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#0B0F19", // Deep dark canvas that makes the phone frame pop
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  phoneFrame: {
    width: "100%",
    maxWidth: 412,
    backgroundColor: colors.neuBg,
    borderRadius: 44,
    borderWidth: 8,
    borderColor: "#1E293B",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.55,
    shadowRadius: 40,
    elevation: 20,
    position: "relative",
  },
  phoneScreen: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: colors.neuBg,
  },
});
