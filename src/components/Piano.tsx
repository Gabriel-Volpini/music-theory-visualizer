import { useComposition } from "../store/composition";
import { chromaOf, getScale } from "../theory/scales";
import { functionColor, type NoteHighlight } from "./palette";

interface PianoProps {
  highlights: Map<number, NoteHighlight>;
  onPick?: (chroma: number) => void;
  /** Number of octaves to draw, starting at C. */
  octaves?: number;
  /** Plain mode: only highlighted notes get a circle, no scale context (Interval tab). */
  plain?: boolean;
}

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_CHROMAS = [0, 2, 4, 5, 7, 9, 11];
const BLACK = [
  { chroma: 1, after: 0 },
  { chroma: 3, after: 1 },
  { chroma: 6, after: 3 },
  { chroma: 8, after: 4 },
  { chroma: 10, after: 5 },
];

const WHITE_W = 40;
const WHITE_H = 150;
const BLACK_W = 26;
const BLACK_H = 95;
const TOP = 12;
const GRAY_BG = "#1e293b";
const pc = (c: number) => ((c % 12) + 12) % 12;

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export default function Piano({ highlights, onPick, octaves = 1, plain }: PianoProps) {
  const { tonic, scaleType } = useComposition();
  const tonicChroma = chromaOf(tonic);
  const scale = getScale(tonic, scaleType);
  const scaleSet = scale.chromaSet;
  const fnColor = (chroma: number) => functionColor(pc(chroma - tonicChroma));

  // Scale-degree numeral (I, II, III…) for each note in the scale.
  const degreeOf = new Map<number, string>();
  scale.notes.forEach((n, i) => degreeOf.set(n.chroma, ROMAN[i] ?? String(i + 1)));

  const whitesPerOctave = 7;
  const totalWhites = octaves * whitesPerOctave;
  const width = totalWhites * WHITE_W + 4;
  const height = TOP + WHITE_H + 8;

  // The note circle for a key — three states: selected / in-scale / out-of-scale.
  const renderCircle = (chroma: number, cx: number, isWhite: boolean) => {
    const hl = highlights.get(chroma);
    if (!hl && plain) return null;

    const inScale = scaleSet.has(chroma);
    const fc = fnColor(chroma);
    let bg = GRAY_BG;
    let border = "#475569";
    let font = "#64748b";
    if (hl) {
      bg = hl.color;
      border = hl.color;
      font = "#0b0b0b";
    } else if (inScale) {
      border = fc;
      font = fc;
    }

    const cy = isWhite ? TOP + WHITE_H - 26 : TOP + BLACK_H - 20;
    const degree = !plain && inScale ? degreeOf.get(chroma) : undefined;
    return (
      <g
        key={`c-${cx}`}
        onClick={() => onPick?.(chroma)}
        style={{ cursor: onPick ? "pointer" : "default" }}
        opacity={hl?.dim ? 0.55 : 1}
      >
        {degree && (
          <text
            x={cx}
            y={isWhite ? TOP + 13 : TOP + 12}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            fill={isWhite ? "#64748b" : "#cbd5e1"}
          >
            {degree}
          </text>
        )}
        {hl?.ring && <circle cx={cx} cy={cy} r={15} fill="none" stroke={isWhite ? "#111" : "#fff"} strokeWidth={2} />}
        <circle cx={cx} cy={cy} r={12} fill={bg} stroke={border} strokeWidth={2} />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fontWeight={600} fill={font}>
          {hl?.label ?? SHARP_NAMES[chroma]}
        </text>
        {hl?.sub && (
          <text x={cx} y={cy - 17} textAnchor="middle" fontSize={9} fill={isWhite ? "#475569" : "#cbd5e1"}>
            {hl.sub}
          </text>
        )}
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full select-none" role="img" aria-label="Piano keyboard">
      {/* white keys */}
      {Array.from({ length: totalWhites }, (_, i) => i).map((i) => {
        const chroma = WHITE_CHROMAS[i % 7];
        const x = i * WHITE_W + 2;
        return (
          <rect
            key={`w-${i}`}
            x={x}
            y={TOP}
            width={WHITE_W - 2}
            height={WHITE_H}
            rx={4}
            fill="#e2e8f0"
            stroke="none"
            onClick={() => onPick?.(chroma)}
            style={{ cursor: onPick ? "pointer" : "default" }}
          />
        );
      })}

      {/* white-key note circles */}
      {Array.from({ length: totalWhites }, (_, i) => i).map((i) => {
        const chroma = WHITE_CHROMAS[i % 7];
        const cx = i * WHITE_W + 2 + WHITE_W / 2;
        return renderCircle(chroma, cx, true);
      })}

      {/* black keys */}
      {Array.from({ length: octaves }, (_, oct) => oct).map((oct) =>
        BLACK.map((b) => {
          const whiteIndex = oct * 7 + b.after;
          const x = whiteIndex * WHITE_W + 2 + WHITE_W - BLACK_W / 2;
          return (
            <rect
              key={`b-${oct}-${b.chroma}`}
              x={x}
              y={TOP}
              width={BLACK_W}
              height={BLACK_H}
              rx={3}
              fill="#111827"
              stroke="none"
              onClick={() => onPick?.(b.chroma)}
              style={{ cursor: onPick ? "pointer" : "default" }}
            />
          );
        })
      )}

      {/* black-key note circles */}
      {Array.from({ length: octaves }, (_, oct) => oct).map((oct) =>
        BLACK.map((b) => {
          const whiteIndex = oct * 7 + b.after;
          const cx = whiteIndex * WHITE_W + 2 + WHITE_W;
          return <g key={`bc-${oct}-${b.chroma}`}>{renderCircle(b.chroma, cx, false)}</g>;
        })
      )}
    </svg>
  );
}
