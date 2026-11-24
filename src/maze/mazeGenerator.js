// توليد المتاهة: شبكة مربعات، كل مربع إما جدار (1) أو ممر (0).
// الخلايا تقع في المواقع الفردية، والجدران بينها. نستخدم خوارزمية "الحفر مع التراجع".
// كل مرحلة تمرر إعدادات مختلفة، فيتغير شكل المتاهة بشكل طبيعي:
//   straight: ميل للاستمرار بنفس الاتجاه (ممرات طويلة) أو للالتفاف كثيرًا (ممرات ملتوية)
//   braid: فتح بعض النهايات المغلقة لصنع طرق دائرية
import { shuffle } from './rng.js';

export const DIRS = [
  { dx: 0, dz: -1 }, // شمال
  { dx: 1, dz: 0 }, // شرق
  { dx: 0, dz: 1 }, // جنوب
  { dx: -1, dz: 0 }, // غرب
];

export function generateMaze(cellsW, cellsH, rng, { braid = 0, straight = 0.3 } = {}) {
  const W = cellsW * 2 + 1;
  const H = cellsH * 2 + 1;
  const grid = new Uint8Array(W * H).fill(1);
  const at = (x, z) => z * W + x;

  // 1) حفر الممرات
  const visited = new Uint8Array(cellsW * cellsH);
  const startCell = pickCorner(cellsW, cellsH, rng);
  const stack = [{ ...startCell, from: null }];
  visited[startCell.z * cellsW + startCell.x] = 1;
  grid[at(startCell.x * 2 + 1, startCell.z * 2 + 1)] = 0;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const options = [];
    for (const d of DIRS) {
      const nx = cur.x + d.dx;
      const nz = cur.z + d.dz;
      if (nx >= 0 && nz >= 0 && nx < cellsW && nz < cellsH && !visited[nz * cellsW + nx]) {
        options.push({ x: nx, z: nz, d });
      }
    }
    if (!options.length) {
      stack.pop();
      continue;
    }
    // نفضّل الاستمرار بنفس الاتجاه بنسبة straight
    const same = cur.from && options.find((o) => o.d === cur.from);
    const next = same && rng() < straight ? same : options[Math.floor(rng() * options.length)];
    visited[next.z * cellsW + next.x] = 1;
    grid[at(cur.x * 2 + 1 + next.d.dx, cur.z * 2 + 1 + next.d.dz)] = 0;
    grid[at(next.x * 2 + 1, next.z * 2 + 1)] = 0;
    stack.push({ x: next.x, z: next.z, from: next.d });
  }

  const isWall = (x, z) => x < 0 || z < 0 || x >= W || z >= H || grid[at(x, z)] === 1;
  const openCount = (x, z) => DIRS.reduce((n, d) => n + (isWall(x + d.dx, z + d.dz) ? 0 : 1), 0);

  // 2) فتح بعض النهايات المغلقة لصنع طرق دائرية (تزيد التيه في المراحل الأصعب)
  if (braid > 0) {
    const cells = [];
    for (let cz = 0; cz < cellsH; cz++) for (let cx = 0; cx < cellsW; cx++) cells.push({ x: cx * 2 + 1, z: cz * 2 + 1 });
    shuffle(cells, rng);
    for (const c of cells) {
      if (openCount(c.x, c.z) !== 1 || rng() > braid) continue;
      const walls = DIRS.filter((d) => {
        const wx = c.x + d.dx;
        const wz = c.z + d.dz;
        return wx > 0 && wz > 0 && wx < W - 1 && wz < H - 1 && isWall(wx, wz);
      });
      if (!walls.length) continue;
      const d = walls[Math.floor(rng() * walls.length)];
      grid[at(c.x + d.dx, c.z + d.dz)] = 0;
    }
  }

  // 3) المسافات من نقطة البداية، ثم المخرج في أبعد نهاية مغلقة
  const start = { x: startCell.x * 2 + 1, z: startCell.z * 2 + 1 };
  const dist = bfs(W, H, isWall, [start]).dist;
  let exit = null;
  let best = -1;
  for (let z = 1; z < H; z += 2) {
    for (let x = 1; x < W; x += 2) {
      const dd = dist[at(x, z)];
      if (dd > best && openCount(x, z) === 1) {
        best = dd;
        exit = { x, z };
      }
    }
  }
  if (!exit) {
    // احتياط: أبعد خلية حتى لو لم تكن نهاية مغلقة
    for (let z = 1; z < H; z += 2) for (let x = 1; x < W; x += 2) if (dist[at(x, z)] > best) { best = dist[at(x, z)]; exit = { x, z }; }
  }

  // الباب على الجدار المقابل لمدخل الممر، فيراه اللاعب في نهاية الممر
  const opening = DIRS.find((d) => !isWall(exit.x + d.dx, exit.z + d.dz));
  const doorDir = DIRS.find((d) => d.dx === -opening.dx && d.dz === -opening.dz && isWall(exit.x + d.dx, exit.z + d.dz))
    || DIRS.find((d) => isWall(exit.x + d.dx, exit.z + d.dz));
  exit.dir = doorDir;

  const startDir = DIRS.find((d) => !isWall(start.x + d.dx, start.z + d.dz));

  const maze = { W, H, grid, isWall, openCount, start, startDir, exit, pathTiles: best, cellsW, cellsH };
  maze.path = findPath(maze, start, exit);
  return maze;
}

function pickCorner(cw, ch, rng) {
  const corners = [
    { x: 0, z: 0 },
    { x: cw - 1, z: 0 },
    { x: 0, z: ch - 1 },
    { x: cw - 1, z: ch - 1 },
  ];
  return corners[Math.floor(rng() * corners.length)];
}

// بحث بالعرض من مصدر واحد أو أكثر: يعيد المسافة ومن أين جئنا لكل مربع
export function bfs(W, H, isWall, sources) {
  const dist = new Int32Array(W * H).fill(-1);
  const prev = new Int32Array(W * H).fill(-1);
  const origin = new Int32Array(W * H).fill(-1);
  const queue = [];
  sources.forEach((s, i) => {
    dist[s.z * W + s.x] = 0;
    origin[s.z * W + s.x] = i;
    queue.push(s.x, s.z);
  });
  for (let head = 0; head < queue.length; head += 2) {
    const x = queue[head];
    const z = queue[head + 1];
    const k = z * W + x;
    for (const d of DIRS) {
      const nx = x + d.dx;
      const nz = z + d.dz;
      if (isWall(nx, nz)) continue;
      const nk = nz * W + nx;
      if (dist[nk] !== -1) continue;
      dist[nk] = dist[k] + 1;
      prev[nk] = k;
      origin[nk] = origin[k];
      queue.push(nx, nz);
    }
  }
  return { dist, prev, origin };
}

// أقصر طريق بين مربعين: قائمة مربعات من البداية للنهاية
export function findPath(maze, from, to) {
  const { W, H, isWall } = maze;
  const { prev } = bfs(W, H, isWall, [from]);
  const path = [];
  let k = to.z * W + to.x;
  const startK = from.z * W + from.x;
  while (k !== -1) {
    path.push({ x: k % W, z: Math.floor(k / W) });
    if (k === startK) break;
    k = prev[k];
  }
  return path.reverse();
}
