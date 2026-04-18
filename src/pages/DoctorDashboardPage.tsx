import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredSession } from "../lib/session";
import { getTodayDoctorQueue } from "../services/doctorService";
import type { DoctorQueueItem } from "../types/doctor";

const urgencyStyles: Record<string, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-red-200 bg-red-50 text-red-700",
};

const statusStyles: Record<string, string> = {
  waiting: "bg-slate-100 text-slate-700",
  in_consultation: "bg-cyan-50 text-brand-900",
  completed: "bg-emerald-50 text-emerald-700",
};

function formatTime(time: string) {
  return time ? time.slice(0, 5) : "--:--";
}

export function DoctorDashboardPage() {
  const session = getStoredSession();
  const doctorId = session?.role === "doctor" ? session.doctorId : undefined;
  const doctorName =
    session?.role === "doctor" ? session.displayName : "All doctors";
  const [queue, setQueue] = useState<DoctorQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    getTodayDoctorQueue(doctorId)
      .then((items) => {
        if (isMounted) {
          setQueue(items);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load today's queue.",
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
  }, [doctorId]);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
              Doctor OPD
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {session?.role === "doctor"
                ? `${doctorName}'s OPD queue`
                : "Today's OPD queue"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              {session?.role === "doctor"
                ? `Showing only OPD patients assigned to ${doctorName}${
                    session.specialtyName ? ` (${session.specialtyName})` : ""
                  }.`
                : "Open each OPD token from the queue and save the consultation record digitally."}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              waiting tokens
            </p>
            <p className="mt-1 text-3xl font-semibold text-slate-950">
              {queue.length}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900">
        The doctor queue shows only admin-approved OPD tokens. Each consultation
        opens the AI summary, patient record, previous visits, and prescription
        form in one place.
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Loading today's OPD queue...
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && queue.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          No OPD tokens are waiting in this queue yet.
        </div>
      ) : null}

      <div className="grid gap-4">
        {queue.map((item) => (
          <article
            key={item.booking_id}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-xl font-semibold text-white">
                  {item.token_number ?? "-"}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-slate-950">
                      {item.patient_name}
                    </h2>
                    <span
                      className={[
                        "rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize",
                        urgencyStyles[item.urgency_level ?? ""] ??
                          "border-slate-200 bg-slate-50 text-slate-600",
                      ].join(" ")}
                    >
                      {item.urgency_level ?? "unknown"} urgency
                    </span>
                    <span
                      className={[
                        "rounded-lg px-2.5 py-1 text-xs font-semibold",
                        statusStyles[item.consultation_status] ??
                          "bg-slate-100 text-slate-700",
                      ].join(" ")}
                    >
                      {item.consultation_status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span>{item.patient_code}</span>
                    <span>{item.booking_code}</span>
                    <span>
                      {formatTime(item.slot_start_time)} to{" "}
                      {formatTime(item.slot_end_time)}
                    </span>
                    <span>{item.doctor_name}</span>
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
                    {item.symptom_summary}
                  </p>
                </div>
              </div>
              <Link
                to={`/consultation/${item.booking_id}`}
                className="inline-flex w-full justify-center rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900 lg:w-auto"
              >
                Open Consultation
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
