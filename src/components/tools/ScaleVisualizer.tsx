import { useMemo, useState } from "react";
import { useComposition } from "../../store/composition";
import {
  SCALE_TYPES,
  chromaOf,
  diatonicChords,
  getScale,
  type DiatonicChord,
  type ScaleInfo,
} from "../../theory/scales";
import { modeInfo, parentMajorTonic } from "../../theory/modes";
import { playChord, playNote, resumeAudio } from "../../theory/audio";
import Instruments from "../Instruments";
import Piano from "../Piano";
import Legend from "../Legend";
import {
  AVOID_TONE,
  COLOR_TONE,
  FUNCTION_COLORS,
  functionColor,
  scaleHighlights,
  type NoteHighlight,
} from "../palette";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// Compact interval label for each semitone above the tonic.
const INTERVAL_SHORT = ["R", "m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7"];
// Scale-degree label (with accidentals) for each semitone above the tonic.
const DEGREE_LABEL = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
const MAJOR_FAMILY = new Set(["major", "lydian", "mixolydian"]);

type Overlay = "full" | "penta" | "blues";

/** Pentatonic subset + blue note for a heptatonic scale, relative to the tonic. */
function pentatonicFor(scaleType: string, tonicChroma: number) {
  const major = MAJOR_FAMILY.has(scaleType);
  const offsets = major ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10];
  const blueOffset = major ? 3 : 6; // b3 over major; b5 over minor
  return {
    set: new Set(offsets.map((o) => (tonicChroma + o) % 12)),
    blueChroma: (tonicChroma + blueOffset) % 12,
  };
}

/** Play the scale ascending, one note at a time, then land on the octave. */
function playScale(scale: ScaleInfo) {
  resumeAudio();
  const seq = [...scale.notes.map((n) => n.chroma), scale.notes[0].chroma];
  seq.forEach((chroma, i) => window.setTimeout(() => playNote(chroma), i * 260));
}

export default function ScaleVisualizer() {
  const { tonic, scaleType, lens, currentChordIndex, setCurrentChordIndex, setScaleType } =
    useComposition();

  const scale = useMemo(() => getScale(tonic, scaleType), [tonic, scaleType]);
  const tonicChroma = scale.notes[0]?.chroma ?? 0;
  const chords = useMemo(() => diatonicChords(scale), [scale]);
  const info = modeInfo(scaleType);
  const base = useMemo(() => scaleHighlights(scale, lens), [scale, lens]);

  const [overlay, setOverlay] = useState<Overlay>("full");
  // Hovering a diatonic chord previews its notes on the instruments.
  const [hoverChord, setHoverChord] = useState<number[] | null>(null);

  const highlights = useMemo(() => {
    let map: Map<number, NoteHighlight> = base;

    // Pentatonic / blues overlay: dim notes outside the subset.
    if (overlay !== "full" && scale.isHeptatonic) {
      const { set, blueChroma } = pentatonicFor(scaleType, tonicChroma);
      const m = new Map<number, NoteHighlight>();
      for (const [c, hl] of base) m.set(c, set.has(c) ? { ...hl } : { ...hl, dim: true });
      if (overlay === "blues" && !set.has(blueChroma)) {
        m.set(blueChroma, { color: COLOR_TONE, ring: true, label: SHARP_NAMES[blueChroma], sub: "blue" });
      }
      map = m;
    }

    // Chord hover preview takes precedence: ring the chord, dim the rest.
    if (hoverChord) {
      const chordSet = new Set(hoverChord);
      const m = new Map<number, NoteHighlight>();
      for (const [c, hl] of map) m.set(c, chordSet.has(c) ? { ...hl, ring: true, dim: false } : { ...hl, dim: true });
      map = m;
    }

    return map;
  }, [base, overlay, hoverChord, scale.isHeptatonic, scaleType, tonicChroma]);

  const tonalLegend = [
    { color: FUNCTION_COLORS.Tonic, label: "Tonic (root ◯, 3rd, 6th)", ring: true },
    { color: FUNCTION_COLORS.Subdominant, label: "Subdominant (2nd, 4th)" },
    { color: FUNCTION_COLORS.Dominant, label: "Dominant (5th, 7th)" },
  ];
  const modalLegend = [
    { color: FUNCTION_COLORS.Tonic, label: "Tonic (root ringed)", ring: true },
    { color: FUNCTION_COLORS.Subdominant, label: "Subdominant" },
    { color: FUNCTION_COLORS.Dominant, label: "Dominant" },
    { color: COLOR_TONE, label: "Characteristic color tone", ring: true },
    { color: AVOID_TONE, label: "Avoid note" },
  ];

  return (
    <div className="space-y-6">
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        {scale.isHeptatonic && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold uppercase tracking-wide text-slate-500">Show</span>
            <div className="inline-flex rounded-lg bg-slate-900/60 p-0.5 ring-1 ring-slate-800">
              {([
                ["full", "Full scale"],
                ["penta", "Pentatonic"],
                ["blues", "Blues"],
              ] as [Overlay, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setOverlay(id)}
                  className={
                    "rounded-md px-2.5 py-1 font-medium transition " +
                    (overlay === id ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Instruments highlights={highlights} />
        <Legend title="Notes" items={lens === "modal" ? modalLegend : tonalLegend} />
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{scale.label}</h2>
            <button
              onClick={() => playScale(scale)}
              className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700"
            >
              ▶ Play scale
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {scale.notes.map((n) => {
              const color = functionColor(n.semitone);
              return (
                <button
                  key={n.chroma}
                  onClick={() => {
                    resumeAudio();
                    playNote(n.chroma);
                  }}
                  title={`${INTERVAL_SHORT[n.semitone]} above the root`}
                  className="rounded px-2 py-1 text-xs font-medium ring-1 transition hover:brightness-125"
                  style={{ color, borderColor: color, backgroundColor: color + "1a" }}
                >
                  {n.name}
                </button>
              );
            })}
          </div>
        </div>

        <ColorNotesPanel scale={scale} tonicChroma={tonicChroma} />

        {lens === "tonal" ? (
          <TonalPanel
            chords={chords}
            currentChordIndex={currentChordIndex}
            onSelect={setCurrentChordIndex}
            onHover={setHoverChord}
          />
        ) : (
          <ModalPanel tonic={tonic} scaleType={scaleType} blurb={info?.blurb} />
        )}
      </aside>
    </div>

    <ScaleComparisonChart tonic={tonic} scaleType={scaleType} onPick={setScaleType} />
    </div>
  );
}

type ChartView = "notes" | "degrees" | "compare" | "piano";

const CHART_VIEWS: [ChartView, string][] = [
  ["notes", "Notes"],
  ["degrees", "Degrees"],
  ["compare", "Compare"],
  ["piano", "Piano"],
];

const VIEW_BLURB: Record<ChartView, string> = {
  notes: "Note names in each cell, colored by function (green Tonic · orange Subdominant · red Dominant).",
  degrees: "Scale-degree numbers (1, ♭3, ♯4…) so you read each scale as a formula, independent of key.",
  compare: "Diff against your current scale: shared notes stay colored, notes a scale adds glow amber, and a hollow marker shows a note your current scale has that this one drops.",
  piano: "Each scale drawn on its own one-octave keyboard. Click a key to hear it.",
};

function ScaleComparisonChart({
  tonic,
  scaleType,
  onPick,
}: {
  tonic: string;
  scaleType: string;
  onPick: (t: string) => void;
}) {
  const [view, setView] = useState<ChartView>("notes");
  const tonicChroma = chromaOf(tonic);
  const cols = Array.from({ length: 12 }, (_, i) => i);

  const rows = useMemo(
    () =>
      SCALE_TYPES.map((s) => {
        const sc = getScale(tonic, s.id);
        const bySemi = new Map<number, string>();
        sc.notes.forEach((n) => bySemi.set(n.semitone, n.name));
        return { id: s.id, label: s.label, bySemi, semis: new Set(sc.notes.map((n) => n.semitone)) };
      }),
    [tonic]
  );
  // Semitone set of the currently selected scale (for the Compare view).
  const currentSemis = useMemo(
    () => new Set(getScale(tonic, scaleType).notes.map((n) => n.semitone)),
    [tonic, scaleType]
  );

  const gridCols = "minmax(150px,1.4fr) repeat(12, minmax(34px, 1fr))";
  const play = (semi: number) => {
    resumeAudio();
    playNote((tonicChroma + semi) % 12);
  };

  return (
    <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-200">Scale comparison from {tonic}</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wide text-slate-500">View</span>
          <div className="inline-flex rounded-lg bg-slate-800/80 p-0.5 ring-1 ring-slate-700">
            {CHART_VIEWS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={
                  "rounded-md px-2.5 py-1 font-medium transition " +
                  (view === id ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Every scale built on the same root. Click a row name to switch scale. {VIEW_BLURB[view]}
      </p>

      <div className="mt-3 overflow-x-auto">
        {view === "piano" ? (
          <div className="min-w-[520px] space-y-2">
            {rows.map((r) => {
              const hl = new Map<number, NoteHighlight>();
              getScale(tonic, r.id).notes.forEach((n) =>
                hl.set(n.chroma, {
                  color: functionColor(n.semitone),
                  label: n.name,
                  ring: n.semitone === 0,
                })
              );
              const active = r.id === scaleType;
              return (
                <div
                  key={r.id}
                  className={
                    "grid items-center gap-3 rounded p-1 " +
                    (active ? "bg-sky-600/10 ring-1 ring-sky-500/60" : "")
                  }
                  style={{ gridTemplateColumns: "minmax(140px,160px) 1fr" }}
                >
                  <button
                    onClick={() => onPick(r.id)}
                    className={"text-left text-xs transition hover:text-white " + (active ? "font-semibold text-white" : "text-slate-300")}
                    title={`Switch to ${r.label}`}
                  >
                    {r.label}
                  </button>
                  <div className="max-w-[360px]">
                    <Piano highlights={hl} plain onPick={(c) => play((c - tonicChroma + 12) % 12)} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="min-w-[640px]">
            {/* header: interval labels */}
            <div className="grid items-end gap-px" style={{ gridTemplateColumns: gridCols }}>
              <div className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {view === "degrees" ? "Degree →" : "Interval →"}
              </div>
              {cols.map((c) => (
                <div key={c} className="pb-1 text-center font-mono text-[10px] text-slate-500">
                  {view === "degrees" ? DEGREE_LABEL[c] : INTERVAL_SHORT[c]}
                </div>
              ))}
            </div>

            {rows.map((r) => {
              const active = r.id === scaleType;
              return (
                <div
                  key={r.id}
                  className={
                    "grid items-stretch gap-px rounded " + (active ? "bg-sky-600/10 ring-1 ring-sky-500/60" : "")
                  }
                  style={{ gridTemplateColumns: gridCols }}
                >
                  <button
                    onClick={() => onPick(r.id)}
                    className={
                      "truncate py-1.5 pl-2 pr-1 text-left text-xs transition hover:text-white " +
                      (active ? "font-semibold text-white" : "text-slate-300")
                    }
                    title={`Switch to ${r.label}`}
                  >
                    {r.label}
                  </button>
                  {cols.map((c) => {
                    const name = r.bySemi.get(c);
                    const present = name != null;

                    // Compare view: mark notes this scale drops that the current scale has.
                    if (view === "compare" && !present) {
                      if (currentSemis.has(c)) {
                        return (
                          <div key={c} className="flex items-center justify-center py-1.5" title="Your current scale has this note; this scale doesn't">
                            <span className="h-3.5 w-3.5 rounded-full ring-1 ring-slate-600" />
                          </div>
                        );
                      }
                      return (
                        <div key={c} className="flex items-center justify-center py-1.5">
                          <span className="h-1 w-1 rounded-full bg-slate-700" />
                        </div>
                      );
                    }

                    if (!present) {
                      return (
                        <div key={c} className="flex items-center justify-center py-1.5">
                          <span className="h-1 w-1 rounded-full bg-slate-700" />
                        </div>
                      );
                    }

                    // Compare view: an "added" note (not in the current scale) glows amber.
                    const added = view === "compare" && !currentSemis.has(c);
                    const color = added ? COLOR_TONE : functionColor(c);
                    const text = view === "degrees" ? DEGREE_LABEL[c] : name;
                    return (
                      <button
                        key={c}
                        onClick={() => play(c)}
                        className={
                          "m-px flex items-center justify-center rounded py-1.5 text-[11px] font-semibold transition hover:brightness-125 " +
                          (added ? "ring-1" : "")
                        }
                        style={{
                          color,
                          backgroundColor: color + (added ? "30" : "26"),
                          ...(added ? { borderColor: color } : {}),
                        }}
                        title={`${name} · ${INTERVAL_SHORT[c]}${added ? " — added vs current scale" : ""}`}
                      >
                        {text}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ColorNotesPanel({ scale, tonicChroma }: { scale: ScaleInfo; tonicChroma: number }) {
  const info = modeInfo(scale.type);
  if (!info || (info.characteristicSemitones.length === 0 && info.avoidSemitones.length === 0)) return null;
  const nameFor = (semi: number) => {
    const chroma = (tonicChroma + semi) % 12;
    return scale.chromaToNote.get(chroma)?.name ?? SHARP_NAMES[chroma];
  };
  return (
    <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
      <h3 className="mb-2 text-sm font-semibold text-slate-200">Color & avoid notes</h3>
      <div className="space-y-2 text-xs">
        {info.characteristicSemitones.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-20 text-slate-500">Characteristic</span>
            <div className="flex flex-wrap gap-1.5">
              {info.characteristicSemitones.map((s) => (
                <span
                  key={s}
                  className="rounded px-2 py-0.5 font-semibold ring-1"
                  style={{ color: COLOR_TONE, borderColor: COLOR_TONE, backgroundColor: COLOR_TONE + "1a" }}
                >
                  {nameFor(s)} <span className="font-normal opacity-70">({INTERVAL_SHORT[s]})</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {info.avoidSemitones.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-20 text-slate-500">Avoid</span>
            <div className="flex flex-wrap gap-1.5">
              {info.avoidSemitones.map((s) => (
                <span
                  key={s}
                  className="rounded px-2 py-0.5 font-semibold ring-1"
                  style={{ color: AVOID_TONE, borderColor: AVOID_TONE, backgroundColor: AVOID_TONE + "1a" }}
                >
                  {nameFor(s)} <span className="font-normal opacity-70">({INTERVAL_SHORT[s]})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Lean on the characteristic tone to bring out this scale's sound; treat the avoid note as a
        passing tone over the tonic chord.
      </p>
    </div>
  );
}

function TonalPanel({
  chords,
  currentChordIndex,
  onSelect,
  onHover,
}: {
  chords: DiatonicChord[];
  currentChordIndex: number | null;
  onSelect: (i: number | null) => void;
  onHover: (chromas: number[] | null) => void;
}) {
  if (chords.length === 0) {
    return (
      <div className="rounded-lg bg-slate-900/60 p-4 text-sm text-slate-400 ring-1 ring-slate-800">
        Diatonic chord analysis is shown for 7-note scales. Pick a mode or major/minor
        scale to see its chords and functions.
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
      <h3 className="mb-1 text-sm font-semibold text-slate-200">Diatonic chords</h3>
      <p className="mb-3 text-xs text-slate-500">
        Hover to preview a chord on the instruments; click to hear it and make it the active harmony
        (used by the Solo Helper).
      </p>
      <ul className="space-y-1.5">
        {chords.map((c, i) => (
          <li key={c.degree}>
            <button
              onClick={() => {
                resumeAudio();
                playChord(c.chromas, { durationMs: 900 });
                onSelect(currentChordIndex === i ? null : i);
              }}
              onMouseEnter={() => onHover(c.chromas)}
              onMouseLeave={() => onHover(null)}
              className={
                "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-sm transition " +
                (currentChordIndex === i ? "bg-sky-600/20 ring-1 ring-sky-500" : "hover:bg-slate-800")
              }
            >
              <span className="flex items-center gap-2">
                <span className="w-10 font-mono text-slate-400">{c.roman}</span>
                <span className="font-semibold text-white">{c.name}</span>
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: FUNCTION_COLORS[c.fn] + "33", color: FUNCTION_COLORS[c.fn] }}
              >
                {c.fn}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Function colors assume a major/minor tonal center: the{" "}
        <span style={{ color: FUNCTION_COLORS.Dominant }}>Dominant</span> pulls toward the{" "}
        <span style={{ color: FUNCTION_COLORS.Tonic }}>Tonic</span>.
      </p>
    </div>
  );
}

function ModalPanel({ tonic, scaleType, blurb }: { tonic: string; scaleType: string; blurb?: string }) {
  const parent = parentMajorTonic(tonic, scaleType);
  if (!blurb) {
    return (
      <div className="rounded-lg bg-slate-900/60 p-4 text-sm text-slate-400 ring-1 ring-slate-800">
        The modal lens highlights the characteristic "color" notes of the 7 diatonic modes.
        Choose a mode (e.g. Dorian, Lydian) to use it.
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
      <h3 className="text-sm font-semibold text-slate-200">Modal color</h3>
      <p className="text-sm leading-relaxed text-slate-300">{blurb}</p>
      {parent && (
        <p className="text-xs text-slate-400">
          Same notes as{" "}
          <span className="font-semibold text-pink-400">{parent} major</span>, but centered on{" "}
          <span className="font-semibold text-white">{tonic}</span> — that shift of tonal center is
          what creates the modal sound. The{" "}
          <span style={{ color: COLOR_TONE }}>highlighted note(s)</span> are the ones to lean on.
        </p>
      )}
    </div>
  );
}
