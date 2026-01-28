import { create } from "zustand";
import { load, save } from "@/lib/persist";

export type Notice = {
  id: string;
  ts: number;
  title: string;
  description?: string;
  variant?: "default" | "success" | "warn" | "error";
  read?: boolean;
};

type NState = {
  items: Notice[];
  add: (n: Omit<Notice, "id" | "ts" | "read">) => Notice;
  markRead: (id?: string) => void; // id optional => alles gelesen
  clear: () => void;
  unreadCount: () => number;
};

const KEY = "sintra.notices.v1";
const initial = load<Notice[]>(KEY, []);

export const useNotifications = create<NState>((set, get) => ({
  items: initial,
  add: (n) => {
    const item: Notice = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      read: false,
      variant: "default",
      ...n,
    };
    const next = [item, ...get().items].slice(0, 200);
    save(KEY, next);
    set({ items: next });
    // global event für externe Listener
    document.dispatchEvent(new CustomEvent("sintra:notify", { detail: item }));
    return item;
  },
  markRead: (id) => {
    const next = get().items.map((x) =>
      id ? (x.id === id ? { ...x, read: true } : x) : { ...x, read: true }
    );
    save(KEY, next);
    set({ items: next });
  },
  clear: () => { save(KEY, []); set({ items: [] }); },
  unreadCount: () => get().items.filter((x) => !x.read).length,
}));
