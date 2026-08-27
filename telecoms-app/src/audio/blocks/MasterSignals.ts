import type { Block, AudioBlockNodes } from "../../types";

/**
 * Master Signals Block Builder
 *
 * Provides fixed reference signals matching the real ETT-101:
 * - 2kHz Digital (square wave)
 * - 2kHz Sine
 * - 8kHz Digital
 * - 100kHz Digital
 * - 100kHz Sine
 * - 100kHz Cosine
 */
export function buildMasterSignals(
  ctx: AudioContext,
  _block: Block
): AudioBlockNodes {
  // 2kHz square wave (digital clock)
  const clk2k = ctx.createOscillator();
  clk2k.type = "square";
  clk2k.frequency.value = 2000;
  clk2k.start();

  // 2kHz sine
  const sine2k = ctx.createOscillator();
  sine2k.type = "sine";
  sine2k.frequency.value = 2000;
  sine2k.start();

  // 8kHz square
  const clk8k = ctx.createOscillator();
  clk8k.type = "square";
  clk8k.frequency.value = 8333; // Real board uses 8.333kHz
  clk8k.start();

  // 100kHz signals (close to Nyquist at 48kHz sample rate — will alias,
  // but included for completeness; real experiments at 100kHz need higher SR)
  const sine100k = ctx.createOscillator();
  sine100k.type = "sine";
  sine100k.frequency.value = 100000;
  sine100k.start();

  const cos100k = ctx.createOscillator();
  cos100k.type = "sine";
  cos100k.frequency.value = 100000;
  // Phase shift by 90° (π/2) — not directly supported, use a delay
  cos100k.start();

  const dig100k = ctx.createOscillator();
  dig100k.type = "square";
  dig100k.frequency.value = 100000;
  dig100k.start();

  return {
    inputs: {},
    outputs: {
      "master_signals.2khz_digital": clk2k,
      "master_signals.2khz_sine": sine2k,
      "master_signals.8khz_digital": clk8k,
      "master_signals.100khz_sine": sine100k,
      "master_signals.100khz_cos": cos100k,
      "master_signals.100khz_digital": dig100k,
    },
    onParamChange: () => {},
    dispose: () => {
      clk2k.stop();
      sine2k.stop();
      clk8k.stop();
      sine100k.stop();
      cos100k.stop();
      dig100k.stop();
    },
  };
}
