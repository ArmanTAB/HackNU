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
  }
> = {
  "SD40-2-0847": {
    serial: "СЕР.0847",
    route: "А-07",
    from: "Алматы",
    to: "Астана",
    distance: "1284 км",
    driver: "Сейткали А.",
  },
  "SD40-2-0312": {
    serial: "СЕР.0312",
    route: "Б-03",
    from: "Астана",
    to: "Актобе",
    distance: "1132 км",
    driver: "Муратов Б.",
  },
  "SD40-2-0521": {
    serial: "СЕР.0521",
    route: "В-11",
    from: "Шымкент",
    to: "Кызылорда",
    distance: "672 км",
    driver: "Ахметов Д.",
  },
  "SD40-2-0934": {
    serial: "СЕР.0934",
    route: "Г-05",
    from: "Актобе",
    to: "Уральск",
    distance: "548 км",
    driver: "Жумабеков С.",
  },
};

export function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const info = ROUTE_INFO[id ?? ""] ?? ROUTE_INFO["SD40-2-0847"];

  useSimulator();

  return (
    <div className="shell">
      <Topbar routeInfo={info} onBack={() => navigate("/")} />
      <LeftPanel />
      <CenterView />
      <RightPanel />
      <BottomCharts />
    </div>
  );
}
