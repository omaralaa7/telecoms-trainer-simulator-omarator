import type { Block } from "../../types";
import { usePatchStore } from "../../store/patchStore";
import Jack from "./Jack";
import Knob from "./Knob";

interface BlockFaceplateProps {
  block: Block;
}

/**
 * BlockFaceplate — Renders an individual block matching the real ETT-101 style:
 * cream background, dark header bar, labeled ports, block symbol.
 */
export default function BlockFaceplate({ block }: BlockFaceplateProps) {
  const setParam = usePatchStore((s) => s.setParam);

  return (
    <g className="block-faceplate">
      {/* Block background */}
      <rect
        x={block.x}
        y={block.y}
        width={block.width}
        height={block.height}
        fill="#f5f0e6"
        stroke="#a09888"
        strokeWidth={1}
        rx={2}
      />

      {/* Header bar */}
      <rect x={block.x} y={block.y} width={block.width} height={20} fill="#2c3e50" rx={2} />
      <rect x={block.x} y={block.y + 10} width={block.width} height={10} fill="#2c3e50" />

      {/* Block label */}
      <text
        x={block.x + block.width / 2}
        y={block.y + (block.label.includes("\n") ? 9 : 13)}
        textAnchor="middle"
        fontSize="7"
        fontWeight="bold"
        fill="#ecf0f1"
        fontFamily="Inter, sans-serif"
        letterSpacing="0.5"
        pointerEvents="none"
      >
        {block.label.split("\n").map((line, i) => (
          <tspan key={i} x={block.x + block.width / 2} dy={i === 0 ? 0 : 9}>
            {line}
          </tspan>
        ))}
      </text>

      {/* Block symbol icon */}
      {renderSymbol(block)}

      {/* All ports */}
      {block.ports.map((p) => (
        <Jack key={p.id} port={p} blockX={block.x} blockY={block.y} />
      ))}

      {/* Knobs for blocks that have them */}
      {renderKnobs(block, setParam)}

      {/* Line code switch for sequence generator */}
      {block.kind === "sequence_generator" && renderLineCodeSwitch(block, setParam)}
    </g>
  );
}

// ─── Block Symbols ──────────────────────────────────────────────
function renderSymbol(block: Block) {
  const cx = block.x + block.width / 2;
  const sy = block.y + 28;

  switch (block.kind) {
    case "adder":
      return <text x={cx} y={sy + 10} textAnchor="middle" fontSize="18" fill="#555" pointerEvents="none">±</text>;
    case "multiplier":
      return <text x={cx} y={sy + 10} textAnchor="middle" fontSize="18" fill="#555" pointerEvents="none">×</text>;
    case "tuneable_lpf":
      return (
        <path d={`M ${cx-12} ${sy+5} h 10 q 4 0 6 5 q 4 10 8 10`} fill="none" stroke="#555" strokeWidth={1.5} pointerEvents="none" />
      );
    case "master_signals":
      return (
        <g pointerEvents="none">
          <path d={`M ${cx-15} ${sy+5} q 5 -7 10 0 q 5 7 10 0`} fill="none" stroke="#555" strokeWidth={1.2} />
          <path d={`M ${cx-15} ${sy+18} h 4 v -7 h 5 v 7 h 5 v -7 h 4`} fill="none" stroke="#555" strokeWidth={1.2} />
        </g>
      );
    case "sequence_generator":
      return (
        <path d={`M ${cx-18} ${sy+10} h 3 v -8 h 5 v 8 h 3 v -8 h 5 v 8 h 5 v -8 h 4 v 8 h 3`}
          fill="none" stroke="#555" strokeWidth={1.2} pointerEvents="none" />
      );
    case "noise_generator":
      return <text x={cx} y={sy + 10} textAnchor="middle" fontSize="12" fill="#555" pointerEvents="none">∿∿</text>;
    case "buffer":
      return (
        <path d={`M ${cx-8} ${sy} l 16 8 l -16 8 z`} fill="none" stroke="#555" strokeWidth={1.2} pointerEvents="none" />
      );
    case "vco":
      return (
        <path d={`M ${cx-12} ${sy+5} q 5 -8 10 0 q 5 8 10 0`} fill="none" stroke="#555" strokeWidth={1.2} pointerEvents="none" />
      );
    case "phase_shifter":
      return <text x={cx} y={sy + 12} textAnchor="middle" fontSize="16" fill="#555" pointerEvents="none">Ø</text>;
    case "channel_module":
      return <text x={cx} y={sy + 10} textAnchor="middle" fontSize="10" fill="#555" pointerEvents="none">📡</text>;
    case "dual_analog_switch":
      return <text x={cx} y={sy + 10} textAnchor="middle" fontSize="8" fill="#555" fontWeight="bold" pointerEvents="none">S/H</text>;
    case "twin_pulse_generator":
      return (
        <path d={`M ${cx-12} ${sy+10} v -10 h 8 v 10 h 6 v -10 h 8 v 10`} fill="none" stroke="#555" strokeWidth={1.2} pointerEvents="none" />
      );
    case "pcm_encoder":
    case "pcm_decoder":
      return <text x={cx} y={sy + 10} textAnchor="middle" fontSize="8" fill="#555" fontWeight="bold" pointerEvents="none">PCM</text>;
    case "utilities":
      return <text x={cx} y={sy + 10} textAnchor="middle" fontSize="8" fill="#555" fontWeight="bold" pointerEvents="none">UTIL</text>;
    case "expansion":
      return (
        <rect x={block.x + 15} y={block.y + 80} width={block.width - 30} height={80} fill="none" stroke="#ccc" strokeWidth={1} strokeDasharray="4 3" rx={3} pointerEvents="none" />
      );
    default:
      return null;
  }
}

// ─── Knobs ──────────────────────────────────────────────────────
function renderKnobs(
  block: Block,
  setParam: (blockId: string, key: string, value: number | string) => void
) {
  switch (block.kind) {
    case "tuneable_lpf":
      return (
        <>
          <Knob label="fc×100" value={(block.params.fc as number) || 3000}
            min={600} max={12000} step={100} unit="Hz" logarithmic
            onChange={(v) => setParam(block.id, "fc", v)}
            cx={block.x + 30} cy={block.y + 80} size={20} color="#e74c3c" />
          <Knob label="GAIN" value={(block.params.gain as number) || 1.0}
            min={0} max={2} step={0.1} unit="×"
            onChange={(v) => setParam(block.id, "gain", v)}
            cx={block.x + 70} cy={block.y + 80} size={16} color="#3498db" />
        </>
      );
    case "twin_pulse_generator":
      return (
        <>
          <Knob label="WIDTH" value={(block.params.width as number) || 0.5}
            min={0} max={1} step={0.05} unit=""
            onChange={(v) => setParam(block.id, "width", v)}
            cx={block.x + 30} cy={block.y + 100} size={16} color="#9b59b6" />
          <Knob label="DELAY" value={(block.params.delay as number) || 0.5}
            min={0} max={1} step={0.05} unit=""
            onChange={(v) => setParam(block.id, "delay", v)}
            cx={block.x + 70} cy={block.y + 160} size={16} color="#e67e22" />
        </>
      );
    case "vco":
      return (
        <>
          <Knob label="FREQ" value={(block.params.freq as number) || 1000}
            min={100} max={20000} step={100} unit="Hz" logarithmic
            onChange={(v) => setParam(block.id, "freq", v)}
            cx={block.x + 35} cy={block.y + 140} size={18} color="#e74c3c" />
          <Knob label="GAIN" value={(block.params.gain as number) || 1.0}
            min={0} max={2} step={0.1} unit="×"
            onChange={(v) => setParam(block.id, "gain", v)}
            cx={block.x + 70} cy={block.y + 100} size={14} color="#3498db" />
        </>
      );
    case "buffer":
      return (
        <Knob label="GAIN" value={(block.params.gain as number) || 1.0}
          min={0} max={2} step={0.1} unit="×"
          onChange={(v) => setParam(block.id, "gain", v)}
          cx={block.x + block.width / 2} cy={block.y + 40} size={14} color="#3498db" />
      );
    case "phase_shifter":
      return (
        <Knob label="PHASE" value={(block.params.phase as number) || 0}
          min={0} max={360} step={5} unit="°"
          onChange={(v) => setParam(block.id, "phase", v)}
          cx={block.x + block.width / 2} cy={block.y + 130} size={18} color="#9b59b6" />
      );
    default:
      return null;
  }
}

// ─── Line Code Switch ───────────────────────────────────────────
function renderLineCodeSwitch(
  block: Block,
  setParam: (blockId: string, key: string, value: number | string) => void
) {
  const lineCode = (block.params.lineCode as string) || "NRZ-L";
  const codes = ["NRZ-L", "Bi-Phase", "RZ-AMI", "NRZ-M"];
  const labels = ["00 NRZ-L", "01 Bi-Φ", "10 RZ-AMI", "11 NRZ-M"];
  const sx = block.x + 8;
  const sy = block.y + 75;

  return (
    <g>
      <text x={sx + 50} y={sy - 5} textAnchor="middle" fontSize="6" fill="#444" fontWeight="bold" pointerEvents="none">
        LINE CODE
      </text>
      {codes.map((code, i) => {
        const isActive = lineCode === code;
        const yy = sy + i * 18;
        return (
          <g key={code} onClick={(e) => { e.stopPropagation(); setParam(block.id, "lineCode", code); }} style={{ cursor: "pointer" }}>
            <rect x={sx} y={yy} width={95} height={15} rx={3}
              fill={isActive ? "#2c3e50" : "rgba(0,0,0,0.03)"}
              stroke={isActive ? "#4ecdc4" : "#bbb"}
              strokeWidth={isActive ? 1.5 : 0.5} />
            <text x={sx + 47} y={yy + 11} textAnchor="middle" fontSize="6.5"
              fill={isActive ? "#4ecdc4" : "#666"} fontWeight={isActive ? "bold" : "normal"}
              fontFamily="JetBrains Mono, monospace" pointerEvents="none">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </g>
  );
}
