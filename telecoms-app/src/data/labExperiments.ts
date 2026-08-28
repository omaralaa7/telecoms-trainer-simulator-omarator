import type { LabExperiment } from "../types";

// ─── Wire color auto-assignment pool ──────────────────────────────
// Each wire in a preset gets a distinct color from this rotation.
const COLORS = [
  "#e74c3c", "#2ecc71", "#f1c40f", "#3498db", "#ecf0f1", "#e67e22", "#9b59b6",
] as const;

function autoColor(index: number) {
  return COLORS[index % COLORS.length] as typeof COLORS[number];
}

// ═══════════════════════════════════════════════════════════════════
// LAB 1 — SAMPLING & RECONSTRUCTION (Experiment 11)
// ═══════════════════════════════════════════════════════════════════
const lab1: LabExperiment = {
  id: "lab1",
  title: "Sampling & Reconstruction",
  labNumber: 1,
  expNumber: 11,
  description:
    "Investigate natural sampling and sample-and-hold using the Dual Analog Switch. Reconstruct sampled signals with the Tuneable LPF and explore aliasing by varying the sampling frequency.",
  parts: [
    {
      id: "lab1_a",
      title: "Part A: Natural Sampling",
      description:
        "Sample a 2 kHz sine wave using the 8 kHz digital clock through the Dual Analog Switch. Observe the naturally-sampled PAM waveform on CH1 and the original message on CH2.",
      wires: [
        { fromPortId: "ms.2k_sine", toPortId: "das.in1", color: autoColor(0) },
        { fromPortId: "ms.8k_dig", toPortId: "das.ctrl1", color: autoColor(1) },
        { fromPortId: "das.out", toPortId: "scope.ch1", color: autoColor(2) },
        { fromPortId: "ms.2k_sine", toPortId: "scope.ch2", color: autoColor(3) },
      ],
      scopeSettings: {
        timebaseMs: 0.2,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch1",
        triggerEdge: "rising",
        running: true,
      },
    },
    {
      id: "lab1_b",
      title: "Part B: Reconstruction with Tuneable LPF",
      description:
        "Pass the sampled signal through the Tuneable LPF. Adjust the cutoff frequency to reconstruct the original 2 kHz sine. Observe the effect of different fc settings on reconstruction quality.",
      wires: [
        { fromPortId: "ms.2k_sine", toPortId: "das.in1", color: autoColor(0) },
        { fromPortId: "ms.8k_dig", toPortId: "das.ctrl1", color: autoColor(1) },
        { fromPortId: "das.out", toPortId: "tlpf.in", color: autoColor(2) },
        { fromPortId: "tlpf.out", toPortId: "scope.ch1", color: autoColor(3) },
        { fromPortId: "ms.2k_sine", toPortId: "scope.ch2", color: autoColor(4) },
      ],
      scopeSettings: {
        timebaseMs: 0.2,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch2",
        triggerEdge: "rising",
        running: true,
      },
      params: {
        tuneable_lpf: { fc: 3000, gain: 1.0 },
      },
    },
    {
      id: "lab1_c",
      title: "Part C: Aliasing with Variable Sampling Rate",
      description:
        "Replace the fixed 8 kHz clock with the VCO output as the sampling clock. Reduce the VCO frequency below 4 kHz (2×fmessage) to observe aliasing — the reconstructed signal no longer matches the original.",
      wires: [
        { fromPortId: "ms.2k_sine", toPortId: "das.in1", color: autoColor(0) },
        { fromPortId: "vco.digital", toPortId: "das.ctrl1", color: autoColor(1) },
        { fromPortId: "das.out", toPortId: "tlpf.in", color: autoColor(2) },
        { fromPortId: "tlpf.out", toPortId: "scope.ch1", color: autoColor(3) },
        { fromPortId: "ms.2k_sine", toPortId: "scope.ch2", color: autoColor(4) },
      ],
      scopeSettings: {
        timebaseMs: 0.2,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch2",
        triggerEdge: "rising",
        running: true,
      },
      params: {
        tuneable_lpf: { fc: 3000, gain: 1.0 },
        vco: { freq: 8000, gain: 1.0 },
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// LAB 2 — PCM ENCODING (Experiment 12)
// ═══════════════════════════════════════════════════════════════════
const lab2: LabExperiment = {
  id: "lab2",
  title: "PCM Encoding",
  labNumber: 2,
  expNumber: 12,
  description:
    "Explore Pulse Code Modulation (PCM) encoding using the PCM Encoder module. Observe 8-bit quantized frames, frame sync pulses, and the effect of encoding DC and AC signals.",
  parts: [
    {
      id: "lab2_a",
      title: "Part A: PCM Frame Structure (0V Input)",
      description:
        "Connect the PCM Encoder with clock and frame sync. With no analog input (0V), observe the PCM data output showing the midscale code and the frame sync (FS) pulse marking each frame boundary.",
      wires: [
        { fromPortId: "ms.2k_dig", toPortId: "pcme.clk", color: autoColor(0) },
        { fromPortId: "ms.8k_dig", toPortId: "pcme.fs", color: autoColor(1) },
        { fromPortId: "pcme.pcm_data", toPortId: "scope.ch1", color: autoColor(2) },
        { fromPortId: "ms.8k_dig", toPortId: "scope.ch2", color: autoColor(3) },
      ],
      scopeSettings: {
        timebaseMs: 0.5,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch2",
        triggerEdge: "rising",
        running: true,
      },
    },
    {
      id: "lab2_b",
      title: "Part B: Encoding Variable DC Voltage",
      description:
        "Connect the Variable DCV output to PCM Encoder INPUT 1. Adjust the DC voltage from -2.5V to +2.5V and observe the 8-bit binary code change from 00000000 (min) to 11111111 (max).",
      wires: [
        { fromPortId: "ms.2k_dig", toPortId: "pcme.clk", color: autoColor(0) },
        { fromPortId: "ms.8k_dig", toPortId: "pcme.fs", color: autoColor(1) },
        { fromPortId: "vdcv.vdc", toPortId: "pcme.in1", color: autoColor(2) },
        { fromPortId: "pcme.pcm_data", toPortId: "scope.ch1", color: autoColor(3) },
        { fromPortId: "ms.8k_dig", toPortId: "scope.ch2", color: autoColor(4) },
      ],
      scopeSettings: {
        timebaseMs: 0.5,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch2",
        triggerEdge: "rising",
        running: true,
      },
      params: {
        variable_dcv: { vdc: 0 },
      },
    },
    {
      id: "lab2_c",
      title: "Part C: Encoding AC Sinewave",
      description:
        "Feed a continuous 2 kHz sine wave into the PCM Encoder. Observe how the PCM data stream changes dynamically as the analog signal varies — each frame captures a different quantized sample.",
      wires: [
        { fromPortId: "ms.2k_dig", toPortId: "pcme.clk", color: autoColor(0) },
        { fromPortId: "ms.8k_dig", toPortId: "pcme.fs", color: autoColor(1) },
        { fromPortId: "ms.2k_sine", toPortId: "pcme.in1", color: autoColor(2) },
        { fromPortId: "pcme.pcm_data", toPortId: "scope.ch1", color: autoColor(3) },
        { fromPortId: "ms.8k_dig", toPortId: "scope.ch2", color: autoColor(4) },
      ],
      scopeSettings: {
        timebaseMs: 0.2,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch2",
        triggerEdge: "rising",
        running: true,
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// LAB 3 — PCM DECODING (Experiment 13)
// ═══════════════════════════════════════════════════════════════════
const lab3: LabExperiment = {
  id: "lab3",
  title: "PCM Decoding",
  labNumber: 3,
  expNumber: 13,
  description:
    "Complete the PCM encode-decode loop. Connect the PCM Encoder output to the PCM Decoder, 'stealing' the clock and frame sync. Listen to the decoded output and reconstruct the message with the Tuneable LPF.",
  parts: [
    {
      id: "lab3_a",
      title: "Part A: Basic Encode–Decode Loop",
      description:
        "Wire the PCM Encoder to the PCM Decoder. The decoder needs the same CLK and FS signals ('stolen' from the encoder's clock source). Observe the staircase PAM output of the decoder on CH1.",
      wires: [
        { fromPortId: "ms.2k_dig", toPortId: "pcme.clk", color: autoColor(0) },
        { fromPortId: "ms.8k_dig", toPortId: "pcme.fs", color: autoColor(1) },
        { fromPortId: "ms.2k_sine", toPortId: "pcme.in1", color: autoColor(2) },
        { fromPortId: "pcme.pcm_data", toPortId: "pcmd.pcm_data", color: autoColor(3) },
        { fromPortId: "ms.2k_dig", toPortId: "pcmd.clk", color: autoColor(4) },
        { fromPortId: "ms.8k_dig", toPortId: "pcmd.fs", color: autoColor(5) },
        { fromPortId: "pcmd.out", toPortId: "scope.ch1", color: autoColor(6) },
        { fromPortId: "ms.2k_sine", toPortId: "scope.ch2", color: autoColor(0) },
      ],
      scopeSettings: {
        timebaseMs: 0.2,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch2",
        triggerEdge: "rising",
        running: true,
      },
    },
    {
      id: "lab3_b",
      title: "Part B: Listening via Buffer / Headphones",
      description:
        "Route the decoded PAM output through the Buffer module. Listen to the quantized audio — you can hear the staircase steps as quantization noise layered on the reconstructed tone.",
      wires: [
        { fromPortId: "ms.2k_dig", toPortId: "pcme.clk", color: autoColor(0) },
        { fromPortId: "ms.8k_dig", toPortId: "pcme.fs", color: autoColor(1) },
        { fromPortId: "ms.2k_sine", toPortId: "pcme.in1", color: autoColor(2) },
        { fromPortId: "pcme.pcm_data", toPortId: "pcmd.pcm_data", color: autoColor(3) },
        { fromPortId: "ms.2k_dig", toPortId: "pcmd.clk", color: autoColor(4) },
        { fromPortId: "ms.8k_dig", toPortId: "pcmd.fs", color: autoColor(5) },
        { fromPortId: "pcmd.out", toPortId: "buf.in", color: autoColor(6) },
        { fromPortId: "buf.out", toPortId: "scope.ch1", color: autoColor(0) },
        { fromPortId: "ms.2k_sine", toPortId: "scope.ch2", color: autoColor(1) },
      ],
      scopeSettings: {
        timebaseMs: 0.2,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch2",
        triggerEdge: "rising",
        running: true,
      },
      params: {
        buffer: { gain: 1.0 },
      },
    },
    {
      id: "lab3_c",
      title: "Part C: Reconstruction with Tuneable LPF",
      description:
        "Pass the decoded PAM through the Tuneable LPF to smooth the staircase into a clean reconstructed sine wave. Compare the reconstructed signal (CH1) with the original message (CH2).",
      wires: [
        { fromPortId: "ms.2k_dig", toPortId: "pcme.clk", color: autoColor(0) },
        { fromPortId: "ms.8k_dig", toPortId: "pcme.fs", color: autoColor(1) },
        { fromPortId: "ms.2k_sine", toPortId: "pcme.in1", color: autoColor(2) },
        { fromPortId: "pcme.pcm_data", toPortId: "pcmd.pcm_data", color: autoColor(3) },
        { fromPortId: "ms.2k_dig", toPortId: "pcmd.clk", color: autoColor(4) },
        { fromPortId: "ms.8k_dig", toPortId: "pcmd.fs", color: autoColor(5) },
        { fromPortId: "pcmd.out", toPortId: "tlpf.in", color: autoColor(6) },
        { fromPortId: "tlpf.out", toPortId: "scope.ch1", color: autoColor(0) },
        { fromPortId: "ms.2k_sine", toPortId: "scope.ch2", color: autoColor(1) },
      ],
      scopeSettings: {
        timebaseMs: 0.2,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch2",
        triggerEdge: "rising",
        running: true,
      },
      params: {
        tuneable_lpf: { fc: 3000, gain: 1.0 },
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// LAB 4 — BANDWIDTH LIMITING & SIGNAL RESTORATION (Experiment 14)
// ═══════════════════════════════════════════════════════════════════
const lab4: LabExperiment = {
  id: "lab4",
  title: "Bandwidth Limiting & Signal Restoration",
  labNumber: 4,
  expNumber: 14,
  description:
    "Transmit a digital sequence through a bandwidth-limited channel (Tuneable LPF) and observe inter-symbol interference (ISI). Generate an eye diagram and restore the degraded signal using the Utilities Comparator.",
  parts: [
    {
      id: "lab4_a",
      title: "Part A: ISI from Bandwidth-Limited Channel",
      description:
        "Pass the Sequence Generator's NRZ-L line code through the Tuneable LPF acting as a bandwidth-limited channel. Observe the rounded, distorted pulses on CH1 compared to the clean digital signal on CH2.",
      wires: [
        { fromPortId: "seq.line_code", toPortId: "tlpf.in", color: autoColor(0) },
        { fromPortId: "tlpf.out", toPortId: "scope.ch1", color: autoColor(1) },
        { fromPortId: "seq.line_code", toPortId: "scope.ch2", color: autoColor(2) },
      ],
      scopeSettings: {
        timebaseMs: 0.5,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch2",
        triggerEdge: "rising",
        running: true,
      },
      params: {
        tuneable_lpf: { fc: 2000, gain: 1.0 },
        sequence_generator: { lineCode: "NRZ-L" },
      },
    },
    {
      id: "lab4_b",
      title: "Part B: Eye Diagram Generation",
      description:
        "Trigger the oscilloscope on the Sequence Generator's SYNC clock output to overlay multiple bit periods. The resulting 'eye diagram' reveals the opening quality — a wide open eye means low ISI.",
      wires: [
        { fromPortId: "seq.line_code", toPortId: "tlpf.in", color: autoColor(0) },
        { fromPortId: "tlpf.out", toPortId: "scope.ch1", color: autoColor(1) },
        { fromPortId: "seq.line_code", toPortId: "scope.ch2", color: autoColor(2) },
        { fromPortId: "seq.sync", toPortId: "scope.ext_trig", color: autoColor(3) },
      ],
      scopeSettings: {
        timebaseMs: 0.2,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ext",
        triggerEdge: "rising",
        running: true,
      },
      params: {
        tuneable_lpf: { fc: 2000, gain: 1.0 },
        sequence_generator: { lineCode: "NRZ-L" },
      },
    },
    {
      id: "lab4_c",
      title: "Part C: Signal Restoration with Comparator",
      description:
        "Feed the distorted channel output into the Utilities Comparator. Set the Variable DCV as the decision threshold (REF). The comparator slices the analog signal back into clean digital pulses.",
      wires: [
        { fromPortId: "seq.line_code", toPortId: "tlpf.in", color: autoColor(0) },
        { fromPortId: "tlpf.out", toPortId: "util.comp_in", color: autoColor(1) },
        { fromPortId: "vdcv.vdc", toPortId: "util.comp_ref", color: autoColor(2) },
        { fromPortId: "util.comp_out", toPortId: "scope.ch1", color: autoColor(3) },
        { fromPortId: "seq.line_code", toPortId: "scope.ch2", color: autoColor(4) },
      ],
      scopeSettings: {
        timebaseMs: 0.5,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch2",
        triggerEdge: "rising",
        running: true,
      },
      params: {
        tuneable_lpf: { fc: 2000, gain: 1.0 },
        sequence_generator: { lineCode: "NRZ-L" },
        variable_dcv: { vdc: 0 },
      },
    },
  ],
};

// ─── Export all labs ───────────────────────────────────────────────
export const LAB_EXPERIMENTS: LabExperiment[] = [lab1, lab2, lab3, lab4];
