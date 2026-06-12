import { useMemo } from "react";
import { useComposition } from "../../store/composition";
import { diatonicChords, getScale } from "../../theory/scales";
import { suggestNextNotes } from "../../theory/solo";
import Instruments from "../Instruments";
import Legend from "../Legend";
import { CATEGORY_COLORS, CATEGORY_LABELS, soloHighlights } from "../palette";
import type { SoloCategory } from "../../theory/solo";

const LEGEND_ORDER: SoloCategory[] = ["chord-tone", "step", "color", "avoid", "scale"];

export default function SoloHelper() {
  const {
    tonic,
    scaleType,
    currentChordIndex,
    setCurrentChordIndex,
    selectedChroma,
    setSelectedChroma,
  } = useComposition();

  const scale = useMemo(() => getScale(tonic, scaleType), [tonic, scaleType]);
  const chords = useMemo(() => diatonicChords(scale), [scale]);
  const chord =
    currentChordIndex != null && chords[currentChordIndex]
      ? chords[currentChordIndex]
      : null;

  const suggestions = useMemo(
    () => suggestNextNotes(scale, chord ? chord.chromas : null, selectedChroma),
    [scale, chord, selectedChroma]
  );

  const highlights = useMemo(
    () => soloHighlights(suggestions, selectedChroma),
    [suggestions, selectedChroma]
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Instruments
          highlights={highlights}
          onPick={setSelectedChroma}
          pickHint="Click a note to set where you are now →"
        />
        <Legend
          title="Suggestions"
          items={[
            { color: "#fbbf24", label: "Current note", ring: true },
            ...LEGEND_ORDER.map((c) => ({
              color: CATEGORY_COLORS[c],
              label: CATEGORY_LABELS[c],
            })),
          ]}
        />
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Active chord</h3>
          {chords.length === 0 ? (
            <p className="text-xs text-slate-500">
              Pick a 7-note scale to get chord-aware suggestions. Stepwise hints still work.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCurrentChordIndex(null)}
                className={
                  "rounded px-2 py-1 text-xs transition " +
                  (currentChordIndex == null
                    ? "bg-sky-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700")
                }
              >
                None
              </button>
              {chords.map((c, i) => (
                <button
                  key={c.degree}
                  onClick={() => setCurrentChordIndex(i)}
                  className={
                    "rounded px-2 py-1 text-xs transition " +
                    (currentChordIndex === i
                      ? "bg-sky-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700")
                  }
                  title={c.notes.join(" ")}
                >
                  {c.roman} {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <h3 className="mb-1 text-sm font-semibold text-slate-200">Next-note ranking</h3>
          <p className="mb-3 text-xs text-slate-500">
            {selectedChroma == null
              ? "Showing the best notes over the current chord. Click a note on an instrument to get motion-aware suggestions."
              : "Ranked from your current note, factoring in stepwise motion and the active chord."}
          </p>
          <ol className="space-y-1.5">
            {suggestions.slice(0, 8).map((s) => (
              <li
                key={s.chroma}
                className="flex items-center gap-2 rounded px-2 py-1 text-sm"
              >
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[s.category] }}
                />
                <span className="w-8 font-semibold text-white">{s.note}</span>
                <span className="flex-1 text-xs text-slate-400">{s.reason}</span>
                <span className="font-mono text-xs text-slate-500">
                  {Math.round(s.score * 100)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
