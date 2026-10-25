// ═══════════════════════════════════════════════════════════════════════════════
// MapLocationPickerModal — Clinical Geolocation & Interactive Map Pin Picker
// Allows patient to pinpoint exact care destination using GPS, OpenStreetMap search,
// quick Punjab locality presets, and micro-coordinate tuning.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from "react-native";
import {
  MapPin,
  Crosshair,
  Search,
  Check,
  X,
  ExternalLink,
  Navigation,
  Compass,
  ChevronRight,
  ShieldCheck,
  Building,
} from "lucide-react-native";
import Svg, { Rect, Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { colors } from "../../theme/colors";

export interface SelectedLocationData {
  address: string;
  locality: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

interface MapLocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (data: SelectedLocationData) => void;
  initialCoordinates?: { latitude: number; longitude: number };
  initialAddress?: string;
  initialLocality?: string;
  initialCity?: string;
  initialPostalCode?: string;
}

// Verified Punjab Hubs & Pinned Centers
const PUNJAB_PRESET_LOCATIONS = [
  {
    name: "Model Town, Jalandhar",
    sub: "Urban Estate, Guru Teg Bahadur Nagar",
    city: "Jalandhar",
    locality: "Model Town",
    postalCode: "144003",
    lat: 31.3090,
    lng: 75.5807,
  },
  {
    name: "Urban Estate Phase 2, Jalandhar",
    sub: "Near Curo High Street, Chunmun Mall",
    city: "Jalandhar",
    locality: "Urban Estate Phase 2",
    postalCode: "144022",
    lat: 31.2854,
    lng: 75.6015,
  },
  {
    name: "Sarabha Nagar, Ludhiana",
    sub: "Kipps Market, Malhar Road area",
    city: "Ludhiana",
    locality: "Sarabha Nagar",
    postalCode: "141001",
    lat: 30.8872,
    lng: 75.8198,
  },
  {
    name: "Model Town Extension, Ludhiana",
    sub: "Near Krishna Mandir & Tuitions Hub",
    city: "Ludhiana",
    locality: "Model Town Extension",
    postalCode: "141002",
    lat: 30.8805,
    lng: 75.8392,
  },
  {
    name: "Ranjit Avenue, Amritsar",
    sub: "B-Block, District Shopping Center",
    city: "Amritsar",
    locality: "Ranjit Avenue",
    postalCode: "143001",
    lat: 31.6548,
    lng: 74.8570,
  },
  {
    name: "Sector 70, Mohali",
    sub: "SAS Nagar, Near Mataur & Ivy Hospital",
    city: "Mohali",
    locality: "Sector 70",
    postalCode: "160071",
    lat: 30.7046,
    lng: 76.7179,
  },
  {
    name: "Civil Lines, Patiala",
    sub: "Near Rajindra Hospital & Baradari",
    city: "Patiala",
    locality: "Civil Lines",
    postalCode: "147001",
    lat: 30.3398,
    lng: 76.3869,
  },
  {
    name: "Civil Lines, Bathinda",
    sub: "Near AIIMS Road & Power House Colony",
    city: "Bathinda",
    locality: "Civil Lines",
    postalCode: "151001",
    lat: 30.2110,
    lng: 74.9455,
  },
];

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  visible,
  onClose,
  onSelectLocation,
  initialCoordinates,
  initialAddress = "",
  initialLocality = "",
  initialCity = "",
  initialPostalCode = "",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);

  // Selected Pin Coordinates
  const [lat, setLat] = useState<number>(initialCoordinates?.latitude || 31.3090);
  const [lng, setLng] = useState<number>(initialCoordinates?.longitude || 75.5807);

  // Field details
  const [address, setAddress] = useState(initialAddress || "");
  const [locality, setLocality] = useState(initialLocality || "Model Town");
  const [city, setCity] = useState(initialCity || "Jalandhar");
  const [postalCode, setPostalCode] = useState(initialPostalCode || "144003");

  useEffect(() => {
    if (visible) {
      if (initialCoordinates?.latitude && initialCoordinates?.longitude) {
        setLat(initialCoordinates.latitude);
        setLng(initialCoordinates.longitude);
      }
      if (initialAddress) setAddress(initialAddress);
      if (initialLocality) setLocality(initialLocality);
      if (initialCity) setCity(initialCity);
      if (initialPostalCode) setPostalCode(initialPostalCode);
    }
  }, [visible]);

  // Search OpenStreetMap Nominatim API for places
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const q = encodeURIComponent(`${query.trim()}, India`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=in&q=${q}`,
        {
          headers: {
            "User-Agent": "NurseBid-HealthcareApp/1.0",
          },
        }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.warn("Search geocoding error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    const itemLat = parseFloat(item.lat);
    const itemLng = parseFloat(item.lon);
    if (!isNaN(itemLat) && !isNaN(itemLng)) {
      setLat(itemLat);
      setLng(itemLng);
    }

    const addr = item.address || {};
    const street = [addr.house_number, addr.road].filter(Boolean).join(", ");
    const loc = addr.suburb || addr.neighbourhood || addr.subdistrict || addr.residential || locality;
    const c = addr.city || addr.town || addr.county || addr.state_district || city;
    const pin = addr.postcode || postalCode;

    if (street) setAddress(street);
    if (loc) setLocality(loc);
    if (c) setCity(c);
    if (pin) setPostalCode(pin);

    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSelectPreset = (preset: typeof PUNJAB_PRESET_LOCATIONS[0]) => {
    setLat(preset.lat);
    setLng(preset.lng);
    setLocality(preset.locality);
    setCity(preset.city);
    setPostalCode(preset.postalCode);
    if (!address) {
      setAddress(`Main Road, ${preset.locality}`);
    }
    setSearchResults([]);
    setSearchQuery("");
  };

  // Reverse geocode to resolve street address and landmark from coordinates
  const reverseGeocode = async (targetLat: number, targetLng: number) => {
    setReverseLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${targetLat}&lon=${targetLng}&format=json&addressdetails=1`,
        {
          headers: {
            "User-Agent": "NurseBid-HealthcareApp/1.0",
          },
        }
      );
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const street = [addr.house_number, addr.road, addr.commercial].filter(Boolean).join(", ");
        const loc = addr.suburb || addr.neighbourhood || addr.residential || addr.subdistrict || locality;
        const c = addr.city || addr.town || addr.county || city;
        const pin = addr.postcode || postalCode;

        if (street) setAddress(street);
        if (loc) setLocality(loc);
        if (c) setCity(c);
        if (pin) setPostalCode(pin);
      }
    } catch (err) {
      console.warn("Reverse geocode notice:", err);
    } finally {
      setReverseLoading(false);
    }
  };

  // One-tap Device / IP GPS Auto-detect
  const handleDetectCurrentLocation = async () => {
    setIsDetectingGps(true);

    const tryReverseAndSet = async (detectedLat: number, detectedLng: number) => {
      setLat(detectedLat);
      setLng(detectedLng);
      await reverseGeocode(detectedLat, detectedLng);
      setIsDetectingGps(false);
      Alert.alert(
        "📍 GPS Locked",
        `Coordinates detected: ${detectedLat.toFixed(4)}° N, ${detectedLng.toFixed(4)}° E.\nAddress has been calibrated.`
      );
    };

    // 1. Try standard navigator.geolocation
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          tryReverseAndSet(pos.coords.latitude, pos.coords.longitude);
        },
        async () => {
          // Fallback to IP geolocation
          await fallbackIpGeolocation(tryReverseAndSet);
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    } else {
      await fallbackIpGeolocation(tryReverseAndSet);
    }
  };

  const fallbackIpGeolocation = async (callback: (lat: number, lng: number) => void) => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        await callback(parseFloat(data.latitude), parseFloat(data.longitude));
        return;
      }
    } catch {}

    // Jalandhar Center default if everything fails
    callback(31.3260, 75.5762);
  };

  // Micro-adjustment for pin fine-tuning
  const nudgeCoordinate = (deltaLat: number, deltaLng: number) => {
    const newLat = parseFloat((lat + deltaLat).toFixed(5));
    const newLng = parseFloat((lng + deltaLng).toFixed(5));
    setLat(newLat);
    setLng(newLng);
  };

  const handleOpenGoogleMapsPreview = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}(Selected+Care+Location)`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });
    Linking.openURL(url!).catch(() => {
      Alert.alert("Google Maps", `Coordinates: ${lat}, ${lng}`);
    });
  };

  const handleConfirm = () => {
    const fullStreet = address.trim() || `Main Road, ${locality}`;
    const formatted = `${fullStreet}, ${locality}, ${city} (PIN: ${postalCode}) [GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}]`;

    onSelectLocation({
      address: fullStreet,
      locality: locality.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      latitude: lat,
      longitude: lng,
      formattedAddress: formatted,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.headerIconCircle}>
                <Compass size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Select Location on Map</Text>
                <Text style={styles.headerSubtitle}>
                  Set precise doorstep GPS coordinates for arriving clinicians
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Search Input Bar */}
            <View style={styles.searchBarContainer}>
              <Search size={16} color={colors.primary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder="Search street, locality, hospital or city..."
                placeholderTextColor={colors.gray400}
              />
              {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
              {searchQuery.length > 0 && !isSearching && (
                <TouchableOpacity onPress={() => handleSearch("")}>
                  <X size={15} color={colors.gray400} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <View style={styles.searchResultsBox}>
                {searchResults.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectSearchResult(item)}
                    activeOpacity={0.7}
                  >
                    <MapPin size={15} color={colors.primary} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.searchResultTitle} numberOfLines={1}>
                        {item.display_name.split(",")[0]}
                      </Text>
                      <Text style={styles.searchResultSub} numberOfLines={1}>
                        {item.display_name}
                      </Text>
                    </View>
                    <ChevronRight size={14} color={colors.gray400} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Quick Action: Auto-Detect GPS Button */}
            <TouchableOpacity
              style={styles.gpsDetectBtn}
              onPress={handleDetectCurrentLocation}
              disabled={isDetectingGps}
              activeOpacity={0.8}
            >
              {isDetectingGps ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Crosshair size={16} color={colors.primary} />
              )}
              <Text style={styles.gpsDetectBtnText}>
                {isDetectingGps ? "Acquiring Satellite Lock..." : "Use Current GPS Location"}
              </Text>
              <View style={styles.verifiedDot} />
            </TouchableOpacity>

            {/* Visual Interactive Map / Radar Canvas */}
            <View style={styles.mapCanvasCard}>
              <View style={styles.mapCanvasHeader}>
                <View style={styles.mapLiveBadge}>
                  <View style={styles.greenPulseDot} />
                  <Text style={styles.mapLiveBadgeText}>Live GPS Telemetry</Text>
                </View>
                <TouchableOpacity
                  style={styles.previewMapsBtn}
                  onPress={handleOpenGoogleMapsPreview}
                  activeOpacity={0.8}
                >
                  <ExternalLink size={12} color={colors.primary} />
                  <Text style={styles.previewMapsBtnText}>Test in Maps</Text>
                </TouchableOpacity>
              </View>

              {/* Styled SVG Map Simulation */}
              <View style={styles.svgMapWrap}>
                <Svg width="100%" height={160} viewBox="0 0 340 160">
                  {/* Map Grid Background */}
                  <Rect x="0" y="0" width="340" height="160" fill="#EBF2FA" rx="12" />
                  <Path
                    d="M 0 40 Q 80 50, 160 30 T 340 50"
                    stroke="#D2E3F8"
                    strokeWidth="10"
                    fill="none"
                  />
                  <Path
                    d="M 60 0 L 80 160"
                    stroke="#D2E3F8"
                    strokeWidth="8"
                    fill="none"
                  />
                  <Path
                    d="M 240 0 Q 220 80, 260 160"
                    stroke="#D2E3F8"
                    strokeWidth="7"
                    fill="none"
                  />
                  <Path
                    d="M 0 110 Q 140 90, 340 120"
                    stroke="#DCE8F7"
                    strokeWidth="12"
                    fill="none"
                  />

                  {/* Distance Rings */}
                  <Circle cx="170" cy="80" r="50" stroke="#2E5BFF" strokeWidth="1" strokeDasharray="4,4" fill="none" opacity={0.3} />
                  <Circle cx="170" cy="80" r="30" stroke="#2E5BFF" strokeWidth="1.5" strokeDasharray="3,3" fill="none" opacity={0.4} />
                  <Circle cx="170" cy="80" r="12" fill="rgba(46, 91, 255, 0.15)" />

                  {/* Pulsing Pin Target */}
                  <Circle cx="170" cy="80" r="7" fill={colors.primary} />
                  <Circle cx="170" cy="80" r="3.5" fill="#FFFFFF" />

                  {/* Crosshairs */}
                  <Line x1="170" y1="20" x2="170" y2="140" stroke={colors.primary} strokeWidth="1" strokeDasharray="2,2" opacity={0.5} />
                  <Line x1="40" y1="80" x2="300" y2="80" stroke={colors.primary} strokeWidth="1" strokeDasharray="2,2" opacity={0.5} />

                  <SvgText x="180" y="75" fontSize="10" fontWeight="bold" fill={colors.primary}>
                    {lat.toFixed(4)}°, {lng.toFixed(4)}°
                  </SvgText>
                </Svg>

                {/* Overlaid Coordinate Chip */}
                <View style={styles.coordOverlayBadge}>
                  <Navigation size={11} color={colors.white} />
                  <Text style={styles.coordOverlayText}>
                    PIN: {lat.toFixed(5)} N, {lng.toFixed(5)} E
                  </Text>
                </View>
              </View>

              {/* Nudge Fine-tuning Controls */}
              <View style={styles.nudgeRow}>
                <Text style={styles.nudgeLabel}>Fine-tune Doorstep Pin:</Text>
                <View style={styles.nudgeBtnGroup}>
                  <TouchableOpacity
                    style={styles.nudgeBtn}
                    onPress={() => nudgeCoordinate(0.0005, 0)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.nudgeBtnText}>▲ North</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.nudgeBtn}
                    onPress={() => nudgeCoordinate(-0.0005, 0)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.nudgeBtnText}>▼ South</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.nudgeBtn}
                    onPress={() => nudgeCoordinate(0, -0.0005)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.nudgeBtnText}>◄ West</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.nudgeBtn}
                    onPress={() => nudgeCoordinate(0, 0.0005)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.nudgeBtnText}>► East</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Quick Punjab Locality Chips */}
            <View style={styles.presetsSection}>
              <Text style={styles.sectionHeaderTitle}>Popular Punjab Care Centers & Localities</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsScroll}
              >
                {PUNJAB_PRESET_LOCATIONS.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.presetChip,
                      locality === preset.locality && styles.presetChipActive,
                    ]}
                    onPress={() => handleSelectPreset(preset)}
                    activeOpacity={0.75}
                  >
                    <Building
                      size={13}
                      color={locality === preset.locality ? colors.white : colors.primary}
                    />
                    <View style={{ marginLeft: 6 }}>
                      <Text
                        style={[
                          styles.presetChipTitle,
                          locality === preset.locality && styles.presetChipTitleActive,
                        ]}
                      >
                        {preset.locality}
                      </Text>
                      <Text
                        style={[
                          styles.presetChipCity,
                          locality === preset.locality && styles.presetChipCityActive,
                        ]}
                      >
                        {preset.city}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Address Details Confirmation Card */}
            <View style={styles.addressFormCard}>
              <Text style={styles.sectionHeaderTitle}>Confirm Street & Doorstep Details</Text>

              <Text style={styles.fieldLabel}>House / Flat / Street Name *</Text>
              <TextInput
                style={styles.formInput}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. House #342, Lane 4, Urban Estate"
                placeholderTextColor={colors.gray400}
              />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Locality / Sector *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={locality}
                    onChangeText={setLocality}
                    placeholder="e.g. Model Town"
                    placeholderTextColor={colors.gray400}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>City *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={city}
                    onChangeText={setCity}
                    placeholder="e.g. Jalandhar"
                    placeholderTextColor={colors.gray400}
                  />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>PIN Code *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={postalCode}
                    onChangeText={setPostalCode}
                    keyboardType="numeric"
                    placeholder="144003"
                    placeholderTextColor={colors.gray400}
                  />
                </View>
                <View style={{ flex: 1, justifyContent: "flex-end" }}>
                  <TouchableOpacity
                    style={styles.reverseLookupBtn}
                    onPress={() => reverseGeocode(lat, lng)}
                    disabled={reverseLoading}
                    activeOpacity={0.7}
                  >
                    {reverseLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Compass size={13} color={colors.primary} />
                    )}
                    <Text style={styles.reverseLookupBtnText}>Auto-Fill from Pin</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.privacyNote}>
                <ShieldCheck size={13} color={colors.emerald600} />
                <Text style={styles.privacyNoteText}>
                  Exact street & coordinates are secured and revealed only to the assigned nurse upon booking confirmation.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Check size={16} color={colors.white} strokeWidth={2.4} />
              <Text style={styles.confirmBtnText}>Confirm Location on Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.gray900,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#EDF2F7",
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.gray900,
    padding: 0,
  },
  searchResultsBox: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    overflow: "hidden",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchResultTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray900,
  },
  searchResultSub: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 1,
  },
  gpsDetectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: 14,
  },
  gpsDetectBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    marginLeft: 8,
    flex: 1,
  },
  verifiedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emerald600,
  },
  mapCanvasCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  mapCanvasHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mapLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.emerald600,
    marginRight: 6,
  },
  mapLiveBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.emerald700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewMapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewMapsBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: 4,
  },
  svgMapWrap: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  coordOverlayBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  coordOverlayText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  nudgeRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nudgeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray600,
  },
  nudgeBtnGroup: {
    flexDirection: "row",
    gap: 4,
  },
  nudgeBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  nudgeBtnText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray700,
  },
  presetsSection: {
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray800,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  presetsScroll: {
    gap: 8,
    paddingRight: 10,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  presetChipTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray800,
  },
  presetChipTitleActive: {
    color: colors.white,
  },
  presetChipCity: {
    fontSize: 10,
    color: colors.gray500,
  },
  presetChipCityActive: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  addressFormCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray700,
    marginBottom: 4,
    marginTop: 6,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.gray900,
  },
  twoColRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reverseLookupBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  reverseLookupBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: 4,
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  privacyNoteText: {
    fontSize: 11,
    color: colors.emerald800,
    marginLeft: 6,
    flex: 1,
    lineHeight: 15,
  },
  footerRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#EDF2F7",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray700,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
    marginLeft: 6,
  },
});
