import type { CurvePoint } from "../../types/models";
import { clamp } from "../../utils/math";

function buildPath(points: CurvePoint[]) {
  return points
    .sort((left, right) => left.x - right.x)
    .map((point, index) => {
      const x = point.x * 100;
      const y = (1 - point.y) * 100;
      return `${index === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");
}

export function CurveEditor({
  points,
  onChange,
}: {
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
}) {
  return (
    <svg className="curve-editor" viewBox="0 0 100 100">
      <path d="M 0,100 L 100,0" stroke="rgba(148,163,184,0.5)" fill="none" strokeDasharray="4 4" />
      <path d={buildPath(points)} stroke="#f97316" fill="none" strokeWidth="2" />
      {points.map((point, index) => {
        const x = point.x * 100;
        const y = (1 - point.y) * 100;
        const locked = index === 0 || index === points.length - 1;

        return (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={x}
            cy={y}
            r={locked ? 3 : 4.5}
            fill={locked ? "#cbd5e1" : "#38bdf8"}
            onPointerDown={(event) => {
              if (locked) {
                return;
              }

              event.preventDefault();

              function onMove(moveEvent: PointerEvent) {
                const svg = (event.target as SVGCircleElement).ownerSVGElement;
                if (!svg) {
                  return;
                }

                const rect = svg.getBoundingClientRect();
                const nextX = clamp((moveEvent.clientX - rect.left) / rect.width, 0.01, 0.99);
                const nextY = clamp(1 - (moveEvent.clientY - rect.top) / rect.height, 0.01, 0.99);
                const nextPoints = points.map((current, currentIndex) =>
                  currentIndex === index ? { x: nextX, y: nextY } : current,
                );
                onChange(nextPoints.sort((left, right) => left.x - right.x));
              }

              function onUp() {
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
              }

              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            }}
          />
        );
      })}
    </svg>
  );
}
