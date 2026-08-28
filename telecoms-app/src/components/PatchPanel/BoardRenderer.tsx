import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePatchStore } from "../../store/patchStore";

/**
 * PortJack — renders an authentic EMONA port jack
 * (solid black circle for analog, square for digital)
 * and registers its absolute position in the store for wiring.
 */
function PortJack({
  id,
  x,
  y,
  type,
  direction,
  label,
  labelPos = "below",
}: {
  id: string;
  x: number;
  y: number;
  type: "digital" | "analog";
  direction: "in" | "out";
  label: string;
  labelPos?: "below" | "left" | "right" | "above" | "none";
}) {
  const registerPort = usePatchStore((s) => s.registerPort);
  const startWire = usePatchStore((s) => s.startWire);
  const wiringFrom = usePatchStore((s) => s.wiringFrom);

  useEffect(() => {
    registerPort(id, x, y, type, direction);
  }, [id, x, y, type, direction, registerPort]);

  const isActive = wiringFrom === id;
  const isTarget = wiringFrom !== null && wiringFrom !== id;

  const sz = 16;
  const r = sz / 2;
  const hitSz = 28;
  const fill = isActive ? "#ff4444" : isTarget ? "#4ecdc4" : "#111";
  const stroke = isActive ? "#ff4444" : isTarget ? "#4ecdc4" : "#333";
  const sw = isActive ? 2.5 : isTarget ? 2 : 1.8;

  let lx = x;
  let ly = y;
  let anchor: "middle" | "end" | "start" = "middle";
  if (labelPos === "below") {
    ly = y + r + 10;
  } else if (labelPos === "above") {
    ly = y - r - 4;
  } else if (labelPos === "left") {
    lx = x - r - 4;
    ly = y + 3;
    anchor = "end";
  } else if (labelPos === "right") {
    lx = x + r + 4;
    ly = y + 3;
    anchor = "start";
  }

  return (
    <g style={{ cursor: "pointer" }}>
      <rect
        x={x - hitSz / 2}
        y={y - hitSz / 2}
        width={hitSz}
        height={hitSz}
        fill="transparent"
        onClick={(e) => {
          e.stopPropagation();
          startWire(id);
        }}
      />

      {type === "digital" ? (
        <rect
          x={x - r}
          y={y - r}
          width={sz}
          height={sz}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          rx={1}
          pointerEvents="none"
        />
      ) : (
        <circle
          cx={x}
          cy={y}
          r={r}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          pointerEvents="none"
        />
      )}

      {isActive && (
        <circle
          cx={x}
          cy={y}
          r={r + 6}
          fill="none"
          stroke="#ff4444"
          strokeWidth={2}
          opacity={0.8}
          pointerEvents="none"
        >
          <animate
            attributeName="r"
            values={`${r + 4};${r + 8};${r + 4}`}
            dur="0.8s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      {isTarget && (
        <circle
          cx={x}
          cy={y}
          r={r + 4}
          fill="none"
          stroke="#4ecdc4"
          strokeWidth={1}
          opacity={0.4}
          pointerEvents="none"
        />
      )}

      {labelPos !== "none" && label && (
        <text
          x={lx}
          y={ly}
          textAnchor={anchor}
          fontSize="6.5"
          fill="#111"
          fontFamily="'Inter', sans-serif"
          fontWeight="600"
          pointerEvents="none"
        >
          {label}
        </text>
      )}
    </g>
  );
}

/**
 * BoardKnob — Ultra-smooth interactive rotary knob.
 * Supports both radial angular rotation around dial, fluid vertical drag,
 * direct clicking anywhere on dial, and mouse wheel tuning without catching.
 */
function BoardKnob({
  blockId,
  paramKey,
  label,
  cx,
  cy,
  min = 0,
  max = 100,
  step = 1,
  defaultValue = 50,
  unit = "",
  logarithmic = false,
  r = 13,
}: {
  blockId: string;
  paramKey: string;
  label: string;
  cx: number;
  cy: number;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  logarithmic?: boolean;
  r?: number;
}) {
  const setParam = usePatchStore((s) => s.setParam);
  const rawVal = usePatchStore((s) => s.getParam(blockId, paramKey, defaultValue));
  const val = typeof rawVal === "number" ? rawVal : defaultValue;

  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const knobRef = useRef<SVGGElement>(null);

  const normalize = (v: number) => {
    if (logarithmic) {
      return (Math.log(Math.max(v, min)) - Math.log(min)) / (Math.log(max) - Math.log(min));
    }
    return (v - min) / (max - min);
  };

  const denormalize = (norm: number) => {
    const clamped = Math.max(0, Math.min(1, norm));
    if (logarithmic) {
      return Math.exp(Math.log(min) + clamped * (Math.log(max) - Math.log(min)));
    }
    return min + clamped * (max - min);
  };

  const norm = normalize(val);
  const angleDeg = -135 + norm * 270;
  const angleRad = (angleDeg * Math.PI) / 180;

  const ptrLength = r - 4;
  const ptrX = cx + Math.sin(angleRad) * ptrLength;
  const ptrY = cy - Math.cos(angleRad) * ptrLength;

  const updateFromPosition = useCallback(
    (clientX: number, clientY: number, startY: number, startNorm: number) => {
      if (knobRef.current) {
        const rect = knobRef.current.getBoundingClientRect();
        const kCenterX = rect.left + rect.width / 2;
        const kCenterY = rect.top + rect.height / 2;
        const dx = clientX - kCenterX;
        const dy = clientY - kCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 6) {
          let deg = Math.atan2(dx, -dy) * (180 / Math.PI);
          if (deg < -135) deg = -135;
          if (deg > 135) deg = 135;
          const newNorm = (deg + 135) / 270;
          let newVal = denormalize(newNorm);
          if (step >= 1) {
            newVal = Math.round(newVal / step) * step;
          } else {
            newVal = Math.round(newVal / step) * step;
            newVal = parseFloat(newVal.toFixed(2));
          }
          newVal = Math.max(min, Math.min(max, newVal));
          setParam(blockId, paramKey, newVal);
          return;
        }
      }

      const deltaY = startY - clientY;
      const sensitivity = 0.009;
      const newNorm = Math.max(0, Math.min(1, startNorm + deltaY * sensitivity));
      let newVal = denormalize(newNorm);
      if (step >= 1) {
        newVal = Math.round(newVal / step) * step;
      } else {
        newVal = Math.round(newVal / step) * step;
        newVal = parseFloat(newVal.toFixed(2));
      }
      newVal = Math.max(min, Math.min(max, newVal));
      setParam(blockId, paramKey, newVal);
    },
    [min, max, step, logarithmic, blockId, paramKey, setParam]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      const startY = e.clientY;
      const startNorm = norm;

      updateFromPosition(e.clientX, e.clientY, startY, startNorm);

      const handleMouseMove = (ev: MouseEvent) => {
        ev.preventDefault();
        updateFromPosition(ev.clientX, ev.clientY, startY, startNorm);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [norm, updateFromPosition]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.stopPropagation();
      setIsDragging(true);
      const touch = e.touches[0];
      const startY = touch.clientY;
      const startNorm = norm;

      updateFromPosition(touch.clientX, touch.clientY, startY, startNorm);

      const handleTouchMove = (ev: TouchEvent) => {
        if (ev.touches.length !== 1) return;
        ev.preventDefault();
        const t = ev.touches[0];
        updateFromPosition(t.clientX, t.clientY, startY, startNorm);
      };

      const handleTouchEnd = () => {
        setIsDragging(false);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };

      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
    },
    [norm, updateFromPosition]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const dir = e.deltaY < 0 ? 1 : -1;
      let newVal = val + dir * (step * (e.shiftKey ? 5 : 1));
      newVal = Math.max(min, Math.min(max, newVal));
      if (step < 1) newVal = parseFloat(newVal.toFixed(2));
      setParam(blockId, paramKey, newVal);
    },
    [val, min, max, step, blockId, paramKey, setParam]
  );

  let displayStr = `${val}${unit ? unit : ""}`;
  if (val >= 1000 && unit === "Hz") {
    displayStr = `${(val / 1000).toFixed(1)} kHz`;
  }

  return (
    <g
      ref={knobRef}
      style={{ cursor: isDragging ? "grabbing" : "grab", userSelect: "none", touchAction: "none" }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onWheel={handleWheel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <circle cx={cx} cy={cy} r={r + 3} fill="#e2ded4" stroke="#a0988a" strokeWidth={1} />

      {[-135, -90, -45, 0, 45, 90, 135].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = cx + Math.sin(rad) * (r + 1.5);
        const y1 = cy - Math.cos(rad) * (r + 1.5);
        const x2 = cx + Math.sin(rad) * (r + 3);
        const y2 = cy - Math.cos(rad) * (r + 3);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#666" strokeWidth={0.8} />;
      })}

      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={isDragging ? "#1e2b37" : isHovered ? "#2d3e50" : "#243342"}
        stroke="#111"
        strokeWidth={1.2}
      />
      <circle cx={cx} cy={cy} r={r - 3} fill="#35495e" stroke="#1a2530" strokeWidth={0.8} />

      <line
        x1={cx}
        y1={cy}
        x2={ptrX}
        y2={ptrY}
        stroke="#ffffff"
        strokeWidth={2.2}
        strokeLinecap="round"
        pointerEvents="none"
      />
      <circle cx={cx} cy={cy} r={2} fill="#ffffff" pointerEvents="none" />

      {label && (
        <text
          x={cx}
          y={cy + r + 10}
          textAnchor="middle"
          fontSize="6.5"
          fill="#111"
          fontWeight="bold"
          fontFamily="'Inter', sans-serif"
          pointerEvents="none"
        >
          {label}
        </text>
      )}

      {(isHovered || isDragging) && (
        <g pointerEvents="none">
          <rect
            x={cx - 24}
            y={cy - r - 15}
            width={48}
            height={13}
            fill="#111"
            rx={3}
            opacity={0.9}
          />
          <text
            x={cx}
            y={cy - r - 6}
            textAnchor="middle"
            fontSize="7"
            fill="#4ecdc4"
            fontWeight="bold"
            fontFamily="'Inter', sans-serif"
          >
            {displayStr}
          </text>
        </g>
      )}
    </g>
  );
}

/**
 * BoardSlideSwitch — Interactive tactile slide switch.
 */
function BoardSlideSwitch({
  blockId,
  paramKey,
  cx,
  cy,
  opt1 = "0°",
  opt2 = "180°",
  def = "0°",
}: {
  blockId: string;
  paramKey: string;
  cx: number;
  cy: number;
  opt1?: string;
  opt2?: string;
  def?: string;
}) {
  const setParam = usePatchStore((s) => s.setParam);
  const current = usePatchStore((s) => s.getParam(blockId, paramKey, def)) as string;
  const isTop = current === opt1;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setParam(blockId, paramKey, isTop ? opt2 : opt1);
  };

  const w = 12;
  const h = 24;
  const sliderH = 10;
  const sliderY = isTop ? cy - h / 2 + 2 : cy + h / 2 - sliderH - 2;

  return (
    <g style={{ cursor: "pointer" }} onClick={toggle}>
      <rect
        x={cx - w / 2}
        y={cy - h / 2}
        width={w}
        height={h}
        fill="#1a1a1a"
        stroke="#444"
        strokeWidth={1}
        rx={2}
      />
      <rect
        x={cx - 2}
        y={cy - h / 2 + 3}
        width={4}
        height={h - 6}
        fill="#000"
        rx={1}
      />
      <rect
        x={cx - w / 2 + 1.5}
        y={sliderY}
        width={w - 3}
        height={sliderH}
        fill="#e0e0e0"
        stroke="#888"
        strokeWidth={0.8}
        rx={1.5}
      />
      <line x1={cx - 3} y1={sliderY + 3} x2={cx + 3} y2={sliderY + 3} stroke="#999" strokeWidth={0.8} />
      <line x1={cx - 3} y1={sliderY + 5} x2={cx + 3} y2={sliderY + 5} stroke="#999" strokeWidth={0.8} />
      <line x1={cx - 3} y1={sliderY + 7} x2={cx + 3} y2={sliderY + 7} stroke="#999" strokeWidth={0.8} />

      <text
        x={cx + w / 2 + 5}
        y={cy - h / 2 + 7}
        fontSize="6"
        fill={isTop ? "#000" : "#777"}
        fontWeight={isTop ? "bold" : "normal"}
        fontFamily="'Inter', sans-serif"
        pointerEvents="none"
      >
        {opt1}
      </text>
      <text
        x={cx + w / 2 + 5}
        y={cy + h / 2 - 3}
        fontSize="6"
        fill={!isTop ? "#000" : "#777"}
        fontWeight={!isTop ? "bold" : "normal"}
        fontFamily="'Inter', sans-serif"
        pointerEvents="none"
      >
        {opt2}
      </text>
    </g>
  );
}

/**
 * Symbol Box Helper — draws standard module symbol block like `=[ + ]=`
 */
function moduleSymbolBox(cx: number, cy: number, w: number, h: number, children: React.ReactNode) {
  return (
    <g pointerEvents="none">
      <line x1={cx - w / 2 - 5} y1={cy} x2={cx - w / 2} y2={cy} stroke="#333" strokeWidth={1.4} />
      <line x1={cx + w / 2} y1={cy} x2={cx + w / 2 + 5} y2={cy} stroke="#333" strokeWidth={1.4} />
      <rect
        x={cx - w / 2}
        y={cy - h / 2}
        width={w}
        height={h}
        fill="#ffffff"
        stroke="#333"
        strokeWidth={1.4}
        rx={1}
      />
      {children}
    </g>
  );
}

/** Helper: draws a block outline with clean navy header */
function blockBox(x: number, y: number, w: number, h: number, title: string) {
  const lines = title.split("\n");
  const headerH = lines.length > 1 ? 24 : 18;
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} fill="#f6f3eb" stroke="#9e9382" strokeWidth={1.2} rx={2} />
      <rect x={x} y={y} width={w} height={headerH} fill="#243342" rx={2} />
      <rect x={x} y={y + headerH - 4} width={w} height={4} fill="#243342" />
      {lines.map((line, i) => (
        <text
          key={i}
          x={x + w / 2}
          y={y + (lines.length > 1 ? 10 + i * 9.5 : 12.5)}
          textAnchor="middle"
          fontSize="6.8"
          fontWeight="bold"
          fill="#ecf0f1"
          fontFamily="'Inter', sans-serif"
          letterSpacing="0.4"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

/**
 * BoardRenderer — EMONA Telecoms-Trainer 101 Virtual Board
 */
export default function BoardRenderer() {
  const W = 1080;
  const H = 680;
  const ROW1_Y = 45;
  const ROW1_H = 280;
  const DIV_Y = ROW1_Y + ROW1_H + 8;
  const ROW2_Y = DIV_Y + 14;
  const ROW2_H = 290;

  // Column widths for top row (9 blocks)
  const colW = [105, 120, 105, 115, 95, 115, 90, 120, 105];
  const topX: number[] = [];
  let cx = 8;
  for (const w of colW) {
    topX.push(cx);
    cx += w + 2;
  }

  // Column widths for bottom row (8 blocks)
  const bColW = [105, 105, 125, 105, 120, 120, 110, 170];
  const botX: number[] = [];
  cx = 8;
  for (const w of bColW) {
    botX.push(cx);
    cx += w + 2;
  }

  const setParam = usePatchStore((s) => s.setParam);
  const getParam = usePatchStore((s) => s.getParam);
  const seqSw0 = getParam("sequence_generator", "sw0", 0);
  const divSw0 = getParam("divider", "sw0", 0);

  return (
    <g>
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* BOARD TITLE & HEADER                                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <text x={15} y={26} fontSize="17" fontWeight="900" fill="#111" fontFamily="'Inter', sans-serif" letterSpacing="1.5">
        EMONA
      </text>
      <text x={95} y={26} fontSize="14" fill="#222" fontFamily="'Inter', sans-serif" fontWeight="500">
        Telecoms-Trainer 101
      </text>

      {/* Legend */}
      <rect x={600} y={15} width={10} height={10} fill="#111" rx={1} />
      <text x={615} y={23.5} fontSize="8" fill="#222" fontWeight="bold" fontFamily="'Inter', sans-serif">
        DIGITAL
      </text>
      <circle cx={685} cy={20} r={5} fill="#111" />
      <text x={695} y={23.5} fontSize="8" fill="#222" fontWeight="bold" fontFamily="'Inter', sans-serif">
        ANALOG
      </text>

      {/* DC IN Socket */}
      <text x={W - 120} y={19} fontSize="7.5" fill="#222" fontWeight="bold" fontFamily="'Inter', sans-serif">
        DC IN
      </text>
      <text x={W - 120} y={28} fontSize="6.5" fill="#555" fontFamily="'Inter', sans-serif">
        9-15V 1A
      </text>
      <circle cx={W - 55} cy={23} r={6} fill="#222" stroke="#666" strokeWidth={1.5} />
      <circle cx={W - 55} cy={23} r={2.5} fill="#eee" />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TOP ROW                                                       */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {/* ═══ 1. ADDER ═══ */}
      {blockBox(topX[0], ROW1_Y, colW[0], ROW1_H, "ADDER")}
      {moduleSymbolBox(topX[0] + colW[0] / 2, ROW1_Y + 45, 22, 14, (
        <text x={topX[0] + colW[0] / 2} y={ROW1_Y + 49} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#222">+</text>
      ))}

      {/* Upper Amplifier & Knob G (Shifted left to cx = topX[0] + 45 to clear the vertical wire) */}
      <BoardKnob blockId="adder" paramKey="g_gain" label="G" cx={topX[0] + 45} cy={ROW1_Y + 95} min={0} max={2} step={0.05} defaultValue={1.0} />
      <path d={`M ${topX[0] + 35} ${ROW1_Y + 120} L ${topX[0] + 55} ${ROW1_Y + 130} L ${topX[0] + 35} ${ROW1_Y + 140} Z`} fill="#fff" stroke="#333" strokeWidth={1.2} />
      <line x1={topX[0] + 20} y1={ROW1_Y + 130} x2={topX[0] + 35} y2={ROW1_Y + 130} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[0] + 55} y1={ROW1_Y + 130} x2={topX[0] + 75} y2={ROW1_Y + 130} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[0] + 75} y1={ROW1_Y + 130} x2={topX[0] + 75} y2={ROW1_Y + 230} stroke="#333" strokeWidth={1.2} />
      <PortJack id="adder1.a" x={topX[0] + 20} y={ROW1_Y + 130} type="analog" direction="in" label="A" labelPos="left" />

      {/* Lower Amplifier & Knob g (Shifted left to cx = topX[0] + 45 to clear the vertical wire) */}
      <BoardKnob blockId="adder" paramKey="g_small_gain" label="g" cx={topX[0] + 45} cy={ROW1_Y + 180} min={0} max={2} step={0.05} defaultValue={1.0} />
      <path d={`M ${topX[0] + 35} ${ROW1_Y + 205} L ${topX[0] + 55} ${ROW1_Y + 215} L ${topX[0] + 35} ${ROW1_Y + 225} Z`} fill="#fff" stroke="#333" strokeWidth={1.2} />
      <line x1={topX[0] + 20} y1={ROW1_Y + 215} x2={topX[0] + 35} y2={ROW1_Y + 215} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[0] + 55} y1={ROW1_Y + 215} x2={topX[0] + 75} y2={ROW1_Y + 215} stroke="#333" strokeWidth={1.2} />
      <PortJack id="adder1.b" x={topX[0] + 20} y={ROW1_Y + 215} type="analog" direction="in" label="B" labelPos="left" />

      {/* Summing Box [+] at bottom right */}
      <rect x={topX[0] + 68} y={ROW1_Y + 230} width={14} height={14} fill="#fff" stroke="#333" strokeWidth={1.2} rx={1} />
      <text x={topX[0] + 75} y={ROW1_Y + 240.5} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#222">+</text>
      <line x1={topX[0] + 75} y1={ROW1_Y + 244} x2={topX[0] + 75} y2={ROW1_Y + 258} stroke="#333" strokeWidth={1.2} />
      <PortJack id="adder1.ga_gb" x={topX[0] + 75} y={ROW1_Y + 258} type="analog" direction="out" label="GA+gB" labelPos="below" />

      {/* ═══ 2. MULTIPLIER (Top) ═══ */}
      {blockBox(topX[1], ROW1_Y, colW[1], ROW1_H, "MULTIPLIER")}
      {moduleSymbolBox(topX[1] + colW[1] / 2, ROW1_Y + 45, 22, 14, (
        <text x={topX[1] + colW[1] / 2} y={ROW1_Y + 49} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#222">×</text>
      ))}
      {/* X Inputs (DC / AC) */}
      <PortJack id="mult1.dc_x" x={topX[1] + 22} y={ROW1_Y + 75} type="analog" direction="in" label="DC" labelPos="right" />
      <PortJack id="mult1.ac_x" x={topX[1] + 22} y={ROW1_Y + 105} type="analog" direction="in" label="AC" labelPos="right" />
      <line x1={topX[1] + 45} y1={ROW1_Y + 75} x2={topX[1] + 55} y2={ROW1_Y + 75} stroke="#333" strokeWidth={1} />
      <line x1={topX[1] + 45} y1={ROW1_Y + 105} x2={topX[1] + 55} y2={ROW1_Y + 105} stroke="#333" strokeWidth={1} />
      <line x1={topX[1] + 55} y1={ROW1_Y + 75} x2={topX[1] + 55} y2={ROW1_Y + 105} stroke="#333" strokeWidth={1} />
      <line x1={topX[1] + 55} y1={ROW1_Y + 90} x2={topX[1] + 65} y2={ROW1_Y + 90} stroke="#333" strokeWidth={1} />
      <text x={topX[1] + 60} y={ROW1_Y + 86} textAnchor="middle" fontSize="7" fontWeight="bold" fill="#222">X</text>

      {/* Y Inputs (DC / AC) */}
      <PortJack id="mult1.dc_y" x={topX[1] + 22} y={ROW1_Y + 135} type="analog" direction="in" label="DC" labelPos="right" />
      <PortJack id="mult1.ac_y" x={topX[1] + 22} y={ROW1_Y + 165} type="analog" direction="in" label="AC" labelPos="right" />
      <line x1={topX[1] + 45} y1={ROW1_Y + 135} x2={topX[1] + 55} y2={ROW1_Y + 135} stroke="#333" strokeWidth={1} />
      <line x1={topX[1] + 45} y1={ROW1_Y + 165} x2={topX[1] + 55} y2={ROW1_Y + 165} stroke="#333" strokeWidth={1} />
      <line x1={topX[1] + 55} y1={ROW1_Y + 135} x2={topX[1] + 55} y2={ROW1_Y + 165} stroke="#333" strokeWidth={1} />
      <line x1={topX[1] + 55} y1={ROW1_Y + 150} x2={topX[1] + 65} y2={ROW1_Y + 150} stroke="#333" strokeWidth={1} />
      <text x={topX[1] + 60} y={ROW1_Y + 146} textAnchor="middle" fontSize="7" fontWeight="bold" fill="#222">Y</text>

      {/* kXY Output */}
      <PortJack id="mult1.kxy" x={topX[1] + 98} y={ROW1_Y + 120} type="analog" direction="out" label="kXY" labelPos="below" />

      {/* Sub-block: MULTIPLIER (Only 3 jacks: X DC, Y DC, kXY) */}
      <line x1={topX[1] + 5} y1={ROW1_Y + 180} x2={topX[1] + colW[1] - 5} y2={ROW1_Y + 180} stroke="#9e9382" strokeWidth={0.8} />
      <text x={topX[1] + colW[1] / 2} y={ROW1_Y + 192} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#222">MULTIPLIER</text>
      {moduleSymbolBox(topX[1] + colW[1] / 2, ROW1_Y + 208, 18, 12, (
        <text x={topX[1] + colW[1] / 2} y={ROW1_Y + 211.5} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#222">×</text>
      ))}
      <PortJack id="mult1.x_dc" x={topX[1] + 20} y={ROW1_Y + 230} type="analog" direction="in" label="X DC" labelPos="below" />
      <PortJack id="mult1.y_dc2" x={topX[1] + 20} y={ROW1_Y + 258} type="analog" direction="in" label="Y DC" labelPos="below" />
      <PortJack id="mult1.kxy2" x={topX[1] + 98} y={ROW1_Y + 258} type="analog" direction="out" label="kXY" labelPos="below" />

      {/* ═══ 3. TWIN PULSE GENERATOR (Exact EMONA Layout) ═══ */}
      {blockBox(topX[2], ROW1_Y, colW[2], ROW1_H, "TWIN PULSE\nGENERATOR")}
      {moduleSymbolBox(topX[2] + colW[2] / 2, ROW1_Y + 45, 22, 14, (
        <path d={`M ${topX[2] + 46} ${ROW1_Y + 49} v-6 h5 v6 h4 v-6 h5 v6`} fill="none" stroke="#222" strokeWidth={1.2} />
      ))}

      {/* Width pulse diagram with horizontal arrow */}
      <g transform={`translate(${topX[2] + 25}, ${ROW1_Y + 64})`}>
        <text x={27} y={6} textAnchor="middle" fontSize="9" fill="#333">⟷</text>
        <path d="M 21 16 v -8 h 12 v 8" fill="none" stroke="#333" strokeWidth={1.2} />
      </g>

      <BoardKnob blockId="twin_pulse" paramKey="width" label="WIDTH" cx={topX[2] + colW[2] / 2} cy={ROW1_Y + 105} min={0.1} max={1.0} step={0.05} defaultValue={0.5} />

      {/* Middle-Right: Q2 Jack with step diagram on left */}
      <g transform={`translate(${topX[2] + 22}, ${ROW1_Y + 145})`}>
        <text x={14} y={6} textAnchor="middle" fontSize="9" fill="#333">⟷</text>
        <path d="M 0 16 h 14 v -8 h 14" fill="none" stroke="#333" strokeWidth={1.2} />
      </g>
      <PortJack id="tpg.q2" x={topX[2] + 78} y={ROW1_Y + 155} type="digital" direction="out" label="Q2" labelPos="below" />

      <BoardKnob blockId="twin_pulse" paramKey="delay" label="DELAY" cx={topX[2] + colW[2] / 2} cy={ROW1_Y + 205} min={0.0} max={1.0} step={0.05} defaultValue={0.5} />

      {/* Bottom Row: CLK (left) and Q1 (right) only */}
      <PortJack id="tpg.clk" x={topX[2] + 25} y={ROW1_Y + 258} type="digital" direction="in" label="CLK" labelPos="below" />
      <PortJack id="tpg.q1" x={topX[2] + 78} y={ROW1_Y + 258} type="digital" direction="out" label="Q1" labelPos="below" />

      {/* ═══ 4. DUAL ANALOG SWITCH (Exact EMONA Schematic) ═══ */}
      {blockBox(topX[3], ROW1_Y, colW[3], ROW1_H, "DUAL ANALOG\nSWITCH")}
      {moduleSymbolBox(topX[3] + colW[3] / 2, ROW1_Y + 45, 24, 14, (
        <text x={topX[3] + colW[3] / 2} y={ROW1_Y + 48.5} textAnchor="middle" fontSize="7" fontWeight="bold" fill="#222">S/H</text>
      ))}

      {/* S/H Control dashed line: comes out from [S/H], goes left, then DOWN, and STOPS AT CONTROL 1 ONLY */}
      <line x1={topX[3] + 45} y1={ROW1_Y + 52} x2={topX[3] + 10} y2={ROW1_Y + 52} stroke="#333" strokeWidth={1.2} strokeDasharray="3 3" />
      <line x1={topX[3] + 10} y1={ROW1_Y + 52} x2={topX[3] + 10} y2={ROW1_Y + 165} stroke="#333" strokeWidth={1.2} strokeDasharray="3 3" />
      <line x1={topX[3] + 10} y1={ROW1_Y + 165} x2={topX[3] + 28} y2={ROW1_Y + 165} stroke="#333" strokeWidth={1.2} strokeDasharray="3 3" />

      {/* S&H Section at top */}
      <line x1={topX[3] + 25} y1={ROW1_Y + 75} x2={topX[3] + 55} y2={ROW1_Y + 68} stroke="#333" strokeWidth={1.4} />
      <circle cx={topX[3] + 56} cy={ROW1_Y + 67} r={2} fill="#fff" stroke="#333" strokeWidth={1.2} />
      <line x1={topX[3] + 59} y1={ROW1_Y + 67} x2={topX[3] + 85} y2={ROW1_Y + 75} stroke="#555" strokeWidth={0.8} strokeDasharray="2 2" />
      <PortJack id="das.sh_in" x={topX[3] + 25} y={ROW1_Y + 75} type="analog" direction="in" label="S&H IN" labelPos="below" />
      <PortJack id="das.sh_out" x={topX[3] + 85} y={ROW1_Y + 75} type="analog" direction="out" label="S&H OUT" labelPos="below" />

      {/* Switch 1 */}
      <line x1={topX[3] + 25} y1={ROW1_Y + 115} x2={topX[3] + 48} y2={ROW1_Y + 115} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[3] + 48} y1={ROW1_Y + 115} x2={topX[3] + 62} y2={ROW1_Y + 106} stroke="#333" strokeWidth={1.4} />
      <circle cx={topX[3] + 64} cy={ROW1_Y + 105} r={2} fill="#fff" stroke="#333" strokeWidth={1.2} />

      {/* Arrow coming UP from CONTROL 1 into Switch 1 */}
      <line x1={topX[3] + 36} y1={ROW1_Y + 165} x2={topX[3] + 55} y2={ROW1_Y + 165} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[3] + 55} y1={ROW1_Y + 165} x2={topX[3] + 55} y2={ROW1_Y + 113} stroke="#333" strokeWidth={1.2} />
      <polygon points={`${topX[3] + 52},${ROW1_Y + 117} ${topX[3] + 55},${ROW1_Y + 110} ${topX[3] + 58},${ROW1_Y + 117}`} fill="#333" />

      {/* Solid line from Switch 1 output down into [+] */}
      <line x1={topX[3] + 66} y1={ROW1_Y + 105} x2={topX[3] + 75} y2={ROW1_Y + 105} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[3] + 75} y1={ROW1_Y + 105} x2={topX[3] + 75} y2={ROW1_Y + 230} stroke="#333" strokeWidth={1.2} />

      <PortJack id="das.in1" x={topX[3] + 25} y={ROW1_Y + 115} type="analog" direction="in" label="IN 1" labelPos="below" />

      {/* CONTROL 1 Jack & Label */}
      <text x={topX[3] + 28} y={ROW1_Y + 154} textAnchor="middle" fontSize="5.8" fontWeight="bold" fill="#222">CONTROL 1</text>
      <PortJack id="das.ctrl1" x={topX[3] + 28} y={ROW1_Y + 165} type="digital" direction="in" label="" labelPos="none" />

      {/* CONTROL 2 Jack & Label */}
      <text x={topX[3] + 28} y={ROW1_Y + 194} textAnchor="middle" fontSize="5.8" fontWeight="bold" fill="#222">CONTROL 2</text>
      <PortJack id="das.ctrl2" x={topX[3] + 28} y={ROW1_Y + 205} type="digital" direction="in" label="" labelPos="none" />

      {/* Arrow coming DOWN from CONTROL 2 into Switch 2 */}
      <line x1={topX[3] + 36} y1={ROW1_Y + 205} x2={topX[3] + 55} y2={ROW1_Y + 205} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[3] + 55} y1={ROW1_Y + 205} x2={topX[3] + 55} y2={ROW1_Y + 234} stroke="#333" strokeWidth={1.2} />
      <polygon points={`${topX[3] + 52},${ROW1_Y + 230} ${topX[3] + 55},${ROW1_Y + 237} ${topX[3] + 58},${ROW1_Y + 230}`} fill="#333" />

      {/* Switch 2 */}
      <line x1={topX[3] + 25} y1={ROW1_Y + 258} x2={topX[3] + 48} y2={ROW1_Y + 242} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[3] + 48} y1={ROW1_Y + 242} x2={topX[3] + 62} y2={ROW1_Y + 233} stroke="#333" strokeWidth={1.4} />
      <circle cx={topX[3] + 64} cy={ROW1_Y + 232} r={2} fill="#fff" stroke="#333" strokeWidth={1.2} />
      <line x1={topX[3] + 66} y1={ROW1_Y + 232} x2={topX[3] + 69} y2={ROW1_Y + 237} stroke="#333" strokeWidth={1.2} />

      {/* Summing Junction [+] */}
      <rect x={topX[3] + 69} y={ROW1_Y + 230} width={12} height={12} fill="#fff" stroke="#333" strokeWidth={1.2} rx={1} />
      <text x={topX[3] + 75} y={ROW1_Y + 239} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#222">+</text>
      <line x1={topX[3] + 75} y1={ROW1_Y + 242} x2={topX[3] + 75} y2={ROW1_Y + 258} stroke="#333" strokeWidth={1.2} />

      <PortJack id="das.in2" x={topX[3] + 25} y={ROW1_Y + 258} type="analog" direction="in" label="IN 2" labelPos="below" />
      <PortJack id="das.out" x={topX[3] + 75} y={ROW1_Y + 258} type="analog" direction="out" label="OUT" labelPos="below" />

      {/* ═══ 5. NOISE GENERATOR / BUFFER ═══ */}
      {blockBox(topX[4], ROW1_Y, colW[4], 140, "NOISE\nGENERATOR")}
      {moduleSymbolBox(topX[4] + colW[4] / 2, ROW1_Y + 45, 22, 14, (
        <path d={`M ${topX[4] + 38} ${ROW1_Y + 45} l2 -3 l3 6 l3 -7 l3 7 l3 -6 l2 3`} fill="none" stroke="#222" strokeWidth={1} />
      ))}
      <PortJack id="ng.0db" x={topX[4] + 70} y={ROW1_Y + 68} type="analog" direction="out" label="0dB" labelPos="left" />
      <PortJack id="ng.m6db" x={topX[4] + 70} y={ROW1_Y + 95} type="analog" direction="out" label="-6dB" labelPos="left" />
      <PortJack id="ng.m20db" x={topX[4] + 70} y={ROW1_Y + 122} type="analog" direction="out" label="-20dB" labelPos="left" />

      {/* Sub-block BUFFER (Exact EMONA Layout) */}
      {blockBox(topX[4], ROW1_Y + 144, colW[4], ROW1_H - 144, "BUFFER")}
      
      {/* Top Module Symbol —▷— (Cleanly inside block box below header) */}
      <g pointerEvents="none">
        <line x1={topX[4] + 30} y1={ROW1_Y + 175} x2={topX[4] + 65} y2={ROW1_Y + 175} stroke="#333" strokeWidth={1.2} />
        <path d={`M ${topX[4] + 42} ${ROW1_Y + 169} L ${topX[4] + 55} ${ROW1_Y + 175} L ${topX[4] + 42} ${ROW1_Y + 181} Z`} fill="#fff" stroke="#333" strokeWidth={1.2} />
      </g>

      <BoardKnob blockId="buffer" paramKey="gain" label="GAIN" cx={topX[4] + colW[4] / 2} cy={ROW1_Y + 204} min={0} max={2} step={0.05} defaultValue={1.0} />
      
      {/* Upper Jack Row: IN -> ▷ -> OUT */}
      <PortJack id="buf.in" x={topX[4] + 22} y={ROW1_Y + 238} type="analog" direction="in" label="IN" labelPos="below" />
      
      <line x1={topX[4] + 30} y1={ROW1_Y + 238} x2={topX[4] + 42} y2={ROW1_Y + 238} stroke="#333" strokeWidth={1.2} />
      <path d={`M ${topX[4] + 42} ${ROW1_Y + 232} L ${topX[4] + 54} ${ROW1_Y + 238} L ${topX[4] + 42} ${ROW1_Y + 244} Z`} fill="#fff" stroke="#333" strokeWidth={1.2} />
      <line x1={topX[4] + 54} y1={ROW1_Y + 238} x2={topX[4] + 68} y2={ROW1_Y + 238} stroke="#333" strokeWidth={1.2} />
      
      <PortJack id="buf.out" x={topX[4] + 76} y={ROW1_Y + 238} type="analog" direction="out" label="OUT" labelPos="below" />
      
      {/* Lower Row: Headphone Icon on left & Socket branching from buffer output on right */}
      <text x={topX[4] + 32} y={ROW1_Y + 273} textAnchor="middle" fontSize="13">🎧</text>
      
      <line x1={topX[4] + 61} y1={ROW1_Y + 238} x2={topX[4] + 61} y2={ROW1_Y + 268} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[4] + 61} y1={ROW1_Y + 268} x2={topX[4] + 76} y2={ROW1_Y + 268} stroke="#333" strokeWidth={1.2} />
      
      <g>
        <circle cx={topX[4] + 76} cy={ROW1_Y + 268} r={5.5} fill="#111" stroke="#666" strokeWidth={1.2} />
        <circle cx={topX[4] + 76} cy={ROW1_Y + 268} r={2.5} fill="#eee" />
        <PortJack id="buf.headphone" x={topX[4] + 76} y={ROW1_Y + 268} type="analog" direction="out" label="" labelPos="none" />
      </g>

      {/* ═══ 6. CHANNEL MODULE / ADDER ═══ */}
      {blockBox(topX[5], ROW1_Y, colW[5], 134, "CHANNEL\nMODULE")}
      {moduleSymbolBox(topX[5] + colW[5] / 2, ROW1_Y + 45, 24, 14, (
        <path d={`M ${topX[5] + 48} ${ROW1_Y + 47} q 4 -5 9 0 q 4 5 9 0`} fill="none" stroke="#222" strokeWidth={1.2} />
      ))}

      {/* CHANNEL BPF — Input jack on left, curve in middle, Output jack on right */}
      <PortJack id="cm.bpf_in" x={topX[5] + 20} y={ROW1_Y + 70} type="analog" direction="in" label="" labelPos="none" />
      <path d={`M ${topX[5] + 35} ${ROW1_Y + 70} q 10 -14 22 0`} fill="none" stroke="#333" strokeWidth={1.2} />
      <text x={topX[5] + 55} y={ROW1_Y + 84} textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#222">CHANNEL BPF</text>
      <PortJack id="cm.ch_bpf" x={topX[5] + 90} y={ROW1_Y + 70} type="analog" direction="out" label="" labelPos="none" />

      {/* BASEBAND LPF — Input jack on left, curve in middle, Output jack on right */}
      <PortJack id="cm.lpf_in" x={topX[5] + 20} y={ROW1_Y + 105} type="analog" direction="in" label="" labelPos="none" />
      <path d={`M ${topX[5] + 35} ${ROW1_Y + 98} h 12 q 4 0 6 7`} fill="none" stroke="#333" strokeWidth={1.2} />
      <text x={topX[5] + 55} y={ROW1_Y + 118} textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#222">BASEBAND LPF</text>
      <PortJack id="cm.bb_lpf" x={topX[5] + 90} y={ROW1_Y + 105} type="analog" direction="out" label="" labelPos="none" />

      {/* Sub-block ADDER */}
      {blockBox(topX[5], ROW1_Y + 138, colW[5], ROW1_H - 138, "ADDER")}

      {/* NOISE Jack at upper-left with label placed BELOW jack */}
      <PortJack id="add2.noise" x={topX[5] + 25} y={ROW1_Y + 170} type="analog" direction="in" label="NOISE" labelPos="below" />

      {/* Summing [+] Box in center */}
      <rect x={topX[5] + 58} y={ROW1_Y + 198} width={14} height={14} fill="#fff" stroke="#333" strokeWidth={1.2} rx={1} />
      <text x={topX[5] + 65} y={ROW1_Y + 208.5} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#222">+</text>

      {/* Wiring from NOISE into [+] top */}
      <line x1={topX[5] + 25} y1={ROW1_Y + 170} x2={topX[5] + 65} y2={ROW1_Y + 170} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[5] + 65} y1={ROW1_Y + 170} x2={topX[5] + 65} y2={ROW1_Y + 198} stroke="#333" strokeWidth={1.2} />

      {/* SIGNAL Jack at bottom-left */}
      <PortJack id="add2.in" x={topX[5] + 25} y={ROW1_Y + 258} type="analog" direction="in" label="SIGNAL" labelPos="below" />

      {/* Wiring from SIGNAL into [+] left */}
      <line x1={topX[5] + 25} y1={ROW1_Y + 258} x2={topX[5] + 25} y2={ROW1_Y + 205} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[5] + 25} y1={ROW1_Y + 205} x2={topX[5] + 58} y2={ROW1_Y + 205} stroke="#333" strokeWidth={1.2} />

      {/* CHANNEL OUT Jack at bottom-right */}
      <PortJack id="add2.out" x={topX[5] + 90} y={ROW1_Y + 258} type="analog" direction="out" label="CHANNEL OUT" labelPos="below" />

      {/* Wiring from [+] right to CHANNEL OUT */}
      <line x1={topX[5] + 72} y1={ROW1_Y + 205} x2={topX[5] + 90} y2={ROW1_Y + 205} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[5] + 90} y1={ROW1_Y + 205} x2={topX[5] + 90} y2={ROW1_Y + 258} stroke="#333" strokeWidth={1.2} />

      {/* ═══ 7. PHASE SHIFTER ═══ */}
      {blockBox(topX[6], ROW1_Y, colW[6], ROW1_H, "PHASE\nSHIFTER")}
      {moduleSymbolBox(topX[6] + colW[6] / 2, ROW1_Y + 45, 22, 14, (
        <text x={topX[6] + colW[6] / 2} y={ROW1_Y + 49} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#222">Ø</text>
      ))}

      {/* LO Status LED Indicator (Concentric circle, NOT a patch jack) */}
      <g pointerEvents="none">
        <circle cx={topX[6] + 70} cy={ROW1_Y + 68} r={4.5} fill="#222" stroke="#555" strokeWidth={1} />
        <circle cx={topX[6] + 70} cy={ROW1_Y + 68} r={2.5} fill="#2ecc71" stroke="#fff" strokeWidth={0.5} />
        <text x={topX[6] + 70} y={ROW1_Y + 80} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#222">LO</text>
      </g>

      <BoardKnob blockId="phase_shifter" paramKey="phase" label="PHASE" cx={topX[6] + colW[6] / 2} cy={ROW1_Y + 120} min={0} max={180} step={1} defaultValue={0} unit="°" />
      <BoardSlideSwitch blockId="phase_shifter" paramKey="inv_switch" cx={topX[6] + 35} cy={ROW1_Y + 185} opt1="0°" opt2="180°" def="0°" />

      <PortJack id="ps.in" x={topX[6] + 20} y={ROW1_Y + 258} type="analog" direction="in" label="IN" labelPos="above" />
      <PortJack id="ps.out" x={topX[6] + 70} y={ROW1_Y + 258} type="analog" direction="out" label="OUT" labelPos="above" />

      {/* ═══ 8. UTILITIES (Exact EMONA Layout) ═══ */}
      {blockBox(topX[7], ROW1_Y, colW[7], ROW1_H, "UTILITIES")}

      {/* Section 1: COMPARATOR */}
      <text x={topX[7] + colW[7] / 2} y={ROW1_Y + 36} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#222">COMPARATOR</text>
      
      {/* REF Jack on top-left */}
      <text x={topX[7] + 25} y={ROW1_Y + 48} textAnchor="middle" fontSize="6" fontWeight="bold" fill="#222">REF</text>
      <PortJack id="util.comp_ref" x={topX[7] + 25} y={ROW1_Y + 60} type="analog" direction="in" label="" labelPos="none" />

      {/* IN Jack on bottom-left */}
      <PortJack id="util.comp_in" x={topX[7] + 25} y={ROW1_Y + 98} type="analog" direction="in" label="IN" labelPos="below" />

      {/* Hysteresis Schmitt Trigger Symbol Box [ ⎍ ] in center */}
      <rect x={topX[7] + 48} y={ROW1_Y + 70} width={20} height={18} fill="#fff" stroke="#333" strokeWidth={1.2} rx={1} />
      {/* Central Horizontal Axis */}
      <line x1={topX[7] + 53} y1={ROW1_Y + 79} x2={topX[7] + 63} y2={ROW1_Y + 79} stroke="#222" strokeWidth={1.2} />
      {/* Hysteresis Step Curve */}
      <path d={`M ${topX[7] + 54} ${ROW1_Y + 83} H ${topX[7] + 58} V ${ROW1_Y + 75} H ${topX[7] + 62}`} fill="none" stroke="#222" strokeWidth={1.2} />

      {/* Wire from REF into top-left of symbol */}
      <line x1={topX[7] + 25} y1={ROW1_Y + 60} x2={topX[7] + 38} y2={ROW1_Y + 60} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[7] + 38} y1={ROW1_Y + 60} x2={topX[7] + 38} y2={ROW1_Y + 75} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[7] + 38} y1={ROW1_Y + 75} x2={topX[7] + 48} y2={ROW1_Y + 75} stroke="#333" strokeWidth={1.2} />

      {/* Wire from IN into bottom-left of symbol */}
      <line x1={topX[7] + 25} y1={ROW1_Y + 98} x2={topX[7] + 38} y2={ROW1_Y + 98} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[7] + 38} y1={ROW1_Y + 98} x2={topX[7] + 38} y2={ROW1_Y + 83} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[7] + 38} y1={ROW1_Y + 83} x2={topX[7] + 48} y2={ROW1_Y + 83} stroke="#333" strokeWidth={1.2} />

      {/* Wire from symbol right into OUT */}
      <line x1={topX[7] + 68} y1={ROW1_Y + 79} x2={topX[7] + 85} y2={ROW1_Y + 79} stroke="#333" strokeWidth={1.2} />
      <line x1={topX[7] + 85} y1={ROW1_Y + 79} x2={topX[7] + 85} y2={ROW1_Y + 98} stroke="#333" strokeWidth={1.2} />

      {/* OUT Digital Jack on bottom-right */}
      <PortJack id="util.comp_out" x={topX[7] + 85} y={ROW1_Y + 98} type="digital" direction="out" label="OUT" labelPos="below" />

      {/* Section 2: RECTIFIER */}
      <line x1={topX[7] + 5} y1={ROW1_Y + 116} x2={topX[7] + colW[7] - 5} y2={ROW1_Y + 116} stroke="#9e9382" strokeWidth={0.6} />
      <text x={topX[7] + colW[7] / 2} y={ROW1_Y + 128} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#222">RECTIFIER</text>
      <PortJack id="util.rect_in" x={topX[7] + 25} y={ROW1_Y + 144} type="analog" direction="in" label="" labelPos="none" />
      <PortJack id="util.rect_out" x={topX[7] + 85} y={ROW1_Y + 144} type="analog" direction="out" label="" labelPos="none" />

      {/* Section 3: DIODE & RC LPF */}
      <line x1={topX[7] + 5} y1={ROW1_Y + 162} x2={topX[7] + colW[7] - 5} y2={ROW1_Y + 162} stroke="#9e9382" strokeWidth={0.6} />
      <text x={topX[7] + colW[7] / 2} y={ROW1_Y + 174} textAnchor="middle" fontSize="6" fontWeight="bold" fill="#222">DIODE & RC LPF</text>
      <PortJack id="util.diode_in" x={topX[7] + 25} y={ROW1_Y + 190} type="analog" direction="in" label="" labelPos="none" />
      <PortJack id="util.diode_out" x={topX[7] + 85} y={ROW1_Y + 190} type="analog" direction="out" label="" labelPos="none" />

      {/* Section 4: RC LPF (Exact EMONA Layout: Title and 2 jacks only, no knob) */}
      <line x1={topX[7] + 5} y1={ROW1_Y + 215} x2={topX[7] + colW[7] - 5} y2={ROW1_Y + 215} stroke="#9e9382" strokeWidth={0.6} />
      <text x={topX[7] + colW[7] / 2} y={ROW1_Y + 232} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#222">RC LPF</text>
      <PortJack id="util.rclpf_in" x={topX[7] + 25} y={ROW1_Y + 254} type="analog" direction="in" label="" labelPos="none" />
      <PortJack id="util.rclpf_out" x={topX[7] + 85} y={ROW1_Y + 254} type="analog" direction="out" label="" labelPos="none" />

      {/* ═══ 9. TUNEABLE LPF ═══ */}
      {blockBox(topX[8], ROW1_Y, colW[8], ROW1_H, "TUNEABLE\nLPF")}
      {moduleSymbolBox(topX[8] + colW[8] / 2, ROW1_Y + 45, 24, 14, (
        <path d={`M ${topX[8] + 43} ${ROW1_Y + 42} h10 q3 0 5 6 q2 4 4 6`} fill="none" stroke="#222" strokeWidth={1.2} />
      ))}
      <text x={topX[8] + colW[8] / 2} y={ROW1_Y + 70} textAnchor="middle" fontSize="6.5" fontStyle="italic" fill="#333">
        fc×100
      </text>
      <PortJack id="tlpf.fc_clk" x={topX[8] + 85} y={ROW1_Y + 70} type="digital" direction="in" label="" labelPos="none" />

      <BoardKnob blockId="tuneable_lpf" paramKey="fc" label="fc" cx={topX[8] + colW[8] / 2} cy={ROW1_Y + 115} min={100} max={10000} step={50} defaultValue={3000} unit="Hz" logarithmic={true} />
      <BoardKnob blockId="tuneable_lpf" paramKey="gain" label="GAIN" cx={topX[8] + colW[8] / 2} cy={ROW1_Y + 195} min={0} max={2} step={0.05} defaultValue={1.0} />

      <PortJack id="tlpf.in" x={topX[8] + 20} y={ROW1_Y + 258} type="analog" direction="in" label="IN" labelPos="above" />
      <PortJack id="tlpf.out" x={topX[8] + 85} y={ROW1_Y + 258} type="analog" direction="out" label="OUT" labelPos="above" />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* DIVIDER BAR & GND BUS                                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <line x1={8} y1={DIV_Y} x2={W - 8} y2={DIV_Y} stroke="#7a7060" strokeWidth={1.5} />

      <g>
        <circle cx={250} cy={DIV_Y} r={7} fill="#111" stroke="#4ecdc4" strokeWidth={1.5} />
        <text x={270} y={DIV_Y + 3} fontSize="7" fill="#333" fontWeight="bold" fontFamily="'Inter', sans-serif">GND</text>
      </g>
      <g>
        <circle cx={650} cy={DIV_Y} r={7} fill="#111" stroke="#4ecdc4" strokeWidth={1.5} />
        <text x={670} y={DIV_Y + 3} fontSize="7" fill="#333" fontWeight="bold" fontFamily="'Inter', sans-serif">GND</text>
      </g>
      <g>
        <circle cx={W - 80} cy={DIV_Y} r={6} fill="#e74c3c" stroke="#333" strokeWidth={1} />
        <text x={W - 68} y={DIV_Y + 3} fontSize="7" fill="#333" fontWeight="bold" fontFamily="'Inter', sans-serif">POWER</text>
      </g>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* BOTTOM ROW                                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {/* ═══ 10. VARIABLE DCV ═══ */}
      {blockBox(botX[0], ROW2_Y, bColW[0], ROW2_H, "VARIABLE\nDCV")}
      <PortJack id="vdcv.p5v" x={botX[0] + 20} y={ROW2_Y + 48} type="analog" direction="out" label="+5V" labelPos="right" />
      <line x1={botX[0] + 60} y1={ROW2_Y + 46} x2={botX[0] + 80} y2={ROW2_Y + 46} stroke="#333" strokeWidth={1.2} />
      <line x1={botX[0] + 66} y1={ROW2_Y + 50} x2={botX[0] + 74} y2={ROW2_Y + 50} stroke="#333" strokeWidth={1} />

      <PortJack id="vdcv.vdc" x={botX[0] + 20} y={ROW2_Y + 80} type="analog" direction="out" label="VDC" labelPos="right" />
      <PortJack id="vdcv.gnd" x={botX[0] + 20} y={ROW2_Y + 112} type="analog" direction="out" label="GND" labelPos="right" />
      <BoardKnob blockId="variable_dcv" paramKey="vdc" label="VDC" cx={botX[0] + 75} cy={ROW2_Y + 95} min={-5} max={5} step={0.1} defaultValue={0} unit="V" r={11} />

      {/* SPEECH Sub-section */}
      <line x1={botX[0] + 5} y1={ROW2_Y + 140} x2={botX[0] + bColW[0] - 5} y2={ROW2_Y + 140} stroke="#9e9382" strokeWidth={0.6} />
      <text x={botX[0] + bColW[0] / 2} y={ROW2_Y + 152} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#222">SPEECH</text>
      
      {/* Microphone gap capsule */}
      <circle cx={botX[0] + 24} cy={ROW2_Y + 180} r={9} fill="#e5dfd5" stroke="#7a7060" strokeWidth={1.2} />
      <circle cx={botX[0] + 24} cy={ROW2_Y + 180} r={6.5} fill="#443e35" stroke="#222" strokeWidth={0.8} />
      <circle cx={botX[0] + 24} cy={ROW2_Y + 180} r={4} fill="#111" />
      <line x1={botX[0] + 21} y1={ROW2_Y + 180} x2={botX[0] + 27} y2={ROW2_Y + 180} stroke="#666" strokeWidth={0.6} />
      <line x1={botX[0] + 24} y1={ROW2_Y + 177} x2={botX[0] + 24} y2={ROW2_Y + 183} stroke="#666" strokeWidth={0.6} />

      {/* Mic symbol & sound waves */}
      <g transform={`translate(${botX[0] + 48}, ${ROW2_Y + 180}) rotate(-25)`}>
        <rect x={-3} y={-1} width={6} height={10} rx={3} fill="#fff" stroke="#333" strokeWidth={1} />
        <line x1={-3} y1={2} x2={3} y2={2} stroke="#333" strokeWidth={0.8} />
        <path d="M -2 9 L 2 9 L 1 14 L -1 14 Z" fill="#333" />
        <path d="M 5 -2 q 3 3 0 6" fill="none" stroke="#333" strokeWidth={0.8} />
        <path d="M 8 -4 q 4 5 0 10" fill="none" stroke="#333" strokeWidth={0.8} />
      </g>

      {/* Speech Output Jack */}
      <PortJack id="vdcv.speech" x={botX[0] + 82} y={ROW2_Y + 180} type="analog" direction="out" label="" labelPos="none" />

      {/* EXOR Sub-section */}
      <line x1={botX[0] + 5} y1={ROW2_Y + 220} x2={botX[0] + bColW[0] - 5} y2={ROW2_Y + 220} stroke="#9e9382" strokeWidth={0.6} />
      <text x={botX[0] + bColW[0] / 2} y={ROW2_Y + 232} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#222">EXOR</text>
      <path d={`M ${botX[0] + 45} ${ROW2_Y + 242} q 4 7 0 14`} fill="none" stroke="#333" strokeWidth={1} />
      <path d={`M ${botX[0] + 48} ${ROW2_Y + 242} q 14 3 18 7 q -14 3 -18 7`} fill="none" stroke="#333" strokeWidth={1} />
      <text x={botX[0] + 74} y={ROW2_Y + 252} fontSize="9" fontWeight="bold" fill="#222">⊕</text>
      <PortJack id="vdcv.a" x={botX[0] + 20} y={ROW2_Y + 246} type="digital" direction="in" label="A" labelPos="left" />
      <PortJack id="vdcv.b" x={botX[0] + 20} y={ROW2_Y + 270} type="digital" direction="in" label="B" labelPos="left" />
      <PortJack id="vdcv.axb" x={botX[0] + 78} y={ROW2_Y + 270} type="digital" direction="out" label="A⊕B" labelPos="below" />

      {/* ═══ 11. VCO ═══ */}
      {blockBox(botX[1], ROW2_Y, bColW[1], ROW2_H, "VCO")}
      {moduleSymbolBox(botX[1] + bColW[1] / 2, ROW2_Y + 45, 24, 14, (
        <g>
          <path d={`M ${botX[1] + 43} ${ROW2_Y + 47} q 3 -4 6 0 q 3 4 6 0`} fill="none" stroke="#222" strokeWidth={1} />
          <path d={`M ${botX[1] + 56} ${ROW2_Y + 47} v-4 h4 v8 h4 v-4`} fill="none" stroke="#222" strokeWidth={1} />
        </g>
      ))}
      <PortJack id="vco.digital" x={botX[1] + 85} y={ROW2_Y + 45} type="digital" direction="out" label="DIGITAL" labelPos="below" />

      <BoardKnob blockId="vco" paramKey="gain" label="GAIN" cx={botX[1] + bColW[1] / 2} cy={ROW2_Y + 100} min={0} max={2} step={0.05} defaultValue={1.0} />
      <BoardKnob blockId="vco" paramKey="freq" label="FREQ" cx={botX[1] + bColW[1] / 2} cy={ROW2_Y + 170} min={100} max={10000} step={50} defaultValue={1000} unit="Hz" logarithmic={true} />

      {/* HI / LO Slide Switch */}
      <BoardSlideSwitch blockId="vco" paramKey="range" cx={botX[1] + 35} cy={ROW2_Y + 230} opt1="HI" opt2="LO" def="LO" />

      <PortJack id="vco.input" x={botX[1] + 20} y={ROW2_Y + 270} type="analog" direction="in" label="VCO INPUT" labelPos="above" />
      <PortJack id="vco.sine" x={botX[1] + 85} y={ROW2_Y + 270} type="analog" direction="out" label="SINE" labelPos="above" />

      {/* ═══ 12. SEQUENCE GENERATOR / DIVIDER ═══ */}
      {blockBox(botX[2], ROW2_Y, bColW[2], ROW2_H, "SEQUENCE\nGENERATOR")}

      {/* Top-Left: DIP Switch [0 | 1] graphic with dual vertical toggles */}
      <g pointerEvents="none">
        <rect x={botX[2] + 20} y={ROW2_Y + 44} width={20} height={28} fill="#fff" stroke="#333" strokeWidth={1.2} rx={1} />
        <rect x={botX[2] + 23} y={ROW2_Y + 47} width={5} height={11} fill="#555" stroke="#222" strokeWidth={0.8} rx={1} />
        <rect x={botX[2] + 32} y={ROW2_Y + 47} width={5} height={11} fill="#555" stroke="#222" strokeWidth={0.8} rx={1} />
        <text x={botX[2] + 13} y={ROW2_Y + 52} fontSize="6.5" fontWeight="bold" fill="#222">0</text>
        <text x={botX[2] + 13} y={ROW2_Y + 68} fontSize="6.5" fontWeight="bold" fill="#222">1</text>
      </g>

      {/* Top-Right: LINE CODE round analog output jack */}
      <text x={botX[2] + 90} y={ROW2_Y + 48} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#222">LINE</text>
      <text x={botX[2] + 90} y={ROW2_Y + 56} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#222">CODE</text>
      <PortJack id="seq.line_code" x={botX[2] + 90} y={ROW2_Y + 70} type="analog" direction="out" label="" labelPos="none" />

      {/* Left: Silkscreen printed line code table */}
      <g transform={`translate(${botX[2] + 15}, ${ROW2_Y + 86})`}>
        <text x={0} y={12} fontSize="6.5" fontWeight="600" fill="#222" fontFamily="'Inter', sans-serif">00 NRZ-L</text>
        <text x={0} y={24} fontSize="6.5" fontWeight="600" fill="#222" fontFamily="'Inter', sans-serif">01 Bi-Ø</text>
        <text x={0} y={36} fontSize="6.5" fontWeight="600" fill="#222" fontFamily="'Inter', sans-serif">10 RZ-AMI</text>
        <text x={0} y={48} fontSize="6.5" fontWeight="600" fill="#222" fontFamily="'Inter', sans-serif">11 NRZ-M</text>
      </g>

      {/* Right Column of Digital Jacks: SYNC, X, Y */}
      <PortJack id="seq.sync" x={botX[2] + 90} y={ROW2_Y + 115} type="digital" direction="out" label="SYNC" labelPos="above" />
      <PortJack id="seq.x" x={botX[2] + 90} y={ROW2_Y + 155} type="digital" direction="out" label="X" labelPos="left" />
      <PortJack id="seq.y" x={botX[2] + 90} y={ROW2_Y + 195} type="digital" direction="out" label="Y" labelPos="left" />

      {/* Bottom-Left: CLK digital jack */}
      <PortJack id="seq.clk" x={botX[2] + 25} y={ROW2_Y + 195} type="digital" direction="in" label="CLK" labelPos="below" />

      {/* DIVIDER Sub-block */}
      <line x1={botX[2] + 5} y1={ROW2_Y + 213} x2={botX[2] + bColW[2] - 5} y2={ROW2_Y + 213} stroke="#9e9382" strokeWidth={0.6} />
      <text x={botX[2] + bColW[2] / 2} y={ROW2_Y + 223} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#222">DIVIDER</text>

      {/* DIP Switch [0 | 1] graphic for Divider */}
      <g pointerEvents="none">
        <rect x={botX[2] + 20} y={ROW2_Y + 229} width={18} height={22} fill="#fff" stroke="#333" strokeWidth={1.2} rx={1} />
        <rect x={botX[2] + 23} y={ROW2_Y + 232} width={5} height={8} fill="#555" stroke="#222" strokeWidth={0.8} rx={1} />
        <rect x={botX[2] + 30} y={ROW2_Y + 232} width={5} height={8} fill="#555" stroke="#222" strokeWidth={0.8} rx={1} />
        <text x={botX[2] + 13} y={ROW2_Y + 237} fontSize="6.5" fontWeight="bold" fill="#222">0</text>
        <text x={botX[2] + 13} y={ROW2_Y + 248} fontSize="6.5" fontWeight="bold" fill="#222">1</text>
      </g>

      {moduleSymbolBox(botX[2] + 70, ROW2_Y + 237, 22, 14, (
        <text x={botX[2] + 70} y={ROW2_Y + 241} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#222">÷</text>
      ))}
      <PortJack id="div.in" x={botX[2] + 25} y={ROW2_Y + 263} type="digital" direction="in" label="IN" labelPos="below" />
      <PortJack id="div.out" x={botX[2] + 90} y={ROW2_Y + 263} type="digital" direction="out" label="OUT" labelPos="below" />

      {/* ═══ 13. PCM ENCODER ═══ */}
      {blockBox(botX[3], ROW2_Y, bColW[3], ROW2_H, "PCM\nENCODER")}
      {moduleSymbolBox(botX[3] + bColW[3] / 2, ROW2_Y + 45, 24, 14, (
        <path d={`M ${botX[3] + 44} ${ROW2_Y + 40} L ${botX[3] + 60} ${ROW2_Y + 45} L ${botX[3] + 44} ${ROW2_Y + 50} Z`} fill="#fff" stroke="#222" strokeWidth={1} />
      ))}
      {/* PCM / TDM Slide Switch */}
      <BoardSlideSwitch blockId="pcm_encoder" paramKey="mode" cx={botX[3] + 35} cy={ROW2_Y + 95} opt1="PCM" opt2="TDM" def="PCM" />

      <PortJack id="pcme.in2" x={botX[3] + 20} y={ROW2_Y + 150} type="analog" direction="in" label="INPUT 2" labelPos="below" />
      <PortJack id="pcme.fs" x={botX[3] + 80} y={ROW2_Y + 150} type="digital" direction="in" label="FS" labelPos="below" />

      <PortJack id="pcme.in1" x={botX[3] + 20} y={ROW2_Y + 215} type="analog" direction="in" label="INPUT 1" labelPos="below" />

      <PortJack id="pcme.clk" x={botX[3] + 20} y={ROW2_Y + 270} type="digital" direction="in" label="CLK" labelPos="above" />
      <PortJack id="pcme.pcm_data" x={botX[3] + 80} y={ROW2_Y + 270} type="digital" direction="out" label="PCM DATA" labelPos="above" />

      {/* ═══ 14. MASTER SIGNALS ═══ */}
      {blockBox(botX[4], ROW2_Y, bColW[4], ROW2_H, "MASTER\nSIGNALS")}
      {moduleSymbolBox(botX[4] + bColW[4] / 2, ROW2_Y + 45, 24, 14, (
        <g>
          <path d={`M ${botX[4] + 50} ${ROW2_Y + 44} q 3 -4 6 0 q 3 4 6 0`} fill="none" stroke="#222" strokeWidth={1} />
          <path d={`M ${botX[4] + 63} ${ROW2_Y + 44} v-4 h4 v8 h4 v-4`} fill="none" stroke="#222" strokeWidth={1} />
        </g>
      ))}
      <PortJack id="ms.100k_sine" x={botX[4] + 25} y={ROW2_Y + 75} type="analog" direction="out" label="100kHz SINE" labelPos="right" />
      <PortJack id="ms.100k_cos" x={botX[4] + 25} y={ROW2_Y + 110} type="analog" direction="out" label="100kHz COS" labelPos="right" />
      <PortJack id="ms.100k_dig" x={botX[4] + 25} y={ROW2_Y + 145} type="digital" direction="out" label="100kHz DIGITAL" labelPos="right" />
      <PortJack id="ms.8k_dig" x={botX[4] + 25} y={ROW2_Y + 180} type="digital" direction="out" label="8kHz DIGITAL" labelPos="right" />
      <PortJack id="ms.2k_dig" x={botX[4] + 25} y={ROW2_Y + 220} type="digital" direction="out" label="2kHz DIGITAL" labelPos="right" />
      <PortJack id="ms.2k_sine" x={botX[4] + 25} y={ROW2_Y + 260} type="analog" direction="out" label="2kHz SINE" labelPos="right" />

      {/* ═══ 15. MULTIPLIER (Bottom) ═══ */}
      {blockBox(botX[5], ROW2_Y, bColW[5], ROW2_H, "MULTIPLIER")}
      {moduleSymbolBox(botX[5] + bColW[5] / 2, ROW2_Y + 45, 24, 14, (
        <text x={botX[5] + bColW[5] / 2} y={ROW2_Y + 49} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#222">×</text>
      ))}
      <PortJack id="mult2.x_dc" x={botX[5] + 25} y={ROW2_Y + 80} type="analog" direction="in" label="X DC" labelPos="below" />
      <PortJack id="mult2.y_dc" x={botX[5] + 25} y={ROW2_Y + 130} type="analog" direction="in" label="Y DC" labelPos="below" />
      <PortJack id="mult2.kxy" x={botX[5] + 95} y={ROW2_Y + 105} type="analog" direction="out" label="kXY" labelPos="below" />

      {/* Sub-block SERIAL TO PARALLEL */}
      <line x1={botX[5] + 5} y1={ROW2_Y + 160} x2={botX[5] + bColW[5] - 5} y2={ROW2_Y + 160} stroke="#9e9382" strokeWidth={0.6} />
      <text x={botX[5] + bColW[5] / 2} y={ROW2_Y + 172} textAnchor="middle" fontSize="6" fontWeight="bold" fill="#222">SERIAL TO PARALLEL</text>
      {moduleSymbolBox(botX[5] + bColW[5] / 2, ROW2_Y + 192, 26, 14, (
        <text x={botX[5] + bColW[5] / 2} y={ROW2_Y + 195.5} textAnchor="middle" fontSize="7" fontWeight="bold" fill="#222">S/P</text>
      ))}
      <PortJack id="stp.serial" x={botX[5] + 25} y={ROW2_Y + 225} type="digital" direction="in" label="SERIAL" labelPos="below" />
      <PortJack id="stp.x1" x={botX[5] + 95} y={ROW2_Y + 225} type="digital" direction="out" label="X1" labelPos="below" />
      <PortJack id="stp.clk" x={botX[5] + 25} y={ROW2_Y + 270} type="digital" direction="in" label="CLK" labelPos="below" />
      <PortJack id="stp.x2" x={botX[5] + 95} y={ROW2_Y + 270} type="digital" direction="out" label="X2" labelPos="below" />

      {/* ═══ 16. PCM DECODER ═══ */}
      {blockBox(botX[6], ROW2_Y, bColW[6], ROW2_H, "PCM\nDECODER")}
      {moduleSymbolBox(botX[6] + bColW[6] / 2, ROW2_Y + 45, 24, 14, (
        <path d={`M ${botX[6] + 46} ${ROW2_Y + 40} L ${botX[6] + 62} ${ROW2_Y + 45} L ${botX[6] + 46} ${ROW2_Y + 50} Z`} fill="#fff" stroke="#222" strokeWidth={1} />
      ))}

      {/* TDM Mode Status LED Indicator (Pure status indicator, not a clickable button) */}
      {(() => {
        const isTdm = getParam("pcm_encoder", "mode", "PCM") === "TDM";
        return (
          <g pointerEvents="none">
            <text x={botX[6] + 32} y={ROW2_Y + 84} fontSize="7" fontWeight="bold" fill="#222">
              TDM
            </text>
            <circle
              cx={botX[6] + 58}
              cy={ROW2_Y + 81}
              r={5.5}
              fill="#222"
              stroke="#555"
              strokeWidth={1}
            />
            <circle
              cx={botX[6] + 58}
              cy={ROW2_Y + 81}
              r={3}
              fill={isTdm ? "#2ecc71" : "#555"}
              stroke="#fff"
              strokeWidth={0.6}
            />
            {isTdm && (
              <circle
                cx={botX[6] + 58}
                cy={ROW2_Y + 81}
                r={6.5}
                fill="none"
                stroke="#2ecc71"
                strokeWidth={1}
                opacity={0.6}
              />
            )}
          </g>
        );
      })()}

      <PortJack id="pcmd.fs" x={botX[6] + 25} y={ROW2_Y + 145} type="digital" direction="in" label="FS" labelPos="below" />

      <PortJack id="pcmd.pcm_data" x={botX[6] + 25} y={ROW2_Y + 205} type="digital" direction="in" label="PCM DATA" labelPos="below" />
      <PortJack id="pcmd.out2" x={botX[6] + 85} y={ROW2_Y + 205} type="analog" direction="out" label="OUTPUT2" labelPos="below" />

      <PortJack id="pcmd.clk" x={botX[6] + 25} y={ROW2_Y + 270} type="digital" direction="in" label="CLK" labelPos="below" />
      <PortJack id="pcmd.out" x={botX[6] + 85} y={ROW2_Y + 270} type="analog" direction="out" label="OUTPUT" labelPos="below" />

      {/* ═══ 17. EXPANSION ═══ */}
      {blockBox(botX[7], ROW2_Y, bColW[7], ROW2_H, "EXPANSION")}
      <rect x={botX[7] + 25} y={ROW2_Y + 35} width={bColW[7] - 50} height={20} fill="#ffffff" stroke="#333" strokeWidth={1.5} rx={2} />
      <rect x={botX[7] + 15} y={ROW2_Y + 45} width={bColW[7] - 30} height={ROW2_H - 60} fill="none" stroke="#bbb" strokeWidth={1} strokeDasharray="4 3" rx={4} />

      <text x={botX[7] + bColW[7] / 2} y={ROW2_Y + 115} textAnchor="middle" fontSize="15" fontStyle="italic" fill="#555" fontFamily="'Georgia', serif">
        analog
      </text>
      <text x={botX[7] + bColW[7] / 2} y={ROW2_Y + 138} textAnchor="middle" fontSize="19" fontWeight="900" fill="#222" fontFamily="'Inter', sans-serif" letterSpacing="1">
        digital
      </text>
      <text x={botX[7] + bColW[7] / 2 + 55} y={ROW2_Y + 148} fontSize="11" fill="#777">(((</text>
      <text x={botX[7] + bColW[7] / 2 + 55} y={ROW2_Y + 160} fontSize="7" fill="#777">TM</text>
      <text x={botX[7] + bColW[7] / 2} y={ROW2_Y + 172} textAnchor="middle" fontSize="23" fontWeight="900" fill="#111" fontFamily="'Inter', sans-serif" letterSpacing="0.5">
        biskit
      </text>

      <g transform={`translate(${botX[7] + 25}, ${ROW2_Y + 195})`}>
        <circle cx={15} cy={20} r={9} fill="#fff" stroke="#333" strokeWidth={1.2} />
        <path d="M 10 20 q 2.5 -4 5 0 q 2.5 4 5 0" fill="none" stroke="#333" strokeWidth={1.2} />
        <line x1={24} y1={20} x2={35} y2={20} stroke="#333" strokeWidth={1.2} />

        <rect x={35} y={11} width={18} height={18} fill="#fff" stroke="#333" strokeWidth={1.2} rx={1} />
        <text x={44} y={24} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#222">×</text>
        <line x1={53} y1={20} x2={65} y2={20} stroke="#333" strokeWidth={1.2} />

        <rect x={65} y={11} width={18} height={18} fill="#fff" stroke="#333" strokeWidth={1.2} rx={1} />
        <text x={74} y={24.5} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#222">+</text>
        <line x1={83} y1={20} x2={95} y2={20} stroke="#333" strokeWidth={1.2} />

        <rect x={95} y={11} width={18} height={18} fill="#fff" stroke="#333" strokeWidth={1.2} rx={1} />
        <path d="M 99 20 q 2 -3 4 0 q 2 3 4 0" fill="none" stroke="#333" strokeWidth={1} />
        <line x1={113} y1={20} x2={122} y2={20} stroke="#333" strokeWidth={1.2} />
        <circle cx={124} cy={20} r={2} fill="#333" />
      </g>

      <text x={botX[7] + bColW[7] / 2} y={ROW2_Y + 265} textAnchor="middle" fontSize="5" fill="#666" fontFamily="'Inter', sans-serif">
        DESIGNED BY EMONA TIMS, AUSTRALIA
      </text>
      <text x={botX[7] + bColW[7] / 2} y={ROW2_Y + 273} textAnchor="middle" fontSize="4.5" fill="#888" fontFamily="'Inter', sans-serif">
        (c) Copyright 2008 Emona Instruments Pty Ltd
      </text>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SCOPE TERMINAL STRIP                                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <g>
        <rect x={W - 65} y={ROW1_Y} width={50} height={ROW1_H} fill="#131c26" stroke="#253545" strokeWidth={1.5} rx={3} />
        <rect x={W - 65} y={ROW1_Y} width={50} height={20} fill="#182736" rx={3} />
        <text x={W - 40} y={ROW1_Y + 14} textAnchor="middle" fontSize="7" fontWeight="bold" fill="#48cae4" letterSpacing="0.8">SCOPE</text>

        <rect x={W - 58} y={ROW1_Y + 28} width={36} height={22} fill="#0d1720" stroke="#253545" strokeWidth={0.8} rx={2} />
        <path d={`M ${W - 54} ${ROW1_Y + 39} q 5 -8 9 0 q 5 8 9 0 q 5 -8 9 0`} fill="none" stroke="#ff9f1c" strokeWidth={1.2} />

        <text x={W - 40} y={ROW1_Y + 68} textAnchor="middle" fontSize="6.5" fill="#ff9f1c" fontWeight="bold">CH1</text>
        <PortJack id="scope.ch1" x={W - 40} y={ROW1_Y + 84} type="analog" direction="in" label="" labelPos="none" />

        <text x={W - 40} y={ROW1_Y + 120} textAnchor="middle" fontSize="6.5" fill="#00b4d8" fontWeight="bold">CH2</text>
        <PortJack id="scope.ch2" x={W - 40} y={ROW1_Y + 136} type="analog" direction="in" label="" labelPos="none" />

        <text x={W - 40} y={ROW1_Y + 172} textAnchor="middle" fontSize="5.5" fill="#f1c40f" fontWeight="bold">TRIGGER</text>
        <PortJack id="scope.trigger" x={W - 40} y={ROW1_Y + 188} type="analog" direction="in" label="" labelPos="none" />

        <text x={W - 40} y={ROW1_Y + 224} textAnchor="middle" fontSize="5.5" fill="#aaa" fontWeight="bold">EXT TRIG</text>
        <PortJack id="scope.ext_trig" x={W - 40} y={ROW1_Y + 240} type="digital" direction="in" label="" labelPos="none" />
      </g>
    </g>
  );
}
