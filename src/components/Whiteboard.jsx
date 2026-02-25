import { useEffect, useRef, useState } from "react";
import { socket } from "../socket/socket";

const HANDWRITING = "'Caveat', cursive";
const COLORS = ["#ffffff", "#f87171", "#fb923c", "#facc15", "#4ade80", "#60a5fa", "#c084fc", "#f472b6", "#000000"];

let _uid = 0;
function uid() { return `wb_${++_uid}_${Date.now().toString(36)}`; }

/* ═══════════════ Object helpers ═══════════════ */

function getBounds(obj) {
    if (!obj) return null;
    const pad = (obj.width || 2) / 2 + 6;

    if (obj.type === "stroke") {
        if (!obj.points?.length) return null;
        const xs = obj.points.map(p => p.x), ys = obj.points.map(p => p.y);
        return {
            x: Math.min(...xs) - pad, y: Math.min(...ys) - pad,
            w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2
        };
    }
    if (obj.type === "text") {
        const fh = (obj.fontSize || 28) * 1.3;
        const fw = (obj.text?.length || 1) * (obj.fontSize || 28) * 0.56;
        return { x: obj.x, y: obj.y - fh * 0.82, w: Math.max(fw, 40), h: fh };
    }
    const x0 = Math.min(obj.x0 ?? 0, obj.x1 ?? 0);
    const y0 = Math.min(obj.y0 ?? 0, obj.y1 ?? 0);
    const x1 = Math.max(obj.x0 ?? 0, obj.x1 ?? 0);
    const y1 = Math.max(obj.y0 ?? 0, obj.y1 ?? 0);
    return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

function hitTest(obj, x, y) {
    const b = getBounds(obj);
    return b ? (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) : false;
}

const HANDLE_IDS = ["nw", "ne", "sw", "se"];
function handlePos(b, h) {
    return { nw: { x: b.x, y: b.y }, ne: { x: b.x + b.w, y: b.y }, sw: { x: b.x, y: b.y + b.h }, se: { x: b.x + b.w, y: b.y + b.h } }[h];
}
function nearHandle(b, x, y) {
    for (const h of HANDLE_IDS) {
        const p = handlePos(b, h);
        if (Math.hypot(x - p.x, y - p.y) < 9) return h;
    }
    return null;
}

/* ═══════════════ Draw helpers ═══════════════ */

function drawObj(ctx, obj) {
    ctx.save();
    ctx.strokeStyle = obj.color || "#fff";
    ctx.fillStyle = obj.color || "#fff";
    ctx.lineWidth = obj.width || 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (obj.type) {
        case "stroke": {
            const pts = obj.points;
            if (!pts?.length) break;
            if (obj.eraser) { ctx.globalCompositeOperation = "destination-out"; ctx.strokeStyle = "rgba(0,0,0,1)"; ctx.lineWidth = (obj.width || 2) * 3; }
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length - 1; i++) {
                const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
            }
            if (pts.length > 1) ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            ctx.stroke();
            ctx.globalCompositeOperation = "source-over";
            break;
        }
        case "line":
            ctx.beginPath(); ctx.moveTo(obj.x0, obj.y0); ctx.lineTo(obj.x1, obj.y1); ctx.stroke(); break;
        case "arrow": {
            const dx = obj.x1 - obj.x0, dy = obj.y1 - obj.y0;
            const angle = Math.atan2(dy, dx);
            const hs = 12 + (obj.width || 2) * 1.5; // head size
            ctx.beginPath(); ctx.moveTo(obj.x0, obj.y0); ctx.lineTo(obj.x1, obj.y1); ctx.stroke();
            // Filled arrowhead
            ctx.beginPath();
            ctx.moveTo(obj.x1, obj.y1);
            ctx.lineTo(obj.x1 - hs * Math.cos(angle - Math.PI / 6), obj.y1 - hs * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(obj.x1 - hs * Math.cos(angle + Math.PI / 6), obj.y1 - hs * Math.sin(angle + Math.PI / 6));
            ctx.closePath(); ctx.fill();
            break;
        }
        case "rect":
            ctx.strokeRect(obj.x0, obj.y0, obj.x1 - obj.x0, obj.y1 - obj.y0); break;
        case "circle": {
            const rx = Math.abs(obj.x1 - obj.x0) / 2, ry = Math.abs(obj.y1 - obj.y0) / 2;
            ctx.beginPath();
            ctx.ellipse(obj.x0 + (obj.x1 - obj.x0) / 2, obj.y0 + (obj.y1 - obj.y0) / 2, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke(); break;
        }
        case "text":
            ctx.font = `${obj.fontSize || 28}px ${HANDWRITING}`;
            ctx.fillText(obj.text || "", obj.x, obj.y); break;
    }
    ctx.restore();
}

function drawSelection(ctx, obj) {
    const b = getBounds(obj); if (!b) return;
    ctx.save();
    ctx.strokeStyle = "#1313ec";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
    ctx.setLineDash([]);
    if (obj.type !== "stroke") {
        for (const h of HANDLE_IDS) {
            const p = handlePos(b, h);
            ctx.fillStyle = "#fff"; ctx.strokeStyle = "#1313ec"; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
    }
    ctx.restore();
}

/* ═══════════════ Main Component ═══════════════ */

export default function Whiteboard({ roomId }) {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const dprRef = useRef(1);
    const objsRef = useRef([]);     // master object list

    const drawingRef = useRef(false);
    const startPtRef = useRef({ x: 0, y: 0 });
    const curStrokeRef = useRef([]);
    const snapRef = useRef(null);
    const selIdRef = useRef(null);
    const movingRef = useRef(false);
    const movePtRef = useRef({ x: 0, y: 0 });
    const resizeHRef = useRef(null);
    const resizeObjRef = useRef(null);

    const [tool, setTool] = useState("pen");
    const [color, setColor] = useState("#ffffff");
    const [lineW, setLineW] = useState(3);
    const [textSz, setTextSz] = useState(30);
    const [selId, setSelId] = useState(null);
    const [textBox, setTextBox] = useState(null); // {x, y, value}

    selIdRef.current = selId;

    /* ── Canvas init ──────────────────────────────────────── */
    function initCanvas() {
        const canvas = canvasRef.current; if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        dprRef.current = dpr;
        const { width: w, height: h } = canvas.parentElement.getBoundingClientRect();
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);
        ctxRef.current = ctx;
        redraw();
    }

    useEffect(() => {
        const t = setTimeout(initCanvas, 0);
        const onResize = () => {
            const c = canvasRef.current; if (!c) return;
            const img = new Image();
            img.src = c.toDataURL();
            img.onload = () => { initCanvas(); ctxRef.current?.drawImage(img, 0, 0, c.width / dprRef.current, c.height / dprRef.current); };
        };
        window.addEventListener("resize", onResize);
        return () => { clearTimeout(t); window.removeEventListener("resize", onResize); };
    }, []);

    /* ── Redraw ───────────────────────────────────────────── */
    function redraw() {
        const ctx = ctxRef.current, c = canvasRef.current;
        if (!ctx || !c) return;
        ctx.clearRect(0, 0, c.width / dprRef.current, c.height / dprRef.current);
        for (const o of objsRef.current) drawObj(ctx, o);
        const sel = objsRef.current.find(o => o.id === selIdRef.current);
        if (sel) drawSelection(ctx, sel);
    }

    /* ── Socket ───────────────────────────────────────────── */
    useEffect(() => {
        socket.on("WB_OBJECTS_SYNC", ({ objects }) => { objsRef.current = objects || []; redraw(); });
        socket.on("WHITEBOARD_CLEAR", () => { objsRef.current = []; setSelId(null); redraw(); });
        return () => { socket.off("WB_OBJECTS_SYNC"); socket.off("WHITEBOARD_CLEAR"); };
    }, []);

    function sync() { socket.emit("WB_OBJECTS_SYNC", { roomId, objects: objsRef.current }); }

    /* ── Keyboard shortcuts ───────────────────────────────── */
    useEffect(() => {
        const keys = { v: "select", p: "pen", e: "eraser", l: "line", a: "arrow", r: "rect", c: "circle", t: "text" };
        function onKey(e) {
            if (textBox) { if (e.key === "Escape") setTextBox(null); return; }
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
            const t = keys[e.key.toLowerCase()];
            if (t) setTool(t);
            if ((e.key === "Delete" || e.key === "Backspace") && selIdRef.current) {
                objsRef.current = objsRef.current.filter(o => o.id !== selIdRef.current);
                setSelId(null); selIdRef.current = null; sync(); redraw();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "z") {
                objsRef.current.pop(); setSelId(null); sync(); redraw(); e.preventDefault();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [textBox]);

    /* ── getPos ───────────────────────────────────────────── */
    function getPos(e) {
        const r = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    /* ── Mouse down ───────────────────────────────────────── */
    function onMouseDown(e) {
        const p = getPos(e);

        if (tool === "text") {
            setTextBox({ x: p.x, y: p.y, value: "" });
            return;
        }

        if (tool === "select") {
            const sel = objsRef.current.find(o => o.id === selIdRef.current);
            if (sel) {
                const b = getBounds(sel);
                const h = nearHandle(b, p.x, p.y);
                if (h && sel.type !== "stroke") {
                    resizeHRef.current = h;
                    resizeObjRef.current = JSON.parse(JSON.stringify(sel));
                    drawingRef.current = true;
                    return;
                }
            }
            // Hit test (last = on top)
            let found = null;
            for (let i = objsRef.current.length - 1; i >= 0; i--) {
                if (hitTest(objsRef.current[i], p.x, p.y)) { found = objsRef.current[i]; break; }
            }
            if (found) {
                setSelId(found.id); selIdRef.current = found.id;
                movingRef.current = true; movePtRef.current = p;
            } else {
                setSelId(null); selIdRef.current = null;
            }
            drawingRef.current = true;
            redraw();
            return;
        }

        drawingRef.current = true;
        startPtRef.current = p;
        if (tool === "pen" || tool === "eraser") {
            curStrokeRef.current = [p];
        } else {
            snapRef.current = ctxRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }

    /* ── Mouse move ───────────────────────────────────────── */
    function onMouseMove(e) {
        if (!drawingRef.current) return;
        const p = getPos(e);

        if (tool === "select") {
            const sel = objsRef.current.find(o => o.id === selIdRef.current);

            // Resize
            if (resizeHRef.current && sel && sel.type !== "stroke") {
                const h = resizeHRef.current;
                const idx = objsRef.current.findIndex(o => o.id === sel.id);
                if (idx >= 0) {
                    const u = { ...sel };
                    if (h === "nw") { u.x0 = p.x; u.y0 = p.y; }
                    else if (h === "ne") { u.x1 = p.x; u.y0 = p.y; }
                    else if (h === "sw") { u.x0 = p.x; u.y1 = p.y; }
                    else if (h === "se") { u.x1 = p.x; u.y1 = p.y; }
                    objsRef.current[idx] = u;
                    redraw();
                }
                return;
            }

            // Move
            if (movingRef.current && sel) {
                const dx = p.x - movePtRef.current.x, dy = p.y - movePtRef.current.y;
                movePtRef.current = p;
                const idx = objsRef.current.findIndex(o => o.id === sel.id);
                if (idx >= 0) {
                    const u = { ...sel };
                    if (u.type === "stroke") u.points = u.points.map(pt => ({ x: pt.x + dx, y: pt.y + dy }));
                    else if (u.type === "text") { u.x += dx; u.y += dy; }
                    else { u.x0 += dx; u.y0 += dy; u.x1 += dx; u.y1 += dy; }
                    objsRef.current[idx] = u;
                    redraw();
                }
            }
            return;
        }

        const ctx = ctxRef.current;

        if (tool === "pen" || tool === "eraser") {
            curStrokeRef.current.push(p);
            const pts = curStrokeRef.current;
            ctx.save();
            ctx.lineCap = "round"; ctx.lineJoin = "round";
            ctx.lineWidth = tool === "eraser" ? lineW * 3 : lineW;
            if (tool === "eraser") { ctx.globalCompositeOperation = "destination-out"; ctx.strokeStyle = "rgba(0,0,0,1)"; }
            else { ctx.strokeStyle = color; }
            if (pts.length >= 2) {
                ctx.beginPath();
                ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
                ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
                ctx.stroke();
            }
            ctx.restore();
            return;
        }

        // Shape preview
        if (snapRef.current) ctx.putImageData(snapRef.current, 0, 0);
        const s = startPtRef.current;
        ctx.save();
        ctx.strokeStyle = color; ctx.lineWidth = lineW; ctx.lineCap = "round"; ctx.lineJoin = "round";
        if (tool === "line" || tool === "arrow") {
            ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(p.x, p.y); ctx.stroke();
            if (tool === "arrow") {
                const angle = Math.atan2(p.y - s.y, p.x - s.x);
                const hs = 12 + lineW * 1.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - hs * Math.cos(angle - Math.PI / 6), p.y - hs * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(p.x - hs * Math.cos(angle + Math.PI / 6), p.y - hs * Math.sin(angle + Math.PI / 6));
                ctx.closePath(); ctx.fill();
            }
        } else if (tool === "rect") {
            ctx.strokeRect(s.x, s.y, p.x - s.x, p.y - s.y);
        } else if (tool === "circle") {
            const rx = Math.abs(p.x - s.x) / 2, ry = Math.abs(p.y - s.y) / 2;
            ctx.beginPath(); ctx.ellipse(s.x + (p.x - s.x) / 2, s.y + (p.y - s.y) / 2, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
    }

    /* ── Mouse up ─────────────────────────────────────────── */
    function onMouseUp(e) {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        const p = getPos(e);

        if (tool === "select") {
            if (resizeHRef.current) { resizeHRef.current = null; sync(); }
            else if (movingRef.current) { movingRef.current = false; sync(); }
            return;
        }

        const s = startPtRef.current;

        if (tool === "pen" || tool === "eraser") {
            const pts = [...curStrokeRef.current, p];
            if (pts.length > 1) {
                objsRef.current.push({ id: uid(), type: "stroke", points: pts, color, width: lineW, eraser: tool === "eraser" });
                sync();
            }
            curStrokeRef.current = [];
            redraw();
            return;
        }

        let obj = null;
        if (tool === "line") obj = { id: uid(), type: "line", x0: s.x, y0: s.y, x1: p.x, y1: p.y, color, width: lineW };
        if (tool === "arrow") obj = { id: uid(), type: "arrow", x0: s.x, y0: s.y, x1: p.x, y1: p.y, color, width: lineW };
        if (tool === "rect") obj = { id: uid(), type: "rect", x0: s.x, y0: s.y, x1: p.x, y1: p.y, color, width: lineW };
        if (tool === "circle") obj = { id: uid(), type: "circle", x0: s.x, y0: s.y, x1: p.x, y1: p.y, color, width: lineW };
        if (obj) { objsRef.current.push(obj); sync(); redraw(); }
        snapRef.current = null;
    }

    /* ── Text commit ──────────────────────────────────────── */
    function commitText() {
        if (textBox?.value?.trim()) {
            const obj = { id: uid(), type: "text", x: textBox.x, y: textBox.y + textSz, text: textBox.value, fontSize: textSz, color };
            objsRef.current.push(obj); sync(); redraw();
        }
        setTextBox(null);
    }

    /* ── Touch ────────────────────────────────────────────── */
    const onTouchStart = e => { e.preventDefault(); onMouseDown(e.touches[0]); };
    const onTouchMove = e => { e.preventDefault(); onMouseMove(e.touches[0]); };
    const onTouchEnd = e => { e.preventDefault(); onMouseUp(e.changedTouches[0]); };

    /* ── Cursor ───────────────────────────────────────────── */
    const cursor = tool === "select" ? (selId ? "move" : "default") : "crosshair";

    return (
        <div style={st.wrap}>
            {/* ── Toolbar ─────────────────────────────────────── */}
            <div style={st.bar}>
                {/* Tools */}
                <Group>
                    {[
                        { id: "select", tip: "Select / Move  V", icon: <SelectIco /> },
                        { id: "pen", tip: "Pen  P", icon: <PenIco /> },
                        { id: "eraser", tip: "Eraser  E", icon: <EraserIco /> },
                        { id: "line", tip: "Line  L", icon: <LineIco /> },
                        { id: "arrow", tip: "Arrow  A", icon: <ArrowIco /> },
                        { id: "rect", tip: "Rectangle  R", icon: <RectIco /> },
                        { id: "circle", tip: "Circle  C", icon: <CircleIco /> },
                        { id: "text", tip: "Text  T", icon: <TextIco /> },
                    ].map(({ id, tip, icon }) => (
                        <Btn key={id} tip={tip} on={tool === id} onClick={() => setTool(id)}>{icon}</Btn>
                    ))}
                </Group>

                <Sep />

                {/* Colors */}
                <Group>
                    {COLORS.map(c => (
                        <div key={c} onClick={() => setColor(c)} title={c}
                            style={{
                                width: 18, height: 18, borderRadius: "50%", background: c, cursor: "pointer", flexShrink: 0,
                                outline: color === c ? "2px solid #fff" : "2px solid transparent", outlineOffset: 2
                            }} />
                    ))}
                </Group>

                <Sep />

                {/* Stroke size */}
                <Group>
                    <span style={st.lbl}>Size {lineW}</span>
                    <input type="range" min={1} max={24} value={lineW}
                        onChange={e => setLineW(+e.target.value)} style={{ width: 70, accentColor: "#1313ec" }} />
                </Group>

                {/* Text size (only when text tool active) */}
                {tool === "text" && (
                    <>
                        <Sep />
                        <Group>
                            <span style={st.lbl}>Font {textSz}</span>
                            <input type="range" min={14} max={80} value={textSz}
                                onChange={e => setTextSz(+e.target.value)} style={{ width: 70, accentColor: "#1313ec" }} />
                        </Group>
                    </>
                )}

                <Sep />

                {/* Actions */}
                <Group>
                    {selId && <Btn tip="Delete selected  Del" onClick={() => {
                        objsRef.current = objsRef.current.filter(o => o.id !== selId);
                        setSelId(null); selIdRef.current = null; sync(); redraw();
                    }}><TrashIco /></Btn>}
                    <Btn tip="Undo  Ctrl+Z" onClick={() => { objsRef.current.pop(); setSelId(null); sync(); redraw(); }}><UndoIco /></Btn>
                    <Btn tip="Clear all" onClick={() => {
                        if (confirm("Clear whiteboard for all participants?")) {
                            objsRef.current = []; setSelId(null);
                            socket.emit("WHITEBOARD_CLEAR", { roomId }); redraw();
                        }
                    }}><ClearIco /></Btn>
                </Group>
            </div>

            {/* ── Canvas area ─────────────────────────────────── */}
            <div style={st.wrap2}>
                <canvas ref={canvasRef} style={{ ...st.canvas, cursor }}
                    onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
                    onMouseLeave={() => { drawingRef.current = false; }}
                    onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} />

                {/* ── Inline text box ─────────────────────────── */}
                {textBox && (
                    <div
                        style={{ position: "absolute", left: textBox.x, top: textBox.y, zIndex: 20, minWidth: 160 }}
                        onMouseDown={e => e.stopPropagation()}
                        onMouseUp={e => e.stopPropagation()}
                    >
                        <textarea
                            autoFocus rows={3}
                            placeholder="Type… Enter=done  Shift+Enter=newline  Esc=cancel"
                            value={textBox.value}
                            onChange={e => setTextBox(prev => ({ ...prev, value: e.target.value }))}
                            onKeyDown={e => {
                                e.stopPropagation();
                                if (e.key === "Escape") { setTextBox(null); return; }
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(); }
                            }}
                            style={{
                                fontFamily: HANDWRITING, fontSize: textSz, color,
                                background: "rgba(13,13,31,0.88)", backdropFilter: "blur(8px)",
                                border: "2px solid rgba(99,102,241,0.7)", borderRadius: 8,
                                outline: "none", padding: "6px 8px", resize: "none",
                                caretColor: color, lineHeight: 1.4, width: 220,
                                boxShadow: "0 4px 24px rgba(0,0,0,0.6)", display: "block"
                            }}
                        />
                        <div style={{ display: "flex", gap: "0.4rem", marginTop: 4 }}>
                            <button onClick={commitText}
                                style={{
                                    background: "#1313ec", border: "none", borderRadius: 6,
                                    color: "#fff", fontSize: "0.75rem", padding: "0.25rem 0.7rem",
                                    cursor: "pointer", fontFamily: "inherit"
                                }}>
                                ✓ Apply
                            </button>
                            <button onClick={() => setTextBox(null)}
                                style={{
                                    background: "transparent", border: "1px solid #323267",
                                    borderRadius: 6, color: "#64748b", fontSize: "0.75rem",
                                    padding: "0.25rem 0.7rem", cursor: "pointer", fontFamily: "inherit"
                                }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        .wb-btn:hover { background: rgba(255,255,255,0.1) !important; }
      `}</style>
        </div>
    );
}

/* ── Tiny UI components ─────────────────────────────────── */
function Group({ children }) {
    return <div style={{ display: "flex", gap: "0.2rem", alignItems: "center" }}>{children}</div>;
}
function Sep() {
    return <div style={{ width: 1, height: 20, background: "rgba(50,50,103,0.5)", margin: "0 0.2rem" }} />;
}
function Btn({ children, on, tip, onClick }) {
    return (
        <button className="wb-btn" title={tip} onClick={onClick}
            style={{
                width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                background: on ? "rgba(19,19,236,0.25)" : "transparent",
                border: on ? "1px solid rgba(19,19,236,0.5)" : "1px solid transparent",
                color: on ? "#818cf8" : "#64748b", borderRadius: 7, cursor: "pointer",
                transition: "background 0.12s, color 0.12s"
            }}>
            {children}
        </button>
    );
}

/* ── SVG icons ──────────────────────────────────────────── */
const V = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
function SelectIco() { return <svg {...V}><path d="M5 3l14 9-7 1-4 7z" /></svg>; }
function PenIco() { return <svg {...V}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>; }
function EraserIco() { return <svg {...V}><path d="M20 20H7L3 16l11-11 6 6z" /><path d="M6 17l5-5" /></svg>; }
function LineIco() { return <svg {...V}><line x1="5" y1="19" x2="19" y2="5" /></svg>; }
function RectIco() { return <svg {...V}><rect x="3" y="3" width="18" height="18" rx="2" /></svg>; }
function CircleIco() { return <svg {...V}><circle cx="12" cy="12" r="9" /></svg>; }
function TextIco() { return <svg {...V}><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>; }
function ArrowIco() { return <svg {...V}><line x1="5" y1="19" x2="19" y2="5" /><polyline points="9 5 19 5 19 15" /></svg>; }
function UndoIco() { return <svg {...V}><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>; }
function TrashIco() { return <svg {...V}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>; }
function ClearIco() { return <svg {...V}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>; }

/* ── Styles ─────────────────────────────────────────────── */
const st = {
    wrap: { display: "flex", flexDirection: "column", height: "100%", background: "#0d0d1f" },
    bar: {
        display: "flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap",
        padding: "0.4rem 0.6rem", background: "#11112a", borderBottom: "1px solid rgba(50,50,103,0.4)",
        flexShrink: 0
    },
    lbl: { fontSize: "0.72rem", color: "#475569", whiteSpace: "nowrap" },
    wrap2: { flex: 1, position: "relative", overflow: "hidden" },
    canvas: { position: "absolute", top: 0, left: 0, display: "block", touchAction: "none" },
};
