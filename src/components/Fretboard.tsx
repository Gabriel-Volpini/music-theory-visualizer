import { useComposition } from "../store/composition";
import { chromaOf, getScale } from "../theory/scales";
import { functionColor, type NoteHighlight } from "./palette";

interface FretboardProps {
  highlights: Map<number, NoteHighlight>;
  onPick?: (chroma: number) => void;
  frets?: number;
}

const pc = (c: number) => ((c % 12) + 12) % 12;

// Standard tuning, high string (top) to low string (bottom).
const OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // E4 B3 G3 D3 A2 E2
const STRING_LABELS = ["E", "B", "G", "D", "A", "E"];
const INLAY_SINGLE = [3, 5, 7, 9, 15, 17, 19, 21];
const INLAY_DOUBLE = [12, 24];

const NUT_X = 46;
const FRET_W = 58;
const STRING_GAP = 36;
const TOP = 28;
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function fallbackName(chroma: number): string {
  return SHARP_NAMES[((chroma % 12) + 12) % 12];
}

const GRAY_BG = "#1e293b";

export default function Fretboard({ highlights, onPick, frets = 15 }: FretboardProps) {
  const { tonic, scaleType } = useComposition();
  const tonicChroma = chromaOf(tonic);
  const scaleSet = getScale(tonic, scaleType).chromaSet;
  const fnColor = (chroma: number) => functionColor(pc(chroma - tonicChroma));
  const width = NUT_X + frets * FRET_W + 16;
  const height = TOP + 5 * STRING_GAP + 36;
  const boardRight = NUT_X + frets * FRET_W;

  const fretX = (f: number) => NUT_X + f * FRET_W;
  const dotX = (f: number) => (f === 0 ? NUT_X / 2 + 8 : NUT_X + (f - 0.5) * FRET_W);
  const stringY = (s: number) => TOP + s * STRING_GAP;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full select-none"
      role="img"
      aria-label="Guitar fretboard"
    >
      {/* fretboard background */}
      <rect
        x={NUT_X}
        y={TOP - 6}
        width={boardRight - NUT_X}
        height={5 * STRING_GAP + 12}
        rx={4}
        fill="#1f160e"
      />

      {/* inlays */}
      {Array.from({ length: frets + 1 }, (_, f) => f).map((f) => {
        const cy = TOP + 2.5 * STRING_GAP;
        if (INLAY_DOUBLE.includes(f)) {
          return (
            <g key={`inlay-${f}`} fill="#4b3b2a">
              <circle cx={dotX(f)} cy={cy - STRING_GAP} r={5} />
              <circle cx={dotX(f)} cy={cy + STRING_GAP} r={5} />
            </g>
          );
        }
        if (INLAY_SINGLE.includes(f)) {
          return <circle key={`inlay-${f}`} cx={dotX(f)} cy={cy} r={5} fill="#4b3b2a" />;
        }
        return null;
      })}

      {/* fret wires */}
      {Array.from({ length: frets + 1 }, (_, f) => f).map((f) => (
        <line
          key={`fret-${f}`}
          x1={fretX(f)}
          y1={TOP - 6}
          x2={fretX(f)}
          y2={TOP + 5 * STRING_GAP + 6}
          stroke={f === 0 ? "#e5e7eb" : "#6b5640"}
          strokeWidth={f === 0 ? 5 : 2}
        />
      ))}

      {/* fret numbers */}
      {Array.from({ length: frets + 1 }, (_, f) => f).map((f) =>
        f === 0 ? null : (
          <text
            key={`num-${f}`}
            x={dotX(f)}
            y={height - 12}
            textAnchor="middle"
            fontSize={11}
            fill="#9ca3af"
          >
            {f}
          </text>
        )
      )}

      {/* strings + note dots */}
      {OPEN_MIDI.map((open, s) => {
        const y = stringY(s);
        const openChroma = open % 12;
        const labelColor = scaleSet.has(openChroma) ? fnColor(openChroma) : "#9ca3af";
        return (
          <g key={`string-${s}`}>
            <line
              x1={NUT_X}
              y1={y}
              x2={boardRight}
              y2={y}
              stroke="#9b8466"
              strokeWidth={1 + s * 0.4}
            />
            <text x={14} y={y + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill={labelColor}>
              {STRING_LABELS[s]}
            </text>
            {Array.from({ length: frets }, (_, f) => f + 1).map((f) => {
              const chroma = (open + f) % 12;
              const hl = highlights.get(chroma);
              const cx = dotX(f);
              const inScale = scaleSet.has(chroma);
              const fc = fnColor(chroma);
              // Three states, matching the piano: selected / in-scale / out-of-scale.
              let bg = GRAY_BG;
              let border = "#475569";
              let font = "#94a3b8";
              if (hl) {
                bg = hl.color;
                border = hl.color;
                font = "#0b0b0b";
              } else if (inScale) {
                border = fc;
                font = fc;
              }
              return (
                <g
                  key={`n-${s}-${f}`}
                  onClick={() => onPick?.(chroma)}
                  style={{ cursor: onPick ? "pointer" : "default" }}
                  opacity={hl?.dim ? 0.5 : hl || inScale ? 1 : 0.5}
                >
                  {hl?.ring && <circle cx={cx} cy={y} r={15} fill="none" stroke="#fff" strokeWidth={2} />}
                  <circle cx={cx} cy={y} r={12} fill={bg} stroke={border} strokeWidth={2} />
                  <text x={cx} y={y + 4} textAnchor="middle" fontSize={10} fontWeight={600} fill={font}>
                    {hl?.label ?? fallbackName(chroma)}
                  </text>
                  {hl?.sub && (
                    <text x={cx} y={y - 17} textAnchor="middle" fontSize={9} fill="#cbd5e1">
                      {hl.sub}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
