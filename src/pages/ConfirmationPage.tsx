import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createBooking } from "../services/bookingService";
import type { BookingConfirmation, BookingDraft } from "../types/booking";

type ConfirmationLocationState = {
  bookingDraft?: BookingDraft;
};

function isBookingDraft(value: unknown): value is BookingDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Record<keyof BookingDraft, unknown>>;

  return (
    typeof candidate.patient_id === "string" &&
    typeof candidate.patient_code === "string" &&
    typeof candidate.ai_report_id === "string" &&
    typeof candidate.recommended_specialty_id === "string" &&
    typeof candidate.recommended_specialty_name === "string" &&
    typeof candidate.urgency_level === "string" &&
    typeof candidate.doctor_id === "string" &&
    typeof candidate.doctor_name === "string" &&
    typeof candidate.slot_id === "string" &&
    typeof candidate.slot_date === "string" &&
    typeof candidate.start_time === "string" &&
    typeof candidate.end_time === "string"
  );
}

function isBookingConfirmation(
  value: unknown,
): value is BookingConfirmation {
  if (!isBookingDraft(value)) {
    return false;
  }

  const candidate = value as Partial<
    Record<keyof BookingConfirmation, unknown>
  >;

  return (
    typeof candidate.booking_id === "string" &&
    typeof candidate.booking_code === "string" &&
    typeof candidate.token_number === "number" &&
    typeof candidate.booking_status === "string" &&
    typeof candidate.consultation_status === "string"
  );
}

function getStoredBookingDraft() {
  const storedValue = localStorage.getItem("latestBookingDraft");

  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue);
    return isBookingDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function bookingMatchesDraft(
  confirmation: BookingConfirmation,
  draft: BookingDraft,
) {
  return (
    confirmation.patient_id === draft.patient_id &&
    confirmation.doctor_id === draft.doctor_id &&
    confirmation.slot_id === draft.slot_id &&
    confirmation.ai_report_id === draft.ai_report_id
  );
}

function getStoredBookingConfirmation(draft: BookingDraft | null) {
  const storedValue = localStorage.getItem("latestBookingConfirmation");

  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue);
    if (!isBookingConfirmation(parsed)) {
      return null;
    }

    return !draft || bookingMatchesDraft(parsed, draft) ? parsed : null;
  } catch {
    return null;
  }
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

export function ConfirmationPage() {
  const location = useLocation();
  const state = location.state as ConfirmationLocationState | null;
  const [bookingDraft] = useState<BookingDraft | null>(
    state?.bookingDraft && isBookingDraft(state.bookingDraft)
      ? state.bookingDraft
      : getStoredBookingDraft(),
  );
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(
    () =>
      getStoredBookingConfirmation(
        state?.bookingDraft && isBookingDraft(state.bookingDraft)
          ? state.bookingDraft
          : getStoredBookingDraft(),
      ),
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!bookingDraft || confirmation || isConfirming) {
      return;
    }

    setIsConfirming(true);
    setErrorMessage(null);

    try {
      const result = await createBooking(bookingDraft);
      localStorage.setItem("latestBookingConfirmation", JSON.stringify(result));
      setConfirmation(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not confirm booking. Please try again.",
      );
    } finally {
      setIsConfirming(false);
    }
  };

  if (!bookingDraft && !confirmation) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Booking confirmation
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          No booking draft found.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
          Choose a doctor and slot before confirming an appointment.
        </p>
        <Link
          to="/booking"
          className="mt-6 inline-flex rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900"
        >
          Go to doctor selection
        </Link>
      </section>
    );
  }

  const displayData = confirmation ?? bookingDraft;

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Booking confirmation
        </p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {confirmation ? "Appointment confirmed." : "Review appointment."}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              Confirming creates the booking record and marks this slot as
              booked.
            </p>
          </div>
          {confirmation ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-emerald-700">
                token_number
              </p>
              <p className="mt-1 text-3xl font-semibold text-emerald-800">
                {confirmation.token_number}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Appointment summary
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                patient_code
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {displayData?.patient_code}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                booking_code
              </p>
              <p className="mt-1 text-lg font-semibold text-brand-900">
                {confirmation?.booking_code ?? "Pending confirmation"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                doctor
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {displayData?.doctor_name}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {displayData?.doctor_qualification ?? "Qualification not listed"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                specialty
              </p>
              <p className="mt-1 text-lg font-semibold text-brand-900">
                {displayData?.recommended_specialty_name}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                slot date
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {displayData?.slot_date}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                slot time
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {displayData
                  ? `${formatTime(displayData.start_time)} to ${formatTime(displayData.end_time)}`
                  : ""}
              </p>
            </div>
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Booking status
          </h2>
          {confirmation ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                Booking saved successfully.
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    booking_id
                  </p>
                  <p className="mt-1 break-all text-slate-700">
                    {confirmation.booking_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    consultation_status
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {confirmation.consultation_status}
                  </p>
                </div>
              </div>
              <Link
                to="/doctor-dashboard"
                className="inline-flex w-full justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                Open doctor queue
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                This appointment is not saved yet.
              </div>
              {errorMessage ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {errorMessage}
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isConfirming}
                className="w-full rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isConfirming ? "Confirming booking..." : "Confirm booking"}
              </button>
              <p className="text-sm leading-6 text-slate-600">
                Booking creation uses sequential writes: booking insert first,
                then slot update.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
