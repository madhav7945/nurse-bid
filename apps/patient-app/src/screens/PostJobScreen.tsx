import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  Alert,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Briefcase,
  User,
  HeartPulse,
  Clock,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Check,
  Circle,
  Plus,
  Minus,
  Bot,
  Send,
  X,
  Sparkles,
  Bed,
  Accessibility,
  Activity,
  FileText,
  Stethoscope,
  Baby,
  Pill,
  MapPin,
  IndianRupee,
  Eye,
  Coffee,
  Lock,
  Trash2,
  TrendingUp,
  Crosshair,
  Compass,
} from "lucide-react-native";
import { colors } from "../theme/colors";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AiJobAssistantModal } from "../components/jobs/AiJobAssistantModal";
import { MapLocationPickerModal } from "../components/ui/MapLocationPickerModal";
import { ParsedJobData } from "../lib/groq";

const sanitize = (str: any) => {
  if (typeof str !== "string") return str;
  return str.replace(/<[^>]*>?/gm, "").trim();
};


interface PostJobScreenProps {
  navigation?: any;
}

export const PostJobScreen: React.FC<PostJobScreenProps> = ({ navigation }) => {
  const { profile } = useAuth();
  // 4-Step Wizard: 1: Patient & Clinical, 2: Schedule & Shifts, 3: Care Requirements, 4: Budget & Location
  const [currentStep, setCurrentStep] = useState<number>(1);

  // ================= STEP 1: Patient & Clinical State =================
  const [jobTitle, setJobTitle] = useState("");
  const [patientName, setPatientName] = useState(
    profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : ""
  );
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("Male");
  const [patientRelationship, setPatientRelationship] = useState("Self");
  const [mobilityLevel, setMobilityLevel] = useState<string>("Ambulatory");
  const [mobilityDirectives, setMobilityDirectives] = useState("");
  const [careCategory, setCareCategory] = useState<string>("Post-Surgical ICU");
  const [drugAllergies, setDrugAllergies] = useState("");

  // ================= STEP 2: Schedule & Shifts State =================
  const [shiftModel, setShiftModel] = useState<string>("Day Shift (12h)");
  const [customHoursPerDay, setCustomHoursPerDay] = useState<number>(8);
  const [shiftStartTime, setShiftStartTime] = useState<string>("08:00 AM");
  const [shiftEndTime, setShiftEndTime] = useState<string>("08:00 PM");
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [selectedDays, setSelectedDays] = useState<number[]>([
    new Date().getDate(),
    new Date().getDate() + 1,
    new Date().getDate() + 2,
  ]);
  const [roomProvided, setRoomProvided] = useState(false);
  const [mealsProvided, setMealsProvided] = useState(false);

  // ================= STEP 3: Clinical Procedures & Requirements =================
  const [activeTasks, setActiveTasks] = useState<string[]>([
    "Vitals monitoring (BP, SpO2, Temp, Pulse)",
    "Medication administration & compliance",
  ]);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [certifications, setCertifications] = useState<string[]>([
    "BLS",
    "PNC Registered Nurse",
  ]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [physicianOrders, setPhysicianOrders] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  // ================= STEP 4: Budget & Location State =================
  const [rateType, setRateType] = useState<"hourly" | "fixed">("hourly");
  const [minRate, setMinRate] = useState("650");
  const [maxRate, setMaxRate] = useState("850");
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(1);
  const [houseAddress, setHouseAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [locality, setLocality] = useState(profile?.locality || "");
  const [city, setCity] = useState(profile?.city || "");
  const [contactPhone, setContactPhone] = useState(profile?.phone || "");

  React.useEffect(() => {
    if (profile) {
      const pName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
      if (pName && !patientName) setPatientName(pName);
      if (profile.city && !city) setCity(profile.city);
      if (profile.locality && !locality) setLocality(profile.locality);
      if (profile.phone && !contactPhone) setContactPhone(profile.phone);
    }
  }, [profile]);

  // Modals & UI State
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pinnedCoordinates, setPinnedCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [aiPromptInput, setAiPromptInput] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<"start" | "end" | null>(null);
  const [tempPickerHour, setTempPickerHour] = useState("08");
  const [tempPickerMinute, setTempPickerMinute] = useState("00");
  const [tempPickerPeriod, setTempPickerPeriod] = useState<"AM" | "PM">("AM");
  const [tempPickerNextDay, setTempPickerNextDay] = useState(false);

  const handleLocationSelectedFromMap = (data: {
    address: string;
    locality: string;
    city: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    formattedAddress: string;
  }) => {
    if (data.address) setHouseAddress(data.address);
    if (data.locality) setLocality(data.locality);
    if (data.city) setCity(data.city);
    if (data.postalCode) setPostalCode(data.postalCode);
    setPinnedCoordinates({
      latitude: data.latitude,
      longitude: data.longitude,
    });
  };

  // Mobility options
  const mobilityOptions = [
    {
      id: "Bedridden",
      label: "Bedridden",
      sub: "Full transfer assistance required",
      icon: Bed,
    },
    {
      id: "Semi-ambulatory",
      label: "Semi-ambulatory",
      sub: "Needs walking aid support",
      icon: Accessibility,
    },
    {
      id: "Ambulatory",
      label: "Ambulatory",
      sub: "Independent with supervision",
      icon: Activity,
    },
    {
      id: "Custom Protocol",
      label: "Custom Protocol",
      sub: "Specialized rehab needs",
      icon: FileText,
    },
  ];

  // Care Categories
  const careCategories = [
    {
      id: "Post-Surgical ICU",
      label: "Post-Surgical ICU",
      sub: "CABG, Ortho, Laparotomy recovery",
      icon: Activity,
    },
    {
      id: "Elderly & Geriatric",
      label: "Elderly & Geriatric",
      sub: "Dementia, mobility, bedridden care",
      icon: User,
    },
    {
      id: "Respiratory & Trach",
      label: "Respiratory & Trach",
      sub: "Tracheostomy, BIPAP, CPAP support",
      icon: Stethoscope,
    },
    {
      id: "Wound & Diabetic",
      label: "Wound & Diabetic",
      sub: "VAC therapy, ulcer dressing",
      icon: FileText,
    },
    {
      id: "Mother & Newborn",
      label: "Mother & Newborn",
      sub: "Postpartum, neonatal care",
      icon: Baby,
    },
    {
      id: "Palliative & Onco",
      label: "Palliative & Onco",
      sub: "Pain management, IV infusions",
      icon: Pill,
    },
  ];

  // Shift Models
  const shiftModels = [
    {
      id: "Hourly Visit (4h)",
      label: "Hourly Visit (4h)",
      shortLabel: "Hourly",
      desc: "Flexible 4-hour visit",
      hours: "4h",
    },
    {
      id: "Day Shift (12h)",
      label: "Day Shift (12h)",
      shortLabel: "Day",
      desc: "08:00 AM - 08:00 PM",
      hours: "12h",
    },
    {
      id: "Night Shift (12h)",
      label: "Night Shift (12h)",
      shortLabel: "Night",
      desc: "08:00 PM - 08:00 AM",
      hours: "12h",
    },
    {
      id: "Live-in (24h)",
      label: "Live-in (24h)",
      shortLabel: "Live-in",
      desc: "24 Hours Continuous Care",
      hours: "24h",
    },
    {
      id: "Custom Hours",
      label: "Custom Hours",
      shortLabel: "Custom",
      desc: "Set your own daily schedule",
      hours: `${customHoursPerDay}h`,
    },
  ];

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const weekdaysList = [
    { id: "Su", label: "Su", dayIndex: 0 },
    { id: "Mo", label: "Mo", dayIndex: 1 },
    { id: "Tu", label: "Tu", dayIndex: 2 },
    { id: "We", label: "We", dayIndex: 3 },
    { id: "Th", label: "Th", dayIndex: 4 },
    { id: "Fr", label: "Fr", dayIndex: 5 },
    { id: "Sa", label: "Sa", dayIndex: 6 },
  ];

  // Suggested Clinical Tasks from screenshot 1
  const suggestedTasks = [
    "Vitals monitoring (BP, SpO2, Temp, Pulse)",
    "Sterile surgical / wound dressing change",
    "Medication administration & compliance",
    "Incentive spirometry supervision (10 breaths/hr)",
    "Bedsore prevention (Q2H log-roll)",
    "Urinary Foley catheter care & bag emptying",
    "Tracheostomy closed suctioning & cannula hygiene",
    "Blood glucose & insulin documentation",
    "IV cannula maintenance & push/infusions",
    "Nebulization & chest physiotherapy",
  ];

  // Equipment List
  const equipmentOptions = [
    "Oxygen Concentrator (5L/min)",
    "Suction Machine & sterile catheters",
    "BIPAP / CPAP Machine",
    "Calibrated Digital BP & Pulse Oximeter",
    "Digital Glucometer & Strips",
    "Semi-Fowler Hospital Bed with air mattress",
    "Nebulizer Machine",
    "IV Stand & Infusion supplies",
  ];

  // Rate Presets from screenshot 2
  const marketPresets = [
    {
      role: "General Ward / GNM",
      min: "450",
      max: "650",
      shiftRange: "≈ ₹5,400 - ₹7,800 / 12h shift",
      badge: "",
    },
    {
      role: "ICU & Cardiac RN",
      min: "650",
      max: "850",
      shiftRange: "≈ ₹7,800 - ₹10,200 / 12h shift",
      badge: "Recommended",
    },
    {
      role: "Critical & Ventilator",
      min: "850",
      max: "1100",
      shiftRange: "≈ ₹10,200 - ₹13,200 / 12h shift",
      badge: "",
    },
  ];

  // Helpers
  const addActiveTask = (task: string) => {
    if (task && !activeTasks.includes(task)) {
      setActiveTasks([...activeTasks, task]);
    }
  };

  const removeActiveTask = (task: string) => {
    setActiveTasks(activeTasks.filter((t) => t !== task));
  };

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]
    );
  };

  const addCertification = () => {
    if (newSkillInput.trim() && !certifications.includes(newSkillInput.trim())) {
      setCertifications([...certifications, newSkillInput.trim()]);
      setNewSkillInput("");
    }
  };

  const removeCertification = (cert: string) => {
    setCertifications(certifications.filter((c) => c !== cert));
  };

  const handleApplyExtractedFromAi = (data: ParsedJobData) => {
    if (data.jobTitle) setJobTitle(data.jobTitle);

    if (data.patientName && data.patientName !== "Self") {
      setPatientName(data.patientName);
    } else if (data.patientRelationship === "Parent") {
      setPatientName(data.patientGender === "Female" ? "Mother" : "Father");
    } else if (data.patientRelationship === "Spouse") {
      setPatientName(data.patientGender === "Female" ? "Wife" : "Husband");
    }

    if (data.patientAge) setPatientAge(String(data.patientAge));
    if (data.patientGender) setPatientGender(data.patientGender);
    if (data.patientRelationship) setPatientRelationship(data.patientRelationship);
    if (data.mobilityLevel) setMobilityLevel(data.mobilityLevel);
    if (data.mobilityDirectives) setMobilityDirectives(data.mobilityDirectives);
    if (data.careCategory) setCareCategory(data.careCategory);
    if (data.drugAllergies) setDrugAllergies(data.drugAllergies);

    if (data.shiftModel) setShiftModel(data.shiftModel);
    if (data.customHoursPerDay) setCustomHoursPerDay(data.customHoursPerDay);
    if (data.shiftStartTime) setShiftStartTime(data.shiftStartTime);
    if (data.shiftEndTime) setShiftEndTime(data.shiftEndTime);
    if (data.roomProvided !== undefined) setRoomProvided(data.roomProvided);
    if (data.mealsProvided !== undefined) setMealsProvided(data.mealsProvided);
    if (data.selectedDaysCount && data.selectedDaysCount > 0) {
      const today = new Date();
      let startDayNum = today.getDate();
      if (data.startDate && data.startDate.toLowerCase().includes("tomorrow")) {
        startDayNum = today.getDate() + 1;
      }
      const count = Math.min(data.selectedDaysCount, 14);
      const days: number[] = [];
      for (let i = 0; i < count; i++) {
        days.push(startDayNum + i);
      }
      setSelectedDays(days);
    }

    if (data.activeTasks && data.activeTasks.length > 0) {
      setActiveTasks(data.activeTasks);
    }
    if (data.certifications && data.certifications.length > 0) {
      setCertifications(data.certifications);
    }
    if (data.selectedEquipment && data.selectedEquipment.length > 0) {
      setSelectedEquipment(data.selectedEquipment);
    }
    if (data.physicianOrders) setPhysicianOrders(data.physicianOrders);

    if (data.rateType) setRateType(data.rateType);
    if (data.minRate) setMinRate(String(data.minRate));
    if (data.maxRate) setMaxRate(String(data.maxRate));
    if (data.city) setCity(data.city);
    if (data.locality) setLocality(data.locality);
    if (data.houseAddress) setHouseAddress(data.houseAddress);
    if (data.postalCode) setPostalCode(data.postalCode);

    setShowAiAssistant(false);
    Alert.alert(
      "AI Care Plan Calibrated",
      "Groq Llama 3.3 has calibrated your clinical care request. All 4 steps of your job post have been pre-filled with PNC standards."
    );
  };

  // Shift & Duration Calculations (hoisted above handlePublish)
  const parseTimeString = (timeStr: string) => {
    const isNextDay = timeStr.includes("(Next Day)");
    const clean = timeStr.replace(" (Next Day)", "").trim();
    const parts = clean.split(" ");
    const period: "AM" | "PM" =
      (parts[1] || "AM").toUpperCase() === "PM" ? "PM" : "AM";
    const [hStr, mStr] = (parts[0] || "08:00").split(":");
    let h = parseInt(hStr, 10);
    if (isNaN(h) || h < 1 || h > 12) h = 8;
    let m = parseInt(mStr, 10);
    if (isNaN(m) || m < 0 || m > 59) m = 0;

    const roundedM = Math.round(m / 5) * 5;
    const mFinal = roundedM >= 60 ? 55 : roundedM;

    return {
      hour: String(h).padStart(2, "0"),
      minute: String(mFinal).padStart(2, "0"),
      period,
      isNextDay,
    };
  };

  const calculateShiftHours = (startStr: string, endStr: string): number => {
    try {
      const s = parseTimeString(startStr);
      const e = parseTimeString(endStr);
      let sH = parseInt(s.hour, 10);
      if (s.period === "PM" && sH < 12) sH += 12;
      if (s.period === "AM" && sH === 12) sH = 0;
      const sTotalMin = sH * 60 + parseInt(s.minute, 10);

      let eH = parseInt(e.hour, 10);
      if (e.period === "PM" && eH < 12) eH += 12;
      if (e.period === "AM" && eH === 12) eH = 0;
      let eTotalMin = eH * 60 + parseInt(e.minute, 10);

      if (e.isNextDay || eTotalMin <= sTotalMin) {
        eTotalMin += 24 * 60;
      }

      const diff = (eTotalMin - sTotalMin) / 60;
      return diff > 0 && diff <= 24 ? Math.round(diff * 10) / 10 : 12;
    } catch {
      return 12;
    }
  };

  const numDays = selectedDays.length;
  const hoursPerDay = calculateShiftHours(shiftStartTime, shiftEndTime);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = async () => {
    if (isSubmitting) return;

    Keyboard.dismiss();

    if (!jobTitle.trim()) {
      Alert.alert("Required Field", "Please enter a care request title.");
      return;
    }
    if (!city.trim()) {
      Alert.alert("Required Field", "Please enter the city for care delivery.");
      return;
    }

    try {
      setIsSubmitting(true);

      const startDateStr = selectedDays.length > 0
        ? `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(Math.min(...selectedDays)).padStart(2, "0")}`
        : new Date().toISOString().split("T")[0];

      const directivesBody = physicianOrders && physicianOrders.trim()
        ? physicianOrders.trim()
        : "Standard physician post-operative care protocol, continuous vitals charting, medication compliance, and emergency airway maintenance.";

      const metadataObj = {
        patientAge: patientAge || "",
        patientGender: patientGender || "Male",
        patientRelationship: patientRelationship || "Self",
        physicianOrders: directivesBody,
        mobilityLevel: mobilityLevel || "Ambulatory",
        mobilityDirectives: mobilityDirectives || "",
        shiftStartTime: shiftStartTime || "08:00 AM",
        shiftEndTime: shiftEndTime || "08:00 PM",
        shiftModel: shiftModel || "Day Shift (12h)",
        roomProvided: !!roomProvided,
        mealsProvided: !!mealsProvided,
        postalCode: postalCode || "",
        drugAllergies: drugAllergies || "",
        equipmentRequired: selectedEquipment || [],
      };

      const fullDescription = [
        `Clinical Care Category: ${careCategory}`,
        `Patient Profile: ${patientRelationship || "Self"} • ${patientAge ? `${patientAge} yrs` : ""} • ${patientGender || "Male"}`,
        `Mobility: ${mobilityLevel}${mobilityDirectives ? `. Directives: ${mobilityDirectives}` : ""}`,
        `Shift Timing: ${shiftStartTime} - ${shiftEndTime} (${shiftModel})`,
        `Care Logistics: ${roomProvided ? "Private rest room provided" : "No separate room"} • ${mealsProvided ? "Home meals provided" : "Meals self-arranged"}`,
        `Physician Directives:\n${directivesBody}`,
        drugAllergies ? `Drug Allergies: ${drugAllergies}` : "",
        postalCode ? `Postal Code: ${postalCode}` : "",
        `\n---JOB_METADATA---\n${JSON.stringify(metadataObj)}`
      ].filter(Boolean).join("\n\n");

      await api.postJob({
        title: sanitize(jobTitle),
        description: fullDescription,
        careType: careCategory,
        patientName: sanitize(patientName) || "Patient",
        urgency: "normal",
        budgetMin: Math.max(300, Math.abs(parseInt(minRate) || 650)),
        budgetMax: Math.max(Math.max(300, Math.abs(parseInt(minRate) || 650)), Math.abs(parseInt(maxRate) || 850)),
        city: sanitize(city) || profile?.city || "Punjab",
        locality: sanitize(locality) || "",
        address: sanitize(houseAddress) || sanitize(locality) || "Care Location",
        shiftModel: shiftModel,
        startDate: startDateStr,
        durationDays: numDays || 7,
        dailyHours: hoursPerDay || 12,
        checklist: activeTasks,
        requiredCertifications: certifications,
        proceduresRequired: activeTasks,
        equipmentRequired: selectedEquipment,
        mobilityLevel: mobilityLevel,
      });

      Alert.alert(
        "Care Request Published Successfully!",
        `"${jobTitle}" has been broadcast to verified clinicians in ${locality || city}. You will receive proposals directly in Requests.`,
        [
          {
            text: "View My Requests",
            onPress: () => {
              setCurrentStep(1);
              navigation?.navigate?.("My Requests");
            },
          },
        ]
      );

      // Transition immediately on web or fallback so user sees their new posting in My Requests
      setCurrentStep(1);
      navigation?.navigate?.("My Requests");
    } catch (err: any) {
      console.error("Failed to post care request:", err);
      Alert.alert(
        "Publish Failed",
        err.message || "Failed to publish care request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar Helpers & Handlers
  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectShiftModel = (modelId: string) => {
    setShiftModel(modelId);
    if (modelId === "Hourly Visit (4h)") {
      setShiftStartTime("09:00 AM");
      setShiftEndTime("01:00 PM");
    } else if (modelId === "Day Shift (12h)") {
      setShiftStartTime("08:00 AM");
      setShiftEndTime("08:00 PM");
    } else if (modelId === "Night Shift (12h)") {
      setShiftStartTime("08:00 PM");
      setShiftEndTime("08:00 AM");
    } else if (modelId === "Live-in (24h)") {
      setShiftStartTime("08:00 AM");
      setShiftEndTime("08:00 AM (Next Day)");
    } else if (modelId === "Custom Hours") {
      setShiftStartTime("09:00 AM");
      setShiftEndTime("05:00 PM");
    }
  };

  // Alarm Clock Wheel Time Picker Helpers
  const pickerHours = [
    "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12",
  ];
  const pickerMinutes = [
    "00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55",
  ];
  const pickerPeriods: ("AM" | "PM")[] = ["AM", "PM"];

  const quickPickerPresets = [
    { label: "07:00 AM", hour: "07", minute: "00", period: "AM" as const },
    { label: "08:00 AM", hour: "08", minute: "00", period: "AM" as const },
    { label: "09:00 AM", hour: "09", minute: "00", period: "AM" as const },
    { label: "01:00 PM", hour: "01", minute: "00", period: "PM" as const },
    { label: "05:00 PM", hour: "05", minute: "00", period: "PM" as const },
    { label: "07:00 PM", hour: "07", minute: "00", period: "PM" as const },
    { label: "08:00 PM", hour: "08", minute: "00", period: "PM" as const },
    { label: "09:00 PM", hour: "09", minute: "00", period: "PM" as const },
  ];

  const openStartTimePicker = () => {
    const parsed = parseTimeString(shiftStartTime);
    setTempPickerHour(parsed.hour);
    setTempPickerMinute(parsed.minute);
    setTempPickerPeriod(parsed.period);
    setTempPickerNextDay(parsed.isNextDay);
    setTimePickerTarget("start");
  };

  const openEndTimePicker = () => {
    const parsed = parseTimeString(shiftEndTime);
    setTempPickerHour(parsed.hour);
    setTempPickerMinute(parsed.minute);
    setTempPickerPeriod(parsed.period);
    setTempPickerNextDay(parsed.isNextDay);
    setTimePickerTarget("end");
  };

  const applyPickerTime = () => {
    const nextDaySuffix = tempPickerNextDay ? " (Next Day)" : "";
    const formatted = `${tempPickerHour}:${tempPickerMinute} ${tempPickerPeriod}${nextDaySuffix}`;
    if (timePickerTarget === "start") {
      setShiftStartTime(formatted);
    } else if (timePickerTarget === "end") {
      setShiftEndTime(formatted);
    }
    setTimePickerTarget(null);
  };

  const stepHour = (delta: number) => {
    let current = parseInt(tempPickerHour, 10);
    let next = current + delta;
    if (next < 1) next = 12;
    if (next > 12) next = 1;
    setTempPickerHour(String(next).padStart(2, "0"));
  };

  const stepMinute = (delta: number) => {
    const idx = pickerMinutes.indexOf(tempPickerMinute);
    let nextIdx = (idx === -1 ? 0 : idx) + delta;
    if (nextIdx < 0) nextIdx = pickerMinutes.length - 1;
    if (nextIdx >= pickerMinutes.length) nextIdx = 0;
    setTempPickerMinute(pickerMinutes[nextIdx]);
  };

  const togglePeriod = () => {
    setTempPickerPeriod((p) => (p === "AM" ? "PM" : "AM"));
  };

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(calendarYear, calendarMonth, 1).getDay();

  // Easy tap on date: toggle date ON/OFF
  const toggleDaySelection = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  // Quick helper presets
  const selectNextConsecutiveDays = (count: number) => {
    const baseDay = selectedDays.length > 0 ? Math.min(...selectedDays) : 1;
    const days: number[] = [];
    for (let i = 0; i < count; i++) {
      const d = baseDay + i;
      if (d <= daysInMonth) days.push(d);
    }
    setSelectedDays(days);
  };

  const clearSelectedDays = () => {
    setSelectedDays([]);
  };

  // Calculations for Upwork-style estimate
  const firstSelectedDay = selectedDays.length > 0 ? Math.min(...selectedDays) : 1;
  const lastSelectedDay = selectedDays.length > 0 ? Math.max(...selectedDays) : firstSelectedDay;
  const totalHours = numDays * hoursPerDay;
  const minCost = totalHours * (parseInt(minRate) || 650);
  const maxCost = totalHours * (parseInt(maxRate) || 850);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neuBg} />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => {
            if (currentStep > 1) {
              setCurrentStep(currentStep - 1);
            } else {
              navigation?.goBack?.();
            }
          }}
          activeOpacity={0.75}
        >
          <ChevronLeft size={22} color={colors.gray800} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.topTitleWrap}>
          <Text style={styles.topBarTitle}>Post Care Request</Text>
          <Text style={styles.topBarSub}>Step {currentStep} of 4</Text>
        </View>

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => setShowAiAssistant(true)}
          activeOpacity={0.75}
        >
          <Sparkles size={18} color={colors.primary} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* 4-Step Connected Stepper Header */}
      <View style={styles.stepperContainer}>
        {/* Track Row with Connector Lines */}
        <View style={styles.stepperTrackRow}>
          {[
            { step: 1, label: "Patient" },
            { step: 2, label: "Schedule" },
            { step: 3, label: "Tasks" },
            { step: 4, label: "Budget" },
          ].map((item, index, arr) => {
            const isActive = currentStep === item.step;
            const isDone = currentStep > item.step;
            const isLast = index === arr.length - 1;

            return (
              <React.Fragment key={item.step}>
                <TouchableOpacity
                  style={styles.stepItem}
                  onPress={() => setCurrentStep(item.step)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      isActive && styles.stepCircleActive,
                      isDone && styles.stepCircleDone,
                    ]}
                  >
                    {isDone ? (
                      <Check size={13} color={colors.white} strokeWidth={3} />
                    ) : (
                      <Text
                        style={[
                          styles.stepCircleNum,
                          isActive && styles.stepCircleNumActive,
                        ]}
                      >
                        {item.step}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isActive && styles.stepLabelActive,
                      isDone && styles.stepLabelDone,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>

                {!isLast && (
                  <View
                    style={[
                      styles.stepConnectorLine,
                      currentStep > item.step && styles.stepConnectorLineDone,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* =========================================================================
            STEP 1: Patient & Clinical
           ========================================================================= */}
        {currentStep === 1 && (
          <View>
            {/* Quick-Launch Groq AI Banner */}
            <TouchableOpacity
              style={styles.aiBannerCard}
              onPress={() => setShowAiAssistant(true)}
              activeOpacity={0.88}
            >
              <View style={styles.aiBannerLeft}>
                <View style={styles.aiBannerIconWrap}>
                  <Sparkles size={20} color={colors.primary} strokeWidth={2.4} />
                </View>
                <View style={styles.aiBannerTextWrap}>
                  <View style={styles.aiBannerTitleRow}>
                    <Text style={styles.aiBannerTitle}>Clinical AI Care Drafter</Text>
                    <View style={styles.aiBannerBadge}>
                      <Text style={styles.aiBannerBadgeText}>Groq Llama 3.3</Text>
                    </View>
                  </View>
                  <Text style={styles.aiBannerSub}>
                    Speak or describe care needs to auto-populate all 4 wizard steps.
                  </Text>
                </View>
              </View>
              <View style={styles.aiBannerArrowWrap}>
                <ChevronRight size={18} color={colors.primary} strokeWidth={2.4} />
              </View>
            </TouchableOpacity>

            {/* Card 1: Care Request Title */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconChipBlue}>
                  <Briefcase size={16} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.cardHeaderTitle}>Care Request Title</Text>
              </View>

              <Text style={styles.fieldLabel}>Posting Headline *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={jobTitle}
                  onChangeText={setJobTitle}
                  placeholder="e.g. Experienced ICU Nurse for Post-CABG Cardiac Recovery at Home"
                  placeholderTextColor={colors.gray400}
                />
              </View>
            </View>

            {/* Card 2: Patient Details */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconChipBlue}>
                  <User size={16} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.cardHeaderTitle}>Patient Details</Text>
              </View>

              <Text style={styles.fieldLabel}>Patient Full Name *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={patientName}
                  onChangeText={setPatientName}
                  placeholder="Type patient's legal full name"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              {/* 2-column row: Age & Gender */}
              <View style={styles.twoColRow}>
                <View style={styles.colHalf}>
                  <Text style={styles.fieldLabel}>Patient Age</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={patientAge}
                      onChangeText={setPatientAge}
                      keyboardType="numeric"
                      placeholder="e.g. 68"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={patientGender}
                      onChangeText={setPatientGender}
                      placeholder="Male"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                </View>
              </View>

              {/* Mobility & Physical Activity Level */}
              <Text style={styles.fieldLabelSpacing}>Mobility Level</Text>
              <View style={styles.mobilityGrid}>
                {mobilityOptions.map((opt) => {
                  const isSelected = mobilityLevel === opt.id;
                  const IconComp = opt.icon;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.selectOptionCard,
                        isSelected && styles.selectOptionCardActive,
                      ]}
                      onPress={() => setMobilityLevel(opt.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.optCardTop}>
                        <View
                          style={[
                            styles.optIconBox,
                            isSelected && styles.optIconBoxActive,
                          ]}
                        >
                          <IconComp
                            size={16}
                            color={isSelected ? colors.primary : colors.gray700}
                          />
                        </View>
                        {isSelected ? (
                          <CheckCircle2 size={16} color={colors.primary} />
                        ) : (
                          <Circle size={16} color={colors.gray300} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.optTitle,
                          isSelected && styles.optTitleActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={styles.optSub}>{opt.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Specific Mobility Directives */}
              <Text style={styles.fieldLabelSpacing}>Mobility Directives & Notes</Text>
              <View style={styles.inputContainerArea}>
                <TextInput
                  style={styles.textAreaInput}
                  value={mobilityDirectives}
                  onChangeText={setMobilityDirectives}
                  placeholder="e.g. Requires 2-person pivot transfer from bed to cardiac recliner..."
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Card 3: Care Category & Clinical Scope */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconChipBlue}>
                  <HeartPulse size={16} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.cardHeaderTitle}>Care Category & Clinical Scope</Text>
              </View>

              <View style={styles.mobilityGrid}>
                {careCategories.map((cat) => {
                  const isSelected = careCategory === cat.id;
                  const IconComp = cat.icon;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.selectOptionCard,
                        isSelected && styles.selectOptionCardActive,
                      ]}
                      onPress={() => setCareCategory(cat.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.optCardTop}>
                        <View
                          style={[
                            styles.optIconBox,
                            isSelected && styles.optIconBoxActive,
                          ]}
                        >
                          <IconComp
                            size={16}
                            color={isSelected ? colors.primary : colors.gray700}
                          />
                        </View>
                        {isSelected ? (
                          <CheckCircle2 size={16} color={colors.primary} />
                        ) : (
                          <Circle size={16} color={colors.gray300} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.optTitle,
                          isSelected && styles.optTitleActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                      <Text style={styles.optSub}>{cat.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Known Drug Allergies */}
              {/* Known Drug Allergies */}
              <Text style={styles.fieldLabelSpacing}>Known Drug Allergies & Clinical Sensitivities</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={drugAllergies}
                  onChangeText={setDrugAllergies}
                  placeholder="e.g. Penicillin, Sulfa drugs (or type 'No known drug allergies')"
                  placeholderTextColor={colors.gray400}
                />
              </View>
            </View>


          </View>
        )}

        {/* =========================================================================
            STEP 2: Schedule & Shifts (from Screenshot 3)
           ========================================================================= */}
        {currentStep === 2 && (
          <View>
            {/* Card 1: Shift Timings & Schedule */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRowBetween}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={styles.iconChipBlue}>
                    <Clock size={16} color={colors.primary} strokeWidth={2.2} />
                  </View>
                  <View>
                    <Text style={styles.cardHeaderTitle}>Shift Timings & Schedule</Text>
                    <Text style={styles.cardHeaderSubtitle}>
                      Set login (start) & logout (end) times for attending nurse
                    </Text>
                  </View>
                </View>
                <View style={styles.customHourTag}>
                  <Text style={styles.customHourTagText}>{hoursPerDay} hrs / shift</Text>
                </View>
              </View>

              {/* Time Trigger Buttons */}
              <View style={[styles.customTimeRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customFieldLabel}>Shift Login (Start)</Text>
                  <TouchableOpacity
                    style={styles.alarmTimeBtn}
                    onPress={openStartTimePicker}
                    activeOpacity={0.8}
                  >
                    <View style={styles.alarmTimeIconBox}>
                      <Clock size={14} color={colors.primary} />
                    </View>
                    <Text style={styles.alarmTimeBtnText}>{shiftStartTime}</Text>
                    <ChevronDown size={14} color={colors.gray400} />
                  </TouchableOpacity>
                </View>

                <View style={{ width: 10 }} />

                <View style={{ flex: 1 }}>
                  <Text style={styles.customFieldLabel}>Shift Logout (End)</Text>
                  <TouchableOpacity
                    style={styles.alarmTimeBtn}
                    onPress={openEndTimePicker}
                    activeOpacity={0.8}
                  >
                    <View style={styles.alarmTimeIconBox}>
                      <Clock size={14} color={colors.primary} />
                    </View>
                    <Text style={styles.alarmTimeBtnText}>{shiftEndTime}</Text>
                    <ChevronDown size={14} color={colors.gray400} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Shift Timing Presets (clean time ranges without day/night labels) */}
              <Text style={[styles.customFieldLabel, { marginTop: 12, marginBottom: 8 }]}>
                Common Shift Schedules (Tap to Select)
              </Text>
              <View style={styles.presetTimingWrap}>
                {[
                  { label: "08:00 AM – 08:00 PM", start: "08:00 AM", end: "08:00 PM", hrs: "12h" },
                  { label: "08:00 PM – 08:00 AM", start: "08:00 PM", end: "08:00 AM", hrs: "12h" },
                  { label: "09:00 AM – 05:00 PM", start: "09:00 AM", end: "05:00 PM", hrs: "8h" },
                  { label: "09:00 AM – 01:00 PM", start: "09:00 AM", end: "01:00 PM", hrs: "4h" },
                  { label: "08:00 AM – 08:00 AM", start: "08:00 AM", end: "08:00 AM (Next Day)", hrs: "24h" },
                ].map((preset, idx) => {
                  const isActive =
                    shiftStartTime === preset.start && shiftEndTime === preset.end;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.timingPresetChip,
                        isActive && styles.timingPresetChipActive,
                      ]}
                      onPress={() => {
                        setShiftStartTime(preset.start);
                        setShiftEndTime(preset.end);
                      }}
                      activeOpacity={0.75}
                    >
                      <Clock
                        size={12}
                        color={isActive ? colors.primary : colors.gray500}
                        strokeWidth={2.2}
                      />
                      <Text
                        style={[
                          styles.timingPresetText,
                          isActive && styles.timingPresetTextActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                      <View
                        style={[
                          styles.timingPresetHrsBadge,
                          isActive && styles.timingPresetHrsBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timingPresetHrsBadgeText,
                            isActive && styles.timingPresetHrsBadgeTextActive,
                          ]}
                        >
                          {preset.hrs}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Active Summary Strip */}
              <View style={[styles.customSummaryStrip, { marginTop: 10 }]}>
                <CheckCircle2 size={14} color={colors.primary} />
                <Text style={styles.customSummaryStripText}>
                  Active Shift: {shiftStartTime} to {shiftEndTime} ({hoursPerDay} hrs/shift • {totalHours} total care hrs)
                </Text>
              </View>
            </View>

            {/* Card 2: Start Date & Care Duration */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconChipBlue}>
                  <Calendar size={16} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.cardHeaderTitle}>Start Date & Care Duration</Text>
              </View>

              {/* Direct Interactive Calendar Display */}
              <View style={styles.calendarCard}>
                {/* Month Navigation Header */}
                <View style={styles.calendarHeaderRow}>
                  <View style={styles.calMonthNav}>
                    <TouchableOpacity
                      onPress={handlePrevMonth}
                      style={styles.calNavBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <ChevronLeft size={16} color={colors.gray700} strokeWidth={2.4} />
                    </TouchableOpacity>
                    <Text style={styles.calendarMonthText}>
                      {monthNames[calendarMonth]} {calendarYear}
                    </Text>
                    <TouchableOpacity
                      onPress={handleNextMonth}
                      style={styles.calNavBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <ChevronRight size={16} color={colors.gray700} strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.calendarLegend}>
                    <View style={styles.legendDotBlue} />
                    <Text style={styles.legendText}>
                      {selectedDays.length} {selectedDays.length === 1 ? "Day" : "Days"} Selected
                    </Text>
                  </View>
                </View>

                {/* Day Labels */}
                <View style={styles.calendarWeekRow}>
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
                    <View key={i} style={styles.calCellWrapper}>
                      <Text style={styles.calendarDayLabel}>{d}</Text>
                    </View>
                  ))}
                </View>

                {/* Calendar Dynamic Grid: Tap any date directly to toggle! */}
                <View style={styles.calendarGridRow}>
                  {/* Empty leading slots for firstDayWeekday */}
                  {Array.from({ length: firstDayWeekday }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.calCellWrapper}>
                      <View style={styles.calCellEmpty} />
                    </View>
                  ))}

                  {/* Day Cells */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                    const isSelected = selectedDays.includes(d);
                    const isStartDay = selectedDays.length > 0 && d === firstSelectedDay;

                    return (
                      <View key={d} style={styles.calCellWrapper}>
                        <TouchableOpacity
                          style={[
                            styles.calCell,
                            isSelected && styles.calCellActive,
                            isStartDay && styles.calCellStartDay,
                          ]}
                          onPress={() => toggleDaySelection(d)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.calCellText,
                              isSelected && styles.calCellTextActive,
                            ]}
                          >
                            {d}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                {/* Quick Selection Shortcuts Bar */}
                <View style={styles.calQuickActionsRow}>
                  <Text style={styles.calQuickActionsTitle}>Quick Pick:</Text>
                  <TouchableOpacity
                    style={styles.calQuickPill}
                    onPress={() => selectNextConsecutiveDays(7)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.calQuickPillText}>+7 Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.calQuickPill}
                    onPress={() => selectNextConsecutiveDays(14)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.calQuickPillText}>+14 Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.calQuickPill}
                    onPress={() => selectNextConsecutiveDays(30)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.calQuickPillText}>+30 Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.calQuickPill, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}
                    onPress={clearSelectedDays}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.calQuickPillText, { color: "#DC2626" }]}>Clear</Text>
                  </TouchableOpacity>
                </View>

                {/* Calendar Footer Dynamic Banner */}
                <View style={styles.calendarFooterBanner}>
                  <Text style={styles.calendarFooterText}>
                    • {selectedDays.length} Shifts Selected (Tap dates to toggle)
                  </Text>
                  <Text style={styles.calendarFooterSubText}>
                    {selectedDays.length > 0
                      ? `${monthNames[calendarMonth].slice(0, 3)} ${firstSelectedDay}${
                          lastSelectedDay !== firstSelectedDay ? ` - ${lastSelectedDay}` : ""
                        }, ${calendarYear}`
                      : "No dates selected"}
                  </Text>
                </View>
              </View>

              {/* Duration Summary Box */}
              <View style={styles.summaryPillBox}>
                <View style={styles.summaryPillItem}>
                  <Text style={styles.summaryPillLabel}>Total Shifts:</Text>
                  <Text style={styles.summaryPillVal}>
                    {selectedDays.length} Shifts
                  </Text>
                </View>
                <View style={styles.summaryPillItem}>
                  <Text style={styles.summaryPillLabel}>Total Hours:</Text>
                  <Text style={styles.summaryPillVal}>{totalHours}h</Text>
                </View>
                <View style={styles.summaryPillItem}>
                  <Text style={styles.summaryPillLabel}>Schedule:</Text>
                  <Text style={styles.summaryPillVal}>
                    {selectedDays.length > 0
                      ? `${monthNames[calendarMonth].slice(0, 3)} ${firstSelectedDay}${
                          lastSelectedDay !== firstSelectedDay ? ` - ${lastSelectedDay}` : ""
                        }`
                      : "Tap dates"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Card 3: Nurse Household Provisions */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconChipBlue}>
                  <Coffee size={16} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.cardHeaderTitle}>Nurse Household Provisions</Text>
              </View>

              <View style={styles.provisionsRow}>
                <TouchableOpacity
                  style={[
                    styles.provisionCard,
                    roomProvided && styles.provisionCardActive,
                  ]}
                  onPress={() => setRoomProvided(!roomProvided)}
                  activeOpacity={0.8}
                >
                  <View style={styles.provisionTop}>
                    {roomProvided ? (
                      <CheckCircle2 size={18} color={colors.primary} />
                    ) : (
                      <Circle size={18} color={colors.gray300} />
                    )}
                    <Text style={styles.provisionTitle}>Dedicated Rest Area / Room</Text>
                  </View>
                  <Text style={styles.provisionSub}>
                    Clean private space for 12h/24h breaks
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.provisionCard,
                    mealsProvided && styles.provisionCardActive,
                  ]}
                  onPress={() => setMealsProvided(!mealsProvided)}
                  activeOpacity={0.8}
                >
                  <View style={styles.provisionTop}>
                    {mealsProvided ? (
                      <CheckCircle2 size={18} color={colors.primary} />
                    ) : (
                      <Circle size={18} color={colors.gray300} />
                    )}
                    <Text style={styles.provisionTitle}>Home Meals Provided</Text>
                  </View>
                  <Text style={styles.provisionSub}>
                    Warm meals / tea provided during shift
                  </Text>
                </TouchableOpacity>
              </View>


            </View>
          </View>
        )}

        {/* =========================================================================
            STEP 3: Care Requirements & Procedures (from Screenshots 1 & 4)
           ========================================================================= */}
        {currentStep === 3 && (
          <View>
            {/* Card 1: Clinical Care Duties & Tasks */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRowBetween}>
                <View style={styles.headerLeftGroup}>
                  <View style={styles.iconChipBlue}>
                    <Stethoscope size={16} color={colors.primary} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.cardHeaderTitle}>
                    Clinical Duties & Care Tasks
                  </Text>
                </View>
                <View style={styles.badgePillBlue}>
                  <Text style={styles.badgePillBlueText}>
                    {activeTasks.length} {activeTasks.length === 1 ? "Duty" : "Duties"}
                  </Text>
                </View>
              </View>

              {/* Sleek Integrated Add Task Input Bar */}
              <View style={styles.neuTaskInputBar}>
                <TextInput
                  style={styles.neuTaskInput}
                  value={newTaskInput}
                  onChangeText={setNewTaskInput}
                  placeholder="Type a clinical task or tap suggestions below..."
                  placeholderTextColor={colors.gray400}
                  onSubmitEditing={() => {
                    if (newTaskInput.trim()) {
                      addActiveTask(newTaskInput.trim());
                      setNewTaskInput("");
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.neuTaskAddBtn}
                  onPress={() => {
                    if (newTaskInput.trim()) {
                      addActiveTask(newTaskInput.trim());
                      setNewTaskInput("");
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Plus size={13} color={colors.white} strokeWidth={2.8} />
                  <Text style={styles.neuTaskAddBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {/* Active Tasks Soft Neumorphic List */}
              {activeTasks.length > 0 ? (
                <View style={styles.neuTaskList}>
                  {activeTasks.map((task, idx) => (
                    <View key={idx} style={styles.neuTaskCard}>
                      <View style={styles.neuTaskCheckDot}>
                        <Check size={12} color={colors.primary} strokeWidth={3} />
                      </View>
                      <Text style={styles.neuTaskText}>{task}</Text>
                      <TouchableOpacity
                        onPress={() => removeActiveTask(task)}
                        style={styles.neuTaskDeleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={14} color={colors.gray400} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyDashedBox}>
                  <Text style={styles.emptyDashedText}>
                    No clinical tasks added yet. Type a duty above or tap quick suggestions.
                  </Text>
                </View>
              )}

              {/* Quick Add Suggestions (Only showing unadded items) */}
              {suggestedTasks.filter((s) => !activeTasks.includes(s)).length > 0 && (
                <View style={styles.suggestedSection}>
                  <Text style={styles.suggestedHeading}>Quick Suggestions:</Text>
                  <View style={styles.suggestedChipsWrap}>
                    {suggestedTasks
                      .filter((s) => !activeTasks.includes(s))
                      .slice(0, 6)
                      .map((sug, i) => (
                        <TouchableOpacity
                          key={i}
                          style={styles.suggestedNeuChip}
                          onPress={() => addActiveTask(sug)}
                          activeOpacity={0.7}
                        >
                          <Plus size={11} color={colors.primary} strokeWidth={2.4} />
                          <Text style={styles.suggestedNeuChipText}>{sug}</Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </View>
              )}
            </View>

            {/* Card 2: Mandatory Nurse Certifications & Skills */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconChipBlue}>
                  <ShieldCheck size={16} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.cardHeaderTitle}>Mandatory Nurse Certifications & Skills</Text>
              </View>

              <View style={styles.certTagsRow}>
                {certifications.map((cert) => (
                  <View key={cert} style={styles.certTagPill}>
                    <ShieldCheck size={13} color={colors.primary} />
                    <Text style={styles.certTagPillText}>{cert}</Text>
                    <TouchableOpacity onPress={() => removeCertification(cert)}>
                      <X size={12} color={colors.gray500} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.neuTaskInputBar}>
                <TextInput
                  style={styles.neuTaskInput}
                  value={newSkillInput}
                  onChangeText={setNewSkillInput}
                  placeholder="e.g. Sternal Care Certified, Tracheostomy..."
                  placeholderTextColor={colors.gray400}
                  onSubmitEditing={addCertification}
                />
                <TouchableOpacity
                  style={styles.neuTaskAddBtn}
                  onPress={addCertification}
                  activeOpacity={0.8}
                >
                  <Plus size={13} color={colors.white} strokeWidth={2.8} />
                  <Text style={styles.neuTaskAddBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Card 3: Physician Orders & Full Clinical Scope */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconChipBlue}>
                  <FileText size={16} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.cardHeaderTitle}>Physician Orders & Full Clinical Scope</Text>
              </View>

              <View style={styles.inputContainerAreaLarge}>
                <TextInput
                  style={styles.textAreaInputLarge}
                  value={physicianOrders}
                  onChangeText={setPhysicianOrders}
                  placeholder="Enter specific doctor directives, medication administration timings, wound dressing protocols..."
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={5}
                />
                <View style={styles.charCounterWrap}>
                  <Text style={styles.charCounterText}>
                    {physicianOrders.length} characters
                  </Text>
                </View>
              </View>
            </View>

            {/* Card 4: Home Medical Equipment Available */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconChipBlue}>
                  <Activity size={16} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.cardHeaderTitle}>Home Medical Equipment Available</Text>
              </View>

              <View style={styles.equipmentGrid}>
                {equipmentOptions.map((eq) => {
                  const isChecked = selectedEquipment.includes(eq);
                  return (
                    <TouchableOpacity
                      key={eq}
                      style={[
                        styles.equipmentChip,
                        isChecked && styles.equipmentChipChecked,
                      ]}
                      onPress={() => toggleEquipment(eq)}
                      activeOpacity={0.8}
                    >
                      {isChecked ? (
                        <CheckCircle2 size={15} color={colors.primary} />
                      ) : (
                        <Circle size={15} color={colors.gray300} />
                      )}
                      <Text
                        style={[
                          styles.equipmentChipText,
                          isChecked && styles.equipmentChipTextChecked,
                        ]}
                      >
                        {eq}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>


            </View>
          </View>
        )}

        {/* =========================================================================
            STEP 4: Budget & Location (from Screenshot 2)
           ========================================================================= */}
        {currentStep === 4 && (
          <View>
            {/* Card 1: Target Rate & Budget */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconChipBlue}>
                  <IndianRupee size={16} color={colors.primary} strokeWidth={2.4} />
                </View>
                <Text style={styles.cardHeaderTitle}>Target Rate Range</Text>
              </View>

              {/* Rate Mode Neumorphic Pill Toggle */}
              <View style={styles.neuRateTypeSwitch}>
                <TouchableOpacity
                  style={[
                    styles.neuRateTypeTab,
                    rateType === "hourly" && styles.neuRateTypeTabActive,
                  ]}
                  onPress={() => setRateType("hourly")}
                  activeOpacity={0.8}
                >
                  <Clock
                    size={14}
                    color={rateType === "hourly" ? colors.primary : colors.gray500}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.neuRateTypeTabText,
                      rateType === "hourly" && styles.neuRateTypeTabTextActive,
                    ]}
                  >
                    Hourly Rate
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.neuRateTypeTab,
                    rateType === "fixed" && styles.neuRateTypeTabActive,
                  ]}
                  onPress={() => setRateType("fixed")}
                  activeOpacity={0.8}
                >
                  <Briefcase
                    size={14}
                    color={rateType === "fixed" ? colors.primary : colors.gray500}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.neuRateTypeTabText,
                      rateType === "fixed" && styles.neuRateTypeTabTextActive,
                    ]}
                  >
                    Fixed Shift Rate
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Min & Max Inputs Row */}
              <View style={styles.twoColRow}>
                <View style={styles.colHalf}>
                  <Text style={styles.neuFieldLabel}>
                    Minimum (₹/{rateType === "hourly" ? "hr" : "shift"})
                  </Text>
                  <View style={styles.neuInputWrap}>
                    <Text style={styles.neuPrefixRupee}>₹</Text>
                    <TextInput
                      style={styles.neuRateInput}
                      value={minRate}
                      onChangeText={setMinRate}
                      keyboardType="numeric"
                      placeholder="650"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.neuFieldLabel}>
                    Maximum (₹/{rateType === "hourly" ? "hr" : "shift"})
                  </Text>
                  <View style={styles.neuInputWrap}>
                    <Text style={styles.neuPrefixRupee}>₹</Text>
                    <TextInput
                      style={styles.neuRateInput}
                      value={maxRate}
                      onChangeText={setMaxRate}
                      keyboardType="numeric"
                      placeholder="850"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                </View>
              </View>

              {/* Clean Local Rate Tip */}
              <View style={styles.neuMarketTip}>
                <TrendingUp size={13} color={colors.primary} />
                <Text style={styles.neuMarketTipText}>
                  Suggested RN rate in {city || "Jalandhar"}:{" "}
                  <Text style={styles.neuMarketTipBold}>₹650 – ₹850 / hr</Text>
                </Text>
              </View>

              {/* Quick Rate Presets */}
              <Text style={styles.fieldLabelSpacing}>Market Rate Presets</Text>
              <View style={styles.neuPresetRow}>
                {marketPresets.map((preset, idx) => {
                  const isSelected = selectedPresetIndex === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.neuPresetChip,
                        isSelected && styles.neuPresetChipActive,
                      ]}
                      onPress={() => {
                        setSelectedPresetIndex(idx);
                        setMinRate(preset.min);
                        setMaxRate(preset.max);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.neuPresetRole,
                          isSelected && styles.neuPresetRoleActive,
                        ]}
                        numberOfLines={1}
                      >
                        {preset.role.split("/")[0].trim()}
                      </Text>
                      <Text
                        style={[
                          styles.neuPresetRate,
                          isSelected && styles.neuPresetRateActive,
                        ]}
                      >
                        ₹{preset.min}-{preset.max}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Card 2: Patient Home Address */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRowBetween}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.iconChipBlue}>
                    <MapPin size={16} color={colors.primary} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.cardHeaderTitle}>Care Location</Text>
                </View>
                <TouchableOpacity
                  style={styles.pickOnMapBtn}
                  onPress={() => setShowMapPicker(true)}
                  activeOpacity={0.8}
                >
                  <Crosshair size={13} color={colors.primary} />
                  <Text style={styles.pickOnMapBtnText}>📍 Pick on Map</Text>
                </TouchableOpacity>
              </View>

              {pinnedCoordinates && (
                <View style={styles.pinnedGpsBadge}>
                  <View style={styles.pinnedGpsDot} />
                  <Text style={styles.pinnedGpsText}>
                    Doorstep Pinned: {pinnedCoordinates.latitude.toFixed(4)}° N, {pinnedCoordinates.longitude.toFixed(4)}° E
                  </Text>
                  <TouchableOpacity onPress={() => setShowMapPicker(true)}>
                    <Text style={styles.pinnedGpsEdit}>Adjust Pin</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.addressRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.fieldLabel}>House / Flat / Street *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={houseAddress}
                      onChangeText={setHouseAddress}
                      placeholder="e.g. House #412, Lane 3, Urban Estate"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.fieldLabel}>PIN Code *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={postalCode}
                      onChangeText={setPostalCode}
                      keyboardType="numeric"
                      placeholder="144003"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.fieldLabelSpacing}>Locality / Sector / Landmark *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={locality}
                  onChangeText={setLocality}
                  placeholder="e.g. Model Town Phase 2"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={styles.twoColRow}>
                <View style={styles.colHalf}>
                  <Text style={styles.fieldLabelSpacing}>City *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={city}
                      onChangeText={setCity}
                      placeholder="e.g. Ludhiana, Amritsar, Jalandhar"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.fieldLabelSpacing}>Contact Phone *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={contactPhone}
                      onChangeText={setContactPhone}
                      placeholder="+91 98145 23891"
                      placeholderTextColor={colors.gray400}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.neuPrivacyStrip}>
                <Lock size={12} color={colors.gray500} />
                <Text style={styles.neuPrivacyStripText}>
                  Exact address & contact details are private until booking is confirmed.
                </Text>
              </View>
            </View>

            {/* Card 3: Budget Summary */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRowBetween}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={styles.iconChipBlue}>
                    <IndianRupee size={15} color={colors.primary} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.cardHeaderTitle}>Budget Summary</Text>
                </View>
                <View style={styles.neuShiftPill}>
                  <Text style={styles.neuShiftPillText}>
                    {numDays} Shifts • {totalHours} hrs
                  </Text>
                </View>
              </View>

              <View style={styles.neuSummaryList}>
                <View style={styles.neuSummaryRow}>
                  <Text style={styles.neuSummaryLabel}>Target Rate Range</Text>
                  <Text style={styles.neuSummaryVal}>
                    ₹{minRate} – ₹{maxRate} / hr
                  </Text>
                </View>

                <View style={styles.neuSummaryRow}>
                  <Text style={styles.neuSummaryLabel}>
                    Per Shift Cost ({hoursPerDay}h)
                  </Text>
                  <Text style={styles.neuSummaryVal}>
                    ₹{(parseInt(minRate) || 0) * hoursPerDay} – ₹{(parseInt(maxRate) || 0) * hoursPerDay}
                  </Text>
                </View>

                <View style={styles.neuSummaryDivider} />

                <View style={styles.neuSummaryTotalRow}>
                  <View>
                    <Text style={styles.neuSummaryTotalLabel}>Estimated Total</Text>
                    <Text style={styles.neuSummaryTotalSub}>
                      {numDays} shifts • {totalHours} total care hours
                    </Text>
                  </View>
                  <Text style={styles.neuSummaryTotalAmount}>
                    ₹{minCost.toLocaleString("en-IN")} – ₹{maxCost.toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <Text style={styles.inlinePublishSecurityNote}>
                🔒 Protected Care Deposit standard • Punjab Nursing Council verified clinicians
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Floating Navigation Buttons */}
      <View style={styles.bottomBar}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setCurrentStep(currentStep - 1)}
            activeOpacity={0.8}
          >
            <ChevronLeft size={16} color={colors.gray700} strokeWidth={2.4} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.previewBtn}
          onPress={() => setShowPreviewModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.previewIconCircle}>
            <Eye size={14} color={colors.gray800} strokeWidth={2.4} />
          </View>
          <Text style={styles.previewBtnText}>Preview</Text>
        </TouchableOpacity>

        {currentStep < 4 ? (
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => setCurrentStep(currentStep + 1)}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
            <View style={styles.continueIconCircle}>
              <ChevronRight size={15} color={colors.primary} strokeWidth={2.8} />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.publishBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={handlePublish}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.publishBtnText}>Publish Request</Text>
                <View style={styles.continueIconCircle}>
                  <Send size={13} color={colors.primary} strokeWidth={2.6} />
                </View>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ================= MODAL 1: Clinical Intake Assistant (Groq AI) ================= */}
      <AiJobAssistantModal
        visible={showAiAssistant}
        onClose={() => setShowAiAssistant(false)}
        onApplyExtracted={handleApplyExtractedFromAi}
      />

      {/* ================= MODAL 1.5: Doorstep Map & GPS Pinpoint Picker ================= */}
      <MapLocationPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelectLocation={handleLocationSelectedFromMap}
        initialCoordinates={pinnedCoordinates || undefined}
        initialAddress={houseAddress}
        initialLocality={locality}
        initialCity={city}
        initialPostalCode={postalCode}
      />

      {/* ================= MODAL 2: Job Card Preview (Comprehensive Patient Portal Layout) ================= */}
      <Modal
        visible={showPreviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.previewModalCard}>
            {/* Modal Top Header */}
            <View style={styles.previewModalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <View style={styles.previewHeaderIconWrap}>
                  <Eye size={16} color={colors.primary} strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Live Nurse Marketplace Preview</Text>
                  <Text style={styles.previewModalSubTitle}>Review full care specifications before broadcasting</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowPreviewModal(false)}
                style={styles.previewModalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.gray700} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.previewModalScroll}
            >
              {/* Job Title & Location Line */}
              <View style={styles.previewHeroBox}>
                <Text style={styles.previewCardTitle}>{jobTitle}</Text>
                <View style={styles.previewMetaRow}>
                  <Text style={styles.previewMetaDot}>Posted just now</Text>
                  <Text style={styles.previewMetaDot}>•</Text>
                  <View style={styles.previewMetaPinRow}>
                    <MapPin size={12} color={colors.gray500} strokeWidth={2.2} />
                    <Text style={styles.previewMetaLocation}>
                      {locality}, {city}, Punjab
                    </Text>
                  </View>
                  <Text style={styles.previewMetaDot}>•</Text>
                  <Text style={styles.previewMetaMasked}>Exact address masked until hire</Text>
                </View>
              </View>

              {/* Patient Profile Identification Card */}
              <View style={styles.previewPatientCard}>
                <View style={styles.previewPatientAvatar}>
                  <User size={20} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.previewPatientNameRow}>
                    <Text style={styles.previewPatientName}>{patientName || "Patient"}</Text>
                    <View style={styles.previewPatientPill}>
                      <Text style={styles.previewPatientPillText}>
                        {patientRelationship || "Family"} • {patientAge}y • {patientGender}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.previewMobilityRow}>
                    <Text style={styles.previewMobilityLabel}>Mobility: </Text>
                    <Text style={styles.previewMobilityVal}>{mobilityLevel}</Text>
                  </View>
                  {mobilityDirectives ? (
                    <Text style={styles.previewMobilityDirectives}>({mobilityDirectives})</Text>
                  ) : null}
                </View>
              </View>

              {/* Summary & Care Directives */}
              <View style={styles.previewSectionBox}>
                <Text style={styles.previewSectionSmallHeader}>SUMMARY & CARE DIRECTIVES</Text>
                <Text style={styles.previewCategoryTitle}>
                  {careCategory} — Patient Care Directives
                </Text>
                <View style={styles.previewClinicalOrdersBox}>
                  <Text style={styles.previewClinicalOrdersText}>
                    {physicianOrders || "Standard physician post-operative care protocol, vitals charting, and medication compliance."}
                  </Text>
                </View>
              </View>

              {/* 4 Metric Badges Grid (Exact Portal 4-Card Strip) */}
              <View style={styles.previewMetricsGrid}>
                {/* Metric 1: Hours */}
                <View style={styles.previewMetricCard}>
                  <View style={styles.previewMetricIconCircle}>
                    <Clock size={15} color={colors.primary} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.previewMetricValue}>{hoursPerDay} hrs / day</Text>
                  <Text style={styles.previewMetricSub}>{shiftModel}</Text>
                  <Text style={styles.previewMetricTime}>{shiftStartTime} – {shiftEndTime}</Text>
                </View>

                {/* Metric 2: Duration */}
                <View style={styles.previewMetricCard}>
                  <View style={styles.previewMetricIconCircle}>
                    <Calendar size={15} color={colors.primary} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.previewMetricValue}>{numDays} Days</Text>
                  <Text style={styles.previewMetricSub}>{numDays} Total Shifts</Text>
                  <Text style={styles.previewMetricTime}>{totalHours} total care hrs</Text>
                </View>

                {/* Metric 3: PNC Registered */}
                <View style={styles.previewMetricCard}>
                  <View style={styles.previewMetricIconCircle}>
                    <ShieldCheck size={15} color={colors.success} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.previewMetricValue}>PNC Registered</Text>
                  <Text style={styles.previewMetricSub}>Punjab Verified</Text>
                  <Text style={styles.previewMetricTime}>Licensed Clinicians Only</Text>
                </View>

                {/* Metric 4: Rate */}
                <View style={styles.previewMetricCard}>
                  <View style={styles.previewMetricIconCircle}>
                    <IndianRupee size={15} color={colors.primary} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.previewMetricValue}>₹{minRate} – ₹{maxRate}</Text>
                  <Text style={styles.previewMetricSub}>Hourly Rate</Text>
                  <Text style={styles.previewMetricTime}>Est. ₹{minCost.toLocaleString("en-IN")} – ₹{maxCost.toLocaleString("en-IN")}</Text>
                </View>
              </View>

              {/* Required Clinical Procedures */}
              <View style={styles.previewSectionBox}>
                <Text style={styles.previewSectionTitle}>
                  Required Clinical Procedures ({activeTasks.length})
                </Text>
                <View style={styles.previewProceduresList}>
                  {activeTasks.map((task, idx) => (
                    <View key={idx} style={styles.previewProcedureItemRow}>
                      <CheckCircle2 size={14} color={colors.primary} strokeWidth={2.4} />
                      <Text style={styles.previewProcedureItemText}>{task}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Skills & Certifications */}
              <View style={styles.previewSectionBox}>
                <Text style={styles.previewSectionTitle}>Mandatory Certifications & Skills</Text>
                <View style={styles.previewTagsWrap}>
                  {certifications.map((cert, idx) => (
                    <View key={idx} style={styles.previewCertPill}>
                      <Text style={styles.previewCertPillText}>{cert}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Medical Equipment */}
              {selectedEquipment.length > 0 && (
                <View style={styles.previewSectionBox}>
                  <Text style={styles.previewSectionTitle}>
                    Medical Equipment Handled ({selectedEquipment.length})
                  </Text>
                  <View style={styles.previewTagsWrap}>
                    {selectedEquipment.map((eq, idx) => (
                      <View key={idx} style={styles.previewEquipPill}>
                        <Text style={styles.previewEquipPillText}>{eq}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Patient Location & Care Logistics */}
              <View style={styles.previewLogisticsCard}>
                <View style={styles.previewLogisticsHeader}>
                  <MapPin size={15} color={colors.primary} strokeWidth={2.2} />
                  <Text style={styles.previewLogisticsTitle}>Location & Care Logistics</Text>
                </View>
                <View style={styles.previewLogisticsBody}>
                  <Text style={styles.previewLogisticsLine}>
                    <Text style={styles.previewBoldLabel}>Marketplace Location: </Text>
                    {locality}, {city} (Punjab, PIN: {postalCode})
                  </Text>
                  <Text style={styles.previewLogisticsLine}>
                    <Text style={styles.previewBoldLabel}>Care Logistics: </Text>
                    {roomProvided ? "Private rest room provided" : "No separate room"} • {mealsProvided ? "Home meals provided" : "Meals self-arranged"}
                  </Text>
                  <View style={styles.previewPrivacyStrip}>
                    <Lock size={12} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.previewPrivacyText}>
                      Exact house address and coordinator contact are revealed exclusively to the selected nurse after Protected Care Deposit milestone funding.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Drug Allergies & Precautions */}
              {drugAllergies ? (
                <View style={styles.previewAllergiesBox}>
                  <View style={styles.previewAllergiesHeader}>
                    <Pill size={14} color={colors.danger} strokeWidth={2.2} />
                    <Text style={styles.previewAllergiesTitle}>Clinical Allergies & Precautions</Text>
                  </View>
                  <Text style={styles.previewAllergiesVal}>{drugAllergies}</Text>
                </View>
              ) : null}

              {/* Protected Care Deposit Guarantee */}
              <View style={styles.previewDepositCard}>
                <View style={styles.previewDepositHeader}>
                  <ShieldCheck size={16} color={colors.success} strokeWidth={2.4} />
                  <Text style={styles.previewDepositTitle}>Protected Care Deposit Guarantee</Text>
                </View>
                <Text style={styles.previewDepositDesc}>
                  Funds are safely held under Punjab Nursing Council protected milestone standards and released per verified digital shift timesheet. Zero automatic releases without patient sign-off.
                </Text>
              </View>

              {/* About the Requester / Verification */}
              <View style={styles.previewAboutClientCard}>
                <Text style={styles.previewAboutClientTitle}>About the Client</Text>
                <View style={styles.previewClientProfileRow}>
                  <View style={styles.previewClientAvatarCircle}>
                    <User size={16} color={colors.primary} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewClientName}>{patientName} Family</Text>
                    <Text style={styles.previewClientSub}>Care for {patientRelationship} ({patientAge}y, {patientGender})</Text>
                  </View>
                </View>
                <View style={styles.previewVerificationsList}>
                  <View style={styles.previewVerifyItem}>
                    <CheckCircle2 size={13} color={colors.success} strokeWidth={2.4} />
                    <Text style={styles.previewVerifyText}>Payment method verified (Protected Care Deposit)</Text>
                  </View>
                  <View style={styles.previewVerifyItem}>
                    <CheckCircle2 size={13} color={colors.success} strokeWidth={2.4} />
                    <Text style={styles.previewVerifyText}>Phone number verified (+91 98XXX XXXXX)</Text>
                  </View>
                  <View style={styles.previewVerifyItem}>
                    <CheckCircle2 size={13} color={colors.success} strokeWidth={2.4} />
                    <Text style={styles.previewVerifyText}>Punjab Nursing Council regulatory compliance</Text>
                  </View>
                </View>
                <View style={styles.previewClientStatsRow}>
                  <Text style={styles.previewClientStatText}>⭐ 5.0 (Punjab Verified)</Text>
                  <Text style={styles.previewClientStatDivider}>•</Text>
                  <Text style={styles.previewClientStatText}>4 Jobs Posted</Text>
                  <Text style={styles.previewClientStatDivider}>•</Text>
                  <Text style={styles.previewClientStatText}>100% Hire Rate</Text>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Modal Action */}
            <View style={styles.previewModalFooter}>
              <TouchableOpacity
                style={[styles.modalPublishBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={() => {
                  setShowPreviewModal(false);
                  handlePublish();
                }}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <View style={styles.modalPublishBtnRow}>
                    <Send size={15} color={colors.white} strokeWidth={2.4} />
                    <Text style={styles.modalPublishBtnText}>
                      Confirm & Broadcast to Verified Nurses
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 3: Alarm App Wheel Time Picker ================= */}
      <Modal
        visible={timePickerTarget !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setTimePickerTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.alarmModalCard}>
            {/* Modal Header */}
            <View style={styles.alarmModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.alarmHeaderIconWrap}>
                  <Clock size={16} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.alarmModalTitle}>
                    {timePickerTarget === "start"
                      ? "Set Shift Login Time"
                      : "Set Shift Logout Time"}
                  </Text>
                  <Text style={styles.alarmModalSub}>
                    Scroll numbers or tap to select timing
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setTimePickerTarget(null)}
                style={styles.alarmModalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            {/* Digital Alarm Clock Readout Display */}
            <View style={styles.alarmDigitalDisplay}>
              <Text style={styles.alarmDigitalLabel}>CURRENT SELECTION</Text>
              <View style={styles.alarmDigitalDigitsRow}>
                <Text style={styles.alarmDigitalTime}>
                  {tempPickerHour} : {tempPickerMinute}
                </Text>
                <TouchableOpacity
                  style={styles.alarmPeriodBadge}
                  onPress={togglePeriod}
                  activeOpacity={0.8}
                >
                  <Text style={styles.alarmPeriodBadgeText}>{tempPickerPeriod}</Text>
                </TouchableOpacity>
              </View>
              {tempPickerNextDay && (
                <Text style={styles.alarmNextDayNote}>
                  Handover on following morning (+24h)
                </Text>
              )}
            </View>

            {/* Alarm App Wheel Picker Columns */}
            <View style={styles.alarmWheelsCard}>
              {/* Central Active Selection Highlight Bar */}
              <View pointerEvents="none" style={styles.alarmWheelCenterBar} />

              {/* Column 1: Hours */}
              <View style={styles.alarmWheelCol}>
                <TouchableOpacity
                  onPress={() => stepHour(-1)}
                  style={styles.wheelArrowBtn}
                >
                  <Text style={styles.wheelArrowText}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.wheelColLabel}>HOUR</Text>
                <ScrollView
                  style={styles.wheelScrollView}
                  contentContainerStyle={styles.wheelScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {pickerHours.map((h) => {
                    const isSelected = tempPickerHour === h;
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[
                          styles.wheelItem,
                          isSelected && styles.wheelItemActive,
                        ]}
                        onPress={() => setTempPickerHour(h)}
                      >
                        <Text
                          style={[
                            styles.wheelItemText,
                            isSelected && styles.wheelItemTextActive,
                          ]}
                        >
                          {h}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  onPress={() => stepHour(1)}
                  style={styles.wheelArrowBtn}
                >
                  <Text style={styles.wheelArrowText}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Colon Separator */}
              <View style={styles.wheelSeparatorWrap}>
                <Text style={styles.wheelSeparatorText}>:</Text>
              </View>

              {/* Column 2: Minutes */}
              <View style={styles.alarmWheelCol}>
                <TouchableOpacity
                  onPress={() => stepMinute(-1)}
                  style={styles.wheelArrowBtn}
                >
                  <Text style={styles.wheelArrowText}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.wheelColLabel}>MIN</Text>
                <ScrollView
                  style={styles.wheelScrollView}
                  contentContainerStyle={styles.wheelScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {pickerMinutes.map((m) => {
                    const isSelected = tempPickerMinute === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.wheelItem,
                          isSelected && styles.wheelItemActive,
                        ]}
                        onPress={() => setTempPickerMinute(m)}
                      >
                        <Text
                          style={[
                            styles.wheelItemText,
                            isSelected && styles.wheelItemTextActive,
                          ]}
                        >
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  onPress={() => stepMinute(1)}
                  style={styles.wheelArrowBtn}
                >
                  <Text style={styles.wheelArrowText}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Column 3: AM / PM Period */}
              <View style={styles.alarmWheelColPeriod}>
                <Text style={styles.wheelColLabel}>PERIOD</Text>
                <View style={styles.periodWheelOptions}>
                  {pickerPeriods.map((p) => {
                    const isSelected = tempPickerPeriod === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.wheelPeriodItem,
                          isSelected && styles.wheelPeriodItemActive,
                        ]}
                        onPress={() => setTempPickerPeriod(p)}
                      >
                        <Text
                          style={[
                            styles.wheelPeriodItemText,
                            isSelected && styles.wheelPeriodItemTextActive,
                          ]}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Optional Next Day Checkbox (especially for overnight or live-in) */}
            {(shiftModel.includes("Live-in") || shiftModel.includes("Night")) && (
              <TouchableOpacity
                style={styles.alarmNextDayToggle}
                onPress={() => setTempPickerNextDay((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.alarmCheckbox,
                    tempPickerNextDay && styles.alarmCheckboxActive,
                  ]}
                >
                  {tempPickerNextDay && (
                    <Check size={12} color={colors.white} strokeWidth={3} />
                  )}
                </View>
                <Text style={styles.alarmNextDayToggleText}>
                  Shift logout falls on Next Day (+24h)
                </Text>
              </TouchableOpacity>
            )}

            {/* Quick Shift Shortcut Presets */}
            <View style={styles.alarmQuickSection}>
              <Text style={styles.alarmQuickLabel}>QUICK HOSPITAL PRESETS</Text>
              <View style={styles.alarmQuickRow}>
                {quickPickerPresets.map((qp, idx) => {
                  const isMatch =
                    tempPickerHour === qp.hour &&
                    tempPickerMinute === qp.minute &&
                    tempPickerPeriod === qp.period;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.alarmQuickChip,
                        isMatch && styles.alarmQuickChipActive,
                      ]}
                      onPress={() => {
                        setTempPickerHour(qp.hour);
                        setTempPickerMinute(qp.minute);
                        setTempPickerPeriod(qp.period);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.alarmQuickChipText,
                          isMatch && styles.alarmQuickChipTextActive,
                        ]}
                      >
                        {qp.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.alarmModalActions}>
              <TouchableOpacity
                style={styles.alarmCancelBtn}
                onPress={() => setTimePickerTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.alarmCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alarmConfirmBtn}
                onPress={applyPickerTime}
                activeOpacity={0.85}
              >
                <Check size={16} color={colors.white} strokeWidth={2.4} />
                <Text style={styles.alarmConfirmBtnText}>Apply Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neuBg,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 220, // Generous clearance for bottom floating bar and tab capsule
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.neuBg,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  topTitleWrap: {
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  topBarSub: {
    fontSize: 11,
    color: colors.gray500,
    fontWeight: "600",
  },
  stepperContainer: {
    backgroundColor: colors.neuBg,
    marginBottom: 12,
  },
  stepperTrackRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  stepItem: {
    alignItems: "center",
    width: 60,
    zIndex: 2,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: "#2E5BFF",
    borderColor: "#2E5BFF",
    shadowColor: "#2E5BFF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  stepCircleDone: {
    backgroundColor: "#059669",
    borderColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  stepCircleNum: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    fontVariant: ["tabular-nums"],
  },
  stepCircleNumActive: {
    color: colors.white,
    fontWeight: "900",
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 5,
    textAlign: "center",
  },
  stepLabelActive: {
    color: "#2E5BFF",
    fontWeight: "800",
  },
  stepLabelDone: {
    color: "#059669",
    fontWeight: "700",
  },
  stepConnectorLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginTop: 15,
    marginHorizontal: -2,
    zIndex: 1,
  },
  stepConnectorLineDone: {
    backgroundColor: "#059669",
  },
  aiBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#D6E4FF",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  aiBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  aiBannerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  aiBannerTextWrap: {
    flex: 1,
  },
  aiBannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  aiBannerTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: colors.gray900,
  },
  aiBannerBadge: {
    backgroundColor: "#EAF0FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiBannerBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
  },
  aiBannerSub: {
    fontSize: 11,
    color: colors.gray600,
    lineHeight: 15,
  },
  aiBannerArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  cardHeaderRowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  iconChipBlue: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gray900,
    letterSpacing: -0.2,
  },
  pickOnMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF0FF",
    borderWidth: 1,
    borderColor: "#D6E4FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pickOnMapBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    marginLeft: 4,
  },
  pinnedGpsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  pinnedGpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald600,
    marginRight: 6,
  },
  pinnedGpsText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.emerald800,
    flex: 1,
  },
  pinnedGpsEdit: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    marginLeft: 6,
  },
  cardHeaderSubtitle: {
    fontSize: 11,
    color: colors.gray500,
    fontWeight: "500",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray700,
    marginBottom: 6,
  },
  fieldLabelSpacing: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray700,
    marginTop: 14,
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 4,
    lineHeight: 15,
  },
  fieldHintTop: {
    fontSize: 11,
    color: colors.gray600,
    marginBottom: 12,
    lineHeight: 16,
  },
  inputContainer: {
    backgroundColor: colors.neuInset,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputContainerSmall: {
    backgroundColor: colors.neuInset,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  colHalf: {
    flex: 1,
  },
  textInput: {
    fontSize: 13,
    color: colors.gray900,
    fontWeight: "600",
    padding: 0,
    outlineWidth: 0,
    outlineStyle: "none",
  } as any,
  inputContainerArea: {
    backgroundColor: colors.neuInset,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 74,
  },
  textAreaInput: {
    fontSize: 12,
    color: colors.gray900,
    lineHeight: 17,
    textAlignVertical: "top",
    padding: 0,
    outlineWidth: 0,
    outlineStyle: "none",
  } as any,
  inputContainerAreaLarge: {
    backgroundColor: colors.neuInset,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 110,
  },
  textAreaInputLarge: {
    fontSize: 13,
    color: colors.gray900,
    lineHeight: 18,
    textAlignVertical: "top",
    padding: 0,
    outlineWidth: 0,
    outlineStyle: "none",
  } as any,
  charCounterWrap: {
    alignItems: "flex-end",
    marginTop: 6,
  },
  charCounterText: {
    fontSize: 10,
    color: colors.gray400,
    fontWeight: "600",
  },
  togglePillRow: {
    flexDirection: "row",
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: 2,
  },
  togglePillOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  togglePillActive: {
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  togglePillText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray600,
  },
  togglePillTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  threeColRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  colOneThird: {
    flex: 1,
  },
  mobilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectOptionCard: {
    width: "48.5%",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  selectOptionCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#EAF0FF",
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
  },
  optCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  optIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.neuInset,
    alignItems: "center",
    justifyContent: "center",
  },
  optIconBoxActive: {
    backgroundColor: "#D6E4FF",
  },
  optTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray800,
    marginBottom: 2,
  },
  optTitleActive: {
    color: colors.primary,
  },
  optSub: {
    fontSize: 10,
    color: colors.gray500,
    lineHeight: 13,
  },
  shiftRowContainer: {
    flexDirection: "row",
    gap: 5,
    width: "100%",
    paddingVertical: 2,
  },
  shiftMiniCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  shiftMiniCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#EAF0FF",
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
  },
  shiftMiniIconWrap: {
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  shiftMiniTitle: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.gray800,
    textAlign: "center",
    marginBottom: 2,
  },
  shiftMiniTitleActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  shiftMiniBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.gray500,
    textAlign: "center",
  },
  shiftMiniBadgeTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  customShiftBox: {
    marginTop: 12,
    backgroundColor: "#F8FAFD",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  customShiftBoxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  customShiftBoxTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray900,
  },
  customHourTag: {
    backgroundColor: "#EAF0FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  customHourTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  presetTimingWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 10,
  },
  timingPresetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  timingPresetChipActive: {
    backgroundColor: "#EAF0FF",
    borderColor: colors.primary,
  },
  timingPresetText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray700,
  },
  timingPresetTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  timingPresetHrsBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  timingPresetHrsBadgeActive: {
    backgroundColor: colors.primary,
  },
  timingPresetHrsBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.gray600,
  },
  timingPresetHrsBadgeTextActive: {
    color: colors.white,
  },
  customFieldLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.gray600,
    marginBottom: 6,
  },
  customHourPillsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginBottom: 12,
  },
  customHourPill: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  customHourPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  customHourPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray700,
  },
  customHourPillTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  customStepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 4,
    height: 30,
  },
  stepperBtn: {
    padding: 4,
  },
  stepperInput: {
    width: 26,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray900,
    padding: 0,
    outlineWidth: 0,
    outlineStyle: "none",
  } as any,
  customTimeRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  alarmTimeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  alarmTimeIconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  alarmTimeBtnText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.gray900,
    letterSpacing: 0.2,
  },
  alarmModalCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  alarmModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  alarmHeaderIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  alarmModalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gray900,
  },
  alarmModalSub: {
    fontSize: 11,
    color: colors.gray500,
    fontWeight: "500",
  },
  alarmModalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  alarmDigitalDisplay: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  alarmDigitalLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  alarmDigitalDigitsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alarmDigitalTime: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1E293B",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  alarmPeriodBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  alarmPeriodBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  alarmNextDayNote: {
    fontSize: 10.5,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 4,
  },
  alarmWheelsCard: {
    flexDirection: "row",
    height: 190,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    padding: 8,
    position: "relative",
    alignItems: "center",
    justifyContent: "space-around",
    overflow: "hidden",
  },
  alarmWheelCenterBar: {
    position: "absolute",
    top: 72,
    left: 8,
    right: 8,
    height: 44,
    backgroundColor: "rgba(46, 91, 255, 0.08)",
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: "rgba(46, 91, 255, 0.25)",
    borderRadius: 10,
    zIndex: 1,
  },
  alarmWheelCol: {
    flex: 1,
    alignItems: "center",
    zIndex: 2,
  },
  wheelArrowBtn: {
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  wheelArrowText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
  },
  wheelColLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  wheelScrollView: {
    height: 120,
    width: "100%",
  },
  wheelScrollContent: {
    alignItems: "center",
    paddingVertical: 40,
  },
  wheelItem: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    width: 48,
    borderRadius: 8,
  },
  wheelItemActive: {
    backgroundColor: colors.primary,
  },
  wheelItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
    fontVariant: ["tabular-nums"],
  },
  wheelItemTextActive: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.white,
  },
  wheelSeparatorWrap: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
    zIndex: 2,
  },
  wheelSeparatorText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#64748B",
  },
  alarmWheelColPeriod: {
    width: 68,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  periodWheelOptions: {
    gap: 8,
    marginTop: 6,
  },
  wheelPeriodItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    width: 58,
  },
  wheelPeriodItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  wheelPeriodItemText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#64748B",
  },
  wheelPeriodItemTextActive: {
    color: colors.white,
    fontWeight: "800",
  },
  alarmNextDayToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 4,
  },
  alarmCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  alarmCheckboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  alarmNextDayToggleText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.gray700,
  },
  alarmQuickSection: {
    marginTop: 12,
  },
  alarmQuickLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  alarmQuickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  alarmQuickChip: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  alarmQuickChipActive: {
    backgroundColor: "#EAF0FF",
    borderColor: colors.primary,
  },
  alarmQuickChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  alarmQuickChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  alarmModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  alarmCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  alarmCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray700,
  },
  alarmConfirmBtn: {
    flex: 1.5,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  alarmConfirmBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
  },
  timeInputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
  },
  timeTextInput: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.gray900,
    padding: 0,
    outlineWidth: 0,
    outlineStyle: "none",
  } as any,
  customSummaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  customSummaryStripText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.primary,
    flex: 1,
  },
  presetShiftRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  presetTimingChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  presetTimingChipActive: {
    backgroundColor: "#EAF0FF",
    borderColor: colors.primary,
  },
  presetTimingText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray700,
  },
  presetTimingTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  weekdaySelectSection: {
    marginBottom: 10,
  },
  weekdaySelectLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.gray600,
    marginBottom: 6,
  },
  weekdayPillRow: {
    flexDirection: "row",
    gap: 6,
  },
  weekdayPill: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  weekdayPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekdayPillText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.gray700,
  },
  weekdayPillTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  calendarCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: 12,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  calMonthNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calNavBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  calendarMonthText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.gray900,
  },
  calendarLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDotBlue: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  legendText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "700",
  },
  calendarWeekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calendarDayLabel: {
    textAlign: "center",
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.gray400,
  },
  calendarGridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4,
  },
  calCellWrapper: {
    width: "14.28%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 1,
  },
  calCellEmpty: {
    width: 28,
    height: 26,
  },
  calCell: {
    width: 28,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  calCellActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 2,
  },
  calCellStartDay: {
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  calCellText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.gray700,
  },
  calCellTextActive: {
    color: colors.white,
    fontWeight: "800",
  },
  calQuickActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  calQuickActionsTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray500,
    marginRight: 2,
  },
  calQuickPill: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    alignItems: "center",
    justifyContent: "center",
  },
  calQuickPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  calendarFooterBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginTop: 4,
  },
  calendarFooterText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.primary,
  },
  calendarFooterSubText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray500,
  },
  cadenceRow: {
    flexDirection: "row",
    gap: 8,
  },
  cadenceBtn: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: "center",
  },
  cadenceBtnActive: {
    backgroundColor: "#EAF0FF",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cadenceBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray700,
  },
  cadenceBtnTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  durationPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  durationPill: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  durationPillActive: {
    backgroundColor: "#2E5BFF",
  },
  durationPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray700,
  },
  durationPillTextActive: {
    color: colors.white,
  },
  summaryPillBox: {
    backgroundColor: colors.gray50,
    borderRadius: 14,
    padding: 10,
    gap: 4,
    marginTop: 12,
  },
  summaryPillItem: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryPillLabel: {
    fontSize: 11,
    color: colors.gray500,
  },
  summaryPillVal: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray800,
  },
  provisionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  provisionCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: 14,
    padding: 10,
  },
  provisionCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#F8FAFF",
  },
  provisionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  provisionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray800,
    flex: 1,
  },
  provisionSub: {
    fontSize: 9,
    color: colors.gray500,
    lineHeight: 12,
  },
  badgePillBlue: {
    backgroundColor: "#EAF0FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgePillBlueText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  emptyDashedBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.gray300,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  emptyDashedText: {
    fontSize: 11,
    color: colors.gray500,
    textAlign: "center",
    lineHeight: 16,
  },
  neuTaskInputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neuInset,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 4,
    marginBottom: 12,
  },
  neuTaskInput: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.gray900,
    paddingVertical: 6,
    outlineWidth: 0,
    outlineStyle: "none",
  } as any,
  neuTaskAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 2,
  },
  neuTaskAddBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.white,
  },
  neuTaskList: {
    gap: 8,
    marginBottom: 12,
  },
  neuTaskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  neuTaskCheckDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  neuTaskText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray800,
    lineHeight: 16,
  },
  neuTaskDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    marginLeft: 4,
  },
  suggestedSection: {
    marginTop: 2,
  },
  suggestedHeading: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.gray500,
    marginBottom: 8,
  },
  suggestedChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  suggestedNeuChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestedNeuChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray700,
  },
  suggestedChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray700,
  },
  suggestedChipTextAdded: {
    color: colors.primary,
    fontWeight: "700",
  },
  certTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  certTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EAF0FF",
    borderWidth: 1,
    borderColor: "#D6E4FF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  certTagPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  equipmentGrid: {
    gap: 6,
  },
  equipmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  equipmentChipChecked: {
    backgroundColor: "#F8FAFF",
    borderColor: colors.primary,
  },
  equipmentChipText: {
    fontSize: 12,
    color: colors.gray700,
    fontWeight: "500",
  },
  equipmentChipTextChecked: {
    color: colors.primary,
    fontWeight: "700",
  },
  rateModeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  rateModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: 14,
    padding: 10,
  },
  rateModeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: "#F8FAFF",
  },
  rateModeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray800,
  },
  rateModeTitleActive: {
    color: colors.primary,
  },
  rateModeSub: {
    fontSize: 9,
    color: colors.gray500,
  },
  rateInputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  rateInputCol: {
    flex: 1,
  },
  rateInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2F6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rupeeSymbol: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gray700,
    marginRight: 4,
  },
  rateTextInput: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
    flex: 1,
    padding: 0,
  },
  shiftApproxText: {
    fontSize: 10,
    color: colors.gray500,
    marginTop: 4,
  },
  guidanceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F7FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  guidanceText: {
    fontSize: 11,
    color: "#0369A1",
    lineHeight: 15,
    flex: 1,
  },
  presetsGrid: {
    gap: 8,
  },
  presetCard: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: 14,
    padding: 10,
  },
  presetCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#F8FAFF",
  },
  presetCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  presetCardRole: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray800,
  },
  presetCardRoleActive: {
    color: colors.primary,
  },
  recommendedBadge: {
    backgroundColor: "#EAF0FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
  },
  presetCardRate: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.gray900,
  },
  presetCardShift: {
    fontSize: 10,
    color: colors.gray500,
  },
  addressRow: {
    flexDirection: "row",
  },
  neuRateTypeSwitch: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  neuRateTypeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  neuRateTypeTabActive: {
    backgroundColor: colors.white,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  neuRateTypeTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray600,
  },
  neuRateTypeTabTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  neuFieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray700,
    marginBottom: 6,
  },
  neuInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neuInset,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
    paddingHorizontal: 12,
    height: 44,
  },
  neuPrefixRupee: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
    marginRight: 6,
  },
  neuRateInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray900,
    padding: 0,
    outlineWidth: 0,
    outlineStyle: "none",
  } as any,
  neuMarketTip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F5FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  neuMarketTipText: {
    fontSize: 11,
    color: colors.gray700,
    flex: 1,
  },
  neuMarketTipBold: {
    fontWeight: "800",
    color: colors.primary,
  },
  neuPresetRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  neuPresetChip: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  neuPresetChipActive: {
    backgroundColor: "#EAF0FF",
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
  },
  neuPresetRole: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray700,
    marginBottom: 2,
  },
  neuPresetRoleActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  neuPresetRate: {
    fontSize: 9.5,
    fontWeight: "600",
    color: colors.gray500,
  },
  neuPresetRateActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  neuPrivacyStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 12,
  },
  neuPrivacyStripText: {
    fontSize: 10.5,
    color: colors.gray600,
    flex: 1,
  },
  neuShiftPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  neuShiftPillText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
  },
  neuSummaryList: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  neuSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  neuSummaryLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  neuSummaryVal: {
    fontSize: 12.5,
    color: "#1E293B",
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  neuSummaryDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 6,
  },
  neuSummaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 2,
  },
  neuSummaryTotalLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  neuSummaryTotalSub: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 2,
  },
  neuSummaryTotalAmount: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  bottomBar: {
    position: "absolute",
    bottom: 84, // Elevated cleanly above FloatingTabBar (which is at bottom: 12, height ~64px)
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(226, 232, 240, 0.95)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 12,
    zIndex: 9999,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 44,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray800,
  },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: "rgba(226, 232, 240, 0.95)",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  previewIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F0F2F6",
    alignItems: "center",
    justifyContent: "center",
  },
  previewBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray800,
  },
  continueBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2E5BFF",
    borderRadius: 22,
    height: 44,
    shadowColor: "#2E5BFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  continueIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
  },
  publishBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2E5BFF",
    borderRadius: 22,
    height: 44,
    shadowColor: "#2E5BFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
  },
  inlineActionCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: "#7B8AA8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.95)",
  },
  inlineActionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  inlineBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.neuInset,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neuInsetBorder,
  },
  inlineBackBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray700,
  },
  inlinePreviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF0FF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D6E4FF",
  },
  inlinePreviewBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  inlinePublishBigBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#2E5BFF",
    borderRadius: 18,
    paddingVertical: 14,
    shadowColor: "#2E5BFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  inlinePublishBigBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.2,
  },
  publishIconPulse: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  inlinePublishSecurityNote: {
    fontSize: 10.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 10,
    fontWeight: "500",
  },
  inlineStepNextRow: {
    marginTop: 14,
    marginBottom: 10,
  },
  inlineStepNextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2E5BFF",
    borderRadius: 18,
    paddingVertical: 14,
    shadowColor: "#2E5BFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  inlineStepNextBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: colors.white,
  },
  inlineStepNextRowBetween: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    marginBottom: 10,
  },
  inlineStepNextBtnFlex: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2E5BFF",
    borderRadius: 18,
    paddingVertical: 13,
    shadowColor: "#2E5BFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 18,
    maxHeight: "85%",
    width: "100%",
    maxWidth: 412,
  },
  modalCardLarge: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 18,
    maxHeight: "88%",
    width: "100%",
    maxWidth: 412,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalHeaderTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gray900,
  },
  groqBadge: {
    backgroundColor: "#EAF0FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  groqBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
  },
  aiGreetingText: {
    fontSize: 11,
    color: colors.gray600,
    lineHeight: 16,
    marginBottom: 12,
  },
  presetPillsList: {
    gap: 6,
    marginBottom: 12,
  },
  presetPill: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 9,
  },
  presetPillText: {
    fontSize: 11,
    color: colors.gray800,
    lineHeight: 15,
  },
  aiInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  aiTextInput: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
  },
  aiSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  previewModalCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    maxHeight: "92%",
    width: "100%",
    maxWidth: 412,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  previewModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: "#F8FAFC",
  },
  previewHeaderIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  previewModalSubTitle: {
    fontSize: 10,
    color: colors.gray500,
    fontWeight: "500",
    marginTop: 1,
  },
  previewModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  previewModalScroll: {
    padding: 16,
    paddingBottom: 24,
    gap: 14,
  },
  previewHeroBox: {
    gap: 6,
  },
  previewCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.gray900,
    lineHeight: 23,
    letterSpacing: -0.3,
  },
  previewMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  previewMetaDot: {
    fontSize: 11,
    color: colors.gray400,
    fontWeight: "500",
  },
  previewMetaPinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  previewMetaLocation: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray700,
  },
  previewMetaMasked: {
    fontSize: 10,
    color: colors.gray500,
    fontStyle: "italic",
  },
  previewPatientCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  previewPatientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  previewPatientNameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  previewPatientName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewPatientPill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  previewPatientPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  previewMobilityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewMobilityLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray700,
  },
  previewMobilityVal: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray800,
  },
  previewMobilityDirectives: {
    fontSize: 10,
    color: colors.gray500,
    marginTop: 2,
    lineHeight: 14,
  },
  previewSectionBox: {
    gap: 6,
  },
  previewSectionSmallHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray400,
    letterSpacing: 0.8,
  },
  previewCategoryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewClinicalOrdersBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  previewClinicalOrdersText: {
    fontSize: 11,
    color: colors.gray700,
    lineHeight: 17,
  },
  previewMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  previewMetricCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    gap: 2,
  },
  previewMetricIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  previewMetricValue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewMetricSub: {
    fontSize: 10,
    color: colors.gray500,
    fontWeight: "600",
  },
  previewMetricTime: {
    fontSize: 9,
    color: colors.gray400,
    fontWeight: "500",
  },
  previewSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewProceduresList: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    gap: 8,
  },
  previewProcedureItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewProcedureItemText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray800,
    flex: 1,
  },
  previewTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  previewCertPill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  previewCertPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  previewEquipPill: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  previewEquipPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray700,
  },
  previewLogisticsCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 8,
  },
  previewLogisticsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewLogisticsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewLogisticsBody: {
    gap: 6,
  },
  previewLogisticsLine: {
    fontSize: 11,
    color: colors.gray600,
    lineHeight: 16,
  },
  previewBoldLabel: {
    fontWeight: "700",
    color: colors.gray800,
  },
  previewPrivacyStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#EFF6FF",
    padding: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  previewPrivacyText: {
    fontSize: 10,
    color: "#1E40AF",
    lineHeight: 14,
    flex: 1,
  },
  previewAllergiesBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    gap: 4,
  },
  previewAllergiesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewAllergiesTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B91C1C",
  },
  previewAllergiesVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  previewDepositCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    gap: 4,
  },
  previewDepositHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewDepositTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  previewDepositDesc: {
    fontSize: 10,
    color: "#065F46",
    lineHeight: 15,
  },
  previewAboutClientCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 8,
  },
  previewAboutClientTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewClientProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  previewClientAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  previewClientName: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray900,
  },
  previewClientSub: {
    fontSize: 10,
    color: colors.gray500,
  },
  previewVerificationsList: {
    gap: 4,
  },
  previewVerifyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewVerifyText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray700,
  },
  previewClientStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  previewClientStatText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray600,
  },
  previewClientStatDivider: {
    fontSize: 10,
    color: colors.gray300,
  },
  previewModalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  modalPublishBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalPublishBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalPublishBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.1,
  },
});
