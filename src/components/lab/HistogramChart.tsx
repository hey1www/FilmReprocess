import type { HistogramBins } from "../../types/models";

function toPath(values: number[], width: number, height: number) {
  const maxValue = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / maxValue) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function HistogramChart({ histogram }: { histogram: HistogramBins | null }) {
  if (!histogram) {
    return <div className="histogram histogram--empty" />;
  }

  return (
    <svg className="histogram" viewBox="0 0 320 120" preserveAspectRatio="none">
      <path d={toPath(histogram.red, 320, 120)} stroke="#ef4444" fill="none" strokeWidth="2" />
      <path d={toPath(histogram.green, 320, 120)} stroke="#22c55e" fill="none" strokeWidth="2" />
      <path d={toPath(histogram.blue, 320, 120)} stroke="#3b82f6" fill="none" strokeWidth="2" />
      <path d={toPath(histogram.luminance, 320, 120)} stroke="#f8fafc" fill="none" strokeWidth="1.5" />
    </svg>
  );
}
