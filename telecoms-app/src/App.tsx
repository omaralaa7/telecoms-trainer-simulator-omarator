import { useEffect, useState, useCallback } from "react";
import PatchPanel from "./components/PatchPanel/PatchPanel";
import Oscilloscope from "./components/Oscilloscope/Oscilloscope";
import { audioEngine } from "./audio/AudioEngine";
import { usePatchStore } from "./store/patchStore";
import "./App.css";

function App() {
  const wires = usePatchStore((s) => s.wires);
  const [audioStarted, setAudioStarted] = useState(false);
  const [loading, setLoading] = useState(false);

  const togglePower = useCallback(async () => {
    if (audioStarted) {
      audioEngine.destroy();
      setAudioStarted(false);
      return;
    }
    setLoading(true);
    try {
      await audioEngine.init();
      await audioEngine.resume();
      setAudioStarted(true);
    } catch (err) {
      console.error("Failed to start audio engine:", err);
    }
    setLoading(false);
  }, [audioStarted]);

  useEffect(() => {
    if (audioStarted) {
      audioEngine.connectWires(wires);
    }
  }, [wires, audioStarted]);

  useEffect(() => {
    return () => { audioEngine.destroy(); };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h4l3-9 4 18 3-9h6" />
            </svg>
          </div>
          <div className="app-title-group">
            <h1>Telecoms-Trainer <span className="highlight">101</span></h1>
            <span className="app-subtitle">VIRTUAL DSP LAB & WORKSTATION</span>
          </div>
        </div>

        <div className="app-actions">
          <div className="telemetry-badge">
            <span className="telemetry-label">WIRES:</span>
            <span className="telemetry-val">{wires.length}</span>
          </div>

          <button
            className={`primary-power-btn ${audioStarted ? "power-btn-off" : "power-btn-on"}`}
            onClick={togglePower}
            disabled={loading}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
            <span>{loading ? "INITIALIZING..." : audioStarted ? "POWER OFF" : "POWER ON"}</span>
          </button>

          <button className="reset-patch-btn" onClick={() => usePatchStore.getState().resetPatch()} title="Clear all active patch wires">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>RESET WIRES</span>
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="panel-section">
          <PatchPanel />
        </section>
        <section className="scope-section">
          <Oscilloscope />
        </section>
      </main>

      <footer className="app-footer">
        <span className="footer-item">EMONA ETT-101 VIRTUAL TELECOMS TRAINER</span>
        <span className="footer-sep">•</span>
        <span className="footer-item">REAL-TIME DSP SIGNAL ENGINE</span>
        <span className="footer-sep">•</span>
        <span className="footer-item">DUAL-TRACE OSCILLOSCOPE</span>
      </footer>
    </div>
  );
}

export default App;
