import { useDisplayFrame } from "../hooks/useDisplayFrame";

const MAX: Record<string, number> = {
  engine_temp: 180,
  oil_pressure: 12,
  rpm: 2000,
  speed: 160,
  traction: 500,
  fuel_level: 100,
  fuel_rate: 100,
};

function statusColor(key: string, val: number): string {
  const thresholds: Record<string, { ok: number[]; warn: number[] }> = {
    engine_temp: { ok: [0, 105], warn: [105, 135] },
    oil_pressure: { ok: [3.5, 12], warn: [2, 3.5] },
    speed: { ok: [0, 120], warn: [120, 140] },
    fuel_level: { ok: [15, 100], warn: [5, 15] },
  };
  const t = thresholds[key];
  if (!t) return "var(--ok)";
  if (val >= t.ok[0] && val <= t.ok[1]) return "var(--ok)";
  if (val >= t.warn[0] && val <= t.warn[1]) return "var(--warn)";
  return "var(--crit)";
}

function Metric({
  label,
  valueKey,
  val,
  unit,
}: {
  label: string;
  valueKey: string;
  val: number;
  unit: string;
}) {
  const pct = Math.min(100, Math.max(0, (val / (MAX[valueKey] ?? 100)) * 100));
  const col = statusColor(valueKey, val);
  return (
    <div className="metric">
      <div className="ml">
        <div className="mlabel">{label}</div>
        <div className="mbar-w">
          <div className="mbar" style={{ width: pct + "%", background: col }} />
        </div>
      </div>
      <div className="mr">
        <span className="mval" style={{ color: col }}>
          {val}
        </span>
        <span className="munit">{unit}</span>
      </div>
    </div>
  );
}

export function LeftPanel() {
  const frame = useDisplayFrame();
  const score = frame?.health_score ?? 0;
  const status = frame?.health_status ?? "normal";
  const arcCol =
    status === "normal"
      ? "var(--ok)"
      : status === "warning"
        ? "var(--warn)"
        : "var(--crit)";
  const arcOffset = 163 - (163 * score) / 100;

  return (
    <div className="panel">
      <div className="sec">
        <div className="sec-t">Индекс здоровья</div>
        <div className="h-wrap">
          <svg
            width="120"
            height="70"
            viewBox="0 0 120 70"
            style={{ display: "block", margin: "0 auto 4px" }}
          >
            <path
              d="M8 66 A52 52 0 0 1 112 66"
              fill="none"
              stroke="#d0d8e4"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M8 66 A52 52 0 0 1 112 66"
              fill="none"
              stroke={arcCol}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray="163"
              strokeDashoffset={arcOffset}
              style={{ transition: "stroke-dashoffset .6s, stroke .4s" }}
            />
          </svg>
          <div className="h-num" style={{ color: arcCol }}>
            {score}
          </div>
          <div className="h-lbl" style={{ color: arcCol }}>
            {status === "normal"
              ? "ХОРОШО"
              : status === "warning"
                ? "ВНИМАНИЕ"
                : "КРИТИЧНО"}
          </div>
          <div className="h-sub">HEALTH INDEX / 100</div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-t">Дизель</div>
        <Metric
          label="Температура"
          valueKey="engine_temp"
          val={frame?.engine_temp ?? 0}
          unit="°C"
        />
        <Metric
          label="Давление масла"
          valueKey="oil_pressure"
          val={frame?.oil_pressure ?? 0}
          unit=" бар"
        />
        <Metric
          label="Обороты"
          valueKey="rpm"
          val={frame?.rpm ?? 0}
          unit=" об/м"
        />
      </div>

      <div className="sec">
        <div className="sec-t">Движение</div>
        <Metric
          label="Скорость"
          valueKey="speed"
          val={frame?.speed ?? 0}
          unit=" км/ч"
        />
        <Metric
          label="Тяга"
          valueKey="traction"
          val={frame?.traction ?? 0}
          unit=" кН"
        />
      </div>

      <div className="sec">
        <div className="sec-t">Топливо</div>
        <Metric
          label="Уровень"
          valueKey="fuel_level"
          val={frame?.fuel_level ?? 0}
          unit="%"
        />
        <Metric
          label="Расход"
          valueKey="fuel_rate"
          val={frame?.fuel_rate ?? 0}
          unit=" л/ч"
        />
      </div>
    </div>
  );
}
