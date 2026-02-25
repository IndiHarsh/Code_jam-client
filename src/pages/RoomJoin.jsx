import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { socket } from "../socket/socket";
import ForceField from "../components/ForceField";

export default function RoomJoin() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");

  function joinRoom() {
    const id = roomId.trim();
    if (!id) { setError("Please enter a Room ID."); return; }
    setError("");
    socket.emit("JOIN_ROOM", { roomId: id });
    navigate(`/room/${id}`);
  }

  function createRoom() {
    const id = uuidv4();
    socket.emit("JOIN_ROOM", { roomId: id });
    navigate(`/room/${id}`);
  }

  return (
    <div style={p.page}>
      {/* Interactive particle background */}
      <ForceField hue={234} saturation={90} spacing={14} />

      <div style={p.card}>
        {/* Logo */}
        <div style={p.logoRow}>
          <div style={p.logoIcon}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--primary)" }}>terminal</span>
          </div>
          <span style={p.logoText}>CodeJam_</span>
        </div>

        {/* Heading */}
        <h1 style={p.title}>Join a Session</h1>
        <p style={p.subtitle}>Enter a Room ID to collaborate, or spin up a new environment.</p>

        {/* Room ID input */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={p.label}>Room ID</label>
          <div style={p.inputWrap}>
            <span className="material-symbols-outlined" style={p.inputIcon}>meeting_room</span>
            <input
              className="cj-input"
              type="text"
              placeholder="e.g. a3f9bc1d-…"
              value={roomId}
              onChange={e => { setRoomId(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && joinRoom()}
            />
          </div>
          {error && <p style={p.errMsg}>{error}</p>}
        </div>

        {/* Join button */}
        <button className="cj-btn-primary" onClick={joinRoom}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>
          <span>Join Room</span>
        </button>

        {/* Divider */}
        <div className="cj-divider"><span>or</span></div>

        {/* Create button */}
        <button style={p.createBtn} onClick={createRoom}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
          <span>Create New Room</span>
        </button>

        {/* Footer chips */}
        <div style={p.chips}>
          {["Real-time Sync", "15+ Languages", "Whiteboard", "Monitoring"].map(tag => (
            <span key={tag} style={p.chip}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

const p = {
  page: {
    minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center",
    justifyContent: "center", position: "relative", overflow: "hidden",
    fontFamily: "'Space Grotesk', sans-serif", padding: "1.5rem"
  },
  dotGrid: {
    position: "absolute", inset: 0, backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
    backgroundSize: "24px 24px", opacity: 0.2, pointerEvents: "none"
  },
  blobBlue: {
    position: "absolute", top: "-10%", left: "-5%", width: 500, height: 500,
    background: "rgba(19,19,236,0.08)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none"
  },
  blobPurple: {
    position: "absolute", bottom: "-10%", right: "-5%", width: 500, height: 500,
    background: "rgba(88,28,135,0.08)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none"
  },

  card: {
    position: "relative", zIndex: 1, width: "100%", maxWidth: 460,
    background: "rgba(30,30,56,0.88)", backdropFilter: "blur(16px)",
    border: "1px solid var(--border)", borderRadius: 16, padding: "2.5rem",
    boxShadow: "0 24px 60px rgba(0,0,0,0.5)"
  },

  logoRow: { display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.75rem" },
  logoIcon: {
    width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(19,19,236,0.15)", border: "1px solid rgba(19,19,236,0.25)", borderRadius: 8
  },
  logoText: { color: "#fff", fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.3px" },

  title: { fontSize: "1.75rem", fontWeight: 700, color: "#fff", marginBottom: "0.4rem", lineHeight: 1.2 },
  subtitle: { color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.75rem", lineHeight: 1.5 },

  label: { display: "block", fontSize: "0.82rem", fontWeight: 500, color: "#cbd5e1", marginBottom: "0.4rem" },
  inputWrap: { position: "relative" },
  inputIcon: {
    position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
    color: "var(--muted-dark)", fontSize: 18, pointerEvents: "none", fontFamily: "'Material Symbols Outlined'"
  },
  errMsg: { color: "#f87171", fontSize: "0.78rem", marginTop: "0.35rem" },

  createBtn: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
    background: "transparent", border: "1px solid var(--border)", color: "var(--text)",
    borderRadius: 8, padding: "0.8rem 1rem", fontSize: "0.95rem", fontWeight: 600,
    fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", transition: "border-color 0.18s, background 0.18s"
  },

  chips: { display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "1.75rem", justifyContent: "center" },
  chip: {
    fontSize: "0.7rem", fontWeight: 500, color: "var(--muted)", background: "rgba(50,50,103,0.35)",
    border: "1px solid var(--border)", borderRadius: 20, padding: "0.2rem 0.65rem"
  },
};
