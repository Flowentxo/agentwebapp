// ============================================================================
// SINTRA MIDDLEWARE - Custom Auth + Security Headers
// Uses the existing session-based authentication system
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

// Public routes - no auth required
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/request-password-reset",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/oauth",
  "/api/webhooks",
  "/api/health",
  "/api/pipelines/templates", // Public template gallery
  "/revolution",
];

// REMOVED: Email verification is now checked server-side in route handlers
// See app/(app)/(dashboard)/layout.tsx for the secure implementation

// Protected dashboard routes - require auth
const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/admin",
  "/board",
  "/analytics",
  "/workflows",
  "/agents",
  "/automations",
  "/integrations",
  "/projects",
  "/recipes",
  "/knowledge",
  "/pipelines",
  "/brain",
  "/inbox",
  "/v4",
];

// API routes that require auth (checked by Next.js middleware for cookie-based auth)
// IMPORTANT: These routes are proxied to the Express backend which has its own JWT auth.
// If a request has an Authorization header, the middleware should pass it through
// and let the backend handle the JWT validation.
const PROTECTED_API_ROUTES = [
  "/api/agents",
  "/api/pipelines",
  "/api/knowledge",
  "/api/settings",
  "/api/profile",
  "/api/brain",
  "/api/chat",
  "/api/workspaces",
  "/api/inbox",
  "/api/admin",
  "/api/workflows",
  "/api/integrations",
  "/api/budget",
];

// ============================================================================
// ROUTE MATCHING HELPERS
// ============================================================================

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + "/")
  );
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + "/")
  );
}

function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + "/")
  );
}

// REMOVED: isEmailVerificationExempt - verification now handled server-side

// ============================================================================
// SECURITY HEADERS
// ============================================================================

const isDev = process.env.NODE_ENV !== "production";

// SECURITY: 'unsafe-eval' only in development for React Hot Reload
// Note: 'unsafe-inline' kept temporarily for Next.js inline scripts
// TODO: Implement nonce-based CSP for full security
const scriptSrc = [
  "'self'",
  "'unsafe-inline'", // Required for Next.js - migrate to nonce-based approach
  ...(isDev ? ["'unsafe-eval'"] : []), // Only in dev for React Hot Reload
  "https://va.vercel-scripts.com",
  "https://vercel.live", // Vercel preview deployments
  "blob:",
];

const styleSrc = [
  "'self'",
  "'unsafe-inline'",
  "https://fonts.googleapis.com",
  "https://cdn.mathpix.com",
];

const connectSrc = [
  "'self'",
  "https://api.openai.com",
  "https://api.anthropic.com",
  "https://api.resend.com",
  "https://hooks.slack.com",
  "https://api.tavily.com",
  "https://api.stripe.com",
  "https://api.hubspot.com",
  "https://www.googleapis.com",
  "https://oauth2.googleapis.com",
  "https://vitals.vercel-insights.com",
  "https://vercel.live",
  ...(isDev ? ["ws:", "wss:", "http://localhost:*", "https://localhost:*"] : []),
];

const fontSrc = [
  "'self'",
  "data:",
  "https://fonts.gstatic.com",
  "https://cdn.mathpix.com",
];

const frameSrc = [
  "'self'",
];

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob: https://cdn.simpleicons.org",
  `script-src ${scriptSrc.join(" ")}`,
  `style-src ${styleSrc.join(" ")}`,
  `connect-src ${connectSrc.join(" ")}`,
  `font-src ${fontSrc.join(" ")}`,
  `frame-src ${frameSrc.join(" ")}`,
  "frame-ancestors 'none'",
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

// ============================================================================
// SESSION COOKIE NAMES
// ============================================================================

// Support multiple cookie names for compatibility with different auth flows:
// - sintra.sid: Original session cookie (Next.js auth)
// - accessToken: JWT access token (Express backend auth)
// - token: Legacy JWT token (Express backend auth)
const SESSION_COOKIE_NAMES = [
  process.env.AUTH_COOKIE_NAME || "sintra.sid",
  "accessToken",
  "token",
];

// ============================================================================
// MIDDLEWARE
// ============================================================================

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // =========================================================================
  // SKIP STATIC FILES
  // =========================================================================

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // Files with extensions
  ) {
    return NextResponse.next();
  }

  // =========================================================================
  // AUTHENTICATION CHECK
  // =========================================================================

  // Get session token from any of the supported cookie names
  const sessionToken = SESSION_COOKIE_NAMES
    .map(name => req.cookies.get(name)?.value)
    .find(token => !!token);
  const isAuthenticated = !!sessionToken;

  // Check for Authorization header (JWT auth for API routes)
  // If present, let the request pass through to the backend which handles JWT validation
  const hasAuthorizationHeader = !!req.headers.get("authorization");

  // Redirect to login if accessing protected route without auth (pages only, not API)
  if (isProtectedRoute(pathname) && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Return 401 for protected API routes without auth
  // Skip if route is explicitly public (e.g., /api/pipelines/templates)
  // IMPORTANT: If request has Authorization header, let it pass through to backend
  // The backend will validate the JWT token
  if (isProtectedApiRoute(pathname) && !isAuthenticated && !isPublicRoute(pathname) && !hasAuthorizationHeader) {
    const errorResponse = NextResponse.json(
      { error: "Unauthorized", message: "Please sign in to access this resource" },
      { status: 401 }
    );

    // Apply security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });

    return errorResponse;
  }

  // Redirect to dashboard if already logged in and accessing login/register
  if ((pathname === "/login" || pathname === "/register") && isAuthenticated) {
    return NextResponse.redirect(new URL("/v4", req.url));
  }

  // =========================================================================
  // EMAIL VERIFICATION ENFORCEMENT
  // =========================================================================
  // SECURITY NOTE: Email verification is now checked server-side in individual
  // route handlers and layouts, NOT in middleware via cookies.
  //
  // The previous approach used a client-side cookie (sintra_email_verified)
  // which could be manipulated by attackers to bypass email verification.
  //
  // The secure approach is to:
  // 1. Validate the session token server-side
  // 2. Query the database for the user's emailVerified status
  // 3. This is done in app/(app)/(dashboard)/layout.tsx and API route handlers
  //
  // Middleware only checks for session token presence (authentication),
  // not authorization details like email verification status.
  // =========================================================================

  // =========================================================================
  // CORS FOR EXTENSION API
  // =========================================================================

  const isExtensionAPI = pathname.startsWith("/api/extension/");

  if (isExtensionAPI && req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // =========================================================================
  // CSRF PROTECTION FOR API ROUTES
  // =========================================================================

  const isAPI = pathname.startsWith("/api/");
  const isAuthAPI = pathname.startsWith("/api/auth/") || pathname.startsWith("/api/webhooks/");
  const isUnsafe = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

  if (isAPI && isUnsafe && !isAuthAPI && !isExtensionAPI) {
    const origin = req.headers.get("origin") || "";
    const referer = req.headers.get("referer") || "";
    const host = req.nextUrl.origin;

    const isGoodOrigin =
      (!origin && !referer) ||
      (origin && origin === host) ||
      (referer && referer.startsWith(host + "/"));

    if (!isGoodOrigin) {
      const errorResponse = NextResponse.json(
        { error: "csrf_blocked" },
        { status: 403 }
      );

      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        errorResponse.headers.set(key, value);
      });

      return errorResponse;
    }
  }

  // =========================================================================
  // APPLY SECURITY HEADERS
  // =========================================================================

  const res = NextResponse.next();

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.headers.set(key, value);
  });

  // Add CORS headers for extension API
  if (isExtensionAPI) {
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  return res;
}

// ============================================================================
// MIDDLEWARE CONFIG
// ============================================================================

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
