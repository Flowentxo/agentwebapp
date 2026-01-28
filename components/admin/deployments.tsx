"use client";

import { useState, useEffect } from "react";
import { Play, RotateCcw, CheckCircle, XCircle, Clock, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DeploymentStatus = "success" | "failed" | "rolled_back" | "in_progress";

interface Deployment {
  id: string;
  version: string;
  commit: string;
  branch: string;
  status: DeploymentStatus;
  deployedBy: string;
  deployedAt: string;
  duration: string;
  healthCheckPassed: boolean;
}

export function Deployments() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [activeVersion, setActiveVersion] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const fetchDeployments = async () => {
    try {
      const res = await fetch("/api/admin/deploy/list");
      const data = await res.json();
      setDeployments(data.deployments);
      setActiveVersion(data.active);
    } catch (error) {
      console.error("Failed to fetch deployments:", error);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  const handleRedeploy = async (deploymentId: string) => {
    if (!confirm("Deployment neu ausführen?")) return;

    setLoading(deploymentId);
    try {
      await fetch("/api/admin/deploy/redeploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentId }),
      });
      await fetchDeployments();
    } catch (error) {
      console.error("Redeploy failed:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleRollback = async (deploymentId: string) => {
    if (!confirm("Rollback zu dieser Version durchführen?")) return;

    setLoading(deploymentId);
    try {
      await fetch(`/api/admin/deploy/rollback/${deploymentId}`, {
        method: "POST",
      });
      await fetchDeployments();
    } catch (error) {
      console.error("Rollback failed:", error);
    } finally {
      setLoading(null);
    }
  };

  const triggerHealthCheck = async () => {
    try {
      await fetch("/api/admin/deploy/health-check", { method: "POST" });
      await fetchDeployments();
    } catch (error) {
      console.error("Health check failed:", error);
    }
  };

  const getStatusBadge = (status: DeploymentStatus) => {
    switch (status) {
      case "success":
        return <Badge variant="success">Success</Badge>;
      case "failed":
        return <Badge variant="error">Failed</Badge>;
      case "rolled_back":
        return <Badge variant="warning">Rolled Back</Badge>;
      case "in_progress":
        return <Badge variant="info">In Progress</Badge>;
    }
  };

  const getStatusIcon = (status: DeploymentStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-400" />;
      case "rolled_back":
        return <RotateCcw className="h-5 w-5 text-yellow-400" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-400 animate-pulse" />;
    }
  };

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Deployments</h2>
          <p className="text-sm text-text-muted">Versionen, Rollbacks und Health-Checks</p>
        </div>
        <Button
          onClick={triggerHealthCheck}
          className="bg-surface-1 hover:bg-card/10"
        >
          Health-Check nach Deployment
        </Button>
      </div>

      <div className="hairline-b mb-4" />

      {/* Active Version */}
      {activeVersion && (
        <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GitBranch className="h-4 w-4 text-accent" />
                <span className="font-semibold text-text">Aktive Version</span>
                {getStatusBadge(activeVersion.status)}
              </div>
              <p className="text-sm text-text-muted">
                {activeVersion.version} · {activeVersion.branch} · {activeVersion.commit}
              </p>
              <p className="text-xs text-text-muted">
                Deployed von {activeVersion.deployedBy} ·{" "}
                {new Date(activeVersion.deployedAt).toLocaleString("de-DE")}
              </p>
            </div>
            <div className="text-right">
              {activeVersion.healthCheckPassed ? (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">Health OK</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="h-5 w-5" />
                  <span className="text-sm">Health Failed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deployment History */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text mb-2">Verlauf</h3>
        {deployments.map((deployment) => (
          <div
            key={deployment.id}
            className="flex items-start gap-4 p-4 bg-surface-1 rounded-lg border border-white/10"
          >
            <div className="flex-shrink-0 mt-1">{getStatusIcon(deployment.status)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-text">{deployment.version}</span>
                {getStatusBadge(deployment.status)}
                <span className="text-xs text-text-muted mono">{deployment.branch}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="mono">{deployment.commit}</span>
                <span>{deployment.deployedBy}</span>
                <span>{new Date(deployment.deployedAt).toLocaleString("de-DE")}</span>
                <span>Dauer: {deployment.duration}</span>
              </div>
              {deployment.healthCheckPassed && (
                <p className="text-xs text-green-400 mt-1">✓ Health-Check bestanden</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {deployment.status === "success" && (
                <>
                  <button
                    onClick={() => handleRedeploy(deployment.id)}
                    disabled={loading === deployment.id}
                    className="p-2 hover:bg-card/10 rounded text-accent focus-ring"
                    title="Redeploy"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleRollback(deployment.id)}
                    disabled={loading === deployment.id}
                    className="p-2 hover:bg-card/10 rounded text-text-muted focus-ring"
                    title="Rollback"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
