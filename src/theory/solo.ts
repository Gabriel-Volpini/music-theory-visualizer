import type { ScaleInfo } from "./scales";
import { modeInfo } from "./modes";

export type SoloCategory = "chord-tone" | "step" | "color" | "avoid" | "scale";

export interface Suggestion {
  chroma: number;
  note: string;
  /** 0-1 strength. */
  score: number;
  category: SoloCategory;
  reason: string;
  /** True when this note is reachable by a single scale step from the current note. */
  stepwise: boolean;
}

/** Smallest interval (in semitones, 1-6) between two pitch classes. */
function ringDistance(a: number, b: number): number {
  const d = ((a - b) % 12 + 12) % 12;
  return Math.min(d, 12 - d);
}

function directionLabel(from: number, to: number): string {
  const up = ((to - from) % 12 + 12) % 12;
  return up <= 6 ? "up" : "down";
}

/**
 * Rank scale notes as candidate "next notes" for a solo, given the current
 * harmony (chord tones) and optionally the note you just played.
 *
 * Pure function — unit tested in solo.test.ts.
 */
export function suggestNextNotes(
  scale: ScaleInfo,
  chordChromas: number[] | null,
  currentChroma: number | null
): Suggestion[] {
  const info = modeInfo(scale.type);
  const colorChromas = new Set(
    (info?.characteristicSemitones ?? []).map((s) => chromaForSemitone(scale, s))
  );
  const avoidChromas = new Set(
    (info?.avoidSemitones ?? []).map((s) => chromaForSemitone(scale, s))
  );
  const chordSet = new Set(chordChromas ?? []);

  const out: Suggestion[] = [];
  for (const n of scale.notes) {
    if (currentChroma != null && n.chroma === currentChroma) continue; // skip the note you're on

    const dist = currentChroma == null ? null : ringDistance(n.chroma, currentChroma);
    const stepwise = dist != null && (dist === 1 || dist === 2);
    const dir = currentChroma == null ? "" : directionLabel(currentChroma, n.chroma);

    let category: SoloCategory;
    let score: number;
    let reason: string;

    if (chordSet.has(n.chroma)) {
      category = "chord-tone";
      score = 0.8;
      reason = "Chord tone — a strong, consonant landing note.";
      if (stepwise) {
        score += 0.15;
        reason = `Chord tone a step ${dir} — the strongest resolution.`;
      }
    } else if (stepwise) {
      category = "step";
      score = 0.62;
      reason = `Smooth stepwise motion (${dir}) — great connective tissue.`;
    } else if (colorChromas.has(n.chroma)) {
      category = "color";
      score = 0.55;
      reason = "Characteristic color tone — leans into the mode's sound.";
    } else if (avoidChromas.has(n.chroma)) {
      category = "avoid";
      score = 0.15;
      reason = "Tense 'avoid' note over this chord — use as a quick passing tone.";
    } else {
      category = "scale";
      score = 0.4;
      reason = "In-scale note — safe but neutral.";
    }

    out.push({ chroma: n.chroma, note: n.name, score, category, reason, stepwise });
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}

/** Find the chroma of the scale note at a given semitone offset, if present. */
function chromaForSemitone(scale: ScaleInfo, semitone: number): number {
  const match = scale.notes.find((n) => n.semitone === semitone);
  return match ? match.chroma : -1;
}
