import { useEffect, useState } from "react";
import { useTelemetryStore } from "../store/useTelemetryStore";
import { useThemeStore } from "../store/useThemeStore";

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
  const { dark, toggle } = useThemeStore();
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString("ru-RU")), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="topbar">
      {onBack && (
        <button className="t-back" onClick={onBack}>←</button>
      )}

      <span className="t-title">Цифровой двойник</span>
      <div className="t-divider" />

      {routeInfo ? (
        <>
          <span className="t-sub">
            EMD SD40-2 · {routeInfo.serial} · МАРШРУТ {routeInfo.route}
          </span>
          <div className="t-divider" />
          <span className="t-route">
            {routeInfo.from} → {routeInfo.to} · {routeInfo.distance}
          </span>
          <span className="t-driver">{routeInfo.driver}</span>
          {routeInfo.phone && (
            <a className="t-call" href={`tel:${routeInfo.phone.replace(/\s+/g, "")}`}>
              Позвонить
            </a>
          )}
        </>
      ) : (
        <span className="t-sub">EMD SD40-2 · СЕР.0847 · МАРШРУТ А-07</span>
      )}

      <div className="t-right">
        {actionLabel && onAction && (
          <button className="t-action" onClick={onAction}>{actionLabel}</button>
        )}
        <div className="live" style={{ color: connected ? "var(--ok)" : "var(--crit)" }}>
          <div className="live-dot" style={{ background: connected ? "var(--ok)" : "var(--crit)" }} />
          {connected ? "LIVE · 1Hz" : "НЕТ СВЯЗИ"}
        </div>
        <button className="t-action" onClick={toggle} title="Переключить тему">
          {dark ? "☀" : "🌙"}
        </button>
        <span className="t-clock">{clock}</span>
      </div>
    </div>
  );
}
