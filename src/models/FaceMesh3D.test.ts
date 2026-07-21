import { describe, test, expect } from "vitest";
import * as THREE from "three";
import { FaceMesh3D } from "./FaceMesh3D";

// 정점(3D 좌표) → position/index(수동 면)/normal 버퍼의 순수 계산만 검증한다.
// 실제 렌더링·궤도 회전·클릭 배치·3점 선택 상호작용은 WebGL이 필요해 육안 확인(spec 참고).
describe("FaceMesh3D — 정점으로 면 만들기 (3D 수동 면)", () => {
  // 사면체(정점 4개) — 3D라 z가 0이 아닌 정점을 포함한다.
  const TETRA = [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
  ];
  // 사면체의 4개 삼각형 면.
  const TETRA_FACES: [number, number, number][] = [
    [0, 1, 2],
    [0, 1, 3],
    [0, 2, 3],
    [1, 2, 3],
  ];

  describe("3D 정점 목록 → position 버퍼", () => {
    test("정점 N개를 주면 position.count === N", () => {
      const m = new FaceMesh3D(TETRA);
      expect(m.geometry.attributes.position.count).toBe(4);
    });

    test("i번째 정점 position이 (xᵢ, yᵢ, zᵢ)이다 (z≠0 포함)", () => {
      const m = new FaceMesh3D(TETRA);
      const pos = m.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < TETRA.length; i++) {
        expect(pos.getX(i)).toBeCloseTo(TETRA[i].x);
        expect(pos.getY(i)).toBeCloseTo(TETRA[i].y);
        expect(pos.getZ(i)).toBeCloseTo(TETRA[i].z);
      }
      // z가 0이 아닌 정점도 그대로 반영 — 2D 데모와의 핵심 차이
      expect(pos.getZ(3)).toBeCloseTo(1);
    });

    test("getVertices는 방어적 복사본을 반환한다", () => {
      const m = new FaceMesh3D(TETRA);
      const v = m.getVertices();
      v[0].x = 999;
      expect(
        (m.geometry.attributes.position as THREE.BufferAttribute).getX(0),
      ).toBeCloseTo(0);
    });
  });

  describe("수동 삼각형 면 → index 버퍼", () => {
    test("addFace(0,1,2) 후 index가 [0,1,2], count 3", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(0, 1, 2);
      expect(m.geometry.index).not.toBeNull();
      expect(Array.from(m.geometry.index!.array)).toEqual([0, 1, 2]);
      expect(m.geometry.index!.count).toBe(3);
    });

    test("면 2개 → index.count 6, getFaces().length 2", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(0, 1, 2);
      m.addFace(1, 2, 3);
      expect(m.geometry.index!.count).toBe(6);
      expect(m.getFaces().length).toBe(2);
    });

    test("winding(클릭 순서)을 보존해 저장한다", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(2, 0, 1);
      expect(m.getFaces()[0]).toEqual([2, 0, 1]);
    });

    test("범위 밖 인덱스는 무시된다", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(0, 1, 99);
      expect(m.getFaces().length).toBe(0);
      expect(m.geometry.index).toBeNull();
    });

    test("음수·비정수 인덱스는 무시된다", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(-1, 0, 1);
      m.addFace(0, 1, 2.5);
      expect(m.getFaces().length).toBe(0);
    });

    test("반복 인덱스(축퇴)는 무시된다", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(0, 1, 1);
      expect(m.getFaces().length).toBe(0);
    });

    test("이미 있는 무순서 조합(순서만 다름)은 무시된다", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(0, 1, 2);
      m.addFace(2, 1, 0); // 같은 3정점, 순서만 다름
      expect(m.getFaces().length).toBe(1);
    });

    test("getFaces는 방어적 복사본을 반환한다", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(0, 1, 2);
      const faces = m.getFaces();
      faces[0][0] = 3;
      expect(m.getFaces()[0]).toEqual([0, 1, 2]);
    });

    test("removeFace(0) 후 해당 면이 사라지고 index가 재계산된다", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(0, 1, 2);
      m.addFace(1, 2, 3);
      m.removeFace(0);
      expect(m.getFaces()).toEqual([[1, 2, 3]]);
      expect(Array.from(m.geometry.index!.array)).toEqual([1, 2, 3]);
    });

    test("면이 없으면 index는 null", () => {
      const m = new FaceMesh3D(TETRA);
      expect(m.geometry.index).toBeNull();
    });
  });

  describe("법선 계산", () => {
    test("면 1개 이상이면 normal이 정점 수만큼 존재한다", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(0, 1, 2);
      const normal = m.geometry.attributes.normal;
      expect(normal).toBeDefined();
      expect(normal.count).toBe(TETRA.length);
    });

    test("xy평면 CCW 삼각형의 정점 법선은 면 법선(+z)과 일치한다", () => {
      // (0,0,0),(1,0,0),(0,1,0) CCW → 면 법선 (0,0,1)
      const m = new FaceMesh3D([
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
      ]);
      m.addFace(0, 1, 2);
      const normal = m.geometry.attributes.normal as THREE.BufferAttribute;
      for (let i = 0; i < 3; i++) {
        expect(normal.getX(i)).toBeCloseTo(0);
        expect(normal.getY(i)).toBeCloseTo(0);
        expect(normal.getZ(i)).toBeCloseTo(1);
      }
    });
  });

  describe("면 에지 시각화 (getFaceEdges)", () => {
    const key = (e: [number, number]) =>
      e[0] < e[1] ? `${e[0]}_${e[1]}` : `${e[1]}_${e[0]}`;

    test("면이 없으면 빈 배열", () => {
      expect(new FaceMesh3D(TETRA).getFaceEdges()).toEqual([]);
    });

    test("사면체(면 4개)는 무방향 에지 6개(중복 없음)", () => {
      const m = new FaceMesh3D(TETRA);
      TETRA_FACES.forEach((f) => m.addFace(f[0], f[1], f[2]));
      const edges = m.getFaceEdges();
      expect(edges.length).toBe(6);
      // 6개 에지가 4정점의 모든 쌍이다
      const keys = new Set(edges.map(key));
      expect(keys).toEqual(
        new Set(["0_1", "0_2", "0_3", "1_2", "1_3", "2_3"]),
      );
    });

    test("반환된 에지는 무방향 중복이 없다", () => {
      const m = new FaceMesh3D(TETRA);
      TETRA_FACES.forEach((f) => m.addFace(f[0], f[1], f[2]));
      const keys = m.getFaceEdges().map(key);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe("정점 편집 (add / move / remove / reset)", () => {
    test("addVertex는 position.count를 1 늘리고 면 목록은 유지된다", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(0, 1, 2);
      m.addVertex(2, 2, 2);
      expect(m.geometry.attributes.position.count).toBe(5);
      expect(m.getFaces()).toEqual([[0, 1, 2]]);
    });

    test("moveVertex는 i번째 좌표만 바꾸고 면 연결은 불변", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(0, 1, 2);
      m.moveVertex(1, 5, -3, 7);
      const pos = m.geometry.attributes.position as THREE.BufferAttribute;
      expect(pos.getX(1)).toBeCloseTo(5);
      expect(pos.getY(1)).toBeCloseTo(-3);
      expect(pos.getZ(1)).toBeCloseTo(7);
      expect(m.getFaces()).toEqual([[0, 1, 2]]);
    });

    test("removeVertex는 참조 면 삭제 + 인덱스 시프트 보정을 한다", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(0, 1, 2);
      m.addFace(1, 2, 3);
      m.removeVertex(0);
      // 정점 0을 쓰던 [0,1,2]는 삭제, [1,2,3]은 1씩 감소해 [0,1,2]
      expect(m.getFaces()).toEqual([[0, 1, 2]]);
      expect(m.geometry.attributes.position.count).toBe(3);
    });

    test("removeVertex 후 남은 면 인덱스가 새 정점 배열 범위 안에 있다", () => {
      const m = new FaceMesh3D(TETRA);
      TETRA_FACES.forEach((f) => m.addFace(f[0], f[1], f[2]));
      m.removeVertex(1);
      const n = m.getVertices().length;
      for (const f of m.getFaces()) {
        for (const idx of f) {
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(n);
        }
      }
    });

    test("reset은 정점·면을 모두 비운다", () => {
      const m = new FaceMesh3D(TETRA);
      m.addFace(0, 1, 2);
      m.reset();
      expect(m.geometry.attributes.position.count).toBe(0);
      expect(m.getFaces().length).toBe(0);
      expect(m.geometry.index).toBeNull();
      expect(m.getFaceEdges()).toEqual([]);
    });
  });
});
