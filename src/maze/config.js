// إعدادات اللعبة في مكان واحد: المقاسات، السرعات، الصعوبة، والألوان.

// المقاسات بالمتر
export const TILE = 3; // عرض المربع الواحد في شبكة المتاهة
export const WALL_H = 3.2; // ارتفاع الجدار
export const EYE_H = 1.62; // ارتفاع عين اللاعب
export const PLAYER_RADIUS = 0.35; // نصف قطر جسم اللاعب للتصادم
export const RUNNER_W = 1.7; // عرض السجادة الحمراء في الممر

// السرعات بالمتر في الثانية
export const WALK_SPEED = 3.2;
export const RUN_SPEED = 5.4;

// حساسية النظر (راديان لكل بكسل)
export const MOUSE_SENS = 0.0022;
export const TOUCH_SENS = 0.0055;

// الصعوبة: حجم المتاهة يكبر مع كل مستوى، والوقت يُحسب من طول أقصر طريق
export const DIFFICULTIES = {
  easy: { label: 'سهل', baseCells: 5, growth: 1, maxCells: 14, timeFactor: 3.4, bonus: 25, braid: 0 },
  medium: { label: 'متوسط', baseCells: 7, growth: 1, maxCells: 18, timeFactor: 2.6, bonus: 20, braid: 0.06 },
  hard: { label: 'صعب', baseCells: 9, growth: 2, maxCells: 24, timeFactor: 2.0, bonus: 15, braid: 0.12 },
};

// ألوان المشهد (مستوحاة من ممرات فندق قديم: سجاد أحمر، خشب داكن، إضاءة دافئة)
// غيّر هذه القيم لتغيير طابع المتاهة كله.
export const THEME = {
  background: 0x0c0505,
  fog: 0x0c0505,
  fogDensity: 0.07,
  hemiSky: 0x6a3328,
  hemiGround: 0x120606,
  hemiIntensity: 0.55,

  wallpaper: '#5c0c10',
  wallpaperShade: '#4a080c',
  wallpaperPattern: '#741519',
  wood: '#1d0f0a',
  woodLight: '#33190f',
  woodDark: '#110805',
  gold: '#b8904f',
  goldLight: '#e2c27d',

  floorWood: '#1b0e08',
  carpet: '#7c0b10',
  carpetPattern: '#5c070b',
  carpetBorder: '#b88d4a',
  ceiling: '#2a0a0b',

  lamp: 0xffb066, // لون مصابيح الجدار
  flashlight: 0xffe2b8,
  exitLight: 0xfff0d2,
  signText: '#c41d0c',
  doorNumber: '#d9b56a',
};

// عدد أضواء الجدار الحقيقية التي تتبع اللاعب (الباقي يتوهج فقط)
export const LIGHT_POOL_SIZE = 6;
export const LIGHT_RANGE = 14;
