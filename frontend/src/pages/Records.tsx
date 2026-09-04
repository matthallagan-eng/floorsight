import { useEffect, useState } from "react";
import { api } from "../api/client";

interface ProductionRecord {
  id: number;
  machine_id: number;
  timestamp: string;
  planned_time_min: number;
  downtime_min: number;
  total_count: number;
  good_count: number;
  downtime_reason: string | null;
}

interface RecordPage {
  records: ProductionRecord[];
  total: number;
  machine_names: Record<number, string>;
}
const PAGE = 50;

export default function Records() {
  const [data, setData] = useState<RecordPage | null>(null);
  const [machineId, setMachineId] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE),
      offset: String(offset),
    });
    if (machineId !== "all") params.set("machine_id", machineId);

    api
      .get<RecordPage>(`/metrics/records?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [machineId, offset]);

  if (loading && !data) {
    return <div className="p-8 text-slate-500">Loading records…</div>;
  }

  if (error) {
    return <div className="p-8 text-status-bad">{error}</div>;
  }

  if (!data || data.total === 0) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-medium text-slate-100">No records yet</h1>
        <p className="mt-2 text-sm text-slate-500">
          Upload a CSV or start the live simulation.
        </p>
      </div>
    );
  }

  const machines = Object.entries(data.machine_names);
  const showing = `${offset + 1}–${Math.min(offset + PAGE, data.total)} of ${data.total.toLocaleString()}`;

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-medium text-slate-100">
            Production records
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Showing {showing}, newest first
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="machine" className="text-sm text-slate-500">
            Machine
          </label>
          <select
            id="machine"
            value={machineId}
            onChange={(e) => {
              setMachineId(e.target.value);
              setOffset(0);
            }}
            className="rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-accent"
          >
            <option value="all">All machines</option>
            {machines.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
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
                Timestamp
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                Machine
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Planned
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Downtime
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Total
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                Good
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                Reason
              </th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((r) => (
              <tr
                key={r.id}
                className="border-b border-surface-border last:border-0"
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                  {new Date(r.timestamp).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {data.machine_names[r.machine_id] ?? "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-400">
                  {r.planned_time_min}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${
                    r.downtime_min > 0 ? "text-status-warn" : "text-slate-600"
                  }`}
                >
                  {r.downtime_min > 0 ? r.downtime_min.toFixed(1) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-400">
                  {r.total_count.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-400">
                  {r.good_count.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {r.downtime_reason ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setOffset(Math.max(0, offset - PAGE))}
          disabled={offset === 0}
          className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200 disabled:opacity-30"
        >
          Previous
        </button>
        <button
          onClick={() => setOffset(offset + PAGE)}
          disabled={offset + PAGE >= data.total}
          className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200 disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}