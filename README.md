# ⚡ Telecoms-Trainer Simulator (Omarator)

[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0+-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Web Audio API](https://img.shields.io/badge/Audio-Web%20Audio%20DSP-00ff41.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Deploy to GitHub Pages](https://github.com/actions/deploy-pages/actions/workflows/deploy.yml/badge.svg)](https://pages.github.com/)

A modern, interactive, virtual simulation of the **EMONA Telecoms-Trainer 101 (BiSKIT)** telecommunications laboratory training system. Designed for engineering students, educators, and electronics enthusiasts to build and experiment with real-time analog and digital communications circuits directly in the browser—no physical hardware or benchtop equipment required.

---

## 🌟 Key Features

- 🎛️ **Authentic 17-Module Trainer Board**: Full silkscreen schematic recreation of the EMONA ETT-101 panel, including:
  - **Row 1**: Adder (GA+gB), Multipliers, Twin Pulse Generator ($Q2$ delay & pulse width), Dual Analog Switch (S/H PAM), Noise Generator (0dB, -6dB, -20dB) & Buffer (3.5mm Headphone Socket), Channel Module (BPF, Baseband LPF, Adder), Phase Shifter ($0^\circ/180^\circ$ & status LED), Utilities (Comparator with Schmitt-trigger $\text{§}$, Rectifier, Diode LPF, RC LPF), and Tuneable LPF ($f_c \times 100$).
  - **Ground Bus**: Central ground rail with 4 grounding jacks.
  - **Row 2**: Variable DCV & Speech Mic capsule & EXOR gate, VCO ($HI/LO$ range), Sequence Generator (NRZ-L, Bi-$\varnothing$, RZ-AMI, NRZ-M) & Divider ($\div$), PCM Encoder ($PCM/TDM$), Master Signals ($100\text{kHz}$ Sine/Cos/Dig, $8\text{kHz}$, $2\text{kHz}$), Multiplier & Serial-to-Parallel ($S/P$), PCM Decoder (TDM LED), and Expansion block.
- 🔌 **Dynamic Patch Cord Wiring**: Click-to-connect and drag color-coded patch cords between square (digital) and circular (analog) jacks with real-time wire curvature and multi-channel routing.
- 📊 **Dual-Trace Oscilloscope with Phosphor Glow**:
  - Live Channel 1 (Cyan) and Channel 2 (Red) waveform monitoring.
  - Hardware controls: $TIME/DIV$ ($10\mu s \dots 50ms$), $V/DIV$ ($100mV \dots 5V$), Position offsets ($CH1, CH2, X$), and Trigger modes ($AUTO, NORM, SINGLE, EXT$).
  - Interactive 2D canvas mouse/touch pan for intuitive real-time waveform analysis.
  - Persistent snapshot buffer on **SINGLE** or **STOP** for frozen waveform study.
- 🔊 **Live DSP & Web Audio Engine**: Mathematically authentic signal synthesis, modulation (AM, FM, DSB, SSB, ASK, FSK, BPSK, QPSK), filtering, PAM sampling, and companded PCM coding.
- 📱 **Responsive & Touch-Optimized**:
  - **Desktop (PC/Laptop)**: Side-by-side workstation layout.
  - **Mobile/Tablet**: Full 100% board fit with zero horizontal scrolling and single-touch rotary knob controls.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- `npm` or `yarn`

### Installation & Local Run

```bash
# Clone the repository
git clone https://github.com/<YOUR-USERNAME>/telecoms-trainer-simulator-omarator.git

# Navigate to the app directory
cd telecoms-trainer-simulator-omarator/telecoms-app

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Open your browser and navigate to `http://localhost:5173/`.

### Production Build

```bash
cd telecoms-app
npm run build
```
The optimized static build will be generated in `telecoms-app/dist/`.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vanilla CSS (Design Tokens, Glassmorphism, Responsive Grid)
- **State Management**: Zustand
- **Graphics**: Scalable Vector Graphics (SVG), HTML5 Canvas 2D
- **Signal Processing**: Web Audio API (OscillatorNode, BiquadFilterNode, GainNode, AudioWorklet/Custom DSP ScriptProcessor)
- **Deployment & CI/CD**: GitHub Actions, GitHub Pages

---

## 📖 Supported Laboratory Experiments

1. **Amplitude Modulation (AM)** & Envelope Detection
2. **Double Sideband Suppressed Carrier (DSB-SC)** & Coherent Demodulation
3. **Frequency Modulation (FM)** via VCO & Slope Detection
4. **Bandwidth Limiting of Digital Signals** & Intersymbol Interference (ISI)
5. **Sampling Theorem (Nyquist Rate)** & PAM Signal Reconstruction
6. **Pulse Code Modulation (PCM)** Encoding, Quantization & Decoding
7. **Digital Line Coding** (NRZ-L, Bi-$\varnothing$ Manchester, RZ-AMI, NRZ-M)
8. **Digital Keying Schemes**: ASK, FSK, BPSK, and QPSK

---

## ⚖️ Educational Disclaimer & Trademarks

This project is an independent, non-commercial open-source educational simulator created for academic study, virtual laboratory practice, and portfolio demonstration. 

- **Emona Telecoms-Trainer 101**, **BiSKIT**, and **TIMS** are trademarks of **Emona Instruments Pty Ltd** (Sydney, Australia).
- This simulator is not affiliated with, endorsed by, or sponsored by Emona Instruments Pty Ltd.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
