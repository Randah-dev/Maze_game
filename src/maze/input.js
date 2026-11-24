// المدخلات: لوحة المفاتيح، الفأرة (مع قفل المؤشر أو السحب كبديل)، واللمس (عصا تحكم + سحب للنظر).
import { MOUSE_SENS, TOUCH_SENS } from './config.js';

const MOVE_KEYS = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
};

export class Input {
  constructor({ canvas, touchLayer, joystick, joystickKnob, onAction }) {
    this.canvas = canvas;
    this.touchLayer = touchLayer;
    this.joystickEl = joystick;
    this.knobEl = joystickKnob;
    this.onAction = onAction; // للأوامر: pause, flashlight, mute, lockChange
    this.active = false; // هل اللعبة تستقبل الحركة الآن؟
    this.held = new Set();
    this.lookDX = 0;
    this.lookDY = 0;
    this.locked = false;
    this.dragging = false;
    this.joy = null; // { id, ox, oy, x, y }
    this.lookTouch = null; // { id, x, y }
    this.touchRun = false;
    this.touchMode = window.matchMedia('(pointer: coarse)').matches;

    this.bind();
  }

  bind() {
    const isTyping = (e) => {
      const t = e.target;
      return t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) && t.type !== 'radio');
    };

    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      // نستخدم e.code حتى تعمل الأزرار على لوحة المفاتيح العربية أيضًا
      if (this.active && MOVE_KEYS[e.code]) {
        this.held.add(MOVE_KEYS[e.code]);
        e.preventDefault();
        return;
      }
      if (e.repeat) return;
      if (e.code === 'Escape') this.onAction('pause'); // الإيقاف فقط، لا الاستئناف
      else if (e.code === 'KeyP') this.onAction('togglePause');
      else if (e.code === 'KeyF' && this.active) this.onAction('flashlight');
      else if (e.code === 'KeyM') this.onAction('mute');
      else if (e.code === 'Space' && this.storyKeys) {
        // تخطّي الجملة الحالية في الحوار
        e.preventDefault();
        this.onAction('skip');
      }
    });
    window.addEventListener('keyup', (e) => {
      if (MOVE_KEYS[e.code]) this.held.delete(MOVE_KEYS[e.code]);
    });

    // الفأرة
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      this.onAction('lockChange', this.locked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.active) return;
      if (this.locked || this.dragging) {
        // نتجاهل القفزات الضخمة التي تحدث أحيانًا عند قفل المؤشر
        if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return;
        this.lookDX += e.movementX * MOUSE_SENS;
        this.lookDY += e.movementY * MOUSE_SENS;
      }
    });
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.active || this.locked || e.button !== 0) return;
      this.dragging = true;
      this.requestLock();
    });
    window.addEventListener('mouseup', () => (this.dragging = false));

    // اللمس: النصف الأيسر للحركة، والباقي للنظر
    const layer = this.touchLayer;
    layer.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      this.setTouchMode(true);
      if (!this.active) return;
      e.preventDefault();
      if (!this.joy && e.clientX < window.innerWidth * 0.42) {
        this.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
        this.showJoystick(e.clientX, e.clientY);
      } else if (!this.lookTouch) {
        this.lookTouch = { id: e.pointerId, x: e.clientX, y: e.clientY };
      } else return;
      try {
        layer.setPointerCapture(e.pointerId);
      } catch {
        /* بعض المتصفحات لا تدعمها */
      }
    });
    layer.addEventListener('pointermove', (e) => {
      if (this.joy && e.pointerId === this.joy.id) {
        const max = 60;
        let dx = e.clientX - this.joy.ox;
        let dy = e.clientY - this.joy.oy;
        const len = Math.hypot(dx, dy);
        if (len > max) {
          dx = (dx / len) * max;
          dy = (dy / len) * max;
        }
        this.joy.x = dx / max;
        this.joy.y = dy / max;
        this.knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
      } else if (this.lookTouch && e.pointerId === this.lookTouch.id) {
        if (this.active) {
          this.lookDX += (e.clientX - this.lookTouch.x) * TOUCH_SENS;
          this.lookDY += (e.clientY - this.lookTouch.y) * TOUCH_SENS;
        }
        this.lookTouch.x = e.clientX;
        this.lookTouch.y = e.clientY;
      }
    });
    const release = (e) => {
      if (this.joy && e.pointerId === this.joy.id) {
        this.joy = null;
        this.hideJoystick();
      }
      if (this.lookTouch && e.pointerId === this.lookTouch.id) this.lookTouch = null;
    };
    layer.addEventListener('pointerup', release);
    layer.addEventListener('pointercancel', release);
    layer.addEventListener('lostpointercapture', release);
  }

  setTouchMode(on) {
    if (this.touchMode === on) return;
    this.touchMode = on;
    this.onAction('touchMode', on);
  }

  showJoystick(x, y) {
    this.joystickEl.style.left = `${x}px`;
    this.joystickEl.style.top = `${y}px`;
    this.joystickEl.classList.add('is-active');
    this.knobEl.style.transform = 'translate(0px, 0px)';
  }

  hideJoystick() {
    this.joystickEl.classList.remove('is-active');
  }

  // يجب استدعاؤها من داخل نقرة المستخدم
  requestLock() {
    if (this.touchMode || this.locked || !this.canvas.requestPointerLock) return;
    try {
      const p = this.canvas.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => this.onAction('lockFailed'));
    } catch {
      this.onAction('lockFailed');
    }
  }

  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
    this.dragging = false;
  }

  getMove() {
    let forward = (this.held.has('forward') ? 1 : 0) - (this.held.has('back') ? 1 : 0);
    let right = (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0);
    let run = this.held.has('run');
    if (this.joy) {
      forward += -this.joy.y;
      right += this.joy.x;
      if (Math.hypot(this.joy.x, this.joy.y) > 0.92) run = true;
    }
    if (this.touchRun) run = true;
    return { forward, right, run };
  }

  consumeLook() {
    const d = { dx: this.lookDX, dy: this.lookDY };
    this.lookDX = 0;
    this.lookDY = 0;
    return d;
  }

  // يُستدعى عند فقدان التركيز أو الإيقاف حتى لا تبقى أزرار "عالقة"
  clear() {
    this.held.clear();
    this.lookDX = 0;
    this.lookDY = 0;
    this.dragging = false;
    this.touchRun = false;
    if (this.joy) this.hideJoystick();
    this.joy = null;
    this.lookTouch = null;
  }
}
