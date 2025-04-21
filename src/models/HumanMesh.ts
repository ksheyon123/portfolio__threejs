import * as THREE from "three";

/**
 * 사람 형태의 mesh를 생성하는 클래스
 * 머리, 몸통, 양팔, 두 다리로 구성되며 각 부분을 개별적으로 움직일 수 있음
 */
export class HumanMesh extends THREE.Object3D {
  // 포즈 타입
  private poseType: string = "reset";

  // rightArmSwing 애니메이션을 위한 변수
  private rightArmSwingStartTime: number = 0;

  // 스페이스 키가 눌려있는지 여부
  private isSpaceKeyPressed: boolean = false;

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

  // 이벤트 핸들러 참조 저장
  private handleKeyDown: ((event: KeyboardEvent) => void) | null = null;
  private handleKeyUp: ((event: KeyboardEvent) => void) | null = null;

  constructor(color: THREE.ColorRepresentation = 0x44aa88) {
    super();

    // 재질 생성
    const material = new THREE.MeshPhongMaterial({ color });

    // 키보드 이벤트 리스너 등록
    this.setupKeyboardEvents();

    // 머리 생성 (네모 모양)
    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
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
   * 머리 회전
   * @param x X축 회전 (라디안)
   * @param y Y축 회전 (라디안)
   * @param z Z축 회전 (라디안)
   */
  rotateHead(x: number, y: number, z: number): void {
    this.head.rotation.set(x, y, z);
  }

  /**
   * 머리 회전 초기화
   */
  resetHeadRotation(): void {
    this.head.rotation.set(0, 0, 0);
  }

  /**
   * 현재 포즈 타입 설정
   * @param type 포즈 타입 ("walk", "raiseArms", "running", "wave", "rightArmSwing", "reset" 중 하나)
   */
  setPoseType(type: string): void {
    this.poseType = type;
  }

  /**
   * 현재 포즈 타입 반환
   * @returns 현재 포즈 타입
   */
  getPoseType(): string {
    return this.poseType;
  }

  /**
   * 현재 포즈 타입에 따라 애니메이션 업데이트
   * @param time 시간 값 (애니메이션 진행 정도)
   */
  updatePose(time: number): void {
    switch (this.poseType) {
      case "walk":
        // 걷는 애니메이션
        this.walk(time * 3);
        break;
      case "raiseArms":
        // 양팔 들기 포즈
        this.resetRotations();
        this.rotateLeftArm(-Math.PI / 2, 0, 0);
        this.rotateRightArm(-Math.PI / 2, 0, 0);
        break;
      case "running":
        // 달리기 포즈
        this.walk(time * 8);
        break;
      case "wave":
        // 손 흔들기 포즈
        this.resetRotations();
        this.rotateRightArm(-Math.PI / 2, 0, 0);
        // 오른팔 흔들기 애니메이션
        this.rotateRightArm(-Math.PI / 2, 0, Math.sin(time * 5) * 0.5);
        break;
      case "rightArmSwing":
        // 오른팔 좌에서 우로 움직이는 애니메이션
        this.resetRotations();

        // 애니메이션 시작 시간 저장
        if (this.rightArmSwingStartTime === 0) {
          this.rightArmSwingStartTime = time;
        }

        // 애니메이션 진행 시간 (최대 1초)
        const elapsedTime = Math.min(time - this.rightArmSwingStartTime, 1);

        // 애니메이션 진행률 (0~1)
        const progress = elapsedTime * 8;

        // 오른팔을 왼쪽에서 오른쪽으로 움직임
        // 시작 위치: 왼쪽 (-PI/2 라디안, 즉 -90도)
        // 끝 위치: 오른쪽 (PI/2 라디안, 즉 90도)
        const angle = -Math.PI / 2 + progress * Math.PI;

        // Y축 기준으로 회전 (좌우 움직임)
        this.rotateRightArm(Math.PI / 2, 0, -angle / 2);

        // 애니메이션이 완료되었을 때 처리
        if (progress >= 1) {
          if (this.isSpaceKeyPressed) {
            // 스페이스 키가 여전히 눌려있으면 애니메이션 다시 시작
            this.rightArmSwingStartTime = 0;
          } else {
            // 스페이스 키가 떼어졌으면 기본 상태로 돌아감
            this.poseType = "reset";
            this.rightArmSwingStartTime = 0;
          }
        }
        break;
      default:
        // 기본 상태
        this.resetRotations();
        this.rightArmSwingStartTime = 0;
    }
  }

  /**
   * 키보드 이벤트 리스너 설정
   */
  private setupKeyboardEvents(): void {
    // 키 다운 이벤트 핸들러
    this.handleKeyDown = (event: KeyboardEvent) => {
      // 스페이스 키 처리
      if (event.key === " " || event.code === "Space") {
        // 스페이스 키가 눌려있는 상태로 설정
        this.isSpaceKeyPressed = true;

        // 현재 포즈가 rightArmSwing이 아닐 때만 포즈 변경
        // (이미 애니메이션 중이면 중복 실행 방지)
        if (this.poseType !== "rightArmSwing") {
          this.setPoseType("rightArmSwing");
          this.rightArmSwingStartTime = 0; // 애니메이션 시작 시간 초기화
        }
      }
    };

    // 키 업 이벤트 핸들러
    this.handleKeyUp = (event: KeyboardEvent) => {
      // 스페이스 키 처리
      if (event.key === " " || event.code === "Space") {
        // 스페이스 키가 떼어진 상태로 설정
        this.isSpaceKeyPressed = false;

        // 애니메이션 중단하고 기본 상태로 돌아감
        this.setPoseType("reset");
        this.rightArmSwingStartTime = 0;
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  /**
   * 키보드 이벤트 리스너 제거
   */
  private removeKeyboardEvents(): void {
    if (this.handleKeyDown) {
      window.removeEventListener("keydown", this.handleKeyDown);
      this.handleKeyDown = null;
    }
    if (this.handleKeyUp) {
      window.removeEventListener("keyup", this.handleKeyUp);
      this.handleKeyUp = null;
    }
  }

  /**
   * 메모리 해제
   */
  dispose(): void {
    // 키보드 이벤트 리스너 제거
    this.removeKeyboardEvents();

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
