"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Layers, Workflow, BookOpen, BarChart3, Shield, Settings, Kanban, Bot } from "lucide-react"

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Layers },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/board", label: "Board", icon: Kanban },
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/settings", label: "Settings", icon: Settings },
]

export default function SidebarNav() {
  const pathname = usePathname()

  const iconFor = (Icon: any) => <Icon className="h-4 w-4" />

  return (
    <nav className="p-3" aria-label="Main navigation">
      <div className="px-2 py-1 meta uppercase">Sintra System</div>
      <div className="divider my-3" />
      <ul className="space-y-1">
        {items.map((i) => {
          // Query-safe active state check - handles /agents, /agents/123, /agents?view=table
          const active = pathname?.startsWith(i.href)
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm dim hover:text-white hover:bg-card/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/50 border border-transparent data-[active=true]:border-[hsl(var(--border))] data-[active=true]:bg-[hsl(var(--card-contrast))]"
                data-active={active}
                aria-current={active ? "page" : undefined}
              >
                {iconFor(i.icon)}
                <span>{i.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
