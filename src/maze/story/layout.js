// توزيع عناصر القصة داخل المتاهة: أين يوضع الغرض، اللوحات، اللافتات، ظهور ليان، والأحداث.
// كل شيء يُوزَّع على طول "الطريق الأساسي" من البداية للمخرج، فيصادفه اللاعب بترتيب القصة.
import { DIRS, bfs, findPath } from '../mazeGenerator.js';

const dirIndex = (d) => DIRS.indexOf(d);
const dirOf = (dx, dz) => DIRS.find((d) => d.dx === dx && d.dz === dz);
const opposite = (d) => dirOf(-d.dx, -d.dz);
export const faceKey = (f) => `${f.x},${f.z},${dirIndex(f.d)}`;

// اتجاه السهم: يمين أو يسار بالنسبة لشخص ينظر نحو الجدار d
function arrowFor(facing, next) {
  const right = { dx: -facing.dz, dz: facing.dx };
  return next.dx === right.dx && next.dz === right.dz ? 'right' : 'left';
}

export function planStory(maze, stage, rng) {
  const { W, H, isWall, path, exit, start } = maze;
  const open = (x, z) => !isWall(x, z);
  const last = path.length - 1;
  const idxOf = new Map(path.map((t, i) => [`${t.x},${t.z}`, i]));
  const progressAt = (i) => (last > 0 ? i / last : 0);

  // المسافة من الطريق الأساسي، وأقرب نقطة عليه
  const toPath = bfs(W, H, isWall, path);
  const info = (x, z) => {
    const k = z * W + x;
    return { dist: toPath.dist[k], attach: toPath.origin[k] };
  };

  // كل وجوه الجدران المطلة على الممرات
  const faces = [];
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      if (!open(x, z)) continue;
      for (const d of DIRS) {
        if (!isWall(x + d.dx, z + d.dz)) continue;
        if (x === exit.x && z === exit.z && d === exit.dir) continue;
        const inf = info(x, z);
        faces.push({ x, z, d, dist: inf.dist, attach: inf.attach, progress: progressAt(inf.attach) });
      }
    }
  }
  const used = new Set();
  const usedTiles = new Map();
  const take = (f) => {
    used.add(faceKey(f));
    usedTiles.set(`${f.x},${f.z}`, (usedTiles.get(`${f.x},${f.z}`) || 0) + 1);
    return f;
  };
  const free = (f) => !used.has(faceKey(f));
  // يختار أنسب وجه حسب درجة (الأقل أفضل)
  const pick = (filter, score) => {
    let best = null;
    let bestScore = Infinity;
    for (const f of faces) {
      if (!free(f) || !filter(f)) continue;
      const s = score(f) + (usedTiles.get(`${f.x},${f.z}`) || 0) * 0.25 + rng() * 0.05;
      if (s < bestScore) {
        bestScore = s;
        best = f;
      }
    }
    return best ? take(best) : null;
  };

  const plan = {
    stage,
    path,
    progressAt,
    signs: [],
    pictures: [],
    props: [],
    doors: [],
    handprints: [],
    tables: [],
    layan: null,
    events: [],
    item: null,
    usedFaces: used,
  };

  // 1) مكان الغرض الأساسي: نهاية مغلقة قريبة من الطريق، في منتصف الرحلة تقريبًا
  const site = stage.item.site;
  const hidden = site === 'hidden';
  const deadEnds = [];
  for (let z = 1; z < H; z += 2) {
    for (let x = 1; x < W; x += 2) {
      if (!open(x, z) || maze.openCount(x, z) !== 1) continue;
      if ((x === start.x && z === start.z) || (x === exit.x && z === exit.z)) continue;
      const inf = info(x, z);
      if (inf.dist < 1) continue;
      deadEnds.push({ x, z, ...inf, progress: progressAt(inf.attach) });
    }
  }
  const wantDist = hidden ? 4 : 2;
  const wantProg = hidden ? 0.5 : 0.55;
  let best = null;
  let bestScore = Infinity;
  for (const de of deadEnds) {
    if (de.attach < 2 || de.attach > last - 2) continue;
    const s = Math.abs(de.progress - wantProg) * 2 + Math.abs(de.dist - wantDist) * 0.15 + rng() * 0.05;
    if (s < bestScore) {
      bestScore = s;
      best = de;
    }
  }
  let itemFace;
  if (best) {
    const opening = DIRS.find((d) => open(best.x + d.dx, best.z + d.dz));
    itemFace = { x: best.x, z: best.z, d: opposite(opening), attach: best.attach };
  } else {
    // احتياط: جدار جانبي على الطريق نفسه في منتصفه
    const mid = path[Math.round(last * 0.55)];
    const d = DIRS.find((dd) => isWall(mid.x + dd.dx, mid.z + dd.dz));
    itemFace = { x: mid.x, z: mid.z, d, attach: Math.round(last * 0.55) };
  }
  take(itemFace);
  const attachTile = path[itemFace.attach];
  plan.item = {
    ...stage.item,
    face: itemFace,
    attach: itemFace.attach,
    branch: findPath(maze, attachTile, { x: itemFace.x, z: itemFace.z }),
  };

  // 2) لافتات الاتجاه عند التفرعات (اختيارية: تساعد ولا تُلزم)
  if (stage.signs?.ratio > 0) {
    const candidates = [];
    for (let i = 1; i < last; i++) {
      const t = path[i];
      const p = path[i - 1];
      const n = path[i + 1];
      if (maze.openCount(t.x, t.z) < 3) continue;
      const din = dirOf(t.x - p.x, t.z - p.z);
      const dnext = dirOf(n.x - t.x, n.z - t.z);
      if (dnext === din || !isWall(t.x + din.dx, t.z + din.dz)) continue;
      candidates.push({ x: t.x, z: t.z, d: din, arrow: arrowFor(din, dnext) });
    }
    candidates.forEach((c, i) => {
      if (i === 0 || rng() < stage.signs.ratio) {
        if (free(c)) plan.signs.push({ face: take(c), arrow: c.arrow, style: stage.signs.style });
      }
    });
  }

  // 3) ظهور ليان: على الطريق، بعد ممر مستقيم حتى يراها اللاعب من بعيد
  if (stage.layan) {
    let target = Math.round(stage.layan.progress * last);
    if (stage.layan.mode === 'point') target = Math.min(target, itemFace.attach - 1);
    target = Math.max(3, Math.min(last - 1, target));
    let chosen = target;
    let bestRun = -1;
    for (let i = Math.max(2, target - 4); i <= Math.min(last - 1, target + 3); i++) {
      const t = path[i];
      let run = 0;
      for (let k = i - 1; k >= 1; k--) {
        const a = path[k];
        const b = path[k - 1];
        if (a.x - b.x === t.x - path[i - 1].x && a.z - b.z === t.z - path[i - 1].z) run++;
        else break;
      }
      const s = run * 2 - Math.abs(i - target);
      if (s > bestRun) {
        bestRun = s;
        chosen = i;
      }
    }
    const t = path[chosen];
    const prev = path[chosen - 1];
    const next = path[chosen + 1];
    const side = DIRS.find((d) => open(t.x + d.dx, t.z + d.dz) && !(t.x + d.dx === prev.x && t.z + d.dz === prev.z) && !(t.x + d.dx === next.x && t.z + d.dz === next.z));
    const approach = dirOf(t.x - prev.x, t.z - prev.z);
    // تركض مبتعدة عن اللاعب (ظهرها له): نكمل بنفس الاتجاه إن أمكن
    const ahead = open(t.x + approach.dx, t.z + approach.dz) ? approach : null;
    plan.layan = {
      ...stage.layan,
      tile: t,
      index: chosen,
      approach,
      runDir: ahead || side || dirOf(next.x - t.x, next.z - t.z),
      pointTo: itemFace,
    };
  }

  // 4) الأحداث المرتبطة بالتقدم في الطريق
  for (const ev of stage.events || []) {
    if (ev.progress == null) plan.events.push({ ...ev });
    else plan.events.push({ ...ev, index: Math.max(1, Math.min(last - 1, Math.round(ev.progress * last))) });
  }

  // 5) الساعة قرب البداية (على جدار جانبي يُرى من أول خطوة)
  const nearStart = (f) => f.dist === 0 && f.attach <= 3;
  const notBehindStart = (f) => !(f.x === start.x && f.z === start.z && f.d === opposite(maze.startDir));

  // 6) اللوحات والصور: كل واحدة مرة واحدة، موزعة بالترتيب على طول الطريق
  const pics = stage.pictures || [];
  const regular = pics.filter((p) => p.near !== 'start');
  pics.forEach((p) => {
    let target;
    if (p.near === 'start') target = 0.04;
    else target = 0.12 + ((regular.indexOf(p) + 0.5) / regular.length) * 0.78;
    const f = pick(
      (ff) => ff.dist === 0 && notBehindStart(ff) && ff.attach > 0 && ff.attach < last,
      (ff) => Math.abs(ff.progress - target) * 4,
    );
    if (f) plan.pictures.push({ ...p, face: f });
  });

  // 7) أبواب الغرف (هوية الفندق) وأرقامها تتصاعد مع الطريق
  let roomNo = stage.rooms.from;
  const nextRoom = () => {
    while (roomNo === 212 || roomNo === 214 || roomNo === stage.rooms.exitDoor) roomNo++;
    return roomNo++;
  };

  // 8) الأغراض والتفاصيل الخاصة بكل مرحلة
  for (const prop of stage.props || []) {
    const count = prop.count || 1;
    for (let k = 0; k < count; k++) {
      const lines = k === 0 ? prop.lines : null;
      if (prop.kind === 'clock') {
        const f = pick((ff) => nearStart(ff) && notBehindStart(ff), (ff) => ff.attach * 0.5 + (ff.d === maze.startDir ? 0 : 0.3));
        if (f) plan.props.push({ kind: 'clock', face: f, lines });
      } else if (prop.kind === 'notice' || prop.kind === 'drawerNote' || prop.kind === 'phone') {
        const target = prop.kind === 'notice' ? 0.2 : prop.kind === 'phone' ? 0.35 : 0.42;
        const f = pick((ff) => ff.dist === 0 && ff.attach > 1, (ff) => Math.abs(ff.progress - target) * 4);
        if (f) plan.props.push({ kind: prop.kind, face: f, lines });
      } else if (prop.kind === 'suitcase') {
        const f = pick((ff) => ff.dist === 0 && ff.attach > 1, (ff) => Math.abs(ff.progress - 0.55) * 4);
        if (f) {
          plan.doors.push({ face: f, number: nextRoom() });
          plan.props.push({ kind: 'suitcase', face: f, lines });
        }
      } else if (prop.kind === 'roomDoor') {
        const f = pick((ff) => ff.dist === 0 && ff.attach > 1, (ff) => Math.abs(ff.progress - 0.72) * 4);
        if (f) plan.doors.push({ face: f, number: prop.number, lines });
      } else if (prop.kind === 'starDoors' || prop.kind === 'ajarDoors') {
        const target = 0.2 + (k / count) * 0.6;
        const f = pick((ff) => ff.dist === 0 && ff.attach > 1, (ff) => Math.abs(ff.progress - target) * 4);
        if (f) plan.doors.push({ face: f, number: nextRoom(), star: prop.kind === 'starDoors', ajar: prop.kind === 'ajarDoors', burnt: stage.env.soot });
      } else if (prop.kind === 'brokenVase') {
        const target = 0.3 + (k / count) * 0.4;
        const f = pick((ff) => ff.dist === 0 && ff.attach > 1, (ff) => Math.abs(ff.progress - target) * 4);
        if (f) plan.props.push({ kind: 'brokenVase', face: f, lines });
      } else if (prop.kind === 'vase' || prop.kind === 'ribbonTable') {
        // طاولة في نهاية مغلقة (أو على جدار جانبي إن ما وجدنا)
        const f =
          pick((ff) => ff.dist > 0 && maze.openCount(ff.x, ff.z) === 1 && ff.d === opposite(DIRS.find((d) => open(ff.x + d.dx, ff.z + d.dz))), (ff) => ff.dist * 0.2 + Math.abs(ff.progress - 0.5)) ||
          pick((ff) => ff.dist === 0 && ff.attach > 1, (ff) => Math.abs(ff.progress - 0.6));
        if (f) plan.tables.push({ face: f, ribbon: prop.kind === 'ribbonTable', flowers: prop.kind === 'vase' ? stage.env.flowers : stage.env.flowers === 'broken' ? 'none' : stage.env.flowers, lines });
      }
    }
  }

  // أبواب غرف إضافية لهوية الفندق (بدون نصوص)
  const extraDoors = Math.max(0, Math.round(last / 8) - plan.doors.length);
  for (let k = 0; k < extraDoors; k++) {
    const target = (k + 0.5) / extraDoors;
    const f = pick((ff) => ff.dist <= 1 && ff.attach > 0, (ff) => Math.abs(ff.progress - target) * 3);
    if (f) plan.doors.push({ face: f, number: nextRoom(), burnt: stage.env.soot, ajar: stage.env.soot && rng() < 0.3 });
  }

  // 9) آثار الأيادي (المرحلة الرابعة): من قبل التفرع بأربع خطوات حتى باب النجمة
  if (site === 'starDoor') {
    const route = [];
    for (let i = Math.max(1, itemFace.attach - 4); i <= itemFace.attach; i++) route.push(path[i]);
    plan.item.branch.slice(1).forEach((t) => route.push(t));
    route.forEach((t, i) => {
      const sides = DIRS.filter((d) => isWall(t.x + d.dx, t.z + d.dz));
      if (!sides.length) return;
      const d = sides[i % sides.length];
      plan.handprints.push({ face: { x: t.x, z: t.z, d }, offset: (rng() - 0.5) * 1.4, height: 0.75 + rng() * 0.45, rot: (rng() - 0.5) * 0.6 });
    });
  }

  return plan;
}
