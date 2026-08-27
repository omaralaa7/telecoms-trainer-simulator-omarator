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
          <span className="logo-icon">⚡</span>
          <h1>Telecoms-Trainer <span className="highlight">101</span> Simulator</h1>
        </div>
        <div className="app-actions">
          <button
            className={`start-btn ${audioStarted ? "power-off-btn" : ""}`}
            onClick={togglePower}
            disabled={loading}
            style={audioStarted ? { background: "#c0392b", color: "#fff", borderColor: "#e74c3c" } : {}}
          >
            {loading ? (
              <><span className="spinner" /> Initializing...</>
            ) : audioStarted ? (
              <>⏻ Power Off</>
            ) : (
              <>⚡ Power On</>
            )}
          </button>
          {audioStarted && (
            <div className="status-badge running">
              <span className="status-dot" /> Running
            </div>
          )}
          <button className="reset-btn" onClick={() => usePatchStore.getState().resetPatch()}>
            ↺ Reset Wires
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
        <span>EMONA BiSKIT ETT-101 Virtual Simulator</span>
        <span className="footer-sep">·</span>
        <span>Experiment 4B: Bandwidth Limiting of Digital Signals</span>
      </footer>
    </div>
  );
}

export default App;
