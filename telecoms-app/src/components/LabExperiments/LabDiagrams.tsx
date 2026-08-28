/**
 * LabDiagrams — Clean SVG block diagrams for each lab experiment,
 * matching the EMONA textbook style (black rectangles, labeled arrows, white background).
 */

interface DiagramProps {
  width?: number;
  height?: number;
}

/* ─── Shared helpers ──────────────────────────────────────────────── */
function Block({ x, y, w, h, label, sub }: { x: number; y: number; w: number; h: number; label: string; sub?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#fff" stroke="#111" strokeWidth={1.8} rx={2} />
      <text x={x + w / 2} y={y + h / 2 + (sub ? -4 : 4)} textAnchor="middle" fontSize="11" fontWeight="700" fill="#111" fontFamily="'Inter', sans-serif">{label}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontSize="9" fontWeight="600" fill="#555" fontFamily="'Inter', sans-serif">{sub}</text>}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, label, dashed }: { x1: number; y1: number; x2: number; y2: number; label?: string; dashed?: boolean }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  // Arrow head
  const headLen = 7;
  const ax = x2 - ux * headLen;
  const ay = y2 - uy * headLen;
  const px = -uy * 4;
  const py = ux * 4;

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#111" strokeWidth={1.5} strokeDasharray={dashed ? "5 3" : undefined} />
      <polygon points={`${x2},${y2} ${ax + px},${ay + py} ${ax - px},${ay - py}`} fill="#111" />
      {label && (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#333" fontFamily="'Inter', sans-serif">{label}</text>
      )}
    </g>
  );
}

function ScopeLabel({ x, y, ch }: { x: number; y: number; ch: string }) {
  return (
    <g>
      <text x={x} y={y} fontSize="10" fontWeight="700" fill="#111" fontFamily="'Inter', sans-serif">To Scope</text>
      <text x={x} y={y + 13} fontSize="9" fontWeight="800" fill="#d35400" fontFamily="'JetBrains Mono', monospace">{ch}</text>
    </g>
  );
}

function SectionLabel({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize="10" fontWeight="700" fill="#888" fontFamily="'Inter', sans-serif" fontStyle="italic">{label}</text>
  );
}

function DashedDivider({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return <line x1={x} y1={y1} x2={x} y2={y2} stroke="#bbb" strokeWidth={1} strokeDasharray="6 4" />;
}

/* ═══════════════════════════════════════════════════════════════════ */
/* LAB 1: Sampling & Reconstruction                                  */
/* ═══════════════════════════════════════════════════════════════════ */
export function Lab1Diagram({ width = 600, height = 260 }: DiagramProps) {
  return (
    <svg viewBox="0 0 600 260" width={width} height={height} className="lab-diagram-svg">
      <rect width="600" height="260" fill="#fefefe" rx={4} />

      {/* Section labels */}
      <SectionLabel x={160} y={18} label="Part A: Sampling" />
      <SectionLabel x={400} y={18} label="Part B: Reconstruction" />
      <DashedDivider x={280} y1={8} y2={200} />

      {/* MASTER SIGNALS */}
      <Block x={20} y={50} w={100} h={50} label="MASTER" sub="SIGNALS" />

      {/* DUAL ANALOG SWITCH */}
      <Block x={190} y={50} w={110} h={50} label="DUAL ANALOG" sub="SWITCH" />

      {/* TUNEABLE LPF */}
      <Block x={370} y={50} w={100} h={50} label="TUNEABLE" sub="LPF" />

      {/* Arrows */}
      <Arrow x1={120} y1={65} x2={190} y2={65} label="2kHz SINE" />
      <Arrow x1={120} y1={85} x2={190} y2={85} label="8kHz DIG" />
      <Arrow x1={300} y1={75} x2={370} y2={75} label="OUT" />
      <Arrow x1={470} y1={75} x2={540} y2={75} />
      <ScopeLabel x={542} y={72} ch="CH1" />

      {/* CH2 - direct from Master Signals */}
      <line x1={70} y1={100} x2={70} y2={140} stroke="#111" strokeWidth={1.5} />
      <Arrow x1={70} y1={140} x2={540} y2={140} />
      <ScopeLabel x={542} y={137} ch="CH2" />
      <text x={300} y={134} textAnchor="middle" fontSize="8" fill="#555" fontFamily="'Inter', sans-serif">2kHz SINE (original message)</text>

      {/* Part C: VCO */}
      <rect x={10} y={175} width={290} height={70} fill="none" stroke="#bbb" strokeWidth={1} strokeDasharray="6 4" rx={4} />
      <SectionLabel x={155} y={190} label="Part C: Variable Sampling (Aliasing)" />
      <Block x={30} y={200} w={70} h={35} label="VCO" />
      <Arrow x1={100} y1={217} x2={220} y2={85} label="DIGITAL" dashed />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* LAB 2: PCM Encoding                                               */
/* ═══════════════════════════════════════════════════════════════════ */
export function Lab2Diagram({ width = 600, height = 260 }: DiagramProps) {
  return (
    <svg viewBox="0 0 600 260" width={width} height={height} className="lab-diagram-svg">
      <rect width="600" height="260" fill="#fefefe" rx={4} />

      <SectionLabel x={300} y={18} label="PCM Encoding — Parts A, B, C" />

      {/* MASTER SIGNALS */}
      <Block x={20} y={50} w={100} h={50} label="MASTER" sub="SIGNALS" />

      {/* PCM ENCODER */}
      <Block x={250} y={40} w={110} h={70} label="PCM" sub="ENCODER" />

      {/* Arrows: CLK and FS */}
      <Arrow x1={120} y1={65} x2={250} y2={55} label="2kHz DIG → CLK" />
      <Arrow x1={120} y1={85} x2={250} y2={95} label="8kHz DIG → FS" />

      {/* PCM DATA output */}
      <Arrow x1={360} y1={70} x2={500} y2={70} label="PCM DATA" />
      <ScopeLabel x={505} y={67} ch="CH1" />

      {/* FS to CH2 */}
      <line x1={305} y1={110} x2={305} y2={150} stroke="#111" strokeWidth={1.5} />
      <Arrow x1={305} y1={150} x2={500} y2={150} label="8kHz FS" />
      <ScopeLabel x={505} y={147} ch="CH2" />

      {/* Part B: Variable DCV input */}
      <rect x={10} y={175} width={200} height={70} fill="none" stroke="#bbb" strokeWidth={1} strokeDasharray="6 4" rx={4} />
      <SectionLabel x={110} y={190} label="Part B: Add Variable DC" />
      <Block x={30} y={200} w={90} h={35} label="VARIABLE" sub="DCV" />
      <Arrow x1={120} y1={217} x2={265} y2={110} label="VDC → IN1" dashed />

      {/* Part C: 2kHz SINE input */}
      <rect x={220} y={175} width={200} height={70} fill="none" stroke="#bbb" strokeWidth={1} strokeDasharray="6 4" rx={4} />
      <SectionLabel x={320} y={190} label="Part C: Add AC Sine" />
      <text x={320} y={232} textAnchor="middle" fontSize="9" fill="#555" fontFamily="'Inter', sans-serif">2kHz SINE → INPUT 1</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* LAB 3: PCM Decoding                                               */
/* ═══════════════════════════════════════════════════════════════════ */
export function Lab3Diagram({ width = 600, height = 280 }: DiagramProps) {
  return (
    <svg viewBox="0 0 600 280" width={width} height={height} className="lab-diagram-svg">
      <rect width="600" height="280" fill="#fefefe" rx={4} />

      <SectionLabel x={300} y={18} label="PCM Encode–Decode Loop — Parts A, B, C" />
      <DashedDivider x={280} y1={28} y2={220} />

      {/* MASTER SIGNALS */}
      <Block x={15} y={45} w={80} h={45} label="MASTER" sub="SIGNALS" />

      {/* PCM ENCODER */}
      <Block x={140} y={40} w={100} h={55} label="PCM" sub="ENCODER" />

      {/* PCM DECODER */}
      <Block x={330} y={40} w={100} h={55} label="PCM" sub="DECODER" />

      {/* Arrows: Encoder connections */}
      <Arrow x1={95} y1={57} x2={140} y2={57} label="CLK" />
      <Arrow x1={95} y1={77} x2={140} y2={77} label="FS" />

      {/* PCM DATA from encoder to decoder */}
      <Arrow x1={240} y1={60} x2={330} y2={60} label="PCM DATA" />

      {/* Stolen CLK/FS to decoder */}
      <text x={380} y={108} textAnchor="middle" fontSize="7.5" fill="#555" fontFamily="'Inter', sans-serif">"Stolen" CLK & FS</text>
      <Arrow x1={95} y1={57} x2={95} y2={120} />
      <Arrow x1={95} y1={120} x2={345} y2={120} />
      <line x1={345} y1={120} x2={345} y2={95} stroke="#111" strokeWidth={1.5} />

      {/* Message input */}
      <line x1={50} y1={90} x2={50} y2={140} stroke="#111" strokeWidth={1.5} />
      <Arrow x1={50} y1={140} x2={155} y2={95} label="2kHz SINE" />

      {/* Part A: Decoder OUT to scope */}
      <Arrow x1={430} y1={65} x2={530} y2={65} label="OUTPUT" />
      <ScopeLabel x={535} y={62} ch="CH1" />

      {/* CH2 */}
      <Arrow x1={50} y1={140} x2={530} y2={170} />
      <ScopeLabel x={535} y={167} ch="CH2" />
      <text x={290} y={162} textAnchor="middle" fontSize="8" fill="#555" fontFamily="'Inter', sans-serif">2kHz SINE (original)</text>

      {/* Part B: Buffer */}
      <rect x={10} y={200} width={280} height={65} fill="none" stroke="#bbb" strokeWidth={1} strokeDasharray="6 4" rx={4} />
      <SectionLabel x={150} y={215} label="Part B: Listen via Buffer" />
      <Block x={50} y={225} w={70} h={30} label="BUFFER" />
      <text x={160} y={243} fontSize="8" fill="#555" fontFamily="'Inter', sans-serif">Decoder OUT → Buffer IN → Headphones</text>

      {/* Part C: LPF */}
      <rect x={300} y={200} width={280} height={65} fill="none" stroke="#bbb" strokeWidth={1} strokeDasharray="6 4" rx={4} />
      <SectionLabel x={440} y={215} label="Part C: Reconstruct via LPF" />
      <Block x={340} y={225} w={90} h={30} label="TUNEABLE LPF" />
      <text x={480} y={243} fontSize="8" fill="#555" fontFamily="'Inter', sans-serif">Smooth PAM → Clean sine</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* LAB 4: Bandwidth Limiting & Signal Restoration                    */
/* ═══════════════════════════════════════════════════════════════════ */
export function Lab4Diagram({ width = 600, height = 260 }: DiagramProps) {
  return (
    <svg viewBox="0 0 600 260" width={width} height={height} className="lab-diagram-svg">
      <rect width="600" height="260" fill="#fefefe" rx={4} />

      {/* Section dividers */}
      <SectionLabel x={100} y={18} label="Signal Modelling" />
      <SectionLabel x={300} y={18} label="BW Limited Channel" />
      <SectionLabel x={500} y={18} label="Restoration" />
      <DashedDivider x={195} y1={8} y2={180} />
      <DashedDivider x={400} y1={8} y2={180} />

      {/* MASTER SIGNALS (2kHz clock) */}
      <Block x={15} y={45} w={70} h={40} label="2kHz" sub="CLOCK" />

      {/* SEQUENCE GENERATOR */}
      <Block x={110} y={40} w={75} h={50} label="SEQUENCE" sub="GENERATOR" />

      {/* TUNEABLE LPF (Channel) */}
      <Block x={250} y={45} w={100} h={45} label="TUNEABLE" sub="LPF" />

      {/* COMPARATOR */}
      <Block x={430} y={45} w={90} h={45} label="COMPARATOR" />

      {/* VARIABLE DCV */}
      <Block x={430} y={130} w={90} h={35} label="VARIABLE" sub="DCV" />

      {/* Arrows */}
      <Arrow x1={85} y1={65} x2={110} y2={65} label="CLK" />
      <Arrow x1={185} y1={60} x2={250} y2={60} label="LINE CODE" />
      <Arrow x1={350} y1={67} x2={430} y2={67} label="" />
      <Arrow x1={520} y1={67} x2={570} y2={67} />
      <ScopeLabel x={573} y={64} ch="CH2" />

      {/* SYNC down to EXT TRIG */}
      <line x1={148} y1={90} x2={148} y2={120} stroke="#111" strokeWidth={1.5} />
      <text x={148} y={115} textAnchor="middle" fontSize="8" fontWeight="600" fill="#333" fontFamily="'Inter', sans-serif">SYNC</text>

      {/* Line code direct to CH1 */}
      <line x1={217} y1={60} x2={217} y2={170} stroke="#111" strokeWidth={1.5} />
      <Arrow x1={217} y1={170} x2={570} y2={170} />
      <ScopeLabel x={573} y={167} ch="CH1" />
      <text x={390} y={164} textAnchor="middle" fontSize="8" fill="#555" fontFamily="'Inter', sans-serif">Original digital signal</text>

      {/* REF from VDC to Comparator */}
      <Arrow x1={475} y1={130} x2={475} y2={90} label="REF" />

      {/* Part B label */}
      <rect x={110} y={195} width={160} height={50} fill="none" stroke="#bbb" strokeWidth={1} strokeDasharray="6 4" rx={4} />
      <SectionLabel x={190} y={210} label="Part B: Eye Diagram" />
      <text x={190} y={230} textAnchor="middle" fontSize="8" fill="#555" fontFamily="'Inter', sans-serif">SYNC → EXT TRIG on scope</text>

      {/* Part C label */}
      <rect x={400} y={195} width={180} height={50} fill="none" stroke="#bbb" strokeWidth={1} strokeDasharray="6 4" rx={4} />
      <SectionLabel x={490} y={210} label="Part C: Signal Restoration" />
      <text x={490} y={230} textAnchor="middle" fontSize="8" fill="#555" fontFamily="'Inter', sans-serif">Comparator slices → clean pulses</text>
    </svg>
  );
}

/** Map lab IDs to their diagram components */
export const LAB_DIAGRAMS: Record<string, React.FC<DiagramProps>> = {
  lab1: Lab1Diagram,
  lab2: Lab2Diagram,
  lab3: Lab3Diagram,
  lab4: Lab4Diagram,
};
