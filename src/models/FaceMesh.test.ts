import { describe, test, expect } from "vitest";
import * as THREE from "three";
import { FaceMesh } from "./FaceMesh";

// 정점(2D 좌표) → 면(BufferGeometry)의 순수 계산 부분만 검증한다.
// 실제 렌더링·클릭/드래그 상호작용·오목 다각형의 삐져나옴은 WebGL이 필요해
// jsdom에서 검증 불가 → 육안 확인(spec 참고).
describe("FaceMesh — 정점으로 면 만들기 (2D 팬 삼각분할)", () => {
  // CCW(반시계) 볼록 사각형 — 법선이 +z를 향한다.
  const SQUARE = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ];

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

  describe("팬 삼각분할 → index 버퍼", () => {
    test("N≥3이면 index.count === (N-2)*3", () => {
      const m = new FaceMesh(SQUARE);
      expect(m.geometry.index).not.toBeNull();
      expect(m.geometry.index!.count).toBe((4 - 2) * 3);
    });

    test("k번째 삼각형의 인덱스가 [0, k+1, k+2]다", () => {
      const m = new FaceMesh(SQUARE);
      const idx = m.geometry.index!;
      // 삼각형 0: [0,1,2], 삼각형 1: [0,2,3]
      expect([idx.getX(0), idx.getX(1), idx.getX(2)]).toEqual([0, 1, 2]);
      expect([idx.getX(3), idx.getX(4), idx.getX(5)]).toEqual([0, 2, 3]);
    });

    test("삼각형(N=3)은 삼각형 1개", () => {
      const m = new FaceMesh(SQUARE.slice(0, 3));
      expect(m.geometry.index!.count).toBe(3);
    });

    test("정점 2개 이하면 면이 없다(index null)", () => {
      expect(new FaceMesh(SQUARE.slice(0, 2)).geometry.index).toBeNull();
      expect(new FaceMesh([]).geometry.index).toBeNull();
    });
  });

  describe("법선 계산", () => {
    test("빌드 후 normal attribute가 정점 수만큼 존재한다", () => {
      const m = new FaceMesh(SQUARE);
      const normal = m.geometry.attributes.normal;
      expect(normal).toBeDefined();
      expect(normal.count).toBe(SQUARE.length);
    });

    test("CCW 볼록 다각형의 정점 법선 z성분은 +1에 가깝다", () => {
      const m = new FaceMesh(SQUARE);
      const normal = m.geometry.attributes.normal as THREE.BufferAttribute;
      for (let i = 0; i < normal.count; i++) {
        expect(normal.getZ(i)).toBeCloseTo(1);
      }
    });
  });

  describe("삼각형 에지 시각화 (getTriangleEdges)", () => {
    // 무방향 에지를 정렬해 비교하기 쉬운 문자열 키로.
    const key = (e: [number, number]) =>
      e[0] < e[1] ? `${e[0]}_${e[1]}` : `${e[1]}_${e[0]}`;

    test("N<3이면 빈 배열", () => {
      expect(new FaceMesh(SQUARE.slice(0, 2)).getTriangleEdges()).toEqual([]);
      expect(new FaceMesh([]).getTriangleEdges()).toEqual([]);
    });

    test("삼각형(N=3)은 변 3개, 중복 없음", () => {
      const edges = new FaceMesh(SQUARE.slice(0, 3)).getTriangleEdges();
      expect(edges.length).toBe(3);
      const keys = new Set(edges.map(key));
      expect(keys.size).toBe(3); // 중복 없음
      expect(keys).toEqual(new Set(["0_1", "1_2", "0_2"]));
    });

    test("에지 개수는 2N-3이다", () => {
      for (let n = 3; n <= 6; n++) {
        const m = new FaceMesh(
          Array.from({ length: n }, (_, i) => ({ x: i, y: i % 2 })),
        );
        expect(m.getTriangleEdges().length).toBe(2 * n - 3);
      }
    });

    test("N=4는 내부 대각선 (0,2)를 포함한다", () => {
      const edges = new FaceMesh(SQUARE).getTriangleEdges();
      const keys = new Set(edges.map(key));
      expect(keys.has("0_2")).toBe(true); // 팬 대각선
      // 외곽 4변 + 내부 대각선 1 = 5
      expect(keys).toEqual(new Set(["0_1", "1_2", "0_2", "2_3", "0_3"]));
    });

    test("반환된 모든 에지는 무방향 중복이 없다", () => {
      const edges = new FaceMesh(SQUARE).getTriangleEdges();
      const keys = edges.map(key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    test("정점을 추가하면 에지도 재계산된다", () => {
      const m = new FaceMesh(SQUARE.slice(0, 3));
      expect(m.getTriangleEdges().length).toBe(3);
      m.addVertex(0, 2);
      expect(m.getTriangleEdges().length).toBe(2 * 4 - 3);
    });
  });

  describe("정점 편집 (add / move / remove / reset)", () => {
    test("addVertex는 position.count를 1 늘리고 index를 재계산한다", () => {
      const m = new FaceMesh(SQUARE.slice(0, 3)); // 삼각형 1개
      m.addVertex(0, 2);
      expect(m.geometry.attributes.position.count).toBe(4);
      expect(m.geometry.index!.count).toBe((4 - 2) * 3); // 삼각형 2개
    });

    test("2개 → 3개로 넘어가는 순간 면이 생긴다", () => {
      const m = new FaceMesh(SQUARE.slice(0, 2));
      expect(m.geometry.index).toBeNull();
      m.addVertex(2, 2);
      expect(m.geometry.index!.count).toBe(3);
    });

    test("moveVertex는 i번째 좌표만 바꾼다", () => {
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
