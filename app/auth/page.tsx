"use client";
import { useEffect, useRef, useState } from "react";

type PatItem = {
  id: string;
  name: string;
  masked: string;
  scopes: string[];
  createdAt?: string;
};

export default function AuthPage() {
  const [me, setMe] = useState<any>(null);
  const [email, setEmail] = useState("dev@example.com");
  const [name, setName] = useState("Dev User");
  const [role, setRole] = useState<"editor" | "admin" | "viewer">("editor");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errRef = useRef<HTMLParagraphElement>(null);

  const [pats, setPats] = useState<PatItem[]>([]);
  const [patName, setPatName] = useState("CLI Token");
  const [patScopes, setPatScopes] = useState("agents:run,integrations:invoke");
  const [newToken, setNewToken] = useState<string | null>(null);

  async function refreshMe() {
    const r = await fetch("/api/auth/session", { cache: "no-store" });
    const j = await r.json();
    setMe(j);
  }

  async function refreshPATs() {
    const r = await fetch("/api/auth/pats");
    if (r.ok) setPats(await r.json());
    else setPats([]);
  }

  useEffect(() => {
    refreshMe();
    refreshPATs();
  }, []);

  async function login() {
    setError(null);

    const r = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, roles: [role] }),
    });

    if (!r.ok) {
      setError("Login failed");
      setTimeout(() => errRef.current?.focus(), 50);
      return;
    }

    setStatus("Logged in.");
    setTimeout(() => setStatus(null), 1200);
    await refreshMe();
  }

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setMe(null);
    setPats([]);
    setStatus("Logged out.");
    setTimeout(() => setStatus(null), 1200);
  }

  async function createPat() {
    setError(null);
    setNewToken(null);

    const scopes = patScopes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const r = await fetch("/api/auth/pats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: patName, scopes }),
    });

    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error || "Failed to create token");
      setTimeout(() => errRef.current?.focus(), 50);
      return;
    }

    const j = await r.json();
    setNewToken(j.token); // show once
    setStatus("Token created.");
    setTimeout(() => setStatus(null), 1200);
    await refreshPATs();
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Auth / Tokens</h1>

        {status && (
          <p aria-live="polite" className="text-sm text-green-700">
            {status}
          </p>
        )}

        {error && (
          <p
            ref={errRef}
            tabIndex={-1}
            role="alert"
            aria-live="assertive"
            className="text-sm text-red-700"
          >
            {error}
          </p>
        )}
      </header>

      {/* Login form */}
      <section className="rounded-2xl border p-4">
        <h2 className="font-semibold mb-2">Dev Login</h2>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              className="mt-1 w-full rounded-md border p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              className="mt-1 w-full rounded-md border p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="role" className="text-sm font-medium">
              Role
            </label>
            <select
              id="role"
              className="mt-1 w-full rounded-md border p-2"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="admin">admin</option>
              <option value="editor">editor</option>
              <option value="viewer">viewer</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex gap-3">
          <button
            onClick={login}
            className="h-11 rounded-xl px-4 font-medium border bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label="Login"
            data-testid="primary-cta"
          >
            Login
          </button>

          <button
            onClick={logout}
            className="h-11 rounded-xl px-4 font-medium border"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>

        {me?.user && (
          <p className="mt-3 text-sm">
            Logged in as <strong>{me.user.email}</strong>  roles:{" "}
            {me.user.roles?.join(", ")}  scopes: {me.scopes?.join(", ")}
          </p>
        )}
      </section>

      {/* Create token */}
      <section className="rounded-2xl border p-4">
        <h2 className="font-semibold mb-2">Create Personal Access Token</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="pat-name" className="text-sm font-medium">
              Token Name
            </label>
            <input
              id="pat-name"
              className="mt-1 w-full rounded-md border p-2"
              value={patName}
              onChange={(e) => setPatName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="pat-scopes" className="text-sm font-medium">
              Scopes (comma-separated)
            </label>
            <input
              id="pat-scopes"
              className="mt-1 w-full rounded-md border p-2"
              value={patScopes}
              onChange={(e) => setPatScopes(e.target.value)}
              placeholder="agents:run,integrations:invoke"
            />
          </div>
        </div>

        <div className="mt-3">
          <button
            onClick={createPat}
            className="h-11 rounded-xl px-4 font-medium border bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label="Create token"
          >
            Create token
          </button>
        </div>

        {newToken && (
          <p className="mt-3 text-sm" aria-live="polite">
            Token (copy now, shown once):{" "}
            <code
              className="font-mono"
              data-testid="new-pat-token"
            >
              {newToken}
            </code>
          </p>
        )}
      </section>

      {/* List tokens */}
      <section className="rounded-2xl border p-4">
        <h2 className="font-semibold mb-2">Your Tokens</h2>

        <ul className="space-y-2">
          {pats.map((p) => (
            <li key={p.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.masked}</div>
                </div>

                <div className="text-xs">{p.scopes.join(", ")}</div>
              </div>
            </li>
          ))}

          {pats.length === 0 && (
            <li className="text-sm text-muted-foreground">No tokens yet.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
