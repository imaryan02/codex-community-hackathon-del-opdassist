import { useState } from "react";
import {
  KioskActionCard,
  KioskShell,
  LanguageSelector,
} from "../components/kiosk";

export function LandingPage() {
  const [language, setLanguage] = useState<"en" | "hi">("en");

  return (
    <KioskShell
      eyebrow="Self check-in kiosk"
      title="Smart Hospital Check-In"
      subtitle="Register by touch or speak with our AI receptionist. We will help you find the right specialty, choose a doctor, and book today's slot."
      actions={<LanguageSelector value={language} onChange={setLanguage} />}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <KioskActionCard
          to="/register/voice"
          icon={<span className="text-lg font-black text-brand-900">AI</span>}
          title="Talk to AI Receptionist"
          description="Answer one question at a time. The assistant guides the intake and keeps the form easy to review."
          badge="Voice"
        />
        <KioskActionCard
          to="/register/manual"
          icon={<span className="text-lg font-black text-brand-900">Tap</span>}
          title="Register by Touch"
          description="Use large touch-friendly fields to enter patient details and symptoms at your own pace."
          badge="Simple"
        />
        <KioskActionCard
          to="/doctors"
          icon={<span className="text-lg font-black text-brand-900">Dr</span>}
          title="Browse Doctors"
          description="View available doctors, specialties, qualifications, and appointment options before intake."
          badge="Today"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">
            Need assistance?
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            Ask the front desk for help at any step.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            You can switch between touch and voice, edit details before
            continuing, and return to this screen whenever needed.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {[
            ["10+", "Specialties"],
            ["Same day", "Slots"],
            [language === "hi" ? "हिंदी" : "English", "Language"],
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
