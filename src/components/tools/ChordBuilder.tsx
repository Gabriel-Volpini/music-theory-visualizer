import { useEffect, useMemo, useState } from "react";
import { TONICS, chromaOf, getScale } from "../../theory/scales";
import {
  CHORD_PRESETS,
  buildChordFromNotes,
  chordScaleSuggestions,
  currentInversion,
  invertChord,
  substitutions,
  type ChordSuggestion,
  type PlacedChord,
} from "../../theory/progression";
import { suggestNextNotes } from "../../theory/solo";
import { playChord, playNote, resumeAudio } from "../../theory/audio";
import Piano from "../Piano";
import Fretboard from "../Fretboard";
import Legend from "../Legend";
import { CATEGORY_COLORS, CATEGORY_LABELS, FUNCTION_COLORS, functionColor, type NoteHighlight } from "../palette";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const pc = (c: number) => ((c % 12) + 12) % 12;

interface Props {
  tonic: string;
  /** The selected chord being edited, or null to build a new one. */
  chord: PlacedChord | null;
  /** Replace the selected chord in place (live editing). */
  onReplace: (c: ChordSuggestion) => void;
  /** Add the built chord as a new chord. */
  onAdd: (c: ChordSuggestion) => void;
  /** Change the selected chord's duration in beats. */
  onBeats: (beats: number) => void;
  /** Deselect so a brand-new chord can be built. */
  onNew: () => void;
}

export default function ChordBuilder({ tonic, chord, onReplace, onAdd, onBeats, onNew }: Props) {
  const [root, setRoot] = useState(tonic);
  const [notes, setNotes] = useState<number[]>(() => [0, 4, 7].map((o) => pc(chromaOf(tonic) + o)));
  const [inversion, setInversion] = useState(0);
  const [instrument, setInstrument] = useState<"piano" | "guitar">("piano");

  const editing = chord != null;

  // Load the selected chord into the editor whenever the selection changes.
  useEffect(() => {
    if (chord) {
      setNotes([...new Set(chord.chromas.map(pc))].sort((a, b) => a - b));
      setRoot(SHARP_NAMES[chord.root]);
      setInversion(currentInversion(chord));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chord?.uid]);

  const rootChroma = chromaOf(root);
  const builtBase = useMemo(() => buildChordFromNotes(notes, rootChroma, tonic), [notes, rootChroma, tonic]);
  const built = builtBase ? invertChord(builtBase, inversion) : null;

  const fit = builtBase ? chordScaleSuggestions(builtBase)[0] : null;
  const suggestions = useMemo(
    () => (builtBase && fit ? suggestNextNotes(getScale(fit.tonic, fit.type), builtBase.chromas, null) : []),
    [builtBase, fit]
  );
  // The chord's own notes, highlighted on the building instrument (root ringed).
  const buildHighlights = useMemo(() => {
    const map = new Map<number, NoteHighlight>();
    notes.forEach((c) =>
      map.set(c, { color: functionColor(pc(c - chromaOf(tonic))), label: SHARP_NAMES[c], ring: c === rootChroma })
    );
    return map;
  }, [notes, rootChroma, tonic]);

  const pickNote = (chroma: number) => {
    resumeAudio();
    playNote(chroma);
    toggle(chroma);
  };

  /** Push the current edit to the selected chord (live). No-op while creating. */
  const commit = (nextNotes: number[], nextRootChroma: number, nextInv: number) => {
    if (!editing) return;
    const base = buildChordFromNotes(nextNotes, nextRootChroma, tonic);
    if (!base) return;
    onReplace(invertChord(base, nextInv));
  };

  const toggle = (chroma: number) => {
    const next = notes.includes(chroma) ? notes.filter((c) => c !== chroma) : [...notes, chroma].sort((a, b) => a - b);
    setNotes(next);
    setInversion(0);
    commit(next, rootChroma, 0);
  };
  const applyPreset = (offsets: number[]) => {
    const next = offsets.map((o) => pc(rootChroma + o)).sort((a, b) => a - b);
    setNotes(next);
    setInversion(0);
    commit(next, rootChroma, 0);
  };
  const changeRoot = (r: string) => {
    setRoot(r);
    commit(notes, chromaOf(r), inversion);
  };
  const changeInversion = (n: number) => {
    setInversion(n);
    commit(notes, rootChroma, n);
  };
  const reharm = (s: ChordSuggestion) => {
    const next = [...new Set(s.chromas.map(pc))].sort((a, b) => a - b);
    setNotes(next);
    setRoot(SHARP_NAMES[s.root]);
    setInversion(0);
    commit(next, s.root, 0);
  };

  return (
    <div className="space-y-4 rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-slate-200">
          {editing ? "Edit the selected chord" : "Build a new chord"}
        </h3>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Root
          <select value={root} onChange={(e) => changeRoot(e.target.value)} className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-100 ring-1 ring-slate-700">
            {TONICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {editing && (
          <button onClick={onNew} className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700">
            ＋ New chord
          </button>
        )}
      </div>

      {/* Built chord readout + actions */}
      <div className="flex flex-wrap items-center gap-3">
        {built ? (
          <>
            <span className="text-sm">
              <span className="text-slate-400">{editing ? "Editing: " : "Chord: "}</span>
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
            {!editing && (
              <button onClick={() => onAdd(built)} className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500">
                + Add to chords
              </button>
            )}
            {editing && chord && (
              <span className="flex items-center gap-2 text-xs text-slate-400">
                Duration
                <button onClick={() => onBeats(chord.beats - 1)} className="h-6 w-6 rounded bg-slate-800 text-slate-200 hover:bg-slate-700">–</button>
                <span className="w-12 text-center font-mono text-slate-100">{chord.beats}b</span>
                <button onClick={() => onBeats(chord.beats + 1)} className="h-6 w-6 rounded bg-slate-800 text-slate-200 hover:bg-slate-700">+</button>
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-slate-500">Select at least two notes to form a chord.</span>
        )}
      </div>

      {/* Presets */}
      {(["Triads", "Tetrads"] as const).map((group) => (
        <div key={group}>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group}</div>
          <div className="flex flex-wrap gap-1.5">
            {CHORD_PRESETS.filter((p) => p.group === group).map((p) => (
              <button key={p.name} onClick={() => applyPreset(p.offsets)} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">
                {p.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Inversion */}
      {builtBase && builtBase.chromas.length > 1 && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Invert (bass note)</div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: builtBase.chromas.length }, (_, n) => n).map((n) => {
              const active = currentInversion(built ?? builtBase) === n;
              const col = FUNCTION_COLORS[builtBase.fn];
              return (
                <button
                  key={n}
                  onClick={() => changeInversion(n)}
                  className="rounded px-2 py-1 text-xs font-medium ring-1 transition hover:brightness-125"
                  style={{
                    backgroundColor: col + (active ? "33" : "1a"),
                    color: col,
                    borderColor: col,
                    boxShadow: active ? `0 0 0 2px ${col}` : undefined,
                  }}
                >
                  {["Root pos.", "1st inv.", "2nd inv.", "3rd inv.", "4th inv."][n] ?? `inv ${n}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Reharmonize */}
      {builtBase && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reharmonize</div>
          <div className="flex flex-wrap gap-1.5">
            {substitutions(builtBase, tonic).map((s) => (
              <button
                key={s.name + s.label}
                onClick={() => reharm(s)}
                title={s.explanation}
                className="rounded px-2 py-1 text-xs font-medium ring-1 transition hover:brightness-125"
                style={{ backgroundColor: FUNCTION_COLORS[s.fn] + "1a", color: FUNCTION_COLORS[s.fn], borderColor: FUNCTION_COLORS[s.fn] }}
              >
                {s.name} <span className="opacity-60">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes that fit a solo */}
      {built && fit && suggestions.length > 0 && (
        <div className="border-t border-slate-800 pt-3">
          <div className="mb-1 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-200">Notes that fit a solo over {built.name}</h4>
            <span className="text-xs text-slate-500">
              over {fit.tonic} {fit.type}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
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

      {/* Add notes by clicking the instrument (keyboard or guitar) */}
      <div className="border-t border-slate-800 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Click notes to add / remove them
          </div>
          <div className="inline-flex overflow-hidden rounded ring-1 ring-slate-700">
            {(["piano", "guitar"] as const).map((inst) => (
              <button
                key={inst}
                onClick={() => setInstrument(inst)}
                className={
                  "px-3 py-1 text-xs capitalize transition " +
                  (instrument === inst ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700")
                }
              >
                {inst === "piano" ? "Keyboard" : "Guitar"}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
          {instrument === "piano" ? (
            <Piano highlights={buildHighlights} onPick={pickNote} />
          ) : (
            <Fretboard highlights={buildHighlights} onPick={pickNote} />
          )}
        </div>
      </div>
    </div>
  );
}
