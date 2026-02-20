/**
 * Property Sentinel Dashboard Store
 *
 * Zustand store for managing sentinel dashboard state.
 * No persist — data is server-canonical.
 */

import { create } from 'zustand';
import { api, getErrorMessage } from '@/lib/api/client';
import type { SearchProfile, SeenListing } from '@/lib/db/schema-sentinel';

// ── Types ──────────────────────────────────────────────────────

export interface SentinelStats {
  totalProfiles: number;
  activeProfiles: number;
  totalListings: number;
  qualifiedListings: number;
  avgScore: number;
  inPipeline: number;
  lastScanAt: string | null;
  topRedFlags: { flag: string; count: number }[];
}

export interface CreateProfileInput {
  name: string;
  location: { city: string; state?: string; radius_km?: number };
  propertyType?: string;
  purchaseType?: string;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  roomsMin?: number;
  roomsMax?: number;
  yieldMin?: number;
  portals?: string[];
  frequency?: string;
  minScore?: number;
  customFilters?: { min_baujahr?: number };
}

interface ListingsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── State ──────────────────────────────────────────────────────

interface SentinelState {
  profiles: SearchProfile[];
  listings: SeenListing[];
  listingsMeta: ListingsMeta | null;
  stats: SentinelStats | null;

  isLoadingProfiles: boolean;
  isLoadingListings: boolean;
  isLoadingStats: boolean;
  isScanRunning: boolean;

  selectedProfileId: string | null;
  listingSort: 'score' | 'date' | 'price';
  listingMinScore: number;
  listingPage: number;

  error: string | null;

  // Actions
  fetchProfiles: () => Promise<void>;
  createProfile: (data: CreateProfileInput) => Promise<SearchProfile | null>;
  updateProfile: (id: string, data: Partial<SearchProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  togglePause: (id: string, isActive: boolean) => Promise<void>;

  fetchListings: (profileId?: string) => Promise<void>;
  dismissListing: (listingId: string) => Promise<void>;
  pushToPipeline: (listingIds: string[]) => Promise<void>;

  fetchStats: () => Promise<void>;
  triggerScan: (profileId: string) => Promise<{ success: boolean; message: string }>;

  setSelectedProfile: (id: string | null) => void;
  setListingSort: (sort: 'score' | 'date' | 'price') => void;
  setListingMinScore: (score: number) => void;
  setListingPage: (page: number) => void;
  clearError: () => void;
}

// ── Store ──────────────────────────────────────────────────────

export const useSentinelStore = create<SentinelState>((set, get) => ({
  profiles: [],
  listings: [],
  listingsMeta: null,
  stats: null,

  isLoadingProfiles: false,
  isLoadingListings: false,
  isLoadingStats: false,
  isScanRunning: false,

  selectedProfileId: null,
  listingSort: 'score',
  listingMinScore: 0,
  listingPage: 1,

  error: null,

  // ── Profiles ───────────────────────────────────────────────

  fetchProfiles: async () => {
    set({ isLoadingProfiles: true, error: null });
    try {
      const res = await api.get('/sentinel/profiles');
      set({ profiles: res.data.profiles, isLoadingProfiles: false });
    } catch (err) {
      set({ error: getErrorMessage(err), isLoadingProfiles: false });
    }
  },

  createProfile: async (data) => {
    set({ error: null });
    try {
      const res = await api.post('/sentinel/profiles', data);
      const profile = res.data.profile;
      set(s => ({ profiles: [profile, ...s.profiles] }));
      return profile;
    } catch (err) {
      set({ error: getErrorMessage(err) });
      return null;
    }
  },

  updateProfile: async (id, data) => {
    set({ error: null });
    try {
      const res = await api.patch(`/sentinel/profiles/${id}`, data);
      set(s => ({
        profiles: s.profiles.map(p => (p.id === id ? res.data.profile : p)),
      }));
    } catch (err) {
      set({ error: getErrorMessage(err) });
    }
  },

  deleteProfile: async (id) => {
    set({ error: null });
    try {
      await api.delete(`/sentinel/profiles/${id}`);
      set(s => ({
        profiles: s.profiles.filter(p => p.id !== id),
        selectedProfileId: s.selectedProfileId === id ? null : s.selectedProfileId,
      }));
    } catch (err) {
      set({ error: getErrorMessage(err) });
    }
  },

  togglePause: async (id, isActive) => {
    set({ error: null });
    try {
      const res = await api.patch(`/sentinel/profiles/${id}`, { isActive });
      set(s => ({
        profiles: s.profiles.map(p => (p.id === id ? res.data.profile : p)),
      }));
    } catch (err) {
      set({ error: getErrorMessage(err) });
    }
  },

  // ── Listings ───────────────────────────────────────────────

  fetchListings: async (profileId) => {
    const { listingSort, listingMinScore, listingPage, selectedProfileId } = get();
    const pid = profileId || selectedProfileId;

    set({ isLoadingListings: true, error: null });
    try {
      const params = new URLSearchParams({
        sort: listingSort,
        page: String(listingPage),
        limit: '20',
      });
      if (pid) params.set('profileId', pid);
      if (listingMinScore > 0) params.set('minScore', String(listingMinScore));

      const res = await api.get(`/sentinel/listings?${params}`);
      set({
        listings: res.data.listings,
        listingsMeta: res.data.meta,
        isLoadingListings: false,
      });
    } catch (err) {
      set({ error: getErrorMessage(err), isLoadingListings: false });
    }
  },

  dismissListing: async (listingId) => {
    set({ error: null });
    try {
      await api.patch('/sentinel/listings', {
        listingIds: [listingId],
        action: 'dismiss',
      });
      set(s => ({
        listings: s.listings.filter(l => l.id !== listingId),
      }));
    } catch (err) {
      set({ error: getErrorMessage(err) });
    }
  },

  pushToPipeline: async (listingIds) => {
    set({ error: null });
    try {
      await api.patch('/sentinel/listings', {
        listingIds,
        action: 'push_to_pipeline',
      });
      set(s => ({
        listings: s.listings.map(l =>
          listingIds.includes(l.id) ? { ...l, pushedToPipeline: true, pushedAt: new Date() } : l,
        ),
      }));
    } catch (err) {
      set({ error: getErrorMessage(err) });
    }
  },

  // ── Stats ──────────────────────────────────────────────────

  fetchStats: async () => {
    set({ isLoadingStats: true, error: null });
    try {
      const res = await api.get('/sentinel/stats');
      set({ stats: res.data, isLoadingStats: false });
    } catch (err) {
      set({ error: getErrorMessage(err), isLoadingStats: false });
    }
  },

  // ── Scan ───────────────────────────────────────────────────

  triggerScan: async (profileId) => {
    set({ isScanRunning: true, error: null });
    try {
      const res = await api.post(`/sentinel/scan/${profileId}`);
      set({ isScanRunning: false });
      return { success: true, message: res.data.message };
    } catch (err) {
      const message = getErrorMessage(err);
      set({ error: message, isScanRunning: false });
      return { success: false, message };
    }
  },

  // ── Setters ────────────────────────────────────────────────

  setSelectedProfile: (id) => set({ selectedProfileId: id, listingPage: 1 }),
  setListingSort: (sort) => set({ listingSort: sort, listingPage: 1 }),
  setListingMinScore: (score) => set({ listingMinScore: score, listingPage: 1 }),
  setListingPage: (page) => set({ listingPage: page }),
  clearError: () => set({ error: null }),
}));
