import { useMemo, useState } from "react";
import { useComposition } from "../../store/composition";
import { getScale } from "../../theory/scales";
import {
  borrowedSuggestions,
  chordScaleSuggestions,
  diatonicSuggestions,
  secondaryDominantSuggestions,
  type ChordScale,
  type ChordSuggestion,
  type PlacedChord,
} from "../../theory/progression";
import { suggestNextNotes } from "../../theory/solo";
import { playChord, playNote, resumeAudio } from "../../theory/audio";
import Instruments from "../Instruments";
import Legend from "../Legend";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  FUNCTION_COLORS,
  chordHighlights,
  scaleHighlights,
  soloHighlights,
} from "../palette";
import ChordEditPanel from "./ChordEditPanel";
import ChordBuilder from "./ChordBuilder";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

type Step = "chords" | "solo";

export default function ChordSoloBuilder() {
  const {
    tonic,
    scaleType,
    builderChords,
    builderSelected,
    solo,
    addBuilderChord,
    replaceBuilderChordAt,
    setBuilderChordBeats,
    removeBuilderChordAt,
    clearBuilder,
    setBuilderSelected,
    toggleSoloNote,
  } = useComposition();

  const [step, setStep] = useState<Step>("chords");
  const [activeScale, setActiveScale] = useState<ChordScale | null>(null);

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
    setActiveScale(null);
    if (i != null && builderChords[i]) audition(builderChords[i].chromas);
  };

  return (
    <div className="space-y-5">
      {/* Step switch */}
      <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-slate-700">
        {(["chords", "solo"] as const).map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={
              "px-4 py-2 text-sm font-medium transition " +
              (step === s ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700")
            }
          >
            {i + 1}. {s === "chords" ? "Chord Creator" : "Solo Creator"}
          </button>
        ))}
      </div>

      <BuilderTimeline
        chords={builderChords}
        selected={builderSelected}
        solo={solo}
        step={step}
        onSelect={select}
        onRemove={removeBuilderChordAt}
        onClear={clearBuilder}
      />

      {step === "chords" ? (
        <>
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

          {/* Note-by-note chord builder with presets + live solo-fit */}
          <ChordBuilder onAdd={handleAdd} />

          {/* Edit selected chord (quality, inversion, substitution, scale) */}
          {selected && builderSelected != null && (
            <ChordEditPanel
              chord={selected}
              index={builderSelected}
              tonic={tonic}
              activeScale={activeScale}
              onReplace={replaceBuilderChordAt}
              onBeats={setBuilderChordBeats}
              onPickScale={setActiveScale}
            />
          )}

          {/* Instruments */}
          {selected && (
            <ChordInstruments chord={selected} activeScale={activeScale} />
          )}
        </>
      ) : (
        <SoloStep
          chord={selected}
          picked={selected ? solo[selected.uid] ?? [] : []}
          onToggle={(chroma) => {
            if (!selected) return;
            resumeAudio();
            playNote(chroma);
            toggleSoloNote(selected.uid, chroma);
          }}
        />
      )}
    </div>
  );
}

function ChordInstruments({ chord, activeScale }: { chord: PlacedChord; activeScale: ChordScale | null }) {
  const highlights = activeScale
    ? scaleHighlights(getScale(activeScale.tonic, activeScale.type), "tonal")
    : chordHighlights(chord);
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-300">
        {activeScale ? `Scale: ${activeScale.tonic} ${activeScale.type}` : `${chord.label} · ${chord.name}`}{" "}
        <span className="text-slate-500">
          ({(activeScale ? getScale(activeScale.tonic, activeScale.type).notes.map((n) => n.name) : chord.notes).join(" ")})
        </span>
      </h3>
      <Instruments highlights={highlights} />
      <Legend
        title="Function"
        items={[
          { color: FUNCTION_COLORS.Tonic, label: "Tonic", ring: true },
          { color: FUNCTION_COLORS.Subdominant, label: "Subdominant" },
          { color: FUNCTION_COLORS.Dominant, label: "Dominant" },
        ]}
      />
    </div>
  );
}

function SoloStep({
  chord,
  picked,
  onToggle,
}: {
  chord: PlacedChord | null;
  picked: number[];
  onToggle: (chroma: number) => void;
}) {
  if (!chord) {
    return (
      <div className="rounded-lg bg-slate-900/60 p-6 text-center text-sm text-slate-500 ring-1 ring-slate-800">
        Add and select a chord in the Chord Creator, then come here to build a line over it.
      </div>
    );
  }

  const fit = chordScaleSuggestions(chord)[0];
  const scale = getScale(fit.tonic, fit.type);
  const suggestions = suggestNextNotes(scale, chord.chromas, null);

  const highlights = soloHighlights(suggestions, null);
  picked.forEach((c) =>
    highlights.set(c, { color: "#fbbf24", ring: true, sub: "solo", label: SHARP_NAMES[((c % 12) + 12) % 12] })
  );

  const playPhrase = () => {
    resumeAudio();
    playChord(chord.chromas, { durationMs: 1400 });
    picked.forEach((c, i) => window.setTimeout(() => playNote(c, { durationMs: 320 }), 140 + i * 240));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            Notes that fit <span style={{ color: FUNCTION_COLORS[chord.fn] }}>{chord.name}</span>
          </h3>
          <span className="text-xs text-slate-500">
            over {fit.tonic} {fit.type}
          </span>
        </div>
        <p className="mb-3 text-[11px] text-slate-500">
          Click notes to add them to your solo line over this chord — chord tones are the strongest
          landing notes. {fit.reason}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => {
            const isPicked = picked.includes(s.chroma);
            const color = CATEGORY_COLORS[s.category];
            return (
              <button
                key={s.chroma}
                onClick={() => onToggle(s.chroma)}
                title={s.reason}
                className="rounded px-2 py-1 text-xs font-medium ring-1 transition hover:brightness-125"
                style={{
                  backgroundColor: isPicked ? "#fbbf24" : color + "22",
                  color: isPicked ? "#0b0b0b" : color,
                  borderColor: isPicked ? "#fbbf24" : color,
                }}
              >
                {s.note}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={playPhrase}
          className="rounded bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500"
        >
          ▶ Hear chord + solo
        </button>
        <span className="text-slate-400">
          Your line:{" "}
          {picked.length ? (
            <span className="font-mono text-amber-300">
              {picked.map((c) => SHARP_NAMES[((c % 12) + 12) % 12]).join(" – ")}
            </span>
          ) : (
            <span className="text-slate-600">none yet</span>
          )}
        </span>
      </div>

      <Instruments highlights={highlights} onPick={onToggle} pickHint="Click notes to build your line" />
      <Legend
        title="Fit"
        items={[
          { color: "#fbbf24", label: "In your solo", ring: true },
          ...(["chord-tone", "step", "color", "avoid", "scale"] as const).map((c) => ({
            color: CATEGORY_COLORS[c],
            label: CATEGORY_LABELS[c],
          })),
        ]}
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
  solo,
  step,
  onSelect,
  onRemove,
  onClear,
}: {
  chords: PlacedChord[];
  selected: number | null;
  solo: Record<string, number[]>;
  step: Step;
  onSelect: (i: number | null) => void;
  onRemove: (i: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">
          Your chords {step === "solo" && <span className="text-slate-500">· pick one to solo over</span>}
        </h2>
        {chords.length > 0 && (
          <button onClick={onClear} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700">
            Clear
          </button>
        )}
      </div>
      {chords.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Add chords below (or build a custom one), then switch to the Solo Creator to write a line.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {chords.map((c, i) => {
            const color = FUNCTION_COLORS[c.fn];
            const soloCount = solo[c.uid]?.length ?? 0;
            return (
              <button
                key={c.uid}
                onClick={() => onSelect(i)}
                className="group relative w-24 rounded-lg p-2 text-left ring-1 transition hover:brightness-110"
                style={{
                  backgroundColor: color + "1f",
                  borderColor: color,
                  boxShadow: selected === i ? `0 0 0 2px ${color}` : undefined,
                }}
              >
                <div className="text-[11px] font-mono" style={{ color }}>
                  {c.label}
                </div>
                <div className="text-base font-bold text-white">{c.name}</div>
                <div className="truncate text-[10px] text-slate-400">{c.notes.join(" ")}</div>
                {soloCount > 0 && (
                  <div className="mt-0.5 text-[9px] text-amber-300">♪ {soloCount} solo</div>
                )}
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
