import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTelemetryWS } from "../hooks/useTelemetryWS";
import { Topbar } from "../components/Topbar";
import { LeftPanel } from "../components/LeftPanel";
import { CenterView } from "../components/CenterView";
import { AlertToasts } from "../components/AlertToasts";
import { RightPanel } from "../components/RightPanel";
import { BottomCharts } from "../components/BottomCharts";
import { useTelemetryStore } from "../store/useTelemetryStore";

const ROUTE_INFO: Record<
  string,
  {
    serial: string;
    route: string;
    from: string;
    to: string;
    distance: string;
    driver: string;
    phone: string;
    path: [number, number][];
  }
> = {
  "1": {
    serial: "СЕР.0847",
    route: "А-07",
    from: "Алматы",
    to: "Астана",
    distance: "1284 км",
    driver: "Сейткали А.",
    phone: "+7 701 222 33 44",
    path: [
      [43.2389, 76.8897],
      [46.9911, 71.6200],
      [51.1694, 71.4491],
    ],
  },
  "2": {
    serial: "СЕР.0312",
    route: "Б-03",
    from: "Астана",
    to: "Актобе",
    distance: "1132 км",
    driver: "Муратов Б.",
    phone: "+7 702 111 22 33",
    path: [
      [51.1694, 71.4491],
      [50.2830, 67.4500],
      [50.2839, 57.1669],
    ],
  },
  "3": {
    serial: "СЕР.0521",
    route: "В-11",
    from: "Шымкент",
    to: "Кызылорда",
    distance: "672 км",
    driver: "Ахметов Д.",
    phone: "+7 705 888 77 66",
    path: [
      [42.3417, 69.5901],
      [43.8045, 66.5000],
      [44.8488, 65.4823],
    ],
  },
};

function mapApiAlerts(data: any[]): { id: string; severity: "warning" | "critical"; code: string; message: string; ts: number }[] {
  return data.map((a, idx) => ({
    id: String(a.id ?? `${Date.now()}-${idx}`),
    severity: a.severity === "critical" ? "critical" : "warning",
    code: a.parameter_name ?? a.code ?? "ALERT",
    message: a.message ?? "Alert",
    ts: a.ts ? new Date(a.ts).getTime() : Date.now(),
    is_acknowledged: a.is_acknowledged ?? false,
    acknowledged_by: a.acknowledged_by,
    acknowledged_at: a.acknowledged_at ? new Date(a.acknowledged_at).getTime() : undefined,
  }));
}

export function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const info = ROUTE_INFO[id ?? ""] ?? ROUTE_INFO["1"];
  const wsId = Number(id ?? 1);
  const addAlerts = useTelemetryStore((s) => s.addAlerts);
  const setSnapshots = useTelemetryStore((s) => s.setSnapshots);
  const replayWindow = useTelemetryStore((s) => s.replayWindow);
  const setHealthFactors = useTelemetryStore((s) => s.setHealthFactors);
  const setEvents = useTelemetryStore((s) => s.setEvents);
  const alerts = useTelemetryStore((s) => s.alerts);

  useTelemetryWS(String(wsId), "ws://localhost:8081/ws");

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/locomotives/${wsId}/alerts?active=true`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!active || !Array.isArray(data)) return;
        const mapped = mapApiAlerts(data);
        if (mapped.length > 0) addAlerts(mapped);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [wsId, addAlerts]);

  useEffect(() => {
    let active = true;
    const to = new Date();
    const from = new Date(to.getTime() - replayWindow * 60 * 1000);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
      limit: String(replayWindow * 60),
    });

    fetch(`/api/v1/locomotives/${wsId}/telemetry/history?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!active || !Array.isArray(data)) return;
          const mapped = data.map((d: any) => {
          const score = typeof d.health === "number" ? d.health : 0;
          const status = score > 70 ? "normal" : score > 40 ? "warning" : "critical";
          const health_status = status as "normal" | "warning" | "critical";
          return {
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
            health_status,
            alerts: [],
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
        }).sort((a: any, b: any) => a.ts - b.ts);

        if (mapped.length > 0) setSnapshots(mapped);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [wsId, replayWindow, setSnapshots]);

  useEffect(() => {
    let active = true;
    const to = new Date();
    const from = new Date(to.getTime() - 60 * 60 * 1000);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });

    fetch(`/api/v1/locomotives/${wsId}/health/history?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!active || !Array.isArray(data) || data.length === 0) return;
        const latest = data
          .slice()
          .sort((a: any, b: any) => new Date(b.ts).getTime() - new Date(a.ts).getTime())[0];
        setHealthFactors(Array.isArray(latest?.top_factors) ? latest.top_factors.slice(0, 5) : []);
      })
      .catch(() => undefined);

    fetch(`/api/v1/locomotives/${wsId}/events?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!active || !Array.isArray(data)) return;
        setEvents(data);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [wsId, setHealthFactors, setEvents]);

  return (
    <div className="shell">
      <Topbar
        routeInfo={info}
        onBack={() => navigate("/")}
        actionLabel="Тестирование"
        onAction={() => navigate(`/testing/${id ?? 1}`)}
      />
      <LeftPanel />
      <CenterView />
      <AlertToasts alerts={alerts} />
      <RightPanel routeInfo={info} locomotiveId={wsId} />
      <BottomCharts />
    </div>
  );
}
