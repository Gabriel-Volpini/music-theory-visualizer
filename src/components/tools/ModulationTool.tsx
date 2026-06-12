import { useMemo, useState } from "react";
import { useComposition } from "../../store/composition";
import { getScale } from "../../theory/scales";
import { suggestModulations } from "../../theory/modulation";
import Instruments from "../Instruments";
import Legend from "../Legend";
import {
  FUNCTION_COLORS,
  LEAVING_TONE,
  NEW_TONE,
  SHARED_TONE,
  modulationHighlights,
} from "../palette";

/** Tint a destination by its harmonic function, matching the rest of the app. */
function relationshipColor(rel: string): string {
  if (/dominant/i.test(rel)) return FUNCTION_COLORS.Dominant; // red
  if (/subdominant/i.test(rel)) return FUNCTION_COLORS.Subdominant; // orange
  if (/relative|parallel/i.test(rel)) return FUNCTION_COLORS.Tonic; // green
  return "#7dd3fc"; // sky — bVII, bVI, mediant, supertonic, etc.
}

export default function ModulationTool() {
  const { tonic, scaleType, setKey } = useComposition();
  const [selected, setSelected] = useState<number | null>(null);

  const source = useMemo(() => getScale(tonic, scaleType), [tonic, scaleType]);
  const targets = useMemo(() => suggestModulations(tonic, scaleType), [tonic, scaleType]);
  const target = selected != null ? targets[selected] : null;
  const targetScale = useMemo(
    () => (target ? getScale(target.tonic, target.type) : null),
    [target]
  );

  const highlights = useMemo(
    () => modulationHighlights(source, targetScale),
    [source, targetScale]
  );

  // Reset selection if the source key changed out from under us.
  if (selected != null && selected >= targets.length) setSelected(null);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Instruments highlights={highlights} />
        {target ? (
          <Legend
            title="Comparison"
            items={[
              { color: SHARED_TONE, label: "Shared (pivot freely)" },
              { color: NEW_TONE, label: "New in target key", ring: true },
              { color: LEAVING_TONE, label: "Leaving (only in current)" },
            ]}
          />
        ) : (
          <p className="text-sm text-slate-400">
            Showing <span className="font-semibold text-white">{source.label}</span>. Pick a
            destination on the right to see shared vs. new notes and the pivot chords that bridge
            the two keys.
          </p>
        )}
      </div>

      <aside className="space-y-3">
        <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <h3 className="text-sm font-semibold text-slate-200">
            Modulate from {source.label}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Ranked by shared notes — top suggestions are the smoothest moves.
          </p>
        </div>

        <ul className="space-y-2">
          {targets.map((t, i) => {
            const active = selected === i;
            return (
              <li key={`${t.tonic}-${t.type}`}>
                <button
                  onClick={() => setSelected(active ? null : i)}
                  className={
                    "w-full rounded-lg p-3 text-left ring-1 transition " +
                    (active
                      ? "bg-sky-600/15 ring-sky-500"
                      : "bg-slate-900/60 ring-slate-800 hover:ring-slate-600")
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{t.label}</span>
                    <span className="text-[11px] text-slate-400">{t.sharedCount}/7 shared</span>
                  </div>
                  <div
                    className="text-xs font-medium"
                    style={{ color: relationshipColor(t.relationship) }}
                  >
                    {t.relationship}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{t.blurb}</p>

                  {active && (
                    <div className="mt-3 space-y-2 border-t border-slate-700 pt-3">
                      {t.pivots.length > 0 ? (
                        <div>
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Pivot chords
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {t.pivots.map((p) => (
                              <span
                                key={p.name}
                                className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200"
                                title={`${p.sourceRoman} in ${source.label} = ${p.targetRoman} in ${t.label}`}
                              >
                                <span className="font-semibold text-white">{p.name}</span>{" "}
                                <span className="text-slate-400">
                                  {p.sourceRoman}→{p.targetRoman}
                                </span>
                              </span>
                            ))}
                          </div>
                          <p className="mt-1.5 text-[11px] text-slate-500">
                            Play one of these, then resolve into the new key — the listener won't
                            feel the seam.
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          No common diatonic chord — use a direct (phrase) modulation or a shared
                          single note as the link.
                        </p>
                      )}

                      {t.newNotes.length > 0 && (
                        <p className="text-[11px] text-slate-400">
                          New notes:{" "}
                          <span className="text-amber-300">{t.newNotes.join(", ")}</span>
                        </p>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setKey(t.tonic, t.type);
                          setSelected(null);
                        }}
                        className="mt-1 w-full rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
                      >
                        Switch to {t.label} →
                      </button>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
