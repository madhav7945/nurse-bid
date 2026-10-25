import React from "react";
import {
  Platform,
  View,
  StyleSheet,
  useWindowDimensions,
  Alert,
  Text,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FloatingTabBar } from "./src/components/ui/FloatingTabBar";
import { colors } from "./src/theme/colors";
import { useAppPermissions } from "./src/hooks/useAppPermissions";
import { usePushNotifications } from "./src/hooks/usePushNotifications";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { RealtimeProvider } from "./src/context/RealtimeContext";

// Screens
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { ShiftsScreen } from "./src/screens/ShiftsScreen";
import { PatientsScreen } from "./src/screens/PatientsScreen";
import { JobsScreen } from "./src/screens/JobsScreen";
import { JobDetailScreen } from "./src/screens/JobDetailScreen";
import { MessagesScreen } from "./src/screens/MessagesScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";

const Tab = createBottomTabNavigator() as any;
const Stack = createNativeStackNavigator() as any;
const NavigationContainerAny = NavigationContainer as any;
const SafeAreaProviderAny = SafeAreaProvider as any;

// Global Web Alert Polyfill: Enables button onPress callbacks in web browsers
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
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Shifts" component={ShiftsScreen} />
      <Tab.Screen name="Patients" component={PatientsScreen} />
      <Tab.Screen name="Jobs" component={JobsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />

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
    console.error("NurseApp RootErrorBoundary caught error:", error, errorInfo);
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
            Reload Clinician Portal
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
  const isDesktopWeb = Platform.OS === "web" && width > 520;

  // First launch permission prompts (Camera, Photos, Push Notifications)
  useAppPermissions();
  usePushNotifications();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.gray500, marginTop: 12, fontSize: 13, fontWeight: "500" }}>
          Verifying Clinician Credentials...
        </Text>
      </View>
    );
  }

  const content = (
    <NavigationContainerAny>
      <StatusBar style="dark" backgroundColor={colors.neuBg} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="MainTabs" component={BottomTabs} />
            <Stack.Screen name="JobDetail" component={JobDetailScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainerAny>
  );

  if (!isDesktopWeb) {
    return content;
  }

  // When viewed on desktop/laptop browser: enforce the realistic, centered mobile phone frame identical to Patient App
  return (
    <View style={styles.desktopCanvas}>
      <View
        style={[
          styles.phoneFrame,
          { height: Math.min(height - 32, 880) },
        ]}
      >
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
    backgroundColor: "#0B0F19", // Deep dark luxury background that makes phone pop
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
