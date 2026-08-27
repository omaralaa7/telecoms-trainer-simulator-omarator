import { useState, useCallback, useRef } from "react";
import { usePatchStore, WIRE_COLORS } from "../../store/patchStore";
import BoardRenderer from "./BoardRenderer";
import WireOverlay from "./WireOverlay";

const BOARD_WIDTH = 1080;
const BOARD_HEIGHT = 680;

export default function PatchPanel() {
  const selectedWireColor = usePatchStore((s) => s.selectedWireColor);
  const setSelectedWireColor = usePatchStore((s) => s.setSelectedWireColor);
  const wiringFrom = usePatchStore((s) => s.wiringFrom);
  const cancelWire = usePatchStore((s) => s.cancelWire);
  const svgRef = useRef<SVGSVGElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) * (BOARD_WIDTH / rect.width),
      y: (e.clientY - rect.top) * (BOARD_HEIGHT / rect.height),
    });
  }, []);

  const handleBoardClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    if (wiringFrom && (target.classList.contains("board-bg") || target.tagName === "svg")) {
      cancelWire();
    }
  }, [wiringFrom, cancelWire]);

  return (
    <div className="patch-panel-container">
      {/* Wire Color Picker */}
      <div className="wire-color-picker">
        <span className="wire-color-label">PATCH CORD:</span>
        {WIRE_COLORS.map((color) => (
          <button
            key={color}
            className={`wire-color-btn ${selectedWireColor === color ? "active" : ""}`}
            style={{ backgroundColor: color }}
            onClick={() => setSelectedWireColor(color)}
          />
        ))}
        {wiringFrom && (
          <span className="wiring-hint">
            ● Click a destination port — or click empty board to cancel
          </span>
        )}
      </div>

      {/* SVG Board */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
        className="patch-panel-svg"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onClick={handleBoardClick}
      >
        {/* Board background */}
        <rect className="board-bg" x={0} y={0} width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="#e8e0d0" rx={4} />
        <defs>
          <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.3" fill="rgba(0,0,0,0.03)" />
          </pattern>
        </defs>
        <rect x={0} y={0} width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#dots)" rx={4} pointerEvents="none" />

        {/* Full board layout */}
        <BoardRenderer />

        {/* Wires on top */}
        <WireOverlay mousePos={mousePos} />
      </svg>
    </div>
  );
}
