import { useEffect, useMemo, useState } from "react";
import { useComposition } from "../../store/composition";
import { TONICS, chromaOf, getScale } from "../../theory/scales";
import {
  CHORD_PRESETS,
  buildChordFromNotes,
  chordScaleSuggestions,
  currentInversion,
  invertChord,
  substitutions,
  type ChordSuggestion,
} from "../../theory/progression";
import { suggestNextNotes } from "../../theory/solo";
import { playChord, playNote, resumeAudio } from "../../theory/audio";
import Instruments from "../Instruments";
import Legend from "../Legend";
import { CATEGORY_COLORS, CATEGORY_LABELS, FUNCTION_COLORS, functionColor, soloHighlights } from "../palette";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const pc = (c: number) => ((c % 12) + 12) % 12;

export default function ChordBuilder({ onAdd }: { onAdd: (c: ChordSuggestion) => void }) {
  const { tonic } = useComposition();
  const [root, setRoot] = useState(tonic);
  const [selected, setSelected] = useState<number[]>(() =>
    [0, 4, 7].map((o) => pc(chromaOf(tonic) + o))
  );
  const [inversion, setInversion] = useState(0);

  const rootChroma = chromaOf(root);
  const builtBase = useMemo(
    () => buildChordFromNotes(selected, rootChroma, tonic),
    [selected, rootChroma, tonic]
  );
  // Re-voice the built chord for the chosen inversion (changes bass + slash name).
  const built = builtBase ? invertChord(builtBase, inversion) : null;

  // Reset inversion whenever the note set changes.
  useEffect(() => setInversion(0), [selected, rootChroma]);

  const fit = builtBase ? chordScaleSuggestions(builtBase)[0] : null;
  const suggestions = useMemo(() => {
    if (!builtBase || !fit) return [];
    return suggestNextNotes(getScale(fit.tonic, fit.type), builtBase.chromas, null);
  }, [builtBase, fit]);

  /** Replace the building note-set with another chord (used by reharmonize actions). */
  const applyChord = (c: ChordSuggestion) => {
    setSelected([...new Set(c.chromas.map(pc))].sort((a, b) => a - b));
    setRoot(SHARP_NAMES[c.root]);
    setInversion(0);
  };

  const toggle = (chroma: number) =>
    setSelected((prev) =>
      prev.includes(chroma) ? prev.filter((c) => c !== chroma) : [...prev, chroma].sort((a, b) => a - b)
    );

  const applyPreset = (offsets: number[]) => {
    setSelected(offsets.map((o) => pc(rootChroma + o)).sort((a, b) => a - b));
  };

  const highlights = useMemo(() => {
    const map = soloHighlights(suggestions, null);
    return map;
  }, [suggestions]);

  return (
    <div className="space-y-4 rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Build a chord note-by-note</h3>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Root
          <select
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-100 ring-1 ring-slate-700"
          >
            {TONICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Presets */}
      {(["Triads", "Tetrads"] as const).map((group) => (
        <div key={group}>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group}</div>
          <div className="flex flex-wrap gap-1.5">
            {CHORD_PRESETS.filter((p) => p.group === group).map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p.offsets)}
                className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Chromatic note toggles */}
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Toggle notes
        </div>
        <div className="flex flex-wrap gap-1">
          {SHARP_NAMES.map((name, chroma) => {
            const on = selected.includes(chroma);
            const isRoot = chroma === rootChroma;
            // Function color of this note relative to the current key — shown on
            // the border even when the note isn't part of the chord yet.
            const color = functionColor(pc(chroma - chromaOf(tonic)));
            return (
              <button
                key={chroma}
                onClick={() => toggle(chroma)}
                className="h-9 w-10 rounded text-xs font-semibold transition hover:brightness-125"
                style={{
                  backgroundColor: on ? color : "#1e293b",
                  color: on ? "#0b0b0b" : color,
                  border: `1.5px solid ${color}`,
                  boxShadow: isRoot && on ? "0 0 0 2px #fff" : undefined,
                }}
                title={isRoot ? "Root" : undefined}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Built chord readout */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-3">
        {built ? (
          <>
            <span className="text-sm">
              <span className="text-slate-400">Chord: </span>
              <span className="text-lg font-bold" style={{ color: FUNCTION_COLORS[built.fn] }}>
                {built.name}
              </span>{" "}
              <span className="font-mono text-xs text-slate-500">{built.label}</span>{" "}
              <span className="text-xs text-slate-400">({built.notes.join(" ")})</span>
            </span>
            <button
              onClick={() => {
                resumeAudio();
                playChord(built.chromas, { durationMs: 900 });
              }}
              className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700"
            >
              ▶ Hear
            </button>
            <button
              onClick={() => onAdd(built)}
              className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
            >
              + Add to chords
            </button>
          </>
        ) : (
          <span className="text-sm text-slate-500">Select at least two notes to form a chord.</span>
        )}
      </div>

      {/* Actions on the built chord */}
      {builtBase && (
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Invert (bass note)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: builtBase.chromas.length }, (_, n) => n).map((n) => {
                const active = currentInversion(built ?? builtBase) === n;
                return (
                  <button
                    key={n}
                    onClick={() => setInversion(n)}
                    className={
                      "rounded px-2 py-1 text-xs font-medium ring-1 transition hover:brightness-125 " +
                      (active ? "ring-2" : "ring-1")
                    }
                    style={{
                      backgroundColor: FUNCTION_COLORS[builtBase.fn] + (active ? "33" : "1a"),
                      color: FUNCTION_COLORS[builtBase.fn],
                      borderColor: FUNCTION_COLORS[builtBase.fn],
                      boxShadow: active ? `0 0 0 2px ${FUNCTION_COLORS[builtBase.fn]}` : undefined,
                    }}
                  >
                    {["Root pos.", "1st inv.", "2nd inv.", "3rd inv.", "4th inv."][n] ?? `inv ${n}`}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Reharmonize
            </div>
            <div className="flex flex-wrap gap-1.5">
              {substitutions(builtBase, tonic).map((s) => (
                <button
                  key={s.name + s.label}
                  onClick={() => applyChord(s)}
                  title={s.explanation}
                  className="rounded px-2 py-1 text-xs font-medium ring-1 transition hover:brightness-125"
                  style={{ backgroundColor: FUNCTION_COLORS[s.fn] + "1a", color: FUNCTION_COLORS[s.fn], borderColor: FUNCTION_COLORS[s.fn] }}
                >
                  {s.name} <span className="opacity-60">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes that fit a solo over the built chord */}
      {built && fit && suggestions.length > 0 && (
        <div className="border-t border-slate-800 pt-3">
          <div className="mb-1 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-200">
              Notes that fit a solo over {built.name}
            </h4>
            <span className="text-xs text-slate-500">
              over {fit.tonic} {fit.type}
            </span>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {suggestions.map((s) => {
              const color = CATEGORY_COLORS[s.category];
              return (
                <button
                  key={s.chroma}
                  onClick={() => {
                    resumeAudio();
                    playNote(s.chroma);
                  }}
                  title={s.reason}
                  className="rounded px-2 py-1 text-xs font-medium ring-1 transition hover:brightness-125"
                  style={{ backgroundColor: color + "22", color, borderColor: color }}
                >
                  {s.note}
                </button>
              );
            })}
          </div>
          <Instruments
            highlights={highlights}
            onPick={(chroma) => {
              resumeAudio();
              playNote(chroma);
            }}
            pickHint="Click a note to hear it"
          />
          <div className="mt-2">
            <Legend
              title="Fit"
              items={(["chord-tone", "step", "color", "avoid", "scale"] as const).map((c) => ({
                color: CATEGORY_COLORS[c],
                label: CATEGORY_LABELS[c],
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
