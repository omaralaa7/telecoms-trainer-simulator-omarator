import type { LabExperiment } from "../types";

// ─── Wire color auto-assignment pool ──────────────────────────────
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
    "Investigate natural sampling and sample-and-hold (flat-top) sampling using the Dual Analog Switch. Reconstruct sampled signals with the Tuneable LPF and explore aliasing by varying the sampling clock frequency.",
  parts: [
    {
      id: "lab1_a1",
      title: "Part A1: Natural Sampling",
      description:
        "Sample a 2 kHz sine wave using the 8 kHz digital clock through the Dual Analog Switch. Observe the naturally-sampled PAM waveform on CH2 and the original 2 kHz message on CH1.",
      diagramUrl: "/diagrams/lab1_fig3.png",
      figureLabel: "Figure 3: Natural Sampling Block Diagram",
      wires: [
        { fromPortId: "ms.2k_sine", toPortId: "das.in2", color: autoColor(0) },
        { fromPortId: "ms.8k_dig", toPortId: "das.ctrl2", color: autoColor(1) },
        { fromPortId: "ms.2k_sine", toPortId: "scope.ch1", color: autoColor(2) },
        { fromPortId: "das.out", toPortId: "scope.ch2", color: autoColor(3) },
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
      id: "lab1_a2",
      title: "Part A2: Sample-and-Hold (Flat-Top) Sampling",
      description:
        "Substitute the basic switch with the Sample-and-Hold circuit. Observe the flat-top PAM sampled waveform on CH2 with holding steps and compare with the continuous message on CH1.",
      diagramUrl: "/diagrams/lab1_fig5.png",
      figureLabel: "Figure 5: Sample-and-Hold Block Diagram",
      wires: [
        { fromPortId: "ms.2k_sine", toPortId: "das.sh_in", color: autoColor(0) },
        { fromPortId: "das.sh_out", toPortId: "das.in1", color: autoColor(1) },
        { fromPortId: "ms.8k_dig", toPortId: "das.ctrl1", color: autoColor(2) },
        { fromPortId: "ms.2k_sine", toPortId: "scope.ch1", color: autoColor(3) },
        { fromPortId: "das.out", toPortId: "scope.ch2", color: autoColor(4) },
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
      id: "lab1_c",
      title: "Part C: Reconstructing the Sampled Message",
      description:
        "Pass the sampled PAM signal through the Tuneable LPF. Turn the Cut-off Frequency knob clockwise to reject high-frequency sampling harmonics and cleanly recover the original 2 kHz sine wave on CH2.",
      diagramUrl: "/diagrams/lab1_fig8.png",
      figureLabel: "Figure 8: Message Reconstruction Block Diagram",
      wires: [
        { fromPortId: "ms.2k_sine", toPortId: "das.in2", color: autoColor(0) },
        { fromPortId: "ms.8k_dig", toPortId: "das.ctrl2", color: autoColor(1) },
        { fromPortId: "das.out", toPortId: "tlpf.in", color: autoColor(2) },
        { fromPortId: "ms.2k_sine", toPortId: "scope.ch1", color: autoColor(3) },
        { fromPortId: "tlpf.out", toPortId: "scope.ch2", color: autoColor(4) },
      ],
      scopeSettings: {
        timebaseMs: 0.2,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch1",
        triggerEdge: "rising",
        running: true,
      },
      params: {
        tuneable_lpf: { fc: 3000, gain: 1.0 },
      },
    },
    {
      id: "lab1_d",
      title: "Part D: Aliasing with Variable Sampling Clock",
      description:
        "Replace the fixed 8 kHz clock with the variable frequency VCO. Lower the VCO frequency below 4 kHz (2×fmessage) to observe aliasing distortion on the reconstructed signal on CH2.",
      diagramUrl: "/diagrams/lab1_fig10.png",
      figureLabel: "Figure 10: Variable Sampling & Aliasing Block Diagram",
      wires: [
        { fromPortId: "ms.2k_sine", toPortId: "das.in2", color: autoColor(0) },
        { fromPortId: "vco.digital", toPortId: "das.ctrl2", color: autoColor(1) },
        { fromPortId: "das.out", toPortId: "tlpf.in", color: autoColor(2) },
        { fromPortId: "ms.2k_sine", toPortId: "scope.ch1", color: autoColor(3) },
        { fromPortId: "tlpf.out", toPortId: "scope.ch2", color: autoColor(4) },
      ],
      scopeSettings: {
        timebaseMs: 0.2,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch1",
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
        "Connect the PCM Encoder with clock and frame sync. With 0V DC input, observe the PCM digital bit stream on CH1 and the Frame Sync (FS) pulse marking each 8-bit frame boundary on CH2.",
      diagramUrl: "/diagrams/lab2_fig3.png",
      figureLabel: "Figure 3: PCM Encoding Block Diagram (0V Input)",
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
        "Connect the Variable DCV output to PCM Encoder INPUT 1. Adjust the DC voltage from -2.5V to +2.5V and observe the 8-bit binary code change on CH1 from 00000000 (min) to 11111111 (max).",
      diagramUrl: "/diagrams/lab2_fig5.png",
      figureLabel: "Figure 5: DC Voltage PCM Encoding Block Diagram",
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
        "Feed a continuous 2 kHz sine wave into the PCM Encoder. Observe how the serial PCM bit pattern changes dynamically as the analog signal varies across each quantized sampling interval.",
      diagramUrl: "/diagrams/lab2_fig7.png",
      figureLabel: "Figure 7: AC Sinewave PCM Encoding Block Diagram",
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
        "Wire the PCM Encoder output directly into the PCM Decoder with stolen CLK and FS signals. Observe the reconstructed staircase PAM analog output on CH1 compared to the original message on CH2.",
      diagramUrl: "/diagrams/lab3_fig3.png",
      figureLabel: "Figure 3: PCM Decode Loop Block Diagram",
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
        "Route the decoded PAM output through the Buffer amplifier module. Observe the buffered output on CH1 and hear the quantization noise inherent in 8-bit quantized audio.",
      diagramUrl: "/diagrams/lab3_fig6.png",
      figureLabel: "Figure 6: PCM Decoding with Buffer Block Diagram",
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
        "Pass the decoded staircase PAM through the Tuneable LPF to filter out quantization harmonics. Compare the cleanly reconstructed sine wave on CH1 with the original message on CH2.",
      diagramUrl: "/diagrams/lab3_fig8.png",
      figureLabel: "Figure 8: PCM Signal Reconstruction Block Diagram",
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
        "Pass the Sequence Generator's NRZ-L digital sequence through the Tuneable LPF channel. Observe the distorted, rounded pulses on CH2 due to ISI and compare with the crisp digital input on CH1.",
      diagramUrl: "/diagrams/lab4_fig3.png",
      figureLabel: "Figure 3: Bandwidth-Limited Channel Block Diagram",
      wires: [
        { fromPortId: "ms.2k_dig", toPortId: "seq.clk", color: autoColor(0) },
        { fromPortId: "seq.line_code", toPortId: "tlpf.in", color: autoColor(1) },
        { fromPortId: "seq.line_code", toPortId: "scope.ch1", color: autoColor(2) },
        { fromPortId: "tlpf.out", toPortId: "scope.ch2", color: autoColor(3) },
      ],
      scopeSettings: {
        timebaseMs: 0.5,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch1",
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
        "Trigger the oscilloscope using the Sequence Generator's SYNC clock output. Overlapping multiple bit transitions forms an 'eye diagram' on CH1, revealing channel ISI and jitter.",
      diagramUrl: "/diagrams/lab4_fig8.png",
      figureLabel: "Figure 8: Eye Diagram Generation Block Diagram",
      wires: [
        { fromPortId: "ms.2k_dig", toPortId: "seq.clk", color: autoColor(0) },
        { fromPortId: "seq.line_code", toPortId: "tlpf.in", color: autoColor(1) },
        { fromPortId: "tlpf.out", toPortId: "scope.ch1", color: autoColor(2) },
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
        "Feed the bandwidth-limited channel output into the Utilities Comparator with Variable DCV setting the decision threshold (REF). The comparator slices the distorted signal back into clean digital pulses on CH2.",
      diagramUrl: "/diagrams/lab4_fig12.png",
      figureLabel: "Figure 12: Digital Signal Restoration Block Diagram",
      wires: [
        { fromPortId: "ms.2k_dig", toPortId: "seq.clk", color: autoColor(0) },
        { fromPortId: "seq.line_code", toPortId: "tlpf.in", color: autoColor(1) },
        { fromPortId: "tlpf.out", toPortId: "util.comp_in", color: autoColor(2) },
        { fromPortId: "vdcv.vdc", toPortId: "util.comp_ref", color: autoColor(3) },
        { fromPortId: "seq.line_code", toPortId: "scope.ch1", color: autoColor(4) },
        { fromPortId: "util.comp_out", toPortId: "scope.ch2", color: autoColor(5) },
        { fromPortId: "seq.sync", toPortId: "scope.ext_trig", color: autoColor(6) },
      ],
      scopeSettings: {
        timebaseMs: 0.5,
        ch1VPerDiv: 1,
        ch2VPerDiv: 1,
        triggerSource: "ch1",
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
