"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Plus, RefreshCw, Trash2, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExternalAgent {
  id: string;
  name: string;
  description?: string;
  endpoint: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  version?: string;
  iconUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastHealthCheck?: string;
  config: {
    timeout?: number;
    retries?: number;
    rateLimit?: number;
    webhookUrl?: string;
  };
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<ExternalAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/platform/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHealthCheck = async (agentId: string) => {
    try {
      const res = await fetch(`/api/platform/agents/${agentId}/health`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchAgents(); // Refresh list
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    try {
      const res = await fetch(`/api/platform/agents/${agentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchAgents();
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const getStatusIcon = (status: ExternalAgent['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'inactive':
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
      case 'maintenance':
        return <Settings className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: ExternalAgent['status']) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-500/20 text-green-400`;
      case 'inactive':
        return `${baseClasses} bg-muted/500/20 text-muted-foreground`;
      case 'maintenance':
        return `${baseClasses} bg-yellow-500/20 text-yellow-400`;
      case 'error':
        return `${baseClasses} bg-red-500/20 text-red-400`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-text-muted">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 id="page-title" className="text-xl md:text-2xl font-semibold text-text">
            External Agents
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Manage and monitor external agent integrations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchAgents}
            className="bg-surface-1 hover:bg-card/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setShowRegisterModal(true)}
            className="bg-accent/20 hover:bg-accent/30 text-accent"
          >
            <Plus className="h-4 w-4 mr-2" />
            Register Agent
          </Button>
        </div>
      </div>

      {/* Agents List */}
      {agents.length === 0 ? (
        <div className="panel p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Settings className="h-16 w-16 text-text-muted" />
            <div>
              <h2 className="text-lg font-semibold text-text">No agents registered</h2>
              <p className="mt-1 text-sm text-text-muted">
                Register your first external agent to get started
              </p>
            </div>
            <Button
              onClick={() => setShowRegisterModal(true)}
              className="bg-accent/20 hover:bg-accent/30 text-accent"
            >
              <Plus className="h-4 w-4 mr-2" />
              Register Agent
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.id} className="panel p-6">
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  {agent.iconUrl ? (
                    <Image
                      src={agent.iconUrl}
                      alt={agent.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-lg"
                      unoptimized
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-surface-1 flex items-center justify-center">
                      <Settings className="h-5 w-5 text-text-muted" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-semibold text-text">{agent.name}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{agent.id}</p>
                  </div>
                </div>
                {getStatusIcon(agent.status)}
              </div>

              {/* Description */}
              {agent.description && (
                <p className="text-sm text-text-muted mb-4 line-clamp-2">
                  {agent.description}
                </p>
              )}

              {/* Status & Version */}
              <div className="flex items-center gap-2 mb-4">
                <span className={getStatusBadge(agent.status)}>
                  {agent.status}
                </span>
                {agent.version && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-surface-1 text-text-muted">
                    v{agent.version}
                  </span>
                )}
              </div>

              {/* Capabilities */}
              {agent.capabilities.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-text-muted mb-2">Capabilities</div>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.slice(0, 3).map((cap, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-xs bg-accent/10 text-accent"
                      >
                        {cap}
                      </span>
                    ))}
                    {agent.capabilities.length > 3 && (
                      <span className="px-2 py-0.5 rounded text-xs bg-surface-1 text-text-muted">
                        +{agent.capabilities.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Last Health Check */}
              {agent.lastHealthCheck && (
                <div className="text-xs text-text-muted mb-4">
                  Last check: {new Date(agent.lastHealthCheck).toLocaleString()}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                <Button
                  onClick={() => handleHealthCheck(agent.id)}
                  className="flex-1 bg-surface-1 hover:bg-card/10 text-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Check
                </Button>
                <Button
                  onClick={() => handleDelete(agent.id)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <RegisterAgentModal
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            setShowRegisterModal(false);
            fetchAgents();
          }}
        />
      )}
    </div>
  );
}

function RegisterAgentModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    endpoint: '',
    apiKey: '',
    capabilities: '',
    version: '',
    iconUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/platform/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          capabilities: formData.capabilities
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register agent');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-0 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-text mb-4">Register External Agent</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Agent ID */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Agent ID *
            </label>
            <input
              type="text"
              required
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              className="w-full rounded-lg bg-surface-1 border border-white/10 px-3 py-2 text-text"
              placeholder="my-custom-agent"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg bg-surface-1 border border-white/10 px-3 py-2 text-text"
              placeholder="My Custom Agent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg bg-surface-1 border border-white/10 px-3 py-2 text-text"
              rows={3}
              placeholder="What does this agent do?"
            />
          </div>

          {/* Endpoint */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Endpoint URL *
            </label>
            <input
              type="url"
              required
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              className="w-full rounded-lg bg-surface-1 border border-white/10 px-3 py-2 text-text"
              placeholder="https://api.example.com/agent"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              API Key *
            </label>
            <input
              type="password"
              required
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              className="w-full rounded-lg bg-surface-1 border border-white/10 px-3 py-2 text-text"
              placeholder="sk-..."
            />
          </div>

          {/* Capabilities */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Capabilities (comma-separated)
            </label>
            <input
              type="text"
              value={formData.capabilities}
              onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
              className="w-full rounded-lg bg-surface-1 border border-white/10 px-3 py-2 text-text"
              placeholder="chat, analysis, generation"
            />
          </div>

          {/* Version & Icon */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Version
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full rounded-lg bg-surface-1 border border-white/10 px-3 py-2 text-text"
                placeholder="1.0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Icon URL
              </label>
              <input
                type="url"
                value={formData.iconUrl}
                onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                className="w-full rounded-lg bg-surface-1 border border-white/10 px-3 py-2 text-text"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent/20 hover:bg-accent/30 text-accent"
            >
              {loading ? 'Registering...' : 'Register Agent'}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="bg-surface-1 hover:bg-card/10"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
