import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStore } from "../store/useThemeStore";

const ROUTES = [
  {
    id: "1",
    name: "EMD SD40-2",
    serial: "СЕР.0847",
    route: "А-07",
    from: "Алматы",
    to: "Астана",
    distance: "1284 км",
    status: "normal" as const,
    health: 87,
    driver: "Сейткали А.",
    phone: "+7 701 222 33 44",
  },
  {
    id: "2",
    name: "EMD SD40-2",
    serial: "СЕР.0312",
    route: "Б-03",
    from: "Астана",
    to: "Актобе",
    distance: "1132 км",
    status: "warning" as const,
    health: 61,
    driver: "Муратов Б.",
    phone: "+7 702 111 22 33",
  },
  {
    id: "3",
    name: "EMD SD40-2",
    serial: "СЕР.0521",
    route: "В-11",
    from: "Шымкент",
    to: "Кызылорда",
    distance: "672 км",
    status: "critical" as const,
    health: 23,
    driver: "Ахметов Д.",
    phone: "+7 705 888 77 66",
  },
];

const STATUS_LABEL: Record<string, string> = {
  normal: "НОРМА",
  warning: "ВНИМАНИЕ",
  critical: "КРИТИЧНО",
};

type FilterType = "all" | "normal" | "warning" | "critical";

function healthBucket(value: number) {
  const bucket = Math.round(value / 10) * 10;
  return Math.max(0, Math.min(100, bucket));
}

export function RouteList() {
  const navigate = useNavigate();
  const { dark, toggle } = useThemeStore();
  const [filter, setFilter] = useState<FilterType>("all");
  const [backendStatus, setBackendStatus] = useState<"checking" | "ok" | "down">("checking");

  useEffect(() => {
    let active = true;
    const check = () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      fetch("/healthz", { signal: controller.signal })
        .then((r) => {
          if (!active) return;
          setBackendStatus(r.ok ? "ok" : "down");
        })
        .catch(() => {
          if (active) setBackendStatus("down");
        })
        .finally(() => clearTimeout(timeout));
    };

    check();
    const t = setInterval(check, 10000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const filtered =
    filter === "all" ? ROUTES : ROUTES.filter((r) => r.status === filter);

  const counts = {
    all: ROUTES.length,
    normal: ROUTES.filter((r) => r.status === "normal").length,
    warning: ROUTES.filter((r) => r.status === "warning").length,
    critical: ROUTES.filter((r) => r.status === "critical").length,
  };

  const FILTERS: { key: FilterType; label: string; color: string }[] = [
    { key: "all", label: `Все · ${counts.all}`, color: "var(--text2)" },
    { key: "normal", label: `Норма · ${counts.normal}`, color: "var(--ok)" },
    {
      key: "warning",
      label: `Внимание · ${counts.warning}`,
      color: "var(--warn)",
    },
    {
      key: "critical",
      label: `Критично · ${counts.critical}`,
      color: "var(--crit)",
    },
  ];

  return (
    <div className="route-page">
      <div className="route-topbar">
        <span className="route-topbar-title">Цифровой двойник</span>
        <span className="route-topbar-sub">Центр управления · КТЖ</span>
        <div className="route-topbar-right">
          <div
            className={
              backendStatus === "ok"
                ? "status status--ok"
                : backendStatus === "down"
                  ? "status status--down"
                  : "status status--checking"
            }
            title="Статус бэкенда"
          >
            <div className="status-dot" />
            {backendStatus === "ok"
              ? "SERVER OK"
              : backendStatus === "down"
                ? "SERVER DOWN"
                : "SERVER..."}
          </div>
          <span className="route-topbar-clock">
            {new Date().toLocaleString("ru-RU")}
          </span>
          <button
            onClick={toggle}
            className="route-theme-btn"
            title="Переключить тему"
          >
            {dark ? "☀" : "🌙"}
          </button>
        </div>
      </div>

      <div className="route-content">
        <div className="route-header">
          <div>
            <div className="route-header-title">Активные маршруты</div>
            <div className="route-header-sub">
              {filtered.length} из {ROUTES.length} локомотивов
            </div>
          </div>

          <div className="route-filters">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  filter === f.key
                    ? `route-filter-btn route-filter-btn--${f.key} is-active`
                    : `route-filter-btn route-filter-btn--${f.key}`
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="route-table">
          <div className="route-table-head">
            <span>Серия</span>
            <span>Маршрут</span>
            <span>Направление</span>
            <span className="route-table-health">Здоровье</span>
            <span>Машинист</span>
            <span>Номер</span>
            <span></span>
          </div>

          {filtered.length === 0 && (
            <div className="route-empty">Нет маршрутов с таким статусом</div>
          )}

          {filtered.map((r, i) => (
            <div
              key={r.id}
              className={`route-row status-${r.status} ${i < filtered.length - 1 ? "route-row--border" : ""}`}
              onClick={() => navigate(`/dashboard/${r.id}`)}
            >
              <div className="route-cell-series">
                <div className="route-serial">{r.serial}</div>
                <div className="route-name">{r.name}</div>
              </div>

              <div className="route-cell-route">{r.route}</div>

              <div className="route-cell-direction">
                <span>{r.from}</span>
                <span className="route-direction-sep">——</span>
                <span>{r.to}</span>
                <span className="route-distance">{r.distance}</span>
              </div>

              <div className="route-cell-health">
                <div className="route-health-value">{r.health}</div>
                <div className="route-health-bar">
                  <div
                    className={`route-health-fill route-health-fill--${healthBucket(r.health)}`}
                  />
                </div>
                <div className="route-health-label">{STATUS_LABEL[r.status]}</div>
              </div>

              <div className="route-cell-driver">{r.driver}</div>

              <div className="route-cell-phone">{r.phone}</div>

              <div className="route-cell-action">→</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
