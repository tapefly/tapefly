/* A published design drawn as a small blueprint: the 9×9 grid around the core,
   each part a tile coloured by what it does, each nerve a line. Pure SVG, so it
   renders on the server with no canvas. */
import { GRID, PARTS, isWing, type Design } from "@/sim/workshop/parts";

const FILL = (k: string) =>
  k === "core" ? "#f2b64b" : isWing(k as never) ? "#dfe7ef" : PARTS[k as keyof typeof PARTS]?.sense ? "#73f5c1" : PARTS[k as keyof typeof PARTS]?.brain ? "#b99cff" : "#5b7b80";

export default function DesignGlyph({ design, size = 160 }: { design: Design; size?: number }) {
  const n = GRID * 2 + 1;
  const c = size / n;
  const at = (id: string) => {
    const p = design.parts.find((q) => q.id === id);
    return p ? [(p.x + GRID + 0.5) * c, (p.y + GRID + 0.5) * c] : [0, 0];
  };
  return (
    <svg className="wg-glyph" viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="design blueprint">
      <rect width={size} height={size} rx={10} fill="#081c21" />
      {Array.from({ length: n + 1 }, (_, i) => (
        <g key={i} stroke="rgba(255,255,255,0.05)">
          <line x1={i * c} y1={0} x2={i * c} y2={size} />
          <line x1={0} y1={i * c} x2={size} y2={i * c} />
        </g>
      ))}
      {design.wires.map((w, i) => {
        const [x1, y1] = at(w.from), [x2, y2] = at(w.to);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={w.inv ? "#ff8a8f" : "#b99cff"} strokeWidth={1.4} strokeDasharray={w.inv ? "3 2" : undefined} opacity={0.85} />;
      })}
      {design.parts.map((p) => (
        <rect key={p.id} x={(p.x + GRID) * c + c * 0.12} y={(p.y + GRID) * c + c * 0.12} width={c * 0.76} height={c * 0.76} rx={c * 0.18} fill={FILL(p.kind)} opacity={p.kind === "body" ? 0.8 : 1} />
      ))}
    </svg>
  );
}
