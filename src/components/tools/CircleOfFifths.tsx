import { useComposition } from "../../store/composition";
import { TONICS, chromaOf, diatonicChords, getScale } from "../../theory/scales";
import { FUNCTION_COLORS } from "../palette";
import { playChord, resumeAudio } from "../../theory/audio";

// Clockwise by fifths, conventional spellings for readability.
const MAJORS = ["C", "G", "D", "A", "E", "B", "Gb", "Db", "Ab", "Eb", "Bb", "F"];
const MINORS = ["A", "E", "B", "F#", "C#", "G#", "Eb", "Bb", "F", "C", "G", "D"];
const MAJOR_FAMILY = new Set(["major", "lydian", "mixolydian"]);

const SIZE = 360;
const C = SIZE / 2;
const R_MAJOR = 150;
const R_MINOR = 96;

export default function CircleOfFifths() {
  const { tonic, scaleType, setKey } = useComposition();
  const tonicChroma = chromaOf(tonic);
  const isMajorKey = MAJOR_FAMILY.has(scaleType);

  const majorChromas = MAJORS.map(chromaOf);
  const minorChromas = MINORS.map(chromaOf);
  const activeIndex = (isMajorKey ? majorChromas : minorChromas).indexOf(tonicChroma);

  // Position on the wheel: index 0 at top, clockwise.
  const pos = (i: number, r: number) => {
    const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
    return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
  };

  // Tint the selected key's neighbors by function — works for whichever ring is
  // active (V clockwise, IV counter-clockwise), and marks the relative key
  // (same notes) on the opposite ring.
  const ringFill = (i: number, ring: "major" | "minor") => {
    const ringIsActive = (ring === "major") === isMajorKey;
    const idle = ring === "major" ? "#1e293b" : "#0f172a";
    if (ringIsActive) {
      if (i === activeIndex) return FUNCTION_COLORS.Tonic; // the selected key
      if (i === (activeIndex + 1) % 12) return FUNCTION_COLORS.Dominant; // V (clockwise)
      if (i === (activeIndex + 11) % 12) return FUNCTION_COLORS.Subdominant; // IV (counter-cw)
      return idle;
    }
    // Opposite ring: the relative key (shares all notes) sits at the same index.
    if (i === activeIndex) return "#0e7490"; // teal — relative key
    return idle;
  };
  const majorFill = (i: number) => ringFill(i, "major");
  const minorFill = (i: number) => ringFill(i, "minor");

  // Bright function fills get dark text; idle/teal get light text.
  const BRIGHT = [FUNCTION_COLORS.Tonic, FUNCTION_COLORS.Subdominant, FUNCTION_COLORS.Dominant];
  const textFor = (fill: string) => (BRIGHT.includes(fill) ? "#0b0b0b" : "#e2e8f0");

  const scale = getScale(tonic, scaleType);
  const chords = diatonicChords(scale);

  const playKeyChord = () => {
    if (chords[0]) {
      resumeAudio();
      playChord(chords[0].chromas, { durationMs: 900 });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
      <div>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-md select-none" role="img" aria-label="Circle of fifths">
          <circle cx={C} cy={C} r={R_MAJOR + 26} fill="none" stroke="#1e293b" strokeWidth={1} />
          <circle cx={C} cy={C} r={R_MINOR + 22} fill="none" stroke="#1e293b" strokeWidth={1} />

          {MAJORS.map((name, i) => {
            const { x, y } = pos(i, R_MAJOR);
            const fill = majorFill(i);
            const active = isMajorKey && i === activeIndex;
            const textColor = textFor(fill);
            return (
              <g
                key={`maj-${name}`}
                onClick={() => setKey(TONICS[majorChromas[i]], "major")}
                style={{ cursor: "pointer" }}
              >
                <circle cx={x} cy={y} r={24} fill={fill} stroke={active ? "#fff" : "#334155"} strokeWidth={active ? 3 : 1} />
                <text x={x} y={y + 5} textAnchor="middle" fontSize={16} fontWeight={700} fill={textColor}>
                  {name}
                </text>
              </g>
            );
          })}

          {MINORS.map((name, i) => {
            const { x, y } = pos(i, R_MINOR);
            const fill = minorFill(i);
            const active = !isMajorKey && i === activeIndex;
            const textColor = textFor(fill);
            return (
              <g
                key={`min-${name}`}
                onClick={() => setKey(TONICS[minorChromas[i]], "minor")}
                style={{ cursor: "pointer" }}
              >
                <circle cx={x} cy={y} r={19} fill={fill} stroke={active ? "#fff" : "#334155"} strokeWidth={active ? 3 : 1} />
                <text x={x} y={y + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill={textColor}>
                  {name}m
                </text>
              </g>
            );
          })}

          <text x={C} y={C - 6} textAnchor="middle" fontSize={11} fill="#475569">
            major
          </text>
          <text x={C} y={C + 8} textAnchor="middle" fontSize={11} fill="#475569">
            minor
          </text>
        </svg>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{scale.label}</h2>
            {chords.length > 0 && (
              <button onClick={playKeyChord} className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700">
                ▶ Tonic chord
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">{scale.notes.map((n) => n.name).join(" – ")}</p>
        </div>

        <div className="rounded-lg bg-slate-900/60 p-4 text-sm text-slate-300 ring-1 ring-slate-800">
          <p className="mb-2 font-semibold text-slate-200">How to read it</p>
          <ul className="space-y-1.5 text-xs text-slate-400">
            <li>Each step clockwise adds a sharp (a perfect fifth up); counter-clockwise adds a flat.</li>
            <li>
              <span style={{ color: FUNCTION_COLORS.Tonic }}>Green</span> is your selected key (major or
              minor). The next key <span style={{ color: FUNCTION_COLORS.Dominant }}>clockwise is its
              Dominant (V)</span> and the next <span style={{ color: FUNCTION_COLORS.Subdominant }}>
              counter-clockwise is its Subdominant (IV)</span> — these differ by just one note, so
              they're the smoothest keys to modulate to.
            </li>
            <li>
              <span style={{ color: "#22d3ee" }}>Teal</span> marks the relative key on the other ring —
              it has the exact same notes (e.g. C major ↔ A minor).
            </li>
            <li>The inner ring is each major key's relative minor.</li>
            <li>Click any key to make it the project key — every tool follows.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
