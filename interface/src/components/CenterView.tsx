import { useEffect, useRef } from "react";
import { useDisplayFrame } from "../hooks/useDisplayFrame";
import { useThemeStore } from "../store/useThemeStore";
import { useTelemetryStore } from "../store/useTelemetryStore";
import { TimeScrubber } from "./TimeScrubber";

const THEME = {
  light: { sky: 0xdde3ec, ground: 0x4a7c4e, ambient: 0.35, sun: 1.6, fogNear: 35, fogFar: 90 },
  dark:  { sky: 0x08111e, ground: 0x0e1f0e, ambient: 0.08, sun: 0.4, fogNear: 25, fogFar: 65 },
};

export function CenterView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useDisplayFrame();
  const dark = useThemeStore((s) => s.dark);
  const limits = useTelemetryStore((s) => s.limits);
  const limitsRef = useRef(limits);
  limitsRef.current = limits;
  const speed = frame?.speed ?? 0;
  const displaySpeed = Math.round(speed);
  const score = frame?.health_score ?? 100;
  const speedColor =
    score > 70 ? "var(--ok)" : score > 40 ? "var(--warn)" : "var(--crit)";

  useEffect(() => {
    const update = (window as any).__updateTelemetry;
    if (update) update(frame);
  }, [frame]);

  useEffect(() => {
    const update = (window as any).__updateLimits;
    if (update) update(limits);
  }, [limits]);

  // обновляем тему сцены без пересоздания Three.js
  useEffect(() => {
    const apply = (window as any).__applySceneTheme;
    if (apply) apply(dark);
  }, [dark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const THREE = (window as any).THREE;
    if (!THREE) return;

    const wrap = canvas.parentElement!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xdde3ec);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdde3ec);
    scene.fog = new THREE.Fog(0xdde3ec, 35, 90);

    const defaultTarget = new THREE.Vector3(0, 1.5, 0);
    const defaultPos = new THREE.Vector3(10, 5, 15);
    let desiredTarget = defaultTarget.clone();
    let desiredPos = defaultPos.clone();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 200);
    camera.position.set(7, 3, 5);

    const controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.target.copy(defaultTarget);
    controls.target.set(0, 1, 1);

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.6);
    sun.position.set(12, 20, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    sun.shadow.bias = -0.001;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.8);
    fill.position.set(-10, 6, -8);
    scene.add(fill);
    const bounce = new THREE.DirectionalLight(0xffffff, 0.3);
    bounce.position.set(0, -5, 5);
    scene.add(bounce);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({
        color: 0x4a7c4e,
        roughness: 0.95,
        metalness: 0,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    (window as any).__applySceneTheme = (isDark: boolean) => {
      const t = THEME[isDark ? "dark" : "light"];
      scene.background = new THREE.Color(t.sky);
      scene.fog = new THREE.Fog(t.sky, t.fogNear, t.fogFar);
      renderer.setClearColor(t.sky);
      ground.material.color.setHex(t.ground);
      ambient.intensity = t.ambient;
      sun.intensity = t.sun;
    };
    // применить текущую тему сразу при инициализации
    (window as any).__applySceneTheme(document.documentElement.classList.contains("dark"));

    // Telegraph poles
    const poles: any[] = [];
    const rails: any[] = [];
    const N_POLES = 14,
      SPACING = 6,
      LANE = -5;
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x7a8090,
      roughness: 0.9,
      metalness: 0.05,
    });
    const crossMat = new THREE.MeshStandardMaterial({
      color: 0x6a7080,
      roughness: 0.9,
      metalness: 0.05,
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x2c2c2c,
      roughness: 0.25,
      metalness: 0.8,
    });
    const sleeperMat = new THREE.MeshStandardMaterial({
      color: 0x3A220F,
      roughness: 0.8,
      metalness: 0.15,
    });

    for (let i = 0; i < N_POLES; i++) {
      const g = new THREE.Group();
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.075, 3.8, 7),
        postMat,
      );
      post.position.y = 1.9;
      post.castShadow = true;
      g.add(post);
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.065, 0.065),
        crossMat,
      );
      bar.position.y = 3.65;
      g.add(bar);
      [-0.42, 0, 0.42].forEach((x) => {
        const ins = new THREE.Mesh(
          new THREE.CylinderGeometry(0.038, 0.038, 0.13, 6),
          new THREE.MeshStandardMaterial({ color: 0xd4c090, roughness: 0.6 }),
        );
        ins.position.set(x, 3.58, 0);
        g.add(ins);
        const pts = [
          new THREE.Vector3(x, 3.5, 0),
          new THREE.Vector3(x, 3.5, -SPACING),
        ];
        g.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0x8090a0 }),
          ),
        );
      });
      g.position.set(LANE, 0, -i * SPACING);
      scene.add(g);
      poles.push(g);

      // Rails and sleepers under train
      const railLength = SPACING + 0.1;
      const leftRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.05, railLength),
        railMat,
      );
      const rightRail = leftRail.clone();
      leftRail.position.set(-0.3, 0.03, -i * SPACING);
      rightRail.position.set(0.3, 0.03, -i * SPACING);
      leftRail.castShadow = true;
      rightRail.castShadow = true;
      scene.add(leftRail, rightRail);
      rails.push(leftRail, rightRail);

      for (let j = 0; j < 2; j++) {
        const sleeper = new THREE.Mesh(
          new THREE.BoxGeometry(1, 0.04, 0.16),
          sleeperMat,
        );
        sleeper.position.set(0, 0.02, -i * SPACING - j * (SPACING / 2));
        sleeper.castShadow = true;
        scene.add(sleeper);
        rails.push(sleeper);
      }
    }

    function resize() {
      const w = wrap.clientWidth,
        h = wrap.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    // GLTF loader + mesh groups (из оригинала)
    const GROUPS: Record<string, (n: string) => boolean> = {
      engine: (n) => n.includes("engine"),
      chimney: (n) => n.includes("chimney"),
      wheels: (n) => n.includes("wheel") || n.includes("grate_round"),
      bogie: (n) => n.includes("brakes"),
      body: (n) =>
        (n.includes("body")) ||
        n.includes("body_detail") ||
        (n.includes("block") && n.includes("custom7")),
      fuel: (n) =>
        n.includes("attachment_barrel") ||
        n.includes("gas") ||
        n.includes("bumper"),
      roof: (n) =>
        n.includes("electric"),
      lights: (n) =>
        n.includes("detail_light") ||
        n.includes("detail_siren") ||
        n.includes("window"),
    };
    const meshMap: Record<string, any[]> = {};
    Object.keys(GROUPS).forEach((g) => (meshMap[g] = []));
    const origColors = new Map();
    const groupCenters: Record<string, any> = {};

    function getBaseColor(name: string) {
      // Используем базовый серый цвет
      return new THREE.Color(0xcccccc);
    }
    function makeMat(origMat: any) {
      const nm = (origMat.name || "").toLowerCase();
      if (nm.includes("glass"))
        return new THREE.MeshPhysicalMaterial({
          color: 0x88aacc,
          transparent: true,
          opacity: 0.35,
          roughness: 0.05,
          metalness: 0.1,
          transmission: 0.5,
        });
      // Используем оригинальный цвет материала из модели
      const col = origMat.color ? new THREE.Color(origMat.color) : new THREE.Color(0xcccccc);
      const isShiny = nm.includes("steel") || nm.includes("custom14");
      return new THREE.MeshStandardMaterial({
        color: col,
        roughness: isShiny ? 0.25 : 0.65,
        metalness: isShiny ? 0.7 : 0.15,
      });
    }

    const HEX = {
      ok: "#16a34a",
      warn: "#d97706",
      crit: "#dc2626",
      blue: "#2563eb",
      purple: "#7c3aed",
      select: "#0ea5e9",
    };
    const COL3 = {
      ok: new THREE.Color(0x16a34a),
      warn: new THREE.Color(0xf59e0b),
      crit: new THREE.Color(0xef4444),
      select: new THREE.Color(0x0ea5e9),
    };

    const L = limitsRef.current;
    const S = {
      temp:     { val: frame?.engine_temp ?? 0,  unit: "°C",   ok: [0,   L.engine_temp_warning_max    ?? 105], warn: [L.engine_temp_warning_max    ?? 105, L.engine_temp_critical_max    ?? 135] },
      oil:      { val: frame?.oil_pressure ?? 0, unit: " бар", ok: [L.oil_pressure_warning_min  ?? 3.5, L.oil_pressure_warning_max  ?? 8],   warn: [L.oil_pressure_critical_min  ?? 2,   L.oil_pressure_warning_min  ?? 3.5] },
      speed:    { val: frame?.speed ?? 0,        unit: " км/ч",ok: [0,   L.speed_warning_max           ?? 120], warn: [L.speed_warning_max           ?? 120, L.speed_critical_max           ?? 140] },
      fuel:     { val: frame?.fuel_level ?? 0,   unit: "%",    ok: [L.fuel_level_warning_min    ?? 15,  100],  warn: [L.fuel_level_critical_min    ?? 5,   L.fuel_level_warning_min    ?? 15] },
      volt:     { val: frame?.voltage ?? 0,      unit: " В",   ok: [L.traction_voltage_warning_min ?? 600, L.traction_voltage_warning_max ?? 750], warn: [L.traction_voltage_critical_min ?? 550, L.traction_voltage_warning_min ?? 600] },
      rpm:      { val: frame?.rpm ?? 0,          unit: " об/м",ok: [0,   L.engine_rpm_warning_max       ?? 1600],warn: [L.engine_rpm_warning_max       ?? 1600, L.engine_rpm_critical_max       ?? 1900] },
      traction: { val: frame?.traction ?? 0,     unit: " кН",  ok: [0,   L.traction_force_warning_max   ?? 400], warn: [L.traction_force_warning_max   ?? 400,  L.traction_force_critical_max   ?? 500] },
      curr:     { val: frame?.current ?? 0,      unit: " А",   ok: [0,   L.traction_current_warning_max ?? 2000],warn: [L.traction_current_warning_max ?? 2000, L.traction_current_critical_max ?? 2400] },
      cons:     { val: frame?.fuel_rate ?? 0,    unit: " л/ч", ok: [0,   L.fuel_consumption_warning_max ?? 80],  warn: [L.fuel_consumption_warning_max ?? 80,   L.fuel_consumption_critical_max ?? 100] },
    };

    function st(k: keyof typeof S) {
      const s = S[k];
      const v = s.val;
      const low = k === "fuel";
      if (low) {
        if (v >= s.ok[0]) return "ok";
        if (v >= s.warn[0]) return "warn";
        return "crit";
      }
      if (v >= s.ok[0] && v <= s.ok[1]) return "ok";
      if (v >= s.warn[0] && v <= s.warn[1]) return "warn";
      return "crit";
    }

    const GRP_SENSORS: Record<string, (keyof typeof S)[]> = {
      engine: ["temp", "rpm", "cons"],
      chimney: ["rpm"],
      wheels: ["speed"],
      bogie: ["oil", "traction"],
      body: [],  // убрали "temp" - body не реагирует на температуру
      fuel: ["fuel", "cons"],
      roof: ["volt", "curr"],
      lights: ["volt"],
    };

    function grpWorstSt(g: string) {
      let w = "ok";
      for (const k of GRP_SENSORS[g] || []) {
        const s = st(k);
        if (s === "crit") return "crit";
        if (s === "warn") w = "warn";
      }
      return w;
    }

    function setMeshColor(mesh: any, col3: any) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat: any) => {
        if (!mat.color) return;
        const nm = (mat.name || "").toLowerCase();
        if (nm.includes("glass")) return;
        mat.color.copy(col3);
      });
    }

    function restoreMesh(mesh: any) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat: any) => {
        if (!mat.color) return;
        const nm = (mat.name || "").toLowerCase();
        if (nm.includes("glass")) return;
        const orig = origColors.get(mat);
        if (orig) mat.color.copy(orig);
      });
    }

    const tipEl = document.getElementById("tip");
    let curHover: string | null = null;
    let selectedGroup: string | null = null;

    const DIAG: Record<
      string,
      {
        name: string;
        params: () => { k: keyof typeof S; l: string; v: string }[];
        msg: () => string;
      }
    > = {
      engine: {
        name: "Дизельный двигатель",
        params: () => [
          { k: "temp", l: "Температура", v: `${Math.round(S.temp.val)}°C` },
          { k: "rpm", l: "Обороты", v: `${Math.round(S.rpm.val)} об/м` },
          { k: "cons", l: "Расход топлива", v: `${Math.round(S.cons.val)} л/ч` },
        ],
        msg: () => {
          const ts = st("temp");
          const rs = st("rpm");
          if (ts === "crit")
            return `Критический перегрев: ${Math.round(S.temp.val)}°C. Требуется остановка и осмотр системы охлаждения.`;
          if (ts === "warn")
            return `Температура двигателя повышена до ${Math.round(S.temp.val)}°C. Снизьте нагрузку.`;
          if (rs === "crit")
            return `Обороты ${Math.round(S.rpm.val)} об/м критически высокие (макс. ${Math.round(S.rpm.warn[1])}). Риск повреждения.`;
          if (rs === "warn") return `Обороты ${Math.round(S.rpm.val)} об/м близки к максимуму (${Math.round(S.rpm.ok[1])} об/м).`;
          return "Двигатель работает штатно. Все параметры в норме.";
        },
      },
      chimney: {
        name: "Выхлопная система",
        params: () => [{ k: "rpm", l: "Нагрузка (об/м)", v: `${Math.round(S.rpm.val)} об/м` }],
        msg: () => {
          const rs = st("rpm");
          if (rs === "crit") return "Сильная задымленность. Требуется диагностика.";
          if (rs === "warn") return "Повышенный выброс выхлопных газов при высоких оборотах.";
          return "Выхлопная система в норме.";
        },
      },
      wheels: {
        name: "Колесные пары",
        params: () => [{ k: "speed", l: "Скорость", v: `${Math.round(S.speed.val)} км/ч` }],
        msg: () => {
          const ss = st("speed");
          if (ss === "crit")
            return `Скорость ${Math.round(S.speed.val)} км/ч превышает лимит (макс. ${Math.round(S.speed.warn[1])} км/ч). Риск схода с рельс.`;
          if (ss === "warn")
            return `Скорость ${Math.round(S.speed.val)} км/ч близка к максимальной (${Math.round(S.speed.ok[1])} км/ч).`;
          return "Колесные пары в норме.";
        },
      },
      bogie: {
        name: "Тележки / ходовая часть",
        params: () => [
          { k: "oil", l: "Давление масла", v: `${S.oil.val.toFixed(1)} бар` },
          { k: "traction", l: "Тяговое усилие", v: `${Math.round(S.traction.val)} кН` },
        ],
        msg: () => {
          const os = st("oil");
          if (os === "crit")
            return `Давление масла ${S.oil.val.toFixed(1)} бар критически низкое. Немедленная остановка.`;
          if (os === "warn")
            return `Давление масла ${S.oil.val.toFixed(1)} бар снижено. Проверьте маслосистему.`;
          return "Ходовая часть в норме.";
        },
      },
      body: {
        name: "Кузов / вентиляция",
        params: () => [{ k: "temp", l: "Темп. в отсеке", v: `${Math.round(S.temp.val)}°C` }],
        msg: () => {
          const ts = st("temp");
          if (ts === "crit") return "Перегрев отсека. Проверьте вентиляционные решетки.";
          if (ts === "warn") return "Повышенная температура внутри кузова.";
          return "Вентиляция кузова работает штатно.";
        },
      },
      fuel: {
        name: "Топливная система",
        params: () => [
          { k: "fuel", l: "Уровень топлива", v: `${Math.round(S.fuel.val)}%` },
          { k: "cons", l: "Расход", v: `${Math.round(S.cons.val)} л/ч` },
        ],
        msg: () => {
          const fs = st("fuel");
          const eta = S.cons.val > 0 ? Math.round((S.fuel.val * 60) / S.cons.val) : 999;
          if (fs === "crit")
            return `Топливо ${Math.round(S.fuel.val)}%. Аварийный запас. До остановки примерно ${eta} мин.`;
          if (fs === "warn")
            return `Топливо ${Math.round(S.fuel.val)}%. До опасной зоны примерно ${eta} мин.`;
          return "Топливная система в норме. Запас хода достаточный.";
        },
      },
      roof: {
        name: "Электрооборудование",
        params: () => [
          { k: "volt", l: "Напряжение", v: `${Math.round(S.volt.val)} В` },
          { k: "curr", l: "Ток тяги", v: `${Math.round(S.curr.val)} А` },
        ],
        msg: () => {
          const vs = st("volt");
          const cs = st("curr");
          if (vs === "crit")
            return `Напряжение ${Math.round(S.volt.val)} В вне нормы (${Math.round(S.volt.ok[0])}–${Math.round(S.volt.ok[1])} В). Риск повреждения оборудования.`;
          if (vs === "warn") return `Нестабильное напряжение ${Math.round(S.volt.val)} В. Норма: ${Math.round(S.volt.ok[0])}–${Math.round(S.volt.ok[1])} В.`;
          if (cs === "crit") return `Ток тяги ${Math.round(S.curr.val)} А превышает норму (макс. ${Math.round(S.curr.ok[1])} А).`;
          return "Электрооборудование работает штатно.";
        },
      },
      lights: {
        name: "Фары и сигнализация",
        params: () => [{ k: "volt", l: "Питание", v: `${S.volt.val} В` }],
        msg: () => {
          const vs = st("volt");
          if (vs === "crit") return `Фары обесточены: ${S.volt.val} В. Движение запрещено.`;
          if (vs === "warn") return "Мигание фар из-за нестабильного напряжения.";
          return "Освещение и сигнализация работают штатно.";
        },
      },
    };

    function showTip(g: string) {
      if (!tipEl) return;
      const d = DIAG[g];
      if (!d) return;
      const ws = grpWorstSt(g);
      const col = ws === "ok" ? HEX.ok : ws === "warn" ? HEX.warn : HEX.crit;
      const bgBadge = ws === "ok" ? "#dcfce7" : ws === "warn" ? "#fef3c7" : "#fee2e2";
      const slbl = ws === "ok" ? "НОРМА" : ws === "warn" ? "ВНИМАНИЕ" : "АВАРИЯ";
      tipEl.style.borderLeftColor = col;
      const params = d
        .params()
        .map((p) => {
          const ps = st(p.k);
          const pc = ps === "ok" ? HEX.ok : ps === "warn" ? HEX.warn : HEX.crit;
          return `<div class="tip-param"><span>${p.l}</span><b style="color:${pc}">${p.v}</b></div>`;
        })
        .join("");
      tipEl.innerHTML = `
    <div class="tip-name" style="color:${col}">${d.name}</div>
    <span class="tip-badge" style="background:${bgBadge};color:${col}">${slbl}</span>
    ${params}
    <div class="tip-diagnosis">${d.msg()}</div>
  `;
      tipEl.classList.add("show");
    }
    function hideTip() {
      if (!tipEl) return;
      tipEl.classList.remove("show");
      curHover = null;
    }

    function applyAll() {
      for (const [g, meshes] of Object.entries(meshMap)) {
        const s = grpWorstSt(g);
        if (s === "ok") {
          meshes.forEach((m) => restoreMesh(m));
        } else {
          const col = COL3[s as keyof typeof COL3];
          meshes.forEach((m) => setMeshColor(m, col));
        }
        if (selectedGroup === g) {
          meshes.forEach((m) => setMeshColor(m, COL3.select));
        }
      }

      // Кастомная раскраска при перегреве двигателя
      const tempStatus = st("temp");
      if (tempStatus === "crit") {
        // Критический перегрев - красный цвет
        meshMap.engine?.forEach((m) => setMeshColor(m, COL3.crit));
        meshMap.chimney?.forEach((m) => setMeshColor(m, COL3.crit));
      } else if (tempStatus === "warn") {
        // Предупреждение - желтый цвет
        meshMap.engine?.forEach((m) => setMeshColor(m, COL3.warn));
        meshMap.chimney?.forEach((m) => setMeshColor(m, COL3.warn));
      } else {
        // При нормальной температуре - все в нормальном цвете
      }

      const tipTarget = selectedGroup || curHover;
      if (tipTarget) showTip(tipTarget);
    }

    function computeGroupCenters() {
      const box = new THREE.Box3();
      const tmp = new THREE.Vector3();
      for (const [g, meshes] of Object.entries(meshMap)) {
        box.makeEmpty();
        meshes.forEach((m) => box.expandByObject(m));
        if (!box.isEmpty()) {
          box.getCenter(tmp);
          groupCenters[g] = tmp.clone();
        }
      }
    }

    function setFocus(group: string | null) {
      if (!group || !groupCenters[group]) {
        desiredTarget = defaultTarget.clone();
        desiredPos = defaultPos.clone();
        return;
      }
      const center = groupCenters[group].clone();
      desiredTarget = center.clone();
      desiredPos = center.clone().add(new THREE.Vector3(6, 4, 8));
    }

    // Load GLTF — B64 берётся из window если есть
    new THREE.GLTFLoader().load(
      "/train__locomotive_sd40-2.glb",
      (gltf: any) => {
        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const ctr = box.getCenter(new THREE.Vector3());
        const sz = box.getSize(new THREE.Vector3());
        const sc = 7 / Math.max(sz.x, sz.y, sz.z);
        root.scale.setScalar(sc);
        root.position.set(-ctr.x * sc, -ctr.y * sc, -ctr.z * sc);
        const box2 = new THREE.Box3().setFromObject(root);
        root.position.y -= box2.min.y;
        root.traverse((obj: any) => {
          if (!obj.isMesh) return;
          obj.castShadow = true;
          obj.receiveShadow = true;
          if (Array.isArray(obj.material)) {
            obj.material = obj.material.map((m: any) => {
              const nm = makeMat(m);
              origColors.set(nm, nm.color.clone());
              return nm;
            });
          } else {
            const nm = makeMat(obj.material);
            origColors.set(nm, nm.color.clone());
            obj.material = nm;
          }
          const n = obj.name.toLowerCase().replace(/_/g, " ");
          for (const [g, test] of Object.entries(GROUPS)) {
            if (test(n)) {
              meshMap[g].push(obj);
              break;
            }
          }
        });
        scene.add(root);
        computeGroupCenters();
        applyAll();
      },
    );

    (window as any).ping = (g: string) => {
      if (!g) return;
      if (selectedGroup === g) {
        selectedGroup = null;
        (window as any).__activeNode = null;
        setFocus(null);
        applyAll();
        return;
      }
      selectedGroup = g;
      (window as any).__activeNode = g;
      setFocus(g);
      (meshMap[g] || []).forEach((m: any) => {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat: any) => {
          if (!mat.color || (mat.name || "").toLowerCase().includes("glass"))
            return;
          mat.color.set(0xffffff);
        });
      });
      showTip(g);
      clearTimeout((window as any).ping._t);
      (window as any).ping._t = setTimeout(() => {
        applyAll();
      }, 400);
    };

    (window as any).__updateTelemetry = (next: any) => {
      if (!next) return;
      S.temp.val = next.engine_temp ?? S.temp.val;
      S.oil.val = next.oil_pressure ?? S.oil.val;
      S.speed.val = next.speed ?? S.speed.val;
      S.fuel.val = next.fuel_level ?? S.fuel.val;
      S.volt.val = next.voltage ?? S.volt.val;
      S.rpm.val = next.rpm ?? S.rpm.val;
      S.traction.val = next.traction ?? S.traction.val;
      S.curr.val = next.current ?? S.curr.val;
      S.cons.val = next.fuel_rate ?? S.cons.val;
      applyAll();
    };

    (window as any).__updateLimits = (L: any) => {
      if (!L) return;
      // temp
      if (L.engine_temp_warning_max != null)      { S.temp.ok[1]   = L.engine_temp_warning_max;    S.temp.warn[0] = L.engine_temp_warning_max; }
      if (L.engine_temp_critical_max != null)     { S.temp.warn[1] = L.engine_temp_critical_max; }
      // oil (low-side threshold)
      if (L.oil_pressure_warning_min != null)     { S.oil.ok[0]    = L.oil_pressure_warning_min;   S.oil.warn[1]  = L.oil_pressure_warning_min; }
      if (L.oil_pressure_warning_max != null)     { S.oil.ok[1]    = L.oil_pressure_warning_max; }
      if (L.oil_pressure_critical_min != null)    { S.oil.warn[0]  = L.oil_pressure_critical_min; }
      // speed
      if (L.speed_warning_max != null)            { S.speed.ok[1]  = L.speed_warning_max;          S.speed.warn[0] = L.speed_warning_max; }
      if (L.speed_critical_max != null)           { S.speed.warn[1]= L.speed_critical_max; }
      // fuel (low-side)
      if (L.fuel_level_warning_min != null)       { S.fuel.ok[0]   = L.fuel_level_warning_min;     S.fuel.warn[1] = L.fuel_level_warning_min; }
      if (L.fuel_level_critical_min != null)      { S.fuel.warn[0] = L.fuel_level_critical_min; }
      // voltage
      if (L.traction_voltage_warning_min != null) { S.volt.ok[0]   = L.traction_voltage_warning_min; S.volt.warn[1] = L.traction_voltage_warning_min; }
      if (L.traction_voltage_warning_max != null) { S.volt.ok[1]   = L.traction_voltage_warning_max; }
      if (L.traction_voltage_critical_min != null){ S.volt.warn[0] = L.traction_voltage_critical_min; }
      // rpm
      if (L.engine_rpm_warning_max != null)       { S.rpm.ok[1]    = L.engine_rpm_warning_max;     S.rpm.warn[0]  = L.engine_rpm_warning_max; }
      if (L.engine_rpm_critical_max != null)      { S.rpm.warn[1]  = L.engine_rpm_critical_max; }
      // traction force
      if (L.traction_force_warning_max != null)   { S.traction.ok[1]   = L.traction_force_warning_max;  S.traction.warn[0] = L.traction_force_warning_max; }
      if (L.traction_force_critical_max != null)  { S.traction.warn[1] = L.traction_force_critical_max; }
      // current
      if (L.traction_current_warning_max != null) { S.curr.ok[1]   = L.traction_current_warning_max;  S.curr.warn[0] = L.traction_current_warning_max; }
      if (L.traction_current_critical_max != null){ S.curr.warn[1] = L.traction_current_critical_max; }
      // fuel consumption
      if (L.fuel_consumption_warning_max != null) { S.cons.ok[1]   = L.fuel_consumption_warning_max;  S.cons.warn[0] = L.fuel_consumption_warning_max; }
      if (L.fuel_consumption_critical_max != null){ S.cons.warn[1] = L.fuel_consumption_critical_max; }
      applyAll();
    };

    // Raycast
    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    canvas.addEventListener("mousemove", (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(scene.children, true);
      let found: string | null = null;
      for (const h of hits) {
        const n = h.object.name.toLowerCase().replace(/_/g, " ");
        for (const [g, test] of Object.entries(GROUPS)) {
          if (test(n)) {
            found = g;
            break;
          }
        }
        if (found) break;
      }
      if (found !== curHover) {
        curHover = found;
        if (found) {
          showTip(found);
          canvas.style.cursor = "crosshair";
        } else {
          hideTip();
          canvas.style.cursor = "default";
        }
      }
    });
    canvas.addEventListener("click", () => {
      if (curHover) (window as any).ping(curHover);
    });
    canvas.addEventListener("mouseleave", () => {
      if (!selectedGroup) hideTip();
      canvas.style.cursor = "default";
    });

    // Animate
    let animId: number;
    const speedRef = { current: 0 };
    (window as any).__speedRef = speedRef;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      const mv = (speedRef.current / 100) * 0.2;
      poles.forEach((p: any) => {
        p.position.z -= mv;
        if (p.position.z > 25) p.position.z -= SPACING * N_POLES;
        if (p.position.z < -25) p.position.z += SPACING * N_POLES;
      });
      rails.forEach((r: any) => {
        r.position.z -= mv;
        if (r.position.z > 25) r.position.z -= SPACING * N_POLES;
        if (r.position.z < -25) r.position.z += SPACING * N_POLES;
      });

      // Pulse status colors on the model
      const t = performance.now() / 1000;
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 0.9));
      for (const [g, meshes] of Object.entries(meshMap)) {
        const s = selectedGroup === g ? "select" : grpWorstSt(g);
        if (s === "ok") continue;
        const base = COL3[s as keyof typeof COL3];
        const pulsed = base.clone().multiplyScalar(pulse);
        meshes.forEach((m: any) => {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mat: any) => {
            if (!mat.color || (mat.name || "").toLowerCase().includes("glass")) return;
            mat.color.copy(pulsed);
          });
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      renderer.dispose();
    };
  }, []);

  // обновляем speed через ref без ре-рендера Three.js
  useEffect(() => {
    const ref = (window as any).__speedRef;
    if (ref) ref.current = speed;
  }, [speed]);

  return (
    <div className="cw">
      <TimeScrubber />
      <div className="tooltip" id="tip" />
      <div className="speed-hud">
        <div className="speed-big" style={{ color: speedColor }}>
          {displaySpeed}
        </div>
        <div className="speed-unit">КМ / ЧАС</div>
      </div>
      <canvas ref={canvasRef} id="cv" />
    </div>
  );
}
