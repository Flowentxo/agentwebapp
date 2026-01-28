import { ChartMini } from "@/components/ChartMini"

export default function Metric({
  label,
  value,
  trend,
}: {
  label: string
  value: string
  trend?: number[]
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-card/5 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
          <div className="text-sm font-semibold">{value}</div>
        </div>
        {trend && trend.length > 0 && (
          <ChartMini
            data={trend}
            width={40}
            height={16}
            className="text-[hsl(var(--accent))]"
          />
        )}
      </div>
    </div>
  )
}
