import { create } from "zustand";
import type { Wire, WireColor, Port, ScopeSettings } from "../types";

const WIRE_COLORS: WireColor[] = [
  "#e74c3c", "#2ecc71", "#f1c40f", "#3498db", "#ecf0f1", "#e67e22", "#9b59b6",
];

// ─── Store ────────────────────────────────────────────────────────
// Ports are registered dynamically by the board renderer.
// This store only manages wires, scope, and params.

interface PatchStore {
  wires: Wire[];
  ports: Map<string, { x: number; y: number; type: "digital" | "analog"; direction: "in" | "out" }>;
  selectedWireColor: WireColor;
  scopeSettings: ScopeSettings;
  wiringFrom: string | null;
  params: Record<string, Record<string, number | string>>;

  registerPort: (id: string, x: number, y: number, type: "digital" | "analog", direction: "in" | "out") => void;
  startWire: (portId: string) => void;
  cancelWire: () => void;
  removeWire: (wireId: string) => void;
  setParam: (blockId: string, key: string, value: number | string) => void;
  getParam: (blockId: string, key: string, fallback: number | string) => number | string;
  setSelectedWireColor: (color: WireColor) => void;
  setScopeSettings: (settings: Partial<ScopeSettings>) => void;
  resetPatch: () => void;
  getPortPos: (portId: string) => { x: number; y: number } | null;
}

let wireCounter = 100;

export const usePatchStore = create<PatchStore>((set, get) => ({
  wires: [],
  ports: new Map(),
  selectedWireColor: "#e74c3c",
  wiringFrom: null,
  params: {
    tuneable_lpf: { fc: 3000, gain: 1.0 },
    sequence_generator: { lineCode: "NRZ-L" },
    vco: { freq: 1000, gain: 1.0 },
    twin_pulse: { width: 0.5, delay: 0.5 },
    buffer: { gain: 1.0 },
    phase_shifter: { phase: 0 },
    variable_dcv: { vdc: 0 },
  },

  registerPort: (id, x, y, type, direction) => {
    const ports = new Map(get().ports);
    ports.set(id, { x, y, type, direction });
    set({ ports });
  },

  startWire: (portId) => {
    const state = get();
    if (state.wiringFrom === portId) {
      set({ wiringFrom: null });
      return;
    }
    if (state.wiringFrom === null) {
      set({ wiringFrom: portId });
      return;
    }
    // Complete the wire
    const fromId = state.wiringFrom;
    const fromPort = state.ports.get(fromId);
    const toPort = state.ports.get(portId);
    if (!fromPort || !toPort || fromId === portId) {
      set({ wiringFrom: null });
      return;
    }
    // Determine src/dst
    let src = fromId, dst = portId;
    if (fromPort.direction === "in" && toPort.direction === "out") {
      src = portId; dst = fromId;
    }
    // No duplicates
    if (state.wires.some((w) => w.fromPortId === src && w.toPortId === dst)) {
      set({ wiringFrom: null });
      return;
    }
    const wire: Wire = {
      id: `wire_${wireCounter++}`,
      fromPortId: src,
      toPortId: dst,
      color: state.selectedWireColor,
    };
    set({ wires: [...state.wires, wire], wiringFrom: null });
  },

  cancelWire: () => set({ wiringFrom: null }),

  removeWire: (wireId) =>
    set((s) => ({ wires: s.wires.filter((w) => w.id !== wireId) })),

  setParam: (blockId, key, value) =>
    set((s) => ({
      params: {
        ...s.params,
        [blockId]: { ...(s.params[blockId] || {}), [key]: value },
      },
    })),

  getParam: (blockId, key, fallback) => {
    const p = get().params[blockId];
    return p && p[key] !== undefined ? p[key] : fallback;
  },

  setSelectedWireColor: (color) => set({ selectedWireColor: color }),

  setScopeSettings: (settings) =>
    set((s) => ({ scopeSettings: { ...s.scopeSettings, ...settings } })),

  resetPatch: () => set({ wires: [], wiringFrom: null }),

  getPortPos: (portId) => {
    const p = get().ports.get(portId);
    return p ? { x: p.x, y: p.y } : null;
  },

  scopeSettings: {
    timebaseMs: 0.5,
    ch1VPerDiv: 1,
    ch2VPerDiv: 1,
    ch1YOffset: 0,
    ch2YOffset: 0,
    xOffset: 0,
    triggerSource: "ch1",
    triggerEdge: "rising",
    triggerLevel: 0.1,
    running: true,
  },
}));

export { WIRE_COLORS };
