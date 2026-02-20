/**
 * General Settings Tab - Clean Layout Design
 * Avatar Upload, Profile Data, Theme Selection
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import type { ProfileResponse } from '@/lib/profile/schemas';
import type { NavigationOptions } from '@/components/settings/SettingsLayout';
import { getCsrfToken } from '@/lib/profile/client-utils';
import {
  SettingsCard,
  SettingsSection,
  SettingsRow,
  SettingsDivider,
} from '@/components/settings/SettingsCard';
import {
  Camera,
  User,
  Mail,
  Save,
  RotateCcw,
  Upload,
  Check,
  Info,
  Loader2,
  Palette,
  LogOut,
} from 'lucide-react';
import { ThemeSelector } from '@/components/settings/ThemeSelector';

interface GeneralSettingsTabProps {
  profile: ProfileResponse;
  onRefresh: () => Promise<void>;
  onNavigateToTab: (tab: string, options?: NavigationOptions) => void;
  onUpdate: (updates: Partial<ProfileResponse>) => Promise<ProfileResponse>;
  loading: boolean;
}

interface FormData {
  displayName: string;
  bio: string;
  location: string;
  orgTitle: string;
}

// Max file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export default function GeneralSettingsTab({
  profile,
  onRefresh,
  onUpdate,
  loading,
}: GeneralSettingsTabProps) {
  // Form State
  const [formData, setFormData] = useState<FormData>({
    displayName: profile.displayName || '',
    bio: profile.bio || '',
    location: profile.location || '',
    orgTitle: profile.orgTitle || '',
  });

  // Avatar State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);

  // Form State
  const [saving, setSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Calculate dirty state
  const isDirty = useMemo(() => {
    return (
      formData.displayName !== (profile.displayName || '') ||
      formData.bio !== (profile.bio || '') ||
      formData.location !== (profile.location || '') ||
      formData.orgTitle !== (profile.orgTitle || '') ||
      avatarFile !== null
    );
  }, [formData, profile, avatarFile]);

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Avatar dropzone
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      if (error.code === 'file-too-large') {
        toast.error('Datei zu groß', {
          description: 'Maximal 2MB erlaubt',
        });
      } else if (error.code === 'file-invalid-type') {
        toast.error('Ungültiges Format', {
          description: 'Nur JPG, PNG und WebP erlaubt',
        });
      }
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      // Revoke old preview URL
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      // Create new preview
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      setAvatarFile(file);

      // Start upload immediately (optimistic UI)
      uploadAvatar(file);
    }
  }, [avatarPreview]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  // Upload avatar
  const uploadAvatar = async (file: File) => {
    setAvatarUploading(true);
    try {
      const csrfToken = getCsrfToken();
      const formDataObj = new FormData();
      formDataObj.append('avatar', file);

      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formDataObj,
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error?.message || 'Upload fehlgeschlagen');
      }

      toast.success('Avatar aktualisiert');
      setAvatarFile(null);
      await onRefresh();
    } catch (err: any) {
      toast.error('Upload fehlgeschlagen', {
        description: err.message,
      });
      // Revert preview on error
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      setAvatarFile(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Save profile data
  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(formData);
      toast.success('Profil aktualisiert');
    } catch (err: any) {
      toast.error('Fehler beim Speichern', {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      displayName: profile.displayName || '',
      bio: profile.bio || '',
      location: profile.location || '',
      orgTitle: profile.orgTitle || '',
    });
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    setAvatarFile(null);
  };

  // Logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Redirect even if API call fails
    }
    window.location.href = '/login';
  };

  // Get initials for avatar fallback
  const initials = (formData.displayName || profile.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Current avatar URL
  const currentAvatarUrl = avatarPreview || profile.avatarUrl;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 pb-24">
      {/* Avatar Section */}
      <SettingsSection
        title="Profilbild"
        description="Dein Avatar wird in der App und in Nachrichten angezeigt."
      >
        <SettingsCard
          title="Avatar"
          description="JPG, PNG oder WebP. Maximal 2MB."
          icon={Camera}
          iconColor="text-violet-400"
        >
          <div className="flex items-center gap-6">
            {/* Avatar Preview with Dropzone */}
            <div
              {...getRootProps()}
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
              className={`relative w-24 h-24 rounded-full cursor-pointer overflow-hidden ring-2 transition-all duration-300 ${
                isDragActive
                  ? 'ring-purple-500 scale-105 shadow-[0_0_30px_rgba(168,85,247,0.3)]'
                  : avatarHover
                  ? 'ring-purple-500/30 scale-[1.02] shadow-[0_0_30px_rgba(168,85,247,0.15)]'
                  : 'ring-white/[0.08]'
              }`}
            >
              <input {...getInputProps()} />

              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600">
                  <span className="text-xl font-bold text-white">{initials}</span>
                </div>
              )}

              {/* Hover/Drag Overlay */}
              <div
                className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center transition-opacity duration-200 ${
                  isDragActive || avatarHover ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {avatarUploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-white mb-1" />
                    <span className="text-xs text-white/80">
                      {isDragActive ? 'Ablegen' : 'Ändern'}
                    </span>
                  </>
                )}
              </div>

              {/* Upload Progress Indicator */}
              {avatarUploading && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-900">
                  <div className="h-full bg-violet-500 animate-pulse" style={{ width: '100%' }} />
                </div>
              )}
            </div>

            {/* Upload Instructions */}
            <div className="flex-1">
              <button
                type="button"
                onClick={open}
                className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer mb-2"
              >
                Lade dein Profilbild hoch
              </button>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span>Automatische Größenanpassung</span>
              </div>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Profile Data Section */}
      <SettingsSection
        title="Persönliche Daten"
        description="Informationen zu deinem Profil."
      >
        <SettingsCard
          title="Profil-Informationen"
          icon={User}
          iconColor="text-indigo-400"
        >
          <div className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Anzeigename
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="Max Mustermann"
                className="w-full h-12 px-4 rounded-xl bg-black/20 border border-white/[0.10] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/40 transition-all"
              />
            </div>

            <SettingsDivider />

            {/* Email (Read-only) */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                E-Mail-Adresse
                <div className="group relative">
                  <Info className="w-3.5 h-3.5 text-zinc-600 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 border border-white/[0.08] rounded-lg text-xs text-white/90 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    E-Mail-Änderung erfordert Verifizierung
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
                  </div>
                </div>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full h-12 px-4 pr-10 rounded-xl bg-black/10 border border-white/[0.06] text-zinc-500 text-sm cursor-not-allowed"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-xs text-zinc-600 mt-1.5">
                Kontaktiere den Support für E-Mail-Änderungen.
              </p>
            </div>

            <SettingsDivider />

            {/* Position */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Position / Rolle
              </label>
              <input
                type="text"
                value={formData.orgTitle}
                onChange={(e) => handleInputChange('orgTitle', e.target.value)}
                placeholder="z.B. Product Designer"
                className="w-full h-12 px-4 rounded-xl bg-black/20 border border-white/[0.10] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/40 transition-all"
              />
            </div>

            <SettingsDivider />

            {/* Location */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Standort
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="z.B. Berlin, Deutschland"
                className="w-full h-12 px-4 rounded-xl bg-black/20 border border-white/[0.10] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/40 transition-all"
              />
            </div>

            <SettingsDivider />

            {/* Bio */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Über mich
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Erzähle etwas über dich..."
                rows={3}
                maxLength={500}
                className="w-full px-4 py-3 min-h-[120px] rounded-xl bg-black/20 border border-white/[0.10] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/40 transition-all resize-none"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${formData.bio.length > 450 ? 'text-amber-600' : 'text-zinc-400'}`}>
                  {formData.bio.length}/500
                </span>
              </div>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Appearance Section */}
      <SettingsSection
        title="Erscheinungsbild"
        description="Passe das visuelle Design der App an deine Vorlieben an."
      >
        <SettingsCard
          title="Theme"
          description="Wähle dein bevorzugtes Farbschema mit visueller Vorschau."
          icon={Palette}
          iconColor="text-violet-400"
        >
          <ThemeSelector />
        </SettingsCard>
      </SettingsSection>

      {/* Logout Section */}
      <SettingsSection
        title="Sitzung"
        description="Melde dich von deinem Konto ab."
      >
        <SettingsCard
          title="Abmelden"
          description="Du wirst zur Login-Seite weitergeleitet."
          icon={LogOut}
          iconColor="text-red-400"
        >
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/10 hover:border-red-500/20 disabled:opacity-40 transition-all"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Abmelden...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Abmelden
              </>
            )}
          </button>
        </SettingsCard>
      </SettingsSection>

      {/* Sticky Save Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
          isDirty && !avatarFile
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-zinc-900/80 backdrop-blur-2xl border-t border-white/[0.05] shadow-2xl shadow-black/40">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm text-zinc-400">Ungespeicherte Änderungen</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-sm font-medium hover:text-white hover:bg-white/[0.06] disabled:opacity-40 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Verwerfen
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-500 disabled:opacity-40 transition-all shadow-lg shadow-purple-500/25"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Speichern
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
