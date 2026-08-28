/**
 * exportSnapshot.ts
 * Captures the EMONA ETT-101 Trainer Board (with all patch wires)
 * and the live Dual-Trace Oscilloscope canvas into a single high-resolution
 * combined PNG lab report.
 */

export async function captureLabSnapshot(): Promise<void> {
  try {
    // 1. Locate the board SVG and scope canvas with fallback selectors
    const svgElement = (
      document.querySelector(".patch-panel-svg") ||
      document.querySelector("svg.patch-panel-svg") ||
      document.querySelector(".patch-panel-container svg") ||
      document.querySelector("svg")
    ) as SVGSVGElement | null;

    const scopeCanvas = (
      document.querySelector(".scope-canvas") ||
      document.querySelector("canvas.scope-canvas") ||
      document.querySelector(".scope-screen-container canvas") ||
      document.querySelector("canvas")
    ) as HTMLCanvasElement | null;

    if (!svgElement) {
      alert("Trainer board not found for snapshot.");
      return;
    }

    // 2. Clone SVG and ensure required XML attributes for rasterization
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    clonedSvg.setAttribute("width", "1080");
    clonedSvg.setAttribute("height", "680");

    // Copy computed styles or embed stylesheet so board fonts & colors render
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const svgBlobUrl = URL.createObjectURL(svgBlob);

    const boardImg = new Image();
    await new Promise<void>((resolve, reject) => {
      boardImg.onload = () => resolve();
      boardImg.onerror = (err) => reject(err);
      boardImg.src = svgBlobUrl;
    });

    // 3. Setup composite canvas dimensions (High-Res 1920x1080+ format)
    const outputWidth = 1920;
    const boardAspect = 1080 / 680;
    const boardRenderHeight = Math.round((outputWidth - 80) / boardAspect);

    const scopeAspect = scopeCanvas ? (scopeCanvas.width / (scopeCanvas.height || 1)) : (800 / 480);
    const scopeRenderWidth = 1100;
    const scopeRenderHeight = Math.round(scopeRenderWidth / scopeAspect);

    const headerHeight = 96;
    const footerHeight = 56;
    const padding = 36;

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
    ctx.fillStyle = "#141c28";
    ctx.fillRect(0, 0, outputWidth, headerHeight);
    
    // Golden accent bottom border
    const gradient = ctx.createLinearGradient(0, 0, outputWidth, 0);
    gradient.addColorStop(0, "#f39c12");
    gradient.addColorStop(0.5, "#e67e22");
    gradient.addColorStop(1, "#3498db");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, headerHeight - 4, outputWidth, 4);

    // Header Title
    ctx.font = "bold 28px 'Inter', sans-serif";
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
    ctx.fillText(`CAPTURED: ${dateStr}  •  REAL-TIME DSP SIMULATOR`, padding, 74);

    // ─── 1. Trainer Board Section ─────────────────────────────────
    let currentY = headerHeight + padding;

    // Section Badge
    ctx.font = "bold 16px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#f39c12";
    ctx.fillText("▶ 1. TRAINER BOARD PATCH CONNECTIONS", padding, currentY - 12);

    // Draw board
    ctx.drawImage(boardImg, 0, 0, boardImg.width, boardImg.height, padding, currentY, outputWidth - (padding * 2), boardRenderHeight);
    URL.revokeObjectURL(svgBlobUrl);

    // ─── 2. Oscilloscope Section ──────────────────────────────────
    currentY += boardRenderHeight + padding + 16;

    ctx.font = "bold 16px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#00b4d8";
    ctx.fillText("▶ 2. DUAL-TRACE OSCILLOSCOPE WAVEFORMS", padding, currentY - 12);

    if (scopeCanvas) {
      const scopeX = (outputWidth - scopeRenderWidth) / 2;

      // Outer bezel frame
      ctx.fillStyle = "#05090e";
      ctx.strokeStyle = "rgba(0, 180, 216, 0.4)";
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

    ctx.font = "13px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#5c7080";
    ctx.textAlign = "center";
    ctx.fillText(
      "EMONA ETT-101 Virtual Telecoms Trainer  •  Real-Time DSP Signal Engine  •  Dual-Trace CRO",
      outputWidth / 2,
      totalHeight - 22
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
    alert("Could not generate snapshot. Please check browser permissions.");
  }
}
