import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  KioskShell,
  KioskStatePanel,
  LanguageSelector,
  StepProgress,
} from "../components/kiosk";
import { normalizePhone } from "../lib/phone";
import { analyzeSymptoms } from "../services/aiService";
import { getPatientAccountOverview } from "../services/patientHistoryService";
import { savePatientIntake } from "../services/patientService";
import type { SavedPatientIntake } from "../types/patient";

type VoiceField = "fullName" | "age" | "gender" | "phone" | "symptomInput";
type VoiceStage = VoiceField | "review";
type Language = "en" | "hi";
type VisitPatientMode = "self" | "other";

type VoiceFormState = {
  fullName: string;
  age: string;
  gender: string;
  phone: string;
  symptomInput: string;
};

type VoiceFormErrors = Partial<Record<keyof VoiceFormState, string>>;

type ChatMessage = {
  id: string;
  sender: "agent" | "patient";
  text: string;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  onresult:
    | null
    | ((event: {
        results: ArrayLike<{
          [index: number]: {
            transcript: string;
            confidence?: number;
          };
          length: number;
          isFinal: boolean;
        }>;
      }) => void);
  onerror: null | ((event?: { error?: string }) => void);
  onend: null | (() => void);
};

const initialFormState: VoiceFormState = {
  fullName: "",
  age: "",
  gender: "",
  phone: "",
  symptomInput: "",
};

const orderedFields: VoiceField[] = [
  "fullName",
  "age",
  "gender",
  "phone",
  "symptomInput",
];
const genderOptions = ["Male", "Female", "Transgender"];

const LANGUAGE_STORAGE_KEY = "preferredKioskLanguage";

const speechLanguage: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
};

function getStoredLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLanguage === "hi" ? "hi" : "en";
}

function getStoredVisitPatientMode(): VisitPatientMode {
  return localStorage.getItem("visitPatientMode") === "other" ? "other" : "self";
}

function getStoredPatientPhone(visitMode: VisitPatientMode = getStoredVisitPatientMode()) {
  if (visitMode === "other") {
    return "";
  }

  const storedValue = localStorage.getItem("patientAccountLookup")?.trim() ?? "";
  const phone = normalizePhone(storedValue);

  if (storedValue.toUpperCase().startsWith("PAT-") || phone.length < 10) {
    return "";
  }

  return phone;
}

function getInitialFormState(
  visitMode: VisitPatientMode = getStoredVisitPatientMode(),
): VoiceFormState {
  return {
    ...initialFormState,
    phone: getStoredPatientPhone(visitMode),
  };
}

const voiceCopy = {
  en: {
    shell: {
      eyebrow: "AI intake assistant",
      title: "AI intake assistant is listening.",
      subtitle:
        "Answer one question at a time. The patient form stays open on the right for review.",
      touchLink: "Use touch instead",
    },
    voiceSteps: ["Name", "Age", "Gender", "Phone", "Symptoms"],
    fieldLabels: {
      fullName: "Full name",
      age: "Age",
      gender: "Gender",
      phone: "Phone",
      symptomInput: "Symptoms",
    },
    prompts: {
      fullName:
        "Namaste. Welcome to hospital check-in. Please tell me the patient's full name.",
      age: "Thank you. Please tell me the patient's age in years.",
      gender:
        "Please select the patient's gender in the form: male, female, or transgender.",
      phone: "Please tell me the phone number for OPD token updates.",
      symptomInput:
        "Please describe the main health concern. Include where it hurts, how long it has been happening, and anything that makes it better or worse.",
    },
    status: {
      processing: "Processing intake",
      listening: "Listening",
      speaking: "Speaking",
      ready: "Ready",
    },
    messages: {
      capturedPrefix: "Captured. ",
      reviewCaptured:
        "I have captured the intake details. Please review the form on the right. If everything looks correct, tap Analyze and Save Intake.",
      reviewPrompt:
        "Please review the captured details. You can edit anything manually, or tap Analyze and Save Intake.",
      reviewBeforeContinuing:
        "Please review the captured details before continuing.",
      reviewThenSave:
        "Please review the intake form on the right, then tap Analyze and Save Intake.",
      fixBeforeSaving: "Please fix the highlighted details before saving intake.",
      saving:
        "Thank you. I am analyzing the symptoms and saving the intake record now.",
      saved:
        "Intake saved. I found a recommended specialty. Please review the result.",
      saveFailed:
        "I could not save the intake. Please check the message on screen.",
      aiAnalysisFailed: "AI analysis failed. Please try again.",
      emptyTranscript: "I could not hear that clearly. Please try again.",
      symptomReviewHint:
        "I heard this as a urinary symptom. If you meant vomiting or ulti, please say it again in Hindi mode or edit the symptom field.",
      echoIgnored:
        "I ignored my own voice. Please answer after the listening indicator turns on.",
      recognitionUnavailable:
        "Browser speech recognition is unavailable here. Use touch registration or edit the fields manually.",
      recognitionStopped:
        "Voice capture stopped. Please try again or edit manually.",
      microphoneFailed:
        "The microphone could not start. Please allow microphone access and try again.",
      languageChanged: "English mode selected. I will continue in English.",
    },
    validation: {
      fullNameRequired: "Please capture the patient's full name.",
      fullNameShort: "Name should be at least 2 characters.",
      ageRequired: "Please capture the patient's age.",
      ageInvalid: "Enter a valid age between 1 and 120.",
      genderRequired: "Please capture the patient's gender.",
      phoneRequired: "Please capture a phone number.",
      phoneInvalid: "Enter a valid phone number with 10 to 15 digits.",
      symptomsRequired: "Please capture the main symptom note.",
      symptomsShort: "Add a little more symptom detail before continuing.",
    },
    ui: {
      liveBoardEyebrow: "Live intake board",
      liveBoardTitle: "Edit anything while the agent speaks.",
      doneCount: "Done",
      fieldsCount: "Fields",
      done: "Done",
      pending: "Pending",
      symptomPlaceholder: "Symptoms will appear here...",
      fieldPlaceholderSuffix: "will appear here...",
      intakeSaved: "Intake saved",
      patientCodeReady: "Patient code",
      isReady: "is ready.",
      back: "Back to welcome",
      submitIdle: "Analyze and Save Intake",
      submitBusy: "Analyzing and saving...",
      agentEyebrow: "AI agent",
      start: "Start",
      tapToTalk: "Tap to talk",
      voiceCheckIn: "Voice check-in",
      chat: "Chat",
      reviewChatPlaceholder: "Write your problem or update a detail...",
      enterPrefix: "Enter",
      send: "Send",
      speechUnavailableTitle: "Speech recognition unavailable",
      speechUnavailableBody:
        "Use Chrome or Edge for voice capture, or continue with touch registration.",
      repeat: "Repeat",
      skip: "Skip",
      stopVoice: "Stop Voice",
      finalReview: "Final review",
      stepLabel: "Step",
    },
  },
  hi: {
    shell: {
      eyebrow: "AI वॉइस रिसेप्शनिस्ट",
      title: "AI रिसेप्शनिस्ट सुन रही है।",
      subtitle:
        "बाईं तरफ वॉइस और चैट से बात करें। दाईं तरफ मरीज का फॉर्म खुला रहेगा ताकि आप बदलाव कर सकें।",
      touchLink: "टच से भरें",
    },
    voiceSteps: ["नाम", "उम्र", "लिंग", "फोन", "लक्षण"],
    fieldLabels: {
      fullName: "पूरा नाम",
      age: "उम्र",
      gender: "लिंग",
      phone: "फोन",
      symptomInput: "लक्षण",
    },
    prompts: {
      fullName:
        "नमस्ते। हॉस्पिटल चेक-इन में आपका स्वागत है। कृपया मरीज का पूरा नाम बताएं।",
      age: "धन्यवाद। कृपया मरीज की उम्र सालों में बताएं।",
      gender:
        "कृपया मरीज का लिंग चुनें: पुरुष, महिला, या ट्रांसजेंडर।",
      phone: "कृपया OPD टोकन अपडेट के लिए फोन नंबर बताएं।",
      symptomInput:
        "कृपया मुख्य स्वास्थ्य समस्या बताएं। कहां दर्द है, कितने समय से है, और किससे बेहतर या खराब होता है, यह भी बताएं।",
    },
    status: {
      processing: "इनटेक प्रोसेस हो रहा है",
      listening: "सुन रही है",
      speaking: "बोल रही है",
      ready: "तैयार",
    },
    messages: {
      capturedPrefix: "दर्ज हो गया। ",
      reviewCaptured:
        "मैंने इनटेक विवरण दर्ज कर लिए हैं। कृपया दाईं तरफ फॉर्म जांचें। सब सही हो तो विश्लेषण करें और इनटेक सेव करें दबाएं।",
      reviewPrompt:
        "कृपया दर्ज की गई जानकारी जांचें। आप कुछ भी मैन्युअली एडिट कर सकते हैं या विश्लेषण करें और इनटेक सेव करें दबा सकते हैं।",
      reviewBeforeContinuing:
        "आगे बढ़ने से पहले कृपया दर्ज की गई जानकारी जांचें।",
      reviewThenSave:
        "कृपया दाईं तरफ इनटेक फॉर्म जांचें, फिर विश्लेषण करें और इनटेक सेव करें दबाएं।",
      fixBeforeSaving: "सेव करने से पहले कृपया हाइलाइट की गई जानकारी ठीक करें।",
      saving:
        "धन्यवाद। मैं अब लक्षणों का विश्लेषण करके इनटेक रिकॉर्ड सेव कर रही हूं।",
      saved:
        "इनटेक सेव हो गया। मैंने सुझाई गई स्पेशलिटी ढूंढ ली है। कृपया परिणाम देखें।",
      saveFailed:
        "मैं इनटेक सेव नहीं कर पाई। कृपया स्क्रीन पर दिखा संदेश देखें।",
      aiAnalysisFailed: "AI विश्लेषण असफल रहा। कृपया फिर कोशिश करें।",
      emptyTranscript: "मुझे साफ सुनाई नहीं दिया। कृपया फिर से बोलें।",
      symptomReviewHint:
        "मुझे यह पेशाब से जुड़ी समस्या जैसा सुनाई दिया। अगर आप उल्टी कहना चाहते थे, तो हिंदी मोड में फिर से बोलें या लक्षण फील्ड एडिट करें।",
      echoIgnored:
        "मैंने अपनी आवाज को अनदेखा किया। कृपया लिसनिंग इंडिकेटर चालू होने के बाद जवाब दें।",
      recognitionUnavailable:
        "इस ब्राउज़र में स्पीच रिकग्निशन उपलब्ध नहीं है। टच रजिस्ट्रेशन इस्तेमाल करें या फील्ड्स मैन्युअली एडिट करें।",
      recognitionStopped:
        "वॉइस कैप्चर रुक गया। कृपया फिर कोशिश करें या मैन्युअली एडिट करें।",
      microphoneFailed:
        "माइक्रोफोन शुरू नहीं हो पाया। कृपया माइक्रोफोन अनुमति दें और फिर कोशिश करें।",
      languageChanged: "हिंदी मोड चुना गया है। मैं अब हिंदी में बात करूंगी।",
    },
    validation: {
      fullNameRequired: "कृपया मरीज का पूरा नाम दर्ज करें।",
      fullNameShort: "नाम कम से कम 2 अक्षरों का होना चाहिए।",
      ageRequired: "कृपया मरीज की उम्र दर्ज करें।",
      ageInvalid: "1 से 120 के बीच सही उम्र दर्ज करें।",
      genderRequired: "कृपया मरीज का लिंग दर्ज करें।",
      phoneRequired: "कृपया फोन नंबर दर्ज करें।",
      phoneInvalid: "10 से 15 अंकों वाला सही फोन नंबर दर्ज करें।",
      symptomsRequired: "कृपया मुख्य लक्षण दर्ज करें।",
      symptomsShort: "आगे बढ़ने से पहले लक्षणों की थोड़ी और जानकारी दें।",
    },
    ui: {
      liveBoardEyebrow: "लाइव इनटेक बोर्ड",
      liveBoardTitle: "AI बोलते समय आप कुछ भी एडिट कर सकते हैं।",
      doneCount: "पूरे",
      fieldsCount: "फील्ड्स",
      done: "पूरा",
      pending: "बाकी",
      symptomPlaceholder: "लक्षण यहां दिखेंगे...",
      fieldPlaceholderSuffix: "यहां दिखेगा...",
      intakeSaved: "इनटेक सेव हो गया",
      patientCodeReady: "मरीज कोड",
      isReady: "तैयार है।",
      back: "वेलकम पर वापस जाएं",
      submitIdle: "विश्लेषण करें और इनटेक सेव करें",
      submitBusy: "विश्लेषण और सेव हो रहा है...",
      agentEyebrow: "AI एजेंट",
      start: "शुरू करें",
      tapToTalk: "बात करने के लिए टैप करें",
      voiceCheckIn: "वॉइस चेक-इन",
      chat: "चैट",
      reviewChatPlaceholder: "अपनी समस्या लिखें या कोई जानकारी बदलें...",
      enterPrefix: "दर्ज करें",
      send: "भेजें",
      speechUnavailableTitle: "स्पीच रिकग्निशन उपलब्ध नहीं है",
      speechUnavailableBody:
        "वॉइस कैप्चर के लिए Chrome या Edge इस्तेमाल करें, या टच रजिस्ट्रेशन जारी रखें।",
      repeat: "दोहराएं",
      skip: "छोड़ें",
      stopVoice: "वॉइस बंद करें",
      finalReview: "अंतिम जांच",
      stepLabel: "स्टेप",
    },
  },
} satisfies Record<
  Language,
  {
    shell: {
      eyebrow: string;
      title: string;
      subtitle: string;
      touchLink: string;
    };
    voiceSteps: string[];
    fieldLabels: Record<VoiceField, string>;
    prompts: Record<VoiceField, string>;
    status: {
      processing: string;
      listening: string;
      speaking: string;
      ready: string;
    };
    messages: Record<string, string>;
    validation: Record<string, string>;
    ui: Record<string, string>;
  }
>;

const agentEchoMarkers = [
  "updated full name",
  "updated age",
  "updated gender",
  "updated phone",
  "updated symptoms",
  "current question is",
  "please tell me",
  "please describe",
  "please review",
  "captured",
  "namaste welcome",
  "i have captured",
  "intake saved",
  "analyzing the symptoms",
  "could not save",
  "कृपया",
  "बताएं",
  "दर्ज हो गया",
  "इनटेक",
  "हिंदी मोड",
];

function getSpeechRecognition() {
  const browserWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function normalizeForEchoCheck(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIndicDigits(value: string) {
  const devanagariDigits = "०१२३४५६७८९";

  return value.replace(/[०-९]/g, (digit) =>
    String(devanagariDigits.indexOf(digit)),
  );
}

function getRecognitionCandidates(event: {
  results: ArrayLike<{
    [index: number]: {
      transcript: string;
      confidence?: number;
    };
    length: number;
  }>;
}) {
  return Array.from(event.results)
    .flatMap((result) =>
      Array.from({ length: result.length }, (_, index) =>
        result[index]?.transcript?.trim() ?? "",
      ),
    )
    .filter(Boolean);
}

function scoreSymptomCandidate(candidate: string) {
  const text = normalizeForEchoCheck(candidate);
  let score = 0;

  if (/\b(vomit|vomiting|nausea|ulti|ultee|ulati|matli)\b/.test(text)) {
    score += 8;
  }

  if (/(उल्टी|उलटी|मतली|जी मिचला)/.test(candidate)) {
    score += 8;
  }

  if (/\b(fever|bukhar|cough|khansi|pain|dard|headache|stomach)\b/.test(text)) {
    score += 3;
  }

  if (/(बुखार|खांसी|दर्द|सिर|पेट|सांस|साँस)/.test(candidate)) {
    score += 3;
  }

  return score;
}

function chooseTranscript(field: VoiceField, candidates: string[]) {
  const usableCandidates = candidates.filter(Boolean);

  if (usableCandidates.length === 0) {
    return "";
  }

  if (field !== "symptomInput") {
    return usableCandidates[0];
  }

  return usableCandidates.reduce((best, candidate) =>
    scoreSymptomCandidate(candidate) > scoreSymptomCandidate(best)
      ? candidate
      : best,
  );
}

function getClinicalSymptomHint(value: string) {
  const normalized = normalizeForEchoCheck(value);

  if (
    /\b(vomit|vomiting|nausea|ulti|ultee|ulati|matli)\b/.test(normalized) ||
    /(उल्टी|उलटी|मतली|जी मिचला)/.test(value)
  ) {
    return "Vomiting / उल्टी";
  }

  if (/\b(fever|bukhar)\b/.test(normalized) || /बुखार/.test(value)) {
    return "Fever / बुखार";
  }

  if (/\b(cough|khansi)\b/.test(normalized) || /खांसी/.test(value)) {
    return "Cough / खांसी";
  }

  if (
    /\b(stomach pain|pet dard|abdominal pain)\b/.test(normalized) ||
    /(पेट.*दर्द|दर्द.*पेट)/.test(value)
  ) {
    return "Stomach pain / पेट दर्द";
  }

  if (
    /\b(headache|sir dard)\b/.test(normalized) ||
    /(सिर.*दर्द|दर्द.*सिर)/.test(value)
  ) {
    return "Headache / सिर दर्द";
  }

  if (
    /\b(breath|breathing|saans|sans)\b/.test(normalized) ||
    /(सांस|साँस)/.test(value)
  ) {
    return "Breathing difficulty / सांस की दिक्कत";
  }

  return null;
}

function normalizeSymptomTranscript(transcript: string) {
  const hint = getClinicalSymptomHint(transcript);

  if (!hint) {
    return transcript;
  }

  return `${hint}. Patient said: ${transcript}`;
}

function isLikelyHindiVomitingMisheard(transcript: string, language: Language) {
  if (language !== "hi") {
    return false;
  }

  const normalized = normalizeForEchoCheck(transcript);
  return (
    /\b(urination|urinating|urine|urinary)\b/.test(normalized) &&
    !getClinicalSymptomHint(transcript)
  );
}

function isLikelyAgentEcho(transcript: string, activePrompt: string) {
  const normalizedTranscript = normalizeForEchoCheck(transcript);
  const normalizedPrompt = normalizeForEchoCheck(activePrompt);

  if (!normalizedTranscript) {
    return false;
  }

  if (
    agentEchoMarkers.some((marker) => normalizedTranscript.includes(marker))
  ) {
    return true;
  }

  return (
    normalizedTranscript.length > 10 &&
    normalizedPrompt.includes(normalizedTranscript)
  );
}

function getFieldIndex(field: VoiceField) {
  return orderedFields.indexOf(field);
}

function getNextField(field: VoiceField, form?: VoiceFormState): VoiceField | null {
  const nextIndex = getFieldIndex(field) + 1;
  const nextFields = orderedFields.slice(nextIndex);

  if (!form) {
    return nextFields[0] ?? null;
  }

  return nextFields.find((nextField) => !form[nextField].trim()) ?? null;
}

function normalizeGender(transcript: string) {
  const text = transcript.toLowerCase();

  if (
    text.includes("trans") ||
    text.includes("transgender") ||
    text.includes("third gender")
  ) {
    return "Transgender";
  }

  if (
    text.includes("prefer") ||
    text.includes("not say") ||
    text.includes("नहीं बताना") ||
    text.includes("बताना नहीं")
  ) {
    return "";
  }

  if (
    text.includes("non") ||
    text.includes("binary") ||
    text.includes("नॉन") ||
    text.includes("बाइनरी")
  ) {
    return "Transgender";
  }

  if (
    text.includes("female") ||
    text.includes("woman") ||
    text.includes("girl") ||
    text.includes("महिला") ||
    text.includes("स्त्री") ||
    text.includes("लड़की") ||
    text.includes("लड़की")
  ) {
    return "Female";
  }

  if (
    text.includes("male") ||
    text.includes("man") ||
    text.includes("boy") ||
    text.includes("पुरुष") ||
    text.includes("आदमी") ||
    text.includes("लड़का") ||
    text.includes("लड़का")
  ) {
    return "Male";
  }

  return transcript.trim();
}

function normalizeTranscript(field: VoiceField, transcript: string) {
  const cleaned = normalizeIndicDigits(transcript).replace(/\s+/g, " ").trim();

  if (field === "age") {
    const ageMatch = cleaned.match(/\d{1,3}/);
    return ageMatch?.[0] ?? cleaned;
  }

  if (field === "gender") {
    return normalizeGender(cleaned);
  }

  if (field === "phone") {
    const digits = cleaned.replace(/\D/g, "");
    return digits.length >= 6 ? digits : cleaned;
  }

  if (field === "symptomInput") {
    return normalizeSymptomTranscript(cleaned);
  }

  return cleaned;
}

function validateForm(
  form: VoiceFormState,
  validation: typeof voiceCopy.en.validation,
) {
  const errors: VoiceFormErrors = {};
  const parsedAge = Number(normalizeIndicDigits(form.age));
  const phoneDigits = normalizePhone(form.phone);

  if (!form.fullName.trim()) {
    errors.fullName = validation.fullNameRequired;
  } else if (form.fullName.trim().length < 2) {
    errors.fullName = validation.fullNameShort;
  }

  if (!form.age.trim()) {
    errors.age = validation.ageRequired;
  } else if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
    errors.age = validation.ageInvalid;
  }

  if (!form.gender.trim()) {
    errors.gender = validation.genderRequired;
  }

  if (!form.phone.trim()) {
    errors.phone = validation.phoneRequired;
  } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    errors.phone = validation.phoneInvalid;
  }

  if (!form.symptomInput.trim()) {
    errors.symptomInput = validation.symptomsRequired;
  } else if (form.symptomInput.trim().length < 12) {
    errors.symptomInput = validation.symptomsShort;
  }

  return errors;
}

function getCurrentStep(stage: VoiceStage) {
  if (stage === "review") {
    return 5;
  }

  return getFieldIndex(stage) + 1;
}

function getStageLabel(
  stage: VoiceStage,
  fieldLabels: Record<VoiceField, string>,
  finalReviewLabel: string,
) {
  return stage === "review" ? finalReviewLabel : fieldLabels[stage];
}

function getStatusLabel(
  isListening: boolean,
  isSpeaking: boolean,
  isSubmitting: boolean,
  statusCopy: typeof voiceCopy.en.status,
) {
  if (isSubmitting) {
    return statusCopy.processing;
  }

  if (isListening) {
    return statusCopy.listening;
  }

  if (isSpeaking) {
    return statusCopy.speaking;
  }

  return statusCopy.ready;
}

function getFirstIncompleteField(form: VoiceFormState): VoiceField {
  return orderedFields.find((field) => !form[field].trim()) ?? "symptomInput";
}

function inferFieldFromChat(message: string, fallback: VoiceField): VoiceField {
  const text = message.toLowerCase();

  if (
    text.includes("phone") ||
    text.includes("mobile") ||
    text.includes("contact") ||
    text.includes("फोन") ||
    text.includes("मोबाइल") ||
    text.includes("संपर्क")
  ) {
    return "phone";
  }

  if (
    text.includes("age") ||
    text.includes("years old") ||
    text.includes("year old") ||
    text.includes("उम्र") ||
    text.includes("साल")
  ) {
    return "age";
  }

  if (
    text.includes("gender") ||
    text.includes("female") ||
    text.includes("male") ||
    text.includes("transgender") ||
    text.includes("लिंग") ||
    text.includes("महिला") ||
    text.includes("पुरुष") ||
    text.includes("ट्रांसजेंडर")
  ) {
    return "gender";
  }

  if (
    text.includes("symptom") ||
    text.includes("concern") ||
    text.includes("pain") ||
    text.includes("fever") ||
    text.includes("cough") ||
    text.includes("breath") ||
    text.includes("vomit") ||
    text.includes("लक्षण") ||
    text.includes("समस्या") ||
    text.includes("दर्द") ||
    text.includes("बुखार") ||
    text.includes("खांसी") ||
    text.includes("सांस") ||
    text.includes("उल्टी")
  ) {
    return "symptomInput";
  }

  if (
    text.includes("name") ||
    text.includes("नाम") ||
    text.startsWith("i am ") ||
    text.startsWith("i'm ") ||
    text.startsWith("patient is ") ||
    text.startsWith("मैं ") ||
    text.startsWith("मेरा नाम ") ||
    text.startsWith("मरीज ")
  ) {
    return "fullName";
  }

  return fallback;
}

function cleanChatValue(field: VoiceField, message: string) {
  const cleaned = normalizeIndicDigits(message).replace(/\s+/g, " ").trim();

  if (field === "fullName") {
    return cleaned
      .replace(
        /^(my name is|name is|patient name is|patient is|i am|i'm|this is|मेरा नाम|नाम|मरीज का नाम|मरीज|मैं)\s+/i,
        "",
      )
      .trim();
  }

  if (field === "phone") {
    const digits = cleaned.replace(/\D/g, "");
    return digits.length >= 6 ? digits : cleaned;
  }

  if (field === "age") {
    return cleaned.match(/\d{1,3}/)?.[0] ?? cleaned;
  }

  if (field === "gender") {
    return normalizeGender(cleaned);
  }

  const symptomText = cleaned
    .replace(
      /^(my symptoms are|symptoms are|symptom is|main concern is|concern is|problem is|मेरे लक्षण|लक्षण|मुख्य समस्या|समस्या|दिक्कत)\s+/i,
      "",
    )
    .trim();

  return normalizeSymptomTranscript(symptomText);
}

export function VoiceRegisterPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const [visitMode, setVisitMode] = useState<VisitPatientMode>(
    getStoredVisitPatientMode,
  );
  const copy = voiceCopy[language];
  const initialVoiceForm = useMemo(
    () => getInitialFormState(visitMode),
    [visitMode],
  );
  const initialVoiceStage = useMemo(
    () => getFirstIncompleteField(initialVoiceForm),
    [initialVoiceForm],
  );
  const [form, setForm] = useState<VoiceFormState>(initialVoiceForm);
  const [errors, setErrors] = useState<VoiceFormErrors>({});
  const [stage, setStage] = useState<VoiceStage>(initialVoiceStage);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: `agent-${initialVoiceStage}-question`,
      sender: "agent",
      text: voiceCopy[getStoredLanguage()].prompts[initialVoiceStage],
    },
  ]);
  const [chatDraft, setChatDraft] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [savedIntake, setSavedIntake] = useState<SavedPatientIntake | null>(
    null,
  );
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const lastSpokenTextRef = useRef("");
  const listenBlockedUntilRef = useRef(0);
  const hasMountedRef = useRef(false);
  const hasPrefilledProfileRef = useRef(false);

  const speechSupported = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return Boolean(getSpeechRecognition());
  }, []);

  const speechOutputSupported = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return "speechSynthesis" in window;
  }, []);

  useEffect(() => {
    localStorage.setItem("visitPatientMode", visitMode);

    if (visitMode === "other" || hasPrefilledProfileRef.current) {
      return;
    }

    const lookup = localStorage.getItem("patientAccountLookup")?.trim();

    if (!lookup || lookup === "walk-in") {
      return;
    }

    hasPrefilledProfileRef.current = true;

    getPatientAccountOverview(lookup)
      .then((account) => {
        const profile = account.latestProfile;

        if (!profile) {
          return;
        }

        const nextForm: VoiceFormState = {
          fullName: profile.full_name,
          age: String(profile.age),
          gender: profile.gender ?? "",
          phone: profile.phone ?? lookup,
          symptomInput: "",
        };
        const nextStage = getFirstIncompleteField(nextForm);
        const welcome =
          nextStage === "symptomInput"
            ? `Welcome back, ${profile.full_name}. I have your OPD profile. Please tell me today's health problem.`
            : `Welcome back, ${profile.full_name}. I found your OPD profile. Please update the missing details.`;

        setForm(nextForm);
        setStage(nextStage);
        setChatMessages([
          {
            id: "agent-returning-patient",
            sender: "agent",
            text: welcome,
          },
        ]);

        if (nextStage === "symptomInput") {
          window.setTimeout(() => {
            void speak(welcome).then(() => startListening("symptomInput"));
          }, 250);
        }
      })
      .catch(() => {
        hasPrefilledProfileRef.current = false;
      });
  }, [visitMode]);

  const handleVisitModeChange = (mode: VisitPatientMode) => {
    localStorage.setItem("visitPatientMode", mode);
    recognitionRef.current?.stop();
    if (speechOutputSupported) {
      window.speechSynthesis.cancel();
    }

    hasPrefilledProfileRef.current = false;
    setVisitMode(mode);
    const nextForm = getInitialFormState(mode);
    const nextStage = getFirstIncompleteField(nextForm);
    setForm(nextForm);
    setStage(nextStage);
    setErrors({});
    setVoiceError(null);
    setSavedIntake(null);
    setIsListening(false);
    setIsSpeaking(false);
    setChatMessages([
      {
        id: `agent-${mode}-${nextStage}-question`,
        sender: "agent",
        text: copy.prompts[nextStage],
      },
    ]);
  };

  useEffect(() => {
    const syncVisitMode = () => {
      const nextMode = getStoredVisitPatientMode();

      if (nextMode !== visitMode) {
        handleVisitModeChange(nextMode);
      }
    };

    window.addEventListener("visit-patient-mode-changed", syncVisitMode);
    window.addEventListener("storage", syncVisitMode);

    return () => {
      window.removeEventListener("visit-patient-mode-changed", syncVisitMode);
      window.removeEventListener("storage", syncVisitMode);
    };
  }, [visitMode]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    recognitionRef.current?.stop();
    if (speechOutputSupported) {
      window.speechSynthesis.cancel();
    }
    setIsListening(false);
    setIsSpeaking(false);
    setVoiceError(null);

    const currentPrompt =
      stage === "review" ? copy.messages.reviewPrompt : copy.prompts[stage];
    void speak(`${copy.messages.languageChanged} ${currentPrompt}`);
  }, [language]);

  const updateField = (field: keyof VoiceFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setVoiceError(null);
    setSavedIntake(null);
  };

  const appendChatMessage = (sender: ChatMessage["sender"], text: string) => {
    setChatMessages((current) => {
      const lastMessage = current[current.length - 1];

      if (lastMessage?.sender === sender && lastMessage.text === text) {
        return current;
      }

      return [
        ...current,
        {
          id: `${sender}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          sender,
          text,
        },
      ].slice(-10);
    });
  };

  const speak = (text: string) => {
    recognitionRef.current?.stop();
    setIsListening(false);
    lastSpokenTextRef.current = text;
    appendChatMessage("agent", text);

    if (!speechOutputSupported) {
      listenBlockedUntilRef.current = Date.now() + 600;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLanguage[language];
      utterance.rate = 0.92;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        listenBlockedUntilRef.current = Date.now() + 700;
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        listenBlockedUntilRef.current = Date.now() + 700;
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  const handleCapturedText = (field: VoiceField, transcript: string) => {
    const normalizedValue = normalizeTranscript(field, transcript);
    const nextForm = {
      ...form,
      [field]: normalizedValue,
    };
    const nextField = getNextField(field, nextForm);

    appendChatMessage("patient", transcript);
    updateField(field, normalizedValue);

    if (field === "symptomInput" && isLikelyHindiVomitingMisheard(transcript, language)) {
      setVoiceError(copy.messages.symptomReviewHint);
      appendChatMessage("agent", copy.messages.symptomReviewHint);
    }

    if (nextField) {
      setStage(nextField);
      window.setTimeout(() => {
        void askAndListen(nextField, copy.messages.capturedPrefix);
      }, 650);
      return;
    }

    setStage("review");
    window.setTimeout(() => {
      void speak(copy.messages.reviewCaptured);
    }, 650);
  };

  const startListening = (field: VoiceField) => {
    if (!speechSupported) {
      setVoiceError(copy.messages.recognitionUnavailable);
      return;
    }

    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      return;
    }

    try {
      recognitionRef.current?.stop();
      const recognition = new Recognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = speechLanguage[language];
      recognition.maxAlternatives = 5;

      recognition.onresult = (event) => {
        const transcript = chooseTranscript(
          field,
          getRecognitionCandidates(event),
        );

        setIsListening(false);

        if (!transcript) {
          setVoiceError(copy.messages.emptyTranscript);
          return;
        }

        if (isLikelyAgentEcho(transcript, lastSpokenTextRef.current)) {
          setVoiceError(copy.messages.echoIgnored);
          return;
        }

        handleCapturedText(field, transcript);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        setVoiceError(
          event?.error
            ? `${copy.messages.recognitionStopped} (${event.error})`
            : copy.messages.recognitionStopped,
        );
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setVoiceError(null);
      window.setTimeout(() => {
        if (Date.now() < listenBlockedUntilRef.current) {
          return;
        }

        setIsListening(true);
        recognition.start();
      }, Math.max(0, listenBlockedUntilRef.current - Date.now()));
    } catch {
      setIsListening(false);
      setVoiceError(copy.messages.microphoneFailed);
    }
  };

  const askAndListen = async (field: VoiceField, prefix = "") => {
    setStage(field);
    setVoiceError(null);
    await speak(`${prefix}${copy.prompts[field]}`);
    await wait(200);
    startListening(field);
  };

  const repeatCurrentQuestion = () => {
    if (stage === "review") {
      void speak(copy.messages.reviewPrompt);
      return;
    }

    void askAndListen(stage);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    if (speechOutputSupported) {
      window.speechSynthesis.cancel();
    }
    setIsListening(false);
    setIsSpeaking(false);
  };

  const skipToNext = () => {
    if (stage === "review") {
      return;
    }

    const nextField = getNextField(stage, form);
    if (!nextField) {
      setStage("review");
      void speak(copy.messages.reviewBeforeContinuing);
      return;
    }

    void askAndListen(nextField);
  };

  const submitChatMessage = (message: string) => {
    if (!message) {
      return;
    }

    const targetField =
      stage === "review"
        ? inferFieldFromChat(message, getFirstIncompleteField(form))
        : stage;
    const normalizedValue = cleanChatValue(targetField, message);

    appendChatMessage("patient", message);
    updateField(targetField, normalizedValue);
    setChatDraft("");

    if (targetField === stage) {
      const nextForm = {
        ...form,
        [targetField]: normalizedValue,
      };
      const nextField = getNextField(targetField, nextForm);

      if (nextField) {
        setStage(nextField);
        window.setTimeout(() => {
          void speak(copy.prompts[nextField]);
        }, 150);
        return;
      }

      setStage("review");
      window.setTimeout(() => {
        void speak(copy.messages.reviewThenSave);
      }, 150);
    }
  };

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitChatMessage(chatDraft.trim());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateForm(form, copy.validation);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setVoiceError(copy.messages.fixBeforeSaving);
      void speak(copy.messages.fixBeforeSaving);
      return;
    }

    setIsSubmitting(true);
    setVoiceError(null);
    await speak(copy.messages.saving);

    try {
      const result = await analyzeSymptoms({
        symptomInput: form.symptomInput,
        age: normalizeIndicDigits(form.age),
        gender: form.gender.trim() || null,
      });

      const savedResult = await savePatientIntake(
        {
          full_name: form.fullName.trim(),
          age: Number(normalizeIndicDigits(form.age)),
          gender: form.gender.trim() || null,
          phone: normalizePhone(form.phone) || null,
          symptom_input: form.symptomInput.trim(),
          input_mode: "voice",
        },
        result,
      );

      setSavedIntake(savedResult);
      localStorage.setItem("latestIntakeResult", JSON.stringify(savedResult));
      await speak(copy.messages.saved);
      navigate("/recommendation", {
        state: {
          intakeResult: savedResult,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : copy.messages.aiAnalysisFailed;
      setVoiceError(message);
      void speak(copy.messages.saveFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = getCurrentStep(stage);
  const statusLabel = getStatusLabel(
    isListening,
    isSpeaking,
    isSubmitting,
    copy.status,
  );
  const completedCount = orderedFields.filter((field) => form[field].trim()).length;
  const recentChatMessages = chatMessages.slice(-4);
  const chatPlaceholder =
    stage === "review"
      ? copy.ui.reviewChatPlaceholder
      : `${copy.ui.enterPrefix} ${copy.fieldLabels[stage].toLowerCase()}...`;

  return (
    <KioskShell
      eyebrow={copy.shell.eyebrow}
      title={copy.shell.title}
      subtitle={copy.shell.subtitle}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <LanguageSelector value={language} onChange={setLanguage} />
          <Link
            to="/register/manual"
            className="inline-flex min-h-12 items-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-brand-900 shadow-sm transition hover:bg-cyan-50"
          >
            {copy.shell.touchLink}
          </Link>
        </div>
      }
    >
      <section className="mb-6 rounded-lg border border-cyan-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-900">
          Who is this new OPD visit for?
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            { label: "Myself", value: "self" },
            { label: "Someone else", value: "other" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                handleVisitModeChange(option.value as VisitPatientMode)
              }
              className={[
                "rounded-lg border px-4 py-3 text-sm font-bold transition",
                visitMode === option.value
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-cyan-50",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Choose Myself to reuse the logged-in patient's saved details. Choose
          Someone else to start a fresh patient intake.
        </p>
      </section>

      <div className="mb-6">
        <StepProgress
          steps={copy.voiceSteps}
          currentStep={currentStep}
          stepLabel={copy.ui.stepLabel}
        />
      </div>

      <div className="mb-6 rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900">
        Voice intake is built for crowded OPD desks: one question at a time,
        form visible beside the assistant, and manual edits available before
        saving.
      </div>

      <div className="voice-kiosk-layout">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-lg border border-cyan-100 bg-white shadow-sm lg:order-2"
        >
          <div className="flex flex-col gap-3 border-b border-cyan-100 bg-gradient-to-r from-white to-cyan-50 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
                <p className="text-sm font-bold uppercase tracking-wide text-brand-700">
                  {copy.ui.liveBoardEyebrow}
                </p>
                <h2 className="mt-2 text-3xl font-bold text-slate-950">
                  {copy.ui.liveBoardTitle}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg border border-white bg-white px-4 py-2 shadow-sm">
                  <p className="text-xl font-black text-brand-900">
                    {completedCount}
                  </p>
                  <p className="text-xs font-bold uppercase text-slate-500">
                    {copy.ui.doneCount}
                </p>
              </div>
              <div className="rounded-lg border border-white bg-white px-4 py-2 shadow-sm">
                <p className="text-xl font-black text-brand-900">
                  {orderedFields.length}
                </p>
                <p className="text-xs font-bold uppercase text-slate-500">
                  {copy.ui.fieldsCount}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:p-6">
            {orderedFields.map((field) => {
              const isActive = stage === field;
              const isComplete = Boolean(form[field].trim());
              const isSymptomField = field === "symptomInput";

              return (
                <label
                  key={field}
                  className={[
                    "block rounded-lg border p-4 transition",
                    isActive
                      ? "border-brand-600 bg-cyan-50 shadow-sm ring-2 ring-cyan-100"
                      : isComplete
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-slate-50",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-bold text-slate-900">
                      {copy.fieldLabels[field]}
                    </span>
                    <span
                      className={[
                        "rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wide",
                        isComplete
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-white text-slate-500",
                      ].join(" ")}
                    >
                      {isComplete ? copy.ui.done : copy.ui.pending}
                    </span>
                  </div>

                  {field === "gender" ? (
                    <select
                      value={form[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      className="mt-3 min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                    >
                      <option value="">Select gender</option>
                      {genderOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : isSymptomField ? (
                    <textarea
                      value={form[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      className="mt-3 min-h-32 w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                      placeholder={copy.ui.symptomPlaceholder}
                    />
                  ) : (
                    <input
                      value={form[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      className="mt-3 min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                      placeholder={`${copy.fieldLabels[field]} ${copy.ui.fieldPlaceholderSuffix}`}
                      inputMode={field === "age" || field === "phone" ? "numeric" : "text"}
                    />
                  )}

                  {errors[field] ? (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      {errors[field]}
                    </p>
                  ) : null}
                </label>
              );
            })}
          </div>

          {savedIntake ? (
            <div className="px-5 pb-5 sm:px-6">
              <KioskStatePanel tone="success" title={copy.ui.intakeSaved}>
                {copy.ui.patientCodeReady} {savedIntake.patient_code}{" "}
                {copy.ui.isReady}
              </KioskStatePanel>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-cyan-100 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <Link
              to="/"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              {copy.ui.back}
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-14 items-center justify-center rounded-lg bg-brand-700 px-7 text-base font-bold text-white shadow-sm transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? copy.ui.submitBusy : copy.ui.submitIdle}
            </button>
          </div>
        </form>

        <aside className="lg:order-1 lg:sticky lg:top-28 lg:self-start">
          <section className="overflow-hidden rounded-lg border border-cyan-100 bg-white shadow-sm">
            <div className="border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase text-brand-700">
                    {copy.ui.agentEyebrow}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {getStageLabel(
                      stage,
                      copy.fieldLabels,
                      copy.ui.finalReview,
                    )}
                  </h2>
                </div>
                <span
                  className={[
                    "rounded-lg border px-3 py-2 text-xs font-black uppercase",
                    isListening
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : isSubmitting
                        ? "border-cyan-200 bg-cyan-50 text-brand-900"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800",
                  ].join(" ")}
                >
                  {statusLabel}
                </span>
              </div>
            </div>

            <div className="p-5">
              <button
                type="button"
                onClick={() =>
                  void askAndListen(stage === "review" ? "fullName" : stage)
                }
                disabled={isListening || isSubmitting}
                className={[
                  "mx-auto flex h-56 w-56 max-w-full flex-col items-center justify-center rounded-full border-8 bg-white text-center shadow-xl transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70",
                  isListening
                    ? "border-amber-300 shadow-amber-100"
                    : isSpeaking
                      ? "border-cyan-300 shadow-cyan-100"
                      : "border-cyan-100 shadow-cyan-50",
                ].join(" ")}
              >
                <span className="text-5xl font-black text-brand-900">AI</span>
                <span className="mt-2 text-sm font-black uppercase tracking-wide text-slate-500">
                  {stage === "fullName" && !form.fullName
                    ? copy.ui.start
                    : copy.ui.tapToTalk}
                </span>
                <span className="mt-1 text-xs font-bold text-slate-500">
                  {copy.ui.voiceCheckIn}
                </span>
              </button>

              <div className="mt-5 flex h-20 items-end gap-1 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-3">
                {[34, 72, 48, 88, 56, 76, 42, 64, 36, 82].map(
                  (height, index) => (
                    <span
                      key={`${height}-${index}`}
                      className={[
                        "flex-1 rounded-t bg-brand-600 transition-all",
                        isListening || isSpeaking
                          ? "animate-pulse opacity-100"
                          : "opacity-35",
                      ].join(" ")}
                      style={{
                        height: `${isListening || isSpeaking ? height : Math.max(18, height - 34)}%`,
                        animationDelay: `${index * 70}ms`,
                      }}
                    />
                  ),
                )}
              </div>

              <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <p className="text-base font-black text-slate-950">
                    {copy.ui.chat}
                  </p>
                  <span
                    className={[
                      "h-3 w-3 rounded-full",
                      isListening
                        ? "bg-amber-400"
                        : isSpeaking
                          ? "bg-cyan-400"
                          : "bg-emerald-400",
                    ].join(" ")}
                  />
                </div>

                <div className="min-h-72 max-h-96 space-y-3 overflow-y-auto bg-slate-50 p-4">
                  {recentChatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={[
                        "flex",
                        message.sender === "patient" ? "justify-end" : "justify-start",
                      ].join(" ")}
                    >
                      <p
                        className={[
                          "max-w-[82%] rounded-lg px-4 py-3 text-base font-semibold leading-6",
                          message.sender === "agent"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "bg-brand-700 text-white shadow-sm",
                        ].join(" ")}
                      >
                        {message.text}
                      </p>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleChatSubmit}
                  className="grid gap-3 border-t border-slate-200 bg-white p-3"
                >
                  <textarea
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    className="min-h-28 w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-base font-semibold leading-7 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                    placeholder={chatPlaceholder}
                  />
                  <button
                    type="submit"
                    className="min-h-12 rounded-lg bg-brand-700 px-5 text-base font-black text-white transition hover:bg-brand-900"
                  >
                    {copy.ui.send}
                  </button>
                </form>
              </div>

              {voiceError ? (
                <div className="mt-4">
                  <KioskStatePanel tone="error">{voiceError}</KioskStatePanel>
                </div>
              ) : null}

              {!speechSupported ? (
                <div className="mt-4">
                  <KioskStatePanel
                    tone="warning"
                    title={copy.ui.speechUnavailableTitle}
                  >
                    {copy.ui.speechUnavailableBody}
                  </KioskStatePanel>
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={repeatCurrentQuestion}
                  disabled={isListening || isSubmitting}
                  className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {copy.ui.repeat}
                </button>
                <button
                  type="button"
                  onClick={skipToNext}
                  disabled={stage === "review" || isListening || isSubmitting}
                  className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {copy.ui.skip}
                </button>
                <button
                  type="button"
                  onClick={stopVoice}
                  className="col-span-2 min-h-12 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white transition hover:bg-slate-700"
                >
                  {copy.ui.stopVoice}
                </button>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </KioskShell>
  );
}
