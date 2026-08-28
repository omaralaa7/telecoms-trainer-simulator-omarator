import type { Wire } from "../types";

/**
 * TELECOMS_DSP_WORKLET_CODE
 *
 * Inlined AudioWorklet source string loaded via Blob URL to guarantee
 * 100% reliability with zero 404 errors on GitHub Pages or any hosting.
 */
const TELECOMS_DSP_WORKLET_CODE = `
// ─── 1. DUAL ANALOG SWITCH & SAMPLE-AND-HOLD ────────────────────────
class DualAnalogSwitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.heldSample = 0;
    this.prevShClock = 0;
  }

  process(inputs, outputs) {
    const in1 = inputs[0]?.[0];
    const ctrl1 = inputs[1]?.[0];
    const in2 = inputs[2]?.[0];
    const ctrl2 = inputs[3]?.[0];
    const sh_in = inputs[4]?.[0];

    const out = outputs[0]?.[0];
    const sh_out = outputs[1]?.[0];

    const blockSize = 128;

    for (let i = 0; i < blockSize; i++) {
      // Switch 1: closed when ctrl1 is HIGH (>0.1)
      const g1 = (ctrl1 && ctrl1[i] > 0.1) ? 1.0 : 0.0;
      const s1 = in1 ? in1[i] * g1 : 0.0;

      // Switch 2: closed when ctrl2 is HIGH (>0.1)
      const g2 = (ctrl2 && ctrl2[i] > 0.1) ? 1.0 : 0.0;
      const s2 = in2 ? in2[i] * g2 : 0.0;

      if (out) {
        out[i] = s1 + s2;
      }

      // Sample & Hold: latches analog voltage on clock rising edge
      const clk = (ctrl1 && ctrl1[i] !== undefined) ? ctrl1[i] : ((ctrl2 && ctrl2[i] !== undefined) ? ctrl2[i] : 0.0);
      if (clk > 0.2 && this.prevShClock <= 0.2) {
        this.heldSample = sh_in ? sh_in[i] : 0.0;
      }
      this.prevShClock = clk;

      if (sh_out) {
        sh_out[i] = this.heldSample;
      }
    }

    return true;
  }
}
registerProcessor("dual-analog-switch-processor", DualAnalogSwitchProcessor);

// ─── 2. PCM CODEC (ENCODER & DECODER) ───────────────────────────────
class PCMCodecProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.encByte = 128;
    this.encBitIndex = 0;
    this.prevEncClk = 0;
    this.prevEncFs = 0;

    this.decShiftReg = 128;
    this.decBitIndex = 0;
    this.decHoldingByte = 128;
    this.prevDecClk = 0;
    this.prevDecFs = 0;
    this.isTdm = false;

    this.port.onmessage = (e) => {
      if (e.data?.type === "SET_MODE") {
        this.isTdm = e.data.value === "TDM";
      }
    };
  }

  process(inputs, outputs) {
    const clkE = inputs[0]?.[0];
    const fsE = inputs[1]?.[0];
    const in1E = inputs[2]?.[0];
    const in2E = inputs[3]?.[0];

    const clkD = inputs[4]?.[0];
    const fsD = inputs[5]?.[0];
    const dataD = inputs[6]?.[0];

    const pcmDataOut = outputs[0]?.[0];
    const decOut = outputs[1]?.[0];
    const decOut2 = outputs[2]?.[0];

    const blockSize = 128;

    for (let i = 0; i < blockSize; i++) {
      // ── ENCODER ──
      const fsSampE = fsE ? fsE[i] : 0.0;
      const clkSampE = clkE ? clkE[i] : 0.0;

      if (fsSampE > 0.2 && this.prevEncFs <= 0.2) {
        const analogVolts = in1E ? in1E[i] : 0.0;
        const norm = Math.max(-1.0, Math.min(1.0, analogVolts));
        this.encByte = Math.round(((norm + 1.0) / 2.0) * 255);
        this.encBitIndex = 0;
      }
      this.prevEncFs = fsSampE;

      if (clkSampE > 0.2 && this.prevEncClk <= 0.2) {
        this.encBitIndex = (this.encBitIndex + 1) % 8;
      }
      this.prevEncClk = clkSampE;

      const bit = (this.encByte >> (7 - this.encBitIndex)) & 1;
      if (pcmDataOut) {
        pcmDataOut[i] = bit ? 1.0 : -1.0;
      }

      // ── DECODER ──
      const fsSampD = fsD ? fsD[i] : 0.0;
      const clkSampD = clkD ? clkD[i] : 0.0;
      const bitIn = dataD ? dataD[i] : 0.0;

      if (fsSampD > 0.2 && this.prevDecFs <= 0.2) {
        this.decHoldingByte = this.decShiftReg;
        this.decShiftReg = 0;
        this.decBitIndex = 0;
      }
      this.prevDecFs = fsSampD;

      if (clkSampD > 0.2 && this.prevDecClk <= 0.2) {
        const bitVal = bitIn > 0.0 ? 1 : 0;
        this.decShiftReg = ((this.decShiftReg << 1) | bitVal) & 0xFF;
        this.decBitIndex++;
      }
      this.prevDecClk = clkSampD;

      const dacVolts = ((this.decHoldingByte / 255.0) * 2.0) - 1.0;
      if (decOut) {
        decOut[i] = dacVolts;
      }
      if (decOut2) {
        decOut2[i] = dacVolts;
      }
    }

    return true;
  }
}
registerProcessor("pcm-codec-processor", PCMCodecProcessor);

// ─── 3. UTILITIES COMPARATOR ─────────────────────────────────────────
class UtilitiesComparatorProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const inSig = inputs[0]?.[0];
    const refSig = inputs[1]?.[0];
    const out = outputs[0]?.[0];

    if (!out) return true;

    for (let i = 0; i < 128; i++) {
      const vIn = inSig ? inSig[i] : 0.0;
      const vRef = refSig ? refSig[i] : 0.0;
      out[i] = vIn > vRef ? 1.0 : -1.0;
    }

    return true;
  }
}
registerProcessor("utilities-comparator-processor", UtilitiesComparatorProcessor);

// ─── 4. SEQUENCE GENERATOR (PRBS) ───────────────────────────────────
const PRBS_PATTERN = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1];

class TelecomsSeqGenProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pattern = [...PRBS_PATTERN];
    this.bitIndex = 0;
    this.lineCode = 0;
    this.prevClk = 0;
    this.sampleInBit = 0;
    this.samplesPerBit = 24;
    this.amiPolarity = 1;
    this.nrzmState = -1;

    this.port.onmessage = (event) => {
      const { type, value } = event.data;
      if (type === "SET_LINE_CODE") {
        this.lineCode = value;
      }
    };
  }

  process(inputs, outputs) {
    const clkInput = inputs[0]?.[0];
    const dataOut = outputs[0]?.[0];
    const syncOut = outputs[1]?.[0];

    if (!dataOut) return true;

    for (let i = 0; i < 128; i++) {
      let clkSample = clkInput ? clkInput[i] : 0;
      const risingEdge = clkSample > 0.3 && this.prevClk <= 0.3;
      this.prevClk = clkSample;

      if (risingEdge) {
        this.bitIndex = (this.bitIndex + 1) % this.pattern.length;
        this.sampleInBit = 0;
      }

      this.sampleInBit++;
      const currentBit = this.pattern[this.bitIndex];

      let sample = 0;
      switch (this.lineCode) {
        case 0:
          sample = currentBit === 1 ? 1.0 : -1.0;
          break;
        case 1:
          {
            const halfBit = this.samplesPerBit / 2;
            sample = (currentBit === 1)
              ? (this.sampleInBit <= halfBit ? 1.0 : -1.0)
              : (this.sampleInBit <= halfBit ? -1.0 : 1.0);
          }
          break;
        case 2:
          if (currentBit === 1) {
            const halfBit = this.samplesPerBit / 2;
            sample = this.sampleInBit <= halfBit ? this.amiPolarity : 0.0;
            if (risingEdge) this.amiPolarity *= -1;
          } else {
            sample = 0.0;
          }
          break;
        case 3:
          if (risingEdge && currentBit === 1) {
            this.nrzmState *= -1;
          }
          sample = this.nrzmState;
          break;
        default:
          sample = currentBit === 1 ? 1.0 : -1.0;
      }

      dataOut[i] = sample;
      if (syncOut) {
        syncOut[i] = this.bitIndex === 0 ? 1.0 : -1.0;
      }
    }

    return true;
  }
}
registerProcessor("telecoms-seqgen-processor", TelecomsSeqGenProcessor);
`;

/**
 * AudioEngine — Real-Time DSP Signal Processing Engine
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private isInitializing = false;

  private outputNodes: Map<string, AudioNode> = new Map();
  private inputNodes: Map<string, AudioNode> = new Map();

  private pcmWorklet: AudioWorkletNode | null = null;
  private seqWorklet: AudioWorkletNode | null = null;
  private tlpfFilters: BiquadFilterNode[] = [];
  private tlpfGainNode: GainNode | null = null;
  private vdcGainNode: GainNode | null = null;
  private vcoOscSine: OscillatorNode | null = null;
  private vcoOscDig: OscillatorNode | null = null;
  private vcoGainNode: GainNode | null = null;
  private bufferGainNode: GainNode | null = null;

  private ch1Analyser: AnalyserNode | null = null;
  private ch2Analyser: AnalyserNode | null = null;
  private extTrigAnalyser: AnalyserNode | null = null;

  private activeConnections: Array<{ from: AudioNode; to: AudioNode }> = [];
  private oscillators: OscillatorNode[] = [];
  private pendingWires: Wire[] = [];

  async init(): Promise<void> {
    if (this.isInitialized || this.isInitializing) return;
    this.isInitializing = true;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 48000 });

      // Load Worklet from inline Blob URL to guarantee 0% 404 network failure
      const blob = new Blob([TELECOMS_DSP_WORKLET_CODE], { type: "application/javascript" });
      const blobUrl = URL.createObjectURL(blob);
      await this.ctx.audioWorklet.addModule(blobUrl);
      URL.revokeObjectURL(blobUrl);

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

      if (this.pendingWires.length > 0) {
        this.connectWires(this.pendingWires);
      }
    } catch (e) {
      console.error("AudioEngine initialization failed:", e);
    } finally {
      this.isInitializing = false;
    }
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  get running(): boolean {
    return this.isInitialized && this.ctx?.state === "running";
  }

  async resume(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
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

    const p5vGain = this.ctx.createGain();
    p5vGain.gain.value = 1.0;
    constSrc.connect(p5vGain);
    this.outputNodes.set("vdcv.p5v", p5vGain);

    this.vdcGainNode = this.ctx.createGain();
    this.vdcGainNode.gain.value = 0.0;
    constSrc.connect(this.vdcGainNode);
    this.outputNodes.set("vdcv.vdc", this.vdcGainNode);

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

      const outGain = this.ctx.createGain();
      const shOutGain = this.ctx.createGain();

      dasNode.connect(outGain, 0, 0);
      dasNode.connect(shOutGain, 1, 0);

      this.outputNodes.set("das.out", outGain);
      this.outputNodes.set("das.sh_out", shOutGain);
    } catch (e) {
      console.error("DAS worklet build failed:", e);
    }
  }

  // ─── 4. Tuneable LPF ─────────────────────────────────────────────
  private buildTuneableLPF(): void {
    if (!this.ctx) return;

    this.tlpfFilters = [];
    const NUM_STAGES = 4;

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
    this.inputNodes.set("tlpf.fc_clk", this.ctx.createGain());

    this.tlpfGainNode = this.ctx.createGain();
    this.tlpfGainNode.gain.value = 1.0;
    this.tlpfFilters[NUM_STAGES - 1].connect(this.tlpfGainNode);

    this.outputNodes.set("tlpf.out", this.tlpfGainNode);
  }

  // ─── 5. PCM Codec ────────────────────────────────────────────────
  private buildPCMCodec(): void {
    if (!this.ctx) return;

    try {
      this.pcmWorklet = new AudioWorkletNode(this.ctx, "pcm-codec-processor", {
        numberOfInputs: 7,
        numberOfOutputs: 3,
        outputChannelCount: [1, 1, 1],
      });

      const clkEGain = this.ctx.createGain(); clkEGain.connect(this.pcmWorklet, 0, 0);
      const fsEGain = this.ctx.createGain(); fsEGain.connect(this.pcmWorklet, 0, 1);
      const in1EGain = this.ctx.createGain(); in1EGain.connect(this.pcmWorklet, 0, 2);
      const in2EGain = this.ctx.createGain(); in2EGain.connect(this.pcmWorklet, 0, 3);

      this.inputNodes.set("pcme.clk", clkEGain);
      this.inputNodes.set("pcme.fs", fsEGain);
      this.inputNodes.set("pcme.in1", in1EGain);
      this.inputNodes.set("pcme.in2", in2EGain);

      const clkDGain = this.ctx.createGain(); clkDGain.connect(this.pcmWorklet, 0, 4);
      const fsDGain = this.ctx.createGain(); fsDGain.connect(this.pcmWorklet, 0, 5);
      const dataDGain = this.ctx.createGain(); dataDGain.connect(this.pcmWorklet, 0, 6);

      this.inputNodes.set("pcmd.clk", clkDGain);
      this.inputNodes.set("pcmd.fs", fsDGain);
      this.inputNodes.set("pcmd.pcm_data", dataDGain);

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
      console.error("PCM worklet build failed:", e);
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

      const defaultClk = this.ctx.createOscillator();
      defaultClk.type = "square";
      defaultClk.frequency.value = 2000;
      defaultClk.start();
      this.oscillators.push(defaultClk);

      const clkGain = this.ctx.createGain();
      defaultClk.connect(clkGain);
      clkGain.connect(this.seqWorklet, 0, 0);
      this.inputNodes.set("seq.clk", clkGain);

      const lineCodeOut = this.ctx.createGain();
      const syncOut = this.ctx.createGain();

      this.seqWorklet.connect(lineCodeOut, 0, 0);
      this.seqWorklet.connect(syncOut, 1, 0);

      this.outputNodes.set("seq.line_code", lineCodeOut);
      this.outputNodes.set("seq.x", lineCodeOut);
      this.outputNodes.set("seq.y", lineCodeOut);
      this.outputNodes.set("seq.sync", syncOut);
    } catch (e) {
      console.error("Sequence generator build failed:", e);
    }
  }

  // ─── 7. Utilities ────────────────────────────────────────────────
  private buildUtilities(): void {
    if (!this.ctx) return;

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
      console.error("Comparator build failed:", e);
    }

    // Half-wave Rectifier
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

  // ─── 8. VCO ──────────────────────────────────────────────────────
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

    this.bufferGainNode = this.ctx.createGain();
    this.bufferGainNode.gain.value = 1.0;
    this.inputNodes.set("buf.in", this.bufferGainNode);
    this.outputNodes.set("buf.out", this.bufferGainNode);
    this.outputNodes.set("buf.headphone", this.bufferGainNode);

    const adderSum = this.ctx.createGain();
    adderSum.gain.value = 0.7;
    const inA = this.ctx.createGain(); inA.connect(adderSum);
    const inB = this.ctx.createGain(); inB.connect(adderSum);
    this.inputNodes.set("adder1.a", inA);
    this.inputNodes.set("adder1.b", inB);
    this.outputNodes.set("adder1.ga_gb", adderSum);

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
    this.pendingWires = wires;
    if (!this.isInitialized || !this.ctx) {
      this.init().then(() => this.connectWires(wires));
      return;
    }

    // Disconnect previous connections
    for (const conn of this.activeConnections) {
      try {
        conn.from.disconnect(conn.to);
      } catch {
        /* ok */
      }
    }
    this.activeConnections = [];

    // Connect all active patch wires
    for (const wire of wires) {
      let fromNode = this.outputNodes.get(wire.fromPortId);
      let toNode = this.inputNodes.get(wire.toPortId);

      if (!fromNode || !toNode) {
        fromNode = this.outputNodes.get(wire.toPortId);
        toNode = this.inputNodes.get(wire.fromPortId);
      }

      if (fromNode && toNode) {
        try {
          fromNode.connect(toNode);
          this.activeConnections.push({ from: fromNode, to: toNode });
        } catch (e) {
          console.warn(`Wire ${wire.fromPortId} -> ${wire.toPortId} connect error:`, e);
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

export const audioEngine = new AudioEngine();
