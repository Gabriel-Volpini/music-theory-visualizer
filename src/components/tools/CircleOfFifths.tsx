import { useComposition } from "../../store/composition";
import { TONICS, chromaOf } from "../../theory/scales";
import { FUNCTION_COLORS } from "../palette";

// Clockwise by fifths, conventional spellings for readability.
const MAJORS = ["C", "G", "D", "A", "E", "B", "Gb", "Db", "Ab", "Eb", "Bb", "F"];
const MINORS = ["A", "E", "B", "F#", "C#", "G#", "Eb", "Bb", "F", "C", "G", "D"];
const MAJOR_FAMILY = new Set(["major", "lydian", "mixolydian"]);

const SIZE = 360;
const C = SIZE / 2;
const R_MAJOR = 150;
const R_MINOR = 96;

export const PREVIEW_RING = "#f59e0b"; // amber — the key being previewed on the keyboard

/** The circle-of-fifths wheel. Clicking a key previews modulating there (shared store). */
export default function CircleOfFifths() {
  const { tonic, scaleType, modPreview, setModPreview, setKey } = useComposition();
  const tonicChroma = chromaOf(tonic);
  const isMajorKey = MAJOR_FAMILY.has(scaleType);

  // Click a key to preview modulating there on the keyboard below (toggle off if re-clicked).
  const preview = (chroma: number, type: "major" | "minor") => {
    const t = TONICS[chroma];
    if (modPreview && modPreview.tonic === t && modPreview.type === type) setModPreview(null);
    else setModPreview({ tonic: t, type });
  };
  // Double-click commits: switch the active scale to that key.
  const commit = (chroma: number, type: "major" | "minor") => setKey(TONICS[chroma], type);
  const isPreview = (chroma: number, type: "major" | "minor") =>
    modPreview != null && chromaOf(modPreview.tonic) === chroma && modPreview.type === type;

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

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-md select-none" role="img" aria-label="Circle of fifths">
      <circle cx={C} cy={C} r={R_MAJOR + 26} fill="none" stroke="#1e293b" strokeWidth={1} />
      <circle cx={C} cy={C} r={R_MINOR + 22} fill="none" stroke="#1e293b" strokeWidth={1} />

      {MAJORS.map((name, i) => {
        const { x, y } = pos(i, R_MAJOR);
        const fill = majorFill(i);
        const active = isMajorKey && i === activeIndex;
        const previewing = isPreview(majorChromas[i], "major");
        const textColor = textFor(fill);
        return (
          <g
            key={`maj-${name}`}
            onClick={() => preview(majorChromas[i], "major")}
            onDoubleClick={() => commit(majorChromas[i], "major")}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={x}
              cy={y}
              r={24}
              fill={fill}
              stroke={active ? "#fff" : previewing ? PREVIEW_RING : "#334155"}
              strokeWidth={active || previewing ? 3 : 1}
              strokeDasharray={previewing ? "4 3" : undefined}
            />
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
        const previewing = isPreview(minorChromas[i], "minor");
        const textColor = textFor(fill);
        return (
          <g
            key={`min-${name}`}
            onClick={() => preview(minorChromas[i], "minor")}
            onDoubleClick={() => commit(minorChromas[i], "minor")}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={x}
              cy={y}
              r={19}
              fill={fill}
              stroke={active ? "#fff" : previewing ? PREVIEW_RING : "#334155"}
              strokeWidth={active || previewing ? 3 : 1}
              strokeDasharray={previewing ? "4 3" : undefined}
            />
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
  );
}
