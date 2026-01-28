import { create } from "zustand";
import { load, save } from "@/lib/persist";

type Density = "comfortable" | "compact" | "condensed";
type Columns = { agent: boolean; status: boolean; req: boolean; succ: boolean; avg: boolean; uptime: boolean; action: boolean };
type OrderKey = "sel" | "agent" | "status" | "req" | "succ" | "avg" | "uptime" | "action";

type T = {
  density: Density;
  set: (d: Density) => void;
  columns: Columns;
  setColumns: (c: Partial<Columns>) => void;
  resetColumns: () => void;
  order: OrderKey[];
  setOrder: (o: OrderKey[]) => void;
};

const KEY_D = "sintra.table.density.v1";
const KEY_C = "sintra.table.columns.v1";
const KEY_O = "sintra.table.order.v1";
const DEFAULT_COLS: Columns = { agent: true, status: true, req: true, succ: true, avg: true, uptime: true, action: true };
const DEFAULT_ORDER: OrderKey[] = ["sel","agent","status","req","succ","avg","uptime","action"];

export const useTablePrefs = create<T>((set, get) => ({
  density: load<Density>(KEY_D, "comfortable"),
  set: (density) => { save(KEY_D, density); set({ density }); },
  columns: load<Columns>(KEY_C, DEFAULT_COLS),
  setColumns: (c) => { const next = { ...get().columns, ...c }; save(KEY_C, next); set({ columns: next }); },
  resetColumns: () => { save(KEY_C, DEFAULT_COLS); set({ columns: DEFAULT_COLS }); },
  order: load<OrderKey[]>(KEY_O, DEFAULT_ORDER),
  setOrder: (o) => { save(KEY_O, o); set({ order: o }); },
}));
