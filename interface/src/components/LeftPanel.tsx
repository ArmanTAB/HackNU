import { useDisplayFrame } from "../hooks/useDisplayFrame";
import { useTelemetryStore } from "../store/useTelemetryStore";

const MAX_FALLBACK: Record<string, number> = {
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
  max,
}: {
  label: string;
  valueKey: string;
  val: number;
  unit: string;
  max?: number;
}) {
  const maxVal = max ?? MAX_FALLBACK[valueKey] ?? 100;
  const pct = Math.min(100, Math.max(0, (val / maxVal) * 100));
  const displayVal = Math.round(val);
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
          {displayVal}
        </span>
        <span className="munit">{unit}</span>
      </div>
    </div>
  );
}

function ElectricMetric({
  label,
  val,
  max,
  unit,
}: {
  label: string;
  val: number;
  max: number;
  unit: string;
}) {
  const pct = Math.min(100, Math.max(0, (val / max) * 100));
  const displayVal = Math.round(val);
  return (
    <div className="metric">
      <div className="ml">
        <div className="mlabel">{label}</div>
        <div className="mbar-w">
          <div
            className="mbar"
            style={{ width: pct + "%", background: "var(--purple)" }}
          />
        </div>
      </div>
      <div className="mr">
        <span className="mval" style={{ color: "var(--purple)" }}>
          {displayVal}
        </span>
        <span className="munit"> {unit}</span>
      </div>
    </div>
  );
}

export function LeftPanel() {
  const frame = useDisplayFrame();
  const healthFactors = useTelemetryStore((s) => s.healthFactors);
  const limits = useTelemetryStore((s) => s.limits);
  const score = frame?.health_score ?? 0;
  const displayScore = Math.round(score);
  const status = frame?.health_status ?? "normal";
  const arcCol =
    status === "normal"
      ? "var(--ok)"
      : status === "warning"
        ? "var(--warn)"
        : "var(--crit)";
  const arcOffset = 163 - (163 * score) / 100;

  function formatFactor(factor: Record<string, any>): { label: string; value?: string; severity?: string } {
    const label =
      factor.name ??
      factor.parameter_name ??
      factor.parameter ??
      factor.metric ??
      factor.label ??
      "Фактор";
    const rawValue = factor.value ?? factor.score ?? factor.delta ?? factor.diff;
    const unit = factor.unit ?? "";
    const value = rawValue !== undefined ? `${Math.round(rawValue * 100) / 100}${unit}` : undefined;
    const severity = factor.severity ?? factor.level;
    return { label, value, severity };
  }

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
            {displayScore}
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
          max={limits.engine_temp_critical_max ?? limits.engine_temp_warning_max ?? undefined}
        />
        <Metric
          label="Давление масла"
          valueKey="oil_pressure"
          val={frame?.oil_pressure ?? 0}
          unit=" бар"
          max={limits.oil_pressure_critical_max ?? limits.oil_pressure_warning_max ?? undefined}
        />
        <Metric
          label="Обороты"
          valueKey="rpm"
          val={frame?.rpm ?? 0}
          unit=" об/м"
          max={limits.engine_rpm_critical_max ?? limits.engine_rpm_warning_max ?? undefined}
        />
      </div>

      <div className="sec">
        <div className="sec-t">Электрика</div>
        <ElectricMetric
          label="Напряжение"
          val={frame?.voltage ?? 0}
          max={limits.traction_voltage_critical_max ?? limits.traction_voltage_warning_max ?? 1000}
          unit="В"
        />
        <ElectricMetric
          label="Ток тяги"
          val={frame?.current ?? 0}
          max={limits.traction_current_critical_max ?? limits.traction_current_warning_max ?? 2500}
          unit="А"
        />
      </div>

      <div className="sec">
        <div className="sec-t">Движение</div>
        <Metric
          label="Скорость"
          valueKey="speed"
          val={frame?.speed ?? 0}
          unit=" км/ч"
          max={limits.speed_critical_max ?? limits.speed_warning_max ?? undefined}
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
          max={limits.fuel_level_critical_max ?? limits.fuel_level_warning_max ?? undefined}
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
