import { useRef, useEffect } from "react";
import { useTelemetryStore } from "../store/useTelemetryStore";
import { useThemeStore } from "../store/useThemeStore";
import type { HistoryPoint } from "../types/telemetry";

const CHARTS = [
  { key: "speed"       as keyof HistoryPoint, label: "Скорость",      unit: "",   min: 0,   max: 160, color: "#16a34a" },
  { key: "engine_temp" as keyof HistoryPoint, label: "Температура",   unit: "°C", min: 60,  max: 180, color: "#d97706" },
  { key: "oil_pressure"as keyof HistoryPoint, label: "Давление масла",unit: "",   min: 0,   max: 12,  color: "#2563eb" },
  { key: "fuel_level"  as keyof HistoryPoint, label: "Топливо",       unit: "%",  min: 0,   max: 100, color: "#16a34a" },
  { key: "voltage"     as keyof HistoryPoint, label: "Напряжение",    unit: "В",  min: 300, max: 800, color: "#7c3aed" },
];

function fmt(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function Sparkline({ dataKey, color, min, max, unit }: {
  dataKey: keyof HistoryPoint;
  color: string;
  min: number;
  max: number;
  unit: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const history   = useTelemetryStore((s) => s.history);
  const dark = useThemeStore((s) => s.dark);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const pr  = c.parentElement!.getBoundingClientRect();
    const isDark = dark;

    const PAD_L = 46; // место под подписи оси Y
    const H     = 80;
    const W     = pr.width;

    c.width  = W * devicePixelRatio;
    c.height = H * devicePixelRatio;
    const ctx = c.getContext("2d")!;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // фон
    ctx.fillStyle = isDark ? "#162032" : "#ffffff";
    ctx.fillRect(0, 0, W, H);

    const gridColor  = isDark ? "#243550" : "#e4eaf3";
    const labelColor = isDark ? "#4a6585" : "#94a3b8";
    const rng        = max - min || 1;

    // горизонтальные деления + подписи значений
    // Область графика: y от 0.09*H (top=max) до 0.91*H (bottom=min)
    const TOP  = H * 0.09;
    const BOT  = H * 0.91;
    const plotH = BOT - TOP;

    // показываем 4 деления: min, 33%, 66%, max
    const levels = [0, 0.33, 0.66, 1];
    ctx.font      = `500 10px 'IBM Plex Sans', system-ui, sans-serif`;
    ctx.textAlign = "right";

    levels.forEach((t) => {
      const val  = min + t * rng;
      const yPx  = BOT - t * plotH;

      // линия
      ctx.strokeStyle = gridColor;
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD_L, yPx);
      ctx.lineTo(W, yPx);
      ctx.stroke();

      // подпись
      ctx.fillStyle = labelColor;
      ctx.fillText(fmt(val) + unit, PAD_L - 5, yPx + 3.5);
    });

    // линия-разделитель оси Y
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, 0);
    ctx.lineTo(PAD_L, H);
    ctx.stroke();

    // данные
    const data = history.map((p) => p[dataKey] as number);
    if (data.length < 2) return;

    const MH = 60;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = "round";
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = PAD_L + (i / (MH - 1)) * (W - PAD_L);
      const y = BOT - ((v - min) / rng) * plotH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [history, dark]);

  return <canvas ref={canvasRef} className="sp" />;
}

export function BottomCharts() {
  const frame = useTelemetryStore((s) => s.frame);

  const getValue = (key: keyof HistoryPoint) => {
    if (!frame) return "—";
    const v = frame[key as keyof typeof frame];
    return v !== undefined ? String(Math.round(v as number)) : "—";
  };

  return (
    <div className="bottom">
      {CHARTS.map((ch) => (
        <div key={ch.key} className="cc">
          <div className="ch">
            {ch.label}
            <span>{getValue(ch.key)}{ch.unit}</span>
          </div>
          <Sparkline dataKey={ch.key} color={ch.color} min={ch.min} max={ch.max} unit={ch.unit} />
        </div>
      ))}
    </div>
  );
}
