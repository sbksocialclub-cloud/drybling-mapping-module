/**
 * DRYBLING Mapping Module — Motor audiovisual cinematográfico
 * Módulo independiente reutilizable para integración en la web oficial DRYBLING.
 *
 * Tecnologías: Canvas 2D API + Web Audio API (sin dependencias externas)
 * Compatibilidad: Chrome, Firefox, Safari, Edge — escritorio, tablet y móvil
 */

import { AudioManager } from './audioManager.js';

// ─── Referencias DOM ──────────────────────────────────────────────────────────
const canvas  = document.querySelector('#scene');
const ctx     = canvas.getContext('2d', { alpha: false });
const intro   = document.querySelector('#intro');
const enter   = document.querySelector('#enter');
const status  = document.querySelector('#status');
const errorEl = document.querySelector('#error');
const replay  = document.querySelector('#replay');
const audio   = new AudioManager();

// ─── Estado global ────────────────────────────────────────────────────────────
let w = 0, h = 0, dpr = 1;
let playing = false, startTime = 0, raf = 0;
let particles = [];
let cracks = [];

// ─── Utilidades matemáticas ───────────────────────────────────────────────────
const clamp      = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeInOut  = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut    = t => 1 - Math.pow(1 - t, 3);

// ─── Redimensionado responsivo ────────────────────────────────────────────────
function resize() {
  // Limitar DPR a 1.6 para rendimiento en móvil
  dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  w   = Math.max(1, window.innerWidth);
  h   = Math.max(1, window.innerHeight);
  canvas.width  = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width  = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ─── Inicialización de partículas ─────────────────────────────────────────────
function initParticles() {
  // Ajustar densidad según área de pantalla para rendimiento móvil
  const count = Math.min(1100, Math.floor(w * h / 900));
  particles = Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 1.8,
    y: (Math.random() - 0.5) * 1.2,
    z: Math.random(),
    s: 0.4 + Math.random() * 1.7,
    p: Math.random() * Math.PI * 2,
  }));
}

// ─── Inicialización de grietas ────────────────────────────────────────────────
function initCracks() {
  const dirs = [-2.55, -1.9, -1.1, -0.35, 0.35, 1.05, 1.75, 2.5];
  cracks = dirs.map((a, i) => {
    const pts = [{ x: 0, y: 0 }];
    let x = 0, y = 0;
    for (let n = 0; n < 6; n++) {
      const len = 0.06 + n * 0.014;
      x += Math.cos(a + (Math.random() - 0.5) * 0.45) * len;
      y += Math.sin(a + (Math.random() - 0.5) * 0.45) * len;
      pts.push({ x, y });
    }
    return { pts, phase: i / dirs.length };
  });
}

// ─── Reseteo de la experiencia ────────────────────────────────────────────────
function reset() {
  playing = false;
  startTime = 0;
  replay.hidden = true;
  intro.classList.remove('is-hidden');
  enter.disabled = false;
  status.textContent = 'Toca la pantalla para comenzar la experiencia';
  errorEl.textContent = '';
  initParticles();
  initCracks();
  draw(performance.now());
}

// ─── Bucle de renderizado principal ───────────────────────────────────────────
function draw(now) {
  const elapsed = playing ? (now - startTime) / 1000 : 0;
  const bands   = audio.getBands();

  // Fondo negro base
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;

  // Parámetros de animación temporales
  const emblemIn  = easeOut(clamp((elapsed - 0.25) / 1.1));
  const sweep     = clamp((elapsed - 1.15) / 1.7);
  const crackP    = easeOut(clamp((elapsed - 2.55) / 1.0));
  const opening   = easeInOut(clamp((elapsed - 3.5) / 1.55));
  const camera    = easeInOut(clamp((elapsed - 4.25) / 3.1));
  const reveal    = easeOut(clamp((elapsed - 4.75) / 2.3));
  const pulse     = 1 + bands.bass * 0.055;
  const perspective = 1 + camera * 2.35;

  // ── Mundo interior (detrás de la pared) ──────────────────────────────────
  if (reveal > 0) {
    const grd = ctx.createRadialGradient(cx, cy * 0.78, 0, cx, cy * 0.78, Math.max(w, h) * 0.72);
    grd.addColorStop(0,    `rgba(16,104,70,${0.42 * reveal})`);
    grd.addColorStop(0.42, `rgba(3,33,24,${0.75 * reveal})`);
    grd.addColorStop(1,    'rgba(0,0,0,1)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Partículas en perspectiva
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(perspective, perspective);
    for (const p of particles) {
      const z     = (p.z + elapsed * 0.035) % 1;
      const depth = 0.2 + z * 1.35;
      const px    = p.x * w * 0.42 / depth;
      const py    = p.y * h * 0.36 / depth;
      const alpha = clamp((1 - z) * 1.2) * reveal * (0.35 + bands.high);
      ctx.fillStyle = `rgba(181,255,222,${alpha})`;
      ctx.fillRect(px, py, p.s / depth, p.s / depth);
    }
    ctx.restore();

    // Líneas de campo en perspectiva
    ctx.save();
    ctx.globalAlpha = 0.28 * reveal;
    ctx.strokeStyle = '#24d783';
    ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 24, cy + 18);
      ctx.lineTo(cx + i * 130 * perspective, h);
      ctx.stroke();
    }
    for (let j = 0; j < 12; j++) {
      const yy = cy + 45 + Math.pow(j / 11, 2) * (h - cy);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();
    }
    ctx.restore();

    // Objeto de energía central
    const r = (44 + bands.mid * 26) * perspective;
    ctx.save();
    ctx.translate(cx, cy - 20 * perspective);
    ctx.rotate(elapsed * 0.35);
    ctx.strokeStyle = `rgba(60,255,160,${0.72 * reveal})`;
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Paneles de la pared ───────────────────────────────────────────────────
  const gap    = opening * Math.min(w * 0.34, 360);
  const jitter = bands.bass * 3.2 * (crackP > 0 && opening < 0.35 ? Math.sin(now * 0.05) : 0);

  const wallGrad = ctx.createLinearGradient(0, 0, w, h);
  wallGrad.addColorStop(0,   '#14191f');
  wallGrad.addColorStop(0.5, '#090c0f');
  wallGrad.addColorStop(1,   '#151b21');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(-gap + jitter, 0, cx, h);
  ctx.fillRect(cx + gap - jitter, 0, cx, h);

  // Juntas del panel
  ctx.strokeStyle = 'rgba(255,255,255,.035)';
  ctx.lineWidth = 1;
  const seamStep = Math.max(70, w / 9);
  for (let x = 0; x < w; x += seamStep) {
    ctx.beginPath();
    ctx.moveTo(x - gap * (x < cx ? 1 : -1), 0);
    ctx.lineTo(x - gap * (x < cx ? 1 : -1), h);
    ctx.stroke();
  }

  // ── Barrido de luz de proyección ──────────────────────────────────────────
  if (sweep > 0 && sweep < 1) {
    const sx = -w * 0.25 + sweep * w * 1.5;
    const g  = ctx.createLinearGradient(sx - 140, 0, sx + 140, 0);
    g.addColorStop(0,   'rgba(40,180,255,0)');
    g.addColorStop(0.5, `rgba(110,220,255,${0.28 + 0.26 * bands.mid})`);
    g.addColorStop(1,   'rgba(40,180,255,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ── Grietas luminosas ─────────────────────────────────────────────────────
  if (crackP > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = `rgba(208,248,255,${crackP * (1 - opening)})`;
    ctx.shadowColor  = '#7be7ff';
    ctx.shadowBlur   = 8 + bands.high * 16;
    ctx.lineWidth    = 1.2 + bands.bass * 1.7;
    for (const c of cracks) {
      const local = clamp((crackP - c.phase * 0.22) / 0.78);
      if (local <= 0) continue;
      ctx.beginPath();
      const max = Math.max(1, Math.floor(c.pts.length * local));
      for (let i = 0; i < max; i++) {
        const p = c.pts[i];
        const x = p.x * Math.min(w, h) * 1.8;
        const y = p.y * Math.min(w, h) * 1.8;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Emblema central ───────────────────────────────────────────────────────
  if (emblemIn > 0 && opening < 0.8) {
    const alpha = emblemIn * (1 - opening);
    const r     = Math.min(w, h) * 0.12 * pulse * emblemIn;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(emblemIn, emblemIn);
    ctx.globalAlpha  = alpha;
    ctx.strokeStyle  = '#fff';
    ctx.lineWidth    = Math.max(2, r * 0.055);
    ctx.shadowColor  = '#d9fbff';
    ctx.shadowBlur   = 18 + bands.high * 22;
    // Círculo exterior
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    // Triángulo interior giratorio
    ctx.rotate(elapsed * 0.18);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 3;
      const x = Math.cos(a) * r * 0.55;
      const y = Math.sin(a) * r * 0.55;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // ── Viñeta cinematográfica ────────────────────────────────────────────────
  const vig = ctx.createRadialGradient(
    cx, cy, Math.min(w, h) * 0.18,
    cx, cy, Math.max(w, h) * 0.72
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,.78)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Mostrar botón de repetición al finalizar la secuencia
  if (playing && elapsed > 9.2) {
    replay.hidden = false;
  }

  if (playing) {
    raf = requestAnimationFrame(draw);
  }
}

// ─── Inicio de la experiencia ─────────────────────────────────────────────────
async function begin() {
  if (playing) return;
  enter.disabled = true;
  status.textContent = 'Activando sonido…';
  errorEl.textContent = '';

  try {
    await audio.start(18);
    playing   = true;
    startTime = performance.now();
    intro.classList.add('is-hidden');
    raf = requestAnimationFrame(draw);
  } catch (err) {
    enter.disabled = false;
    status.textContent = 'Toca para reintentar';
    errorEl.textContent = err?.message || 'No se pudo iniciar el audio';
  }
}

// ─── Eventos ──────────────────────────────────────────────────────────────────
enter.addEventListener('click', begin);

replay.addEventListener('click', () => {
  cancelAnimationFrame(raf);
  audio.stop();
  reset();
});

window.addEventListener('resize', () => {
  resize();
  initParticles();
  if (!playing) draw(performance.now());
});

window.addEventListener('beforeunload', () => audio.dispose());

// ─── Inicialización ───────────────────────────────────────────────────────────
resize();
initParticles();
initCracks();
status.textContent = 'Toca la pantalla para comenzar la experiencia';
enter.disabled = false;
draw(performance.now());
