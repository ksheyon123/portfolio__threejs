import * as THREE from "three";

/**
 * 작업 평면 키. 정점을 찍을 때 활성 평면 하나만 대상으로 한다.
 *   - ground: 바닥 평면 y=0 (법선 +y)
 *   - front : 앞 평면 z=0 (법선 +z)
 *   - side  : 옆 평면 x=0 (법선 +x)
 */
export type WorkPlaneKey = "ground" | "front" | "side";

// 각 평면의 법선. 세 평면 모두 원점을 지나므로 상수(constant)는 0이다
// (이번 범위엔 오프셋 평면 y=3 같은 것은 없다).
const NORMALS: Record<WorkPlaneKey, THREE.Vector3> = {
  ground: new THREE.Vector3(0, 1, 0),
  front: new THREE.Vector3(0, 0, 1),
  side: new THREE.Vector3(1, 0, 0),
};

/**
 * 작업 평면 키 → THREE.Plane.
 * 씬/렌더러에 의존하지 않는 순수 수학 객체라 jsdom에서 그대로 테스트된다.
 * 매 호출 새 Plane을 만들어(공유 상태 없음) 호출자가 안심하고 변형할 수 있게 한다.
 */
export function workPlaneFor(key: WorkPlaneKey): THREE.Plane {
  // clone으로 NORMALS의 공유 벡터를 보호한다.
  return new THREE.Plane(NORMALS[key].clone(), 0);
}

/**
 * 클릭 광선과 활성 작업 평면의 교차점을 새 Vector3로 반환한다.
 * 이 교차점이 곧 그 평면 위에 찍을 새 정점 좌표다(깊이가 평면으로 고정됨).
 * 광선이 평면과 평행하거나 평면이 광선 뒤쪽이면 null(THREE.Ray.intersectPlane 규약).
 */
export function placeOnWorkPlane(
  key: WorkPlaneKey,
  ray: THREE.Ray,
): THREE.Vector3 | null {
  const plane = workPlaneFor(key);
  const target = new THREE.Vector3();
  return ray.intersectPlane(plane, target) ? target : null;
}
