// الأصوات تُولَّد بالكود عبر Web Audio، فلا تحتاج ملفات صوتية.
// الصوت لا يبدأ إلا بعد أول نقرة من المستخدم (شرط المتصفحات).
// الأجواء تتغير مع القصة: هدوء، قلق، حنين، حريق، ثم تهويدة.
//
// تسجيلات صوتية حقيقية (اختياري): ضع الملفات في src/assets/voices/ وأضفها هنا بنص الجملة، مثلًا:
//   import v1 from '../assets/voices/layan-1.mp3';
//   export const VOICE_FILES = { 'يلا! تأخرت عليّ!': v1 };
export const VOICE_FILES = {};

// تهويدة قصيرة كتبناها للعبة (نغمات صندوق موسيقى)
const LULLABY = [
  [76, 1], [79, 1], [84, 1], [83, 2], [79, 1],
  [77, 1], [81, 1], [86, 1], [84, 2], [81, 1],
  [76, 1], [79, 1], [84, 1], [88, 1.5], [86, 0.5], [84, 1],
  [83, 1], [79, 1], [81, 1], [84, 3],
];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class AudioManager {
  constructor(muted = false) {
    this.ctx = null;
    this.muted = muted;
    this.ambient = null;
    this.spatial = new Set();
    this.alarm = null;
    this.lullaby = null;
    this.voiceBuffers = new Map();
  }

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoise(2);
      this.whiteBuffer = this.makeWhite(1);
      // صدى بسيط يعطي إحساس الممرات
      this.echo = this.ctx.createDelay(1);
      this.echo.delayTime.value = 0.23;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.28;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      this.echo.connect(lp).connect(fb).connect(this.echo);
      this.echoOut = this.ctx.createGain();
      this.echoOut.gain.value = 0.35;
      lp.connect(this.echoOut).connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  get ready() {
    return !!this.ctx;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // ضوضاء "بنية" ناعمة
      data[i] = last * 3.5;
    }
    return buf;
  }

  makeWhite(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ───── الأجواء الخلفية حسب المرحلة ─────
  setAmbience(kind) {
    if (!this.ctx) return;
    this.stopAmbient();
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(0.5, ctx.currentTime, 1.5);
    out.connect(this.master);
    const nodes = [];

    const presets = {
      calm: { drones: [55, 82.4, 110.6], noise: 0.18, cutoff: 380 },
      uneasy: { drones: [51.9, 77.8, 104.2], noise: 0.22, cutoff: 320 },
      nostalgic: { drones: [55, 82.4, 138.6], noise: 0.16, cutoff: 420 },
      fire: { drones: [46.2, 69.3, 92.5], noise: 0.4, cutoff: 600 },
      lullaby: { drones: [65.4, 98, 130.8], noise: 0.1, cutoff: 300 },
    };
    const p = presets[kind] || presets.calm;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = p.cutoff;
    const ng = ctx.createGain();
    ng.gain.value = p.noise;
    noise.connect(lp).connect(ng).connect(out);
    noise.start();
    nodes.push(noise);

    p.drones.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.015 : 0.045;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07 + i * 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = g.gain.value * 0.6;
      lfo.connect(lfoGain).connect(g.gain);
      o.connect(g).connect(out);
      o.start();
      lfo.start();
      nodes.push(o, lfo);
    });

    if (kind === 'fire') {
      // طقطقة نار بعيدة
      const crackle = ctx.createBufferSource();
      crackle.buffer = this.whiteBuffer;
      crackle.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2500;
      bp.Q.value = 0.8;
      const cg = ctx.createGain();
      cg.gain.value = 0;
      crackle.connect(bp).connect(cg).connect(out);
      crackle.start();
      nodes.push(crackle);
      this.crackleTimer = setInterval(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        cg.gain.cancelScheduledValues(t);
        cg.gain.setValueAtTime(0.02 + Math.random() * 0.06, t);
        cg.gain.exponentialRampToValueAtTime(0.0005, t + 0.03 + Math.random() * 0.05);
      }, 90);
    }
    this.ambient = { out, nodes };
  }

  stopAmbient() {
    clearInterval(this.crackleTimer);
    this.crackleTimer = null;
    if (!this.ambient) return;
    const { out, nodes } = this.ambient;
    const t = this.ctx.currentTime;
    out.gain.setTargetAtTime(0, t, 0.4);
    nodes.forEach((n) => n.stop(t + 2));
    this.ambient = null;
  }

  // ───── أصوات في مكان محدد (تعلو كل ما قربت) ─────
  setListener(pos, yaw) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    if (l.positionX) {
      l.positionX.value = pos.x;
      l.positionY.value = 1.6;
      l.positionZ.value = pos.z;
      l.forwardX.value = fx;
      l.forwardY.value = 0;
      l.forwardZ.value = fz;
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(pos.x, 1.6, pos.z);
      l.setOrientation(fx, 0, fz, 0, 1, 0);
    }
  }

  spatialSource(kind, pos) {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = kind === 'clock' ? 1.2 : 2;
    panner.rolloffFactor = kind === 'clock' ? 2.2 : 1.4;
    panner.maxDistance = 40;
    if (panner.positionX) {
      panner.positionX.value = pos.x;
      panner.positionY.value = pos.y;
      panner.positionZ.value = pos.z;
    } else panner.setPosition(pos.x, pos.y, pos.z);
    const g = ctx.createGain();
    g.gain.value = kind === 'clock' ? 0.6 : 0.9;
    panner.connect(g).connect(this.master);
    if (kind === 'musicbox') g.connect(this.echo);
    const handle = { panner, gain: g, timer: null, stopped: false };
    if (kind === 'clock') {
      let k = 0;
      handle.timer = setInterval(() => {
        if (!this.ctx) return;
        this.tone(k++ % 2 ? 2100 : 1700, this.ctx.currentTime, 0.03, { type: 'square', vol: 0.05, dest: panner });
      }, 1000);
    } else if (kind === 'stuckClock') {
      handle.timer = setInterval(() => this.tone(1900, this.ctx.currentTime, 0.025, { type: 'square', vol: 0.04, dest: panner }), 830);
    } else if (kind === 'musicbox') {
      const play = () => this.melody(LULLABY.slice(0, 10), { dest: panner, tempo: 0.32, vol: 0.12 });
      play();
      handle.timer = setInterval(play, 4800);
    }
    this.spatial.add(handle);
    return handle;
  }

  stopSpatial(h) {
    if (!h || h.stopped) return;
    h.stopped = true;
    clearInterval(h.timer);
    h.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    this.spatial.delete(h);
  }

  stopAllStageSounds() {
    for (const h of [...this.spatial]) this.stopSpatial(h);
    this.stopAlarm();
    this.stopLullaby();
  }

  // ───── أصوات القصة ─────
  melody(notes, { dest = this.master, tempo = 0.36, vol = 0.1 } = {}) {
    if (!this.ctx) return 0;
    let t = this.ctx.currentTime + 0.05;
    for (const [n, beats] of notes) {
      const f = midi(n);
      this.tone(f, t, 1.4, { type: 'triangle', vol, dest });
      this.tone(f * 2, t, 0.5, { type: 'sine', vol: vol * 0.25, dest });
      t += beats * tempo;
    }
    return t - this.ctx.currentTime;
  }

  startLullaby() {
    if (!this.ctx || this.lullaby) return;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.9, this.ctx.currentTime, 2);
    g.connect(this.master);
    g.connect(this.echo);
    const play = () => this.melody(LULLABY, { dest: g, tempo: 0.42, vol: 0.09 });
    const len = play();
    this.lullaby = { gain: g, timer: setInterval(play, (len + 2.5) * 1000) };
  }

  stopLullaby() {
    if (!this.lullaby) return;
    clearInterval(this.lullaby.timer);
    this.lullaby.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    this.lullaby = null;
  }

  // إنذار حريق بعيد يعلو تدريجيًا
  startAlarm() {
    if (!this.ctx || this.alarm) return;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.5, this.ctx.currentTime, 6);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    g.connect(lp).connect(this.master);
    lp.connect(this.echo);
    const beep = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) this.tone(960, t + i * 0.5, 0.3, { type: 'square', vol: 0.05, dest: g });
    };
    beep();
    this.alarm = { gain: g, timer: setInterval(beep, 2600) };
  }

  stopAlarm() {
    if (!this.alarm) return;
    clearInterval(this.alarm.timer);
    this.alarm.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    this.alarm = null;
  }

  // همس قصير يرافق ظهور ليان أو صوتها
  whisper() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.whiteBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1800, t);
    bp.frequency.linearRampToValueAtTime(2600, t + 0.8);
    bp.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.25);
    g.gain.linearRampToValueAtTime(0, t + 1);
    src.connect(bp).connect(g);
    g.connect(this.master);
    g.connect(this.echo);
    src.start(t, 0, 1.1);
    this.tone(1318.5, t + 0.1, 1.6, { type: 'sine', vol: 0.03, dest: this.echo });
  }

  // ضحكة طفلة (نغمات قصيرة متقطعة)
  giggle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [0, 0.12, 0.22, 0.33].forEach((d, i) => this.tone(900 + i * 60 + Math.random() * 40, t + d, 0.09, { type: 'sine', vol: 0.05, to: 700, dest: this.echo }));
  }

  // أصوات ناس بعيدة غير واضحة
  murmur(seconds = 3) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.whiteBuffer;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 520;
    bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    for (let k = 0; k < seconds * 5; k++) g.gain.setValueAtTime(0.02 + Math.random() * 0.05, t + 0.3 + k * 0.2);
    g.gain.linearRampToValueAtTime(0, t + seconds + 0.5);
    src.connect(bp).connect(g);
    g.connect(this.echo);
    g.connect(this.master);
    src.start(t);
    src.stop(t + seconds + 0.6);
  }

  // صوت تسجيل/مكالمة قديمة (تشويش)
  record(seconds = 2.5) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.whiteBuffer;
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 1500;
    hp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.025, t);
    g.gain.linearRampToValueAtTime(0, t + seconds);
    src.connect(hp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + seconds);
  }

  // نغمة عند استعادة ذكرى
  memory() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [72, 76, 79, 84].forEach((n, i) => this.tone(midi(n), t + i * 0.16, 1.8, { type: 'triangle', vol: 0.07, dest: this.echo }));
    [72, 76, 79, 84].forEach((n, i) => this.tone(midi(n), t + i * 0.16, 1.6, { type: 'sine', vol: 0.06 }));
  }

  doorCreak() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(180, t, 0.9, { type: 'sawtooth', vol: 0.025, to: 120 });
    this.tone(260, t + 0.15, 0.6, { type: 'triangle', vol: 0.02, to: 190 });
  }

  // تسجيل صوتي حقيقي إن وُجد في VOICE_FILES
  async playVoice(text) {
    const url = VOICE_FILES[text];
    if (!url || !this.ctx) return false;
    try {
      let buf = this.voiceBuffers.get(url);
      if (!buf) {
        const res = await fetch(url);
        buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
        this.voiceBuffers.set(url, buf);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.master);
      src.start();
      return true;
    } catch {
      return false;
    }
  }

  footstep(run) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700 + Math.random() * 300;
    const g = ctx.createGain();
    const peak = run ? 0.8 : 0.5;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 1.5, 0.2);
  }

  tone(freq, start, dur, { type = 'sine', vol = 0.2, to = null, dest = null } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
    o.connect(g).connect(dest || this.master);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  click() {
    if (!this.ctx) return;
    this.tone(720, this.ctx.currentTime, 0.08, { type: 'triangle', vol: 0.1, to: 480 });
  }

  tick() {
    if (!this.ctx) return;
    this.tone(1250, this.ctx.currentTime, 0.05, { type: 'square', vol: 0.03 });
  }

  win() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone(f, t + i * 0.12, 1.2, { type: 'triangle', vol: 0.1 });
      this.tone(f * 2, t + i * 0.12, 0.6, { type: 'sine', vol: 0.02 });
    });
  }

  lose() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(220, t, 1.6, { type: 'sawtooth', vol: 0.06, to: 55 });
    this.tone(110, t, 1.8, { type: 'sine', vol: 0.18, to: 40 });
  }
}
