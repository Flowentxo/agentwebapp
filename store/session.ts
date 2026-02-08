import { create } from "zustand";

type Role = "admin" | "member" | "user";

interface User {
  id: string;
  name: string;
  email?: string;
  role: Role;
}

type SessionState = {
  user: User;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setRole: (r: Role) => void;
  fetchSession: () => Promise<void>;
  clearSession: () => void;
};

// Default fallback user (will be replaced by actual session data)
const DEFAULT_USER: User = {
  id: "",
  name: "Guest",
  role: "user",
};

export const useSession = create<SessionState>((set, get) => ({
  user: DEFAULT_USER,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user.id }),

  setRole: (role) => set((s) => ({ user: { ...s.user, role } })),

  fetchSession: async () => {
    // Avoid refetching if already authenticated
    if (get().isAuthenticated && get().user.id) {
      set({ isLoading: false });
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.data?.user) {
          const apiUser = data.data.user;
          set({
            user: {
              id: apiUser.id,
              name: apiUser.displayName || apiUser.email || "User",
              email: apiUser.email,
              role: apiUser.roles?.includes("admin") ? "admin" : "user",
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      }

      // Not authenticated - keep default user
      set({ isLoading: false, isAuthenticated: false });
    } catch (error) {
      console.error("[SESSION] Failed to fetch session:", error);
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  clearSession: () => set({
    user: DEFAULT_USER,
    isAuthenticated: false,
    isLoading: false,
  }),
}));
