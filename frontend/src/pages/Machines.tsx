import { useEffect, useState } from "react";
import { api } from "../api/client";
import RangeSelect from "../components/RangeSelect";
import type { RangeKey } from "../components/RangeSelect";
import { useSimulation } from "../context/SimulationContext";

interface MachineMetrics {
  machine_id: number;
  machine_name: string;
  line: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  total_downtime_min: number;
  total_good: number;
  total_produced: number;
  record_count: number;
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function toneClass(v: number) {
  if (v >= 0.85) return "text-status-good";
  if (v >= 0.6) return "text-status-warn";
  return "text-status-bad";
}

export default function Machines() {
  const [rows, setRows] = useState<MachineMetrics[]>([]);
  const [line, setLine] = useState<string>("all");
  const [range, setRange] = useState<RangeKey>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tickCount } = useSimulation();

  useEffect(() => {
    api
      .get<MachineMetrics[]>(`/metrics/by-machine?range=${range}`)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range, tickCount]);

  const lines = Array.from(new Set(rows.map((r) => r.line))).sort();
  const visible = line === "all" ? rows : rows.filter((r) => r.line === line);

  if (loading) {
    return <div className="p-8 text-slate-500">Loading machines…</div>;
  }

  if (error) {
    return <div className="p-8 text-status-bad">{error}</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-medium text-slate-100">No machines yet</h1>
        <p className="mt-2 text-sm text-slate-500">
          Upload a CSV or start the live simulation to see machine performance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-medium text-slate-100">Machines</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sorted by OEE, lowest first
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="line" className="text-sm text-slate-500">
            Line
          </label>
          <select
            id="line"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            className="rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-accent"
          >
            <option value="all">All lines</option>
            {lines.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

        <div className="flex items-center gap-3">
          <RangeSelect value={range} onChange={setRange} />

          <div className="flex items-center gap-2">
            <label htmlFor="line" className="text-sm text-slate-500">
              Line
            </label>
            <select
              id="line"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-accent"
            >
              <option value="all">All lines</option>
              {lines.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
       </div>

      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                Machine
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                Line
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                OEE
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Avail
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Quality
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Downtime
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Units
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => (
              <tr
                key={m.machine_id}
                className="border-b border-surface-border last:border-0"
              >
                <td className="px-4 py-3 text-slate-200">{m.machine_name}</td>
                <td className="px-4 py-3 text-slate-500">{m.line}</td>
                <td
                  className={`px-4 py-3 text-right font-mono ${toneClass(m.oee)}`}
                >
                  {pct(m.oee)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-400">
                  {pct(m.availability)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-400">
                  {pct(m.quality)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-400">
                  {m.total_downtime_min.toFixed(0)} min
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-400">
                  {m.total_produced.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-slate-500">No machines on {line}.</p>
      )}
    </div>
  );
}