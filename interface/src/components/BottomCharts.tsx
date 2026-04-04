import { useRef, useEffect } from "react";
import { useTelemetryStore } from "../store/useTelemetryStore";
import type { HistoryPoint } from "../types/telemetry";

const CHARTS = [
  {
    key: "speed" as keyof HistoryPoint,
    label: "Скорость",
    unit: "",
    min: 0,
    max: 160,
    color: "#16a34a",
  },
  {
    key: "engine_temp" as keyof HistoryPoint,
    label: "Температура",
    unit: "°C",
    min: 60,
    max: 180,
    color: "#d97706",
  },
  {
    key: "oil_pressure" as keyof HistoryPoint,
    label: "Давление масла",
    unit: "",
    min: 0,
    max: 12,
    color: "#2563eb",
  },
  {
    key: "fuel_level" as keyof HistoryPoint,
    label: "Топливо",
    unit: "%",
    min: 0,
    max: 100,
    color: "#16a34a",
  },
  {
    key: "voltage" as keyof HistoryPoint,
    label: "Напряжение",
    unit: "В",
    min: 300,
    max: 800,
    color: "#7c3aed",
  },
];

function Sparkline({
  dataKey,
  color,
  min,
  max,
}: {
  dataKey: keyof HistoryPoint;
  color: string;
  min: number;
  max: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const history = useTelemetryStore((s) => s.history);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const pr = c.parentElement!.getBoundingClientRect();
    c.width = pr.width * devicePixelRatio;
    c.height = 110 * devicePixelRatio;
    const ctx = c.getContext("2d")!;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const W = pr.width,
      H = 110;
    const dark = document.documentElement.classList.contains("dark");
    ctx.fillStyle = dark ? "#162032" : "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = dark ? "#243550" : "#e4eaf3";
    ctx.lineWidth = 0.5;
    [0.25, 0.5, 0.75].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(0, y * H);
      ctx.lineTo(W, y * H);
      ctx.stroke();
    });
    const data = history.map((p) => p[dataKey] as number);
    if (data.length < 2) return;
    const MH = 60,
      rng = max - min || 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (MH - 1)) * W,
        y = H - ((v - min) / rng) * H * 0.82 - H * 0.09;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [history]);

  return <canvas ref={canvasRef} className="sp" />;
}

export function BottomCharts() {
  const frame = useTelemetryStore((s) => s.frame);

  const getValue = (key: keyof HistoryPoint) => {
    if (!frame) return "—";
    const v = frame[key as keyof typeof frame];
    return v !== undefined ? String(v) : "—";
  };

  return (
    <div className="bottom">
      {CHARTS.map((ch) => (
        <div key={ch.key} className="cc">
          <div className="ch">
            {ch.label}{" "}
            <span>
              {getValue(ch.key)}
              {ch.unit}
            </span>
          </div>
          <Sparkline
            dataKey={ch.key}
            color={ch.color}
            min={ch.min}
            max={ch.max}
          />
        </div>
      ))}
    </div>
  );
}
