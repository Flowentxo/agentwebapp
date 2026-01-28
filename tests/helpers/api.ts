import { BrowserContext, APIRequestContext, expect } from '@playwright/test';

type Role = 'owner' | 'admin' | 'member' | 'viewer';
type CreateOrg = { name: string };
type InviteMember = { orgId: string; email: string; role: Role };
type CreateProject = { orgId: string; name: string };
type CreatePat = { name: string; scopes: string }; // z.B. "agents:run,knowledge:write"

export async function createOrgViaAPI(ctx: BrowserContext, { name }: CreateOrg) {
  const r = await ctx.request.post('/api/orgs', {
    headers: { 'content-type': 'application/json' },
    data: { name },
  });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function listOrgsViaAPI(ctx: BrowserContext) {
  const r = await ctx.request.get('/api/orgs');
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function inviteMemberViaAPI(ctx: BrowserContext, { orgId, email, role }: InviteMember) {
  const r = await ctx.request.post(`/api/orgs/${orgId}/members`, {
    headers: { 'content-type': 'application/json' },
    data: { email, role },
  });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function createProjectViaAPI(ctx: BrowserContext, { orgId, name }: CreateProject) {
  const r = await ctx.request.post(`/api/orgs/${orgId}/projects`, {
    headers: { 'content-type': 'application/json' },
    data: { name },
  });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function listProjectsViaAPI(ctx: BrowserContext, orgId: string) {
  const r = await ctx.request.get(`/api/orgs/${orgId}/projects`);
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function createPatViaAPI(ctx: BrowserContext, { name, scopes }: CreatePat) {
  const r = await ctx.request.post('/api/auth/pats', {
    headers: { 'content-type': 'application/json' },
    data: { name, scopes },
  });
  expect(r.ok()).toBeTruthy();
  const json = await r.json();
  expect(json.token).toMatch(/^pat_[A-Za-z0-9-_]+$/);
  return json as { token: string; pat: any };
}

export async function runAgentInProjectViaAPI(api: APIRequestContext, projectId: string, token: string, agentId = 'dexter') {
  const r = await api.post(`/api/secure/projects/${projectId}/runs`, {
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    data: { agentId },
  });
  return r;
}

export async function reset(request: APIRequestContext) {
  const r = await request.post('/api/test/reset');
  expect(r.ok()).toBeTruthy();
}

// Simple wrappers for APIRequestContext (used in API-only tests)
export async function createOrg(request: APIRequestContext, name: string) {
  const r = await request.post('/api/orgs', {
    headers: { 'content-type': 'application/json' },
    data: { name },
  });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function createProject(request: APIRequestContext, orgId: string, name: string) {
  const r = await request.post(`/api/orgs/${orgId}/projects`, {
    headers: { 'content-type': 'application/json' },
    data: { name },
  });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}
