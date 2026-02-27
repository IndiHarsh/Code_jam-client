import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { sendChatMessage } from "../services/chatbot";
import "../styles/chatbot.css";

const WELCOME = {
    role: "bot",
    text: "👋 Hi! I'm **CodeJam Assistant**, powered by Qwen.\nAsk me anything about coding, debugging, or algorithms!",
};

export default function Chatbot() {
    const [open, setOpen] = useState(false);
    const [closing, setClosing] = useState(false);
    const [messages, setMessages] = useState([WELCOME]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    useEffect(() => {
        if (open && !closing) setTimeout(() => inputRef.current?.focus(), 180);
    }, [open, closing]);

    function togglePanel() {
        if (open) {
            setClosing(true);
            setTimeout(() => { setOpen(false); setClosing(false); }, 180);
        } else {
            setOpen(true);
        }
    }

    async function handleSend() {
        const text = input.trim();
        if (!text || loading) return;

        setMessages(prev => [...prev, { role: "user", text }]);
        setInput("");
        setLoading(true);

        try {
            const reply = await sendChatMessage(text, history);
            setMessages(prev => [...prev, { role: "bot", text: reply }]);
            setHistory(prev => [
                ...prev,
                { role: "user", content: text },
                { role: "assistant", content: reply },
            ]);
        } catch (err) {
            console.error("[Chatbot] error:", err);
            setMessages(prev => [
                ...prev,
                { role: "bot", text: `⚠️ **Error:** ${err.message || "Couldn't reach the server."}` },
            ]);
        } finally {
            setLoading(false);
        }
    }

    function handleKey(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <>
            {open && (
                <div className={`cj-chat-panel${closing ? " closing" : ""}`}>

                    {/* Header */}
                    <div className="cj-chat-header">
                        <div className="cj-chat-avatar">🤖</div>
                        <div>
                            <div className="cj-chat-title">CodeJam Assistant</div>
                            <div className="cj-chat-sub">Powered by Qwen · NVIDIA NIM</div>
                        </div>
                        <button className="cj-chat-close" onClick={togglePanel} aria-label="Close chat">
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="cj-chat-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`cj-msg ${msg.role}`}>
                                <ReactMarkdown
                                    components={{
                                        // Render code blocks with a styled pre/code
                                        code({ inline, className, children, ...props }) {
                                            return inline ? (
                                                <code className="cj-code-inline" {...props}>{children}</code>
                                            ) : (
                                                <pre className="cj-code-block"><code {...props}>{children}</code></pre>
                                            );
                                        },
                                        // Open links in new tab
                                        a({ href, children }) {
                                            return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                                        },
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        ))}

                        {loading && (
                            <div className="cj-typing">
                                <span /><span /><span />
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input row */}
                    <div className="cj-chat-input-row">
                        <textarea
                            ref={inputRef}
                            className="cj-chat-input"
                            rows={1}
                            placeholder="Ask anything… (Enter to send)"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            disabled={loading}
                        />
                        <button
                            className="cj-chat-send"
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            aria-label="Send message"
                        >
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <button
                className={`cj-chat-btn${open ? " open" : ""}`}
                onClick={togglePanel}
                aria-label="Toggle CodeJam Assistant"
            >
                <span className="cb-icon">
                    {open ? "close" : "smart_toy"}
                </span>
                {!open && <span className="cj-chat-badge" />}
            </button>
        </>
    );
}
