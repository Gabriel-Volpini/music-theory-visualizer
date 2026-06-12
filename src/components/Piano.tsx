import { useComposition } from "../store/composition";
import { chromaOf } from "../theory/scales";
import { functionColor, type NoteHighlight } from "./palette";

interface PianoProps {
  highlights: Map<number, NoteHighlight>;
  onPick?: (chroma: number) => void;
  /** Number of octaves to draw, starting at C. */
  octaves?: number;
}

const pc = (c: number) => ((c % 12) + 12) % 12;

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// Which chromas are black keys, and their visual offset within an octave.
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

function fallbackName(chroma: number): string {
  return SHARP_NAMES[((chroma % 12) + 12) % 12];
}

export default function Piano({ highlights, onPick, octaves = 2 }: PianoProps) {
  const { tonic } = useComposition();
  const tonicChroma = chromaOf(tonic);
  const fnColor = (chroma: number) => functionColor(pc(chroma - tonicChroma));
  const whitesPerOctave = 7;
  const totalWhites = octaves * whitesPerOctave;
  const width = totalWhites * WHITE_W + 4;
  const height = TOP + WHITE_H + 8;

  const renderKeyLabel = (chroma: number, cx: number, isWhite: boolean) => {
    const hl = highlights.get(chroma);
    if (!hl) return null;
    const cy = isWhite ? TOP + WHITE_H - 26 : TOP + BLACK_H - 20;
    return (
      <g
        key={`lbl-${cx}`}
        onClick={() => onPick?.(chroma)}
        style={{ cursor: onPick ? "pointer" : "default" }}
        opacity={hl.dim ? 0.55 : 1}
      >
        {hl.ring && (
          <circle cx={cx} cy={cy} r={15} fill="none" stroke={isWhite ? "#111" : "#fff"} strokeWidth={2} />
        )}
        <circle cx={cx} cy={cy} r={12} fill={hl.color} />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="#0b0b0b">
          {hl.label ?? fallbackName(chroma)}
        </text>
        {hl.sub && (
          <text x={cx} y={cy - 17} textAnchor="middle" fontSize={9} fill={isWhite ? "#475569" : "#cbd5e1"}>
            {hl.sub}
          </text>
        )}
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full select-none"
      role="img"
      aria-label="Piano keyboard"
    >
      {/* white keys */}
      {Array.from({ length: totalWhites }, (_, i) => i).map((i) => {
        const chroma = WHITE_CHROMAS[i % 7];
        const x = i * WHITE_W + 2;
        const hl = highlights.get(chroma);
        return (
          <rect
            key={`w-${i}`}
            x={x}
            y={TOP}
            width={WHITE_W - 2}
            height={WHITE_H}
            rx={4}
            fill={hl && !hl.dim ? "#f8fafc" : "#e2e8f0"}
            stroke={fnColor(chroma)}
            strokeWidth={2.5}
            onClick={() => onPick?.(chroma)}
            style={{ cursor: onPick ? "pointer" : "default" }}
          />
        );
      })}

      {/* white-key note dots */}
      {Array.from({ length: totalWhites }, (_, i) => i).map((i) => {
        const chroma = WHITE_CHROMAS[i % 7];
        const cx = i * WHITE_W + 2 + WHITE_W / 2;
        return renderKeyLabel(chroma, cx, true);
      })}

      {/* black keys */}
      {Array.from({ length: octaves }, (_, oct) => oct).map((oct) =>
        BLACK.map((b) => {
          const whiteIndex = oct * 7 + b.after;
          const x = whiteIndex * WHITE_W + 2 + WHITE_W - BLACK_W / 2;
          const hl = highlights.get(b.chroma);
          return (
            <rect
              key={`b-${oct}-${b.chroma}`}
              x={x}
              y={TOP}
              width={BLACK_W}
              height={BLACK_H}
              rx={3}
              fill={hl && !hl.dim ? "#334155" : "#111827"}
              stroke={fnColor(b.chroma)}
              strokeWidth={2.5}
              onClick={() => onPick?.(b.chroma)}
              style={{ cursor: onPick ? "pointer" : "default" }}
            />
          );
        })
      )}

      {/* black-key note dots (only the first octave's, to avoid clutter we draw all) */}
      {Array.from({ length: octaves }, (_, oct) => oct).map((oct) =>
        BLACK.map((b) => {
          const whiteIndex = oct * 7 + b.after;
          const cx = whiteIndex * WHITE_W + 2 + WHITE_W;
          return <g key={`bl-${oct}-${b.chroma}`}>{renderKeyLabel(b.chroma, cx, false)}</g>;
        })
      )}
    </svg>
  );
}
