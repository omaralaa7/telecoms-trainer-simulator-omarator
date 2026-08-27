import { useCallback, useRef, useState } from "react";

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** If true, maps value logarithmically (good for frequency knobs) */
  logarithmic?: boolean;
  onChange: (value: number) => void;
  /** Knob center position relative to block */
  cx: number;
  cy: number;
  size?: number;
  color?: string;
}

/**
 * Knob — Rotary control rendered in SVG.
 * Drag vertically to rotate; scroll-wheel to fine-tune.
 * Shows a live numeric readout on hover.
 */
export default function Knob({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  logarithmic = false,
  onChange,
  cx,
  cy,
  size = 20,
  color = "#4ecdc4",
}: KnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const dragStartY = useRef(0);
  const dragStartVal = useRef(0);

  // Map value to angle (0° = 7 o'clock, 270° = 5 o'clock)
  const normalize = (v: number) => {
    if (logarithmic) {
      return (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min));
    }
    return (v - min) / (max - min);
  };

  const denormalize = (n: number) => {
    const clamped = Math.max(0, Math.min(1, n));
    if (logarithmic) {
      return Math.exp(Math.log(min) + clamped * (Math.log(max) - Math.log(min)));
    }
    return min + clamped * (max - min);
  };

  const normalized = normalize(value);
  const angle = -135 + normalized * 270; // -135° to +135°

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartVal.current = normalized;

      const handleMouseMove = (ev: MouseEvent) => {
        const deltaY = dragStartY.current - ev.clientY;
        const sensitivity = 0.005;
        const newNorm = dragStartVal.current + deltaY * sensitivity;
        let newVal = denormalize(newNorm);
        // Snap to step
        newVal = Math.round(newVal / step) * step;
        newVal = Math.max(min, Math.min(max, newVal));
        onChange(newVal);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [normalized, min, max, step, onChange]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.stopPropagation();
      const dir = e.deltaY < 0 ? 1 : -1;
      let newVal = value + dir * step;
      newVal = Math.max(min, Math.min(max, newVal));
      onChange(newVal);
    },
    [value, min, max, step, onChange]
  );

  // Format display value
  const displayVal = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);

  return (
    <g
      className="knob"
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onMouseEnter={() => setShowValue(true)}
      onMouseLeave={() => setShowValue(false)}
      style={{ cursor: "grab" }}
    >
      {/* Knob background track */}
      <circle
        cx={cx}
        cy={cy}
        r={size}
        fill="#1a1a2e"
        stroke="#333"
        strokeWidth={1.5}
      />

      {/* Value arc */}
      <circle
        cx={cx}
        cy={cy}
        r={size - 3}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={`${normalized * (Math.PI * (size - 3) * 1.5)} ${Math.PI * (size - 3) * 2}`}
        strokeLinecap="round"
        transform={`rotate(-135, ${cx}, ${cy})`}
        opacity={0.4}
      />

      {/* Knob cap */}
      <circle
        cx={cx}
        cy={cy}
        r={size - 5}
        fill={`radial-gradient(circle, #2d2d44, #1a1a2e)`}
        stroke="#555"
        strokeWidth={0.5}
      />
      {/* Gradient simulation for the cap */}
      <circle cx={cx} cy={cy} r={size - 5} fill="#222238" />
      <circle cx={cx} cy={cy} r={size - 7} fill="#2a2a40" />

      {/* Pointer line */}
      <line
        x1={cx}
        y1={cy}
        x2={cx + Math.cos((angle - 90) * Math.PI / 180) * (size - 7)}
        y2={cy + Math.sin((angle - 90) * Math.PI / 180) * (size - 7)}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2} fill={color} />

      {/* Label below knob */}
      <text
        x={cx}
        y={cy + size + 12}
        textAnchor="middle"
        fontSize="7"
        fill="#999"
        className="knob-label"
      >
        {label}
      </text>

      {/* Value readout on hover */}
      {(showValue || isDragging) && (
        <g>
          <rect
            x={cx - 22}
            y={cy - size - 18}
            width={44}
            height={16}
            rx={4}
            fill="rgba(0,0,0,0.85)"
            stroke={color}
            strokeWidth={0.5}
          />
          <text
            x={cx}
            y={cy - size - 7}
            textAnchor="middle"
            fontSize="8"
            fill={color}
            fontFamily="'JetBrains Mono', monospace"
          >
            {displayVal}{unit}
          </text>
        </g>
      )}
    </g>
  );
}
