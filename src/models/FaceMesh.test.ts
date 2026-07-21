import { describe, test, expect } from "vitest";
import * as THREE from "three";
import { FaceMesh } from "./FaceMesh";

// 정점(2D 좌표) → 면(BufferGeometry)의 순수 계산 부분만 검증한다.
// 들로네 알고리즘 자체(겹침 없음·빈 외접원·CCW)는 libs/delaunay.test.ts에서 검증하고,
// 여기선 FaceMesh가 그 결과를 position·index·edge 버퍼로 올바로 옮기는지를 본다.
// 실제 렌더링·클릭/드래그 상호작용은 WebGL이 필요해 jsdom에서 검증 불가 → 육안 확인(spec 참고).
describe("FaceMesh — 정점으로 면 만들기 (2D 들로네)", () => {
  // CCW 사각형(2×2)과 그 정중앙 내부 점.
  const SQUARE = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ];
  const CENTER = { x: 1, y: 1 };

  describe("2D 정점 목록 → position 버퍼", () => {
    test("정점 N개를 주면 position.count === N", () => {
      const m = new FaceMesh(SQUARE);
      expect(m.geometry.attributes.position.count).toBe(4);
    });

    test("i번째 정점의 position이 (xᵢ, yᵢ, 0)이다", () => {
      const m = new FaceMesh(SQUARE);
      const pos = m.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < SQUARE.length; i++) {
        expect(pos.getX(i)).toBeCloseTo(SQUARE[i].x);
        expect(pos.getY(i)).toBeCloseTo(SQUARE[i].y);
        expect(pos.getZ(i)).toBeCloseTo(0);
      }
    });
  });

  describe("들로네 삼각분할 → index 버퍼", () => {
    test("삼각형(N=3)은 삼각형 1개 → index.count 3", () => {
      const m = new FaceMesh(SQUARE.slice(0, 3));
      expect(m.geometry.index!.count).toBe(3);
    });

    test("볼록 사각형은 삼각형 2개 → index.count 6", () => {
      const m = new FaceMesh(SQUARE);
      expect(m.geometry.index).not.toBeNull();
      expect(m.geometry.index!.count).toBe(2 * 3);
    });

    test("내부 점을 넣으면 삼각형 4개로 쪼개진다(겹침 없이) → index.count 12", () => {
      const m = new FaceMesh([...SQUARE, CENTER]);
      expect(m.geometry.index!.count).toBe(4 * 3);
    });

    test("정점 2개 이하면 면이 없다(index null)", () => {
      expect(new FaceMesh(SQUARE.slice(0, 2)).geometry.index).toBeNull();
      expect(new FaceMesh([]).geometry.index).toBeNull();
    });

    test("공선 점들은 면을 만들 수 없다(index null)", () => {
      const collinear = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ];
      expect(new FaceMesh(collinear).geometry.index).toBeNull();
    });
  });

  describe("법선 계산", () => {
    test("빌드 후 normal attribute가 정점 수만큼 존재한다", () => {
      const m = new FaceMesh(SQUARE);
      const normal = m.geometry.attributes.normal;
      expect(normal).toBeDefined();
      expect(normal.count).toBe(SQUARE.length);
    });

    test("삼각형이 CCW라 정점 법선 z성분은 +1에 가깝다", () => {
      const m = new FaceMesh([...SQUARE, CENTER]);
      const normal = m.geometry.attributes.normal as THREE.BufferAttribute;
      for (let i = 0; i < normal.count; i++) {
        expect(normal.getZ(i)).toBeCloseTo(1);
      }
    });
  });

  describe("삼각형 에지 시각화 (getTriangleEdges)", () => {
    // 무방향 에지를 비교하기 쉬운 정렬 키로.
    const key = (e: [number, number]) =>
      e[0] < e[1] ? `${e[0]}_${e[1]}` : `${e[1]}_${e[0]}`;

    test("N<3이면 빈 배열", () => {
      expect(new FaceMesh(SQUARE.slice(0, 2)).getTriangleEdges()).toEqual([]);
      expect(new FaceMesh([]).getTriangleEdges()).toEqual([]);
    });

    test("삼각형(N=3)은 변 3개, 중복 없음", () => {
      const edges = new FaceMesh(SQUARE.slice(0, 3)).getTriangleEdges();
      expect(edges.length).toBe(3);
      expect(new Set(edges.map(key))).toEqual(new Set(["0_1", "1_2", "0_2"]));
    });

    test("사각형+중앙점은 외곽 4변 + 중앙점 스포크 4변 = 8개", () => {
      const edges = new FaceMesh([...SQUARE, CENTER]).getTriangleEdges();
      const keys = new Set(edges.map(key));
      expect(keys.size).toBe(8);
      // 중앙점(인덱스 4)이 네 모서리 모두와 이어진다
      for (const corner of [0, 1, 2, 3]) expect(keys.has(`${corner}_4`)).toBe(true);
      // 외곽 4변
      for (const side of ["0_1", "1_2", "2_3", "0_3"]) expect(keys.has(side)).toBe(true);
    });

    test("반환된 모든 에지는 무방향 중복이 없다", () => {
      const edges = new FaceMesh([...SQUARE, CENTER]).getTriangleEdges();
      const keys = edges.map(key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    test("에지 인덱스는 실제 정점 범위 안에 있다", () => {
      const m = new FaceMesh([...SQUARE, CENTER]);
      const n = m.getVertices().length;
      for (const [a, b] of m.getTriangleEdges()) {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThan(n);
        expect(a).not.toBe(b);
      }
    });

    test("정점을 추가하면 에지도 재계산된다", () => {
      const m = new FaceMesh(SQUARE.slice(0, 3));
      expect(m.getTriangleEdges().length).toBe(3);
      m.addVertex(CENTER.x, CENTER.y); // 삼각형 내부에 점 추가
      expect(m.getTriangleEdges().length).toBeGreaterThan(3);
    });
  });

  describe("정점 편집 (add / move / remove / reset)", () => {
    test("addVertex는 position.count를 1 늘리고 삼각분할을 재계산한다", () => {
      const m = new FaceMesh(SQUARE.slice(0, 3)); // 삼각형 1개
      m.addVertex(0, 2); // → 볼록 사각형
      expect(m.geometry.attributes.position.count).toBe(4);
      expect(m.geometry.index!.count).toBe(2 * 3); // 삼각형 2개
    });

    test("2개 → 3개(비공선)로 넘어가는 순간 면이 생긴다", () => {
      const m = new FaceMesh(SQUARE.slice(0, 2));
      expect(m.geometry.index).toBeNull();
      m.addVertex(2, 2);
      expect(m.geometry.index!.count).toBe(3);
    });

    test("moveVertex는 재삼각분할한다(공선→비공선으로 옮기면 면이 생긴다)", () => {
      // 이번 리비전의 핵심: 들로네는 위치가 바뀌면 연결도 달라지므로 move도 재빌드해야 한다.
      const m = new FaceMesh([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]); // 세 점이 공선 → 면 없음
      expect(m.geometry.index).toBeNull();
      m.moveVertex(1, 1, 2); // 가운데 점을 선 밖으로
      expect(m.geometry.index!.count).toBe(3); // 삼각형이 생긴다(재삼각분할됨)
    });

    test("moveVertex는 i번째 좌표만 바꾼다(위치 순서는 유지)", () => {
      const m = new FaceMesh(SQUARE);
      m.moveVertex(1, 5, -3);
      const pos = m.geometry.attributes.position as THREE.BufferAttribute;
      expect(pos.getX(1)).toBeCloseTo(5);
      expect(pos.getY(1)).toBeCloseTo(-3);
      expect(pos.getZ(1)).toBeCloseTo(0);
      // 다른 정점은 그대로
      expect(pos.getX(0)).toBeCloseTo(SQUARE[0].x);
    });

    test("removeVertex는 position.count를 1 줄인다", () => {
      const m = new FaceMesh(SQUARE);
      m.removeVertex(0);
      expect(m.geometry.attributes.position.count).toBe(3);
      const pos = m.geometry.attributes.position as THREE.BufferAttribute;
      // 0번이 빠지고 나머지가 당겨진다
      expect(pos.getX(0)).toBeCloseTo(SQUARE[1].x);
    });

    test("reset은 정점을 모두 비운다", () => {
      const m = new FaceMesh(SQUARE);
      m.reset();
      expect(m.geometry.attributes.position.count).toBe(0);
      expect(m.geometry.index).toBeNull();
      expect(m.getVertices().length).toBe(0);
      expect(m.getTriangleEdges()).toEqual([]);
    });

    test("getVertices는 현재 정점 목록의 복사본을 돌려준다", () => {
      const m = new FaceMesh(SQUARE);
      const v = m.getVertices();
      expect(v.length).toBe(4);
      v[0].x = 999; // 복사본이라 내부 상태에 영향 없어야
      expect((m.geometry.attributes.position as THREE.BufferAttribute).getX(0))
        .toBeCloseTo(SQUARE[0].x);
    });
  });
});
