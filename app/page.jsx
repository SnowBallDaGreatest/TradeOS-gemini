"use client";

import { useState, useRef } from "react";
import { Stamp, Loader2, ChevronDown, RotateCcw, AlertTriangle, Upload } from "lucide-react";

const RISK_STYLE = {
 high: { ink: "#632024", label: "HIGH RISK" },
  medium: { ink: "#6f4d38", label: "MEDIUM RISK" },
  low: { ink: "#617891", label: "COMPLIANT" },
};

function jitter(n) {
  const seq = [-2.5, 1.5, -1, 2, -1.8, 1, -2, 2.3, -1.2, 1.8, -2.2, 1.1];
  return seq[(n - 1) % seq.length];
}

export default function TradeOSContractScan() {
  const [stage, setStage] = useState("intake"); // intake | loading | results | error
  const [file, setFile] = useState(null);
  const [home, setHome] = useState("");
  const [targets, setTargets] = useState("");
  const [pillars, setPillars] = useState(null);
  const [meta, setMeta] = useState(null);
  const [openPillar, setOpenPillar] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      setErrorMsg("Please upload a PDF file.");
      return;
    }
    setErrorMsg("");
    setFile(f);
  }

  async function runScan() {
    if (!file || !home || !targets) {
      setErrorMsg("Upload a contract PDF and fill in both jurisdiction fields.");
      return;
    }
    setErrorMsg("");
    setStage("loading");

    try {
      const formData = new FormData();
      formData.append("contract", file);
      formData.append("home", home);
      formData.append("targets", targets);

      const response = await fetch("/api/contract-scan", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Contract scan failed.");

      setPillars(data.pillars || []);
      setMeta(data.meta || null);
      setStage("results");
    } catch (e) {
      setErrorMsg(e.message || "The scan failed to complete. Try again.");
      setStage("error");
    }
  }

  function reset() {
    setStage("intake");
    setFile(null);
    setPillars(null);
    setMeta(null);
    setOpenPillar(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const roadmap = pillars
    ? [...pillars]
        .filter((p) => p.risk !== "low")
        .sort((a, b) => (a.risk === "high" ? -1 : 1) - (b.risk === "high" ? -1 : 1))
        .slice(0, 5)
    : [];

  return (
    <div style={styles.page}>
      <GlobalStyle />
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoRow}>
            <Stamp size={22} color="#d5b893" strokeWidth={1.75} />
            <span style={styles.logoText}>TRADEOS</span>
          </div>
          <span style={styles.headerSub}>Contract Compliance Scan</span>
        </div>
        <div style={styles.headerRule} />
      </header>

      <main style={styles.main}>
        {(stage === "intake" || stage === "loading" || stage === "error") && (
          <section className="to-intake" style={styles.intakeWrap}>
            <div style={styles.intakeCopy}>
              <span style={styles.eyebrow}>CONTRACT DECLARATION</span>
              <h1 style={styles.h1}>
                Upload a contract.
                <br />
                Get all 12 pillars assessed.
              </h1>
              <p style={styles.lede}>
                TradeOS reads the contract text and scores every one of the 12 digital trade
                pillars against it — including pillars the contract doesn't touch, which come
                back flagged as unaddressed rather than silently skipped.
              </p>
            </div>

            <div style={styles.form}>
              <label style={styles.label}>Contract PDF</label>
              <label className="to-input" style={styles.dropzone}>
                <Upload size={18} color="#5C6270" />
                <span style={{ marginLeft: 8 }}>{file ? file.name : "Click to choose a PDF file"}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Home jurisdiction</label>
                  <input
                    className="to-input"
                    style={styles.input}
                    value={home}
                    onChange={(e) => setHome(e.target.value)}
                    placeholder="e.g. India"
                  />
                </div>
                <div style={{ flex: 1.4 }}>
                  <label style={styles.label}>Target jurisdictions</label>
                  <input
                    className="to-input"
                    style={styles.input}
                    value={targets}
                    onChange={(e) => setTargets(e.target.value)}
                    placeholder="e.g. Singapore, Indonesia, EU"
                  />
                </div>
              </div>

              {errorMsg && (
                <div style={styles.errorRow}>
                  <AlertTriangle size={15} color="#632024" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={styles.formActions}>
                <button className="to-btn" style={styles.primaryBtn} onClick={runScan} disabled={stage === "loading"}>
                  {stage === "loading" ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
                      Reading contract…
                    </>
                  ) : (
                    "Scan all 12 pillars"
                  )}
                </button>
              </div>
              <p style={styles.disclaimer}>
                Risk indication only, not legal advice. Have counsel review any flagged clause
                before acting on it.
              </p>
            </div>
          </section>
        )}

        {stage === "results" && pillars && (
          <section style={styles.results}>
            <div style={styles.resultsHead}>
              <div>
                <span style={styles.eyebrow}>
                  CONTRACT MANIFEST{meta?.truncated ? " · TRUNCATED FOR LENGTH" : ""}
                </span>
                <h2 style={styles.h2}>
                  {home} → {targets}
                </h2>
              </div>
              <button className="to-btn" style={styles.ghostBtn} onClick={reset}>
                <RotateCcw size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                New scan
              </button>
            </div>

            <div className="to-grid" style={styles.grid}>
              {pillars.map((p) => {
                const rs = RISK_STYLE[p.risk];
                const isOpen = openPillar === p.n;
                return (
                  <button
                    key={p.n}
                    className="to-card to-stamped"
                    style={{
                      ...styles.card,
                      "--rot": `${jitter(p.n)}deg`,
                      transform: `rotate(${jitter(p.n)}deg)`,
                      borderColor: rs.ink,
                      animationDelay: `${p.n * 0.05}s`,
                    }}
                    onClick={() => setOpenPillar(isOpen ? null : p.n)}
                  >
                    <div style={styles.cardTop}>
                      <span style={styles.pillarCode}>P{String(p.n).padStart(2, "0")}</span>
                      {p.core && <span style={styles.coreTag}>CORE</span>}
                    </div>
                    <div style={{ ...styles.seal, borderColor: rs.ink, color: rs.ink }}>{rs.label}</div>
                    <div style={styles.cardTitle}>{p.title}</div>
                    <div style={{ ...styles.cardChevron, transform: isOpen ? "rotate(180deg)" : "none" }}>
                      <ChevronDown size={14} />
                    </div>
                    {isOpen && (
                      <div style={styles.cardDetail}>
                        {p.excerpt && <p style={styles.cardExcerpt}>"{p.excerpt}"</p>}
                        <p style={styles.cardFinding}>{p.finding}</p>
                        <p style={styles.cardFix}>
                          <strong>Fix:</strong> {p.fix}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={styles.roadmap}>
              <span style={styles.eyebrow}>REMEDIATION ROADMAP — HIGHEST EXPOSURE FIRST</span>
              <ol style={styles.roadmapList}>
                {roadmap.length === 0 && (
                  <li style={styles.roadmapEmpty}>No material gaps found. Every pillar reads compliant.</li>
                )}
                {roadmap.map((r) => (
                  <li key={r.n} style={styles.roadmapItem}>
                    <span style={{ ...styles.roadmapDot, background: RISK_STYLE[r.risk].ink }} />
                    <span style={styles.roadmapPillar}>
                      P{String(r.n).padStart(2, "0")} · {r.title}
                    </span>
                    <span style={styles.roadmapFix}>{r.fix}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}
      </main>

      <footer style={styles.footer}>
        <span>TradeOS — every contract read against all 12 pillars, none skipped.</span>
      </footer>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      .to-input:focus, .to-textarea:focus, .to-btn:focus-visible { outline: 2px solid #6f4d38; outline-offset: 2px; }
      .to-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
      .to-card:hover { transform: translateY(-2px); }
      @keyframes stampIn {
        0% { opacity: 0; transform: scale(1.6) rotate(var(--rot, 0deg)); }
        60% { opacity: 1; transform: scale(0.94) rotate(var(--rot, 0deg)); }
        100% { opacity: 1; transform: scale(1) rotate(var(--rot, 0deg)); }
      }
      .to-stamped { animation: stampIn 0.5s ease-out both; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .to-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
      .to-intake { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
      @media (max-width: 860px) {
        .to-grid { grid-template-columns: repeat(2, 1fr); }
        .to-intake { grid-template-columns: 1fr; }
      }
      @media (max-width: 480px) {
        .to-grid { grid-template-columns: 1fr; }
      }
      @media (prefers-reduced-motion: reduce) {
        .to-stamped { animation: none; }
        .to-card:hover { transform: none; }
      }
    `}</style>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#25344f", color: "#d5b893", fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", display: "flex", flexDirection: "column" },
  header: { padding: "28px 24px 0" },
  headerInner: { display: "flex", alignItems: "baseline", justifyContent: "space-between", maxWidth: 980, margin: "0 auto", flexWrap: "wrap", gap: 8 },
  logoRow: { display: "flex", alignItems: "center", gap: 10 },
  logoText: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: "0.12em", color: "#d5b893" },
  headerSub: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 11, letterSpacing: "0.08em", color: "#95bae2" },
  headerRule: { maxWidth: 980, margin: "18px auto 0", borderTop: "1px solid #617891", height: 0 },
  main: { flex: 1, padding: "40px 24px 60px" },
  intakeWrap: { maxWidth: 980, margin: "0 auto" },
  intakeCopy: { display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 },
  eyebrow: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 11, letterSpacing: "0.14em", color: "#95bae2" },
  h1: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontWeight: 600, fontSize: 32, lineHeight: 1.15, margin: 0, color: "#d5b893" },
  h2: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontWeight: 600, fontSize: 24, margin: "4px 0 0", color: "#d5b893" },
  lede: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 15, lineHeight: 1.6, color: "#95bae2", maxWidth: 420 },
  form: { background: "#d5b893", color: "#25344f", borderRadius: 4, padding: 28, display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 20px 50px rgba(37,52,79,0.35)" },
  label: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 10.5, letterSpacing: "0.08em", color: "#6f4d38", marginTop: 14, marginBottom: 4, textTransform: "uppercase" },
  input: { border: "1px solid #617891", borderRadius: 2, padding: "10px 12px", fontSize: 14, fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", background: "#f0e4d0", color: "#25344f" },
  dropzone: { border: "1.5px dashed #617891", borderRadius: 2, padding: "14px 12px", fontSize: 13.5, fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", background: "#f0e4d0", color: "#6f4d38", display: "flex", alignItems: "center", cursor: "pointer" },
  formRow: { display: "flex", gap: 14 },
  errorRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#632024", marginTop: 10 },
  formActions: { display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" },
  primaryBtn: { background: "#25344f", color: "#d5b893", border: "none", borderRadius: 2, padding: "12px 20px", fontSize: 13.5, fontWeight: 600, letterSpacing: "0.02em", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif" },
  ghostBtn: { background: "transparent", color: "#25344f", border: "1px solid #25344f", borderRadius: 2, padding: "12px 18px", fontSize: 13.5, cursor: "pointer", fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif" },
  disclaimer: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 11.5, color: "#6f4d38", marginTop: 14, lineHeight: 1.5 },
  results: { maxWidth: 1080, margin: "0 auto" },
  resultsHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 28 },
  grid: {},
  card: { background: "#d5b893", color: "#25344f", border: "2px solid", borderRadius: 3, padding: "16px 14px 14px", textAlign: "left", cursor: "pointer", fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", position: "relative", boxShadow: "0 8px 20px rgba(37,52,79,0.25)" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  pillarCode: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 12, color: "#6f4d38", letterSpacing: "0.05em" },
  coreTag: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 9, background: "#25344f", color: "#d5b893", padding: "2px 6px", borderRadius: 2, letterSpacing: "0.08em" },
  seal: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", border: "1.5px dashed", borderRadius: 2, padding: "4px 0", textAlign: "center", margin: "12px 0 10px" },
  cardTitle: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 15, fontWeight: 600, lineHeight: 1.25, color: "#25344f" },
  cardChevron: { position: "absolute", top: 14, right: 12, color: "#6f4d38" },
  cardDetail: { marginTop: 12, paddingTop: 12, borderTop: "1px solid #617891", display: "flex", flexDirection: "column", gap: 6 },
  cardExcerpt: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 12, fontStyle: "italic", margin: 0, color: "#6f4d38", background: "#f0e4d0", borderRadius: 2, padding: "6px 8px" },
  cardFinding: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 12.5, lineHeight: 1.5, margin: 0, color: "#25344f" },
  cardFix: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 12.5, lineHeight: 1.5, margin: 0, color: "#25344f" },
  roadmap: { marginTop: 44, background: "#1d2c44", border: "1px solid #617891", borderRadius: 4, padding: 24 },
  roadmapList: { listStyle: "none", padding: 0, margin: "14px 0 0", display: "flex", flexDirection: "column", gap: 10 },
  roadmapItem: { display: "flex", alignItems: "center", gap: 12, fontSize: 13.5, padding: "8px 0", borderBottom: "1px solid #617891" },
  roadmapEmpty: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 13.5, color: "#95bae2" },
  roadmapDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  roadmapPillar: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 12.5, color: "#d5b893", minWidth: 260 },
  roadmapFix: { fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", color: "#95bae2" },
  footer: { textAlign: "center", padding: "20px 24px 32px", fontFamily: "'Stack Sans Notch', ui-sans-serif, system-ui, sans-serif", fontSize: 11, color: "#617891" },
};
