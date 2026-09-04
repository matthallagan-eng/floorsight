export const RANGES = [
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
] as const;

export type RangeKey = (typeof RANGES)[number]["value"];

interface Props {
  value: RangeKey;
  onChange: (value: RangeKey) => void;
}

export default function RangeSelect({ value, onChange }: Props) {
  return (
    <div
      className="inline-flex rounded-lg border border-surface-border bg-surface-raised p-0.5"
      role="group"
      aria-label="Time range"
    >
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          aria-pressed={value === r.value}
          className={`rounded-md px-3 py-1 text-sm transition-colors ${
            value === r.value
              ? "bg-surface text-slate-100"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}