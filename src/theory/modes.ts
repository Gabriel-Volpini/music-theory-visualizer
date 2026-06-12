import { Note } from "tonal";

/** Per-mode "color theory": which scale tones define the mode's character. */
export interface ModeInfo {
  /** Semitone offsets from the tonic that give the mode its signature color. */
  characteristicSemitones: number[];
  /** Semitone offsets that classically clash over the tonic chord ("avoid notes"). */
  avoidSemitones: number[];
  /** Which degree of the parent major scale this mode starts on (Ionian=1). */
  degreeInParentMajor: number;
  /** Relative brightness for ordering modes bright -> dark. */
  brightness: number;
  /** Plain-language description of the mode's sound. */
  blurb: string;
}

export const MODE_INFO: Record<string, ModeInfo> = {
  lydian: {
    characteristicSemitones: [6],
    avoidSemitones: [],
    degreeInParentMajor: 4,
    brightness: 3,
    blurb:
      "Brightest major mode. The #4 (raised 4th) is its signature — dreamy and floating.",
  },
  major: {
    characteristicSemitones: [11],
    avoidSemitones: [5],
    degreeInParentMajor: 1,
    brightness: 2,
    blurb:
      "Ionian. Bright and fully resolved. The natural 4th is the classic 'avoid' note over the I chord.",
  },
  mixolydian: {
    characteristicSemitones: [10],
    avoidSemitones: [5],
    degreeInParentMajor: 5,
    brightness: 1,
    blurb: "Dominant, bluesy major. The b7 drives its rock, funk and blues flavor.",
  },
  dorian: {
    characteristicSemitones: [9],
    avoidSemitones: [],
    degreeInParentMajor: 2,
    brightness: 0,
    blurb:
      "Minor with a natural 6th — the brightest minor mode. Jazzy and hopeful (think 'So What').",
  },
  minor: {
    characteristicSemitones: [8],
    avoidSemitones: [],
    degreeInParentMajor: 6,
    brightness: -1,
    blurb: "Aeolian / natural minor. The b6 makes it darker and sadder than Dorian.",
  },
  phrygian: {
    characteristicSemitones: [1],
    avoidSemitones: [],
    degreeInParentMajor: 3,
    brightness: -2,
    blurb: "Dark minor with a b2 — Spanish/flamenco and metal flavor.",
  },
  locrian: {
    characteristicSemitones: [1, 6],
    avoidSemitones: [],
    degreeInParentMajor: 7,
    brightness: -3,
    blurb:
      "Darkest mode. A diminished tonic (b5) makes it unstable and rarely used as a key center.",
  },
};

/** The 7 standard modes ordered bright -> dark, for a mode wheel/comparison. */
export const MODE_ORDER = [
  "lydian",
  "major",
  "mixolydian",
  "dorian",
  "minor",
  "phrygian",
  "locrian",
];

export function modeInfo(type: string): ModeInfo | undefined {
  return MODE_INFO[type];
}

/** Is this scale type one of the 7 diatonic modes? */
export function isMode(type: string): boolean {
  return type in MODE_INFO;
}

/** Tonic of the parent major scale (e.g. D Dorian -> C major). */
export function parentMajorTonic(tonic: string, type: string): string | null {
  const info = MODE_INFO[type];
  if (!info) return null;
  const majorOffsets = [0, 2, 4, 5, 7, 9, 11];
  const offset = majorOffsets[info.degreeInParentMajor - 1];
  // Lower the tonic by `offset` semitones using pitch-class math.
  const midi = Note.midi(tonic + "4");
  if (midi == null) return null;
  return Note.pitchClass(Note.fromMidi(midi - offset)) || null;
}
