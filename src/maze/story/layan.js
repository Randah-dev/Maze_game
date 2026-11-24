// ليان: طفلة بفستان فاتح مخطط وقبعة سوداء عريضة عليها شريطة حمراء.
// لا يظهر وجهها أبدًا: تُرى دائمًا من الخلف، تمشي أو تقف مديرة ظهرها للاعب، ويبقى حضورها غامضًا.
import * as THREE from 'three';

function dressTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ece6da';
  ctx.fillRect(0, 0, 256, 256);
  // خطوط عمودية ونقاط صغيرة مثل فستان قطني قديم
  for (let x = 0; x < 256; x += 16) {
    ctx.fillStyle = 'rgba(70,60,55,0.55)';
    ctx.fillRect(x, 0, 4, 256);
  }
  for (let y = 8; y < 256; y += 24) {
    for (let x = 8; x < 256; x += 16) {
      ctx.fillStyle = 'rgba(150,40,40,0.35)';
      ctx.beginPath();
      ctx.arc(x, y + (x % 32 ? 12 : 0), 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

export class Layan {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.visible = false;
    scene.add(this.root);
    this.opacity = 0;
    this.targetOpacity = 0;
    this.maxOpacity = 0.8;
    this.mode = null;
    this.t = 0;

    this.dressTex = dressTexture();
    const ghost = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.85, transparent: true, opacity: 0, depthWrite: false, ...opts });
    this.mats = {
      dress: ghost({ map: this.dressTex, color: 0xffffff, emissive: 0x4a443e, emissiveIntensity: 0.7 }),
      skin: ghost({ color: 0xc9a88a, emissive: 0x20140c, emissiveIntensity: 0.3 }),
      hair: ghost({ color: 0x24170f }),
      hat: ghost({ color: 0x141012, roughness: 0.7 }),
      red: ghost({ color: 0xb8121e, emissive: 0x3a0306, emissiveIntensity: 0.5 }),
      shoe: ghost({ color: 0x1a1414 }),
    };
    this.allMats = Object.values(this.mats);

    // فستان بطول الركبة
    const profile = [[0, 0.98], [0.07, 0.96], [0.1, 0.86], [0.115, 0.72], [0.19, 0.48], [0.22, 0.44], [0, 0.44]].map(([x, y]) => new THREE.Vector2(x, y));
    this.geos = [
      new THREE.LatheGeometry(profile, 28),
      new THREE.SphereGeometry(1, 20, 16),
      new THREE.CylinderGeometry(1, 1, 1, 16),
      new THREE.CylinderGeometry(1, 1, 1, 32),
    ];
    const [dressG, sphereG, cylG, discG] = this.geos;
    const add = (geo, mat, parent, pos, scale, rot = [0, 0, 0]) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...pos);
      m.scale.set(...scale);
      m.rotation.set(...rot);
      parent.add(m);
      return m;
    };

    const body = new THREE.Group();
    this.root.add(body);
    this.body = body;
    body.add(new THREE.Mesh(dressG, this.mats.dress));

    // الرأس: شعر من الخلف، وقبعة عريضة تخفي الوجه حتى من الجنب
    const head = new THREE.Group();
    head.position.set(0, 1.08, 0);
    body.add(head);
    add(sphereG, this.mats.hair, head, [0, 0, 0], [0.1, 0.11, 0.1]);
    add(cylG, this.mats.hair, head, [0, -0.1, -0.045], [0.085, 0.16, 0.05]); // شعر نازل على الظهر
    add(discG, this.mats.hat, head, [0, 0.06, 0.01], [0.23, 0.012, 0.23], [0.06, 0, 0]); // حافة القبعة
    add(cylG, this.mats.hat, head, [0, 0.12, 0], [0.095, 0.11, 0.095]); // تاج القبعة
    add(cylG, this.mats.red, head, [0, 0.085, 0], [0.098, 0.025, 0.098]); // شريطة حمراء حول القبعة
    add(sphereG, this.mats.red, head, [0.07, 0.085, -0.07], [0.03, 0.02, 0.02], [0, 0.8, 0]); // عقدة الشريطة

    // الذراعان والساقان
    const limb = (x, y, len, mat) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      body.add(pivot);
      add(cylG, mat, pivot, [0, -len / 2, 0], [0.024, len, 0.024]);
      return pivot;
    };
    this.armL = limb(-0.13, 0.9, 0.34, this.mats.skin);
    this.armR = limb(0.13, 0.9, 0.34, this.mats.skin);
    this.legL = limb(-0.06, 0.46, 0.42, this.mats.skin);
    this.legR = limb(0.06, 0.46, 0.42, this.mats.skin);
    for (const leg of [this.legL, this.legR]) add(sphereG, this.mats.shoe, leg, [0, -0.43, 0.02], [0.035, 0.025, 0.055]);
    this.restArms();
  }

  restArms() {
    this.armL.rotation.set(0, 0, 0.12);
    this.armR.rotation.set(0, 0, -0.12);
  }

  // تظهر في مكان، مديرة ظهرها للاعب
  appear(pos, playerPos, { mode = 'stand', clarity = 0.6, runDir = null, pointTo = null, faceTo = null } = {}) {
    this.root.position.set(pos.x, 0, pos.z);
    this.mode = mode;
    this.t = 0;
    this.maxOpacity = clarity;
    this.targetOpacity = clarity;
    this.opacity = mode === 'run' ? clarity * 0.6 : 0;
    this.fadeSpeed = 1;
    this.root.visible = true;
    this.runDir = runDir ? new THREE.Vector3(runDir.dx, 0, runDir.dz) : null;
    this.pointTo = pointTo;
    this.walkDir = null;
    this.restArms();
    if (mode === 'run' && this.runDir) this.face(this.root.position.clone().add(this.runDir));
    else if (faceTo) this.face(faceTo);
    else this.faceAway(playerPos);
  }

  face(target) {
    const dx = target.x - this.root.position.x;
    const dz = target.z - this.root.position.z;
    this.root.rotation.y = Math.atan2(dx, dz);
  }

  // تعطي اللاعب ظهرها
  faceAway(playerPos) {
    const dx = this.root.position.x - playerPos.x;
    const dz = this.root.position.z - playerPos.z;
    this.root.rotation.y = Math.atan2(dx, dz);
  }

  // تمشي بهدوء نحو نقطة ثم تختفي
  walkAway(target, speed = 0.7) {
    const d = new THREE.Vector3(target.x - this.root.position.x, 0, target.z - this.root.position.z);
    if (d.lengthSq() < 0.0001) return;
    this.walkDir = d.normalize().multiplyScalar(speed);
    this.face(target);
  }

  vanish(speed = 1) {
    this.targetOpacity = 0;
    this.fadeSpeed = speed;
  }

  get active() {
    return this.root.visible;
  }

  update(dt, playerPos, reducedMotion) {
    if (!this.root.visible) return;
    this.t += dt;
    const fade = this.targetOpacity > this.opacity ? 1.6 : 1.4 * (this.fadeSpeed || 1);
    this.opacity += Math.sign(this.targetOpacity - this.opacity) * Math.min(Math.abs(this.targetOpacity - this.opacity), dt * fade);
    // وميض خفيف كأنها ذكرى
    const shimmer = reducedMotion ? 1 : 0.88 + Math.sin(this.t * 7.3) * 0.06 + Math.sin(this.t * 2.1) * 0.06;
    for (const m of this.allMats) m.opacity = this.opacity * shimmer;
    if (this.opacity <= 0.001 && this.targetOpacity === 0) {
      this.hide();
      return;
    }

    const swing = reducedMotion ? 0 : 1;
    const step = (speed) => {
      const s = Math.sin(this.t * speed) * (speed > 10 ? 0.7 : 0.35) * swing;
      this.legL.rotation.x = s;
      this.legR.rotation.x = -s;
      this.armL.rotation.x = -s * 0.8;
      this.armR.rotation.x = s * 0.8;
      this.body.position.y = Math.abs(Math.sin(this.t * speed)) * (speed > 10 ? 0.04 : 0.015) * swing;
    };

    if (this.mode === 'run') {
      if (this.runDir) this.root.position.addScaledVector(this.runDir, dt * 2.4);
      step(12);
      if (this.t > 0.9) this.vanish(1.6);
      return;
    }
    if (this.walkDir) {
      this.root.position.addScaledVector(this.walkDir, dt);
      step(6);
      return;
    }
    this.legL.rotation.x = 0;
    this.legR.rotation.x = 0;
    this.body.position.y = Math.sin(this.t * 1.6) * 0.008 * swing;
    if (this.mode === 'scared') {
      // ظهرها لنا، ترتجف وتضم يديها لصدرها
      this.faceAway(playerPos);
      this.armL.rotation.set(-1.1, 0, 0.6);
      this.armR.rotation.set(-1.1, 0, -0.6);
      this.root.position.x += Math.sin(this.t * 40) * 0.0015 * swing;
    } else if (this.mode === 'point' && this.pointTo) {
      // تقف مديرة ظهرها، ثم تلتفت نحو الغرفة وتؤشر عليها
      if (this.t < 2.2) this.faceAway(playerPos);
      else {
        this.face(this.pointTo);
        this.armR.rotation.set(-1.45, 0, -0.1);
      }
    } else if (this.mode === 'final') {
      // وجهها للباب، وتمد يدها للخلف نحو البطل
      const k = Math.min(1, this.t / 1.4);
      this.armR.rotation.set(0.55 * k, 0, -0.12 - 0.25 * k);
    } else {
      this.faceAway(playerPos);
    }
  }

  hide() {
    this.root.visible = false;
    this.opacity = 0;
    this.targetOpacity = 0;
    this.mode = null;
    this.walkDir = null;
  }
}
