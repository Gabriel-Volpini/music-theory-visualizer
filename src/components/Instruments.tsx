import { useState } from "react";
import Fretboard from "./Fretboard";
import Piano from "./Piano";
import type { NoteHighlight } from "./palette";

interface InstrumentsProps {
  highlights: Map<number, NoteHighlight>;
  onPick?: (chroma: number) => void;
  pickHint?: string;
  /** Show collapse/expand toggles on each instrument. */
  collapsible?: boolean;
  /** Plain piano: only highlighted keys get a circle, no scale context (Interval tab). */
  plainPiano?: boolean;
}

/** Renders the same highlight map on both the piano and the fretboard. */
export default function Instruments({ highlights, onPick, pickHint, collapsible, plainPiano }: InstrumentsProps) {
  const [pianoOpen, setPianoOpen] = useState(true);
  const [guitarOpen, setGuitarOpen] = useState(true);

  const heading = (label: string, open: boolean, toggle: () => void) =>
    collapsible ? (
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white"
        aria-expanded={open}
      >
        <span className="text-xs text-slate-500">{open ? "▾" : "▸"}</span>
        {label}
      </button>
    ) : (
      <h3 className="text-sm font-semibold text-slate-300">{label}</h3>
    );

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between">
          {heading("Piano", pianoOpen, () => setPianoOpen((o) => !o))}
          {pickHint && (!collapsible || pianoOpen) && <span className="text-xs text-slate-500">{pickHint}</span>}
        </div>
        {(!collapsible || pianoOpen) && (
          <div className="overflow-x-auto rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
            <Piano highlights={highlights} onPick={onPick} plain={plainPiano} />
          </div>
        )}
      </section>
      <section>
        <div className="mb-2">{heading("Guitar fretboard", guitarOpen, () => setGuitarOpen((o) => !o))}</div>
        {(!collapsible || guitarOpen) && (
          <div className="overflow-x-auto rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
            <Fretboard highlights={highlights} onPick={onPick} />
          </div>
        )}
      </section>
    </div>
  );
}
