import { describe, it, expect } from "vitest";
import { getScale } from "./scales";
import { suggestModulations, findPivots } from "./modulation";

describe("suggestModulations", () => {
  it("ranks the relative key first (all 7 notes shared) from C major", () => {
    const targets = suggestModulations("C", "major");
    expect(targets[0].tonic).toBe("A");
    expect(targets[0].type).toBe("minor");
    expect(targets[0].sharedCount).toBe(7);
  });

  it("is sorted by shared-note count descending", () => {
    const counts = suggestModulations("C", "major").map((t) => t.sharedCount);
    const sorted = [...counts].sort((a, b) => b - a);
    expect(counts).toEqual(sorted);
  });

  it("uses minor-family destinations for a minor source", () => {
    const targets = suggestModulations("A", "minor");
    expect(targets[0].tonic).toBe("C"); // relative major
    expect(targets[0].type).toBe("major");
  });
});

describe("findPivots", () => {
  it("finds chords common to C major and G major (e.g. C, G, Em, Am)", () => {
    const pivots = findPivots(getScale("C", "major"), getScale("G", "major"));
    const names = pivots.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(["C", "G", "Em", "Am"]));
    // C is the I of C major and the IV of G major.
    const c = pivots.find((p) => p.name === "C")!;
    expect(c.sourceRoman).toBe("I");
    expect(c.targetRoman).toBe("IV");
  });
});
