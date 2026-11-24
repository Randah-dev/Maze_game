// مجسّمات القصة: اللوحات، أبواب الغرف، الساعة، الطاولات، اللافتات، الأغراض الأساسية.
// كل شيء يوضع على "وجه جدار" محسوب في layout.js.
import * as THREE from 'three';
import { TILE, THEME } from '../config.js';
import { getArt, artTexture, applyOverride, signArt, plateArt, clockArt, handprintArt, sootArt, doorStarArt } from './art.js';
import { createDoorTexture } from '../textures.js';

const HALF = TILE / 2;
const UP = new THREE.Vector3(0, 1, 0);

// أشكال مشتركة (تُنشأ مرة واحدة)
let G = null;
function shared() {
  if (G) return G;
  const vaseProfile = [[0, 0], [0.07, 0], [0.09, 0.05], [0.1, 0.13], [0.07, 0.22], [0.045, 0.28], [0.06, 0.32], [0.055, 0.33]].map(([x, y]) => new THREE.Vector2(x, y));
  G = {
    plane: new THREE.PlaneGeometry(1, 1),
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(1, 16, 12),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 24),
    vase: new THREE.LatheGeometry(vaseProfile, 20),
    shard: new THREE.TetrahedronGeometry(0.06),
    torus: new THREE.TorusGeometry(1, 0.22, 10, 28),
    doorTex: createDoorTexture(null),
  };
  return G;
}

// موضع ودوران وجه الجدار: +Z يخرج من الجدار نحو الممر
function faceTransform(face) {
  const pos = new THREE.Vector3((face.x + 0.5) * TILE + face.d.dx * HALF, 0, (face.z + 0.5) * TILE + face.d.dz * HALF);
  const yaw = Math.atan2(-face.d.dx, -face.d.dz);
  return { pos, yaw };
}

export function faceAnchor(face) {
  const g = new THREE.Group();
  const { pos, yaw } = faceTransform(face);
  g.position.copy(pos);
  g.rotation.y = yaw;
  return g;
}

// نقطة في إحداثيات العالم أمام الوجه
export function facePoint(face, x, y, z) {
  const { pos, yaw } = faceTransform(face);
  return new THREE.Vector3(x, y, z).applyAxisAngle(UP, yaw).add(pos);
}

export function buildStoryProps(plan, maze, { group, own, mats, colliders, reducedMotion }) {
  const g = shared();
  const inspect = [];
  const animated = [];
  const result = { inspect, pickup: null, clock: null, itemPos: null, itemMeshes: [], update: null, doorFaces: [] };
  const env = plan.stage.env;

  const mat = (opts) => own(new THREE.MeshStandardMaterial(opts));
  const mesh = (geo, material, parent, { pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], cast = true } = {}) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(...pos);
    m.scale.set(...scale);
    m.rotation.set(...rot);
    m.castShadow = cast;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const addInspect = (face, y, lines, { radius = 2.4, z = 0.2, id } = {}) => {
    if (!lines?.length) return;
    inspect.push({ id: id || `i${inspect.length}`, pos: facePoint(face, 0, y, z), lines, radius, done: false });
  };
  const collider = (face, halfW, depth, offsetX = 0) => {
    const c = facePoint(face, offsetX, 0, depth / 2);
    const alongX = face.d.dz !== 0; // الجدار يمتد على محور X
    const hx = alongX ? halfW : depth / 2;
    const hz = alongX ? depth / 2 : halfW;
    colliders.push({ minX: c.x - hx, maxX: c.x + hx, minZ: c.z - hz, maxZ: c.z + hz });
  };

  // ───── لوحة أو صورة أو رسمة على الجدار ─────
  const picture = (face, artId, { width, y, artObj, offsetX = 0, tilt = 0 } = {}) => {
    const art = artObj || getArt(artId);
    const aspect = art.canvas.width / art.canvas.height;
    const kind = art.kind;
    const w = width || (kind === 'painting' ? 1.3 : kind === 'drawing' ? 0.72 : kind === 'sign' ? 0.8 : aspect >= 1 ? 0.95 : 0.72);
    const h = w / aspect;
    const cy = y ?? (kind === 'drawing' ? 1.38 : kind === 'sign' ? 1.6 : 1.72);
    const a = faceAnchor(face);
    group.add(a);
    const m = mat({
      map: artTexture(art),
      roughness: kind === 'photo' ? 0.35 : kind === 'drawing' ? 0.9 : 0.5,
      transparent: !!art.alpha,
      alphaTest: art.alpha ? 0.3 : 0,
      emissive: art.emissive ? 0xffffff : 0x000000,
      emissiveMap: art.emissive ? artTexture(art) : null,
      emissiveIntensity: art.emissive ? 0.9 : 0,
    });
    if (artId) applyOverride(artId, m);
    if (kind === 'painting' || kind === 'photo') {
      mesh(g.box, mats.darkWood, a, { pos: [offsetX, cy, 0.012], scale: [w + 0.03, h + 0.03, 0.024] });
    }
    const p = mesh(g.plane, m, a, { pos: [offsetX, cy, kind === 'drawing' ? 0.008 : 0.026], scale: [w, h, 1], rot: [0, 0, tilt], cast: false });
    return { anchor: a, mesh: p, height: cy };
  };

  // ───── باب غرفة على الجدار ─────
  const roomDoor = (face, number, { star = false, ajar = false, burnt = false, open = 0, glow = false } = {}) => {
    const a = faceAnchor(face);
    group.add(a);
    const doorW = 1.05;
    const doorH = 2.2;
    const panelMat = burnt
      ? mat({ map: g.doorTex, color: 0x6a5a52, roughness: 0.7 })
      : mat({ map: g.doorTex, roughness: 0.45 });
    mesh(g.box, mats.darkWood, a, { pos: [-(doorW / 2 + 0.06), doorH / 2 + 0.06, 0.04], scale: [0.11, doorH + 0.12, 0.08] });
    mesh(g.box, mats.darkWood, a, { pos: [doorW / 2 + 0.06, doorH / 2 + 0.06, 0.04], scale: [0.11, doorH + 0.12, 0.08] });
    mesh(g.box, mats.darkWood, a, { pos: [0, doorH + 0.1, 0.045], scale: [doorW + 0.34, 0.12, 0.09] });
    if (ajar || open) {
      // فتحة مظلمة (أو مضيئة) خلف الباب المفتوح
      const inside = glow ? mats.portal : own(new THREE.MeshBasicMaterial({ color: 0x030202 }));
      mesh(g.plane, inside, a, { pos: [0, doorH / 2, 0.004], scale: [doorW, doorH, 1], cast: false });
    }
    const hinge = new THREE.Group();
    hinge.position.set(-doorW / 2, 0, 0.03);
    hinge.rotation.y = -(open || (ajar ? 0.32 : 0));
    a.add(hinge);
    mesh(g.box, panelMat, hinge, { pos: [doorW / 2, doorH / 2, 0], scale: [doorW, doorH, 0.05] });
    mesh(g.sphere, mats.gold, hinge, { pos: [doorW - 0.12, 1.02, 0.05], scale: [0.04, 0.04, 0.04] });
    if (number != null) {
      const plate = plateArt(number, { burnt });
      const pm = mat({ map: artTexture(plate), transparent: true, alphaTest: 0.2, metalness: 0.6, roughness: 0.35 });
      mesh(g.plane, pm, hinge, { pos: [doorW / 2, 1.72, 0.028], scale: [0.3, 0.15, 1], cast: false });
    }
    if (star) {
      const sm = mat({ map: artTexture(doorStarArt()), transparent: true, depthWrite: false, roughness: 0.9, emissive: 0x332200, emissiveIntensity: 0.4 });
      mesh(g.plane, sm, hinge, { pos: [doorW / 2, 1.3, 0.03], scale: [0.42, 0.42, 1], cast: false });
    }
    if (burnt) soot(face, 2.5, 1.6);
    result.doorFaces.push(face);
    return { anchor: a, hinge };
  };

  // ───── سخام على الجدار (المرحلة الرابعة) ─────
  const sootMat = env.soot ? mat({ map: artTexture(sootArt()), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }) : null;
  function soot(face, y, size) {
    if (!sootMat) return;
    const a = faceAnchor(face);
    group.add(a);
    mesh(g.plane, sootMat, a, { pos: [0, y, 0.006], scale: [size, size, 1], cast: false });
  }

  // ───── طاولة صغيرة مع مزهرية ─────
  const flowerWhite = mat({ color: 0xf4f0e6, roughness: 0.7 });
  const flowerWilt = mat({ color: 0x9a8668, roughness: 0.9 });
  const stem = mat({ color: env.flowers === 'wilting' ? 0x6a6a3a : 0x3c6a30, roughness: 0.8 });
  const table = (face, { flowers = 'fresh', ribbon = false, width = 1.0, offsetX = 0 } = {}) => {
    const a = faceAnchor(face);
    group.add(a);
    mesh(g.box, mats.darkWood, a, { pos: [offsetX, 0.39, 0.2], scale: [width, 0.78, 0.38] });
    mesh(g.box, mats.wood, a, { pos: [offsetX, 0.805, 0.22], scale: [width + 0.1, 0.05, 0.44] });
    collider(face, (width + 0.1) / 2, 0.46, offsetX);
    if (flowers !== 'none') {
      mesh(g.vase, mats.vase, a, { pos: [offsetX + 0.25, 0.83, 0.22] });
      const wilt = flowers === 'wilting';
      for (let k = 0; k < 7; k++) {
        const ang = (k / 7) * Math.PI * 2;
        const droop = wilt ? 0.12 + (k % 3) * 0.05 : 0;
        mesh(g.cyl, stem, a, { pos: [offsetX + 0.25 + Math.cos(ang) * 0.03, 1.1 - droop / 2, 0.22 + Math.sin(ang) * 0.03], scale: [0.006, 0.22, 0.006], rot: [Math.sin(ang) * 0.3, 0, Math.cos(ang) * 0.3 + (wilt ? 0.5 : 0)], cast: false });
        mesh(g.sphere, wilt ? flowerWilt : flowerWhite, a, {
          pos: [offsetX + 0.25 + Math.cos(ang) * (0.07 + droop * 0.6), 1.2 + (k % 2) * 0.05 - droop, 0.22 + Math.sin(ang) * 0.07],
          scale: wilt ? [0.035, 0.028, 0.035] : [0.045, 0.04, 0.045],
        });
      }
      if (wilt) {
        for (let k = 0; k < 4; k++) mesh(g.sphere, flowerWilt, a, { pos: [offsetX - 0.1 + k * 0.12, 0.84, 0.3 - k * 0.03], scale: [0.025, 0.006, 0.02], cast: false });
      }
    }
    if (ribbon) {
      const red = mat({ color: 0xb0121c, roughness: 0.6 });
      mesh(g.sphere, mats.gold, a, { pos: [offsetX - 0.3, 0.6, 0.4], scale: [0.025, 0.025, 0.025] });
      mesh(g.torus, red, a, { pos: [offsetX - 0.3, 0.6, 0.41], scale: [0.035, 0.035, 0.035] });
      mesh(g.box, red, a, { pos: [offsetX - 0.32, 0.5, 0.415], scale: [0.025, 0.18, 0.004], rot: [0, 0, 0.15] });
      mesh(g.box, red, a, { pos: [offsetX - 0.27, 0.51, 0.415], scale: [0.025, 0.16, 0.004], rot: [0, 0, -0.2] });
    }
    return a;
  };

  // ───── الساعة (03:17 دائمًا) ─────
  const clock = (face, stopped) => {
    const a = faceAnchor(face);
    group.add(a);
    const y = 2.25;
    mesh(g.cyl, mats.gold, a, { pos: [0, y, 0.035], scale: [0.3, 0.06, 0.3], rot: [Math.PI / 2, 0, 0] });
    const faceMat = mat({ map: artTexture(clockArt(stopped)), roughness: 0.3 });
    const cg = new THREE.CircleGeometry(0.27, 40);
    own(cg);
    const dial = new THREE.Mesh(cg, faceMat);
    dial.position.set(0, y, 0.067);
    a.add(dial);
    const black = mat({ color: 0x1a120c, roughness: 0.5 });
    const hand = (len, wdt, angle, z) => {
      const pivot = new THREE.Group();
      pivot.position.set(0, y, z);
      pivot.rotation.z = -angle;
      a.add(pivot);
      mesh(g.box, black, pivot, { pos: [0, len / 2 - 0.02, 0], scale: [wdt, len, 0.006], cast: false });
      return pivot;
    };
    // 3:17 ← الساعة 3 والدقيقة 17
    hand(0.14, 0.018, ((3 + 17 / 60) / 12) * Math.PI * 2, 0.072);
    hand(0.21, 0.012, (17 / 60) * Math.PI * 2, 0.076);
    const sec = hand(0.23, 0.005, 0, 0.08);
    let t = 0;
    animated.push((dt) => {
      t += dt;
      if (stopped) sec.rotation.z = -(42 / 60) * Math.PI * 2 + (Math.floor(t * 1.2) % 2 ? -0.03 : 0); // عقرب عالق يرتجف
      else sec.rotation.z = -(Math.floor(t) / 60) * Math.PI * 2;
    });
    result.clock = { pos: facePoint(face, 0, y, 0.1), stopped };
  };

  // ───── اللافتات الإرشادية ─────
  for (const s of plan.signs) {
    const art = signArt(s.style, s.arrow);
    if (s.style === 'star') picture(s.face, null, { artObj: art, width: 0.5, y: 1.32, tilt: (Math.random() - 0.5) * 0.08 });
    else if (s.style === 'emergency') picture(s.face, null, { artObj: art, width: 0.7, y: 2.45 });
    else picture(s.face, null, { artObj: art, width: 0.7, y: 1.62 });
  }

  // ───── لوحات القصة ─────
  for (const p of plan.pictures) {
    const pic = picture(p.face, p.art);
    addInspect(p.face, pic.height, p.lines, { id: p.art });
    if (env.soot && !p.art.startsWith('s4-evac')) soot(p.face, pic.height + 0.6, 1.4);
  }

  // ───── أبواب الغرف ─────
  for (const d of plan.doors) {
    roomDoor(d.face, d.number, d);
    addInspect(d.face, 1.5, d.lines, { id: `door${d.number}` });
  }

  // ───── التفاصيل الخاصة ─────
  for (const p of plan.props) {
    const a = faceAnchor(p.face);
    group.add(a);
    if (p.kind === 'clock') {
      group.remove(a);
      clock(p.face, env.clock === 'stopped');
      addInspect(p.face, 2.0, p.lines, { id: 'clock', radius: 3.2 });
    } else if (p.kind === 'notice') {
      picture(p.face, 'notice', { width: 0.7, y: 1.6 });
      addInspect(p.face, 1.6, p.lines, { id: 'notice' });
    } else if (p.kind === 'suitcase') {
      const body = mat({ color: 0x2f7d84, roughness: 0.55 });
      mesh(g.box, body, a, { pos: [0.95, 0.24, 0.16], scale: [0.42, 0.46, 0.17], rot: [0, -0.25, 0] });
      mesh(g.box, mats.gold, a, { pos: [0.95, 0.5, 0.16], scale: [0.16, 0.05, 0.04], rot: [0, -0.25, 0] });
      const tag = mat({ color: 0xf2e8d0, roughness: 0.8 });
      mesh(g.box, tag, a, { pos: [0.86, 0.38, 0.26], scale: [0.08, 0.05, 0.005], rot: [0, -0.25, 0.3], cast: false });
      collider(p.face, 0.3, 0.32, 0.95);
      inspect.push({ id: 'suitcase', pos: facePoint(p.face, 0.95, 0.3, 0.3), lines: p.lines, radius: 2.2, done: false });
    } else if (p.kind === 'drawerNote') {
      mesh(g.box, mats.darkWood, a, { pos: [0, 0.36, 0.2], scale: [0.6, 0.72, 0.38] });
      mesh(g.box, mats.wood, a, { pos: [0, 0.6, 0.42], scale: [0.5, 0.13, 0.3] });
      const paperMat = mat({ map: artTexture(getArt('note')), roughness: 0.9 });
      mesh(g.plane, paperMat, a, { pos: [0, 0.675, 0.44], scale: [0.2, 0.25, 1], rot: [-Math.PI / 2, 0, 0.2], cast: false });
      collider(p.face, 0.32, 0.6);
      inspect.push({ id: 'note', pos: facePoint(p.face, 0, 0.7, 0.4), lines: p.lines, radius: 2.2, done: false });
    } else if (p.kind === 'phone') {
      mesh(g.box, mats.darkWood, a, { pos: [0, 0.36, 0.2], scale: [0.55, 0.72, 0.36] });
      mesh(g.box, mats.wood, a, { pos: [0, 0.73, 0.21], scale: [0.6, 0.04, 0.4] });
      const plastic = mat({ color: 0x1c1512, roughness: 0.3 });
      mesh(g.box, plastic, a, { pos: [0.05, 0.79, 0.2], scale: [0.22, 0.08, 0.18] });
      mesh(g.box, plastic, a, { pos: [-0.16, 0.77, 0.3], scale: [0.2, 0.04, 0.05], rot: [0, 0.6, 0] });
      collider(p.face, 0.3, 0.42);
      inspect.push({ id: 'phone', pos: facePoint(p.face, 0, 0.8, 0.3), lines: p.lines, radius: 2.3, done: false, sound: 'record' });
    } else if (p.kind === 'brokenVase') {
      const shardMat = mats.vase;
      for (let k = 0; k < 7; k++) mesh(g.shard, shardMat, a, { pos: [-0.3 + k * 0.1, 0.03, 0.35 + Math.sin(k * 2.1) * 0.12], rot: [k, k * 0.7, k * 1.3], scale: [0.7 + (k % 3) * 0.3, 0.7, 0.7] });
      for (let k = 0; k < 5; k++) mesh(g.sphere, env.flowers === 'broken' ? flowerWilt : flowerWhite, a, { pos: [0.2 + k * 0.08, 0.025, 0.45 + Math.cos(k) * 0.1], scale: [0.04, 0.02, 0.04], cast: false });
      inspect.push({ id: `broken${inspect.length}`, pos: facePoint(p.face, 0, 0.1, 0.4), lines: p.lines, radius: 2.2, done: false, down: true });
    }
  }

  // ───── طاولات المزهريات ─────
  plan.tables.forEach((t, i) => {
    table(t.face, { flowers: t.flowers, ribbon: t.ribbon });
    if (t.lines) inspect.push({ id: t.ribbon ? 'ribbon' : `vase${i}`, pos: facePoint(t.face, t.ribbon ? -0.3 : 0.25, 1.0, 0.3), lines: t.lines, radius: 2.4, done: false, down: true });
  });

  // ───── آثار الأيادي الصغيرة ─────
  if (plan.handprints.length) {
    const hm = mat({ map: artTexture(handprintArt()), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3 });
    plan.handprints.forEach((h, i) => {
      const a = faceAnchor(h.face);
      group.add(a);
      mesh(g.plane, hm, a, { pos: [h.offset, h.height, 0.007], scale: [0.16, 0.16, 1], rot: [0, 0, h.rot], cast: false });
      if (i === 0) inspect.push({ id: 'hands', pos: facePoint(h.face, h.offset, h.height, 0.1), lines: [{ who: 'me', text: 'آثار يدين صغيرة على الجدار... كلها رايحة باتجاه واحد.' }], radius: 2.2, done: false });
    });
  }

  // ───── الغرض الأساسي ─────
  const item = plan.item;
  const f = item.face;
  const ia = faceAnchor(f);
  group.add(ia);
  let pickupY = 0.9;
  let pickupZ = 0.6;
  let glowAt = [0, 1.1, 0.5];
  const itemGroup = new THREE.Group();
  ia.add(itemGroup);
  if (item.site === 'table') {
    table(f, { flowers: env.flowers });
    const brass = mat({ color: 0xd9b25e, metalness: 0.9, roughness: 0.25, emissive: 0x3a2808, emissiveIntensity: 0.6 });
    itemGroup.position.set(-0.15, 0.86, 0.25);
    mesh(g.torus, brass, itemGroup, { pos: [0, 0, 0], scale: [0.03, 0.03, 0.03], rot: [Math.PI / 2, 0, 0] });
    mesh(g.box, brass, itemGroup, { pos: [0.08, 0, 0], scale: [0.11, 0.012, 0.014] });
    mesh(g.box, brass, itemGroup, { pos: [0.12, 0, 0.012], scale: [0.012, 0.012, 0.03] });
    const tag = mat({ color: 0xb0121c, roughness: 0.6 });
    mesh(g.box, tag, itemGroup, { pos: [-0.05, 0, 0.04], scale: [0.06, 0.008, 0.035], rot: [0, 0.4, 0] });
    pickupY = 0.86;
    pickupZ = 0.35;
    glowAt = [-0.15, 1.15, 0.35];
  } else if (item.site === 'wallPhoto') {
    const pic = picture(f, item.art, { width: 0.95, y: 1.55, tilt: 0.04 });
    itemGroup.add(pic.mesh);
    pickupY = 1.4;
    pickupZ = 0.5;
    glowAt = [0, 1.9, 0.6];
    table(f, { flowers: env.flowers, width: 0.8 });
  } else if (item.site === 'hidden') {
    // كرسي صغير والدمية جالسة بجانبه
    mesh(g.box, mats.darkWood, ia, { pos: [-0.5, 0.22, 0.3], scale: [0.4, 0.44, 0.4] });
    collider(f, 0.25, 0.55, -0.5);
    const fur = mat({ color: 0xe9e1d6, roughness: 0.95, emissive: 0x2a2420, emissiveIntensity: 0.5 });
    const pink = mat({ color: 0xe8b3b8, roughness: 0.95 });
    const red = mat({ color: 0xc0182a, roughness: 0.6 });
    itemGroup.position.set(0.15, 0, 0.35);
    mesh(g.sphere, fur, itemGroup, { pos: [0, 0.1, 0], scale: [0.09, 0.1, 0.08] });
    mesh(g.sphere, fur, itemGroup, { pos: [0, 0.24, 0.01], scale: [0.07, 0.065, 0.065] });
    mesh(g.sphere, fur, itemGroup, { pos: [-0.03, 0.35, 0], scale: [0.018, 0.07, 0.015], rot: [0, 0, 0.2] });
    mesh(g.sphere, fur, itemGroup, { pos: [0.03, 0.35, 0], scale: [0.018, 0.07, 0.015], rot: [0, 0, -0.2] });
    mesh(g.sphere, pink, itemGroup, { pos: [0, 0.23, 0.065], scale: [0.012, 0.009, 0.006], cast: false });
    mesh(g.sphere, red, itemGroup, { pos: [0, 0.18, 0.05], scale: [0.03, 0.015, 0.01], cast: false });
    pickupY = 0.2;
    pickupZ = 0.5;
    glowAt = [0.15, 0.6, 0.6];
  } else if (item.site === 'starDoor') {
    roomDoor(f, 214, { star: true, burnt: true });
    const beadMat = mat({ color: 0xc4141f, roughness: 0.35, emissive: 0x3a0306, emissiveIntensity: 0.8 });
    itemGroup.position.set(0.1, 0.02, 0.55);
    for (let k = 0; k < 14; k++) {
      const ang = (k / 14) * Math.PI * 2;
      mesh(g.sphere, beadMat, itemGroup, { pos: [Math.cos(ang) * 0.06, 0.012, Math.sin(ang) * 0.05], scale: [0.012, 0.012, 0.012], cast: false });
    }
    pickupY = 0.1;
    pickupZ = 0.9;
    glowAt = [0, 0.5, 0.8];
  } else if (item.site === 'room214') {
    roomDoor(f, 214, { open: 1.25, glow: true });
    mesh(g.box, mats.darkWood, ia, { pos: [0.9, 0.38, 0.35], scale: [0.55, 0.76, 0.42] });
    mesh(g.box, mats.wood, ia, { pos: [0.9, 0.78, 0.35], scale: [0.6, 0.04, 0.46] });
    collider(f, 0.32, 0.6, 0.9);
    itemGroup.position.set(0.9, 0.805, 0.35);
    const letter = mat({ map: artTexture(getArt('item-letter')), roughness: 0.9, emissive: 0x221a10, emissiveIntensity: 0.5 });
    const draw = mat({ map: artTexture(getArt('item-drawing')), roughness: 0.9, emissive: 0x101018, emissiveIntensity: 0.5 });
    mesh(g.plane, letter, itemGroup, { pos: [-0.08, 0.002, 0], scale: [0.18, 0.23, 1], rot: [-Math.PI / 2, 0, 0.25], cast: false });
    mesh(g.plane, draw, itemGroup, { pos: [0.1, 0.004, 0.03], scale: [0.24, 0.19, 1], rot: [-Math.PI / 2, 0, -0.15], cast: false });
    pickupY = 0.8;
    pickupZ = 0.8;
    glowAt = [0.6, 1.4, 0.9];
  }
  result.itemMeshes = [itemGroup];
  result.itemPos = facePoint(f, 0, pickupY, pickupZ);
  result.itemGlow = facePoint(f, ...glowAt);
  result.pickup = { pos: facePoint(f, item.site === 'room214' ? 0.6 : 0, 0, item.site === 'starDoor' ? 1.2 : 0.95), radius: item.site === 'starDoor' ? 1.5 : 1.15 };
  const itemBase = itemGroup.position.clone();
  animated.push((dt, time) => {
    if (item.site === 'table' && !reducedMotion) itemGroup.position.y = itemBase.y + Math.sin(time * 2) * 0.01;
  });

  result.update = (dt, time) => animated.forEach((fn) => fn(dt, time));
  return result;
}
