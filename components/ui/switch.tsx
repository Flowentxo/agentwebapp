"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  className,
}: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  return (
    <label className={cn("relative inline-flex h-5 w-9 cursor-pointer items-center", className)}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
      />
      <div className="peer h-5 w-9 rounded-full bg-card/10 ring-1 ring-white/10 transition peer-checked:bg-[hsl(var(--primary))]/30 peer-checked:ring-[hsl(var(--primary))]/50" />
      <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-card/70 transition peer-checked:translate-x-4 peer-checked:bg-[hsl(var(--primary))]" />
    </label>
  );
}
