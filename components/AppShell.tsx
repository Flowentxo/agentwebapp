import SidebarNav from "@/components/SidebarNav"
import Topbar from "@/components/Topbar"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const sidebar = <SidebarNav />
  const topbar = <Topbar />

  return (
    <div className="min-h-screen">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-[hsl(var(--primary))] focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:ring-2 focus:ring-[hsl(var(--ring))]"
      >
        Skip to content
      </a>

      <div className="grid grid-cols-12 gap-0">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-2 lg:col-span-2 border-r border-[hsl(var(--border))]/70 bg-[hsl(var(--bg-soft))]">
          {sidebar}
        </aside>

        {/* Main */}
        <main id="main-content" className="relative z-0 col-span-12 md:col-span-10 lg:col-span-10">
          <div className="sticky top-0 z-10 bg-[hsl(var(--bg))]/70 backdrop-blur-[var(--blur)] border-b border-[hsl(var(--border))]/70 pointer-events-auto">
            {topbar}
          </div>

          <section className="mx-auto w-full max-w-[1200px] px-4 py-6 hero-bg">
            <div className="grid grid-cols-12 gap-5">
              {children}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
