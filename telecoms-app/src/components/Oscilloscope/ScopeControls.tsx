import { usePatchStore } from "../../store/patchStore";
import type { TriggerSource } from "../../types";

/**
 * Scope Controls — Compact vertical layout with offset controls
 */
export default function ScopeControls() {
  const scopeSettings = usePatchStore((s) => s.scopeSettings);
  const setScopeSettings = usePatchStore((s) => s.setScopeSettings);

  const timebaseOptions = [0.1, 0.2, 0.5, 1, 2, 5, 10];
  const vDivOptions = [0.2, 0.5, 1, 2, 5];

  const nudgeOffset = (key: "ch1YOffset" | "ch2YOffset" | "xOffset", delta: number) => {
    setScopeSettings({ [key]: Math.round((scopeSettings[key] + delta) * 10) / 10 });
  };

  return (
    <div className="scope-controls scope-controls-vertical">
      {/* Row 1: Timebase + Trigger */}
      <div className="scope-controls-row">
        <div className="scope-control-group">
          <label className="scope-label">TIME/DIV</label>
          <select className="scope-select"
            value={scopeSettings.timebaseMs}
            onChange={(e) => setScopeSettings({ timebaseMs: parseFloat(e.target.value) })}>
            {timebaseOptions.map((v) => (
              <option key={v} value={v}>{v} ms</option>
            ))}
          </select>
        </div>
        <div className="scope-control-group">
          <label className="scope-label" style={{ color: "#ff4444" }}>TRIGGER</label>
          <select className="scope-select"
            value={scopeSettings.triggerSource}
            onChange={(e) => setScopeSettings({ triggerSource: e.target.value as TriggerSource })}>
            <option value="ch1">CH1</option>
            <option value="ch2">CH2</option>
            <option value="ext">EXT</option>
            <option value="none">FREE</option>
          </select>
        </div>
      </div>

      {/* Row 2: CH1 V/div + Position */}
      <div className="scope-controls-row">
        <div className="scope-control-group">
          <label className="scope-label" style={{ color: "#00ff41" }}>CH1 V/DIV</label>
          <select className="scope-select"
            value={scopeSettings.ch1VPerDiv}
            onChange={(e) => setScopeSettings({ ch1VPerDiv: parseFloat(e.target.value) })}>
            {vDivOptions.map((v) => (
              <option key={v} value={v}>{v} V</option>
            ))}
          </select>
        </div>
        <div className="scope-control-group">
          <label className="scope-label" style={{ color: "#4ecdc4" }}>CH1 POS</label>
          <div className="scope-offset-btns">
            <button className="scope-offset-btn" onClick={() => nudgeOffset("ch1YOffset", 0.5)} title="Shift CH1 Up">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
            </button>
            <span className="scope-offset-val">{scopeSettings.ch1YOffset.toFixed(1)}</span>
            <button className="scope-offset-btn" onClick={() => nudgeOffset("ch1YOffset", -0.5)} title="Shift CH1 Down">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: CH2 V/div + Position */}
      <div className="scope-controls-row">
        <div className="scope-control-group">
          <label className="scope-label" style={{ color: "#e74c3c" }}>CH2 V/DIV</label>
          <select className="scope-select"
            value={scopeSettings.ch2VPerDiv}
            onChange={(e) => setScopeSettings({ ch2VPerDiv: parseFloat(e.target.value) })}>
            {vDivOptions.map((v) => (
              <option key={v} value={v}>{v} V</option>
            ))}
          </select>
        </div>
        <div className="scope-control-group">
          <label className="scope-label" style={{ color: "#e74c3c" }}>CH2 POS</label>
          <div className="scope-offset-btns">
            <button className="scope-offset-btn" onClick={() => nudgeOffset("ch2YOffset", 0.5)} title="Shift CH2 Up">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
            </button>
            <span className="scope-offset-val">{scopeSettings.ch2YOffset.toFixed(1)}</span>
            <button className="scope-offset-btn" onClick={() => nudgeOffset("ch2YOffset", -0.5)} title="Shift CH2 Down">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Row 4: X-Offset (horizontal scroll) */}
      <div className="scope-controls-row">
        <div className="scope-control-group" style={{ flex: 1 }}>
          <label className="scope-label">X POSITION</label>
          <div className="scope-offset-btns">
            <button className="scope-offset-btn" onClick={() => nudgeOffset("xOffset", -0.5)} title="Pan Left">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="scope-offset-val">{scopeSettings.xOffset.toFixed(1)}</span>
            <button className="scope-offset-btn" onClick={() => nudgeOffset("xOffset", 0.5)} title="Pan Right">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <button className="scope-offset-btn scope-reset-btn"
              onClick={() => setScopeSettings({ ch1YOffset: 0, ch2YOffset: 0, xOffset: 0 })} title="Zero Alignment">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Row 5: Run/Stop + Single */}
      <div className="scope-controls-row scope-btn-row">
        <button
          className={`scope-btn ${scopeSettings.running ? "scope-btn-running" : "scope-btn-stopped"}`}
          onClick={() => setScopeSettings({ running: !scopeSettings.running })}>
          <span className="btn-indicator-dot" />
          <span>{scopeSettings.running ? "STOP" : "RUN"}</span>
        </button>
        <button className="scope-btn scope-btn-single"
          onClick={() => { setScopeSettings({ running: true }); setTimeout(() => setScopeSettings({ running: false }), 50); }}>
          <span className="btn-indicator-dot" />
          <span>SINGLE</span>
        </button>
      </div>
    </div>
  );
}
