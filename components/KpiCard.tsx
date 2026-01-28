import { cva, type VariantProps } from "class-variance-authority";
import { ChartMini } from "@/components/ChartMini";
import { cn } from "@/lib/utils";

const kpiVariants = cva(
  "rounded-2xl border p-4 bg-card/5 ring-1 ring-inset",
  {
    variants: {
      variant: {
        neutral: "border-white/10 ring-white/10",
        success: "border-emerald-400/20 ring-emerald-400/25",
        warn: "border-amber-400/20 ring-amber-400/25",
        error: "border-rose-500/20 ring-rose-500/25",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

type Props = VariantProps<typeof kpiVariants> & {
  label: string;
  value: string;
  delta?: string; // z.B. "+2.1%"
  points?: number[];
};

export default function KpiCard({ label, value, delta, points, variant }: Props) {
  return (
    <div className={cn(kpiVariants({ variant }))}>
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
        {delta && <div className="text-xs text-white/70">{delta}</div>}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {points && points.length > 0 && (
        <div className="mt-2 text-white/70">
          <ChartMini data={points} width={160} height={40} />
        </div>
      )}
    </div>
  );
}
