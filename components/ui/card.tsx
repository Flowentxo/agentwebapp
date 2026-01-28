import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Premium Glass Card - Enterprise Design System
 *
 * Philosophy:
 * - Semi-transparent backgrounds with backdrop blur
 * - Ultra-subtle borders (white/5-8%)
 * - Glow effects on hover instead of hard border changes
 * - No accent bars by default - cleaner look
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Premium Glass: Semi-transparent with blur
        "relative rounded-xl overflow-hidden transition-all duration-300",
        // Glass effect
        "bg-card backdrop-blur-xl",
        // Whisper-thin border
        "border border-white/[0.06]",
        // Subtle inner glow
        "ring-1 ring-inset ring-white/[0.02]",
        // Hover: Glow effect instead of border change
        "hover:ring-primary/10 hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]",
        className
      )}
      {...props}
    />
  )
}

// Premium KPI Card - For dashboard metrics
// Large numbers, prominent display, trend indicators
export function KpiCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Premium Glass base
        "group relative rounded-xl overflow-hidden transition-all duration-300",
        "bg-zinc-900/40 backdrop-blur-xl",
        "border border-white/[0.05]",
        // Subtle gradient overlay for depth
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/[0.02] before:to-transparent before:pointer-events-none",
        // Hover: Purple glow
        "hover:border-primary/20 hover:shadow-[0_8px_40px_rgba(139,92,246,0.12)]",
        className
      )}
      {...props}
    />
  )
}

// Variant with vibrant accent bar - Use sparingly for emphasis
export function VibrantCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Premium Glass base
        "relative rounded-xl overflow-hidden transition-all duration-300",
        "bg-card backdrop-blur-xl",
        "border border-white/[0.06]",
        // Hover glow
        "hover:border-primary/20 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)]",
        className
      )}
      {...props}
    >
      {/* Top accent gradient - subtle glow effect */}
      <div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />
      {props.children}
    </div>
  )
}

// Glass Panel - For sections and containers
export function GlassPanel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "bg-zinc-900/30 backdrop-blur-2xl",
        "border border-white/[0.04]",
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pb-0", className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold text-foreground tracking-tight", className)} {...props} />
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground leading-relaxed", className)} {...props} />
  )
}
