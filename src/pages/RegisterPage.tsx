import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { KioskShell, KioskStatePanel, StepProgress } from "../components/kiosk";
import { normalizePhone } from "../lib/phone";
import { analyzeSymptoms } from "../services/aiService";
import { getPatientAccountOverview } from "../services/patientHistoryService";
import { savePatientIntake } from "../services/patientService";
import type { AIIntakeResult } from "../types/ai";
import type { SavedPatientIntake } from "../types/patient";

type InputMode = "text" | "voice";
type VisitPatientMode = "self" | "other";

type IntakeFormState = {
  fullName: string;
  age: string;
  gender: string;
  phone: string;
  symptomInput: string;
  inputMode: InputMode;
};

type IntakeFormErrors = Partial<Record<keyof IntakeFormState, string>>;

type PreferredDoctorContext = {
  doctor_id: string;
  doctor_name: string;
  specialty_id: string;
  specialty_name: string;
};

type RegisterLocationState = {
  preferredDoctorContext?: PreferredDoctorContext;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult:
    | null
    | ((event: {
        results: ArrayLike<{
          0: {
            transcript: string;
          };
          isFinal: boolean;
        }>;
      }) => void);
  onerror: null | (() => void);
  onend: null | (() => void);
};

const initialFormState: IntakeFormState = {
  fullName: "",
  age: "",
  gender: "",
  phone: "",
  symptomInput: "",
  inputMode: "text",
};

const genderOptions = ["Male", "Female", "Transgender"];
const intakeSteps = ["Name", "Age", "Gender", "Phone", "Symptoms"];

const symptomPrompts = [
  "Where is the discomfort?",
  "How long has it been happening?",
  "What makes it better or worse?",
];

function getSpeechRecognition() {
  const browserWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
}

function validateForm(form: IntakeFormState) {
  const errors: IntakeFormErrors = {};
  const trimmedName = form.fullName.trim();
  const trimmedSymptoms = form.symptomInput.trim();
  const parsedAge = Number(form.age);
  const phoneDigits = normalizePhone(form.phone);

  if (!trimmedName) {
    errors.fullName = "Enter the patient's full name.";
  } else if (trimmedName.length < 2) {
    errors.fullName = "Name should be at least 2 characters.";
  }

  if (!form.age.trim()) {
    errors.age = "Enter the patient's age.";
  } else if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
    errors.age = "Enter a valid age between 1 and 120.";
  }

  if (!form.gender) {
    errors.gender = "Select a gender option.";
  }

  if (!form.phone.trim()) {
    errors.phone = "Enter a phone number for OPD token updates.";
  } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    errors.phone = "Enter a valid phone number with 10 to 15 digits.";
  }

  if (!trimmedSymptoms) {
    errors.symptomInput = "Describe the symptoms before continuing.";
  } else if (trimmedSymptoms.length < 12) {
    errors.symptomInput = "Add a little more detail so AI can route this safely.";
  }

  return errors;
}

function isPreferredDoctorContext(
  value: unknown,
): value is PreferredDoctorContext {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PreferredDoctorContext>;

  return (
    typeof candidate.doctor_id === "string" &&
    typeof candidate.doctor_name === "string" &&
    typeof candidate.specialty_id === "string" &&
    typeof candidate.specialty_name === "string"
  );
}

function getStoredPreferredDoctorContext() {
  const storedValue = localStorage.getItem("preferredDoctorContext");

  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue);
    return isPreferredDoctorContext(parsed) ? parsed : null;
  } catch {
    return null;
  }
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
): IntakeFormState {
  return {
    ...initialFormState,
    phone: getStoredPatientPhone(visitMode),
  };
}

function getCurrentStep(form: IntakeFormState) {
  if (!form.fullName.trim()) {
    return 1;
  }
  if (!form.age.trim()) {
    return 2;
  }
  if (!form.gender) {
    return 3;
  }
  if (!form.phone.trim()) {
    return 4;
  }
  return 5;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as RegisterLocationState | null;
  const [visitMode, setVisitMode] = useState<VisitPatientMode>(
    getStoredVisitPatientMode,
  );
  const [form, setForm] = useState<IntakeFormState>(() =>
    getInitialFormState(visitMode),
  );
  const [errors, setErrors] = useState<IntakeFormErrors>({});
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIIntakeResult | null>(
    null,
  );
  const [savedIntake, setSavedIntake] = useState<SavedPatientIntake | null>(
    null,
  );
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const hasPrefilledProfileRef = useRef(false);

  const preferredDoctorContext = useMemo(() => {
    if (isPreferredDoctorContext(locationState?.preferredDoctorContext)) {
      return locationState.preferredDoctorContext;
    }

    return getStoredPreferredDoctorContext();
  }, [locationState?.preferredDoctorContext]);

  const currentStep = getCurrentStep(form);

  const speechSupported = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return Boolean(getSpeechRecognition());
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
        if (!account.latestProfile) {
          return;
        }

        setForm((current) => ({
          ...current,
          fullName: current.fullName || account.latestProfile?.full_name || "",
          age: current.age || String(account.latestProfile?.age ?? ""),
          gender: current.gender || account.latestProfile?.gender || "",
          phone: current.phone || account.latestProfile?.phone || lookup,
        }));
      })
      .catch(() => {
        hasPrefilledProfileRef.current = false;
      });
  }, [visitMode]);

  const handleVisitModeChange = (mode: VisitPatientMode) => {
    setVisitMode(mode);
    localStorage.setItem("visitPatientMode", mode);
    hasPrefilledProfileRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setErrors({});
    setVoiceMessage(null);
    setAnalysisError(null);
    setAnalysisResult(null);
    setSavedIntake(null);
    setForm(getInitialFormState(mode));
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

  const updateField = (field: keyof IntakeFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setAnalysisError(null);
    setAnalysisResult(null);
    setSavedIntake(null);
  };

  const setInputMode = (inputMode: InputMode) => {
    setForm((current) => ({
      ...current,
      inputMode,
    }));
    setAnalysisError(null);
    setSavedIntake(null);
  };

  const toggleVoiceInput = () => {
    if (!speechSupported) {
      setVoiceMessage(
        "Voice input is not supported in this browser. Text input is ready.",
      );
      setInputMode("text");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();

      setForm((current) => ({
        ...current,
        inputMode: "voice",
        symptomInput: transcript,
      }));
      setErrors((current) => ({
        ...current,
        symptomInput: undefined,
      }));
      setVoiceMessage("Listening captured your symptom note. You can edit it.");
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceMessage("Voice input stopped. You can continue by typing.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setInputMode("voice");
    setVoiceMessage("Listening now. Speak clearly for a short symptom note.");
    setIsListening(true);
    recognition.start();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setAnalysisError(null);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setSavedIntake(null);

    try {
      const result = await analyzeSymptoms({
        symptomInput: form.symptomInput,
        age: form.age,
        gender: form.gender || null,
      });

      const savedResult = await savePatientIntake(
        {
          full_name: form.fullName.trim(),
          age: Number(form.age),
          gender: form.gender || null,
          phone: normalizePhone(form.phone) || null,
          symptom_input: form.symptomInput.trim(),
          input_mode: form.inputMode,
        },
        result,
      );

      setAnalysisResult(result);
      setSavedIntake(savedResult);
      localStorage.setItem("latestIntakeResult", JSON.stringify(savedResult));
      navigate("/recommendation", {
        state: {
          intakeResult: savedResult,
        },
      });
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "AI analysis failed. Please try again.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <KioskShell
      eyebrow="Register by touch"
      title="Tell us what brings you in today."
      subtitle="Use large touch-friendly fields. You can use voice just for symptoms, then review before continuing."
      actions={
        <Link
          to="/register/voice"
          className="inline-flex min-h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-brand-900 shadow-sm transition hover:bg-cyan-50"
        >
          Try voice mode
        </Link>
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
        <StepProgress steps={intakeSteps} currentStep={currentStep} />
      </div>

      <div className="mb-6 rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900">
        Intake creates a structured OPD visit record. The AI uses age, gender,
        and symptoms to suggest the department; the patient can still edit every
        field before saving.
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <aside className="space-y-5">
          <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=900&q=80"
              alt="Hospital care team preparing a patient intake workflow"
              className="h-56 w-full object-cover"
            />
            <div className="p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-brand-700">
                Guided intake
              </p>
              <p className="mt-3 text-2xl font-bold text-slate-950">
                We will route you to the right specialty.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                AI only summarizes symptoms and recommends a department. A doctor
                will review the patient during consultation.
              </p>
            </div>
          </div>

          {preferredDoctorContext ? (
            <KioskStatePanel title="Doctor request started">
              OPD token request started for {preferredDoctorContext.doctor_name}.
              Complete intake first so AI can confirm the safest specialty.
            </KioskStatePanel>
          ) : null}

          <KioskStatePanel title="What happens next">
            AI reviews the symptom note, saves the intake record, then shows a
            specialty recommendation before doctor selection.
          </KioskStatePanel>
        </aside>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-3xl border border-white/80 bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-base font-bold text-slate-900">
                Patient full name
              </span>
              <input
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                className="mt-3 min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-lg font-semibold text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                placeholder="Rahul Kumar"
                autoComplete="name"
              />
              {errors.fullName ? (
                <p className="mt-2 text-sm font-semibold text-red-600">
                  {errors.fullName}
                </p>
              ) : null}
            </label>

            <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-base font-bold text-slate-900">Age</span>
              <input
                value={form.age}
                onChange={(event) => updateField("age", event.target.value)}
                className="mt-3 min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-lg font-semibold text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                placeholder="32"
                inputMode="numeric"
              />
              {errors.age ? (
                <p className="mt-2 text-sm font-semibold text-red-600">
                  {errors.age}
                </p>
              ) : null}
            </label>
          </div>

          <label className="mt-5 block rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-base font-bold text-slate-900">Gender</span>
            <select
              value={form.gender}
              onChange={(event) => updateField("gender", event.target.value)}
              className="mt-3 min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-lg font-semibold text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
            >
              <option value="">Select gender</option>
              {genderOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.gender ? (
              <p className="mt-2 text-sm font-semibold text-red-600">
                {errors.gender}
              </p>
            ) : null}
          </label>

          <label className="mt-5 block rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-base font-bold text-slate-900">
              Phone number
            </span>
            <input
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className="mt-3 min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-lg font-semibold text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
              placeholder="+91 98765 43210"
              autoComplete="tel"
              inputMode="tel"
            />
            {errors.phone ? (
              <p className="mt-2 text-sm font-semibold text-red-600">
                {errors.phone}
              </p>
            ) : null}
          </label>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-base font-bold text-slate-900">
                  Symptoms or main concern
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Type the concern or use the microphone shortcut.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={[
                  "inline-flex min-h-12 w-fit items-center rounded-2xl px-5 text-sm font-bold transition",
                  isListening
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-slate-900 text-white hover:bg-slate-700",
                ].join(" ")}
              >
                {isListening ? "Stop listening" : "Use voice"}
              </button>
            </div>

            <textarea
              value={form.symptomInput}
              onChange={(event) =>
                updateField("symptomInput", event.target.value)
              }
              className="mt-4 min-h-44 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-4 text-lg leading-8 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
              placeholder="Example: I have knee pain for 5 days and it gets worse while walking."
            />
            {errors.symptomInput ? (
              <p className="mt-2 text-sm font-semibold text-red-600">
                {errors.symptomInput}
              </p>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {symptomPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() =>
                    updateField(
                      "symptomInput",
                      `${form.symptomInput}${form.symptomInput ? "\n" : ""}${prompt} `,
                    )
                  }
                  className="min-h-14 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-bold text-slate-700 transition hover:border-brand-600 hover:bg-cyan-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <p className="mt-4 text-sm font-medium text-slate-600">
              {speechSupported
                ? voiceMessage ?? "Voice support detected in this browser."
                : "Voice is unavailable here. Text input is fully supported."}
            </p>
          </div>

          {analysisError ? (
            <div className="mt-5">
              <KioskStatePanel tone="error">{analysisError}</KioskStatePanel>
            </div>
          ) : null}

          {analysisResult || savedIntake ? (
            <div className="mt-5">
              <KioskStatePanel tone="success" title="Intake saved">
                The patient intake was saved and the recommendation page is
                opening.
              </KioskStatePanel>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Back to welcome
            </Link>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-brand-700 px-7 text-base font-bold text-white shadow-sm transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isAnalyzing ? "Analyzing and saving..." : "Continue to AI review"}
            </button>
          </div>
        </form>
      </div>
    </KioskShell>
  );
}
