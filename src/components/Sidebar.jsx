import { useState, useRef } from "react";

export default function Sidebar({
  files = {},
  activeFile,
  participants = [],
  settings,
  onFileSwitch,
  onFileCreate,
  onFileRename,
  onFileDelete,
  onSettingsChange,
  onLogout,
  onWhiteboardToggle,
  whiteboardOpen,
  searchQuery = "",
}) {
  const [active, setActive] = useState("files");
  const [panelOpen, setPanelOpen] = useState(true);
  const [newFileName, setNewFileName] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [renamingFile, setRenamingFile] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const newInputRef = useRef(null);
  const fileInputRef = useRef(null);

  function handleIconClick(id) {
    if (id === "whiteboard") { onWhiteboardToggle?.(); return; }
    if (id === active && panelOpen) { setPanelOpen(false); return; }
    setActive(id); setPanelOpen(true);
  }

  function submitNewFile() {
    const name = newFileName.trim(); if (!name) return;
    onFileCreate?.(name, ""); setNewFileName(""); setShowNewInput(false);
  }

  function startRename(f) { setRenamingFile(f); setRenameValue(f); }
  function submitRename(old) { onFileRename?.(old, renameValue.trim()); setRenamingFile(null); }

  /* ── File import from local device ─────────────────────── */
  function handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onFileCreate?.(file.name, ev.target.result || "");
    reader.readAsText(file);
    e.target.value = ""; // reset so same file can be re-imported
  }

  // Filter files by search query
  const fileList = Object.keys(files).filter(f =>
    !searchQuery || f.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const NAV = [
    { id: "files", tip: "Explorer", icon: <FilesIco /> },
    { id: "users", tip: "Users", icon: <UsersIco /> },
    {
      id: "whiteboard", tip: whiteboardOpen ? "Back to Code" : "Whiteboard",
      icon: whiteboardOpen ? <CodeIco /> : <BoardIco />
    },
    { id: "settings", tip: "Settings", icon: <SettingsIco /> },
  ];

  return (
    <>
      <style>{`
        @keyframes fadeSlide {
          from { opacity:0; transform:translateX(-6px); }
          to   { opacity:1; transform:translateX(0); }
        }
        .sb-file:hover { background: rgba(255,255,255,0.05) !important; }
        .sb-act:hover  { color: #e2e8f0 !important; background: rgba(255,255,255,0.06) !important; }
        .sb-user:hover { background: rgba(255,255,255,0.04) !important; border-radius:8px; }
      `}</style>

      <div style={s.wrap}>
        {/* ── Activity Bar ──────────────────────────────────── */}
        <div style={s.actBar}>
          {/* Logo */}
          <div style={s.logoWrap}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {NAV.map(item => {
              const isOn = item.id !== "whiteboard" && active === item.id && panelOpen;
              const isWb = item.id === "whiteboard" && whiteboardOpen;
              return (
                <div key={item.id} style={{ position: "relative" }}>
                  <button
                    className="sb-act"
                    title={item.tip}
                    onClick={() => handleIconClick(item.id)}
                    onMouseEnter={() => setHoveredIcon(item.id)}
                    onMouseLeave={() => setHoveredIcon(null)}
                    style={{
                      ...s.actBtn,
                      ...(isOn ? s.actBtnOn : {}),
                      ...(isWb ? s.actBtnWb : {}),
                    }}
                  >
                    {item.icon}
                    {(isOn || isWb) && <div style={s.activePip} />}
                  </button>
                  {hoveredIcon === item.id && (
                    <div style={s.tooltip}>{item.tip}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Side Panel ──────────────────────────────────── */}
        {panelOpen && (
          <div style={s.panel}>
            <div style={s.panelGlow} />

            {/* Panel header */}
            <div style={s.panelHead}>
              <span style={s.panelTitle}>
                {NAV.find(x => x.id === active)?.tip?.toUpperCase()}
              </span>
              {active === "files" && (
                <div style={{ display: "flex", gap: 4 }}>
                  {/* New file */}
                  <Ico tip="New file"
                    onClick={() => { setShowNewInput(true); setTimeout(() => newInputRef.current?.focus(), 50); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>note_add</span>
                  </Ico>
                  {/* Import from device */}
                  <Ico tip="Import file from device" onClick={() => fileInputRef.current?.click()}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>upload_file</span>
                  </Ico>
                  <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileImport} />
                </div>
              )}
            </div>

            <div style={s.panelBody}>
              {/* ── FILES ──────────────────────────────────── */}
              {active === "files" && (
                <div style={{ animation: "fadeSlide 0.18s ease" }}>
                  {showNewInput && (
                    <div style={s.newRow}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#475569" }}>description</span>
                      <input
                        ref={newInputRef} style={s.ghostInput} placeholder="filename.py"
                        value={newFileName} onChange={e => setNewFileName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") submitNewFile();
                          if (e.key === "Escape") setShowNewInput(false);
                        }}
                      />
                      <TinyBtn onClick={submitNewFile}>✓</TinyBtn>
                      <TinyBtn onClick={() => setShowNewInput(false)}>✕</TinyBtn>
                    </div>
                  )}

                  {fileList.length === 0 && (
                    <p style={s.emptyHint}>
                      {searchQuery ? `No files matching "${searchQuery}"` : "No files"}
                    </p>
                  )}

                  {fileList.map(f => {
                    const fi = extIcon(f);
                    return (
                      <div key={f} className="sb-file"
                        style={{ ...s.fileRow, ...(f === activeFile ? s.fileRowOn : {}) }}>
                        {renamingFile === f ? (
                          <input style={s.inlineInput} autoFocus
                            value={renameValue} onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") submitRename(f);
                              if (e.key === "Escape") setRenamingFile(null);
                            }}
                          />
                        ) : (
                          <span style={s.fileName} onClick={() => onFileSwitch?.(f)}>
                            <span className="material-symbols-outlined"
                              style={{ fontSize: 13, color: fi.color, marginRight: 6, flexShrink: 0 }}>
                              {fi.icon}
                            </span>
                            {f}
                          </span>
                        )}
                        <span style={s.fileActs}>
                          <TinyBtn onClick={() => startRename(f)}>✎</TinyBtn>
                          <TinyBtn red onClick={() => onFileDelete?.(f)}>✕</TinyBtn>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── USERS ──────────────────────────────────── */}
              {active === "users" && (
                <div style={{ animation: "fadeSlide 0.18s ease" }}>
                  <p style={s.sectionHint}>{participants.length} online</p>
                  {participants.map((u, i) => (
                    <div key={u.userId || i} className="sb-user" style={s.userRow}>
                      <div style={{ ...s.avatar, background: avatarBg(u.name) }}>
                        {(u.name || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={s.userName}>{u.name || "Anonymous"}</div>
                        <div style={{ ...s.userRole, color: u.role === "admin" ? "#6366f1" : "#475569" }}>
                          {u.role}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── SETTINGS ───────────────────────────────── */}
              {active === "settings" && (
                <div style={{ animation: "fadeSlide 0.18s ease", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <Section label="Editor" />
                  <Row label="Font Size">
                    <NumInput value={settings.fontSize} min={10} max={28}
                      onChange={v => onSettingsChange?.({ fontSize: v })} />
                  </Row>
                  <Row label="Tab Size">
                    <NumInput value={settings.tabSize} min={2} max={8}
                      onChange={v => onSettingsChange?.({ tabSize: v })} />
                  </Row>
                  <Row label="Word Wrap">
                    <Toggle checked={settings.wordWrap} onChange={v => onSettingsChange?.({ wordWrap: v })} />
                  </Row>
                  <Row label="Minimap">
                    <Toggle checked={settings.minimap} onChange={v => onSettingsChange?.({ minimap: v })} />
                  </Row>
                  <div style={{ marginTop: "0.5rem" }}><Section label="Session" /></div>
                  <button style={s.logoutBtn} onClick={onLogout}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Tiny helpers ───────────────────────────────────────── */
function Ico({ children, tip, onClick }) {
  return (
    <button title={tip} onClick={onClick}
      style={{
        background: "transparent", border: "none", color: "#475569", cursor: "pointer",
        padding: 3, borderRadius: 4, display: "flex", alignItems: "center",
        transition: "color 0.15s"
      }}
      onMouseEnter={e => e.currentTarget.style.color = "#e2e8f0"}
      onMouseLeave={e => e.currentTarget.style.color = "#475569"}>
      {children}
    </button>
  );
}
function TinyBtn({ children, red, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        background: "transparent", border: "none", color: red ? "#ef4444" : "#475569",
        cursor: "pointer", fontSize: "0.68rem", padding: "1px 4px", borderRadius: 3
      }}>
      {children}
    </button>
  );
}
function NumInput({ value, min, max, onChange }) {
  return (
    <input type="number" min={min} max={max} value={value}
      onChange={e => onChange(Number(e.target.value) || min)}
      style={{
        background: "#0d0d1f", color: "#f1f5f9", border: "1px solid #323267",
        borderRadius: 6, padding: "0.22rem 0.4rem", width: 55, fontSize: "0.78rem",
        outline: "none", textAlign: "center"
      }} />
  );
}
function Toggle({ checked, onChange }) {
  return (
    <label style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
      <div style={{
        width: 32, height: 17, borderRadius: 9, background: checked ? "#1313ec" : "#323267",
        transition: "background 0.2s", position: "relative"
      }}>
        <div style={{
          position: "absolute", top: 2, left: checked ? 15 : 2, width: 13, height: 13,
          borderRadius: "50%", background: "#fff", transition: "left 0.2s"
        }} />
      </div>
    </label>
  );
}
function Section({ label }) {
  return <div style={{
    fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.1em", color: "#334155", paddingBottom: "0.3rem",
    borderBottom: "1px solid rgba(50,50,103,0.5)"
  }}>{label}</div>;
}
function Row({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{label}</span>
      {children}
    </div>
  );
}

/* ── File extension icon map ────────────────────────────── */
function extIcon(name = "") {
  const ext = name.split(".").pop().toLowerCase();
  const M = {
    js: { icon: "javascript", color: "#f7df1e" }, jsx: { icon: "javascript", color: "#61dafb" },
    ts: { icon: "javascript", color: "#3178c6" }, tsx: { icon: "javascript", color: "#61dafb" },
    py: { icon: "code", color: "#3572a5" }, css: { icon: "css", color: "#264de4" },
    html: { icon: "html", color: "#e44d26" }, json: { icon: "description", color: "#94a3b8" },
    go: { icon: "code", color: "#00add8" }, rs: { icon: "code", color: "#dea584" },
    java: { icon: "code", color: "#b07219" }, cpp: { icon: "code", color: "#f34b7d" },
    c: { icon: "code", color: "#a9b0bd" }, rb: { icon: "code", color: "#701516" },
    php: { icon: "code", color: "#777bb4" }, cs: { icon: "code", color: "#178600" },
    sh: { icon: "terminal", color: "#89e051" }, r: { icon: "code", color: "#198ce7" },
  };
  return M[ext] || { icon: "description", color: "#64748b" };
}

function avatarBg(name = "") {
  const arr = ["#1313ec", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626"];
  let n = 0; for (const c of name) n += c.charCodeAt(0);
  return arr[n % arr.length];
}

/* ── SVG icons ──────────────────────────────────────────── */
const V = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
function FilesIco() { return <svg {...V}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>; }
function UsersIco() { return <svg {...V}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>; }
function BoardIco() { return <svg {...V}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M7 16l3-4 3 3 3-5" /></svg>; }
function CodeIco() { return <svg {...V}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>; }
function SettingsIco() { return <svg {...V}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>; }

/* ── Styles ─────────────────────────────────────────────── */
const s = {
  wrap: { display: "flex", height: "100vh", flexShrink: 0, fontFamily: "'Space Grotesk', sans-serif" },
  actBar: {
    width: 52, flexShrink: 0, background: "#0a0a18",
    borderRight: "1px solid rgba(19,19,236,0.1)",
    display: "flex", flexDirection: "column", alignItems: "center",
    paddingTop: "0.75rem", paddingBottom: "0.75rem", gap: 2
  },
  logoWrap: {
    width: 34, height: 34, borderRadius: 9,
    background: "linear-gradient(135deg,#1313ec,#5b21b6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 0 16px rgba(19,19,236,0.4)", marginBottom: "0.75rem", flexShrink: 0
  },
  actBtn: {
    width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: "none", color: "#475569", cursor: "pointer",
    borderRadius: 10, transition: "background 0.15s, color 0.15s",
    position: "relative", borderLeft: "2px solid transparent"
  },
  actBtnOn: { color: "#6366f1", borderLeftColor: "#1313ec", background: "rgba(19,19,236,0.1)" },
  actBtnWb: { color: "#a78bfa", borderLeftColor: "#7c3aed", background: "rgba(124,58,237,0.12)" },
  activePip: { display: "none" }, // border-l replaces dot

  panel: {
    width: 220, flexShrink: 0, background: "#0d0d1e",
    borderRight: "1px solid rgba(19,19,236,0.1)",
    display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden"
  },
  panelGlow: { height: 1, background: "linear-gradient(90deg,transparent,rgba(19,19,236,0.4),transparent)", flexShrink: 0 },
  panelHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0.5rem 0.75rem", flexShrink: 0
  },
  panelTitle: {
    fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.12em", color: "#334155"
  },
  panelBody: { flex: 1, overflowY: "auto", padding: "0.3rem 0.4rem 0.75rem" },

  newRow: {
    display: "flex", alignItems: "center", gap: 4, marginBottom: 4,
    padding: "0.2rem 0.3rem"
  },
  ghostInput: {
    flex: 1, background: "rgba(19,19,236,0.06)", border: "1px solid rgba(19,19,236,0.3)",
    borderRadius: 5, padding: "0.25rem 0.4rem", color: "#e2e8f0", fontSize: "0.78rem", outline: "none"
  },
  inlineInput: {
    flex: 1, background: "rgba(19,19,236,0.06)", border: "1px solid rgba(19,19,236,0.3)",
    borderRadius: 5, padding: "0.22rem 0.4rem", color: "#e2e8f0", fontSize: "0.78rem", outline: "none"
  },
  emptyHint: { fontSize: "0.78rem", color: "#334155", textAlign: "center", padding: "1.5rem 0" },

  fileRow: {
    display: "flex", alignItems: "center", borderRadius: 5,
    padding: "0.28rem 0.4rem", cursor: "pointer", minWidth: 0, marginBottom: 1,
    transition: "background 0.1s", border: "1px solid transparent"
  },
  fileRowOn: {
    background: "rgba(19,19,236,0.12)", borderColor: "rgba(19,19,236,0.25)",
    borderLeft: "2px solid #1313ec", paddingLeft: "calc(0.4rem - 1px)"
  },
  fileName: {
    flex: 1, fontSize: "0.8rem", color: "#cbd5e1", overflow: "hidden",
    textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center"
  },
  fileActs: { display: "flex", flexShrink: 0, opacity: 0.7 },

  sectionHint: { fontSize: "0.7rem", color: "#334155", margin: "0 0 0.4rem 0.25rem" },
  userRow: {
    display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.3rem",
    marginBottom: 1
  },
  avatar: {
    width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center",
    justifyContent: "center", fontWeight: 700, fontSize: "0.72rem", color: "#fff", flexShrink: 0
  },
  userName: { fontSize: "0.8rem", color: "#cbd5e1", fontWeight: 500 },
  userRole: { fontSize: "0.66rem", textTransform: "capitalize" },

  tooltip: {
    position: "absolute", left: "calc(100% + 8px)", top: "50%",
    transform: "translateY(-50%)", background: "#1e1e38",
    border: "1px solid #323267", color: "#e2e8f0", fontSize: "0.72rem",
    fontWeight: 500, padding: "0.2rem 0.5rem", borderRadius: 5,
    whiteSpace: "nowrap", zIndex: 100, pointerEvents: "none",
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)"
  },

  logoutBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
    width: "100%", background: "transparent", border: "1px solid rgba(19,19,236,0.3)",
    color: "#6366f1", borderRadius: 8, padding: "0.5rem",
    cursor: "pointer", fontSize: "0.82rem", fontWeight: 500,
    fontFamily: "inherit", marginTop: "0.25rem"
  },
};


