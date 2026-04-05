import { useEffect, useRef } from "react";
import { useTelemetryStore } from "../store/useTelemetryStore";
import { api } from "../api/client";
import type { TelemetryFrame } from "../types/telemetry";

type LatLng = [number, number];

// Загружаем маршрут один раз и двигаем поезд по нему
let routePoints: LatLng[] = [];
fetch("/almaty-astana.json")
  .then((r) => r.json())
  .then((geojson) => {
    const pts: LatLng[] = [];
    for (const f of geojson.features ?? []) {
      const g = f.geometry;
      if (g?.type === "MultiLineString") {
        for (const line of g.coordinates) for (const [lon, lat] of line) pts.push([lat, lon]);
      } else if (g?.type === "LineString") {
        for (const [lon, lat] of g.coordinates) pts.push([lat, lon]);
      }
    }
    routePoints = pts;
  })
  .catch(() => {});

function getRoutePosition(progress: number): LatLng | null {
  if (routePoints.length < 2) return null;
  const idx = Math.min(Math.floor(progress * (routePoints.length - 1)), routePoints.length - 2);
  const t   = progress * (routePoints.length - 1) - idx;
  const a   = routePoints[idx];
  const b   = routePoints[idx + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

type Limit = {
  min?: number;
  max?: number;
  warnMin?: number;
  warnMax?: number;
  critMin?: number;
  critMax?: number;
};

// Fallback limits used until backend responds
let LIMITS: Record<string, Limit> = {
  speed:       { min: 0,   max: 120,  warnMin: 100, warnMax: 115, critMin: 115, critMax: 9999 },
  rpm:         { min: 600, max: 1800, warnMin: 1600, warnMax: 1800, critMin: 1800, critMax: 9999 },
  engine_temp: { min: 60,  max: 95,   warnMin: 90,  warnMax: 100, critMin: 100, critMax: 999 },
  oil_pressure:{ min: 3.5, max: 6,    warnMin: 2.5, warnMax: 3.5, critMin: 0,   critMax: 2.5 },
  fuel_level:  { min: 20,  max: 100,  warnMin: 15,  warnMax: 20,  critMin: 0,   critMax: 15 },
  voltage:     { min: 600, max: 750,  warnMin: 550, warnMax: 600, critMin: 0,   critMax: 520 },
  current:     { min: 0,   max: 2000, warnMin: 2000, warnMax: 2300, critMin: 2300, critMax: 9999 },
  traction:    { min: 0,   max: 400,  warnMin: 400, warnMax: 500, critMin: 500, critMax: 9999 },
  fuel_rate:   { min: 0,   max: 80,   warnMin: 80,  warnMax: 100, critMin: 100, critMax: 9999 },
};

function applyBackendLimits(locomotiveId: string | number, setLimits: (l: any) => void) {
  api.get<Record<string, number | null>>(`/api/v1/locomotives/${locomotiveId}/limits`)
    .then((data) => {
      if (!data) { console.warn("[useSimulator] limits: empty response"); return; }
      console.log("[useSimulator] limits loaded from backend:", data);
      setLimits(data);
      // Mapping: min/max = normal range, warnMin/warnMax = warning zone, critMin/critMax = critical zone
      const m: Record<string, Limit> = {
        // upper-threshold params (high = bad)
        speed:        { min: 0,   max: data.speed_warning_max ?? 120,       warnMin: data.speed_warning_max ?? 100,       warnMax: data.speed_critical_max ?? 115,       critMin: data.speed_critical_max ?? 115,       critMax: 9999 },
        rpm:          { min: 0,   max: data.engine_rpm_warning_max ?? 1800,  warnMin: data.engine_rpm_warning_max ?? 1600,  warnMax: data.engine_rpm_critical_max ?? 1800,  critMin: data.engine_rpm_critical_max ?? 1800,  critMax: 9999 },
        engine_temp:  { min: 0,   max: data.engine_temp_warning_max ?? 95,   warnMin: data.engine_temp_warning_max ?? 90,   warnMax: data.engine_temp_critical_max ?? 100,  critMin: data.engine_temp_critical_max ?? 100,  critMax: 999 },
        current:      { min: 0,   max: data.traction_current_warning_max ?? 2000, warnMin: data.traction_current_warning_max ?? 2000, warnMax: data.traction_current_critical_max ?? 2300, critMin: data.traction_current_critical_max ?? 2300, critMax: 9999 },
        traction:     { min: 0,   max: data.traction_force_warning_max ?? 400,    warnMin: data.traction_force_warning_max ?? 400,    warnMax: data.traction_force_critical_max ?? 500,   critMin: data.traction_force_critical_max ?? 500,   critMax: 9999 },
        fuel_rate:    { min: 0,   max: data.fuel_consumption_warning_max ?? 80,   warnMin: data.fuel_consumption_warning_max ?? 80,   warnMax: data.fuel_consumption_critical_max ?? 100, critMin: data.fuel_consumption_critical_max ?? 100, critMax: 9999 },
        // lower-threshold params (low = bad)
        oil_pressure: { min: data.oil_pressure_warning_min ?? 3.5, max: data.oil_pressure_max ?? 6, warnMin: data.oil_pressure_critical_min ?? 2.5, warnMax: data.oil_pressure_warning_min ?? 3.5, critMin: 0, critMax: data.oil_pressure_critical_min ?? 2.5 },
        fuel_level:   { min: data.fuel_level_warning_min ?? 20,    max: 100, warnMin: data.fuel_level_critical_min ?? 15,  warnMax: data.fuel_level_warning_min ?? 20,    critMin: 0, critMax: data.fuel_level_critical_min ?? 15 },
        // range param (both sides matter)
        voltage:      { min: data.traction_voltage_warning_min ?? 600, max: data.traction_voltage_warning_max ?? 750, warnMin: data.traction_voltage_critical_min ?? 550, warnMax: data.traction_voltage_warning_min ?? 600, critMin: 0, critMax: data.traction_voltage_critical_min ?? 520 },
      };
      // Remove null values
      for (const key of Object.keys(m)) {
        for (const field of Object.keys(m[key]) as (keyof Limit)[]) {
          if (m[key][field] == null) delete m[key][field];
        }
      }
      LIMITS = m;
    })
    .catch((err) => console.warn("[useSimulator] limits fetch failed:", err));
}

function inRange(v: number, min?: number, max?: number) {
  if (min !== undefined && v < min) return false;
  if (max !== undefined && v > max) return false;
  return true;
}

function statusFromLimits(v: number, lim: Limit): "ok" | "warn" | "crit" {
  if ((lim.critMin !== undefined || lim.critMax !== undefined) && inRange(v, lim.critMin, lim.critMax)) {
    return "crit";
  }
  if ((lim.warnMin !== undefined || lim.warnMax !== undefined) && inRange(v, lim.warnMin, lim.warnMax)) {
    return "warn";
  }
  if ((lim.min !== undefined || lim.max !== undefined) && inRange(v, lim.min, lim.max)) {
    return "ok";
  }
  return "crit";
}

function calcHealth(s: ReturnType<typeof makeState>): number {
  let h = 100;
  for (const [key, lim] of Object.entries(LIMITS)) {
    const v = (s as any)[key] as number;
    const st = statusFromLimits(v, lim);
    if (st === "crit") h -= 18;
    else if (st === "warn") h -= 7;
  }
  return Math.max(0, Math.min(100, h));
}

function makeState() {
  return {
    engine_temp: 92,
    oil_pressure: 5.2,
    speed: 68,
    fuel_level: 74,
    voltage: 680,
    rpm: 1200,
    traction: 220,
    current: 1420,
    fuel_rate: 38,
    _progress: 0.0, // 0..1 вдоль маршрута
  };
}

export function useSimulator(locomotiveId: string | number = 1) {
  const { setFrame, setConnected, setLimits } = useTelemetryStore();
  const state = useRef(makeState());
  const id = useRef(0);

  useEffect(() => {
    setConnected(true);
    applyBackendLimits(locomotiveId, setLimits);

    // expose runScene globally как в оригинале
    (window as any).runScene = (sc: string) => {
      const s = state.current;
      if (sc === "ok") {
        s.engine_temp = 92;
        s.oil_pressure = 5.2;
        s.speed = 68;
        s.fuel_level = 74;
        s.voltage = 680;
        s.rpm = 1200;
        s.traction = 220;
        s.current = 1420;
        s.fuel_rate = 38;
      }
      if (sc === "overheat") {
        s.engine_temp = 148;
        s.rpm = 1820;
      }
      if (sc === "fuel") {
        s.fuel_level = 6;
        s.fuel_rate = 44;
      }
      if (sc === "pressure") {
        s.oil_pressure = 1.4;
        s.speed = 30;
      }
      if (sc === "electric") {
        s.voltage = 480;
        s.current = 2350;
      }
      if (sc === "overload") {
        s.traction = 480;
        s.current = 2300;
        s.rpm = 1950;
        s.engine_temp = 118;
        s.fuel_rate = 95;
      }
      if (sc === "wheel_slip") {
        s.speed = 145;
        s.traction = 30;
        s.rpm = 1900;
      }
      if (sc === "fuel_leak") {
        s.fuel_level = 18;
        s.fuel_rate = 98;
      }
      if (sc === "power_surge") {
        s.voltage = 810;
        s.current = 2280;
      }
      if (sc === "cold_engine") {
        s.engine_temp = 18;
        s.oil_pressure = 2.8;
        s.rpm = 400;
        s.speed = 0;
        s.fuel_rate = 12;
      }
      if (sc === "brake_fail") {
        s.speed = 138;
        s.traction = 0;
        s.oil_pressure = 1.6;
      }
      if (sc === "all") {
        s.engine_temp = 162;
        s.fuel_level = 3;
        s.oil_pressure = 1.0;
        s.voltage = 420;
        s.speed = 0;
        s.rpm = 0;
      }
    };

    (window as any).__simState = state.current;
    (window as any).setParam = (key: string, value: number) => {
      (state.current as any)[key] = value;
    };

    const tick = () => {
      const s = state.current;
      s.speed = +Math.max(
        0,
        Math.min(160, s.speed + (Math.random() - 0.5) * 3),
      ).toFixed(0);
      s.engine_temp = +Math.max(
        60,
        Math.min(180, s.engine_temp + (Math.random() - 0.48) * 1.5),
      ).toFixed(1);
      s.oil_pressure = +Math.max(
        0,
        Math.min(12, s.oil_pressure + (Math.random() - 0.5) * 0.12),
      ).toFixed(1);
      s.voltage = +Math.max(
        300,
        Math.min(800, s.voltage + (Math.random() - 0.5) * 4),
      ).toFixed(0);
      s.rpm = +Math.max(
        0,
        Math.min(2000, s.rpm + (Math.random() - 0.5) * 20),
      ).toFixed(0);
      s.current = +Math.max(
        0,
        Math.min(2500, s.current + (Math.random() - 0.5) * 30),
      ).toFixed(0);
      s.traction = +Math.max(
        0,
        Math.min(500, s.traction + (Math.random() - 0.5) * 5),
      ).toFixed(0);

      const score = calcHealth(s);
      const status =
        score > 70 ? "normal" : score > 40 ? "warning" : "critical";

      const { _progress, ...sClean } = s;
      const frame: TelemetryFrame = {
        ts: Date.now(),
        locomotive_id: "SD40-2-0847",
        ...sClean,
        health_score: score,
        health_status: status,
        alerts: [],
      };

      setFrame(frame);
      id.current = window.setTimeout(tick, 1000);
    };

    tick();
    return () => {
      clearTimeout(id.current);
      setConnected(false);
    };
  }, []);
}
