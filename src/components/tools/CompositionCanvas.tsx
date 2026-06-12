import { useEffect, useMemo, useRef, useState } from "react";
import { useComposition } from "../../store/composition";
import { getScale } from "../../theory/scales";
import {
  PRESETS,
  analyzeProgression,
  borrowedSuggestions,
  diatonicSuggestions,
  modulationSuggestions,
  nextChordHints,
  presetChords,
  scaleSuggestionsForChords,
  secondaryDominantSuggestions,
  type ChordCategory,
  type ChordScale,
  type ChordSuggestion,
  type PlacedChord,
  type ScaleFit,
} from "../../theory/progression";
import {
  decodeFromHash,
  deleteSaved,
  exportText,
  listSaved,
  saveProgression,
  shareLink,
  type SavedProgression,
} from "../../composition/io";
import Instruments from "../Instruments";
import Legend from "../Legend";
import { FUNCTION_COLORS, chordHighlights, scaleHighlights } from "../palette";
import ChordEditPanel from "./ChordEditPanel";
import { playChord, playNote, playScale, resumeAudio } from "../../theory/audio";

const CATEGORY_META: { id: ChordCategory; title: string; hint: string }[] = [
  { id: "diatonic", title: "Diatonic", hint: "In-key chords, colored by function." },
  { id: "secondary", title: "Secondary dominants", hint: "Chromatic chords that pull into a non-tonic chord." },
  { id: "borrowed", title: "Borrowed / chromatic", hint: "Modal interchange from the parallel key." },
  { id: "modulation", title: "Modulate", hint: "Jump to a related key and keep composing there." },
];

export default function CompositionCanvas() {
  const {
    tonic,
    scaleType,
    progression,
    selectedCardIndex,
    addChord,
    removeChordAt,
    clearProgression,
    setSelectedCardIndex,
    replaceChordAt,
    moveChord,
    setChordBeats,
    loadProgression,
    setKey,
  } = useComposition();

  const [bpm, setBpm] = useState(180);
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [loop, setLoop] = useState(true);
  const [muted, setMuted] = useState(false);
  const [activeScale, setActiveScale] = useState<ChordScale | null>(null);
  const [saved, setSaved] = useState<SavedProgression[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

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

  const last = progression.length ? progression[progression.length - 1] : null;
  const hint = useMemo(() => nextChordHints(tonic, last), [tonic, last]);
  const analysis = useMemo(() => analyzeProgression(tonic, progression), [tonic, progression]);

  // Scales that contain every note you've used — what you can solo/write over.
  const scaleFits = useMemo(() => {
    const used = progression.length
      ? progression.flatMap((c) => c.chromas)
      : scale.notes.map((n) => n.chroma);
    return scaleSuggestionsForChords(used, tonic, scaleType);
  }, [progression, scale, tonic, scaleType]);

  // Load a shared progression from the URL hash once on mount.
  useEffect(() => {
    const decoded = decodeFromHash(window.location.hash);
    if (decoded && decoded.chords.length) {
      if (decoded.tonic && decoded.type) setKey(decoded.tonic, decoded.type);
      loadProgression(decoded.chords);
    }
    setSaved(listSaved());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset the solo-scale view whenever the selected card changes.
  useEffect(() => setActiveScale(null), [selectedCardIndex]);

  // Playhead — steps through the progression in time, sounding each chord on the piano.
  useEffect(() => {
    if (!playing || progression.length === 0) return;
    let cancelled = false;
    let i = 0;
    const beatMs = 60000 / bpm;
    const sound = (idx: number) => {
      const chord = progression[idx];
      if (chord && !mutedRef.current)
        playChord(chord.chromas, { durationMs: chord.beats * beatMs * 0.95 });
    };
    setPlayIndex(0);
    sound(0);
    const tick = () => {
      const ms = (progression[i]?.beats ?? 4) * beatMs;
      timeoutRef.current = window.setTimeout(() => {
        if (cancelled) return;
        const next = i + 1;
        if (next >= progression.length) {
          if (loop) {
            i = 0;
            setPlayIndex(0);
            sound(0);
            tick();
          } else {
            setPlaying(false);
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
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [playing, bpm, loop, progression]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  };

  /** Audition a chord on the piano (also kick-starts audio on first gesture). */
  const audition = (chromas: number[]) => {
    if (muted) return;
    resumeAudio();
    playChord(chromas, { durationMs: 750 });
  };

  const handleAdd = (c: ChordSuggestion) => {
    if (c.modulateTo) setKey(c.modulateTo.tonic, c.modulateTo.type);
    audition(c.chromas);
    addChord(c);
  };

  const handleSelect = (i: number | null) => {
    setSelectedCardIndex(i);
    if (i != null && progression[i]) audition(progression[i].chromas);
  };

  /** Preview a fitting scale on the instruments and play it as a run. */
  const previewScale = (fit: ScaleFit) => {
    setActiveScale({ tonic: fit.tonic, type: fit.type, reason: `Fits ${fit.covered}/${fit.total} of your notes.` });
    if (!muted) {
      resumeAudio();
      playScale(getScale(fit.tonic, fit.type).notes.map((n) => n.chroma));
    }
  };

  const shownIndex = playing
    ? playIndex
    : selectedCardIndex != null
      ? selectedCardIndex
      : progression.length - 1;
  const shownCard: PlacedChord | null = progression[shownIndex] ?? null;

  const highlights = useMemo(() => {
    if (activeScale) return scaleHighlights(getScale(activeScale.tonic, activeScale.type), "tonal");
    return chordHighlights(shownCard);
  }, [activeScale, shownCard]);

  return (
    <div className="space-y-5">
      <Transport
        bpm={bpm}
        setBpm={setBpm}
        playing={playing}
        setPlaying={(b) => {
          if (b) resumeAudio();
          setPlaying(b);
        }}
        loop={loop}
        setLoop={setLoop}
        muted={muted}
        setMuted={setMuted}
        canPlay={progression.length > 0}
        onPreset={(name) => {
          const preset = PRESETS.find((p) => p.name === name);
          if (preset) presetChords(preset, tonic).forEach(handleAdd);
        }}
        onExport={() => {
          navigator.clipboard?.writeText(exportText(tonic, scaleType, progression));
          flash("Chart copied");
        }}
        onShare={() => {
          navigator.clipboard?.writeText(shareLink(tonic, scaleType, progression));
          flash("Share link copied");
        }}
        onSave={() => {
          const name = window.prompt("Save progression as:");
          if (name) {
            setSaved(saveProgression(name, tonic, scaleType, progression));
            flash("Saved");
          }
        }}
        toast={toast}
      />

      {saved.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>Saved:</span>
          {saved.map((s) => (
            <span key={s.name} className="inline-flex items-center overflow-hidden rounded ring-1 ring-slate-700">
              <button
                onClick={() => {
                  setKey(s.tonic, s.type);
                  loadProgression(s.chords);
                }}
                className="bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
              >
                {s.name}
              </button>
              <button
                onClick={() => setSaved(deleteSaved(s.name))}
                className="bg-slate-800 px-1.5 py-1 text-slate-500 hover:bg-red-700 hover:text-white"
                title="Delete"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <Timeline
        progression={progression}
        selectedIndex={selectedCardIndex}
        playIndex={playing ? playIndex : null}
        onSelect={handleSelect}
        onRemove={removeChordAt}
        onClear={clearProgression}
        onMove={moveChord}
      />

      {hint && !playing && (
        <div className="rounded-lg bg-sky-950/40 px-4 py-2.5 text-sm text-sky-200 ring-1 ring-sky-900">
          💡 {hint.reason}
        </div>
      )}

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

      {shownCard && selectedCardIndex != null && !playing && (
        <ChordEditPanel
          chord={shownCard}
          index={selectedCardIndex}
          tonic={tonic}
          activeScale={activeScale}
          onReplace={replaceChordAt}
          onBeats={setChordBeats}
          onPickScale={setActiveScale}
        />
      )}

      {scaleFits.length > 0 && (
        <div className="rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
          <h3 className="text-sm font-semibold text-slate-200">
            Scales that fit {progression.length ? "your progression" : "this key"}
          </h3>
          <p className="mb-2 text-[11px] text-slate-500">
            Solo or write a melody over these. Click to preview &amp; hear it; “Set key” makes it the
            project key everywhere.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {scaleFits.map((f) => {
              const active = activeScale?.tonic === f.tonic && activeScale?.type === f.type;
              return (
                <span
                  key={`${f.tonic}-${f.type}`}
                  className="inline-flex items-center overflow-hidden rounded ring-1"
                  style={{ borderColor: active ? "#a78bfa" : "#334155", boxShadow: active ? "0 0 0 1px #a78bfa" : undefined }}
                >
                  <button
                    onClick={() => previewScale(f)}
                    title={`Contains ${f.covered} of ${f.total} notes used`}
                    className="bg-slate-800 px-2 py-1 text-xs text-violet-200 hover:bg-slate-700"
                  >
                    ▶ {f.label}{" "}
                    <span className={f.perfect ? "text-emerald-400" : "text-amber-400"}>
                      {f.covered}/{f.total}
                    </span>
                  </button>
                  <button
                    onClick={() => setKey(f.tonic, f.type)}
                    title="Use as the project key"
                    className="bg-slate-800 px-1.5 py-1 text-[10px] text-slate-400 hover:bg-sky-700 hover:text-white"
                  >
                    Set key
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {(shownCard || activeScale) && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">
            {activeScale
              ? `Solo scale: ${activeScale.tonic} ${activeScale.type}`
              : `${shownCard!.label} · ${shownCard!.name}`}{" "}
            <span className="text-slate-500">
              ({(activeScale ? getScale(activeScale.tonic, activeScale.type).notes.map((n) => n.name) : (shownCard?.notes ?? [])).join(" ")})
            </span>
          </h3>
          <Instruments
            highlights={highlights}
            collapsible
            onPick={(chroma) => {
              if (muted) return;
              resumeAudio();
              playNote(chroma);
            }}
            pickHint="Click a note to hear it"
          />
          <Legend
            title="Function"
            items={[
              { color: FUNCTION_COLORS.Tonic, label: "Tonic", ring: true },
              { color: FUNCTION_COLORS.Subdominant, label: "Subdominant" },
              { color: FUNCTION_COLORS.Dominant, label: "Dominant" },
            ]}
          />
        </div>
      )}

      {progression.length > 0 && (
        <div className="rounded-lg bg-slate-900/60 p-4 text-sm ring-1 ring-slate-800">
          <span className="font-semibold text-slate-200">Analysis: </span>
          <span className="font-mono text-slate-300">{analysis.romans.join(" – ")}</span>
          {analysis.cadence && (
            <span className="ml-2 rounded bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-300">
              {analysis.cadence}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Transport(props: {
  bpm: number;
  setBpm: (n: number) => void;
  playing: boolean;
  setPlaying: (b: boolean) => void;
  loop: boolean;
  setLoop: (b: boolean) => void;
  muted: boolean;
  setMuted: (b: boolean) => void;
  canPlay: boolean;
  onPreset: (name: string) => void;
  onExport: () => void;
  onShare: () => void;
  onSave: () => void;
  toast: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-900/60 p-3 ring-1 ring-slate-800">
      <button
        onClick={() => props.setPlaying(!props.playing)}
        disabled={!props.canPlay}
        className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
      >
        {props.playing ? "⏸ Stop" : "▶ Play"}
      </button>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="range" min={50} max={200} value={props.bpm} onChange={(e) => props.setBpm(Number(e.target.value))} className="accent-sky-500" />
        <span className="w-14 font-mono text-slate-100">{props.bpm} BPM</span>
      </label>
      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        <input type="checkbox" checked={props.loop} onChange={(e) => props.setLoop(e.target.checked)} className="accent-sky-500" />
        Loop
      </label>
      <button
        onClick={() => props.setMuted(!props.muted)}
        className="rounded bg-slate-800 px-2 py-1.5 text-sm hover:bg-slate-700"
        title={props.muted ? "Unmute piano" : "Mute piano"}
      >
        {props.muted ? "🔇" : "🔊"}
      </button>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <select
          onChange={(e) => {
            if (e.target.value) props.onPreset(e.target.value);
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
        <button onClick={props.onSave} className="rounded bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
          Save
        </button>
        <button onClick={props.onExport} className="rounded bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
          Export
        </button>
        <button onClick={props.onShare} className="rounded bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
          Share link
        </button>
        {props.toast && <span className="text-xs text-emerald-400">{props.toast}</span>}
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

function Timeline({
  progression,
  selectedIndex,
  playIndex,
  onSelect,
  onRemove,
  onClear,
  onMove,
}: {
  progression: PlacedChord[];
  selectedIndex: number | null;
  playIndex: number | null;
  onSelect: (i: number | null) => void;
  onRemove: (i: number) => void;
  onClear: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const dragFrom = useRef<number | null>(null);

  return (
    <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">
          Your progression <span className="text-slate-500">· 4/4 · drag to reorder</span>
        </h2>
        {progression.length > 0 && (
          <button onClick={onClear} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700">
            Clear
          </button>
        )}
      </div>

      {progression.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Click chords below or insert a preset to build a progression. Try{" "}
          <span className="text-slate-300">I → IV → V → I</span>, then reharmonize.
        </p>
      ) : (
        <div className="flex flex-wrap items-stretch gap-2">
          {progression.map((c, i) => {
            const color = FUNCTION_COLORS[c.fn];
            const resolves =
              c.resolvesTo != null &&
              progression[i + 1] != null &&
              progression[i + 1].chromas[0] === c.resolvesTo;
            const isPlaying = playIndex === i;
            return (
              <div key={c.uid} className="flex items-stretch gap-2">
                <button
                  draggable
                  onDragStart={() => (dragFrom.current = i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragFrom.current != null) onMove(dragFrom.current, i);
                    dragFrom.current = null;
                  }}
                  onClick={() => onSelect(i)}
                  className="group relative rounded-lg p-2 text-left ring-1 transition hover:brightness-110"
                  style={{
                    width: Math.max(76, c.beats * 24),
                    backgroundColor: color + (isPlaying ? "40" : "1f"),
                    borderColor: color,
                    boxShadow:
                      selectedIndex === i || isPlaying ? `0 0 0 2px ${isPlaying ? "#fff" : color}` : undefined,
                  }}
                >
                  <div className="text-[11px] font-mono" style={{ color }}>
                    {c.label}
                  </div>
                  <div className="text-base font-bold text-white">{c.name}</div>
                  <div className="truncate text-[10px] text-slate-400">{c.notes.join(" ")}</div>
                  <div className="mt-0.5 text-[9px] text-slate-500">♩×{c.beats}</div>
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
                {i < progression.length - 1 && (
                  <div className="flex items-center">
                    <span
                      className="text-lg"
                      style={{ color: resolves ? FUNCTION_COLORS.Tonic : "#475569" }}
                      title={resolves ? "Strong resolution" : undefined}
                    >
                      {resolves ? "↪" : "→"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
