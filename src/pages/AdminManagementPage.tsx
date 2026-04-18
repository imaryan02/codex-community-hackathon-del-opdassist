import { FormEvent, useEffect, useState } from "react";
import {
  approveOpdToken,
  cancelOpdToken,
  createDoctor,
  createDoctorSlot,
  deleteDoctor,
  getAdminDashboardSummary,
  getPendingTokenApprovals,
  getSpecialties,
  updateDoctorAvailability,
  type AdminBookingRow,
  type AdminDashboardSummary,
} from "../services/adminService";
import type { Specialty } from "../types/doctor";

type AvailabilityFilter = "all" | "available" | "unavailable";

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminManagementPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [pendingTokens, setPendingTokens] = useState<AdminBookingRow[]>([]);
  const [doctorName, setDoctorName] = useState("");
  const [qualification, setQualification] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [hospitalName, setHospitalName] = useState("Government Hospital OPD");
  const [specialtyId, setSpecialtyId] = useState("");
  const [slotDoctorId, setSlotDoctorId] = useState("");
  const [slotDate, setSlotDate] = useState(getTodayDateString);
  const [slotStart, setSlotStart] = useState("10:00");
  const [slotEnd, setSlotEnd] = useState("10:15");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
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

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [nextSummary, nextSpecialties, nextPendingTokens] =
        await Promise.all([
          getAdminDashboardSummary(),
          getSpecialties(),
          getPendingTokenApprovals(),
        ]);

      setSummary(nextSummary);
      setSpecialties(nextSpecialties);
      setPendingTokens(nextPendingTokens);
      setSpecialtyId((current) => current || nextSpecialties[0]?.id || "");
      setSlotDoctorId((current) => current || nextSummary.doctors[0]?.id || "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load admin management data.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleAddDoctor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionMessage(null);
    setError(null);

    try {
      await createDoctor({
        full_name: doctorName.trim(),
        specialty_id: specialtyId,
        experience_years: experienceYears ? Number(experienceYears) : null,
        qualification: qualification.trim() || null,
        hospital_name: hospitalName.trim() || null,
      });
      setDoctorName("");
      setQualification("");
      setExperienceYears("");
      setActionMessage("Doctor added to OPD roster.");
      await loadData();
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Could not add doctor.",
      );
    }
  };

  const handleAddSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionMessage(null);
    setError(null);

    try {
      await createDoctorSlot({
        doctor_id: slotDoctorId,
        slot_date: slotDate,
        start_time: slotStart,
        end_time: slotEnd,
      });
      setActionMessage("OPD time added.");
      await loadData();
    } catch (slotError) {
      setError(
        slotError instanceof Error ? slotError.message : "Could not add OPD time.",
      );
    }
  };

  const updateAvailability = async (doctorId: string, availableToday: boolean) => {
    setActionMessage(null);
    setError(null);

    try {
      await updateDoctorAvailability(doctorId, availableToday);
      setActionMessage("Doctor availability updated.");
      await loadData();
    } catch (availabilityError) {
      setError(
        availabilityError instanceof Error
          ? availabilityError.message
          : "Could not update availability.",
      );
    }
  };

  const removeDoctor = async (doctorId: string) => {
    setActionMessage(null);
    setError(null);

    try {
      await deleteDoctor(doctorId);
      setActionMessage("Doctor marked unavailable for today's roster.");
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not remove doctor from today's roster.",
      );
    }
  };

  const approveToken = async (bookingId: string) => {
    setActionMessage(null);
    setError(null);

    try {
      await approveOpdToken(bookingId);
      setActionMessage("OPD token approved.");
      await loadData();
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Could not approve OPD token.",
      );
    }
  };

  const cancelToken = async (bookingId: string) => {
    setActionMessage(null);
    setError(null);

    try {
      await cancelOpdToken(bookingId);
      setActionMessage("OPD token cancelled.");
      await loadData();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Could not cancel OPD token.",
      );
    }
  };

  if (isLoading) {
    return <div className="app-state-info">Loading admin management...</div>;
  }

  return (
    <section className="space-y-6">
      <div className="app-card p-6 sm:p-8">
        <p className="app-eyebrow">Admin management</p>
        <h1 className="app-title mt-3">Manage doctors, OPD times, and tokens.</h1>
        <p className="app-muted mt-4 max-w-2xl">
          Add doctors, update availability, create OPD times, and approve or
          cancel patient tokens from one operations page.
        </p>
      </div>

      <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900">
        This is the scalable OPD control room: add doctors, open time windows,
        pause unavailable doctors, and clear token decisions without touching
        prescriptions.
      </div>

      {actionMessage ? <div className="app-state-success">{actionMessage}</div> : null}
      {error ? <div className="app-state-error">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleAddDoctor} className="app-card p-6">
          <h2 className="text-xl font-bold text-slate-950">Add doctor</h2>
          <div className="mt-5 grid gap-4">
            <input
              value={doctorName}
              onChange={(event) => setDoctorName(event.target.value)}
              required
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
              placeholder="Doctor full name"
            />
            <select
              value={specialtyId}
              onChange={(event) => setSpecialtyId(event.target.value)}
              required
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
            >
              {specialties.map((specialty) => (
                <option key={specialty.id} value={specialty.id}>
                  {specialty.name}
                </option>
              ))}
            </select>
            <input
              value={qualification}
              onChange={(event) => setQualification(event.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
              placeholder="Qualification"
            />
            <input
              value={experienceYears}
              onChange={(event) => setExperienceYears(event.target.value)}
              inputMode="numeric"
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
              placeholder="Experience years"
            />
            <input
              value={hospitalName}
              onChange={(event) => setHospitalName(event.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
              placeholder="Hospital name"
            />
          </div>
          <button type="submit" className="app-primary-button mt-5 w-full">
            Add doctor
          </button>
        </form>

        <form onSubmit={handleAddSlot} className="app-card p-6">
          <h2 className="text-xl font-bold text-slate-950">Add OPD time</h2>
          <div className="mt-5 grid gap-4">
            <select
              value={slotDoctorId}
              onChange={(event) => setSlotDoctorId(event.target.value)}
              required
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
            >
              {summary?.doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name} - {doctor.specialty_name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={slotDate}
              onChange={(event) => setSlotDate(event.target.value)}
              required
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                value={slotStart}
                onChange={(event) => setSlotStart(event.target.value)}
                required
                className="rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
              />
              <input
                type="time"
                value={slotEnd}
                onChange={(event) => setSlotEnd(event.target.value)}
                required
                className="rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-cyan-100"
              />
            </div>
          </div>
          <button type="submit" className="app-primary-button mt-5 w-full">
            Add OPD time
          </button>
        </form>
      </div>

      <section className="app-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Doctor roster</h2>
            <p className="app-muted mt-1">
              Filter doctors by today's availability before changing roster status.
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
          {filteredDoctors.map((doctor) => (
            <div
              key={doctor.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-bold text-slate-950">{doctor.full_name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {doctor.specialty_name} - {doctor.qualification ?? "No qualification"}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() =>
                      updateAvailability(doctor.id, !doctor.available_today)
                    }
                    className="app-secondary-button"
                  >
                    Mark {doctor.available_today ? "unavailable" : "available"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDoctor(doctor.id)}
                    className="rounded-lg border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    Mark unavailable
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="app-card p-6">
        <h2 className="text-xl font-bold text-slate-950">Pending OPD tokens</h2>
        <div className="mt-5 grid gap-3">
          {pendingTokens.length === 0 ? (
            <div className="app-state-success">No tokens pending approval.</div>
          ) : null}
          {pendingTokens.map((token) => (
            <div
              key={token.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-bold text-slate-950">
                    Token {token.token_number ?? "-"} - {token.patient_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {token.patient_code} - {token.doctor_name} - {token.slot_time}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => approveToken(token.id)}
                    className="app-primary-button"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelToken(token.id)}
                    className="rounded-lg border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
