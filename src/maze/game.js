// قلب اللعبة: حالة القصة (مصدر الحقيقة الوحيد)، الانتقال بين الشاشات والمراحل، وحلقة الرسم.
import * as THREE from 'three';
import { DIFFICULTIES, THEME, TILE, WALK_SPEED } from './config.js';
import { generateMaze } from './mazeGenerator.js';
import { createRng, randomSeed } from './rng.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { AudioManager } from './audio.js';
import { UI, formatTime } from './ui.js';
import { STAGES, PROLOGUE, ENDING } from './story/stages.js';
import { planStory } from './story/layout.js';
import { Layan } from './story/layan.js';
import { Director } from './story/director.js';
import { artDataURL } from './story/art.js';

const STORAGE_KEY = 'mem0317.v1';
const DEFAULT_SAVE = { muted: false, difficulty: 'medium', unlocked: 0, memories: [], finished: 0 };
const FLASHLIGHT_ON = 7;
// الصعوبة تغيّر مدة المؤقت فقط؛ القصة نفسها لا تتغير
const TIME_SCALE = { easy: 1.4, medium: 1, hard: 0.78 };

function loadSave() {
  try {
    return { ...DEFAULT_SAVE, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

function writeSave(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* التخزين غير متاح (وضع التصفح الخاص مثلًا): نكمل بدونه */
  }
}

// نتأكد من تحميل الخطوط قبل رسم اللافتات والأرقام داخل المشهد
async function loadFonts() {
  if (!document.fonts?.load) return;
  const specs = [
    ['400 20px "IBM Plex Sans Arabic"', 'مخرج'],
    ['700 20px "IBM Plex Sans Arabic"', 'مخرج'],
    ['500 20px "IBM Plex Sans Arabic"', 'مخرج'],
    ['400 20px "Inter"', 'EXIT'],
    ['700 20px "Inter"', 'EXIT'],
    ['400 20px "Cinzel"', 'GRAND'],
    ['700 20px "Cinzel"', 'GRAND'],
    ['500 20px "Roboto Mono"', '0317'],
    ['700 20px "Roboto Mono"', '0317'],
  ];
  const all = Promise.all(specs.map(([f, t]) => document.fonts.load(f, t).catch(() => null)));
  await Promise.race([all, new Promise((r) => setTimeout(r, 4000))]);
}

export class Game {
  constructor() {
    this.saveData = loadSave();
    if (this.saveData.unlocked >= STAGES.length) this.saveData.unlocked = 0;
    this.state = {
      phase: 'loading', // menu | prologue | intro | playing | paused | card | cutscene | outro | finale | lost | ending
      difficulty: this.saveData.difficulty in DIFFICULTIES ? this.saveData.difficulty : 'medium',
      stageIndex: 0,
      timeLimit: 0,
      timeLeft: 0,
      elapsed: 0,
    };
    this.maze = null;
    this.plan = null;
    this.time = 0;
    this.hadLock = false;
    this.lastWholeSecond = -1;
    this.flashlightOn = true;
    this.timers = [];

    this.ui = new UI({
      click: () => this.audio?.click(),
      play: (d) => this.newStory(d),
      continueStory: (d) => this.continueStory(d),
      resume: () => this.resume(),
      restart: () => this.restartStage(),
      retry: () => this.restartStage(),
      next: () => this.showIntro(this.state.stageIndex + 1),
      menu: () => this.toMenu(),
      pause: () => this.pause(),
      mute: () => this.toggleMute(),
      difficultyChange: (d) => {
        this.saveData.difficulty = d;
        writeSave(this.saveData);
      },
    });
    this.ui.setDifficulty(this.state.difficulty);
    this.ui.setMuted(this.saveData.muted);

    const canvas = document.getElementById('scene');
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (err) {
      console.error(err);
      this.ui.showError();
      return;
    }
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.renderer.setAnimationLoop(null);
      this.input?.releaseLock();
      this.ui.showError('توقفت الرسوم فجأة (فقد المتصفح سياق WebGL). حدّث الصفحة عشان تكمل.');
    });

    const r = this.renderer;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(THEME.background);
    this.scene.fog = new THREE.FogExp2(THEME.fog, THEME.fogDensity);
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 80);
    this.scene.add(this.camera);

    // كشاف يدوي يتبع الكاميرا ويصنع ظلالًا
    this.flashlight = new THREE.SpotLight(THEME.flashlight, FLASHLIGHT_ON, 18, 0.5, 0.85, 2);
    this.flashlight.position.set(0.22, -0.2, 0.05);
    this.flashlight.target.position.set(0, -0.35, -6);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.bias = -0.0005;
    this.flashlight.shadow.normalBias = 0.03;
    this.flashlight.shadow.radius = 3;
    this.flashlight.shadow.camera.near = 0.1;
    this.camera.add(this.flashlight, this.flashlight.target);

    this.player = new Player(this.camera);
    this.audio = new AudioManager(this.saveData.muted);
    this.player.onStep = (run) => this.audio.footstep(run);

    this.input = new Input({
      canvas,
      touchLayer: document.getElementById('touch-layer'),
      joystick: document.getElementById('joystick'),
      joystickKnob: document.getElementById('joystick-knob'),
      onAction: (a, v) => this.onAction(a, v),
    });
    this.ui.setTouchMode(this.input.touchMode);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = mq.matches;
    this.ui.reducedMotion = this.reducedMotion;
    mq.addEventListener?.('change', (e) => {
      this.reducedMotion = e.matches;
      this.ui.reducedMotion = e.matches;
    });

    window.addEventListener('resize', () => this.resize());
    this.resize();

    // عند إخفاء الصفحة أو فقدان التركيز: نوقف اللعب ونفرّغ الأزرار
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.interrupt();
    });
    window.addEventListener('blur', () => this.interrupt());

    this.updateMenu();
    this.ui.show('menu');
    this.init();
  }

  async init() {
    await loadFonts();
    this.world = new World(this.scene, this.renderer);
    this.layan = new Layan(this.scene);
    this.director = new Director({
      ui: this.ui,
      audio: this.audio,
      world: this.world,
      layan: this.layan,
      hooks: {
        beginCutscene: (kind) => this.beginCutscene(kind),
        endCutscene: () => this.ui.flash(null),
        showItem: (item, then) => this.showItemCard(item, then),
        showLetter: (letter, then) => this.showLetter(letter, then),
        exitReached: () => this.exitReached(),
      },
    });
    this.buildStage(0);
    this.state.phase = 'menu';
    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.renderer.setAnimationLoop((t) => this.frame(t));
    if (import.meta.env.DEV) this.exposeDebug();
  }

  get stage() {
    return STAGES[this.state.stageIndex];
  }

  // ───── بناء المرحلة (متاهة جديدة في كل مرة) ─────
  buildStage(index) {
    this.state.stageIndex = index;
    const stage = STAGES[index];
    const rng = createRng(randomSeed());
    this.maze = generateMaze(stage.maze.cells, stage.maze.cells, rng, stage.maze);
    this.plan = planStory(this.maze, stage, rng);
    this.world.build(this.maze, rng, stage, this.plan, { reducedMotion: this.reducedMotion });
    this.player.reset(this.maze);
    this.menuYaw = this.player.yaw;
    this.layan.hide();
  }

  later(seconds, fn) {
    const id = setTimeout(fn, this.reducedMotion ? Math.min(seconds * 1000, 300) : seconds * 1000);
    this.timers.push(id);
  }

  clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  // ───── القائمة والبداية ─────
  newStory(difficulty) {
    this.setDifficulty(difficulty);
    this.audio.unlock();
    this.saveData.unlocked = 0;
    this.saveData.memories = [];
    writeSave(this.saveData);
    this.state.phase = 'prologue';
    this.ui.showPrologue(PROLOGUE, artDataURL('s1-hotel'), () => this.showIntro(0));
  }

  continueStory(difficulty) {
    this.setDifficulty(difficulty);
    this.audio.unlock();
    this.showIntro(this.saveData.unlocked);
  }

  setDifficulty(d) {
    this.state.difficulty = d;
    this.saveData.difficulty = d;
    writeSave(this.saveData);
  }

  updateMenu() {
    const n = this.saveData.unlocked;
    const s = STAGES[n];
    const count = this.saveData.memories.length;
    const stats = [];
    if (count) stats.push(`الذكريات المستعادة: ${count} من ${STAGES.length}`);
    if (this.saveData.finished) stats.push(this.saveData.finished > 1 ? `أنهيت القصة ${this.saveData.finished} مرات` : 'أنهيت القصة مرة');
    this.ui.setMenu({ continueLabel: n > 0 ? `كمّل: ${s.ordinal} · ${s.name}` : null, stats: stats.join(' · ') });
  }

  // مقدمة المرحلة: نبني الفندق خلفها حتى يظهر المكان الجديد
  showIntro(index) {
    this.clearTimers();
    this.director.stop();
    this.input.active = false;
    this.input.storyKeys = false;
    this.input.releaseLock();
    this.ui.setTouchLayer(false);
    this.ui.whiteFade(false);
    this.buildStage(index);
    this.state.phase = 'intro';
    this.audio.setAmbience(this.stage.env.ambience);
    this.ui.showIntro(this.stage, () => this.beginStage());
  }

  beginStage() {
    // طلب قفل المؤشر يجب أن يكون داخل نقرة المستخدم، لذلك نطلبه أولًا
    this.hadLock = false;
    this.input.requestLock();
    this.audio.unlock();
    const s = this.state;
    const stage = this.stage;
    // الوقت = زمن المشي على الطريق (مع الذهاب للغرض والعودة) × معامل المرحلة والصعوبة + وقت إضافي
    const tiles = this.maze.path.length - 1 + (this.plan.item.branch.length - 1) * 2;
    const walk = (tiles * TILE) / WALK_SPEED;
    s.timeLimit = Math.round(walk * stage.time.factor * TIME_SCALE[s.difficulty] + stage.time.bonus);
    s.timeLeft = s.timeLimit;
    s.elapsed = 0;
    s.phase = 'playing';
    this.lastWholeSecond = -1;
    this.warned30 = false;
    this.player.reset(this.maze);
    this.director.start(stage, this.plan, this.maze);
    this.input.clear();
    this.input.active = true;
    this.input.storyKeys = true;
    this.ui.setStage(stage);
    this.ui.show(null, { hud: true });
    this.ui.setHud(s);
    this.ui.fadeHint(false);
    this.ui.flash(null);
    this.ui.setTouchLayer(this.input.touchMode);
  }

  // إعادة المرحلة بمتاهة جديدة بدون المقدمة
  restartStage() {
    this.clearTimers();
    this.director.stop();
    this.buildStage(this.state.stageIndex);
    this.beginStage();
  }

  pause() {
    if (this.state.phase !== 'playing') return;
    this.state.phase = 'paused';
    this.input.active = false;
    this.input.clear();
    this.input.releaseLock();
    this.ui.setTouchLayer(false);
    this.ui.setPauseInfo(`${this.stage.ordinal} · ${this.stage.name} — باقي ${formatTime(this.state.timeLeft)}`);
    this.ui.show('pause', { hud: true });
  }

  resume() {
    if (this.state.phase !== 'paused' && this.state.phase !== 'card') return;
    this.hadLock = false;
    this.input.requestLock();
    this.audio.unlock();
    this.state.phase = 'playing';
    this.input.clear();
    this.input.active = true;
    this.ui.show(null, { hud: true });
    this.ui.setTouchLayer(this.input.touchMode);
  }

  interrupt() {
    this.input.clear();
    if (this.state.phase === 'playing') this.pause();
  }

  // ───── لحظات القصة ─────
  beginCutscene(kind) {
    this.state.phase = 'cutscene';
    this.input.active = false;
    this.input.clear();
    this.ui.setTouchLayer(false);
    this.ui.flash(kind);
  }

  openOverlay() {
    this.state.phase = 'card';
    this.input.active = false;
    this.input.clear();
    this.input.releaseLock();
    this.ui.setTouchLayer(false);
    this.ui.clearSubtitle();
  }

  showLetter(letter, then) {
    this.openOverlay();
    this.ui.showLetter(letter, then);
  }

  showItemCard(item, then) {
    this.openOverlay();
    const count = this.state.stageIndex + 1;
    this.ui.showCard(item, artDataURL(item.art), count, STAGES.length, () => {
      then();
      this.resume();
    });
  }

  exitReached() {
    if (this.state.phase !== 'playing') return;
    const index = this.state.stageIndex;
    const stage = this.stage;
    if (!this.saveData.memories.includes(stage.item.id)) this.saveData.memories.push(stage.item.id);
    this.input.active = false;
    this.input.clear();
    this.input.releaseLock();
    this.ui.setTouchLayer(false);

    if (index === STAGES.length - 1) {
      // النهاية: ليان تمسك يده، ثم يفتح الباب الأخير
      this.state.phase = 'finale';
      this.director.finale(this.player, () => this.ending());
      return;
    }
    this.state.phase = 'outro';
    this.world.openDoor(this.reducedMotion);
    this.audio.doorCreak();
    this.audio.win();
    this.saveData.unlocked = index + 1;
    writeSave(this.saveData);
    this.later(1.3, () => {
      this.director.stop();
      this.ui.showOutro({
        stage,
        imgUrl: artDataURL(stage.item.art),
        time: this.state.elapsed,
        count: index + 1,
        total: STAGES.length,
        next: STAGES[index + 1],
      });
    });
  }

  ending() {
    this.state.phase = 'ending';
    this.ui.whiteFade(true);
    this.saveData.unlocked = 0;
    this.saveData.finished = (this.saveData.finished || 0) + 1;
    writeSave(this.saveData);
    this.later(1.8, () => {
      this.director.stop();
      this.audio.setAmbience('lullaby');
      this.audio.startLullaby();
      this.ui.showEnding(ENDING);
      this.ui.whiteFade(false);
    });
  }

  lose() {
    const s = this.state;
    s.phase = 'lost';
    s.timeLeft = 0;
    this.input.active = false;
    this.input.clear();
    this.input.releaseLock();
    this.ui.setTouchLayer(false);
    this.ui.setHud(s);
    this.director.stop();
    this.audio.lose();
    this.ui.setLose(this.stage);
    this.later(0.5, () => {
      if (s.phase === 'lost') this.ui.show('lose');
    });
  }

  toMenu() {
    this.clearTimers();
    this.director?.stop();
    this.state.phase = 'menu';
    this.input.active = false;
    this.input.storyKeys = false;
    this.input.clear();
    this.input.releaseLock();
    this.ui.setTouchLayer(false);
    this.ui.whiteFade(false);
    this.ui.flash(null);
    if (this.world) {
      this.buildStage(0);
      if (this.audio.ready) this.audio.setAmbience('calm');
    }
    this.updateMenu();
    this.ui.show('menu');
  }

  toggleMute() {
    this.saveData.muted = !this.saveData.muted;
    this.audio.setMuted(this.saveData.muted);
    this.ui.setMuted(this.saveData.muted);
    writeSave(this.saveData);
  }

  onAction(action, value) {
    const phase = this.state.phase;
    switch (action) {
      case 'pause':
        this.pause();
        break;
      case 'togglePause':
        if (phase === 'playing') this.pause();
        else if (phase === 'paused') this.resume();
        break;
      case 'flashlight':
        this.flashlightOn = !this.flashlightOn;
        this.ui.toast(this.flashlightOn ? 'الكشاف شغّال' : 'طفّيت الكشاف', 1200);
        break;
      case 'mute':
        this.toggleMute();
        break;
      case 'skip':
        if (phase === 'playing' || phase === 'cutscene' || phase === 'finale') this.director.skipLine();
        break;
      case 'lockChange':
        // إذا تم القفل متأخرًا ونحن خارج اللعب (بطاقة أو قائمة) نفكّه فورًا حتى تعمل الأزرار
        if (value && phase !== 'playing' && phase !== 'cutscene' && phase !== 'finale') this.input.releaseLock();
        else if (value) this.hadLock = true;
        else if (phase === 'playing' && this.hadLock && !this.input.touchMode) this.pause();
        break;
      case 'lockFailed':
        if (phase === 'playing') this.ui.toast('اضغط على الشاشة عشان تتحكم بالنظر، أو اسحب بالفأرة', 3200);
        break;
      case 'touchMode':
        this.ui.setTouchMode(value);
        this.ui.setTouchLayer(value && phase === 'playing');
        break;
      default:
        break;
    }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ───── حلقة الرسم (واحدة فقط) ─────
  frame(timestamp) {
    this.timer.update(timestamp);
    const dt = Math.min(this.timer.getDelta(), 0.1);
    this.time += dt;
    const s = this.state;

    if (s.phase === 'playing') {
      const look = this.input.consumeLook();
      this.player.look(look.dx, look.dy);
      this.player.update(dt, this.input.getMove(), this.maze, this.world.colliders, this.reducedMotion);

      s.elapsed += dt;
      s.timeLeft -= dt;
      const whole = Math.ceil(s.timeLeft);
      if (whole !== this.lastWholeSecond) {
        this.lastWholeSecond = whole;
        if (whole <= 10 && whole > 0) this.audio.tick();
        if (whole === 30 && !this.warned30) {
          this.warned30 = true;
          this.ui.toast('باقي 30 ثانية!');
        }
      }
      if (s.elapsed > 10) this.ui.fadeHint(true);
      this.director.update(dt, this.player, this.camera);
      this.director.tickDialogue(dt);
      if (s.phase === 'playing') {
        if (s.timeLeft <= 0) this.lose();
        else this.ui.setHud(s);
      }
    } else if (s.phase === 'cutscene') {
      this.director.tickDialogue(dt);
    } else if (s.phase === 'finale') {
      // البطل يتراجع خطوات ويلتفت بهدوء نحو ليان والباب
      const target = this.world.exitInfo.lookAt;
      const stand = this.world.exitInfo.stand;
      this.player.pos.x += (stand.x - this.player.pos.x) * Math.min(1, dt * 1.6);
      this.player.pos.z += (stand.z - this.player.pos.z) * Math.min(1, dt * 1.6);
      const want = Math.atan2(-(target.x - this.player.pos.x), -(target.z - this.player.pos.z));
      let diff = want - this.player.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.player.yaw += diff * Math.min(1, dt * 2.5);
      this.player.pitch += (-0.2 - this.player.pitch) * Math.min(1, dt * 2.5);
      this.player.applyCamera(0);
      this.director.tickDialogue(dt);
      this.director.finaleTick?.(dt);
    } else if (s.phase === 'menu' || s.phase === 'intro' || s.phase === 'prologue') {
      const sway = this.reducedMotion ? 0 : Math.sin(this.time * 0.18) * 0.55;
      this.player.yaw = this.menuYaw + sway;
      this.player.pitch = 0.04;
      this.player.applyCamera(0);
    }

    const flTarget = this.flashlightOn && s.phase !== 'menu' && s.phase !== 'intro' ? FLASHLIGHT_ON : s.phase === 'menu' || s.phase === 'intro' ? 5 : 0;
    this.flashlight.intensity += (flTarget - this.flashlight.intensity) * Math.min(1, dt * 10);

    const scene = s.phase === 'cutscene' || s.phase === 'finale';
    if (scene !== this.sceneMode) {
      this.sceneMode = scene;
      this.ui.hud.classList.toggle('is-scene', scene);
    }
    this.audio.setListener(this.player.pos, this.player.yaw);
    this.layan.update(dt, this.player.pos, this.reducedMotion);
    this.world.update(dt, this.time, this.player.pos, this.reducedMotion);
    this.renderer.render(this.scene, this.camera);
  }

  // أدوات اختبار تظهر في وضع التطوير فقط (npm run dev)
  exposeDebug() {
    const tile = (t) => new THREE.Vector3((t.x + 0.5) * TILE, 0, (t.z + 0.5) * TILE);
    window.__maze = {
      game: this,
      info: () => ({
        phase: this.state.phase,
        stage: this.state.stageIndex,
        timeLeft: this.state.timeLeft,
        timeLimit: this.state.timeLimit,
        pos: { x: this.player.pos.x, z: this.player.pos.z },
        yaw: this.player.yaw,
        maze: this.maze && { W: this.maze.W, path: this.maze.path.length, start: this.maze.start, exit: { x: this.maze.exit.x, z: this.maze.exit.z } },
        item: this.plan && { site: this.plan.item.site, attach: this.plan.item.attach, branch: this.plan.item.branch.length },
        counts: this.plan && { signs: this.plan.signs.length, pictures: this.plan.pictures.length, props: this.plan.props.length, doors: this.plan.doors.length, tables: this.plan.tables.length, hands: this.plan.handprints.length, inspect: this.world.story.inspect.length },
        collected: this.director.itemCollected,
        layan: { planned: !!this.plan?.layan, done: this.director.layanDone, visible: this.layan.active },
        subtitle: document.getElementById('subtitle').hidden ? null : document.getElementById('subtitle-text').textContent,
        objective: document.getElementById('hud-objective').textContent,
        memory: { ...this.renderer.info.memory },
        programs: this.renderer.info.programs?.length,
        calls: this.renderer.info.render.calls,
        locked: this.input.locked,
      }),
      // نقل اللاعب لأماكن محددة لاختبار الأحداث
      place: (pos, lookAt) => {
        this.player.pos.set(pos.x, 0, pos.z);
        this.player.vel.set(0, 0, 0);
        if (lookAt) this.player.yaw = Math.atan2(-(lookAt.x - pos.x), -(lookAt.z - pos.z));
        this.player.pitch = 0;
        this.player.applyCamera(0);
      },
      toItem: () => {
        const p = this.world.story.pickup.pos;
        window.__maze.place(p, this.world.story.itemPos);
      },
      toExit: () => {
        const ex = this.world.exitInfo;
        window.__maze.place(ex.front, ex.lookAt);
      },
      toLayanView: () => {
        const L = this.plan.layan;
        if (!L) return false;
        const back = { x: L.tile.x - L.approach.dx * 3, z: L.tile.z - L.approach.dz * 3 };
        window.__maze.place(tile(back), tile(L.tile));
        return true;
      },
      pathTile: (i) => tile(this.maze.path[Math.min(i, this.maze.path.length - 1)]),
      setTimeLeft: (v) => (this.state.timeLeft = v),
    };
  }
}
