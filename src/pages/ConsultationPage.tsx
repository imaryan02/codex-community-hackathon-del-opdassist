import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getConsultationDetail } from "../services/doctorService";
import { savePrescription } from "../services/prescriptionService";
import type { ConsultationDetail } from "../types/doctor";

type ConsultationFormState = {
  diagnosis: string;
  prescription_text: string;
  notes: string;
  follow_up_advice: string;
};

const initialFormState: ConsultationFormState = {
  diagnosis: "",
  prescription_text: "",
  notes: "",
  follow_up_advice: "",
};

const urgencyStyles: Record<string, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-red-200 bg-red-50 text-red-700",
};

function formatTime(time: string) {
  return time ? time.slice(0, 5) : "--:--";
}

export function ConsultationPage() {
  const { bookingId } = useParams();
  const [detail, setDetail] = useState<ConsultationDetail | null>(null);
  const [form, setForm] = useState<ConsultationFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setIsLoading(false);
      setErrorMessage("Missing booking ID.");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    getConsultationDetail(bookingId)
      .then((result) => {
        if (isMounted) {
          setDetail(result);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load consultation detail.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  const updateField = (field: keyof ConsultationFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setSaveMessage(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!detail) {
      return;
    }

    if (detail.consultation_status === "completed") {
      setSaveMessage("This consultation is already marked completed.");
      return;
    }

    if (
      !form.diagnosis.trim() &&
      !form.prescription_text.trim() &&
      !form.notes.trim() &&
      !form.follow_up_advice.trim()
    ) {
      setErrorMessage("Enter at least one consultation field before saving.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveMessage(null);

    try {
      await savePrescription({
        patient_id: detail.patient_id,
        booking_id: detail.booking_id,
        doctor_id: detail.doctor_id,
        diagnosis: form.diagnosis.trim(),
        prescription_text: form.prescription_text.trim(),
        notes: form.notes.trim(),
        follow_up_advice: form.follow_up_advice.trim(),
      });

      setDetail((current) =>
        current
          ? {
              ...current,
              consultation_status: "completed",
              booking_status: "completed",
            }
          : current,
      );
      setSaveMessage("Consultation saved and booking marked completed.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not save consultation. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        Loading consultation detail...
      </div>
    );
  }

  if (!detail) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Consultation
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          Consultation record unavailable.
        </h1>
        {errorMessage ? (
          <p className="mt-4 max-w-2xl text-sm leading-6 text-red-700">
            {errorMessage}
          </p>
        ) : null}
        <Link
          to="/doctor-dashboard"
          className="mt-6 inline-flex rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900"
        >
          Back to queue
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
              Consultation
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {detail.patient_name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-700">
                {detail.patient_code}
              </span>
              <span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-700">
                {detail.booking_code}
              </span>
              <span
                className={[
                  "rounded-lg border px-3 py-2 font-semibold capitalize",
                  urgencyStyles[detail.urgency_level ?? ""] ??
                    "border-slate-200 bg-slate-50 text-slate-600",
                ].join(" ")}
              >
                {detail.urgency_level ?? "unknown"} urgency
              </span>
              <span className="rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">
                {detail.consultation_status}
              </span>
            </div>
          </div>
          <Link
            to="/doctor-dashboard"
            className="inline-flex w-full justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 lg:w-auto"
          >
            Back to queue
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              Patient details
            </h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Age
                </dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {detail.patient_age}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Gender
                </dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {detail.patient_gender ?? "Not provided"}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Phone
                </dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {detail.patient_phone ?? "Not provided"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              Intake summary
            </h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Original symptoms
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {detail.original_symptom_input}
                </p>
              </div>
              <div className="rounded-lg bg-cyan-50 p-4">
                <p className="text-xs font-semibold uppercase text-brand-700">
                  AI summary
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-800">
                  {detail.symptom_summary}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Recommended specialty
                </p>
                <p className="mt-2 text-sm font-semibold text-brand-900">
                  {detail.recommended_specialty_name}
                </p>
                {detail.ai_reasoning ? (
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {detail.ai_reasoning}
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Doctor and slot
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {detail.doctor_name}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {detail.doctor_qualification ?? "Qualification not listed"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {detail.slot_date} at {formatTime(detail.slot_start_time)} to{" "}
                  {formatTime(detail.slot_end_time)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-semibold text-slate-950">
            Save consultation
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Add the doctor's diagnosis, prescription, notes, and follow-up
            advice. Saving will complete the booking.
          </p>

          <div className="mt-5 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Diagnosis
              </span>
              <input
                value={form.diagnosis}
                onChange={(event) => updateField("diagnosis", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                placeholder="Acute gastritis"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Prescription
              </span>
              <textarea
                value={form.prescription_text}
                onChange={(event) =>
                  updateField("prescription_text", event.target.value)
                }
                className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                placeholder="Medication and dosage notes"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                placeholder="Clinical notes"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Follow-up advice
              </span>
              <textarea
                value={form.follow_up_advice}
                onChange={(event) =>
                  updateField("follow_up_advice", event.target.value)
                }
                className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
                placeholder="Follow-up timeline or warning signs"
              />
            </label>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {saveMessage ? (
            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
              {saveMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSaving || detail.consultation_status === "completed"}
            className="mt-6 w-full rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSaving
              ? "Saving consultation..."
              : detail.consultation_status === "completed"
                ? "Consultation completed"
                : "Save consultation"}
          </button>
        </form>
      </div>
    </section>
  );
}
