/** 2D 점. */
export interface Pt {
  x: number;
  y: number;
}

/** 인덱스로 표현한 삼각형 (points 배열 기준). */
interface Tri {
  a: number;
  b: number;
  c: number;
}

// (a→b, a→c)의 외적 = 부호 있는 넓이의 2배. CCW면 > 0.
function cross2(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

/**
 * d가 CCW 삼각형 (a,b,c)의 외접원 안에 있으면 > 0.
 * (a,b,c가 CCW라는 전제하의 in-circle 행렬식.)
 */
function inCircle(p: Pt[], a: number, b: number, c: number, d: number): number {
  const ax = p[a].x - p[d].x, ay = p[a].y - p[d].y;
  const bx = p[b].x - p[d].x, by = p[b].y - p[d].y;
  const cx = p[c].x - p[d].x, cy = p[c].y - p[d].y;
  return (
    (ax * ax + ay * ay) * (bx * cy - cx * by) -
    (bx * bx + by * by) * (ax * cy - cx * ay) +
    (cx * cx + cy * cy) * (ax * by - bx * ay)
  );
}

/**
 * 2D 들로네 삼각분할 (Bowyer–Watson).
 *
 * 임의의 점집합을 **겹침·구멍 없이** 삼각형으로 나눈다. 클릭한 모든 점이 정점이 되며,
 * 점집합의 **볼록 껍질 영역**을 채운다(내부 점은 삼각형을 쪼갠다). 팬 방식과 달리
 * 점을 어디에·어떤 순서로 주든 면이 겹치지 않는다.
 *
 * @returns 삼각형 인덱스의 flat 배열 `[a,b,c, a,b,c, …]`. 각 삼각형은 **CCW**.
 *   점 3개 미만이거나 모두 공선이면 빈 배열.
 */
export function triangulate(input: Pt[]): number[] {
  const n = input.length;
  if (n < 3) return [];

  // 경계 상자 → 모든 점을 품는 슈퍼삼각형.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of input) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const dmax = Math.max(maxX - minX, maxY - minY);
  if (dmax === 0) return []; // 모든 점이 한 자리에 겹침
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const m = dmax * 20 + 10; // 넉넉한 여유

  // 슈퍼삼각형 정점을 인덱스 n, n+1, n+2로 덧붙인다.
  const pts: Pt[] = input.concat([
    { x: midX - m, y: midY - m },
    { x: midX + m, y: midY - m },
    { x: midX, y: midY + m },
  ]);

  // 삼각형을 항상 CCW로 저장(in-circle 부호 규약을 맞추기 위해).
  const makeTri = (a: number, b: number, c: number): Tri =>
    cross2(pts[a].x, pts[a].y, pts[b].x, pts[b].y, pts[c].x, pts[c].y) < 0
      ? { a, b: c, c: b }
      : { a, b, c };

  let tris: Tri[] = [makeTri(n, n + 1, n + 2)];

  // 점을 하나씩 삽입.
  for (let i = 0; i < n; i++) {
    // 1) i를 외접원에 품는 '나쁜' 삼각형을 찾는다.
    const bad = new Set<Tri>();
    for (const t of tris) {
      if (inCircle(pts, t.a, t.b, t.c, i) > 1e-9) bad.add(t);
    }

    // 2) 나쁜 삼각형들의 경계(한 번만 나오는 변)를 구한다.
    const count = new Map<string, number>();
    const edge = new Map<string, [number, number]>();
    const add = (u: number, v: number) => {
      const key = u < v ? `${u}_${v}` : `${v}_${u}`;
      count.set(key, (count.get(key) ?? 0) + 1);
      edge.set(key, [u, v]);
    };
    for (const t of bad) {
      add(t.a, t.b);
      add(t.b, t.c);
      add(t.c, t.a);
    }

    // 3) 나쁜 삼각형 제거 후, 경계 변마다 i로 새 삼각형을 만들어 구멍을 메운다.
    tris = tris.filter((t) => !bad.has(t));
    for (const [key, c] of count) {
      if (c === 1) {
        const [u, v] = edge.get(key)!;
        tris.push(makeTri(u, v, i));
      }
    }
  }

  // 슈퍼삼각형 정점을 참조하거나 넓이가 0(공선/중복)인 삼각형은 버린다.
  const out: number[] = [];
  for (const t of tris) {
    if (t.a >= n || t.b >= n || t.c >= n) continue;
    if (Math.abs(cross2(pts[t.a].x, pts[t.a].y, pts[t.b].x, pts[t.b].y, pts[t.c].x, pts[t.c].y)) < 1e-9)
      continue;
    out.push(t.a, t.b, t.c);
  }
  return out;
}
