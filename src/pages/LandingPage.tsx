import { useEffect, useState } from "react";
import {
  KioskActionCard,
  KioskShell,
  LanguageSelector,
} from "../components/kiosk";

type Language = "en" | "hi";

const LANGUAGE_STORAGE_KEY = "preferredKioskLanguage";

function getStoredLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLanguage === "hi" ? "hi" : "en";
}

const landingCopy = {
  en: {
    eyebrow: "Self check-in kiosk",
    title: "Smart Hospital Check-In",
    subtitle:
      "Register by touch or speak with our AI receptionist. We will help you find the right specialty, choose a doctor, and book today's slot.",
    voice: {
      title: "Talk to AI Receptionist",
      description:
        "Answer one question at a time. The assistant guides the intake and keeps the form easy to review.",
      badge: "Voice",
      ctaLabel: "Start",
    },
    manual: {
      title: "Register by Touch",
      description:
        "Use large touch-friendly fields to enter patient details and symptoms at your own pace.",
      badge: "Simple",
      ctaLabel: "Start",
    },
    doctors: {
      title: "Browse Doctors",
      description:
        "View available doctors, specialties, qualifications, and appointment options before intake.",
      badge: "Today",
      ctaLabel: "Start",
    },
    assistance: {
      eyebrow: "Need assistance?",
      title: "Ask the front desk for help at any step.",
      description:
        "You can switch between touch and voice, edit details before continuing, and return to this screen whenever needed.",
    },
    stats: {
      specialties: "Specialties",
      slots: "Slots",
      sameDay: "Same day",
      language: "Language",
      languageName: "English",
    },
  },
  hi: {
    eyebrow: "सेल्फ चेक-इन कियोस्क",
    title: "स्मार्ट हॉस्पिटल चेक-इन",
    subtitle:
      "टच से रजिस्टर करें या हमारी AI रिसेप्शनिस्ट से बात करें। हम आपको सही स्पेशलिटी, डॉक्टर और आज का स्लॉट चुनने में मदद करेंगे।",
    voice: {
      title: "AI रिसेप्शनिस्ट से बात करें",
      description:
        "एक बार में एक सवाल का जवाब दें। असिस्टेंट इनटेक में मदद करता है और फॉर्म को जांचना आसान रखता है।",
      badge: "वॉइस",
      ctaLabel: "शुरू करें",
    },
    manual: {
      title: "टच से रजिस्टर करें",
      description:
        "बड़े टच-फ्रेंडली फील्ड्स से मरीज की जानकारी और लक्षण आराम से भरें।",
      badge: "सरल",
      ctaLabel: "शुरू करें",
    },
    doctors: {
      title: "डॉक्टर देखें",
      description:
        "रजिस्ट्रेशन से पहले डॉक्टर, स्पेशलिटी, योग्यता और अपॉइंटमेंट विकल्प देखें।",
      badge: "आज",
      ctaLabel: "देखें",
    },
    assistance: {
      eyebrow: "मदद चाहिए?",
      title: "किसी भी स्टेप पर फ्रंट डेस्क से मदद मांगें।",
      description:
        "आप टच और वॉइस के बीच बदल सकते हैं, आगे बढ़ने से पहले जानकारी एडिट कर सकते हैं, और जरूरत पड़ने पर इस स्क्रीन पर वापस आ सकते हैं।",
    },
    stats: {
      specialties: "स्पेशलिटी",
      slots: "स्लॉट",
      sameDay: "आज ही",
      language: "भाषा",
      languageName: "हिंदी",
    },
  },
} satisfies Record<Language, Record<string, unknown>>;

export function LandingPage() {
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const copy = landingCopy[language];

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  return (
    <KioskShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      actions={<LanguageSelector value={language} onChange={setLanguage} />}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <KioskActionCard
          to="/register/voice"
          icon={<span className="text-lg font-black text-brand-900">AI</span>}
          title={copy.voice.title}
          description={copy.voice.description}
          badge={copy.voice.badge}
          ctaLabel={copy.voice.ctaLabel}
        />
        <KioskActionCard
          to="/register/manual"
          icon={<span className="text-lg font-black text-brand-900">Tap</span>}
          title={copy.manual.title}
          description={copy.manual.description}
          badge={copy.manual.badge}
          ctaLabel={copy.manual.ctaLabel}
        />
        <KioskActionCard
          to="/doctors"
          icon={<span className="text-lg font-black text-brand-900">Dr</span>}
          title={copy.doctors.title}
          description={copy.doctors.description}
          badge={copy.doctors.badge}
          ctaLabel={copy.doctors.ctaLabel}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">
            {copy.assistance.eyebrow}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {copy.assistance.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {copy.assistance.description}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {[
            ["10+", copy.stats.specialties],
            [copy.stats.sameDay, copy.stats.slots],
            [copy.stats.languageName, copy.stats.language],
          ].map(([value, label]) => (
            <div
              key={label}
              className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur"
            >
              <p className="text-2xl font-black text-brand-900">{value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </KioskShell>
  );
}
