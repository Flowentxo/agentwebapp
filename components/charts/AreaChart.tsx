export default function AreaChart({
  points = [3, 4, 6, 5, 7, 9, 8, 12, 11],
  width = 420,
  height = 140,
  strokeClass = "text-[hsl(var(--accent))]",
}: {
  points?: number[];
  width?: number;
  height?: number;
  strokeClass?: string;
}) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const pad = 8;
  const H = height - pad * 2;
  const W = width - pad * 2;
  const step = W / (points.length - 1);
  const y = (v: number) => pad + H * (1 - (v - min) / (max - min || 1));
  const d = points.map((p, i) => `${i ? "L" : "M"} ${pad + i * step} ${y(p)}`).join(" ");
  const dArea = `${d} L ${pad + W} ${height - pad} L ${pad} ${height - pad} Z`;

  return (
    <svg width={width} height={height} className="opacity-90">
      <path d={dArea} className={`${strokeClass}`} fill="currentColor" opacity="0.15" />
      <path d={d} className={`${strokeClass}`} fill="none" stroke="currentColor" strokeWidth={2} />
    </svg>
  );
}
