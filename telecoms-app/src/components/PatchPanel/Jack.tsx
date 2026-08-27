import { useState } from "react";
import type { Port } from "../../types";
import { usePatchStore } from "../../store/patchStore";

interface JackProps {
  port: Port;
  blockX: number;
  blockY: number;
}

/**
 * Jack — A single port on a block faceplate.
 * Square = digital, Circle = analog.
 * Click once to start wiring, click another jack to complete.
 */
export default function Jack({ port, blockX, blockY }: JackProps) {
  const startWire = usePatchStore((s) => s.startWire);
  const wiringFrom = usePatchStore((s) => s.wiringFrom);
  const [hovered, setHovered] = useState(false);

  const absX = blockX + port.relX;
  const absY = blockY + port.relY;
  const jackSize = 7;
  const hitSize = 14; // larger invisible hit area

  const isActive = wiringFrom === port.id;
  const isWiring = wiringFrom !== null;
  const isTarget = isWiring && !isActive;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startWire(port.id);
  };

  // Colors
  let fill = "#1a1a2e";
  let stroke = port.type === "digital" ? "#bbb" : "#bbb";
  let strokeWidth = 1.5;

  if (isActive) {
    fill = "#ff6b6b";
    stroke = "#ff6b6b";
    strokeWidth = 2.5;
  } else if (hovered || isTarget) {
    fill = port.direction === "out" ? "#2ecc71" : "#3498db";
    stroke = fill;
    strokeWidth = 2;
  }

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer" }}
    >
      {/* Invisible larger hit area for easier clicking */}
      <rect
        x={absX - hitSize / 2}
        y={absY - hitSize / 2}
        width={hitSize}
        height={hitSize}
        fill="transparent"
        stroke="none"
        onClick={handleClick}
        style={{ cursor: "pointer" }}
      />

      {/* Visual jack shape */}
      {port.type === "digital" ? (
        <rect
          x={absX - jackSize / 2}
          y={absY - jackSize / 2}
          width={jackSize}
          height={jackSize}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          rx={1}
          pointerEvents="none"
        />
      ) : (
        <circle
          cx={absX}
          cy={absY}
          r={jackSize / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          pointerEvents="none"
        />
      )}

      {/* Glow ring when active or hovered */}
      {(isActive || (hovered && isTarget)) && (
        <circle
          cx={absX}
          cy={absY}
          r={jackSize / 2 + 4}
          fill="none"
          stroke={isActive ? "#ff6b6b" : "#4ecdc4"}
          strokeWidth={1.5}
          opacity={0.6}
          pointerEvents="none"
        >
          <animate attributeName="r" values={`${jackSize/2+3};${jackSize/2+6};${jackSize/2+3}`} dur="1s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Port label */}
      <text
        x={absX}
        y={absY + jackSize / 2 + 9}
        textAnchor="middle"
        fontSize="5.5"
        fill="#555"
        fontFamily="Inter, sans-serif"
        fontWeight="500"
        pointerEvents="none"
      >
        {port.label.split("\n").map((line, i) => (
          <tspan key={i} x={absX} dy={i === 0 ? 0 : 7}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}
