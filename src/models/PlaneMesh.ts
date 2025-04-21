import * as THREE from "three";

/**
 * 평면 형태의 mesh를 생성하는 클래스
 * 구 표면 위에 길과 같은 형태로 배치할 수 있습니다.
 */
export class PlaneMesh extends THREE.Object3D {
  // 평면 메시
  private plane: THREE.Mesh;

  // 평면의 크기
  private width: number;
  private height: number;

  // 구 표면에 접하는 시작 위치와 끝 위치 (구의 중심으로부터의 방향 벡터)
  private startDirection: THREE.Vector3;
  private endDirection: THREE.Vector3;

  // 평면의 세그먼트 수
  private widthSegments: number;
  private heightSegments: number;

  /**
   * PlaneMesh 생성자
   * @param width 평면의 너비 (기본값: 5)
   * @param height 평면의 높이 (기본값: 30)
   * @param color 평면의 색상 (기본값: 0x555555)
   * @param startDirection 구 표면에 접하는 시작 방향 (기본값: 랜덤 방향)
   * @param endDirection 구 표면에 접하는 끝 방향 (기본값: 시작 방향에서 랜덤하게 조금 떨어진 방향)
   * @param widthSegments 너비 방향 세그먼트 수 (기본값: 1)
   * @param heightSegments 높이 방향 세그먼트 수 (기본값: 10)
   */
  constructor(
    width: number = 5,
    height: number = 30,
    color: THREE.ColorRepresentation = 0x555555,
    startDirection?: THREE.Vector3,
    endDirection?: THREE.Vector3,
    widthSegments: number = 1,
    heightSegments: number = 10
  ) {
    super();

    this.width = width;
    this.height = height;
    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;

    // 시작 방향 벡터가 제공되지 않은 경우 랜덤 방향 생성
    if (!startDirection) {
      this.startDirection = this.generateRandomDirection();
    } else {
      this.startDirection = startDirection.clone().normalize();
    }

    // 끝 방향 벡터가 제공되지 않은 경우 시작 방향에서 랜덤하게 조금 떨어진 방향 생성
    if (!endDirection) {
      this.endDirection = this.generateRandomEndDirection(this.startDirection);
    } else {
      this.endDirection = endDirection.clone().normalize();
    }

    // 평면 지오메트리 및 재질 생성
    const planeGeometry = new THREE.PlaneGeometry(
      width,
      height,
      widthSegments,
      heightSegments
    );
    const planeMaterial = new THREE.MeshPhongMaterial({
      color: color,
      wireframe: false,
      side: THREE.DoubleSide, // 양면 렌더링
    });

    // 평면 메시 생성
    this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.add(this.plane);
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
   * 시작 방향에서 랜덤하게 조금 떨어진 끝 방향 생성
   * @param startDir 시작 방향 벡터
   * @returns 끝 방향 벡터
   */
  private generateRandomEndDirection(startDir: THREE.Vector3): THREE.Vector3 {
    // 시작 방향에 수직인 임의의 벡터 생성
    const perpVector = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    );
    perpVector.cross(startDir).normalize();

    // 시작 방향에서 최대 45도까지 랜덤하게 회전
    const angle = (Math.random() * Math.PI) / 4; // 0 ~ π/4 (0 ~ 45도)
    const rotationAxis = perpVector;

    // 회전 쿼터니언 생성
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(rotationAxis, angle);

    // 시작 방향에 회전 적용
    const endDir = startDir.clone();
    endDir.applyQuaternion(quaternion);

    return endDir.normalize();
  }

  /**
   * 평면을 구 표면에 위치시키기
   * @param sphere 접할 구 객체
   * @param radius 구의 반지름
   */
  placeOnSphere(sphere: THREE.Object3D, radius: number): void {
    // 구의 중심 위치 가져오기
    const spherePosition = new THREE.Vector3();
    sphere.getWorldPosition(spherePosition);

    // 평면의 지오메트리 가져오기
    const geometry = this.plane.geometry as THREE.PlaneGeometry;

    // 정점 위치 배열 가져오기
    const positionAttribute = geometry.getAttribute("position");

    // 높이 방향으로의 세그먼트 수에 따라 정점 위치 조정
    for (let i = 0; i <= this.heightSegments; i++) {
      // 높이 방향 보간 계수 (0 ~ 1)
      const t = i / this.heightSegments;

      // 시작 방향과 끝 방향 사이를 구면 선형 보간
      const direction = this.sphericalLerp(
        this.startDirection,
        this.endDirection,
        t
      );

      // 너비 방향으로의 정점들 조정
      for (let j = 0; j <= this.widthSegments; j++) {
        const vertexIndex = i * (this.widthSegments + 1) + j;

        // 구 표면 위의 위치 계산
        const surfacePoint = spherePosition.clone().add(
          direction.clone().multiplyScalar(radius + 0.1) // 약간의 오프셋 추가
        );

        // 정점 위치 업데이트
        positionAttribute.setXYZ(
          vertexIndex,
          surfacePoint.x,
          surfacePoint.y,
          surfacePoint.z
        );
      }
    }

    // 변경된 정점 위치 적용
    positionAttribute.needsUpdate = true;

    // 법선 벡터 재계산
    geometry.computeVertexNormals();

    // 평면의 위치를 구의 중심으로 설정 (정점들이 이미 월드 좌표계로 변환되었으므로)
    this.position.copy(spherePosition);

    // 평면의 로컬 좌표계를 리셋 (정점들이 이미 월드 좌표계로 변환되었으므로)
    this.updateMatrix();
    geometry.applyMatrix4(this.matrix.clone().invert());
  }

  /**
   * 구면 선형 보간 (Spherical Linear Interpolation)
   * 두 방향 벡터 사이를 구면 상에서 보간
   * @param v1 시작 방향 벡터
   * @param v2 끝 방향 벡터
   * @param t 보간 계수 (0 ~ 1)
   * @returns 보간된 방향 벡터
   */
  private sphericalLerp(
    v1: THREE.Vector3,
    v2: THREE.Vector3,
    t: number
  ): THREE.Vector3 {
    // 두 벡터 사이의 각도 계산
    const dot = v1.dot(v2);
    const theta = Math.acos(Math.min(Math.max(dot, -1), 1));

    // 각도가 0이면 두 벡터가 같은 방향이므로 v1 반환
    if (theta === 0) return v1.clone();

    // 구면 선형 보간 공식 적용
    const sin1 = Math.sin((1 - t) * theta);
    const sin2 = Math.sin(t * theta);
    const sinTheta = Math.sin(theta);

    const v1Factor = sin1 / sinTheta;
    const v2Factor = sin2 / sinTheta;

    const result = new THREE.Vector3()
      .addScaledVector(v1, v1Factor)
      .addScaledVector(v2, v2Factor);

    return result.normalize();
  }

  /**
   * 시작 방향 설정
   * @param direction 새로운 시작 방향 벡터
   */
  setStartDirection(direction: THREE.Vector3): void {
    this.startDirection = direction.clone().normalize();
  }

  /**
   * 끝 방향 설정
   * @param direction 새로운 끝 방향 벡터
   */
  setEndDirection(direction: THREE.Vector3): void {
    this.endDirection = direction.clone().normalize();
  }

  /**
   * 현재 시작 방향 반환
   * @returns 시작 방향 벡터
   */
  getStartDirection(): THREE.Vector3 {
    return this.startDirection.clone();
  }

  /**
   * 현재 끝 방향 반환
   * @returns 끝 방향 벡터
   */
  getEndDirection(): THREE.Vector3 {
    return this.endDirection.clone();
  }

  /**
   * 평면 크기 설정
   * @param width 너비
   * @param height 높이
   */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    // 기존 지오메트리 해제
    (this.plane.geometry as THREE.BufferGeometry).dispose();

    // 새 지오메트리 생성 및 적용
    const newGeometry = new THREE.PlaneGeometry(
      width,
      height,
      this.widthSegments,
      this.heightSegments
    );
    this.plane.geometry = newGeometry;
  }

  /**
   * 평면 색상 설정
   * @param color 새 색상
   */
  setColor(color: THREE.ColorRepresentation): void {
    (this.plane.material as THREE.MeshPhongMaterial).color = new THREE.Color(
      color
    );
  }

  /**
   * 메모리 해제
   */
  dispose(): void {
    // 지오메트리와 재질 해제
    (this.plane.geometry as THREE.BufferGeometry).dispose();
    (this.plane.material as THREE.Material).dispose();
  }
}
