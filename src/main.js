import './style.css';

// صفحة البداية: دوائر تتحرك داخل canvas للتأكد أن كل شيء يعمل.
// عند تفعيل "تقليل الحركة" في الجهاز نرسم إطارًا ثابتًا بدل الحركة.

const canvas = document.querySelector('#stage');
const ctx = canvas.getContext('2d');

const colors = ['#38bdf8', '#a78bfa', '#f472b6', '#facc15', '#34d399'];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let width = 0;
let height = 0;
let animationId = null;

// اضبط دقة الرسم حسب حجم العنصر على الشاشة وكثافة البكسل.
function resize() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

// ارسم إطارًا واحدًا. الوقت t بالثواني.
function draw(t) {
  ctx.clearRect(0, 0, width, height);

  const count = colors.length;
  const gap = width / (count + 1);
  const radius = Math.min(gap * 0.3, height * 0.12);

  colors.forEach((color, i) => {
    const x = gap * (i + 1);
    const wave = Math.sin(t * 2 + i * 0.8);
    const y = height / 2 + wave * height * 0.22;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}

function loop(now) {
  draw(now / 1000);
  animationId = requestAnimationFrame(loop);
}

function start() {
  cancelAnimationFrame(animationId);
  animationId = null;

  if (reducedMotion.matches) {
    draw(0.6); // إطار ثابت بدون حركة
  } else {
    animationId = requestAnimationFrame(loop);
  }
}

resize();
start();

window.addEventListener('resize', () => {
  resize();
  if (reducedMotion.matches) draw(0.6);
});

// إذا غيّر المستخدم إعداد تقليل الحركة والصفحة مفتوحة
reducedMotion.addEventListener('change', start);
