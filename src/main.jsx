import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./styles/theme.css"; // CSS variables + body base
import "./index.css";        // Global resets + scrollbar

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const root = ReactDOM.createRoot(document.getElementById("root"));

if (!clientId) {
  root.render(
    <div style={{ padding: "2rem", fontFamily: "Inter, system-ui, sans-serif", color: "#e5e7eb", background: "#0b0b0f", minHeight: "100vh" }}>
      <h1 style={{ color: "#a855f7" }}>Missing Google OAuth Client ID</h1>
      <p>
        Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>client/.env</code> and
        restart the dev server.
      </p>
    </div>
  );
} else {
  root.render(
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  );
}
