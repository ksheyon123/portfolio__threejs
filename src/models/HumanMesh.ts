import * as THREE from "three";

// 포즈 타입 열거형
export enum PoseType {
  RESET = "reset",
  WALK = "walk",
  RAISE_ARMS = "raiseArms",
  RUNNING = "running",
  WAVE = "wave",
  RIGHT_ARM_SWING = "rightArmSwing",
}

// 신체 부위 크기 상수
const BODY_DIMENSIONS = {
  HEAD: { width: 0.4, height: 0.4, depth: 0.4 },
  BODY: { width: 0.5, height: 0.7, depth: 0.25 },
  ARM: { width: 0.1, height: 0.4, depth: 0.1 },
  LEG: { width: 0.15, height: 0.5, depth: 0.15 },
};

// 신체 부위 위치 상수
const BODY_POSITIONS = {
  HEAD: { x: 0, y: 0.85, z: 0 },
  BODY: { x: 0, y: 0.35, z: 0 },
  LEFT_ARM_PIVOT: { x: -0.3, y: 0.6, z: 0 },
  RIGHT_ARM_PIVOT: { x: 0.3, y: 0.6, z: 0 },
  LEFT_LEG_PIVOT: { x: -0.15, y: 0, z: 0 },
  RIGHT_LEG_PIVOT: { x: 0.15, y: 0, z: 0 },
  ARM_OFFSET: { x: 0, y: -0.2, z: 0 },
  LEG_OFFSET: { x: 0, y: -0.25, z: 0 },
};

// 애니메이션 관련 상수
const ANIMATION = {
  WALK_SPEED: 3,
  RUN_SPEED: 8,
  WAVE_SPEED: 5,
  ARM_SWING_SPEED: 8,
  MAX_ARM_SWING_TIME: 1,
};

/**
 * 사람 형태의 mesh를 생성하는 클래스
 * 머리, 몸통, 양팔, 두 다리로 구성되며 각 부분을 개별적으로 움직일 수 있음
 */
export class HumanMesh extends THREE.Object3D {
  // 포즈 타입
  private poseType: PoseType = PoseType.RESET;

  // rightArmSwing 애니메이션을 위한 변수
  private rightArmSwingStartTime: number = 0;

  // 스페이스 키가 눌려있는지 여부
  private isSpaceKeyPressed: boolean = false;

  // 캐릭터의 방향 벡터
  private directionVector: THREE.Vector3 = new THREE.Vector3(0, 0, 1);

  // 각 신체 부위 메시
  private head!: THREE.Mesh;
  private body!: THREE.Mesh;
  private leftArm!: THREE.Mesh;
  private rightArm!: THREE.Mesh;
  private leftLeg!: THREE.Mesh;
  private rightLeg!: THREE.Mesh;

  // 각 신체 부위의 피벗 포인트 (관절)
  private leftArmPivot!: THREE.Object3D;
  private rightArmPivot!: THREE.Object3D;
  private leftLegPivot!: THREE.Object3D;
  private rightLegPivot!: THREE.Object3D;

  // 이벤트 핸들러 참조 저장
  private handleKeyDown: ((event: KeyboardEvent) => void) | null = null;
  private handleKeyUp: ((event: KeyboardEvent) => void) | null = null;

  constructor(color: THREE.ColorRepresentation = 0x44aa88) {
    super();

    // 재질 생성
    const material = new THREE.MeshPhongMaterial({ color });

    // 신체 부위 생성
    this.createBodyParts(material);

    // 키보드 이벤트 리스너 등록
    this.setupKeyboardEvents();
  }

  /**
   * 신체 부위 생성 메서드
   * @param material 사용할 재질
   */
  private createBodyParts(material: THREE.MeshPhongMaterial): void {
    // 머리 생성 (네모 모양)
    const {
      width: headWidth,
      height: headHeight,
      depth: headDepth,
    } = BODY_DIMENSIONS.HEAD;
    const headGeometry = new THREE.BoxGeometry(
      headWidth,
      headHeight,
      headDepth
    );
    this.head = new THREE.Mesh(headGeometry, material);
    this.head.position.set(
      BODY_POSITIONS.HEAD.x,
      BODY_POSITIONS.HEAD.y,
      BODY_POSITIONS.HEAD.z
    );
    this.head.name = "head"; // 이름 지정
    this.add(this.head);

    // 몸통 생성
    const {
      width: bodyWidth,
      height: bodyHeight,
      depth: bodyDepth,
    } = BODY_DIMENSIONS.BODY;
    const bodyGeometry = new THREE.BoxGeometry(
      bodyWidth,
      bodyHeight,
      bodyDepth
    );
    this.body = new THREE.Mesh(bodyGeometry, material);
    this.body.position.set(
      BODY_POSITIONS.BODY.x,
      BODY_POSITIONS.BODY.y,
      BODY_POSITIONS.BODY.z
    );
    this.body.name = "body"; // 이름 지정
    this.add(this.body);

    // 팔 지오메트리 생성
    const {
      width: armWidth,
      height: armHeight,
      depth: armDepth,
    } = BODY_DIMENSIONS.ARM;
    const armGeometry = new THREE.BoxGeometry(armWidth, armHeight, armDepth);

    // 왼쪽 팔 피벗 생성
    this.leftArmPivot = new THREE.Object3D();
    this.leftArmPivot.position.set(
      BODY_POSITIONS.LEFT_ARM_PIVOT.x,
      BODY_POSITIONS.LEFT_ARM_PIVOT.y,
      BODY_POSITIONS.LEFT_ARM_PIVOT.z
    );
    this.leftArmPivot.name = "leftArmPivot"; // 이름 지정
    this.add(this.leftArmPivot);

    // 왼쪽 팔 생성
    this.leftArm = new THREE.Mesh(armGeometry, material);
    this.leftArm.position.set(
      BODY_POSITIONS.ARM_OFFSET.x,
      BODY_POSITIONS.ARM_OFFSET.y,
      BODY_POSITIONS.ARM_OFFSET.z
    );
    this.leftArm.name = "leftArm"; // 이름 지정
    this.leftArmPivot.add(this.leftArm);

    // 오른쪽 팔 피벗 생성
    this.rightArmPivot = new THREE.Object3D();
    this.rightArmPivot.position.set(
      BODY_POSITIONS.RIGHT_ARM_PIVOT.x,
      BODY_POSITIONS.RIGHT_ARM_PIVOT.y,
      BODY_POSITIONS.RIGHT_ARM_PIVOT.z
    );
    this.rightArmPivot.name = "rightArmPivot"; // 이름 지정
    this.add(this.rightArmPivot);

    // 오른쪽 팔 생성
    this.rightArm = new THREE.Mesh(armGeometry.clone(), material);
    this.rightArm.position.set(
      BODY_POSITIONS.ARM_OFFSET.x,
      BODY_POSITIONS.ARM_OFFSET.y,
      BODY_POSITIONS.ARM_OFFSET.z
    );
    this.rightArm.name = "rightArm"; // 이름 지정
    this.rightArmPivot.add(this.rightArm);

    // 다리 지오메트리 생성
    const {
      width: legWidth,
      height: legHeight,
      depth: legDepth,
    } = BODY_DIMENSIONS.LEG;
    const legGeometry = new THREE.BoxGeometry(legWidth, legHeight, legDepth);

    // 왼쪽 다리 피벗 생성
    this.leftLegPivot = new THREE.Object3D();
    this.leftLegPivot.position.set(
      BODY_POSITIONS.LEFT_LEG_PIVOT.x,
      BODY_POSITIONS.LEFT_LEG_PIVOT.y,
      BODY_POSITIONS.LEFT_LEG_PIVOT.z
    );
    this.leftLegPivot.name = "leftLegPivot"; // 이름 지정
    this.add(this.leftLegPivot);

    // 왼쪽 다리 생성
    this.leftLeg = new THREE.Mesh(legGeometry, material);
    this.leftLeg.position.set(
      BODY_POSITIONS.LEG_OFFSET.x,
      BODY_POSITIONS.LEG_OFFSET.y,
      BODY_POSITIONS.LEG_OFFSET.z
    );
    this.leftLeg.name = "leftLeg"; // 이름 지정
    this.leftLegPivot.add(this.leftLeg);

    // 오른쪽 다리 피벗 생성
    this.rightLegPivot = new THREE.Object3D();
    this.rightLegPivot.position.set(
      BODY_POSITIONS.RIGHT_LEG_PIVOT.x,
      BODY_POSITIONS.RIGHT_LEG_PIVOT.y,
      BODY_POSITIONS.RIGHT_LEG_PIVOT.z
    );
    this.rightLegPivot.name = "rightLegPivot"; // 이름 지정
    this.add(this.rightLegPivot);

    // 오른쪽 다리 생성
    this.rightLeg = new THREE.Mesh(legGeometry.clone(), material);
    this.rightLeg.position.set(
      BODY_POSITIONS.LEG_OFFSET.x,
      BODY_POSITIONS.LEG_OFFSET.y,
      BODY_POSITIONS.LEG_OFFSET.z
    );
    this.rightLeg.name = "rightLeg"; // 이름 지정
    this.rightLegPivot.add(this.rightLeg);
  }

  /**
   * 신체 부위 회전 메서드
   * @param part 회전할 신체 부위 피벗
   * @param x X축 회전 (라디안)
   * @param y Y축 회전 (라디안)
   * @param z Z축 회전 (라디안)
   */
  private rotatePart(
    part: THREE.Object3D,
    x: number,
    y: number,
    z: number
  ): void {
    part.rotation.set(x, y, z);
  }

  /**
   * 왼쪽 팔 회전
   * @param x X축 회전 (라디안)
   * @param y Y축 회전 (라디안)
   * @param z Z축 회전 (라디안)
   */
  rotateLeftArm(x: number, y: number, z: number): void {
    this.rotatePart(this.leftArmPivot, x, y, z);
  }

  /**
   * 오른쪽 팔 회전
   * @param x X축 회전 (라디안)
   * @param y Y축 회전 (라디안)
   * @param z Z축 회전 (라디안)
   */
  rotateRightArm(x: number, y: number, z: number): void {
    this.rotatePart(this.rightArmPivot, x, y, z);
  }

  /**
   * 왼쪽 다리 회전
   * @param x X축 회전 (라디안)
   * @param y Y축 회전 (라디안)
   * @param z Z축 회전 (라디안)
   */
  rotateLeftLeg(x: number, y: number, z: number): void {
    this.rotatePart(this.leftLegPivot, x, y, z);
  }

  /**
   * 오른쪽 다리 회전
   * @param x X축 회전 (라디안)
   * @param y Y축 회전 (라디안)
   * @param z Z축 회전 (라디안)
   */
  rotateRightLeg(x: number, y: number, z: number): void {
    this.rotatePart(this.rightLegPivot, x, y, z);
  }

  /**
   * 모든 신체 부위 회전 초기화
   */
  resetRotations(): void {
    const zeroRotation = { x: 0, y: 0, z: 0 };
    this.rotatePart(
      this.leftArmPivot,
      zeroRotation.x,
      zeroRotation.y,
      zeroRotation.z
    );
    this.rotatePart(
      this.rightArmPivot,
      zeroRotation.x,
      zeroRotation.y,
      zeroRotation.z
    );
    this.rotatePart(
      this.leftLegPivot,
      zeroRotation.x,
      zeroRotation.y,
      zeroRotation.z
    );
    this.rotatePart(
      this.rightLegPivot,
      zeroRotation.x,
      zeroRotation.y,
      zeroRotation.z
    );
  }

  /**
   * 걷는 애니메이션 (한 스텝)
   * @param time 시간 값 (애니메이션 진행 정도)
   * @param intensity 애니메이션 강도 (기본값: 0.5)
   */
  walk(time: number, intensity: number = 0.5): void {
    const leftSwing = Math.sin(time) * intensity;
    const rightSwing = -Math.sin(time) * intensity;

    // 팔 움직임
    this.rotateLeftArm(leftSwing, 0, 0);
    this.rotateRightArm(rightSwing, 0, 0);

    // 다리 움직임
    this.rotateLeftLeg(leftSwing, 0, 0);
    this.rotateRightLeg(rightSwing, 0, 0);
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
   * @param type 포즈 타입
   */
  setPoseType(type: PoseType | string): void {
    // 문자열로 전달된 경우 PoseType으로 변환 (기존 코드와의 호환성 유지)
    if (typeof type === "string") {
      switch (type) {
        case "walk":
          this.poseType = PoseType.WALK;
          break;
        case "raiseArms":
          this.poseType = PoseType.RAISE_ARMS;
          break;
        case "running":
          this.poseType = PoseType.RUNNING;
          break;
        case "wave":
          this.poseType = PoseType.WAVE;
          break;
        case "rightArmSwing":
          this.poseType = PoseType.RIGHT_ARM_SWING;
          break;
        default:
          this.poseType = PoseType.RESET;
      }
    } else {
      this.poseType = type;
    }
  }

  /**
   * 현재 포즈 타입 반환
   * @returns 현재 포즈 타입
   */
  getPoseType(): PoseType {
    return this.poseType;
  }

  /**
   * 현재 포즈 타입에 따라 애니메이션 업데이트
   * @param time 시간 값 (애니메이션 진행 정도)
   */
  updatePose(time: number): void {
    switch (this.poseType) {
      case PoseType.WALK:
        // 걷는 애니메이션
        this.walk(time * ANIMATION.WALK_SPEED);
        break;
      case PoseType.RAISE_ARMS:
        // 양팔 들기 포즈
        this.resetRotations();
        this.rotateLeftArm(-Math.PI / 2, 0, 0);
        this.rotateRightArm(-Math.PI / 2, 0, 0);
        break;
      case PoseType.RUNNING:
        // 달리기 포즈
        this.walk(time * ANIMATION.RUN_SPEED);
        break;
      case PoseType.WAVE:
        // 손 흔들기 포즈
        this.resetRotations();
        this.rotateRightArm(-Math.PI / 2, 0, 0);
        // 오른팔 흔들기 애니메이션
        this.rotateRightArm(
          -Math.PI / 2,
          0,
          Math.sin(time * ANIMATION.WAVE_SPEED) * 0.5
        );
        break;
      case PoseType.RIGHT_ARM_SWING:
        // 오른팔 좌에서 우로 움직이는 애니메이션
        this.resetRotations();

        // 애니메이션 시작 시간 저장
        if (this.rightArmSwingStartTime === 0) {
          this.rightArmSwingStartTime = time;
        }

        // 애니메이션 진행 시간 (최대 1초)
        const elapsedTime = Math.min(
          time - this.rightArmSwingStartTime,
          ANIMATION.MAX_ARM_SWING_TIME
        );

        // 애니메이션 진행률 (0~1)
        const progress = elapsedTime * ANIMATION.ARM_SWING_SPEED;

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
            this.poseType = PoseType.RESET;
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
    this.handleKeyDown = (event: KeyboardEvent): void => {
      // 스페이스 키 처리
      if (event.key === " " || event.code === "Space") {
        // 스페이스 키가 눌려있는 상태로 설정
        this.isSpaceKeyPressed = true;

        // 현재 포즈가 rightArmSwing이 아닐 때만 포즈 변경
        // (이미 애니메이션 중이면 중복 실행 방지)
        if (this.poseType !== PoseType.RIGHT_ARM_SWING) {
          this.setPoseType(PoseType.RIGHT_ARM_SWING);
          this.rightArmSwingStartTime = 0; // 애니메이션 시작 시간 초기화
        }
      }
    };

    // 키 업 이벤트 핸들러
    this.handleKeyUp = (event: KeyboardEvent): void => {
      // 스페이스 키 처리
      if (event.key === " " || event.code === "Space") {
        // 스페이스 키가 떼어진 상태로 설정
        this.isSpaceKeyPressed = false;

        // 애니메이션 중단하고 기본 상태로 돌아감
        this.setPoseType(PoseType.RESET);
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
    const meshes = [
      this.head,
      this.body,
      this.leftArm,
      this.rightArm,
      this.leftLeg,
      this.rightLeg,
    ];

    // 모든 메시의 지오메트리 해제
    meshes.forEach((mesh) => {
      if (mesh && mesh.geometry) {
        (mesh.geometry as THREE.BufferGeometry).dispose();
      }
    });

    // 모든 메시의 재질 해제
    meshes.forEach((mesh) => {
      if (mesh && mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose());
        } else {
          (mesh.material as THREE.Material).dispose();
        }
      }
    });
  }
}
