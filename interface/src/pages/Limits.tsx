import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useThemeStore } from "../store/useThemeStore";

const LIMIT_GROUPS = [
  { key: "engine_temp", label: "Температура двигателя", unit: "°C" },
  { key: "oil_temp", label: "Температура масла", unit: "°C" },
  { key: "ambient_temp", label: "Температура окружающей среды", unit: "°C" },
  { key: "engine_rpm", label: "Обороты двигателя", unit: "об/м" },
  { key: "oil_pressure", label: "Давление масла", unit: "бар" },
  { key: "speed", label: "Скорость", unit: "км/ч" },
  { key: "fuel_level", label: "Уровень топлива", unit: "%" },
  { key: "fuel_consumption", label: "Расход топлива", unit: "л/ч" },
  { key: "traction_force", label: "Тяговое усилие", unit: "кН" },
  { key: "traction_current", label: "Ток тяги", unit: "А" },
  { key: "traction_voltage", label: "Напряжение тяги", unit: "В" },
  { key: "battery_voltage", label: "Напряжение батареи", unit: "В" },
  { key: "pantograph_voltage", label: "Напряжение пантографа", unit: "В" },
  { key: "inverter_temp", label: "Температура инвертора", unit: "°C" },
  { key: "brake_pipe_pressure", label: "Давление в тормозной магистрали", unit: "бар" },
  { key: "brake_cylinder_pressure", label: "Давление в тормозных цилиндрах", unit: "бар" },
  { key: "main_reservoir_pressure", label: "Давление в главном резервуаре", unit: "бар" },
  { key: "wheel_slip", label: "Буксование колес", unit: "%" },
];

const LIMIT_SUFFIXES = [
  { key: "warning_min", label: "Warning min" },
  { key: "warning_max", label: "Warning max" },
  { key: "critical_min", label: "Critical min" },
  { key: "critical_max", label: "Critical max" },
];

type LimitsPayload = Record<string, number | string | undefined>;

function toInputValue(value: number | string | undefined) {
  if (value === undefined || value === null) return "";
  return String(value);
}

export function LimitsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dark, toggle } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showLeavePrompt, setShowLeavePrompt] = useState(false);
  const [pendingLeave, setPendingLeave] = useState(false);
  const [rawLimits, setRawLimits] = useState<LimitsPayload>({});
  const [form, setForm] = useState<Record<string, string>>({});

  const locomotiveId = id ?? "1";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("limits-scroll");
    return () => root.classList.remove("limits-scroll");
  }, []);

  const isDirty = useMemo(() => {
    const keys = new Set([...Object.keys(rawLimits), ...Object.keys(form)]);
    for (const key of keys) {
      if (toInputValue(rawLimits[key]) !== (form[key] ?? "")) return true;
    }
    return false;
  }, [rawLimits, form]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/v1/locomotives/${locomotiveId}/limits`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Ошибка загрузки лимитов"))))
      .then((data) => {
        if (!active) return;
        const nextForm: Record<string, string> = {};
        Object.keys(data ?? {}).forEach((key) => {
          nextForm[key] = toInputValue(data[key]);
        });
        setRawLimits(data ?? {});
        setForm(nextForm);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Ошибка загрузки лимитов");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [locomotiveId]);

  useEffect(() => {
    if (success && pendingLeave) {
      setPendingLeave(false);
      navigate("/");
    }
  }, [success, pendingLeave, navigate]);

  const groups = useMemo(() => LIMIT_GROUPS, []);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (success) setSuccess(null);
  }

  function handleReset() {
    const nextForm: Record<string, string> = {};
    Object.keys(rawLimits).forEach((key) => {
      nextForm[key] = toInputValue(rawLimits[key]);
    });
    setForm(nextForm);
  }

  function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: LimitsPayload = { ...rawLimits };
    Object.entries(form).forEach(([key, value]) => {
      if (value === "") return;
      const num = Number(value);
      if (!Number.isNaN(num)) payload[key] = num;
    });

    fetch(`/api/v1/locomotives/${locomotiveId}/limits`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Не удалось сохранить лимиты");
        return r.json();
      })
      .then(() => {
        setRawLimits(payload);
        setSuccess("Лимиты успешно сохранены");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Не удалось сохранить лимиты");
      })
      .finally(() => setSaving(false));
  }

  function handleBack() {
    if (isDirty) {
      setShowLeavePrompt(true);
      return;
    }
    navigate("/");
  }

  function handleLeaveWithoutSave() {
    setShowLeavePrompt(false);
    navigate("/");
  }

  function handleSaveAndLeave() {
    setPendingLeave(true);
    setShowLeavePrompt(false);
    handleSave();
  }

  return (
    <div className="limits-page">
      <div className="limits-topbar">
        <button className="limits-back" onClick={handleBack}>←</button>
        <div className="limits-title">Пороги телеметрии</div>
        <div className="limits-sub">Локомотив #{locomotiveId}</div>
        <div className="limits-right">
          <button className="limits-theme-btn" onClick={toggle} title="Переключить тему">
            {dark ? "☀" : "🌙"}
          </button>
        </div>
      </div>

      <div className="limits-content">
        <div className="limits-header">
          <div className="limits-header-title">Настройка лимитов</div>
          <div className="limits-header-sub">
            Обновите warning/critical пороги и сохраните изменения
          </div>
        </div>

        {error && <div className="limits-error">{error}</div>}
        {success && <div className="limits-success">{success}</div>}
        {showLeavePrompt && (
          <div className="limits-notice">
            <div className="limits-notice-text">
              Изменения не сохранены. Хотите сохранить перед выходом?
            </div>
            <div className="limits-notice-actions">
              <button className="limits-btn" onClick={() => setShowLeavePrompt(false)}>
                Отмена
              </button>
              <button className="limits-btn" onClick={handleLeaveWithoutSave}>
                Покинуть
              </button>
              <button className="limits-btn limits-btn--primary" onClick={handleSaveAndLeave}>
                Сохранить
              </button>
            </div>
          </div>
        )}

        <div className="limits-actions">
          <button className="limits-btn" onClick={handleReset} disabled={loading || saving}>
            Сбросить
          </button>
          <button className="limits-btn limits-btn--primary" onClick={handleSave} disabled={loading || saving || !isDirty}>
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>

        {loading ? (
          <div className="limits-loading">Загрузка лимитов...</div>
        ) : (
          <div className="limits-grid">
            <div className="limits-row limits-row--head">
              <div>Параметр</div>
              {LIMIT_SUFFIXES.map((s) => (
                <div key={s.key}>{s.label}</div>
              ))}
            </div>
            {groups.map((g) => (
              <div className="limits-row" key={g.key}>
                <div className="limits-param">
                  <div className="limits-param-title">{g.label}</div>
                  <div className="limits-param-unit">{g.unit}</div>
                </div>
                {LIMIT_SUFFIXES.map((s) => {
                  const field = `${g.key}_${s.key}`;
                  return (
                    <div className="limits-cell" key={field}>
                      <input
                        className="limits-input"
                        type="number"
                        step="0.1"
                        value={form[field] ?? ""}
                        onChange={(e) => handleChange(field, e.target.value)}
                        placeholder="—"
                        title={field}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
