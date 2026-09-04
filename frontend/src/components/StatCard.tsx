interface Props {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}

const toneMap = {
  good: "text-status-good",
  warn: "text-status-warn",
  bad: "text-status-bad",
  neutral: "text-slate-100",
};

export function StatCard({ label, value, sub, tone = "neutral" }: Props) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-2 font-mono text-3xl font-semibold ${toneMap[tone]}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
  );
}