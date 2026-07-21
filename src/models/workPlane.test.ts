import { describe, test, expect } from "vitest";
import * as THREE from "three";
import { workPlaneFor, placeOnWorkPlane } from "./workPlane";

// 작업 평면 정의·광선 교차 배치는 THREE의 순수 수학(Plane·Ray)이라
// WebGL 없이 jsdom에서 검증된다. 렌더링·클릭 배치 체감은 육안 확인(spec 참고).
describe("workPlane — 작업 평면 정의 + 정점 스냅 배치", () => {
  describe("workPlaneFor — 세 작업 평면", () => {
    test("ground 평면은 법선 (0,1,0), 상수 0 (평면 y=0)", () => {
      const p = workPlaneFor("ground");
      expect(p.normal.x).toBeCloseTo(0);
      expect(p.normal.y).toBeCloseTo(1);
      expect(p.normal.z).toBeCloseTo(0);
      expect(p.constant).toBeCloseTo(0);
    });

    test("front 평면은 법선 (0,0,1), 상수 0 (평면 z=0)", () => {
      const p = workPlaneFor("front");
      expect(p.normal.x).toBeCloseTo(0);
      expect(p.normal.y).toBeCloseTo(0);
      expect(p.normal.z).toBeCloseTo(1);
      expect(p.constant).toBeCloseTo(0);
    });

    test("side 평면은 법선 (1,0,0), 상수 0 (평면 x=0)", () => {
      const p = workPlaneFor("side");
      expect(p.normal.x).toBeCloseTo(1);
      expect(p.normal.y).toBeCloseTo(0);
      expect(p.normal.z).toBeCloseTo(0);
      expect(p.constant).toBeCloseTo(0);
    });
  });

  describe("placeOnWorkPlane — 광선 교차점", () => {
    test("바닥 평면 위로 아래로 쏜 광선은 y≈0 교차점을 준다", () => {
      // 원점 (2,5,3)에서 -y로 쏘면 y=0 평면과 (2,0,3)에서 만난다.
      const ray = new THREE.Ray(
        new THREE.Vector3(2, 5, 3),
        new THREE.Vector3(0, -1, 0),
      );
      const hit = placeOnWorkPlane("ground", ray);
      expect(hit).not.toBeNull();
      expect(hit!.x).toBeCloseTo(2);
      expect(hit!.y).toBeCloseTo(0);
      expect(hit!.z).toBeCloseTo(3);
    });

    test("front 평면(z=0)과의 교차점은 z≈0이다", () => {
      const ray = new THREE.Ray(
        new THREE.Vector3(1, -2, 4),
        new THREE.Vector3(0, 0, -1),
      );
      const hit = placeOnWorkPlane("front", ray);
      expect(hit).not.toBeNull();
      expect(hit!.x).toBeCloseTo(1);
      expect(hit!.y).toBeCloseTo(-2);
      expect(hit!.z).toBeCloseTo(0);
    });

    test("side 평면(x=0)과의 교차점은 x≈0이다", () => {
      const ray = new THREE.Ray(
        new THREE.Vector3(6, 1, -3),
        new THREE.Vector3(-1, 0, 0),
      );
      const hit = placeOnWorkPlane("side", ray);
      expect(hit).not.toBeNull();
      expect(hit!.x).toBeCloseTo(0);
      expect(hit!.y).toBeCloseTo(1);
      expect(hit!.z).toBeCloseTo(-3);
    });

    test("평면과 평행한 광선은 null을 반환한다", () => {
      // 바닥 평면(y=0)에 평행하게(수평) 쏜 광선.
      const ray = new THREE.Ray(
        new THREE.Vector3(0, 5, 0),
        new THREE.Vector3(1, 0, 0),
      );
      expect(placeOnWorkPlane("ground", ray)).toBeNull();
    });

    test("평면 뒤쪽으로 쏜 광선은 null을 반환한다", () => {
      // 원점 (0,5,0)에서 +y(위)로 쏘면 y=0 평면은 뒤에 있다.
      const ray = new THREE.Ray(
        new THREE.Vector3(0, 5, 0),
        new THREE.Vector3(0, 1, 0),
      );
      expect(placeOnWorkPlane("ground", ray)).toBeNull();
    });
  });
});
