import { useEffect, useMemo, useRef, useState } from "react";
import { useComposition } from "../../store/composition";
import { getScale } from "../../theory/scales";
import {
  borrowedSuggestions,
  diatonicSuggestions,
  secondaryDominantSuggestions,
  type ChordSuggestion,
  type PlacedChord,
} from "../../theory/progression";
import { playChord, resumeAudio } from "../../theory/audio";
import { FUNCTION_COLORS } from "../palette";
import ChordBuilder from "./ChordBuilder";

export default function ChordSoloBuilder() {
  const {
    tonic,
    scaleType,
    builderChords,
    builderSelected,
    addBuilderChord,
    replaceBuilderChordAt,
    setBuilderChordBeats,
    removeBuilderChordAt,
    clearBuilder,
    setBuilderSelected,
  } = useComposition();

  const [bpm, setBpm] = useState(180);
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(-1);
  const [loop, setLoop] = useState(true);
  const timer = useRef<number | null>(null);

  const scale = useMemo(() => getScale(tonic, scaleType), [tonic, scaleType]);
  const groups = useMemo(
    () => ({
      diatonic: diatonicSuggestions(scale),
      secondary: secondaryDominantSuggestions(scale),
      borrowed: borrowedSuggestions(tonic, scaleType),
    }),
    [scale, tonic, scaleType]
  );

  const selected: PlacedChord | null =
    builderSelected != null ? builderChords[builderSelected] ?? null : null;

  const audition = (chromas: number[]) => {
    resumeAudio();
    playChord(chromas, { durationMs: 750 });
  };

  const handleAdd = (c: ChordSuggestion) => {
    audition(c.chromas);
    addBuilderChord(c);
  };

  const select = (i: number | null) => {
    setBuilderSelected(i);
    if (i != null && builderChords[i]) audition(builderChords[i].chromas);
  };

  // Play header — steps through the built chords on the piano.
  useEffect(() => {
    if (!playing || builderChords.length === 0) return;
    let cancelled = false;
    let i = 0;
    const beatMs = 60000 / bpm;
    const sound = (idx: number) => {
      const c = builderChords[idx];
      if (c) playChord(c.chromas, { durationMs: c.beats * beatMs * 0.95 });
    };
    setPlayIndex(0);
    resumeAudio();
    sound(0);
    const tick = () => {
      const ms = (builderChords[i]?.beats ?? 4) * beatMs;
      timer.current = window.setTimeout(() => {
        if (cancelled) return;
        const next = i + 1;
        if (next >= builderChords.length) {
          if (loop) {
            i = 0;
            setPlayIndex(0);
            sound(0);
            tick();
          } else {
            setPlaying(false);
            setPlayIndex(-1);
          }
        } else {
          i = next;
          setPlayIndex(next);
          sound(next);
          tick();
        }
      }, ms);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [playing, bpm, loop, builderChords]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
        <button
          onClick={() => {
            if (!playing) resumeAudio();
            setPlaying((p) => !p);
          }}
          disabled={builderChords.length === 0}
          className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
        >
          {playing ? "⏸ Stop" : "▶ Play"}
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="range" min={50} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="accent-sky-500" />
          <span className="w-14 font-mono text-slate-100">{bpm} BPM</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} className="accent-sky-500" />
          Loop
        </label>
      </div>

      <BuilderTimeline
        chords={builderChords}
        selected={builderSelected}
        playIndex={playing ? playIndex : null}
        onSelect={select}
        onRemove={removeBuilderChordAt}
        onClear={clearBuilder}
      />

      {/* Add chords */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(["diatonic", "secondary", "borrowed"] as const).map((cat) => (
          <div key={cat} className="rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
            <h3 className="mb-2 text-sm font-semibold capitalize text-slate-200">{cat}</h3>
            <div className="flex flex-wrap gap-1.5">
              {groups[cat].length === 0 && <span className="text-xs text-slate-600">Needs a 7-note scale.</span>}
              {groups[cat].map((c, i) => (
                <ChordChip key={`${cat}-${c.name}-${i}`} chord={c} onAdd={() => handleAdd(c)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* One note-by-note builder, editing the selected chord (or building a new one) */}
      <ChordBuilder
        tonic={tonic}
        chord={selected}
        onReplace={(c) => builderSelected != null && replaceBuilderChordAt(builderSelected, c)}
        onAdd={handleAdd}
        onBeats={(beats) => builderSelected != null && setBuilderChordBeats(builderSelected, beats)}
        onNew={() => setBuilderSelected(null)}
      />
    </div>
  );
}

function ChordChip({ chord, onAdd }: { chord: ChordSuggestion; onAdd: () => void }) {
  const color = FUNCTION_COLORS[chord.fn];
  return (
    <button
      onClick={onAdd}
      title={chord.explanation}
      className="rounded px-2 py-1 text-xs font-medium ring-1 transition hover:brightness-125"
      style={{ backgroundColor: color + "22", color, borderColor: color }}
    >
      <span className="font-semibold">{chord.name}</span> <span className="opacity-70">{chord.label}</span>
    </button>
  );
}

function BuilderTimeline({
  chords,
  selected,
  playIndex,
  onSelect,
  onRemove,
  onClear,
}: {
  chords: PlacedChord[];
  selected: number | null;
  playIndex: number | null;
  onSelect: (i: number | null) => void;
  onRemove: (i: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Your chords</h2>
        {chords.length > 0 && (
          <button onClick={onClear} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700">
            Clear
          </button>
        )}
      </div>
      {chords.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Add chords from the suggestions below, or build a custom one note-by-note.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {chords.map((c, i) => {
            const color = FUNCTION_COLORS[c.fn];
            const isPlaying = playIndex === i;
            return (
              <button
                key={c.uid}
                onClick={() => onSelect(i)}
                className="group relative w-24 rounded-lg p-2 text-left ring-1 transition hover:brightness-110"
                style={{
                  backgroundColor: color + (isPlaying ? "40" : "1f"),
                  borderColor: color,
                  boxShadow:
                    selected === i || isPlaying ? `0 0 0 2px ${isPlaying ? "#fff" : color}` : undefined,
                }}
              >
                <div className="text-[11px] font-mono" style={{ color }}>
                  {c.label}
                </div>
                <div className="text-base font-bold text-white">{c.name}</div>
                <div className="truncate text-[10px] text-slate-400">{c.notes.join(" ")}</div>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(i);
                  }}
                  className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-slate-700 text-xs text-slate-200 group-hover:flex hover:bg-red-600"
                >
                  ×
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
