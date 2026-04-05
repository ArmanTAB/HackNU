import { useParams, useNavigate } from "react-router-dom";
import { useSimulator } from "../hooks/useSimulator";
import { Topbar } from "../components/Topbar";
import { LeftPanel } from "../components/LeftPanel";
import { CenterView } from "../components/CenterView";
import { RightPanel } from "../components/RightPanel";
import { BottomCharts } from "../components/BottomCharts";

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

export function TestingDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const info = ROUTE_INFO[id ?? ""] ?? ROUTE_INFO["1"];

  useSimulator(id ?? 1);

  return (
    <div className="shell">
      <Topbar
        routeInfo={info}
        onBack={() => navigate("/")}
        actionLabel="Мониторинг"
        onAction={() => navigate(`/dashboard/${id ?? 1}`)}
      />
      <LeftPanel />
      <CenterView />
      <RightPanel routeInfo={info} showScenarios />
      <BottomCharts />
    </div>
  );
}
