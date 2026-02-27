import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { googleLogin } from "../services/auth";
import { connectSocket } from "../socket/socket";
import ForceField from "../components/ForceField";

export default function Login() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);

  const googleOAuth = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        await googleLogin(tokenResponse.access_token);
        connectSocket();
        navigate("/join");
      } catch (err) {
        console.error("Login failed:", err);
      }
    },
    onError: () => console.error("Google login failed"),
  });

  return (
    <div style={s.page}>
      {/* Interactive particle background */}
      <ForceField hue={234} saturation={90} spacing={19} />

      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div style={s.leftPanel}>
        {/* Dot grid + blobs */}
        <div style={s.dotGrid} />
        <div style={s.blobBlue} />
        <div style={s.blobPurple} />

        {/* Logo */}
        <div style={s.logoRow}>
          <div style={s.logoIcon}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: "var(--primary)" }}>terminal</span>
          </div>
          <span style={s.logoText}>CodeJam_</span>
        </div>

        {/* Hero text */}
        <div style={s.hero}>
          <h1 style={s.heroH1}>
            Write. Test. Deploy.<br />
            <span style={s.heroGrad}>All in one place.</span>
          </h1>
          <p style={s.heroP}>
            The most powerful cloud IDE for modern developers. Collaborate in real-time,
            spin up environments instantly, and ship faster.
          </p>

          {/* Code snippet card */}
          <div className="cj-glass" style={s.codeCard}>
            {/* Traffic lights */}
            <div style={s.dots}>
              <div style={{ ...s.dot, background: "rgba(239,68,68,0.8)" }} />
              <div style={{ ...s.dot, background: "rgba(234,179,8,0.8)" }} />
              <div style={{ ...s.dot, background: "rgba(34,197,94,0.8)" }} />
            </div>
            <div style={s.codeBody}>
              {[
                [<><C col="code-purple">import</C>{" { "}<C col="code-orange">deploy</C>{" } "}<C col="code-purple">from</C>{" "}<C col="code-green">'@codejam/core'</C>;</>],
                [""],
                [<><C col="code-purple">const</C>{" "}<C col="code-blue">app</C>{" = "}<C col="code-orange">new</C>{" "}<C col="code-orange">Application</C>{"({"}</>],
                [<><Ind /><C col="muted">name:</C>{" "}<C col="code-green">'next-big-thing'</C>{","}</>],
                [<><Ind /><C col="muted">region:</C>{" "}<C col="code-green">'us-east-1'</C>{","}</>],
                ["});"],
                [""],
                [<><C col="muted-dark">{"// One click deployment 🚀"}</C></>],
                [<><C col="code-purple">await</C>{" "}<C col="code-blue">app</C>.<C col="code-orange">launch</C>{"();"}</>],
                [<span style={{ animation: "blink 1s infinite", fontWeight: 300 }}>|</span>],
              ].map((line, i) => (
                <div key={i} style={s.codeLine}>
                  <span style={s.lineNo}>{i + 1}</span>
                  <span style={{ fontSize: "0.82rem", fontFamily: "monospace", color: "#cbd5e1" }}>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={s.leftFooter}>
          <span>© 2024 CodeJam Inc.</span>
          <div style={s.footerDot} />
          <span>v2.4.0-beta</span>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────── */}
      <div style={s.rightPanel}>
        <div style={s.blobRight} />

        <div style={s.formWrap}>
          {/* Heading */}
          <div style={{ marginBottom: "2rem" }}>
            <h1 style={s.formTitle}>Welcome back, Dev.</h1>
            <p style={s.formSub}>Sign in to your environment to continue coding.</p>
          </div>

          {/* Email field (UI only) */}
          <div style={s.field}>
            <label style={s.label}>Email or Username</label>
            <div style={s.inputWrap}>
              <span className="material-symbols-outlined" style={s.inputIcon}>person</span>
              <input className="cj-input" type="text" placeholder="user@codejam.dev" />
            </div>
          </div>

          {/* Password field (UI only) */}
          <div style={s.field}>
            <div style={s.labelRow}>
              <label style={s.label}>Password</label>
              <a href="#" style={s.forgotLink}>Forgot Password?</a>
            </div>
            <div style={s.inputWrap}>
              <span className="material-symbols-outlined" style={s.inputIcon}>lock</span>
              <input
                className="cj-input"
                type={showPass ? "text" : "password"}
                placeholder="Enter your password"
                style={{ paddingRight: "2.5rem" }}
              />
              <button style={s.eyeBtn} onClick={() => setShowPass(v => !v)} type="button">
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--muted-dark)" }}>
                  {showPass ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
          </div>

          {/* Sign In — UI only (does nothing) */}
          <button className="cj-btn-primary" style={{ marginTop: "0.5rem" }} type="button"
            onClick={() => alert("Use Google Sign-In below to authenticate.")}>
            <span>Sign In</span>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
          </button>

          {/* Divider */}
          <div className="cj-divider"><span>Or continue with</span></div>

          {/* Social buttons */}
          <div style={s.socialGrid}>
            {/* GitHub — UI only */}
            <button className="cj-btn-social" title="GitHub">
              <svg height="18" width="18" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#fff" }}>
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
            </button>

            {/* Google — directly clickable custom button */}
            <button className="cj-btn-social" title="Sign in with Google" onClick={() => googleOAuth()}
              type="button">
              <svg height="18" width="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.21.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span style={{ fontSize: "0.82rem", color: "#fff", fontWeight: 500 }}>Google</span>
            </button>

            {/* Atlassian — UI only */}
            <button className="cj-btn-social" title="Atlassian">
              <svg height="18" width="18" fill="#0052CC" viewBox="0 0 24 24">
                <path d="M2.32 0C1.65 0 1.14.53 1.07 1.19L.02 11.53c-.1.95.64 1.77 1.59 1.77h3.81l1.55 10.02c.07.47.48.81.95.81h8.17c.48 0 .88-.34.95-.81l1.55-10.02h3.8c.95 0 1.69-.83 1.59-1.77L22.94 1.19C22.86.53 22.35 0 21.68 0H2.32zM15.42 14.63H8.58l-1.01-6.52h8.86l-1.01 6.52z" />
              </svg>
            </button>
          </div>

          {/* Footer text */}
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.72rem", color: "var(--muted-dark)", lineHeight: 1.6 }}>
              By signing in, you agree to our{" "}
              <a href="#" style={s.footerLink}>Terms of Service</a> and{" "}
              <a href="#" style={s.footerLink}>Privacy Policy</a>.
            </p>
            <div style={{ marginTop: "0.75rem", fontSize: "0.875rem" }}>
              <span style={{ color: "var(--muted)" }}>Don't have an account? </span>
              <a href="#" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>Sign up now</a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .cj-input:focus-within { border-color: var(--primary); }
      `}</style>
    </div>
  );
}

/* ── Tiny helpers ──────────────────────────────────────── */
function C({ col, children }) {
  const colMap = {
    "code-purple": "var(--code-purple)", "code-orange": "var(--code-orange)",
    "code-blue": "var(--code-blue)", "code-green": "var(--code-green)",
    "muted": "#94a3b8", "muted-dark": "#64748b"
  };
  return <span style={{ color: colMap[col] || "#fff" }}>{children}</span>;
}
function Ind() { return <span style={{ paddingLeft: "1rem" }} />; }

/* ── Styles ────────────────────────────────────────────── */
const s = {
  page: { display: "flex", minHeight: "100vh", overflow: "hidden", fontFamily: "'Space Grotesk', sans-serif", position: "relative" },

  /* Left */
  leftPanel: {
    position: "relative", zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
    width: "50%", background: "rgba(21,21,42,0.82)", padding: "3rem", overflow: "hidden", borderRight: "1px solid var(--border)"
  },
  dotGrid: {
    position: "absolute", inset: 0, backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
    backgroundSize: "24px 24px", opacity: 0.3, pointerEvents: "none"
  },
  blobBlue: {
    position: "absolute", top: "-20%", left: "-10%", width: 600, height: 600,
    background: "rgba(19,19,236,0.08)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none"
  },
  blobPurple: {
    position: "absolute", bottom: "-10%", right: "-10%", width: 500, height: 500,
    background: "rgba(88,28,135,0.08)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none"
  },

  logoRow: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "3rem" },
  logoIcon: {
    width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(19,19,236,0.15)", border: "1px solid rgba(19,19,236,0.25)", borderRadius: 8
  },
  logoText: { color: "#fff", fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.5px" },

  hero: { position: "relative", zIndex: 1, maxWidth: 480 },
  heroH1: { fontSize: "2.8rem", fontWeight: 700, lineHeight: 1.15, color: "#fff", marginBottom: "1rem" },
  heroGrad: { background: "linear-gradient(90deg,#1313ec,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  heroP: { fontSize: "1rem", color: "#94a3b8", lineHeight: 1.6 },

  codeCard: { marginTop: "2rem", borderRadius: 12, padding: "1.25rem", boxShadow: "0 24px 48px rgba(0,0,0,0.4)", transition: "transform 0.3s" },
  dots: { display: "flex", gap: 6, marginBottom: "1rem" },
  dot: { width: 12, height: 12, borderRadius: "50%" },
  codeBody: { display: "flex", flexDirection: "column", gap: 2 },
  codeLine: { display: "flex", gap: "1rem", alignItems: "baseline" },
  lineNo: { color: "#475569", fontSize: "0.78rem", fontFamily: "monospace", minWidth: 14, userSelect: "none" },

  leftFooter: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.82rem", color: "#475569" },
  footerDot: { width: 4, height: 4, borderRadius: "50%", background: "#334155" },

  /* Right */
  rightPanel: {
    flex: 1, background: "rgba(16,16,34,0.82)", display: "flex", alignItems: "center",
    justifyContent: "center", padding: "3rem", position: "relative", overflow: "hidden", zIndex: 1
  },
  blobRight: {
    position: "absolute", top: "25%", right: 0, width: 400, height: 400,
    background: "rgba(19,19,236,0.04)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none"
  },
  formWrap: { width: "100%", maxWidth: 440, position: "relative", zIndex: 1 },
  formTitle: { fontSize: "2rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: "0.4rem" },
  formSub: { color: "var(--muted)", fontSize: "0.95rem" },

  field: { marginBottom: "1.25rem" },
  label: { display: "block", fontSize: "0.85rem", fontWeight: 500, color: "#cbd5e1", marginBottom: "0.5rem" },
  labelRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" },
  forgotLink: {
    fontSize: "0.85rem", color: "var(--primary)", fontWeight: 500, textDecoration: "underline",
    textDecorationColor: "rgba(19,19,236,0.3)", textUnderlineOffset: 3
  },
  inputWrap: { position: "relative" },
  inputIcon: {
    position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
    color: "var(--muted-dark)", fontSize: 18, pointerEvents: "none", fontFamily: "'Material Symbols Outlined'"
  },
  eyeBtn: {
    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
    background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center"
  },

  socialGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", alignItems: "center" },
  socialBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", height: 44,
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
    cursor: "pointer", transition: "background 0.15s"
  },
  footerLink: { color: "#94a3b8", textDecoration: "underline", transition: "color 0.15s" },
};
