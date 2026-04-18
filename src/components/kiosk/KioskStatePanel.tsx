import type { ReactNode } from "react";

type StateTone = "info" | "success" | "warning" | "error";

type KioskStatePanelProps = {
  tone?: StateTone;
  title?: string;
  children: ReactNode;
};

const toneClasses: Record<StateTone, string> = {
  info: "border-cyan-200 bg-cyan-50 text-brand-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-700",
};

export function KioskStatePanel({
  tone = "info",
  title,
  children,
}: KioskStatePanelProps) {
  return (
    <div className={["rounded-2xl border p-5", toneClasses[tone]].join(" ")}>
      {title ? <p className="text-base font-bold">{title}</p> : null}
      <div className={title ? "mt-2 text-sm leading-6" : "text-sm leading-6"}>
        {children}
      </div>
    </div>
  );
}
