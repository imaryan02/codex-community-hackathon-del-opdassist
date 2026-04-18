import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KioskActionCard, KioskShell } from "../components/kiosk";
import {
  getStoredSession,
  loginPatient,
  loginStaff,
  type AppRole,
} from "../lib/session";
import { getAllDoctors } from "../services/doctorService";
import { getPatientAccountOverview } from "../services/patientHistoryService";
import type { DoctorWithSpecialty } from "../types/doctor";

const landingCopy = {
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
    description: "View available doctors and department coverage for today's OPD.",
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
    intake: "Touch + voice",
  },
};

export function LandingPage() {
  const navigate = useNavigate();
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
  const copy = landingCopy;

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
      <section className="space-y-6">
        <section
          className="relative overflow-hidden rounded-lg bg-slate-900 text-white shadow-sm"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(6, 78, 59, 0.92), rgba(15, 118, 110, 0.74), rgba(15, 23, 42, 0.24)), url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1800&q=80')",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <div className="min-h-[330px] px-5 py-8 sm:min-h-[430px] sm:px-8 lg:px-10 lg:py-12">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase">Government hospital OPD</p>
              <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
                AI powered kiosk for faster OPD check-in.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-cyan-50">
                Patients use mobile login, touch or voice intake, AI department
                routing, reception-approved tokens, doctor queue, prescriptions,
                and repeat visit history in one flow.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold">
                {[
                  "Mobile record",
                  "AI triage",
                  "Admin approval",
                  "Doctor history",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-white/30 bg-white/15 px-4 py-2 text-white backdrop-blur"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <a
                href="#opd-login"
                className="mt-8 inline-flex min-h-12 items-center rounded-lg bg-white px-5 text-sm font-black text-emerald-900 transition hover:bg-emerald-50"
              >
                Start check-in
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="order-2 grid gap-6 lg:order-1">
            <section className="rounded-lg border border-cyan-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-black uppercase text-brand-700">
                Problem and solution
              </p>
              <h2 className="mt-3 text-3xl font-black text-slate-950">
                A faster OPD journey for patients, reception, and doctors.
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Government hospital OPDs handle heavy patient flow every day.
                Patients stand in queues, repeat the same details, struggle to
                find the right department, and carry old reports manually.
                Doctors often see the patient with limited history and little
                time.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                OPD Assist solves this with a kiosk-style system: mobile login,
                guided voice or touch intake, AI department routing, available
                doctor selection, reception-approved tokens, medical document
                storage, and a complete doctor view with past visits.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["For patients", "Simple mobile login, guided intake, token status, and saved records."],
                  ["For reception", "Approve OPD tokens, manage doctors, and control slot availability."],
                  ["For doctors", "See approved patients with AI summary, history, and uploaded reports."],
                  ["For hospitals", "Reduce repeated paperwork and create a scalable digital OPD flow."],
                ].map(([label, text]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-black text-slate-950">{label}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80"
                alt="Hospital team preparing patient intake"
                className="h-52 w-full object-cover"
              />
              <div className="grid gap-4 p-6 sm:grid-cols-3">
                {[
                  ["1", "Patient enters mobile number"],
                  ["2", "AI routes the OPD visit"],
                  ["3", "Doctor sees approved case"],
                ].map(([step, text]) => (
                  <div key={step}>
                    <p className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-black text-white">
                      {step}
                    </p>
                    <p className="mt-3 text-sm font-bold leading-6 text-slate-800">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <form
            id="opd-login"
            onSubmit={handleLogin}
            className="order-1 rounded-lg border border-slate-200 bg-white p-6 shadow-lg shadow-cyan-900/10 lg:order-2"
          >
            <p className="text-sm font-black uppercase text-brand-700">
              Secure OPD access
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Start with the right workspace.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Patients continue with a mobile number. Reception and doctors use
              separate workspaces to manage approvals, queues, and consultation
              records.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm font-bold">
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
                    "min-h-12 rounded-lg px-3 transition",
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
              <label className="mt-6 block">
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
              <div className="mt-6 grid gap-4">
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
              className="mt-6 w-full rounded-lg bg-brand-700 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isLoggingIn
                ? "Checking account..."
                : isLoadingDoctors
                  ? "Loading doctor profiles..."
                  : "Continue"}
            </button>

            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <p className="font-black uppercase">Prototype login note</p>
              <p className="mt-1">
                This demo uses mobile number login for patients. Production will
                use OTP verification, staff accounts, and strict database access
                rules for health records.
              </p>
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4">
                <p className="font-black text-brand-900">Admin demo</p>
                <p className="mt-1 font-semibold text-slate-800">
                  admin@hospital.test
                </p>
                <p className="text-slate-600">admin123</p>
              </div>
              <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4">
                <p className="font-black text-brand-900">Doctor demo</p>
                <p className="mt-1 font-semibold text-slate-800">
                  doctor@hospital.test
                </p>
                <p className="text-slate-600">doctor123</p>
              </div>
            </div>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["AI intake", "Voice and touch forms for fast OPD registration."],
            ["Token approval", "Reception verifies tokens before doctor queue."],
            ["Health record", "Past visits, prescriptions, and files stay linked."],
            ["Doctor view", "Approved cases include AI summary and history."],
          ].map(([title, body]) => (
            <article
              key={title}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="font-black text-slate-950">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </section>
      </section>
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
                [copy.stats.intake, "Input modes"],
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
