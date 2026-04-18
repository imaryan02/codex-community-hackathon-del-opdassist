import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  clearSession,
  getStoredSession,
  type AppRole,
} from "../../lib/session";

type NavItem = {
  label: string;
  to: string;
  roles: AppRole[];
  startsSelfVisit?: boolean;
};

type LoggedOutNavItem = {
  label: string;
  to: string;
  startsSelfVisit?: boolean;
};

const navItems: NavItem[] = [
  { label: "Home", to: "/", roles: ["patient", "doctor", "admin"] },
  { label: "Health Record", to: "/patient-dashboard", roles: ["patient"] },
  {
    label: "New OPD Visit",
    to: "/register/voice",
    roles: ["patient"],
    startsSelfVisit: true,
  },
  { label: "Doctors", to: "/doctors", roles: ["patient", "doctor", "admin"] },
  { label: "Operations", to: "/admin-dashboard", roles: ["admin"] },
  { label: "Approvals", to: "/admin-approvals", roles: ["admin"] },
  { label: "Manage", to: "/admin-management", roles: ["admin"] },
  { label: "OPD Queue", to: "/doctor-dashboard", roles: ["doctor"] },
] ;

const loggedOutNavItems: LoggedOutNavItem[] = [
  { label: "Login", to: "/login" },
  { label: "Doctors", to: "/doctors" },
];

export function AppShell() {
  const navigate = useNavigate();
  const [session, setSession] = useState(getStoredSession);

  useEffect(() => {
    const syncSession = () => setSession(getStoredSession());

    window.addEventListener("app-session-changed", syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener("app-session-changed", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    setSession(null);
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <NavLink to="/" className="flex items-center gap-3 text-xl font-semibold text-brand-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
              AI
            </span>
            <span>OPD Assist</span>
          </NavLink>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {(session
              ? navItems.filter((item) => item.roles.includes(session.role))
              : loggedOutNavItems
            ).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (item.startsSelfVisit) {
                    localStorage.setItem("visitPatientMode", "self");
                    window.dispatchEvent(new Event("visit-patient-mode-changed"));
                  }
                }}
                className={({ isActive }) =>
                  [
                    "rounded-lg px-3 py-2 transition",
                    isActive
                      ? "bg-brand-100 text-brand-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        {session ? (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Signed in
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {session.displayName}
                  <span className="ml-2 rounded-md bg-cyan-50 px-2 py-1 text-xs font-bold capitalize text-brand-900">
                    {session.role}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-50"
              >
                Logout {session.displayName}
              </button>
            </div>
          </div>
        ) : null}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
