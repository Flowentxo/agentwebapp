export default function BarChart({
  values = [12, 9, 14, 8, 6, 10, 15, 11],
  width = 420,
  height = 140,
}: {
  values?: number[];
  width?: number;
  height?: number;
}) {
  const max = Math.max(...values, 1);
  const pad = 8;
  const H = height - pad * 2;
  const W = width - pad * 2;
  const bw = W / values.length - 6;

  return (
    <svg width={width} height={height}>
      {values.map((v, i) => {
        const h = (v / max) * H;
        const x = pad + i * (bw + 6);
        const y = pad + (H - h);
        return <rect key={i} x={x} y={y} width={bw} height={h} className="fill-[hsl(var(--primary))]" opacity="0.7" rx={6} />;
      })}
    </svg>
  );
}
