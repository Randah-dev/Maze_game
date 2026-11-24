// كل الخامات تُرسم بالكود على Canvas، فلا تحتاج اللعبة أي ملفات صور.
import * as THREE from 'three';
import { THEME } from './config.js';
import { createRng } from './rng.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })];
}

// ضوضاء خفيفة تعطي الخامة ملمسًا طبيعيًا
function grain(ctx, w, h, amount, rng) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function woodStreaks(ctx, x, y, w, h, rng, alpha = 0.18) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = 0; i < h / 3; i++) {
    const yy = y + rng() * h;
    ctx.strokeStyle = rng() > 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,190,140,${alpha * 0.35})`;
    ctx.lineWidth = 0.6 + rng() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    const segs = 6;
    for (let s = 1; s <= segs; s++) ctx.lineTo(x + (w * s) / segs, yy + (rng() - 0.5) * 3);
    ctx.stroke();
  }
  ctx.restore();
}

function bevelRect(ctx, x, y, w, h, depth, light, dark) {
  ctx.fillStyle = light;
  ctx.fillRect(x, y, w, depth);
  ctx.fillRect(x, y, depth, h);
  ctx.fillStyle = dark;
  ctx.fillRect(x, y + h - depth, w, depth);
  ctx.fillRect(x + w - depth, y, depth, h);
}

function toTexture(canvas, { color = true, repeat = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// ---------- الجدار: ورق حائط أحمر + خشب سفلي مُقسّم ألواحًا ----------
function wallTextures() {
  const S = 1024;
  const rng = createRng(11);
  const [c, ctx] = makeCanvas(S, S);
  const [b, bctx] = makeCanvas(S, S);
  const m = (meters) => Math.round((1 - meters / 3.2) * S); // تحويل الارتفاع بالمتر إلى بكسل

  // ورق الحائط
  ctx.fillStyle = THEME.wallpaper;
  ctx.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x += 64) {
    ctx.fillStyle = (x / 64) % 2 ? THEME.wallpaperShade : THEME.wallpaper;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x, 0, 64, S);
  }
  ctx.globalAlpha = 1;
  // زخرفة دمشقية بسيطة (معيّنات وزهور صغيرة)
  ctx.fillStyle = THEME.wallpaperPattern;
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 9; col++) {
      const x = col * 128 + (row % 2 ? 64 : 0) + 32;
      const y = row * 64 + 20;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.quadraticCurveTo(x + 14, y, x, y + 18);
      ctx.quadraticCurveTo(x - 14, y, x, y - 18);
      ctx.fill();
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(x, y - 24, 4, 0, Math.PI * 2);
      ctx.arc(x, y + 24, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, S, S);

  // إطار زخرفي رفيع في الجزء العلوي
  ctx.strokeStyle = 'rgba(20,4,4,0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(90, m(2.82), S - 180, m(1.3) - m(2.82));
  ctx.strokeStyle = 'rgba(226,160,120,0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(96, m(2.82) + 6, S - 192, m(1.3) - m(2.82) - 12);
  bctx.strokeStyle = '#a0a0a0';
  bctx.lineWidth = 6;
  bctx.strokeRect(90, m(2.82), S - 180, m(1.3) - m(2.82));

  // الإفريز العلوي (خشب مع خط ذهبي)
  const crownTop = 0;
  const crownH = m(3.04);
  ctx.fillStyle = THEME.wood;
  ctx.fillRect(0, crownTop, S, crownH);
  woodStreaks(ctx, 0, crownTop, S, crownH, rng);
  ctx.fillStyle = THEME.gold;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(0, crownH - 8, S, 4);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, crownH, S, 6);
  bctx.fillStyle = '#d0d0d0';
  bctx.fillRect(0, 0, S, crownH);
  bctx.fillStyle = '#ffffff';
  bctx.fillRect(0, crownH - 10, S, 6);

  // الخشب السفلي
  const railTop = m(1.02);
  const railBottom = m(0.94);
  const baseTop = m(0.13);
  ctx.fillStyle = THEME.wood;
  ctx.fillRect(0, railTop, S, S - railTop);
  woodStreaks(ctx, 0, railTop, S, S - railTop, rng, 0.2);
  bctx.fillStyle = '#9a9a9a';
  bctx.fillRect(0, railTop, S, S - railTop);

  // الحاجز الأفقي (chair rail)
  ctx.fillStyle = THEME.woodLight;
  ctx.fillRect(0, railTop, S, railBottom - railTop);
  ctx.fillStyle = 'rgba(255,210,160,0.18)';
  ctx.fillRect(0, railTop, S, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, railBottom, S, 5);
  bctx.fillStyle = '#ffffff';
  bctx.fillRect(0, railTop, S, railBottom - railTop);

  // ألواح بارزة
  const panelTop = railBottom + 26;
  const panelBottom = baseTop - 22;
  const gap = 34;
  const panels = 2;
  const pw = (S - gap * (panels + 1)) / panels;
  for (let i = 0; i < panels; i++) {
    const x = gap + i * (pw + gap);
    ctx.fillStyle = THEME.woodDark;
    ctx.fillRect(x, panelTop, pw, panelBottom - panelTop);
    bevelRect(ctx, x, panelTop, pw, panelBottom - panelTop, 7, 'rgba(255,200,150,0.14)', 'rgba(0,0,0,0.6)');
    ctx.fillStyle = THEME.wood;
    ctx.fillRect(x + 22, panelTop + 22, pw - 44, panelBottom - panelTop - 44);
    woodStreaks(ctx, x + 22, panelTop + 22, pw - 44, panelBottom - panelTop - 44, rng, 0.22);
    bevelRect(ctx, x + 22, panelTop + 22, pw - 44, panelBottom - panelTop - 44, 5, 'rgba(0,0,0,0.45)', 'rgba(255,200,150,0.12)');
    bctx.fillStyle = '#707070';
    bctx.fillRect(x, panelTop, pw, panelBottom - panelTop);
    bctx.fillStyle = '#b8b8b8';
    bctx.fillRect(x + 22, panelTop + 22, pw - 44, panelBottom - panelTop - 44);
  }

  // الوزرة السفلية
  ctx.fillStyle = THEME.woodDark;
  ctx.fillRect(0, baseTop, S, S - baseTop);
  ctx.fillStyle = 'rgba(255,200,150,0.12)';
  ctx.fillRect(0, baseTop, S, 3);
  bctx.fillStyle = '#c8c8c8';
  bctx.fillRect(0, baseTop, S, S - baseTop);

  grain(ctx, S, S, 14, rng);
  return { map: toTexture(c), bump: toTexture(b, { color: false }) };
}

// ---------- الأرضية: ألواح خشب داكن ----------
function floorTexture() {
  const S = 512;
  const rng = createRng(22);
  const [c, ctx] = makeCanvas(S, S);
  const plank = 64;
  for (let x = 0; x < S; x += plank) {
    let y = -Math.floor(rng() * 300);
    while (y < S) {
      const len = 220 + rng() * 260;
      const shade = 0.75 + rng() * 0.5;
      ctx.fillStyle = THEME.floorWood;
      ctx.fillRect(x, y, plank, len);
      ctx.fillStyle = `rgba(${Math.round(70 * shade)},${Math.round(36 * shade)},${Math.round(22 * shade)},0.35)`;
      ctx.fillRect(x, y, plank, len);
      woodStreaks(ctx, x, y, plank, len, rng, 0.25);
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(x, y, plank, 2);
      y += len;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(x, 0, 2, S);
  }
  grain(ctx, S, S, 12, rng);
  const t = toTexture(c, { repeat: true });
  return t;
}

// ---------- السجادة الحمراء ----------
function carpetTexture() {
  const S = 512;
  const rng = createRng(33);
  const [c, ctx] = makeCanvas(S, S);
  ctx.fillStyle = THEME.carpet;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = THEME.carpetPattern;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.6;
  const step = 128;
  for (let y = -step; y <= S + step; y += step) {
    for (let x = -step; x <= S + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, y - step / 2);
      ctx.lineTo(x + step / 2, y);
      ctx.lineTo(x, y + step / 2);
      ctx.lineTo(x - step / 2, y);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + step / 2, y + step / 2, 10, 0, Math.PI * 2);
      ctx.fillStyle = THEME.carpetPattern;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  grain(ctx, S, S, 34, rng);
  return toTexture(c, { repeat: true });
}

function carpetBorderTexture() {
  const [c, ctx] = makeCanvas(256, 32);
  ctx.fillStyle = THEME.carpetBorder;
  ctx.fillRect(0, 0, 256, 32);
  ctx.fillStyle = '#5a0a0c';
  ctx.fillRect(0, 13, 256, 6);
  ctx.fillStyle = '#e6c27a';
  for (let x = 0; x < 256; x += 32) ctx.fillRect(x + 12, 14, 8, 4);
  grain(ctx, 256, 32, 30, createRng(44));
  return toTexture(c, { repeat: true });
}

// ---------- السقف مع إضاءة غائرة في منتصف كل مربع ----------
function ceilingTextures() {
  const S = 512;
  const [c, ctx] = makeCanvas(S, S);
  const [e, ectx] = makeCanvas(S, S);
  ctx.fillStyle = THEME.ceiling;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 10;
  ctx.strokeRect(70, 70, S - 140, S - 140);
  const cx = S / 2;
  ctx.fillStyle = '#120404';
  ctx.beginPath();
  ctx.arc(cx, cx, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff2da';
  ctx.beginPath();
  ctx.arc(cx, cx, 21, 0, Math.PI * 2);
  ctx.fill();
  grain(ctx, S, S, 10, createRng(55));

  ectx.fillStyle = '#000';
  ectx.fillRect(0, 0, S, S);
  const g = ectx.createRadialGradient(cx, cx, 0, cx, cx, 34);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#ffe7c0');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ectx.fillStyle = g;
  ectx.beginPath();
  ectx.arc(cx, cx, 34, 0, Math.PI * 2);
  ectx.fill();
  return { map: toTexture(c, { repeat: true }), emissive: toTexture(e, { repeat: true }) };
}

// ---------- لافتة المخرج المضيئة ----------
function signTexture() {
  const [c, ctx] = makeCanvas(1024, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#fffaf0');
  g.addColorStop(1, '#f2e6d2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = THEME.signText;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = '700 132px "Inter", sans-serif';
  ctx.fillText('EXIT', 290, 134);
  ctx.direction = 'rtl';
  ctx.font = '700 124px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('مخرج', 740, 128);
  ctx.fillRect(505, 60, 6, 136);
  return toTexture(c);
}

// ---------- باب خشبي برقم الغرفة (بدون رقم لأبواب الغرف التي تحمل لوحة رقم منفصلة) ----------
export function createDoorTexture(number = null) {
  const W = 512;
  const H = 1024;
  const rng = createRng((number || 7) * 13 + 1);
  const [c, ctx] = makeCanvas(W, H);
  const base = ctx.createLinearGradient(0, 0, W, 0);
  base.addColorStop(0, '#3a120c');
  base.addColorStop(0.5, '#56200f');
  base.addColorStop(1, '#3a120c');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  // عروق الخشب عمودية
  ctx.save();
  ctx.translate(W, 0);
  ctx.rotate(Math.PI / 2);
  woodStreaks(ctx, 0, 0, H, W, rng, 0.2);
  ctx.restore();

  // لوح بارز بقوس في الأعلى
  const px = 70;
  const pw = W - 140;
  const pTop = 300;
  const pBottom = H - 90;
  const arc = () => {
    ctx.beginPath();
    ctx.moveTo(px, pBottom);
    ctx.lineTo(px, pTop);
    ctx.arc(W / 2, pTop, pw / 2, Math.PI, 0);
    ctx.lineTo(px + pw, pBottom);
    ctx.closePath();
  };
  ctx.lineWidth = 16;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  arc();
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,190,140,0.18)';
  ctx.save();
  ctx.translate(-5, -5);
  arc();
  ctx.stroke();
  ctx.restore();

  // رقم الغرفة
  if (number != null) {
    ctx.fillStyle = THEME.doorNumber;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 104px "Roboto Mono", monospace';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowOffsetY = 4;
    ctx.shadowBlur = 6;
    ctx.fillText(String(number), W / 2, 330);
    ctx.shadowColor = 'transparent';
  }

  // درع ثقب المفتاح
  ctx.fillStyle = '#c9a45c';
  ctx.beginPath();
  ctx.ellipse(W / 2, 520, 34, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0d06';
  ctx.beginPath();
  ctx.arc(W / 2, 510, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(W / 2 - 4, 510, 8, 26);

  grain(ctx, W, H, 12, rng);
  return toTexture(c);
}

// الضوء خلف باب المخرج: توهج دافئ أقوى في المنتصف
function portalTexture() {
  const [c, ctx] = makeCanvas(128, 256);
  const g = ctx.createRadialGradient(64, 150, 10, 64, 150, 170);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#ffe2b0');
  g.addColorStop(1, '#c2742f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 256);
  return toTexture(c);
}

function dustSprite() {
  const [c, ctx] = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,230,190,1)');
  g.addColorStop(0.4, 'rgba(255,210,160,0.35)');
  g.addColorStop(1, 'rgba(255,200,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return toTexture(c);
}

// تُنشأ مرة واحدة وتُستخدم في كل المستويات
let shared = null;
export function getSharedTextures() {
  if (shared) return shared;
  shared = {
    wall: wallTextures(),
    floor: floorTexture(),
    carpet: carpetTexture(),
    carpetBorder: carpetBorderTexture(),
    ceiling: ceilingTextures(),
    sign: signTexture(),
    portal: portalTexture(),
    dust: dustSprite(),
  };
  return shared;
}
