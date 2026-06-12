const SPOTLIGHT_PATTERN = "assets/spotlight-pattern.svg";
const VEIL_COLOR = "rgb(247, 244, 239)";

const TRAIL_MAX = 18;
const TRAIL_LIFE_MS = 680;
const TRAIL_SAMPLE_MS = 24;
const TRAIL_MIN_DIST = 3;

function initSpotlight(forceRebind) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  if (forceRebind) {
    document.querySelectorAll("[data-spotlight]").forEach(zone => {
      delete zone.dataset.spotlightBound;
      delete zone._spotlightState;
      delete zone._spotlightCtx;
      zone._spotlightRO?.disconnect();
      delete zone._spotlightRO;
      zone.querySelectorAll(".spotlight-bg, .spotlight-veil-canvas, .spotlight-ghost, .spotlight-glow, .spotlight-trail").forEach(el => el.remove());
    });
  }

  document.querySelectorAll("[data-spotlight]").forEach(ensureSpotlightLayers);
  bindSpotlightZones();
}

function ensureSpotlightLayers(zone) {
  if (zone.querySelector(".spotlight-bg")) return;

  const pattern = zone.dataset.spotlightPattern || SPOTLIGHT_PATTERN;

  const bg = document.createElement("div");
  bg.className = "spotlight-bg";
  bg.style.backgroundImage = `url("${pattern}")`;

  const canvas = document.createElement("canvas");
  canvas.className = "spotlight-veil-canvas";
  canvas.setAttribute("aria-hidden", "true");

  zone.classList.add("spotlight-zone");
  zone.insertBefore(bg, zone.firstChild);
  zone.insertBefore(canvas, zone.firstChild.nextSibling);

  const ctx = canvas.getContext("2d");
  zone._spotlightCtx = ctx;
  resizeSpotlightCanvas(zone);
  paintVeil(zone, zone._spotlightState || { fade: 0, trail: [] });
}

function resizeSpotlightCanvas(zone) {
  const canvas = zone.querySelector(".spotlight-veil-canvas");
  const ctx = zone._spotlightCtx;
  if (!canvas || !ctx) return;

  const rect = zone.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));

  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function trailAlpha(age) {
  const life = age / TRAIL_LIFE_MS;
  if (life >= 1) return 0;
  const t = 1 - life;
  return t * t * (3 - 2 * t);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randomInkShape() {
  const count = 3 + Math.floor(Math.random() * 4);
  const parts = [];

  for (let i = 0; i < count; i++) {
    const theta = rand(0, Math.PI * 2);
    const dist = i === 0 ? rand(0, 6) : rand(4, 20);
    parts.push({
      ox: Math.cos(theta) * dist,
      oy: Math.sin(theta) * dist,
      rx: i === 0 ? rand(36, 54) : rand(12, 34),
      ry: i === 0 ? rand(22, 40) : rand(10, 38),
      angleOff: rand(-1.3, 1.3),
      strengthMul: i === 0 ? rand(0.82, 1) : rand(0.18, 0.55),
      soft: i > 0 || Math.random() > 0.35
    });
  }

  return parts;
}

function lerpShapePart(a, b, t) {
  return {
    ox: a.ox + (b.ox - a.ox) * t,
    oy: a.oy + (b.oy - a.oy) * t,
    rx: a.rx + (b.rx - a.rx) * t,
    ry: a.ry + (b.ry - a.ry) * t,
    angleOff: a.angleOff + (b.angleOff - a.angleOff) * t,
    strengthMul: a.strengthMul + (b.strengthMul - a.strengthMul) * t,
    soft: t < 0.5 ? a.soft : b.soft
  };
}

function blendShapes(prev, next, t) {
  const len = Math.max(prev?.length || 0, next.length);
  const out = [];
  for (let i = 0; i < len; i++) {
    const a = prev?.[i] || next[i] || next[0];
    const b = next[i] || next[0];
    out.push(lerpShapePart(a, b, t));
  }
  return out;
}

function shapeToBlobs(shape, x, y, angleDeg, strength, scale = 1) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return shape.map(part => ({
    x: x + part.ox * scale,
    y: y + part.oy * scale,
    rx: part.rx * scale,
    ry: part.ry * scale,
    angle: rad + part.angleOff,
    strength: strength * part.strengthMul,
    soft: part.soft
  }));
}

function refreshHeadShape(state) {
  state.prevHeadShape = state.headShape || randomInkShape();
  state.headShape = randomInkShape();
  state.shapeBlend = 0;
}

function pushTrailPoint(state) {
  const now = performance.now();
  if (state.lastTrailSample && now - state.lastTrailSample < TRAIL_SAMPLE_MS) return;

  const last = state.trail[state.trail.length - 1];
  if (last && Math.hypot(state.x - last.x, state.y - last.y) < TRAIL_MIN_DIST) return;

  state.lastTrailSample = now;
  refreshHeadShape(state);
  state.trail.push({
    x: state.x,
    y: state.y,
    angle: state.angle,
    t: now,
    shape: state.headShape.map(p => ({ ...p }))
  });

  while (state.trail.length > TRAIL_MAX) state.trail.shift();
}

function pruneTrail(state) {
  const now = performance.now();
  state.trail = state.trail.filter(p => now - p.t < TRAIL_LIFE_MS);
}

function hasVisibleTrail(state) {
  const now = performance.now();
  return state.trail.some(p => trailAlpha(now - p.t) > 0.02);
}

function paintVeil(zone, state) {
  const ctx = zone._spotlightCtx;
  const canvas = zone.querySelector(".spotlight-veil-canvas");
  if (!ctx || !canvas) return;

  const rect = zone.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = VEIL_COLOR;
  ctx.fillRect(0, 0, w, h);

  const blobs = inkBlobs(state);
  if (!blobs.length) return;

  ctx.globalCompositeOperation = "destination-out";
  blobs.forEach(blob => drawInkBlob(ctx, blob));
  ctx.globalCompositeOperation = "source-over";
}

function inkBlobs(state) {
  const now = performance.now();
  const fade = state.fade;
  const blobs = [];

  state.trail.forEach(point => {
    const age = now - point.t;
    const alpha = trailAlpha(age);
    if (alpha <= 0.02 || !point.shape) return;

    const scale = 0.5 + alpha * 0.45;
    shapeToBlobs(point.shape, point.x, point.y, point.angle, alpha, scale).forEach(b => blobs.push(b));
  });

  if (fade <= 0.01 && !blobs.length) return blobs;

  if (state.headShape) {
    const blended = blendShapes(state.prevHeadShape, state.headShape, state.shapeBlend || 1);
    shapeToBlobs(blended, state.x, state.y, state.angle, fade).forEach(b => blobs.push(b));
  }

  return blobs;
}

function drawInkBlob(ctx, { x, y, rx, ry, angle, strength, soft }) {
  if (strength <= 0.01) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1, ry / rx);

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  if (soft) {
    grad.addColorStop(0, `rgba(0,0,0,${strength * 0.85})`);
    grad.addColorStop(0.22, `rgba(0,0,0,${strength * 0.72})`);
    grad.addColorStop(0.48, `rgba(0,0,0,${strength * 0.38})`);
    grad.addColorStop(0.68, `rgba(0,0,0,${strength * 0.12})`);
    grad.addColorStop(0.86, `rgba(0,0,0,${strength * 0.03})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
  } else {
    grad.addColorStop(0, `rgba(0,0,0,${strength})`);
    grad.addColorStop(0.28, `rgba(0,0,0,${strength * 0.92})`);
    grad.addColorStop(0.52, `rgba(0,0,0,${strength * 0.55})`);
    grad.addColorStop(0.72, `rgba(0,0,0,${strength * 0.18})`);
    grad.addColorStop(0.88, `rgba(0,0,0,${strength * 0.04})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function bindSpotlightZones() {
  document.querySelectorAll("[data-spotlight]").forEach(zone => {
    if (zone.dataset.spotlightBound) return;
    zone.dataset.spotlightBound = "1";

    const state = {
      tx: -200, ty: -200,
      x: -200, y: -200,
      vx: 0, vy: 0,
      angle: 0,
      active: false,
      animating: false,
      fade: 0,
      trail: [],
      lastTrailSample: 0,
      headShape: null,
      prevHeadShape: null,
      shapeBlend: 1
    };
    zone._spotlightState = state;

    const ro = new ResizeObserver(() => {
      resizeSpotlightCanvas(zone);
      paintVeil(zone, state);
    });
    ro.observe(zone);
    zone._spotlightRO = ro;

    const setTarget = (clientX, clientY) => {
      const rect = zone.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      state.tx = clientX - rect.left;
      state.ty = clientY - rect.top;
      state.active = true;
      if (!state.headShape) refreshHeadShape(state);
      zone.classList.add("spotlight-active");
      startLoop(zone, state);
    };

    const startLoop = (z, s) => {
      if (s.animating) return;
      s.animating = true;

      const tick = () => {
        const dx = s.tx - s.x;
        const dy = s.ty - s.y;
        const dist = Math.hypot(dx, dy);
        const ease = Math.min(0.38, 0.18 + dist * 0.01);

        s.x += dx * ease;
        s.y += dy * ease;
        s.vx += (dx - s.vx) * 0.22;
        s.vy += (dy - s.vy) * 0.22;

        const targetAngle = Math.atan2(s.vy, s.vx) * (180 / Math.PI);
        s.angle += (targetAngle - s.angle) * 0.12;

        if (s.shapeBlend < 1) {
          s.shapeBlend = Math.min(1, s.shapeBlend + 0.18);
        }

        if (s.active) {
          s.fade = Math.min(1, s.fade + 0.08);
          pushTrailPoint(s);
        } else {
          s.fade = Math.max(0, s.fade - 0.02);
          if (s.fade <= 0 && !hasVisibleTrail(s)) {
            z.classList.remove("spotlight-active");
          }
        }

        pruneTrail(s);
        paintVeil(z, s);

        const moving = dist > 0.15 || Math.hypot(s.vx, s.vy) > 0.4;
        const lingering = s.fade > 0.01 || hasVisibleTrail(s);

        if (s.active || moving || lingering) {
          requestAnimationFrame(tick);
        } else {
          s.animating = false;
        }
      };

      requestAnimationFrame(tick);
    };

    zone.addEventListener("mousemove", e => setTarget(e.clientX, e.clientY), { passive: true });
    zone.addEventListener("mouseenter", e => setTarget(e.clientX, e.clientY), { passive: true });
    zone.addEventListener("touchmove", e => {
      if (e.touches[0]) setTarget(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    zone.addEventListener("touchstart", e => {
      if (e.touches[0]) setTarget(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    zone.addEventListener("mouseleave", () => { state.active = false; });
    zone.addEventListener("touchend", () => { state.active = false; });
  });
}

function refreshSpotlight() {
  initSpotlight(true);
}
