import { diatonicChords, getScale, chromaOf, TONICS, type ScaleInfo } from "./scales";

export interface PivotChord {
  /** Chord name as spelled in the source key. */
  name: string;
  /** Its Roman numeral / function in the source key. */
  sourceRoman: string;
  /** Its Roman numeral / function in the target key. */
  targetRoman: string;
}

export interface ModulationTarget {
  tonic: string;
  type: string;
  label: string; // "G Major"
  relationship: string; // "Dominant (V)"
  blurb: string;
  sharedChromas: number[];
  sharedCount: number;
  /** Notes present in the target but not the source. */
  newNotes: string[];
  pivots: PivotChord[];
}

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const MAJOR_FAMILY = new Set(["major", "lydian", "mixolydian"]);

type Candidate = { offset: number; type: string; relationship: string; blurb: string };

// Candidate destinations, by whether the source is heard as major or minor.
const MAJOR_CANDIDATES: Candidate[] = [
  { offset: 9, type: "minor", relationship: "Relative minor (vi)", blurb: "Same seven notes, darker center — the smoothest possible move." },
  { offset: 7, type: "major", relationship: "Dominant (V)", blurb: "Up a fifth. Adds one sharp; bright and very common." },
  { offset: 5, type: "major", relationship: "Subdominant (IV)", blurb: "Down a fifth. Adds one flat; relaxed, plagal feel." },
  { offset: 0, type: "minor", relationship: "Parallel minor", blurb: "Same root, switch to minor — dramatic mood flip, great for choruses." },
  { offset: 2, type: "minor", relationship: "Supertonic minor (ii)", blurb: "Up a whole step to ii — jazzy, sets up a ii–V." },
  { offset: 4, type: "minor", relationship: "Mediant minor (iii)", blurb: "Shares many notes; gentle lift." },
];

const MINOR_CANDIDATES: Candidate[] = [
  { offset: 3, type: "major", relationship: "Relative major (III)", blurb: "Same seven notes, brighter center — the smoothest possible move." },
  { offset: 7, type: "minor", relationship: "Minor dominant (v)", blurb: "Up a fifth. Natural-minor v; modal, less pull than a major V." },
  { offset: 5, type: "minor", relationship: "Subdominant minor (iv)", blurb: "Down a fifth. Dark and plagal." },
  { offset: 0, type: "major", relationship: "Parallel major", blurb: "Same root, switch to major — sudden brightening (Picardy feel)." },
  { offset: 10, type: "major", relationship: "bVII major", blurb: "A favorite rock/modal lift; many shared notes." },
  { offset: 8, type: "major", relationship: "bVI major", blurb: "Cinematic, dramatic shift up to bVI." },
];

function noteAt(sourceChroma: number, offset: number): string {
  return SHARP_NAMES[(sourceChroma + offset) % 12];
}

/** Pivot chords: chords diatonic to the source whose notes also fit the target. */
export function findPivots(source: ScaleInfo, target: ScaleInfo): PivotChord[] {
  if (!source.isHeptatonic || !target.isHeptatonic) return [];
  const srcChords = diatonicChords(source);
  const tgtChords = diatonicChords(target);
  const pivots: PivotChord[] = [];
  for (const sc of srcChords) {
    const fitsTarget = sc.chromas.every((c) => target.chromaSet.has(c));
    if (!fitsTarget) continue;
    const tgt = tgtChords.find((tc) => tc.chromas[0] === sc.chromas[0]);
    if (!tgt) continue;
    pivots.push({ name: sc.name, sourceRoman: sc.roman, targetRoman: tgt.roman });
  }
  return pivots;
}

/** Ranked modulation suggestions from the current key, closest (most shared notes) first. */
export function suggestModulations(tonic: string, type: string): ModulationTarget[] {
  const source = getScale(tonic, type);
  const sourceChroma = chromaOf(tonic);
  const candidates = MAJOR_FAMILY.has(type) ? MAJOR_CANDIDATES : MINOR_CANDIDATES;

  const targets = candidates.map((cand) => {
    const tTonic = noteAt(sourceChroma, cand.offset);
    const target = getScale(tTonic, cand.type);
    const sharedChromas = [...target.chromaSet].filter((c) => source.chromaSet.has(c));
    const newNotes = target.notes
      .filter((n) => !source.chromaSet.has(n.chroma))
      .map((n) => n.name);
    return {
      tonic: tTonic,
      type: cand.type,
      label: target.label,
      relationship: cand.relationship,
      blurb: cand.blurb,
      sharedChromas,
      sharedCount: sharedChromas.length,
      newNotes,
      pivots: findPivots(source, target),
    };
  });

  return targets.sort((a, b) => b.sharedCount - a.sharedCount);
}

export interface PathStep {
  toTonic: string;
  toType: string;
  toLabel: string;
  relationship: string;
  pivots: PivotChord[];
}

/**
 * Shortest route between two keys, hopping through the smooth single-step
 * modulations (relative, V, IV, parallel, …). Returns the ordered steps, an
 * empty array if you're already there, or null if no route exists.
 */
export function findModulationPath(
  startTonic: string,
  startType: string,
  endTonic: string,
  endType: "major" | "minor"
): PathStep[] | null {
  const startFam: "major" | "minor" = MAJOR_FAMILY.has(startType) ? "major" : "minor";
  const id = (chroma: number, type: string) => `${chroma}-${type}`;
  const startId = id(chromaOf(startTonic), startFam);
  const endId = id(chromaOf(endTonic), endType);
  if (startId === endId) return [];

  const visited = new Set<string>([startId]);
  const queue: { chroma: number; type: "major" | "minor" }[] = [
    { chroma: chromaOf(startTonic), type: startFam },
  ];
  const prev = new Map<string, { parent: string; step: PathStep }>();

  while (queue.length) {
    const cur = queue.shift()!;
    const curId = id(cur.chroma, cur.type);
    for (const t of suggestModulations(TONICS[cur.chroma], cur.type)) {
      const nc = chromaOf(t.tonic);
      const nid = id(nc, t.type);
      if (visited.has(nid)) continue;
      visited.add(nid);
      prev.set(nid, {
        parent: curId,
        step: {
          toTonic: t.tonic,
          toType: t.type,
          toLabel: t.label,
          relationship: t.relationship,
          pivots: t.pivots,
        },
      });
      if (nid === endId) {
        const steps: PathStep[] = [];
        let walk = endId;
        while (walk !== startId) {
          const p = prev.get(walk)!;
          steps.unshift(p.step);
          walk = p.parent;
        }
        return steps;
      }
      queue.push({ chroma: nc, type: t.type as "major" | "minor" });
    }
  }
  return null;
}
