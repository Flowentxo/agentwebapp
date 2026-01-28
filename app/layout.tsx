import "./globals.css";
import "./integrations-oauth2.css";
import "./inbox-v2.css";
import { Inter } from "next/font/google";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { Providers } from "./providers";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata, Viewport } from 'next';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// ============================================================================
// LEVEL 13: PRODUCTION SEO METADATA
// ============================================================================

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0b' },
  ],
};

export const metadata: Metadata = {
  // Primary Meta Tags
  title: {
    default: 'Flowent AI - Autonomous Agent Dashboard',
    template: '%s | Flowent AI',
  },
  description: 'Build, deploy, and manage AI agents with real-world capabilities. Email automation, Slack notifications, web search, and intelligent workflows - all in one powerful dashboard.',

  // Application Info
  applicationName: 'Flowent AI',
  authors: [{ name: 'Flowent AI Team' }],
  generator: 'Next.js',
  keywords: [
    'AI agents',
    'autonomous agents',
    'GPT-4',
    'OpenAI',
    'workflow automation',
    'email automation',
    'Slack integration',
    'RAG',
    'knowledge base',
    'AI dashboard',
    'multi-agent system',
  ],

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Flowent AI',
    title: 'Flowent AI - Autonomous Agent Dashboard',
    description: 'Build, deploy, and manage AI agents with real-world capabilities. Email automation, Slack notifications, web search, and intelligent workflows.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Flowent AI Dashboard',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Flowent AI - Autonomous Agent Dashboard',
    description: 'Build, deploy, and manage AI agents with real-world capabilities.',
    images: ['/og-image.png'],
  },

  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },

  // Manifest
  manifest: '/manifest.json',

  // Verification (add your IDs when ready)
  // verification: {
  //   google: 'your-google-verification-id',
  // },

  // Category
  category: 'technology',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="x-flowent-build" content="FLOWENT-AI-2025-L14" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
