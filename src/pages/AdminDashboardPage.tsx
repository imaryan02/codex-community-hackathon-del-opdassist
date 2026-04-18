import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminDashboardSummary,
  type AdminDashboardSummary,
} from "../services/adminService";

type AvailabilityFilter = "all" | "available" | "unavailable";

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`rounded-lg border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-75">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

export function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredDoctors = (summary?.doctors ?? []).filter((doctor) => {
    if (availabilityFilter === "available") {
      return doctor.available_today;
    }

    if (availabilityFilter === "unavailable") {
      return !doctor.available_today;
    }

    return true;
  });

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    getAdminDashboardSummary()
      .then((result) => {
        if (isMounted) {
          setSummary(result);
        }
      })
      .catch((fetchError) => {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Could not load admin dashboard.",
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
  }, []);

  if (isLoading) {
    return <div className="app-state-info">Loading hospital dashboard...</div>;
  }

  if (error) {
    return <div className="app-state-error">{error}</div>;
  }

  if (!summary) {
    return <div className="app-state-warning">No dashboard data found.</div>;
  }

  return (
    <section className="space-y-6">
      <div className="app-card p-6 sm:p-8">
        <p className="app-eyebrow">Hospital operations</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="app-title">Live OPD operations.</h1>
            <p className="app-muted mt-4 max-w-2xl">
              Track available doctors, OPD capacity, waiting tokens, and
              completed consultations from one operations view.
            </p>
          </div>
          <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm font-semibold text-brand-900">
            Patients use their token at the OPD counter for registration/payment.
          </div>
        </div>
        <Link
          to="/admin-approvals"
          className="mt-5 inline-flex rounded-lg bg-brand-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-900"
        >
          Open token approvals
        </Link>
        <Link
          to="/admin-management"
          className="ml-3 mt-5 inline-flex rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
        >
          Manage doctors and OPD times
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Doctors" value={summary.totalDoctors} />
        <StatCard
          label="Available today"
          value={summary.availableDoctors}
          tone="success"
        />
        <StatCard label="Open OPD times" value={summary.availableSlotsToday} />
        <StatCard
          label="Tokens issued"
          value={summary.bookedSlotsToday}
          tone="warning"
        />
        <StatCard label="OPD tokens today" value={summary.bookingsToday} />
        <StatCard
          label="Completed consults"
          value={summary.completedConsultations}
          tone="success"
        />
        <StatCard label="Total OPD times" value={summary.totalSlotsToday} />
        <StatCard
          label="Reception status"
          value={summary.bookingsToday ? "Active" : "Ready"}
        />
      </div>

      <section className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900">
        <p className="font-black uppercase tracking-wide">Operations model</p>
        <p className="mt-2">
          This dashboard separates hospital capacity from clinical work. Admin
          handles roster, OPD times, and token approvals; doctors only receive
          approved patients in their queue.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="app-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Doctor availability
              </h2>
              <p className="app-muted mt-1">
                Current availability and specialty coverage.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-white p-1 text-sm font-bold">
              {[
                { label: "All", value: "all" },
                { label: "Available", value: "available" },
                { label: "Unavailable", value: "unavailable" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setAvailabilityFilter(option.value as AvailabilityFilter)
                  }
                  className={[
                    "rounded-md px-3 py-2 transition",
                    availabilityFilter === option.value
                      ? "bg-brand-700 text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {filteredDoctors.length === 0 ? (
              <div className="app-state-info">
                No doctors match this availability filter.
              </div>
            ) : null}
            {filteredDoctors.slice(0, 8).map((doctor) => (
              <div
                key={doctor.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">
                      {doctor.full_name}
                    </p>
                    <p className="mt-1 text-sm text-brand-900">
                      {doctor.specialty_name}
                    </p>
                  </div>
                  <span
                    className={[
                      "rounded-lg px-3 py-1 text-xs font-bold",
                      doctor.available_today
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {doctor.available_today ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="app-card p-5 sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">Today's OPD tokens</h2>
          <p className="app-muted mt-1">
            Patients show these tokens at the OPD counter and then wait for the
            assigned doctor queue.
          </p>

          <div className="mt-5 grid gap-3">
            {summary.bookings.length === 0 ? (
              <div className="app-state-warning">No OPD tokens yet today.</div>
            ) : null}

            {summary.bookings.slice(0, 10).map((booking) => (
              <div
                key={booking.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold text-slate-950">
                      Token {booking.token_number ?? "-"} -{" "}
                      {booking.patient_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {booking.patient_code} - {booking.doctor_name} -{" "}
                      {booking.slot_time}
                    </p>
                  </div>
                  <span className="rounded-lg bg-cyan-50 px-3 py-1 text-xs font-bold text-brand-900">
                    {booking.consultation_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
