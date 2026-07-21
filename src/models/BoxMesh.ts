import * as THREE from "three";

/**
 * 박스 형태의 mesh를 생성하는 클래스
 * 크기 20x20 짜리 BoxMesh를 생성하고 구 표면상의 임의의 위치에 접하도록 설정
 */
export class BoxMesh extends THREE.Object3D {
  // 박스 메시
  private box: THREE.Mesh;

  // 박스의 크기
  private width: number;
  private height: number;
  private depth: number;

  // 구 표면에 접하는 위치 (구의 중심으로부터의 방향 벡터)
  private contactDirection: THREE.Vector3;

  /**
   * BoxMesh 생성자
   * @param width 박스의 너비 (기본값: 20)
   * @param height 박스의 높이 (기본값: 20)
   * @param depth 박스의 깊이 (기본값: 20)
   * @param color 박스의 색상 (기본값: 0xff5533)
   * @param contactDirection 구 표면에 접하는 방향 (기본값: 랜덤 방향)
   */
  constructor(
    width: number = 20,
    height: number = 20,
    depth: number = 20,
    color: THREE.ColorRepresentation = 0xff5533,
    contactDirection?: THREE.Vector3
  ) {
    super();

    this.width = width;
    this.height = height;
    this.depth = depth;

    // 방향 벡터가 제공되지 않은 경우 랜덤 방향 생성
    if (!contactDirection) {
      this.contactDirection = this.generateRandomDirection();
    } else {
      this.contactDirection = contactDirection.clone().normalize();
    }

    // 박스 지오메트리 및 재질 생성
    const boxGeometry = new THREE.BoxGeometry(width, height, depth);
    const boxMaterial = new THREE.MeshPhongMaterial({
      color: color,
      wireframe: false,
    });

    // 박스 메시 생성
    this.box = new THREE.Mesh(boxGeometry, boxMaterial);
    this.add(this.box);
  }

  /**
   * 랜덤 방향 벡터 생성
   * @returns 정규화된 랜덤 방향 벡터
   */
  private generateRandomDirection(): THREE.Vector3 {
    // 구 좌표계에서 랜덤 점 생성
    const theta = Math.random() * Math.PI * 2; // 0 ~ 2π (수평각)
    const phi = Math.acos(2 * Math.random() - 1); // 0 ~ π (수직각)

    // 구 좌표계를 직교 좌표계로 변환
    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.sin(phi) * Math.sin(theta);
    const z = Math.cos(phi);

    return new THREE.Vector3(x, y, z).normalize();
  }

  /**
   * 박스를 구 표면에 위치시키기
   * @param sphere 접할 구 객체
   * @param radius 구의 반지름
   */
  placeOnSphere(sphere: THREE.Object3D, radius: number): void {
    // 구의 중심 위치 가져오기
    const spherePosition = new THREE.Vector3();
    sphere.getWorldPosition(spherePosition);

    // 박스가 구 표면에 접하도록 위치 설정
    // 박스의 절반 높이를 고려하여 구 표면에서 약간 떨어진 위치에 배치
    const halfHeight = this.depth / 2;
    const position = spherePosition
      .clone()
      .add(this.contactDirection.clone().multiplyScalar(radius + halfHeight));

    this.position.copy(position);

    // Quaternion을 사용하여 박스가 구 표면에 접하도록 회전 설정
    // 1. 기준 방향 벡터 (기본적으로 박스의 z축 방향)
    const defaultDirection = new THREE.Vector3(0, 0, 1);

    // 2. 구의 중심에서 박스를 향하는 방향 벡터 (접점에서 구 중심을 향하는 벡터의 반대)
    const fromSphereToBox = this.contactDirection.clone().negate();

    // 3. 두 벡터 사이의 회전을 나타내는 Quaternion 계산
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(defaultDirection, fromSphereToBox);

    // 4. 추가 회전 (박스의 면이 구 표면에 접하도록)
    const additionalRotation = new THREE.Quaternion();
    additionalRotation.setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 2
    );

    // 5. 두 회전을 결합 (먼저 기본 방향에서 접점 방향으로, 그 다음 추가 회전)
    quaternion.multiply(additionalRotation);

    // 6. 계산된 Quaternion을 박스에 적용
    this.quaternion.copy(quaternion);
  }

  /**
   * 접촉 방향 설정
   * @param direction 새로운 접촉 방향 벡터
   */
  setContactDirection(direction: THREE.Vector3): void {
    this.contactDirection = direction.clone().normalize();
  }

  /**
   * 현재 접촉 방향 반환
   * @returns 접촉 방향 벡터
   */
  getContactDirection(): THREE.Vector3 {
    return this.contactDirection.clone();
  }

  /**
   * 박스 크기 설정
   * @param width 너비
   * @param height 높이
   * @param depth 깊이
   */
  setSize(width: number, height: number, depth: number): void {
    this.width = width;
    this.height = height;
    this.depth = depth;

    // 기존 지오메트리 해제
    (this.box.geometry as THREE.BufferGeometry).dispose();

    // 새 지오메트리 생성 및 적용
    const newGeometry = new THREE.BoxGeometry(width, height, depth);
    this.box.geometry = newGeometry;
  }

  /**
   * 박스 색상 설정
   * @param color 새 색상
   */
  setColor(color: THREE.ColorRepresentation): void {
    // 이미 같은 색이면 아무것도 하지 않는다(매 프레임 호출되므로 불필요한 Color 생성을 막는다).
    const material = this.box.material as THREE.MeshPhongMaterial;
    const next = new THREE.Color(color);
    if (material.color.equals(next)) return;
    material.color = next;
  }

  /**
   * 메모리 해제
   */
  dispose(): void {
    // 지오메트리와 재질 해제
    (this.box.geometry as THREE.BufferGeometry).dispose();
    (this.box.material as THREE.Material).dispose();
  }
}
