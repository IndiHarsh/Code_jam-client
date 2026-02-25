import { useEffect, useRef } from "react";
import { socket } from "../socket/socket";

/**
 * Hackathon integrity monitor.
 * Detects: tab switch, window blur, fullscreen exit, clipboard paste, idle.
 * Emits MONITOR_EVENT via socket to the server for scoring.
 */
export function useMonitor(roomId, enabled = true) {
    const idleTimer = useRef(null);
    const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes idle

    function emit(type) {
        if (!enabled || !roomId) return;
        socket.emit("MONITOR_EVENT", {
            roomId,
            type,
            timestamp: Date.now()
        });
    }

    function resetIdle() {
        clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => emit("IDLE"), IDLE_THRESHOLD);
    }

    useEffect(() => {
        if (!enabled) return;

        // ── Tab visibility change ────────────────────────────────────
        function onVisibilityChange() {
            if (document.visibilityState === "hidden") {
                emit("TAB_SWITCH");
            }
        }

        // ── Window blur (alt-tab, clicking outside) ──────────────────
        function onBlur() {
            emit("WINDOW_BLUR");
        }

        // ── Fullscreen exit ──────────────────────────────────────────
        function onFullscreenChange() {
            if (!document.fullscreenElement) {
                emit("FULLSCREEN_EXIT");
            }
        }

        // ── Paste detection ──────────────────────────────────────────
        function onPaste() {
            emit("PASTE");
        }

        // ── Idle detection (reset on user activity) ──────────────────
        const activityEvents = ["mousemove", "keydown", "click", "scroll"];
        activityEvents.forEach(ev => window.addEventListener(ev, resetIdle, { passive: true }));
        resetIdle(); // start timer immediately

        document.addEventListener("visibilitychange", onVisibilityChange);
        window.addEventListener("blur", onBlur);
        document.addEventListener("fullscreenchange", onFullscreenChange);
        document.addEventListener("paste", onPaste);

        return () => {
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.removeEventListener("blur", onBlur);
            document.removeEventListener("fullscreenchange", onFullscreenChange);
            document.removeEventListener("paste", onPaste);
            activityEvents.forEach(ev => window.removeEventListener(ev, resetIdle));
            clearTimeout(idleTimer.current);
        };
    }, [roomId, enabled]);
}
