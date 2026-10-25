import { useEffect } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const FIRST_INSTALL_PERMISSIONS_KEY = "@nursebid_first_install_permissions_handled";

/**
 * Universal Permissions Bootstrap Hook
 * Requests standard device permissions (Camera, GPS Location, Notifications, Media Storage)
 * strictly on the first launch of the app installation with full defensive guards.
 */
export function useAppPermissions() {
  useEffect(() => {
    if (Platform.OS === "web") return;

    async function requestPermissionsOnFirstLaunch() {
      try {
        const alreadyHandled = await AsyncStorage.getItem(FIRST_INSTALL_PERMISSIONS_KEY);
        if (alreadyHandled === "true") return;

        if (Platform.OS === "android") {
          const permissionsToRequest: any[] = [
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ];

          // Android 13+ (API 33+) requires runtime permission for Notifications and Media Images
          if (Platform.Version >= 33) {
            permissionsToRequest.push(
              "android.permission.POST_NOTIFICATIONS",
              "android.permission.READ_MEDIA_IMAGES"
            );
          } else {
            permissionsToRequest.push(
              PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
            );
          }

          await PermissionsAndroid.requestMultiple(permissionsToRequest);
        } else {
          // iOS permissions fallback using expo modules
          await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => {});
          await ImagePicker.requestCameraPermissionsAsync().catch(() => {});
        }

        // Notification runtime permission across platforms
        await Notifications.requestPermissionsAsync().catch(() => {});

        await AsyncStorage.setItem(FIRST_INSTALL_PERMISSIONS_KEY, "true");
      } catch (err) {
        // Silently handle any platform permission error
      }
    }

    // Delay slightly after app mount so navigation and UI mount smoothly first
    const timer = setTimeout(() => {
      requestPermissionsOnFirstLaunch();
    }, 1200);

    return () => clearTimeout(timer);
  }, []);
}
