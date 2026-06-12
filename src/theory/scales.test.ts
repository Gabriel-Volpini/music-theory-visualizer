import { describe, it, expect } from "vitest";
import { getScale, diatonicChords, chromaOf } from "./scales";

describe("getScale", () => {
  it("returns the C major scale with correct notes and roles", () => {
    const s = getScale("C", "major");
    expect(s.notes.map((n) => n.name)).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
    expect(s.notes[0].role).toBe("root");
    expect(s.notes[2].role).toBe("third"); // E
    expect(s.notes[4].role).toBe("fifth"); // G
    expect(s.notes[6].role).toBe("seventh"); // B
    expect(s.isHeptatonic).toBe(true);
  });

  it("D Dorian shares the exact pitch classes of C major (relative modes)", () => {
    const dorian = getScale("D", "dorian");
    const major = getScale("C", "major");
    expect([...dorian.chromaSet].sort((a, b) => a - b)).toEqual(
      [...major.chromaSet].sort((a, b) => a - b)
    );
  });

  it("pentatonic scales are not heptatonic", () => {
    expect(getScale("A", "minor pentatonic").isHeptatonic).toBe(false);
  });
});

describe("diatonicChords", () => {
  it("derives the correct triad qualities for C major", () => {
    const chords = diatonicChords(getScale("C", "major"));
    expect(chords.map((c) => c.roman)).toEqual([
      "I",
      "ii",
      "iii",
      "IV",
      "V",
      "vi",
      "vii°",
    ]);
    expect(chords.map((c) => c.name)).toEqual([
      "C",
      "Dm",
      "Em",
      "F",
      "G",
      "Am",
      "Bdim",
    ]);
    expect(chords[4].fn).toBe("Dominant"); // V
  });

  it("returns no chords for non-heptatonic scales", () => {
    expect(diatonicChords(getScale("A", "minor pentatonic"))).toEqual([]);
  });
});

describe("chromaOf", () => {
  it("maps note names to pitch classes", () => {
    expect(chromaOf("C")).toBe(0);
    expect(chromaOf("F#")).toBe(6);
    expect(chromaOf("Bb")).toBe(10);
  });
});
