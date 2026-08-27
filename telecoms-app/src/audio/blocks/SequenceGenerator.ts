import type { Block, AudioBlockNodes } from "../../types";

/**
 * Sequence Generator Block Builder
 *
 * Loads the AudioWorklet and creates the node with:
 * - CLK input (digital)
 * - Data output (encoded signal)
 * - SYNC output (once per pattern cycle)
 * - Line code switching via MessagePort
 */
export async function buildSequenceGenerator(
  ctx: AudioContext,
  block: Block
): Promise<AudioBlockNodes> {
  // Load the worklet module
  await ctx.audioWorklet.addModule("/worklets/sequence-generator.worklet.js");

  // Create the node: 1 input (CLK), 2 outputs (DATA, SYNC)
  const node = new AudioWorkletNode(ctx, "sequence-generator-processor", {
    numberOfInputs: 1,
    numberOfOutputs: 2,
    outputChannelCount: [1, 1],
  });

  // Set initial line code
  const lineCodeMap: Record<string, number> = {
    "NRZ-L": 0,
    "Bi-Phase": 1,
    "RZ-AMI": 2,
    "NRZ-M": 3,
  };

  const initialCode = lineCodeMap[block.params.lineCode as string] ?? 0;
  node.port.postMessage({ type: "SET_LINE_CODE", value: initialCode });

  // We need splitter nodes to route the two outputs separately
  const dataSplitter = ctx.createChannelSplitter(1);
  const syncSplitter = ctx.createChannelSplitter(1);

  // Create GainNodes as output taps (so we can connect multiple things downstream)
  const dataOut = ctx.createGain();
  dataOut.gain.value = 1.0;

  const syncOut = ctx.createGain();
  syncOut.gain.value = 1.0;

  // Route: node output 0 → dataOut, node output 1 → syncOut
  node.connect(dataOut, 0);
  node.connect(syncOut, 1);

  return {
    inputs: {
      "sequence_generator.clk": node, // CLK goes into input 0
    },
    outputs: {
      "sequence_generator.x": dataOut,
      "sequence_generator.y": dataOut,
      "sequence_generator.0": dataOut,
      "sequence_generator.1": dataOut,
      "sequence_generator.sync": syncOut,
    },
    onParamChange: (key, value) => {
      if (key === "lineCode") {
        const code = lineCodeMap[value as string] ?? 0;
        node.port.postMessage({ type: "SET_LINE_CODE", value: code });
      }
    },
    dispose: () => {
      node.disconnect();
      dataOut.disconnect();
      syncOut.disconnect();
    },
  };
}
