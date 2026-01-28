/**
 * Next.js Configuration for Tauri Desktop Build
 *
 * This configuration is used when building the static export for Tauri.
 * It disables server-side features and enables static HTML/CSS/JS output.
 *
 * Usage: Set TAURI_BUILD=true environment variable before building
 */

const { withSentryConfig } = require("@sentry/nextjs");

// Detect if we're building for Tauri
const isTauriBuild = process.env.TAURI_BUILD === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Tauri, standalone for Docker, undefined for Vercel
  output: isTauriBuild ? 'export' : (process.env.VERCEL ? undefined : 'standalone'),

  // For static export, we need to disable image optimization
  // and use a custom loader
  images: isTauriBuild ? {
    unoptimized: true,
    loader: 'custom',
    loaderFile: './lib/tauri/image-loader.ts',
  } : {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // For Tauri, we need to set the asset prefix to work with file:// protocol
  assetPrefix: isTauriBuild ? '' : undefined,

  // Trailing slash helps with static file resolution
  trailingSlash: isTauriBuild ? true : false,

  // Disable server-side features for Tauri
  experimental: {
    instrumentationHook: !isTauriBuild,
    serverActions: isTauriBuild ? undefined : {
      bodySizeLimit: '2mb',
    },
  },

  // SEO Optimizations
  compress: true,
  poweredByHeader: false,

  // Security headers (only for web builds, not Tauri)
  async headers() {
    if (isTauriBuild) return [];

    const isProduction = process.env.NODE_ENV === 'production';

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.googleusercontent.com https://*.githubusercontent.com https://images.unsplash.com",
              "connect-src 'self' http://localhost:4000 http://127.0.0.1:4000 http://localhost:3000 http://127.0.0.1:3000 ws://localhost:4000 ws://127.0.0.1:4000 wss://localhost:4000 wss://127.0.0.1:4000 https://api.openai.com https://api.resend.com https://hooks.slack.com https://api.tavily.com https://vercel.live https://vitals.vercel-insights.com wss://*.pusher.com",
              "frame-src 'self' https://vercel.live",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              isProduction ? "upgrade-insecure-requests" : "",
            ].filter(Boolean).join('; '),
          },
          ...(isProduction ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          }] : []),
        ],
      },
      {
        source: '/(sitemap.xml|robots.txt)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600' }],
      },
      {
        source: '/(.*)\\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  // Rewrites only for web builds (not Tauri)
  async rewrites() {
    if (isTauriBuild) return [];

    const backendPort = process.env.BACKEND_PORT || '4000';
    const backendHost = process.env.BACKEND_HOST || 'localhost';
    const backendUrl = `http://${backendHost}:${backendPort}`;

    console.log('[Next.js Config] Backend URL:', backendUrl);

    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
        { source: '/socket.io/:path*', destination: `${backendUrl}/socket.io/:path*` },
        { source: '/ws', destination: `${backendUrl}/ws` },
      ],
    };
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-is': require.resolve('react-is'),
    };

    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'isolated-vm': 'commonjs isolated-vm',
      });
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        pg: false,
        'pg-native': false,
        'pg-connection-string': false,
        'isolated-vm': false,
      };
    }

    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: { minChunks: 2, priority: -20, reuseExistingChunk: true },
          vendor: { test: /[\\/]node_modules[\\/]/, name: 'vendors', priority: -10, chunks: 'all' },
        },
      };
    }

    return config;
  },

  // Redirects (only for web builds)
  async redirects() {
    if (isTauriBuild) return [];
    return [
      { source: '/old-dashboard', destination: '/dashboard', permanent: true },
      { source: '/old-agents', destination: '/agents', permanent: true },
    ];
  },

  async generateBuildId() {
    return 'sintra-ai-' + Date.now();
  },
};

// Sentry Configuration (skip for Tauri builds)
if (isTauriBuild) {
  module.exports = nextConfig;
} else {
  module.exports = withSentryConfig(
    nextConfig,
    {
      silent: true,
      org: "flowent-ai",
      project: "brain-ai",
    },
    {
      widenClientFileUpload: true,
      transpileClientSDK: true,
      tunnelRoute: "/monitoring",
      hideSourceMaps: true,
      disableLogger: true,
    }
  );
}
