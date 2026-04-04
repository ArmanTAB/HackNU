import { useEffect, useRef, useState } from "react";
import { useTelemetryStore } from "../store/useTelemetryStore";

function fmtOffset(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}с назад`;
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}м ${sec.toString().padStart(2, "0")}с назад`;
}

export function TimeScrubber() {
  const snapshots   = useTelemetryStore((s) => s.snapshots);
  const replayIndex = useTelemetryStore((s) => s.replayIndex);
  const setReplay   = useTelemetryStore((s) => s.setReplay);

  const [playing, setPlaying]   = useState(false);
  const playRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = snapshots.length;
  const idx   = replayIndex ?? total - 1;
  const isLive = replayIndex === null;

  const currentSnap = snapshots[idx];
  const latestSnap  = snapshots[total - 1];
  const offsetMs    = currentSnap && latestSnap
    ? latestSnap.ts - currentSnap.ts
    : 0;

  // автовоспроизведение
  useEffect(() => {
    if (playing && replayIndex !== null) {
      playRef.current = setInterval(() => {
        setReplay((prev: number | null) => {
          const next = (prev ?? 0) + 1;
          if (next >= total - 1) {
            setPlaying(false);
            return null; // вернулись в live
          }
          return next;
        });
      }, 200);
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [playing, replayIndex, total]);

  if (total < 2) return null;

  return (
    <div style={{
      position: "absolute",
      bottom: 14,
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(15,28,46,.82)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255,255,255,.12)",
      borderRadius: 12,
      padding: "8px 14px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      minWidth: 360,
      zIndex: 20,
      boxShadow: "0 4px 20px rgba(0,0,0,.35)",
    }}>

      {/* кнопка live */}
      <button
        onClick={() => { setReplay(null); setPlaying(false); }}
        style={{
          padding: "4px 10px",
          borderRadius: 6,
          border: "none",
          background: isLive ? "var(--ok)" : "rgba(255,255,255,.1)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".08em",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        ● LIVE
      </button>

      {/* play/pause */}
      <button
        onClick={() => {
          if (isLive) {
            // войти в replay с начала последнего кадра
            setReplay(0);
            setPlaying(true);
          } else {
            setPlaying((p) => !p);
          }
        }}
        style={{
          width: 28, height: 28,
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,.15)",
          background: "rgba(255,255,255,.08)",
          color: "#fff",
          fontSize: 13,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {playing ? "⏸" : "▶"}
      </button>

      {/* слайдер */}
      <input
        type="range"
        min={0}
        max={total - 1}
        value={idx}
        onChange={(e) => {
          setPlaying(false);
          const v = parseInt(e.target.value);
          setReplay(v === total - 1 ? null : v);
        }}
        style={{ flex: 1, accentColor: isLive ? "var(--ok)" : "var(--cyan)", cursor: "pointer" }}
      />

      {/* время */}
      <span style={{
        fontSize: 12,
        color: isLive ? "var(--ok)" : "rgba(255,255,255,.65)",
        whiteSpace: "nowrap",
        minWidth: 90,
        textAlign: "right",
        fontVariantNumeric: "tabular-nums",
      }}>
        {isLive ? "сейчас" : fmtOffset(offsetMs)}
      </span>
    </div>
  );
}
