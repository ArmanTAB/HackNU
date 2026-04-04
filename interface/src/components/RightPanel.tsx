import { useState, useEffect } from "react";
import { useTelemetryStore } from "../store/useTelemetryStore";
import { useDisplayFrame } from "../hooks/useDisplayFrame";
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
  { key: "ok",           label: "✓ Норма",                      color: "var(--ok)" },
  { key: "overheat",     label: "⚡ Перегрев двигателя",         color: "var(--crit)" },
  { key: "fuel",         label: "⛽ Критичный уровень топлива",  color: "var(--warn)" },
  { key: "pressure",     label: "🔵 Потеря давления масла",      color: "var(--blue)" },
  { key: "electric",     label: "⚡ Сбой электрики",             color: "var(--purple)" },
  { key: "overload",     label: "🔴 Перегрузка тяги",            color: "var(--crit)" },
  { key: "wheel_slip",   label: "⭕ Буксование колёс",           color: "var(--warn)" },
  { key: "fuel_leak",    label: "💧 Утечка топлива",             color: "var(--warn)" },
  { key: "power_surge",  label: "⚡ Скачок напряжения",          color: "var(--purple)" },
  { key: "cold_engine",  label: "❄ Холодный пуск",              color: "var(--blue)" },
  { key: "brake_fail",   label: "🛑 Отказ тормозов",             color: "var(--crit)" },
  { key: "all",          label: "☠ Критическая авария",         color: "var(--crit)" },
];

type ParamKey = "engine_temp" | "oil_pressure" | "speed" | "fuel_level" | "voltage" | "rpm" | "traction" | "current" | "fuel_rate";

const PARAM_META: Record<ParamKey, { label: string; min: number; max: number; step: number; unit: string }> = {
  engine_temp:  { label: "Температура",      min: 0,   max: 180,  step: 1,   unit: "°C" },
  oil_pressure: { label: "Давление масла",   min: 0,   max: 12,   step: 0.1, unit: " бар" },
  speed:        { label: "Скорость",         min: 0,   max: 160,  step: 1,   unit: " км/ч" },
  fuel_level:   { label: "Топливо",          min: 0,   max: 100,  step: 1,   unit: "%" },
  voltage:      { label: "Напряжение",       min: 300, max: 820,  step: 5,   unit: " В" },
  rpm:          { label: "Обороты",          min: 0,   max: 2000, step: 10,  unit: " об/м" },
  traction:     { label: "Тяга",             min: 0,   max: 500,  step: 5,   unit: " кН" },
  current:      { label: "Ток тяги",         min: 0,   max: 2500, step: 10,  unit: " А" },
  fuel_rate:    { label: "Расход топлива",   min: 0,   max: 100,  step: 1,   unit: " л/ч" },
};

const SCENE_PARAMS: Record<string, ParamKey[]> = {
  ok:          ["engine_temp", "oil_pressure", "speed", "fuel_level", "voltage", "rpm", "traction", "current", "fuel_rate"],
  overheat:    ["engine_temp", "rpm"],
  fuel:        ["fuel_level", "fuel_rate"],
  pressure:    ["oil_pressure", "speed"],
  electric:    ["voltage", "current"],
  overload:    ["traction", "current", "rpm", "engine_temp", "fuel_rate"],
  wheel_slip:  ["speed", "traction", "rpm"],
  fuel_leak:   ["fuel_level", "fuel_rate"],
  power_surge: ["voltage", "current"],
  cold_engine: ["engine_temp", "oil_pressure", "rpm", "speed"],
  brake_fail:  ["speed", "traction", "oil_pressure"],
  all:         ["engine_temp", "fuel_level", "oil_pressure", "voltage", "speed", "rpm"],
};

type LatLng = [number, number];

interface RouteInfo {
  from: string;
  to: string;
  path: LatLng[];
}

export function RightPanel({
  routeInfo,
  showScenarios,
}: {
  routeInfo?: RouteInfo;
  showScenarios?: boolean;
}) {
  const frame = useDisplayFrame();
  const alerts = useTelemetryStore((s) => s.alerts);
  const score = frame?.health_score ?? 100;
  const nodeColor =
    score > 70 ? "var(--ok)" : score > 40 ? "var(--warn)" : "var(--crit)";

  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [expandedScene, setExpandedScene] = useState<string | null>(null);
  const [sliderVals, setSliderVals] = useState<Record<string, number>>({});

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

      {showScenarios && (
        <>
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
            {SCENES.map((sc) => {
              const isOpen = expandedScene === sc.key;
              const params = SCENE_PARAMS[sc.key] ?? [];
              return (
                <div key={sc.key} style={{ marginBottom: 5 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="scbtn"
                      style={{ color: sc.color, borderColor: sc.color, flex: 1, marginBottom: 0 }}
                      onClick={() => {
                        (window as any).runScene?.(sc.key);
                        const init: Record<string, number> = {};
                        params.forEach((k) => {
                          init[k] = (window as any).__simState?.[k] ?? 0;
                        });
                        setSliderVals((prev) => ({ ...prev, ...init }));
                        setExpandedScene(isOpen ? null : sc.key);
                      }}
                    >
                      {sc.label}
                    </button>
                    {params.length > 0 && (
                      <button
                        style={{
                          border: `1.5px solid ${sc.color}`,
                          borderRadius: 4,
                          background: "transparent",
                          color: sc.color,
                          cursor: "pointer",
                          padding: "0 8px",
                          fontSize: 12,
                        }}
                        onClick={() => setExpandedScene(isOpen ? null : sc.key)}
                      >
                        {isOpen ? "▲" : "▼"}
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div style={{ padding: "8px 4px 2px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {params.map((k) => {
                        const meta = PARAM_META[k];
                        const val = sliderVals[k] ?? 0;
                        return (
                          <div key={k}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text2)", marginBottom: 3 }}>
                              <span>{meta.label}</span>
                              <b style={{ color: sc.color }}>{val}{meta.unit}</b>
                            </div>
                            <input
                              type="range"
                              min={meta.min}
                              max={meta.max}
                              step={meta.step}
                              value={val}
                              style={{ width: "100%", accentColor: sc.color }}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                setSliderVals((prev) => ({ ...prev, [k]: v }));
                                (window as any).setParam?.(k, v);
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

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