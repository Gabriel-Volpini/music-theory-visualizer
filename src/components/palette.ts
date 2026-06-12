import { functionForSemitone, type ChordFunction, type ScaleInfo } from "../theory/scales";
import type { SoloCategory, Suggestion } from "../theory/solo";
import type { PlacedChord } from "../theory/progression";
import { modeInfo } from "../theory/modes";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * The one consistent palette: harmonic function -> color, used everywhere.
 *   🟢 Tonic (root, 3rd, 6th)  🟠 Subdominant (2nd, 4th)  🔴 Dominant (5th, 7th)
 */
export const FUNCTION_COLORS: Record<ChordFunction, string> = {
  Tonic: "#22c55e", // green
  Subdominant: "#f97316", // orange
  Dominant: "#ef4444", // red
};

export const FUNCTION_LABELS: Record<ChordFunction, string> = {
  Tonic: "Tonic — root, 3rd, 6th",
  Subdominant: "Subdominant — 2nd, 4th",
  Dominant: "Dominant — 5th, 7th",
};

export function functionColor(semitone: number): string {
  return FUNCTION_COLORS[functionForSemitone(semitone)];
}

export const SHARED_TONE = "#22c55e"; // green — common to both keys
export const NEW_TONE = "#f59e0b"; // amber — only in the target key
export const LEAVING_TONE = "#475569"; // slate — only in the source key

/** What an instrument should draw for a given pitch class. */
export interface NoteHighlight {
  color: string;
  /** Optional override label (defaults to the note name). */
  label?: string;
  /** Draw an outer ring to emphasize (e.g. characteristic / current note). */
  ring?: boolean;
  /** Render faded (e.g. low-priority solo suggestions). */
  dim?: boolean;
  /** Tiny caption under the note (e.g. score or role). */
  sub?: string;
}

export const COLOR_TONE = "#ec4899"; // pink — modal characteristic tone
export const AVOID_TONE = "#6b7280"; // gray — avoid note

export const CATEGORY_COLORS: Record<SoloCategory, string> = {
  "chord-tone": "#22c55e", // green — best targets
  step: "#3b82f6", // blue — smooth motion
  color: "#ec4899", // pink — modal color
  avoid: "#ef4444", // red — tension
  scale: "#64748b", // slate — neutral
};

export const CATEGORY_LABELS: Record<SoloCategory, string> = {
  "chord-tone": "Chord tone (land here)",
  step: "Stepwise (smooth)",
  color: "Color tone",
  avoid: "Avoid / tension",
  scale: "In scale",
};

/**
 * Build the role-colored highlight map for the Scale Visualizer.
 * In modal lens, characteristic tones get a pink ring; avoid notes go gray.
 */
export function scaleHighlights(
  scale: ScaleInfo,
  lens: "tonal" | "modal"
): Map<number, NoteHighlight> {
  const info = modeInfo(scale.type);
  const colorSemis = new Set(info?.characteristicSemitones ?? []);
  const avoidSemis = new Set(info?.avoidSemitones ?? []);
  const map = new Map<number, NoteHighlight>();

  for (const n of scale.notes) {
    let color = functionColor(n.semitone);
    let ring = n.semitone === 0; // ring the root
    let sub: string | undefined;

    if (lens === "modal") {
      if (colorSemis.has(n.semitone)) {
        color = COLOR_TONE;
        ring = true;
        sub = "color";
      } else if (avoidSemis.has(n.semitone)) {
        color = AVOID_TONE;
        sub = "avoid";
      }
    }
    map.set(n.chroma, { color, ring, sub, label: n.name });
  }
  return map;
}

/** Build the heatmap highlight map for the Solo Helper from ranked suggestions. */
export function soloHighlights(
  suggestions: Suggestion[],
  currentChroma: number | null
): Map<number, NoteHighlight> {
  const map = new Map<number, NoteHighlight>();
  for (const s of suggestions) {
    map.set(s.chroma, {
      color: CATEGORY_COLORS[s.category],
      dim: s.score < 0.5,
      ring: s.stepwise,
      sub: `${Math.round(s.score * 100)}`,
      label: s.note,
    });
  }
  if (currentChroma != null) {
    map.set(currentChroma, {
      color: "#fbbf24", // amber — where you are now
      ring: true,
      sub: "now",
    });
  }
  return map;
}

/**
 * Show one chord's tones on the instruments, colored by the chord's function,
 * with the chord root ringed. Used by the Composition Canvas.
 */
export function chordHighlights(chord: PlacedChord | null): Map<number, NoteHighlight> {
  const map = new Map<number, NoteHighlight>();
  if (!chord) return map;
  const color = FUNCTION_COLORS[chord.fn];
  const root = chord.chromas[0];
  chord.chromas.forEach((c, i) => {
    map.set(c, {
      color,
      label: SHARP_NAMES[((c % 12) + 12) % 12],
      ring: c === root,
      sub: i === 0 ? "root" : undefined,
    });
  });
  return map;
}

/**
 * Overlay comparing a source key to a target key: shared notes (green),
 * notes only in the target (amber, ringed = "new"), notes only in the source
 * (dim slate = "leaving"). With no target, just shows the source scale.
 */
export function modulationHighlights(
  source: ScaleInfo,
  target: ScaleInfo | null
): Map<number, NoteHighlight> {
  const map = new Map<number, NoteHighlight>();
  if (!target) {
    for (const n of source.notes) {
      map.set(n.chroma, {
        color: functionColor(n.semitone),
        ring: n.semitone === 0,
        label: n.name,
      });
    }
    return map;
  }
  for (const n of source.notes) {
    if (target.chromaSet.has(n.chroma)) {
      map.set(n.chroma, { color: SHARED_TONE, label: n.name, sub: "shared" });
    } else {
      map.set(n.chroma, { color: LEAVING_TONE, label: n.name, dim: true, sub: "leaving" });
    }
  }
  for (const n of target.notes) {
    if (!source.chromaSet.has(n.chroma)) {
      map.set(n.chroma, { color: NEW_TONE, label: n.name, ring: true, sub: "new" });
    }
  }
  return map;
}
