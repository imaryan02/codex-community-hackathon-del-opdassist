import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAvailableSlots } from "../services/bookingService";
import { getDoctorsBySpecialty } from "../services/doctorService";
import type { DoctorSlot } from "../types/booking";
import type { DoctorWithSpecialty } from "../types/doctor";
import type { SavedPatientIntake } from "../types/patient";

type BookingLocationState = {
  intakeResult?: SavedPatientIntake;
  preferredDoctorId?: string;
};

type PreferredDoctorContext = {
  doctor_id: string;
  specialty_id: string;
};

const urgencyStyles = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-red-200 bg-red-50 text-red-700",
};

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

function getStoredPreferredDoctorContext(): PreferredDoctorContext | null {
  const storedValue = localStorage.getItem("preferredDoctorContext");

  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<PreferredDoctorContext>;

    return typeof parsed.doctor_id === "string" &&
      typeof parsed.specialty_id === "string"
      ? {
          doctor_id: parsed.doctor_id,
          specialty_id: parsed.specialty_id,
        }
      : null;
  } catch {
    return null;
  }
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

export function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as BookingLocationState | null;
  const intakeResult =
    state?.intakeResult && isSavedPatientIntake(state.intakeResult)
      ? state.intakeResult
      : getStoredIntakeResult();
  const storedPreferredDoctor = getStoredPreferredDoctorContext();
  const storedPreferredDoctorId =
    storedPreferredDoctor &&
    storedPreferredDoctor.specialty_id === intakeResult?.recommended_specialty_id
      ? storedPreferredDoctor.doctor_id
      : null;
  const preferredDoctorId =
    typeof state?.preferredDoctorId === "string"
      ? state.preferredDoctorId
      : storedPreferredDoctorId;

  const [doctors, setDoctors] = useState<DoctorWithSpecialty[]>([]);
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [selectedDoctor, setSelectedDoctor] =
    useState<DoctorWithSpecialty | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<DoctorSlot | null>(null);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  useEffect(() => {
    if (!intakeResult) {
      return;
    }

    let isMounted = true;
    setDoctorsLoading(true);
    setDoctorError(null);

    getDoctorsBySpecialty(intakeResult.recommended_specialty_id)
      .then((doctorRows) => {
        if (!isMounted) {
          return;
        }

        setDoctors(doctorRows);

        if (preferredDoctorId) {
          const matchedDoctor = doctorRows.find(
            (doctor) => doctor.id === preferredDoctorId,
          );

          if (matchedDoctor) {
            setSelectedDoctor(matchedDoctor);
          }
        }
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setDoctorError(
          error instanceof Error
            ? error.message
            : "Could not fetch doctors. Please try again.",
        );
      })
      .finally(() => {
        if (isMounted) {
          setDoctorsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [intakeResult, preferredDoctorId]);

  useEffect(() => {
    if (!selectedDoctor) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    let isMounted = true;
    setSlotsLoading(true);
    setSlotError(null);
    setSelectedSlot(null);

    getAvailableSlots(selectedDoctor.id)
      .then((slotRows) => {
        if (!isMounted) {
          return;
        }

        setSlots(slotRows);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setSlotError(
          error instanceof Error
            ? error.message
            : "Could not fetch slots. Please try again.",
        );
      })
      .finally(() => {
        if (isMounted) {
          setSlotsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDoctor]);

  const handleContinue = () => {
    if (!intakeResult || !selectedDoctor || !selectedSlot) {
      return;
    }

    const bookingDraft = {
      ...intakeResult,
      doctor_id: selectedDoctor.id,
      doctor_name: selectedDoctor.full_name,
      doctor_qualification: selectedDoctor.qualification,
      slot_id: selectedSlot.id,
      slot_date: selectedSlot.slot_date,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
    };

    localStorage.setItem("latestBookingDraft", JSON.stringify(bookingDraft));
    navigate("/confirmation", {
      state: {
        bookingDraft,
      },
    });
  };

  if (!intakeResult) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          OPD token
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          No recommendation found.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
          Complete AI intake first so the patient can be routed to an OPD
          department.
        </p>
        <Link
          to="/register/manual"
          className="mt-6 inline-flex rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900"
        >
          Start AI intake
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
              OPD token
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Assign an available doctor and OPD time.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              The system shows available doctors for the recommended department.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Patient
              </p>
              <p className="mt-1 font-semibold text-slate-950">
                {intakeResult.patient_code}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Department
              </p>
              <p className="mt-1 font-semibold text-brand-900">
                {intakeResult.recommended_specialty_name}
              </p>
            </div>
            <div
              className={[
                "rounded-lg border p-3",
                urgencyStyles[intakeResult.urgency_level],
              ].join(" ")}
            >
              <p className="text-xs font-semibold uppercase">Urgency</p>
              <p className="mt-1 font-semibold capitalize">
                {intakeResult.urgency_level}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900">
        This step turns AI routing into an OPD token request. The patient selects
        an available doctor and time; admin approval moves the token to the
        doctor's live queue.
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                Available OPD doctors
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Select one available doctor to load OPD times.
              </p>
            </div>
            <span className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-semibold text-brand-900">
              {doctors.length} found
            </span>
          </div>

          {doctorsLoading ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Loading doctors for {intakeResult.recommended_specialty_name}...
            </div>
          ) : null}

          {doctorError ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {doctorError}
            </div>
          ) : null}

          {!doctorsLoading && !doctorError && doctors.length === 0 ? (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No doctors are available today for this department.
            </div>
          ) : null}

          <div className="mt-5 grid gap-4">
            {doctors.map((doctor) => {
              const isSelected = selectedDoctor?.id === doctor.id;

              return (
                <button
                  key={doctor.id}
                  type="button"
                  onClick={() => setSelectedDoctor(doctor)}
                  className={[
                    "rounded-lg border p-4 text-left transition",
                    isSelected
                      ? "border-brand-600 bg-cyan-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-brand-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {doctor.full_name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {doctor.qualification ?? "Qualification not listed"}
                      </p>
                    </div>
                    <span className="w-fit rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                      {doctor.experience_years ?? 0} yrs experience
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-medium text-brand-900">
                    {doctor.specialty_name}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              OPD times
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Only available OPD times for today are shown.
            </p>
          </div>

          {!selectedDoctor ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Select a doctor to view available OPD times.
            </div>
          ) : null}

          {slotsLoading ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Loading slots for {selectedDoctor?.full_name}...
            </div>
          ) : null}

          {slotError ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {slotError}
            </div>
          ) : null}

          {selectedDoctor && !slotsLoading && !slotError && slots.length === 0 ? (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No OPD times are available today for this doctor.
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {slots.map((slot) => {
              const isSelected = selectedSlot?.id === slot.id;

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={[
                    "rounded-lg border px-3 py-4 text-center transition",
                    isSelected
                      ? "border-brand-600 bg-brand-700 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-800 hover:border-brand-600 hover:bg-cyan-50",
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold">
                    {formatTime(slot.start_time)}
                  </p>
                  <p
                    className={[
                      "mt-1 text-xs",
                      isSelected ? "text-cyan-50" : "text-slate-500",
                    ].join(" ")}
                  >
                    to {formatTime(slot.end_time)}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              {selectedDoctor && selectedSlot ? (
                <p>
                  Selected {selectedDoctor.full_name} at{" "}
                  {formatTime(selectedSlot.start_time)}.
                </p>
              ) : (
                <p>Select a doctor and OPD time to continue.</p>
              )}
            </div>
            <button
              type="button"
              disabled={!selectedDoctor || !selectedSlot}
              onClick={handleContinue}
              className="mt-4 w-full rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Continue to Generate Token
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
