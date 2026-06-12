import { create } from "zustand";
import { TONICS } from "../theory/scales";
import type { ChordSuggestion, PlacedChord } from "../theory/progression";

export type Lens = "tonal" | "modal";
export type ToolId =
  | "scale"
  | "solo"
  | "modulation"
  | "canvas"
  | "builder"
  | "circle"
  | "interval";

let uidCounter = 0;
const nextUid = () => `c${uidCounter++}`;

/**
 * The single shared "composition context". Every tool reads and writes this,
 * so changing the key/scale in one place updates every other tool at once.
 */
interface CompositionState {
  tonic: string;
  scaleType: string;
  lens: Lens;
  /** Index into the current scale's diatonic chords, or null. */
  currentChordIndex: number | null;
  /** The pitch class (0-11) the player is currently "on" (for the solo helper). */
  selectedChroma: number | null;
  /** The chord progression being built on the Composition Canvas. */
  progression: PlacedChord[];
  /** Which card on the canvas is selected (shown on the instruments). */
  selectedCardIndex: number | null;
  /** Independent chord workspace for the Chord + Solo Builder tab. */
  builderChords: PlacedChord[];
  builderSelected: number | null;
  /** Per-chord solo notes (chord uid -> chosen pitch classes). */
  solo: Record<string, number[]>;
  /** Melody over the canvas progression (beat column -> MIDI note). */
  melody: Record<number, number>;
  /** Active tool tab. */
  tool: ToolId;

  setTonic: (t: string) => void;
  setScaleType: (t: string) => void;
  /** Set tonic + scale type together (e.g. after modulating to a new key). */
  setKey: (tonic: string, scaleType: string) => void;
  setLens: (l: Lens) => void;
  setCurrentChordIndex: (i: number | null) => void;
  setSelectedChroma: (c: number | null) => void;
  setTool: (t: ToolId) => void;

  addChord: (c: ChordSuggestion) => void;
  removeChordAt: (i: number) => void;
  clearProgression: () => void;
  setSelectedCardIndex: (i: number | null) => void;
  /** Replace a card in place (e.g. after changing its quality), keeping its uid + beats. */
  replaceChordAt: (i: number, c: ChordSuggestion) => void;
  /** Reorder a card (drag and drop). */
  moveChord: (from: number, to: number) => void;
  /** Set a card's duration in beats. */
  setChordBeats: (i: number, beats: number) => void;
  /** Replace the whole progression (load / share-link import). */
  loadProgression: (chords: Array<ChordSuggestion & { beats?: number }>) => void;

  // Chord + Solo Builder workspace
  addBuilderChord: (c: ChordSuggestion) => void;
  replaceBuilderChordAt: (i: number, c: ChordSuggestion) => void;
  setBuilderChordBeats: (i: number, beats: number) => void;
  removeBuilderChordAt: (i: number) => void;
  clearBuilder: () => void;
  setBuilderSelected: (i: number | null) => void;
  /** Toggle a note in the solo line over a given chord (by chord uid). */
  toggleSoloNote: (uid: string, chroma: number) => void;

  /** Set (or clear, with null) the melody note at a beat column. */
  setMelodyNote: (col: number, midi: number | null) => void;
  clearMelody: () => void;
}

const DEFAULT_BEATS = 4;

export const useComposition = create<CompositionState>((set) => ({
  tonic: TONICS[0],
  scaleType: "major",
  lens: "tonal",
  currentChordIndex: null,
  selectedChroma: null,
  progression: [],
  selectedCardIndex: null,
  builderChords: [],
  builderSelected: null,
  solo: {},
  melody: {},
  tool: "scale",

  setTonic: (tonic) => set({ tonic, currentChordIndex: null, selectedChroma: null }),
  setScaleType: (scaleType) =>
    set({ scaleType, currentChordIndex: null, selectedChroma: null }),
  setKey: (tonic, scaleType) =>
    set({ tonic, scaleType, currentChordIndex: null, selectedChroma: null }),
  setLens: (lens) => set({ lens }),
  setCurrentChordIndex: (currentChordIndex) => set({ currentChordIndex }),
  setSelectedChroma: (selectedChroma) => set({ selectedChroma }),
  setTool: (tool) => set({ tool }),

  addChord: (c) =>
    set((s) => {
      const progression = [...s.progression, { ...c, uid: nextUid(), beats: DEFAULT_BEATS }];
      return { progression, selectedCardIndex: progression.length - 1 };
    }),
  removeChordAt: (i) =>
    set((s) => {
      const progression = s.progression.filter((_, idx) => idx !== i);
      const selectedCardIndex =
        progression.length === 0 ? null : Math.min(i, progression.length - 1);
      return { progression, selectedCardIndex };
    }),
  clearProgression: () => set({ progression: [], selectedCardIndex: null }),
  setSelectedCardIndex: (selectedCardIndex) => set({ selectedCardIndex }),

  replaceChordAt: (i, c) =>
    set((s) => {
      const prev = s.progression[i];
      if (!prev) return {};
      const progression = [...s.progression];
      progression[i] = { ...c, uid: prev.uid, beats: prev.beats };
      return { progression };
    }),
  moveChord: (from, to) =>
    set((s) => {
      if (from === to || from < 0 || to < 0) return {};
      const progression = [...s.progression];
      if (from >= progression.length || to >= progression.length) return {};
      const [moved] = progression.splice(from, 1);
      progression.splice(to, 0, moved);
      return { progression, selectedCardIndex: to };
    }),
  setChordBeats: (i, beats) =>
    set((s) => {
      const progression = [...s.progression];
      if (!progression[i]) return {};
      progression[i] = { ...progression[i], beats: Math.max(1, Math.min(16, beats)) };
      return { progression };
    }),
  loadProgression: (chords) =>
    set({
      progression: chords.map((c) => ({ ...c, uid: nextUid(), beats: c.beats ?? DEFAULT_BEATS })),
      selectedCardIndex: chords.length ? 0 : null,
    }),

  addBuilderChord: (c) =>
    set((s) => {
      const builderChords = [...s.builderChords, { ...c, uid: nextUid(), beats: DEFAULT_BEATS }];
      return { builderChords, builderSelected: builderChords.length - 1 };
    }),
  replaceBuilderChordAt: (i, c) =>
    set((s) => {
      const prev = s.builderChords[i];
      if (!prev) return {};
      const builderChords = [...s.builderChords];
      builderChords[i] = { ...c, uid: prev.uid, beats: prev.beats };
      return { builderChords };
    }),
  setBuilderChordBeats: (i, beats) =>
    set((s) => {
      const builderChords = [...s.builderChords];
      if (!builderChords[i]) return {};
      builderChords[i] = { ...builderChords[i], beats: Math.max(1, Math.min(16, beats)) };
      return { builderChords };
    }),
  removeBuilderChordAt: (i) =>
    set((s) => {
      const removed = s.builderChords[i];
      const builderChords = s.builderChords.filter((_, idx) => idx !== i);
      const solo = { ...s.solo };
      if (removed) delete solo[removed.uid];
      const builderSelected =
        builderChords.length === 0 ? null : Math.min(i, builderChords.length - 1);
      return { builderChords, builderSelected, solo };
    }),
  clearBuilder: () => set({ builderChords: [], builderSelected: null, solo: {} }),
  setBuilderSelected: (builderSelected) => set({ builderSelected }),
  toggleSoloNote: (uid, chroma) =>
    set((s) => {
      const current = s.solo[uid] ?? [];
      const next = current.includes(chroma)
        ? current.filter((c) => c !== chroma)
        : [...current, chroma];
      return { solo: { ...s.solo, [uid]: next } };
    }),

  setMelodyNote: (col, midi) =>
    set((s) => {
      const melody = { ...s.melody };
      if (midi == null) delete melody[col];
      else melody[col] = midi;
      return { melody };
    }),
  clearMelody: () => set({ melody: {} }),
}));
