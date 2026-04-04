import { useEffect, useRef, useState } from "react";
import type { Alert } from "../types/telemetry";

type Toast = {
  id: string;
  message: string;
  severity: "warning" | "critical";
  ts: number;
};

export function AlertToasts({ alerts }: { alerts: Alert[] }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const mountedAtRef = useRef(Date.now());
  const timersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    for (const alert of alerts) {
      if (seenRef.current.has(alert.id)) continue;
      seenRef.current.add(alert.id);

      if (alert.ts < mountedAtRef.current) continue;
      if (alert.is_acknowledged) continue;

      const toast: Toast = {
        id: alert.id,
        message: alert.message,
        severity: alert.severity,
        ts: alert.ts,
      };

      setToasts((prev) => [...prev, toast].slice(-5));

      timersRef.current[toast.id] = window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        delete timersRef.current[toast.id];
      }, 6000);
    }
  }, [alerts]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((id) => window.clearTimeout(id));
      timersRef.current = {};
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.severity}`}>
          <div className="toast-icon">{toast.severity === "critical" ? "!" : "•"}</div>
          <div className="toast-body">
            <div className="toast-title">
              {toast.severity === "critical" ? "Критический алерт" : "Предупреждение"}
            </div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <div className="toast-time">
            {new Date(toast.ts).toLocaleTimeString("ru-RU")}
          </div>
        </div>
      ))}
    </div>
  );
}
