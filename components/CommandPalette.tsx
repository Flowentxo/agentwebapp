"use client";
import * as React from "react";
import { useUI } from "@/store/ui";
import { Search, TrendingUp, Settings, Zap } from "lucide-react";

export function CommandPalette() {
  const { commandOpen, closeCommand } = useUI();
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!commandOpen) setSearch("");

    // ESC key handler
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && commandOpen) {
        closeCommand();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [commandOpen, closeCommand]);

  const suggestions = [
    { icon: TrendingUp, label: "Übersicht Dashboard", tag: "Navigation" },
    { icon: Zap, label: "Neuen Workflow starten", tag: "Aktion" },
    { icon: Settings, label: "Einstellungen öffnen", tag: "Navigation" },
  ].filter((s) => s.label.toLowerCase().includes(search.toLowerCase()));

  if (!commandOpen) return null;

  return (
    <div
      data-overlay-root
      data-overlay-open="true"
      className="fixed inset-0 z-50 pointer-events-auto"
      aria-hidden="false"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeCommand}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-[20vh] w-full max-w-2xl -translate-x-1/2 rounded-2xl border border-white/10 bg-[hsl(var(--card))] shadow-2xl pointer-events-auto z-10">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-5 w-5 text-white/40" />
          <input
            autoFocus
            type="text"
            placeholder="Suche oder gib einen Befehl ein…"
            className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <kbd className="rounded border border-white/20 px-2 py-1 text-xs text-white/60">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {suggestions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-white/40">
              Keine Ergebnisse
            </div>
          ) : (
            <div className="space-y-1">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-card/5"
                  onClick={closeCommand}
                >
                  <s.icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                  <span className="flex-1 text-sm text-white">{s.label}</span>
                  <span className="text-xs text-white/40">{s.tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
