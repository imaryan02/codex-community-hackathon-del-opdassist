import { Link } from "react-router-dom";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    to: string;
  };
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  primaryAction,
}: PlaceholderPageProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
        {eyebrow}
      </p>
      <div className="mt-4 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
      </div>
      {primaryAction ? (
        <div className="mt-6">
          <Link
            to={primaryAction.to}
            className="inline-flex rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900"
          >
            {primaryAction.label}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
