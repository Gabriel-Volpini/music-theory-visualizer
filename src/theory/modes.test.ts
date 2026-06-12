import { describe, it, expect } from "vitest";
import { parentMajorTonic, modeInfo, isMode } from "./modes";

describe("parentMajorTonic", () => {
  it("maps modes back to their parent major scale", () => {
    expect(parentMajorTonic("D", "dorian")).toBe("C");
    expect(parentMajorTonic("E", "phrygian")).toBe("C");
    expect(parentMajorTonic("F", "lydian")).toBe("C");
    expect(parentMajorTonic("G", "mixolydian")).toBe("C");
    expect(parentMajorTonic("A", "minor")).toBe("C");
    expect(parentMajorTonic("C", "major")).toBe("C");
  });

  it("returns null for non-modal scales", () => {
    expect(parentMajorTonic("C", "harmonic minor")).toBeNull();
  });
});

describe("modeInfo / isMode", () => {
  it("knows the characteristic tone of Dorian (natural 6 = +9 semitones)", () => {
    expect(modeInfo("dorian")?.characteristicSemitones).toContain(9);
  });
  it("flags the diatonic modes", () => {
    expect(isMode("lydian")).toBe(true);
    expect(isMode("blues")).toBe(false);
  });
});
