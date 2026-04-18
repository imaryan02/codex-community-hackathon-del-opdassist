import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type KioskActionCardProps = {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
};

export function KioskActionCard({
  to,
  icon,
  title,
  description,
  badge,
}: KioskActionCardProps) {
  return (
    <Link
      to={to}
      className="group flex min-h-56 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-600 hover:shadow-xl"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-3xl">
            {icon}
          </span>
          {badge ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
              {badge}
            </span>
          ) : null}
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
      </div>
      <span className="mt-6 inline-flex min-h-12 w-fit items-center rounded-xl bg-brand-700 px-5 text-sm font-bold text-white transition group-hover:bg-brand-900">
        Start
      </span>
    </Link>
  );
}
