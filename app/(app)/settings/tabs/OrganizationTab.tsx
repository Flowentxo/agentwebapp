/**
 * Organization Tab - Real API Integration
 * Fetches and updates organization settings via /api/settings/org
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Building2, Globe, Clock, Edit, X, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { getCsrfToken } from '@/lib/profile/client-utils';

interface OrgSettings {
  name: string;
  domain: string;
  language: string;
  timezone: string;
  orgId: string;
}

export default function OrganizationTab() {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [saving, setSaving] = useState(false);

  // Load organization settings on mount
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const csrfToken = getCsrfToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const response = await fetch('/api/settings/org', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error?.message || 'Fehler beim Laden der Organisationseinstellungen');
      }

      setSettings(data.data);
      setNewOrgName(data.data.name);
      setNewDomain(data.data.domain);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Laden';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveGeneral = async (field: keyof OrgSettings, value: string) => {
    if (!settings) return;

    setSaving(true);
    try {
      const csrfToken = getCsrfToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const response = await fetch('/api/settings/org', {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ [field]: value }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error?.message || 'Speichern fehlgeschlagen');
      }

      setSettings(data.data);
      toast.success('Einstellung gespeichert');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Speichern fehlgeschlagen';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async () => {
    await handleSaveGeneral('name', newOrgName);
    setRenameDialogOpen(false);
  };

  const handleChangeDomain = async () => {
    if (!confirm('Domäne ändern? Alle Benutzer müssen sich neu anmelden.')) return;
    await handleSaveGeneral('domain', newDomain);
    setDomainDialogOpen(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full px-6 py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        <span className="ml-3 text-zinc-400">Lade Organisationseinstellungen...</span>
      </div>
    );
  }

  // Error state
  if (error && !settings) {
    return (
      <div className="w-full px-6 py-6">
        <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-3 text-red-400 mb-3">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Fehler beim Laden</span>
          </div>
          <p className="text-sm text-red-300/80 mb-4">{error}</p>
          <button
            onClick={loadSettings}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="w-full px-6 py-6 space-y-6">
      {/* Error banner (when settings exist but refresh failed) */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Organization Header */}
      <div className="p-6 rounded-lg bg-zinc-800/50 border border-zinc-800">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-indigo-500/10">
            <Building2 className="h-6 w-6 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-medium text-white">{settings.name}</h2>
            <p className="text-xs text-zinc-500 mt-1">Unternehmenseinstellungen verwalten</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSettings}
              disabled={loading}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              title="Aktualisieren"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                setNewOrgName(settings.name);
                setRenameDialogOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
              Bearbeiten
            </button>
          </div>
        </div>
      </div>

      {/* Identity & Access Section */}
      <div className="p-6 rounded-lg bg-zinc-800/50 border border-zinc-800">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">
          Identität & Zugriff
        </h3>

        <div className="space-y-4">
          {/* Domain */}
          <div className="flex items-center justify-between py-3 border-b border-zinc-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-800">
                <Globe className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{settings.domain}</p>
                <p className="text-xs text-zinc-500">Öffentliche Domäne</p>
              </div>
            </div>
            <button
              onClick={() => {
                setNewDomain(settings.domain);
                setDomainDialogOpen(true);
              }}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Ändern
            </button>
          </div>

          {/* Organization ID */}
          <div className="flex items-center gap-3 py-3">
            <div className="p-2 rounded-lg bg-zinc-800">
              <Edit className="h-4 w-4 text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-mono text-indigo-400">{settings.orgId}</p>
              <p className="text-xs text-zinc-500">Organisation ID (nicht änderbar)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Regional Settings Section */}
      <div className="p-6 rounded-lg bg-zinc-800/50 border border-zinc-800">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">
          Regionale Einstellungen
        </h3>

        <div className="space-y-4">
          {/* Language */}
          <div className="flex items-center justify-between py-3 border-b border-zinc-700">
            <div>
              <p className="text-sm text-white">Sprache</p>
              <p className="text-xs text-zinc-500">UI, E-Mails & Benachrichtigungen</p>
            </div>
            <select
              value={settings.language}
              onChange={(e) => handleSaveGeneral('language', e.target.value)}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            >
              <option value="de">Deutsch (DE)</option>
              <option value="en">English (US)</option>
              <option value="fr">Français (FR)</option>
            </select>
          </div>

          {/* Timezone */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-zinc-500" />
              <div>
                <p className="text-sm text-white">Zeitzone</p>
                <p className="text-xs text-zinc-500">Datumsformat & Uhrzeiten</p>
              </div>
            </div>
            <select
              value={settings.timezone}
              onChange={(e) => handleSaveGeneral('timezone', e.target.value)}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            >
              <option value="Europe/Berlin">Europe/Berlin (CET)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rename Modal */}
      {renameDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">Organisation umbenennen</h3>
              <button
                onClick={() => setRenameDialogOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Neuer Name</label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setRenameDialogOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleRename}
                  disabled={saving || !newOrgName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm hover:bg-indigo-500/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Domain Change Modal */}
      {domainDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">Domäne ändern</h3>
              <button
                onClick={() => setDomainDialogOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs text-yellow-400">
                  Alle Benutzer müssen sich nach der Änderung neu anmelden.
                </p>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Neue Domäne</label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDomainDialogOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleChangeDomain}
                  disabled={saving || !newDomain.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm hover:bg-indigo-500/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Speichern...' : 'Domäne ändern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
