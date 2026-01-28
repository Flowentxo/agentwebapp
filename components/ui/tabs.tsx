"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

const TabsContext = React.createContext<{ value: string; onValueChange: (v: string) => void } | undefined>(undefined);

export function Tabs({ value, onValueChange, children, className }:{
  value: string; onValueChange: (v:string)=>void; children: React.ReactNode; className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("w-full", className)} data-value={value}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }:{ children: React.ReactNode; className?: string }) {
  const context = React.useContext(TabsContext);

  // Clone children and inject current and onClick props
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === TabsTrigger) {
      return React.cloneElement(child as React.ReactElement<any>, {
        current: context?.value,
        onClick: context?.onValueChange
      });
    }
    return child;
  });

  return <div className={cn("inline-flex gap-2 rounded-xl bg-card/5 p-1 ring-1 ring-white/10", className)}>{enhancedChildren}</div>;
}

export function TabsTrigger({ value, current, onClick, children, className }:{
  value: string; current?: string; onClick?: (v:string)=>void; children: React.ReactNode; className?: string;
}) {
  const active = current===value;
  return (
    <button
      onClick={()=>onClick?.(value)}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-[hsl(var(--primary))]/20 text-white ring-1 ring-[hsl(var(--ring))]/40"
          : "text-white/70 hover:bg-card/5",
        className
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, when, current, children, className }:{
  value?: string; when?: string; current?: string; children: React.ReactNode; className?: string;
}) {
  const context = React.useContext(TabsContext);
  const targetValue = value ?? when;
  const currentValue = current ?? context?.value;

  if (currentValue !== targetValue) return null;
  return <div className={cn("mt-4", className)}>{children}</div>;
}
