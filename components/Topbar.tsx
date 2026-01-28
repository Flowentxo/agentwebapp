"use client"

import { usePathname } from "next/navigation"
import { useUI } from "@/store/ui"
import { Plus } from "lucide-react"
import UserMenu from "@/components/UserMenu"
import { useState } from "react"

export default function Topbar() {
  const { openCommand } = useUI()
  const pathname = usePathname()
  const [createOpen, setCreateOpen] = useState(false)

  // Get page title and intro from pathname
  const getPageInfo = () => {
    if (pathname?.startsWith('/dashboard')) return { title: 'Dashboard', intro: 'Überblick über alle Systeme und Metriken' }
    if (pathname?.startsWith('/workflows')) return { title: 'Workflows', intro: 'Automatisierungen verwalten' }
    if (pathname?.startsWith('/knowledge')) return { title: 'Wissensbasis', intro: 'Dokumente und Wissen durchsuchen' }
    if (pathname?.startsWith('/analytics')) return { title: 'Analytics', intro: 'Auswertungen und Reports' }
    if (pathname?.startsWith('/board')) return { title: 'Board', intro: 'Aufgaben im Überblick' }
    if (pathname?.startsWith('/admin')) return { title: 'Admin', intro: 'Systemverwaltung' }
    if (pathname?.startsWith('/settings')) return { title: 'Einstellungen', intro: 'Konfiguration anpassen' }
    if (pathname?.startsWith('/agents')) return { title: 'Agents', intro: 'Verwalte und überwache deine Agents' }
    return { title: 'Dashboard', intro: 'Überblick über alle Systeme und Metriken' }
  }

  const pageInfo = getPageInfo()

  return (
    <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4">
      {/* Left: Page Title + Intro */}
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold tracking-wide text-white/85">
          {pageInfo.title}
        </h1>
        <p className="hidden md:block text-xs text-white/55">
          {pageInfo.intro}
        </p>
      </div>

      {/* Center: Single Command/Search Input */}
      <div className="mx-auto w-full max-w-[520px]">
        <button
          onClick={() => openCommand()}
          className="flex w-full items-center gap-3 rounded-xl border border-white/12 bg-card/5 px-4 py-2 text-sm text-white/55 hover:bg-card/10 hover:text-white/70 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/50"
          aria-label="Befehl eingeben oder suchen"
        >
          <span>z. B. 'Open Cassie' oder '/assist help'</span>
          <kbd className="ml-auto rounded-lg border border-white/20 px-2 py-0.5 text-[11px] text-white/40">⌘K</kbd>
        </button>
      </div>

      {/* Right: Primary Action + User Menu */}
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white shadow-lg hover:shadow-xl hover:brightness-110 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/70"
          aria-label="Neuen Agent erstellen"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Agent erstellen</span>
        </button>
        <UserMenu />
      </div>
    </div>
  )
}
