import { useEffect, useRef, useCallback } from "react";
import { audioEngine } from "../../audio/AudioEngine";
import { usePatchStore } from "../../store/patchStore";

/**
 * ScopeCanvas — Dual-channel oscilloscope renderer
 * Supports per-channel vertical offset and horizontal scroll
 */
interface ScopeCanvasProps {
  width: number;
  height: number;
}

const GRID_DIVISIONS = 10;
const GRID_COLOR = "rgba(0, 255, 65, 0.12)";
const GRID_CENTER_COLOR = "rgba(0, 255, 65, 0.3)";
const CH1_COLOR = "#00ff41";
const CH2_COLOR = "#ffcc00";
const TRIGGER_COLOR = "#ff4444";
const BG_COLOR = "#0a0f0a";

export default function ScopeCanvas({ width, height }: ScopeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const scopeSettings = usePatchStore((s) => s.scopeSettings);
  const setScopeSettings = usePatchStore((s) => s.setScopeSettings);

  // Persistent frozen buffers for analysis when stopped / in single mode
  const frozenCh1Ref = useRef<Float32Array>(new Float32Array(4096));
  const frozenCh2Ref = useRef<Float32Array>(new Float32Array(4096));
  const hasCapturedRef = useRef<boolean>(false);

  // Interactive canvas dragging state
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const dragStartOffsetRef = useRef({ xOffset: 0, ch1Y: 0, ch2Y: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const {
      triggerSource, triggerLevel, triggerEdge, running,
      ch1YOffset, ch2YOffset, xOffset,
      ch1VPerDiv, ch2VPerDiv, timebaseMs,
    } = scopeSettings;

    // Get analyser data from scope channels
    const ch1Analyser = audioEngine.getScopeAnalyser("ch1");
    const ch2Analyser = audioEngine.getScopeAnalyser("ch2");

    const bufferLength = ch1Analyser?.fftSize ?? 4096;
    let ch1Data = frozenCh1Ref.current;
    let ch2Data = frozenCh2Ref.current;

    if (running) {
      const liveCh1 = new Float32Array(bufferLength);
      const liveCh2 = new Float32Array(bufferLength);

      if (ch1Analyser) ch1Analyser.getFloatTimeDomainData(liveCh1);
      if (ch2Analyser) ch2Analyser.getFloatTimeDomainData(liveCh2);

      ch1Data = liveCh1;
      ch2Data = liveCh2;
      frozenCh1Ref.current = liveCh1;
      frozenCh2Ref.current = liveCh2;
      hasCapturedRef.current = true;
    }

    // ─── Background ───
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    // ─── Grid ───
    drawGrid(ctx, width, height);

    // ─── Find trigger point ───
    let triggerIndex = 0;
    const trigData =
      triggerSource === "ch1" ? ch1Data :
      triggerSource === "ch2" ? ch2Data :
      null;

    if (trigData) {
      triggerIndex = findTrigger(trigData, triggerLevel, triggerEdge);
    }

    // Horizontal offset in samples
    const sampleRate = audioEngine.getContext()?.sampleRate ?? 48000;
    const totalTimeMs = timebaseMs * GRID_DIVISIONS;
    const samplesToShow = Math.floor((totalTimeMs / 1000) * sampleRate);
    const xOffsetSamples = Math.floor((xOffset / GRID_DIVISIONS) * samplesToShow);
    const adjustedTrigger = Math.max(0, triggerIndex + xOffsetSamples);
    const displaySamples = Math.min(samplesToShow, ch1Data.length - adjustedTrigger);

    // Pixels per division
    const divH = height / GRID_DIVISIONS;

    // ─── Check signals ───
    const ch1HasSignal = ch1Data.some(v => Math.abs(v) > 0.001);
    const ch2HasSignal = ch2Data.some(v => Math.abs(v) > 0.001);

    // ─── Draw waveforms with offsets ───
    if (ch1HasSignal) {
      drawWaveform(ctx, ch1Data, adjustedTrigger, displaySamples, width, height, CH1_COLOR, ch1VPerDiv, ch1YOffset * divH);
    }
    if (ch2HasSignal) {
      drawWaveform(ctx, ch2Data, adjustedTrigger, displaySamples, width, height, CH2_COLOR, ch2VPerDiv, ch2YOffset * divH);
    }

    // ─── Draw zero-reference arrows on left edge ───
    drawChannelArrow(ctx, ch1YOffset * divH, CH1_COLOR, "1", height);
    drawChannelArrow(ctx, ch2YOffset * divH, CH2_COLOR, "2", height);

    // ─── Trigger level line ───
    if (triggerSource !== "none") {
      const trigY = height / 2 - (triggerLevel * height) / 2;
      ctx.strokeStyle = TRIGGER_COLOR;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, trigY);
      ctx.lineTo(width, trigY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ─── Channel labels ───
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = CH1_COLOR;
    ctx.fillText("CH1", 18, 16);
    ctx.fillStyle = CH2_COLOR;
    ctx.fillText("CH2", 18, 30);

    // Status bar
    ctx.fillStyle = running ? "#00ff41" : "#ffcc00";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${timebaseMs} ms/div`, width - 8, 16);
    ctx.fillText(running ? "● RUN" : "⏸ SINGLE/STOP", width - 8, 30);
    ctx.textAlign = "left";

    // Connection hint
    if (!ch1HasSignal && !ch2HasSignal && !hasCapturedRef.current) {
      ctx.fillStyle = "rgba(0, 255, 65, 0.3)";
      ctx.font = "11px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Connect a signal to SCOPE CH1 or CH2", width / 2, height / 2);
      ctx.textAlign = "left";
    }

    if (running) {
      animFrameRef.current = requestAnimationFrame(draw);
    }
  }, [width, height, scopeSettings]);

  // Main rendering loop & redraw on ANY setting change
  useEffect(() => {
    if (scopeSettings.running) {
      animFrameRef.current = requestAnimationFrame(draw);
    } else {
      draw();
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [draw, scopeSettings.running, scopeSettings.ch1YOffset, scopeSettings.ch2YOffset, scopeSettings.xOffset, scopeSettings.timebaseMs, scopeSettings.ch1VPerDiv, scopeSettings.ch2VPerDiv]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    dragStartOffsetRef.current = {
      xOffset: scopeSettings.xOffset,
      ch1Y: scopeSettings.ch1YOffset,
      ch2Y: scopeSettings.ch2YOffset,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartPosRef.current.x;
    const dy = e.clientY - dragStartPosRef.current.y;

    const divW = width / GRID_DIVISIONS;
    const divH = height / GRID_DIVISIONS;

    const deltaXDivs = -dx / divW;
    const deltaYDivs = -dy / divH;

    setScopeSettings({
      xOffset: Math.round((dragStartOffsetRef.current.xOffset + deltaXDivs) * 10) / 10,
      ch1YOffset: Math.round((dragStartOffsetRef.current.ch1Y + deltaYDivs) * 10) / 10,
      ch2YOffset: Math.round((dragStartOffsetRef.current.ch2Y + deltaYDivs) * 10) / 10,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    isDraggingRef.current = true;
    const touch = e.touches[0];
    dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    dragStartOffsetRef.current = {
      xOffset: scopeSettings.xOffset,
      ch1Y: scopeSettings.ch1YOffset,
      ch2Y: scopeSettings.ch2YOffset,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartPosRef.current.x;
    const dy = touch.clientY - dragStartPosRef.current.y;

    const divW = width / GRID_DIVISIONS;
    const divH = height / GRID_DIVISIONS;

    const deltaXDivs = -dx / divW;
    const deltaYDivs = -dy / divH;

    setScopeSettings({
      xOffset: Math.round((dragStartOffsetRef.current.xOffset + deltaXDivs) * 10) / 10,
      ch1YOffset: Math.round((dragStartOffsetRef.current.ch1Y + deltaYDivs) * 10) / 10,
      ch2YOffset: Math.round((dragStartOffsetRef.current.ch2Y + deltaYDivs) * 10) / 10,
    });
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="scope-canvas"
      style={{ cursor: "grab", touchAction: "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    />
  );
}

// ─── Helpers ───

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const divW = w / GRID_DIVISIONS;
  const divH = h / GRID_DIVISIONS;

  ctx.lineWidth = 1;

  for (let i = 0; i <= GRID_DIVISIONS; i++) {
    const x = Math.floor(i * divW) + 0.5;
    ctx.strokeStyle = i === GRID_DIVISIONS / 2 ? GRID_CENTER_COLOR : GRID_COLOR;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  for (let i = 0; i <= GRID_DIVISIONS; i++) {
    const y = Math.floor(i * divH) + 0.5;
    ctx.strokeStyle = i === GRID_DIVISIONS / 2 ? GRID_CENTER_COLOR : GRID_COLOR;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Center tick marks
  const cx = w / 2;
  const cy = h / 2;
  ctx.strokeStyle = GRID_CENTER_COLOR;
  for (let i = 0; i <= GRID_DIVISIONS * 5; i++) {
    const tx = i * (w / (GRID_DIVISIONS * 5));
    ctx.beginPath();
    ctx.moveTo(tx, cy - 3);
    ctx.lineTo(tx, cy + 3);
    ctx.stroke();
  }
  for (let i = 0; i <= GRID_DIVISIONS * 5; i++) {
    const ty = i * (h / (GRID_DIVISIONS * 5));
    ctx.beginPath();
    ctx.moveTo(cx - 3, ty);
    ctx.lineTo(cx + 3, ty);
    ctx.stroke();
  }
}

/** Draw a waveform with vertical offset */
function drawWaveform(
  ctx: CanvasRenderingContext2D, data: Float32Array,
  startIdx: number, numSamples: number,
  w: number, h: number, color: string, vPerDiv: number,
  yOffsetPx: number
) {
  if (numSamples <= 0) return;

  const centerY = h / 2 - yOffsetPx;
  const pixelsPerVolt = (h / GRID_DIVISIONS) / vPerDiv;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.beginPath();

  for (let i = 0; i < numSamples; i++) {
    const idx = startIdx + i;
    if (idx >= data.length) break;
    const x = (i / numSamples) * w;
    const y = centerY - data[idx] * pixelsPerVolt;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}

/** Draw channel zero-reference arrow on the left edge */
function drawChannelArrow(
  ctx: CanvasRenderingContext2D,
  yOffsetPx: number, color: string, label: string,
  canvasHeight: number
) {
  const arrowY = canvasHeight / 2 - yOffsetPx;

  // Clamp to visible area
  if (arrowY < -5 || arrowY > canvasHeight + 5) return;

  ctx.fillStyle = color;
  ctx.beginPath();
  // Triangle arrow pointing right
  ctx.moveTo(0, arrowY);
  ctx.lineTo(10, arrowY - 5);
  ctx.lineTo(10, arrowY + 5);
  ctx.closePath();
  ctx.fill();

  // Dashed horizontal reference line (subtle)
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.2;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(10, arrowY);
  ctx.lineTo(ctx.canvas.width, arrowY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1.0;

  // Label next to arrow
  ctx.fillStyle = color;
  ctx.font = "bold 7px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(label, 2, arrowY + 2.5);
}

function findTrigger(data: Float32Array, level: number, edge: "rising" | "falling"): number {
  const startSearch = 128;
  const endSearch = Math.floor(data.length * 0.6);

  for (let i = startSearch; i < endSearch; i++) {
    if (edge === "rising") {
      if (data[i - 1] <= level && data[i] > level) return i;
    } else {
      if (data[i - 1] >= level && data[i] < level) return i;
    }
  }
  return 0;
}
