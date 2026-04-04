export type Severity = "warning" | "critical";

export interface Alert {
  id: string;
  severity: Severity;
  code: string;
  message: string;
  ts: number;
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
}

export interface HistoryPoint {
  ts: number;
  speed: number;
  engine_temp: number;
  oil_pressure: number;
  fuel_level: number;
  voltage: number;
}
