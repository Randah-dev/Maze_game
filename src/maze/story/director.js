// "مخرج" القصة أثناء اللعب: يراقب مكان اللاعب ونظرته، ويشغّل الأحداث والحوارات وظهور ليان مرة واحدة فقط.
import * as THREE from 'three';
import { TILE, EYE_H } from '../config.js';
import { SPEAKERS, LOCKED_DOOR_LINE } from './stages.js';

const VOICED = new Set(['layan', 'girl', 'child', 'mom', 'young', 'far']);

export class Director {
  constructor({ ui, audio, world, layan, hooks }) {
    this.ui = ui;
    this.audio = audio;
    this.world = world;
    this.layan = layan;
    this.hooks = hooks;
    this.queue = [];
    this.current = null;
    this.reset();
  }

  reset() {
    this.stage = null;
    this.plan = null;
    this.maze = null;
    this.time = 0;
    this.itemCollected = false;
    this.layanDone = false;
    this.layanShownAt = 0;
    this.lockedCooldown = 0;
    this.itemSound = null;
    this.clockSound = null;
    this.firedEvents = new Set();
    this.queue = [];
    this.current = null;
    this.busy = false;
  }

  start(stage, plan, maze) {
    this.stop();
    this.reset();
    this.stage = stage;
    this.plan = plan;
    this.maze = maze;
    this.audio.setAmbience(stage.env.ambience);
    const clock = this.world.story?.clock;
    if (clock) this.clockSound = this.audio.spatialSource(stage.env.clock === 'stopped' ? 'stuckClock' : 'clock', clock.pos);
    this.ui.setObjective(stage.objective.find);
  }

  stop() {
    this.audio.stopAllStageSounds();
    this.layan.hide();
    this.queue = [];
    this.current = null;
    this.ui.clearSubtitle();
  }

  // ───── الحوارات (تظهر بالترتيب، وكل جملة لها مدة حسب طولها) ─────
  say(lines, onDone) {
    lines.forEach((l, i) => this.queue.push({ ...l, onDone: i === lines.length - 1 ? onDone : null }));
  }

  skipLine() {
    if (this.current) this.current.left = 0;
  }

  tickDialogue(dt) {
    if (this.current) {
      this.current.left -= dt;
      if (this.current.left > 0) return;
      const done = this.current.onDone;
      this.current = null;
      this.ui.clearSubtitle();
      done?.();
    }
    if (!this.current && this.queue.length) {
      const l = this.queue.shift();
      const len = l.text.length;
      this.current = { ...l, left: Math.min(7, Math.max(2.4, 1.6 + len * 0.06)) };
      this.ui.subtitle(SPEAKERS[l.who] ?? '', l.text, l.who);
      if (VOICED.has(l.who)) {
        this.audio.playVoice(l.text).then((played) => {
          if (!played) this.audio.whisper();
        });
      }
    }
  }

  get talking() {
    return !!this.current || this.queue.length > 0;
  }

  // ───── التحديث أثناء اللعب ─────
  update(dt, player, camera) {
    if (!this.stage || this.busy) return;
    this.time += dt;
    this.lockedCooldown -= dt;
    const pos = player.pos;
    const plan = this.plan;
    const maze = this.maze;
    const tile = { x: Math.floor(pos.x / TILE), z: Math.floor(pos.z / TILE) };

    // اتجاه النظر
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    const eye = new THREE.Vector3(pos.x, EYE_H, pos.z);
    const looking = (target, cos = 0.8) => {
      const v = target.clone().sub(eye).normalize();
      return v.dot(fwd) > cos;
    };

    // 1) تفاصيل يتفحصها اللاعب بالاقتراب والنظر (مرة واحدة لكل شيء)
    if (this.queue.length < 2) {
      for (const it of this.world.story.inspect) {
        if (it.done) continue;
        const dx = it.pos.x - pos.x;
        const dz = it.pos.z - pos.z;
        if (dx * dx + dz * dz > it.radius * it.radius) continue;
        if (!looking(it.pos, 0.78)) continue;
        it.done = true;
        if (it.sound === 'record') this.audio.record(3);
        this.say(it.lines);
        break;
      }
    }

    // 2) الأحداث (بالوقت أو بالتقدم في الطريق)
    for (const ev of plan.events) {
      if (this.firedEvents.has(ev)) continue;
      let fire = false;
      if (ev.at != null) fire = this.time >= ev.at;
      else {
        const t = plan.path[ev.index];
        fire = Math.abs(t.x - tile.x) <= 1 && Math.abs(t.z - tile.z) <= 1 && !maze.isWall(tile.x, tile.z);
      }
      if (!fire) continue;
      this.firedEvents.add(ev);
      this.playEventSound(ev.sound);
      if (ev.startItemSound && !this.itemCollected) this.itemSound = this.audio.spatialSource('musicbox', this.world.story.itemPos);
      if (ev.lines) this.say(ev.lines);
    }

    // 3) ظهور ليان
    if (plan.layan && !this.layanDone) this.checkLayan(pos, tile, fwd);
    if (this.layan.active && this.layan.mode !== 'run' && this.layan.mode !== 'final') {
      const d = this.layan.root.position.distanceTo(new THREE.Vector3(pos.x, 0, pos.z));
      const limit = this.layan.mode === 'point' ? 8 : 6;
      if (d < 2.6 || this.time - this.layanShownAt > limit) this.layan.vanish(0.8);
    }

    // 4) الغرض الأساسي
    if (!this.itemCollected) {
      const p = this.world.story.pickup;
      const dx = p.pos.x - pos.x;
      const dz = p.pos.z - pos.z;
      if (dx * dx + dz * dz < p.radius * p.radius) this.collect();
    }

    // 5) باب المخرج
    const ex = this.world.exitInfo.trigger;
    const ddx = pos.x - ex.x;
    const ddz = pos.z - ex.z;
    if (ddx * ddx + ddz * ddz < 0.95 * 0.95) {
      if (this.itemCollected && !this.talking) this.hooks.exitReached();
      else if (!this.itemCollected && this.lockedCooldown <= 0) {
        this.lockedCooldown = 6;
        this.say([LOCKED_DOOR_LINE]);
        this.ui.setObjective(this.stage.objective.find, true);
      }
    }
  }

  playEventSound(kind) {
    const a = this.audio;
    if (kind === 'murmur') a.murmur(3.5);
    else if (kind === 'distantVoices') a.murmur(2.2);
    else if (kind === 'giggle') a.giggle();
    else if (kind === 'alarmUp') a.startAlarm();
    else if (kind === 'lullaby') a.startLullaby();
  }

  checkLayan(pos, tile, fwd) {
    const L = this.plan.layan;
    const lt = L.tile;
    const target = new THREE.Vector3((lt.x + 0.5) * TILE, 0, (lt.z + 0.5) * TILE);
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    // هل يراها اللاعب في ممر مستقيم أمامه؟
    let los = tile.x === lt.x || tile.z === lt.z;
    if (los) {
      const sx = Math.sign(lt.x - tile.x);
      const sz = Math.sign(lt.z - tile.z);
      let x = tile.x;
      let z = tile.z;
      while (x !== lt.x || z !== lt.z) {
        x += sx;
        z += sz;
        if (this.maze.isWall(x, z)) {
          los = false;
          break;
        }
      }
    }
    const facing = (dx * fwd.x + dz * fwd.z) / Math.max(0.001, dist * Math.hypot(fwd.x, fwd.z)) > 0.72;
    const clarity = { run: 0.55, stand: 0.7, scared: 0.8, point: 0.95 }[L.mode] ?? 0.7;
    if (los && facing && dist > 4 && dist < 17) {
      this.layanDone = true;
      this.layanShownAt = this.time;
      this.layan.appear(target, new THREE.Vector3(pos.x, 0, pos.z), {
        mode: L.mode,
        clarity,
        runDir: L.runDir,
        pointTo: facePointWorld(L.pointTo),
      });
      this.say([L.line]);
    } else if (dist < 3.2) {
      // وصل للمكان من جهة ما يشوفها منها: نسمع صوتها فقط
      this.layanDone = true;
      this.say([L.line]);
    }
  }

  // ───── استعادة الذكرى ─────
  collect() {
    this.itemCollected = true;
    this.world.hideItem();
    this.audio.stopSpatial(this.itemSound);
    this.audio.memory();
    const item = this.stage.item;
    const showCards = () => {
      if (item.letter) this.hooks.showLetter(item.letter, () => this.hooks.showItem(item, () => this.afterCollect()));
      else this.hooks.showItem(item, () => this.afterCollect());
    };
    if (item.before?.length) {
      this.busy = true;
      this.hooks.beginCutscene(this.stage.id === 'fire' ? 'flashback' : 'memory');
      this.queue = [];
      this.current = null;
      this.say(item.before, () => {
        this.hooks.endCutscene();
        this.busy = false;
        showCards();
      });
    } else showCards();
  }

  afterCollect() {
    this.ui.setObjective(this.stage.objective.exit);
  }

  // ───── نهاية المرحلة الأخيرة: ليان تمسك يده ثم تختفي ─────
  finale(player, onDone) {
    this.busy = true;
    this.queue = [];
    this.current = null;
    const exit = this.world.exitInfo;
    // ليان بين البطل والباب، وجهها للباب وظهرها له
    this.layan.appear(exit.layanSpot.clone(), exit.stand.clone(), { mode: 'final', clarity: 0.95, faceTo: exit.lookAt });
    this.audio.whisper();
    let t = 0;
    const steps = [
      [1.4, () => this.say([this.stage.finale])],
      [4.4, () => this.layan.walkAway(exit.trigger, 0.45)],
      [5.2, () => this.layan.vanish(0.6)],
      [6.4, () => {
        this.world.openDoor();
        this.audio.doorCreak();
      }],
      [8.4, () => onDone()],
    ];
    this.finaleTick = (dt) => {
      t += dt;
      while (steps.length && t >= steps[0][0]) steps.shift()[1]();
    };
  }
}

function facePointWorld(face) {
  if (!face) return null;
  return new THREE.Vector3((face.x + 0.5) * TILE + face.d.dx * 1.5, 0, (face.z + 0.5) * TILE + face.d.dz * 1.5);
}
