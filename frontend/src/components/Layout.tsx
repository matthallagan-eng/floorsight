import { Link, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { useSimulation } from "../context/SimulationContext";

export default function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const { live, toggle, stop, tickCount } = useSimulation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const nav = [
    { to: "/", label: "Dashboard" },
    { to: "/machines", label: "Machines" },
    { to: "/records", label: "Records" },
    { to: "/alerts", label: "Alerts" },
    { to: "/upload", label: "Upload" },
  ];

  function handleLogout() {
    stop();
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-border bg-surface-raised">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="font-mono text-sm font-medium tracking-tight text-slate-100">
              FloorSight
            </span>
            <nav className="flex gap-6">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    pathname === item.to
                      ? "text-sm text-slate-100"
                      : "text-sm text-slate-500 transition-colors hover:text-slate-300"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {live && (
              <span className="flex items-center gap-2 text-sm text-status-good">
                <span className="h-2 w-2 animate-pulse rounded-full bg-status-good" />
                Live · {tickCount}
              </span>
            )}
            <button
              onClick={toggle}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                live
                  ? "border-status-bad/40 text-status-bad hover:bg-status-bad/10"
                  : "border-surface-border text-slate-400 hover:border-slate-600 hover:text-slate-200"
              }`}
            >
              {live ? "Stop" : "Start live data"}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl">{children}</main>
    </div>
  );
}