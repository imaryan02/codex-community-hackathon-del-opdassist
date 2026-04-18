import { normalizePhone } from "./phone";

export type AppRole = "patient" | "doctor" | "admin";

export type AppSession = {
  role: AppRole;
  displayName: string;
  loginId: string;
  doctorId?: string;
  specialtyName?: string;
};

const SESSION_STORAGE_KEY = "aiHospitalSession";

const demoUsers = [
  {
    role: "admin",
    email: "admin@hospital.test",
    password: "admin123",
    displayName: "Hospital Admin",
  },
  {
    role: "doctor",
    email: "doctor@hospital.test",
    password: "doctor123",
    displayName: "Demo Doctor",
  },
] as const;

function isAppSession(value: unknown): value is AppSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AppSession>;

  return (
    (candidate.role === "patient" ||
      candidate.role === "doctor" ||
      candidate.role === "admin") &&
    typeof candidate.displayName === "string" &&
    typeof candidate.loginId === "string" &&
    (candidate.doctorId === undefined ||
      typeof candidate.doctorId === "string") &&
    (candidate.specialtyName === undefined ||
      typeof candidate.specialtyName === "string")
  );
}

export function getStoredSession() {
  const storedValue = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue);
    return isAppSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AppSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("app-session-changed"));
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  window.dispatchEvent(new Event("app-session-changed"));
}

export function loginStaff(
  email: string,
  password: string,
  doctorProfile?: {
    doctorId: string;
    displayName: string;
    specialtyName: string;
  },
) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = demoUsers.find(
    (candidate) =>
      candidate.email === normalizedEmail && candidate.password === password,
  );

  if (!user) {
    throw new Error("Use the demo admin or doctor credentials shown on screen.");
  }

  if (user.role === "doctor" && !doctorProfile) {
    throw new Error("Select a doctor profile for this demo login.");
  }

  const session: AppSession = {
    role: user.role,
    displayName:
      user.role === "doctor" && doctorProfile
        ? doctorProfile.displayName
        : user.displayName,
    loginId: user.email,
    doctorId: doctorProfile?.doctorId,
    specialtyName: doctorProfile?.specialtyName,
  };

  saveSession(session);
  return session;
}

export function loginPatient(phoneNumber: string) {
  const loginId = normalizePhone(phoneNumber);

  if (loginId.length < 10) {
    throw new Error("Enter a valid 10 digit mobile number to continue.");
  }

  const session: AppSession = {
    role: "patient",
    displayName: `Patient ${loginId}`,
    loginId,
  };

  saveSession(session);
  localStorage.setItem("patientAccountLookup", loginId);
  return session;
}
