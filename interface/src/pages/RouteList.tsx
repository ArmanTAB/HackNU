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
    phone: "+7 701 222 33 44",
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
    phone: "+7 702 111 22 33",
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
    phone: "+7 705 888 77 66",
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
    phone: "+7 777 333 44 55",
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
      }}
    >
      {/* Topbar */}
      <div
        style={{
          background: "var(--bg2)",
          borderBottom: "1.5px solid var(--border)",
          padding: "0 32px",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        }}
      >
        <span
          style={{
            fontSize: 16,
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
            fontSize: 14,
            color: "var(--text3)",
            letterSpacing: ".08em",
          }}
        >
          Центр управления · КТЖ
        </span>
        <div
          style={{ marginLeft: "auto", fontSize: 14, color: "var(--text3)" }}
        >
          {new Date().toLocaleString("ru-RU")}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "32px 40px" }}>
        {/* Header + filters */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--text)",
                letterSpacing: ".08em",
                textTransform: "uppercase",
              }}
            >
              Активные маршруты
            </div>
            <div style={{ fontSize: 14, color: "var(--text3)", marginTop: 6 }}>
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
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  padding: "8px 16px",
                  borderRadius: 6,
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
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 120px 1.6fr 140px 160px 160px 56px",
              columnGap: 16,
              padding: "12px 20px",
              borderBottom: "1.5px solid var(--border)",
              fontSize: 12,
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
            <span>Номер</span>
            <span></span>
          </div>

          {/* Rows */}
          {filtered.length === 0 && (
            <div
              style={{
                padding: "36px",
                textAlign: "center",
                fontSize: 15,
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
                gridTemplateColumns: "140px 120px 1.6fr 140px 160px 160px 56px",
                columnGap: 16,
                padding: "16px 20px",
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
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {r.serial}
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}
                >
                  {r.name}
                </div>
              </div>

              {/* Маршрут */}
              <div
                style={{ fontSize: 15, color: "var(--cyan)", fontWeight: 700 }}
              >
                {r.route}
              </div>

              {/* Направление */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                  color: "var(--text)",
                }}
              >
                <span>{r.from}</span>
                <span style={{ color: "var(--text3)" }}>——</span>
                <span>{r.to}</span>
                <span
                  style={{ fontSize: 12, color: "var(--text3)", marginLeft: 6 }}
                >
                  {r.distance}
                </span>
              </div>

              {/* Здоровье */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: STATUS_COLOR[r.status],
                  }}
                >
                  {r.health}
                </div>
                <div
                  style={{
                    height: 3,
                    background: "var(--border)",
                    borderRadius: 2,
                    marginTop: 6,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: r.health + "%",
                      background: STATUS_COLOR[r.status],
                      borderRadius: 2,
                      transition: "width .5s",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: STATUS_COLOR[r.status],
                    marginTop: 5,
                    fontWeight: 700,
                    letterSpacing: ".06em",
                  }}
                >
                  {STATUS_LABEL[r.status]}
                </div>
              </div>

              {/* Машинист */}
              <div style={{ fontSize: 14, color: "var(--text2)" }}>
                {r.driver}
              </div>

              {/* Номер */}
              <div style={{ fontSize: 14, color: "var(--text2)" }}>
                {r.phone}
              </div>

              {/* Действие */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  border: "1.5px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--cyan)",
                  fontSize: 18,
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
