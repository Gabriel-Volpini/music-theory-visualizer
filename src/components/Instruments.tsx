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
}

/** Renders the same highlight map on both the piano and the fretboard (no titles). */
export default function Instruments({ highlights, onPick, pickHint, plainPiano }: InstrumentsProps) {
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
