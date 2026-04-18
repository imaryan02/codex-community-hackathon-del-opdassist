import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  KioskActionCard,
  KioskShell,
  LanguageSelector,
} from "../components/kiosk";
import {
  getStoredSession,
  loginPatient,
  loginStaff,
  type AppRole,
} from "../lib/session";
import { getAllDoctors } from "../services/doctorService";
import { getPatientAccountOverview } from "../services/patientHistoryService";
import type { DoctorWithSpecialty } from "../types/doctor";

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
    eyebrow: "OPD self check-in",
    title: "OPD Registration & Triage",
    subtitle:
      "Enter a mobile number, describe the health concern, get routed to the right department, and collect a token for the counter.",
    voice: {
      title: "Start AI Intake",
      description:
        "Answer simple questions. The assistant prepares the OPD record and routes the patient to a department.",
      badge: "Voice",
      ctaLabel: "Start",
    },
    manual: {
      title: "Touch Registration",
      description:
        "Use large fields to enter patient details and symptoms with help from staff if needed.",
      badge: "Simple",
      ctaLabel: "Start",
    },
    doctors: {
      title: "Hospital Doctors",
      description:
        "View available doctors and department coverage for today's OPD.",
      badge: "Today",
      ctaLabel: "View",
    },
    assistance: {
      eyebrow: "Need assistance?",
      title: "Ask the front desk for help at any step.",
      description:
        "You can switch between touch and voice, edit details before continuing, and return to this screen whenever needed.",
    },
    stats: {
      specialties: "Specialties",
      slots: "Tokens",
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
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const [session, setSession] = useState(getStoredSession);
  const [loginRole, setLoginRole] = useState<AppRole>("patient");
  const [email, setEmail] = useState("admin@hospital.test");
  const [password, setPassword] = useState("admin123");
  const [patientLookup, setPatientLookup] = useState("");
  const [doctors, setDoctors] = useState<DoctorWithSpecialty[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [doctorProfilesRequested, setDoctorProfilesRequested] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const copy = landingCopy[language];

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    const syncSession = () => setSession(getStoredSession());

    window.addEventListener("app-session-changed", syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener("app-session-changed", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  const loadDoctorProfiles = useCallback(async () => {
    setDoctorProfilesRequested(true);
    setIsLoadingDoctors(true);
    setLoginError(null);

    try {
      const doctorRows = await getAllDoctors();
      const availableDoctors = doctorRows.filter(
        (doctor) => doctor.available_today,
      );
      const nextDoctors =
        availableDoctors.length > 0 ? availableDoctors : doctorRows;

      setDoctors(nextDoctors);
      setSelectedDoctorId((current) => current || nextDoctors[0]?.id || "");

      if (nextDoctors.length === 0) {
        throw new Error("No doctor profiles found. Add doctors from admin management first.");
      }

      return nextDoctors;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not load doctor profiles.";
      setLoginError(`Could not load doctor profiles: ${message}`);
      throw error;
    } finally {
      setIsLoadingDoctors(false);
    }
  }, []);

  useEffect(() => {
    if (
      loginRole !== "doctor" ||
      doctors.length > 0 ||
      isLoadingDoctors ||
      doctorProfilesRequested
    ) {
      return;
    }

    void loadDoctorProfiles().catch(() => undefined);
  }, [
    doctorProfilesRequested,
    doctors.length,
    isLoadingDoctors,
    loadDoctorProfiles,
    loginRole,
  ]);

  const handleRoleChange = (role: AppRole) => {
    setLoginRole(role);
    setLoginError(null);

    if (role === "admin") {
      setEmail("admin@hospital.test");
      setPassword("admin123");
    } else if (role === "doctor") {
      setEmail("doctor@hospital.test");
      setPassword("doctor123");
      setDoctorProfilesRequested(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      let selectedDoctor = doctors.find(
        (doctor) => doctor.id === selectedDoctorId,
      );

      if (loginRole === "doctor" && !selectedDoctor) {
        const loadedDoctors = await loadDoctorProfiles();
        selectedDoctor = loadedDoctors[0];
      }

      const nextSession =
        loginRole === "patient"
          ? loginPatient(patientLookup)
          : loginStaff(
              email,
              password,
              loginRole === "doctor" && selectedDoctor
                ? {
                    doctorId: selectedDoctor.id,
                    displayName: selectedDoctor.full_name,
                    specialtyName: selectedDoctor.specialty_name,
                  }
                : undefined,
            );

      setSession(nextSession);

      if (nextSession.role === "admin") {
        navigate("/admin-dashboard");
        return;
      }

      if (nextSession.role === "doctor") {
        navigate("/doctor-dashboard");
        return;
      }

      const account = await getPatientAccountOverview(nextSession.loginId);

      if (account.latestProfile) {
        navigate("/patient-dashboard");
        return;
      }

      localStorage.setItem("visitPatientMode", "self");
      navigate("/register/voice");
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "Login failed. Try again.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!session) {
    return (
      <KioskShell
        eyebrow="Government hospital OPD"
        title="Start OPD check-in."
        subtitle="Patients use mobile number only. Staff use secure demo login for doctor and admin dashboards."
        actions={<LanguageSelector value={language} onChange={setLanguage} />}
      >
        <section className="mb-6 rounded-lg border border-cyan-100 bg-cyan-50 p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">
            Problem statement
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xl font-black text-slate-950">
                Government OPDs face crowding, repeated paperwork, and weak
                visit continuity.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Patients stand in multiple queues, repeat symptoms, and often do
                not know which doctor is available. Reception teams manually
                coordinate tokens and slots while doctors receive limited
                context.
              </p>
            </div>
            <div className="rounded-lg border border-white bg-white p-4 text-sm leading-6 text-brand-900 shadow-sm">
              <p className="font-black uppercase tracking-wide">Our solution</p>
              <p className="mt-2">
                OPD Assist connects patient check-in, AI intake, department
                routing, token approval, doctor queue, prescription, and repeat
                visit history in one simple hospital workflow.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
            {[
              ["Patient", "Mobile login, reusable record, token status."],
              ["Reception", "Approve tokens, manage doctors, open OPD times."],
              ["Doctor", "Approved queue, AI summary, history, prescription."],
              ["Hospital", "Less repetition, better visibility, cleaner flow."],
            ].map(([label, text]) => (
              <div key={label} className="rounded-lg bg-white p-3 shadow-sm">
                <p className="font-bold text-slate-950">{label}</p>
                <p className="mt-1 leading-5 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-700">
              OPD access
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              Simple entry for patients. Separate workspaces for staff.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Returning patients can open their health record. New patients go
              directly to AI intake and receive an OPD token after routing.
            </p>
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <p className="font-black uppercase tracking-wide">
                Prototype auth note
              </p>
              <p className="mt-1">
                This prototype uses mobile number for fast check-in.
                Production will use mobile OTP, staff accounts, and database
                access rules so patients see only their own records and doctors
                see only assigned OPD cases.
              </p>
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4">
                <p className="font-bold text-brand-900">Admin demo login</p>
                <p className="mt-1 text-slate-700">
                  admin@hospital.test / admin123
                </p>
              </div>
              <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4">
                <p className="font-bold text-brand-900">Doctor demo login</p>
                <p className="mt-1 text-slate-700">
                  doctor@hospital.test / doctor123
                </p>
              </div>
            </div>
          </section>

          <form
            onSubmit={handleLogin}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm font-bold">
              {[
                { label: "Patient", value: "patient" },
                { label: "Doctor", value: "doctor" },
                { label: "Admin", value: "admin" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleRoleChange(option.value as AppRole)}
                  className={[
                    "rounded-md px-3 py-3 transition",
                    loginRole === option.value
                      ? "bg-brand-700 text-white"
                      : "text-slate-600 hover:bg-white",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {loginRole === "patient" ? (
              <label className="mt-5 block">
                <span className="text-sm font-bold text-slate-900">
                  Mobile number
                </span>
                <input
                  value={patientLookup}
                  onChange={(event) => setPatientLookup(event.target.value)}
                  className="mt-2 min-h-14 w-full rounded-lg border border-slate-300 px-4 text-base font-semibold outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                  placeholder="+91 98765 43210"
                  inputMode="tel"
                  autoComplete="tel"
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Existing patients open their health record. New patients start
                  AI intake immediately.
                </p>
              </label>
            ) : (
              <div className="mt-5 grid gap-4">
                <label className="block">
                  <span className="text-sm font-bold text-slate-900">
                    Staff email
                  </span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 min-h-14 w-full rounded-lg border border-slate-300 px-4 text-base font-semibold outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-900">
                    Password
                  </span>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    className="mt-2 min-h-14 w-full rounded-lg border border-slate-300 px-4 text-base font-semibold outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                  />
                </label>
                {loginRole === "doctor" ? (
                  <div className="block">
                    <span className="text-sm font-bold text-slate-900">
                      Doctor profile
                    </span>
                    <select
                      value={selectedDoctorId}
                      onChange={(event) =>
                        setSelectedDoctorId(event.target.value)
                      }
                      className="mt-2 min-h-14 w-full rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                    >
                      {isLoadingDoctors ? (
                        <option value="">Loading doctors...</option>
                      ) : null}
                      {!isLoadingDoctors && doctors.length === 0 ? (
                        <option value="">No doctors loaded</option>
                      ) : null}
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.full_name} - {doctor.specialty_name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void loadDoctorProfiles().catch(() => undefined)}
                      disabled={isLoadingDoctors}
                      className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      {isLoadingDoctors ? "Loading profiles..." : "Reload doctor profiles"}
                    </button>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      In production, each doctor signs into their own hospital
                      account. This selector lets the prototype show multiple
                      doctor identities.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {loginError ? (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {loginError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoggingIn || isLoadingDoctors}
              className="mt-6 w-full rounded-lg bg-brand-700 px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-brand-900"
            >
              {isLoggingIn
                ? "Checking account..."
                : isLoadingDoctors
                  ? "Loading doctor profiles..."
                  : "Continue"}
            </button>
          </form>
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">
            Platform flow
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="font-bold text-slate-950">Patient check-in</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Mobile number opens the health record. AI intake captures the
                current concern and creates a same-day token.
              </p>
            </div>
            <div>
              <p className="font-bold text-slate-950">Reception control</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Admin verifies tokens, manages doctor availability, and keeps OPD
                times ready for high-volume hospital flow.
              </p>
            </div>
            <div>
              <p className="font-bold text-slate-950">Doctor workspace</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Approved tokens reach the doctor queue with AI summary, patient
                history, and a digital prescription workspace.
              </p>
            </div>
          </div>
        </section>
      </KioskShell>
    );
  }

  return (
    <KioskShell
      eyebrow={`${session.displayName} signed in`}
      title={copy.title}
      subtitle={
        session.role === "patient"
          ? copy.subtitle
          : "Choose a workspace to manage OPD flow."
      }
      actions={<LanguageSelector value={language} onChange={setLanguage} />}
    >
      {session.role === "admin" ? (
        <>
          <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900">
            Admin is the reception and capacity layer: approve OPD tokens,
            manage doctors, create times, and keep the queue clean for doctors.
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Link
              to="/admin-dashboard"
              className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 font-bold text-brand-900 transition hover:bg-cyan-100"
            >
              Hospital operations
            </Link>
            <Link
              to="/admin-management"
              className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 font-bold text-brand-900 transition hover:bg-cyan-100"
            >
              Manage doctors and slots
            </Link>
            <Link
              to="/admin-approvals"
              className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 font-bold text-brand-900 transition hover:bg-cyan-100"
            >
              Approve OPD tokens
            </Link>
          </div>
        </>
      ) : session.role === "doctor" ? (
        <>
          <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900">
            Doctor view focuses on approved OPD tokens only. Each case carries
            patient details, AI triage summary, visit history, and prescription
            entry.
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Link
              to="/doctor-dashboard"
              className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 font-bold text-brand-900 transition hover:bg-cyan-100"
            >
              OPD queue
            </Link>
            <Link
              to="/doctors"
              className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 font-bold text-brand-900 transition hover:bg-cyan-100"
            >
              Doctor directory
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="mb-5 rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900">
            Patient side keeps one simple path: open record, start a new OPD
            visit, answer intake questions, get routed, and collect a token for
            the counter.
          </div>
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
              to="/patient-dashboard"
              icon={<span className="text-lg font-black text-brand-900">ID</span>}
              title="View Health Record"
              description="Open previous OPD visits, tokens, prescriptions, and profile details linked to this mobile account."
              badge="Record"
              ctaLabel="Open"
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
        </>
      )}
    </KioskShell>
  );
}
