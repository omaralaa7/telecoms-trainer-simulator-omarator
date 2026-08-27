import type { Wire } from "../types";

/**
 * AudioEngine — Rewritten to work with dynamic board wiring.
 *
 * - Auto-creates oscillator nodes for Master Signals block outputs
 * - Dynamically routes signals to scope CH1/CH2 based on wires
 * - Port IDs match those registered by BoardRenderer
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // Audio nodes keyed by port ID (e.g., "ms.2k_sine")
  private outputNodes: Map<string, AudioNode> = new Map();
  private inputNodes: Map<string, AudioNode> = new Map();

  // Scope analysers
  private ch1Analyser: AnalyserNode | null = null;
  private ch2Analyser: AnalyserNode | null = null;

  // Active connections (for cleanup)
  private activeConnections: Array<{ from: AudioNode; to: AudioNode }> = [];

  // Oscillators to stop on dispose
  private oscillators: OscillatorNode[] = [];

  async init(): Promise<void> {
    if (this.isInitialized) return;
    this.ctx = new AudioContext({ sampleRate: 48000 });
    this.isInitialized = true;
    this.buildMasterSignals();
    this.buildScopeAnalysers();
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  get running(): boolean {
    return this.isInitialized && this.ctx?.state === "running";
  }

  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  /** Build the Master Signals block oscillators */
  private buildMasterSignals(): void {
    if (!this.ctx) return;

    const signals: Array<{ id: string; freq: number; type: OscillatorType }> = [
      { id: "ms.100k_sine", freq: 10000, type: "sine" },      // Using 10kHz (100kHz aliases at 48k SR)
      { id: "ms.100k_cos", freq: 10000, type: "sine" },
      { id: "ms.100k_dig", freq: 10000, type: "square" },
      { id: "ms.8k_dig", freq: 8333, type: "square" },
      { id: "ms.2k_dig", freq: 2000, type: "square" },
      { id: "ms.2k_sine", freq: 2000, type: "sine" },
    ];

    for (const sig of signals) {
      const osc = this.ctx.createOscillator();
      osc.type = sig.type;
      osc.frequency.value = sig.freq;
      osc.start();
      this.oscillators.push(osc);

      // Route through a gain node (for isolation)
      const gain = this.ctx.createGain();
      gain.gain.value = 1.0;
      osc.connect(gain);

      this.outputNodes.set(sig.id, gain);
    }

    // Also create VDC outputs
    const vdcGain = this.ctx.createGain();
    vdcGain.gain.value = 0;  // 0V default
    // Create a constant source
    const constSrc = this.ctx.createConstantSource();
    constSrc.offset.value = 1.0;
    constSrc.start();
    constSrc.connect(vdcGain);
    this.outputNodes.set("vdcv.vdc", vdcGain);
    this.outputNodes.set("vdcv.p5v", (() => {
      const g = this.ctx!.createGain();
      g.gain.value = 5.0;
      constSrc.connect(g);
      return g;
    })());
  }

  /** Build scope analysers for CH1 and CH2 */
  private buildScopeAnalysers(): void {
    if (!this.ctx) return;

    this.ch1Analyser = this.ctx.createAnalyser();
    this.ch1Analyser.fftSize = 4096;
    this.ch1Analyser.smoothingTimeConstant = 0;

    this.ch2Analyser = this.ctx.createAnalyser();
    this.ch2Analyser.fftSize = 4096;
    this.ch2Analyser.smoothingTimeConstant = 0;

    // Register as input nodes so wires can connect to them
    this.inputNodes.set("scope.ch1", this.ch1Analyser);
    this.inputNodes.set("scope.ch2", this.ch2Analyser);
    this.inputNodes.set("scope.trigger", this.ctx.createGain()); // placeholder
    this.inputNodes.set("scope.ext_trig", this.ctx.createGain()); // placeholder
  }

  /** Get scope analyser for rendering */
  getScopeAnalyser(channel: "ch1" | "ch2"): AnalyserNode | null {
    return channel === "ch1" ? this.ch1Analyser : this.ch2Analyser;
  }

  /** Connect audio nodes based on current wire state */
  connectWires(wires: Wire[]): void {
    if (!this.ctx) return;

    // Disconnect all previous connections
    for (const conn of this.activeConnections) {
      try { conn.from.disconnect(conn.to); } catch { /* ok */ }
    }
    this.activeConnections = [];

    // Process each wire
    for (const wire of wires) {
      const fromNode = this.outputNodes.get(wire.fromPortId);
      const toNode = this.inputNodes.get(wire.toPortId);

      if (fromNode && toNode) {
        try {
          fromNode.connect(toNode as AudioNode);
          this.activeConnections.push({ from: fromNode, to: toNode });
        } catch (e) {
          console.warn(`Wire ${wire.fromPortId} → ${wire.toPortId}:`, e);
        }
      } else {
        // Try reverse (user might wire in→out which store normalizes)
        const revFrom = this.outputNodes.get(wire.toPortId);
        const revTo = this.inputNodes.get(wire.fromPortId);
        if (revFrom && revTo) {
          try {
            revFrom.connect(revTo as AudioNode);
            this.activeConnections.push({ from: revFrom, to: revTo });
          } catch (e) {
            console.warn(`Wire ${wire.toPortId} → ${wire.fromPortId}:`, e);
          }
        }
      }
    }
  }

  /** Update a block parameter (stub for future use) */
  updateParam(_blockId: string, _key: string, _value: number | string): void {
    // Will be implemented per-block as needed
  }

  disposeAll(): void {
    for (const conn of this.activeConnections) {
      try { conn.from.disconnect(conn.to); } catch { /* ok */ }
    }
    this.activeConnections = [];

    for (const osc of this.oscillators) {
      try { osc.stop(); } catch { /* ok */ }
    }
    this.oscillators = [];
    this.outputNodes.clear();
    this.inputNodes.clear();
    this.ch1Analyser = null;
    this.ch2Analyser = null;
  }

  async destroy(): Promise<void> {
    this.disposeAll();
    if (this.ctx) {
      await this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
  }
}

// Singleton
export const audioEngine = new AudioEngine();
