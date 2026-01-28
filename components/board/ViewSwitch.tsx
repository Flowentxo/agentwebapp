"use client";

import { LayoutGrid, Tag } from "lucide-react";
import { ViewMode } from "@/types/board";

interface ViewSwitchProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewSwitch({ currentView, onViewChange }: ViewSwitchProps) {
  const views: Array<{ mode: ViewMode; label: string; icon: React.ComponentType<any> }> = [
    { mode: "status", label: "Nach Status", icon: LayoutGrid },
    { mode: "tags", label: "Nach Tags", icon: Tag },
  ];

  return (
    <div
      className="inline-flex gap-1 rounded-xl bg-card/5 p-1 ring-1 ring-white/10"
      role="radiogroup"
      aria-label="Board-Ansicht"
    >
      {views.map(({ mode, label, icon: Icon }) => {
        const isActive = currentView === mode;
        return (
          <button
            key={mode}
            onClick={() => onViewChange(mode)}
            className={`
              rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2
              ${
                isActive
                  ? "bg-accent/20 text-accent ring-1 ring-accent/40"
                  : "text-text-muted hover:bg-card/5 hover:text-text"
              }
            `}
            role="radio"
            aria-checked={isActive}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
