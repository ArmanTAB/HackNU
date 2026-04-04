import { useEffect, useState } from "react";
import { useTelemetryStore } from "../store/useTelemetryStore";

interface RouteInfo {
  serial: string;
  route: string;
  from: string;
  to: string;
  distance: string;
  driver: string;
}

interface Props {
  routeInfo?: RouteInfo;
  onBack?: () => void;
}

export function Topbar({ routeInfo, onBack }: Props) {
  const connected = useTelemetryStore((s) => s.connected);
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const t = setInterval(
      () => setClock(new Date().toLocaleTimeString("ru-RU")),
      1000,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="topbar">
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "1.5px solid var(--border)",
            borderRadius: 4,
            padding: "2px 8px",
            cursor: "pointer",
            fontSize: 12,
            color: "var(--text2)",
            fontFamily: "'Courier New', monospace",
            marginRight: 4,
          }}
        >
          ←
        </button>
      )}
      <span className="t-title">Цифровой двойник</span>
      {routeInfo ? (
        <>
          <span className="t-sub">
            EMD SD40-2 · {routeInfo.serial} · МАРШРУТ {routeInfo.route}
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text3)",
              letterSpacing: ".06em",
            }}
          >
            {routeInfo.from} → {routeInfo.to} · {routeInfo.distance}
          </span>
          <span style={{ fontSize: 10, color: "var(--text3)" }}>
            {routeInfo.driver}
          </span>
        </>
      ) : (
        <span className="t-sub">EMD SD40-2 · СЕР.0847 · МАРШРУТ А-07</span>
      )}
      <div className="t-right">
        <div
          className="live"
          style={{ color: connected ? "var(--ok)" : "var(--crit)" }}
        >
          <div
            className="live-dot"
            style={{ background: connected ? "var(--ok)" : "var(--crit)" }}
          />
          {connected ? "LIVE · 1Hz" : "НЕТ СВЯЗИ"}
        </div>
        <span style={{ fontSize: 10, color: "var(--text3)" }}>{clock}</span>
      </div>
    </div>
  );
}
