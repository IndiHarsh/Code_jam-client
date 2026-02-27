import { useEffect, useState, useRef } from "react";

const SERVER = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
const POLL_INTERVAL = 20_000; // check every 20s while offline
const TIMEOUT_MS = 6_000;  // 6s to declare server offline

export default function ServerStatus() {
    const [offline, setOffline] = useState(false);
    const [checking, setChecking] = useState(false);
    const timer = useRef(null);

    async function ping() {
        setChecking(true);
        try {
            const ctrl = new AbortController();
            const id = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
            // no-cors: browser won't expose the response body but WILL resolve
            // if the server is reachable, and throw if it's down/timed out.
            await fetch(`${SERVER}/health`, { signal: ctrl.signal, mode: "no-cors" });
            clearTimeout(id);
            setOffline(false); // server reachable → hide banner
        } catch {
            setOffline(true);  // network error / timeout → show banner
        } finally {
            setChecking(false);
        }
    }

    useEffect(() => {
        ping(); // check immediately on mount

        // While offline, poll frequently so we catch when it wakes up
        timer.current = setInterval(ping, POLL_INTERVAL);
        return () => clearInterval(timer.current);
    }, []);

    if (!offline) return null;

    return (
        <div style={s.overlay}>
            <div style={s.card}>
                <div style={s.iconWrap}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, color: "#f97316" }}>
                        cloud_off
                    </span>
                    <div style={s.pulse} />
                </div>

                <h2 style={s.title}>Server is Waking Up</h2>
                <p style={s.body}>
                    The server is currently offline — it may have gone to sleep due to inactivity
                    (Render free tier). It usually wakes up within <strong>2–3 minutes</strong>.
                </p>
                <p style={s.body}>Please wait — this page will reconnect automatically.</p>

                <div style={s.statusRow}>
                    <div style={{ ...s.dot, background: checking ? "#f97316" : "#ef4444" }} />
                    <span style={s.statusTxt}>
                        {checking ? "Checking…" : "Server offline — retrying every 20s"}
                    </span>
                </div>

                <button style={s.retryBtn} onClick={ping} disabled={checking}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                    {checking ? "Checking…" : "Check Now"}
                </button>
            </div>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
        </div>
    );
}

const s = {
    overlay: {
        position: "fixed", inset: 0, zIndex: 100000,
        background: "rgba(10,10,24,0.92)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Space Grotesk', sans-serif",
    },
    card: {
        background: "rgba(30,30,56,0.95)", border: "1px solid rgba(249,115,22,0.3)",
        borderRadius: 20, padding: "2.5rem 2rem", maxWidth: 420, width: "90%",
        textAlign: "center",
        boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(249,115,22,0.08)",
    },
    iconWrap: {
        position: "relative", display: "inline-flex",
        alignItems: "center", justifyContent: "center",
        width: 72, height: 72, marginBottom: "1.25rem",
        background: "rgba(249,115,22,0.1)", borderRadius: "50%",
        border: "1px solid rgba(249,115,22,0.25)",
    },
    pulse: {
        position: "absolute", inset: 0, borderRadius: "50%",
        border: "2px solid rgba(249,115,22,0.4)",
        animation: "pulse-ring 2s ease-out infinite",
    },
    title: {
        fontSize: "1.35rem", fontWeight: 700, color: "#f1f5f9",
        marginBottom: "0.75rem",
    },
    body: {
        fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.65,
        marginBottom: "0.5rem",
    },
    statusRow: {
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "0.5rem", margin: "1.25rem 0 1rem",
    },
    dot: {
        width: 8, height: 8, borderRadius: "50%",
        transition: "background 0.3s",
    },
    statusTxt: {
        fontSize: "0.75rem", color: "#64748b", fontWeight: 500,
    },
    retryBtn: {
        display: "inline-flex", alignItems: "center", gap: "0.4rem",
        background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.35)",
        borderRadius: 8, padding: "0.55rem 1.25rem",
        color: "#fb923c", fontSize: "0.875rem", fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit",
        transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
    },
};
