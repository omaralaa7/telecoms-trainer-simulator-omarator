/**
 * Telecoms Trainer 101 — Complete Real-Time DSP AudioWorklet Processors
 *
 * Implements real physical signal processing for:
 * 1. Dual Analog Switch (Natural PAM Sampling & Sample-and-Hold)
 * 2. PCM Codec (8-bit Quantization, Frame Sync Serialization & DAC Deserialization)
 * 3. Utilities Comparator (Threshold decision slicing for signal restoration)
 * 4. Sequence Generator (PRBS with NRZ-L, Bi-Phase/Manchester, RZ-AMI, NRZ-M + SYNC)
 */

// ═══════════════════════════════════════════════════════════════════
// 1. DUAL ANALOG SWITCH & SAMPLE-AND-HOLD
// ═══════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════
// 2. PCM CODEC (ENCODER & DECODER)
// ═══════════════════════════════════════════════════════════════════
class PCMCodecProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Encoder state
    this.encByte = 128;
    this.encBitIndex = 0;
    this.prevEncClk = 0;
    this.prevEncFs = 0;

    // Decoder state
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
      // ── ENCODER ──────────────────────────────────
      const fsSampE = fsE ? fsE[i] : 0.0;
      const clkSampE = clkE ? clkE[i] : 0.0;

      // Frame Sync rising edge: Sample & Quantize analog input to 8-bit unsigned (0..255)
      if (fsSampE > 0.2 && this.prevEncFs <= 0.2) {
        const analogVolts = in1E ? in1E[i] : 0.0;
        const norm = Math.max(-1.0, Math.min(1.0, analogVolts));
        this.encByte = Math.round(((norm + 1.0) / 2.0) * 255);
        this.encBitIndex = 0;
      }
      this.prevEncFs = fsSampE;

      // Clock rising edge: Advance bit shift
      if (clkSampE > 0.2 && this.prevEncClk <= 0.2) {
        this.encBitIndex = (this.encBitIndex + 1) % 8;
      }
      this.prevEncClk = clkSampE;

      // Serial PCM bit output: MSB first
      const bit = (this.encByte >> (7 - this.encBitIndex)) & 1;
      if (pcmDataOut) {
        pcmDataOut[i] = bit ? 1.0 : -1.0;
      }

      // ── DECODER ──────────────────────────────────
      const fsSampD = fsD ? fsD[i] : 0.0;
      const clkSampD = clkD ? clkD[i] : 0.0;
      const bitIn = dataD ? dataD[i] : 0.0;

      // Decoder FS rising edge: Latch reconstructed byte to DAC output
      if (fsSampD > 0.2 && this.prevDecFs <= 0.2) {
        this.decHoldingByte = this.decShiftReg;
        this.decShiftReg = 0;
        this.decBitIndex = 0;
      }
      this.prevDecFs = fsSampD;

      // Decoder Clock rising edge: Shift in bit
      if (clkSampD > 0.2 && this.prevDecClk <= 0.2) {
        const bitVal = bitIn > 0.0 ? 1 : 0;
        this.decShiftReg = ((this.decShiftReg << 1) | bitVal) & 0xFF;
        this.decBitIndex++;
      }
      this.prevDecClk = clkSampD;

      // Convert DAC byte (0..255) to staircase PAM analog voltage (-1.0V .. +1.0V)
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

// ═══════════════════════════════════════════════════════════════════
// 3. UTILITIES COMPARATOR
// ═══════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════
// 4. SEQUENCE GENERATOR (PRBS with NRZ-L, Bi-Phase, RZ-AMI, NRZ-M)
// ═══════════════════════════════════════════════════════════════════
const PRBS_PATTERN = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1]; // 15-bit PRBS

class TelecomsSeqGenProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pattern = [...PRBS_PATTERN];
    this.bitIndex = 0;
    this.lineCode = 0; // 0 = NRZ-L, 1 = Bi-Phase, 2 = RZ-AMI, 3 = NRZ-M
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
        case 0: // NRZ-L: 1 -> +1.0V, 0 -> -1.0V
          sample = currentBit === 1 ? 1.0 : -1.0;
          break;

        case 1: // Bi-Phase (Manchester): mid-bit transition
          {
            const halfBit = this.samplesPerBit / 2;
            if (currentBit === 1) {
              sample = this.sampleInBit <= halfBit ? 1.0 : -1.0;
            } else {
              sample = this.sampleInBit <= halfBit ? -1.0 : 1.0;
            }
          }
          break;

        case 2: // RZ-AMI: 1 -> alternating +-1V with RZ at mid-bit, 0 -> 0V
          if (currentBit === 1) {
            const halfBit = this.samplesPerBit / 2;
            sample = this.sampleInBit <= halfBit ? this.amiPolarity : 0.0;
            if (risingEdge) {
              this.amiPolarity *= -1;
            }
          } else {
            sample = 0.0;
          }
          break;

        case 3: // NRZ-M: transition on 1, hold on 0
          if (risingEdge && currentBit === 1) {
            this.nrzmState *= -1;
          }
          sample = this.nrzmState;
          break;

        default:
          sample = currentBit === 1 ? 1.0 : -1.0;
      }

      dataOut[i] = sample;

      // SYNC pulse: HIGH during bit 0 of the sequence
      if (syncOut) {
        syncOut[i] = this.bitIndex === 0 ? 1.0 : -1.0;
      }
    }

    return true;
  }
}

registerProcessor("telecoms-seqgen-processor", TelecomsSeqGenProcessor);
