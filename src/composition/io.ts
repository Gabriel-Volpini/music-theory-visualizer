import { Chord, Note } from "tonal";
import { buildChordFromNotes, type PlacedChord } from "../theory/progression";

/** The fields we persist for a chord (everything needed to rebuild a card). */
export type SerializedChord = Pick<
  PlacedChord,
  | "name"
  | "label"
  | "fn"
  | "category"
  | "root"
  | "symbol"
  | "chromas"
  | "notes"
  | "resolvesTo"
  | "modulateTo"
  | "explanation"
  | "beats"
>;

export interface SavedProgression {
  name: string;
  tonic: string;
  type: string;
  chords: SerializedChord[];
}

const STORAGE_KEY = "mtv.progressions";

export function serialize(prog: PlacedChord[]): SerializedChord[] {
  return prog.map((c) => ({
    name: c.name,
    label: c.label,
    fn: c.fn,
    category: c.category,
    root: c.root,
    symbol: c.symbol,
    chromas: c.chromas,
    notes: c.notes,
    resolvesTo: c.resolvesTo,
    modulateTo: c.modulateTo,
    explanation: c.explanation,
    beats: c.beats,
  }));
}

// ---- Share link (progression encoded in the URL hash) ----------------------

export function encodeToHash(tonic: string, type: string, prog: PlacedChord[]): string {
  const payload = { v: 1, tonic, type, chords: serialize(prog) };
  return "#p=" + encodeURIComponent(JSON.stringify(payload));
}

export function shareLink(tonic: string, type: string, prog: PlacedChord[]): string {
  const { origin, pathname } = window.location;
  return origin + pathname + encodeToHash(tonic, type, prog);
}

export interface DecodedShare {
  tonic?: string;
  type?: string;
  chords: SerializedChord[];
}

export function decodeFromHash(hash: string): DecodedShare | null {
  const m = hash.match(/[#&]p=([^&]+)/);
  if (!m) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(m[1]));
    if (!obj || !Array.isArray(obj.chords)) return null;
    return { tonic: obj.tonic, type: obj.type, chords: obj.chords };
  } catch {
    return null;
  }
}

// ---- Text export (a readable chord chart) ----------------------------------

export function exportText(tonic: string, type: string, prog: PlacedChord[]): string {
  if (!prog.length) return "";
  const chart = prog.map((c) => `${c.name}${c.beats !== 4 ? `(${c.beats})` : ""}`).join(" | ");
  const romans = prog.map((c) => c.label).join(" – ");
  return `Key: ${tonic} ${type}\nChords:  | ${chart} |\nAnalysis: ${romans}`;
}

/** Parse the text produced by exportText back into a progression. */
export function importText(text: string): DecodedShare | null {
  const lines = text.split("\n");
  const keyLine = lines.find((l) => /^\s*key:/i.test(l));
  const chordLine = lines.find((l) => /^\s*chords:/i.test(l));
  if (!chordLine) return null;

  let tonic: string | undefined;
  let type: string | undefined;
  if (keyLine) {
    const m = keyLine.replace(/^\s*key:\s*/i, "").trim().match(/^([A-Ga-g][#b]?)\s+(.+)$/);
    if (m) {
      tonic = m[1][0].toUpperCase() + m[1].slice(1);
      type = m[2].trim();
    }
  }
  const keyTonic = tonic ?? "C";

  const tokens = chordLine
    .replace(/^\s*chords:\s*/i, "")
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);

  const chords: SerializedChord[] = [];
  for (const tok of tokens) {
    const m = tok.match(/^(.+?)(?:\((\d+)\))?$/);
    if (!m) continue;
    const name = m[1].trim();
    const beats = m[2] ? Math.max(1, Math.min(16, Number(m[2]))) : 4;
    const got = Chord.get(name);
    if (got.empty || got.notes.length < 2) continue;
    const chromas = got.notes.map((n) => Note.chroma(n)).filter((c): c is number => c != null);
    const rootChroma = got.tonic ? Note.chroma(got.tonic) ?? chromas[0] : chromas[0];
    const built = buildChordFromNotes(chromas, rootChroma, keyTonic);
    if (built) chords.push({ ...serialize([{ ...built, uid: "", beats }])[0] });
  }
  if (!chords.length) return null;
  return { tonic, type, chords };
}

// ---- localStorage save / load ----------------------------------------------

export function listSaved(): SavedProgression[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedProgression[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: SavedProgression[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function saveProgression(
  name: string,
  tonic: string,
  type: string,
  prog: PlacedChord[]
): SavedProgression[] {
  const items = listSaved().filter((p) => p.name !== name);
  items.push({ name, tonic, type, chords: serialize(prog) });
  writeAll(items);
  return items;
}

export function deleteSaved(name: string): SavedProgression[] {
  const items = listSaved().filter((p) => p.name !== name);
  writeAll(items);
  return items;
}
