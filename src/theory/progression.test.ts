import { describe, it, expect } from "vitest";
import { getScale, chromaOf } from "./scales";
import {
  diatonicSuggestions,
  secondaryDominantSuggestions,
  borrowedSuggestions,
  modulationSuggestions,
  nextChordHints,
  qualityVariants,
  substitutions,
  presetChords,
  analyzeProgression,
  chordScaleSuggestions,
  scaleSuggestionsForChords,
  invertChord,
  currentInversion,
  buildChordFromNotes,
  PRESETS,
  type ChordSuggestion,
  type PlacedChord,
} from "./progression";

/** Helper: turn a suggestion into a placed card for analysis/hint tests. */
function place(c: ChordSuggestion, beats = 4): PlacedChord {
  return { ...c, uid: "u" + c.name, beats };
}

const cMajor = getScale("C", "major");

describe("diatonicSuggestions", () => {
  it("returns the 7 diatonic chords with V flagged as dominant resolving to the tonic", () => {
    const d = diatonicSuggestions(cMajor);
    expect(d).toHaveLength(7);
    const v = d.find((c) => c.label === "V")!;
    expect(v.name).toBe("G");
    expect(v.fn).toBe("Dominant");
    expect(v.resolvesTo).toBe(chromaOf("C")); // 0
  });
});

describe("secondaryDominantSuggestions", () => {
  it("builds V7/V = D7 resolving to G in C major", () => {
    const sec = secondaryDominantSuggestions(cMajor);
    const v7ofV = sec.find((c) => c.label === "V7/V")!;
    expect(v7ofV.name).toBe("D7");
    expect(v7ofV.fn).toBe("Dominant");
    expect(v7ofV.resolvesTo).toBe(chromaOf("G")); // 7
  });

  it("does not generate a secondary dominant for the tonic", () => {
    const sec = secondaryDominantSuggestions(cMajor);
    expect(sec.find((c) => c.label === "V7/I")).toBeUndefined();
  });
});

describe("borrowedSuggestions", () => {
  it("offers minor iv (Fm) borrowed into C major", () => {
    const b = borrowedSuggestions("C", "major");
    const iv = b.find((c) => c.label === "iv")!;
    expect(iv.name).toBe("Fm");
  });
});

describe("modulationSuggestions", () => {
  it("offers the relative minor (Am) as a modulation target from C major", () => {
    const m = modulationSuggestions("C", "major");
    const am = m.find((c) => c.modulateTo?.tonic === "A");
    expect(am?.name).toBe("Am");
    expect(am?.modulateTo?.type).toBe("minor");
  });
});

describe("nextChordHints", () => {
  it("recommends resolving a dominant chord to its target", () => {
    const g = place(diatonicSuggestions(cMajor).find((c) => c.label === "V")!);
    const hint = nextChordHints("C", g);
    expect(hint?.recommended.has(0)).toBe(true); // resolve to C
  });
});

describe("qualityVariants", () => {
  it("offers extensions of a C major chord (Cmaj7, C7, etc.)", () => {
    const c = diatonicSuggestions(cMajor).find((x) => x.label === "I")!;
    const names = qualityVariants(c).map((v) => v.name);
    expect(names).toContain("Cmaj7");
    expect(names).toContain("C7");
    expect(names).toContain("C6");
  });
});

describe("substitutions", () => {
  it("offers a tritone sub (Db7) for G7", () => {
    const g7 = diatonicSuggestions(cMajor).find((x) => x.label === "V")!;
    const dom = { ...g7, symbol: "7", name: "G7" };
    const subs = substitutions(dom, "C").map((s) => s.name);
    expect(subs.some((n) => n === "Db7" || n === "C#7")).toBe(true);
  });

  it("offers the relative minor (Am) as a sub for C major", () => {
    const c = diatonicSuggestions(cMajor).find((x) => x.label === "I")!;
    expect(substitutions(c, "C").map((s) => s.name)).toContain("Am");
  });
});

describe("presetChords", () => {
  it("materializes ii–V–I in C as Dm7, G7, Cmaj7", () => {
    const preset = PRESETS.find((p) => p.name === "ii–V–I")!;
    expect(presetChords(preset, "C").map((c) => c.name)).toEqual(["Dm7", "G7", "Cmaj7"]);
  });
});

describe("analyzeProgression", () => {
  it("detects an authentic cadence (V → I)", () => {
    const dia = diatonicSuggestions(cMajor);
    const prog = [dia.find((c) => c.label === "V")!, dia.find((c) => c.label === "I")!].map((c) =>
      place(c)
    );
    expect(analyzeProgression("C", prog).cadence).toMatch(/Authentic/);
  });

  it("detects a half cadence (ends on V)", () => {
    const dia = diatonicSuggestions(cMajor);
    const prog = [dia.find((c) => c.label === "I")!, dia.find((c) => c.label === "V")!].map((c) =>
      place(c)
    );
    expect(analyzeProgression("C", prog).cadence).toMatch(/Half/);
  });
});

describe("scaleSuggestionsForChords", () => {
  it("returns C major (and its modes) as perfect fits for a C-major progression", () => {
    // Notes of I, IV, V in C = the full C major scale.
    const dia = diatonicSuggestions(cMajor);
    const chromas = [dia[0], dia[3], dia[4]].flatMap((c) => c.chromas);
    const fits = scaleSuggestionsForChords(chromas, "C", "major");
    expect(fits[0]).toMatchObject({ tonic: "C", type: "major", perfect: true });
    // The relative modes all contain the same notes, so they fit perfectly too.
    expect(fits.every((f) => f.perfect)).toBe(true);
    expect(fits.some((f) => f.tonic === "A" && f.type === "minor")).toBe(true);
  });

  it("falls back to best-coverage scales when the notes are chromatic", () => {
    // All 12 chromatic notes — no 7-note scale can contain them all.
    const all = Array.from({ length: 12 }, (_, i) => i);
    const fits = scaleSuggestionsForChords(all, "C", "major");
    expect(fits.length).toBeGreaterThan(0);
    expect(fits.every((f) => !f.perfect)).toBe(true);
    expect(fits[0].covered).toBeLessThan(fits[0].total);
  });
});

describe("invertChord", () => {
  const c = diatonicSuggestions(cMajor).find((x) => x.label === "I")!; // C major: C E G

  it("first inversion puts the 3rd in the bass and names it as a slash chord", () => {
    const inv = invertChord(c, 1);
    expect(inv.chromas[0]).toBe(4); // E in the bass
    expect(inv.name).toBe("C/E");
    expect(inv.root).toBe(0); // harmonic root unchanged
    expect(inv.fn).toBe("Tonic"); // function unchanged
  });

  it("second inversion puts the 5th in the bass", () => {
    const inv = invertChord(c, 2);
    expect(inv.chromas[0]).toBe(7); // G
    expect(inv.name).toBe("C/G");
  });

  it("root position has no slash and round-trips", () => {
    expect(invertChord(c, 0).name).toBe("C");
    expect(currentInversion(invertChord(c, 1))).toBe(1);
    expect(currentInversion(invertChord(invertChord(c, 1), 0))).toBe(0);
  });
});

describe("buildChordFromNotes", () => {
  it("identifies a C major triad built from individual notes", () => {
    const c = buildChordFromNotes([0, 4, 7], 0, "C")!;
    expect(c.root).toBe(0);
    expect(c.fn).toBe("Tonic");
    expect(c.chromas).toEqual([0, 4, 7]); // ordered root-first
    expect(c.name).toBeTruthy();
  });

  it("tags a G7 built from notes as a Dominant in C", () => {
    const c = buildChordFromNotes([7, 11, 2, 5], 7, "C")!;
    expect(c.root).toBe(7);
    expect(c.fn).toBe("Dominant");
    expect(c.chromas[0]).toBe(7); // root in front
    expect(new Set(c.chromas)).toEqual(new Set([7, 11, 2, 5]));
  });

  it("returns null for fewer than two notes", () => {
    expect(buildChordFromNotes([0], 0, "C")).toBeNull();
  });
});

describe("chordScaleSuggestions", () => {
  it("maps a dominant 7th to Mixolydian", () => {
    const g7 = { ...diatonicSuggestions(cMajor)[4], symbol: "7", name: "G7" };
    expect(chordScaleSuggestions(g7)[0].type).toBe("mixolydian");
  });

  it("maps a minor chord to Dorian first", () => {
    const dm = diatonicSuggestions(cMajor).find((c) => c.label === "ii")!;
    expect(chordScaleSuggestions(dm)[0].type).toBe("dorian");
  });
});
