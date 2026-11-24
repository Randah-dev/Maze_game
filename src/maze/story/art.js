// رسومات القصة: كل لوحة أو صورة أو رسمة هنا مرسومة بالكود خصيصًا للعبة، ولها مكانها في القصة.
// نفس الرسمة تُستخدم في المشهد ثلاثي الأبعاد وفي بطاقات الذكريات.
//
// تبغى تستبدل رسمة بصورة حقيقية؟ ضع الملف في src/assets/story/ ثم أضفه هنا، مثلًا:
//   import familyPhoto from '../../assets/story/family.jpg';
//   export const ART_OVERRIDES = { 'item-family': familyPhoto };
import * as THREE from 'three';
import { createRng } from '../rng.js';

export const ART_OVERRIDES = {};

// نفس خطوط الواجهة: العربية IBM Plex Sans Arabic، الإنجليزية Inter، الشعارات Cinzel، الأرقام Roboto Mono
const HAND_FONT = '"IBM Plex Sans Arabic", "Inter", sans-serif';
const SIGN_FONT = '"Inter", "IBM Plex Sans Arabic", sans-serif';
const SERIF = '"Cinzel", Georgia, serif';
const MONO = '"Roboto Mono", monospace';

// ───────────── أدوات مساعدة ─────────────
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })];
}

function grain(ctx, w, h, amount, rng, mono = true) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += mono ? n : (rng() - 0.5) * amount;
    d[i + 2] += mono ? n : (rng() - 0.5) * amount;
  }
  ctx.putImageData(img, 0, 0);
}

// ضربات فرشاة ناعمة (طابع اللوحات الزيتية)
function strokes(ctx, rng, n, colors, area, size = [4, 14], alpha = [0.25, 0.6]) {
  for (let i = 0; i < n; i++) {
    const [x, y] = area();
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.globalAlpha = alpha[0] + rng() * (alpha[1] - alpha[0]);
    ctx.beginPath();
    const s = size[0] + rng() * (size[1] - size[0]);
    ctx.ellipse(x, y, s, s * (0.3 + rng() * 0.3), rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// خط "شمعي" مرتعش كأنه مرسوم بيد طفل
function crayon(ctx, rng, pts, color, width = 6, passes = 3) {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let p = 0; p < passes; p++) {
    ctx.globalAlpha = 0.55 + rng() * 0.3;
    ctx.lineWidth = width * (0.7 + rng() * 0.5);
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = x + (rng() - 0.5) * width * 0.9;
      const jy = y + (rng() - 0.5) * width * 0.9;
      if (i === 0) ctx.moveTo(jx, jy);
      else ctx.lineTo(jx, jy);
    });
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function crayonCircle(ctx, rng, cx, cy, r, color, width = 6, fill = null) {
  if (fill) {
    crayonFill(ctx, rng, cx - r, cy - r, r * 2, r * 2, fill, () => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    });
  }
  const pts = [];
  for (let a = 0; a <= Math.PI * 2.08; a += 0.25) pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  crayon(ctx, rng, pts, color, width, 2);
}

// تلوين بالشمع داخل شكل (خطوط متوازية مائلة)
function crayonFill(ctx, rng, x, y, w, h, color, clipPath) {
  ctx.save();
  clipPath();
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.55;
  for (let i = -h; i < w + h; i += 6) {
    ctx.beginPath();
    ctx.moveTo(x + i + (rng() - 0.5) * 3, y - 4);
    ctx.lineTo(x + i - h + (rng() - 0.5) * 3, y + h + 4);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function star(ctx, cx, cy, r, inner = 0.45, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = rot + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function crayonStar(ctx, rng, cx, cy, r, color, fill) {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  if (fill) crayonFill(ctx, rng, cx - r, cy - r, r * 2, r * 2, fill, () => star(ctx, cx, cy, r));
  crayon(ctx, rng, pts, color, 6, 3);
}

function handText(ctx, text, x, y, size, color, rot = 0, family = HAND_FONT) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ورقة رسم أطفال بشريط لاصق
function paper(ctx, w, h, rng) {
  ctx.fillStyle = '#f3ecdc';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(150,120,80,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) {
    ctx.strokeStyle = `rgba(120,100,70,${0.04 + rng() * 0.05})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const x = rng() * w;
    const y = rng() * h;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * 40, y + (rng() - 0.5) * 6);
    ctx.stroke();
  }
}

function tape(ctx, x, y, w, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = 'rgba(235,228,200,0.75)';
  ctx.fillRect(-w / 2, -16, w, 32);
  ctx.strokeStyle = 'rgba(150,140,110,0.4)';
  ctx.strokeRect(-w / 2, -16, w, 32);
  ctx.restore();
}

// لمسة "صورة قديمة": بهتان لوني، تدرج بني، خدوش، وإطار أبيض
function oldPhotoFinish(ctx, w, h, rng, { sepia = 0.55, fade = 0.18, border = 34, scratches = 18 } = {}) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const sr = r * 0.393 + g * 0.769 + b * 0.189;
    const sg = r * 0.349 + g * 0.686 + b * 0.168;
    const sb = r * 0.272 + g * 0.534 + b * 0.131;
    d[i] = (r * (1 - sepia) + sr * sepia) * (1 - fade) + 235 * fade;
    d[i + 1] = (g * (1 - sepia) + sg * sepia) * (1 - fade) + 225 * fade;
    d[i + 2] = (b * (1 - sepia) + sb * sepia) * (1 - fade) + 200 * fade;
  }
  ctx.putImageData(img, 0, 0);
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(40,25,10,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < scratches; i++) {
    ctx.strokeStyle = `rgba(255,250,235,${0.08 + rng() * 0.15})`;
    ctx.lineWidth = 0.6 + rng();
    ctx.beginPath();
    const x = rng() * w;
    ctx.moveTo(x, rng() * h * 0.3);
    ctx.lineTo(x + (rng() - 0.5) * 30, h * (0.6 + rng() * 0.4));
    ctx.stroke();
  }
  grain(ctx, w, h, 26, rng);
  if (border) {
    ctx.strokeStyle = '#efe7d6';
    ctx.lineWidth = border * 2;
    ctx.strokeRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,100,70,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(border, border, w - border * 2, h - border * 2);
  }
}

// شخص بسيط بأسلوب الصور القديمة (بدون ملامح واضحة)
function person(ctx, x, feetY, h, { body = '#2a2420', skin = '#cdb39a', dress = false, hair = '#2a1d15', ribbon = null, long = false } = {}) {
  const head = h * 0.13;
  const shoulderY = feetY - h * 0.78;
  ctx.fillStyle = body;
  ctx.beginPath();
  if (dress) {
    ctx.moveTo(x - h * 0.11, shoulderY);
    ctx.lineTo(x + h * 0.11, shoulderY);
    ctx.lineTo(x + h * 0.24, feetY - h * 0.22);
    ctx.lineTo(x - h * 0.24, feetY - h * 0.22);
  } else {
    ctx.moveTo(x - h * 0.15, shoulderY);
    ctx.lineTo(x + h * 0.15, shoulderY);
    ctx.lineTo(x + h * 0.12, feetY - h * 0.42);
    ctx.lineTo(x - h * 0.12, feetY - h * 0.42);
  }
  ctx.closePath();
  ctx.fill();
  // الأرجل
  ctx.fillStyle = dress ? skin : body;
  const legTop = dress ? feetY - h * 0.22 : feetY - h * 0.44;
  ctx.fillRect(x - h * 0.07, legTop, h * 0.05, feetY - legTop);
  ctx.fillRect(x + h * 0.02, legTop, h * 0.05, feetY - legTop);
  // الرأس
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(x, shoulderY - head * 0.95, head * 0.8, head, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(x, shoulderY - head * 1.25, head * 0.85, head * 0.65, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  if (long) {
    ctx.fillRect(x - head * 0.85, shoulderY - head * 1.3, head * 0.3, head * 1.6);
    ctx.fillRect(x + head * 0.55, shoulderY - head * 1.3, head * 0.3, head * 1.6);
  }
  if (ribbon) {
    ctx.fillStyle = ribbon;
    ctx.beginPath();
    ctx.ellipse(x + head * 0.55, shoulderY - head * 1.75, head * 0.35, head * 0.22, -0.4, 0, Math.PI * 2);
    ctx.ellipse(x + head * 0.95, shoulderY - head * 1.6, head * 0.35, head * 0.22, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// حروق على حواف صورة: نخفي أجزاء ونسوّد ما حولها
function burn(ctx, w, h, rng, spots) {
  ctx.save();
  for (const s of spots) {
    const pts = [];
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const r = s.r * (0.65 + rng() * 0.55);
      pts.push([s.x + Math.cos(a) * r, s.y + Math.sin(a) * r]);
    }
    // حافة محترقة داكنة
    const g = ctx.createRadialGradient(s.x, s.y, s.r * 0.5, s.x, s.y, s.r * 1.5);
    g.addColorStop(0, 'rgba(20,8,2,0.95)');
    g.addColorStop(0.55, 'rgba(70,30,8,0.6)');
    g.addColorStop(1, 'rgba(90,50,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 1.5, 0, Math.PI * 2);
    ctx.fill();
    // الجزء المحروق بالكامل (شفاف)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // جمر خفيف على الحافة
    ctx.strokeStyle = 'rgba(255,120,40,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

// إطار ذهبي للوحات الفندق
function goldFrame(ctx, w, h, frame, rng) {
  const fg = ctx.createLinearGradient(0, 0, w, h);
  fg.addColorStop(0, '#6e5022');
  fg.addColorStop(0.35, '#d8b46a');
  fg.addColorStop(0.65, '#8a6630');
  fg.addColorStop(1, '#e2c27d');
  ctx.save();
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.rect(frame, frame, w - frame * 2, h - frame * 2);
  ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(60,35,10,0.85)';
  ctx.lineWidth = 3;
  ctx.strokeRect(9, 9, w - 18, h - 18);
  ctx.strokeRect(frame - 5, frame - 5, w - (frame - 5) * 2, h - (frame - 5) * 2);
  ctx.strokeStyle = 'rgba(255,235,190,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(frame * 0.45, frame * 0.45, w - frame * 0.9, h - frame * 0.9);
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(255,240,200,${0.06 + rng() * 0.1})`;
    const side = rng();
    const x = side < 0.5 ? rng() * w : (rng() < 0.5 ? rng() * frame : w - rng() * frame);
    const y = side < 0.5 ? (rng() < 0.5 ? rng() * frame : h - rng() * frame) : rng() * h;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

// إطار خشبي رفيع لصور العائلة
function woodFrame(ctx, w, h, frame) {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#2a1710');
  g.addColorStop(0.5, '#4a2b1c');
  g.addColorStop(1, '#22120b');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.rect(frame, frame, w - frame * 2, h - frame * 2);
  ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(255,210,160,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.restore();
}

// ───────────── المشاهد الأساسية (تُستخدم في أكثر من رسمة) ─────────────
function seaScene(ctx, x0, y0, w, h, rng, { kids = false } = {}) {
  const sky = ctx.createLinearGradient(0, y0, 0, y0 + h * 0.55);
  sky.addColorStop(0, '#29365a');
  sky.addColorStop(0.55, '#b0607a');
  sky.addColorStop(1, '#f0a35c');
  ctx.fillStyle = sky;
  ctx.fillRect(x0, y0, w, h * 0.56);
  strokes(ctx, rng, 160, ['#3d4a73', '#7d5a8a', '#c47a7a', '#e5a06a'], () => [x0 + rng() * w, y0 + rng() * h * 0.5], [6, 22], [0.12, 0.35]);
  const sx = x0 + w * 0.62;
  const sy = y0 + h * 0.5;
  const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, w * 0.25);
  glow.addColorStop(0, 'rgba(255,230,170,0.95)');
  glow.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x0, y0, w, h * 0.6);
  ctx.fillStyle = '#fff1c9';
  ctx.beginPath();
  ctx.arc(sx, sy, w * 0.045, 0, Math.PI * 2);
  ctx.fill();
  const sea = ctx.createLinearGradient(0, y0 + h * 0.55, 0, y0 + h * 0.8);
  sea.addColorStop(0, '#3c4f6e');
  sea.addColorStop(1, '#1d2b3c');
  ctx.fillStyle = sea;
  ctx.fillRect(x0, y0 + h * 0.55, w, h * 0.27);
  strokes(ctx, rng, 220, ['#4e6585', '#2d3f58', '#6b7fa0'], () => [x0 + rng() * w, y0 + h * (0.56 + rng() * 0.25)], [8, 22], [0.2, 0.5]);
  strokes(ctx, rng, 90, ['#ffd690', '#ffc27a', '#fff0c0'], () => [sx + (rng() - 0.5) * w * 0.16, y0 + h * (0.57 + rng() * 0.22)], [5, 16], [0.4, 0.8]);
  const sand = ctx.createLinearGradient(0, y0 + h * 0.8, 0, y0 + h);
  sand.addColorStop(0, '#b88d62');
  sand.addColorStop(1, '#6b4b30');
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + h * 0.84);
  ctx.quadraticCurveTo(x0 + w * 0.5, y0 + h * 0.76, x0 + w, y0 + h * 0.83);
  ctx.lineTo(x0 + w, y0 + h);
  ctx.lineTo(x0, y0 + h);
  ctx.fill();
  strokes(ctx, rng, 160, ['#c9a076', '#8f6a45', '#e0bc8c'], () => [x0 + rng() * w, y0 + h * (0.84 + rng() * 0.16)], [5, 14], [0.2, 0.5]);
  strokes(ctx, rng, 40, ['#f4efe6'], () => [x0 + rng() * w, y0 + h * (0.79 + rng() * 0.04)], [8, 20], [0.3, 0.6]);
  if (kids) {
    const fy = y0 + h * 0.9;
    person(ctx, x0 + w * 0.36, fy, h * 0.22, { body: '#1f2a3a', skin: '#3a2a20', hair: '#1a120c' });
    person(ctx, x0 + w * 0.44, fy, h * 0.16, { body: '#efe6d6', skin: '#3a2a20', hair: '#1a120c', dress: true, ribbon: '#c0182a', long: true });
    ctx.strokeStyle = '#3a2a20';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.375, fy - h * 0.13);
    ctx.lineTo(x0 + w * 0.425, fy - h * 0.1);
    ctx.stroke();
  }
}

function familyScene(ctx, x0, y0, w, h, rng) {
  // خلفية: بهو الفندق (جدار أحمر، عمودان، ثريا)
  const wall = ctx.createLinearGradient(0, y0, 0, y0 + h);
  wall.addColorStop(0, '#5b2a22');
  wall.addColorStop(1, '#3a1a14');
  ctx.fillStyle = wall;
  ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = 'rgba(220,180,120,0.2)';
  ctx.fillRect(x0 + w * 0.08, y0, w * 0.07, h * 0.8);
  ctx.fillRect(x0 + w * 0.85, y0, w * 0.07, h * 0.8);
  const lamp = ctx.createRadialGradient(x0 + w * 0.5, y0 + h * 0.08, 4, x0 + w * 0.5, y0 + h * 0.08, w * 0.4);
  lamp.addColorStop(0, 'rgba(255,230,170,0.8)');
  lamp.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = lamp;
  ctx.fillRect(x0, y0, w, h * 0.6);
  ctx.fillStyle = '#2a1510';
  ctx.fillRect(x0, y0 + h * 0.8, w, h * 0.2);
  const fy = y0 + h * 0.97;
  person(ctx, x0 + w * 0.36, fy, h * 0.78, { body: '#1e2430' });
  person(ctx, x0 + w * 0.62, fy, h * 0.72, { body: '#6a4e5a', dress: true, long: true });
  person(ctx, x0 + w * 0.43, fy, h * 0.46, { body: '#34465a' });
  person(ctx, x0 + w * 0.56, fy, h * 0.36, { body: '#f1ebe0', dress: true, ribbon: '#c8182a', long: true });
}

// ───────────── كل رسومات اللعبة ─────────────
const ART = {
  // المرحلة الأولى: لوحات فندقية هادئة
  's1-sea': () => {
    const rng = createRng(101);
    const [c, ctx] = makeCanvas(1024, 768);
    seaScene(ctx, 52, 52, 920, 664, rng);
    grain(ctx, 1024, 768, 12, rng);
    goldFrame(ctx, 1024, 768, 52, rng);
    return { canvas: c, kind: 'painting' };
  },
  's1-hotel': () => {
    const rng = createRng(102);
    const [c, ctx] = makeCanvas(1024, 768);
    const x0 = 52;
    const y0 = 52;
    const w = 920;
    const h = 664;
    const sky = ctx.createLinearGradient(0, y0, 0, y0 + h);
    sky.addColorStop(0, '#0c1428');
    sky.addColorStop(0.7, '#25304d');
    sky.addColorStop(1, '#1a1a22');
    ctx.fillStyle = sky;
    ctx.fillRect(x0, y0, w, h);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,245,220,${0.3 + rng() * 0.6})`;
      ctx.fillRect(x0 + rng() * w, y0 + rng() * h * 0.4, 2, 2);
    }
    strokes(ctx, rng, 80, ['#1e2a48', '#2d3a5e'], () => [x0 + rng() * w, y0 + rng() * h * 0.6], [10, 30], [0.15, 0.3]);
    // مبنى الفندق
    const bx = x0 + w * 0.2;
    const bw = w * 0.6;
    const by = y0 + h * 0.26;
    const bh = h * 0.6;
    ctx.fillStyle = '#3a2a26';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#2a1d1a';
    ctx.fillRect(bx - 10, by - 18, bw + 20, 22);
    const floors = 3;
    const cols = 7;
    for (let f = 0; f < floors; f++) {
      for (let k = 0; k < cols; k++) {
        const wx = bx + 24 + k * ((bw - 48) / cols);
        const wy = by + 30 + f * (bh * 0.26);
        const lit = f === 1 && k === 4; // غرفة واحدة في الطابق الثاني مضاءة
        ctx.fillStyle = lit ? '#ffd27a' : '#151a26';
        ctx.fillRect(wx, wy, 34, 52);
        if (lit) {
          const g = ctx.createRadialGradient(wx + 17, wy + 26, 4, wx + 17, wy + 26, 90);
          g.addColorStop(0, 'rgba(255,210,120,0.55)');
          g.addColorStop(1, 'rgba(255,200,120,0)');
          ctx.fillStyle = g;
          ctx.fillRect(wx - 90, wy - 90, 214, 232);
        }
        ctx.strokeStyle = 'rgba(200,170,130,0.25)';
        ctx.strokeRect(wx, wy, 34, 52);
      }
    }
    // المدخل
    ctx.fillStyle = '#ffcf85';
    ctx.fillRect(bx + bw / 2 - 40, by + bh - 90, 80, 90);
    ctx.fillStyle = '#5a1015';
    ctx.fillRect(bx + bw / 2 - 70, by + bh - 110, 140, 22);
    const door = ctx.createRadialGradient(bx + bw / 2, by + bh, 10, bx + bw / 2, by + bh, 200);
    door.addColorStop(0, 'rgba(255,200,120,0.45)');
    door.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = door;
    ctx.fillRect(x0, by + bh - 200, w, 260);
    ctx.fillStyle = '#0d0f12';
    ctx.fillRect(x0, by + bh, w, h - (by + bh - y0));
    strokes(ctx, rng, 140, ['#0e1a12', '#18261a', '#0a120c'], () => {
      const side = rng() < 0.5 ? x0 + rng() * w * 0.2 : x0 + w * 0.8 + rng() * w * 0.2;
      return [side, y0 + h * (0.45 + rng() * 0.45)];
    }, [10, 26], [0.5, 0.85]);
    grain(ctx, 1024, 768, 12, rng);
    goldFrame(ctx, 1024, 768, 52, rng);
    return { canvas: c, kind: 'painting' };
  },
  's1-field': () => {
    const rng = createRng(103);
    const [c, ctx] = makeCanvas(1024, 768);
    const x0 = 52;
    const y0 = 52;
    const w = 920;
    const h = 664;
    const sky = ctx.createLinearGradient(0, y0, 0, y0 + h * 0.6);
    sky.addColorStop(0, '#7f97a8');
    sky.addColorStop(1, '#efd7a8');
    ctx.fillStyle = sky;
    ctx.fillRect(x0, y0, w, h);
    strokes(ctx, rng, 120, ['#f3e4c4', '#c9d2d4', '#a9b9c2'], () => [x0 + rng() * w, y0 + rng() * h * 0.45], [10, 28], [0.15, 0.35]);
    const field = ctx.createLinearGradient(0, y0 + h * 0.58, 0, y0 + h);
    field.addColorStop(0, '#c39a4a');
    field.addColorStop(1, '#7a5a24');
    ctx.fillStyle = field;
    ctx.fillRect(x0, y0 + h * 0.58, w, h * 0.42);
    strokes(ctx, rng, 420, ['#d8b05c', '#a57c34', '#e8c878', '#8a6a2a'], () => [x0 + rng() * w, y0 + h * (0.6 + rng() * 0.4)], [4, 12], [0.3, 0.7]);
    const tx = x0 + w * 0.6;
    const ty = y0 + h * 0.62;
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(tx - 9, ty - 150, 18, 160);
    strokes(ctx, rng, 360, ['#3e5a2c', '#2c4220', '#52703a', '#24361a'], () => {
      const a = rng() * Math.PI * 2;
      const r = rng() * 130;
      return [tx + Math.cos(a) * r * 1.3, ty - 190 + Math.sin(a) * r * 0.75];
    }, [6, 18], [0.5, 0.85]);
    person(ctx, tx - 34, ty + 10, 52, { body: '#2b2f3a', skin: '#3a2a20' });
    person(ctx, tx - 14, ty + 10, 38, { body: '#efe8dc', skin: '#3a2a20', dress: true, ribbon: '#b5182a', long: true });
    grain(ctx, 1024, 768, 12, rng);
    goldFrame(ctx, 1024, 768, 52, rng);
    return { canvas: c, kind: 'painting' };
  },

  // المرحلة الثانية: صور عائلية قديمة
  's2-parents': () => {
    const rng = createRng(201);
    const [c, ctx] = makeCanvas(768, 960);
    const [p, pc] = makeCanvas(640, 832);
    const wall = pc.createLinearGradient(0, 0, 0, 832);
    wall.addColorStop(0, '#8a7f72');
    wall.addColorStop(1, '#4e463c');
    pc.fillStyle = wall;
    pc.fillRect(0, 0, 640, 832);
    pc.fillStyle = '#2e2620';
    pc.beginPath();
    pc.moveTo(170, 832);
    pc.lineTo(170, 300);
    pc.arc(320, 300, 150, Math.PI, 0);
    pc.lineTo(470, 832);
    pc.fill();
    pc.fillStyle = 'rgba(255,230,180,0.25)';
    pc.fillRect(196, 320, 248, 512);
    pc.fillStyle = '#d8cfc0';
    pc.fillRect(90, 140, 40, 692);
    pc.fillRect(510, 140, 40, 692);
    pc.font = `700 34px ${SERIF}`;
    pc.fillStyle = '#e6dccb';
    pc.textAlign = 'center';
    pc.fillText('GRAND HOTEL', 320, 120);
    person(pc, 250, 800, 560, { body: '#22252c' });
    person(pc, 400, 800, 520, { body: '#7a6a5c', dress: true, long: true });
    oldPhotoFinish(pc, 640, 832, rng, { sepia: 0.75, fade: 0.2, border: 26 });
    ctx.drawImage(p, 64, 64);
    woodFrame(ctx, 768, 960, 64);
    return { canvas: c, kind: 'photo' };
  },
  's2-baby': () => {
    const rng = createRng(202);
    const [c, ctx] = makeCanvas(768, 960);
    const [p, pc] = makeCanvas(640, 832);
    pc.fillStyle = '#6a6056';
    pc.fillRect(0, 0, 640, 832);
    const win = pc.createLinearGradient(380, 0, 640, 0);
    win.addColorStop(0, 'rgba(255,245,220,0)');
    win.addColorStop(1, 'rgba(255,245,220,0.5)');
    pc.fillStyle = win;
    pc.fillRect(380, 0, 260, 832);
    pc.fillStyle = '#4a3f36';
    pc.fillRect(0, 620, 640, 212);
    person(pc, 300, 790, 470, { body: '#3a4658' });
    pc.fillStyle = '#efe8dc';
    pc.beginPath();
    pc.ellipse(300, 470, 95, 60, -0.2, 0, Math.PI * 2);
    pc.fill();
    pc.fillStyle = '#d6bfa6';
    pc.beginPath();
    pc.arc(360, 448, 30, 0, Math.PI * 2);
    pc.fill();
    oldPhotoFinish(pc, 640, 832, rng, { sepia: 0.6, fade: 0.22, border: 26 });
    ctx.drawImage(p, 64, 64);
    woodFrame(ctx, 768, 960, 64);
    return { canvas: c, kind: 'photo' };
  },
  's2-beach': () => {
    const rng = createRng(203);
    const [c, ctx] = makeCanvas(960, 768);
    const [p, pc] = makeCanvas(832, 640);
    seaScene(pc, 0, 0, 832, 640, rng, { kids: true });
    oldPhotoFinish(pc, 832, 640, rng, { sepia: 0.5, fade: 0.25, border: 26 });
    ctx.drawImage(p, 64, 64);
    woodFrame(ctx, 960, 768, 64);
    return { canvas: c, kind: 'photo' };
  },
  'item-family': () => {
    const rng = createRng(204);
    const [c, ctx] = makeCanvas(960, 768);
    const [p, pc] = makeCanvas(832, 640);
    familyScene(pc, 0, 0, 832, 640, rng);
    oldPhotoFinish(pc, 832, 640, rng, { sepia: 0.35, fade: 0.2, border: 26 });
    // الشريطة الحمراء تبقى واضحة رغم بهتان الصورة
    pc.fillStyle = 'rgba(200,24,42,0.65)';
    pc.beginPath();
    pc.ellipse(484, 383, 9, 6, -0.4, 0, Math.PI * 2);
    pc.ellipse(495, 386, 9, 6, 0.5, 0, Math.PI * 2);
    pc.fill();
    ctx.drawImage(p, 64, 64);
    woodFrame(ctx, 960, 768, 64);
    return { canvas: c, kind: 'photo' };
  },

  // المرحلة الثالثة: رسومات ليان
  's3-star-note': () => {
    const rng = createRng(301);
    const [c, ctx] = makeCanvas(900, 700);
    paper(ctx, 900, 700, rng);
    crayonStar(ctx, rng, 450, 270, 150, '#d9a514', '#f2c94c');
    handText(ctx, 'إذا ضعت، اتبع النجمة', 450, 520, 64, '#2b4fa8', -0.03);
    crayon(ctx, rng, [[300, 610], [600, 610], [570, 585], [600, 610], [570, 635]], '#c0392b', 7);
    tape(ctx, 120, 40, 140, -0.3);
    tape(ctx, 780, 40, 140, 0.25);
    return { canvas: c, kind: 'drawing' };
  },
  's3-family': () => {
    const rng = createRng(302);
    const [c, ctx] = makeCanvas(900, 700);
    paper(ctx, 900, 700, rng);
    crayonCircle(ctx, rng, 120, 110, 55, '#e0a10e', 6, '#f4c430');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      crayon(ctx, rng, [[120 + Math.cos(a) * 70, 110 + Math.sin(a) * 70], [120 + Math.cos(a) * 100, 110 + Math.sin(a) * 100]], '#e0a10e', 5, 2);
    }
    crayon(ctx, rng, [[0, 600], [900, 590]], '#3e9b3a', 14, 3);
    const figs = [
      { x: 230, h: 300, c: '#2c3e8f', name: 'بابا' },
      { x: 390, h: 280, c: '#a8326e', name: 'ماما', dress: true },
      { x: 540, h: 210, c: '#2f7d4f', name: 'أخوي' },
      { x: 680, h: 170, c: '#c0392b', name: 'أنا', dress: true, ribbon: true },
    ];
    figs.forEach((f, i) => {
      const top = 590 - f.h;
      crayonCircle(ctx, rng, f.x, top + 32, 32, '#5a3a22', 5, '#f0c9a0');
      if (f.dress) {
        crayon(ctx, rng, [[f.x, top + 64], [f.x - 48, top + f.h * 0.72], [f.x + 48, top + f.h * 0.72], [f.x, top + 64]], f.c, 7);
      } else crayon(ctx, rng, [[f.x, top + 64], [f.x, top + f.h * 0.7]], f.c, 8);
      crayon(ctx, rng, [[f.x - 15, f.h * 0.72 + top], [f.x - 22, 590]], '#333', 6);
      crayon(ctx, rng, [[f.x + 15, f.h * 0.72 + top], [f.x + 22, 590]], '#333', 6);
      if (i < figs.length - 1) {
        const n = figs[i + 1];
        crayon(ctx, rng, [[f.x, top + 100], [n.x, 590 - n.h + 100]], '#333', 5);
      }
      if (f.ribbon) crayon(ctx, rng, [[f.x + 20, top - 2], [f.x + 44, top - 14], [f.x + 40, top + 10], [f.x + 20, top - 2]], '#c0392b', 6);
      handText(ctx, f.name, f.x, 640, 40, '#333', (rng() - 0.5) * 0.1);
    });
    tape(ctx, 450, 30, 160, 0.05);
    return { canvas: c, kind: 'drawing' };
  },
  's3-hideseek': () => {
    const rng = createRng(303);
    const [c, ctx] = makeCanvas(900, 700);
    paper(ctx, 900, 700, rng);
    drawHideSeek(ctx, rng);
    tape(ctx, 110, 40, 140, -0.25);
    tape(ctx, 790, 40, 140, 0.3);
    return { canvas: c, kind: 'drawing' };
  },
  's3-smoke': () => {
    const rng = createRng(304);
    const [c, ctx] = makeCanvas(900, 700);
    paper(ctx, 900, 700, rng);
    crayon(ctx, rng, [[330, 600], [330, 180], [570, 180], [570, 600]], '#6b3a1e', 9);
    crayonFill(ctx, rng, 330, 180, 240, 420, '#a0623a', () => ctx.rect(330, 180, 240, 420));
    crayonStar(ctx, rng, 450, 290, 50, '#d9a514', '#f2c94c');
    for (let i = 0; i < 7; i++) {
      const pts = [];
      const bx = 380 + rng() * 140;
      for (let k = 0; k < 9; k++) pts.push([bx + Math.sin(k * 0.9 + i) * 40 + k * 10, 180 - k * 18]);
      crayon(ctx, rng, pts, '#7a7a7a', 10, 2);
    }
    crayonCircle(ctx, rng, 700, 400, 30, '#5a3a22', 5, '#f0c9a0');
    crayon(ctx, rng, [[700, 432], [660, 560], [740, 560], [700, 432]], '#f5f5f5', 7);
    crayon(ctx, rng, [[700, 432], [660, 560], [740, 560], [700, 432]], '#999', 3, 1);
    crayon(ctx, rng, [[720, 372], [742, 360], [738, 384], [720, 372]], '#c0392b', 6);
    crayon(ctx, rng, [[685, 560], [680, 610]], '#333', 6);
    crayon(ctx, rng, [[715, 560], [720, 610]], '#333', 6);
    crayon(ctx, rng, [[0, 615], [900, 620]], '#8a5a3a', 10, 2);
    tape(ctx, 450, 30, 160, -0.04);
    return { canvas: c, kind: 'drawing' };
  },
  's3-corridor': () => {
    const rng = createRng(305);
    const [c, ctx] = makeCanvas(960, 768);
    const [p, pc] = makeCanvas(832, 640);
    const w = 832;
    const h = 640;
    const vx = w / 2;
    const vy = h * 0.46;
    pc.fillStyle = '#4a2a22';
    pc.fillRect(0, 0, w, h);
    const poly = (pts, col) => {
      pc.fillStyle = col;
      pc.beginPath();
      pts.forEach(([x, y], i) => (i ? pc.lineTo(x, y) : pc.moveTo(x, y)));
      pc.fill();
    };
    poly([[0, 0], [vx - 60, vy - 70], [vx - 60, vy + 60], [0, h]], '#5e2620');
    poly([[w, 0], [vx + 60, vy - 70], [vx + 60, vy + 60], [w, h]], '#5a231d');
    poly([[0, 0], [w, 0], [vx + 60, vy - 70], [vx - 60, vy - 70]], '#2e1612');
    poly([[0, h], [w, h], [vx + 60, vy + 60], [vx - 60, vy + 60]], '#3a1a12');
    poly([[w * 0.25, h], [w * 0.75, h], [vx + 22, vy + 60], [vx - 22, vy + 60]], '#7a1a1c');
    pc.fillStyle = '#1a0d08';
    pc.fillRect(vx - 60, vy - 70, 120, 130);
    for (const t of [0.15, 0.35, 0.55]) {
      const lx = t * (vx - 60);
      const ly = vy - 20 - (1 - t) * 120;
      const g = pc.createRadialGradient(lx, ly, 2, lx, ly, 60 * (1 - t * 0.6));
      g.addColorStop(0, 'rgba(255,220,160,0.8)');
      g.addColorStop(1, 'rgba(255,200,140,0)');
      pc.fillStyle = g;
      pc.fillRect(lx - 80, ly - 80, 160, 160);
      const rx = w - lx;
      const g2 = pc.createRadialGradient(rx, ly, 2, rx, ly, 60 * (1 - t * 0.6));
      g2.addColorStop(0, 'rgba(255,220,160,0.8)');
      g2.addColorStop(1, 'rgba(255,200,140,0)');
      pc.fillStyle = g2;
      pc.fillRect(rx - 80, ly - 80, 160, 160);
    }
    // ظل صغير في آخر الممر
    person(pc, vx + 8, vy + 56, 64, { body: '#d8d0c2', skin: '#bfb2a0', dress: true, long: true });
    oldPhotoFinish(pc, w, h, rng, { sepia: 0.9, fade: 0.15, border: 26, scratches: 30 });
    ctx.drawImage(p, 64, 64);
    woodFrame(ctx, 960, 768, 64);
    return { canvas: c, kind: 'photo' };
  },

  // المرحلة الرابعة: آثار الحريق
  's4-burnt-parents': () => {
    const base = ART['s2-parents']().canvas;
    const rng = createRng(401);
    const [c, ctx] = makeCanvas(base.width, base.height);
    ctx.drawImage(base, 0, 0);
    ctx.fillStyle = 'rgba(40,20,10,0.25)';
    ctx.fillRect(0, 0, base.width, base.height);
    burn(ctx, base.width, base.height, rng, [{ x: 140, y: 820, r: 170 }, { x: 680, y: 120, r: 120 }, { x: 560, y: 900, r: 90 }]);
    return { canvas: c, kind: 'photo', alpha: true };
  },
  's4-burnt-hideseek': () => {
    const rng = createRng(402);
    const [c, ctx] = makeCanvas(900, 700);
    paper(ctx, 900, 700, rng);
    drawHideSeek(ctx, createRng(303));
    ctx.fillStyle = 'rgba(60,30,10,0.18)';
    ctx.fillRect(0, 0, 900, 700);
    burn(ctx, 900, 700, rng, [{ x: 170, y: 380, r: 190 }, { x: 90, y: 80, r: 110 }, { x: 820, y: 660, r: 80 }]);
    return { canvas: c, kind: 'drawing', alpha: true };
  },
  's4-evac': () => {
    const rng = createRng(403);
    const [c, ctx] = makeCanvas(900, 700);
    ctx.fillStyle = '#efe9dc';
    ctx.fillRect(0, 0, 900, 700);
    ctx.fillStyle = '#b8201c';
    ctx.fillRect(0, 0, 900, 96);
    ctx.fillStyle = '#fff';
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 52px ${SIGN_FONT}`;
    ctx.fillText('خطة الإخلاء · الطابق الثاني', 450, 50);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 6;
    ctx.strokeRect(60, 150, 780, 430);
    ctx.lineWidth = 3;
    const rooms = ['214', '213', '212', '211', '210', '209'];
    rooms.forEach((r, i) => {
      const x = 80 + i * 125;
      ctx.strokeRect(x, 170, 110, 130);
      ctx.font = `700 30px ${MONO}`;
      ctx.fillStyle = r === '214' ? '#b8201c' : '#333';
      ctx.fillText(r, x + 55, 235);
      ctx.strokeRect(x, 430, 110, 130);
    });
    // طريق الإخلاء الأحمر نحو الدرج
    ctx.strokeStyle = '#b8201c';
    ctx.lineWidth = 8;
    ctx.setLineDash([24, 14]);
    ctx.beginPath();
    ctx.moveTo(135, 365);
    ctx.lineTo(800, 365);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#b8201c';
    ctx.beginPath();
    ctx.moveTo(830, 365);
    ctx.lineTo(796, 345);
    ctx.lineTo(796, 385);
    ctx.fill();
    ctx.fillStyle = '#2a7a3a';
    ctx.fillRect(760, 600, 80, 50);
    ctx.fillStyle = '#fff';
    ctx.font = `700 26px ${SIGN_FONT}`;
    ctx.fillText('درج', 800, 626);
    ctx.fillStyle = '#1f5fbf';
    ctx.beginPath();
    ctx.arc(460, 365, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `700 28px ${SIGN_FONT}`;
    ctx.fillText('أنت هنا', 460, 408);
    grain(ctx, 900, 700, 12, rng);
    burn(ctx, 900, 700, rng, [{ x: 30, y: 690, r: 90 }]);
    return { canvas: c, kind: 'sign', alpha: true };
  },

  // المرحلة الخامسة: ذكريات واضحة
  's5-family': () => {
    const rng = createRng(501);
    const [c, ctx] = makeCanvas(960, 768);
    const [p, pc] = makeCanvas(832, 640);
    familyScene(pc, 0, 0, 832, 640, rng);
    oldPhotoFinish(pc, 832, 640, rng, { sepia: 0.12, fade: 0.06, border: 26, scratches: 4 });
    ctx.drawImage(p, 64, 64);
    goldFrame(ctx, 960, 768, 64, rng);
    return { canvas: c, kind: 'photo' };
  },
  's5-layan': () => {
    const rng = createRng(502);
    const [c, ctx] = makeCanvas(768, 960);
    const [p, pc] = makeCanvas(640, 832);
    const bg = pc.createLinearGradient(0, 0, 0, 832);
    bg.addColorStop(0, '#d9c7a8');
    bg.addColorStop(1, '#8f7a5c');
    pc.fillStyle = bg;
    pc.fillRect(0, 0, 640, 832);
    person(pc, 320, 800, 620, { body: '#f4efe6', skin: '#d8b391', dress: true, ribbon: '#c8182a', long: true });
    // ملامح بسيطة وابتسامة
    pc.strokeStyle = '#3a2a20';
    pc.lineWidth = 4;
    pc.beginPath();
    pc.arc(302, 228, 7, Math.PI * 1.1, Math.PI * 1.9);
    pc.arc(338, 228, 7, Math.PI * 1.1, Math.PI * 1.9);
    pc.stroke();
    pc.beginPath();
    pc.arc(320, 250, 16, Math.PI * 0.15, Math.PI * 0.85);
    pc.stroke();
    drawBunny(pc, 380, 520, 0.9);
    oldPhotoFinish(pc, 640, 832, rng, { sepia: 0.2, fade: 0.1, border: 26, scratches: 5 });
    ctx.drawImage(p, 64, 64);
    goldFrame(ctx, 768, 960, 64, rng);
    return { canvas: c, kind: 'photo' };
  },
  's5-sea-kids': () => {
    const rng = createRng(101);
    const [c, ctx] = makeCanvas(1024, 768);
    seaScene(ctx, 52, 52, 920, 664, rng, { kids: true });
    grain(ctx, 1024, 768, 12, rng);
    goldFrame(ctx, 1024, 768, 52, rng);
    return { canvas: c, kind: 'painting' };
  },

  // الأغراض الأساسية (تظهر في البطاقات)
  'item-key': () => {
    const rng = createRng(601);
    const [c, ctx] = makeCanvas(640, 640);
    const bg = ctx.createRadialGradient(320, 300, 40, 320, 320, 420);
    bg.addColorStop(0, '#3a2018');
    bg.addColorStop(1, '#120806');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 640, 640);
    const brass = ctx.createLinearGradient(150, 200, 500, 420);
    brass.addColorStop(0, '#8a6427');
    brass.addColorStop(0.4, '#f1d28a');
    brass.addColorStop(1, '#7a5520');
    ctx.save();
    ctx.translate(320, 300);
    ctx.rotate(-0.5);
    ctx.fillStyle = brass;
    ctx.beginPath();
    ctx.arc(-150, 0, 62, 0, Math.PI * 2);
    ctx.arc(-150, 0, 30, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.fillRect(-92, -14, 270, 28);
    ctx.fillRect(130, 14, 22, 46);
    ctx.fillRect(160, 14, 18, 34);
    ctx.restore();
    // بطاقة الرقم
    ctx.strokeStyle = '#b5182a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(215, 370);
    ctx.quadraticCurveTo(200, 420, 230, 450);
    ctx.stroke();
    ctx.fillStyle = '#d9b26a';
    ctx.beginPath();
    ctx.ellipse(250, 500, 80, 56, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a4a1a';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#3a220c';
    ctx.font = `700 54px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('214', 252, 504);
    grain(ctx, 640, 640, 12, rng);
    return { canvas: c, kind: 'icon' };
  },
  'item-bunny': () => {
    const rng = createRng(602);
    const [c, ctx] = makeCanvas(640, 640);
    const bg = ctx.createRadialGradient(320, 300, 40, 320, 320, 420);
    bg.addColorStop(0, '#3a2a24');
    bg.addColorStop(1, '#120806');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 640, 640);
    drawBunny(ctx, 320, 360, 1.6);
    grain(ctx, 640, 640, 14, rng);
    return { canvas: c, kind: 'icon' };
  },
  'item-bracelet': () => {
    const rng = createRng(603);
    const [c, ctx] = makeCanvas(640, 640);
    const bg = ctx.createRadialGradient(320, 300, 40, 320, 320, 420);
    bg.addColorStop(0, '#3a1812');
    bg.addColorStop(1, '#120604');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 640, 640);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const x = 320 + Math.cos(a) * 160;
      const y = 320 + Math.sin(a) * 120;
      const g = ctx.createRadialGradient(x - 6, y - 6, 2, x, y, 20);
      g.addColorStop(0, '#ff8a8a');
      g.addColorStop(0.5, '#c4141f');
      g.addColorStop(1, '#5a0408');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 19, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e8c56a';
    star(ctx, 320, 470, 34);
    ctx.fill();
    ctx.strokeStyle = '#8a6420';
    ctx.lineWidth = 3;
    ctx.stroke();
    // أثر دخان خفيف
    ctx.fillStyle = 'rgba(30,20,15,0.35)';
    ctx.beginPath();
    ctx.ellipse(420, 230, 90, 40, 0.4, 0, Math.PI * 2);
    ctx.fill();
    grain(ctx, 640, 640, 14, rng);
    return { canvas: c, kind: 'icon' };
  },
  'item-drawing': () => {
    const rng = createRng(604);
    const [c, ctx] = makeCanvas(900, 700);
    ctx.fillStyle = '#1f2a5a';
    ctx.fillRect(0, 0, 900, 700);
    crayonFill(ctx, rng, 0, 0, 900, 700, '#28366e', () => ctx.rect(0, 0, 900, 700));
    paperEdges(ctx, 900, 700, rng);
    for (let i = 0; i < 14; i++) crayonStar(ctx, rng, 60 + rng() * 780, 60 + rng() * 300, 16 + rng() * 22, '#f2c94c', '#f7dc6f');
    crayonCircle(ctx, rng, 760, 110, 50, '#f5e9b8', 6, '#fbf3d0');
    crayon(ctx, rng, [[0, 560], [900, 555]], '#3e9b3a', 16, 3);
    crayonFill(ctx, rng, 0, 560, 900, 140, '#2f7a2f', () => ctx.rect(0, 560, 900, 140));
    // طفلين ماسكين يدين بعض
    const kid = (x, h, color, dress, ribbon) => {
      const top = 560 - h;
      crayonCircle(ctx, rng, x, top + 30, 30, '#5a3a22', 5, '#f0c9a0');
      if (dress) crayon(ctx, rng, [[x, top + 60], [x - 44, top + h * 0.75], [x + 44, top + h * 0.75], [x, top + 60]], color, 7);
      else crayon(ctx, rng, [[x, top + 60], [x, top + h * 0.72]], color, 9);
      crayon(ctx, rng, [[x - 14, top + h * 0.74], [x - 20, 560]], '#eee', 6);
      crayon(ctx, rng, [[x + 14, top + h * 0.74], [x + 20, 560]], '#eee', 6);
      if (ribbon) crayon(ctx, rng, [[x + 18, top - 2], [x + 42, top - 14], [x + 38, top + 10], [x + 18, top - 2]], '#e74c3c', 6);
    };
    kid(380, 250, '#5dade2', false, false);
    kid(520, 190, '#f5f5f5', true, true);
    crayon(ctx, rng, [[380, 420], [520, 410]], '#f0c9a0', 6);
    return { canvas: c, kind: 'drawing' };
  },
  'item-letter': () => {
    const rng = createRng(605);
    const [c, ctx] = makeCanvas(700, 900);
    paper(ctx, 700, 900, rng);
    ctx.strokeStyle = 'rgba(90,120,170,0.35)';
    ctx.lineWidth = 2;
    for (let y = 160; y < 860; y += 56) {
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(650, y);
      ctx.stroke();
    }
    handText(ctx, 'إلى أخوي...', 470, 130, 52, '#2b3f88', -0.02);
    for (let i = 0; i < 6; i++) {
      crayon(ctx, rng, [[600 - rng() * 40, 205 + i * 56], [110 + rng() * 120, 205 + i * 56]], '#2b3f88', 3, 1);
    }
    crayonStar(ctx, rng, 160, 780, 40, '#d9a514', '#f2c94c');
    return { canvas: c, kind: 'drawing' };
  },

  // ملاحظات ولوحات صغيرة
  notice: () => {
    const rng = createRng(701);
    const [c, ctx] = makeCanvas(800, 420);
    const g = ctx.createLinearGradient(0, 0, 800, 420);
    g.addColorStop(0, '#8a6427');
    g.addColorStop(0.45, '#e6c47c');
    g.addColorStop(1, '#7a5520');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 800, 420);
    ctx.strokeStyle = '#4a3410';
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, 764, 384);
    ctx.fillStyle = '#2a1a08';
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 54px ${SIGN_FONT}`;
    ctx.fillText('تنبيه للنزلاء', 400, 100);
    ctx.font = `600 38px ${SIGN_FONT}`;
    ctx.fillText('الرجاء عدم ترك الأطفال', 400, 210);
    ctx.fillText('في الممرات بدون مرافق', 400, 270);
    ctx.font = `500 26px ${SIGN_FONT}`;
    ctx.fillText('— الإدارة', 400, 350);
    grain(ctx, 800, 420, 16, rng);
    return { canvas: c, kind: 'sign' };
  },
  note: () => {
    const rng = createRng(702);
    const [c, ctx] = makeCanvas(512, 640);
    paper(ctx, 512, 640, rng);
    ctx.fillStyle = '#7a1a1c';
    ctx.font = `700 30px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText('GRAND HOTEL', 256, 70);
    handText(ctx, 'حجزنا 212 لنا', 280, 230, 40, '#203a78', -0.04);
    handText(ctx, 'و214 للعيال', 280, 300, 40, '#203a78', -0.03);
    handText(ctx, 'لا تسهرون', 300, 380, 40, '#203a78', 0.02);
    return { canvas: c, kind: 'drawing' };
  },
};

function paperEdges(ctx, w, h, rng) {
  ctx.strokeStyle = 'rgba(240,230,210,0.85)';
  ctx.lineWidth = 14;
  ctx.strokeRect(0, 0, w, h);
  grain(ctx, w, h, 10, rng);
}

function drawHideSeek(ctx, rng) {
  // كنبة
  crayon(ctx, rng, [[460, 560], [460, 420], [800, 420], [800, 560], [460, 560]], '#6b3a8a', 9);
  crayonFill(ctx, rng, 460, 420, 340, 140, '#9b59b6', () => ctx.rect(460, 420, 340, 140));
  // البنت مستخبية ورا الكنب (يبين رأسها وشريطتها)
  crayonCircle(ctx, rng, 700, 390, 34, '#5a3a22', 5, '#f0c9a0');
  crayon(ctx, rng, [[722, 360], [748, 346], [742, 372], [722, 360]], '#c0392b', 6);
  // الولد يغطي عيونه عند الجدار
  crayonCircle(ctx, rng, 200, 280, 40, '#5a3a22', 5, '#f0c9a0');
  crayon(ctx, rng, [[200, 320], [200, 470]], '#2e86c1', 10);
  crayon(ctx, rng, [[200, 350], [175, 300], [190, 280]], '#2e86c1', 7);
  crayon(ctx, rng, [[200, 350], [225, 300], [210, 280]], '#2e86c1', 7);
  crayon(ctx, rng, [[200, 470], [180, 580]], '#333', 7);
  crayon(ctx, rng, [[200, 470], [220, 580]], '#333', 7);
  handText(ctx, '1  2  3', 200, 170, 54, '#c0392b', -0.06, MONO);
  crayon(ctx, rng, [[0, 590], [900, 585]], '#8a5a3a', 10, 2);
}

// دمية الأرنب (تُستخدم في البطاقة وفي صورة ليان)
function drawBunny(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const fur = '#e9e1d6';
  const shade = '#c8bcae';
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(-26, -120, 18, 62, -0.15, 0, Math.PI * 2);
  ctx.ellipse(26, -120, 18, 62, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b3b8';
  ctx.beginPath();
  ctx.ellipse(-26, -118, 8, 44, -0.15, 0, Math.PI * 2);
  ctx.ellipse(26, -118, 8, 44, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, 40, 70, 78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(0, 60, 44, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.arc(0, -40, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a1a14';
  ctx.beginPath();
  ctx.arc(-20, -48, 7, 0, Math.PI * 2);
  ctx.arc(20, -48, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d98a94';
  ctx.beginPath();
  ctx.ellipse(0, -30, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // غرزة مرقّعة على البطن
  ctx.strokeStyle = '#8a6a5a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    ctx.moveTo(-14 + i * 8, 50);
    ctx.lineTo(-10 + i * 8, 62);
  }
  ctx.stroke();
  ctx.fillStyle = '#c0182a';
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.lineTo(-24, -6);
  ctx.lineTo(-24, 18);
  ctx.closePath();
  ctx.moveTo(0, 6);
  ctx.lineTo(24, -6);
  ctx.lineTo(24, 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ───────────── لافتات وعلامات تُنشأ حسب الحاجة ─────────────
export function signArt(style, arrow) {
  const key = `sign-${style}-${arrow}`;
  return cached(key, () => {
    const rng = createRng(style.length * 31 + (arrow === 'left' ? 1 : 2));
    if (style === 'star') {
      const [c, ctx] = makeCanvas(512, 512);
      paper(ctx, 512, 512, rng);
      crayonStar(ctx, rng, 256, 210, 120, '#d9a514', '#f2c94c');
      const dir = arrow === 'left' ? -1 : 1;
      crayon(ctx, rng, [[256 - dir * 140, 420], [256 + dir * 140, 420], [256 + dir * 100, 385], [256 + dir * 140, 420], [256 + dir * 100, 455]], '#c0392b', 9);
      tape(ctx, 256, 24, 120, 0.05);
      return { canvas: c, kind: 'drawing' };
    }
    const [c, ctx] = makeCanvas(768, 256);
    const emergency = style === 'emergency';
    if (emergency) {
      ctx.fillStyle = '#0f7a3a';
      ctx.fillRect(0, 0, 768, 256);
    } else {
      const g = ctx.createLinearGradient(0, 0, 768, 256);
      g.addColorStop(0, '#8a6427');
      g.addColorStop(0.45, '#e6c47c');
      g.addColorStop(1, '#7a5520');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 768, 256);
      ctx.strokeStyle = '#4a3410';
      ctx.lineWidth = 6;
      ctx.strokeRect(14, 14, 740, 228);
    }
    const ink = emergency ? '#ffffff' : '#2a1a08';
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 96px ${SIGN_FONT}`;
    const left = arrow === 'left';
    ctx.fillText('مخرج', left ? 470 : 300, 132);
    // سهم
    const ax = left ? 150 : 618;
    const d = left ? -1 : 1;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ax - d * 70, 128);
    ctx.lineTo(ax + d * 70, 128);
    ctx.moveTo(ax + d * 70, 128);
    ctx.lineTo(ax + d * 30, 88);
    ctx.moveTo(ax + d * 70, 128);
    ctx.lineTo(ax + d * 30, 168);
    ctx.stroke();
    if (emergency) {
      // رجل يركض (رمز مخرج الطوارئ)
      const mx = left ? 640 : 128;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(mx, 70, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mx, 90);
      ctx.lineTo(mx - d * 10, 150);
      ctx.lineTo(mx + d * 25, 200);
      ctx.moveTo(mx - d * 10, 150);
      ctx.lineTo(mx - d * 40, 195);
      ctx.moveTo(mx - 2, 108);
      ctx.lineTo(mx + d * 35, 125);
      ctx.moveTo(mx - 2, 108);
      ctx.lineTo(mx - d * 35, 130);
      ctx.stroke();
    }
    grain(ctx, 768, 256, 12, rng);
    return { canvas: c, kind: 'sign', emissive: emergency };
  });
}

export function plateArt(number, { burnt = false } = {}) {
  return cached(`plate-${number}-${burnt}`, () => {
    const rng = createRng(number);
    const [c, ctx] = makeCanvas(256, 128);
    const g = ctx.createLinearGradient(0, 0, 256, 128);
    g.addColorStop(0, '#8a6427');
    g.addColorStop(0.45, '#f0d08a');
    g.addColorStop(1, '#7a5520');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(128, 64, 124, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a3410';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#2a1a08';
    ctx.font = `700 60px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), 128, 68);
    if (burnt) {
      ctx.fillStyle = 'rgba(20,10,5,0.55)';
      ctx.fillRect(0, 0, 256, 128);
      burn(ctx, 256, 128, rng, [{ x: 220, y: 70, r: 50 }]);
    }
    return { canvas: c, kind: 'sign', alpha: burnt };
  });
}

export function clockArt(cracked) {
  return cached(`clock-${cracked}`, () => {
    const rng = createRng(cracked ? 9 : 8);
    const [c, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = '#f1e8d6';
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1a10';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `500 50px ${MONO}`;
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(String(i), 256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190);
    }
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const r1 = i % 5 ? 228 : 218;
      ctx.lineWidth = i % 5 ? 2 : 5;
      ctx.strokeStyle = '#2a1a10';
      ctx.beginPath();
      ctx.moveTo(256 + Math.cos(a) * r1, 256 + Math.sin(a) * r1);
      ctx.lineTo(256 + Math.cos(a) * 240, 256 + Math.sin(a) * 240);
      ctx.stroke();
    }
    ctx.font = `400 24px ${SERIF}`;
    ctx.fillText('GRAND HOTEL', 256, 330);
    if (cracked) {
      ctx.fillStyle = 'rgba(30,15,5,0.35)';
      ctx.beginPath();
      ctx.arc(256, 256, 250, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        let x = 330;
        let y = 170;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const a = rng() * Math.PI * 2;
        for (let k = 0; k < 5; k++) {
          x += Math.cos(a + (rng() - 0.5)) * 50;
          y += Math.sin(a + (rng() - 0.5)) * 50;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    grain(ctx, 512, 512, 10, rng);
    return { canvas: c, kind: 'sign' };
  });
}

// آثار يد صغيرة (شفافة الخلفية)
export function handprintArt() {
  return cached('handprint', () => {
    const rng = createRng(77);
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = 'rgba(25,14,10,0.85)';
    ctx.beginPath();
    ctx.ellipse(128, 160, 52, 62, 0, 0, Math.PI * 2);
    ctx.fill();
    const fingers = [[-46, -40, -0.5], [-22, -78, -0.15], [6, -86, 0], [32, -76, 0.15], [58, -30, 0.7]];
    fingers.forEach(([dx, dy, a]) => {
      ctx.beginPath();
      ctx.ellipse(128 + dx, 150 + dy, 13, 30, a, 0, Math.PI * 2);
      ctx.fill();
    });
    const img = ctx.getImageData(0, 0, 256, 256);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] *= 0.55 + rng() * 0.45;
    ctx.putImageData(img, 0, 0);
    return { canvas: c, kind: 'decal' };
  });
}

// بقعة سخام فوق المصابيح والأبواب
export function sootArt() {
  return cached('soot', () => {
    const rng = createRng(78);
    const [c, ctx] = makeCanvas(256, 256);
    for (let i = 0; i < 26; i++) {
      const x = 128 + (rng() - 0.5) * 120;
      const y = 150 - rng() * 130;
      const g = ctx.createRadialGradient(x, y, 2, x, y, 40 + rng() * 40);
      g.addColorStop(0, 'rgba(10,6,4,0.35)');
      g.addColorStop(1, 'rgba(10,6,4,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }
    return { canvas: c, kind: 'decal' };
  });
}

// نجمة مرسومة بالطباشير على باب
export function doorStarArt() {
  return cached('door-star', () => {
    const rng = createRng(79);
    const [c, ctx] = makeCanvas(256, 256);
    crayonStar(ctx, rng, 128, 128, 100, '#f0c23a', null);
    return { canvas: c, kind: 'decal' };
  });
}

// ───────────── الواجهة العامة ─────────────
const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export function getArt(id) {
  return cached(id, () => {
    const make = ART[id];
    if (!make) throw new Error(`رسمة غير معروفة: ${id}`);
    return make();
  });
}

const texCache = new Map();
// خامة Three.js من رسمة (تُحفظ وتُعاد استخدامها)
export function artTexture(art) {
  if (texCache.has(art)) return texCache.get(art);
  const t = new THREE.CanvasTexture(art.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(art, t);
  return t;
}

// يستبدل الرسمة بصورة حقيقية إذا أضفتها في ART_OVERRIDES
export function applyOverride(id, material) {
  const url = ART_OVERRIDES[id];
  if (!url) return;
  new THREE.TextureLoader().load(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    material.map = t;
    material.needsUpdate = true;
  });
}

const urlCache = new Map();
export function artDataURL(id) {
  if (ART_OVERRIDES[id]) return ART_OVERRIDES[id];
  if (!urlCache.has(id)) urlCache.set(id, getArt(id).canvas.toDataURL('image/jpeg', 0.88));
  return urlCache.get(id);
}
