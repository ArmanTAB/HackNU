import { create } from "zustand";
import type { TelemetryFrame, HistoryPoint, Alert, HealthFactor, EventItem } from "../types/telemetry";

const HISTORY_MAX  = 60;   // для спарклайнов
const SNAPSHOT_MAX = 300;  // 5 минут при 1 Гц

export interface TelemetryLimits {
  speed_warning_max?:              number | null;
  speed_critical_max?:             number | null;
  engine_temp_warning_max?:        number | null;
  engine_temp_critical_max?:       number | null;
  oil_pressure_warning_max?:       number | null;
  oil_pressure_critical_max?:      number | null;
  fuel_level_warning_max?:         number | null;
  fuel_level_critical_max?:        number | null;
  engine_rpm_warning_max?:         number | null;
  engine_rpm_critical_max?:        number | null;
  traction_voltage_warning_max?:   number | null;
  traction_voltage_critical_max?:  number | null;
  traction_current_warning_max?:   number | null;
  traction_current_critical_max?:  number | null;
  [key: string]: number | null | undefined;
}

interface TelemetryStore {
  frame:        TelemetryFrame | null;
  history:      HistoryPoint[];
  snapshots:    TelemetryFrame[];   // полные кадры для time-travel
  alerts:       Alert[];
  healthFactors: HealthFactor[];
  events:       EventItem[];
  limits:       TelemetryLimits;
  connected:    boolean;
  replayIndex:  number | null;      // null = live
  replayWindow: number;             // minutes
  setFrame:     (f: TelemetryFrame) => void;
  setSnapshots: (frames: TelemetryFrame[]) => void;
  addAlerts:    (alerts: Alert[]) => void;
  ackAlert:     (id: string) => void;
  setHealthFactors: (factors: HealthFactor[]) => void;
  setEvents:    (events: EventItem[]) => void;
  addEvent:     (event: EventItem) => void;
  setLimits:    (limits: TelemetryLimits) => void;
  setConnected: (v: boolean) => void;
  setReplay:    (i: number | null) => void;
  setReplayWindow: (m: number) => void;
}

function mergeAlerts(incoming: Alert[], existing: Alert[]): Alert[] {
  const seen = new Set<string>();
  const merged: Alert[] = [];
  for (const a of [...incoming, ...existing]) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    merged.push(a);
  }
  return merged.slice(0, 8);
}

export const useTelemetryStore = create<TelemetryStore>((set) => ({
  frame:       null,
  history:     [],
  snapshots:   [],
  alerts:      [],
  healthFactors: [],
  events:      [],
  limits:      {},
  connected:   false,
  replayIndex: null,
  replayWindow: 5,

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
        f.alerts.length > 0 ? mergeAlerts(f.alerts, s.alerts) : s.alerts;

      // если в режиме replay — не двигаем replayIndex, frame обновляется в фоне
      return { frame: f, history, snapshots, alerts: newAlerts };
    }),

  addAlerts: (alerts) =>
    set((s) => ({ alerts: mergeAlerts(alerts, s.alerts) })),

  ackAlert: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) =>
        a.id === id ? { ...a, is_acknowledged: true, acknowledged_at: Date.now() } : a,
      ),
    })),

  setHealthFactors: (healthFactors) => set({ healthFactors }),

  setEvents: (events) =>
    set(() => ({
      events: events
        .slice()
        .sort((a, b) => new Date(b.ts ?? 0).getTime() - new Date(a.ts ?? 0).getTime()),
    })),

  addEvent: (event) =>
    set((s) => ({
      events: [event, ...s.events].slice(0, 20),
    })),

  setSnapshots: (frames) =>
    set(() => ({ snapshots: frames, replayIndex: null })),

  setLimits: (limits) => set({ limits }),
  setConnected: (connected) => set({ connected }),
  setReplay:    (replayIndex) => set({ replayIndex }),
  setReplayWindow: (replayWindow) => set({ replayWindow }),
}));
