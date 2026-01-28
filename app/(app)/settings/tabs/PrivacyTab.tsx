/**
 * Privacy Tab - Enterprise White Design
 * GDPR-compliant privacy settings with real API integration
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ProfileResponse } from '@/lib/profile/schemas';
import { getCsrfToken } from '@/lib/profile/client-utils';
import { toast } from 'sonner';
import {
  Eye,
  Globe,
  Users,
  Lock,
  Share2,
  Database,
  Download,
  AlertTriangle,
  Trash2,
  Shield,
  CheckCircle2,
  X,
  Mail
} from 'lucide-react';

interface PrivacyTabProps {
  profile: ProfileResponse;
  onUpdate: (updates: Partial<ProfileResponse>) => Promise<ProfileResponse>;
  loading: boolean;
}

type ProfileVisibility = 'public' | 'organization' | 'private';

interface PrivacySettings {
  profileVisibility: ProfileVisibility;
  showInDirectory: boolean;
  allowSearchIndexing: boolean;
  allowAnalytics: boolean;
  allowProductImprovement: boolean;
}

interface ExportStatus {
  id: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  requestedAt: string;
  completedAt: string | null;
  error: string | null;
}

const DEFAULT_SETTINGS: PrivacySettings = {
  profileVisibility: 'organization',
  showInDirectory: true,
  allowSearchIndexing: false,
  allowAnalytics: true,
  allowProductImprovement: false,
};

export default function PrivacyTab({ profile, onUpdate, loading }: PrivacyTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [initialData, setInitialData] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [hasPendingExport, setHasPendingExport] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch privacy settings on mount
  const fetchSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const csrfToken = getCsrfToken();

      const response = await fetch('/api/settings/privacy', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
      });

      const json = await response.json();

      if (json.ok && json.data) {
        setFormData(json.data);
        setInitialData(json.data);
      } else if (response.status === 401) {
        toast.error('Sitzung abgelaufen. Bitte erneut anmelden.');
        router.push('/login');
      } else {
        toast.error(json.error?.message || 'Fehler beim Laden der Einstellungen');
      }
    } catch (error) {
      console.error('[PRIVACY_TAB] Failed to fetch settings:', error);
      toast.error('Verbindungsfehler beim Laden der Einstellungen');
    } finally {
      setSettingsLoading(false);
    }
  }, [router]);

  // Fetch export status on mount
  const fetchExportStatus = useCallback(async () => {
    try {
      const csrfToken = getCsrfToken();

      const response = await fetch('/api/settings/privacy/export', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
      });

      const json = await response.json();

      if (json.ok && json.data) {
        setHasPendingExport(json.data.hasPending);
        if (json.data.exports && json.data.exports.length > 0) {
          setExportStatus(json.data.exports[0]);
        }
      }
    } catch (error) {
      console.error('[PRIVACY_TAB] Failed to fetch export status:', error);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchExportStatus();
  }, [fetchSettings, fetchExportStatus]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(initialData);
    setHasChanges(changed);
  }, [formData, initialData]);

  const handleVisibilityChange = (visibility: ProfileVisibility) => {
    setFormData((prev) => ({ ...prev, profileVisibility: visibility }));
  };

  const handleToggle = (field: keyof PrivacySettings) => {
    if (typeof formData[field] === 'boolean') {
      setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const csrfToken = getCsrfToken();

      const response = await fetch('/api/settings/privacy', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const json = await response.json();

      if (json.ok) {
        setInitialData(formData);
        setHasChanges(false);
        toast.success('Datenschutzeinstellungen gespeichert');
      } else if (response.status === 401) {
        toast.error('Sitzung abgelaufen. Bitte erneut anmelden.');
        router.push('/login');
      } else {
        toast.error(json.error?.message || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('[PRIVACY_TAB] Save failed:', error);
      toast.error('Verbindungsfehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    if (hasPendingExport) {
      toast.info('Ein Datenexport ist bereits in Bearbeitung. Bitte warten Sie auf die E-Mail.');
      return;
    }

    setExportLoading(true);

    try {
      const csrfToken = getCsrfToken();

      const response = await fetch('/api/settings/privacy/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
      });

      const json = await response.json();

      if (json.ok) {
        setHasPendingExport(true);
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-medium">Datenexport angefordert</span>
            <span className="text-xs text-muted-foreground">
              Sie erhalten eine E-Mail an {json.data?.email || profile.email} mit dem Download-Link.
            </span>
          </div>
        );
      } else if (response.status === 429) {
        toast.warning(json.error?.message || 'Ein Export ist bereits in Bearbeitung');
        setHasPendingExport(true);
      } else if (response.status === 401) {
        toast.error('Sitzung abgelaufen. Bitte erneut anmelden.');
        router.push('/login');
      } else {
        toast.error(json.error?.message || 'Fehler beim Anfordern des Exports');
      }
    } catch (error) {
      console.error('[PRIVACY_TAB] Export failed:', error);
      toast.error('Verbindungsfehler beim Exportieren');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'LÖSCHEN' && deleteConfirmText !== 'DELETE') return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const csrfToken = getCsrfToken();

      const response = await fetch('/api/profile/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          confirmText: deleteConfirmText,
        }),
      });

      const json = await response.json();

      if (json.ok) {
        toast.success('Ihr Konto wurde gelöscht. Auf Wiedersehen!');
        router.push(json.redirect || '/login?deleted=true');
      } else if (response.status === 400) {
        setDeleteError(json.error?.message || 'Ungültige Bestätigung');
      } else if (response.status === 401) {
        setDeleteError(json.error?.message || 'Authentifizierungsfehler');
      } else {
        setDeleteError(json.error?.message || 'Fehler beim Löschen des Kontos');
      }
    } catch (error) {
      console.error('[PRIVACY_TAB] Delete failed:', error);
      setDeleteError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const visibilityOptions = [
    { value: 'public' as ProfileVisibility, icon: Globe, label: 'Öffentlich', description: 'Jeder kann Ihr Profil sehen' },
    { value: 'organization' as ProfileVisibility, icon: Users, label: 'Organisation', description: 'Nur Ihre Organisation', recommended: true },
    { value: 'private' as ProfileVisibility, icon: Lock, label: 'Privat', description: 'Nur Sie können Ihr Profil sehen' },
  ];

  if (settingsLoading) {
    return (
      <div className="w-full px-6 py-12 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Eye className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
              {formData.profileVisibility === 'organization' ? 'Org' : formData.profileVisibility}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Sichtbarkeit</p>
          <p className="text-sm font-medium text-foreground capitalize">
            {formData.profileVisibility === 'organization' ? 'Organisation' : formData.profileVisibility === 'public' ? 'Öffentlich' : 'Privat'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-muted">
              <Share2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {formData.allowAnalytics ? 'Aktiv' : 'Aus'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Datenfreigabe</p>
          <p className="text-sm font-medium text-foreground">
            {formData.allowAnalytics ? 'Aktiviert' : 'Deaktiviert'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <Shield className="w-4 h-4 text-emerald-500" />
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xs text-muted-foreground mb-1">GDPR</p>
          <p className="text-sm font-medium text-foreground">Konform</p>
        </div>
      </div>

      {/* Profile Visibility */}
      <div className="p-6 rounded-2xl bg-card border-2 border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Profil-Sichtbarkeit
        </h3>

        <div className="space-y-2">
          {visibilityOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = formData.profileVisibility === option.value;

            return (
              <button
                key={option.value}
                onClick={() => handleVisibilityChange(option.value)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl border-2 transition-colors text-left ${
                  isSelected
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border hover:border-primary/30 bg-muted/50'
                }`}
              >
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-primary/10' : 'bg-card border border-border'}`}>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-foreground'}`}>
                      {option.label}
                    </span>
                    {option.recommended && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        Empfohlen
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-primary' : 'border-primary/30'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Additional Options */}
        <div className="mt-4 pt-4 border-t-2 border-border space-y-3">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-foreground">Im Verzeichnis anzeigen</p>
                <p className="text-xs text-muted-foreground">Im Benutzerverzeichnis auffindbar</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('showInDirectory')}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                formData.showInDirectory ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow-sm transition-transform ${
                formData.showInDirectory ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-foreground">Suchmaschinen-Indexierung</p>
                <p className="text-xs text-muted-foreground">Profil in Suchmaschinen</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('allowSearchIndexing')}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                formData.allowSearchIndexing ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow-sm transition-transform ${
                formData.allowSearchIndexing ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Data Sharing */}
      <div className="p-6 rounded-2xl bg-card border-2 border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Datenfreigabe
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-foreground">Analytik-Daten teilen</p>
                <p className="text-xs text-muted-foreground">Anonyme Nutzungsstatistiken</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('allowAnalytics')}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                formData.allowAnalytics ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow-sm transition-transform ${
                formData.allowAnalytics ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Share2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-foreground">Produktverbesserung</p>
                <p className="text-xs text-muted-foreground">Feedback und Fehlerberichte</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('allowProductImprovement')}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                formData.allowProductImprovement ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow-sm transition-transform ${
                formData.allowProductImprovement ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Data Export */}
      <div className="p-6 rounded-2xl bg-card border-2 border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Daten exportieren
            </h3>
            <p className="text-xs text-muted-foreground">Kopie Ihrer Daten (DSGVO Art. 15)</p>
          </div>
          <Download className="w-5 h-5 text-muted-foreground" />
        </div>

        <button
          onClick={handleExportData}
          disabled={exportLoading || hasPendingExport}
          className="w-full px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 border border-primary/20"
        >
          {exportLoading ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              Exportiere...
            </>
          ) : hasPendingExport ? (
            <>
              <Mail className="w-4 h-4" />
              Export in Bearbeitung...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Datenexport anfordern
            </>
          )}
        </button>

        {hasPendingExport && exportStatus && (
          <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-primary font-medium">
                  Datenexport wird vorbereitet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sie erhalten in 15-30 Minuten eine E-Mail mit dem Download-Link.
                </p>
                {exportStatus.requestedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Angefordert: {new Date(exportStatus.requestedAt).toLocaleString('de-DE')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-2xl bg-red-500/10 border-2 border-red-500/30">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-500 mb-1">Gefahrenbereich</h3>
            <p className="text-xs text-red-400 mb-4">
              Das Löschen Ihres Kontos ist permanent und kann nicht rückgängig gemacht werden.
              Alle Ihre Daten werden unwiderruflich gelöscht.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-600 text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-2 border border-red-500/30"
            >
              <Trash2 className="w-4 h-4" />
              Konto löschen
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-2xl bg-card border-2 border-border shadow-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-1">Konto wirklich löschen?</h3>
                <p className="text-xs text-muted-foreground">
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle Ihre Daten werden permanent gelöscht.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-xs text-muted-foreground mb-2">
                Geben Sie <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">LÖSCHEN</span> ein:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-card border-2 border-border text-foreground text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
                placeholder="LÖSCHEN"
              />
              {deleteError && (
                <p className="mt-2 text-xs text-red-600">{deleteError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors border-2 border-border"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={(deleteConfirmText !== 'LÖSCHEN' && deleteConfirmText !== 'DELETE') || deleteLoading}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Lösche...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Endgültig löschen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-primary/25"
          >
            {saving ? (
              <>
                <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Speichere...
              </>
            ) : (
              'Änderungen speichern'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
