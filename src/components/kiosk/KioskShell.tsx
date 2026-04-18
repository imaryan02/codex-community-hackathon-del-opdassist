import type { ReactNode } from "react";

type KioskShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function KioskShell({
  children,
  eyebrow,
  title,
  subtitle,
  actions,
}: KioskShellProps) {
  return (
    <section className="min-h-[calc(100vh-5rem)] rounded-3xl border border-cyan-100 bg-gradient-to-br from-white via-cyan-50 to-blue-50 p-4 shadow-sm sm:p-6 lg:p-8">
      {(eyebrow || title || subtitle || actions) ? (
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            {eyebrow ? (
              <p className="text-sm font-bold uppercase tracking-wide text-brand-700">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
