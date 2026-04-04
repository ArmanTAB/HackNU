import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTelemetryWS } from "../hooks/useTelemetryWS";
import { Topbar } from "../components/Topbar";
import { LeftPanel } from "../components/LeftPanel";
import { CenterView } from "../components/CenterView";
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
  }));
}

export function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const info = ROUTE_INFO[id ?? ""] ?? ROUTE_INFO["1"];
  const wsId = Number(id ?? 1);
  const addAlerts = useTelemetryStore((s) => s.addAlerts);

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
      <RightPanel routeInfo={info} />
      <BottomCharts />
    </div>
  );
}
