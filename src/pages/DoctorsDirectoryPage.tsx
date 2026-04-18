import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredSession } from "../lib/session";
import { getAllDoctors } from "../services/doctorService";
import type { DoctorWithSpecialty } from "../types/doctor";
import type { SavedPatientIntake } from "../types/patient";

type AvailabilityFilter = "all" | "available";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function isSavedPatientIntake(value: unknown): value is SavedPatientIntake {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Record<keyof SavedPatientIntake, unknown>>;

  return (
    typeof candidate.patient_id === "string" &&
    typeof candidate.patient_code === "string" &&
    typeof candidate.ai_report_id === "string" &&
    typeof candidate.recommended_specialty_id === "string" &&
    typeof candidate.recommended_specialty_name === "string" &&
    typeof candidate.symptom_summary === "string" &&
    typeof candidate.urgency_level === "string" &&
    typeof candidate.reasoning === "string"
  );
}

function getStoredIntakeResult() {
  const storedValue = localStorage.getItem("latestIntakeResult");

  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue);
    return isSavedPatientIntake(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function DoctorsDirectoryPage() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<DoctorWithSpecialty[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    getAllDoctors()
      .then((doctorRows) => {
        if (!isMounted) {
          return;
        }

        setDoctors(doctorRows);
      })
      .catch((fetchError) => {
        if (!isMounted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Could not load doctors. Please try again.",
        );
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

  const specialties = useMemo(() => {
    return Array.from(new Set(doctors.map((doctor) => doctor.specialty_name)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return doctors.filter((doctor) => {
      const matchesName =
        normalizedSearch.length === 0 ||
        doctor.full_name.toLowerCase().includes(normalizedSearch);
      const matchesSpecialty =
        specialtyFilter === "all" || doctor.specialty_name === specialtyFilter;
      const matchesAvailability =
        availabilityFilter === "all" || doctor.available_today;

      return matchesName && matchesSpecialty && matchesAvailability;
    });
  }, [availabilityFilter, doctors, searchTerm, specialtyFilter]);

  const handleBookAppointment = (doctor: DoctorWithSpecialty) => {
    const session = getStoredSession();
    const doctorContext = {
      doctor_id: doctor.id,
      doctor_name: doctor.full_name,
      specialty_id: doctor.specialty_id,
      specialty_name: doctor.specialty_name,
    };
    const intakeResult = getStoredIntakeResult();

    localStorage.setItem("preferredDoctorContext", JSON.stringify(doctorContext));

    if (session?.role !== "patient") {
      navigate("/");
      return;
    }

    localStorage.setItem("visitPatientMode", "self");

    if (intakeResult?.recommended_specialty_id === doctor.specialty_id) {
      navigate("/booking", {
        state: {
          intakeResult,
          preferredDoctorId: doctor.id,
        },
      });
      return;
    }

    navigate("/register/manual", {
      state: {
        preferredDoctorContext: doctorContext,
      },
    });
  };

  return (
    <section className="space-y-6">
      <div className="app-card p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="app-eyebrow">Doctor directory</p>
            <h1 className="app-title mt-3">Doctor and department coverage.</h1>
            <p className="app-muted mt-4 max-w-2xl">
              Search the hospital team by name, department, and availability.
              Anyone can view this directory; patients must check in before
              generating an OPD token.
            </p>
          </div>
          <div className="grid gap-3 rounded-lg border border-cyan-100 bg-cyan-50 p-4 sm:grid-cols-2 lg:min-w-[360px]">
            <div>
              <p className="text-xs font-semibold uppercase text-brand-700">
                Doctors
              </p>
              <p className="mt-1 text-2xl font-semibold text-brand-900">
                {doctors.length}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-brand-700">
                Available today
              </p>
              <p className="mt-1 text-2xl font-semibold text-brand-900">
                {doctors.filter((doctor) => doctor.available_today).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900">
        This public directory gives patients and staff visibility before booking.
        Availability comes from the admin roster; booking still requires patient
        check-in and AI triage.
      </div>

      <div className="app-card p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr_0.7fr]">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">
              Search by doctor name
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search for Dr. Meera, Dr. Arjun..."
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-800">
              Specialty
            </span>
            <select
              value={specialtyFilter}
              onChange={(event) => setSpecialtyFilter(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="all">All specialties</option>
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">
              Availability
            </legend>
            <div className="mt-2 grid grid-cols-2 rounded-lg border border-slate-300 bg-white p-1 text-sm font-semibold">
              {[
                { label: "All", value: "all" },
                { label: "Today", value: "available" },
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
                      ? "bg-brand-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      {isLoading ? (
        <div className="app-state-info">Loading doctors directory...</div>
      ) : null}

      {error ? <div className="app-state-error">{error}</div> : null}

      {!isLoading && !error && filteredDoctors.length === 0 ? (
        <div className="app-state-warning">
          No doctors match the selected filters. Adjust the search or choose a
          different specialty.
        </div>
      ) : null}

      {!isLoading && !error && filteredDoctors.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDoctors.map((doctor) => (
            <article key={doctor.id} className="app-card p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-base font-bold text-brand-900">
                  {getInitials(doctor.full_name)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-950">
                    {doctor.full_name}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-brand-900">
                    {doctor.specialty_name}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Qualification
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {doctor.qualification ?? "Not listed"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Experience
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {doctor.experience_years ?? 0} years
                    </p>
                  </div>
                  <div
                    className={[
                      "rounded-lg border p-3",
                      doctor.available_today
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-slate-50 text-slate-600",
                    ].join(" ")}
                  >
                    <p className="text-xs font-semibold uppercase">
                      Availability
                    </p>
                    <p className="mt-1 font-medium">
                      {doctor.available_today ? "Today" : "Not today"}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleBookAppointment(doctor)}
                className="app-primary-button mt-5 w-full"
              >
                {getStoredSession()?.role === "patient"
                  ? "Start OPD visit"
                  : "Check in to book"}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
