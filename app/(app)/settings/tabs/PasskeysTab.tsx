/**
 * Passkeys Tab - WebAuthn/FIDO2 Passkey Management
 * Allows users to register, rename, and delete passkeys
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Edit3,
  Fingerprint,
  Smartphone,
  Laptop,
  Check,
  X,
  AlertCircle,
  Loader2,
  Shield,
  Clock,
} from 'lucide-react';
import { useWebAuthn, type PasskeyInfo } from '@/hooks/useWebAuthn';

interface PasskeysTabProps {
  userId: string;
}

export default function PasskeysTab({ userId }: PasskeysTabProps) {
  const {
    isSupported,
    isLoading,
    error,
    registerPasskey,
    getPasskeys,
    renamePasskey,
    deletePasskey,
    clearError,
  } = useWebAuthn();

  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load passkeys on mount
  const loadPasskeys = useCallback(async () => {
    setLoadingPasskeys(true);
    try {
      const data = await getPasskeys();
      setPasskeys(data);
    } catch (err) {
      console.error('[PasskeysTab] Failed to load passkeys:', err);
    } finally {
      setLoadingPasskeys(false);
    }
  }, [getPasskeys]);

  useEffect(() => {
    loadPasskeys();
  }, [loadPasskeys]);

  // Clear success message after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle register new passkey
  const handleRegister = async () => {
    if (!newPasskeyName.trim()) {
      return;
    }

    clearError();
    const result = await registerPasskey(newPasskeyName.trim());

    if (result) {
      setSuccessMessage('Passkey erfolgreich hinzugefügt');
      setShowAddDialog(false);
      setNewPasskeyName('');
      await loadPasskeys();
    }
  };

  // Handle rename passkey
  const handleRename = async (id: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }

    const success = await renamePasskey(id, editName.trim());
    if (success) {
      setSuccessMessage('Passkey umbenannt');
      setEditingId(null);
      await loadPasskeys();
    }
  };

  // Handle delete passkey
  const handleDelete = async (id: string) => {
    const success = await deletePasskey(id);
    if (success) {
      setSuccessMessage('Passkey gelöscht');
      setDeletingId(null);
      await loadPasskeys();
    }
  };

  // Get device icon based on type
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'singleDevice':
        return <Smartphone className="w-4 h-4 text-zinc-400" />;
      case 'multiDevice':
        return <Fingerprint className="w-4 h-4 text-indigo-400" />;
      default:
        return <Key className="w-4 h-4 text-zinc-400" />;
    }
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nie';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Browser not supported warning
  if (!isSupported) {
    return (
      <div className="w-full px-6 py-6 space-y-6">
        <div className="p-6 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-400">Browser nicht unterstützt</h3>
              <p className="text-xs text-yellow-400/80 mt-1">
                Ihr Browser unterstützt keine Passkeys (WebAuthn). Bitte verwenden Sie einen modernen Browser wie Chrome, Firefox, Safari oder Edge.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Passkeys</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Melden Sie sich sicher ohne Passwort an – mit Face ID, Touch ID oder Sicherheitsschlüssel
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddDialog(true);
            setNewPasskeyName('Mein ' + (passkeys.length === 0 ? 'Gerät' : `Gerät ${passkeys.length + 1}`));
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm hover:bg-indigo-500/20 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Passkey hinzufügen
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-400">{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add Passkey Dialog */}
      {showAddDialog && (
        <div className="p-6 rounded-lg bg-zinc-800/80 border border-zinc-700">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-lg bg-indigo-500/10">
              <Fingerprint className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Neuen Passkey registrieren</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Geben Sie einen Namen ein und folgen Sie den Anweisungen Ihres Geräts
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Name</label>
              <input
                type="text"
                value={newPasskeyName}
                onChange={(e) => setNewPasskeyName(e.target.value)}
                placeholder="z.B. MacBook Pro, iPhone 15"
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setNewPasskeyName('');
                  clearError();
                }}
                className="flex-1 py-2.5 rounded-lg bg-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-600 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleRegister}
                disabled={isLoading || !newPasskeyName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Warte auf Gerät...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    Registrieren
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passkeys List */}
      {loadingPasskeys ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      ) : passkeys.length === 0 ? (
        <div className="p-8 rounded-lg bg-zinc-800/50 border border-zinc-800 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 mb-4">
            <Key className="w-6 h-6 text-zinc-500" />
          </div>
          <h3 className="text-sm font-medium text-white mb-1">Keine Passkeys registriert</h3>
          <p className="text-xs text-zinc-500 mb-4">
            Fügen Sie einen Passkey hinzu, um sich sicher ohne Passwort anzumelden
          </p>
          <button
            onClick={() => {
              setShowAddDialog(true);
              setNewPasskeyName('Mein Gerät');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm hover:bg-indigo-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ersten Passkey hinzufügen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              {/* Delete Confirmation */}
              {deletingId === passkey.id ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-sm text-white">Passkey löschen?</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-700 text-zinc-300 text-xs hover:bg-zinc-600 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={() => handleDelete(passkey.id)}
                      disabled={isLoading}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors"
                    >
                      {isLoading ? 'Löschen...' : 'Löschen'}
                    </button>
                  </div>
                </div>
              ) : editingId === passkey.id ? (
                /* Edit Mode */
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm outline-none focus:border-indigo-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(passkey.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <button
                    onClick={() => handleRename(passkey.id)}
                    disabled={isLoading}
                    className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-2 rounded-lg bg-zinc-700 text-zinc-400 hover:bg-zinc-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Normal View */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-zinc-800">
                      {getDeviceIcon(passkey.credentialDeviceType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{passkey.name}</p>
                        {passkey.credentialBackedUp && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                            Sync
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Erstellt: {formatDate(passkey.createdAt)}
                        </span>
                        {passkey.lastUsedAt && (
                          <span className="text-xs text-zinc-500">
                            Zuletzt: {formatDate(passkey.lastUsedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingId(passkey.id);
                        setEditName(passkey.name);
                      }}
                      className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                      title="Umbenennen"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(passkey.id)}
                      className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-zinc-400 mt-0.5" />
          <div>
            <p className="text-sm text-white">Was sind Passkeys?</p>
            <p className="text-xs text-zinc-500 mt-1">
              Passkeys sind eine sichere und bequeme Alternative zu Passwörtern. Sie nutzen biometrische Authentifizierung
              (Face ID, Touch ID) oder Hardware-Sicherheitsschlüssel und sind phishing-resistent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
