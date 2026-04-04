import { create } from "zustand";
import type { TelemetryFrame, HistoryPoint, Alert } from "../types/telemetry";

const HISTORY_MAX = 60;

interface TelemetryStore {
  frame: TelemetryFrame | null;
  history: HistoryPoint[];
  alerts: Alert[];
  connected: boolean;
  setFrame: (f: TelemetryFrame) => void;
  setConnected: (v: boolean) => void;
}

export const useTelemetryStore = create<TelemetryStore>((set) => ({
  frame: null,
  history: [],
  alerts: [],
  connected: false,

  setFrame: (f) =>
    set((s) => {
      const point: HistoryPoint = {
        ts: f.ts,
        speed: f.speed,
        engine_temp: f.engine_temp,
        oil_pressure: f.oil_pressure,
        fuel_level: f.fuel_level,
        voltage: f.voltage,
      };
      const history = [...s.history, point].slice(-HISTORY_MAX);

      // merge alerts: новые вперёд, max 8
      const newAlerts =
        f.alerts.length > 0 ? [...f.alerts, ...s.alerts].slice(0, 8) : s.alerts;

      return { frame: f, history, alerts: newAlerts };
    }),

  setConnected: (connected) => set({ connected }),
}));
