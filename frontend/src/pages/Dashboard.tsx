import { useEffect, useState, useCallback, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { api } from "../api/client";
import { StatCard } from "../components/StatCard";

interface Summary {
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  total_downtime_min: number;
  total_good: number;
  total_produced: number;
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const toneFor = (v: number) =>
  v >= 0.85 ? "good" : v >= 0.6 ? "warn" : "bad";

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [downtime, setDowntime] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const timer = useRef<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [s, t, d, a] = await Promise.all([
        api.get<Summary>("/metrics/summary"),
        api.get<any[]>("/metrics/oee-trend"),
        api.get<any[]>("/metrics/downtime-by-reason"),
        api.get<any[]>("/alerts/triggered"),
      ]);
      setSummary(s);
      setTrend(
        t.map((p) => ({
          time: new Date(p.timestamp).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
          }),
          oee: +(p.value * 100).toFixed(1),
        }))
      );
      setDowntime(d);
      setAlerts(a);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!live) {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
      return;
    }

    async function tick() {
      try {
        await api.simulate();
        await fetchAll();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Simulation failed");
        setLive(false);
      }
    }

    tick();
    timer.current = window.setInterval(tick, 3000);

    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [live, fetchAll]);

  async function handleReset() {
    setLive(false);
    await api.reset();
    await fetchAll();
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Loading metrics…</div>;
  }

  const empty = !summary || summary.total_produced === 0;

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-medium text-slate-100">
            Production overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            All machines · aggregated
          </p>
        </div>

        <div className="flex items-center gap-2">
          {live && (
            <span className="flex items-center gap-2 text-sm text-status-good">
              <span className="h-2 w-2 animate-pulse rounded-full bg-status-good" />
              Live
            </span>
          )}
          <button
            onClick={() => setLive(!live)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              live
                ? "border-status-bad/40 text-status-bad hover:bg-status-bad/10"
                : "border-surface-border text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            {live ? "Stop simulation" : "Start live data"}
          </button>
          {!empty && (
            <button
              onClick={handleReset}
              className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-300"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-status-bad/40 bg-status-bad/10 p-4">
          <p className="text-sm text-status-bad">{error}</p>
        </div>
      )}

      {empty ? (
        <div className="rounded-xl border border-surface-border bg-surface-raised p-12 text-center">
          <h2 className="text-lg font-medium text-slate-200">
            No production data yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            Upload a CSV, or click “Start live data” to generate simulated
            production from four machines.
          </p>
        </div>
      ) : (
        <>
          {alerts.length > 0 && (
            <div className="rounded-xl border border-status-bad/40 bg-status-bad/10 p-4">
              <p className="text-sm font-medium text-status-bad">
                {alerts.length} active alert{alerts.length > 1 ? "s" : ""}
              </p>
              <ul className="mt-2 space-y-1">
                {alerts.map((a, i) => (
                  <li
                    key={`${a.rule_id}-${i}`}
                    className="text-sm text-slate-300"
                  >
                    {a.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="OEE"
              value={pct(summary!.oee)}
              tone={toneFor(summary!.oee)}
              sub="Availability × Perf × Quality"
            />
            <StatCard
              label="Availability"
              value={pct(summary!.availability)}
              tone={toneFor(summary!.availability)}
            />
            <StatCard
              label="Quality"
              value={pct(summary!.quality)}
              tone={toneFor(summary!.quality)}
              sub={`${summary!.total_good.toLocaleString()} good units`}
            />
            <StatCard
              label="Downtime"
              value={`${summary!.total_downtime_min.toFixed(0)} min`}
              tone="neutral"
            />
          </div>

          <div className="rounded-xl border border-surface-border bg-surface-raised p-6">
            <h2 className="mb-4 text-sm font-medium text-slate-300">
              OEE trend
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#242832" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#171a21",
                    border: "1px solid #242832",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="oee"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-surface-border bg-surface-raised p-6">
            <h2 className="mb-4 text-sm font-medium text-slate-300">
              Downtime by reason
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={downtime} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#242832" />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={11}
                  unit=" min"
                />
                <YAxis
                  type="category"
                  dataKey="reason"
                  stroke="#64748b"
                  fontSize={11}
                  width={130}
                />
                <Tooltip
                  contentStyle={{
                    background: "#171a21",
                    border: "1px solid #242832",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="minutes"
                  fill="#f59e0b"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}