"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { User, Settings, Moon, Sun, Monitor, LogOut, Shield } from "lucide-react"
import { useTheme } from "@/lib/contexts/ThemeContext"
import { useSession } from "@/store/session"

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user } = useSession()
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Redirect to login page
        router.push('/login')
      } else {
        console.error('Logout failed:', await response.text())
        alert('Logout fehlgeschlagen. Bitte versuche es erneut.')
      }
    } catch (error) {
      console.error('Logout error:', error)
      alert('Ein Fehler ist aufgetreten. Bitte versuche es erneut.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-card/5 px-3 py-2 text-sm hover:bg-card/10"
        aria-label="User menu"
        aria-expanded={open}
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">{user.name || 'User'}</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Menu */}
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-[hsl(var(--card))]/95 backdrop-blur-lg p-2 shadow-2xl">
            {/* User Info */}
            <div className="border-b border-white/10 px-3 py-2 mb-2">
              <div className="text-sm font-medium">{user.name}</div>
              {user.role === 'admin' && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300">
                  <Shield className="h-3 w-3" />
                  Admin
                </div>
              )}
            </div>

            {/* Theme Selector */}
            <div className="mb-2">
              <div className="px-3 py-1.5 text-[11px] font-medium text-white/55 uppercase tracking-wide">Theme</div>
              <div className="space-y-0.5">
                {[
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'system', label: 'System', icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value as any)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                      theme === value
                        ? 'bg-card/10 text-white'
                        : 'text-white/70 hover:bg-card/5 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {theme === value && <span className="ml-auto text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="my-2 border-t border-white/10" />

            {/* Actions */}
            <button
              onClick={() => {
                setOpen(false)
                router.push('/settings')
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-card/5 hover:text-white"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? 'Wird abgemeldet...' : 'Sign out'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
