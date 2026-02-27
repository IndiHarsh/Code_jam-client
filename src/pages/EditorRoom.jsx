import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { socket, disconnectSocket } from "../socket/socket";
import Editor from "../components/Editor";
import Sidebar from "../components/Sidebar";
import Whiteboard from "../components/Whiteboard";
import { useMonitor } from "../hooks/useMonitor";
import { executeCode } from "../services/execute";

const ALL_LANGUAGES = [
  { value: "javascript", label: "JavaScript" }, { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" }, { value: "cpp", label: "C++" },
  { value: "c", label: "C" }, { value: "java", label: "Java" },
  { value: "go", label: "Go" }, { value: "rust", label: "Rust" },
  { value: "ruby", label: "Ruby" }, { value: "php", label: "PHP" },
  { value: "csharp", label: "C#" }, { value: "kotlin", label: "Kotlin" },
  { value: "swift", label: "Swift" }, { value: "bash", label: "Bash" },
  { value: "r", label: "R" },
];
const LANG_EXT = { javascript: "js", typescript: "ts", python: "py", cpp: "cpp", c: "c", java: "java", go: "go", rust: "rs", ruby: "rb", php: "php", csharp: "cs", kotlin: "kts", swift: "swift", bash: "sh", r: "r" };
const MONACO_L = { csharp: "csharp", typescript: "typescript", bash: "shell" };
function monacoLang(l) { return MONACO_L[l] || l; }

// Map file extension → Material Symbol icon + color
function fileIcon(name = "") {
  const ext = name.split(".").pop().toLowerCase();
  const M = {
    js: "{icon:'javascript',color:'#f7df1e'}", jsx: "{icon:'javascript',color:'#61dafb'}",
    ts: "{icon:'javascript',color:'#3178c6'}", tsx: "{icon:'javascript',color:'#61dafb'}",
    py: "{icon:'code',color:'#3572a5'}", css: "{icon:'css',color:'#264de4'}",
    html: "{icon:'html',color:'#e44d26'}", json: "{icon:'description',color:'#94a3b8'}",
    go: "{icon:'code',color:'#00add8'}", rs: "{icon:'code',color:'#dea584'}",
    java: "{icon:'code',color:'#b07219'}", cpp: "{icon:'code',color:'#f34b7d'}",
    c: "{icon:'code',color:'#a9b0bd'}", rb: "{icon:'code',color:'#701516'}",
    php: "{icon:'code',color:'#777bb4'}", cs: "{icon:'code',color:'#178600'}",
    sh: "{icon:'terminal',color:'#89e051'}", r: "{icon:'code',color:'#198ce7'}",
  };
  // parse the string map or return default
  const ICONS = {
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
  return ICONS[ext] || { icon: "description", color: "#64748b" };
}

export default function EditorRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [files, setFiles] = useState({ "main.js": "// Start coding...\n" });
  const [activeFile, setActiveFile] = useState("main.js");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// Start coding...\n");
  const [openTabs, setOpenTabs] = useState(["main.js"]);

  const [output, setOutput] = useState("");
  const [stdin, setStdin] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const [bottomTab, setBottomTab] = useState("output");
  const [bottomH, setBottomH] = useState(140);
  const bottomDrag = useRef(false);

  const [participants, setParticipants] = useState({});
  const [view, setView] = useState("editor");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({ fontSize: 14, tabSize: 2, wordWrap: true, minimap: true });
  const [fsWarning, setFsWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fsWarnTimer = useRef(null);

  const colRef = useRef(null);
  useMonitor(roomId, true);

  /* ── 1.5 s debounce on file search ─────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 1500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ── Socket ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!roomId) return;
    socket.emit("JOIN_ROOM", { roomId });

    socket.on("ROOM_STATE", ({ files: sf, codeState }) => {
      if (sf && Object.keys(sf).length > 0) {
        setFiles(sf); setOpenTabs(Object.keys(sf));
        const first = Object.keys(sf)[0];
        setActiveFile(first); setCode(sf[first] ?? ""); inferLang(first);
      } else if (codeState) setCode(codeState);
    });
    socket.on("ROOM_UPDATE", ({ participants: p }) => { if (p) setParticipants(p); });
    socket.on("FILES_UPDATE", ({ files: f }) => {
      setFiles(f);
      setOpenTabs(prev => [...new Set([...prev, ...Object.keys(f)])]);
    });
    socket.on("FILE_CONTENT", ({ filename, content }) => {
      setFiles(prev => ({ ...prev, [filename]: content }));
      setActiveFile(filename); setCode(content);
      setOpenTabs(prev => prev.includes(filename) ? prev : [...prev, filename]);
    });
    socket.on("ROOM_DESTROYED", () => { alert("Room closed."); navigate("/join"); });

    return () => {
      socket.emit("LEAVE_ROOM", { roomId });
      ["ROOM_STATE", "ROOM_UPDATE", "FILES_UPDATE", "FILE_CONTENT", "ROOM_DESTROYED"].forEach(e => socket.off(e));
    };
  }, [roomId]);

  /* ── Bottom panel resize ─────────────────────────────────── */
  useEffect(() => {
    function mv(e) {
      if (!bottomDrag.current || !colRef.current) return;
      const r = colRef.current.getBoundingClientRect();
      setBottomH(Math.max(60, Math.min(r.height - 80, r.bottom - e.clientY)));
    }
    function up() { bottomDrag.current = false; document.body.style.cursor = ""; }
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  /* ── Force fullscreen on room entry ─────────────────────── */
  useEffect(() => {
    const el = document.documentElement;
    const enter = () => {
      if (el.requestFullscreen) el.requestFullscreen().catch(() => { });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    };
    // Browsers require a user gesture before allowing fullscreen.
    // We attempt immediately (works if navigated via a click) and
    // also listen for the first interaction as a fallback.
    enter();
    window.addEventListener("click", enter, { once: true });

    // Show warning toast when user exits fullscreen manually
    function onFsChange() {
      if (!document.fullscreenElement) {
        clearTimeout(fsWarnTimer.current);
        setFsWarning(true);
        setIsFullscreen(false);
        fsWarnTimer.current = setTimeout(() => setFsWarning(false), 6000);
      } else {
        setIsFullscreen(true);
      }
    }
    document.addEventListener("fullscreenchange", onFsChange);

    return () => {
      window.removeEventListener("click", enter);
      document.removeEventListener("fullscreenchange", onFsChange);
      clearTimeout(fsWarnTimer.current);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    };
  }, []);

  /* ── Helpers ─────────────────────────────────────────────── */
  function inferLang(filename) {
    const ext = filename.split(".").pop();
    const found = Object.entries(LANG_EXT).find(([, v]) => v === ext);
    if (found) setLanguage(found[0]);
  }

  async function handleRun() {
    if (!code.trim()) { setOutput("Nothing to run."); return; }
    setIsRunning(true); setOutput(""); setBottomTab("output");
    try {
      const r = await executeCode({ language, code, stdin: stdin || "" });
      setOutput([r.compile?.output?.trim(), r.run?.output?.trim()].filter(Boolean).join("\n") || "No output.");
    } catch (err) {
      setOutput(err.response?.data?.error || err.message || "Execution failed");
    } finally { setIsRunning(false); }
  }

  function handleLogout() { localStorage.removeItem("token"); disconnectSocket(); navigate("/"); }

  function switchFile(name) {
    setFiles(prev => ({ ...prev, [activeFile]: code }));
    socket.emit("FILE_SWITCH", { roomId, filename: name });
    setActiveFile(name); setCode(files[name] ?? ""); inferLang(name);
    setOpenTabs(prev => prev.includes(name) ? prev : [...prev, name]);
  }

  function createFile(name, content = "") {
    if (!name) return;
    socket.emit("FILE_CREATE", { roomId, filename: name });
    setFiles(prev => ({ ...prev, [name]: content }));
    setActiveFile(name); setCode(content); inferLang(name);
    setOpenTabs(prev => prev.includes(name) ? prev : [...prev, name]);
  }

  function renameFile(o, n) { if (n && o !== n) socket.emit("FILE_RENAME", { roomId, oldName: o, newName: n }); }

  function deleteFile(name) {
    if (Object.keys(files).length <= 1) { alert("Cannot delete the last file."); return; }
    socket.emit("FILE_DELETE", { roomId, filename: name });
    const rest = Object.keys(files).filter(f => f !== name);
    setOpenTabs(prev => prev.filter(t => t !== name));
    if (activeFile === name) switchFile(rest[0]);
  }

  function closeTab(name) {
    const tabs = openTabs.filter(t => t !== name);
    setOpenTabs(tabs);
    if (activeFile === name && tabs.length > 0) switchFile(tabs[tabs.length - 1]);
  }

  function handleCodeChange(v) {
    setCode(v ?? "");
    socket.emit("FILE_SAVE", { roomId, filename: activeFile, content: v ?? "" });
  }

  function copyRoomId() {
    navigator.clipboard.writeText(roomId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  const pList = Object.values(participants);
  const { icon: fIcon, color: fColor } = fileIcon(activeFile);

  return (
    <div style={T.root}>

      {/* ══ TOP BAR ══════════════════════════════════════════ */}
      <header style={T.bar}>
        <div style={T.barL}>
          <div style={T.logoBadge}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#fff" }}>terminal</span>
          </div>
          <span style={T.logoTxt}>CodeJam</span>
          <div style={T.barSep} />
          {/* Breadcrumb */}
          <div style={T.crumb}>
            <span style={T.crumbMuted}>{roomId?.slice(0, 8)}…</span>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#334155" }}>chevron_right</span>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: fColor }}>{fIcon}</span>
            <span style={{ fontSize: "0.78rem", color: "rgba(19,19,236,0.9)" }}>{activeFile}</span>
            <button style={T.crumbCopy} onClick={copyRoomId} title="Copy room ID">{copied ? "✓" : "⎘"}</button>
          </div>
        </div>

        <div style={T.barR}>
          {/* Search files */}
          <div style={{ position: "relative" }}>
            <span className="material-symbols-outlined"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#475569", pointerEvents: "none", zIndex: 12 }}>
              search
            </span>
            <input
              style={T.searchInput}
              placeholder="Search files (⌘P)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onBlur={() => setTimeout(() => setSearchQuery(""), 200)}
            />
            {/* Search results dropdown */}
            {debouncedSearch && (() => {
              const matches = Object.keys(files).filter(f =>
                f.toLowerCase().includes(debouncedSearch.toLowerCase())
              );
              return (
                <div style={T.searchDrop}>
                  {matches.length === 0 ? (
                    <div style={{ padding: "0.5rem 0.75rem", color: "#475569", fontSize: "0.78rem" }}>
                      No files matching "{debouncedSearch}"
                    </div>
                  ) : matches.map(f => {
                    const fi = fileIcon(f);
                    return (
                      <div key={f} className="wb-tbr"
                        style={T.searchItem}
                        onMouseDown={e => { e.preventDefault(); switchFile(f); setView("editor"); setSearchQuery(""); setDebouncedSearch(""); }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: fi.color }}>{fi.icon}</span>
                        <span style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>{f}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Fullscreen toggle */}
          <button
            className="fs-toggle-btn"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
              } else {
                document.documentElement.requestFullscreen().catch(() => { });
              }
            }}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, pointerEvents: "none" }}>
              {isFullscreen ? "fullscreen_exit" : "fullscreen"}
            </span>
          </button>

          {/* Language selector */}
          <select style={T.langSel} value={language} onChange={e => setLanguage(e.target.value)}>
            {ALL_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>

          {/* Run */}
          <button
            className="run-btn"
            style={{ ...T.runBtn, opacity: isRunning ? 0.7 : 1 }}
            onClick={handleRun}
            disabled={isRunning}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
            {isRunning ? "Running…" : "Run"}
          </button>

          {/* Participants */}
          <div style={T.userPill} title={`${pList.length} participant(s)`}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#94a3b8" }}>group</span>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{pList.length}</span>
          </div>
        </div>
      </header>

      {/* ══ BODY ════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Sidebar (activity bar + panels) */}
        <Sidebar
          files={files} activeFile={activeFile} participants={pList} settings={settings}
          onFileSwitch={switchFile} onFileCreate={createFile}
          onFileRename={renameFile} onFileDelete={deleteFile}
          onSettingsChange={p => setSettings(prev => ({ ...prev, ...p }))}
          onLogout={handleLogout}
          onWhiteboardToggle={() => setView(v => v === "whiteboard" ? "editor" : "whiteboard")}
          whiteboardOpen={view === "whiteboard"}
          searchQuery={debouncedSearch}
        />

        {/* ── Editor column ─────────────────────────────────── */}
        <div ref={colRef} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* File Tabs */}
          <div style={T.tabs}>
            {openTabs
              .filter(t => files[t] !== undefined)
              .map(tab => {
                const fi = fileIcon(tab);
                const on = tab === activeFile;
                return (
                  <div key={tab} style={{ ...T.tab, ...(on ? T.tabOn : {}) }}
                    onClick={() => { switchFile(tab); setView("editor"); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: fi.color }}>{fi.icon}</span>
                    <span style={{ fontSize: "0.78rem", color: on ? "#e2e8f0" : "#64748b", whiteSpace: "nowrap" }}>{tab}</span>
                    <button style={T.tabX} onClick={e => { e.stopPropagation(); closeTab(tab); }}>×</button>
                  </div>
                );
              })}
          </div>

          {/* Editor / Whiteboard */}
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            {view === "editor" ? (
              <Editor
                key={activeFile} roomId={roomId} language={monacoLang(language)}
                settings={settings} initialCode={code} filename={activeFile}
                onCodeChange={handleCodeChange}
              />
            ) : (
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={T.wbHeader}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1313ec" }}>Whiteboard</span>
                  <button style={T.wbBack} onClick={() => setView("editor")}>← Back to Editor</button>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <Whiteboard roomId={roomId} />
                </div>
              </div>
            )}
          </div>

          {/* Resize handle */}
          <div style={T.resizeH}
            onMouseDown={e => { e.preventDefault(); bottomDrag.current = true; document.body.style.cursor = "row-resize"; }}
            title="Drag to resize panel" />

          {/* ── Bottom Panel ──────────────────────────────── */}
          <div style={{ ...T.bottomPanel, height: bottomH }}>
            {/* Tab bar */}
            <div style={T.panelTabBar}>
              {[
                { id: "output", label: "OUTPUT" },
                { id: "stdin", label: "STDIN" },
              ].map(({ id, label }) => (
                <button key={id}
                  style={{ ...T.panelTabBtn, ...(bottomTab === id ? T.panelTabOn : {}) }}
                  onClick={() => setBottomTab(id)}>
                  {label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              {isRunning && (
                <span style={{ fontSize: "0.68rem", color: "#1313ec", marginRight: 8 }}>● Running…</span>
              )}
              <button style={T.clearBtn} onClick={() => setOutput("")} title="Clear output">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete_sweep</span>
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: "hidden", padding: "0.4rem 0.75rem" }}>
              {bottomTab === "output" ? (
                <pre style={T.outPre}>
                  {isRunning ? "Running…" : (output || "Run your code to see output here.")}
                </pre>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", height: "100%" }}>
                  <span style={{ fontSize: "0.68rem", color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Standard Input
                  </span>
                  <textarea
                    style={T.stdinArea}
                    placeholder="Provide stdin here…"
                    value={stdin}
                    onChange={e => setStdin(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ FULLSCREEN EXIT WARNING TOAST ═══════════════════ */}
      {fsWarning && (
        <div style={T.fsWarn}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, flexShrink: 0 }}>warning</span>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>⚠️ Fullscreen Exited</div>
            <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>This action has been recorded and the admin has been alerted.</div>
          </div>
        </div>
      )}

      {/* ══ STATUS BAR ══════════════════════════════════════ */}
      <footer style={T.statusBar}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <SItem icon="smart_toy" label="CodeJam AI Active" />
          <SItem icon="group" label={`${pList.length} users`} />
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <SItem label={language} />
          <SItem label={`${settings.tabSize} spaces`} />
          <SItem label="UTF-8" />
        </div>
      </footer>

      <style>{`
        select option { background: #0d0d1f; }
        input[type=text]::placeholder { color: #334155; }
        .wb-tbr:hover { background: rgba(255,255,255,0.05) !important; }
        @keyframes fs-warn-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)      scale(1);    }
        }
        /* Fullscreen toggle button */
        .fs-toggle-btn {
          background: transparent; border: 1px solid #323267; border-radius: 8px;
          color: #94a3b8; cursor: pointer; display: flex; align-items: center;
          justify-content: center; width: 34px; height: 34px; flex-shrink: 0;
          transition: background 0.2s, border-color 0.2s, transform 0.15s, box-shadow 0.2s, color 0.2s;
        }
        .fs-toggle-btn:hover {
          background: rgba(19,19,236,0.08); border-color: rgba(19,19,236,0.6); color: #a5b4fc;
          transform: scale(1.08);
          box-shadow: 0 0 0 3px rgba(19,19,236,0.1), 0 0 16px 2px rgba(19,19,236,0.3), 0 0 32px 4px rgba(79,70,229,0.15);
        }
        .fs-toggle-btn:active { transform: scale(0.95); }
        /* Run button hover glow */
        .run-btn { transition: background 0.2s, transform 0.15s, box-shadow 0.2s, opacity 0.15s !important; }
        .run-btn:hover:not(:disabled) {
          background: #2525f0 !important;
          transform: scale(1.04);
          box-shadow: 0 0 0 4px rgba(19,19,236,0.12), 0 0 18px 3px rgba(19,19,236,0.45), 0 0 40px 6px rgba(79,70,229,0.2), 0 6px 24px rgba(19,19,236,0.4) !important;
        }
        .run-btn:active:not(:disabled) { transform: scale(0.97); }
      `}</style>
    </div>
  );
}

function SItem({ icon, label }) {
  return (
    <div className="wb-tbr" style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 8px", height: "100%", cursor: "pointer" }}>
      {icon && <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{icon}</span>}
      {label && <span>{label}</span>}
    </div>
  );
}

/* ── Styles ───────────────────────────────────────────────── */
const T = {
  root: {
    display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden",
    fontFamily: "'Space Grotesk', sans-serif", background: "#101022"
  },

  // Top bar
  bar: {
    height: 56, background: "#0a0a18", borderBottom: "1px solid rgba(19,19,236,0.15)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 1rem", flexShrink: 0, zIndex: 10
  },
  barL: { display: "flex", alignItems: "center", gap: "0.65rem" },
  barR: { display: "flex", alignItems: "center", gap: "0.5rem" },
  logoBadge: {
    width: 32, height: 32, background: "#1313ec", borderRadius: 8, display: "flex",
    alignItems: "center", justifyContent: "center", boxShadow: "0 0 15px rgba(19,19,236,0.4)", flexShrink: 0
  },
  logoTxt: { fontWeight: 700, fontSize: "1.1rem", color: "#fff", letterSpacing: "-0.5px" },
  barSep: { width: 1, height: 18, background: "#1e2435", margin: "0 0.25rem" },
  crumb: { display: "flex", alignItems: "center", gap: 4 },
  crumbMuted: { fontSize: "0.78rem", color: "#334155", cursor: "pointer" },
  crumbCopy: {
    background: "transparent", border: "none", color: "#475569", cursor: "pointer",
    fontSize: "0.85rem", padding: "0 4px"
  },
  searchInput: {
    background: "#16162d", border: "1px solid rgba(50,50,103,0.5)", borderRadius: 8,
    padding: "0.35rem 0.75rem 0.35rem 2rem", fontSize: "0.78rem", width: 210,
    color: "#e2e8f0", outline: "none"
  },
  langSel: {
    background: "#16162d", color: "#94a3b8", border: "1px solid rgba(50,50,103,0.5)",
    borderRadius: 8, padding: "0.3rem 0.45rem", fontSize: "0.78rem", outline: "none"
  },
  runBtn: {
    background: "#1313ec", color: "#fff", border: "none", borderRadius: 8,
    padding: "0.4rem 1rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
    display: "flex", alignItems: "center", gap: 4,
    boxShadow: "0 0 15px rgba(19,19,236,0.4)", fontFamily: "inherit"
  },
  userPill: { display: "flex", alignItems: "center", gap: 4, padding: "0 0.25rem" },

  // File tabs
  tabs: {
    height: 36, background: "#0a0a18", borderBottom: "1px solid rgba(19,19,236,0.1)",
    display: "flex", alignItems: "stretch", overflowX: "auto", flexShrink: 0
  },
  tab: {
    display: "flex", alignItems: "center", gap: 5, padding: "0 0.65rem", cursor: "pointer",
    borderRight: "1px solid rgba(19,19,236,0.08)", minWidth: 0, flexShrink: 0,
    transition: "background 0.1s", color: "#64748b"
  },
  tabOn: { background: "#101022", borderTop: "2px solid #1313ec", color: "#e2e8f0" },
  tabX: {
    background: "transparent", border: "none", color: "#475569", cursor: "pointer",
    fontSize: "0.95rem", padding: "0 2px", lineHeight: 1
  },

  // Whiteboard header
  wbHeader: {
    height: 36, background: "#0a0a18", display: "flex", alignItems: "center", gap: "1rem",
    padding: "0 1rem", flexShrink: 0, borderBottom: "1px solid rgba(19,19,236,0.1)"
  },
  wbBack: {
    background: "transparent", border: "1px solid rgba(50,50,103,0.5)", color: "#64748b",
    borderRadius: 6, padding: "0.18rem 0.6rem", cursor: "pointer", fontSize: "0.75rem"
  },

  // Resize
  resizeH: {
    height: 4, cursor: "row-resize", flexShrink: 0,
    background: "linear-gradient(90deg,transparent,rgba(19,19,236,0.25),transparent)",
    transition: "background 0.15s"
  },

  // Bottom panel
  bottomPanel: {
    background: "rgba(10,10,24,0.97)", borderTop: "1px solid rgba(19,19,236,0.2)",
    display: "flex", flexDirection: "column", flexShrink: 0
  },
  panelTabBar: {
    height: 32, display: "flex", alignItems: "center", padding: "0 0.5rem", gap: "0.2rem",
    borderBottom: "1px solid rgba(19,19,236,0.1)", flexShrink: 0
  },
  panelTabBtn: {
    background: "transparent", border: "none", color: "#475569", cursor: "pointer",
    padding: "0.25rem 0.5rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em",
    borderBottom: "2px solid transparent", fontFamily: "inherit"
  },
  panelTabOn: { color: "#1313ec", borderBottomColor: "#1313ec" },
  clearBtn: {
    background: "transparent", border: "none", color: "#475569", cursor: "pointer",
    display: "flex", alignItems: "center", padding: "2px"
  },
  outPre: {
    margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem",
    color: "#94a3b8", height: "100%", overflowY: "auto", lineHeight: 1.6, whiteSpace: "pre-wrap"
  },
  stdinArea: {
    flex: 1, background: "#0d0d1f", color: "#e2e8f0", border: "1px solid rgba(50,50,103,0.4)",
    borderRadius: 6, padding: "0.35rem 0.5rem", fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.8rem", resize: "none", outline: "none"
  },

  // Status bar
  statusBar: {
    height: 24, background: "#1313ec", display: "flex", alignItems: "center",
    justifyContent: "space-between", fontSize: "0.68rem", fontWeight: 500,
    color: "rgba(255,255,255,0.9)", flexShrink: 0
  },

  // Search dropdown
  searchDrop: {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
    background: "#16162d", border: "1px solid rgba(19,19,236,0.3)",
    borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    zIndex: 50, maxHeight: 200, overflowY: "auto",
    padding: "0.25rem 0"
  },
  searchItem: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "0.4rem 0.75rem", cursor: "pointer",
    transition: "background 0.1s"
  },

  // Fullscreen exit warning toast
  fsWarn: {
    position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)",
    zIndex: 99999, display: "flex", alignItems: "center", gap: "0.75rem",
    background: "rgba(220,38,38,0.15)", backdropFilter: "blur(12px)",
    border: "1px solid rgba(220,38,38,0.5)", borderRadius: 12,
    padding: "0.75rem 1.25rem", color: "#fca5a5",
    boxShadow: "0 8px 32px rgba(220,38,38,0.25), 0 0 0 1px rgba(220,38,38,0.2)",
    animation: "fs-warn-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
    maxWidth: 420, width: "max-content",
  },
};
