import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { label: "Start", to: "/" },
  { label: "Register", to: "/register/manual" },
  { label: "Doctors", to: "/doctors" },
  { label: "Doctor Queue", to: "/doctor-dashboard" },
];

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <NavLink to="/" className="flex items-center gap-3 text-xl font-semibold text-brand-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
              AI
            </span>
            <span>Hospital Intake</span>
          </NavLink>
          <nav className="flex flex-wrap gap-2 text-sm font-medium">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
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
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
