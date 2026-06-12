import type { PlacedChord } from "../theory/progression";

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
