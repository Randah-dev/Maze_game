// التصادم: اللاعب دائرة على الأرض، والجدران مربعات في الشبكة.
// ندفع الدائرة خارج أي مربع جدار تتداخل معه، فينزلق اللاعب على الجدار بدل أن يتوقف.
import { TILE } from './config.js';

function pushOutOfBox(pos, r, minX, maxX, minZ, maxZ) {
  const cx = Math.max(minX, Math.min(pos.x, maxX));
  const cz = Math.max(minZ, Math.min(pos.z, maxZ));
  let dx = pos.x - cx;
  let dz = pos.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    pos.x += (dx / d) * (r - d);
    pos.z += (dz / d) * (r - d);
  } else {
    // المركز داخل الصندوق: نخرجه من أقرب جهة
    const left = pos.x - minX;
    const right = maxX - pos.x;
    const top = pos.z - minZ;
    const bottom = maxZ - pos.z;
    const m = Math.min(left, right, top, bottom);
    if (m === left) pos.x = minX - r;
    else if (m === right) pos.x = maxX + r;
    else if (m === top) pos.z = minZ - r;
    else pos.z = maxZ + r;
  }
  return true;
}

export function resolveCollisions(maze, colliders, pos, r) {
  for (let iter = 0; iter < 3; iter++) {
    let hit = false;
    const tx = Math.floor(pos.x / TILE);
    const tz = Math.floor(pos.z / TILE);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = tx + dx;
        const z = tz + dz;
        if (!maze.isWall(x, z)) continue; // خارج الحدود يُعتبر جدارًا أيضًا
        hit = pushOutOfBox(pos, r, x * TILE, (x + 1) * TILE, z * TILE, (z + 1) * TILE) || hit;
      }
    }
    for (const c of colliders) hit = pushOutOfBox(pos, r, c.minX, c.maxX, c.minZ, c.maxZ) || hit;
    if (!hit) break;
  }
}
