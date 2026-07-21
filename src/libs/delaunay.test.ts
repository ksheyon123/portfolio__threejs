import { describe, test, expect } from "vitest";
import { triangulate, type Pt } from "./delaunay";

// 들로네 삼각분할의 순수 계산 불변식을 검증한다.
// (특정 대각선 선택은 공원(cocircular) 점에서 구현 의존이라 단언하지 않고,
//  겹침 없음·빈 외접원·CCW 같은 성질로 판정한다.)

// ── 테스트용 기하 헬퍼 ─────────────────────────────────
const flatToTris = (flat: number[]): [number, number, number][] => {
  const out: [number, number, number][] = [];
  for (let i = 0; i < flat.length; i += 3) out.push([flat[i], flat[i + 1], flat[i + 2]]);
  return out;
};

// 부호 있는 넓이 (CCW > 0)
const signedArea = (a: Pt, b: Pt, c: Pt) =>
  ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;

// d가 CCW 삼각형 (a,b,c)의 외접원 안에 (엄격히) 있으면 > 0
const inCircle = (a: Pt, b: Pt, c: Pt, d: Pt) => {
  const ax = a.x - d.x, ay = a.y - d.y;
  const bx = b.x - d.x, by = b.y - d.y;
  const cx = c.x - d.x, cy = c.y - d.y;
  return (
    (ax * ax + ay * ay) * (bx * cy - cx * by) -
    (bx * bx + by * by) * (ax * cy - cx * ay) +
    (cx * cx + cy * cy) * (ax * by - bx * ay)
  );
};

// 볼록 껍질 넓이 (모노톤 체인 + 신발끈)
const hullArea = (pts: Pt[]): number => {
  const p = [...pts].sort((u, v) => (u.x === v.x ? u.y - v.y : u.x - v.x));
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0)
      lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0)
      upper.pop();
    upper.push(q);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  let area = 0;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
};

const triAreaSum = (pts: Pt[], flat: number[]) =>
  flatToTris(flat).reduce(
    (s, [a, b, c]) => s + Math.abs(signedArea(pts[a], pts[b], pts[c])),
    0,
  );

describe("triangulate — 2D 들로네 (Bowyer–Watson)", () => {
  test("점 3개 미만이면 삼각형 없음", () => {
    expect(triangulate([])).toEqual([]);
    expect(triangulate([{ x: 0, y: 0 }])).toEqual([]);
    expect(triangulate([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual([]);
  });

  test("공선 점들은 면을 만들 수 없다 → 빈 결과", () => {
    expect(triangulate([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }])).toEqual([]);
    expect(
      triangulate([
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
      ]),
    ).toEqual([]);
  });

  test("비공선 3점은 삼각형 1개 (CCW)", () => {
    const pts: Pt[] = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }];
    const flat = triangulate(pts);
    expect(flat.length).toBe(3);
    const [a, b, c] = flat;
    expect(new Set([a, b, c])).toEqual(new Set([0, 1, 2]));
    expect(signedArea(pts[a], pts[b], pts[c])).toBeGreaterThan(0); // CCW
  });

  test("볼록 사각형은 삼각형 2개, 넓이 합 = 사각형 넓이 (겹침·구멍 없음)", () => {
    const pts: Pt[] = [
      { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 },
    ];
    const flat = triangulate(pts);
    expect(flat.length).toBe(2 * 3);
    expect(triAreaSum(pts, flat)).toBeCloseTo(16);
  });

  test("내부 점을 넣어도 넓이 합은 그대로 = 겹침이 안 생긴다 (이번 리비전의 목적)", () => {
    const pts: Pt[] = [
      { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 },
      { x: 2, y: 2 }, // 정중앙 내부 점
    ];
    const flat = triangulate(pts);
    // 중앙점이 네 모서리로 연결 → 삼각형 4개
    expect(flat.length).toBe(4 * 3);
    // 넓이 합이 여전히 16 → 삼각형이 서로 안 겹치고 사각형을 정확히 덮는다
    expect(triAreaSum(pts, flat)).toBeCloseTo(16);
    // 모든 삼각형이 CCW
    for (const [a, b, c] of flatToTris(flat)) {
      expect(signedArea(pts[a], pts[b], pts[c])).toBeGreaterThan(0);
    }
  });

  test("들로네 성질: 어떤 삼각형의 외접원 안에도 다른 점이 엄격히 들어가지 않는다", () => {
    const pts: Pt[] = [
      { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 3 },
      { x: 2, y: 5 }, { x: -1, y: 3 }, { x: 2, y: 2 },
    ];
    const flat = triangulate(pts);
    const eps = 1e-6;
    for (const [a, b, c] of flatToTris(flat)) {
      for (let d = 0; d < pts.length; d++) {
        if (d === a || d === b || d === c) continue;
        // CCW로 정렬해 부호 규약을 맞춘다
        const ccw = signedArea(pts[a], pts[b], pts[c]) > 0 ? [a, b, c] : [a, c, b];
        const val = inCircle(pts[ccw[0]], pts[ccw[1]], pts[ccw[2]], pts[d]);
        // 스케일 정규화: 좌표^4 규모라 상대 임계값 사용
        expect(val).toBeLessThan(eps * 1e6);
      }
    }
  });

  test("비공선 N≥3에서 모든 입력 점이 최소 한 삼각형에 등장한다", () => {
    const pts: Pt[] = [
      { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 3 },
      { x: 2, y: 5 }, { x: -1, y: 3 }, { x: 2, y: 2 },
    ];
    const flat = triangulate(pts);
    const used = new Set(flat);
    for (let i = 0; i < pts.length; i++) expect(used.has(i)).toBe(true);
  });
});
