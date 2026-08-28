import { useEffect, useState, useCallback } from "react";
import PatchPanel from "./components/PatchPanel/PatchPanel";
import Oscilloscope from "./components/Oscilloscope/Oscilloscope";
import LabExperimentsHub from "./components/LabExperiments/LabExperimentsHub";
import { audioEngine } from "./audio/AudioEngine";
import { usePatchStore } from "./store/patchStore";
import "./App.css";

function App() {
  const wires = usePatchStore((s) => s.wires);
  const undoStack = usePatchStore((s) => s.undoStack);
  const redoStack = usePatchStore((s) => s.redoStack);
  const undo = usePatchStore((s) => s.undo);
  const redo = usePatchStore((s) => s.redo);
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

  // ─── Keyboard Shortcuts: Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo) ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

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
          {/* Lab Experiments Hub */}
          <LabExperimentsHub />

          <div className="telemetry-badge">
            <span className="telemetry-label">WIRES:</span>
            <span className="telemetry-val">{wires.length}</span>
          </div>

          {/* Undo Button */}
          <button
            className={`header-icon-btn undo-btn ${undoStack.length === 0 ? "disabled" : ""}`}
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo last wire action (Ctrl+Z)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>

          {/* Redo Button */}
          <button
            className={`header-icon-btn redo-btn ${redoStack.length === 0 ? "disabled" : ""}`}
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo wire action (Ctrl+Y)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
            </svg>
          </button>

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
