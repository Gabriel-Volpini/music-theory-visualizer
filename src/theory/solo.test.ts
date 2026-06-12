import { describe, it, expect } from "vitest";
import { getScale } from "./scales";
import { suggestNextNotes } from "./solo";

const cMajor = getScale("C", "major");
const cTriad = [0, 4, 7]; // C E G

describe("suggestNextNotes", () => {
  it("ranks chord tones highest when no current note is set", () => {
    const s = suggestNextNotes(cMajor, cTriad, null);
    const top3 = s.slice(0, 3).map((x) => x.chroma).sort((a, b) => a - b);
    expect(top3).toEqual([0, 4, 7]); // C E G
    expect(s.every((x) => x.category !== undefined)).toBe(true);
  });

  it("flags the natural 4th (F) as an avoid note over the I chord", () => {
    const s = suggestNextNotes(cMajor, cTriad, null);
    const f = s.find((x) => x.chroma === 5); // F
    expect(f?.category).toBe("avoid");
  });

  it("rewards stepwise resolution into a chord tone", () => {
    // From D (2), both C (step down) and E (step up) are stepwise chord tones —
    // either is a strongest move and should rank at the very top.
    const s = suggestNextNotes(cMajor, cTriad, 2);
    expect([0, 4]).toContain(s[0].chroma); // C or E
    expect(s[0].category).toBe("chord-tone");
    expect(s[0].stepwise).toBe(true);
    // Both stepwise chord tones must outrank the non-adjacent chord tone G (7).
    const g = s.find((x) => x.chroma === 7)!;
    expect(s[0].score).toBeGreaterThan(g.score);
  });

  it("never suggests staying on the current note", () => {
    const s = suggestNextNotes(cMajor, cTriad, 0);
    expect(s.find((x) => x.chroma === 0)).toBeUndefined();
  });
});
