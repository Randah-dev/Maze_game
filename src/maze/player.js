// اللاعب: الموقع، اتجاه النظر، الحركة السلسة، اهتزاز الرأس، وإشارة وقع الخطوات.
import * as THREE from 'three';
import { TILE, EYE_H, PLAYER_RADIUS, WALK_SPEED, RUN_SPEED } from './config.js';
import { resolveCollisions } from './collision.js';

const MAX_PITCH = 1.35;
const STEP_LENGTH = 1.55; // مسافة بين كل خطوتين بالمتر

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.bobPhase = 0;
    this.stepDistance = 0;
    this.onStep = null;
    this.camera.rotation.order = 'YXZ';
  }

  reset(maze) {
    this.pos.set((maze.start.x + 0.5) * TILE, 0, (maze.start.z + 0.5) * TILE);
    this.vel.set(0, 0, 0);
    // ننظر نحو الممر المفتوح عند البداية
    this.yaw = Math.atan2(-maze.startDir.dx, -maze.startDir.dz);
    this.pitch = 0;
    this.bobPhase = 0;
    this.stepDistance = 0;
    this.applyCamera(0);
  }

  look(dx, dy) {
    this.yaw -= dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy, -MAX_PITCH, MAX_PITCH);
  }

  update(dt, move, maze, colliders, reducedMotion) {
    // اتجاهات الحركة حسب زاوية النظر الأفقية
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    let wx = -sin * move.forward + cos * move.right;
    let wz = -cos * move.forward - sin * move.right;
    const len = Math.hypot(wx, wz);
    const speed = move.run ? RUN_SPEED : WALK_SPEED;
    if (len > 1) {
      wx /= len;
      wz /= len;
    }
    wx *= speed;
    wz *= speed;

    // تسارع وتباطؤ ناعم
    const k = 1 - Math.exp(-(len > 0.01 ? 12 : 9) * dt);
    this.vel.x += (wx - this.vel.x) * k;
    this.vel.z += (wz - this.vel.z) * k;

    // نقسم الحركة إلى خطوات صغيرة حتى لا يعبر اللاعب الجدار عند بطء الإطارات
    const steps = Math.max(1, Math.ceil((Math.hypot(this.vel.x, this.vel.z) * dt) / 0.12));
    const before = this.pos.clone();
    for (let i = 0; i < steps; i++) {
      this.pos.x += (this.vel.x * dt) / steps;
      this.pos.z += (this.vel.z * dt) / steps;
      resolveCollisions(maze, colliders, this.pos, PLAYER_RADIUS);
    }
    // السرعة الفعلية بعد الاصطدام (حتى لا يستمر الاهتزاز عند الوقوف أمام جدار)
    const moved = Math.hypot(this.pos.x - before.x, this.pos.z - before.z);
    const actualSpeed = dt > 0 ? moved / dt : 0;
    if (actualSpeed < 0.2) {
      this.vel.x *= 0.5;
      this.vel.z *= 0.5;
    }

    this.stepDistance += moved;
    if (this.stepDistance > STEP_LENGTH * (move.run ? 1.25 : 1)) {
      this.stepDistance = 0;
      this.onStep?.(move.run);
    }
    if (!reducedMotion) this.bobPhase += moved * (Math.PI / STEP_LENGTH);
    this.applyCamera(reducedMotion ? 0 : Math.min(1, actualSpeed / WALK_SPEED));
  }

  applyCamera(bobAmount) {
    const bob = Math.sin(this.bobPhase) * 0.035 * bobAmount;
    const sway = Math.cos(this.bobPhase * 0.5) * 0.018 * bobAmount;
    this.camera.position.set(this.pos.x, EYE_H + bob, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, sway * 0.4);
  }
}
