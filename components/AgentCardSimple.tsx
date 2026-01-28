"use client";
import Link from "next/link";
import { Agent } from "@/data/agents";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Square, Play, Copy, Trash2 } from "lucide-react";

// Minimal KPI component with tooltip
function Kpi({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div className="rounded-xl border border-white/12 bg-card/5 p-3" title={tooltip}>
      <div className="text-[11px] uppercase tracking-wide text-white/60">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-white/90">{value}</div>
    </div>
  );
}

export function AgentCardSimple({ agent }: { agent: Agent }) {
  const href = `/agents/${agent.id}`;
  const isActive = agent.status === "active";

  return (
    <div
      className="rounded-2xl border border-white/12 bg-card/5 backdrop-blur-sm p-4 shadow-lg transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-xl"
      data-test="agent-card"
    >
      {/* Header: Name + Description + Overflow Menu */}
      <div className="flex items-start gap-3">
        <Link
          href={href}
          prefetch={false}
          className="group flex-1 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/50 rounded-lg"
          aria-label={`Details zu ${agent.name} anzeigen`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-2 w-2 shrink-0 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-zinc-500'}`}
              aria-label={isActive ? "Aktiv" : "Gestoppt"}
            />
            <h3 className="text-base font-medium text-white/90 group-hover:text-white group-hover:underline transition">
              {agent.name}
            </h3>
          </div>
          <p className="mt-1 text-[13px] text-white/65 line-clamp-1">
            {agent.description}
          </p>
        </Link>

        {/* Overflow Menu for Secondary Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-lg p-2 text-white/60 hover:bg-card/10 hover:text-white/90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/50"
              aria-label="Weitere Aktionen"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => console.log('Toggle agent', agent.id)}>
              {isActive ? <Square className="mr-2 h-3.5 w-3.5" /> : <Play className="mr-2 h-3.5 w-3.5" />}
              {isActive ? 'Agent stoppen' : 'Agent starten'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log('Clone agent', agent.id)}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Duplizieren
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log('Delete agent', agent.id)} className="text-rose-300 focus:text-rose-200">
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 3 Core KPIs (statt 4 Boxen) */}
      {agent.kpis && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Kpi
            label="Anfragen"
            value={agent.kpis.requests.toLocaleString()}
            tooltip="Anzahl bearbeiteter Anfragen"
          />
          <Kpi
            label="Erfolg"
            value={`${agent.kpis.success}%`}
            tooltip="Anteil erfolgreicher Antworten"
          />
          <Kpi
            label="Ø Zeit"
            value={`${agent.kpis.avgTime.toFixed(2)} s`}
            tooltip="Durchschnittliche Bearbeitungszeit"
          />
        </div>
      )}

      {/* Tags + Primary CTA */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs text-white/60">
          {agent.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-lg border border-white/10 bg-card/5 px-2 py-1"
            >
              #{t}
            </span>
          ))}
          {agent.tags.length > 3 && (
            <span className="text-white/40">+{agent.tags.length - 3}</span>
          )}
        </div>
        <Button
          asChild
          className="ml-auto shrink-0 focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/50"
          aria-label={`Details zu ${agent.name} öffnen`}
        >
          <Link href={href} prefetch={false}>Details öffnen →</Link>
        </Button>
      </div>
    </div>
  );
}
