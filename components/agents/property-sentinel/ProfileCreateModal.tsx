'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Home, MapPin, TrendingUp, Radio, Maximize2, DoorOpen, Calendar } from 'lucide-react';
import { useSentinelStore, type CreateProfileInput } from '@/store/sentinelStore';
import {
  PROPERTY_TYPE_LABELS,
  PURCHASE_TYPE_LABELS,
  SUPPORTED_PORTALS,
  PORTAL_CONFIG,
  FREQUENCY_PRESETS,
  type PropertyType,
  type PurchaseType,
  type FrequencyPreset,
} from '@/lib/agents/property-sentinel/config';

const AGENT_COLOR = '#92400E';

interface ProfileCreateModalProps {
  onClose: () => void;
}

export function ProfileCreateModal({ onClose }: ProfileCreateModalProps) {
  const { createProfile } = useSentinelStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    city: '',
    radiusKm: '10',
    propertyType: 'wohnung' as PropertyType,
    purchaseType: 'kauf' as PurchaseType,
    priceMin: '',
    priceMax: '',
    roomsMin: '',
    roomsMax: '',
    areaMin: '',
    baujahr: '',
    yieldMin: '',
    portals: ['immoscout24'] as string[],
    frequency: 'daily' as Exclude<FrequencyPreset, 'custom'>,
  });

  const update = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const togglePortal = (portal: string) => {
    setForm(f => ({
      ...f,
      portals: f.portals.includes(portal)
        ? f.portals.filter(p => p !== portal)
        : [...f.portals, portal],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name ist erforderlich'); return; }
    if (!form.city.trim()) { setError('Stadt ist erforderlich'); return; }
    if (form.portals.length === 0) { setError('Mindestens ein Portal auswaehlen'); return; }

    setIsSubmitting(true);
    setError('');

    const data: CreateProfileInput = {
      name: form.name.trim(),
      location: {
        city: form.city.trim(),
        radius_km: form.radiusKm ? parseInt(form.radiusKm) : undefined,
      },
      propertyType: form.propertyType,
      purchaseType: form.purchaseType,
      priceMin: form.priceMin ? parseInt(form.priceMin) : undefined,
      priceMax: form.priceMax ? parseInt(form.priceMax) : undefined,
      roomsMin: form.roomsMin ? parseFloat(form.roomsMin) : undefined,
      roomsMax: form.roomsMax ? parseFloat(form.roomsMax) : undefined,
      areaMin: form.areaMin ? parseInt(form.areaMin) : undefined,
      yieldMin: form.yieldMin ? parseFloat(form.yieldMin) : undefined,
      portals: form.portals,
      frequency: form.frequency,
      customFilters: form.baujahr ? { min_baujahr: parseInt(form.baujahr) } : undefined,
    };

    const result = await createProfile(data);
    setIsSubmitting(false);

    if (result) {
      onClose();
    } else {
      setError('Profil konnte nicht erstellt werden');
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg text-sm text-white/80 bg-white/[0.04] border border-white/[0.08] focus:border-white/[0.15] focus:outline-none transition-colors placeholder:text-white/20';
  const labelClass = 'text-[11px] text-white/40 font-medium mb-1.5 block';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center w-screen h-screen">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-[480px] max-h-[85vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-white/[0.08] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${AGENT_COLOR}15`, border: `1px solid ${AGENT_COLOR}25` }}
            >
              <Home className="w-4 h-4" style={{ color: AGENT_COLOR }} />
            </div>
            <h2 className="text-sm font-semibold text-white/80">Neues Suchprofil</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
            <X className="w-4 h-4 text-white/30" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className={labelClass}>Profilname</label>
            <input
              type="text"
              className={inputClass}
              placeholder="z.B. Berlin Mitte Altbau"
              value={form.name}
              onChange={e => update('name', e.target.value)}
            />
          </div>

          {/* City + Radius */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>
                <MapPin className="w-3 h-3 inline mr-1" />
                Stadt
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="z.B. Berlin"
                value={form.city}
                onChange={e => update('city', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Radius</label>
              <select
                className={inputClass}
                value={form.radiusKm}
                onChange={e => update('radiusKm', e.target.value)}
              >
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
              </select>
            </div>
          </div>

          {/* Property Type + Purchase Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Immobilientyp</label>
              <select
                className={inputClass}
                value={form.propertyType}
                onChange={e => update('propertyType', e.target.value)}
              >
                {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Art</label>
              <select
                className={inputClass}
                value={form.purchaseType}
                onChange={e => update('purchaseType', e.target.value)}
              >
                {Object.entries(PURCHASE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className={labelClass}>Preisbereich (EUR)</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                className={inputClass}
                placeholder="Min"
                value={form.priceMin}
                onChange={e => update('priceMin', e.target.value)}
              />
              <input
                type="number"
                className={inputClass}
                placeholder="Max"
                value={form.priceMax}
                onChange={e => update('priceMax', e.target.value)}
              />
            </div>
          </div>

          {/* Rooms Range */}
          <div>
            <label className={labelClass}>
              <DoorOpen className="w-3 h-3 inline mr-1" />
              Zimmer
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.5"
                className={inputClass}
                placeholder="Min"
                value={form.roomsMin}
                onChange={e => update('roomsMin', e.target.value)}
              />
              <input
                type="number"
                step="0.5"
                className={inputClass}
                placeholder="Max"
                value={form.roomsMax}
                onChange={e => update('roomsMax', e.target.value)}
              />
            </div>
          </div>

          {/* Area + Baujahr */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                <Maximize2 className="w-3 h-3 inline mr-1" />
                Mindestflaeche (qm)
              </label>
              <input
                type="number"
                className={inputClass}
                placeholder="z.B. 60"
                value={form.areaMin}
                onChange={e => update('areaMin', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>
                <Calendar className="w-3 h-3 inline mr-1" />
                Baujahr ab
              </label>
              <input
                type="number"
                className={inputClass}
                placeholder="z.B. 1990"
                value={form.baujahr}
                onChange={e => update('baujahr', e.target.value)}
              />
            </div>
          </div>

          {/* Yield Min */}
          <div>
            <label className={labelClass}>
              <TrendingUp className="w-3 h-3 inline mr-1" />
              Mindestrendite (%)
            </label>
            <input
              type="number"
              step="0.1"
              className={inputClass}
              placeholder="z.B. 4.0"
              value={form.yieldMin}
              onChange={e => update('yieldMin', e.target.value)}
            />
          </div>

          {/* Portals */}
          <div>
            <label className={labelClass}>
              <Radio className="w-3 h-3 inline mr-1" />
              Portale
            </label>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_PORTALS.map(portal => {
                const active = form.portals.includes(portal);
                return (
                  <button
                    key={portal}
                    type="button"
                    onClick={() => togglePortal(portal)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200
                      ${active
                        ? 'text-white/70 bg-white/[0.08] border-white/[0.12]'
                        : 'text-white/30 bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'}
                    `}
                  >
                    {PORTAL_CONFIG[portal].displayName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className={labelClass}>Scan-Frequenz</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(FREQUENCY_PRESETS) as [Exclude<FrequencyPreset, 'custom'>, typeof FREQUENCY_PRESETS[keyof typeof FREQUENCY_PRESETS]][]).map(([key, preset]) => {
                const active = form.frequency === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => update('frequency', key)}
                    className={`
                      px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 text-left
                      ${active
                        ? 'text-white/70 bg-white/[0.08] border-white/[0.12]'
                        : 'text-white/30 bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'}
                    `}
                  >
                    <div>{preset.label}</div>
                    <div className="text-[9px] opacity-50 mt-0.5">{preset.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-lg text-xs text-red-400 bg-red-500/10 border border-red-500/20">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-white/40 hover:text-white/60 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50"
            style={{
              backgroundColor: AGENT_COLOR,
              color: 'white',
            }}
          >
            {isSubmitting ? 'Erstelle...' : 'Profil erstellen'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
