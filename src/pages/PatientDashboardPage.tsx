import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { normalizePhone } from "../lib/phone";
import { getStoredSession, saveSession } from "../lib/session";
import {
  deletePatientDocument,
  getPatientDocuments,
  renamePatientDocument,
  uploadPatientDocument,
} from "../services/patientDocumentService";
import { getPatientAccountOverview } from "../services/patientHistoryService";
import { updatePatientProfile } from "../services/patientService";
import type { DocumentType, PatientDocument } from "../types/document";
import type { PatientAccountOverview } from "../types/history";

type ProfileEditForm = {
  fullName: string;
  age: string;
  gender: string;
  phone: string;
};

type ProfileEditErrors = Partial<Record<keyof ProfileEditForm, string>>;

const genderOptions = ["Male", "Female", "Transgender"];
const documentTypes: DocumentType[] = [
  "Prescription",
  "Lab Report",
  "Scan",
  "Discharge Summary",
  "Other",
];

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPatientVisitStatusLabel(
  bookingStatus: string | null,
  consultationStatus: string | null,
) {
  if (bookingStatus === "confirmed" && consultationStatus === "waiting") {
    return "Approved - waiting for doctor";
  }

  if (bookingStatus === "confirmed") {
    return "Approved";
  }

  if (bookingStatus === "pending_approval") {
    return "Waiting for admin approval";
  }

  if (bookingStatus === "cancelled" || consultationStatus === "cancelled") {
    return "Cancelled";
  }

  if (bookingStatus === "completed" || consultationStatus === "completed") {
    return "Completed";
  }

  return consultationStatus ?? "Intake saved";
}

export function PatientDashboardPage() {
  const session = getStoredSession();
  const lookup =
    session?.role === "patient"
      ? session.loginId
      : localStorage.getItem("patientAccountLookup") ?? "";
  const [account, setAccount] = useState<PatientAccountOverview | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(lookup));
  const [error, setError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<ProfileEditForm>({
    fullName: "",
    age: "",
    gender: "",
    phone: "",
  });
  const [editErrors, setEditErrors] = useState<ProfileEditErrors>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRefreshingRecord, setIsRefreshingRecord] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [documentMessage, setDocumentMessage] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("Prescription");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editingDocumentTitle, setEditingDocumentTitle] = useState("");
  const [expandedVisitKey, setExpandedVisitKey] = useState<string | null>(null);

  const loadPatientRecord = useCallback(async () => {
    if (!lookup || lookup === "walk-in") {
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const overview = await getPatientAccountOverview(lookup);
      setAccount(overview);
      return overview;
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Could not load patient dashboard.",
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [lookup]);

  useEffect(() => {
    void loadPatientRecord();
  }, [loadPatientRecord]);

  const loadDocuments = useCallback(async () => {
    const profile = account?.latestProfile;

    if (!profile) {
      setDocuments([]);
      return;
    }

    setIsLoadingDocuments(true);
    setDocumentError(null);

    try {
      const nextDocuments = await getPatientDocuments({
        patientId: profile.patient_id,
        accountMobile: profile.phone ?? account.lookup,
      });
      setDocuments(nextDocuments);
    } catch (fetchError) {
      setDocumentError(
        fetchError instanceof Error
          ? fetchError.message
          : "Could not load medical documents.",
      );
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [account?.latestProfile, account?.lookup]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    const hasPendingToken = account?.history.some(
      (visit) =>
        visit.booking_status === "pending_approval" ||
        visit.consultation_status === "pending_approval",
    );

    if (!hasPendingToken) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadPatientRecord();
    }, 5000);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadPatientRecord();
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [account?.history, loadPatientRecord]);

  const refreshPatientRecord = async () => {
    setIsRefreshingRecord(true);
    setSaveMessage(null);

    try {
      const overview = await loadPatientRecord();

      if (overview) {
        setSaveMessage("Health record refreshed.");
      }
    } finally {
      setIsRefreshingRecord(false);
    }
  };

  useEffect(() => {
    const profile = account?.latestProfile;

    if (!profile || isEditingProfile) {
      return;
    }

    setEditForm({
      fullName: profile.full_name,
      age: String(profile.age),
      gender: profile.gender ?? "",
      phone: profile.phone ?? "",
    });
  }, [account?.latestProfile, isEditingProfile]);

  const validateEditForm = () => {
    const nextErrors: ProfileEditErrors = {};
    const trimmedName = editForm.fullName.trim();
    const parsedAge = Number(editForm.age);
    const phoneDigits = normalizePhone(editForm.phone);

    if (!trimmedName) {
      nextErrors.fullName = "Enter the patient's full name.";
    } else if (trimmedName.length < 2) {
      nextErrors.fullName = "Name should be at least 2 characters.";
    }

    if (!editForm.age.trim()) {
      nextErrors.age = "Enter the patient's age.";
    } else if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      nextErrors.age = "Enter a valid age between 1 and 120.";
    }

    if (!editForm.gender) {
      nextErrors.gender = "Select a gender option.";
    }

    if (!editForm.phone.trim()) {
      nextErrors.phone = "Enter a mobile number.";
    } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      nextErrors.phone = "Enter a valid phone number with 10 to 15 digits.";
    }

    return nextErrors;
  };

  const updateEditField = (field: keyof ProfileEditForm, value: string) => {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
    setEditErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setSaveMessage(null);
  };

  const cancelEditProfile = () => {
    const profile = account?.latestProfile;

    if (profile) {
      setEditForm({
        fullName: profile.full_name,
        age: String(profile.age),
        gender: profile.gender ?? "",
        phone: profile.phone ?? "",
      });
    }

    setEditErrors({});
    setSaveMessage(null);
    setIsEditingProfile(false);
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!account?.latestProfile) {
      return;
    }

    const nextErrors = validateEditForm();
    setEditErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSavingProfile(true);
    setError(null);
    setSaveMessage(null);

    try {
      const updated = await updatePatientProfile(account.latestProfile.patient_id, {
        full_name: editForm.fullName.trim(),
        age: Number(editForm.age),
        gender: editForm.gender || null,
        phone: normalizePhone(editForm.phone) || null,
      });
      const updatedPhone = updated.phone ?? "";
      const nextLookup = updatedPhone || account.lookup;

      if (updatedPhone) {
        localStorage.setItem("patientAccountLookup", updatedPhone);
      }

      if (session?.role === "patient") {
        saveSession({
          ...session,
          loginId: nextLookup,
          displayName: `Patient ${nextLookup}`,
        });
      }

      setAccount((current) =>
        current
          ? {
              ...current,
              lookup: nextLookup,
              latestProfile: {
                patient_id: updated.id,
                patient_code: updated.patient_code,
                full_name: updated.full_name,
                age: updated.age,
                gender: updated.gender,
                phone: updated.phone,
                created_at: updated.created_at,
              },
              history: current.history.map((visit) =>
                visit.patient_id === updated.id
                  ? {
                      ...visit,
                      patient_name: updated.full_name,
                    }
                  : visit,
              ),
            }
          : current,
      );
      setSaveMessage("Profile details updated.");
      setIsEditingProfile(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update patient profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDocumentUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!account?.latestProfile) {
      return;
    }

    if (!documentFile) {
      setDocumentError("Choose a PDF or image before uploading.");
      return;
    }

    setIsUploadingDocument(true);
    setDocumentError(null);
    setDocumentMessage(null);

    try {
      await uploadPatientDocument({
        patientId: account.latestProfile.patient_id,
        accountMobile: account.latestProfile.phone ?? account.lookup,
        file: documentFile,
        title: documentTitle.trim() || documentFile.name,
        documentType,
      });
      setDocumentTitle("");
      setDocumentType("Prescription");
      setDocumentFile(null);
      setDocumentMessage("Medical document uploaded.");
      await loadDocuments();
    } catch (uploadError) {
      setDocumentError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload medical document.",
      );
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleDocumentRename = async (documentId: string) => {
    const nextTitle = editingDocumentTitle.trim();

    if (!nextTitle) {
      setDocumentError("Enter a document title.");
      return;
    }

    setDocumentError(null);
    setDocumentMessage(null);

    try {
      await renamePatientDocument(documentId, nextTitle);
      setEditingDocumentId(null);
      setEditingDocumentTitle("");
      setDocumentMessage("Document renamed.");
      await loadDocuments();
    } catch (renameError) {
      setDocumentError(
        renameError instanceof Error
          ? renameError.message
          : "Could not rename document.",
      );
    }
  };

  const handleDocumentDelete = async (document: PatientDocument) => {
    setDocumentError(null);
    setDocumentMessage(null);

    try {
      await deletePatientDocument(document);
      setDocumentMessage("Document deleted.");
      await loadDocuments();
    } catch (deleteError) {
      setDocumentError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete document.",
      );
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
        <p className="font-black uppercase tracking-wide">Prototype privacy note</p>
        <p className="mt-2">
          This demo uses mobile number for quick check-in. Production
          will use verified mobile OTP and database access rules, so patients
          see only their own records and doctors see only assigned OPD cases.
        </p>
      </div>

      <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900 shadow-sm">
        <p className="font-black uppercase tracking-wide">Longitudinal OPD record</p>
        <p className="mt-2">
          This dashboard links repeat visits by mobile number, keeps
          previous symptoms and tokens visible, and lets the patient update
          basic profile details before the next visit.
        </p>
      </div>

      <div className="app-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="app-eyebrow">Patient health record</p>
            <h1 className="app-title mt-3">OPD record and visits.</h1>
            <p className="app-muted mt-4 max-w-2xl">
              Review previous visits, token details, prescriptions, and start a
              new OPD visit from the same mobile account.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register/voice"
              onClick={() => {
                localStorage.setItem("visitPatientMode", "self");
                window.dispatchEvent(new Event("visit-patient-mode-changed"));
              }}
              className="app-primary-button text-center"
            >
              Start new OPD visit
            </Link>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="app-state-info">Loading patient account...</div>
      ) : null}

      {error ? <div className="app-state-error">{error}</div> : null}
      {saveMessage ? <div className="app-state-success">{saveMessage}</div> : null}

      {!isLoading && !error && !account?.latestProfile ? (
        <div className="app-card p-6">
          <h2 className="text-xl font-bold text-slate-950">
            No OPD profile found yet.
          </h2>
          <p className="app-muted mt-3">
            Complete the first AI intake to create the patient record. The
            mobile number entered at check-in will be prefilled and used to link
            future visits.
          </p>
          <Link
            to="/register/voice"
            onClick={() => {
              localStorage.setItem("visitPatientMode", "self");
              window.dispatchEvent(new Event("visit-patient-mode-changed"));
            }}
            className="app-primary-button mt-5 inline-flex"
          >
            Start AI intake
          </Link>
        </div>
      ) : null}

      {account?.latestProfile ? (
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="app-card p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-950">Profile details</h2>
              {!isEditingProfile ? (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
                >
                  Edit
                </button>
              ) : null}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleProfileSubmit} className="mt-5 grid gap-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Patient code
                  </p>
                  <p className="mt-1 font-bold text-brand-900">
                    {account.latestProfile.patient_code}
                  </p>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-slate-900">
                    Full name
                  </span>
                  <input
                    value={editForm.fullName}
                    onChange={(event) =>
                      updateEditField("fullName", event.target.value)
                    }
                    className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-950 outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                  />
                  {editErrors.fullName ? (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      {editErrors.fullName}
                    </p>
                  ) : null}
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-bold text-slate-900">Age</span>
                    <input
                      value={editForm.age}
                      onChange={(event) =>
                        updateEditField("age", event.target.value)
                      }
                      inputMode="numeric"
                      className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-950 outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                    />
                    {editErrors.age ? (
                      <p className="mt-2 text-sm font-semibold text-red-600">
                        {editErrors.age}
                      </p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-slate-900">
                      Gender
                    </span>
                    <select
                      value={editForm.gender}
                      onChange={(event) =>
                        updateEditField("gender", event.target.value)
                      }
                      className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                    >
                      <option value="">Select gender</option>
                      {genderOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {editErrors.gender ? (
                      <p className="mt-2 text-sm font-semibold text-red-600">
                        {editErrors.gender}
                      </p>
                    ) : null}
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-slate-900">
                    Mobile number
                  </span>
                  <input
                    value={editForm.phone}
                    onChange={(event) =>
                      updateEditField("phone", event.target.value)
                    }
                    inputMode="tel"
                    className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-950 outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                  />
                  {editErrors.phone ? (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      {editErrors.phone}
                    </p>
                  ) : null}
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={cancelEditProfile}
                    disabled={isSavingProfile}
                    className="min-h-12 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="min-h-12 rounded-lg bg-brand-700 px-5 text-sm font-bold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isSavingProfile ? "Saving..." : "Save profile"}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="mt-5 grid gap-4 text-sm">
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-bold uppercase text-slate-500">
                    Patient code
                  </dt>
                  <dd className="mt-1 font-bold text-brand-900">
                    {account.latestProfile.patient_code}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-bold uppercase text-slate-500">
                    Name
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {account.latestProfile.full_name}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <dt className="text-xs font-bold uppercase text-slate-500">
                      Age
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {account.latestProfile.age}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <dt className="text-xs font-bold uppercase text-slate-500">
                      Gender
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {account.latestProfile.gender ?? "Not provided"}
                    </dd>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-bold uppercase text-slate-500">
                    Mobile / OPD account
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {account.latestProfile.phone ?? account.lookup}
                  </dd>
                </div>
              </dl>
            )}
          </aside>

          <div className="space-y-6">
          <section className="app-card p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Medical documents
                </h2>
                <p className="app-muted mt-1">
                  Upload old prescriptions, lab reports, scans, or discharge
                  summaries so the doctor can view them during consultation.
                </p>
              </div>
              <span className="w-fit rounded-lg bg-cyan-50 px-3 py-2 text-xs font-bold text-brand-900">
                {documents.length} files
              </span>
            </div>

            <form
              onSubmit={handleDocumentUpload}
              className="mt-5 grid gap-3 rounded-lg border border-cyan-100 bg-cyan-50 p-4 lg:grid-cols-[1fr_0.8fr_1fr_auto]"
            >
              <input
                value={documentTitle}
                onChange={(event) => setDocumentTitle(event.target.value)}
                className="min-h-12 rounded-lg border border-slate-300 px-4 text-sm font-semibold outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                placeholder="Document title"
              />
              <select
                value={documentType}
                onChange={(event) =>
                  setDocumentType(event.target.value as DocumentType)
                }
                className="min-h-12 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
              >
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(event) =>
                  setDocumentFile(event.target.files?.[0] ?? null)
                }
                className="min-h-12 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              />
              <button
                type="submit"
                disabled={isUploadingDocument}
                className="min-h-12 rounded-lg bg-brand-700 px-5 text-sm font-bold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isUploadingDocument ? "Uploading..." : "Upload"}
              </button>
            </form>

            {documentError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {documentError}
              </div>
            ) : null}

            {documentMessage ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                {documentMessage}
              </div>
            ) : null}

            {isLoadingDocuments ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Loading medical documents...
              </div>
            ) : null}

            {!isLoadingDocuments && documents.length === 0 ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No medical documents uploaded yet.
              </div>
            ) : null}

            <div className="mt-5 grid gap-3">
              {documents.map((document) => (
                <article
                  key={document.id}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      {editingDocumentId === document.id ? (
                        <input
                          value={editingDocumentTitle}
                          onChange={(event) =>
                            setEditingDocumentTitle(event.target.value)
                          }
                          className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                        />
                      ) : (
                        <p className="font-bold text-slate-950">
                          {document.title}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-slate-600">
                        {document.document_type ?? "Other"} - {document.file_name}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {document.signed_url ? (
                        <a
                          href={document.signed_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-bold text-slate-800 transition hover:bg-slate-100"
                        >
                          Open
                        </a>
                      ) : null}
                      {editingDocumentId === document.id ? (
                        <button
                          type="button"
                          onClick={() => void handleDocumentRename(document.id)}
                          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-900"
                        >
                          Save name
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDocumentId(document.id);
                            setEditingDocumentTitle(document.title);
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
                        >
                          Rename
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDocumentDelete(document)}
                        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="app-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Visit history
                </h2>
                <p className="app-muted mt-1">
                  These records are linked to the patient's mobile number.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <span className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-bold text-brand-900">
                  {account.history.length} visits
                </span>
                <button
                  type="button"
                  onClick={() => void refreshPatientRecord()}
                  disabled={isRefreshingRecord}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {isRefreshingRecord ? "Refreshing..." : "Refresh record"}
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {account.history.map((visit) => {
                const visitKey = `${visit.patient_id}-${visit.visit_date}`;
                const isExpanded = expandedVisitKey === visitKey;

                return (
                  <article
                    key={visitKey}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-bold text-slate-950">
                          {visit.patient_name} - {formatDateTime(visit.visit_date)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {visit.booking_code ?? "No token yet"}
                          {visit.token_number ? ` - Token ${visit.token_number}` : ""}
                        </p>
                      </div>
                      <span className="w-fit rounded-lg bg-white px-3 py-1 text-xs font-bold text-brand-900">
                        {getPatientVisitStatusLabel(
                          visit.booking_status,
                          visit.consultation_status,
                        )}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {visit.symptom_summary ?? visit.symptom_input}
                    </p>

                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Doctor
                        </p>
                        <p className="mt-1 text-slate-800">
                          {visit.doctor_name ?? "Not assigned"} -{" "}
                          {visit.specialty_name ?? "No specialty"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Prescription summary
                        </p>
                        <p className="mt-1 text-slate-800">
                          {visit.prescription_text ||
                            visit.diagnosis ||
                            visit.follow_up_advice ||
                            "No prescription saved yet"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedVisitKey(isExpanded ? null : visitKey)
                      }
                      className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
                    >
                      {isExpanded ? "Hide details" : "See full consultation details"}
                    </button>

                    {isExpanded ? (
                      <div className="mt-4 rounded-lg border border-cyan-100 bg-white p-4">
                        <div className="grid gap-4 text-sm md:grid-cols-2">
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-500">
                              Diagnosis
                            </p>
                            <p className="mt-1 leading-6 text-slate-800">
                              {visit.diagnosis ?? "No diagnosis saved yet"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-500">
                              Prescription
                            </p>
                            <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-800">
                              {visit.prescription_text ??
                                "No prescription saved yet"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-500">
                              Doctor notes
                            </p>
                            <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-800">
                              {visit.notes ?? "No doctor notes saved yet"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-500">
                              Follow-up advice
                            </p>
                            <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-800">
                              {visit.follow_up_advice ??
                                "No follow-up advice saved yet"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-500">
                              Prescription date
                            </p>
                            <p className="mt-1 leading-6 text-slate-800">
                              {formatDateTime(visit.prescription_date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-500">
                              OPD token status
                            </p>
                            <p className="mt-1 leading-6 text-slate-800">
                              {getPatientVisitStatusLabel(
                                visit.booking_status,
                                visit.consultation_status,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}
