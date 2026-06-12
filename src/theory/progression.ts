import { Chord } from "tonal";
import {
  chromaOf,
  diatonicChords,
  functionForSemitone,
  getScale,
  labelFor,
  SCALE_TYPES,
  TONICS,
  type ChordFunction,
  type ScaleInfo,
} from "./scales";
import { suggestModulations } from "./modulation";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MAJOR_FAMILY = new Set(["major", "lydian", "mixolydian"]);

export type ChordCategory = "diatonic" | "secondary" | "borrowed" | "modulation";

export interface ChordSuggestion {
  /** Chord name, e.g. "G7", "Dm", "Ab". */
  name: string;
  /** Short analysis label, e.g. "V", "V7/ii", "♭VI". */
  label: string;
  fn: ChordFunction; // drives the color
  category: ChordCategory;
  /** Pitch class of the root (0-11). */
  root: number;
  /** Tonal chord-type suffix, e.g. "", "m", "7", "maj7". */
  symbol: string;
  chromas: number[];
  notes: string[];
  /** Pitch class this chord wants to resolve to (root of its target), if any. */
  resolvesTo?: number;
  explanation: string;
  /** Present on modulation suggestions: the key this chord lands you in. */
  modulateTo?: { tonic: string; type: string };
}

export interface PlacedChord extends ChordSuggestion {
  uid: string;
  /** Duration in beats on the rhythm timeline. */
  beats: number;
}

const FUNCTION_HINT: Record<ChordFunction, string> = {
  Tonic: "Home base — stable, resolved.",
  Subdominant: "Moves away from home; sets up the dominant.",
  Dominant: "Tension — wants to resolve to the tonic.",
};

const pc = (c: number) => ((c % 12) + 12) % 12;
const nameOf = (chroma: number) => SHARP_NAMES[pc(chroma)];

/** Build a chord from a root pitch class + tonal suffix; null if tonal can't parse it. */
export function buildChord(
  root: number,
  symbol: string,
  extra: Omit<ChordSuggestion, "name" | "root" | "symbol" | "chromas" | "notes">
): ChordSuggestion | null {
  const name = nameOf(root) + symbol;
  const got = Chord.get(name);
  if (got.empty || !got.notes.length) return null;
  const chromas = got.notes.map((n) => chromaOf(n)).filter((c) => c >= 0);
  return { name, root: pc(root), symbol, chromas, notes: got.notes, ...extra };
}

const QUALITY_SYMBOL: Record<string, string> = {
  maj: "",
  min: "m",
  dim: "dim",
  aug: "aug",
  other: "",
};

/** The 7 diatonic chords as suggestions, colored by function. */
export function diatonicSuggestions(scale: ScaleInfo): ChordSuggestion[] {
  const tonicChroma = chromaOf(scale.tonic);
  return diatonicChords(scale).map((c) => ({
    name: c.name,
    label: c.roman,
    fn: c.fn,
    category: "diatonic" as const,
    root: c.chromas[0],
    symbol: QUALITY_SYMBOL[c.quality],
    chromas: c.chromas,
    notes: c.notes,
    resolvesTo: c.fn === "Dominant" ? tonicChroma : undefined,
    explanation: FUNCTION_HINT[c.fn],
  }));
}

/**
 * Secondary dominants: a dominant-7th a fifth above each diatonic target
 * (V7/ii, V7/iii, V7/IV, V7/V, V7/vi).
 */
export function secondaryDominantSuggestions(scale: ScaleInfo): ChordSuggestion[] {
  if (!scale.isHeptatonic) return [];
  const out: ChordSuggestion[] = [];
  for (const target of diatonicChords(scale)) {
    if (target.degree === 1 || target.quality === "dim") continue;
    const targetRoot = target.chromas[0];
    const c = buildChord((targetRoot + 7) % 12, "7", {
      label: `V7/${target.roman}`,
      fn: "Dominant",
      category: "secondary",
      resolvesTo: targetRoot,
      explanation: `Secondary dominant — pulls strongly into ${target.name} (${target.roman}).`,
    });
    if (c) out.push(c);
  }
  return out;
}

interface BorrowedSpec {
  offset: number;
  suffix: string;
  label: string;
  fn: ChordFunction;
  why: string;
}

const BORROW_INTO_MAJOR: BorrowedSpec[] = [
  { offset: 5, suffix: "m", label: "iv", fn: "Subdominant", why: "Borrowed minor iv — wistful, a classic darkening of the subdominant." },
  { offset: 8, suffix: "", label: "♭VI", fn: "Subdominant", why: "Borrowed ♭VI — cinematic lift from the parallel minor." },
  { offset: 10, suffix: "", label: "♭VII", fn: "Subdominant", why: "Borrowed ♭VII — rock/Mixolydian flavor." },
  { offset: 3, suffix: "", label: "♭III", fn: "Tonic", why: "Borrowed ♭III — bluesy, bittersweet." },
];

const BORROW_INTO_MINOR: BorrowedSpec[] = [
  { offset: 7, suffix: "", label: "V", fn: "Dominant", why: "Major V (from harmonic minor) — far stronger pull than the natural v." },
  { offset: 5, suffix: "", label: "IV", fn: "Subdominant", why: "Major IV (Dorian) — brightens the subdominant." },
  { offset: 0, suffix: "", label: "I (Picardy)", fn: "Tonic", why: "Major tonic — the Picardy third, a bright surprise ending." },
  { offset: 1, suffix: "", label: "♭II (Neapolitan)", fn: "Subdominant", why: "Neapolitan — dramatic, leans into the dominant." },
];

export function borrowedSuggestions(tonic: string, type: string): ChordSuggestion[] {
  const tonicChroma = chromaOf(tonic);
  const specs = MAJOR_FAMILY.has(type) ? BORROW_INTO_MAJOR : BORROW_INTO_MINOR;
  const out: ChordSuggestion[] = [];
  for (const b of specs) {
    const c = buildChord(tonicChroma + b.offset, b.suffix, {
      label: b.label,
      fn: b.fn,
      category: "borrowed",
      explanation: b.why,
    });
    if (c) out.push(c);
  }
  return out;
}

export function modulationSuggestions(tonic: string, type: string): ChordSuggestion[] {
  const out: ChordSuggestion[] = [];
  for (const m of suggestModulations(tonic, type).slice(0, 4)) {
    const targetIsMajor = MAJOR_FAMILY.has(m.type);
    const pivotNote = m.pivots[0]?.name;
    const c = buildChord(chromaOf(m.tonic), targetIsMajor ? "" : "m", {
      label: `→ ${m.tonic}`,
      fn: "Tonic",
      category: "modulation",
      modulateTo: { tonic: m.tonic, type: m.type },
      explanation:
        `Modulate to ${m.label} (${m.relationship}).` +
        (pivotNote ? ` Pivot through ${pivotNote}.` : ""),
    });
    if (c) out.push(c);
  }
  return out;
}

// ---- Chord transforms (richer chords + reharmonization) --------------------

function baseQuality(symbol: string): "maj" | "min" | "dim" | "aug" {
  if (symbol.startsWith("dim")) return "dim";
  if (symbol.startsWith("aug")) return "aug";
  if (/^m(?!aj)/.test(symbol)) return "min";
  return "maj";
}

const QUALITY_VARIANTS: Record<string, string[]> = {
  maj: ["", "6", "maj7", "7", "maj9", "add9", "sus2", "sus4"],
  min: ["m", "m6", "m7", "m9", "m11", "madd9"],
  dim: ["dim", "dim7", "m7b5"],
  aug: ["aug", "maj7#5"],
};

/** Alternative qualities/extensions for a chord, keeping its root and slot. */
export function qualityVariants(chord: ChordSuggestion): ChordSuggestion[] {
  const variants = QUALITY_VARIANTS[baseQuality(chord.symbol)] ?? [];
  const seen = new Set<string>();
  const out: ChordSuggestion[] = [];
  for (const sym of variants) {
    const c = buildChord(chord.root, sym, {
      label: chord.label,
      fn: chord.fn,
      category: chord.category,
      resolvesTo: chord.resolvesTo,
      explanation: `${nameOf(chord.root)}${sym || ""} — a voicing of ${chord.label}.`,
    });
    if (c && !seen.has(c.name)) {
      seen.add(c.name);
      out.push(c);
    }
  }
  return out;
}

const isDominant = (chord: ChordSuggestion) =>
  chord.fn === "Dominant" || chord.symbol === "7" || /(?<!maj)7/.test(chord.symbol);

/** Reharmonization options for a chord: relative, tritone sub, secondary dominant. */
export function substitutions(chord: ChordSuggestion, tonic: string): ChordSuggestion[] {
  const tonicChroma = chromaOf(tonic);
  const offset = (root: number) => pc(root - tonicChroma);
  const out: (ChordSuggestion | null)[] = [];
  const base = baseQuality(chord.symbol);

  if (base === "maj") {
    out.push(
      buildChord(chord.root + 9, "m", {
        label: "rel. min",
        fn: functionForSemitone(offset(chord.root + 9)),
        category: "borrowed",
        explanation: "Relative-minor substitution — shares two of three notes, softer color.",
      })
    );
  } else if (base === "min") {
    out.push(
      buildChord(chord.root + 3, "", {
        label: "rel. maj",
        fn: functionForSemitone(offset(chord.root + 3)),
        category: "borrowed",
        explanation: "Relative-major substitution — shares two notes, brighter color.",
      })
    );
  }

  if (isDominant(chord)) {
    out.push(
      buildChord(chord.root + 6, "7", {
        label: "tritone sub",
        fn: "Dominant",
        category: "secondary",
        resolvesTo: chord.resolvesTo,
        explanation: "Tritone substitution — same tritone, smooth chromatic bass descent.",
      })
    );
  } else {
    out.push(
      buildChord(chord.root, "7", {
        label: `${chord.label}7`,
        fn: "Dominant",
        category: "secondary",
        explanation: "Make it a dominant 7th for extra forward pull.",
      })
    );
  }

  return out.filter((c): c is ChordSuggestion => c != null);
}

// ---- Build a chord from individual notes -----------------------------------

const DEGREE = ["I", "♭II", "II", "♭III", "III", "IV", "♯IV", "V", "♭VI", "VI", "♭VII", "VII"];

export interface ChordPreset {
  name: string;
  group: "Triads" | "Tetrads";
  /** Semitone offsets from the root. */
  offsets: number[];
}

export const CHORD_PRESETS: ChordPreset[] = [
  { name: "Major", group: "Triads", offsets: [0, 4, 7] },
  { name: "Minor", group: "Triads", offsets: [0, 3, 7] },
  { name: "Dim", group: "Triads", offsets: [0, 3, 6] },
  { name: "Aug", group: "Triads", offsets: [0, 4, 8] },
  { name: "Sus2", group: "Triads", offsets: [0, 2, 7] },
  { name: "Sus4", group: "Triads", offsets: [0, 5, 7] },
  { name: "Maj7", group: "Tetrads", offsets: [0, 4, 7, 11] },
  { name: "Dom7", group: "Tetrads", offsets: [0, 4, 7, 10] },
  { name: "Min7", group: "Tetrads", offsets: [0, 3, 7, 10] },
  { name: "m7♭5", group: "Tetrads", offsets: [0, 3, 6, 10] },
  { name: "Dim7", group: "Tetrads", offsets: [0, 3, 6, 9] },
  { name: "6", group: "Tetrads", offsets: [0, 4, 7, 9] },
  { name: "mMaj7", group: "Tetrads", offsets: [0, 3, 7, 11] },
];

/**
 * Identify a chord from a set of pitch classes (note-by-note construction).
 * Orders the notes from the preferred root, names it via tonal's chord detector,
 * and tags it with a function/degree relative to the current key.
 */
export function buildChordFromNotes(
  selected: number[],
  preferredRoot: number,
  keyTonic: string
): ChordSuggestion | null {
  const uniq = [...new Set(selected.map(pc))];
  if (uniq.length < 2) return null;

  const root = uniq.includes(pc(preferredRoot))
    ? pc(preferredRoot)
    : [...uniq].sort((a, b) => a - b)[0];
  const ordered = [...uniq].sort((a, b) => pc(a - root) - pc(b - root)); // root first, then ascending
  const noteNames = ordered.map((c) => nameOf(c));

  const detected = Chord.detect(noteNames);
  let name =
    detected.find((n) => Chord.get(n).tonic === nameOf(root)) ||
    detected[0] ||
    `${nameOf(root)}?`;

  const got = Chord.get(name);
  const tonicName = got.tonic || nameOf(root);
  let symbol = name.startsWith(tonicName) ? name.slice(tonicName.length) : "";
  if (symbol === "M" || symbol === "maj" || symbol === "major") {
    symbol = "";
    name = tonicName;
  }

  const offset = pc(root - chromaOf(keyTonic));
  const isMinor = symbol.startsWith("dim") || /^m(?!aj)/.test(symbol);
  const roman = DEGREE[offset];
  return {
    name,
    label: isMinor ? roman.toLowerCase() : roman,
    fn: functionForSemitone(offset),
    category: "diatonic",
    root,
    symbol,
    chromas: ordered,
    notes: noteNames,
    explanation: "Custom chord built from notes.",
  };
}

// ---- Inversions ------------------------------------------------------------

/** How many notes the chord has (= number of available inversions). */
export function inversionCount(chord: ChordSuggestion): number {
  return chord.chromas.length;
}

/** Which inversion a chord is currently in (0 = root position). */
export function currentInversion(chord: ChordSuggestion): number {
  const len = chord.chromas.length;
  if (len === 0) return 0;
  const rootIdx = chord.chromas.indexOf(chord.root);
  if (rootIdx < 0) return 0;
  return (len - rootIdx) % len;
}

/**
 * Invert a chord: rotate the voicing so a different chord tone is the bass,
 * naming it as a slash chord (e.g. C → C/E → C/G). The harmonic root, function
 * and label are preserved — only the bass/voicing changes.
 */
export function invertChord(chord: ChordSuggestion, inversion: number): ChordSuggestion {
  const len = chord.chromas.length;
  if (len === 0) return chord;
  const rootIdx = Math.max(0, chord.chromas.indexOf(chord.root));
  const baseChromas = [...chord.chromas.slice(rootIdx), ...chord.chromas.slice(0, rootIdx)];
  const baseNotes = [...chord.notes.slice(rootIdx), ...chord.notes.slice(0, rootIdx)];
  const n = ((inversion % len) + len) % len;
  const chromas = [...baseChromas.slice(n), ...baseChromas.slice(0, n)];
  const notes = [...baseNotes.slice(n), ...baseNotes.slice(0, n)];
  const baseName = nameOf(chord.root) + chord.symbol;
  const name = n === 0 ? baseName : `${baseName}/${nameOf(chromas[0])}`;
  return { ...chord, chromas, notes, name };
}

// ---- Progression presets ---------------------------------------------------

interface PresetStep {
  off: number;
  symbol: string;
  label: string;
  fn: ChordFunction;
}

export interface Preset {
  name: string;
  family: "major" | "minor" | "any";
  steps: PresetStep[];
}

const BLUES_OFFSETS = [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7];

export const PRESETS: Preset[] = [
  {
    name: "ii–V–I",
    family: "major",
    steps: [
      { off: 2, symbol: "m7", label: "ii7", fn: "Subdominant" },
      { off: 7, symbol: "7", label: "V7", fn: "Dominant" },
      { off: 0, symbol: "maj7", label: "Imaj7", fn: "Tonic" },
    ],
  },
  {
    name: "I–V–vi–IV (Axis)",
    family: "major",
    steps: [
      { off: 0, symbol: "", label: "I", fn: "Tonic" },
      { off: 7, symbol: "", label: "V", fn: "Dominant" },
      { off: 9, symbol: "m", label: "vi", fn: "Tonic" },
      { off: 5, symbol: "", label: "IV", fn: "Subdominant" },
    ],
  },
  {
    name: "50s Doo-wop",
    family: "major",
    steps: [
      { off: 0, symbol: "", label: "I", fn: "Tonic" },
      { off: 9, symbol: "m", label: "vi", fn: "Tonic" },
      { off: 5, symbol: "", label: "IV", fn: "Subdominant" },
      { off: 7, symbol: "", label: "V", fn: "Dominant" },
    ],
  },
  {
    name: "12-bar blues",
    family: "any",
    steps: BLUES_OFFSETS.map((off) => ({
      off,
      symbol: "7",
      label: off === 0 ? "I7" : off === 5 ? "IV7" : "V7",
      fn: functionForSemitone(off),
    })),
  },
  {
    name: "Andalusian (minor)",
    family: "minor",
    steps: [
      { off: 0, symbol: "m", label: "i", fn: "Tonic" },
      { off: 10, symbol: "", label: "♭VII", fn: "Subdominant" },
      { off: 8, symbol: "", label: "♭VI", fn: "Subdominant" },
      { off: 7, symbol: "", label: "V", fn: "Dominant" },
    ],
  },
];

/** Materialize a preset into chords rooted in the given key. */
export function presetChords(preset: Preset, tonic: string): ChordSuggestion[] {
  const tonicChroma = chromaOf(tonic);
  const out: ChordSuggestion[] = [];
  for (const s of preset.steps) {
    const c = buildChord(tonicChroma + s.off, s.symbol, {
      label: s.label,
      fn: s.fn,
      category: "diatonic",
      resolvesTo: s.fn === "Dominant" ? tonicChroma : undefined,
      explanation: `${preset.name} progression`,
    });
    if (c) out.push(c);
  }
  return out;
}

// ---- Next-chord guidance ---------------------------------------------------

export interface NextHint {
  recommended: Set<number>;
  reason: string;
}

export function nextChordHints(tonic: string, last: PlacedChord | null): NextHint | null {
  if (!last) return null;
  const tonicChroma = chromaOf(tonic);
  const at = (offset: number) => (tonicChroma + offset) % 12;

  if (last.resolvesTo != null) {
    return {
      recommended: new Set([last.resolvesTo]),
      reason: `${last.label} resolves to ${nameOf(last.resolvesTo)} — land there for a satisfying cadence.`,
    };
  }
  switch (last.fn) {
    case "Dominant":
      return {
        recommended: new Set([tonicChroma]),
        reason: "After a Dominant, resolving to the Tonic (I) feels complete.",
      };
    case "Subdominant":
      return {
        recommended: new Set([at(7), at(11)]),
        reason: "Subdominant → Dominant builds the classic S–D–T cadence.",
      };
    case "Tonic":
    default:
      return {
        recommended: new Set([at(2), at(5)]),
        reason: "From the Tonic, move to a Subdominant (ii or IV) to get going.",
      };
  }
}

// ---- Progression analysis (Roman numerals + cadence) -----------------------

export interface Analysis {
  romans: string[];
  cadence: string | null;
}

export function analyzeProgression(tonic: string, prog: PlacedChord[]): Analysis {
  const romans = prog.map((c) => `${c.label}`);
  let cadence: string | null = null;
  if (prog.length >= 1) {
    const tonicChroma = chromaOf(tonic);
    const off = (c: PlacedChord) => pc(c.root - tonicChroma);
    const last = prog[prog.length - 1];
    const prev = prog.length >= 2 ? prog[prog.length - 2] : null;
    if (prev && off(prev) === 7 && off(last) === 0) cadence = "Authentic cadence (V → I)";
    else if (prev && off(prev) === 5 && off(last) === 0) cadence = "Plagal cadence (IV → I)";
    else if (prev && off(prev) === 7 && off(last) === 9) cadence = "Deceptive cadence (V → vi)";
    else if (off(last) === 7) cadence = "Half cadence (ends on V)";
  }
  return { romans, cadence };
}

// ---- Chord-scale theory (solo over this chord) -----------------------------

export interface ChordScale {
  tonic: string;
  type: string;
  reason: string;
}

/** Which scale(s)/mode(s) to solo over a given chord. */
export function chordScaleSuggestions(chord: ChordSuggestion): ChordScale[] {
  const got = Chord.get(chord.name);
  const iv = got.intervals ?? [];
  const root = nameOf(chord.root);
  const hasM3 = iv.includes("3M");
  const hasm3 = iv.includes("3m");
  const hasm7 = iv.includes("7m");
  const hasDim5 = iv.includes("5d");

  if (hasM3 && hasm7) {
    return [{ tonic: root, type: "mixolydian", reason: "Dominant 7th → Mixolydian (the major scale with a ♭7)." }];
  }
  if (hasM3) {
    return [
      { tonic: root, type: "lydian", reason: "Major chord → Lydian for a bright, floating color (♯4)." },
      { tonic: root, type: "major", reason: "Or plain major (Ionian) for the straight-ahead sound." },
    ];
  }
  if (hasm3 && hasDim5) {
    return [{ tonic: root, type: "locrian", reason: "Half-diminished → Locrian (minor with ♭5)." }];
  }
  if (hasm3) {
    return [
      { tonic: root, type: "dorian", reason: "Minor chord → Dorian (minor with a natural 6) — jazzy and bright." },
      { tonic: root, type: "minor", reason: "Or natural minor (Aeolian) for a darker color." },
    ];
  }
  return [{ tonic: root, type: "major", reason: "Default to the major scale rooted on the chord." }];
}

// ---- Scales that fit the whole progression --------------------------------

export interface ScaleFit {
  tonic: string;
  type: string;
  label: string;
  /** How many of the progression's distinct notes this scale contains. */
  covered: number;
  total: number;
  perfect: boolean;
}

/**
 * Rank scales/modes by how well they contain every note used in the progression
 * — i.e. which scales you can solo or write a melody over. When a scale fits
 * perfectly, only the perfect fits are returned (the relative modes); otherwise
 * the best-covering scales are shown so you can see how chromatic you've gone.
 */
export function scaleSuggestionsForChords(
  chromas: number[],
  currentTonic: string,
  currentType: string
): ScaleFit[] {
  const used = new Set(chromas.map((c) => pc(c)));
  const total = used.size;
  if (total === 0) return [];

  const fits: Array<ScaleFit & { order: number }> = [];
  SCALE_TYPES.forEach((st, order) => {
    for (const t of TONICS) {
      const sc = getScale(t, st.id);
      let covered = 0;
      used.forEach((c) => {
        if (sc.chromaSet.has(c)) covered++;
      });
      if (covered === 0) continue;
      fits.push({
        tonic: t,
        type: st.id,
        label: `${t} ${labelFor(st.id)}`,
        covered,
        total,
        perfect: covered === total,
        order,
      });
    }
  });

  fits.sort((a, b) => {
    if (a.perfect !== b.perfect) return a.perfect ? -1 : 1;
    if (b.covered !== a.covered) return b.covered - a.covered;
    const aCur = a.tonic === currentTonic && a.type === currentType ? 0 : 1;
    const bCur = b.tonic === currentTonic && b.type === currentType ? 0 : 1;
    if (aCur !== bCur) return aCur - bCur;
    return a.order - b.order;
  });

  const anyPerfect = fits.some((f) => f.perfect);
  const filtered = anyPerfect ? fits.filter((f) => f.perfect) : fits;
  return filtered.slice(0, 8).map(({ order: _order, ...rest }) => rest);
}

export { getScale };
