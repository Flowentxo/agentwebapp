import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AdminBackground } from "@/components/layout";

/**
 * Admin Layout with role-based access control
 * Only users with role=admin can access /admin
 * Enterprise-grade security implementation
 *
 * Uses Deep Space Command Core design system
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Get current session
  const session = await getSession();

  // Redirect to login if no session
  if (!session) {
    redirect("/login?redirect=/admin&reason=session_required");
  }

  // Check for admin role
  const hasAdminRole = session.user.roles.includes('admin');

  if (!hasAdminRole) {
    // Log unauthorized access attempt
    console.warn(`[ADMIN_AUTH] Unauthorized access attempt by user: ${session.user.email}`);
    redirect("/dashboard?error=unauthorized&reason=admin_required");
  }

  // Log successful admin access (for audit)
  console.info(`[ADMIN_AUTH] Admin access granted to: ${session.user.email}`);

  return (
    <>
      {/* Deep Space Background Layer */}
      <AdminBackground showGrid showAmbientGlow />

      {/* Content Layer - Above background with proper z-index */}
      <section
        aria-labelledby="admin-page-title"
        className="relative z-10 mx-auto w-full max-w-7xl px-6 py-8 min-h-screen"
      >
        {children}
      </section>
    </>
  );
}
