const { withSentryConfig } = require("@sentry/nextjs");

// Detect if we're building for Tauri desktop app
const isTauriBuild = process.env.TAURI_BUILD === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output mode:
  // - 'export' for Tauri (static HTML/CSS/JS)
  // - 'standalone' for Docker
  // - undefined for Vercel
  output: isTauriBuild ? 'export' : (process.env.VERCEL ? undefined : 'standalone'),

  // Trailing slash helps with static file resolution in Tauri
  trailingSlash: isTauriBuild ? true : false,

  // Ignore ESLint errors during build (for production deployment)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Ignore TypeScript errors during build (for production deployment)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Skip static page generation for problematic pages
  experimental: isTauriBuild ? {} : {
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // For Tauri builds: exclude API routes from static export
  // API routes will be handled by the remote backend
  ...(isTauriBuild ? {
    // Exclude API routes from Tauri build
    excludeDefaultMomentLocales: true,
  } : {}),

  // SEO Optimizations
  compress: true,
  poweredByHeader: false,

  // Image optimization
  // For Tauri: disable optimization and use custom loader
  // For Web: full optimization with remote patterns
  images: isTauriBuild ? {
    unoptimized: true,
  } : {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Allow remote images from common providers
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  // ============================================================================
  // LEVEL 13: PRODUCTION SECURITY HEADERS
  // ============================================================================
  async headers() {
    // Skip headers for Tauri builds (handled by Tauri CSP)
    if (isTauriBuild) return [];

    // Determine if we're in production
    const isProduction = process.env.NODE_ENV === 'production';

    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS Protection (legacy but still useful)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Strict referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Restrict permissions
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Content Security Policy - Allow OpenAI streaming & Vercel Analytics
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + inline (for Next.js) + Vercel Analytics
              `script-src 'self' 'unsafe-inline' ${isProduction ? '' : "'unsafe-eval'"} https://vercel.live https://va.vercel-scripts.com`,
              // Styles: self + inline (for CSS-in-JS)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.mathpix.com",
              // Fonts
              "font-src 'self' data: https://fonts.gstatic.com https://cdn.mathpix.com",
              // Images: self + data URIs + common image providers
              "img-src 'self' data: blob: https://*.googleusercontent.com https://*.githubusercontent.com https://images.unsplash.com",
              // API connections: OpenAI, Resend, Slack, Tavily, Vercel Analytics, Backend Server
              // Include both localhost and 127.0.0.1 to handle IPv6/IPv4 resolution differences
              `connect-src 'self' ${isProduction ? '' : 'http://localhost:4000 http://127.0.0.1:4000 http://localhost:3000 http://127.0.0.1:3000 ws://localhost:4000 ws://127.0.0.1:4000 wss://localhost:4000 wss://127.0.0.1:4000'} https://api.openai.com https://api.resend.com https://hooks.slack.com https://api.tavily.com https://vercel.live https://vitals.vercel-insights.com wss://*.pusher.com`,
              // Frames: none except Vercel preview
              "frame-src 'self' https://vercel.live",
              // Object embeds
              "object-src 'none'",
              // Base URI
              "base-uri 'self'",
              // Form submissions
              "form-action 'self'",
              // Upgrade insecure requests in production
              isProduction ? "upgrade-insecure-requests" : "",
            ].filter(Boolean).join('; '),
          },
          // HSTS - Strict Transport Security (production only)
          ...(isProduction ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          }] : []),
        ],
      },
      {
        // Sitemap and robots.txt caching
        source: '/(sitemap.xml|robots.txt)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600',
          },
        ],
      },
      {
        // Static assets - long cache
        source: '/(.*)\\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  async rewrites() {
    // Skip rewrites for Tauri builds (API calls go directly to remote)
    if (isTauriBuild) return [];

    // Use BACKEND_PORT from environment or default to 4000 (the actual backend port)
    // Use localhost to match browser domain for proper CORS/cookie handling
    const backendPort = process.env.BACKEND_PORT || '4000';
    const backendHost = process.env.BACKEND_HOST || 'localhost';
    const backendUrl = `http://${backendHost}:${backendPort}`;

    console.log('[Next.js Config] Backend URL:', backendUrl);

    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        // Route all /api/* requests to backend (except Next.js internal routes)
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
        // Socket.IO connection
        {
          source: '/socket.io/:path*',
          destination: `${backendUrl}/socket.io/:path*`,
        },
        // WebSocket connection (legacy)
        {
          source: '/ws',
          destination: `${backendUrl}/ws`,
        },
      ],
    };
  },

  // Enable instrumentation
  experimental: {
    instrumentationHook: true,
  },

  // Webpack optimizations for better performance
  webpack: (config, { dev, isServer }) => {
    // Fix for recharts/react-is module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-is': require.resolve('react-is'),
    };

    // Mark native modules as external (they're loaded at runtime via require)
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'isolated-vm': 'commonjs isolated-vm',
      });
    }

    // Exclude Node.js-only modules from client bundle
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

    // Optimize for production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
        },
      };
    }

    return config;
  },

  // Redirects for SEO (skip for Tauri)
  async redirects() {
    if (isTauriBuild) return [];
    return [
      // Redirect old URLs to new ones for SEO
      {
        source: '/old-dashboard',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/old-agents',
        destination: '/agents',
        permanent: true,
      },
    ];
  },

  // Generate static pages for better SEO
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
      // For all available options, see:
      // https://github.com/getsentry/sentry-webpack-plugin#options

      // Suppresses source map uploading logs during build
      silent: true,
      org: "flowent-ai",
      project: "brain-ai",
    },
    {
      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Transpiles SDK to be compatible with IE11 (increases bundle size)
      transpileClientSDK: true,

      // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
      tunnelRoute: "/monitoring",

      // Hides source maps from generated client bundles
      hideSourceMaps: true,

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,
    }
  );
}
