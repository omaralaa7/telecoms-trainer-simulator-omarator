import { usePatchStore } from "../../store/patchStore";

interface WireOverlayProps {
  mousePos: { x: number; y: number } | null;
}

export default function WireOverlay({ mousePos }: WireOverlayProps) {
  const wires = usePatchStore((s) => s.wires);
  const wiringFrom = usePatchStore((s) => s.wiringFrom);
  const getPortPos = usePatchStore((s) => s.getPortPos);
  const removeWire = usePatchStore((s) => s.removeWire);

  return (
    <g className="wire-overlay">
      {/* Existing wires */}
      {wires.map((wire) => {
        const from = getPortPos(wire.fromPortId);
        const to = getPortPos(wire.toPortId);
        if (!from || !to) return null;

        const dx = Math.abs(from.x - to.x);
        const dy = Math.abs(from.y - to.y);
        const droop = Math.max(20, dx * 0.15 + dy * 0.08);
        const midX = (from.x + to.x) / 2;
        const midY = Math.max(from.y, to.y) + droop;
        const d = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

        return (
          <g key={wire.id}>
            <path d={d} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={4} strokeLinecap="round" />
            <path d={d} fill="none" stroke={wire.color} strokeWidth={2.5} strokeLinecap="round" />
            <path d={d} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeLinecap="round" />
            <path d={d} fill="none" stroke="transparent" strokeWidth={12} strokeLinecap="round"
              style={{ cursor: "pointer" }}
              onDoubleClick={(e) => { e.stopPropagation(); removeWire(wire.id); }}>
              <title>Double-click to remove</title>
            </path>
            <circle cx={from.x} cy={from.y} r={3} fill={wire.color} stroke="#111" strokeWidth={0.5} pointerEvents="none" />
            <circle cx={to.x} cy={to.y} r={3} fill={wire.color} stroke="#111" strokeWidth={0.5} pointerEvents="none" />
          </g>
        );
      })}

      {/* Preview wire while wiring */}
      {wiringFrom && mousePos && (() => {
        const from = getPortPos(wiringFrom);
        if (!from) return null;
        const midX = (from.x + mousePos.x) / 2;
        const midY = Math.max(from.y, mousePos.y) + 25;
        const d = `M ${from.x} ${from.y} Q ${midX} ${midY} ${mousePos.x} ${mousePos.y}`;
        return (
          <g>
            <path d={d} fill="none" stroke="rgba(255,68,68,0.5)" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="6 4">
              <animate attributeName="stroke-dashoffset" values="0;-10" dur="0.4s" repeatCount="indefinite" />
            </path>
            <circle cx={from.x} cy={from.y} r={5} fill="#ff4444" pointerEvents="none">
              <animate attributeName="r" values="4;6;4" dur="0.8s" repeatCount="indefinite" />
            </circle>
          </g>
        );
      })()}
    </g>
  );
}
