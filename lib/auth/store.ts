import crypto from "crypto";
import { NextRequest } from "next/server";

// ----- Types
export type Role = "admin" | "editor" | "viewer";
export type Scope =
  | "agents:run"
  | "automations:manage"
  | "integrations:invoke"
  | "knowledge:read"
  | "knowledge:write"
  | "recipes:run"
  | "audit:read"
  | "admin:*";

export interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  createdAt: string;
}

export interface Session {
  id: string; // random id
  userId: string;
  createdAt: string;
  expiresAt: string; // ISO
}

export type TokenKind = "user" | "service";

export interface PAT {
  id: string;
  kind: TokenKind;
  ownerUserId?: string; // for user tokens
  name: string;
  tokenHash: string; // sha256 of token
  prefix: string; // shown
  last4: string; // shown
  scopes: Scope[];
  createdAt: string;
  expiresAt?: string;
}

export interface Principal {
  type: "user" | "service" | "anonymous";
  id?: string;
  user?: Pick<User, "id" | "email" | "name" | "roles">;
  scopes: Scope[];
}

// ----- In-memory stores
const users = new Map<string, User>();
const sessions = new Map<string, Session>();
const pats = new Map<string, PAT>(); // by id
const patByHash = new Map<string, string>(); // hash -> id

// ----- Config / helpers
const DEV_SECRET = process.env.AUTH_SECRET || "dev-secret";

function base64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function nowPlus(hours: number) {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export function roleToScopes(roles: Role[]): Scope[] {
  const set = new Set<Scope>();

  for (const r of roles) {
    if (r === "admin") {
      set.add("admin:*");
      set.add("agents:run");
      set.add("automations:manage");
      set.add("integrations:invoke");
      set.add("knowledge:read");
      set.add("knowledge:write");
      set.add("recipes:run");
      set.add("audit:read");
    } else if (r === "editor") {
      set.add("agents:run");
      set.add("integrations:invoke");
      set.add("knowledge:read");
      set.add("knowledge:write");
      set.add("recipes:run");
    } else if (r === "viewer") {
      set.add("knowledge:read");
    }
  }

  return Array.from(set);
}

export function hasScopes(pr: Principal | null, required: Scope[]): boolean {
  if (!pr) return false;
  if (pr.scopes.includes("admin:*")) return true;
  return required.every((s) => pr.scopes.includes(s));
}

export function hasScope(principal: Principal, scope: Scope): boolean {
  if (!principal.scopes) return false;
  if (principal.scopes.includes(scope)) return true;
  // wildcard: admin:* covers all
  return principal.scopes.includes("admin:*");
}

export function hasAdminStar(principal: Principal): boolean {
  return principal.scopes?.includes("admin:*") ?? false;
}

// ----- Sessions (HMAC-signed cookie value)
// Single source of truth for session cookie delimiter
export const SID_SEP = "~";

function sign(data: string) {
  return crypto.createHmac("sha256", DEV_SECRET).update(data).digest("hex");
}

export function createSession(userId: string): { cookieValue: string; session: Session } {
  const id = `sid_${base64url(crypto.randomBytes(16))}`;
  const session: Session = {
    id,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: nowPlus(24), // 24h
  };

  sessions.set(id, session);

  const payload = `${id}${SID_SEP}${session.expiresAt}`;
  const cookieValue = `${payload}${SID_SEP}${sign(payload)}`;

  return { cookieValue, session };
}

export function destroySession(id: string) {
  sessions.delete(id);
}

export function parseSessionCookie(raw: string | undefined): Session | null {
  if (!raw) return null;

  const parts = raw.split(SID_SEP);
  if (parts.length !== 3) return null;

  const [sid, exp, mac] = parts;
  const expected = sign(`${sid}${SID_SEP}${exp}`);

  if (mac !== expected) return null;

  const s = sessions.get(sid);
  if (!s) return null;

  if (new Date(s.expiresAt).getTime() < Date.now()) return null;

  return s;
}

// ----- Users
export function ensureDevUser(email: string, name?: string, roles: Role[] = ["editor"]): User {
  let u = Array.from(users.values()).find((x) => x.email === email);

  if (!u) {
    const id = `usr_${base64url(crypto.randomBytes(8))}`;
    u = {
      id,
      email,
      name: name || email.split("@")[0],
      roles,
      createdAt: new Date().toISOString(),
    };
    users.set(id, u);
  }

  return u;
}

export function getUser(id: string) {
  return users.get(id);
}

// ----- PATs (Personal / Service tokens)
function maskTokenStr(tok: string) {
  const prefix = tok.slice(0, 6);
  const last4 = tok.slice(-4);
  return `${prefix}****${last4}`;
}

export function createPAT(input: {
  kind: TokenKind;
  name: string;
  scopes: Scope[];
  ownerUserId?: string;
  hoursTTL?: number;
}): { pat: PAT; tokenPlaintext: string; masked: string } {
  const raw = `pat_${base64url(crypto.randomBytes(20))}`;
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const id = `pat_${Date.now()}_${base64url(crypto.randomBytes(4))}`;

  const pat: PAT = {
    id,
    kind: input.kind,
    ownerUserId: input.ownerUserId,
    name: input.name || "Token",
    tokenHash,
    prefix: raw.slice(0, 6),
    last4: raw.slice(-4),
    scopes: input.scopes,
    createdAt: new Date().toISOString(),
    expiresAt: input.hoursTTL ? nowPlus(input.hoursTTL) : undefined,
  };

  pats.set(id, pat);
  patByHash.set(tokenHash, id);

  return { pat, tokenPlaintext: raw, masked: maskTokenStr(raw) };
}

export function listPATsForUser(userId: string): Array<Omit<PAT, "tokenHash"> & { masked: string }> {
  const out: Array<Omit<PAT, "tokenHash"> & { masked: string }> = [];

  for (const p of Array.from(pats.values())) {
    if (p.kind === "user" && p.ownerUserId === userId) {
      out.push({ ...p, masked: `${p.prefix}****${p.last4}` });
    }
  }

  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function listServicePATs(): Array<Omit<PAT, "tokenHash"> & { masked: string }> {
  return Array.from(pats.values())
    .filter((p) => p.kind === "service")
    .map((p) => ({ ...p, masked: `${p.prefix}****${p.last4}` }));
}

export function findPrincipalByBearer(token: string): Principal | null {
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const id = patByHash.get(hash);

  if (!id) return null;

  const pat = pats.get(id)!;

  if (pat.expiresAt && new Date(pat.expiresAt).getTime() < Date.now()) return null;

  if (pat.kind === "user" && pat.ownerUserId) {
    const u = users.get(pat.ownerUserId);
    if (!u) return null;

    return {
      type: "user",
      id: u.id,
      user: { id: u.id, email: u.email, name: u.name, roles: u.roles },
      scopes: pat.scopes,
    };
  }

  return { type: "service", id: pat.id, scopes: pat.scopes };
}

// ----- Request → Principal
const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || 'sintra.sid';

export function principalFromRequest(req: NextRequest): Principal {
  // Authorization: Bearer <pat>
  const auth = req.headers.get("authorization") || "";

  if (auth.toLowerCase().startsWith("bearer ")) {
    const tok = auth.slice(7).trim();
    const pr = findPrincipalByBearer(tok);
    if (pr) return pr;
  }

  // Session cookie - check both 'sintra.sid' and 'sid' for compatibility
  const cookie = req.cookies.get(AUTH_COOKIE)?.value || req.cookies.get("sid")?.value;

  // First try the in-memory session store (for dev sessions using signed cookies)
  const s = parseSessionCookie(cookie);
  if (s) {
    const u = users.get(s.userId);
    if (u) {
      return {
        type: "user",
        id: u.id,
        user: { id: u.id, email: u.email, name: u.name, roles: u.roles },
        scopes: roleToScopes(u.roles),
      };
    }
  }

  // If cookie exists but not in memory store, it might be a DB session
  // Return a placeholder that will be validated by requireSession in jwt-middleware
  if (cookie) {
    return {
      type: "user",
      id: "pending-db-validation",
      scopes: ["agents:run", "knowledge:read", "integrations:invoke"] as Scope[],
    };
  }

  return { type: "anonymous", scopes: [] };
}

export function requireScopesOrThrow(pr: Principal, needed: Scope[]) {
  if (!hasScopes(pr, needed)) {
    const msg = "forbidden_insufficient_scope";
    throw Object.assign(new Error(msg), { status: 403, code: msg, needed });
  }
}

// ----- Test-only reset
export async function __resetForTests() {
  try {
    users.clear();
    sessions.clear();
    pats.clear();
    patByHash.clear();
  } catch {}
}
