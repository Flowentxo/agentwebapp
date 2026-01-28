"use client";
import { useEffect, useRef, useState } from "react";
import ProjectCard from "@/components/ProjectCard";

type Organization = {
  id: string;
  name: string;
  createdAt: string;
};

type Membership = {
  id: string;
  orgId: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  invitedAt: string;
};

type Project = {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  createdAt: string;
};

export default function ProjectsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [members, setMembers] = useState<Membership[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [orgName, setOrgName] = useState("Acme Corp");
  const [projectName, setProjectName] = useState("Marketing Automation");
  const [projectDesc, setProjectDesc] = useState(
    "Automated campaigns for Q1 2025"
  );
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<
    "owner" | "admin" | "member" | "viewer"
  >("member");

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errRef = useRef<HTMLParagraphElement>(null);

  async function refreshOrgs() {
    const r = await fetch("/api/orgs");
    if (r.ok) setOrgs(await r.json());
    else setOrgs([]);
  }

  async function refreshMembers() {
    if (!selectedOrgId) return;
    const r = await fetch(`/api/orgs/${selectedOrgId}/members`);
    if (r.ok) setMembers(await r.json());
    else setMembers([]);
  }

  async function refreshProjects() {
    if (!selectedOrgId) return;
    const r = await fetch(`/api/orgs/${selectedOrgId}/projects`);
    if (r.ok) setProjects(await r.json());
    else setProjects([]);
  }

  useEffect(() => {
    refreshOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      refreshMembers();
      refreshProjects();
    } else {
      setMembers([]);
      setProjects([]);
    }
  }, [selectedOrgId]);

  async function createOrg() {
    setError(null);

    if (!orgName.trim()) {
      setError("Organization name is required");
      setTimeout(() => errRef.current?.focus(), 50);
      return;
    }

    const r = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgName }),
    });

    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error || "Failed to create organization");
      setTimeout(() => errRef.current?.focus(), 50);
      return;
    }

    const { org } = await r.json();
    setStatus("Organization created.");
    setTimeout(() => setStatus(null), 1200);
    await refreshOrgs();
    setSelectedOrgId(org.id);
  }

  async function inviteMember() {
    setError(null);

    if (!selectedOrgId) {
      setError("Select an organization first");
      setTimeout(() => errRef.current?.focus(), 50);
      return;
    }

    if (!memberEmail.trim() || !memberEmail.includes("@")) {
      setError("Valid email is required");
      setTimeout(() => errRef.current?.focus(), 50);
      return;
    }

    const r = await fetch(`/api/orgs/${selectedOrgId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: memberEmail, role: memberRole }),
    });

    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error || "Failed to invite member");
      setTimeout(() => errRef.current?.focus(), 50);
      return;
    }

    setStatus("Member invited.");
    setTimeout(() => setStatus(null), 1200);
    await refreshMembers();
    setMemberEmail("");
  }

  async function createProject() {
    setError(null);

    if (!selectedOrgId) {
      setError("Select an organization first");
      setTimeout(() => errRef.current?.focus(), 50);
      return;
    }

    if (!projectName.trim()) {
      setError("Project name is required");
      setTimeout(() => errRef.current?.focus(), 50);
      return;
    }

    const r = await fetch(`/api/orgs/${selectedOrgId}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName,
        description: projectDesc,
      }),
    });

    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error || "Failed to create project");
      setTimeout(() => errRef.current?.focus(), 50);
      return;
    }

    setStatus("Project created.");
    setTimeout(() => setStatus(null), 1200);
    await refreshProjects();
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Organizations & Projects</h1>

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

      {/* Create Organization */}
      <section className="rounded-2xl border p-4">
        <h2 className="font-semibold mb-2">Create Organization</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="org-name" className="text-sm font-medium">
              Organization Name
            </label>
            <input
              id="org-name"
              className="mt-1 w-full rounded-md border p-2"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3">
          <button
            onClick={createOrg}
            className="h-11 rounded-xl px-4 font-medium border bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label="Create organization"
            data-testid="primary-cta"
          >
            Create Organization
          </button>
        </div>
      </section>

      {/* Select Organization */}
      <section className="rounded-2xl border p-4">
        <h2 className="font-semibold mb-2">Select Organization</h2>

        <div>
          <label htmlFor="select-org" className="text-sm font-medium">
            Organization
          </label>
          <select
            id="select-org"
            className="mt-1 w-full rounded-md border p-2"
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
          >
            <option value="">-- Select an organization --</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {selectedOrgId && (
        <>
          {/* Invite Member */}
          <section className="rounded-2xl border p-4">
            <h2 className="font-semibold mb-2">Invite Member</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="member-email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="member-email"
                  type="email"
                  className="mt-1 w-full rounded-md border p-2"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="colleague@example.com"
                />
              </div>

              <div>
                <label htmlFor="member-role" className="text-sm font-medium">
                  Role
                </label>
                <select
                  id="member-role"
                  className="mt-1 w-full rounded-md border p-2"
                  value={memberRole}
                  onChange={(e) =>
                    setMemberRole(
                      e.target.value as "owner" | "admin" | "member" | "viewer"
                    )
                  }
                >
                  <option value="owner">owner</option>
                  <option value="admin">admin</option>
                  <option value="member">member</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={inviteMember}
                className="h-11 rounded-xl px-4 font-medium border"
                aria-label="Invite member"
              >
                Invite Member
              </button>
            </div>

            {/* Members List */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2">Members</h3>
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.id} className="text-sm rounded border p-2">
                    <strong>{m.email}</strong> · {m.role}
                  </li>
                ))}
                {members.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    No members yet.
                  </li>
                )}
              </ul>
            </div>
          </section>

          {/* Create Project */}
          <section className="rounded-2xl border p-4">
            <h2 className="font-semibold mb-2">Create Project</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="project-name" className="text-sm font-medium">
                  Project Name
                </label>
                <input
                  id="project-name"
                  className="mt-1 w-full rounded-md border p-2"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="project-desc" className="text-sm font-medium">
                  Description (optional)
                </label>
                <input
                  id="project-desc"
                  className="mt-1 w-full rounded-md border p-2"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={createProject}
                className="h-11 rounded-xl px-4 font-medium border"
                aria-label="Create project"
              >
                Create Project
              </button>
            </div>
          </section>

          {/* Projects List */}
          <section className="rounded-2xl border p-4">
            <h2 className="font-semibold mb-2">Projects</h2>

            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((proj) => (
                <ProjectCard key={proj.id} project={proj} />
              ))}

              {projects.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No projects yet.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
