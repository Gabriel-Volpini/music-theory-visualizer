import { useMemo } from "react";
import { useComposition } from "../../store/composition";
import { chromaOf, getScale } from "../../theory/scales";
import { suggestModulations } from "../../theory/modulation";
import { FUNCTION_COLORS } from "../palette";

/** Tint a destination by its harmonic function, matching the rest of the app. */
function relationshipColor(rel: string): string {
  if (/dominant/i.test(rel)) return FUNCTION_COLORS.Dominant; // red
  if (/subdominant/i.test(rel)) return FUNCTION_COLORS.Subdominant; // orange
  if (/relative|parallel/i.test(rel)) return FUNCTION_COLORS.Tonic; // green
  return "#7dd3fc"; // sky — bVII, bVI, mediant, supertonic, etc.
}

// SVG geometry.
const VB_W = 760;
const ROW_H = 78;
const PAD_Y = 16;
const SRC_X = 20;
const SRC_W = 150;
const SRC_H = 58;
const TGT_X = 512;
const TGT_W = 228;
const TGT_H = 56;
const SRC_RIGHT = SRC_X + SRC_W;
const MID_X = (SRC_RIGHT + TGT_X) / 2;

export default function ModulationFlow() {
  const { tonic, scaleType, modPreview, setModPreview, setKey } = useComposition();

  const source = useMemo(() => getScale(tonic, scaleType), [tonic, scaleType]);
  const targets = useMemo(() => suggestModulations(tonic, scaleType), [tonic, scaleType]);

  const rows = targets.length;
  const height = Math.max(rows * ROW_H + PAD_Y * 2, 220);
  const srcCY = height / 2;

  const isActive = (t: { tonic: string; type: string }) =>
    modPreview != null && chromaOf(modPreview.tonic) === chromaOf(t.tonic) && modPreview.type === t.type;
  const preview = (t: { tonic: string; type: string }) =>
    setModPreview(isActive(t) ? null : { tonic: t.tonic, type: t.type });

  return (
    <svg viewBox={`0 0 ${VB_W} ${height}`} className="w-full select-none" role="img" aria-label="Modulation flow chart">
      {/* connectors first so nodes sit on top */}
      {targets.map((t, i) => {
        const tgtCY = PAD_Y + i * ROW_H + ROW_H / 2;
        const d = `M ${SRC_RIGHT} ${srcCY} C ${MID_X} ${srcCY}, ${MID_X} ${tgtCY}, ${TGT_X} ${tgtCY}`;
        const color = relationshipColor(t.relationship);
        const active = isActive(t);
        return (
          <path
            key={`p-${t.tonic}-${t.type}`}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={active ? 3 : 1.5}
            strokeOpacity={active ? 0.95 : 0.45}
          />
        );
      })}

      {/* pivot-chord pill at the midpoint of each connector */}
      {targets.map((t, i) => {
        const tgtCY = PAD_Y + i * ROW_H + ROW_H / 2;
        const midY = (srcCY + tgtCY) / 2;
        const pivot = t.pivots[0];
        const label = pivot ? pivot.name : "phrase";
        const sub = pivot ? `${pivot.sourceRoman}→${pivot.targetRoman}` : "no pivot";
        const w = 86;
        return (
          <g key={`pill-${t.tonic}-${t.type}`}>
            <rect x={MID_X - w / 2} y={midY - 16} width={w} height={32} rx={6} fill="#1e293b" stroke="#334155" />
            <text x={MID_X} y={midY - 1} textAnchor="middle" fontSize={12} fontWeight={700} fill="#e2e8f0">
              {pivot ? `via ${label}` : label}
            </text>
            <text x={MID_X} y={midY + 11} textAnchor="middle" fontSize={9} fill="#94a3b8">
              {sub}
            </text>
          </g>
        );
      })}

      {/* source node */}
      <g>
        <rect
          x={SRC_X}
          y={srcCY - SRC_H / 2}
          width={SRC_W}
          height={SRC_H}
          rx={10}
          fill="#0f172a"
          stroke={FUNCTION_COLORS.Tonic}
          strokeWidth={2.5}
        />
        <text x={SRC_X + SRC_W / 2} y={srcCY - 4} textAnchor="middle" fontSize={9} fill="#64748b">
          You are here
        </text>
        <text x={SRC_X + SRC_W / 2} y={srcCY + 13} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fff">
          {source.label}
        </text>
      </g>

      {/* target nodes */}
      {targets.map((t, i) => {
        const tgtCY = PAD_Y + i * ROW_H + ROW_H / 2;
        const color = relationshipColor(t.relationship);
        const active = isActive(t);
        return (
          <g
            key={`n-${t.tonic}-${t.type}`}
            onClick={() => preview(t)}
            onDoubleClick={() => setKey(t.tonic, t.type)}
            style={{ cursor: "pointer" }}
          >
            <title>{`${t.relationship} · ${t.sharedCount}/7 shared notes — click to preview, double-click to switch`}</title>
            <rect
              x={TGT_X}
              y={tgtCY - TGT_H / 2}
              width={TGT_W}
              height={TGT_H}
              rx={10}
              fill={active ? "#0c2233" : "#0f172a"}
              stroke={active ? "#fff" : color}
              strokeWidth={active ? 3 : 2}
            />
            <text x={TGT_X + 14} y={tgtCY - 4} fontSize={14} fontWeight={700} fill="#fff">
              {t.label}
            </text>
            <text x={TGT_X + 14} y={tgtCY + 13} fontSize={10} fill={color}>
              {t.relationship}
            </text>
            <text x={TGT_X + TGT_W - 12} y={tgtCY + 4} textAnchor="end" fontSize={10} fill="#64748b">
              {t.sharedCount}/7
            </text>
          </g>
        );
      })}
    </svg>
  );
}
