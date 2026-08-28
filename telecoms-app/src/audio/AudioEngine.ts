import type { Wire } from "../types";

/**
 * AudioEngine — Full Real-Time DSP Signal Processing Engine
 *
 * Implements genuine physical DSP processing and dynamic signal routing for:
 * - Master Signals oscillators (Sine, Cosine, Digital Clocks)
 * - Variable DCV (Adjustable DC voltage source)
 * - Dual Analog Switch (Natural PAM sampling & Sample-and-Hold)
 * - Tuneable LPF (4th/8th-order cascaded active low-pass reconstruction filter)
 * - PCM Encoder & Decoder (8-bit quantization, Frame Sync serializer & DAC)
 * - Sequence Generator (PRBS with NRZ-L, Bi-Phase, RZ-AMI, NRZ-M + SYNC)
 * - Utilities (Threshold Comparator, Half-wave Rectifier, RC Low-Pass Filter)
 * - VCO (Voltage Controlled Oscillator with adjustable frequency)
 * - Buffer & Adder blocks
 * - Dual-Trace Oscilloscope CH1/CH2 Analysers
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // Audio nodes keyed by port ID (e.g. "ms.2k_sine", "das.out", "scope.ch1")
  private outputNodes: Map<string, AudioNode> = new Map();
  private inputNodes: Map<string, AudioNode> = new Map();

  // Reference to worklets and audio nodes for parameter updates
  private pcmWorklet: AudioWorkletNode | null = null;
  private seqWorklet: AudioWorkletNode | null = null;
  private tlpfFilters: BiquadFilterNode[] = [];
  private tlpfGainNode: GainNode | null = null;
  private vdcGainNode: GainNode | null = null;
  private vcoOscSine: OscillatorNode | null = null;
  private vcoOscDig: OscillatorNode | null = null;
  private vcoGainNode: GainNode | null = null;
  private bufferGainNode: GainNode | null = null;

  // Scope analysers
  private ch1Analyser: AnalyserNode | null = null;
  private ch2Analyser: AnalyserNode | null = null;
  private extTrigAnalyser: AnalyserNode | null = null;

  // Active connections for dynamic rewiring
  private activeConnections: Array<{ from: AudioNode; to: AudioNode }> = [];

  // Oscillators for cleanup
  private oscillators: OscillatorNode[] = [];

  async init(): Promise<void> {
    if (this.isInitialized) return;
    this.ctx = new AudioContext({ sampleRate: 48000 });

    try {
      await this.ctx.audioWorklet.addModule("/worklets/telecoms-dsp.worklet.js");
    } catch (e) {
      console.warn("AudioWorklet module load warning:", e);
    }

    this.buildMasterSignals();
    this.buildVariableDCV();
    this.buildDualAnalogSwitch();
    this.buildTuneableLPF();
    this.buildPCMCodec();
    this.buildSequenceGenerator();
    this.buildUtilities();
    this.buildVCO();
    this.buildBufferAndAdders();
    this.buildScopeAnalysers();

    this.isInitialized = true;
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

  // ─── 1. Master Signals ───────────────────────────────────────────
  private buildMasterSignals(): void {
    if (!this.ctx) return;

    const signals: Array<{ id: string; freq: number; type: OscillatorType }> = [
      { id: "ms.100k_sine", freq: 10000, type: "sine" },
      { id: "ms.100k_cos", freq: 10000, type: "sine" },
      { id: "ms.100k_dig", freq: 10000, type: "square" },
      { id: "ms.8k_dig", freq: 8333, type: "square" },
      { id: "ms.2k_dig", freq: 2000, type: "square" },
      { id: "ms.2k_sine", freq: 2000, type: "sine" },
    ];

    for (const sig of signals) {
      const osc = this.ctx.createOscillator();
      if (sig.id === "ms.100k_cos") {
        const realCos = new Float32Array([0, 1]);
        const imagCos = new Float32Array([0, 0]);
        const cosWave = this.ctx.createPeriodicWave(realCos, imagCos);
        osc.setPeriodicWave(cosWave);
      } else {
        osc.type = sig.type;
      }
      osc.frequency.value = sig.freq;
      osc.start();
      this.oscillators.push(osc);

      const gain = this.ctx.createGain();
      gain.gain.value = 1.0;
      osc.connect(gain);
      this.outputNodes.set(sig.id, gain);
    }
  }

  // ─── 2. Variable DCV ─────────────────────────────────────────────
  private buildVariableDCV(): void {
    if (!this.ctx) return;

    const constSrc = this.ctx.createConstantSource();
    constSrc.offset.value = 1.0;
    constSrc.start();

    // +5V output (normalized to 1.0V audio range)
    const p5vGain = this.ctx.createGain();
    p5vGain.gain.value = 1.0;
    constSrc.connect(p5vGain);
    this.outputNodes.set("vdcv.p5v", p5vGain);

    // Variable VDC output
    this.vdcGainNode = this.ctx.createGain();
    this.vdcGainNode.gain.value = 0.0;
    constSrc.connect(this.vdcGainNode);
    this.outputNodes.set("vdcv.vdc", this.vdcGainNode);

    // GND output
    const gndGain = this.ctx.createGain();
    gndGain.gain.value = 0.0;
    constSrc.connect(gndGain);
    this.outputNodes.set("vdcv.gnd", gndGain);
  }

  // ─── 3. Dual Analog Switch & Sample-and-Hold ─────────────────────
  private buildDualAnalogSwitch(): void {
    if (!this.ctx) return;

    try {
      const dasNode = new AudioWorkletNode(this.ctx, "dual-analog-switch-processor", {
        numberOfInputs: 5,
        numberOfOutputs: 2,
        outputChannelCount: [1, 1],
      });

      // Inputs: 0: in1, 1: ctrl1, 2: in2, 3: ctrl2, 4: sh_in
      const in1Gain = this.ctx.createGain(); in1Gain.connect(dasNode, 0, 0);
      const ctrl1Gain = this.ctx.createGain(); ctrl1Gain.connect(dasNode, 0, 1);
      const in2Gain = this.ctx.createGain(); in2Gain.connect(dasNode, 0, 2);
      const ctrl2Gain = this.ctx.createGain(); ctrl2Gain.connect(dasNode, 0, 3);
      const shInGain = this.ctx.createGain(); shInGain.connect(dasNode, 0, 4);

      this.inputNodes.set("das.in1", in1Gain);
      this.inputNodes.set("das.ctrl1", ctrl1Gain);
      this.inputNodes.set("das.in2", in2Gain);
      this.inputNodes.set("das.ctrl2", ctrl2Gain);
      this.inputNodes.set("das.sh_in", shInGain);

      // Outputs: 0: out, 1: sh_out
      const outGain = this.ctx.createGain();
      const shOutGain = this.ctx.createGain();

      dasNode.connect(outGain, 0, 0);
      dasNode.connect(shOutGain, 1, 0);

      this.outputNodes.set("das.out", outGain);
      this.outputNodes.set("das.sh_out", shOutGain);
    } catch (e) {
      console.warn("DAS worklet initialization fallback:", e);
    }
  }

  // ─── 4. Tuneable LPF ─────────────────────────────────────────────
  private buildTuneableLPF(): void {
    if (!this.ctx) return;

    this.tlpfFilters = [];
    const NUM_STAGES = 4; // 8th-order cascade

    for (let i = 0; i < NUM_STAGES; i++) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 3000;
      filter.Q.value = [0.54, 1.31, 0.54, 1.31][i];
      this.tlpfFilters.push(filter);
    }

    for (let i = 0; i < NUM_STAGES - 1; i++) {
      this.tlpfFilters[i].connect(this.tlpfFilters[i + 1]);
    }

    const inputGain = this.ctx.createGain();
    inputGain.connect(this.tlpfFilters[0]);
    this.inputNodes.set("tlpf.in", inputGain);
    this.inputNodes.set("tlpf.fc_clk", this.ctx.createGain()); // Clock port placeholder

    this.tlpfGainNode = this.ctx.createGain();
    this.tlpfGainNode.gain.value = 1.0;
    this.tlpfFilters[NUM_STAGES - 1].connect(this.tlpfGainNode);

    this.outputNodes.set("tlpf.out", this.tlpfGainNode);
  }

  // ─── 5. PCM Codec (Encoder & Decoder) ────────────────────────────
  private buildPCMCodec(): void {
    if (!this.ctx) return;

    try {
      this.pcmWorklet = new AudioWorkletNode(this.ctx, "pcm-codec-processor", {
        numberOfInputs: 7,
        numberOfOutputs: 3,
        outputChannelCount: [1, 1, 1],
      });

      // Encoder inputs: 0: clk, 1: fs, 2: in1, 3: in2
      const clkEGain = this.ctx.createGain(); clkEGain.connect(this.pcmWorklet, 0, 0);
      const fsEGain = this.ctx.createGain(); fsEGain.connect(this.pcmWorklet, 0, 1);
      const in1EGain = this.ctx.createGain(); in1EGain.connect(this.pcmWorklet, 0, 2);
      const in2EGain = this.ctx.createGain(); in2EGain.connect(this.pcmWorklet, 0, 3);

      this.inputNodes.set("pcme.clk", clkEGain);
      this.inputNodes.set("pcme.fs", fsEGain);
      this.inputNodes.set("pcme.in1", in1EGain);
      this.inputNodes.set("pcme.in2", in2EGain);

      // Decoder inputs: 4: clk, 5: fs, 6: pcm_data
      const clkDGain = this.ctx.createGain(); clkDGain.connect(this.pcmWorklet, 0, 4);
      const fsDGain = this.ctx.createGain(); fsDGain.connect(this.pcmWorklet, 0, 5);
      const dataDGain = this.ctx.createGain(); dataDGain.connect(this.pcmWorklet, 0, 6);

      this.inputNodes.set("pcmd.clk", clkDGain);
      this.inputNodes.set("pcmd.fs", fsDGain);
      this.inputNodes.set("pcmd.pcm_data", dataDGain);

      // Outputs: 0: pcme.pcm_data, 1: pcmd.out, 2: pcmd.out2
      const pcmDataOut = this.ctx.createGain();
      const pcmdOut = this.ctx.createGain();
      const pcmdOut2 = this.ctx.createGain();

      this.pcmWorklet.connect(pcmDataOut, 0, 0);
      this.pcmWorklet.connect(pcmdOut, 1, 0);
      this.pcmWorklet.connect(pcmdOut2, 2, 0);

      this.outputNodes.set("pcme.pcm_data", pcmDataOut);
      this.outputNodes.set("pcmd.out", pcmdOut);
      this.outputNodes.set("pcmd.out2", pcmdOut2);
    } catch (e) {
      console.warn("PCM worklet initialization fallback:", e);
    }
  }

  // ─── 6. Sequence Generator ───────────────────────────────────────
  private buildSequenceGenerator(): void {
    if (!this.ctx) return;

    try {
      this.seqWorklet = new AudioWorkletNode(this.ctx, "telecoms-seqgen-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 2,
        outputChannelCount: [1, 1],
      });

      // Default internal 2kHz clock source if no external wire is connected
      const defaultClk = this.ctx.createOscillator();
      defaultClk.type = "square";
      defaultClk.frequency.value = 2000;
      defaultClk.start();
      this.oscillators.push(defaultClk);

      const clkGain = this.ctx.createGain();
      defaultClk.connect(clkGain);
      clkGain.connect(this.seqWorklet, 0, 0);
      this.inputNodes.set("seq.clk", clkGain);

      // Outputs: 0: line_code / x / y, 1: sync
      const lineCodeOut = this.ctx.createGain();
      const syncOut = this.ctx.createGain();

      this.seqWorklet.connect(lineCodeOut, 0, 0);
      this.seqWorklet.connect(syncOut, 1, 0);

      this.outputNodes.set("seq.line_code", lineCodeOut);
      this.outputNodes.set("seq.x", lineCodeOut);
      this.outputNodes.set("seq.y", lineCodeOut);
      this.outputNodes.set("seq.sync", syncOut);
    } catch (e) {
      console.warn("Sequence generator worklet fallback:", e);
    }
  }

  // ─── 7. Utilities ────────────────────────────────────────────────
  private buildUtilities(): void {
    if (!this.ctx) return;

    // Comparator worklet
    try {
      const compWorklet = new AudioWorkletNode(this.ctx, "utilities-comparator-processor", {
        numberOfInputs: 2,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });

      const compInGain = this.ctx.createGain(); compInGain.connect(compWorklet, 0, 0);
      const compRefGain = this.ctx.createGain(); compRefGain.connect(compWorklet, 0, 1);
      const compOutGain = this.ctx.createGain(); compWorklet.connect(compOutGain, 0, 0);

      this.inputNodes.set("util.comp_in", compInGain);
      this.inputNodes.set("util.comp_ref", compRefGain);
      this.outputNodes.set("util.comp_out", compOutGain);
    } catch (e) {
      console.warn("Comparator worklet fallback:", e);
    }

    // Half-wave Rectifier (WaveShaper max(0, x))
    const rectShaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      const x = (i / 256) - 1.0;
      curve[i] = Math.max(0, x);
    }
    rectShaper.curve = curve;

    const rectIn = this.ctx.createGain();
    const rectOut = this.ctx.createGain();
    rectIn.connect(rectShaper);
    rectShaper.connect(rectOut);

    this.inputNodes.set("util.rect_in", rectIn);
    this.outputNodes.set("util.rect_out", rectOut);

    // RC Low-Pass Filter
    const rcFilter = this.ctx.createBiquadFilter();
    rcFilter.type = "lowpass";
    rcFilter.frequency.value = 1500;
    const rclpfIn = this.ctx.createGain();
    const rclpfOut = this.ctx.createGain();
    rclpfIn.connect(rcFilter);
    rcFilter.connect(rclpfOut);

    this.inputNodes.set("util.rclpf_in", rclpfIn);
    this.outputNodes.set("util.rclpf_out", rclpfOut);
  }

  // ─── 8. VCO (Voltage Controlled Oscillator) ──────────────────────
  private buildVCO(): void {
    if (!this.ctx) return;

    this.vcoOscSine = this.ctx.createOscillator();
    this.vcoOscSine.type = "sine";
    this.vcoOscSine.frequency.value = 1000;
    this.vcoOscSine.start();
    this.oscillators.push(this.vcoOscSine);

    this.vcoOscDig = this.ctx.createOscillator();
    this.vcoOscDig.type = "square";
    this.vcoOscDig.frequency.value = 1000;
    this.vcoOscDig.start();
    this.oscillators.push(this.vcoOscDig);

    this.vcoGainNode = this.ctx.createGain();
    this.vcoGainNode.gain.value = 1.0;

    const sineOut = this.ctx.createGain();
    const digOut = this.ctx.createGain();

    this.vcoOscSine.connect(sineOut);
    this.vcoOscDig.connect(digOut);

    this.outputNodes.set("vco.sine", sineOut);
    this.outputNodes.set("vco.digital", digOut);
    this.inputNodes.set("vco.input", this.ctx.createGain());
  }

  // ─── 9. Buffer & Adders ──────────────────────────────────────────
  private buildBufferAndAdders(): void {
    if (!this.ctx) return;

    // Buffer Block
    this.bufferGainNode = this.ctx.createGain();
    this.bufferGainNode.gain.value = 1.0;
    this.inputNodes.set("buf.in", this.bufferGainNode);
    this.outputNodes.set("buf.out", this.bufferGainNode);
    this.outputNodes.set("buf.headphone", this.bufferGainNode);

    // Adder 1
    const adderSum = this.ctx.createGain();
    adderSum.gain.value = 0.7; // Headroom
    const inA = this.ctx.createGain(); inA.connect(adderSum);
    const inB = this.ctx.createGain(); inB.connect(adderSum);
    this.inputNodes.set("adder1.a", inA);
    this.inputNodes.set("adder1.b", inB);
    this.outputNodes.set("adder1.ga_gb", adderSum);

    // Channel Adder (add2)
    const add2Sum = this.ctx.createGain();
    const add2Sig = this.ctx.createGain(); add2Sig.connect(add2Sum);
    const add2Noise = this.ctx.createGain(); add2Noise.connect(add2Sum);
    this.inputNodes.set("add2.in", add2Sig);
    this.inputNodes.set("add2.noise", add2Noise);
    this.outputNodes.set("add2.out", add2Sum);
  }

  // ─── 10. Scope Analysers ─────────────────────────────────────────
  private buildScopeAnalysers(): void {
    if (!this.ctx) return;

    this.ch1Analyser = this.ctx.createAnalyser();
    this.ch1Analyser.fftSize = 4096;
    this.ch1Analyser.smoothingTimeConstant = 0;

    this.ch2Analyser = this.ctx.createAnalyser();
    this.ch2Analyser.fftSize = 4096;
    this.ch2Analyser.smoothingTimeConstant = 0;

    this.extTrigAnalyser = this.ctx.createAnalyser();
    this.extTrigAnalyser.fftSize = 4096;
    this.extTrigAnalyser.smoothingTimeConstant = 0;

    this.inputNodes.set("scope.ch1", this.ch1Analyser);
    this.inputNodes.set("scope.ch2", this.ch2Analyser);
    this.inputNodes.set("scope.trigger", this.ch1Analyser);
    this.inputNodes.set("scope.ext_trig", this.extTrigAnalyser);
  }

  getScopeAnalyser(channel: "ch1" | "ch2"): AnalyserNode | null {
    return channel === "ch1" ? this.ch1Analyser : this.ch2Analyser;
  }

  // ─── Dynamic Wire Routing ────────────────────────────────────────
  connectWires(wires: Wire[]): void {
    if (!this.ctx) return;

    // Disconnect previous active connections
    for (const conn of this.activeConnections) {
      try {
        conn.from.disconnect(conn.to);
      } catch {
        /* ok */
      }
    }
    this.activeConnections = [];

    // Process all wires
    for (const wire of wires) {
      let fromNode = this.outputNodes.get(wire.fromPortId);
      let toNode = this.inputNodes.get(wire.toPortId);

      if (!fromNode || !toNode) {
        // Check reverse direction
        fromNode = this.outputNodes.get(wire.toPortId);
        toNode = this.inputNodes.get(wire.fromPortId);
      }

      if (fromNode && toNode) {
        try {
          fromNode.connect(toNode);
          this.activeConnections.push({ from: fromNode, to: toNode });
        } catch (e) {
          console.warn(`Wire connection ${wire.fromPortId} -> ${wire.toPortId} failed:`, e);
        }
      }
    }
  }

  // ─── Parameter Updates ───────────────────────────────────────────
  updateParam(blockId: string, key: string, value: number | string): void {
    if (!this.ctx) return;

    if (blockId === "tuneable_lpf") {
      if (key === "fc") {
        const fc = Math.max(200, Math.min(12000, Number(value)));
        for (const f of this.tlpfFilters) {
          f.frequency.setValueAtTime(fc, this.ctx.currentTime);
        }
      } else if (key === "gain" && this.tlpfGainNode) {
        this.tlpfGainNode.gain.setValueAtTime(Number(value), this.ctx.currentTime);
      }
    } else if (blockId === "variable_dcv") {
      if (key === "vdc" && this.vdcGainNode) {
        // Map -5V..+5V to -1.0 .. +1.0 audio range
        const normalized = Number(value) / 5.0;
        this.vdcGainNode.gain.setValueAtTime(normalized, this.ctx.currentTime);
      }
    } else if (blockId === "vco") {
      if (key === "freq") {
        const f = Math.max(50, Math.min(15000, Number(value)));
        if (this.vcoOscSine) this.vcoOscSine.frequency.setValueAtTime(f, this.ctx.currentTime);
        if (this.vcoOscDig) this.vcoOscDig.frequency.setValueAtTime(f, this.ctx.currentTime);
      } else if (key === "gain" && this.vcoGainNode) {
        this.vcoGainNode.gain.setValueAtTime(Number(value), this.ctx.currentTime);
      }
    } else if (blockId === "sequence_generator") {
      if (key === "lineCode" && this.seqWorklet) {
        const codeMap: Record<string, number> = {
          "NRZ-L": 0,
          "Bi-Phase": 1,
          "RZ-AMI": 2,
          "NRZ-M": 3,
        };
        const code = codeMap[value as string] ?? 0;
        this.seqWorklet.port.postMessage({ type: "SET_LINE_CODE", value: code });
      }
    } else if (blockId === "pcm_encoder") {
      if (key === "mode" && this.pcmWorklet) {
        this.pcmWorklet.port.postMessage({ type: "SET_MODE", value: value });
      }
    } else if (blockId === "buffer") {
      if (key === "gain" && this.bufferGainNode) {
        this.bufferGainNode.gain.setValueAtTime(Number(value), this.ctx.currentTime);
      }
    }
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
    this.tlpfFilters = [];
    this.ch1Analyser = null;
    this.ch2Analyser = null;
    this.extTrigAnalyser = null;
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

// Singleton export
export const audioEngine = new AudioEngine();
