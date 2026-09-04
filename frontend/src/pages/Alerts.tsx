import { useEffect, useState } from "react";
import { api } from "../api/client";

interface AlertRule {
  id: number;
  machine_id: number | null;
  metric: string;
  comparator: string;
  threshold: number;
  active: boolean;
}

interface Triggered {
  rule_id: number;
  machine_name: string;
  metric: string;
  threshold: number;
  actual: number;
  message: string;
}

interface MachineMetrics {
  machine_id: number;
  machine_name: string;
}

const METRICS = [
  { value: "oee", label: "OEE", fraction: true },
  { value: "availability", label: "Availability", fraction: true },
  { value: "quality", label: "Quality", fraction: true },
  { value: "downtime_min", label: "Downtime (min)", fraction: false },
];

export default function Alerts() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [triggered, setTriggered] = useState<Triggered[]>([]);
  const [machines, setMachines] = useState<MachineMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metric, setMetric] = useState("oee");
  const [comparator, setComparator] = useState("lt");
  const [threshold, setThreshold] = useState("75");
  const [machineId, setMachineId] = useState("all");
  const [saving, setSaving] = useState(false);

  const isFraction = METRICS.find((m) => m.value === metric)?.fraction ?? true;

  async function load() {
    try {
      const [r, t, m] = await Promise.all([
        api.get<AlertRule[]>("/alerts"),
        api.get<Triggered[]>("/alerts/triggered"),
        api.get<MachineMetrics[]>("/metrics/by-machine"),
      ]);
      setRules(r);
      setTriggered(t);
      setMachines(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createRule() {
    const raw = parseFloat(threshold);
    if (Number.isNaN(raw)) {
      setError("Threshold must be a number");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.post("/alerts", {
        machine_id: machineId === "all" ? null : Number(machineId),
        metric,
        comparator,
        threshold: isFraction ? raw / 100 : raw,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create rule");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(id: number) {
    try {
      await api.del(`/alerts/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete rule");
    }
  }

  function describe(r: AlertRule) {
    const meta = METRICS.find((m) => m.value === r.metric);
    const label = meta?.label ?? r.metric;
    const value = meta?.fraction
      ? `${(r.threshold * 100).toFixed(0)}%`
      : r.threshold.toFixed(0);
    const dir = r.comparator === "lt" ? "drops below" : "rises above";
    const scope =
      r.machine_id === null
        ? "any machine"
        : machines.find((m) => m.machine_id === r.machine_id)?.machine_name ??
          `machine ${r.machine_id}`;
    return `${label} on ${scope} ${dir} ${value}`;
  }

  if (loading) return <div className="p-8 text-slate-500">Loading alerts…</div>;

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-medium text-slate-100">Alerts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Threshold rules evaluated against current metrics
        </p>
      </div>

      {triggered.length > 0 && (
        <div className="rounded-xl border border-status-bad/40 bg-status-bad/10 p-4">
          <p className="text-sm font-medium text-status-bad">
            {triggered.length} active alert{triggered.length > 1 ? "s" : ""}
          </p>
          <ul className="mt-2 space-y-1">
            {triggered.map((t, i) => (
              <li key={`${t.rule_id}-${i}`} className="text-sm text-slate-300">
                {t.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-surface-border bg-surface-raised p-6">
        <h2 className="mb-4 text-sm font-medium text-slate-300">
          New alert rule
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label
              htmlFor="metric"
              className="mb-1.5 block text-xs text-slate-500"
            >
              Metric
            </label>
            <select
              id="metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent"
            >
              {METRICS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="comparator"
              className="mb-1.5 block text-xs text-slate-500"
            >
              Condition
            </label>
            <select
              id="comparator"
              value={comparator}
              onChange={(e) => setComparator(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent"
            >
              <option value="lt">Drops below</option>
              <option value="gt">Rises above</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="threshold"
              className="mb-1.5 block text-xs text-slate-500"
            >
              Threshold {isFraction ? "(%)" : "(min)"}
            </label>
            <input
              id="threshold"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label
              htmlFor="scope"
              className="mb-1.5 block text-xs text-slate-500"
            >
              Machine
            </label>
            <select
              id="scope"
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent"
            >
              <option value="all">All machines</option>
              {machines.map((m) => (
                <option key={m.machine_id} value={m.machine_id}>
                  {m.machine_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-status-bad">{error}</p>}

        <button
          onClick={createRule}
          disabled={saving}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create rule"}
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-slate-300">
          Configured rules
        </h2>

        {rules.length === 0 ? (
          <p className="text-sm text-slate-500">
            No rules yet. Create one above to start monitoring thresholds.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => {
              const firing = triggered.some((t) => t.rule_id === r.id);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-raised px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        firing ? "bg-status-bad" : "bg-status-good"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-slate-200">
                      Alert when {describe(r)}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteRule(r.id)}
                    className="text-sm text-slate-500 transition-colors hover:text-status-bad"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}