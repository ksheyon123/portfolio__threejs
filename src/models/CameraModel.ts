import * as THREE from "three";

/**
 * Three.js에서 사용할 카메라 모델 클래스
 *
 * 기능:
 * 1. 카메라의 Position과 LookAt 지정
 * 2. Target 오브젝트 추적 (Target이 이동하면 카메라도 따라서 이동)
 * 3. Alt 키 입력에 따라 1인칭/3인칭 시점 전환
 * 4. 줌인/줌아웃 기능
 * 5. Target 주위를 회전하는 기능
 */
export class CameraModel {
  // Three.js 카메라 객체
  private camera: THREE.PerspectiveCamera;

  // 카메라 설정
  private target: THREE.Object3D | null = null;
  private offset: THREE.Vector3 = new THREE.Vector3(0, 2, 5); // 3인칭 시점에서의 카메라 오프셋
  private firstPersonOffset: THREE.Vector3 = new THREE.Vector3(0, 0.5, 0); // 1인칭 시점에서의 카메라 오프셋

  // SphereMesh 참조
  private sphereMesh: any = null; // SphereMesh 타입으로 지정하면 순환 참조 발생 가능성 있음

  // 구 표면에 접하는 평면 관련 설정
  private sphereRadius: number = 50; // 구의 반지름
  private tangentPlaneEnabled: boolean = false; // 접평면 모드 활성화 여부

  // 카메라 상태
  private isFirstPerson: boolean = false;
  private isAltKeyPressed: boolean = false;
  private rotationAngle: number = 0;
  private rotationRadius: number = 5;
  private minZoom: number = 1;
  private maxZoom: number = 10;
  private zoomLevel: number = 5;

  // 머리 회전 상태 (1인칭 시점에서 사용)
  private headRotationX: number = 0;
  private headRotationY: number = 0;

  // 마우스 상태 추적
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };

  /**
   * CameraModel 생성자
   * @param camera Three.js 카메라 객체
   * @param domElement 이벤트를 바인딩할 DOM 요소 (기본값: window)
   */
  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement | Window = window
  ) {
    this.camera = camera;

    // 이벤트 리스너 등록
    this.setupEventListeners(domElement);
  }

  /**
   * 이벤트 리스너 설정
   * @param domElement 이벤트를 바인딩할 DOM 요소
   */
  private setupEventListeners(domElement: HTMLElement | Window): void {
    // 키보드 이벤트 (Alt 키)
    window.addEventListener(
      "keydown",
      this.handleKeyDown.bind(this) as EventListener
    );
    window.addEventListener(
      "keyup",
      this.handleKeyUp.bind(this) as EventListener
    );

    // 마우스 이벤트 (드래그, 휠)
    domElement.addEventListener(
      "mousedown",
      this.handleMouseDown.bind(this) as EventListener
    );
    domElement.addEventListener(
      "mousemove",
      this.handleMouseMove.bind(this) as EventListener
    );
    domElement.addEventListener(
      "mouseup",
      this.handleMouseUp.bind(this) as EventListener
    );
    domElement.addEventListener(
      "wheel",
      this.handleWheel.bind(this) as EventListener
    );

    // 터치 이벤트 (모바일 지원)
    if (domElement instanceof HTMLElement) {
      domElement.addEventListener(
        "touchstart",
        this.handleTouchStart.bind(this) as EventListener
      );
      domElement.addEventListener(
        "touchmove",
        this.handleTouchMove.bind(this) as EventListener
      );
      domElement.addEventListener(
        "touchend",
        this.handleTouchEnd.bind(this) as EventListener
      );
    }
  }

  /**
   * 이벤트 리스너 제거 (메모리 해제)
   * @param domElement 이벤트가 바인딩된 DOM 요소
   */
  public removeEventListeners(domElement: HTMLElement | Window = window): void {
    // 키보드 이벤트
    window.removeEventListener(
      "keydown",
      this.handleKeyDown.bind(this) as EventListener
    );
    window.removeEventListener(
      "keyup",
      this.handleKeyUp.bind(this) as EventListener
    );

    // 마우스 이벤트
    domElement.removeEventListener(
      "mousedown",
      this.handleMouseDown.bind(this) as EventListener
    );
    domElement.removeEventListener(
      "mousemove",
      this.handleMouseMove.bind(this) as EventListener
    );
    domElement.removeEventListener(
      "mouseup",
      this.handleMouseUp.bind(this) as EventListener
    );
    domElement.removeEventListener(
      "wheel",
      this.handleWheel.bind(this) as EventListener
    );

    // 터치 이벤트
    if (domElement instanceof HTMLElement) {
      domElement.removeEventListener(
        "touchstart",
        this.handleTouchStart.bind(this) as EventListener
      );
      domElement.removeEventListener(
        "touchmove",
        this.handleTouchMove.bind(this) as EventListener
      );
      domElement.removeEventListener(
        "touchend",
        this.handleTouchEnd.bind(this) as EventListener
      );
    }
  }

  /**
   * 카메라가 추적할 타겟 설정
   * @param target 추적할 Three.js 객체
   */
  public setTarget(target: THREE.Object3D): void {
    this.target = target;
    this.updateCameraPosition();
  }

  /**
   * SphereMesh 설정
   * @param sphere SphereMesh 인스턴스
   */
  public setSphere(sphere: any): void {
    this.sphereMesh = sphere;
  }

  /**
   * 카메라 오프셋 설정 (3인칭 시점에서 타겟으로부터의 상대적 위치)
   * @param x X축 오프셋
   * @param y Y축 오프셋
   * @param z Z축 오프셋
   */
  public setOffset(x: number, y: number, z: number): void {
    this.offset.set(x, y, z);
    this.updateCameraPosition();
  }

  /**
   * 1인칭 시점 오프셋 설정 (타겟의 "눈" 위치)
   * @param x X축 오프셋
   * @param y Y축 오프셋
   * @param z Z축 오프셋
   */
  public setFirstPersonOffset(x: number, y: number, z: number): void {
    this.firstPersonOffset.set(x, y, z);
    if (this.isFirstPerson) {
      this.updateCameraPosition();
    }
  }

  /**
   * 줌 범위 설정
   * @param min 최소 줌 레벨
   * @param max 최대 줌 레벨
   */
  public setZoomLimits(min: number, max: number): void {
    this.minZoom = min;
    this.maxZoom = max;

    // 현재 줌 레벨이 새 범위를 벗어나면 조정
    this.zoomLevel = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, this.zoomLevel)
    );
    this.updateCameraPosition();
  }

  /**
   * 카메라 위치 직접 설정
   * @param position 카메라 위치 벡터
   */
  public setPosition(position: THREE.Vector3): void {
    this.camera.position.copy(position);
  }

  /**
   * 카메라가 바라볼 지점 설정
   * @param lookAt 바라볼 지점 벡터
   */
  public setLookAt(lookAt: THREE.Vector3): void {
    this.camera.lookAt(lookAt);
  }

  /**
   * 구의 반지름 설정
   * @param radius 구의 반지름
   */
  public setSphereRadius(radius: number): void {
    this.sphereRadius = radius;
  }

  /**
   * 접평면 모드 활성화/비활성화
   * @param enabled 활성화 여부
   */
  public setTangentPlaneMode(enabled: boolean): void {
    this.tangentPlaneEnabled = enabled;

    // 접평면 모드가 활성화되면 카메라 위치 즉시 업데이트
    if (this.target) {
      this.updateCameraPosition();
    }
  }

  /**
   * 카메라의 시야 벡터 계산
   * @returns 카메라가 바라보는 방향 벡터 (정규화됨)
   */
  public getViewVector(): THREE.Vector3 {
    // 카메라가 바라보는 방향 벡터 계산 (z축 양의 방향)
    const viewVector = new THREE.Vector3(0, 0, 1);
    viewVector.applyQuaternion(this.camera.quaternion);
    return viewVector.normalize();
  }

  /**
   * 구 표면에 접하는 평면에 투영된 시야 벡터 계산
   * @param humanPosition 사람 메시의 위치
   * @returns 평면에 투영된 시야 벡터 (정규화됨)
   */
  public getProjectedViewVector(humanPosition: THREE.Vector3): THREE.Vector3 {
    // 구의 중심 가져오기 (SphereMesh가 있으면 그 위치 사용, 없으면 원점 사용)
    const sphereCenter =
      this.sphereMesh && this.sphereMesh.position
        ? this.sphereMesh.position.clone()
        : new THREE.Vector3(0, 0, 0);

    // 사람 메시에서 구 중심으로의 방향 벡터 (구의 법선 벡터)
    const normal = humanPosition.clone().sub(sphereCenter).normalize();

    // 카메라의 시야 벡터
    const viewVector = this.getViewVector();

    // 시야 벡터를 접평면에 투영
    // 투영 공식: v_proj = v - (v·n)n
    const dotProduct = viewVector.dot(normal);
    const projectedVector = viewVector
      .clone()
      .sub(normal.clone().multiplyScalar(dotProduct));

    // 투영된 벡터 정규화 (길이가 0이면 원래 벡터 반환)
    return projectedVector.length() > 0.001
      ? projectedVector.normalize()
      : viewVector.clone();
  }

  /**
   * 카메라 위치 및 방향 업데이트
   * 타겟 위치, 시점 모드, 회전 각도, 줌 레벨 등을 고려하여 카메라 위치 계산
   */
  public updateCameraPosition(): void {
    if (!this.target) return;

    const targetPosition = new THREE.Vector3();
    this.target.getWorldPosition(targetPosition);

    if (this.isFirstPerson) {
      // 1인칭 시점: 타겟의 "눈" 위치에 카메라 배치
      const firstPersonPosition = targetPosition
        .clone()
        .add(this.firstPersonOffset);
      this.camera.position.copy(firstPersonPosition);

      // 카메라 회전 설정 (머리의 회전 방향으로 카메라도 바라봄)
      this.camera.rotation.x = this.headRotationX;
      this.camera.rotation.y = this.headRotationY;
      this.camera.rotation.z = 0;
    } else if (this.tangentPlaneEnabled) {
      // 접평면 모드: 구 표면에 접하는 평면과 나란한 평면 위에 카메라 배치

      // 구의 중심 가져오기 (SphereMesh가 있으면 그 위치 사용, 없으면 원점 사용)
      const sphereCenter =
        this.sphereMesh && this.sphereMesh.getWorldPosition
          ? new THREE.Vector3().setFromMatrixPosition(
              this.sphereMesh.matrixWorld
            )
          : new THREE.Vector3(0, 0, 0);

      // 타겟에서 구 중심으로의 방향 벡터 (구의 법선 벡터)
      const normal = targetPosition.clone().sub(sphereCenter).normalize();

      // 접평면 위의 한 점 (타겟 위치)
      const planePoint = targetPosition.clone();

      // 회전 각도에 따른 카메라 위치 계산
      const theta = this.rotationAngle;

      try {
        // 접평면 위에서의 카메라 위치 계산
        // 1. 접평면의 기준 벡터 계산 (법선 벡터에 수직인 임의의 벡터)
        const tangentX = new THREE.Vector3(1, 0, 0);
        if (Math.abs(normal.dot(tangentX)) > 0.9) {
          // 법선이 x축과 거의 평행하면 y축 사용
          tangentX.set(0, 1, 0);
        }

        // 2. 법선 벡터와 수직인 첫 번째 접평면 벡터 계산
        const tangent1 = new THREE.Vector3()
          .crossVectors(normal, tangentX)
          .normalize();

        // 3. 두 번째 접평면 벡터 계산 (법선과 첫 번째 접평면 벡터에 수직)
        const tangent2 = new THREE.Vector3()
          .crossVectors(normal, tangent1)
          .normalize();

        // 4. 회전 각도와 거리를 고려하여 접평면 위의 카메라 위치 계산
        const distance = this.rotationRadius * (this.zoomLevel / 5);
        const offsetOnPlane = new THREE.Vector3()
          .addScaledVector(tangent1, distance * -Math.cos(theta))
          .addScaledVector(tangent2, distance * -Math.sin(theta));

        // 5. 접평면에서 약간 떨어진 위치에 카메라 배치 (법선 방향으로)
        const cameraPosition = planePoint
          .clone()
          .add(offsetOnPlane)
          .addScaledVector(normal, this.offset.y); // 높이 조정

        this.camera.position.copy(cameraPosition);

        // 타겟을 바라보도록 설정
        this.camera.lookAt(targetPosition);
      } catch (error) {
        console.error("접평면 모드 카메라 위치 계산 오류:", error);

        // 오류 발생 시 일반 3인칭 시점으로 대체
        const theta = this.rotationAngle;
        const distance = this.rotationRadius * (this.zoomLevel / 5);
        const x = distance * Math.sin(theta);
        const z = distance * Math.cos(theta);

        this.camera.position.x = targetPosition.x + x;
        this.camera.position.y = targetPosition.y + this.offset.y;
        this.camera.position.z = targetPosition.z + z;

        this.camera.lookAt(targetPosition);
      }
    } else {
      // 일반 3인칭 시점: 타겟 주위를 회전하는 위치에 카메라 배치
      const theta = this.rotationAngle;

      // 회전 반경과 줌 레벨을 고려한 위치 계산
      const distance = this.rotationRadius * (this.zoomLevel / 5);
      const x = distance * Math.sin(theta);
      const z = distance * Math.cos(theta);
      // 타겟 위치에 오프셋 적용
      this.camera.position.x = targetPosition.x + x;
      this.camera.position.y = targetPosition.y + this.offset.y;
      this.camera.position.z = targetPosition.z + z;

      // 타겟을 바라보도록 설정
      this.camera.lookAt(targetPosition);
    }
  }

  /**
   * 카메라 업데이트 (애니메이션 프레임마다 호출)
   * 타겟이 이동한 경우 카메라도 따라서 이동
   */
  public update(): void {
    if (this.target) {
      this.updateCameraPosition();
    }
  }

  /**
   * 1인칭/3인칭 시점 전환
   * @param isFirstPerson true면 1인칭, false면 3인칭
   */
  public toggleFirstPerson(isFirstPerson: boolean): void {
    this.isFirstPerson = isFirstPerson;
    this.updateCameraPosition();

    // 3인칭으로 전환 시 SphereMesh에 카메라 방향 변경 알림
    if (
      !isFirstPerson &&
      this.sphereMesh &&
      typeof this.sphereMesh.onCameraDirectionChange === "function"
    ) {
      const cameraDirection = this.getViewVector();
      this.sphereMesh.onCameraDirectionChange(cameraDirection);
    }
  }

  /**
   * 키 다운 이벤트 핸들러
   * Alt 키를 누르면 1인칭 시점으로 전환
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Alt") {
      event.preventDefault();
      this.isAltKeyPressed = true;
      this.toggleFirstPerson(true);

      // 1인칭 시점으로 전환 시 머리 회전 초기화
      this.headRotationX = 0;
      this.headRotationY = 0;

      // HumanMesh인 경우 머리 회전 초기화
      if (this.target && "rotateHead" in this.target) {
        (this.target as any).resetHeadRotation();
      }
    }
  }

  /**
   * 키 업 이벤트 핸들러
   * Alt 키를 떼면 3인칭 시점으로 전환
   */
  private handleKeyUp(event: KeyboardEvent): void {
    if (event.key === "Alt") {
      this.isAltKeyPressed = false;
      this.toggleFirstPerson(false);
    }
  }

  /**
   * 마우스 다운 이벤트 핸들러
   * 드래그 시작 시 마우스 위치 저장
   */
  private handleMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  /**
   * 마우스 이동 이벤트 핸들러
   * 드래그 중이면 카메라 회전 처리
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaMove = {
      x: event.clientX - this.previousMousePosition.x,
      y: event.clientY - this.previousMousePosition.y,
    };

    if (this.isFirstPerson) {
      // 1인칭 시점에서는 머리만 회전
      if (this.target) {
        // X축 이동은 Y축 회전 (좌우 회전)
        this.headRotationY -= deltaMove.x * 0.01;

        // Y축 이동은 X축 회전 (상하 회전) - 제한 적용
        this.headRotationX += deltaMove.y * 0.01;
        this.headRotationX = Math.max(
          -Math.PI / 3,
          Math.min(Math.PI / 3, this.headRotationX)
        );

        // HumanMesh인 경우 머리만 회전
        if ("rotateHead" in this.target) {
          (this.target as any).rotateHead(
            this.headRotationX,
            this.headRotationY,
            0
          );
        }

        // 카메라 회전 업데이트
        this.camera.rotation.x = this.headRotationX;
        this.camera.rotation.y = this.headRotationY;
      }
    } else {
      // 3인칭 시점에서는 카메라 각도 변경 대신 구를 회전
      // X축 이동(좌우 이동)은 구의 Y축 회전으로 처리
      if (this.sphereMesh && typeof this.sphereMesh.rotateByY === "function") {
        // 마우스 X축 이동에 따라 구를 Y축 기준으로 회전
        this.sphereMesh.rotateByY(deltaMove.x * 0.01);
      } else {
        // SphereMesh가 없거나 rotateByY 메서드가 없는 경우 기존 방식으로 카메라 회전
        this.rotationAngle -= deltaMove.x * 0.01;
      }

      // Y축 이동은 카메라 높이 조정 (제한 적용) - 구를 회전시키지 않음
      const newOffsetY = this.offset.y - deltaMove.y * 0.05;
      this.offset.y = Math.max(0.5, Math.min(10, newOffsetY));

      this.updateCameraPosition();

      // SphereMesh에 카메라 방향 변경 알림
      if (
        this.sphereMesh &&
        typeof this.sphereMesh.onCameraDirectionChange === "function"
      ) {
        const cameraDirection = this.getViewVector();
        this.sphereMesh.onCameraDirectionChange(cameraDirection);
      }
    }

    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  /**
   * 마우스 업 이벤트 핸들러
   * 드래그 종료
   */
  private handleMouseUp(): void {
    this.isDragging = false;
  }

  /**
   * 마우스 휠 이벤트 핸들러
   * 줌인/줌아웃 처리
   */
  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    // 휠 방향에 따라 줌 레벨 조정
    const zoomDelta = event.deltaY > 0 ? 0.5 : -0.5;
    this.zoomLevel = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, this.zoomLevel + zoomDelta)
    );

    this.updateCameraPosition();
  }

  /**
   * 터치 시작 이벤트 핸들러
   */
  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.isDragging = true;
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    }
  }

  /**
   * 터치 이동 이벤트 핸들러
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.isDragging || event.touches.length !== 1) return;

    const deltaMove = {
      x: event.touches[0].clientX - this.previousMousePosition.x,
      y: event.touches[0].clientY - this.previousMousePosition.y,
    };

    // 3인칭 시점에서는 카메라 각도 변경 대신 구를 회전
    // X축 이동(좌우 이동)은 구의 Y축 회전으로 처리
    if (this.sphereMesh && typeof this.sphereMesh.rotateByY === "function") {
      // 터치 X축 이동에 따라 구를 Y축 기준으로 회전
      this.sphereMesh.rotateByY(deltaMove.x * 0.01);
    } else {
      // SphereMesh가 없거나 rotateByY 메서드가 없는 경우 기존 방식으로 카메라 회전
      this.rotationAngle -= deltaMove.x * 0.01;
    }

    // Y축 이동은 카메라 높이 조정 (제한 적용) - 구를 회전시키지 않음
    const newOffsetY = this.offset.y - deltaMove.y * 0.05;
    this.offset.y = Math.max(0.5, Math.min(10, newOffsetY));

    this.updateCameraPosition();

    // SphereMesh에 카메라 방향 변경 알림
    if (
      this.sphereMesh &&
      typeof this.sphereMesh.onCameraDirectionChange === "function"
    ) {
      const cameraDirection = this.getViewVector();
      this.sphereMesh.onCameraDirectionChange(cameraDirection);
    }

    this.previousMousePosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }

  /**
   * 터치 종료 이벤트 핸들러
   */
  private handleTouchEnd(): void {
    this.isDragging = false;
  }

  /**
   * 메모리 해제
   */
  public dispose(): void {
    // 이벤트 리스너 제거
    this.removeEventListeners();

    // 참조 정리
    this.target = null;
  }
}
