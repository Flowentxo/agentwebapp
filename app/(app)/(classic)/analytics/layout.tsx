'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Shield, DollarSign, Brain } from 'lucide-react';

const analyticsNavItems = [
  { href: '/analytics', label: 'Overview', icon: BarChart3, exact: true },
  { href: '/analytics/enterprise', label: 'Enterprise AI', icon: Shield },
  { href: '/analytics/cost', label: 'Cost Analysis', icon: DollarSign },
];

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <section aria-labelledby="page-title" className="mx-auto w-full max-w-6xl px-6 py-6">
      {/* Sub-Navigation Tabs */}
      <nav className="mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
        {analyticsNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${active
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-white/60 hover:text-white hover:bg-card/5'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {children}
    </section>
  );
}
