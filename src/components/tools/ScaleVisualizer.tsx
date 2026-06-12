import { useMemo } from "react";
import { useComposition } from "../../store/composition";
import { diatonicChords, getScale, type DiatonicChord } from "../../theory/scales";
import { modeInfo, parentMajorTonic } from "../../theory/modes";
import Instruments from "../Instruments";
import Legend from "../Legend";
import {
  AVOID_TONE,
  COLOR_TONE,
  FUNCTION_COLORS,
  scaleHighlights,
} from "../palette";

export default function ScaleVisualizer() {
  const { tonic, scaleType, lens, currentChordIndex, setCurrentChordIndex } =
    useComposition();

  const scale = useMemo(() => getScale(tonic, scaleType), [tonic, scaleType]);
  const chords = useMemo(() => diatonicChords(scale), [scale]);
  const info = modeInfo(scaleType);
  const highlights = useMemo(() => scaleHighlights(scale, lens), [scale, lens]);

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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Instruments highlights={highlights} />
        <Legend
          title="Notes"
          items={lens === "modal" ? modalLegend : tonalLegend}
        />
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <h2 className="text-lg font-bold text-white">{scale.label}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {scale.notes.map((n) => n.name).join(" – ")}
          </p>
        </div>

        {lens === "tonal" ? (
          <TonalPanel
            chords={chords}
            currentChordIndex={currentChordIndex}
            onSelect={setCurrentChordIndex}
          />
        ) : (
          <ModalPanel
            tonic={tonic}
            scaleType={scaleType}
            blurb={info?.blurb}
          />
        )}
      </aside>
    </div>
  );
}

function TonalPanel({
  chords,
  currentChordIndex,
  onSelect,
}: {
  chords: DiatonicChord[];
  currentChordIndex: number | null;
  onSelect: (i: number | null) => void;
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
        Click a chord to make it the active harmony (used by the Solo Helper).
      </p>
      <ul className="space-y-1.5">
        {chords.map((c, i) => (
          <li key={c.degree}>
            <button
              onClick={() => onSelect(currentChordIndex === i ? null : i)}
              className={
                "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-sm transition " +
                (currentChordIndex === i
                  ? "bg-sky-600/20 ring-1 ring-sky-500"
                  : "hover:bg-slate-800")
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

function ModalPanel({
  tonic,
  scaleType,
  blurb,
}: {
  tonic: string;
  scaleType: string;
  blurb?: string;
}) {
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
