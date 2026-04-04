import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ROUTES = [
  {
    id: "SD40-2-0847",
    name: "EMD SD40-2",
    serial: "СЕР.0847",
    route: "А-07",
    from: "Алматы",
    to: "Астана",
    distance: "1284 км",
    status: "normal" as const,
    health: 87,
    driver: "Сейткали А.",
  },
  {
    id: "SD40-2-0312",
    name: "EMD SD40-2",
    serial: "СЕР.0312",
    route: "Б-03",
    from: "Астана",
    to: "Актобе",
    distance: "1132 км",
    status: "warning" as const,
    health: 61,
    driver: "Муратов Б.",
  },
  {
    id: "SD40-2-0521",
    name: "EMD SD40-2",
    serial: "СЕР.0521",
    route: "В-11",
    from: "Шымкент",
    to: "Кызылорда",
    distance: "672 км",
    status: "critical" as const,
    health: 23,
    driver: "Ахметов Д.",
  },
  {
    id: "SD40-2-0934",
    name: "EMD SD40-2",
    serial: "СЕР.0934",
    route: "Г-05",
    from: "Актобе",
    to: "Уральск",
    distance: "548 км",
    status: "normal" as const,
    health: 94,
    driver: "Жумабеков С.",
  },
];

const STATUS_LABEL: Record<string, string> = {
  normal: "НОРМА",
  warning: "ВНИМАНИЕ",
  critical: "КРИТИЧНО",
};

const STATUS_COLOR: Record<string, string> = {
  normal: "var(--ok)",
  warning: "var(--warn)",
  critical: "var(--crit)",
};

type FilterType = "all" | "normal" | "warning" | "critical";

export function RouteList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");

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
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        fontFamily: "'Courier New', monospace",
      }}
    >
      {/* Topbar */}
      <div
        style={{
          background: "var(--bg2)",
          borderBottom: "1.5px solid var(--border)",
          padding: "0 28px",
          height: 48,
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        }}
      >
        <span
          style={{
            fontSize: 13,
            letterSpacing: ".18em",
            color: "var(--cyan)",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Цифровой двойник
        </span>
        <span
          style={{
            fontSize: 12,
            color: "var(--text3)",
            letterSpacing: ".08em",
          }}
        >
          Центр управления · КТЖ
        </span>
        <div
          style={{ marginLeft: "auto", fontSize: 12, color: "var(--text3)" }}
        >
          {new Date().toLocaleString("ru-RU")}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "28px 36px" }}>
        {/* Header + filters */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text)",
                letterSpacing: ".08em",
                textTransform: "uppercase",
              }}
            >
              Активные маршруты
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
              {filtered.length} из {ROUTES.length} локомотивов
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 6 }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  padding: "6px 14px",
                  borderRadius: 4,
                  border: `1.5px solid ${filter === f.key ? f.color : "var(--border)"}`,
                  background: filter === f.key ? f.color + "18" : "transparent",
                  color: filter === f.key ? f.color : "var(--text3)",
                  cursor: "pointer",
                  transition: "all .2s",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            background: "var(--bg2)",
            border: "1.5px solid var(--border)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "110px 120px 1fr 90px 110px 40px",
              padding: "9px 18px",
              borderBottom: "1.5px solid var(--border)",
              fontSize: 11,
              letterSpacing: ".13em",
              color: "var(--text3)",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            <span>Серия</span>
            <span>Маршрут</span>
            <span>Направление</span>
            <span style={{ textAlign: "center" }}>Здоровье</span>
            <span>Машинист</span>
            <span></span>
          </div>

          {/* Rows */}
          {filtered.length === 0 && (
            <div
              style={{
                padding: "32px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text3)",
              }}
            >
              Нет маршрутов с таким статусом
            </div>
          )}

          {filtered.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "110px 120px 1fr 90px 110px 40px",
                padding: "14px 18px",
                borderBottom:
                  i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                alignItems: "center",
                cursor: "pointer",
                transition: "background .15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg3)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              onClick={() => navigate(`/dashboard/${r.id}`)}
            >
              {/* Серия */}
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {r.serial}
                </div>
                <div
                  style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}
                >
                  {r.name}
                </div>
              </div>

              {/* Маршрут */}
              <div
                style={{ fontSize: 13, color: "var(--cyan)", fontWeight: 700 }}
              >
                {r.route}
              </div>

              {/* Направление */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--text)",
                }}
              >
                <span>{r.from}</span>
                <span style={{ color: "var(--text3)" }}>——</span>
                <span>{r.to}</span>
                <span
                  style={{ fontSize: 11, color: "var(--text3)", marginLeft: 4 }}
                >
                  {r.distance}
                </span>
              </div>

              {/* Здоровье */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: STATUS_COLOR[r.status],
                  }}
                >
                  {r.health}
                </div>
                <div
                  style={{
                    height: 2,
                    background: "var(--border)",
                    borderRadius: 1,
                    marginTop: 4,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: r.health + "%",
                      background: STATUS_COLOR[r.status],
                      borderRadius: 1,
                      transition: "width .5s",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: STATUS_COLOR[r.status],
                    marginTop: 3,
                    fontWeight: 700,
                    letterSpacing: ".06em",
                  }}
                >
                  {STATUS_LABEL[r.status]}
                </div>
              </div>

              {/* Машинист */}
              <div style={{ fontSize: 12, color: "var(--text2)" }}>
                {r.driver}
              </div>

              {/* Действие */}
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 4,
                  border: "1.5px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--cyan)",
                  fontSize: 16,
                  transition: "all .15s",
                }}
              >
                →
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
