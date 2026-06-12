import { useMemo, type ReactNode } from "react";
import {
  chordScaleSuggestions,
  currentInversion,
  invertChord,
  inversionCount,
  qualityVariants,
  substitutions,
  type ChordScale,
  type ChordSuggestion,
  type PlacedChord,
} from "../../theory/progression";
import { labelFor } from "../../theory/scales";
import { FUNCTION_COLORS } from "../palette";

interface Props {
  chord: PlacedChord;
  index: number;
  tonic: string;
  /** Currently chosen solo scale (or null = showing the chord). */
  activeScale: ChordScale | null;
  onReplace: (i: number, c: ChordSuggestion) => void;
  onBeats: (i: number, beats: number) => void;
  onPickScale: (s: ChordScale | null) => void;
}

export default function ChordEditPanel({
  chord,
  index,
  tonic,
  activeScale,
  onReplace,
  onBeats,
  onPickScale,
}: Props) {
  const variants = useMemo(() => qualityVariants(chord), [chord]);
  const subs = useMemo(() => substitutions(chord, tonic), [chord, tonic]);
  const scales = useMemo(() => chordScaleSuggestions(chord), [chord]);
  const color = FUNCTION_COLORS[chord.fn];
  const invCount = inversionCount(chord);
  const invNow = currentInversion(chord);
  const INV_LABELS = ["Root pos.", "1st inv.", "2nd inv.", "3rd inv.", "4th inv."];

  return (
    <div className="space-y-4 rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">
          Edit <span style={{ color }}>{chord.label}</span> · {chord.name}
        </h3>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          Duration
          <button onClick={() => onBeats(index, chord.beats - 1)} className="h-6 w-6 rounded bg-slate-800 text-slate-200 hover:bg-slate-700">
            –
          </button>
          <span className="w-16 text-center font-mono text-slate-100">
            {chord.beats} {chord.beats === 1 ? "beat" : "beats"}
          </span>
          <button onClick={() => onBeats(index, chord.beats + 1)} className="h-6 w-6 rounded bg-slate-800 text-slate-200 hover:bg-slate-700">
            +
          </button>
        </div>
      </div>

      <Section title="Quality / extensions">
        {variants.map((v) => (
          <Pill key={v.name} active={v.name === chord.name} color={color} onClick={() => onReplace(index, v)} title={v.explanation}>
            {v.name}
          </Pill>
        ))}
      </Section>

      {invCount > 1 && (
        <Section title="Inversion (bass note)">
          {Array.from({ length: invCount }, (_, n) => n).map((n) => (
            <Pill
              key={n}
              active={n === invNow}
              color={color}
              onClick={() => onReplace(index, invertChord(chord, n))}
              title={`Put the ${n === 0 ? "root" : "chord tone"} in the bass`}
            >
              {INV_LABELS[n] ?? `inv ${n}`}
            </Pill>
          ))}
        </Section>
      )}

      <Section title="Reharmonize (substitutions)">
        {subs.map((s) => (
          <Pill key={s.name + s.label} color={FUNCTION_COLORS[s.fn]} onClick={() => onReplace(index, s)} title={s.explanation}>
            {s.name} <span className="opacity-60">{s.label}</span>
          </Pill>
        ))}
      </Section>

      <Section title="Solo over this chord">
        <Pill active={activeScale == null} color="#94a3b8" onClick={() => onPickScale(null)}>
          Show chord
        </Pill>
        {scales.map((s) => (
          <Pill
            key={s.tonic + s.type}
            active={activeScale?.type === s.type && activeScale?.tonic === s.tonic}
            color="#a78bfa"
            onClick={() => onPickScale(s)}
            title={s.reason}
          >
            {s.tonic} {labelFor(s.type)}
          </Pill>
        ))}
        {activeScale && (
          <p className="mt-1 w-full text-[11px] text-slate-400">{scales.find((s) => s.type === activeScale.type)?.reason}</p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({
  children,
  color,
  active,
  onClick,
  title,
}: {
  children: ReactNode;
  color: string;
  active?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded px-2 py-1 text-xs font-medium ring-1 transition hover:brightness-125"
      style={{
        backgroundColor: color + (active ? "33" : "1a"),
        color,
        borderColor: color,
        boxShadow: active ? `0 0 0 2px ${color}` : undefined,
      }}
    >
      {children}
    </button>
  );
}
