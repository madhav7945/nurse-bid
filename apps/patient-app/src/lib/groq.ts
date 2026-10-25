// ═══════════════════════════════════════════════════════════════════════════════
// Groq AI Clinical Intake Engine — Patient Mobile App
// Powered by Llama 3.3 / GPT-OSS 120B on Groq LPUs
// Interactive Guided Intake & Multi-Turn 4-Step Job Wizard Autofill
// ═══════════════════════════════════════════════════════════════════════════════

export interface ParsedJobData {
  // Step 1: Patient & Clinical
  jobTitle?: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: "Male" | "Female" | "Other";
  patientRelationship?: "Self" | "Parent" | "Spouse" | "Child" | "Other";
  mobilityLevel?: "Bedridden" | "Semi-ambulatory" | "Ambulatory";
  mobilityDirectives?: string;
  careCategory?: string;
  drugAllergies?: string;

  // Step 2: Schedule & Shifts
  shiftModel?: string;
  customHoursPerDay?: number;
  shiftStartTime?: string;
  shiftEndTime?: string;
  startDate?: string;
  selectedDaysCount?: number;
  roomProvided?: boolean;
  mealsProvided?: boolean;

  // Step 3: Clinical Procedures & Requirements
  activeTasks?: string[];
  certifications?: string[];
  selectedEquipment?: string[];
  physicianOrders?: string;

  // Step 4: Budget & Location
  rateType?: "hourly" | "fixed";
  minRate?: string;
  maxRate?: string;
  city?: string;
  locality?: string;
  houseAddress?: string;
  postalCode?: string;
}

export interface GroqChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  extractedData?: ParsedJobData;
  isComplete?: boolean;
}

export interface GroqParseResult {
  reply: string;
  extracted: ParsedJobData;
  isComplete: boolean;
  missingFields: string[];
  source: string;
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || "";

const PRIMARY_MODEL = "openai/gpt-oss-120b";
const FALLBACK_MODEL = "openai/gpt-oss-20b";
const TERTIARY_MODEL = "qwen/qwen3.8-27b";

const SYSTEM_PROMPT = `You are the Lead Clinical Care Specialist at NurseBid, a high-trust private home healthcare platform in Punjab, India.
Your mission is to conduct a gentle, step-by-step clinical intake with a family member in natural, caring everyday language to prepare a complete, production-ready nursing care post.

════════════════════════════════════════════════════════════════════════════════
STEP-BY-STEP GUIDED INTAKE WORKFLOW:
════════════════════════════════════════════════════════════════════════════════
Step 1 - Patient & Diagnosis:
  - Identify who needs care (Father, Mother, Self, Spouse, etc.) and their approximate age.
  - Identify health condition, hospital discharge, or surgical history (e.g. CABG / Heart bypass, Stroke, Trach, Post-Op, Elderly Dementia, Diabetic wound).

Step 2 - City & Area in Punjab:
  - Collect exact city (Ludhiana, Amritsar, Mohali / Chandigarh, Jalandhar, Bathinda, Patiala, etc.) and neighborhood/locality.
  - NEVER invent or default to a city unless explicitly mentioned!

Step 3 - Shift Timing, Schedule & Dates:
  - Collect preferred shift structure: 12-hour Day (e.g. 8:00 AM - 8:00 PM), 12-hour Night (8:00 PM - 8:00 AM), 24/7 Live-in, or 4-hour daily visits.
  - Collect start date (e.g. tomorrow, starting immediately, or specific date) and total duration / days needed (e.g. 7 days, 14 days, 30 days).

Step 4 - Clinical Tasks & Budget:
  - Confirm clinical procedures (sterile dressing, vitals monitoring, medication tracking, catheter care, mobility).
  - Calibrate recommended rate per hour or per shift (e.g. ₹700 - ₹900/hr for ICU post-op).

════════════════════════════════════════════════════════════════════════════════
CRITICAL CONVERSATIONAL & COMPLETION RULES:
════════════════════════════════════════════════════════════════════════════════
1. DO NOT RUSH OR JUMP THE GUN:
   - If Patient Age, City, or Shift Timing are missing, set "isComplete": false.
   - List what is still missing in "missingFields" (e.g. ["patientAge", "city", "shiftTiming", "dates"]).
   - In your "reply", warmly acknowledge what they shared, and ask 1 or 2 friendly, direct questions to get the next missing detail.

2. ONLY SET "isComplete": true WHEN ALL ESSENTIAL DETAILS ARE PRESENT:
   - Required for completion: (1) Patient Name/Relation, (2) Approximate Age, (3) Diagnosis/Condition, (4) City in Punjab, (5) Shift Timing (Day/Night/Live-in/Hours).
   - When all are present, set "isComplete": true, "missingFields": [], and say: "Your care plan is ready! Please review the draft below and tap 'Apply & Autofill' to complete your job post."

3. EASY-LANGUAGE TONE:
   - Speak with the warm, reassuring voice of a compassionate bedside head nurse talking to a patient's family at home.
   - Understand Indian family terms: Papa, Mummy, Dad, Mom, Dadi, Nani, Bauji, Pitaji, Chacha, Uncle, Aunty, Taanke (stitches), Drip/IV, Sugar check, BP, Urine tube/Catheter, Breathing pipe/Trach.

════════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT:
════════════════════════════════════════════════════════════════════════════════
You must ALWAYS return a JSON object with this exact shape:
{
  "reply": "Warm, natural response asking the next specific question...",
  "isComplete": false,
  "missingFields": ["patientAge", "city", "shiftTiming", "dates"],
  "extracted": {
    "jobTitle": "Professional title that will attract top-tier nurses in Punjab",
    "patientName": "Extracted name or relation e.g. Father",
    "patientAge": "Age as string number e.g. 72 or empty string if not given yet",
    "patientGender": "Male" | "Female" | "Other",
    "patientRelationship": "Self" | "Parent" | "Spouse" | "Child" | "Other",
    "mobilityLevel": "Bedridden" | "Semi-ambulatory" | "Ambulatory",
    "mobilityDirectives": "Clear, simple instructions for moving or walking the patient",
    "careCategory": "Post-Surgical ICU" | "Elderly & Geriatric" | "Respiratory & Trach" | "Wound & Diabetic" | "Palliative & Oncology" | "Mother & Infant",
    "drugAllergies": "Known medicine allergies or None reported",
    "shiftModel": "Day Shift (12h)" | "Night Shift (12h)" | "Live-in (24h)" | "Hourly Visit (4h)" | "Custom Duration",
    "customHoursPerDay": 12,
    "shiftStartTime": "08:00 AM",
    "shiftEndTime": "08:00 PM",
    "startDate": "YYYY-MM-DD or tomorrow",
    "selectedDaysCount": 7,
    "roomProvided": false,
    "mealsProvided": true,
    "activeTasks": [
      "Vitals monitoring (BP, SpO2, Temp, Pulse)",
      "Sterile surgical / wound dressing change",
      "Medication administration & compliance"
    ],
    "certifications": [
      "BLS",
      "PNC Registered Nurse"
    ],
    "selectedEquipment": [
      "Calibrated Digital BP & Pulse Oximeter"
    ],
    "physicianOrders": "Simple doctor instructions to follow",
    "rateType": "hourly",
    "minRate": "700",
    "maxRate": "900",
    "city": "Exact Punjab city mentioned (e.g. Ludhiana, Amritsar, Mohali, Jalandhar, Bathinda, Patiala) or EMPTY STRING if not mentioned",
    "locality": "Neighborhood or locality name or empty string if not mentioned",
    "houseAddress": "Street or house address if given",
    "postalCode": "6-digit postal code"
  }
}

Return ONLY clean valid JSON.`;

/**
 * Intelligent Local Clinical Fallback Parser
 * Guarantees instant offline parsing with warm, easy-language responses if network or API is unavailable.
 * Never hardcodes a city or age unless the user mentioned them.
 */
function localClinicalParser(prompt: string): GroqParseResult {
  const text = prompt.toLowerCase();

  let careCategory = "Post-Surgical ICU";
  let jobTitle = "Dedicated Home Clinical Care Nurse";
  let minRate = "650";
  let maxRate = "850";
  let shiftModel = "Day Shift (12h)";
  let customHoursPerDay = 12;
  let mobilityLevel: "Bedridden" | "Semi-ambulatory" | "Ambulatory" = "Ambulatory";
  let activeTasks = [
    "Vitals monitoring (BP, SpO2, Temp, Pulse)",
    "Medication administration & compliance",
  ];
  let certifications = ["BLS", "PNC Registered Nurse"];
  let selectedEquipment: string[] = ["Calibrated Digital BP & Pulse Oximeter"];

  // Age detection (handles "72y", "72 yr", "age 72", "72 years old", etc.)
  const ageMatch =
    text.match(/(\d{1,2})\s*(?:years?|y\/?o|yrs?|age)/i) ||
    text.match(/(?:age|aged)\s*(\d{1,2})/i);
  const patientAge = ageMatch ? ageMatch[1] : "";

  // Gender & Relation detection (including Hindi/Punjabi keywords)
  let patientGender: "Male" | "Female" | "Other" = "Male";
  let patientRelationship: "Self" | "Parent" | "Spouse" | "Child" | "Other" = "Parent";
  let relationLabel = "loved one";
  let patientName = "";

  if (
    text.includes("father") ||
    text.includes("dad") ||
    text.includes("papa") ||
    text.includes("pitaji") ||
    text.includes("bauji") ||
    text.includes("grandfather") ||
    text.includes("dada") ||
    text.includes("nana") ||
    text.includes("uncle") ||
    text.includes("chacha") ||
    text.includes("husband") ||
    text.includes("pati") ||
    text.includes("brother") ||
    text.includes("bhai") ||
    text.includes("son") ||
    text.includes("beta")
  ) {
    patientGender = "Male";
    if (text.includes("husband") || text.includes("pati")) {
      patientRelationship = "Spouse";
      relationLabel = "husband";
      patientName = "Husband";
    } else if (text.includes("son") || text.includes("beta")) {
      patientRelationship = "Child";
      relationLabel = "son";
      patientName = "Son";
    } else {
      patientRelationship = "Parent";
      relationLabel = text.includes("papa") || text.includes("dad") ? "father" : "father";
      patientName = "Father";
    }
  } else if (
    text.includes("mother") ||
    text.includes("mom") ||
    text.includes("mummy") ||
    text.includes("mataji") ||
    text.includes("grandmother") ||
    text.includes("dadi") ||
    text.includes("nani") ||
    text.includes("bebe") ||
    text.includes("aunt") ||
    text.includes("chachi") ||
    text.includes("masi") ||
    text.includes("wife") ||
    text.includes("patni") ||
    text.includes("sister") ||
    text.includes("behan") ||
    text.includes("daughter") ||
    text.includes("beti")
  ) {
    patientGender = "Female";
    if (text.includes("wife") || text.includes("patni")) {
      patientRelationship = "Spouse";
      relationLabel = "wife";
      patientName = "Wife";
    } else if (text.includes("daughter") || text.includes("beti")) {
      patientRelationship = "Child";
      relationLabel = "daughter";
      patientName = "Daughter";
    } else {
      patientRelationship = "Parent";
      relationLabel = text.includes("mummy") || text.includes("mom") ? "mother" : "mother";
      patientName = "Mother";
    }
  } else if (text.includes("myself") || text.includes("me") || text.includes("self") || text.includes("i am") || text.includes("i need")) {
    patientRelationship = "Self";
    relationLabel = "yourself";
    patientName = "Patient";
  }

  // City detection (NEVER defaults to Jalandhar if unmentioned!)
  let city = "";
  let locality = "";
  let postalCode = "";

  if (text.includes("ludhiana") || text.includes("sarabha") || text.includes("ferozepur")) {
    city = "Ludhiana";
    locality = text.includes("sarabha") ? "Sarabha Nagar" : "Civil Lines";
    postalCode = "141001";
  } else if (text.includes("amritsar") || text.includes("ranjit") || text.includes("golden temple")) {
    city = "Amritsar";
    locality = "Ranjit Avenue";
    postalCode = "143001";
  } else if (
    text.includes("mohali") ||
    text.includes("chandigarh") ||
    text.includes("panchkula") ||
    text.includes("sector") ||
    text.includes("phase")
  ) {
    city = "Mohali / Chandigarh";
    locality = "Phase 7";
    postalCode = "160062";
  } else if (text.includes("jalandhar") || text.includes("model town")) {
    city = "Jalandhar";
    locality = "Model Town";
    postalCode = "144003";
  } else if (text.includes("bathinda")) {
    city = "Bathinda";
    locality = "Civil Lines";
    postalCode = "151001";
  } else if (text.includes("patiala")) {
    city = "Patiala";
    locality = "Model Town";
    postalCode = "147001";
  }

  // Clinical condition classification
  let easySummary = "";

  if (
    text.includes("cabg") ||
    text.includes("heart") ||
    text.includes("cardiac") ||
    text.includes("bypass") ||
    text.includes("valve") ||
    text.includes("chest")
  ) {
    careCategory = "Post-Surgical ICU";
    jobTitle = city
      ? `Experienced ICU Nurse for Post-CABG Cardiac Recovery (${city})`
      : `Experienced ICU Nurse for Post-CABG Cardiac Recovery at Home`;
    minRate = "750";
    maxRate = "900";
    mobilityLevel = "Bedridden";
    activeTasks = [
      "Sterile surgical / wound dressing change",
      "Vitals monitoring (BP, SpO2, Temp, Pulse)",
      "Incentive spirometry supervision (10 breaths/hr)",
      "Medication administration & compliance",
    ];
    certifications = ["BLS", "Cardiac ICU Certified", "PNC Registered Nurse"];
    selectedEquipment = ["Calibrated Digital BP & Pulse Oximeter", "Semi-Fowler Hospital Bed with air mattress"];
    easySummary = `I've prepared a specialized Post-Heart Surgery care plan for your ${relationLabel} with sterile dressing and vital monitoring.`;
  } else if (
    text.includes("dementia") ||
    text.includes("alzheimer") ||
    text.includes("memory") ||
    text.includes("elderly") ||
    text.includes("fall") ||
    text.includes("old age")
  ) {
    careCategory = "Elderly & Geriatric";
    shiftModel = text.includes("24") || text.includes("live-in") ? "Live-in (24h)" : "Day Shift (12h)";
    customHoursPerDay = shiftModel === "Live-in (24h)" ? 24 : 12;
    jobTitle = city
      ? `Compassionate Elder Care & Memory Support Clinician (${city})`
      : `Compassionate Elder Care & Memory Support Clinician`;
    minRate = "600";
    maxRate = "800";
    mobilityLevel = "Semi-ambulatory";
    activeTasks = [
      "Medication administration & compliance",
      "Assisted ambulation & fall risk guarding",
      "Bedsore prevention (Q2H log-roll)",
      "Vitals monitoring (BP, SpO2, Temp, Pulse)",
    ];
    certifications = ["BLS", "Geriatric Care Certified", "PNC Registered Nurse"];
    easySummary = `I've prepared an Elder Care plan with fall prevention and memory support for your ${relationLabel}.`;
  } else if (
    text.includes("trach") ||
    text.includes("pipe") ||
    text.includes("suction") ||
    text.includes("bipap") ||
    text.includes("cpap") ||
    text.includes("respiratory") ||
    text.includes("oxygen")
  ) {
    careCategory = "Respiratory & Trach";
    shiftModel = text.includes("night") ? "Night Shift (12h)" : "Day Shift (12h)";
    jobTitle = city
      ? `Critical Respiratory Nurse for Tracheostomy Care (${city})`
      : `Critical Respiratory Nurse for Tracheostomy Care`;
    minRate = "800";
    maxRate = "1050";
    mobilityLevel = "Bedridden";
    activeTasks = [
      "Tracheostomy closed suctioning & cannula hygiene",
      "Nebulization & chest physiotherapy",
      "Vitals monitoring (BP, SpO2, Temp, Pulse)",
      "Medication administration & compliance",
    ];
    certifications = ["Critical Care / ICU Certification", "BLS", "ACLS", "PNC Registered Nurse"];
    selectedEquipment = ["Oxygen Concentrator (5L/min)", "Suction Machine & sterile catheters", "Nebulizer Machine"];
    easySummary = `I've prepared a Critical Respiratory care plan for your ${relationLabel} with suctioning and oxygen titration.`;
  } else if (
    text.includes("diabetic") ||
    text.includes("ulcer") ||
    text.includes("wound") ||
    text.includes("dressing") ||
    text.includes("sugar") ||
    text.includes("taanke") ||
    text.includes("stitches")
  ) {
    careCategory = "Wound & Diabetic";
    shiftModel = "Hourly Visit (4h)";
    customHoursPerDay = 4;
    jobTitle = city
      ? `Specialist Wound Care Nurse for Sterile Ulcer Dressing (${city})`
      : `Specialist Wound Care Nurse for Sterile Ulcer Dressing`;
    minRate = "650";
    maxRate = "850";
    mobilityLevel = "Semi-ambulatory";
    activeTasks = [
      "Sterile surgical / wound dressing change",
      "Blood glucose & insulin documentation",
      "Vitals monitoring (BP, SpO2, Temp, Pulse)",
    ];
    certifications = ["Wound Care Certified", "BLS", "PNC Registered Nurse"];
    selectedEquipment = ["Digital Glucometer & Strips"];
    easySummary = `I've set up a Sterile Wound & Sugar Management plan for your ${relationLabel}.`;
  } else if (text.includes("knee") || text.includes("hip") || text.includes("fracture") || text.includes("ortho")) {
    careCategory = "Post-Surgical ICU";
    shiftModel = "Day Shift (12h)";
    jobTitle = city
      ? `Orthopedic Recovery Nurse for Post-Joint Surgery (${city})`
      : `Orthopedic Recovery Nurse for Post-Joint Surgery`;
    minRate = "700";
    maxRate = "850";
    mobilityLevel = "Semi-ambulatory";
    activeTasks = [
      "Sterile surgical / wound dressing change",
      "Assisted ambulation & fall risk guarding",
      "Medication administration & compliance",
      "Vitals monitoring (BP, SpO2, Temp, Pulse)",
    ];
    certifications = ["BLS", "PNC Registered Nurse"];
    easySummary = `I've created an Orthopedic recovery plan for your ${relationLabel} for safe walking and surgical wound care.`;
  } else {
    easySummary = `I've started a nursing care plan for your ${relationLabel}.`;
  }

  // Shift timing detection
  if (text.includes("night")) {
    shiftModel = "Night Shift (12h)";
  } else if (text.includes("24") || text.includes("live-in") || text.includes("live in")) {
    shiftModel = "Live-in (24h)";
    customHoursPerDay = 24;
  } else if (text.includes("visit") || text.includes("4h") || text.includes("hourly")) {
    shiftModel = "Hourly Visit (4h)";
    customHoursPerDay = 4;
  }

  // Rate extraction if user specified ₹
  const rateMatch = text.match(/₹?\s*(\d{3,4})\s*(?:-|to)?\s*₹?\s*(\d{3,4})?/);
  if (rateMatch && rateMatch[1]) {
    minRate = rateMatch[1];
    if (rateMatch[2]) maxRate = rateMatch[2];
  }

  // Ask for missing pieces
  const missingPrompts: string[] = [];
  if (!patientAge) {
    missingPrompts.push("their name and approximate age");
  }
  if (!city) {
    missingPrompts.push("which city in Punjab you are in (e.g. Ludhiana, Amritsar, Mohali, Jalandhar)");
  }
  if (!text.includes("day") && !text.includes("night") && !text.includes("24") && !text.includes("live-in") && !text.includes("hour")) {
    missingPrompts.push("whether you prefer 12-hour day shifts, night care, or 24/7 live-in");
  }

  let followUpQuestion = "";
  if (missingPrompts.length > 0) {
    followUpQuestion = `Could you please let me know ${missingPrompts.join(" and ")}?`;
  } else {
    followUpQuestion = "All details are captured! You can review the draft card below and tap Apply & Autofill to complete your job post.";
  }

  const reply = `${easySummary} ${followUpQuestion}`;
  const isComplete = missingPrompts.length === 0;

  return {
    reply,
    isComplete,
    missingFields: missingPrompts,
    extracted: {
      jobTitle,
      patientName: patientName || (patientRelationship === "Self" ? "Self" : `${patientRelationship}`),
      patientAge,
      patientGender,
      patientRelationship,
      mobilityLevel,
      mobilityDirectives:
        mobilityLevel === "Bedridden"
          ? "Full transfer support and 2-hourly repositioning to prevent bedsores."
          : "Supervised walking with aid support and gentle fall prevention.",
      careCategory,
      drugAllergies: "None reported",
      shiftModel,
      customHoursPerDay,
      shiftStartTime: shiftModel.includes("Night") ? "08:00 PM" : "08:00 AM",
      shiftEndTime: shiftModel.includes("Night") ? "08:00 AM" : "08:00 PM",
      startDate: text.includes("tomorrow") ? "Tomorrow" : "Immediate",
      selectedDaysCount: text.includes("14") ? 14 : text.includes("30") ? 30 : 7,
      roomProvided: shiftModel === "Live-in (24h)",
      mealsProvided: true,
      activeTasks,
      certifications,
      selectedEquipment,
      physicianOrders: "Follow scheduled vital checks, administer prescribed medications, and keep clinical log.",
      rateType: "hourly",
      minRate,
      maxRate,
      city,
      locality,
      houseAddress: locality && city ? `${locality}, ${city}` : city || "",
      postalCode,
    },
    source: "local-clinical-engine",
  };
}

/**
 * Normalizes any LLM-extracted schema into strict 4-step wizard parameters
 * with guaranteed Punjab Nursing Council and UI compatibility.
 * Never forces Jalandhar or dummy age if not provided!
 */
function normalizeExtractedJobData(raw: any, prompt: string): ParsedJobData {
  const localFallback = localClinicalParser(prompt).extracted;
  if (!raw || typeof raw !== "object") return localFallback;

  const text = prompt.toLowerCase();

  // 1. Care Category
  let careCategory = raw.careCategory || localFallback.careCategory || "Post-Surgical ICU";
  const catLower = String(careCategory).toLowerCase();
  if (catLower.includes("elder") || catLower.includes("dementia") || catLower.includes("geriatric")) {
    careCategory = "Elderly & Geriatric";
  } else if (catLower.includes("trach") || catLower.includes("respir") || catLower.includes("vent")) {
    careCategory = "Respiratory & Trach";
  } else if (catLower.includes("wound") || catLower.includes("diabet") || catLower.includes("ulcer")) {
    careCategory = "Wound & Diabetic";
  } else if (catLower.includes("palliative") || catLower.includes("cancer") || catLower.includes("oncol")) {
    careCategory = "Palliative & Oncology";
  } else if (catLower.includes("mother") || catLower.includes("infant") || catLower.includes("matern")) {
    careCategory = "Mother & Infant";
  } else {
    careCategory = "Post-Surgical ICU";
  }

  // 2. Mobility Level
  let mobilityLevel: "Bedridden" | "Semi-ambulatory" | "Ambulatory" = "Ambulatory";
  const mobLower = String(raw.mobilityLevel || "").toLowerCase();
  if (mobLower.includes("bed") || mobLower.includes("immobile") || catLower.includes("trach") || catLower.includes("cabg")) {
    mobilityLevel = "Bedridden";
  } else if (mobLower.includes("semi") || mobLower.includes("limit") || mobLower.includes("assist") || catLower.includes("elder") || text.includes("walk")) {
    mobilityLevel = "Semi-ambulatory";
  } else {
    mobilityLevel = "Ambulatory";
  }

  // 3. Shift Model
  let shiftModel = raw.shiftModel || localFallback.shiftModel || "Day Shift (12h)";
  const shiftLower = String(shiftModel).toLowerCase();
  if (shiftLower.includes("24") || shiftLower.includes("live-in")) {
    shiftModel = "Live-in (24h)";
  } else if (shiftLower.includes("night")) {
    shiftModel = "Night Shift (12h)";
  } else if (shiftLower.includes("4h") || shiftLower.includes("visit") || shiftLower.includes("hour")) {
    shiftModel = "Hourly Visit (4h)";
  } else {
    shiftModel = "Day Shift (12h)";
  }

  // 4. City & Locality (NEVER force Jalandhar!)
  let city = raw.city ? String(raw.city).trim() : (localFallback.city || "");
  const cityLower = city.toLowerCase();
  if (cityLower.includes("ludhiana")) city = "Ludhiana";
  else if (cityLower.includes("amritsar")) city = "Amritsar";
  else if (cityLower.includes("mohali") || cityLower.includes("chandigarh")) city = "Mohali / Chandigarh";
  else if (cityLower.includes("jalandhar")) city = "Jalandhar";
  else if (cityLower.includes("bathinda")) city = "Bathinda";
  else if (cityLower.includes("patiala")) city = "Patiala";

  let locality = raw.locality || localFallback.locality || "";

  // 5. Rates
  let minRate = String(raw.minRate || localFallback.minRate || "700").replace(/[^0-9]/g, "");
  let maxRate = String(raw.maxRate || localFallback.maxRate || "900").replace(/[^0-9]/g, "");
  if (!minRate) minRate = "700";
  if (!maxRate) maxRate = "900";

  // 6. Patient details (DO NOT force 68 if unstated!)
  let patientGender = raw.patientGender || localFallback.patientGender || "Male";
  let patientRelationship = raw.patientRelationship || localFallback.patientRelationship || "Parent";
  let patientAge = raw.patientAge ? String(raw.patientAge).replace(/[^0-9]/g, "") : (localFallback.patientAge || "");
  let patientName = raw.patientName && raw.patientName !== "Unknown" && raw.patientName !== "Patient" && raw.patientName !== "Self"
    ? raw.patientName
    : (localFallback.patientName || `${patientRelationship}`);

  // 7. Active Tasks
  let activeTasks = Array.isArray(raw.activeTasks) && raw.activeTasks.length > 0
    ? raw.activeTasks
    : localFallback.activeTasks || [
        "Vitals monitoring (BP, SpO2, Temp, Pulse)",
        "Medication administration & compliance",
      ];

  // 8. Certifications
  let certifications = Array.isArray(raw.certifications) && raw.certifications.length > 0
    ? raw.certifications
    : localFallback.certifications || ["BLS", "PNC Registered Nurse"];

  return {
    jobTitle: raw.jobTitle || localFallback.jobTitle || (city ? `Clinical Care Specialist (${city})` : `Dedicated Clinical Care Specialist`),
    patientName,
    patientAge,
    patientGender,
    patientRelationship,
    mobilityLevel,
    mobilityDirectives: raw.mobilityDirectives || localFallback.mobilityDirectives || "Assist gently with transfers and fall prevention.",
    careCategory,
    drugAllergies: raw.drugAllergies || "None reported",
    shiftModel,
    customHoursPerDay: shiftModel === "Live-in (24h)" ? 24 : shiftModel === "Hourly Visit (4h)" ? 4 : 12,
    shiftStartTime: shiftModel === "Night Shift (12h)" ? "08:00 PM" : "08:00 AM",
    shiftEndTime: shiftModel === "Night Shift (12h)" ? "08:00 AM" : "08:00 PM",
    startDate: raw.startDate || localFallback.startDate || "Tomorrow",
    selectedDaysCount: raw.selectedDaysCount || 7,
    roomProvided: shiftModel === "Live-in (24h)",
    mealsProvided: true,
    activeTasks,
    certifications,
    selectedEquipment: raw.selectedEquipment || localFallback.selectedEquipment || ["Calibrated Digital BP & Pulse Oximeter"],
    physicianOrders: raw.physicianOrders || localFallback.physicianOrders || "Maintain vitals log and administer scheduled medications.",
    rateType: "hourly",
    minRate,
    maxRate,
    city,
    locality,
    houseAddress: raw.houseAddress || (locality && city ? `${locality}, ${city}` : city || ""),
    postalCode: raw.postalCode || localFallback.postalCode || (city === "Ludhiana" ? "141001" : city === "Amritsar" ? "143001" : city === "Mohali / Chandigarh" ? "160062" : "144001"),
  };
}

/**
 * Call Groq LPU API with conversational chat history.
 * Seamlessly tries gpt-oss-120b -> gpt-oss-20b -> qwen3.8-27b -> local clinical engine.
 */
export async function parseCareRequestWithGroq(
  userPrompt: string,
  history: { role: "user" | "assistant"; content: string }[] = []
): Promise<GroqParseResult> {
  const trimmed = userPrompt.trim();
  if (!trimmed) {
    return localClinicalParser("post-op recovery care needed");
  }

  // If no Groq API Key, immediately use robust local parser
  if (!GROQ_API_KEY || GROQ_API_KEY.includes("your-api-key")) {
    return localClinicalParser(trimmed);
  }

  const messagesPayload = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: trimmed },
  ];

  const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL, TERTIARY_MODEL];

  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: messagesPayload,
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 1200,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawContent = data?.choices?.[0]?.message?.content;
        if (rawContent) {
          const parsed = JSON.parse(rawContent);
          if (parsed && (parsed.reply || parsed.extracted)) {
            const rawExtracted = parsed.extracted || parsed;
            const normalized = normalizeExtractedJobData(rawExtracted, trimmed);

            const hasAge = Boolean(normalized.patientAge && normalized.patientAge.trim().length > 0);
            const hasCity = Boolean(normalized.city && normalized.city.trim().length > 0);
            const hasShift = Boolean(
              normalized.shiftModel &&
              !normalized.shiftModel.toLowerCase().includes("not set") &&
              !normalized.shiftModel.toLowerCase().includes("hours not set")
            );
            const isComplete = Boolean(
              parsed.isComplete !== undefined ? parsed.isComplete : (hasAge && hasCity && hasShift)
            );

            const missingFields: string[] = Array.isArray(parsed.missingFields) ? parsed.missingFields : [];
            if (!hasAge && !missingFields.includes("patientAge")) missingFields.push("patientAge");
            if (!hasCity && !missingFields.includes("city")) missingFields.push("city");
            if (!hasShift && !missingFields.includes("shiftTiming")) missingFields.push("shiftTiming");

            return {
              reply: parsed.reply || "I have analyzed your clinical care requirements.",
              extracted: normalized,
              isComplete,
              missingFields,
              source: `groq-${model}`,
            };
          }
        }
      } else {
        console.warn(`Groq model ${model} responded with HTTP ${response.status}`);
      }
    } catch (modelErr) {
      console.warn(`Groq model ${model} request warning:`, modelErr);
    }
  }

  // Graceful fallback to intelligent local clinical engine
  return localClinicalParser(trimmed);
}
