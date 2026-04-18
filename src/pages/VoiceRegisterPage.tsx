import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KioskShell, KioskStatePanel, StepProgress } from "../components/kiosk";
import { analyzeSymptoms } from "../services/aiService";
import { savePatientIntake } from "../services/patientService";
import type { SavedPatientIntake } from "../types/patient";

type VoiceField = "fullName" | "age" | "gender" | "phone" | "symptomInput";
type VoiceStage = VoiceField | "review";

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

const voiceSteps = ["Name", "Age", "Gender", "Phone", "Symptoms"];

const fieldLabels: Record<VoiceField, string> = {
  fullName: "Full name",
  age: "Age",
  gender: "Gender",
  phone: "Phone",
  symptomInput: "Symptoms",
};

const prompts: Record<VoiceField, string> = {
  fullName: "Namaste. Welcome to hospital check-in. Please tell me the patient's full name.",
  age: "Thank you. Please tell me the patient's age in years.",
  gender: "Please tell me the patient's gender. You can say female, male, non-binary, or prefer not to say.",
  phone: "Please tell me the phone number for appointment updates.",
  symptomInput:
    "Please describe the main health concern. Include where it hurts, how long it has been happening, and anything that makes it better or worse.",
};

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
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function getNextField(field: VoiceField): VoiceField | null {
  const nextIndex = getFieldIndex(field) + 1;
  return orderedFields[nextIndex] ?? null;
}

function normalizeGender(transcript: string) {
  const text = transcript.toLowerCase();

  if (text.includes("prefer") || text.includes("not say")) {
    return "Prefer not to say";
  }

  if (text.includes("non") || text.includes("binary")) {
    return "Non-binary";
  }

  if (text.includes("female") || text.includes("woman") || text.includes("girl")) {
    return "Female";
  }

  if (text.includes("male") || text.includes("man") || text.includes("boy")) {
    return "Male";
  }

  return transcript.trim();
}

function normalizeTranscript(field: VoiceField, transcript: string) {
  const cleaned = transcript.replace(/\s+/g, " ").trim();

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

  return cleaned;
}

function validateForm(form: VoiceFormState) {
  const errors: VoiceFormErrors = {};
  const parsedAge = Number(form.age);
  const phoneDigits = form.phone.replace(/\D/g, "");

  if (!form.fullName.trim()) {
    errors.fullName = "Please capture the patient's full name.";
  } else if (form.fullName.trim().length < 2) {
    errors.fullName = "Name should be at least 2 characters.";
  }

  if (!form.age.trim()) {
    errors.age = "Please capture the patient's age.";
  } else if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
    errors.age = "Enter a valid age between 1 and 120.";
  }

  if (!form.gender.trim()) {
    errors.gender = "Please capture the patient's gender.";
  }

  if (!form.phone.trim()) {
    errors.phone = "Please capture a phone number.";
  } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    errors.phone = "Enter a valid phone number with 10 to 15 digits.";
  }

  if (!form.symptomInput.trim()) {
    errors.symptomInput = "Please capture the main symptom note.";
  } else if (form.symptomInput.trim().length < 12) {
    errors.symptomInput = "Add a little more symptom detail before continuing.";
  }

  return errors;
}

function getCurrentStep(stage: VoiceStage) {
  if (stage === "review") {
    return 5;
  }

  return getFieldIndex(stage) + 1;
}

function getStageLabel(stage: VoiceStage) {
  return stage === "review" ? "Final review" : fieldLabels[stage];
}

function getStatusLabel(
  isListening: boolean,
  isSpeaking: boolean,
  isSubmitting: boolean,
) {
  if (isSubmitting) {
    return "Processing intake";
  }

  if (isListening) {
    return "Listening";
  }

  if (isSpeaking) {
    return "Speaking";
  }

  return "Ready";
}

function getFirstIncompleteField(form: VoiceFormState): VoiceField {
  return orderedFields.find((field) => !form[field].trim()) ?? "symptomInput";
}

function inferFieldFromChat(message: string, fallback: VoiceField): VoiceField {
  const text = message.toLowerCase();

  if (text.includes("phone") || text.includes("mobile") || text.includes("contact")) {
    return "phone";
  }

  if (text.includes("age") || text.includes("years old") || text.includes("year old")) {
    return "age";
  }

  if (
    text.includes("gender") ||
    text.includes("female") ||
    text.includes("male") ||
    text.includes("non-binary")
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
    text.includes("vomit")
  ) {
    return "symptomInput";
  }

  if (
    text.includes("name") ||
    text.startsWith("i am ") ||
    text.startsWith("i'm ") ||
    text.startsWith("patient is ")
  ) {
    return "fullName";
  }

  return fallback;
}

function cleanChatValue(field: VoiceField, message: string) {
  const cleaned = message.replace(/\s+/g, " ").trim();

  if (field === "fullName") {
    return cleaned
      .replace(/^(my name is|name is|patient name is|patient is|i am|i'm|this is)\s+/i, "")
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

  return cleaned
    .replace(/^(my symptoms are|symptoms are|symptom is|main concern is|concern is|problem is)\s+/i, "")
    .trim();
}

export function VoiceRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<VoiceFormState>(initialFormState);
  const [errors, setErrors] = useState<VoiceFormErrors>({});
  const [stage, setStage] = useState<VoiceStage>("fullName");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "agent-full-name-question",
      sender: "agent",
      text: prompts.fullName,
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
    return () => {
      recognitionRef.current?.stop();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
      utterance.lang = "en-IN";
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
    const nextField = getNextField(field);

    appendChatMessage("patient", transcript);
    updateField(field, normalizedValue);

    if (nextField) {
      setStage(nextField);
      window.setTimeout(() => {
        void askAndListen(nextField, "Captured. ");
      }, 650);
      return;
    }

    setStage("review");
    window.setTimeout(() => {
      void speak(
        "I have captured the intake details. Please review the form on the right. If everything looks correct, tap Analyze and Save Intake.",
      );
    }, 650);
  };

  const startListening = (field: VoiceField) => {
    if (!speechSupported) {
      setVoiceError(
        "Browser speech recognition is unavailable here. Use touch registration or edit the fields manually.",
      );
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
      recognition.lang = "en-IN";

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(" ")
          .trim();

        setIsListening(false);

        if (!transcript) {
          setVoiceError("I could not hear that clearly. Please try again.");
          return;
        }

        if (isLikelyAgentEcho(transcript, lastSpokenTextRef.current)) {
          setVoiceError(
            "I ignored my own voice. Please answer after the listening indicator turns on.",
          );
          return;
        }

        handleCapturedText(field, transcript);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        setVoiceError(
          event?.error
            ? `Voice capture stopped: ${event.error}. Please try again or edit manually.`
            : "Voice capture stopped. Please try again or edit manually.",
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
      setVoiceError(
        "The microphone could not start. Please allow microphone access and try again.",
      );
    }
  };

  const askAndListen = async (field: VoiceField, prefix = "") => {
    setStage(field);
    setVoiceError(null);
    await speak(`${prefix}${prompts[field]}`);
    await wait(200);
    startListening(field);
  };

  const repeatCurrentQuestion = () => {
    if (stage === "review") {
      void speak(
        "Please review the captured details. You can edit anything manually, or tap Analyze and Save Intake.",
      );
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

    const nextField = getNextField(stage);
    if (!nextField) {
      setStage("review");
      void speak("Please review the captured details before continuing.");
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
      const nextField = getNextField(targetField);

      if (nextField) {
        setStage(nextField);
        window.setTimeout(() => {
          void speak(prompts[nextField]);
        }, 150);
        return;
      }

      setStage("review");
      window.setTimeout(() => {
        void speak(
          "Please review the intake form on the right, then tap Analyze and Save Intake.",
        );
      }, 150);
    }
  };

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitChatMessage(chatDraft.trim());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setVoiceError("Please fix the highlighted details before saving intake.");
      void speak("Please fix the highlighted details before saving intake.");
      return;
    }

    setIsSubmitting(true);
    setVoiceError(null);
    await speak(
      "Thank you. I am analyzing the symptoms and saving the intake record now.",
    );

    try {
      const result = await analyzeSymptoms({
        symptomInput: form.symptomInput,
      });

      const savedResult = await savePatientIntake(
        {
          full_name: form.fullName.trim(),
          age: Number(form.age),
          gender: form.gender.trim() || null,
          phone: form.phone.trim() || null,
          symptom_input: form.symptomInput.trim(),
          input_mode: "voice",
        },
        result,
      );

      setSavedIntake(savedResult);
      localStorage.setItem("latestIntakeResult", JSON.stringify(savedResult));
      await speak(
        "Intake saved. I found a recommended specialty. Please review the result.",
      );
      navigate("/recommendation", {
        state: {
          intakeResult: savedResult,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "AI analysis failed. Please try again.";
      setVoiceError(message);
      void speak("I could not save the intake. Please check the message on screen.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = getCurrentStep(stage);
  const statusLabel = getStatusLabel(isListening, isSpeaking, isSubmitting);
  const completedCount = orderedFields.filter((field) => form[field].trim()).length;
  const recentChatMessages = chatMessages.slice(-4);
  const chatPlaceholder =
    stage === "review"
      ? "Write your problem or update a detail..."
      : `Enter ${fieldLabels[stage].toLowerCase()}...`;

  return (
    <KioskShell
      eyebrow="AI voice receptionist"
      title="AI receptionist is listening."
      subtitle="The agent runs on the left with voice and chat. The patient form stays open on the right for edits."
      actions={
        <Link
          to="/register/manual"
          className="inline-flex min-h-12 items-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-brand-900 shadow-sm transition hover:bg-cyan-50"
        >
          Use touch instead
        </Link>
      }
    >
      <div className="mb-6">
        <StepProgress steps={voiceSteps} currentStep={currentStep} />
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
                  Live intake board
                </p>
                <h2 className="mt-2 text-3xl font-bold text-slate-950">
                  Edit anything while the agent speaks.
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg border border-white bg-white px-4 py-2 shadow-sm">
                  <p className="text-xl font-black text-brand-900">
                    {completedCount}
                  </p>
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Done
                </p>
              </div>
              <div className="rounded-lg border border-white bg-white px-4 py-2 shadow-sm">
                <p className="text-xl font-black text-brand-900">
                  {orderedFields.length}
                </p>
                <p className="text-xs font-bold uppercase text-slate-500">
                  Fields
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
                      {fieldLabels[field]}
                    </span>
                    <span
                      className={[
                        "rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wide",
                        isComplete
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-white text-slate-500",
                      ].join(" ")}
                    >
                      {isComplete ? "Done" : "Pending"}
                    </span>
                  </div>

                  {isSymptomField ? (
                    <textarea
                      value={form[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      className="mt-3 min-h-32 w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                      placeholder="Symptoms will appear here..."
                    />
                  ) : (
                    <input
                      value={form[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      className="mt-3 min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                      placeholder={`${fieldLabels[field]} will appear here...`}
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
              <KioskStatePanel tone="success" title="Intake saved">
                Patient code {savedIntake.patient_code} is ready.
              </KioskStatePanel>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-cyan-100 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <Link
              to="/"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Back to welcome
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-14 items-center justify-center rounded-lg bg-brand-700 px-7 text-base font-bold text-white shadow-sm transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Analyzing and saving..." : "Analyze and Save Intake"}
            </button>
          </div>
        </form>

        <aside className="lg:order-1 lg:sticky lg:top-28 lg:self-start">
          <section className="overflow-hidden rounded-lg border border-cyan-100 bg-white shadow-sm">
            <div className="border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase text-brand-700">
                    AI agent
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {getStageLabel(stage)}
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
                    ? "Start"
                    : "Tap to talk"}
                </span>
                <span className="mt-1 text-xs font-bold text-slate-500">
                  Voice check-in
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
                  <p className="text-base font-black text-slate-950">Chat</p>
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
                    Send
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
                    title="Speech recognition unavailable"
                  >
                    Use Chrome or Edge for voice capture, or continue with touch
                    registration.
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
                  Repeat
                </button>
                <button
                  type="button"
                  onClick={skipToNext}
                  disabled={stage === "review" || isListening || isSubmitting}
                  className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={stopVoice}
                  className="col-span-2 min-h-12 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white transition hover:bg-slate-700"
                >
                  Stop Voice
                </button>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </KioskShell>
  );
}
