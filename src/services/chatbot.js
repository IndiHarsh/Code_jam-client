const API = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

/**
 * Send a chat message to the Gemini-powered backend.
 * Uses native fetch to avoid any axios header issues with CORS.
 * @param {string} message   User's current message
 * @param {Array}  history   Prior turns [{ role: "user"|"model", parts: [{ text }] }]
 * @returns {Promise<string>} Bot reply text
 */
export async function sendChatMessage(message, history = []) {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API}/chatbot/message`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message, history }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.text;
}
