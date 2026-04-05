import { useEffect, useRef, useState } from "react";
import { useTelemetryStore } from "../store/useTelemetryStore";

function fmtOffset(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}с назад`;
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}м ${sec.toString().padStart(2, "0")}с назад`;
}

export function TimeScrubber() {
  const snapshots = useTelemetryStore((s) => s.snapshots);
  const replayIndex = useTelemetryStore((s) => s.replayIndex);
  const setReplay   = useTelemetryStore((s) => s.setReplay);
  const replayWindow = useTelemetryStore((s) => s.replayWindow);
  const setReplayWindow = useTelemetryStore((s) => s.setReplayWindow);

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
        const prev = useTelemetryStore.getState().replayIndex;
        const next = (prev ?? 0) + 1;
          if (next >= total - 1) {
            setPlaying(false);
            setReplay(null); // вернулись в live
            return;
          }
          setReplay(next);
      }, 200);
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [playing, replayIndex, total]);

  if (total < 2) return null;

  return (
    <div className="time-scrubber">

      {/* окно истории */}
      <div className="time-window">
        {[5, 15].map((m) => (
          <button
            key={m}
            onClick={() => {
              setReplayWindow(m);
              setReplay(null);
              setPlaying(false);
            }}
            className={
              replayWindow === m
                ? "time-window-btn time-window-btn--active"
                : "time-window-btn"
            }
          >
            {m}м
          </button>
        ))}
      </div>

      {/* кнопка live */}
      <button
        onClick={() => { setReplay(null); setPlaying(false); }}
        className={isLive ? "time-live-btn time-live-btn--live" : "time-live-btn"}
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
        className="time-play-btn"
      >
        {playing ? "⏸" : "▶"}
      </button>

      {/* слайдер */}
      <input
        title="Перемотка"
        type="range"
        min={0}
        max={total - 1}
        value={idx}
        onChange={(e) => {
          setPlaying(false);
          const v = parseInt(e.target.value);
          setReplay(v === total - 1 ? null : v);
        }}
        className={isLive ? "time-slider time-slider--live" : "time-slider"}
      />

      {/* время */}
      <span className={isLive ? "time-label time-label--live" : "time-label"}>
        {isLive ? "сейчас" : (
          <>
            {fmtOffset(offsetMs)}
            {currentSnap && (
              <span className="time-label-abs">
                {new Date(currentSnap.ts).toLocaleString("ru-RU", {
                  day: "2-digit", month: "2-digit",
                  hour: "2-digit", minute: "2-digit", second: "2-digit",
                })}
              </span>
            )}
          </>
        )}
      </span>
    </div>
  );
}
