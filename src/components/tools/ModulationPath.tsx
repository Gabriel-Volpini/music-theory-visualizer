import { useMemo, useState } from "react";
import { useComposition } from "../../store/composition";
import { chromaOf, getScale } from "../../theory/scales";
import { findModulationPath } from "../../theory/modulation";
import { FUNCTION_COLORS } from "../palette";

// Readable tonic spellings for the dropdowns, indexed by chroma.
const NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function relationshipColor(rel: string): string {
  if (/dominant/i.test(rel)) return FUNCTION_COLORS.Dominant;
  if (/subdominant/i.test(rel)) return FUNCTION_COLORS.Subdominant;
  if (/relative|parallel/i.test(rel)) return FUNCTION_COLORS.Tonic;
  return "#7dd3fc";
}

interface KeyChoice {
  chroma: number;
  type: "major" | "minor";
}

function KeyPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: KeyChoice;
  onChange: (v: KeyChoice) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value.chroma}
        onChange={(e) => onChange({ ...value, chroma: Number(e.target.value) })}
        className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-100 ring-1 ring-slate-700"
      >
        {NOTE_NAMES.map((n, i) => (
          <option key={n} value={i}>
            {n}
          </option>
        ))}
      </select>
      <select
        value={value.type}
        onChange={(e) => onChange({ ...value, type: e.target.value as "major" | "minor" })}
        className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-100 ring-1 ring-slate-700"
      >
        <option value="major">major</option>
        <option value="minor">minor</option>
      </select>
    </div>
  );
}

export default function ModulationPath() {
  const { tonic, scaleType, setKey } = useComposition();
  const isMajor = ["major", "lydian", "mixolydian"].includes(scaleType);

  const [from, setFrom] = useState<KeyChoice>({
    chroma: chromaOf(tonic),
    type: isMajor ? "major" : "minor",
  });
  const [to, setTo] = useState<KeyChoice>({ chroma: (chromaOf(tonic) + 7) % 12, type: "major" });

  const fromLabel = useMemo(
    () => getScale(NOTE_NAMES[from.chroma], from.type).label,
    [from]
  );
  const path = useMemo(
    () => findModulationPath(NOTE_NAMES[from.chroma], from.type, NOTE_NAMES[to.chroma], to.type),
    [from, to]
  );

  return (
    <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
      <h3 className="text-sm font-semibold text-slate-200">Plan a route</h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Pick a starting key and a destination — this finds the smoothest chain of modulations to get
        there.
      </p>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <KeyPicker label="From" value={from} onChange={setFrom} />
        <KeyPicker label="To" value={to} onChange={setTo} />
      </div>

      <div className="mt-4">
        {path == null ? (
          <p className="text-sm text-slate-400">No route found.</p>
        ) : path.length === 0 ? (
          <p className="text-sm text-slate-400">
            <span className="font-semibold text-white">{fromLabel}</span> is already your destination.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-lg border-2 px-3 py-2 text-sm font-bold text-white"
                style={{ borderColor: FUNCTION_COLORS.Tonic }}
              >
                <span className="block leading-tight">{fromLabel}</span>
                <span className="block text-[10px] font-medium text-slate-400">start</span>
              </span>
              {path.map((step, i) => {
                const color = relationshipColor(step.relationship);
                const pivot = step.pivots[0];
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex flex-col items-center text-[10px] text-slate-400">
                      <span className="text-slate-500">→</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 ring-1 ring-slate-700">
                        {pivot ? `via ${pivot.name}` : "phrase"}
                      </span>
                    </div>
                    <button
                      onClick={() => setKey(step.toTonic, step.toType)}
                      title={`${step.relationship} — click to switch to this key`}
                      className="rounded-lg border-2 px-3 py-2 text-sm font-bold text-white transition hover:brightness-110"
                      style={{ borderColor: color }}
                    >
                      <span className="block leading-tight">{step.toLabel}</span>
                      <span className="block text-[10px] font-medium" style={{ color }}>
                        {step.relationship}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {path.length} step{path.length === 1 ? "" : "s"}. Each hop is a smooth modulation — play
              the bridge chord (or land on the shared note), then resolve into the next key. Click any
              key to jump straight there.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
