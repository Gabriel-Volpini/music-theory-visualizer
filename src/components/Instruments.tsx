import Fretboard from "./Fretboard";
import Piano from "./Piano";
import type { NoteHighlight } from "./palette";

interface InstrumentsProps {
  highlights: Map<number, NoteHighlight>;
  onPick?: (chroma: number) => void;
  pickHint?: string;
}

/** Renders the same highlight map on both the fretboard and the piano. */
export default function Instruments({ highlights, onPick, pickHint }: InstrumentsProps) {
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Piano</h3>
          {pickHint && <span className="text-xs text-slate-500">{pickHint}</span>}
        </div>
        <div className="overflow-x-auto rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
          <Piano highlights={highlights} onPick={onPick} />
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-300">Guitar fretboard</h3>
        <div className="overflow-x-auto rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
          <Fretboard highlights={highlights} onPick={onPick} />
        </div>
      </section>
    </div>
  );
}
