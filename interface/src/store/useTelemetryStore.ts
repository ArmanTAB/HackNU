import { create } from "zustand";
import type { TelemetryFrame, HistoryPoint, Alert } from "../types/telemetry";

const HISTORY_MAX  = 60;   // для спарклайнов
const SNAPSHOT_MAX = 300;  // 5 минут при 1 Гц

interface TelemetryStore {
  frame:        TelemetryFrame | null;
  history:      HistoryPoint[];
  snapshots:    TelemetryFrame[];   // полные кадры для time-travel
  alerts:       Alert[];
  connected:    boolean;
  replayIndex:  number | null;      // null = live
  setFrame:     (f: TelemetryFrame) => void;
  setConnected: (v: boolean) => void;
  setReplay:    (i: number | null) => void;
}

export const useTelemetryStore = create<TelemetryStore>((set) => ({
  frame:       null,
  history:     [],
  snapshots:   [],
  alerts:      [],
  connected:   false,
  replayIndex: null,

  setFrame: (f) =>
    set((s) => {
      const point: HistoryPoint = {
        ts:           f.ts,
        speed:        f.speed,
        engine_temp:  f.engine_temp,
        oil_pressure: f.oil_pressure,
        fuel_level:   f.fuel_level,
        voltage:      f.voltage,
      };
      const history   = [...s.history,   point].slice(-HISTORY_MAX);
      const snapshots = [...s.snapshots, f    ].slice(-SNAPSHOT_MAX);

      const newAlerts =
        f.alerts.length > 0 ? [...f.alerts, ...s.alerts].slice(0, 8) : s.alerts;

      // если в режиме replay — не двигаем replayIndex, frame обновляется в фоне
      return { frame: f, history, snapshots, alerts: newAlerts };
    }),

  setConnected: (connected) => set({ connected }),
  setReplay:    (replayIndex) => set({ replayIndex }),
}));
