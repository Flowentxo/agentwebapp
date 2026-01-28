# 🎨 Brain AI Design System v2.0 - Quick Start

Modern SaaS-inspired UI/UX Design System für Brain AI

---

## ✨ Was ist neu?

**Version 2.0.0** bringt ein komplett überarbeitetes, modernes Design System:

- 🎯 **Modern & Clean**: Minimalistisches Design im Stil von Linear, Notion, Vercel
- 🌓 **Dark/Light Mode**: Vollständig unterstützt
- ⚡ **Smooth Animations**: Microinteractions und Framer Motion
- ♿ **Accessible**: WCAG 2.1 AAA konform
- 📱 **Responsive**: Mobile-first für alle Bildschirmgrößen
- 🧩 **Komponenten-basiert**: Wiederverwendbare UI-Bausteine

---

## 🚀 Schnellstart (5 Minuten)

### 1. Voraussetzungen

```bash
# Bereits installiert im Projekt:
# - React 18
# - Tailwind CSS
# - Framer Motion
# - Lucide Icons
# - class-variance-authority
```

### 2. Importiere das Design System

```tsx
// app/layout.tsx (oder _app.tsx)
import './brain-ai-design-system.css';
```

### 3. Verwende Komponenten

```tsx
import { ButtonV2 } from '@/components/ui/button-v2';
import { CardV2 } from '@/components/ui/card-v2';
import { SearchInput } from '@/components/ui/input-v2';

export default function MyPage() {
  return (
    <div className="p-8">
      <CardV2 variant="elevated" padding="md">
        <SearchInput placeholder="Search..." />
        <ButtonV2 variant="primary" size="lg">
          Get Started
        </ButtonV2>
      </CardV2>
    </div>
  );
}
```

---

## 📦 Neue Komponenten

### ButtonV2

Modern button with 7 variants and loading states

```tsx
<ButtonV2 variant="primary" size="md">Primary</ButtonV2>
<ButtonV2 variant="secondary">Secondary</ButtonV2>
<ButtonV2 variant="outline">Outline</ButtonV2>
<ButtonV2 variant="ghost">Ghost</ButtonV2>
<ButtonV2 variant="success">Success</ButtonV2>
<ButtonV2 variant="danger">Danger</ButtonV2>

// Mit Icon
<ButtonV2 icon={<Upload />} iconPosition="left">
  Upload Document
</ButtonV2>

// Loading State
<ButtonV2 loading={true} loadingText="Uploading...">
  Upload
</ButtonV2>
```

### CardV2

Flexible card container with 7 variants

```tsx
<CardV2 variant="default">Clean with border</CardV2>
<CardV2 variant="elevated">Floating shadow</CardV2>
<CardV2 variant="interactive">Clickable</CardV2>
<CardV2 variant="gradient">Brand gradient</CardV2>
<CardV2 variant="glass">Glassmorphism</CardV2>

// Mit Struktur
<CardV2 variant="elevated" padding="lg">
  <CardV2Header>
    <CardV2Title>Card Title</CardV2Title>
    <CardV2Description>Description</CardV2Description>
  </CardV2Header>
  <CardV2Content>
    Main content here
  </CardV2Content>
  <CardV2Footer>
    Footer content
  </CardV2Footer>
</CardV2>
```

### InputV2 & SearchInput

Modern inputs with icons and validation

```tsx
<InputV2
  type="email"
  placeholder="Enter email"
  variant="default"
  icon={<Mail />}
  clearable
/>

// Spezialisiert: Search
<SearchInput
  placeholder="Search documents..."
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  clearable
/>
```

### EmptyState

Friendly empty states with illustrations

```tsx
<EmptyState
  icon={FileText}
  title="No documents yet"
  description="Upload your first document to get started"
  illustration="documents"
  action={{
    label: 'Upload Document',
    onClick: handleUpload,
    icon: <Upload className="h-4 w-4" />
  }}
/>
```

---

## 🎨 Brain AI Spezifische Komponenten

### BrainStatsCards

Modern stats dashboard with animations

```tsx
import { BrainStatsCards } from '@/components/brain/BrainStatsCards';

<BrainStatsCards
  stats={{
    totalDocuments: 1234,
    queriesToday: 567,
    cacheHitRate: 85,
    avgResponseTime: 350
  }}
  isLoading={false}
/>
```

### KnowledgeLibraryV2

Document library with grid/list view

```tsx
import { KnowledgeLibraryV2 } from '@/components/brain/KnowledgeLibraryV2';

<KnowledgeLibraryV2 searchQuery={searchQuery} />
```

### InsightsDashboardV2

Analytics dashboard with charts

```tsx
import { InsightsDashboardV2 } from '@/components/brain/InsightsDashboardV2';

<InsightsDashboardV2 />
```

---

## 🎯 Design Tokens

Verwende CSS-Variablen für konsistentes Design:

### Farben

```tsx
// Primary Brand Color
className="bg-[rgb(var(--brain-primary-500))]"
className="text-[rgb(var(--brain-primary-600))]"

// Text Colors
className="text-neutral-900 dark:text-neutral-100"  // Primary Text
className="text-neutral-600 dark:text-neutral-400"  // Secondary Text

// Semantic
className="bg-green-500"  // Success
className="bg-amber-500"  // Warning
className="bg-red-500"    // Error
```

### Spacing

```tsx
// Standard Spacing (4px increments)
className="p-4"   // 16px
className="gap-6" // 24px
className="mb-8"  // 32px
```

### Border Radius

```tsx
className="rounded-lg"   // 12px - Standard
className="rounded-xl"   // 16px - Cards
className="rounded-2xl"  // 24px - Large cards
className="rounded-full" // Pills & Avatars
```

### Shadows

```tsx
className="shadow-sm"   // Subtle
className="shadow-md"   // Standard
className="shadow-lg"   // Elevated
className="shadow-xl"   // Floating
```

---

## ⚡ Animationen

### Mit Framer Motion

```tsx
import { motion } from 'framer-motion';

// Fade In
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>

// Slide Up
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
>
  Content
</motion.div>

// Staggered List
{items.map((item, index) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
  >
    {item.content}
  </motion.div>
))}
```

---

## 🌓 Dark Mode

Automatisch unterstützt mit Tailwind:

```tsx
// Auto-adjusting colors
className="bg-white dark:bg-neutral-900"
className="text-neutral-900 dark:text-neutral-100"
className="border-neutral-200 dark:border-neutral-800"

// Components auto-adapt
<ButtonV2 variant="primary">
  Works in both themes
</ButtonV2>
```

---

## 📱 Responsive Design

Mobile-first Breakpoints:

```tsx
// Mobile first approach
className="text-sm md:text-base lg:text-lg"

// Grid responsive
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"

// Hide/Show based on screen size
className="hidden md:block"
className="block md:hidden"
```

---

## ♿ Accessibility Features

Alle Komponenten sind zugänglich:

- ✅ Keyboard Navigation (Tab, Enter, Escape)
- ✅ Focus States (sichtbare Outlines)
- ✅ Screen Reader Support (ARIA labels)
- ✅ High Contrast (WCAG 2.1 AAA)
- ✅ Reduced Motion Support

```tsx
// Automatisch in ButtonV2
<ButtonV2
  aria-label="Upload document"
  disabled={isUploading}
>
  Upload
</ButtonV2>

// Custom ARIA
<div role="status" aria-live="polite">
  {successMessage}
</div>
```

---

## 📖 Vollständige Dokumentation

Siehe [BRAIN_AI_DESIGN_SYSTEM.md](./docs/BRAIN_AI_DESIGN_SYSTEM.md) für:

- ✍️ **Typography System**: Font scales, weights, line heights
- 🎨 **Complete Color Palette**: All color tokens and usage
- 🧩 **All Components**: Detailed API reference
- 📐 **Layout Patterns**: Grid systems, spacing guidelines
- ⚡ **Animation Library**: All animations and transitions
- ♿ **Accessibility Guide**: WCAG compliance details

---

## 🗂️ Dateistruktur

```
lib/design/
  └── tokens.ts                      # Design tokens

components/ui/
  ├── button-v2.tsx                  # Modern button
  ├── card-v2.tsx                    # Card component
  └── input-v2.tsx                   # Inputs & search

components/brain/
  ├── BrainStatsCards.tsx            # Stats cards
  ├── EmptyState.tsx                 # Empty states
  ├── KnowledgeLibraryV2.tsx         # Document library
  └── InsightsDashboardV2.tsx        # Analytics

app/
  └── brain-ai-design-system.css     # Complete CSS

docs/
  └── BRAIN_AI_DESIGN_SYSTEM.md      # Full docs
```

---

## 💡 Beispiel: Komplettes Dashboard

```tsx
import { CardV2 } from '@/components/ui/card-v2';
import { ButtonV2 } from '@/components/ui/button-v2';
import { SearchInput } from '@/components/ui/input-v2';
import { BrainStatsCards } from '@/components/brain/BrainStatsCards';
import { Upload, Filter } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-indigo-50/30">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Brain AI</h1>

            <SearchInput
              placeholder="Search knowledge base..."
              className="flex-1 max-w-2xl mx-8"
            />

            <div className="flex gap-3">
              <ButtonV2 variant="secondary">
                <Filter className="h-4 w-4" />
                Filters
              </ButtonV2>
              <ButtonV2 variant="primary">
                <Upload className="h-4 w-4" />
                Upload
              </ButtonV2>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats */}
        <BrainStatsCards stats={stats} />

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <CardV2 variant="elevated" padding="md">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            {/* Content */}
          </CardV2>

          <CardV2 variant="interactive" padding="md">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            {/* Content */}
          </CardV2>

          <CardV2 variant="gradient" padding="md">
            <div className="text-white">
              <h3 className="font-semibold mb-2">Highlighted</h3>
              {/* Content */}
            </div>
          </CardV2>
        </div>
      </main>
    </div>
  );
}
```

---

## 🎯 Best Practices

### 1. Konsistente Komponenten verwenden

```tsx
// ✅ Good - Use design system components
<ButtonV2 variant="primary">Click Me</ButtonV2>

// ❌ Bad - Custom button styling
<button className="bg-blue-500 px-4 py-2 rounded">Click Me</button>
```

### 2. Design Tokens nutzen

```tsx
// ✅ Good - Use tokens
<div className="text-neutral-900 dark:text-neutral-100">

// ❌ Bad - Hardcoded colors
<div className="text-black dark:text-white">
```

### 3. Responsive Design

```tsx
// ✅ Good - Mobile first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

// ❌ Bad - Desktop only
<div className="grid grid-cols-4">
```

### 4. Accessibility

```tsx
// ✅ Good - Accessible
<ButtonV2 aria-label="Close dialog" onClick={close}>
  <X className="h-4 w-4" />
</ButtonV2>

// ❌ Bad - Icon without label
<button onClick={close}><X /></button>
```

---

## 🆘 Hilfe & Support

**Dokumentation**: [BRAIN_AI_DESIGN_SYSTEM.md](./docs/BRAIN_AI_DESIGN_SYSTEM.md)

**Design Tokens**: [lib/design/tokens.ts](./lib/design/tokens.ts)

**Komponenten**: [components/ui/](./components/ui/)

---

## 📝 Changelog

### v2.0.0 (2025-10-26)

**Neu**:
- Complete design system with 100+ design tokens
- Modern ButtonV2, CardV2, InputV2 components
- Brain AI specific components (Stats, Library, Insights)
- Full dark mode support
- Framer Motion animations
- WCAG 2.1 AAA accessibility
- Comprehensive documentation

---

**Version**: 2.0.0 | **Status**: ✅ Production Ready | **License**: MIT
