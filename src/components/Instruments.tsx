import { useState } from "react";
import Fretboard from "./Fretboard";
import Piano from "./Piano";
import type { NoteHighlight } from "./palette";

interface InstrumentsProps {
  highlights: Map<number, NoteHighlight>;
  onPick?: (chroma: number) => void;
  pickHint?: string;
  /** Accepted for compatibility; instruments no longer show collapse toggles. */
  collapsible?: boolean;
  /** Plain piano: only highlighted keys get a circle, no scale context (Interval tab). */
  plainPiano?: boolean;
  /** Show a Piano/Guitar switch and render only one instrument at a time. */
  toggle?: boolean;
}

/** Renders the same highlight map on both the piano and the fretboard (no titles). */
export default function Instruments({ highlights, onPick, pickHint, plainPiano, toggle }: InstrumentsProps) {
  const [view, setView] = useState<"piano" | "guitar">("piano");

  if (toggle) {
    return (
      <div className="space-y-3">
        <div className="inline-flex rounded-lg bg-slate-900/60 p-0.5 ring-1 ring-slate-800">
          {(["piano", "guitar"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition " +
                (view === v ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200")
              }
            >
              {v}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
          {view === "piano" ? (
            <>
              <Piano highlights={highlights} onPick={onPick} plain={plainPiano} />
              {pickHint && <p className="mt-1 text-xs text-slate-500">{pickHint}</p>}
            </>
          ) : (
            <Fretboard highlights={highlights} onPick={onPick} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
        <Piano highlights={highlights} onPick={onPick} plain={plainPiano} />
        {pickHint && <p className="mt-1 text-xs text-slate-500">{pickHint}</p>}
      </div>
      <div className="overflow-x-auto rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
        <Fretboard highlights={highlights} onPick={onPick} />
      </div>
    </div>
  );
}
