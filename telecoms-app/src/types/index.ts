// ─── Port & Block Types ───────────────────────────────────────────

export type PortType = "digital" | "analog";
export type PortDirection = "in" | "out";

export interface Port {
  id: string;             // e.g. "master_signals.2khz_digital"
  blockId: string;
  label: string;
  type: PortType;
  direction: PortDirection;
  /** Position relative to the block's top-left corner (SVG coords) */
  relX: number;
  relY: number;
}

// All block kinds available on the ETT-101
export type BlockKind =
  // Top row
  | "adder"
  | "multiplier"
  | "twin_pulse_generator"
  | "dual_analog_switch"
  | "noise_generator"
  | "buffer"
  | "channel_module"
  | "phase_shifter"
  | "utilities"
  | "tuneable_lpf"
  // Bottom row
  | "variable_dcv"
  | "vco"
  | "sequence_generator"
  | "divider"
  | "pcm_encoder"
  | "master_signals"
  | "pcm_decoder"
  | "expansion";

export interface Block {
  id: string;
  kind: BlockKind;
  label: string;
  /** Knob / switch values keyed by param name */
  params: Record<string, number | string>;
  ports: Port[];
  /** Position on the board (SVG coords, top-left of faceplate) */
  x: number;
  y: number;
  /** Faceplate dimensions */
  width: number;
  height: number;
  /** Which row the block sits in */
  row: "top" | "bottom";
}

export type WireColor =
  | "#e74c3c"   // red
  | "#2ecc71"   // green
  | "#f1c40f"   // yellow
  | "#3498db"   // blue
  | "#ecf0f1"   // white
  | "#e67e22"   // orange
  | "#9b59b6";  // purple

export interface Wire {
  id: string;
  fromPortId: string;
  toPortId: string;
  color: WireColor;
}

export interface PatchState {
  blocks: Block[];
  wires: Wire[];
}

// ─── Audio Engine Types ───────────────────────────────────────────

export interface AudioBlockNodes {
  /** AudioNode inputs keyed by port id */
  inputs: Record<string, AudioNode>;
  /** AudioNode outputs keyed by port id */
  outputs: Record<string, AudioNode>;
  /** AnalyserNodes for scope visualization (optional, keyed by port id) */
  analysers?: Record<string, AnalyserNode>;
  /** Update a parameter in real-time */
  onParamChange: (key: string, value: number | string) => void;
  /** Clean up nodes */
  dispose: () => void;
}

export type BlockBuilder = (
  ctx: AudioContext,
  block: Block
) => Promise<AudioBlockNodes> | AudioBlockNodes;

// ─── Scope Types ──────────────────────────────────────────────────

export type TriggerSource = "ch1" | "ch2" | "ext" | "sync" | "none";
export type TriggerEdge = "rising" | "falling";

export interface ScopeSettings {
  timebaseMs: number;       // ms per division
  ch1VPerDiv: number;       // volts per division for Ch.1
  ch2VPerDiv: number;       // volts per division for Ch.2
  ch1YOffset: number;       // vertical offset in divisions (+ = up)
  ch2YOffset: number;       // vertical offset in divisions (+ = up)
  xOffset: number;          // horizontal offset in divisions (+ = right)
  triggerSource: TriggerSource;
  triggerEdge: TriggerEdge;
  triggerLevel: number;     // -1.0 to 1.0
  running: boolean;
}

// ─── Line Code Types ──────────────────────────────────────────────

export type LineCode = "NRZ-L" | "Bi-Phase" | "RZ-AMI" | "NRZ-M";

export const LINE_CODE_MAP: Record<string, LineCode> = {
  "00": "NRZ-L",
  "01": "Bi-Phase",
  "10": "RZ-AMI",
  "11": "NRZ-M",
};

// ─── Wire History (Undo / Redo) ───────────────────────────────────

export type WireAction =
  | { type: "add"; wire: Wire }
  | { type: "remove"; wire: Wire }
  | { type: "reset"; previousWires: Wire[] };

// ─── Lab Experiments ──────────────────────────────────────────────

export interface PresetWire {
  fromPortId: string;
  toPortId: string;
  color: WireColor;
}

export interface LabPart {
  id: string;
  title: string;
  description: string;
  wires: PresetWire[];
  scopeSettings?: Partial<ScopeSettings>;
  params?: Record<string, Record<string, number | string>>;
}

export interface LabExperiment {
  id: string;
  title: string;
  labNumber: number;
  expNumber: number;
  description: string;
  parts: LabPart[];
}
