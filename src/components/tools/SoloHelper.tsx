import { useMemo } from "react";
import { useComposition } from "../../store/composition";
import { chromaOf, diatonicChords, getScale } from "../../theory/scales";
import { suggestNextNotes } from "../../theory/solo";
import { modulationSuggestions } from "../../theory/progression";
import Instruments from "../Instruments";
import Legend from "../Legend";
import { FUNCTION_COLORS, functionColor, type NoteHighlight } from "../palette";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const pc = (c: number) => ((c % 12) + 12) % 12;

/** How smooth a move to a target key is, from how many notes it shares. */
function tensionFor(changed: number): { label: string; color: string } {
  if (changed <= 1) return { label: "very smooth", color: FUNCTION_COLORS.Tonic };
  if (changed === 2) return { label: "smooth lift", color: FUNCTION_COLORS.Subdominant };
  return { label: "bold — more tension", color: FUNCTION_COLORS.Dominant };
}

export default function SoloHelper() {
  const {
    tonic,
    scaleType,
    currentChordIndex,
    setCurrentChordIndex,
    selectedChroma,
    setSelectedChroma,
    setKey,
    setTool,
  } = useComposition();

  const scale = useMemo(() => getScale(tonic, scaleType), [tonic, scaleType]);
  const tonicChroma = chromaOf(tonic);
  const fnColor = (chroma: number) => functionColor(pc(chroma - tonicChroma));
  const chords = useMemo(() => diatonicChords(scale), [scale]);
  const chord =
    currentChordIndex != null && chords[currentChordIndex]
      ? chords[currentChordIndex]
      : null;

  // Modulation targets, enriched with how smoothly each relates to the current key.
  const modList = useMemo(
    () =>
      modulationSuggestions(tonic, scaleType)
        .filter((s) => s.modulateTo)
        .map((s) => {
          const target = s.modulateTo!;
          const tScale = getScale(target.tonic, target.type);
          const shared = tScale.notes.filter((n) => scale.chromaSet.has(n.chroma)).length;
          return { s, target, total: tScale.notes.length, shared, tension: tensionFor(tScale.notes.length - shared) };
        }),
    [tonic, scaleType, scale]
  );

  const suggestions = useMemo(
    () => suggestNextNotes(scale, chord ? chord.chromas : null, selectedChroma),
    [scale, chord, selectedChroma]
  );

  // Instruments: every scale note is a function-colored circle (a note you can solo with).
  // Shape conveys role — filled+ring = where you are now; a dash = the note opens a modulation.
  const highlights = useMemo(() => {
    const map = new Map<number, NoteHighlight>();
    for (const m of modList) {
      const c = chromaOf(m.target.tonic);
      map.set(c, {
        color: fnColor(c),
        outline: true,
        dash: true,
        label: SHARP_NAMES[c],
        title: `Modulate to ${m.target.tonic} ${m.target.type} — ${m.tension.label} (via ${m.s.name})`,
      });
    }
    if (selectedChroma != null) {
      map.set(selectedChroma, {
        color: fnColor(selectedChroma),
        ring: true,
        sub: "now",
        label: SHARP_NAMES[selectedChroma],
      });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modList, selectedChroma, tonicChroma]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Instruments
          highlights={highlights}
          onPick={setSelectedChroma}
          pickHint="Click a note to set where you are now →"
        />
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <Legend
            title="Function"
            items={[
              { color: FUNCTION_COLORS.Tonic, label: "Tonic" },
              { color: FUNCTION_COLORS.Subdominant, label: "Subdominant" },
              { color: FUNCTION_COLORS.Dominant, label: "Dominant" },
            ]}
          />
          <p className="mt-2 text-xs text-slate-500">
            Every note is colored by its function. The hollow circles are notes you can solo with; a{" "}
            <span className="font-semibold text-slate-300">ringed</span> note is where you are now; a note
            with a <span className="font-semibold text-slate-300">dash</span> can modulate — hover it for
            the key.
          </p>
        </div>
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
          <p className="mb-2 text-xs text-slate-500">
            {selectedChroma == null
              ? "Showing the best notes over the current chord. Click a note on an instrument to get motion-aware suggestions."
              : "Ranked from your current note, factoring in stepwise motion and the active chord."}{" "}
            The <span className="font-mono text-slate-400">fit</span> column is a 0–100 score — how well
            the note fits right now.
          </p>
          <div className="flex items-center gap-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <span className="h-3 w-3 shrink-0" />
            <span className="w-8">Note</span>
            <span className="flex-1">Why</span>
            <span>Fit</span>
          </div>
          <ol className="space-y-1.5">
            {suggestions.slice(0, 8).map((s) => (
              <li
                key={s.chroma}
                className="flex items-center gap-2 rounded px-2 py-1 text-sm"
              >
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: fnColor(s.chroma) }}
                />
                <span className="w-8 font-semibold text-white">{s.note}</span>
                <span className="flex-1 text-xs text-slate-400">{s.reason}</span>
                <span className="font-mono text-xs text-slate-300">
                  {Math.round(s.score * 100)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-200">Modulation</h3>
            <button
              onClick={() => setTool("modulation")}
              className="text-[11px] text-sky-400 hover:text-sky-300"
            >
              Open Modulation →
            </button>
          </div>
          <p className="mb-2 text-xs text-slate-500">
            Keys you can move to — each row is a scale to shift into, how much <span className="text-slate-400">tension</span> the
            move adds, and the chord that bridges it. Click to set it as the key. On the instruments,
            notes with a <span className="font-semibold text-slate-300">dash</span> open a modulation —
            hover to see the key.
          </p>
          {modList.length === 0 ? (
            <p className="text-xs text-slate-600">Pick a 7-note scale to see modulation targets.</p>
          ) : (
            <ol className="space-y-1.5">
              {modList.map((m) => (
                <li key={m.s.name + m.s.label}>
                  <button
                    onClick={() => setKey(m.target.tonic, m.target.type)}
                    title={m.s.explanation}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition hover:bg-slate-800"
                  >
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: m.tension.color }}
                      title={m.tension.label}
                    />
                    <span className="w-20 shrink-0 font-semibold text-white">
                      {m.target.tonic} {m.target.type}
                    </span>
                    <span className="flex-1 text-xs text-slate-400">
                      {m.tension.label} · shares {m.shared}/{m.total} notes
                    </span>
                    <span className="font-mono text-xs text-slate-500">via {m.s.name}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}
