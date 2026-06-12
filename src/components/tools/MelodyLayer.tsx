import { useEffect, useMemo, useRef, useState } from "react";
import { useComposition } from "../../store/composition";
import { chromaOf, getScale } from "../../theory/scales";
import { functionColor } from "../palette";
import { playChord, playMidi, resumeAudio } from "../../theory/audio";
import type { PlacedChord } from "../../theory/progression";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const pc = (c: number) => ((c % 12) + 12) % 12;
const midiName = (m: number) => `${SHARP_NAMES[pc(m)]}${Math.floor(m / 12) - 1}`;

interface Col {
  chord: PlacedChord;
  chordIndex: number;
  isChordStart: boolean;
}

interface MelodyLayerProps {
  /** Which chord workspace to write the melody over. */
  source?: "canvas" | "builder";
  /** Drop the trailing explanatory caption (used under "Your chords" in the Builder). */
  bare?: boolean;
  /** Playback is driven by an external transport (no own Play/BPM controls). */
  controlled?: boolean;
  /** Wrap in a collapsible "Melody" section, collapsed by default. */
  collapsible?: boolean;
  /** The currently-playing beat column when controlled (-1 = stopped). */
  playCol?: number;
  /** Whether the melody is muted in the external transport. */
  muteMelody?: boolean;
  /** Toggle the external mute. */
  onToggleMute?: () => void;
}

export default function MelodyLayer({
  source = "canvas",
  bare = false,
  controlled = false,
  collapsible = false,
  playCol: externalPlayCol = -1,
  muteMelody = false,
  onToggleMute,
}: MelodyLayerProps) {
  const store = useComposition();
  const { tonic, scaleType } = store;
  const isBuilder = source === "builder";
  const progression = isBuilder ? store.builderChords : store.progression;
  const melody = isBuilder ? store.builderMelody : store.melody;
  const setMelodyNote = isBuilder ? store.setBuilderMelodyNote : store.setMelodyNote;
  const clearMelody = isBuilder ? store.clearBuilderMelody : store.clearMelody;
  const [bpm, setBpm] = useState(180);
  const [playing, setPlaying] = useState(false);
  const [ownPlayCol, setPlayCol] = useState(-1);
  const [open, setOpen] = useState(!collapsible);
  const playCol = controlled ? externalPlayCol : ownPlayCol;
  const timer = useRef<number | null>(null);

  const scale = useMemo(() => getScale(tonic, scaleType), [tonic, scaleType]);
  const tonicChroma = chromaOf(tonic);

  // Rows: one octave of the scale, high notes on top.
  const rowMidis = useMemo(() => {
    const tonicMidi = 60 + pc(tonicChroma);
    const out: number[] = [];
    for (const n of scale.notes) out.push(tonicMidi + n.semitone);
    out.push(tonicMidi + 12);
    return out.reverse(); // high to low
  }, [scale, tonicChroma]);

  // Columns: one per beat across the progression.
  const cols = useMemo<Col[]>(() => {
    const out: Col[] = [];
    progression.forEach((chord, chordIndex) => {
      for (let b = 0; b < chord.beats; b++) out.push({ chord, chordIndex, isChordStart: b === 0 });
    });
    return out;
  }, [progression]);

  useEffect(() => {
    if (controlled || !playing || cols.length === 0) return;
    let cancelled = false;
    let i = 0;
    const beatMs = 60000 / bpm;
    const step = (col: number) => {
      resumeAudio();
      if (cols[col].isChordStart) playChord(cols[col].chord.chromas, { durationMs: beatMs * cols[col].chord.beats * 0.95 });
      const m = melody[col];
      if (m != null) playMidi(m, { durationMs: beatMs * 0.9 });
    };
    setPlayCol(0);
    step(0);
    const tick = () => {
      timer.current = window.setTimeout(() => {
        if (cancelled) return;
        i = (i + 1) % cols.length;
        setPlayCol(i);
        step(i);
        tick();
      }, beatMs);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [playing, bpm, cols, melody]);

  const empty = progression.length === 0;

  const muteBtn = controlled && (
    <button
      onClick={onToggleMute}
      className={
        "rounded px-3 py-1.5 text-xs font-medium ring-1 transition " +
        (muteMelody
          ? "bg-slate-800 text-slate-400 ring-slate-700 hover:bg-slate-700"
          : "bg-amber-500/20 text-amber-300 ring-amber-500/60 hover:bg-amber-500/30")
      }
    >
      {muteMelody ? "🔇 Melody muted" : "🔊 Melody on"}
    </button>
  );
  const clearBtn = (
    <button onClick={clearMelody} className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700">
      Clear melody
    </button>
  );

  const emptyMsg = (
    <p className="py-6 text-center text-sm text-slate-500">
      {isBuilder ? (
        <>Add chords above first — then write a melody over them here.</>
      ) : (
        <>
          Build a progression on the <span className="text-slate-300">Composition Canvas</span> first — then
          write a melody over it here.
        </>
      )}
    </p>
  );

  const gridMarkup = (
    <div className="overflow-x-auto">
      {/* chord header row */}
      <div className="flex">
        <div className="w-12 shrink-0" />
        {cols.map((col, i) => (
          <div
            key={`h-${i}`}
            className="w-7 shrink-0 text-center text-[10px]"
            style={{
              color: col.isChordStart ? "#cbd5e1" : "#475569",
              borderLeft: col.isChordStart ? "1px solid #334155" : undefined,
            }}
          >
            {col.isChordStart ? col.chord.name : "·"}
          </div>
        ))}
      </div>

      {/* grid */}
      {rowMidis.map((m) => (
        <div key={m} className="flex items-center">
          <div className="w-12 shrink-0 pr-1 text-right text-[10px] text-slate-500">{midiName(m)}</div>
          {cols.map((col, i) => {
            const isChordTone = col.chord.chromas.map(pc).includes(pc(m));
            const isOn = melody[i] === m;
            const isPlay = playCol === i;
            let bg = "#0f172a";
            if (isOn) bg = "#fbbf24";
            else if (isChordTone) bg = functionColor(pc(m - tonicChroma)) + "33";
            return (
              <button
                key={`${m}-${i}`}
                onClick={() => {
                  setMelodyNote(i, isOn ? null : m);
                  if (!isOn) {
                    resumeAudio();
                    playMidi(m);
                  }
                }}
                className="h-6 w-7 shrink-0"
                style={{
                  backgroundColor: bg,
                  borderLeft: col.isChordStart ? "1px solid #334155" : "1px solid #1e293b",
                  borderTop: "1px solid #1e293b",
                  outline: isPlay ? "2px solid #38bdf8" : undefined,
                  outlineOffset: "-2px",
                }}
                title={midiName(m)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );

  const caption = !bare && (
    <p className="text-xs text-slate-500">
      Rows are one octave of <span className="text-slate-300">{scale.label}</span>; columns are beats.
      Tinted cells are chord tones of the chord above (strong landing notes). Click to place one note
      per beat; press play to hear the melody with the chords.
    </p>
  );

  // Collapsible: one box with the "Melody" title inside; collapsing keeps the box + title.
  if (collapsible) {
    return (
      <div className="space-y-3 rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 hover:text-white"
            aria-expanded={open}
          >
            <span className="text-xs text-slate-500">{open ? "▾" : "▸"}</span>
            Melody
          </button>
          {open && !empty && (
            <div className="flex items-center gap-2">
              {muteBtn}
              {clearBtn}
            </div>
          )}
        </div>
        {open && (empty ? emptyMsg : <>{gridMarkup}{caption}</>)}
      </div>
    );
  }

  // Canvas: own play header + grid box.
  if (empty) {
    return <div className="rounded-lg bg-slate-900/60 ring-1 ring-slate-800">{emptyMsg}</div>;
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          {playing ? "⏸ Stop" : "▶ Play"}
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="range" min={50} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="accent-sky-500" />
          <span className="w-14 font-mono text-slate-100">{bpm} BPM</span>
        </label>
        <span className="ml-auto">{clearBtn}</span>
      </div>
      <div className="rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">{gridMarkup}</div>
      {caption}
    </div>
  );
}
