import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * PUT /api/admin/users/[id]
 * Update user
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, email, role, status } = body;

    // Simulate database update
    const updatedUser = {
      id: params.id,
      name,
      email,
      role,
      status,
      lastLogin: new Date().toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    };

    // Create audit log entry
    await fetch("http://localhost:3000/api/admin/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: "admin@sintra.ai",
        action: "Benutzer aktualisiert",
        target: email,
        category: "user",
        details: `Rolle: ${role}, Status: ${status}`,
      }),
    }).catch(() => {});

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Deactivate user
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Create audit log entry
    await fetch("http://localhost:3000/api/admin/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: "admin@sintra.ai",
        action: "Benutzer deaktiviert",
        target: params.id,
        category: "user",
      }),
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
