import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { api } from "../api/client";
import { StatCard } from "../components/StatCard";

interface Summary {
  oee: number; availability: number; performance: number; quality: number;
  total_downtime_min: number; total_good: number; total_produced: number;
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const toneFor = (v: number) => v >= 0.85 ? "good" : v >= 0.6 ? "warn" : "bad";

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [downtime, setDowntime] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Summary>("/metrics/summary"),
      api.get<any[]>("/metrics/oee-trend"),
      api.get<any[]>("/metrics/downtime-by-reason"),
      api.get<any[]>("/alerts/triggered"),
    ])
      .then(([s, t, d, a]) => {
        setSummary(s);
        setTrend(t.map(p => ({
          time: new Date(p.timestamp).toLocaleString([], {
            month: "short", day: "numeric", hour: "2-digit",
          }),
          oee: +(p.value * 100).toFixed(1),
        })));
        setDowntime(d);
        setAlerts(a);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-slate-500">Loading metrics…</div>;
  if (error) return <div className="p-8 text-status-bad">{error}</div>;
  if (!summary || summary.total_produced === 0) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold">No production data yet</h2>
        <p className="mt-2 text-slate-400">
          Upload a CSV to see your OEE dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Production Overview</h1>
        <p className="text-sm text-slate-500">
          Across all machines · last 30 days
        </p>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-xl border border-status-bad/40 bg-status-bad/10 p-4">
          <p className="text-sm font-semibold text-status-bad">
            {alerts.length} active alert{alerts.length > 1 ? "s" : ""}
          </p>
          <ul className="mt-2 space-y-1">
            {alerts.map(a => (
              <li key={`${a.rule_id}-${a.machine_name}`}
                  className="text-sm text-slate-300">
                {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="OEE" value={pct(summary.oee)}
                  tone={toneFor(summary.oee)} sub="Availability x Perf x Quality" />
        <StatCard label="Availability" value={pct(summary.availability)}
                  tone={toneFor(summary.availability)} />
        <StatCard label="Quality" value={pct(summary.quality)}
                  tone={toneFor(summary.quality)}
                  sub={`${summary.total_good.toLocaleString()} good units`} />
        <StatCard label="Downtime"
                  value={`${summary.total_downtime_min.toFixed(0)} min`}
                  tone="neutral" />
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-raised p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-300">OEE Trend</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#242832" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} unit="%" domain={[0, 100]} />
            <Tooltip contentStyle={{
              background: "#171a21", border: "1px solid #242832",
              borderRadius: 8, fontSize: 12,
            }} />
            <Line type="monotone" dataKey="oee" stroke="#3b82f6"
                  strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-raised p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-300">
          Downtime by Reason
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={downtime} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#242832" />
            <XAxis type="number" stroke="#64748b" fontSize={11} unit=" min" />
            <YAxis type="category" dataKey="reason" stroke="#64748b"
                   fontSize={11} width={130} />
            <Tooltip contentStyle={{
              background: "#171a21", border: "1px solid #242832",
              borderRadius: 8, fontSize: 12,
            }} />
            <Bar dataKey="minutes" fill="#f59e0b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}