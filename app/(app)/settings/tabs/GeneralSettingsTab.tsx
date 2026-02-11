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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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
              className={`relative w-24 h-24 rounded-2xl cursor-pointer overflow-hidden ring-2 transition-all duration-200 ${
                isDragActive
                  ? 'ring-[var(--vicy-accent)] scale-105'
                  : avatarHover
                  ? 'ring-[var(--vicy-accent-50)] scale-[1.02]'
                  : 'ring-[var(--vicy-border)]'
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
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--vicy-surface)]">
                  <div className="h-full bg-[var(--vicy-accent)] animate-pulse" style={{ width: '100%' }} />
                </div>
              )}
            </div>

            {/* Upload Instructions */}
            <div className="flex-1">
              <p className="text-sm text-[var(--vicy-text-secondary)] mb-2">
                Ziehe ein Bild hierher oder klicke auf den Avatar zum Hochladen.
              </p>
              <div className="flex items-center gap-2 text-xs text-[var(--vicy-text-secondary)]">
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
              <label className="block text-xs font-medium text-[var(--vicy-text-secondary)] mb-1.5">
                Anzeigename
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="Max Mustermann"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--vicy-glass-bg)] border border-[var(--vicy-border)] text-[var(--vicy-text-primary)] text-sm placeholder:text-[var(--vicy-text-tertiary)] focus:outline-none focus:border-[var(--vicy-accent-50)] focus:ring-1 focus:ring-[var(--vicy-accent-20)] transition-all"
              />
            </div>

            <SettingsDivider />

            {/* Email (Read-only) */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--vicy-text-secondary)] mb-1.5">
                E-Mail-Adresse
                <div className="group relative">
                  <Info className="w-3.5 h-3.5 text-[var(--vicy-text-tertiary)] cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--vicy-surface)] border border-[var(--vicy-border)] rounded-lg text-xs text-[var(--vicy-text-primary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    E-Mail-Änderung erfordert Verifizierung
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--vicy-surface)]" />
                  </div>
                </div>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-[var(--vicy-glass-bg)] border border-[var(--vicy-border)] text-[var(--vicy-text-secondary)] text-sm cursor-not-allowed"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--vicy-text-tertiary)]" />
              </div>
              <p className="text-xs text-[var(--vicy-text-tertiary)] mt-1.5">
                Kontaktiere den Support für E-Mail-Änderungen.
              </p>
            </div>

            <SettingsDivider />

            {/* Position */}
            <div>
              <label className="block text-xs font-medium text-[var(--vicy-text-secondary)] mb-1.5">
                Position / Rolle
              </label>
              <input
                type="text"
                value={formData.orgTitle}
                onChange={(e) => handleInputChange('orgTitle', e.target.value)}
                placeholder="z.B. Product Designer"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--vicy-glass-bg)] border border-[var(--vicy-border)] text-[var(--vicy-text-primary)] text-sm placeholder:text-[var(--vicy-text-tertiary)] focus:outline-none focus:border-[var(--vicy-accent-50)] focus:ring-1 focus:ring-[var(--vicy-accent-20)] transition-all"
              />
            </div>

            <SettingsDivider />

            {/* Location */}
            <div>
              <label className="block text-xs font-medium text-[var(--vicy-text-secondary)] mb-1.5">
                Standort
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="z.B. Berlin, Deutschland"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--vicy-glass-bg)] border border-[var(--vicy-border)] text-[var(--vicy-text-primary)] text-sm placeholder:text-[var(--vicy-text-tertiary)] focus:outline-none focus:border-[var(--vicy-accent-50)] focus:ring-1 focus:ring-[var(--vicy-accent-20)] transition-all"
              />
            </div>

            <SettingsDivider />

            {/* Bio */}
            <div>
              <label className="block text-xs font-medium text-[var(--vicy-text-secondary)] mb-1.5">
                Über mich
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Erzähle etwas über dich..."
                rows={3}
                maxLength={500}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--vicy-glass-bg)] border border-[var(--vicy-border)] text-[var(--vicy-text-primary)] text-sm placeholder:text-[var(--vicy-text-tertiary)] focus:outline-none focus:border-[var(--vicy-accent-50)] focus:ring-1 focus:ring-[var(--vicy-accent-20)] transition-all resize-none"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${formData.bio.length > 450 ? 'text-amber-600' : 'text-[var(--vicy-text-secondary)]'}`}>
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

      {/* Sticky Save Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
          isDirty && !avatarFile
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-[var(--vicy-surface-95)] backdrop-blur-xl border-t border-[var(--vicy-border)] shadow-lg">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm text-[var(--vicy-text-secondary)]">Ungespeicherte Änderungen</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--vicy-surface-hover)] border border-[var(--vicy-border)] text-[var(--vicy-text-secondary)] text-sm font-medium hover:text-[var(--vicy-text-primary)] disabled:opacity-40 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Verwerfen
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--vicy-accent)] text-white text-sm font-semibold hover:bg-[var(--vicy-accent-90)] disabled:opacity-40 transition-all shadow-lg shadow-[var(--vicy-accent-25-shadow)]"
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
