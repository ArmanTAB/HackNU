import { useEffect, useState } from "react";
import { useTelemetryStore } from "../store/useTelemetryStore";

interface RouteInfo {
  serial: string;
  route: string;
  from: string;
  to: string;
  distance: string;
  driver: string;
  phone?: string;
}

interface Props {
  routeInfo?: RouteInfo;
  onBack?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export function Topbar({ routeInfo, onBack, actionLabel, onAction }: Props) {
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
          {routeInfo.phone && (
            <a
              href={`tel:${routeInfo.phone.replace(/\s+/g, "")}`}
              style={{
                marginLeft: 6,
                padding: "4px 8px",
                borderRadius: 6,
                border: "1.5px solid var(--border)",
                fontSize: 12,
                color: "var(--text2)",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Позвонить
            </a>
          )}
        </>
      ) : (
        <span className="t-sub">EMD SD40-2 · СЕР.0847 · МАРШРУТ А-07</span>
      )}
      <div className="t-right">
        {actionLabel && onAction && (
          <button className="t-action" onClick={onAction}>
            {actionLabel}
          </button>
        )}
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
