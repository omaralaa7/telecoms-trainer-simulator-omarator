# Telecoms-Trainer Simulator — Implementation Plan

**Goal:** A web app that simulates the EMONA Telecoms-Trainer 101 patch-panel experience, so students can wire up virtual blocks, feed signals through them, and view the result on a virtual oscilloscope — no physical board or Analog Discovery 2 required.

---

## 1. MVP Scope (build this first)

Don't simulate the whole board. Simulate **one full experiment end-to-end**, matching what you've already done in the real lab so you can validate correctness against your own scope captures.

**MVP experiment: "Bandwidth limiting of a digital signal"** (the one in your photos)

Blocks needed:
- **Master Signals** → fixed 2kHz clock source
- **Sequence Generator** → produces a repeating digital bit pattern (NRZ-L / Bi-φ / RZ-AMI / NRZ-M line codes, matching the real switch), with CLK in and SYNC out
- **Tuneable LPF** → adjustable cutoff frequency (gain + fc knobs)
- **Dual-channel Oscilloscope** → shows Ch.1 (raw digital signal) and Ch.2 (bandwidth-limited signal) simultaneously, with trigger from SYNC

Interactions:
- Drag wires between jacks (digital = square port, analog = circle port, color-coded like the real board)
- Turn virtual knobs (freq, gain) with mouse drag or scroll
- Toggle switches (line code selector)
- Scope: adjustable timebase, trigger source, run/stop/single

**Why this scope first:** it's small enough to build in a few weeks, it's the exact experiment you already have "ground truth" for, and it touches every core system (signal source, digital block, filter block, scope) you'll need to generalize later.

---

## 2. Architecture

```
┌─────────────────────────────────────────────┐
│                  React UI                    │
│  ┌───────────┐  ┌────────────┐  ┌─────────┐ │
│  │Patch Panel│  │ Block Props │  │  Scope  │ │
│  │ (SVG/     │  │ (knobs,    │  │ Canvas  │ │
│  │  Canvas)  │  │  switches) │  │ Display │ │
│  └─────┬─────┘  └──────┬─────┘  └────┬────┘ │
│        └───────────────┴─────────────┘       │
│                    │                          │
│           Patch Graph State (Zustand/Redux)   │
└────────────────────┬──────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────┐
│              Signal Engine (Web Audio API)       │
│  ┌────────┐  ┌──────────┐  ┌────────────────┐  │
│  │Oscillator│→│ Custom    │→│ BiquadFilterNode│  │
│  │/ Clock  │  │AudioWorklet│ │  (Tuneable LPF) │  │
│  │         │  │(SeqGen)   │  │                 │  │
│  └────────┘  └──────────┘  └────────┬────────┘  │
│                                       ▼            │
│                              AnalyserNode(s)       │
│                              → feeds Scope Canvas  │
└──────────────────────────────────────────────────┘
```

### Why Web Audio API
- Runs at 44.1/48kHz sample rate in real time — enough resolution for kHz-range trainer signals
- Native nodes (GainNode, BiquadFilterNode, OscillatorNode, DelayNode) map directly to Adder, Tuneable LPF, VCO, Twin Pulse Generator
- AudioWorkletProcessor lets you write custom DSP (JS/WASM) for blocks with no native equivalent: Sequence Generator, PCM Encoder/Decoder, XOR, Sample & Hold, Dual Analog Switch
- AnalyserNode + `getFloatTimeDomainData()` gives you oscilloscope-style waveform capture for free
- No backend/server round-trip needed — everything runs client-side, which is essential for a snappy "wire it and see it instantly" feel

---

## 3. Core Data Model

```ts
type PortType = "digital" | "analog";

interface Port {
  id: string;          // e.g. "seqgen.sync_out"
  blockId: string;
  label: string;
  type: PortType;
  direction: "in" | "out";
}

interface Block {
  id: string;
  kind: "master_signals" | "sequence_generator" | "tuneable_lpf" | "scope" | ...;
  params: Record<string, number | string>; // knob/switch values
  ports: Port[];
  // each block kind maps to a factory that builds its Web Audio subgraph
}

interface Wire {
  id: string;
  fromPort: string; // port id
  toPort: string;
}

interface PatchState {
  blocks: Block[];
  wires: Wire[];
}
```

Each `Block.kind` registers a builder function:
```ts
type BlockBuilder = (ctx: AudioContext, params: Params) => {
  inputs: Record<string, AudioNode>;
  outputs: Record<string, AudioNode>;
  onParamChange: (key: string, value: number) => void;
};
```

Wiring a patch cable = calling `outputNode.connect(inputNode)`. Removing a wire = `.disconnect()`. This makes the whole graph reactively rebuildable whenever the student changes a connection.

---

## 4. Block Implementation Notes (MVP set)

| Block | Implementation |
|---|---|
| Master Signals (2kHz clock) | `OscillatorNode` (square wave) at fixed freq, or a worklet emitting clean digital pulses |
| Sequence Generator | AudioWorkletProcessor: holds a bit pattern buffer, shifts out bits at CLK rate, applies selected line code (NRZ-L, Bi-φ, RZ-AMI, NRZ-M) via lookup logic, emits SYNC pulse once per pattern cycle |
| Tuneable LPF | `BiquadFilterNode` (type "lowpass"), cutoff frequency bound to the fc knob (log-scale mapping to match real trainer's fc×100 range), gain via `GainNode` in series |
| Oscilloscope | Two `AnalyserNode`s (one per channel) reading into a `<canvas>` render loop via `requestAnimationFrame`; trigger logic implemented by scanning the buffer for a rising edge on the trigger channel and aligning the draw window to it |

---

## 5. UI/Patch-Panel Details

- Render block faceplates as SVG, closely matching real photo layout (square jack = digital, circle jack = analog, per your board's legend)
- Wires: bezier curves between two jack coordinates, redrawn on drag; snapping logic rejects invalid connections (e.g., can't wire a digital output into an analog-only input) with a brief red-flash + tooltip explaining why
- Knobs: circular drag control (vertical mouse drag = rotate), or scroll-wheel; show live numeric readout on hover
- Color-code wires by signal type (optional, for visual clarity) — or let students choose wire colors like they did in your annotated photo (T1 green, CH1 red, CH2 yellow) for muscle-memory transfer to the real board

---

## 6. Validation Plan

1. Build the MVP patch (Sequence Generator → LPF → Scope) as pre-wired default
2. Compare the simulator's Ch.1/Ch.2 traces against your real Analog Discovery 2 captures from this same experiment, at a few different fc settings
3. Tune the BiquadFilterNode Q/rolloff characteristics (real trainer's Tuneable LPF is likely a multi-pole active filter, not a single biquad — may need to cascade 2–3 biquads to match real rolloff steepness)
4. Once Ch.1/Ch.2 shapes visually match your report's captured waveforms at 2–3 cutoff settings, MVP is validated

---

## 7. Phase 2 (after MVP validated)

- Expand block library: Adder, Multiplier, Noise Generator, VCO, PCM Encoder/Decoder, Twin Pulse Generator, Dual Analog Switch, Phase Shifter
- Save/load patch configurations (localStorage first, then backend if you want shared class libraries)
- "Experiment mode": pre-built lab worksheets where students patch to a target, with optional auto-check against expected wiring
- Multi-student/classroom mode: instructor dashboard, shareable patch links
- Optional: WASM-compiled DSP core if AudioWorklet JS performance becomes a bottleneck for more complex blocks (e.g., real PCM encode/decode, ADPCM)

---

## 8. Suggested Stack

- **Frontend:** React + TypeScript, Zustand for patch-graph state, SVG (or Canvas via `react-konva`) for the patch panel
- **DSP:** Web Audio API + custom AudioWorkletProcessors (TypeScript compiled to worklet-compatible JS)
- **Scope rendering:** `<canvas>` 2D context, driven by `AnalyserNode.getFloatTimeDomainData()`
- **Persistence (phase 2):** Simple JSON patch-state export/import to start; Node/Express + a DB only if you add classroom/sharing features
- **Hosting:** Static frontend (Vercel/Netlify) — no backend needed for MVP since everything runs client-side

---

## 9. Rough Timeline (MVP)

| Week | Task |
|---|---|
| 1 | Signal engine skeleton: Master Signals + Sequence Generator worklet, basic scope canvas showing a static waveform |
| 2 | Tuneable LPF block, wire it into the graph, verify filtered waveform looks right |
| 3 | Patch panel UI: draggable jacks, wire drawing, knob controls |
| 4 | Wire UI to signal engine (live rebuild on patch change), trigger logic for scope, polish + validate against real captures |

This gets you a demo-able, working simulator in about a month, focused on the exact experiment you already understand deeply — which also makes it a strong artifact to show your professor or include in your graduation-adjacent portfolio work.
