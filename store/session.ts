import { create } from "zustand";

type Role = "admin" | "member";
type SessionState = {
  user: { id: string; name: string; role: Role };
  setRole: (r: Role) => void;
};

export const useSession = create<SessionState>((set) => ({
  user: { id: "u-1", name: "Luis", role: "admin" }, // Standard: Admin
  setRole: (role) => set((s) => ({ user: { ...s.user, role } })),
}));
