import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KioskStatePanel, StepProgress } from "../components/kiosk";
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

const fieldIcons: Record<VoiceField, string> = {
  fullName: "01",
  age: "02",
  gender: "03",
  phone: "04",
  symptomInput: "05",
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
    return "Processing";
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

function MicWaveform({ active }: { active: boolean }) {
  const bars = [38, 68, 52, 84, 60, 78, 44, 70, 36, 80, 50, 72];
  return (
    <div className="flex h-10 items-end justify-center gap-[3px]">
      {bars.map((height, index) => (
        <span
          key={index}
          className={[
            "w-1.5 rounded-full transition-all duration-300",
            active ? "bg-brand-600" : "bg-slate-300",
          ].join(" ")}
          style={{
            height: active ? `${height}%` : "25%",
            animationDelay: `${index * 60}ms`,
            transition: active
              ? `height ${200 + index * 40}ms ease-in-out`
              : "height 300ms ease-out",
          }}
        />
      ))}
    </div>
  );
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
  const [savedIntake, setSavedIntake] = useState<SavedPatientIntake | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const lastSpokenTextRef = useRef("");
  const listenBlockedUntilRef = useRef(0);

  const speechSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(getSpeechRecognition());
  }, []);

  const speechOutputSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const updateField = (field: keyof VoiceFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
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
      ].slice(-12);
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
    if (!Recognition) return;

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
        if (Date.now() < listenBlockedUntilRef.current) return;
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
    if (stage === "review") return;

    const nextField = getNextField(stage);
    if (!nextField) {
      setStage("review");
      void speak("Please review the captured details before continuing.");
      return;
    }
    void askAndListen(nextField);
  };

  const submitChatMessage = (message: string) => {
    if (!message) return;

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
      const result = await analyzeSymptoms({ symptomInput: form.symptomInput });

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
        state: { intakeResult: savedResult },
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
  const chatPlaceholder =
    stage === "review"
      ? "Write your concern or correct a detail..."
      : `Type your ${fieldLabels[stage].toLowerCase()} here...`;

  const micButtonState = isListening
    ? "listening"
    : isSpeaking
      ? "speaking"
      : isSubmitting
        ? "processing"
        : "idle";

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      <div className="mb-6 rounded-2xl border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/40 to-blue-50/60 p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-xs font-black text-white">
                AI
              </span>
              <p className="text-sm font-bold uppercase tracking-widest text-brand-700">
                AI Voice Receptionist
              </p>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Your AI receptionist is ready.
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
              Tap the microphone to start. The agent collects your details, analyzes symptoms with AI, and routes you to the right specialist automatically.
            </p>
          </div>
          <Link
            to="/register/manual"
            className="inline-flex min-h-11 w-fit items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Switch to touch form
          </Link>
        </div>

        <div className="mt-5">
          <StepProgress steps={voiceSteps} currentStep={currentStep} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div
              className={[
                "relative overflow-hidden p-6 transition-colors duration-500",
                micButtonState === "listening"
                  ? "bg-gradient-to-br from-amber-50 to-orange-50"
                  : micButtonState === "speaking"
                    ? "bg-gradient-to-br from-cyan-50 to-blue-50"
                    : micButtonState === "processing"
                      ? "bg-gradient-to-br from-slate-50 to-cyan-50"
                      : "bg-gradient-to-br from-slate-50 to-white",
              ].join(" ")}
            >
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className={[
                    "absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-20 transition-all duration-700",
                    micButtonState === "listening"
                      ? "scale-125 bg-amber-300"
                      : micButtonState === "speaking"
                        ? "scale-110 bg-cyan-300"
                        : "scale-100 bg-slate-200",
                  ].join(" ")}
                />
              </div>

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Current question
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      {getStageLabel(stage)}
                    </h2>
                  </div>
                  <span
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-colors",
                      micButtonState === "listening"
                        ? "bg-amber-100 text-amber-800"
                        : micButtonState === "speaking"
                          ? "bg-cyan-100 text-brand-900"
                          : micButtonState === "processing"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-emerald-100 text-emerald-800",
                    ].join(" ")}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      void askAndListen(stage === "review" ? getFirstIncompleteField(form) : stage)
                    }
                    disabled={isListening || isSubmitting}
                    aria-label={micButtonState === "listening" ? "Listening..." : "Tap to speak"}
                    className={[
                      "group relative flex h-40 w-40 flex-col items-center justify-center rounded-full transition-all duration-300 disabled:cursor-not-allowed",
                      micButtonState === "listening"
                        ? "scale-105 shadow-[0_0_0_12px_rgba(251,191,36,0.15),0_0_0_24px_rgba(251,191,36,0.07)]"
                        : micButtonState === "speaking"
                          ? "shadow-[0_0_0_12px_rgba(6,182,212,0.15),0_0_0_24px_rgba(6,182,212,0.07)]"
                          : "shadow-[0_0_0_8px_rgba(14,116,144,0.08)] hover:scale-105 hover:shadow-[0_0_0_12px_rgba(14,116,144,0.12),0_0_0_24px_rgba(14,116,144,0.06)]",
                      micButtonState === "listening"
                        ? "bg-amber-500"
                        : micButtonState === "speaking"
                          ? "bg-brand-600"
                          : micButtonState === "processing"
                            ? "bg-slate-400"
                            : "bg-brand-700",
                    ].join(" ")}
                  >
                    <svg
                      className={[
                        "h-12 w-12 transition-transform",
                        micButtonState === "listening" ? "scale-110" : "",
                      ].join(" ")}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        className="text-white/90"
                        d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"
                      />
                      <path
                        className="text-white/70"
                        d="M19 10a1 1 0 0 1 2 0 9 9 0 0 1-18 0 1 1 0 1 1 2 0 7 7 0 0 0 14 0z"
                      />
                      <path
                        className="text-white/70"
                        d="M12 21a1 1 0 0 1 1-1h0a1 1 0 0 1 0 2h0a1 1 0 0 1-1-1z"
                      />
                    </svg>
                    <span className="mt-2 text-xs font-black uppercase tracking-widest text-white/80">
                      {micButtonState === "listening"
                        ? "Listening"
                        : micButtonState === "speaking"
                          ? "Speaking"
                          : micButtonState === "processing"
                            ? "Processing"
                            : stage === "fullName" && !form.fullName
                              ? "Tap to start"
                              : "Tap to speak"}
                    </span>
                  </button>
                </div>

                <div className="mt-5 rounded-xl border border-slate-100 bg-white/80 px-4 py-3">
                  <MicWaveform active={isListening || isSpeaking} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={repeatCurrentQuestion}
                    disabled={isListening || isSubmitting}
                    className="flex min-h-10 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-2 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    <span className="text-base leading-none">↻</span>
                    <span className="mt-1">Repeat</span>
                  </button>
                  <button
                    type="button"
                    onClick={skipToNext}
                    disabled={stage === "review" || isListening || isSubmitting}
                    className="flex min-h-10 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-2 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    <span className="text-base leading-none">→</span>
                    <span className="mt-1">Skip</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopVoice}
                    className="flex min-h-10 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-2 py-2 text-xs font-bold text-slate-700 transition hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                  >
                    <span className="text-base leading-none">■</span>
                    <span className="mt-1">Stop</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-950">Chat</span>
                  <span className="text-xs text-slate-500">or type your answer</span>
                </div>
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full transition-colors",
                    isListening
                      ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                      : isSpeaking
                        ? "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]"
                        : "bg-emerald-400",
                  ].join(" ")}
                />
              </div>

              <div className="max-h-64 min-h-48 space-y-2.5 overflow-y-auto bg-slate-50 p-3">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={[
                      "flex",
                      message.sender === "patient" ? "justify-end" : "justify-start",
                    ].join(" ")}
                  >
                    {message.sender === "agent" && (
                      <span className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-black text-brand-900">
                        AI
                      </span>
                    )}
                    <p
                      className={[
                        "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-6",
                        message.sender === "agent"
                          ? "rounded-tl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-100"
                          : "rounded-tr-sm bg-brand-700 text-white",
                      ].join(" ")}
                    >
                      {message.text}
                    </p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form
                onSubmit={handleChatSubmit}
                className="flex gap-2 border-t border-slate-100 bg-white p-3"
              >
                <input
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-cyan-100"
                  placeholder={chatPlaceholder}
                />
                <button
                  type="submit"
                  disabled={!chatDraft.trim()}
                  className="min-h-11 rounded-xl bg-brand-700 px-4 text-sm font-black text-white transition hover:bg-brand-900 disabled:bg-slate-300"
                >
                  Send
                </button>
              </form>
            </div>

            {voiceError ? (
              <div className="p-3 pt-0">
                <KioskStatePanel tone="error">{voiceError}</KioskStatePanel>
              </div>
            ) : null}

            {!speechSupported ? (
              <div className="p-3 pt-0">
                <KioskStatePanel tone="warning" title="Voice unavailable">
                  Use Chrome or Edge for voice capture, or type in the chat above.
                </KioskStatePanel>
              </div>
            ) : null}
          </div>
        </aside>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 bg-gradient-to-r from-white to-cyan-50/50 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-700">
                  Live intake form
                </p>
                <h2 className="mt-1.5 text-2xl font-black text-slate-950">
                  Edit while the agent speaks.
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Fields update automatically as the AI captures your responses.
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-center shadow-sm">
                  <p className="text-2xl font-black text-brand-900">{completedCount}</p>
                  <p className="text-xs font-bold uppercase text-slate-400">Done</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-center shadow-sm">
                  <p className="text-2xl font-black text-slate-400">{orderedFields.length}</p>
                  <p className="text-xs font-bold uppercase text-slate-400">Total</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 p-5 sm:p-6">
            {orderedFields.map((field) => {
              const isActive = stage === field;
              const isComplete = Boolean(form[field].trim());
              const isSymptomField = field === "symptomInput";

              return (
                <div
                  key={field}
                  className={[
                    "group relative rounded-xl border p-4 transition-all duration-200",
                    isActive
                      ? "border-brand-600 bg-cyan-50/60 shadow-sm ring-2 ring-brand-600/10"
                      : isComplete
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-slate-200 bg-slate-50/80",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={[
                          "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black transition-colors",
                          isActive
                            ? "bg-brand-700 text-white"
                            : isComplete
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-500",
                        ].join(" ")}
                      >
                        {isComplete ? "✓" : fieldIcons[field]}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {fieldLabels[field]}
                      </span>
                      {isActive && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-brand-700">
                          Active
                        </span>
                      )}
                    </div>
                    {isComplete && !isActive && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        Captured
                      </span>
                    )}
                  </div>

                  {isSymptomField ? (
                    <textarea
                      value={form[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      className="min-h-28 w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-cyan-100"
                      placeholder="Describe the health concern — location, duration, severity..."
                    />
                  ) : (
                    <input
                      value={form[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-cyan-100"
                      placeholder={`${fieldLabels[field]} will appear as you speak...`}
                      inputMode={field === "age" || field === "phone" ? "numeric" : "text"}
                    />
                  )}

                  {errors[field] ? (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      {errors[field]}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {savedIntake ? (
            <div className="px-5 pb-0 sm:px-6">
              <KioskStatePanel tone="success" title="Intake saved">
                Patient code {savedIntake.patient_code} is ready.
              </KioskStatePanel>
            </div>
          ) : null}

          <div className="mt-auto border-t border-slate-100 bg-slate-50 p-5 sm:p-6">
            <div className="flex items-start gap-3 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4 mb-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-black text-brand-900 mt-0.5">
                AI
              </span>
              <p className="text-sm leading-6 text-slate-700">
                AI will analyze the symptoms and route the patient to the recommended specialty. A doctor reviews all information during consultation.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                to="/"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Back to welcome
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-700 px-7 text-base font-black text-white shadow-sm transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? "Analyzing symptoms..." : "Analyze and Save Intake"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
