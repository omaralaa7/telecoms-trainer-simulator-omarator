import { useState, useCallback, useEffect, useRef } from "react";
import { usePatchStore } from "../../store/patchStore";
import { LAB_EXPERIMENTS } from "../../data/labExperiments";
import type { LabExperiment, LabPart } from "../../types";

/**
 * LabExperimentsHub — Dropdown trigger + slide-out Lab Guide Panel
 */
export default function LabExperimentsHub() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedLab, setSelectedLab] = useState<LabExperiment | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadedPartId, setLoadedPartId] = useState<string | null>(null);
  const [guideActive, setGuideActive] = useState(false);
  const [guidePartId, setGuidePartId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadPreset = usePatchStore((s) => s.loadPreset);
  const setGuideHighlights = usePatchStore((s) => s.setGuideHighlights);
  const clearGuide = usePatchStore((s) => s.clearGuide);
  const guideStep = usePatchStore((s) => s.guideStep);
  const advanceGuide = usePatchStore((s) => s.advanceGuide);
  const wires = usePatchStore((s) => s.wires);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  // Guide mode: highlight next wire pair
  useEffect(() => {
    if (!guideActive || !guidePartId || !selectedLab) return;
    const part = selectedLab.parts.find((p) => p.id === guidePartId);
    if (!part) return;

    if (guideStep >= part.wires.length) {
      // All wires placed
      clearGuide();
      setGuideActive(false);
      setGuidePartId(null);
      return;
    }

    const wire = part.wires[guideStep];
    setGuideHighlights([wire.fromPortId, wire.toPortId], guideStep);
  }, [guideActive, guidePartId, guideStep, selectedLab, setGuideHighlights, clearGuide]);

  // Auto-advance guide when a wire is added
  useEffect(() => {
    if (!guideActive || !guidePartId || !selectedLab) return;
    const part = selectedLab.parts.find((p) => p.id === guidePartId);
    if (!part) return;

    if (guideStep >= part.wires.length) return;

    const expectedWire = part.wires[guideStep];
    const connected = wires.some(
      (w) =>
        (w.fromPortId === expectedWire.fromPortId && w.toPortId === expectedWire.toPortId) ||
        (w.fromPortId === expectedWire.toPortId && w.toPortId === expectedWire.fromPortId)
    );
    if (connected) {
      advanceGuide();
    }
  }, [wires, guideActive, guidePartId, guideStep, selectedLab, advanceGuide]);

  const handleSelectLab = useCallback((lab: LabExperiment) => {
    setSelectedLab(lab);
    setDropdownOpen(false);
    setPanelOpen(true);
    setLoadedPartId(null);
    setGuideActive(false);
    setGuidePartId(null);
    clearGuide();
  }, [clearGuide]);

  const handleLoadWiring = useCallback(
    (part: LabPart) => {
      loadPreset(part.wires, part.params, part.scopeSettings);
      setLoadedPartId(part.id);
      setGuideActive(false);
      setGuidePartId(null);
      clearGuide();
    },
    [loadPreset, clearGuide]
  );

  const handleGuideMode = useCallback(
    (part: LabPart) => {
      // Reset wires and start guide
      usePatchStore.getState().resetPatch();

      // Apply params and scope settings
      if (part.params) {
        const currentParams = usePatchStore.getState().params;
        const mergedParams = { ...currentParams };
        for (const [blockId, blockParams] of Object.entries(part.params)) {
          mergedParams[blockId] = { ...(mergedParams[blockId] || {}), ...blockParams };
        }
        usePatchStore.setState({ params: mergedParams });
      }
      if (part.scopeSettings) {
        const currentScope = usePatchStore.getState().scopeSettings;
        usePatchStore.setState({ scopeSettings: { ...currentScope, ...part.scopeSettings } });
      }

      setGuidePartId(part.id);
      setGuideActive(true);
      setLoadedPartId(null);

      // Start at step 0
      const firstWire = part.wires[0];
      if (firstWire) {
        setGuideHighlights([firstWire.fromPortId, firstWire.toPortId], 0);
      }
    },
    [setGuideHighlights]
  );

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    setGuideActive(false);
    setGuidePartId(null);
    clearGuide();
  }, [clearGuide]);

  return (
    <>
      {/* ─── Dropdown Trigger ─────────────────────── */}
      <div className="lab-dropdown-container" ref={dropdownRef}>
        <button
          className="lab-trigger-btn"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          title="Open Lab Experiments"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span className="lab-trigger-label">LABS</span>
          <svg className={`lab-chevron ${dropdownOpen ? "open" : ""}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* ─── Dropdown Menu ─────────────────────── */}
        {dropdownOpen && (
          <div className="lab-dropdown-menu">
            <div className="lab-dropdown-header">LAB EXPERIMENTS</div>
            {LAB_EXPERIMENTS.map((lab) => (
              <button
                key={lab.id}
                className={`lab-dropdown-item ${selectedLab?.id === lab.id ? "active" : ""}`}
                onClick={() => handleSelectLab(lab)}
              >
                <span className="lab-item-number">Lab {lab.labNumber}</span>
                <span className="lab-item-title">{lab.title}</span>
                <span className="lab-item-exp">Exp {lab.expNumber}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Slide-Out Lab Guide Panel ─────────────── */}
      {panelOpen && selectedLab && (
        <>
          <div className="lab-panel-backdrop" onClick={handleClosePanel} />
          <div className="lab-guide-panel">
            {/* Panel Header */}
            <div className="lab-panel-header">
              <div className="lab-panel-title-group">
                <span className="lab-panel-badge">Lab {selectedLab.labNumber}</span>
                <h2 className="lab-panel-title">{selectedLab.title}</h2>
              </div>
              <button className="lab-panel-close" onClick={handleClosePanel} title="Close lab panel">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Experiment Number & Description */}
            <div className="lab-panel-meta">
              <span className="lab-meta-exp">Experiment {selectedLab.expNumber}</span>
              <p className="lab-meta-desc">{selectedLab.description}</p>
            </div>

            {/* Parts List */}
            <div className="lab-parts-list">
              {selectedLab.parts.map((part, index) => {
                const isLoaded = loadedPartId === part.id;
                const isGuiding = guideActive && guidePartId === part.id;
                const guideProgress = isGuiding
                  ? `${Math.min(guideStep, part.wires.length)} / ${part.wires.length}`
                  : null;

                return (
                  <div key={part.id} className={`lab-part-card ${isLoaded ? "loaded" : ""} ${isGuiding ? "guiding" : ""}`}>
                    <div className="lab-part-header">
                      <span className="lab-part-step">{index + 1}</span>
                      <h3 className="lab-part-title">{part.title}</h3>
                    </div>
                    <p className="lab-part-desc">{part.description}</p>

                    <div className="lab-part-info">
                      <span className="lab-part-wire-count">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        {part.wires.length} wires
                      </span>
                      {part.scopeSettings && (
                        <span className="lab-part-scope-hint">
                          {part.scopeSettings.timebaseMs}ms/div
                        </span>
                      )}
                    </div>

                    <div className="lab-part-actions">
                      <button
                        className={`lab-action-btn lab-load-btn ${isLoaded ? "btn-loaded" : ""}`}
                        onClick={() => handleLoadWiring(part)}
                        title="Instantly load all wires onto the board"
                      >
                        {isLoaded ? (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>LOADED</span>
                          </>
                        ) : (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                            <span>LOAD WIRING</span>
                          </>
                        )}
                      </button>

                      <button
                        className={`lab-action-btn lab-guide-btn ${isGuiding ? "btn-guiding" : ""}`}
                        onClick={() => isGuiding ? (() => { setGuideActive(false); setGuidePartId(null); clearGuide(); })() : handleGuideMode(part)}
                        title={isGuiding ? "Stop guided wiring" : "Step-by-step guided wiring with glowing jacks"}
                      >
                        {isGuiding ? (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                              <rect x="5" y="4" width="4.5" height="16" rx="1" />
                              <rect x="14.5" y="4" width="4.5" height="16" rx="1" />
                            </svg>
                            <span>STOP ({guideProgress})</span>
                          </>
                        ) : (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="22" y1="12" x2="18" y2="12" />
                              <line x1="6" y1="12" x2="2" y2="12" />
                              <line x1="12" y1="6" x2="12" y2="2" />
                              <line x1="12" y1="22" x2="12" y2="18" />
                            </svg>
                            <span>GUIDE</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
