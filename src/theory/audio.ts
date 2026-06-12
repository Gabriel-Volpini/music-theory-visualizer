/**
 * A tiny Web Audio piano-ish synth. No samples, no dependencies — two detuned
 * oscillators through a lowpass filter with a percussive envelope, which reads
 * close enough to a soft electric piano for auditioning chords.
 *
 * This is the audio seam the rest of the app routes through. AudioContext must
 * be created/resumed after a user gesture, so call `resumeAudio()` from a click.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export const audioEnabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.32; // headroom so stacked notes don't clip
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Resume the audio context (call from a user gesture such as the Play button). */
export function resumeAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
}

/** Equal-temperament frequency for a MIDI note (A4 = 69 = 440 Hz). */
export const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/**
 * Voice a set of pitch classes as MIDI notes: an ascending stack around C4 with
 * the root doubled an octave below for body.
 */
export function voiceChord(chromas: number[]): number[] {
  if (!chromas.length) return [];
  const midis: number[] = [];
  let prev = 59; // first upper voice lands at/above C4 (60)
  for (const c of chromas) {
    let m = 60 + (((c % 12) + 12) % 12);
    while (m <= prev) m += 12;
    midis.push(m);
    prev = m;
  }
  midis.unshift(midis[0] - 12); // bass
  return midis;
}

/** Play a single voice (frequency) with a piano-ish envelope. */
function playFreq(freq: number, start: number, durSec: number, velocity = 1): void {
  const c = getCtx();
  if (!c || !master) return;

  // Fundamental (triangle) carries the pitch; a quiet sine an octave up adds
  // brightness without overpowering it (an equal-level octave reads as an organ).
  const osc1 = c.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.value = freq;

  const osc2 = c.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = freq * 2;
  const osc2gain = c.createGain();
  osc2gain.gain.value = 0.28;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 3600;

  const g = c.createGain();
  const peak = 0.2 * velocity;
  const end = start + Math.max(0.25, durSec);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.008); // fast attack
  g.gain.exponentialRampToValueAtTime(0.0001, end); // decay/release

  osc1.connect(g);
  osc2.connect(osc2gain);
  osc2gain.connect(g);
  g.connect(filter);
  filter.connect(master);

  osc1.start(start);
  osc2.start(start);
  osc1.stop(end + 0.05);
  osc2.stop(end + 0.05);
}

export interface PlayOptions {
  /** Total ring time in ms. */
  durationMs?: number;
  /** Per-note strum offset in ms (a gentle arpeggio). */
  strumMs?: number;
}

/** Play a chord (array of pitch classes) on the piano. */
export function playChord(chromas: number[], opts: PlayOptions = {}): void {
  const c = getCtx();
  if (!c) return;
  const dur = (opts.durationMs ?? 700) / 1000;
  const strum = (opts.strumMs ?? 14) / 1000;
  const now = c.currentTime;
  voiceChord(chromas).forEach((midi, i) => {
    playFreq(midiToFreq(midi), now + i * strum, dur - i * strum);
  });
}

/** Play a single pitch class (e.g. auditioning a note). */
export function playNote(chroma: number, opts: PlayOptions = {}): void {
  const c = getCtx();
  if (!c) return;
  playFreq(midiToFreq(60 + (((chroma % 12) + 12) % 12)), c.currentTime, (opts.durationMs ?? 500) / 1000);
}

/** Play an exact MIDI note (used by the melody piano-roll, which needs real octaves). */
export function playMidi(midi: number, opts: PlayOptions = {}): void {
  const c = getCtx();
  if (!c) return;
  playFreq(midiToFreq(midi), c.currentTime, (opts.durationMs ?? 400) / 1000);
}

/** Play a scale as an ascending run (pitch classes in scale order), plus the octave. */
export function playScale(chromas: number[], opts: { noteMs?: number } = {}): void {
  const c = getCtx();
  if (!c || !chromas.length) return;
  const noteMs = opts.noteMs ?? 150;
  const midis: number[] = [];
  let prev = 59;
  for (const ch of chromas) {
    let m = 60 + (((ch % 12) + 12) % 12);
    while (m <= prev) m += 12;
    midis.push(m);
    prev = m;
  }
  midis.push(midis[0] + 12); // resolve up to the octave
  const now = c.currentTime;
  midis.forEach((m, i) => playFreq(midiToFreq(m), now + (i * noteMs) / 1000, (noteMs * 1.5) / 1000));
}
