import { cn } from "@/lib/utils"

export default function Kbd({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <kbd
      className={cn(
        "rounded-md border border-white/15 bg-card/5 px-1.5 py-0.5 text-[10px] font-medium text-white/70",
        className
      )}
    >
      {children}
    </kbd>
  )
}
