/**
 * API Keys Tab - Sidebar Design System
 */

'use client';

import { useState } from 'react';
import {
  Key,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Check
} from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  scope: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  keyPreview: string;
  created: string;
  lastUsed: string | null;
  expiresAt: string | null;
  permissions: Permission[];
  rateLimit: number;
  status: 'active' | 'expired' | 'revoked';
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  { id: 'read:agents', name: 'Agents lesen', description: 'Agent-Daten abrufen', scope: 'agents' },
  { id: 'write:agents', name: 'Agents schreiben', description: 'Agents erstellen/bearbeiten', scope: 'agents' },
  { id: 'delete:agents', name: 'Agents löschen', description: 'Agents entfernen', scope: 'agents' },
  { id: 'read:workflows', name: 'Workflows lesen', description: 'Workflow-Daten abrufen', scope: 'workflows' },
  { id: 'write:workflows', name: 'Workflows schreiben', description: 'Workflows erstellen/bearbeiten', scope: 'workflows' },
  { id: 'execute:workflows', name: 'Workflows ausführen', description: 'Workflows starten', scope: 'workflows' },
  { id: 'read:analytics', name: 'Analytics lesen', description: 'Statistiken abrufen', scope: 'analytics' },
  { id: 'read:users', name: 'Benutzer lesen', description: 'Benutzerdaten abrufen', scope: 'users' },
  { id: 'write:users', name: 'Benutzer verwalten', description: 'Benutzer erstellen/bearbeiten', scope: 'users' },
  { id: 'admin:full', name: 'Vollzugriff', description: 'Alle Berechtigungen', scope: 'admin' },
];

export default function ApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Production API',
      key: 'flwnt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      keyPreview: 'flwnt_live_xxxx...xxxx',
      created: '2024-01-15',
      lastUsed: 'vor 2 Stunden',
      expiresAt: '2025-01-15',
      permissions: AVAILABLE_PERMISSIONS.filter(p => ['read:agents', 'write:agents', 'read:workflows'].includes(p.id)),
      rateLimit: 1000,
      status: 'active'
    },
    {
      id: '2',
      name: 'Development',
      key: 'flwnt_test_x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4',
      keyPreview: 'flwnt_test_x9y8...l5k4',
      created: '2024-02-20',
      lastUsed: null,
      expiresAt: null,
      permissions: AVAILABLE_PERMISSIONS.filter(p => p.id === 'read:agents'),
      rateLimit: 100,
      status: 'active'
    },
  ]);

  const [showKey, setShowKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [createKeyModalOpen, setCreateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([]);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(1000);
  const [newKeyExpiry, setNewKeyExpiry] = useState<'30' | '90' | '365' | 'never'>('never');
  const [newKeyCreated, setNewKeyCreated] = useState<string | null>(null);
  const [keyCreating, setKeyCreating] = useState(false);

  const generateApiKey = (prefix: string): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let key = prefix;
    for (let i = 0; i < 32; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
  };

  const handleCopyKey = (keyId: string, keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    setCopied(keyId);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    setKeyCreating(true);
    await new Promise(r => setTimeout(r, 1000));

    const fullKey = generateApiKey('flwnt_live_');
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: fullKey,
      keyPreview: fullKey.substring(0, 12) + '...' + fullKey.substring(fullKey.length - 4),
      created: new Date().toISOString().split('T')[0],
      lastUsed: null,
      expiresAt: newKeyExpiry === 'never' ? null : new Date(Date.now() + parseInt(newKeyExpiry) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      permissions: AVAILABLE_PERMISSIONS.filter(p => newKeyPermissions.includes(p.id)),
      rateLimit: newKeyRateLimit,
      status: 'active'
    };

    setApiKeys([...apiKeys, newKey]);
    setNewKeyCreated(fullKey);
    setKeyCreating(false);
  };

  const handleCloseCreateKeyModal = () => {
    setCreateKeyModalOpen(false);
    setNewKeyName('');
    setNewKeyPermissions([]);
    setNewKeyRateLimit(1000);
    setNewKeyExpiry('never');
    setNewKeyCreated(null);
  };

  const handleRevokeKey = (keyId: string) => {
    if (!confirm('API-Key wirklich widerrufen?')) return;
    setApiKeys(apiKeys.map(k => k.id === keyId ? { ...k, status: 'revoked' as const } : k));
  };

  const handleDeleteKey = (keyId: string) => {
    if (!confirm('API-Key endgültig löschen?')) return;
    setApiKeys(apiKeys.filter(k => k.id !== keyId));
  };

  return (
    <div className="w-full px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">API-Schlüssel</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Programmatischer Zugriff</p>
        </div>
        <button
          onClick={() => setCreateKeyModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Neuer Key
        </button>
      </div>

      {/* API Keys List */}
      <div className="space-y-3">
        {apiKeys.map((apiKey) => (
          <div
            key={apiKey.id}
            className={`p-4 rounded-xl bg-card border-2 border-border ${
              apiKey.status === 'revoked' ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{apiKey.name}</span>
                {apiKey.status === 'revoked' && (
                  <span className="px-1.5 py-0.5 text-xs bg-red-500/10 text-red-500 border border-red-500/30 rounded">
                    Widerrufen
                  </span>
                )}
                {apiKey.expiresAt && (
                  <span className="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                    Läuft ab: {apiKey.expiresAt}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{apiKey.rateLimit}/min</span>
                {apiKey.lastUsed && <span>· {apiKey.lastUsed}</span>}
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {apiKey.permissions.map(p => (
                <span key={p.id} className="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                  {p.name}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-input border-2 border-border rounded-xl font-mono text-xs text-foreground overflow-hidden">
                {showKey === apiKey.id ? apiKey.key : apiKey.keyPreview}
              </code>
              {apiKey.status === 'active' && (
                <>
                  <button
                    onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border-2 border-border transition-colors"
                  >
                    {showKey === apiKey.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleCopyKey(apiKey.id, apiKey.key)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border-2 border-border transition-colors"
                  >
                    {copied === apiKey.id ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleRevokeKey(apiKey.id)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 border-2 border-border transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => handleDeleteKey(apiKey.id)}
                className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border-2 border-border transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {apiKeys.length === 0 && (
          <div className="p-8 rounded-xl bg-muted/50 border-2 border-dashed border-border text-center">
            <Key className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Keine API-Keys vorhanden</p>
          </div>
        )}
      </div>

      {/* Create API Key Modal */}
      {createKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="max-w-lg w-full p-6 rounded-2xl bg-card border-2 border-border shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">Neuen API-Key erstellen</h3>
              <button
                onClick={handleCloseCreateKeyModal}
                className="p-1 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {!newKeyCreated ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="z.B. Production, Staging"
                    className="w-full px-3 py-2 rounded-xl bg-input border-2 border-border text-foreground text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Berechtigungen</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-muted/50 border-2 border-border">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={newKeyPermissions.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewKeyPermissions([...newKeyPermissions, perm.id]);
                            } else {
                              setNewKeyPermissions(newKeyPermissions.filter(p => p !== perm.id));
                            }
                          }}
                          className="rounded border-border bg-input text-primary focus:ring-primary focus:ring-offset-0"
                        />
                        <div>
                          <p className="text-xs text-foreground">{perm.name}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Rate Limit</label>
                    <select
                      value={newKeyRateLimit}
                      onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-input border-2 border-border text-foreground text-sm focus:border-primary/40 focus:outline-none"
                    >
                      <option value={100}>100/min</option>
                      <option value={500}>500/min</option>
                      <option value={1000}>1.000/min</option>
                      <option value={5000}>5.000/min</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Ablauf</label>
                    <select
                      value={newKeyExpiry}
                      onChange={(e) => setNewKeyExpiry(e.target.value as typeof newKeyExpiry)}
                      className="w-full px-3 py-2 rounded-xl bg-input border-2 border-border text-foreground text-sm focus:border-primary/40 focus:outline-none"
                    >
                      <option value="30">30 Tage</option>
                      <option value="90">90 Tage</option>
                      <option value="365">1 Jahr</option>
                      <option value="never">Nie</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleCreateKey}
                  disabled={!newKeyName.trim() || newKeyPermissions.length === 0 || keyCreating}
                  className="w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {keyCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Key erstellen
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30">
                  <p className="text-xs text-emerald-500 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    API-Key erfolgreich erstellt!
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border-2 border-amber-500/30">
                  <p className="text-xs text-amber-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Kopieren Sie den Key jetzt!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-input rounded-xl text-xs text-foreground font-mono break-all border-2 border-border">
                    {newKeyCreated}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newKeyCreated!);
                      setCopied('new');
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground border-2 border-border transition-colors"
                  >
                    {copied === 'new' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={handleCloseCreateKeyModal}
                  className="w-full px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-medium border-2 border-border hover:bg-muted/80 transition-colors"
                >
                  Fertig
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
