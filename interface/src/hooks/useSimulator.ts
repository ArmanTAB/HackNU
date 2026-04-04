import { useEffect, useRef } from "react";
import { useTelemetryStore } from "../store/useTelemetryStore";
import type { TelemetryFrame } from "../types/telemetry";

const THRESHOLDS = {
  engine_temp: { ok: [0, 105], warn: [105, 135] },
  oil_pressure: { ok: [3.5, 12], warn: [2, 3.5] },
  speed: { ok: [0, 120], warn: [120, 140] },
  fuel_level: { ok: [15, 100], warn: [5, 15] },
  voltage: { ok: [600, 750], warn: [550, 600] },
};

function calcHealth(s: ReturnType<typeof makeState>): number {
  let h = 100;
  for (const key of Object.keys(THRESHOLDS) as (keyof typeof THRESHOLDS)[]) {
    const { ok, warn } = THRESHOLDS[key];
    const v = s[key as keyof typeof s] as number;
    const inOk = v >= ok[0] && v <= ok[1];
    const inWarn = v >= warn[0] && v <= warn[1];
    if (!inOk && !inWarn) h -= 18;
    else if (!inOk) h -= 7;
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
  };
}

export function useSimulator() {
  const { setFrame, setConnected } = useTelemetryStore();
  const state = useRef(makeState());
  const id = useRef(0);

  useEffect(() => {
    setConnected(true);

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

      const frame: TelemetryFrame = {
        ts: Date.now(),
        locomotive_id: "SD40-2-0847",
        ...s,
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
