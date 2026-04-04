import { useEffect, useRef } from "react";
import { useTelemetryStore } from "../store/useTelemetryStore";
import type { Alert, TelemetryFrame } from "../types/telemetry";

type BackendAlert = {
  id?: string | number;
  code?: string;
  message?: string;
  severity?: "warning" | "critical";
  ts?: string | number;
  is_acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string | number;
};

type BackendTelemetry = {
  locomotive_id: number | string;
  ts: string;
  speed: number;
  traction_force: number;
  wheel_slip: number;
  engine_rpm: number;
  engine_temp: number;
  oil_pressure: number;
  oil_temp: number;
  fuel_level: number;
  fuel_consumption: number;
  pantograph_voltage: number;
  traction_current: number;
  traction_voltage: number;
  inverter_temp: number;
  battery_voltage: number;
  brake_pipe_pressure: number;
  brake_cylinder_pressure: number;
  main_reservoir_pressure: number;
  ambient_temp: number;
  gps_lat: number;
  gps_lon: number;
  health: number;
};

type BackendMessage = {
  type?: string;
  data?: BackendTelemetry;
  alerts?: BackendAlert[] | null;
  health?: number;
  locomotive_id?: number | string;
  ts?: string;
};

function mapAlerts(alerts: BackendAlert[] | null | undefined): Alert[] {
  if (!alerts || !Array.isArray(alerts)) return [];
  return alerts.map((a, idx) => ({
    id: String(a.id ?? `${Date.now()}-${idx}`),
    severity: a.severity ?? "warning",
    code: a.code ?? "GENERIC",
    message: a.message ?? "Unknown alert",
    ts: a.ts ? new Date(a.ts).getTime() : Date.now(),
    is_acknowledged: a.is_acknowledged ?? false,
    acknowledged_by: a.acknowledged_by,
    acknowledged_at: a.acknowledged_at ? new Date(a.acknowledged_at).getTime() : undefined,
  }));
}

export function useTelemetryWS(locomotiveId: string, wsUrl: string) {
  const { setFrame, setConnected } = useTelemetryStore();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number | null>(null);

  useEffect(() => {
    let isActive = true;

    function connect() {
      if (!isActive) return;
      const url = `${wsUrl}?locomotive_id=${encodeURIComponent(locomotiveId)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isActive) return;
        setConnected(true);
      };

      ws.onmessage = (ev) => {
        if (!isActive) return;
        try {
          const msg = JSON.parse(ev.data) as BackendMessage;
          if (msg.type && msg.type !== "telemetry") return;
          const d = msg.data;
          if (!d) return;
          const score = typeof msg.health === "number" ? msg.health : d.health;
          const status = score > 70 ? "normal" : score > 40 ? "warning" : "critical";

          const frame: TelemetryFrame = {
            ts: new Date(d.ts).getTime(),
            locomotive_id: String(d.locomotive_id),
            speed: d.speed,
            fuel_level: d.fuel_level,
            fuel_rate: d.fuel_consumption,
            engine_temp: d.engine_temp,
            oil_pressure: d.oil_pressure,
            rpm: d.engine_rpm,
            traction: d.traction_force,
            voltage: d.traction_voltage,
            current: d.traction_current,
            health_score: score,
            health_status: status,
            alerts: mapAlerts(msg.alerts),
            gps_lat: d.gps_lat,
            gps_lon: d.gps_lon,
            wheel_slip: d.wheel_slip,
            oil_temp: d.oil_temp,
            pantograph_voltage: d.pantograph_voltage,
            inverter_temp: d.inverter_temp,
            battery_voltage: d.battery_voltage,
            brake_pipe_pressure: d.brake_pipe_pressure,
            brake_cylinder_pressure: d.brake_cylinder_pressure,
            main_reservoir_pressure: d.main_reservoir_pressure,
            ambient_temp: d.ambient_temp,
          };

          setFrame(frame);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (!isActive) return;
        setConnected(false);
        retryRef.current = window.setTimeout(connect, 1500);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      isActive = false;
      setConnected(false);
      if (retryRef.current) window.clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [locomotiveId, wsUrl, setConnected, setFrame]);
}
