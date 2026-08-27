/**
 * Sequence Generator AudioWorkletProcessor
 *
 * Generates a repeating digital bit pattern with selectable line coding:
 *   00 = NRZ-L, 01 = Bi-Phase (Manchester), 10 = RZ-AMI, 11 = NRZ-M
 *
 * Inputs:
 *   - input[0]: CLK signal (square wave, rising edge triggers bit shift)
 *
 * Outputs:
 *   - output[0]: Encoded data signal
 *   - output[1]: SYNC pulse (high once per full pattern cycle)
 */

// Default bit pattern (common 8-bit test sequence)
const DEFAULT_PATTERN = [1, 0, 1, 1, 0, 0, 1, 0];

class SequenceGeneratorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this._pattern = [...DEFAULT_PATTERN];
    this._bitIndex = 0;
    this._lineCode = 0; // 00 = NRZ-L
    this._prevClk = 0;
    this._sampleInBit = 0;
    this._samplesPerBit = 0; // Will be computed from CLK
    this._currentLevel = 0;
    this._prevBit = 0;
    this._amiPolarity = 1; // Alternating polarity for RZ-AMI
    this._nrzmState = -1;  // Current state for NRZ-M

    // Listen for parameter updates from main thread
    this.port.onmessage = (event) => {
      const { type, value } = event.data;
      if (type === "SET_LINE_CODE") {
        this._lineCode = value; // 0, 1, 2, or 3
      } else if (type === "SET_PATTERN") {
        this._pattern = value;
        this._bitIndex = 0;
      }
    };
  }

  process(inputs, outputs, _parameters) {
    const clkInput = inputs[0];
    const dataOutput = outputs[0];
    const syncOutput = outputs[1];

    const clkChannel = clkInput && clkInput[0] ? clkInput[0] : null;
    const dataChannel = dataOutput && dataOutput[0] ? dataOutput[0] : null;
    const syncChannel = syncOutput && syncOutput[0] ? syncOutput[0] : null;

    if (!dataChannel) return true;

    const blockSize = dataChannel.length; // 128 samples

    for (let i = 0; i < blockSize; i++) {
      // Detect rising edge on CLK
      let clkSample = 0;
      if (clkChannel) {
        clkSample = clkChannel[i];
      }

      const risingEdge = clkSample > 0.3 && this._prevClk <= 0.3;
      this._prevClk = clkSample;

      if (risingEdge) {
        // Move to next bit
        this._bitIndex = (this._bitIndex + 1) % this._pattern.length;
        this._sampleInBit = 0;

        if (this._samplesPerBit === 0) {
          // Estimate: at 48kHz sample rate and 2kHz CLK, ~24 samples per bit
          this._samplesPerBit = 24;
        }
      }

      this._sampleInBit++;

      const currentBit = this._pattern[this._bitIndex];

      // Apply line coding
      let sample = 0;
      switch (this._lineCode) {
        case 0: // NRZ-L: 1→+1, 0→-1
          sample = currentBit === 1 ? 1.0 : -1.0;
          break;

        case 1: // Bi-Phase (Manchester): transition at mid-bit
          {
            const halfBit = this._samplesPerBit / 2;
            if (currentBit === 1) {
              sample = this._sampleInBit <= halfBit ? 1.0 : -1.0;
            } else {
              sample = this._sampleInBit <= halfBit ? -1.0 : 1.0;
            }
          }
          break;

        case 2: // RZ-AMI: 1→alternating ±1 (return to zero at mid-bit), 0→0
          if (currentBit === 1) {
            const halfBit = this._samplesPerBit / 2;
            if (this._sampleInBit <= halfBit) {
              sample = this._amiPolarity;
            } else {
              sample = 0;
            }
            if (risingEdge) {
              this._amiPolarity *= -1;
            }
          } else {
            sample = 0;
          }
          break;

        case 3: // NRZ-M: transition on 1, no change on 0
          if (risingEdge) {
            if (currentBit === 1) {
              this._nrzmState *= -1; // Toggle
            }
            // else: no change
          }
          sample = this._nrzmState;
          break;

        default:
          sample = currentBit === 1 ? 1.0 : -1.0;
      }

      dataChannel[i] = sample;

      // SYNC: pulse high for the duration of bit 0
      if (syncChannel) {
        syncChannel[i] = this._bitIndex === 0 ? 1.0 : 0.0;
      }
    }

    return true;
  }
}

registerProcessor("sequence-generator-processor", SequenceGeneratorProcessor);
