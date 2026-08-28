import { create } from "zustand";
import type { Wire, WireColor, ScopeSettings, WireAction } from "../types";
import { audioEngine } from "../audio/AudioEngine";

const WIRE_COLORS: WireColor[] = [
  "#e74c3c", "#2ecc71", "#f1c40f", "#3498db", "#ecf0f1", "#e67e22", "#9b59b6",
];

// ─── Store ────────────────────────────────────────────────────────
// Ports are registered dynamically by the board renderer.
// This store manages wires, scope, params, and undo/redo history.

interface PatchStore {
  wires: Wire[];
  ports: Map<string, { x: number; y: number; type: "digital" | "analog"; direction: "in" | "out" }>;
  selectedWireColor: WireColor;
  scopeSettings: ScopeSettings;
  wiringFrom: string | null;
  params: Record<string, Record<string, number | string>>;

  // Undo / Redo
  undoStack: WireAction[];
  redoStack: WireAction[];
  undo: () => void;
  redo: () => void;

  // Guide Mode
  guideHighlights: string[];          // Port IDs to glow
  guideStep: number;                  // Current step in guide sequence
  setGuideHighlights: (ports: string[], step?: number) => void;
  clearGuide: () => void;
  advanceGuide: () => void;

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
  loadPreset: (wires: { fromPortId: string; toPortId: string; color: WireColor }[], params?: Record<string, Record<string, number | string>>, scopeSettings?: Partial<ScopeSettings>) => void;
}

let wireCounter = 100;

export const usePatchStore = create<PatchStore>((set, get) => ({
  wires: [],
  ports: new Map(),
  selectedWireColor: "#e74c3c",
  wiringFrom: null,
  undoStack: [],
  redoStack: [],
  guideHighlights: [],
  guideStep: 0,
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
    const nextWires = [...state.wires, wire];
    set({
      wires: nextWires,
      wiringFrom: null,
      undoStack: [...state.undoStack, { type: "add", wire }],
      redoStack: [],
    });
    audioEngine.connectWires(nextWires);
  },

  cancelWire: () => set({ wiringFrom: null }),

  removeWire: (wireId) => {
    const state = get();
    const wire = state.wires.find((w) => w.id === wireId);
    if (!wire) return;
    const nextWires = state.wires.filter((w) => w.id !== wireId);
    set({
      wires: nextWires,
      undoStack: [...state.undoStack, { type: "remove", wire }],
      redoStack: [],
    });
    audioEngine.connectWires(nextWires);
  },

  // ─── Undo ───────────────────────────────────────────────────────
  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;

    const action = state.undoStack[state.undoStack.length - 1];
    const newUndoStack = state.undoStack.slice(0, -1);

    switch (action.type) {
      case "add": {
        const nextWires = state.wires.filter((w) => w.id !== action.wire.id);
        set({
          wires: nextWires,
          undoStack: newUndoStack,
          redoStack: [...state.redoStack, action],
        });
        audioEngine.connectWires(nextWires);
        break;
      }
      case "remove": {
        const nextWires = [...state.wires, action.wire];
        set({
          wires: nextWires,
          undoStack: newUndoStack,
          redoStack: [...state.redoStack, action],
        });
        audioEngine.connectWires(nextWires);
        break;
      }
      case "reset": {
        const nextWires = action.previousWires;
        set({
          wires: nextWires,
          undoStack: newUndoStack,
          redoStack: [...state.redoStack, { type: "reset", previousWires: state.wires }],
        });
        audioEngine.connectWires(nextWires);
        break;
      }
    }
  },

  // ─── Redo ───────────────────────────────────────────────────────
  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;

    const action = state.redoStack[state.redoStack.length - 1];
    const newRedoStack = state.redoStack.slice(0, -1);

    switch (action.type) {
      case "add": {
        const nextWires = [...state.wires, action.wire];
        set({
          wires: nextWires,
          undoStack: [...state.undoStack, action],
          redoStack: newRedoStack,
        });
        audioEngine.connectWires(nextWires);
        break;
      }
      case "remove": {
        const nextWires = state.wires.filter((w) => w.id !== action.wire.id);
        set({
          wires: nextWires,
          undoStack: [...state.undoStack, action],
          redoStack: newRedoStack,
        });
        audioEngine.connectWires(nextWires);
        break;
      }
      case "reset": {
        const nextWires = action.previousWires;
        set({
          wires: nextWires,
          undoStack: [...state.undoStack, { type: "reset", previousWires: state.wires }],
          redoStack: newRedoStack,
        });
        audioEngine.connectWires(nextWires);
        break;
      }
    }
  },

  setParam: (blockId, key, value) => {
    set((s) => ({
      params: {
        ...s.params,
        [blockId]: { ...(s.params[blockId] || {}), [key]: value },
      },
    }));
    audioEngine.updateParam(blockId, key, value);
  },

  getParam: (blockId, key, fallback) => {
    const p = get().params[blockId];
    return p && p[key] !== undefined ? p[key] : fallback;
  },

  setSelectedWireColor: (color) => set({ selectedWireColor: color }),

  setScopeSettings: (settings) =>
    set((s) => ({ scopeSettings: { ...s.scopeSettings, ...settings } })),

  resetPatch: () => {
    const previousWires = get().wires;
    set({
      wires: [],
      wiringFrom: null,
      undoStack: [...get().undoStack, { type: "reset", previousWires }],
      redoStack: [],
      guideHighlights: [],
      guideStep: 0,
    });
    audioEngine.connectWires([]);
  },

  getPortPos: (portId) => {
    const port = get().ports.get(portId);
    return port ? { x: port.x, y: port.y } : null;
  },

  // ─── Load Lab Preset ───────────────────────────────────────────
  loadPreset: (presetWires, params, scopeSettings) => {
    const state = get();

    // Build Wire objects from preset
    const newWires: Wire[] = presetWires.map((pw, i) => ({
      id: `wire_preset_${Date.now()}_${i}`,
      fromPortId: pw.fromPortId,
      toPortId: pw.toPortId,
      color: pw.color,
    }));

    const updates: Partial<PatchStore> = {
      wires: newWires,
      wiringFrom: null,
      undoStack: [...state.undoStack, { type: "reset", previousWires: [...state.wires] }],
      redoStack: [],
      guideHighlights: [],
      guideStep: 0,
    };

    set(updates as any);
    audioEngine.connectWires(newWires);

    // Apply params if provided
    if (params) {
      const currentParams = get().params;
      const mergedParams = { ...currentParams };
      for (const [blockId, blockParams] of Object.entries(params)) {
        mergedParams[blockId] = { ...(mergedParams[blockId] || {}), ...blockParams };
        for (const [k, v] of Object.entries(blockParams)) {
          audioEngine.updateParam(blockId, k, v);
        }
      }
      set({ params: mergedParams });
    }

    // Apply scope settings if provided
    if (scopeSettings) {
      const currentScope = get().scopeSettings;
      set({ scopeSettings: { ...currentScope, ...scopeSettings } });
    }
  },

  // ─── Guide Mode ─────────────────────────────────────────────────
  setGuideHighlights: (ports, step = 0) => set({ guideHighlights: ports, guideStep: step }),
  clearGuide: () => set({ guideHighlights: [], guideStep: 0 }),
  advanceGuide: () => set((s) => ({ guideStep: s.guideStep + 1 })),

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
