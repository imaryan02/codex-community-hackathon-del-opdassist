import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createBooking, getBookingStatus } from "../services/bookingService";
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
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshBookingStatus = useCallback(async () => {
    if (!confirmation?.booking_id) {
      return;
    }

    setIsRefreshingStatus(true);
    setErrorMessage(null);

    try {
      const status = await getBookingStatus(confirmation.booking_id);
      setConfirmation((current) => {
        if (!current) {
          return current;
        }

        if (
          current.booking_status === status.booking_status &&
          current.consultation_status === status.consultation_status &&
          current.token_number === status.token_number
        ) {
          return current;
        }

        const updatedConfirmation = {
          ...current,
          booking_status: status.booking_status,
          consultation_status: status.consultation_status,
          token_number: status.token_number,
        };

        localStorage.setItem(
          "latestBookingConfirmation",
          JSON.stringify(updatedConfirmation),
        );

        return updatedConfirmation;
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not refresh OPD token status.",
      );
    } finally {
      setIsRefreshingStatus(false);
    }
  }, [confirmation?.booking_id]);

  useEffect(() => {
    if (!confirmation) {
      return;
    }

    void refreshBookingStatus();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshBookingStatus();
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    if (confirmation.booking_status !== "pending_approval") {
      return () => {
        window.removeEventListener("focus", refreshWhenVisible);
        document.removeEventListener("visibilitychange", refreshWhenVisible);
      };
    }

    const intervalId = window.setInterval(() => {
      void refreshBookingStatus();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [confirmation?.booking_id, confirmation?.booking_status, refreshBookingStatus]);

  useEffect(() => {
    if (!confirmation) {
      return;
    }

    const syncStoredStatus = () => {
      const storedConfirmation = getStoredBookingConfirmation(bookingDraft);

      if (
        storedConfirmation &&
        storedConfirmation.booking_id === confirmation.booking_id
      ) {
        setConfirmation(storedConfirmation);
        return;
      }

      void refreshBookingStatus();
    };

    window.addEventListener("booking-status-changed", syncStoredStatus);
    window.addEventListener("storage", syncStoredStatus);

    return () => {
      window.removeEventListener("booking-status-changed", syncStoredStatus);
      window.removeEventListener("storage", syncStoredStatus);
    };
  }, [bookingDraft, confirmation?.booking_id, refreshBookingStatus]);

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
          OPD token
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          No OPD token draft found.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
          Complete department routing before generating a token.
        </p>
        <Link
          to="/booking"
          className="mt-6 inline-flex rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900"
        >
          Go to OPD token
        </Link>
      </section>
    );
  }

  const displayData = confirmation ?? bookingDraft;
  const tokenIsApproved =
    confirmation?.booking_status === "confirmed" ||
    confirmation?.consultation_status === "waiting" ||
    confirmation?.consultation_status === "in_consultation" ||
    confirmation?.consultation_status === "completed";

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          OPD token
        </p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {confirmation ? "OPD token generated." : "Review OPD token."}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              Confirming creates the OPD record, reserves this time, and
              generates a token for the reception counter.
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

      <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900">
        Token status stays connected to admin approval. Patients can wait on
        this page or refresh later from the health record after reception
        confirms the visit.
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            OPD token summary
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                patient code
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {displayData?.patient_code}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                token record
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
                department
              </p>
              <p className="mt-1 text-lg font-semibold text-brand-900">
                {displayData?.recommended_specialty_name}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                OPD date
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {displayData?.slot_date}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                OPD time
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
            Token status
          </h2>
          {confirmation ? (
            <div className="mt-5 space-y-4">
              {tokenIsApproved ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                  OPD token approved by admin. The patient can wait for the
                  doctor's OPD queue.
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                  OPD token saved and waiting for admin approval.
                </div>
              )}
              <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm font-semibold text-brand-900">
                Please show token {confirmation.token_number} at the OPD
                registration/payment counter before consultation.
              </div>
              <button
                type="button"
                onClick={() => void refreshBookingStatus()}
                disabled={isRefreshingStatus}
                className="w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {isRefreshingStatus ? "Refreshing status..." : "Refresh token status"}
              </button>
              {errorMessage ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {errorMessage}
                </div>
              ) : null}
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    record id
                  </p>
                  <p className="mt-1 break-all text-slate-700">
                    {confirmation.booking_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    booking_status
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {confirmation.booking_status}
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
                to="/patient-dashboard"
                className="inline-flex w-full justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                Open health record
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                This OPD token is not saved yet.
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
                {isConfirming ? "Generating token..." : "Generate OPD token"}
              </button>
              <p className="text-sm leading-6 text-slate-600">
                Online payment is skipped in this prototype. The patient uses
                this token at the OPD counter and pays there if required.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
