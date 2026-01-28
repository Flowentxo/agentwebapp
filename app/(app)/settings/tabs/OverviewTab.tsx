/**
 * Overview Tab - Enterprise White Design
 * Clean cards with subtle shadows and professional accents
 */

'use client';

import { formatMemberSince, formatRelativeTime } from '@/lib/profile/client-utils';
import type { ProfileResponse } from '@/lib/profile/schemas';
import {
  Shield,
  Activity,
  Calendar,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Zap,
  Globe,
  Moon,
  Briefcase,
  Crown,
  TrendingUp
} from 'lucide-react';
import type { NavigationOptions } from '@/components/settings/SettingsLayout';

interface OverviewTabProps {
  profile: ProfileResponse;
  onRefresh: () => Promise<void>;
  onNavigateToTab?: (tab: string, options?: NavigationOptions) => void;
}

export default function OverviewTab({ profile, onNavigateToTab }: OverviewTabProps) {
  // Handler for 2FA activation buttons
  const handleActivate2FA = () => {
    if (onNavigateToTab) {
      onNavigateToTab('security', { autoStartMfaSetup: true });
    }
  };

  const accountAgeDays = Math.floor(
    (new Date().getTime() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const lastLogin = new Date(Date.now() - 1000 * 60 * 30);

  const initials = (profile.displayName || profile.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isAdmin = profile.roles?.includes('admin');

  return (
    <div className="w-full px-6 py-8 space-y-8">
      {/* Hero Profile Card - Enterprise White Style */}
      <div className="relative overflow-hidden rounded-2xl bg-card border-2 border-border shadow-sm">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar with clean ring */}
            <div className="relative group">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || 'User'}
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-slate-100 shadow-lg group-hover:ring-primary/20 transition-all duration-300"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center ring-4 ring-slate-100 shadow-lg group-hover:ring-primary/20 transition-all duration-300">
                  <span className="text-2xl font-bold text-white">{initials}</span>
                </div>
              )}
              {/* Online status indicator */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white shadow-lg" />
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                  {profile.displayName || 'Willkommen'}
                </h2>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/30">
                    Admin
                  </span>
                )}
                {profile.emailVerified && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-medium text-emerald-500">Verifiziert</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">{profile.email}</p>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {profile.orgTitle && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/50 border border-border">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    <span>{profile.orgTitle}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/50 border border-border">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/50 border border-border">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Mitglied seit {formatMemberSince(profile.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Pro Badge + Quick Action */}
            <div className="flex items-center gap-3">
              {/* Pro Badge */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-primary tracking-wide">PRO</span>
              </div>

              {/* Edit Profile Button */}
              <button
                onClick={() => onNavigateToTab?.('personal')}
                className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/25 active:scale-[0.98]"
              >
                <Zap className="w-4 h-4" />
                Profil bearbeiten
              </button>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-6 pt-6 border-t-2 border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid - Enterprise White Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Security Level */}
        <div className="group relative overflow-hidden rounded-2xl bg-card border-2 border-border p-5 hover:border-primary/30 transition-all duration-300">
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${profile.mfaEnabled ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                <Shield className={`w-5 h-5 ${profile.mfaEnabled ? 'text-emerald-500' : 'text-muted-foreground'}`} />
              </div>
              {profile.mfaEnabled && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-semibold text-emerald-500 uppercase tracking-wider border border-emerald-500/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Aktiv
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">
              {profile.mfaEnabled ? '2FA' : 'Basis'}
            </p>
            <p className="text-xs text-muted-foreground">Sicherheitsstufe</p>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="group relative overflow-hidden rounded-2xl bg-card border-2 border-border p-5 hover:border-primary/30 transition-all duration-300">
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">2</p>
            <p className="text-xs text-muted-foreground">Aktive Sitzungen</p>
          </div>
        </div>

        {/* Member Since */}
        <div className="group relative overflow-hidden rounded-2xl bg-card border-2 border-border p-5 hover:border-primary/30 transition-all duration-300">
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-violet-50">
                <Calendar className="w-5 h-5 text-violet-600" />
              </div>
              <TrendingUp className="w-4 h-4 text-violet-400" />
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">{accountAgeDays}</p>
            <p className="text-xs text-muted-foreground">Tage Mitglied</p>
          </div>
        </div>

        {/* Email Status */}
        <div className="group relative overflow-hidden rounded-2xl bg-card border-2 border-border p-5 hover:border-primary/30 transition-all duration-300">
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${profile.emailVerified ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                <Mail className={`w-5 h-5 ${profile.emailVerified ? 'text-emerald-500' : 'text-amber-600'}`} />
              </div>
              {profile.emailVerified && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">
              {profile.emailVerified ? 'Verifiziert' : 'Ausstehend'}
            </p>
            <p className="text-xs text-muted-foreground">E-Mail Status</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Settings */}
        <div className="lg:col-span-2 rounded-2xl bg-card border-2 border-border overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b-2 border-border">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <h3 className="text-sm font-semibold text-foreground">Schnelleinstellungen</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-3.5">Passe dein Erlebnis an</p>
          </div>

          <div className="divide-y divide-slate-100">
            {/* Theme */}
            <button
              onClick={() => onNavigateToTab?.('preferences')}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors border border-violet-100">
                  <Moon className="w-5 h-5 text-violet-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Erscheinungsbild</p>
                  <p className="text-xs text-muted-foreground capitalize">{profile.theme} Modus</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>

            {/* Language */}
            <button
              onClick={() => onNavigateToTab?.('preferences')}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors border border-blue-100">
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Sprache</p>
                  <p className="text-xs text-muted-foreground">{profile.locale === 'de' ? 'Deutsch' : profile.locale}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>

            {/* 2FA */}
            <div className="flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-all duration-200 group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                  profile.mfaEnabled
                    ? 'bg-emerald-500/10 border-emerald-100 group-hover:bg-emerald-500/20'
                    : 'bg-muted/50 border-border group-hover:bg-muted'
                }`}>
                  <Shield className={`w-5 h-5 ${profile.mfaEnabled ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Zwei-Faktor-Authentifizierung</p>
                  <p className="text-xs text-muted-foreground">{profile.mfaEnabled ? 'Aktiviert' : 'Nicht aktiviert'}</p>
                </div>
              </div>
              {profile.mfaEnabled ? (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-xs font-medium text-emerald-500 border border-emerald-500/30">
                  An
                </span>
              ) : (
                <button
                  onClick={handleActivate2FA}
                  className="px-4 py-1.5 rounded-xl bg-primary text-xs font-semibold text-white hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20 active:scale-[0.98]"
                >
                  Aktivieren
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded-2xl bg-card border-2 border-border overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b-2 border-border">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold text-foreground">Letzte Aktivität</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-3.5">Deine Kontobewegungen</p>
          </div>

          <div className="p-5 space-y-4">
            {/* Last Login */}
            <div className="flex items-start gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5 border border-primary/10 group-hover:border-primary/20 transition-colors">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Letzte Anmeldung</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(lastLogin)}</p>
              </div>
            </div>

            {/* Profile Update */}
            <div className="flex items-start gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mt-0.5 border border-emerald-100 group-hover:border-emerald-500/30 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Profil aktualisiert</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(profile.updatedAt)}</p>
              </div>
            </div>

            {/* Account Created */}
            <div className="flex items-start gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center mt-0.5 border border-violet-100 group-hover:border-violet-200 transition-colors">
                <Sparkles className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Konto erstellt</p>
                <p className="text-xs text-muted-foreground">{formatMemberSince(profile.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roles Section */}
      {profile.roles && profile.roles.length > 0 && (
        <div className="rounded-2xl bg-card border-2 border-border overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-border">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <h3 className="text-sm font-semibold text-foreground">Deine Rollen</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-3.5">Berechtigungen und Zugriffsebenen</p>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {profile.roles.map((role) => (
                <span
                  key={role}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-primary/5 text-primary border border-primary/20"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security CTA - Enterprise White Style */}
      {!profile.mfaEnabled && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/5 via-violet-50 to-primary/5 border-2 border-primary/20 p-6">
          {/* Background decorations */}
          <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-primary/10 rounded-full blur-[60px]" />
          <div className="absolute -left-8 -top-8 w-32 h-32 bg-violet-500/10 rounded-full blur-[40px]" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-card flex items-center justify-center border-2 border-primary/20 shadow-lg">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Schütze dein Konto</p>
                <p className="text-sm text-muted-foreground">Aktiviere die Zwei-Faktor-Authentifizierung für mehr Sicherheit</p>
              </div>
            </div>
            <button
              onClick={handleActivate2FA}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all duration-200 shadow-xl shadow-primary/30 active:scale-[0.98] whitespace-nowrap"
            >
              Jetzt aktivieren
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
