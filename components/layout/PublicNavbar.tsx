'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { FlowentLogo } from '@/components/ui/FlowentLogo';

// ============================================================================
// NAV ITEMS
// ============================================================================

interface NavItem {
  label: string;
  href: string;
  isRoute: boolean; // true = Next.js Link, false = <a> anchor
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Plattform', href: '/#platform', isRoute: false },
  { label: 'Features', href: '/#features', isRoute: false },
  { label: 'Agenten', href: '/agenten', isRoute: true },
  { label: 'Enterprise', href: '/#enterprise', isRoute: false },
];

// ============================================================================
// STYLE VARIANTS
// ============================================================================

const STYLES = {
  dark: {
    nav: 'bg-zinc-950/50 backdrop-blur-xl border-b border-white/5',
    logoBox: 'bg-violet-500/15 border border-violet-500/25',
    logoText: 'text-white/90',
    link: 'text-zinc-400 hover:text-white',
    linkActive: 'text-white font-medium',
    loginLink: 'text-zinc-400 hover:text-white',
    cta: 'bg-white text-black font-medium hover:bg-zinc-200',
    mobileMenu: 'bg-zinc-950/95 backdrop-blur-xl border-t border-white/5',
    mobileLink: 'text-zinc-400 hover:text-white',
    hamburger: 'text-zinc-400 hover:text-white',
    activeTextShadow: '0 0 12px rgba(139,92,246,0.6)',
  },
  light: {
    nav: 'bg-white/80 backdrop-blur-xl border-b border-slate-200',
    logoBox: 'bg-violet-50 border border-violet-200',
    logoText: 'text-slate-800',
    link: 'text-slate-500 hover:text-slate-900',
    linkActive: 'text-slate-900 font-medium',
    loginLink: 'text-slate-500 hover:text-slate-900',
    cta: 'bg-slate-900 text-white font-medium hover:bg-slate-800',
    mobileMenu: 'bg-white/95 backdrop-blur-xl border-t border-slate-200',
    mobileLink: 'text-slate-500 hover:text-slate-900',
    hamburger: 'text-slate-400 hover:text-slate-900',
    activeTextShadow: undefined as string | undefined,
  },
} as const;

// ============================================================================
// PUBLIC NAVBAR
// ============================================================================

export function PublicNavbar({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/' || pathname === '/v1';
  const s = STYLES[variant];

  /** On homepage, strip leading "/" so anchors scroll in-page. Otherwise keep full path. */
  function resolveHref(item: NavItem): string {
    if (!item.isRoute && isHome) {
      return item.href.replace('/', ''); // "/#features" → "#features"
    }
    return item.href;
  }

  /** Determine if a nav item should be highlighted as active. */
  function isActive(item: NavItem): boolean {
    if (item.isRoute) {
      return pathname === item.href || pathname.startsWith(item.href + '/');
    }
    // Anchor links are "active" only when on the homepage
    return isHome;
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${s.nav}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* ── Left: Logo + Nav Links ── */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.logoBox}`}>
              <FlowentLogo className="w-4 h-4 text-violet-400" />
            </div>
            <span className={`text-lg font-bold tracking-wide ${s.logoText}`}>
              Flowent
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const href = resolveHref(item);

              return item.isRoute ? (
                <Link
                  key={item.label}
                  href={href}
                  className={`text-sm transition-colors ${
                    active ? s.linkActive : s.link
                  }`}
                  style={
                    active && s.activeTextShadow
                      ? { textShadow: s.activeTextShadow }
                      : undefined
                  }
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={href}
                  className={`text-sm transition-colors ${s.link}`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>

        {/* ── Right: Login + CTA ── */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className={`text-sm transition-colors hidden sm:block ${s.loginLink}`}
          >
            Login
          </Link>
          <Link
            href="/register"
            className={`text-sm rounded-full px-4 py-2 transition-colors ${s.cta}`}
          >
            Demo buchen
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2 transition-colors ${s.hamburger}`}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Dropdown ── */}
      {mobileOpen && (
        <div className={`md:hidden px-6 py-4 space-y-3 ${s.mobileMenu}`}>
          {NAV_ITEMS.map((item) => {
            const href = resolveHref(item);

            return item.isRoute ? (
              <Link
                key={item.label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`block text-sm transition-colors py-2 ${s.mobileLink}`}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`block text-sm transition-colors py-2 ${s.mobileLink}`}
              >
                {item.label}
              </a>
            );
          })}
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className={`block text-sm transition-colors py-2 ${s.mobileLink}`}
          >
            Login
          </Link>
        </div>
      )}
    </nav>
  );
}
