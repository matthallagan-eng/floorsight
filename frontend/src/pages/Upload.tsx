import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

interface UploadResult {
  rows_imported: number;
  machines_created: number;
}

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  function pick(f: File | undefined) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setError("File must be a .csv");
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.upload(file);
      setResult(res);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-medium text-slate-100">
          Upload production data
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          CSV with timestamp, machine, planned_time_min, downtime_min,
          total_count, good_count
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          dragging
            ? "border-accent bg-accent/5"
            : "border-surface-border bg-surface-raised hover:border-slate-600"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={(e) => pick(e.target.files?.[0])}
          className="hidden"
        />
        {file ? (
          <div>
            <p className="text-sm text-slate-200">{file.name}</p>
            <p className="mt-1 text-xs text-slate-500">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-400">
              Drop a CSV here, or click to browse
            </p>
            <p className="mt-1 text-xs text-slate-600">Maximum 10 MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-status-bad/40 bg-status-bad/10 p-4">
          <p className="text-sm text-status-bad">{error}</p>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-status-good/40 bg-status-good/10 p-4">
          <p className="text-sm text-status-good">
            Imported {result.rows_imported.toLocaleString()} rows
            {result.machines_created > 0 &&
              `, created ${result.machines_created} machine${
                result.machines_created > 1 ? "s" : ""
              }`}
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-2 text-sm text-accent hover:underline"
          >
            View dashboard
          </button>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || busy}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Uploading…" : "Upload"}
      </button>
    </div>
  );
}