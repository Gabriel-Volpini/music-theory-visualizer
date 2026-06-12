# 🎵 Music Theory Visualizer

A set of music-theory tools that share one **composition state** (key, scale, chord,
current note) so they work together while you compose. Built with React + Vite +
TypeScript, using [`tonal`](https://github.com/tonaljs/tonal) for the theory math.

## Run it

```bash
npm install
npm run dev      # open the printed localhost URL
npm test         # run the theory unit tests
npm run build    # type-check + production build
```

## What's here

Pick a **root**, **scale/mode**, and a **lens** at the top — every tool stays in sync.
Everything is shown on a **guitar fretboard and a piano** at the same time.

- **Composition Canvas** — a full composition workbench
  - Build a chord progression as a left-to-right diagram, each card colored by function
    (🟢 Tonic / 🟠 Subdominant / 🔴 Dominant) with resolution arrows between cards.
  - Context-aware suggestions for what comes next: **diatonic** chords, **secondary
    dominants** (V7/x), **borrowed/chromatic** chords (modal interchange), and **modulations**
    (which also switch the global key). A 💡 hint ★-flags the strongest next move.
  - **Edit any chord:** change its quality/extensions (maj7, 7, 9, sus, add9, …), **reharmonize**
    with substitutions (relative, tritone sub, secondary dominant), and set its **duration**.
  - **Presets:** insert ii–V–I, 12-bar blues, the I–V–vi–IV axis, 50s doo-wop, Andalusian.
  - **Auto analysis:** Roman-numeral readout + detected cadence (authentic / plagal / deceptive / half).
  - **Solo over a chord:** chord-scale suggestions (e.g. D7 → D Mixolydian) drawn on both instruments.
  - **Scales that fit the whole progression:** ranked scales/modes that contain the notes you've used
    (perfect fits, or best-coverage when you've gone chromatic) — click to preview, hear the run, or set
    it as the project key.
  - **Rhythm timeline** with per-chord beats, drag-to-reorder, and a **playhead** that plays the
    progression on a **piano** (Web Audio synth) at an adjustable BPM — clicking chords/cards or
    on-screen notes auditions them too (with a mute toggle). **Save** progressions, **export** a
    chord chart, or copy a **share link**.
  - **Melody Layer** (below the canvas on the same tab) — a monophonic piano-roll over the
    progression; rows are two octaves of the scale, columns are beats, chord tones are tinted, and
    playback plays the melody together with the chords.
- **Chord + Solo Builder** — a two-step workspace (independent from the Canvas)
  - **Step 1 – Chord Creator:** add chords from suggestions or build a custom one (root + quality),
    then edit the selected chord — change its **quality/extensions** (add a 7th, 9th, …), **invert**
    it (slash chords like C/E, C/G), or **reharmonize** it.
  - **Step 2 – Solo Creator:** pick any chord and see the **notes that fit** it (from its best-fit
    scale), ranked and colored — click notes to build a solo line over that chord, then **▶ hear the
    chord + your line** on the piano.
- **Circle of Fifths** — interactive wheel of all keys (major outer ring, relative minor inner). Your
  key is green, its Dominant (V, clockwise) red and Subdominant (IV, counter-clockwise) orange. Click
  any key to make it the project key.
- **Interval** — click two notes on either instrument to get the interval name, size in semitones,
  consonance, and its inversion; hear it melodically or harmonically.
- **Scale Visualizer**
  - Notes color-coded by harmonic role (root / 3rd / 5th / 7th / tension).
  - **Tonal lens** — diatonic chords with Roman numerals and functions (Tonic /
    Subdominant / Dominant). Click a chord to make it the active harmony.
  - **Modal lens** — highlights the mode's *characteristic color tone* (Dorian ♮6,
    Lydian ♯4, Mixolydian ♭7, …), flags avoid notes, and shows the parent major scale.
- **Solo Helper**
  - Click a note to mark "where you are now," pick the active chord, and get a ranked
    **next-note** heatmap: chord tones (land here), stepwise moves (smooth), color tones,
    and avoid notes.
- **Modulation**
  - Ranked destination keys (relative, dominant, parallel, …) sorted by shared notes, each
    with the **pivot chords** that bridge the two keys (`I → IV`, etc.) and the new notes you
    gain. "Switch to this key" updates the shared state so you keep composing in the new key.

## Architecture

- `src/theory/` — pure, unit-tested theory engine over `tonal`
  (`scales.ts`, `modes.ts`, `solo.ts`, `modulation.ts`, `progression.ts`). `audio.ts` is a small
  Web Audio piano synth.
- `src/store/composition.ts` — the shared Zustand state every tool reads/writes.
- `src/components/` — `Fretboard` + `Piano` (SVG), pickers, legend; `tools/` holds each tool.

## Planned next

- Extend audio to the Scale Visualizer / Solo Helper (the synth lives in `src/theory/audio.ts`).
- A melody layer over the progression; richer piano voicings.
