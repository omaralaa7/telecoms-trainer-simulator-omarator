import ScopeCanvas from "./ScopeCanvas";
import ScopeControls from "./ScopeControls";

/**
 * Oscilloscope — Vertical layout for right-side column:
 * scope display on top, controls below.
 */
export default function Oscilloscope() {
  return (
    <div className="oscilloscope">
      <div className="scope-header">
        <div className="scope-title-badge">
          <span className="scope-power-dot" />
          OSCILLOSCOPE
        </div>
      </div>
      <div className="scope-display">
        <ScopeCanvas width={600} height={400} />
      </div>
      <ScopeControls />
    </div>
  );
}
