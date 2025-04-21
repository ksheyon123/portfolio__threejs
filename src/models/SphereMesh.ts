import * as THREE from "three";

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

  // 회전 속도 (라디안/프레임)
  private rotationSpeed: number = 0.02;

  // 충돌 상태
  private isColliding: boolean = false;

  // 키 입력 상태
  private keyState: {
    ArrowUp: boolean;
    ArrowDown: boolean;
    ArrowLeft: boolean;
    ArrowRight: boolean;
  } = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  };

  constructor(
    radius: number = 50,
    color: THREE.ColorRepresentation = 0xcccccc
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
    this.setupKeyboardEvents();
  }

  // 이벤트 핸들러 참조 저장
  private handleKeyDown: ((event: KeyboardEvent) => void) | null = null;
  private handleKeyUp: ((event: KeyboardEvent) => void) | null = null;

  /**
   * 키보드 이벤트 리스너 설정
   */
  private setupKeyboardEvents(): void {
    // 키 다운 이벤트 핸들러
    this.handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        this.keyState[event.key] = true;
      }
    };

    // 키 업 이벤트 핸들러
    this.handleKeyUp = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        this.keyState[event.key] = false;
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
   * 키 입력에 따른 구 회전 업데이트
   * 애니메이션 루프에서 호출되어야 함
   */
  /**
   * 충돌 상태 설정
   * @param state 충돌 상태 (true: 충돌 중, false: 충돌 없음)
   */
  setCollisionState(state: boolean): void {
    this.isColliding = state;
  }

  updateRotation(): void {
    // 충돌 중이면 회전을 막음
    if (this.isColliding) {
      return;
    }

    // 키 입력에 따른 구 회전 처리
    // 방향키가 클릭된 방향의 역방향으로 회전
    if (this.keyState.ArrowUp) {
      this.rotateByX(this.rotationSpeed); // 위쪽 키 -> 구를 X축 양의 방향으로 회전
    }
    if (this.keyState.ArrowDown) {
      this.rotateByX(-this.rotationSpeed); // 아래쪽 키 -> 구를 X축 음의 방향으로 회전
    }
    if (this.keyState.ArrowLeft) {
      this.rotateByY(this.rotationSpeed); // 왼쪽 키 -> 구를 Y축 양의 방향으로 회전
    }
    if (this.keyState.ArrowRight) {
      this.rotateByY(-this.rotationSpeed); // 오른쪽 키 -> 구를 Y축 음의 방향으로 회전
    }
  }

  /**
   * 회전 속도 설정
   * @param speed 회전 속도 (라디안/프레임)
   */
  setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  /**
   * X축 기준 회전
   * @param angle 회전 각도 (라디안)
   */
  rotateByX(angle: number): void {
    this.rotation.x += angle;
  }

  /**
   * Y축 기준 회전
   * @param angle 회전 각도 (라디안)
   */
  rotateByY(angle: number): void {
    this.rotation.y += angle;
  }

  /**
   * Z축 기준 회전
   * @param angle 회전 각도 (라디안)
   */
  rotateByZ(angle: number): void {
    this.rotation.z += angle;
  }

  /**
   * 구의 반지름 반환
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * 이벤트 리스너 제거 및 메모리 해제
   */
  dispose(): void {
    // 키보드 이벤트 리스너 제거
    this.removeKeyboardEvents();

    // 지오메트리와 재질 해제
    (this.sphere.geometry as THREE.BufferGeometry).dispose();
    (this.sphere.material as THREE.Material).dispose();
  }
}
