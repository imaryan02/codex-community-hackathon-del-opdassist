import { Link, useLocation } from "react-router-dom";
import type { SavedPatientIntake } from "../types/patient";

type RecommendationLocationState = {
  intakeResult?: SavedPatientIntake;
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

export function RecommendationPage() {
  const location = useLocation();
  const state = location.state as RecommendationLocationState | null;
  const intakeResult =
    state?.intakeResult && isSavedPatientIntake(state.intakeResult)
      ? state.intakeResult
      : getStoredIntakeResult();

  if (!intakeResult) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          OPD routing
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          No intake result found.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
          Complete AI intake first so the department, urgency, and patient code
          can appear here.
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
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
              OPD routing result
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Department route is ready.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              Review the AI summary before generating an OPD token.
            </p>
          </div>
          <div className="w-fit rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
                patient code
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {intakeResult.patient_code}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900">
        AI routing is decision support for the OPD desk. It converts symptoms
        into a department suggestion and urgency label; the doctor still makes
        the final clinical decision.
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Recommended department
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-brand-900">
                {intakeResult.recommended_specialty_name}
              </h2>
            </div>
            <span
              className={[
                "w-fit rounded-lg border px-3 py-2 text-sm font-semibold capitalize",
                urgencyStyles[intakeResult.urgency_level],
              ].join(" ")}
            >
              {intakeResult.urgency_level} urgency
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Symptom summary
              </p>
              <p className="mt-2 text-base leading-7 text-slate-800">
                {intakeResult.symptom_summary}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Reasoning
              </p>
              <p className="mt-2 text-base leading-7 text-slate-800">
                {intakeResult.reasoning}
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">OPD intake saved</p>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                patient_id
              </p>
              <p className="mt-1 break-all text-slate-700">
                {intakeResult.patient_id}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                ai_report_id
              </p>
              <p className="mt-1 break-all text-slate-700">
                {intakeResult.ai_report_id}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                recommended_specialty_id
              </p>
              <p className="mt-1 break-all text-slate-700">
                {intakeResult.recommended_specialty_id}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-sm leading-6 text-slate-600">
              Continue when the department and urgency look correct.
            </p>
            <Link
              to="/booking"
              state={{ intakeResult }}
              className="mt-4 inline-flex w-full justify-center rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900"
            >
              Continue to OPD token
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
