import { useState, useEffect } from "react";
import { useTelemetryStore } from "../store/useTelemetryStore";
import { RouteMap } from "./RouteMap";

const NODES = [
  { key: "engine",  label: "Двигатель",        icon: "⚙" },
  { key: "chimney", label: "Выхлопы",           icon: "💨" },
  { key: "wheels",  label: "Колёсные пары",     icon: "⭕" },
  { key: "bogie",   label: "Тележки",           icon: "🔩" },
  { key: "body",    label: "Кузов",             icon: "🚂" },
  { key: "fuel",    label: "Топливо",           icon: "⛽" },
  { key: "roof",    label: "Крыша / электрика", icon: "⚡" },
  { key: "lights",  label: "Фары",              icon: "💡" },
];

const SCENES = [
  { key: "ok",       label: "✓ Норма",                      color: "var(--ok)" },
  { key: "overheat", label: "⚡ Перегрев двигателя",         color: "var(--crit)" },
  { key: "fuel",     label: "⛽ Критичный уровень топлива",  color: "var(--warn)" },
  { key: "pressure", label: "🔵 Потеря давления масла",      color: "var(--blue)" },
  { key: "electric", label: "⚡ Сбой электрики",             color: "var(--purple)" },
  { key: "all",      label: "☠ Критическая авария",         color: "var(--crit)" },
];

type LatLng = [number, number];

interface RouteInfo {
  from: string;
  to: string;
  path: LatLng[];
}

export function RightPanel({ routeInfo }: { routeInfo?: RouteInfo }) {
  const frame = useTelemetryStore((s) => s.frame);
  const alerts = useTelemetryStore((s) => s.alerts);
  const score = frame?.health_score ?? 100;
  const nodeColor =
    score > 70 ? "var(--ok)" : score > 40 ? "var(--warn)" : "var(--crit)";

  const [activeNode, setActiveNode] = useState<string | null>(null);

  // следим за глобальным активным узлом (устанавливается из CenterView при клике на 3D)
  useEffect(() => {
    const interval = setInterval(() => {
      const cur = (window as any).__activeNode ?? null;
      setActiveNode((prev) => (prev !== cur ? cur : prev));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  function handleNodeClick(key: string) {
    // если уже активен — снять выделение
    if (activeNode === key) {
      (window as any).__activeNode = null;
      setActiveNode(null);
      // сброс цветов в 3D происходит через ping(null) — но ping ожидает строку
      // поэтому вызываем ping с текущим ключом повторно (selectNode сам снимает при повторе)
      (window as any).ping?.(key);
    } else {
      setActiveNode(key);
      (window as any).ping?.(key);
    }
  }

  return (
    <div className="panel panel-r">
      {routeInfo && routeInfo.path.length > 1 && (
        <div className="sec">
          <div className="sec-t">Маршрут</div>
          <RouteMap
            path={routeInfo.path}
            from={routeInfo.from}
            to={routeInfo.to}
            expandable
          />
        </div>
      )}
      <div className="sec">
        <div className="sec-t">Электрика</div>
        <div className="metric">
          <div className="ml">
            <div className="mlabel">Напряжение</div>
            <div className="mbar-w">
              <div
                className="mbar"
                style={{
                  width: Math.min(100, ((frame?.voltage ?? 0) / 800) * 100) + "%",
                  background: "var(--purple)",
                }}
              />
            </div>
          </div>
          <div className="mr">
            <span className="mval" style={{ color: "var(--purple)" }}>
              {frame?.voltage ?? 0}
            </span>
            <span className="munit"> В</span>
          </div>
        </div>
        <div className="metric">
          <div className="ml">
            <div className="mlabel">Ток тяги</div>
            <div className="mbar-w">
              <div
                className="mbar"
                style={{
                  width: Math.min(100, ((frame?.current ?? 0) / 2500) * 100) + "%",
                  background: "var(--purple)",
                }}
              />
            </div>
          </div>
          <div className="mr">
            <span className="mval" style={{ color: "var(--purple)" }}>
              {frame?.current ?? 0}
            </span>
            <span className="munit"> А</span>
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-t">Узлы</div>
        {NODES.map((n) => {
          const isActive = activeNode === n.key;
          return (
            <button
              key={n.key}
              className="sbtn"
              onClick={() => handleNodeClick(n.key)}
              style={
                isActive
                  ? {
                      background: "var(--bg3)",
                      borderColor: nodeColor,
                      color: "var(--text)",
                      boxShadow: `0 0 0 1px ${nodeColor}33`,
                    }
                  : undefined
              }
            >
              <div
                className="sico"
                style={{
                  background: nodeColor,
                  boxShadow: isActive ? `0 0 6px ${nodeColor}` : "none",
                  transform: isActive ? "scale(1.4)" : "scale(1)",
                  transition: "all .2s",
                }}
              />
              <span style={{ flex: 1 }}>{n.label}</span>
              {isActive && (
                <span
                  style={{
                    fontSize: "8px",
                    letterSpacing: ".08em",
                    color: nodeColor,
                    fontWeight: 700,
                  }}
                >
                  ВЫБ
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="sec">
        <div className="sec-t">Сценарии</div>
        {SCENES.map((sc) => (
          <button
            key={sc.key}
            className="scbtn"
            style={{ color: sc.color, borderColor: sc.color }}
            onClick={() => (window as any).runScene?.(sc.key)}
          >
            {sc.label}
          </button>
        ))}
      </div>

      <div className="sec" style={{ flex: 1 }}>
        <div className="sec-t">Алерты</div>
        <div id="alist">
          {alerts.length === 0 ? (
            <div className="alert-item">
              <div className="adot" style={{ background: "var(--ok)" }} />
              <div>
                <div>Система запущена</div>
                <div className="atime">--:--:--</div>
              </div>
            </div>
          ) : (
            alerts.map((a) => (
              <div key={a.id} className="alert-item">
                <div
                  className="adot"
                  style={{
                    background:
                      a.severity === "critical" ? "var(--crit)" : "var(--warn)",
                  }}
                />
                <div>
                  <div
                    style={{
                      color:
                        a.severity === "critical" ? "var(--crit)" : "var(--warn)",
                    }}
                  >
                    {a.message}
                  </div>
                  <div className="atime">
                    {new Date(a.ts).toLocaleTimeString("ru-RU")}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}