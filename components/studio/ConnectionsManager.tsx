'use client';

/**
 * CONNECTIONS MANAGER
 *
 * Manage database connections for the Agent Studio
 * - Add/Edit/Delete connections
 * - Test connection status
 * - Credentials vault
 * - Connection pooling status
 */

import { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
  Key,
  Shield,
  Lock
} from 'lucide-react';
import { ConnectionCard } from './ConnectionCard';

export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  status?: 'connected' | 'disconnected' | 'testing' | 'error';
  lastTested?: string;
  createdAt: string;
  updatedAt: string;
}

interface ConnectionsManagerProps {
  onConnectionSelect?: (connection: DatabaseConnection) => void;
}

const DB_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432 },
  { value: 'mysql', label: 'MySQL', defaultPort: 3306 },
  { value: 'mongodb', label: 'MongoDB', defaultPort: 27017 },
  { value: 'sqlite', label: 'SQLite', defaultPort: 0 }
] as const;

export function ConnectionsManager({ onConnectionSelect }: ConnectionsManagerProps) {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [activeTab, setActiveTab] = useState<'connections' | 'vault'>('connections');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<DatabaseConnection>>({
    type: 'postgresql',
    port: 5432,
    ssl: false
  });

  // Load connections from backend API with timeout
  const loadConnections = async () => {
    console.log('[ConnectionsManager] Loading connections...');

    try {
      setIsLoading(true);
      setError(null);

      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('[ConnectionsManager] Request timed out after 10s');
      }, 10000);

      try {
        const response = await fetch('/api/db-connections', {
          headers: {
            'x-user-id': 'default-user' // TODO: Get from auth context
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to load connections`);
        }

        const data = await response.json();
        console.log('[ConnectionsManager] Connections loaded:', data.connections?.length ?? 0);
        setConnections(data.connections || []);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error: any) {
      const errorMessage = error?.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : error?.message || 'Failed to load connections';

      console.error('[ConnectionsManager] Error:', error);
      setError(errorMessage);
      setConnections([]); // Clear on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData({
      type: 'postgresql',
      port: 5432,
      ssl: false
    });
  };

  const handleEdit = (connection: DatabaseConnection) => {
    setEditingId(connection.id);
    setIsAddingNew(false);
    setFormData(connection);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/db-connections/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': 'default-user'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete connection');
      }

      await loadConnections();
    } catch (error) {
      console.error('Failed to delete connection:', error);
      setError('Failed to delete connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.host || !formData.database) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (editingId) {
        // Update existing
        const response = await fetch(`/api/db-connections/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'default-user'
          },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          throw new Error('Failed to update connection');
        }

        await loadConnections();
      } else {
        // Add new
        const response = await fetch('/api/db-connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'default-user'
          },
          body: JSON.stringify({
            name: formData.name,
            type: formData.type || 'postgresql',
            host: formData.host,
            port: formData.port || 5432,
            database: formData.database,
            username: formData.username || '',
            password: formData.password || '',
            ssl: formData.ssl || false
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create connection');
        }

        await loadConnections();
      }

      setIsAddingNew(false);
      setEditingId(null);
      setFormData({
        type: 'postgresql',
        port: 5432,
        ssl: false
      });
    } catch (error) {
      console.error('Failed to save connection:', error);
      setError('Failed to save connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData({
      type: 'postgresql',
      port: 5432,
      ssl: false
    });
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);

    // Update status to testing (optimistic UI update)
    setConnections(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'testing' as const } : c
    ));

    try {
      const response = await fetch(`/api/db-connections/${id}/test`, {
        method: 'POST',
        headers: {
          'x-user-id': 'default-user'
        }
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Connection test successful for ${id}`);
      } else {
        console.error(`❌ Connection test failed for ${id}:`, result.error);
      }

      // Reload connections to get updated status from backend
      await loadConnections();
    } catch (error) {
      console.error('Failed to test connection:', error);
      setError('Failed to test connection');

      // Revert status on error
      setConnections(prev => prev.map(c =>
        c.id === id ? { ...c, status: 'error' as const } : c
      ));
    } finally {
      setTestingId(null);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPassword(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-400/50 bg-red-400/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('connections')}
            className={`flex items-center gap-2 border-b-2 px-1 pb-2 text-sm font-medium transition ${activeTab === 'connections'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-text-muted hover:text-text'
              }`}
          >
            <Database className="h-4 w-4" />
            Connections
            <span className="ml-1 rounded-full bg-card/10 px-2 py-0.5 text-xs">
              {connections.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 border-b-2 px-1 pb-2 text-sm font-medium transition ${activeTab === 'vault'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-text-muted hover:text-text'
              }`}
          >
            <Shield className="h-4 w-4" />
            Credentials Vault
          </button>
        </div>

        {activeTab === 'connections' && !isAddingNew && !editingId && (
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 rounded-lg bg-purple-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-purple-600"
          >
            <Plus className="h-4 w-4" />
            Add Connection
          </button>
        )}
      </div>

      {/* Content Area */}
      {activeTab === 'connections' ? (
        <>
          {/* Connection Form (Add/Edit) */}
          {(isAddingNew || editingId) && (
            <div className="mb-4 rounded-lg border border-purple-400/50 bg-purple-400/10 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-400" />
                <h4 className="text-sm font-semibold text-text">
                  {editingId ? 'Edit Connection' : 'New Connection'}
                </h4>
              </div>

              <div className="grid gap-3">
                {/* Connection Name */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-text">
                    Connection Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Database"
                    className="w-full rounded border border-white/10 bg-surface-1 px-3 py-2 text-sm text-text outline-none focus:border-purple-400/50"
                  />
                </div>

                {/* Database Type */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-text">
                    Database Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const type = e.target.value as DatabaseConnection['type'];
                      const dbType = DB_TYPES.find(t => t.value === type);
                      setFormData({
                        ...formData,
                        type,
                        port: dbType?.defaultPort || 5432
                      });
                    }}
                    className="w-full rounded border border-white/10 bg-surface-1 px-3 py-2 text-sm text-text outline-none focus:border-purple-400/50"
                  >
                    {DB_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Host & Port */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-text">
                      Host <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.host || ''}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      placeholder="localhost"
                      className="w-full rounded border border-white/10 bg-surface-1 px-3 py-2 text-sm text-text outline-none focus:border-purple-400/50"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text">Port</label>
                    <input
                      type="number"
                      value={formData.port || ''}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                      className="w-full rounded border border-white/10 bg-surface-1 px-3 py-2 text-sm text-text outline-none focus:border-purple-400/50"
                    />
                  </div>
                </div>

                {/* Database Name */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-text">
                    Database Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.database || ''}
                    onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                    placeholder="mydb"
                    className="w-full rounded border border-white/10 bg-surface-1 px-3 py-2 text-sm text-text outline-none focus:border-purple-400/50"
                  />
                </div>

                {/* Credentials */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs font-medium text-text">
                      <Key className="h-3 w-3" />
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="postgres"
                      className="w-full rounded border border-white/10 bg-surface-1 px-3 py-2 text-sm text-text outline-none focus:border-purple-400/50"
                    />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs font-medium text-text">
                      <Key className="h-3 w-3" />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword['form'] ? 'text' : 'password'}
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full rounded border border-white/10 bg-surface-1 px-3 py-2 pr-8 text-sm text-text outline-none focus:border-purple-400/50"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('form')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                      >
                        {showPassword['form'] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* SSL Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ssl"
                    checked={formData.ssl || false}
                    onChange={(e) => setFormData({ ...formData, ssl: e.target.checked })}
                    className="h-4 w-4 rounded border-white/10"
                  />
                  <label htmlFor="ssl" className="text-xs font-medium text-text">
                    Use SSL/TLS
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-0 px-3 py-1.5 text-sm font-medium text-text transition hover:bg-card/5 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && connections.length === 0 && (
            <div className="flex items-center justify-center rounded-lg border border-white/10 bg-surface-0 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          )}

          {/* Connections List */}
          {!isLoading && connections.length === 0 && !isAddingNew ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-surface-0 p-8 text-center">
              <Database className="mx-auto h-12 w-12 text-text-muted opacity-30" />
              <p className="mt-3 text-sm font-medium text-text">No database connections</p>
              <p className="mt-1 text-xs text-text-muted">
                Add a connection to start building workflows with database queries
              </p>
              <button
                onClick={handleAddNew}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-purple-600"
              >
                <Plus className="h-4 w-4" />
                Add Your First Connection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {connections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  isTesting={testingId === connection.id}
                  onTest={handleTestConnection}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Credentials Vault UI */
        <div className="rounded-lg border border-white/10 bg-surface-0 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
            <Lock className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-text">Credentials Vault</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            Securely store and manage API keys, secrets, and certificates.
            These credentials can be referenced in your connections and workflows.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Mock Vault Items */}
            {[
              { name: 'AWS Access Key', type: 'API Key', lastUsed: '2h ago' },
              { name: 'Stripe Secret', type: 'Secret', lastUsed: '1d ago' },
              { name: 'Production DB Cert', type: 'Certificate', lastUsed: '5d ago' }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-start rounded-lg border border-white/5 bg-surface-1 p-4 transition hover:border-purple-400/30">
                <div className="mb-3 rounded bg-purple-500/20 p-2 text-purple-400">
                  <Key className="h-4 w-4" />
                </div>
                <h4 className="font-medium text-text">{item.name}</h4>
                <div className="mt-1 flex w-full items-center justify-between text-xs text-text-muted">
                  <span>{item.type}</span>
                  <span>{item.lastUsed}</span>
                </div>
              </div>
            ))}

            {/* Add New Item */}
            <button className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-transparent p-4 transition hover:border-purple-400/50 hover:bg-purple-400/5">
              <Plus className="mb-2 h-6 w-6 text-text-muted" />
              <span className="text-sm font-medium text-text-muted">Add Credential</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
