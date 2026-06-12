import { describe, it, expect } from "vitest";
import { midiToFreq, voiceChord } from "./audio";
import { diatonicSuggestions, getScale } from "./progression";

describe("midiToFreq", () => {
  it("anchors A4 = 440 Hz and C4 ≈ 261.63 Hz", () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 5);
    expect(midiToFreq(60)).toBeCloseTo(261.6256, 3);
    expect(midiToFreq(57)).toBeCloseTo(220, 5); // A3, one octave down
    expect(midiToFreq(81)).toBeCloseTo(880, 5); // A5, one octave up
  });
});

describe("voiceChord", () => {
  it("voices C major as a C3 bass under an ascending C4-E4-G4 stack", () => {
    // [48,60,64,67] = C3, C4, E4, G4
    expect(voiceChord([0, 4, 7])).toEqual([48, 60, 64, 67]);
  });

  it("keeps every chord tone above the previous one, wrapping octaves as needed", () => {
    // F major notes are F,A,C — the C wraps up to C5 so the stack stays ascending.
    expect(voiceChord([5, 9, 0])).toEqual([53, 65, 69, 72]); // F3, F4, A4, C5
    // G7 (G,B,D,F)
    expect(voiceChord([7, 11, 2, 5])).toEqual([55, 67, 71, 74, 77]);
  });

  it("produces the right frequencies for the C major triad", () => {
    const freqs = voiceChord([0, 4, 7]).map(midiToFreq);
    expect(freqs[0]).toBeCloseTo(130.81, 2); // C3
    expect(freqs[1]).toBeCloseTo(261.63, 2); // C4
    expect(freqs[2]).toBeCloseTo(329.63, 2); // E4
    expect(freqs[3]).toBeCloseTo(392.0, 1); // G4
  });

  it("voices the chromas that the chord engine actually emits (G major = G,B,D)", () => {
    const g = diatonicSuggestions(getScale("C", "major")).find((c) => c.label === "V")!;
    expect(g.chromas).toEqual([7, 11, 2]); // G B D
    expect(voiceChord(g.chromas)).toEqual([55, 67, 71, 74]); // G3, G4, B4, D5
  });
});
