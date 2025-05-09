import * as THREE from "three";
import { HumanMesh } from "./HumanMesh";

// 회전 관련 상수
const ROTATION_SETTINGS = {
  DEFAULT_SPEED: 0.02,
  RUNNING_SPEED_MULTIPLIER: 1.2, // 달리기 시 속도 증가 비율 (120%)
};

// 키 상태 인터페이스
interface KeyState {
  ArrowUp: boolean;
  ArrowDown: boolean;
  ArrowLeft: boolean;
  ArrowRight: boolean;
  Shift: boolean;
}

/**
 * 구 형태의 mesh를 생성하는 클래스
 * 반지름이 50인 구를 생성하고 회전 기능을 제공합니다.
 * 키보드 이벤트 처리 기능도 포함합니다.
 */
export class SphereMesh extends THREE.Object3D {
  // 구 메시
  private sphere: THREE.Mesh;

  // 구의 반지름
  private radius: number;

  // 기본 회전 속도 (라디안/프레임)
  private rotationSpeed: number = ROTATION_SETTINGS.DEFAULT_SPEED;

  // 달리기 시 회전 속도 (기본 속도의 120%)
  private runningRotationSpeed: number =
    ROTATION_SETTINGS.DEFAULT_SPEED *
    ROTATION_SETTINGS.RUNNING_SPEED_MULTIPLIER;

  // 충돌 상태
  private isColliding: boolean = false;

  // 회전 중인지 여부
  private isRotating: boolean = false;

  // 이동 제한 관련 속성
  private movementRestricted: boolean = false;
  private restrictedDirection: THREE.Vector3 | null = null;

  // 연결된 HumanMesh 인스턴스
  private humanMesh: HumanMesh | null = null;

  // 키 입력 상태
  private keyState: KeyState = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Shift: false,
  };

  // 이벤트 핸들러 참조 저장
  private eventHandlers: {
    keydown: EventListener | null;
    keyup: EventListener | null;
    mousemove: EventListener | null;
    touchmove: EventListener | null;
  } = {
    keydown: null,
    keyup: null,
    mousemove: null,
    touchmove: null,
  };

  // 이전 터치 위치 저장
  private previousTouchX: number | null = null;

  constructor(
    radius: number = 50,
    color: THREE.ColorRepresentation = 0xcccccc,
    humanMesh: HumanMesh | null = null
  ) {
    super();

    this.radius = radius;

    // 구 지오메트리 및 재질 생성
    const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: color,
      wireframe: false,
    });

    // 구 메시 생성
    this.sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.add(this.sphere);

    // 키보드 이벤트 리스너 등록
    this.setupEventListeners();

    // HumanMesh 설정
    if (humanMesh) {
      this.setHumanMesh(humanMesh);
    }
  }

  /**
   * HumanMesh 인스턴스 설정
   * @param human HumanMesh 인스턴스
   */
  setHumanMesh(human: HumanMesh): void {
    this.humanMesh = human;
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    // 키 다운 이벤트 핸들러
    this.eventHandlers.keydown = this.handleKeyDown.bind(this) as EventListener;

    // 키 업 이벤트 핸들러
    this.eventHandlers.keyup = this.handleKeyUp.bind(this) as EventListener;

    // 마우스 이동 이벤트 핸들러
    this.eventHandlers.mousemove = this.handleMouseMove.bind(
      this
    ) as EventListener;

    // 터치 이동 이벤트 핸들러
    this.eventHandlers.touchmove = this.handleTouchMove.bind(
      this
    ) as EventListener;

    // 이벤트 리스너 등록
    window.addEventListener("keydown", this.eventHandlers.keydown);
    window.addEventListener("keyup", this.eventHandlers.keyup);
    window.addEventListener("mousemove", this.eventHandlers.mousemove);
    window.addEventListener("touchmove", this.eventHandlers.touchmove);
  }

  /**
   * 키보드 및 마우스 이벤트 리스너 제거
   */
  private removeEventListeners(): void {
    // 키보드 이벤트
    if (this.eventHandlers.keydown) {
      window.removeEventListener("keydown", this.eventHandlers.keydown);
      this.eventHandlers.keydown = null;
    }
    if (this.eventHandlers.keyup) {
      window.removeEventListener("keyup", this.eventHandlers.keyup);
      this.eventHandlers.keyup = null;
    }

    // 마우스 이벤트
    if (this.eventHandlers.mousemove) {
      window.removeEventListener("mousemove", this.eventHandlers.mousemove);
      this.eventHandlers.mousemove = null;
    }

    // 터치 이벤트
    if (this.eventHandlers.touchmove) {
      window.removeEventListener("touchmove", this.eventHandlers.touchmove);
      this.eventHandlers.touchmove = null;
    }
  }

  /**
   * 키 다운 이벤트 핸들러
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "Shift"
    ) {
      this.keyState[event.key] = true;
    }
  }

  /**
   * 키 업 이벤트 핸들러
   */
  private handleKeyUp(event: KeyboardEvent): void {
    if (
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "Shift"
    ) {
      this.keyState[event.key] = false;
    }
  }

  /**
   * 마우스 이동 이벤트 핸들러
   */
  private handleMouseMove(event: MouseEvent): void {
    // 마우스 왼쪽 버튼이 눌린 상태에서만 처리 (Alt 키가 눌리지 않은 상태)
    if (event.buttons === 1 && !event.altKey) {
      const deltaX = event.movementX || 0;
      // X축 이동에 따라 구를 Y축 기준으로 회전
      this.rotateByY(deltaX * 0.01);
    }
  }

  /**
   * 터치 이동 이벤트 핸들러
   */
  private handleTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1) {
      // 현재 터치 위치
      const touch = event.touches[0];

      // 이전 터치 위치가 있으면 델타 계산
      if (this.previousTouchX !== null) {
        const deltaX = touch.clientX - this.previousTouchX;
        // X축 이동에 따라 구를 Y축 기준으로 회전
        this.rotateByY(deltaX * 0.01);
      }

      // 현재 터치 위치 저장
      this.previousTouchX = touch.clientX;
    }
  }

  /**
   * 충돌 상태 설정
   * @param state 충돌 상태 (true: 충돌 중, false: 충돌 없음)
   */
  setCollisionState(state: boolean): void {
    this.isColliding = state;
  }

  /**
   * 이동 제한 설정
   * @param restricted 이동 제한 여부
   * @param direction 제한할 이동 방향 (선택적)
   */
  setMovementRestriction(restricted: boolean, direction?: THREE.Vector3): void {
    this.movementRestricted = restricted;

    if (restricted && direction) {
      this.restrictedDirection = direction.clone().normalize();
    } else {
      this.restrictedDirection = null;
    }
  }

  /**
   * 키 입력에 따른 구 회전 업데이트
   * 애니메이션 루프에서 호출되어야 함
   */
  updateRotation(): void {
    // 충돌 중이면 회전을 막음
    if (this.isColliding) {
      this.isRotating = false;
      return;
    }

    // 이전 회전 상태 저장
    const wasRotating = this.isRotating;

    // 이동 방향 벡터 계산 및 이동 제한 처리
    const moveDirection = this.calculateMoveDirectionWithRestriction();

    // 현재 회전 중인지 다시 확인 (키 상태가 변경되었을 수 있음)
    this.isRotating = this.isAnyDirectionKeyPressed();

    // 회전 상태가 변경되었고 HumanMesh가 연결되어 있으면 포즈 업데이트
    this.updateHumanPose(wasRotating);

    // 현재 적용할 회전 속도 결정 (Shift 키가 눌려있으면 달리기 속도, 아니면 기본 속도)
    const currentSpeed = this.keyState.Shift
      ? this.runningRotationSpeed
      : this.rotationSpeed;

    // 키 입력에 따른 구 회전 처리
    this.applyRotation(currentSpeed);
  }

  /**
   * 이동 방향 벡터 계산 및 이동 제한 처리
   * @returns 처리된 이동 방향 벡터
   */
  private calculateMoveDirectionWithRestriction(): THREE.Vector3 {
    // 이동 방향 벡터 계산
    const moveDirection = new THREE.Vector3(0, 0, 0);
    if (this.keyState.ArrowUp) moveDirection.z -= 1;
    if (this.keyState.ArrowDown) moveDirection.z += 1;
    if (this.keyState.ArrowLeft) moveDirection.x -= 1;
    if (this.keyState.ArrowRight) moveDirection.x += 1;

    // 방향 벡터가 있을 경우 정규화
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
    }

    // 이동 제한 처리
    if (this.movementRestricted && this.restrictedDirection) {
      this.applyMovementRestriction(moveDirection);
    }

    return moveDirection;
  }

  /**
   * 이동 제한 적용
   * @param moveDirection 이동 방향 벡터
   */
  private applyMovementRestriction(moveDirection: THREE.Vector3): void {
    if (!this.restrictedDirection) return;

    // 제한된 방향과 이동 방향의 내적 계산 (같은 방향이면 양수)
    const dotProduct = moveDirection.dot(this.restrictedDirection);

    // 제한된 방향으로 이동하려는 경우 해당 키 입력 무시
    if (dotProduct > 0) {
      if (this.restrictedDirection.z < 0 && this.keyState.ArrowUp)
        this.keyState.ArrowUp = false;
      if (this.restrictedDirection.z > 0 && this.keyState.ArrowDown)
        this.keyState.ArrowDown = false;
      if (this.restrictedDirection.x < 0 && this.keyState.ArrowLeft)
        this.keyState.ArrowLeft = false;
      if (this.restrictedDirection.x > 0 && this.keyState.ArrowRight)
        this.keyState.ArrowRight = false;
    }
  }

  /**
   * 방향키가 하나라도 눌려있는지 확인
   * @returns 방향키가 눌려있으면 true, 아니면 false
   */
  private isAnyDirectionKeyPressed(): boolean {
    return (
      this.keyState.ArrowUp ||
      this.keyState.ArrowDown ||
      this.keyState.ArrowLeft ||
      this.keyState.ArrowRight
    );
  }

  /**
   * HumanMesh 포즈 업데이트
   * @param wasRotating 이전 회전 상태
   */
  private updateHumanPose(wasRotating: boolean): void {
    if (!this.humanMesh) return;

    if (this.isRotating) {
      // Shift 키가 눌려있으면 달리기 포즈, 아니면 걷기 포즈
      if (this.keyState.Shift) {
        this.humanMesh.setPoseType("running");
      } else {
        this.humanMesh.setPoseType("walk");
      }
    } else if (!this.isRotating && wasRotating) {
      // 회전 종료 - 기본 포즈로 변경
      this.humanMesh.setPoseType("reset");
    }
  }

  /**
   * 키 입력에 따른 회전 적용
   * @param speed 회전 속도
   */
  private applyRotation(speed: number): void {
    // 키 입력에 따른 구 회전 처리
    // 방향키가 클릭된 방향의 역방향으로 회전
    if (this.keyState.ArrowUp) {
      this.rotateByX(speed); // 위쪽 키 -> 구를 X축 양의 방향으로 회전
    }
    if (this.keyState.ArrowDown) {
      this.rotateByX(-speed); // 아래쪽 키 -> 구를 X축 음의 방향으로 회전
    }

    // 카메라 방향과 무관하게 일관된 회전 적용
    if (this.keyState.ArrowLeft) {
      this.rotateByZ(-speed); // 왼쪽 키 -> 구를 Z축 기준으로 회전
    }
    if (this.keyState.ArrowRight) {
      this.rotateByZ(speed); // 오른쪽 키 -> 구를 Z축 기준으로 회전
    }
  }

  /**
   * 현재 구가 회전 중인지 여부 반환
   * @returns 회전 중이면 true, 아니면 false
   */
  isCurrentlyRotating(): boolean {
    return this.isRotating;
  }

  /**
   * 회전 속도 설정
   * @param speed 회전 속도 (라디안/프레임)
   */
  setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
    this.runningRotationSpeed =
      speed * ROTATION_SETTINGS.RUNNING_SPEED_MULTIPLIER;
  }

  /**
   * X축 기준 회전 (월드 좌표계 기준)
   * @param angle 회전 각도 (라디안)
   */
  rotateByX(angle: number): void {
    // 월드 좌표계의 X축 벡터
    const worldXAxis = new THREE.Vector3(1, 0, 0);
    // 월드 좌표계 기준으로 회전
    this.rotateOnWorldAxis(worldXAxis, angle);
  }

  /**
   * Y축 기준 회전 (월드 좌표계 기준)
   * @param angle 회전 각도 (라디안)
   */
  rotateByY(angle: number): void {
    // 월드 좌표계의 Y축 벡터
    const worldYAxis = new THREE.Vector3(0, 1, 0);
    // 월드 좌표계 기준으로 회전
    this.rotateOnWorldAxis(worldYAxis, angle);
  }

  /**
   * Z축 기준 회전 (월드 좌표계 기준)
   * @param angle 회전 각도 (라디안)
   */
  rotateByZ(angle: number): void {
    // 월드 좌표계의 Z축 벡터
    const worldZAxis = new THREE.Vector3(0, 0, 1);
    // 월드 좌표계 기준으로 회전
    this.rotateOnWorldAxis(worldZAxis, angle);
  }

  /**
   * 구의 반지름 반환
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * 현재 키 입력 상태에 따른 이동 방향 벡터 계산
   * @returns 정규화된 이동 방향 벡터
   */
  calculateMoveDirection(): THREE.Vector3 {
    const moveDirection = new THREE.Vector3(0, 0, 0);

    // 키 상태에 따라 이동 방향 설정
    if (this.keyState.ArrowUp) moveDirection.z -= 1;
    if (this.keyState.ArrowDown) moveDirection.z += 1;
    if (this.keyState.ArrowLeft) moveDirection.x -= 1;
    if (this.keyState.ArrowRight) moveDirection.x += 1;

    // 방향 벡터가 있을 경우 정규화
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
    }

    return moveDirection;
  }

  /**
   * 이벤트 리스너 제거 및 메모리 해제
   */
  dispose(): void {
    // 키보드 이벤트 리스너 제거
    this.removeEventListeners();

    // 지오메트리와 재질 해제
    if (this.sphere.geometry) {
      (this.sphere.geometry as THREE.BufferGeometry).dispose();
    }

    if (this.sphere.material) {
      if (Array.isArray(this.sphere.material)) {
        this.sphere.material.forEach((material) => material.dispose());
      } else {
        (this.sphere.material as THREE.Material).dispose();
      }
    }
  }
}
