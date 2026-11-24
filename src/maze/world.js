// بناء عالم الفندق ثلاثي الأبعاد: الجدران، الأرضية، السقف، المصابيح، باب المخرج، وتفاصيل القصة.
// المواد والأشكال المشتركة تُنشأ مرة واحدة، وكل ما يخص المرحلة يُحذف من الذاكرة عند الانتقال لمرحلة جديدة.
// حالة الفندق (الإضاءة، الضباب، آثار الحريق...) تتغير حسب المرحلة عبر applyEnv.
import * as THREE from 'three';
import { TILE, WALL_H, RUNNER_W, THEME, LIGHT_POOL_SIZE, LIGHT_RANGE } from './config.js';
import { DIRS } from './mazeGenerator.js';
import { getSharedTextures, createDoorTexture } from './textures.js';
import { shuffle } from './rng.js';
import { buildStoryProps, faceAnchor } from './story/props.js';
import { faceKey } from './story/layout.js';
import { artTexture, sootArt } from './story/art.js';

const HALF = TILE / 2;
const tileCenter = (x, z) => new THREE.Vector3((x + 0.5) * TILE, 0, (z + 0.5) * TILE);
const faceYaw = (d) => Math.atan2(-d.dx, -d.dz); // يجعل وجه الشكل (+Z) يقابل الممر

const LAMP_HEIGHT = 2.05;

export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.level = null;
    this.disposables = [];
    this.colliders = [];
    this.sconcePositions = [];
    this.sconcePhase = [];
    this.lightTimer = 0;
    this.doorOpen = 0;
    this.doorOpening = false;
    this.exitInfo = null;
    this.story = null;
    this.env = { lampIntensity: 7, flicker: 'soft' };

    const tex = getSharedTextures();
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    [tex.wall.map, tex.floor, tex.carpet, tex.ceiling.map].forEach((t) => (t.anisotropy = aniso));
    this.tex = tex;

    this.mats = {
      wall: new THREE.MeshStandardMaterial({ map: tex.wall.map, bumpMap: tex.wall.bump, bumpScale: 1.5, roughness: 0.82 }),
      floor: new THREE.MeshStandardMaterial({ map: tex.floor, roughness: 0.55, metalness: 0.05 }),
      carpet: new THREE.MeshStandardMaterial({ map: tex.carpet, roughness: 1 }),
      border: new THREE.MeshStandardMaterial({ map: tex.carpetBorder, roughness: 0.6, metalness: 0.25 }),
      ceiling: new THREE.MeshStandardMaterial({
        map: tex.ceiling.map,
        emissiveMap: tex.ceiling.emissive,
        emissive: 0xffffff,
        emissiveIntensity: 2.2,
        roughness: 0.9,
      }),
      gold: new THREE.MeshStandardMaterial({ color: THEME.gold, metalness: 0.85, roughness: 0.32 }),
      shade: new THREE.MeshStandardMaterial({
        color: 0xf6e3c4,
        emissive: THEME.lamp,
        emissiveIntensity: 1.6,
        roughness: 0.6,
        side: THREE.DoubleSide,
      }),
      darkWood: new THREE.MeshStandardMaterial({ color: THEME.woodDark, roughness: 0.55 }),
      wood: new THREE.MeshStandardMaterial({ color: THEME.woodLight, roughness: 0.45, metalness: 0.05 }),
      vase: new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 0.25, metalness: 0.1 }),
      sign: new THREE.MeshStandardMaterial({
        map: tex.sign,
        emissiveMap: tex.sign,
        emissive: 0xffffff,
        emissiveIntensity: 0.85,
        roughness: 0.4,
      }),
      portal: new THREE.MeshBasicMaterial({ map: tex.portal, color: new THREE.Color(1.9, 1.45, 0.95), fog: false }),
      soot: new THREE.MeshStandardMaterial({ map: artTexture(sootArt()), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }),
    };

    const wallGeo = new THREE.BoxGeometry(TILE, WALL_H, TILE);
    wallGeo.translate(0, WALL_H / 2, 0);
    this.geoms = {
      wall: wallGeo,
      backplate: new THREE.BoxGeometry(0.13, 0.26, 0.03),
      arm: new THREE.BoxGeometry(0.03, 0.03, 0.16),
      shade: new THREE.CylinderGeometry(0.075, 0.11, 0.17, 18, 1, true),
      plane: new THREE.PlaneGeometry(1, 1),
    };

    // إضاءة عامة خافتة
    this.hemi = new THREE.HemisphereLight(THEME.hemiSky, THEME.hemiGround, THEME.hemiIntensity);
    scene.add(this.hemi);

    // مجموعة ثابتة من أضواء الجدار تنتقل لأقرب المصابيح من اللاعب.
    // العدد ثابت دائمًا حتى لا يُعاد بناء الـ shaders أثناء اللعب.
    this.pool = [];
    for (let i = 0; i < LIGHT_POOL_SIZE; i++) {
      const l = new THREE.PointLight(THEME.lamp, 0, 9, 2);
      l.userData.target = -1;
      scene.add(l);
      this.pool.push(l);
    }

    // ضوء خافت فوق الغرض الأساسي حتى يلفت النظر
    this.itemLight = new THREE.PointLight(0xffe2b0, 0, 4.5, 2);
    scene.add(this.itemLight);

    // إضاءة المخرج: ضوء نقطي + ضوء موجّه بظلال
    this.exitLight = new THREE.PointLight(THEME.exitLight, 0, 10, 2);
    this.exitSpot = new THREE.SpotLight(THEME.exitLight, 0, 13, 0.8, 0.65, 2);
    this.exitSpot.castShadow = true;
    this.exitSpot.shadow.mapSize.set(1024, 1024);
    this.exitSpot.shadow.bias = -0.0004;
    this.exitSpot.shadow.normalBias = 0.02;
    this.exitSpot.shadow.radius = 3;
    this.exitSpot.shadow.camera.near = 0.2;
    scene.add(this.exitLight, this.exitSpot, this.exitSpot.target);

    // ذرات غبار تطفو في الضوء (رماد في المرحلة الرابعة)
    const DUST = 260;
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(DUST * 3), 3));
    this.dustVel = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      this.dustVel[i * 3] = (Math.random() - 0.5) * 0.06;
      this.dustVel[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
      this.dustVel[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
    }
    this.dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        map: tex.dust,
        size: 0.035,
        color: 0xffd6a8,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.dust.frustumCulled = false;
    this.dustSeeded = false;
    scene.add(this.dust);
  }

  // حالة الفندق في المرحلة: الإضاءة، الضباب، لون الجدران
  applyEnv(env) {
    this.env = env;
    for (const l of this.pool) l.color.setHex(env.lamp);
    this.mats.shade.emissive.setHex(env.lamp);
    this.mats.shade.emissiveIntensity = env.soot ? 2.2 : 1.6;
    this.hemi.color.setHex(env.hemi);
    this.hemi.intensity = env.hemiIntensity;
    this.scene.fog.color.setHex(env.fog);
    this.scene.fog.density = env.fogDensity;
    this.scene.background.setHex(env.fog);
    this.mats.ceiling.emissiveIntensity = env.ceiling;
    this.mats.wall.color.setHex(env.wallTint);
    this.mats.carpet.color.setHex(env.soot ? 0x8a7470 : 0xffffff);
    this.dust.material.color.setHex(env.soot ? 0x9a8a80 : 0xffd6a8);
    this.dust.material.opacity = env.soot ? 0.8 : 0.55;
    this.dust.material.size = env.soot ? 0.045 : 0.035;
    this.renderer.toneMappingExposure = env.exposure;
  }

  // بناء مرحلة جديدة حسب مخطط القصة
  build(maze, rng, stage, plan, { reducedMotion = false } = {}) {
    this.clear();
    this.applyEnv(stage.env);
    const group = new THREE.Group();
    group.name = 'level';
    this.level = group;
    this.scene.add(group);
    const own = (o) => {
      this.disposables.push(o);
      return o;
    };
    const { W, H, isWall } = maze;
    const open = (x, z) => !isWall(x, z);

    // الأرضية والسقف
    const floorGeo = own(new THREE.PlaneGeometry(W * TILE, H * TILE));
    floorGeo.rotateX(-Math.PI / 2);
    floorGeo.translate((W * TILE) / 2, 0, (H * TILE) / 2);
    this.tex.floor.repeat.set((W * TILE) / 2.2, (H * TILE) / 2.2);
    const floor = new THREE.Mesh(floorGeo, this.mats.floor);
    floor.receiveShadow = true;
    group.add(floor);

    const ceilGeo = own(new THREE.PlaneGeometry(W * TILE, H * TILE));
    ceilGeo.rotateX(Math.PI / 2);
    ceilGeo.translate((W * TILE) / 2, WALL_H, (H * TILE) / 2);
    this.tex.ceiling.map.repeat.set(W, H);
    this.tex.ceiling.emissive.repeat.set(W, H);
    group.add(new THREE.Mesh(ceilGeo, this.mats.ceiling));

    // الجدران: فقط المربعات الملاصقة لممر (الباقي لا يُرى)
    const wallTiles = [];
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        if (!isWall(x, z)) continue;
        if (DIRS.some((d) => {
          const nx = x + d.dx;
          const nz = z + d.dz;
          return nx >= 0 && nz >= 0 && nx < W && nz < H && open(nx, nz);
        })) wallTiles.push([x, z]);
      }
    }
    const walls = own(new THREE.InstancedMesh(this.geoms.wall, this.mats.wall, wallTiles.length));
    const m = new THREE.Matrix4();
    wallTiles.forEach(([x, z], i) => {
      m.makeTranslation((x + 0.5) * TILE, 0, (z + 0.5) * TILE);
      walls.setMatrixAt(i, m);
    });
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // السجادة الحمراء بحوافها الذهبية
    const { carpet, border } = buildCarpet(maze, open);
    const carpetMesh = new THREE.Mesh(own(carpet), this.mats.carpet);
    const borderMesh = new THREE.Mesh(own(border), this.mats.border);
    carpetMesh.receiveShadow = borderMesh.receiveShadow = true;
    group.add(carpetMesh, borderMesh);

    // تفاصيل القصة أولًا (اللوحات، الأبواب، الغرض...)، ثم المصابيح على الجدران الباقية
    this.colliders = [];
    this.story = buildStoryProps(plan, maze, {
      group,
      own,
      mats: this.mats,
      colliders: this.colliders,
      reducedMotion,
    });

    const exit = maze.exit;
    const faces = [];
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        if (!open(x, z)) continue;
        for (const d of DIRS) {
          if (!isWall(x + d.dx, z + d.dz)) continue;
          if (x === exit.x && z === exit.z && d === exit.dir) continue;
          const f = { x, z, d };
          if (plan.usedFaces.has(faceKey(f))) continue;
          faces.push(f);
        }
      }
    }
    shuffle(faces, rng);
    // مصابيح مضمونة: عند البداية وقرب الغرض الأساسي
    const priority = (f) => (f.x === maze.start.x && f.z === maze.start.z) || (f.x === plan.item.face.x && f.z === plan.item.face.z);
    faces.sort((a, b) => Number(priority(b)) - Number(priority(a)));
    const sconces = faces.filter((f, i) => priority(f) || rng() < 0.4 || i === 0);

    const faceMatrix = (f, out) => {
      const c = tileCenter(f.x, f.z);
      c.x += f.d.dx * HALF;
      c.z += f.d.dz * HALF;
      out.compose(c, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), faceYaw(f.d)), new THREE.Vector3(1, 1, 1));
      return out;
    };
    const local = new THREE.Matrix4();
    const base = new THREE.Matrix4();
    const tmp = new THREE.Matrix4();
    const parts = [
      { geo: this.geoms.backplate, mat: this.mats.gold, at: [0, LAMP_HEIGHT, 0.015] },
      { geo: this.geoms.arm, mat: this.mats.gold, at: [0, LAMP_HEIGHT - 0.06, 0.09] },
      { geo: this.geoms.shade, mat: this.mats.shade, at: [0, LAMP_HEIGHT + 0.04, 0.18] },
    ];
    this.sconcePositions = [];
    this.sconcePhase = [];
    for (const p of parts) {
      const mesh = own(new THREE.InstancedMesh(p.geo, p.mat, Math.max(1, sconces.length)));
      mesh.count = sconces.length;
      local.makeTranslation(...p.at);
      sconces.forEach((f, i) => mesh.setMatrixAt(i, tmp.multiplyMatrices(faceMatrix(f, base), local)));
      mesh.castShadow = p.geo !== this.geoms.shade;
      group.add(mesh);
    }
    sconces.forEach((f) => {
      const c = tileCenter(f.x, f.z);
      c.x += f.d.dx * (HALF - 0.32);
      c.z += f.d.dz * (HALF - 0.32);
      c.y = LAMP_HEIGHT + 0.05;
      this.sconcePositions.push(c);
      this.sconcePhase.push(rng() * Math.PI * 2);
      // آثار دخان فوق المصابيح في المرحلة الرابعة
      if (stage.env.soot) {
        const a = faceAnchor(f);
        group.add(a);
        const s = new THREE.Mesh(this.geoms.plane, this.mats.soot);
        s.position.set(0, LAMP_HEIGHT + 0.65, 0.006);
        s.scale.set(1.2, 1.4, 1);
        a.add(s);
      }
    });

    // ضوء الغرض
    this.itemLight.position.copy(this.story.itemGlow);
    this.itemLight.intensity = 2.2;
    this.itemLight.color.setHex(stage.env.soot ? 0xffa070 : 0xffe2b0);

    // باب المخرج
    this.buildExit(maze, stage.rooms.exitDoor, own);
    return { colliders: this.colliders };
  }

  buildExit(maze, doorNumber, own) {
    const e = maze.exit;
    const d = e.dir;
    const c = tileCenter(e.x, e.z);
    const door = new THREE.Group();
    door.position.set(c.x + d.dx * HALF, 0, c.z + d.dz * HALF);
    door.rotation.y = faceYaw(d);
    this.level.add(door);

    const doorW = 1.15;
    const doorH = 2.35;
    const jamb = own(new THREE.BoxGeometry(0.13, doorH + 0.14, 0.1));
    const head = own(new THREE.BoxGeometry(doorW + 0.39, 0.15, 0.11));
    for (const sx of [-1, 1]) {
      const j = new THREE.Mesh(jamb, this.mats.darkWood);
      j.position.set(sx * (doorW / 2 + 0.065), (doorH + 0.14) / 2, 0.05);
      j.castShadow = true;
      door.add(j);
    }
    const h = new THREE.Mesh(head, this.mats.darkWood);
    h.position.set(0, doorH + 0.14, 0.055);
    door.add(h);

    // الضوء خلف الباب (يظهر عند الفتح)
    const portal = new THREE.Mesh(own(new THREE.PlaneGeometry(doorW, doorH)), this.mats.portal);
    portal.position.set(0, doorH / 2, 0.004);
    door.add(portal);

    const doorTex = own(createDoorTexture(doorNumber));
    const doorFace = own(new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.42, metalness: 0.05 }));
    const panelGeo = own(new THREE.BoxGeometry(doorW, doorH, 0.06));
    panelGeo.translate(doorW / 2, doorH / 2, 0);
    const panel = new THREE.Mesh(panelGeo, [this.mats.darkWood, this.mats.darkWood, this.mats.darkWood, this.mats.darkWood, doorFace, doorFace]);
    panel.castShadow = true;
    const hinge = new THREE.Group();
    hinge.position.set(-doorW / 2, 0, 0.036);
    hinge.add(panel);
    const knob = new THREE.Mesh(own(new THREE.SphereGeometry(0.045, 16, 12)), this.mats.gold);
    knob.position.set(doorW - 0.13, 1.05, 0.06);
    hinge.add(knob);
    door.add(hinge);
    this.hinge = hinge;

    // لافتة EXIT المضيئة
    const signGeo = own(new THREE.BoxGeometry(1.05, 0.26, 0.07));
    const sign = new THREE.Mesh(signGeo, [this.mats.gold, this.mats.gold, this.mats.gold, this.mats.gold, this.mats.sign, this.mats.gold]);
    sign.position.set(0, doorH + 0.52, 0.06);
    door.add(sign);

    // وضع أضواء المخرج
    door.updateMatrixWorld(true);
    const toWorld = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(door.matrixWorld);
    this.exitLight.position.copy(toWorld(0, 2.3, 1.1));
    this.exitLight.intensity = 9;
    this.exitSpot.position.copy(toWorld(0, 3.08, 0.45));
    this.exitSpot.target.position.copy(toWorld(0, 0, 2.4));
    this.exitSpot.target.updateMatrixWorld();
    this.exitSpot.intensity = 26;

    this.doorOpen = 0;
    this.doorOpening = false;
    this.hinge.rotation.y = 0;
    this.exitInfo = {
      // نقطة أمام الباب يكفي الوصول إليها
      trigger: toWorld(0, 0, 0.35),
      front: toWorld(0, 0, 1.6),
      // مشهد النهاية: البطل يقف على بعد خطوات، وليان بينه وبين الباب
      stand: toWorld(0, 0, 2.6),
      layanSpot: toWorld(0, 0, 1.15),
      lookAt: toWorld(0, 1.5, 0),
      center: c,
    };
  }

  openDoor(instant = false) {
    this.doorOpening = true;
    if (instant) this.doorOpen = 1;
  }

  hideItem() {
    if (!this.story) return;
    this.story.itemMeshes.forEach((m) => (m.visible = false));
    this.itemLight.intensity = 0;
  }

  // تحديث كل إطار: الأضواء القريبة، الوميض، الغبار، وفتح الباب
  update(dt, time, playerPos, reducedMotion) {
    this.lightTimer -= dt;
    if (this.lightTimer <= 0) {
      this.lightTimer = 0.15;
      this.assignLights(playerPos);
    }
    const strong = this.env.flicker === 'strong';
    const none = this.env.flicker === 'none';
    for (const l of this.pool) {
      const i = l.userData.target;
      if (i < 0) {
        l.intensity = 0;
        continue;
      }
      const dist = l.position.distanceTo(playerPos);
      const fade = THREE.MathUtils.clamp((LIGHT_RANGE - dist) / 4, 0, 1);
      let flicker = 1;
      if (!reducedMotion && !none) {
        const ph = this.sconcePhase[i];
        flicker = 1 + 0.035 * Math.sin(time * 11 + ph) + 0.025 * Math.sin(time * 23.7 + ph * 2);
        if (i % 7 === 3 && Math.sin(time * 0.9 + ph) > 0.985) flicker *= 0.35; // مصباح متعب يرمش أحيانًا
        if (strong) {
          flicker *= 0.75 + 0.25 * Math.sin(time * 3.1 + ph);
          if (Math.sin(time * 1.7 + ph * 3) > 0.93) flicker *= 0.15;
        }
      }
      l.intensity = this.env.lampIntensity * fade * flicker;
    }

    if (!reducedMotion) this.mats.sign.emissiveIntensity = 0.85 + Math.sin(time * 2.2) * 0.1;
    if (this.itemLight.intensity > 0 && !reducedMotion) this.itemLight.intensity = 2 + Math.sin(time * 2.4) * 0.5;

    if (this.doorOpening && this.hinge) {
      this.doorOpen = reducedMotion ? 1 : Math.min(1, this.doorOpen + dt / 1.1);
      const k = 1 - Math.pow(1 - this.doorOpen, 3);
      this.hinge.rotation.y = -1.45 * k;
      this.exitLight.intensity = 9 + 16 * k;
    }

    this.story?.update(dt, time);
    this.updateDust(dt, playerPos, reducedMotion);
  }

  assignLights(playerPos) {
    const list = [];
    for (let i = 0; i < this.sconcePositions.length; i++) {
      const p = this.sconcePositions[i];
      const dx = p.x - playerPos.x;
      const dz = p.z - playerPos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < (LIGHT_RANGE + 2) ** 2) list.push([d2, i]);
    }
    list.sort((a, b) => a[0] - b[0]);
    const wanted = list.slice(0, this.pool.length).map((e) => e[1]);
    // نبقي الضوء على مصباحه إن كان ما يزال مطلوبًا لتجنب القفزات
    const free = [];
    for (const l of this.pool) {
      const idx = wanted.indexOf(l.userData.target);
      if (idx >= 0) wanted[idx] = -2;
      else free.push(l);
    }
    for (const target of wanted) {
      if (target < 0) continue;
      const l = free.pop();
      if (!l) break;
      l.userData.target = target;
      l.position.copy(this.sconcePositions[target]);
    }
    for (const l of free) l.userData.target = -1;
  }

  updateDust(dt, center, reducedMotion) {
    const pos = this.dust.geometry.attributes.position;
    const a = pos.array;
    const R = 6;
    if (!this.dustSeeded) {
      for (let i = 0; i < a.length; i += 3) {
        a[i] = center.x + (Math.random() - 0.5) * R * 2;
        a[i + 1] = Math.random() * WALL_H;
        a[i + 2] = center.z + (Math.random() - 0.5) * R * 2;
      }
      this.dustSeeded = true;
    }
    const move = reducedMotion ? 0 : dt;
    for (let i = 0; i < a.length; i += 3) {
      a[i] += this.dustVel[i] * move;
      a[i + 1] += this.dustVel[i + 1] * move;
      a[i + 2] += this.dustVel[i + 2] * move;
      if (a[i] - center.x > R) a[i] -= R * 2;
      else if (center.x - a[i] > R) a[i] += R * 2;
      if (a[i + 2] - center.z > R) a[i + 2] -= R * 2;
      else if (center.z - a[i + 2] > R) a[i + 2] += R * 2;
      if (a[i + 1] < 0.05) a[i + 1] = WALL_H - 0.1;
      else if (a[i + 1] > WALL_H - 0.05) a[i + 1] = 0.1;
    }
    pos.needsUpdate = true;
  }

  // حذف كل ما يخص المرحلة الحالية من الذاكرة (المواد المشتركة والرسومات تبقى)
  clear() {
    if (this.level) {
      this.scene.remove(this.level);
      this.level = null;
    }
    for (const o of this.disposables) o.dispose();
    this.disposables = [];
    this.hinge = null;
    this.story = null;
    this.colliders = [];
    this.sconcePositions = [];
    for (const l of this.pool) {
      l.userData.target = -1;
      l.intensity = 0;
    }
    this.itemLight.intensity = 0;
    this.exitLight.intensity = 0;
    this.exitSpot.intensity = 0;
    this.dustSeeded = false;
  }
}

// السجادة: مربع في وسط كل خانة + امتداد نحو كل ممر مفتوح، وحواف ذهبية حيث لا يوجد امتداد
function buildCarpet(maze, open) {
  const R = RUNNER_W / 2;
  const B = 0.09;
  const P = [];
  const U = [];
  const I = [];
  const bP = [];
  const bU = [];
  const bI = [];
  const quad = (pos, uv, idx, x0, z0, x1, z1, y, uvFn) => {
    const base = pos.length / 3;
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) {
      pos.push(x, y, z);
      uv.push(...uvFn(x, z));
    }
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  };
  const carpetUv = (x, z) => [x / 1.5, z / 1.5];
  const stripX = (z0) => (x, z) => [x / 0.45, (z - z0) / B]; // شريط ممتد على محور X
  const stripZ = (x0) => (x, z) => [z / 0.45, (x - x0) / B]; // شريط ممتد على محور Z
  const y = 0.008;
  const yx = 0.011;
  const yz = 0.0115;

  for (let z = 0; z < maze.H; z++) {
    for (let x = 0; x < maze.W; x++) {
      if (!open(x, z)) continue;
      const cx = (x + 0.5) * TILE;
      const cz = (z + 0.5) * TILE;
      quad(P, U, I, cx - R, cz - R, cx + R, cz + R, y, carpetUv);
      for (const d of DIRS) {
        const isOpen = open(x + d.dx, z + d.dz);
        if (d.dx !== 0) {
          const xa = cx + d.dx * R;
          const xb = cx + d.dx * HALF;
          const x0 = Math.min(xa, xb);
          const x1 = Math.max(xa, xb);
          if (isOpen) {
            quad(P, U, I, x0, cz - R, x1, cz + R, y, carpetUv);
            quad(bP, bU, bI, x0, cz - R, x1, cz - R + B, yx, stripX(cz - R));
            quad(bP, bU, bI, x0, cz + R - B, x1, cz + R, yx, stripX(cz + R - B));
          } else {
            const s0 = d.dx > 0 ? cx + R - B : cx - R;
            quad(bP, bU, bI, s0, cz - R, s0 + B, cz + R, yz, stripZ(s0));
          }
        } else {
          const za = cz + d.dz * R;
          const zb = cz + d.dz * HALF;
          const z0 = Math.min(za, zb);
          const z1 = Math.max(za, zb);
          if (isOpen) {
            quad(P, U, I, cx - R, z0, cx + R, z1, y, carpetUv);
            quad(bP, bU, bI, cx - R, z0, cx - R + B, z1, yz, stripZ(cx - R));
            quad(bP, bU, bI, cx + R - B, z0, cx + R, z1, yz, stripZ(cx + R - B));
          } else {
            const s0 = d.dz > 0 ? cz + R - B : cz - R;
            quad(bP, bU, bI, cx - R, s0, cx + R, s0 + B, yx, stripX(s0));
          }
        }
      }
    }
  }
  const make = (pos, uv, idx) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  return { carpet: make(P, U, I), border: make(bP, bU, bI) };
}
