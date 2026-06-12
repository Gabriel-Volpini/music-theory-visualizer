import { useComposition } from "../store/composition";
import { SCALE_TYPES, TONICS, getScale, type ScaleTypeOption } from "../theory/scales";
import { isMode } from "../theory/modes";
import { playNote, resumeAudio } from "../theory/audio";
import Legend from "./Legend";
import { FUNCTION_COLORS, functionColor } from "./palette";

const GROUPS: ScaleTypeOption["group"][] = ["Major modes", "Minor modes", "Other"];

export default function ScalePicker() {
  const { tonic, scaleType, lens, tool, setTonic, setScaleType, setLens } = useComposition();
  const lensAvailable = isMode(scaleType);
  const scale = getScale(tonic, scaleType);
  // The tonal/modal lens only changes the Scale Visualizer, so only show it there.
  const showLens = tool === "scale";

  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Root
        <select
          value={tonic}
          onChange={(e) => setTonic(e.target.value)}
          className="rounded bg-slate-800 px-3 py-2 text-base text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
        >
          {TONICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Scale / Mode
        <select
          value={scaleType}
          onChange={(e) => setScaleType(e.target.value)}
          className="rounded bg-slate-800 px-3 py-2 text-base text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
        >
          {GROUPS.map((g) => (
            <optgroup key={g} label={g}>
              {SCALE_TYPES.filter((s) => s.group === g).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1 text-xs text-slate-400">
        Notes
        <div className="flex h-[42px] flex-wrap items-center gap-1">
          {scale.notes.map((n) => {
            const color = functionColor(n.semitone);
            return (
              <button
                key={n.chroma}
                onClick={() => {
                  resumeAudio();
                  playNote(n.chroma);
                }}
                title="Click to hear"
                className="rounded px-1.5 py-0.5 text-sm font-semibold ring-1 transition hover:brightness-125"
                style={{ color, borderColor: color, backgroundColor: color + "1a" }}
              >
                {n.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs text-slate-400">
        Note colors
        <div className="flex h-[42px] items-center">
          <Legend
            items={[
              { color: FUNCTION_COLORS.Tonic, label: "Tonic" },
              { color: FUNCTION_COLORS.Subdominant, label: "Subdominant" },
              { color: FUNCTION_COLORS.Dominant, label: "Dominant" },
            ]}
          />
        </div>
      </div>

      {showLens && (
        <div className="flex flex-col gap-1 text-xs text-slate-400">
          Lens
          <div className="inline-flex overflow-hidden rounded ring-1 ring-slate-700">
            {(["tonal", "modal"] as const).map((l) => (
              <button
                key={l}
                disabled={!lensAvailable && l === "modal"}
                onClick={() => setLens(l)}
                className={
                  "px-3 py-2 text-sm capitalize transition " +
                  (lens === l
                    ? "bg-sky-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700") +
                  (!lensAvailable && l === "modal" ? " cursor-not-allowed opacity-40" : "")
                }
                title={
                  !lensAvailable && l === "modal"
                    ? "Modal lens applies to the 7 diatonic modes"
                    : undefined
                }
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
