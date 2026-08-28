import { usePatchStore } from "../../store/patchStore";
import type { TriggerSource } from "../../types";

/**
 * Scope Controls — Compact vertical layout with offset controls
 */
export default function ScopeControls() {
  const scopeSettings = usePatchStore((s) => s.scopeSettings);
  const setScopeSettings = usePatchStore((s) => s.setScopeSettings);

  const timebaseOptions = [
    { value: 0.005, label: "5 µs" },
    { value: 0.01, label: "10 µs" },
    { value: 0.02, label: "20 µs" },
    { value: 0.05, label: "50 µs" },
    { value: 0.1, label: "0.1 ms" },
    { value: 0.2, label: "0.2 ms" },
    { value: 0.5, label: "0.5 ms" },
    { value: 1, label: "1 ms" },
    { value: 2, label: "2 ms" },
    { value: 5, label: "5 ms" },
    { value: 10, label: "10 ms" },
    { value: 20, label: "20 ms" },
  ];
  const vDivOptions = [0.2, 0.5, 1, 2, 5];

  const nudgeOffset = (key: "ch1YOffset" | "ch2YOffset" | "xOffset", delta: number) => {
    setScopeSettings({ [key]: Math.round((scopeSettings[key] + delta) * 10) / 10 });
  };

  return (
    <div className="scope-controls scope-controls-vertical">
      {/* Row 1: Timebase + Trigger */}
      <div className="scope-controls-row">
        <div className="scope-control-group">
          <label className="scope-label" style={{ color: "#a0aec0" }}>TIME/DIV</label>
          <select className="scope-select"
            value={scopeSettings.timebaseMs}
            onChange={(e) => setScopeSettings({ timebaseMs: parseFloat(e.target.value) })}>
            {timebaseOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="scope-control-group">
          <label className="scope-label" style={{ color: "#f1c40f" }}>TRIGGER</label>
          <select className="scope-select"
            style={{ borderColor: "rgba(241, 196, 15, 0.3)" }}
            value={scopeSettings.triggerSource}
            onChange={(e) => setScopeSettings({ triggerSource: e.target.value as TriggerSource })}>
            <option value="ch1">CH1</option>
            <option value="ch2">CH2</option>
            <option value="ext">EXT</option>
            <option value="none">FREE</option>
          </select>
        </div>
      </div>

      {/* Row 2: CH1 V/div + Position (Uniform ORANGE #ff9f1c) */}
      <div className="scope-controls-row">
        <div className="scope-control-group">
          <label className="scope-label" style={{ color: "#ff9f1c" }}>CH1 V/DIV</label>
          <select className="scope-select scope-select-ch1"
            value={scopeSettings.ch1VPerDiv}
            onChange={(e) => setScopeSettings({ ch1VPerDiv: parseFloat(e.target.value) })}>
            {vDivOptions.map((v) => (
              <option key={v} value={v}>{v} V</option>
            ))}
          </select>
        </div>
        <div className="scope-control-group">
          <label className="scope-label" style={{ color: "#ff9f1c" }}>CH1 POS</label>
          <div className="scope-offset-btns">
            <button className="scope-offset-btn ch1" onClick={() => nudgeOffset("ch1YOffset", 0.5)} title="Shift CH1 Up">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
            </button>
            <span className="scope-offset-val ch1">{scopeSettings.ch1YOffset.toFixed(1)}</span>
            <button className="scope-offset-btn ch1" onClick={() => nudgeOffset("ch1YOffset", -0.5)} title="Shift CH1 Down">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: CH2 V/div + Position (Uniform BLUE #00b4d8) */}
      <div className="scope-controls-row">
        <div className="scope-control-group">
          <label className="scope-label" style={{ color: "#00b4d8" }}>CH2 V/DIV</label>
          <select className="scope-select scope-select-ch2"
            value={scopeSettings.ch2VPerDiv}
            onChange={(e) => setScopeSettings({ ch2VPerDiv: parseFloat(e.target.value) })}>
            {vDivOptions.map((v) => (
              <option key={v} value={v}>{v} V</option>
            ))}
          </select>
        </div>
        <div className="scope-control-group">
          <label className="scope-label" style={{ color: "#00b4d8" }}>CH2 POS</label>
          <div className="scope-offset-btns">
            <button className="scope-offset-btn ch2" onClick={() => nudgeOffset("ch2YOffset", 0.5)} title="Shift CH2 Up">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
            </button>
            <span className="scope-offset-val ch2">{scopeSettings.ch2YOffset.toFixed(1)}</span>
            <button className="scope-offset-btn ch2" onClick={() => nudgeOffset("ch2YOffset", -0.5)} title="Shift CH2 Down">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Row 4: X-Offset (horizontal scroll) */}
      <div className="scope-controls-row">
        <div className="scope-control-group" style={{ flex: 1 }}>
          <label className="scope-label" style={{ color: "#a0aec0" }}>X POSITION</label>
          <div className="scope-offset-btns">
            <button className="scope-offset-btn" onClick={() => nudgeOffset("xOffset", -0.5)} title="Pan Left">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="scope-offset-val xpos">{scopeSettings.xOffset.toFixed(1)}</span>
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

      {/* Row 5: 2 Buttons — [RUN / STOP Action Toggle] and [SINGLE] */}
      <div className="scope-controls-row scope-btn-row">
        <button
          className={`scope-action-btn ${scopeSettings.running ? "scope-btn-stop" : "scope-btn-run"}`}
          onClick={() => setScopeSettings({ running: !scopeSettings.running })}
          title={scopeSettings.running ? "Click to stop / freeze waveform" : "Click to run / start live sweep"}
        >
          {scopeSettings.running ? (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="4" width="4.5" height="16" rx="1" />
                <rect x="14.5" y="4" width="4.5" height="16" rx="1" />
              </svg>
              <span>STOP</span>
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>RUN</span>
            </>
          )}
        </button>

        <button
          className="scope-action-btn scope-btn-single"
          onClick={() => {
            setScopeSettings({ running: true });
            setTimeout(() => setScopeSettings({ running: false }), 50);
          }}
          title="Capture single waveform sweep and freeze"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 16h5v-8h8v8h5" />
          </svg>
          <span>SINGLE</span>
        </button>
      </div>
    </div>
  );
}
