import { useMemo, useState } from "react";
import { useComposition } from "../../store/composition";
import { chromaOf, getScale } from "../../theory/scales";
import Instruments from "../Instruments";
import Legend from "../Legend";
import { functionColor, type NoteHighlight } from "../palette";
import { CHORD_PRESETS } from "../../theory/progression";
import { playChord, playNote, resumeAudio } from "../../theory/audio";

const OUT_SCALE = "#64748b"; // gray — fallback when no note is selected

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

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
  const { tonic, scaleType } = useComposition();
  const scale = useMemo(() => getScale(tonic, scaleType), [tonic, scaleType]);
  const scaleSet = scale.chromaSet;
  const tonicChroma = chromaOf(tonic);
  // Function color (green/orange/red) for any note, relative to the tonic.
  const fnOf = (chroma: number) => functionColor(((chroma - tonicChroma) % 12 + 12) % 12);

  const [a, setA] = useState<number | null>(0);
  const [b, setB] = useState<number | null>(7);
  // The chord whose chips is being hovered — its notes preview on the instruments.
  const [hoverChord, setHoverChord] = useState<number[] | null>(null);

  const aColor = a != null ? fnOf(a) : OUT_SCALE;
  const bColor = b != null ? fnOf(b) : OUT_SCALE;

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
  // Hovered chord's other notes: always function-colored (green/orange/red);
  // filled when in the selected scale, hollow when outside it.
  if (hoverChord) {
    for (const c of hoverChord) {
      if (c === a || c === b) continue;
      highlights.set(c, {
        color: fnOf(c),
        outline: !scaleSet.has(c),
        label: SHARP_NAMES[c],
      });
    }
  }
  if (a != null) highlights.set(a, { color: aColor, label: SHARP_NAMES[a], sub: "A", ring: true });
  if (b != null) highlights.set(b, { color: bColor, label: SHARP_NAMES[b], sub: "B", ring: true });

  const both = a != null && b != null;
  const semis = both ? ((b! - a! + 12) % 12) : null;
  const info = semis != null ? INTERVALS[semis] : null;
  const invSemis = semis != null ? (12 - semis) % 12 : null;
  const inv = invSemis != null ? INTERVALS[invSemis] : null;

  // Chords (triads & tetrads) that contain both notes of the interval.
  const chordMatches = useMemo(() => {
    if (a == null || b == null || a === b) return { Triads: [], Tetrads: [] } as Record<string, { name: string; chromas: number[] }[]>;
    const groups: Record<string, { name: string; chromas: number[] }[]> = { Triads: [], Tetrads: [] };
    for (let root = 0; root < 12; root++) {
      for (const p of CHORD_PRESETS) {
        const chromas = p.offsets.map((o) => (root + o) % 12);
        if (chromas.includes(a) && chromas.includes(b)) {
          groups[p.group].push({ name: `${SHARP_NAMES[root]} ${p.name}`, chromas });
        }
      }
    }
    return groups;
  }, [a, b]);

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
        first becomes <span style={{ color: aColor }}>A</span>, the second{" "}
        <span style={{ color: bColor }}>B</span>. This tool then tells you the interval's{" "}
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
            { color: aColor, label: "Note A", ring: true },
            { color: bColor, label: "Note B", ring: true },
          ]}
        />
        <p className="text-xs text-slate-500">
          Notes are colored by function (green Tonic · orange Subdominant · red Dominant). Hovered chord
          notes are <span className="text-slate-300">filled</span> when in the selected scale and{" "}
          <span className="text-slate-300">hollow</span> when outside it.
        </p>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">{scale.label}</h2>
          <div className="flex flex-wrap gap-1.5">
            {scale.notes.map((n) => {
              const color = functionColor(n.semitone);
              const picked = n.chroma === a || n.chroma === b;
              return (
                <button
                  key={n.chroma}
                  onClick={() => pick(n.chroma)}
                  className="rounded px-2 py-1 text-xs font-medium ring-1 transition hover:brightness-125"
                  style={{
                    color,
                    borderColor: color,
                    backgroundColor: color + (picked ? "44" : "1a"),
                    boxShadow: picked ? `0 0 0 2px ${color}` : undefined,
                  }}
                >
                  {n.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">Interval</h2>
          {both && info ? (
            <>
              <div className="text-2xl font-bold text-white">{info.name}</div>
              <div className="mt-1 text-sm text-slate-400">
                <span className="font-mono">{info.short}</span> · {semis} semitone{semis === 1 ? "" : "s"} ·{" "}
                <span style={{ color: aColor }}>{SHARP_NAMES[a!]}</span> →{" "}
                <span style={{ color: bColor }}>{SHARP_NAMES[b!]}</span>
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
        <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <h2 className="mb-1 text-sm font-semibold text-slate-200">Chords with this interval</h2>
          {both ? (
            <>
              <p className="mb-2 text-xs text-slate-500">
                Triads &amp; tetrads that contain both{" "}
                <span style={{ color: aColor }}>{SHARP_NAMES[a!]}</span> and{" "}
                <span style={{ color: bColor }}>{SHARP_NAMES[b!]}</span>. Click one to hear it.
              </p>
              {(["Triads", "Tetrads"] as const).map((group) => (
                <div key={group} className="mb-2 last:mb-0">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group}</div>
                  {chordMatches[group].length === 0 ? (
                    <span className="text-xs text-slate-600">None</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {chordMatches[group].map((c) => (
                        <button
                          key={c.name}
                          onClick={() => {
                            resumeAudio();
                            playChord(c.chromas, { durationMs: 900 });
                          }}
                          onMouseEnter={() => setHoverChord(c.chromas)}
                          onMouseLeave={() => setHoverChord(null)}
                          title={c.chromas.map((n) => SHARP_NAMES[n]).join(" ")}
                          className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-slate-500">Pick two notes to see the chords they belong to.</p>
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
