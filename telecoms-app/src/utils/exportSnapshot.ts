/**
 * exportSnapshot.ts
 * Captures the EMONA ETT-101 Trainer Board (with all patch wires)
 * and the live Dual-Trace Oscilloscope canvas into a single high-resolution
 * combined PNG lab report.
 */

export async function captureLabSnapshot(): Promise<void> {
  try {
    // 1. Locate the board SVG and scope canvas
    const svgElement = document.querySelector(".patch-board-svg") as SVGSVGElement | null;
    const scopeCanvas = document.querySelector(".scope-canvas") as HTMLCanvasElement | null;

    if (!svgElement) {
      alert("Trainer board not found for snapshot.");
      return;
    }

    // 2. Render SVG board to an offscreen Image
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const svgBlobUrl = URL.createObjectURL(svgBlob);

    const boardImg = new Image();
    await new Promise<void>((resolve, reject) => {
      boardImg.onload = () => resolve();
      boardImg.onerror = (e) => reject(e);
      boardImg.src = svgBlobUrl;
    });

    // 3. Setup composite canvas dimensions
    const outputWidth = 1920;
    const boardAspect = boardImg.width / (boardImg.height || 1);
    const boardRenderHeight = Math.round(outputWidth / boardAspect);

    const scopeAspect = scopeCanvas ? (scopeCanvas.width / (scopeCanvas.height || 1)) : (800 / 480);
    const scopeRenderWidth = 1200;
    const scopeRenderHeight = Math.round(scopeRenderWidth / scopeAspect);

    const headerHeight = 90;
    const footerHeight = 50;
    const padding = 30;

    const totalHeight =
      headerHeight +
      boardRenderHeight +
      padding +
      scopeRenderHeight +
      padding +
      footerHeight;

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ─── Background ──────────────────────────────────────────────
    ctx.fillStyle = "#0c1219";
    ctx.fillRect(0, 0, outputWidth, totalHeight);

    // ─── Header Banner ───────────────────────────────────────────
    ctx.fillStyle = "#151e2a";
    ctx.fillRect(0, 0, outputWidth, headerHeight);
    ctx.fillStyle = "#f39c12";
    ctx.fillRect(0, headerHeight - 3, outputWidth, 3);

    // Header Title
    ctx.font = "bold 26px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("EMONA Telecoms-Trainer 101 — Lab Report Snapshot", padding, 44);

    // Header Subtitle / Date
    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    ctx.font = "14px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#8a9ba8";
    ctx.fillText(`CAPTURED: ${dateStr}  •  VIRTUAL DSP SIMULATOR`, padding, 70);

    // ─── Draw Trainer Board ───────────────────────────────────────
    let currentY = headerHeight + padding;

    // Board Section Title
    ctx.font = "bold 16px 'Inter', sans-serif";
    ctx.fillStyle = "#f39c12";
    ctx.fillText("1. TRAINER BOARD PATCH WIRING", padding, currentY - 10);

    // Draw board
    ctx.drawImage(boardImg, 0, 0, boardImg.width, boardImg.height, padding, currentY, outputWidth - (padding * 2), boardRenderHeight);
    URL.revokeObjectURL(svgBlobUrl);

    // ─── Draw Oscilloscope Screen ─────────────────────────────────
    currentY += boardRenderHeight + padding + 20;

    ctx.font = "bold 16px 'Inter', sans-serif";
    ctx.fillStyle = "#2ecc71";
    ctx.fillText("2. DUAL-TRACE OSCILLOSCOPE OUTPUT", padding, currentY - 10);

    if (scopeCanvas) {
      // Centered scope display
      const scopeX = (outputWidth - scopeRenderWidth) / 2;

      // Outer bezel frame
      ctx.fillStyle = "#05090e";
      ctx.strokeStyle = "rgba(46, 204, 113, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(scopeX - 8, currentY - 8, scopeRenderWidth + 16, scopeRenderHeight + 16, 8);
      ctx.fill();
      ctx.stroke();

      // Draw live scope canvas
      ctx.drawImage(scopeCanvas, scopeX, currentY, scopeRenderWidth, scopeRenderHeight);
    }

    // ─── Footer ──────────────────────────────────────────────────
    ctx.fillStyle = "#101620";
    ctx.fillRect(0, totalHeight - footerHeight, outputWidth, footerHeight);

    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#5c7080";
    ctx.textAlign = "center";
    ctx.fillText(
      "EMONA ETT-101 Telecoms Trainer Simulator  •  Real-Time DSP Signal Engine  •  Dual-Trace CRO",
      outputWidth / 2,
      totalHeight - 20
    );

    // ─── Trigger File Download ───────────────────────────────────
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const link = document.createElement("a");
    link.download = `telecoms_lab_snapshot_${timestamp}.png`;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Failed to capture lab snapshot:", err);
    alert("Could not generate snapshot. Please ensure the board and scope are visible.");
  }
}
