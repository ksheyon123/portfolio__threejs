import { describe, test, expect } from "vitest";
import * as THREE from "three";
import { RiggedBoxMesh } from "./RiggedBoxMesh";

// 스켈레탈 리깅의 순수 계산 부분만 검증한다.
// 실제 렌더링·휘어짐의 매끄러움은 WebGL이 필요해 jsdom에서 검증 불가 → 육안 확인(spec 참고).
describe("RiggedBoxMesh — 스켈레탈 리깅", () => {
  const HEIGHT = 4;
  const SEG = 8;

  test("두 뼈가 부모-자식 체인으로 연결된다", () => {
    const m = new RiggedBoxMesh(1, HEIGHT, 1, SEG);
    const bones = m.getBones();
    expect(bones.length).toBe(2);
    expect(bones[0].children).toContain(bones[1]);
  });

  test("자식 뼈는 부모 기준 뼈 길이(메시 높이의 절반)만큼 위에 있다", () => {
    const m = new RiggedBoxMesh(1, HEIGHT, 1, SEG);
    expect(m.getBones()[1].position.y).toBeCloseTo(HEIGHT / 2);
  });

  test("모든 정점의 skinWeight 합은 1이다", () => {
    const m = new RiggedBoxMesh(1, HEIGHT, 1, SEG);
    const sw = m.geometry.attributes.skinWeight as THREE.BufferAttribute;
    for (let i = 0; i < sw.count; i++) {
      const sum = sw.getX(i) + sw.getY(i) + sw.getZ(i) + sw.getW(i);
      expect(sum).toBeCloseTo(1);
    }
  });

  test("바닥 정점은 루트 뼈, 꼭대기 정점은 자식 뼈에 100% 실린다", () => {
    const m = new RiggedBoxMesh(1, HEIGHT, 1, SEG);
    const pos = m.geometry.attributes.position as THREE.BufferAttribute;
    const sw = m.geometry.attributes.skinWeight as THREE.BufferAttribute;
    const half = HEIGHT / 2;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (Math.abs(y + half) < 1e-6) {
        // 바닥: bone0(=X) 웨이트 1, bone1(=Y) 웨이트 0
        expect(sw.getX(i)).toBeCloseTo(1);
        expect(sw.getY(i)).toBeCloseTo(0);
      }
      if (Math.abs(y - half) < 1e-6) {
        // 꼭대기: bone0 0, bone1 1
        expect(sw.getX(i)).toBeCloseTo(0);
        expect(sw.getY(i)).toBeCloseTo(1);
      }
    }
  });

  test("skeleton이 2개 뼈로 바인딩된다", () => {
    const m = new RiggedBoxMesh(1, HEIGHT, 1, SEG);
    expect(m.skeleton.bones.length).toBe(2);
    expect(m.skeleton.bones[0]).toBe(m.getBones()[0]);
  });

  test("setBend는 자식 뼈의 z축 회전을 설정한다", () => {
    const m = new RiggedBoxMesh(1, HEIGHT, 1, SEG);
    m.setBend(Math.PI / 4);
    expect(m.getBones()[1].rotation.z).toBeCloseTo(Math.PI / 4);
  });
});
