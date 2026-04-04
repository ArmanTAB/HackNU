export type Severity = "warning" | "critical";

export interface Alert {
  id: string;
  severity: Severity;
  code: string;
  message: string;
  ts: number;
  is_acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: number;
}

export interface HealthFactor {
  [key: string]: any;
}

export interface EventItem {
  id?: number;
  locomotive_id?: number;
  event_type?: "incident" | "maintenance" | "note" | "replay_mark" | string;
  description?: string;
  created_by?: string;
  ts?: string;
  telemetry_snapshot?: Record<string, unknown>;
}

export interface TelemetryFrame {
  ts: number;
  locomotive_id: string;
  speed: number; // км/ч
  fuel_level: number; // %
  fuel_rate: number; // л/ч
  engine_temp: number; // °C
  oil_pressure: number; // бар
  rpm: number; // об/мин
  traction: number; // кН
  voltage: number; // В
  current: number; // А
  health_score: number; // 0–100 (считает бэк)
  health_status: "normal" | "warning" | "critical";
  alerts: Alert[];
  gps_lat?: number;
  gps_lon?: number;
  wheel_slip?: number;
  oil_temp?: number;
  pantograph_voltage?: number;
  inverter_temp?: number;
  battery_voltage?: number;
  brake_pipe_pressure?: number;
  brake_cylinder_pressure?: number;
  main_reservoir_pressure?: number;
  ambient_temp?: number;
}

export interface HistoryPoint {
  ts: number;
  speed: number;
  engine_temp: number;
  oil_pressure: number;
  fuel_level: number;
  voltage: number;
}
