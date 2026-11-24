// واجهة المستخدم: الشاشات، شريط المعلومات، الحوارات، وبطاقات الذكريات.
// هذا الملف يعرض الحالة فقط؛ قرارات اللعبة كلها في game.js.

const $ = (id) => document.getElementById(id);
// أسماء مثل "03:17" تُكتب بخط الأرقام
const markNumeric = (el, text) => el.classList.toggle('is-numeric', /^[\d:]+$/.test(text));

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export class UI {
  constructor(handlers) {
    this.screens = {
      menu: $('screen-menu'),
      howto: $('screen-howto'),
      prologue: $('screen-prologue'),
      intro: $('screen-intro'),
      card: $('screen-card'),
      letter: $('screen-letter'),
      pause: $('screen-pause'),
      outro: $('screen-outro'),
      lose: $('screen-lose'),
      ending: $('screen-ending'),
      error: $('screen-error'),
    };
    this.hud = $('hud');
    this.hudTime = $('hud-time');
    this.hudTimer = $('hud-timer');
    this.hint = $('hud-hint');
    this.objective = $('hud-objective');
    this.subtitleEl = $('subtitle');
    this.toastEl = $('hud-toast');
    this.muteBtn = $('btn-mute');
    this.touchLayer = $('touch-layer');
    this.flashEl = $('flash');
    this.fadeEl = $('fade');
    this.toastTimer = 0;
    this.typeTimer = 0;
    this.lastTimeText = '';
    this.reducedMotion = false;
    this.onceHandlers = {};

    const on = (id, fn) =>
      $(id).addEventListener('click', (e) => {
        handlers.click?.();
        fn(e);
      });
    on('btn-play', () => handlers.play(this.getDifficulty()));
    on('btn-continue', () => handlers.continueStory(this.getDifficulty()));
    on('btn-howto', () => this.show('howto'));
    on('btn-howto-back', () => this.show('menu'));
    on('btn-resume', handlers.resume);
    on('btn-restart', handlers.restart);
    on('btn-pause-menu', handlers.menu);
    on('btn-next', handlers.next);
    on('btn-outro-menu', handlers.menu);
    on('btn-retry', handlers.retry);
    on('btn-lose-menu', handlers.menu);
    on('btn-pause', handlers.pause);
    on('btn-ending', handlers.menu);
    on('btn-reload', () => window.location.reload());
    // أزرار تتغير وظيفتها حسب الموقف
    for (const id of ['btn-prologue', 'btn-intro', 'btn-card', 'btn-letter']) {
      on(id, () => {
        const fn = this.onceHandlers[id];
        this.onceHandlers[id] = null;
        fn?.();
      });
    }
    $('intro-text').addEventListener('click', () => this.finishTyping());
    this.muteBtn.addEventListener('click', () => handlers.mute());
    document.querySelectorAll('input[name="difficulty"]').forEach((r) =>
      r.addEventListener('change', () => handlers.difficultyChange?.(this.getDifficulty())),
    );
  }

  // يُظهر شاشة واحدة (أو لا شيء أثناء اللعب)
  show(name, { hud = false } = {}) {
    for (const [key, el] of Object.entries(this.screens)) el.hidden = key !== name;
    this.hud.hidden = !hud;
    const el = this.screens[name];
    if (el) {
      const focusTarget = [...el.querySelectorAll('.btn-primary, button')].find((b) => !b.hidden);
      focusTarget?.focus({ preventScroll: true });
    }
  }

  getDifficulty() {
    return document.querySelector('input[name="difficulty"]:checked')?.value || 'medium';
  }

  setDifficulty(value) {
    const r = document.querySelector(`input[name="difficulty"][value="${value}"]`);
    if (r) r.checked = true;
  }

  // القائمة: زر "كمّل" يظهر إذا فيه تقدم محفوظ
  setMenu({ continueLabel = null, stats = '' }) {
    const cont = $('btn-continue');
    const play = $('btn-play');
    cont.hidden = !continueLabel;
    if (continueLabel) cont.textContent = continueLabel;
    play.textContent = continueLabel ? 'ابدأ من جديد' : 'ابدأ القصة';
    play.classList.toggle('btn-primary', !continueLabel);
    play.classList.toggle('btn-ghost', !!continueLabel);
    $('menu-stats').textContent = stats;
  }

  setHud({ timeLeft }) {
    const t = formatTime(timeLeft);
    if (t !== this.lastTimeText) {
      this.hudTime.textContent = t;
      this.lastTimeText = t;
    }
    this.hudTimer.classList.toggle('is-low', timeLeft <= 20);
  }

  setStage(stage) {
    $('hud-ordinal').textContent = stage.ordinal;
    $('hud-stage').textContent = stage.name;
    markNumeric($('hud-stage'), stage.name);
  }

  setObjective(text, flash = false) {
    this.objective.textContent = text;
    this.objective.classList.remove('is-flash');
    if (flash) {
      void this.objective.offsetWidth;
      this.objective.classList.add('is-flash');
    }
  }

  subtitle(who, text, kind) {
    this.subtitleEl.className = `subtitle is-${kind}${kind === 'me' ? ' is-thought' : ''}`;
    $('subtitle-who').textContent = who;
    $('subtitle-text').textContent = text;
    this.subtitleEl.hidden = false;
  }

  clearSubtitle() {
    this.subtitleEl.hidden = true;
  }

  fadeHint(faded) {
    this.hint.classList.toggle('is-faded', faded);
  }

  flash(kind) {
    this.flashEl.className = kind ? `flash is-${kind}` : 'flash';
  }

  whiteFade(on) {
    this.fadeEl.classList.toggle('is-on', on);
  }

  // كتابة النص حرفًا حرفًا (أو دفعة وحدة مع تقليل الحركة)
  typeText(el, text) {
    clearInterval(this.typeTimer);
    this.typing = { el, text };
    if (this.reducedMotion) {
      el.textContent = text;
      return;
    }
    let i = 0;
    el.textContent = '';
    this.typeTimer = setInterval(() => {
      i += 2;
      el.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(this.typeTimer);
    }, 28);
  }

  finishTyping() {
    clearInterval(this.typeTimer);
    if (this.typing) this.typing.el.textContent = this.typing.text;
  }

  showPrologue(data, imgUrl, onNext) {
    $('prologue-app').textContent = data.app;
    $('prologue-clock').textContent = data.time;
    $('prologue-title').textContent = data.from;
    $('prologue-img').src = imgUrl;
    $('prologue-text').textContent = data.text;
    $('prologue-after').textContent = data.after;
    this.onceHandlers['btn-prologue'] = onNext;
    this.show('prologue');
  }

  showIntro(stage, onStart) {
    $('intro-ordinal').textContent = stage.ordinal;
    $('intro-name').textContent = stage.name;
    markNumeric($('intro-name'), stage.name);
    $('intro-place').textContent = stage.place;
    $('intro-goal').textContent = `الهدف: ${stage.objective.find}`;
    this.onceHandlers['btn-intro'] = () => {
      this.finishTyping();
      onStart();
    };
    this.show('intro');
    this.typeText($('intro-text'), stage.intro);
  }

  showCard(item, imgUrl, count, total, onClose) {
    $('card-count').textContent = `ذكرى مستعادة · ${count} من ${total}`;
    $('card-img').src = imgUrl;
    $('card-img').alt = item.name;
    $('card-name').textContent = item.name;
    $('card-desc').textContent = item.desc;
    this.onceHandlers['btn-card'] = onClose;
    this.show('card');
  }

  showLetter(letter, onClose) {
    $('letter-title').textContent = letter.title;
    const body = $('letter-body');
    body.replaceChildren(
      ...letter.lines.map((l, i) => {
        const p = document.createElement('p');
        p.textContent = l;
        p.style.animationDelay = `${0.4 + i * 1.1}s`;
        return p;
      }),
    );
    this.onceHandlers['btn-letter'] = onClose;
    this.show('letter');
  }

  setPauseInfo(text) {
    $('pause-info').textContent = text;
  }

  showOutro({ stage, imgUrl, time, count, total, next }) {
    $('outro-ordinal').textContent = `انتهت ${stage.ordinal}`;
    $('outro-title').textContent = stage.name;
    markNumeric($('outro-title'), stage.name);
    $('outro-text').textContent = stage.outro;
    $('outro-img').src = imgUrl;
    $('outro-img').alt = stage.item.name;
    $('outro-item').textContent = `${stage.item.name} · ${count} من ${total}`;
    const tm = document.createElement('bdi');
    tm.className = 'mono';
    tm.textContent = formatTime(time);
    $('outro-time').replaceChildren('وقت المرحلة: ', tm);
    $('outro-next').textContent = `${next.ordinal}: ${next.name} · ${stage.next.place}`;
    $('outro-teaser').textContent = stage.next.teaser;
    this.show('outro');
  }

  setLose(stage) {
    $('lose-level').textContent = `${stage.ordinal} · ${stage.name}`;
  }

  showEnding(ending) {
    $('ending-1').textContent = ending.lines[0];
    $('ending-2').textContent = ending.lines[1];
    $('ending-time').textContent = ending.time;
    $('ending-end').textContent = ending.end;
    this.show('ending');
  }

  setMuted(muted) {
    this.muteBtn.classList.toggle('is-muted', muted);
    this.muteBtn.setAttribute('aria-pressed', String(muted));
    this.muteBtn.setAttribute('aria-label', muted ? 'شغّل الصوت' : 'اكتم الصوت');
  }

  setTouchMode(on) {
    document.body.classList.toggle('touch', on);
  }

  setTouchLayer(visible) {
    this.touchLayer.hidden = !visible;
  }

  toast(text, ms = 2200) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('is-visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('is-visible'), ms);
  }

  showError(text) {
    if (text) $('error-text').textContent = text;
    this.show('error');
  }
}
