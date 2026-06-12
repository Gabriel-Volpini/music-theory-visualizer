import { useState } from "react";
import Instruments from "../Instruments";
import Legend from "../Legend";
import type { NoteHighlight } from "../palette";
import { playChord, playNote, resumeAudio } from "../../theory/audio";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A_COLOR = "#3b82f6"; // blue
const B_COLOR = "#a855f7"; // purple

const INTERVALS = [
  { name: "Unison", short: "P1", con: "Perfect consonance" },
  { name: "Minor 2nd", short: "m2", con: "Dissonance" },
  { name: "Major 2nd", short: "M2", con: "Dissonance" },
  { name: "Minor 3rd", short: "m3", con: "Imperfect consonance" },
  { name: "Major 3rd", short: "M3", con: "Imperfect consonance" },
  { name: "Perfect 4th", short: "P4", con: "Consonance (context-dependent)" },
  { name: "Tritone", short: "TT", con: "Dissonance — the most unstable interval" },
  { name: "Perfect 5th", short: "P5", con: "Perfect consonance" },
  { name: "Minor 6th", short: "m6", con: "Imperfect consonance" },
  { name: "Major 6th", short: "M6", con: "Imperfect consonance" },
  { name: "Minor 7th", short: "m7", con: "Dissonance" },
  { name: "Major 7th", short: "M7", con: "Dissonance" },
];

export default function IntervalVisualizer() {
  const [a, setA] = useState<number | null>(0);
  const [b, setB] = useState<number | null>(7);

  const pick = (chroma: number) => {
    resumeAudio();
    playNote(chroma);
    if (a == null) setA(chroma);
    else if (b == null) setB(chroma);
    else {
      setA(chroma);
      setB(null);
    }
  };

  const highlights = new Map<number, NoteHighlight>();
  if (a != null) highlights.set(a, { color: A_COLOR, label: SHARP_NAMES[a], sub: "A", ring: true });
  if (b != null) highlights.set(b, { color: B_COLOR, label: SHARP_NAMES[b], sub: "B", ring: true });

  const both = a != null && b != null;
  const semis = both ? ((b! - a! + 12) % 12) : null;
  const info = semis != null ? INTERVALS[semis] : null;
  const invSemis = semis != null ? (12 - semis) % 12 : null;
  const inv = invSemis != null ? INTERVALS[invSemis] : null;

  const playMelodic = () => {
    if (!both) return;
    resumeAudio();
    playNote(a!);
    window.setTimeout(() => playNote(b!), 450);
  };
  const playHarmonic = () => {
    if (!both) return;
    resumeAudio();
    playChord([a!, b!], { durationMs: 1100, strumMs: 0 });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-slate-900/60 p-4 text-sm leading-relaxed text-slate-300 ring-1 ring-slate-800">
        <p className="mb-1 font-semibold text-slate-200">What this does</p>
        An <span className="text-white">interval</span> is the distance in pitch between two notes — the
        building block of every melody and chord. Click any two notes on the piano or fretboard: the
        first becomes <span style={{ color: A_COLOR }}>A</span>, the second{" "}
        <span style={{ color: B_COLOR }}>B</span>. This tool then tells you the interval's{" "}
        <span className="text-white">name</span> and <span className="text-white">size in semitones</span>,
        whether it sounds <span className="text-white">consonant</span> (stable) or{" "}
        <span className="text-white">dissonant</span> (tense), and what it{" "}
        <span className="text-white">inverts</span> to. Use the play buttons to hear the two notes one
        after another (melodic) or together (harmonic). Click a third note to start a new pair.
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Instruments highlights={highlights} onPick={pick} pickHint="Click two notes to measure the interval" plainPiano />
        <Legend
          items={[
            { color: A_COLOR, label: "Note A", ring: true },
            { color: B_COLOR, label: "Note B", ring: true },
          ]}
        />
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">Interval</h2>
          {both && info ? (
            <>
              <div className="text-2xl font-bold text-white">{info.name}</div>
              <div className="mt-1 text-sm text-slate-400">
                <span className="font-mono">{info.short}</span> · {semis} semitone{semis === 1 ? "" : "s"} ·{" "}
                <span style={{ color: A_COLOR }}>{SHARP_NAMES[a!]}</span> →{" "}
                <span style={{ color: B_COLOR }}>{SHARP_NAMES[b!]}</span>
              </div>
              <div className="mt-2 text-xs text-slate-400">{info.con}</div>
              {inv && (
                <div className="mt-2 text-xs text-slate-500">
                  Inverts to a <span className="text-slate-300">{inv.name}</span> ({inv.short}).
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <button onClick={playMelodic} className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700">
                  ▶ Melodic
                </button>
                <button onClick={playHarmonic} className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700">
                  ▶ Harmonic
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Click two notes on the piano or fretboard.</p>
          )}
        </div>
        <button
          onClick={() => {
            setA(null);
            setB(null);
          }}
          className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
        >
          Reset
        </button>
        </aside>
      </div>
    </div>
  );
}
