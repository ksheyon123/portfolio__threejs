import * as THREE from "three";

/**
 * 사람 형태의 mesh를 생성하는 클래스
 * 머리, 몸통, 양팔, 두 다리로 구성되며 각 부분을 개별적으로 움직일 수 있음
 */
export class HumanMesh extends THREE.Object3D {
  // 각 신체 부위 메시
  private head: THREE.Mesh;
  private body: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;

  // 각 신체 부위의 피벗 포인트 (관절)
  private leftArmPivot: THREE.Object3D;
  private rightArmPivot: THREE.Object3D;
  private leftLegPivot: THREE.Object3D;
  private rightLegPivot: THREE.Object3D;

  constructor(color: THREE.ColorRepresentation = 0x44aa88) {
    super();

    // 재질 생성
    const material = new THREE.MeshPhongMaterial({ color });

    // 머리 생성
    const headGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    this.head = new THREE.Mesh(headGeometry, material);
    this.head.position.y = 0.85;
    this.add(this.head);

    // 몸통 생성
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.25);
    this.body = new THREE.Mesh(bodyGeometry, material);
    this.body.position.y = 0.35;
    this.add(this.body);

    // 왼쪽 팔 피벗 생성
    this.leftArmPivot = new THREE.Object3D();
    this.leftArmPivot.position.set(-0.3, 0.6, 0);
    this.add(this.leftArmPivot);

    // 왼쪽 팔 생성
    const armGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    this.leftArm = new THREE.Mesh(armGeometry, material);
    this.leftArm.position.y = -0.2; // 피벗 기준으로 아래쪽에 위치
    this.leftArmPivot.add(this.leftArm);

    // 오른쪽 팔 피벗 생성
    this.rightArmPivot = new THREE.Object3D();
    this.rightArmPivot.position.set(0.3, 0.6, 0);
    this.add(this.rightArmPivot);

    // 오른쪽 팔 생성
    this.rightArm = new THREE.Mesh(armGeometry.clone(), material);
    this.rightArm.position.y = -0.2; // 피벗 기준으로 아래쪽에 위치
    this.rightArmPivot.add(this.rightArm);

    // 왼쪽 다리 피벗 생성
    this.leftLegPivot = new THREE.Object3D();
    this.leftLegPivot.position.set(-0.15, 0, 0);
    this.add(this.leftLegPivot);

    // 왼쪽 다리 생성
    const legGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    this.leftLeg = new THREE.Mesh(legGeometry, material);
    this.leftLeg.position.y = -0.25; // 피벗 기준으로 아래쪽에 위치
    this.leftLegPivot.add(this.leftLeg);

    // 오른쪽 다리 피벗 생성
    this.rightLegPivot = new THREE.Object3D();
    this.rightLegPivot.position.set(0.15, 0, 0);
    this.add(this.rightLegPivot);

    // 오른쪽 다리 생성
    this.rightLeg = new THREE.Mesh(legGeometry.clone(), material);
    this.rightLeg.position.y = -0.25; // 피벗 기준으로 아래쪽에 위치
    this.rightLegPivot.add(this.rightLeg);
  }

  /**
   * 왼쪽 팔 회전
   * @param x X축 회전 (라디안)
   * @param y Y축 회전 (라디안)
   * @param z Z축 회전 (라디안)
   */
  rotateLeftArm(x: number, y: number, z: number): void {
    this.leftArmPivot.rotation.set(x, y, z);
  }

  /**
   * 오른쪽 팔 회전
   * @param x X축 회전 (라디안)
   * @param y Y축 회전 (라디안)
   * @param z Z축 회전 (라디안)
   */
  rotateRightArm(x: number, y: number, z: number): void {
    this.rightArmPivot.rotation.set(x, y, z);
  }

  /**
   * 왼쪽 다리 회전
   * @param x X축 회전 (라디안)
   * @param y Y축 회전 (라디안)
   * @param z Z축 회전 (라디안)
   */
  rotateLeftLeg(x: number, y: number, z: number): void {
    this.leftLegPivot.rotation.set(x, y, z);
  }

  /**
   * 오른쪽 다리 회전
   * @param x X축 회전 (라디안)
   * @param y Y축 회전 (라디안)
   * @param z Z축 회전 (라디안)
   */
  rotateRightLeg(x: number, y: number, z: number): void {
    this.rightLegPivot.rotation.set(x, y, z);
  }

  /**
   * 모든 신체 부위 회전 초기화
   */
  resetRotations(): void {
    this.leftArmPivot.rotation.set(0, 0, 0);
    this.rightArmPivot.rotation.set(0, 0, 0);
    this.leftLegPivot.rotation.set(0, 0, 0);
    this.rightLegPivot.rotation.set(0, 0, 0);
  }

  /**
   * 걷는 애니메이션 (한 스텝)
   * @param time 시간 값 (애니메이션 진행 정도)
   */
  walk(time: number): void {
    // 팔 움직임
    this.rotateLeftArm(
      Math.sin(time) * 0.5, // 앞뒤로 흔들기
      0,
      0
    );
    this.rotateRightArm(
      -Math.sin(time) * 0.5, // 반대 방향으로 흔들기
      0,
      0
    );

    // 다리 움직임
    this.rotateLeftLeg(
      Math.sin(time) * 0.5, // 앞뒤로 흔들기
      0,
      0
    );
    this.rotateRightLeg(
      -Math.sin(time) * 0.5, // 반대 방향으로 흔들기
      0,
      0
    );
  }

  /**
   * 메모리 해제
   */
  dispose(): void {
    // 모든 지오메트리와 재질 해제
    (this.head.geometry as THREE.BufferGeometry).dispose();
    (this.body.geometry as THREE.BufferGeometry).dispose();
    (this.leftArm.geometry as THREE.BufferGeometry).dispose();
    (this.rightArm.geometry as THREE.BufferGeometry).dispose();
    (this.leftLeg.geometry as THREE.BufferGeometry).dispose();
    (this.rightLeg.geometry as THREE.BufferGeometry).dispose();

    (this.head.material as THREE.Material).dispose();
  }
}
