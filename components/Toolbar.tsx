"use client"

import { LayoutGrid, Table, ChevronDown, MoreVertical, Plus, Save, Download, RefreshCw } from "lucide-react"
import { useState } from "react"
import { type SortKey } from "./AgentFilters"

type ViewMode = "cards" | "table"

export default function Toolbar({
  view,
  onViewChange,
  sort,
  onSortChange,
  onlyActive,
  onActiveToggle,
  onSaveView,
  onSyncApi,
  canCreate,
  onCreate,
  showDensity,
  showColumns,
  densitySlot,
  columnsSlot,
}: {
  view: ViewMode
  onViewChange: (v: ViewMode) => void
  sort: SortKey
  onSortChange: (s: SortKey) => void
  onlyActive: boolean
  onActiveToggle: () => void
  onSaveView?: () => void
  onSyncApi?: () => void
  canCreate?: boolean
  onCreate?: () => void
  showDensity?: boolean
  showColumns?: boolean
  densitySlot?: React.ReactNode
  columnsSlot?: React.ReactNode
}) {
  const [overflowOpen, setOverflowOpen] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 1) View Switch */}
      <div className="flex items-center rounded-xl border border-white/10 bg-card/5">
        <button
          onClick={() => onViewChange("cards")}
          className={`flex items-center gap-1.5 rounded-l-xl px-3 py-2 text-xs transition ${
            view === "cards"
              ? "bg-card/10 text-white"
              : "text-white/60 hover:text-white/80"
          }`}
          aria-label="Cards view"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Cards
        </button>
        <button
          onClick={() => onViewChange("table")}
          className={`flex items-center gap-1.5 rounded-r-xl px-3 py-2 text-xs transition ${
            view === "table"
              ? "bg-card/10 text-white"
              : "text-white/60 hover:text-white/80"
          }`}
          aria-label="Table view"
        >
          <Table className="h-3.5 w-3.5" />
          Table
        </button>
      </div>

      {/* 2) Sort Dropdown */}
      <div className="relative">
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="h-9 appearance-none rounded-xl border border-white/10 bg-card/5 pl-3 pr-8 text-xs text-white/80 hover:bg-card/8 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
          aria-label="Sort agents"
        >
          <option value="name-asc">Name (A→Z)</option>
          <option value="name-desc">Name (Z→A)</option>
          <option value="status">Status</option>
          <option value="requests-desc">Requests ↓</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
      </div>

      {/* 3) Active Only Toggle */}
      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-card/5 px-3 py-2 text-xs text-white/70 hover:bg-card/8 transition">
        <input
          type="checkbox"
          checked={onlyActive}
          onChange={onActiveToggle}
          className="h-3.5 w-3.5 rounded accent-[hsl(var(--primary))]"
        />
        Active Only
      </label>

      {/* 4) Conditional Slots (Density/Columns for table view) */}
      {showDensity && densitySlot}
      {showColumns && columnsSlot}

      {/* 5) Overflow Menu (⋯ More) */}
      <div className="relative ml-auto">
        <button
          onClick={() => setOverflowOpen(!overflowOpen)}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-card/5 px-3 py-2 text-xs text-white/70 hover:bg-card/8 transition"
          aria-label="More actions"
          aria-expanded={overflowOpen}
        >
          <MoreVertical className="h-3.5 w-3.5" />
          More
        </button>

        {overflowOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOverflowOpen(false)}
              aria-hidden="true"
            />

            {/* Dropdown */}
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-white/10 bg-[hsl(var(--card))]/95 backdrop-blur-lg p-1.5 shadow-2xl">
              {canCreate && onCreate && (
                <button
                  onClick={() => {
                    onCreate()
                    setOverflowOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/80 hover:bg-card/10 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Agent
                </button>
              )}

              {onSaveView && (
                <button
                  onClick={() => {
                    onSaveView()
                    setOverflowOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/80 hover:bg-card/10 transition"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save View
                </button>
              )}

              {onSyncApi && (
                <button
                  onClick={() => {
                    onSyncApi()
                    setOverflowOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/80 hover:bg-card/10 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sync API
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
