import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
  BackHandler,
} from "react-native";
import { colors, neuShadows } from "../../theme/colors";
import { setTabBarVisible } from "../../lib/tabBarState";

interface ContainerModalProps {
  visible: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  position?: "bottom" | "center";
  cardStyle?: ViewStyle;
}

/**
 * ContainerModal — Web & Simulator-Safe In-Container Modal Sheet
 * Strictly prevents React Native Web root DOM portal leaks outside the 412px phone simulator.
 * Automatically manages bottom menu bar visibility so buttons are never obstructed.
 */
export const ContainerModal: React.FC<ContainerModalProps> = ({
  visible,
  onClose,
  children,
  position = "bottom",
  cardStyle,
}) => {
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setTabBarVisible(false);
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (onCloseRef.current) {
          onCloseRef.current();
          return true;
        }
        return false;
      });
      return () => {
        sub.remove();
        setTabBarVisible(true);
      };
    } else {
      setTabBarVisible(true);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      style={[
        styles.overlay,
        position === "center" ? styles.overlayCenter : styles.overlayBottom,
      ]}
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
        accessibilityLabel="Close modal overlay"
      />
      <View
        style={[
          styles.card,
          position === "bottom" ? styles.bottomCard : styles.centerCard,
          cardStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.62)",
    zIndex: 99999,
    elevation: 999,
  },
  overlayBottom: {
    justifyContent: "flex-end",
    alignItems: "center",
  },
  overlayCenter: {
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 412,
    backgroundColor: colors.white,
    ...neuShadows.cardElevated,
  },
  bottomCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.neuBorderWhite,
    maxHeight: "92%",
    paddingBottom: Platform.OS === "android" ? 28 : 36,
  },
  centerCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.neuBorderWhite,
    maxHeight: "90%",
  },
});
