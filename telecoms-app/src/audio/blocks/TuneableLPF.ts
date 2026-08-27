import type { Block, AudioBlockNodes } from "../../types";

/**
 * Tuneable LPF Block Builder
 *
 * The real ETT-101 Tuneable LPF is an 8th-order elliptic filter.
 * We approximate this with 4 cascaded BiquadFilterNodes (each 2nd-order = 8th-order total).
 *
 * Cutoff range: 600 Hz – 12 kHz (matching real board spec)
 * The fc×100 knob maps logarithmically across this range.
 */
export function buildTuneableLPF(
  ctx: AudioContext,
  block: Block
): AudioBlockNodes {
  const NUM_STAGES = 4;
  const filters: BiquadFilterNode[] = [];

  // Create 4 cascaded lowpass biquad filters
  for (let i = 0; i < NUM_STAGES; i++) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = (block.params.fc as number) || 3000;
    // Slightly different Q values per stage to approximate elliptic response
    // Real elliptic filters have specific pole/zero placement;
    // this is a practical approximation
    filter.Q.value = [0.54, 1.31, 0.54, 1.31][i]; // Butterworth-like cascade
    filters.push(filter);
  }

  // Chain them: filter[0] → filter[1] → filter[2] → filter[3]
  for (let i = 0; i < NUM_STAGES - 1; i++) {
    filters[i].connect(filters[i + 1]);
  }

  // Input gain stage
  const inputGain = ctx.createGain();
  inputGain.gain.value = (block.params.gain as number) || 1.0;
  inputGain.connect(filters[0]);

  // Output gain (for the GAIN knob)
  const outputGain = ctx.createGain();
  outputGain.gain.value = 1.0;
  filters[NUM_STAGES - 1].connect(outputGain);

  return {
    inputs: {
      "tuneable_lpf.in": inputGain,
    },
    outputs: {
      "tuneable_lpf.out": outputGain,
    },
    onParamChange: (key, value) => {
      if (key === "fc") {
        const fc = value as number;
        // Clamp to real board range
        const clamped = Math.max(600, Math.min(12000, fc));
        for (const f of filters) {
          f.frequency.setValueAtTime(clamped, ctx.currentTime);
        }
      } else if (key === "gain") {
        inputGain.gain.setValueAtTime(value as number, ctx.currentTime);
      }
    },
    dispose: () => {
      inputGain.disconnect();
      for (const f of filters) f.disconnect();
      outputGain.disconnect();
    },
  };
}
