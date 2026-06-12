import { useEffect, useMemo, useRef, useState } from "react";
import { useComposition } from "../../store/composition";
import { getScale } from "../../theory/scales";
import {
  PRESETS,
  borrowedSuggestions,
  diatonicSuggestions,
  modulationSuggestions,
  nextChordHints,
  presetChords,
  secondaryDominantSuggestions,
  type ChordCategory,
  type ChordSuggestion,
  type PlacedChord,
} from "../../theory/progression";
import { exportText, importText, shareLink } from "../../composition/io";
import { playChord, playMidi, resumeAudio } from "../../theory/audio";
import { FUNCTION_COLORS } from "../palette";
import ChordBuilder from "./ChordBuilder";
import MelodyLayer from "./MelodyLayer";

const CATEGORY_META: { id: ChordCategory; title: string; hint: string }[] = [
  { id: "diatonic", title: "Diatonic", hint: "In-key chords, colored by function." },
  { id: "secondary", title: "Secondary dominants", hint: "Chromatic chords that pull into a non-tonic chord." },
  { id: "borrowed", title: "Borrowed / chromatic", hint: "Modal interchange from the parallel key." },
  { id: "modulation", title: "Modulate", hint: "Jump to a related key and keep composing there." },
];

export default function ChordSoloBuilder() {
  const {
    tonic,
    scaleType,
    builderChords,
    builderMelody,
    builderSelected,
    addBuilderChord,
    replaceBuilderChordAt,
    setBuilderChordBeats,
    removeBuilderChordAt,
    clearBuilder,
    setBuilderSelected,
    loadBuilder,
    setKey,
  } = useComposition();

  const [bpm, setBpm] = useState(180);
  const [playing, setPlaying] = useState(false);
  const [playCol, setPlayCol] = useState(-1);
  const [loop, setLoop] = useState(true);
  const [muteMelody, setMuteMelody] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [draft, setDraft] = useState<ChordSuggestion | null>(null);
  const timer = useRef<number | null>(null);
  const builderRef = useRef<HTMLDivElement>(null);

  const startNew = () => {
    setBuilderSelected(null);
    builderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  };

  const handleExport = () => {
    navigator.clipboard?.writeText(exportText(tonic, scaleType, builderChords));
    flash("Chart copied");
  };
  const handleShare = () => {
    navigator.clipboard?.writeText(shareLink(tonic, scaleType, builderChords));
    flash("Share link copied");
  };
  const handleImport = () => {
    const text = window.prompt("Paste an exported chord chart:");
    if (!text) return;
    const decoded = importText(text);
    if (!decoded) {
      flash("Couldn't read that chart");
      return;
    }
    if (decoded.tonic && decoded.type) setKey(decoded.tonic, decoded.type);
    loadBuilder(decoded.chords);
    flash("Imported");
  };

  // Beat columns across the chords — one per beat (used for both chord + melody playback).
  const cols = useMemo(() => {
    const out: { chord: PlacedChord; chordIndex: number; isChordStart: boolean }[] = [];
    builderChords.forEach((chord, chordIndex) => {
      for (let b = 0; b < chord.beats; b++) out.push({ chord, chordIndex, isChordStart: b === 0 });
    });
    return out;
  }, [builderChords]);

  const playIndex = playing && playCol >= 0 ? cols[playCol]?.chordIndex ?? null : null;

  const scale = useMemo(() => getScale(tonic, scaleType), [tonic, scaleType]);
  const groups = useMemo(
    () => ({
      diatonic: diatonicSuggestions(scale),
      secondary: secondaryDominantSuggestions(scale),
      borrowed: borrowedSuggestions(tonic, scaleType),
      modulation: modulationSuggestions(tonic, scaleType),
    }),
    [scale, tonic, scaleType]
  );

  const selected: PlacedChord | null =
    builderSelected != null ? builderChords[builderSelected] ?? null : null;

  // Same "what could come next" tip the Composition Canvas shows.
  const last = builderChords.length ? builderChords[builderChords.length - 1] : null;
  const hint = useMemo(() => nextChordHints(tonic, last), [tonic, last]);

  const audition = (chromas: number[]) => {
    resumeAudio();
    playChord(chromas, { durationMs: 750 });
  };

  const handleAdd = (c: ChordSuggestion) => {
    if (c.modulateTo) setKey(c.modulateTo.tonic, c.modulateTo.type);
    audition(c.chromas);
    addBuilderChord(c);
  };

  const select = (i: number | null) => {
    setBuilderSelected(i);
    if (i != null && builderChords[i]) audition(builderChords[i].chromas);
  };

  // Play header — steps beat-by-beat, sounding each chord on its first beat and
  // any melody note placed on that beat (unless the melody is muted).
  useEffect(() => {
    if (!playing || cols.length === 0) return;
    let cancelled = false;
    let i = 0;
    const beatMs = 60000 / bpm;
    const step = (col: number) => {
      resumeAudio();
      if (cols[col].isChordStart) {
        playChord(cols[col].chord.chromas, { durationMs: cols[col].chord.beats * beatMs * 0.95 });
      }
      if (!muteMelody) {
        const m = builderMelody[col];
        if (m != null) playMidi(m, { durationMs: beatMs * 0.9 });
      }
    };
    setPlayCol(0);
    step(0);
    const tick = () => {
      timer.current = window.setTimeout(() => {
        if (cancelled) return;
        const next = i + 1;
        if (next >= cols.length) {
          if (loop) {
            i = 0;
            setPlayCol(0);
            step(0);
            tick();
          } else {
            setPlaying(false);
            setPlayCol(-1);
          }
        } else {
          i = next;
          setPlayCol(next);
          step(next);
          tick();
        }
      }, beatMs);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [playing, bpm, loop, cols, builderMelody, muteMelody]);

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

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            onChange={(e) => {
              const preset = PRESETS.find((p) => p.name === e.target.value);
              if (preset) presetChords(preset, tonic).forEach(handleAdd);
              e.target.value = "";
            }}
            defaultValue=""
            className="rounded bg-slate-800 px-2 py-1.5 text-xs text-slate-200 ring-1 ring-slate-700"
          >
            <option value="" disabled>
              + Insert preset…
            </option>
            {PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <button onClick={handleExport} className="rounded bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
            Export
          </button>
          <button onClick={handleImport} className="rounded bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
            Import
          </button>
          <button onClick={handleShare} className="rounded bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
            Share link
          </button>
          {toast && <span className="text-xs text-emerald-400">{toast}</span>}
        </div>
      </div>

      {hint && !playing && (
        <div className="rounded-lg bg-sky-950/40 px-4 py-2.5 text-sm text-sky-200 ring-1 ring-sky-900">
          💡 {hint.reason}
        </div>
      )}

      <BuilderTimeline
        chords={builderChords}
        selected={builderSelected}
        playIndex={playing ? playIndex : null}
        onSelect={select}
        onRemove={removeBuilderChordAt}
        onClear={clearBuilder}
        onNew={startNew}
        draft={builderSelected == null ? draft : null}
      />

      {/* Melody over the built chords — driven by the shared Play button above. */}
      <MelodyLayer
        source="builder"
        bare
        controlled
        collapsible
        playCol={playing ? playCol : -1}
        muteMelody={muteMelody}
        onToggleMute={() => setMuteMelody((m) => !m)}
      />

      {/* Add chords */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {CATEGORY_META.map((cat) => (
          <div key={cat.id} className="rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
            <h3 className="text-sm font-semibold text-slate-200">{cat.title}</h3>
            <p className="mb-2 text-[11px] text-slate-500">{cat.hint}</p>
            <div className="flex flex-wrap gap-1.5">
              {groups[cat.id].length === 0 && (
                <span className="text-xs text-slate-600">Needs a 7-note scale.</span>
              )}
              {groups[cat.id].map((c, i) => (
                <ChordChip
                  key={`${cat.id}-${c.name}-${i}`}
                  chord={c}
                  recommended={hint?.recommended.has(c.chromas[0]) ?? false}
                  onAdd={() => handleAdd(c)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* One note-by-note builder, editing the selected chord (or building a new one) */}
      <div ref={builderRef}>
        <ChordBuilder
          tonic={tonic}
          chord={selected}
          onReplace={(c) => builderSelected != null && replaceBuilderChordAt(builderSelected, c)}
          onAdd={handleAdd}
          onBeats={(beats) => builderSelected != null && setBuilderChordBeats(builderSelected, beats)}
          onNew={startNew}
          onDraftChange={setDraft}
        />
      </div>
    </div>
  );
}

function ChordChip({
  chord,
  recommended,
  onAdd,
}: {
  chord: ChordSuggestion;
  recommended: boolean;
  onAdd: () => void;
}) {
  const color = FUNCTION_COLORS[chord.fn];
  return (
    <button
      onClick={onAdd}
      title={chord.explanation}
      className="rounded px-2 py-1 text-xs font-medium ring-1 transition hover:brightness-125"
      style={{
        backgroundColor: color + "22",
        color,
        borderColor: color,
        boxShadow: recommended ? `0 0 0 2px ${color}` : undefined,
      }}
    >
      {recommended && "★ "}
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
  onNew,
  draft,
}: {
  chords: PlacedChord[];
  selected: number | null;
  playIndex: number | null;
  onSelect: (i: number | null) => void;
  onRemove: (i: number) => void;
  onClear: () => void;
  onNew: () => void;
  draft: ChordSuggestion | null;
}) {
  const draftColor = draft ? FUNCTION_COLORS[draft.fn] : null;
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
      <div className="flex flex-wrap items-stretch gap-2">
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
        {draft && draftColor ? (
          <button
            onClick={onNew}
            title="Building a new chord — click to jump to the builder"
            className="relative w-24 rounded-lg border-2 border-dashed p-2 text-left transition hover:brightness-110"
            style={{ borderColor: draftColor, backgroundColor: draftColor + "1f" }}
          >
            <div className="text-[11px] font-mono" style={{ color: draftColor }}>
              {draft.label}
            </div>
            <div className="text-base font-bold text-white">{draft.name}</div>
            <div className="truncate text-[10px] text-slate-400">{draft.notes.join(" ")}</div>
            <span className="absolute -right-1.5 -top-1.5 flex h-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-[10px] font-semibold text-white">
              new
            </span>
          </button>
        ) : (
          <button
            onClick={onNew}
            title="Build a new chord"
            className="flex w-24 min-h-[72px] items-center justify-center rounded-lg border-2 border-dashed border-slate-700 text-3xl font-light text-slate-500 transition hover:border-sky-500 hover:text-sky-400"
          >
            +
          </button>
        )}
      </div>
      {chords.length === 0 && (
        <p className="mt-2 text-xs text-slate-500">
          Click <span className="text-slate-300">+</span> to build a custom chord, or pick from the suggestions below.
        </p>
      )}
    </div>
  );
}
