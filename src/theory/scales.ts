import { Scale, Note, Interval } from "tonal";

/** A note's harmonic role within a scale, used for color-coding. */
export type Role = "root" | "third" | "fifth" | "seventh" | "tension";

export type ChordQuality = "maj" | "min" | "dim" | "aug" | "other";
export type ChordFunction = "Tonic" | "Subdominant" | "Dominant";

export interface ScaleNote {
  /** Note name as spelled by the scale (e.g. "Eb"). */
  name: string;
  /** Pitch class 0-11 (C=0). */
  chroma: number;
  /** Semitones above the tonic, 0-11. */
  semitone: number;
  /** 1-based degree within the scale. */
  degree: number;
  /** Harmonic role for color-coding. */
  role: Role;
}

export interface DiatonicChord {
  degree: number; // 1-based
  roman: string; // e.g. "ii", "V", "vii°"
  name: string; // e.g. "Dm", "G", "Bdim"
  quality: ChordQuality;
  fn: ChordFunction;
  notes: string[]; // triad note names
  chromas: number[]; // triad pitch classes
}

export interface ScaleInfo {
  tonic: string;
  type: string;
  label: string; // e.g. "D Dorian"
  notes: ScaleNote[];
  chromaSet: Set<number>;
  chromaToNote: Map<number, ScaleNote>;
  isHeptatonic: boolean;
}

/** Tonic choices for the picker (sharp spelling). */
export const TONICS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export interface ScaleTypeOption {
  /** tonal scale name. */
  id: string;
  label: string;
  group: "Major modes" | "Minor modes" | "Other";
}

/** Scale types offered in the picker. `id` must match tonal's scale dictionary. */
export const SCALE_TYPES: ScaleTypeOption[] = [
  { id: "major", label: "Major (Ionian)", group: "Major modes" },
  { id: "lydian", label: "Lydian", group: "Major modes" },
  { id: "mixolydian", label: "Mixolydian", group: "Major modes" },
  { id: "minor", label: "Natural Minor (Aeolian)", group: "Minor modes" },
  { id: "dorian", label: "Dorian", group: "Minor modes" },
  { id: "phrygian", label: "Phrygian", group: "Minor modes" },
  { id: "locrian", label: "Locrian", group: "Minor modes" },
  { id: "harmonic minor", label: "Harmonic Minor", group: "Other" },
  { id: "melodic minor", label: "Melodic Minor", group: "Other" },
  { id: "major pentatonic", label: "Major Pentatonic", group: "Other" },
  { id: "minor pentatonic", label: "Minor Pentatonic", group: "Other" },
  { id: "blues", label: "Blues", group: "Other" },
];

/** Pitch class (0-11) for a note name, or -1 if unknown. */
export function chromaOf(note: string): number {
  const c = Note.chroma(note);
  return c == null ? -1 : c;
}

function roleForSemitone(semitone: number): Role {
  switch (semitone) {
    case 0:
      return "root";
    case 3:
    case 4:
      return "third";
    case 7:
      return "fifth";
    case 10:
    case 11:
      return "seventh";
    default:
      return "tension";
  }
}

/** Build a fully-described scale from a tonic + tonal scale name. */
export function getScale(tonic: string, type: string): ScaleInfo {
  const sc = Scale.get(`${tonic} ${type}`);
  const notes: ScaleNote[] = sc.notes.map((name, i) => {
    const semitone = ((Interval.semitones(sc.intervals[i]) ?? 0) % 12 + 12) % 12;
    return {
      name,
      chroma: chromaOf(name),
      semitone,
      degree: i + 1,
      role: roleForSemitone(semitone),
    };
  });
  const chromaToNote = new Map<number, ScaleNote>();
  notes.forEach((n) => chromaToNote.set(n.chroma, n));
  return {
    tonic,
    type,
    label: `${tonic} ${labelFor(type)}`,
    notes,
    chromaSet: new Set(notes.map((n) => n.chroma)),
    chromaToNote,
    isHeptatonic: notes.length === 7,
  };
}

export function labelFor(type: string): string {
  return SCALE_TYPES.find((s) => s.id === type)?.label ?? type;
}

// Scale-degree (semitone from tonic) -> tonal function, matching the diatonic
// chord functions. Tonic family = 0,3,4,8,9; Subdominant = 1,2,5; Dominant = 6,7,10,11.
const SEMITONE_FUNCTION: ChordFunction[] = [
  "Tonic", // 0  root
  "Subdominant", // 1  b2
  "Subdominant", // 2  2nd
  "Tonic", // 3  b3
  "Tonic", // 4  3rd
  "Subdominant", // 5  4th
  "Dominant", // 6  tritone
  "Dominant", // 7  5th
  "Tonic", // 8  b6
  "Tonic", // 9  6th
  "Dominant", // 10 b7
  "Dominant", // 11 7th
];

export function functionForSemitone(semitone: number): ChordFunction {
  return SEMITONE_FUNCTION[((semitone % 12) + 12) % 12];
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
// Functional roles relative to a major/minor tonal center (Ionian-based).
const FUNCTIONS: ChordFunction[] = [
  "Tonic", // I
  "Subdominant", // ii
  "Tonic", // iii
  "Subdominant", // IV
  "Dominant", // V
  "Tonic", // vi
  "Dominant", // vii
];

function qualityOf(rootChroma: number, thirdChroma: number, fifthChroma: number): ChordQuality {
  const t = (thirdChroma - rootChroma + 12) % 12;
  const f = (fifthChroma - rootChroma + 12) % 12;
  if (t === 4 && f === 7) return "maj";
  if (t === 3 && f === 7) return "min";
  if (t === 3 && f === 6) return "dim";
  if (t === 4 && f === 8) return "aug";
  return "other";
}

function romanFor(degree: number, quality: ChordQuality): string {
  const base = ROMAN[degree - 1] ?? String(degree);
  switch (quality) {
    case "maj":
      return base;
    case "aug":
      return base + "+";
    case "min":
      return base.toLowerCase();
    case "dim":
      return base.toLowerCase() + "°";
    default:
      return base;
  }
}

function chordName(root: string, quality: ChordQuality): string {
  switch (quality) {
    case "maj":
      return root;
    case "min":
      return root + "m";
    case "dim":
      return root + "dim";
    case "aug":
      return root + "aug";
    default:
      return root;
  }
}

/** Diatonic triads stacked in thirds. Only meaningful for 7-note scales. */
export function diatonicChords(scale: ScaleInfo): DiatonicChord[] {
  if (!scale.isHeptatonic) return [];
  const n = scale.notes;
  return n.map((note, i) => {
    const third = n[(i + 2) % 7];
    const fifth = n[(i + 4) % 7];
    const quality = qualityOf(note.chroma, third.chroma, fifth.chroma);
    return {
      degree: i + 1,
      roman: romanFor(i + 1, quality),
      name: chordName(note.name, quality),
      quality,
      fn: FUNCTIONS[i],
      notes: [note.name, third.name, fifth.name],
      chromas: [note.chroma, third.chroma, fifth.chroma],
    };
  });
}
