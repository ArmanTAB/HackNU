import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStore } from "../store/useThemeStore";
import { login, register } from "../api/auth";

export function AuthPage() {
  const navigate = useNavigate();
  const { dark, toggle } = useThemeStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", login: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, val: string) {
    setForm((p) => ({ ...p, [key]: val }));
    setError("");
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");

    if (!form.login.trim() || !form.password.trim()) {
      setError("Заполните все обязательные поля");
      return;
    }
    if (mode === "register") {
      if (!form.name.trim()) { setError("Введите имя"); return; }
      if (form.password.length < 6) { setError("Пароль минимум 6 символов"); return; }
      if (form.password !== form.confirm) { setError("Пароли не совпадают"); return; }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login({ login: form.login, password: form.password });
      } else {
        await register({ name: form.name, login: form.login, password: form.password });
      }
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка сервера");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>

      {/* Topbar */}
      <div style={{
        background: "var(--navy)",
        height: 60,
        display: "flex",
        alignItems: "center",
        padding: "0 32px",
        gap: 16,
        boxShadow: "0 2px 16px rgba(0,0,0,.28)",
      }}>
        <span style={{ fontSize: 15, letterSpacing: ".2em", color: "var(--cyan)", textTransform: "uppercase", fontWeight: 700 }}>
          Цифровой двойник
        </span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,.4)", letterSpacing: ".08em" }}>
          Центр управления · КТЖ
        </span>
        <div style={{ marginLeft: "auto" }}>
          <button onClick={toggle} style={{
            background: "rgba(255,255,255,.08)",
            border: "1.5px solid rgba(255,255,255,.15)",
            borderRadius: 8,
            padding: "6px 14px",
            fontSize: 16,
            cursor: "pointer",
            color: "rgba(255,255,255,.75)",
          }}>
            {dark ? "☀" : "🌙"}
          </button>
        </div>
      </div>

      {/* Center card */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{
          background: "var(--bg2)",
          borderRadius: 16,
          border: "1.5px solid var(--border)",
          boxShadow: "0 8px 40px rgba(0,0,0,.12)",
          width: "100%",
          maxWidth: 420,
          overflow: "hidden",
        }}>

          {/* Tab switcher */}
          <div style={{ display: "flex", borderBottom: "1.5px solid var(--border)" }}>
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                flex: 1,
                padding: "16px 0",
                background: "transparent",
                border: "none",
                borderBottom: mode === m ? `2px solid var(--cyan)` : "2px solid transparent",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: mode === m ? "var(--cyan)" : "var(--text3)",
                transition: "all .2s",
                marginBottom: -1.5,
              }}>
                {m === "login" ? "Вход" : "Регистрация"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: "28px 32px 32px" }}>

            {/* Logo */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: "linear-gradient(135deg, var(--cyan), var(--blue))",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 12px",
                fontSize: 26,
              }}>🚂</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
                {mode === "login" ? "Добро пожаловать" : "Создать аккаунт"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
                {mode === "login" ? "Войдите в систему мониторинга" : "Регистрация в системе КТЖ"}
              </div>
            </div>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {mode === "register" && (
                <Field label="Полное имя" value={form.name} onChange={(v) => set("name", v)} placeholder="Иванов Иван Иванович" />
              )}

              <Field label="Логин" value={form.login} onChange={(v) => set("login", v)} placeholder="user@ktze.kz" />

              <Field label="Пароль" value={form.password} onChange={(v) => set("password", v)} placeholder="••••••••" type="password" />

              {mode === "register" && (
                <Field label="Повторите пароль" value={form.confirm} onChange={(v) => set("confirm", v)} placeholder="••••••••" type="password" />
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(220,38,38,.1)",
                border: "1px solid rgba(220,38,38,.3)",
                color: "var(--crit)",
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              marginTop: 22,
              width: "100%",
              padding: "13px 0",
              borderRadius: 10,
              border: "none",
              background: loading ? "var(--border)" : "linear-gradient(135deg, var(--cyan), var(--blue))",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: ".08em",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity .2s",
              opacity: loading ? .7 : 1,
            }}>
              {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
            </button>

            {/* Switch mode */}
            <div style={{ marginTop: 18, textAlign: "center", fontSize: 13, color: "var(--text3)" }}>
              {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
              <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{
                background: "none", border: "none", color: "var(--cyan)",
                cursor: "pointer", fontWeight: 700, fontSize: 13, padding: 0,
              }}>
                {mode === "login" ? "Зарегистрироваться" : "Войти"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "var(--text3)", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "11px 14px",
          borderRadius: 8,
          border: "1.5px solid var(--border)",
          background: "var(--bg3)",
          color: "var(--text)",
          fontSize: 14,
          outline: "none",
          transition: "border-color .2s",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
        onFocus={(e) => e.target.style.borderColor = "var(--cyan)"}
        onBlur={(e) => e.target.style.borderColor = "var(--border)"}
      />
    </div>
  );
}
