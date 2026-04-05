import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDisplayFrame } from "../hooks/useDisplayFrame";
import { useTelemetryStore } from "../store/useTelemetryStore";
import type { TelemetryLimits } from "../store/useTelemetryStore";
import type { TelemetryFrame } from "../types/telemetry";

// Maps TelemetryFrame keys to backend limit key prefixes
const LIMIT_PREFIX: Record<string, string> = {
  engine_temp:  "engine_temp",
  oil_pressure: "oil_pressure",
  speed:        "speed",
  fuel_level:   "fuel_level",
  rpm:          "engine_rpm",
  voltage:      "traction_voltage",
  current:      "traction_current",
  traction:     "traction_force",
  fuel_rate:    "fuel_consumption",
};

const MAX_FALLBACK: Record<string, number> = {
  engine_temp:  180,
  oil_pressure: 12,
  rpm:          2000,
  speed:        160,
  voltage:      800,
  current:      2500,
  traction:     500,
  fuel_level:   100,
  fuel_rate:    100,
};

type Status = "ok" | "warn" | "crit";

function getStatus(param: string, val: number, limits: TelemetryLimits): Status {
  const p = LIMIT_PREFIX[param] ?? param;
  const critMax = limits[`${p}_critical_max`];
  const critMin = limits[`${p}_critical_min`];
  const warnMax = limits[`${p}_warning_max`];
  const warnMin = limits[`${p}_warning_min`];

  if (critMax != null && val > critMax) return "crit";
  if (critMin != null && val < critMin) return "crit";
  if (warnMax != null && val > warnMax) return "warn";
  if (warnMin != null && val < warnMin) return "warn";
  return "ok";
}

function getStatusColor(param: string, val: number, limits: TelemetryLimits): string {
  const s = getStatus(param, val, limits);
  return s === "crit" ? "var(--crit)" : s === "warn" ? "var(--warn)" : "var(--ok)";
}

function getMaxVal(param: string, limits: TelemetryLimits): number {
  const p = LIMIT_PREFIX[param] ?? param;
  return (
    (limits[`${p}_critical_max`] as number | null | undefined) ??
    (limits[`${p}_warning_max`] as number | null | undefined) ??
    MAX_FALLBACK[param] ??
    100
  );
}

// ── Health model ──────────────────────────────────────────────────────────────
// Methodology: blockers (hard stop) + weighted subsystems
// ok=100%, warn=50%, crit=0% per parameter; subsystem = avg of its params

const PARAM_META: Record<string, { label: string; format: (v: number) => string }> = {
  engine_temp:  { label: "Температура двигателя",  format: v => `${Math.round(v)} °C` },
  oil_pressure: { label: "Давление масла",          format: v => `${v.toFixed(1)} бар` },
  rpm:          { label: "Обороты двигателя",       format: v => `${Math.round(v)} об/м` },
  speed:        { label: "Скорость",                format: v => `${Math.round(v)} км/ч` },
  voltage:      { label: "Напряжение тяги",         format: v => `${Math.round(v)} В` },
  current:      { label: "Ток тяги",                format: v => `${Math.round(v)} А` },
  traction:     { label: "Тяговое усилие",          format: v => `${Math.round(v)} кН` },
  fuel_level:   { label: "Уровень топлива",         format: v => `${Math.round(v)} %` },
  fuel_rate:    { label: "Расход топлива",          format: v => `${Math.round(v)} л/ч` },
};

// Blocker params: critical status → health = 0 immediately
const BLOCKER_PARAMS = ["engine_temp", "oil_pressure"];

// Subsystems: weight must sum to 1.0
const SUBSYSTEMS: { name: string; weight: number; params: string[] }[] = [
  { name: "Тяга / двигатель", weight: 0.40, params: ["engine_temp", "rpm", "oil_pressure"] },
  { name: "Электрика",        weight: 0.30, params: ["voltage", "current"] },
  { name: "Движение",         weight: 0.20, params: ["speed", "traction"] },
  { name: "Топливо",          weight: 0.10, params: ["fuel_level", "fuel_rate"] },
];

// ok → 1.0, warn → 0.5, crit → 0.0
const PARAM_SCORE: Record<Status, number> = { ok: 1.0, warn: 0.5, crit: 0.0 };

function buildReason(param: string, val: number, limits: TelemetryLimits): string {
  const p = LIMIT_PREFIX[param] ?? param;
  const fmt = PARAM_META[param]?.format ?? (v => String(v));
  const critMax = limits[`${p}_critical_max`] as number | null | undefined;
  const critMin = limits[`${p}_critical_min`] as number | null | undefined;
  const warnMax = limits[`${p}_warning_max`] as number | null | undefined;
  const warnMin = limits[`${p}_warning_min`] as number | null | undefined;

  if (critMax != null && val > critMax) return `${fmt(val)} > ${fmt(critMax)} — критический максимум`;
  if (critMin != null && val < critMin) return `${fmt(val)} < ${fmt(critMin)} — ниже критического минимума`;
  if (warnMax != null && val > warnMax) return `${fmt(val)} > ${fmt(warnMax)} — порог предупреждения`;
  if (warnMin != null && val < warnMin) return `${fmt(val)} < ${fmt(warnMin)} — ниже порога предупреждения`;
  return "В норме";
}

interface ParamResult {
  param: string;
  label: string;
  value: string;
  status: Status;
  score: number;   // 0.0 / 0.5 / 1.0
  reason: string;
  isBlocker: boolean;
}

interface SubsystemResult {
  name: string;
  weight: number;
  score: number;       // 0.0–1.0 average of params
  contribution: number; // score × weight × 100
  params: ParamResult[];
}

interface HealthBreakdown {
  blockerTriggered: boolean;
  blockerParam?: ParamResult;
  subsystems: SubsystemResult[];
  computedScore: number;
}

function computeHealth(frame: TelemetryFrame | null, limits: TelemetryLimits): HealthBreakdown {
  if (!frame) {
    return { blockerTriggered: false, subsystems: [], computedScore: 0 };
  }

  const subsystems: SubsystemResult[] = SUBSYSTEMS.map(sys => {
    const params: ParamResult[] = sys.params.map(p => {
      const meta   = PARAM_META[p];
      const val    = (frame as any)[p] as number ?? 0;
      const status = getStatus(p, val, limits);
      return {
        param:     p,
        label:     meta.label,
        value:     meta.format(val),
        status,
        score:     PARAM_SCORE[status],
        reason:    buildReason(p, val, limits),
        isBlocker: BLOCKER_PARAMS.includes(p),
      };
    });
    const score        = params.reduce((s, p) => s + p.score, 0) / params.length;
    const contribution = score * sys.weight * 100;
    return { name: sys.name, weight: sys.weight, score, contribution, params };
  });

  // Check blockers
  for (const sys of subsystems) {
    for (const p of sys.params) {
      if (p.isBlocker && p.status === "crit") {
        return { blockerTriggered: true, blockerParam: p, subsystems, computedScore: 0 };
      }
    }
  }

  const computedScore = Math.round(subsystems.reduce((s, sys) => s + sys.contribution, 0));
  return { blockerTriggered: false, subsystems, computedScore };
}

// ── Health tooltip ────────────────────────────────────────────────────────────

const STATUS_COLOR    = { ok: "var(--ok)", warn: "var(--warn)", crit: "var(--crit)" };
const STATUS_BADGE_BG = { ok: "#dcfce7",   warn: "#fef3c7",    crit: "#fee2e2" };
const STATUS_LABEL    = { ok: "НОРМА",     warn: "ВНИМАНИЕ",   crit: "АВАРИЯ" };

function ScoreBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden", margin: "3px 0" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width .4s" }} />
    </div>
  );
}

function HealthTooltip({ breakdown, score, status, pos }: {
  breakdown: HealthBreakdown;
  score: number;
  status: "normal" | "warning" | "critical";
  pos: { top: number; left: number };
}) {
  const worstStatus: Status = status === "critical" ? "crit" : status === "warning" ? "warn" : "ok";
  const col = STATUS_COLOR[worstStatus];
  const bg  = STATUS_BADGE_BG[worstStatus];
  const lbl = STATUS_LABEL[worstStatus];

  return createPortal(
    <div
      className="tooltip show"
      style={{ position: "fixed", top: pos.top, left: pos.left, pointerEvents: "none", zIndex: 9999 }}
    >
      <div className="tip-name" style={{ color: col }}>Индекс здоровья</div>
      <span className="tip-badge" style={{ background: bg, color: col }}>{lbl}</span>

      {/* Blocker alert */}
      {breakdown.blockerTriggered && breakdown.blockerParam && (
        <div style={{
          margin: "8px 0",
          padding: "8px 10px",
          background: "#fee2e2",
          borderLeft: "3px solid var(--crit)",
          borderRadius: "0 6px 6px 0",
          fontSize: 12,
        }}>
          <b style={{ color: "var(--crit)" }}>⛔ Блокер сработал</b>
          <div style={{ color: "var(--crit)", marginTop: 2 }}>
            {breakdown.blockerParam.label}: {breakdown.blockerParam.reason}
          </div>
          <div style={{ color: "var(--text3)", marginTop: 4, fontSize: 11 }}>
            Критический отказ блокирующего узла → индекс = 0
          </div>
        </div>
      )}

      {/* Subsystems */}
      <div style={{ fontSize: 11, color: "var(--text3)", margin: "8px 0 4px", letterSpacing: ".05em" }}>
        ПОДСИСТЕМЫ (вес × среднее параметров)
      </div>

      {breakdown.subsystems.map(sys => {
        const sysCol = sys.score > 0.7 ? "var(--ok)" : sys.score > 0.4 ? "var(--warn)" : "var(--crit)";
        return (
          <div key={sys.name} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--text2)", fontWeight: 600 }}>{sys.name}</span>
              <span style={{ color: "var(--text3)", fontSize: 11 }}>
                {Math.round(sys.weight * 100)}% веса ·{" "}
                <b style={{ color: sysCol }}>{Math.round(sys.score * 100)}%</b>
              </span>
            </div>
            <ScoreBar pct={sys.score * 100} color={sysCol} />
            {sys.params.map(p => (
              <div key={p.param} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", paddingLeft: 8, marginTop: 1 }}>
                <span style={{ color: p.status !== "ok" ? STATUS_COLOR[p.status] : undefined }}>
                  {p.isBlocker && "⚠ "}{p.label}
                </span>
                <span style={{ color: STATUS_COLOR[p.status] }}>
                  {p.value} · {Math.round(p.score * 100)}%
                  {p.status !== "ok" && (
                    <span style={{ fontSize: 10, marginLeft: 4, opacity: .8 }}>({p.reason})</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        );
      })}

      {/* Formula */}
      <div className="tip-diagnosis">
        <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, letterSpacing: ".05em" }}>РАСЧЁТ</div>
        {breakdown.blockerTriggered ? (
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--crit)" }}>
            блокер активен → 0
          </div>
        ) : (
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text)", lineHeight: 1.8 }}>
            {breakdown.subsystems.map(sys => (
              <div key={sys.name}>
                {Math.round(sys.weight * 100)}% × {Math.round(sys.score * 100)}% = <b>{Math.round(sys.contribution)} пт</b>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 4 }}>
              Итого: <b style={{ color: col }}>{Math.round(score)} / 100</b>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ── Metric bar ────────────────────────────────────────────────────────────────

function Metric({ label, param, val, unit, limits }: {
  label: string;
  param: string;
  val: number;
  unit: string;
  limits: TelemetryLimits;
}) {
  const maxVal = getMaxVal(param, limits);
  const pct = Math.min(100, Math.max(0, (val / maxVal) * 100));
  const color = getStatusColor(param, val, limits);
  return (
    <div className="metric">
      <div className="ml">
        <div className="mlabel">{label}</div>
        <div className="mbar-w">
          <div className="mbar" style={{ width: pct + "%", background: color }} />
        </div>
      </div>
      <div className="mr">
        <span className="mval" style={{ color }}>{Math.round(val)}</span>
        <span className="munit">{unit}</span>
      </div>
    </div>
  );
}

// ── LeftPanel ─────────────────────────────────────────────────────────────────

export function LeftPanel() {
  const frame  = useDisplayFrame();
  const limits = useTelemetryStore((s) => s.limits);
  const score  = frame?.health_score ?? 0;
  const status = frame?.health_status ?? "normal";

  const arcCol    = status === "normal" ? "var(--ok)" : status === "warning" ? "var(--warn)" : "var(--crit)";
  const arcOffset = 163 - (163 * score) / 100;

  // Hover tooltip
  const wrapRef  = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ top: number; left: number } | null>(null);

  function handleMouseEnter() {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTipPos({ top: r.top, left: r.right + 10 });
  }

  const breakdown = computeHealth(frame, limits);

  return (
    <div className="panel">
      <div className="sec">
        <div className="sec-t">Индекс здоровья</div>
        <div
          ref={wrapRef}
          className="h-wrap h-wrap--hoverable"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setTipPos(null)}
        >
          <svg width="120" height="70" viewBox="0 0 120 70" style={{ display: "block", margin: "0 auto 4px" }}>
            <path d="M8 66 A52 52 0 0 1 112 66" fill="none" stroke="#d0d8e4" strokeWidth="9" strokeLinecap="round" />
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
          <div className="h-num" style={{ color: arcCol }}>{Math.round(score)}</div>
          <div className="h-lbl" style={{ color: arcCol }}>
            {status === "normal" ? "ХОРОШО" : status === "warning" ? "ВНИМАНИЕ" : "КРИТИЧНО"}
          </div>
          <div className="h-sub">HEALTH INDEX / 100 ℹ</div>
        </div>

        {tipPos && (
          <HealthTooltip breakdown={breakdown} score={score} status={status} pos={tipPos} />
        )}
      </div>

      <div className="sec">
        <div className="sec-t">Дизель</div>
        <Metric label="Температура"    param="engine_temp"  val={frame?.engine_temp ?? 0}  unit="°C"    limits={limits} />
        <Metric label="Давление масла" param="oil_pressure" val={frame?.oil_pressure ?? 0} unit=" бар"  limits={limits} />
        <Metric label="Обороты"        param="rpm"          val={frame?.rpm ?? 0}          unit=" об/м" limits={limits} />
      </div>

      <div className="sec">
        <div className="sec-t">Электрика</div>
        <Metric label="Напряжение" param="voltage" val={frame?.voltage ?? 0} unit=" В" limits={limits} />
        <Metric label="Ток тяги"   param="current" val={frame?.current ?? 0} unit=" А" limits={limits} />
      </div>

      <div className="sec">
        <div className="sec-t">Движение</div>
        <Metric label="Скорость" param="speed"    val={frame?.speed ?? 0}    unit=" км/ч" limits={limits} />
        <Metric label="Тяга"     param="traction" val={frame?.traction ?? 0} unit=" кН"   limits={limits} />
      </div>

      <div className="sec">
        <div className="sec-t">Топливо</div>
        <Metric label="Уровень" param="fuel_level" val={frame?.fuel_level ?? 0} unit="%"    limits={limits} />
        <Metric label="Расход"  param="fuel_rate"  val={frame?.fuel_rate ?? 0}  unit=" л/ч" limits={limits} />
      </div>
    </div>
  );
}
