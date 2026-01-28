/**
 * Personal Tab - Apple-Inspired Design
 * "Design is not just what it looks like. Design is how it works." - Steve Jobs
 */

'use client';

import { useState, useRef, ChangeEvent } from 'react';
import type { ProfileResponse } from '@/lib/profile/schemas';
import { Camera, Save, RotateCcw, Check, X, Sparkles, MapPin, Briefcase, User } from 'lucide-react';

interface PersonalTabProps {
  profile: ProfileResponse;
  onUpdate: (updates: Partial<ProfileResponse>) => Promise<ProfileResponse>;
  loading: boolean;
}

export default function PersonalTab({ profile, onUpdate, loading }: PersonalTabProps) {
  const [formData, setFormData] = useState({
    displayName: profile.displayName || '',
    bio: profile.bio || '',
    location: profile.location || '',
    orgTitle: profile.orgTitle || '',
    pronouns: profile.pronouns || '',
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Datei zu groß (max. 5MB)' });
        return;
      }
      setAvatarPreview(URL.createObjectURL(file));
      setAvatarFile(file);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (avatarFile) {
        const formDataObj = new FormData();
        formDataObj.append('avatar', avatarFile);
        await fetch('/api/profile/avatar', { method: 'POST', body: formDataObj });
      }
      await onUpdate(formData);
      setMessage({ type: 'success', text: 'Änderungen gespeichert' });
      setHasChanges(false);
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Fehler beim Speichern' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      displayName: profile.displayName || '',
      bio: profile.bio || '',
      location: profile.location || '',
      orgTitle: profile.orgTitle || '',
      pronouns: profile.pronouns || '',
    });
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarFile(null);
    setHasChanges(false);
  };

  const initials = (formData.displayName || profile.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-full px-6 py-6 space-y-8">
      {/* Profile Card - Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-card border-2 border-border shadow-sm">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar - Apple-style with hover effect */}
            <div className="relative group">
              <div
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={() => setAvatarHover(true)}
                onMouseLeave={() => setAvatarHover(false)}
                className="relative w-24 h-24 rounded-2xl cursor-pointer overflow-hidden ring-4 ring-slate-100 shadow-lg transition-all duration-300 hover:ring-primary/20 hover:scale-105"
              >
                {avatarPreview || profile.avatarUrl ? (
                  <img
                    src={avatarPreview || profile.avatarUrl || ''}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-violet-600">
                    <span className="text-2xl font-bold text-white">{initials}</span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className={`absolute inset-0 bg-background/80 flex items-center justify-center transition-opacity duration-200 ${avatarHover ? 'opacity-100' : 'opacity-0'}`}>
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white shadow-lg" />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Name & Role */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                  {formData.displayName || 'Dein Name'}
                </h2>
                {profile.emailVerified && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-medium text-emerald-500">Verifiziert</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              {formData.orgTitle && (
                <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{formData.orgTitle}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Fields - Apple-style grouped settings */}
      <div className="space-y-6">
        {/* Basic Info Group */}
        <div className="rounded-2xl bg-card border-2 border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Persönliche Informationen</h3>
          </div>

          <div className="divide-y divide-slate-100">
            {/* Name Field */}
            <div className="flex items-center px-5 py-4 hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mr-4">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="w-full bg-transparent text-foreground text-sm font-medium focus:outline-none placeholder:text-muted-foreground"
                  placeholder="Dein vollständiger Name"
                />
              </div>
            </div>

            {/* Position Field */}
            <div className="flex items-center px-5 py-4 hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mr-4">
                <Briefcase className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Position</label>
                <input
                  type="text"
                  value={formData.orgTitle}
                  onChange={(e) => handleInputChange('orgTitle', e.target.value)}
                  className="w-full bg-transparent text-foreground text-sm font-medium focus:outline-none placeholder:text-muted-foreground"
                  placeholder="z.B. Product Designer"
                />
              </div>
            </div>

            {/* Location Field */}
            <div className="flex items-center px-5 py-4 hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mr-4">
                <MapPin className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Standort</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full bg-transparent text-foreground text-sm font-medium focus:outline-none placeholder:text-muted-foreground"
                  placeholder="z.B. Berlin, Deutschland"
                />
              </div>
            </div>

            {/* Pronouns Field */}
            <div className="flex items-center px-5 py-4 hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center mr-4">
                <Sparkles className="w-5 h-5 text-pink-600" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Pronomen</label>
                <select
                  value={formData.pronouns}
                  onChange={(e) => handleInputChange('pronouns', e.target.value)}
                  className="w-full bg-transparent text-foreground text-sm font-medium focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="" className="bg-card">Keine Angabe</option>
                  <option value="er/ihm" className="bg-card">er/ihm</option>
                  <option value="sie/ihr" className="bg-card">sie/ihr</option>
                  <option value="they/them" className="bg-card">they/them</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="rounded-2xl bg-card border-2 border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Über dich</h3>
          </div>

          <div className="p-5">
            <textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full bg-muted/50 text-foreground text-sm leading-relaxed rounded-xl p-4 border-2 border-border focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 resize-none transition-all placeholder:text-muted-foreground"
              placeholder="Erzähl etwas über dich. Was machst du? Was begeistert dich?"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">
                Eine kurze Beschreibung, die anderen hilft, dich kennenzulernen.
              </p>
              <span className={`text-xs font-medium ${formData.bio.length > 450 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {formData.bio.length}/500
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div
          className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-xl transition-all duration-300 z-50 ${
            message.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Sticky Action Bar */}
      <div className={`sticky bottom-0 -mx-8 px-8 py-4 bg-gradient-to-t from-white via-white/95 to-transparent transition-all duration-300 ${hasChanges ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">Ungespeicherte Änderungen</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card text-foreground border-2 border-border text-sm font-medium hover:bg-muted/50 hover:border-border disabled:opacity-40 transition-all duration-200 active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              Verwerfen
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-all duration-200 shadow-lg shadow-primary/25 active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
  );
}
