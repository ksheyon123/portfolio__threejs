import * as THREE from "three";

// 카메라 설정 관련 상수
const CAMERA_SETTINGS = {
  DEFAULT_OFFSET: new THREE.Vector3(0, 2, 5),
  FIRST_PERSON_OFFSET: new THREE.Vector3(0, 0.5, 0),
  DEFAULT_SPHERE_RADIUS: 50,
  DEFAULT_ROTATION_RADIUS: 5,
  MIN_ZOOM: 1,
  MAX_ZOOM: 10,
  DEFAULT_ZOOM: 5,
  MIN_OFFSET_Y: 0.5,
  MAX_OFFSET_Y: 10,
  HEAD_ROTATION_LIMIT: Math.PI / 3, // 60도
  COLLISION_DISTANCE: 2, // 충돌 감지 거리
  COLLISION_AVOIDANCE_STEP: 0.2, // 충돌 회피 시 이동 단계
  COLLISION_RECOVERY_STEP: 0.1, // 충돌 회복 시 이동 단계
};

// 마우스/터치 이벤트 관련 상수
const MOUSE_SETTINGS = {
  ROTATION_SENSITIVITY: 0.01,
  HEIGHT_SENSITIVITY: 0.05,
  ZOOM_STEP: 0.5,
};

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
  private offset: THREE.Vector3 = CAMERA_SETTINGS.DEFAULT_OFFSET.clone();
  private firstPersonOffset: THREE.Vector3 =
    CAMERA_SETTINGS.FIRST_PERSON_OFFSET.clone();

  // 구 표면에 접하는 평면 관련 설정
  private sphereRadius: number = CAMERA_SETTINGS.DEFAULT_SPHERE_RADIUS;
  private tangentPlaneEnabled: boolean = false;

  // 카메라 상태
  private isFirstPerson: boolean = false;
  private isAltKeyPressed: boolean = false;
  private rotationAngle: number = 0;
  private rotationRadius: number = CAMERA_SETTINGS.DEFAULT_ROTATION_RADIUS;
  private minZoom: number = CAMERA_SETTINGS.MIN_ZOOM;
  private maxZoom: number = CAMERA_SETTINGS.MAX_ZOOM;
  private zoomLevel: number = CAMERA_SETTINGS.DEFAULT_ZOOM;
  private originalZoomLevel: number = CAMERA_SETTINGS.DEFAULT_ZOOM; // 충돌 전 원래 zoom level 저장
  private isColliding: boolean = false; // 충돌 상태 플래그

  // 머리 회전 상태 (1인칭 시점에서 사용)
  private headRotationX: number = 0;
  private headRotationY: number = 0;

  // 마우스 상태 추적
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };

  // 이벤트 핸들러 참조 저장
  private eventHandlers: {
    keydown: EventListener | null;
    keyup: EventListener | null;
    mousedown: EventListener | null;
    mousemove: EventListener | null;
    mouseup: EventListener | null;
    wheel: EventListener | null;
    touchstart: EventListener | null;
    touchmove: EventListener | null;
    touchend: EventListener | null;
  } = {
    keydown: null,
    keyup: null,
    mousedown: null,
    mousemove: null,
    mouseup: null,
    wheel: null,
    touchstart: null,
    touchmove: null,
    touchend: null,
  };

  // 이벤트 바인딩된 DOM 요소
  private domElement: HTMLElement | Window;

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
    this.domElement = domElement;

    // 이벤트 리스너 등록
    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    // 키보드 이벤트 (Alt 키)
    this.eventHandlers.keydown = this.handleKeyDown.bind(this) as EventListener;
    this.eventHandlers.keyup = this.handleKeyUp.bind(this) as EventListener;

    // 마우스 이벤트 (드래그, 휠)
    this.eventHandlers.mousedown = this.handleMouseDown.bind(
      this
    ) as EventListener;
    this.eventHandlers.mousemove = this.handleMouseMove.bind(
      this
    ) as EventListener;
    this.eventHandlers.mouseup = this.handleMouseUp.bind(this) as EventListener;
    this.eventHandlers.wheel = this.handleWheel.bind(this) as EventListener;

    // 터치 이벤트 (모바일 지원)
    if (this.domElement instanceof HTMLElement) {
      this.eventHandlers.touchstart = this.handleTouchStart.bind(
        this
      ) as EventListener;
      this.eventHandlers.touchmove = this.handleTouchMove.bind(
        this
      ) as EventListener;
      this.eventHandlers.touchend = this.handleTouchEnd.bind(
        this
      ) as EventListener;
    }

    // 이벤트 리스너 등록
    window.addEventListener("keydown", this.eventHandlers.keydown);
    window.addEventListener("keyup", this.eventHandlers.keyup);
    this.domElement.addEventListener("mousedown", this.eventHandlers.mousedown);
    this.domElement.addEventListener("mousemove", this.eventHandlers.mousemove);
    this.domElement.addEventListener("mouseup", this.eventHandlers.mouseup);
    this.domElement.addEventListener("wheel", this.eventHandlers.wheel);

    if (
      this.domElement instanceof HTMLElement &&
      this.eventHandlers.touchstart &&
      this.eventHandlers.touchmove &&
      this.eventHandlers.touchend
    ) {
      this.domElement.addEventListener(
        "touchstart",
        this.eventHandlers.touchstart
      );
      this.domElement.addEventListener(
        "touchmove",
        this.eventHandlers.touchmove
      );
      this.domElement.addEventListener("touchend", this.eventHandlers.touchend);
    }
  }

  /**
   * 이벤트 리스너 제거 (메모리 해제)
   */
  public removeEventListeners(): void {
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
    if (this.eventHandlers.mousedown) {
      this.domElement.removeEventListener(
        "mousedown",
        this.eventHandlers.mousedown
      );
      this.eventHandlers.mousedown = null;
    }
    if (this.eventHandlers.mousemove) {
      this.domElement.removeEventListener(
        "mousemove",
        this.eventHandlers.mousemove
      );
      this.eventHandlers.mousemove = null;
    }
    if (this.eventHandlers.mouseup) {
      this.domElement.removeEventListener(
        "mouseup",
        this.eventHandlers.mouseup
      );
      this.eventHandlers.mouseup = null;
    }
    if (this.eventHandlers.wheel) {
      this.domElement.removeEventListener("wheel", this.eventHandlers.wheel);
      this.eventHandlers.wheel = null;
    }

    // 터치 이벤트
    if (this.domElement instanceof HTMLElement) {
      if (this.eventHandlers.touchstart) {
        this.domElement.removeEventListener(
          "touchstart",
          this.eventHandlers.touchstart
        );
        this.eventHandlers.touchstart = null;
      }
      if (this.eventHandlers.touchmove) {
        this.domElement.removeEventListener(
          "touchmove",
          this.eventHandlers.touchmove
        );
        this.eventHandlers.touchmove = null;
      }
      if (this.eventHandlers.touchend) {
        this.domElement.removeEventListener(
          "touchend",
          this.eventHandlers.touchend
        );
        this.eventHandlers.touchend = null;
      }
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
   * 카메라 위치 및 방향 업데이트
   * 타겟 위치, 시점 모드, 회전 각도, 줌 레벨 등을 고려하여 카메라 위치 계산
   */
  public updateCameraPosition(): void {
    if (!this.target) return;

    const targetPosition = new THREE.Vector3();
    this.target.getWorldPosition(targetPosition);

    if (this.isFirstPerson) {
      this.updateFirstPersonCamera(targetPosition);
    } else if (this.tangentPlaneEnabled) {
      this.updateTangentPlaneCamera(targetPosition);
    } else {
      this.updateThirdPersonCamera(targetPosition);
    }
  }

  /**
   * 카메라와 물체 간의 충돌 감지 및 회피
   * @param objects 충돌 검사할 물체 배열
   */
  public checkCollisionAndAvoid(objects: THREE.Object3D[]): void {
    if (!this.target || this.isFirstPerson) return;

    // 타겟(HumanMesh) 위치 가져오기
    const targetPosition = new THREE.Vector3();
    this.target.getWorldPosition(targetPosition);

    // 카메라 위치 가져오기
    const cameraPosition = this.camera.position.clone();

    // 카메라에서 타겟으로의 방향 벡터 계산
    const directionToTarget = targetPosition
      .clone()
      .sub(cameraPosition)
      .normalize();

    // 충돌 감지를 위한 레이캐스터 생성
    const raycaster = new THREE.Raycaster(
      cameraPosition,
      directionToTarget.clone().negate(), // 카메라에서 타겟 반대 방향으로 레이캐스팅
      0,
      CAMERA_SETTINGS.COLLISION_DISTANCE
    );

    // 타겟(HumanMesh)을 제외한 물체들과의 충돌 검사
    const filteredObjects = objects.filter((obj) => obj !== this.target);
    const intersects = raycaster.intersectObjects(filteredObjects, true);

    if (intersects.length > 0) {
      // 충돌이 감지됨
      if (!this.isColliding) {
        // 충돌 상태로 전환될 때 현재 zoom level 저장
        this.originalZoomLevel = this.zoomLevel;
        this.isColliding = true;
      }

      // HumanMesh 방향으로 카메라 이동 (zoom level 감소)
      this.zoomLevel = Math.max(
        this.minZoom,
        this.zoomLevel - CAMERA_SETTINGS.COLLISION_AVOIDANCE_STEP
      );

      // 카메라 위치 업데이트
      this.updateCameraPosition();
    } else if (this.isColliding) {
      // 충돌이 해제됨 - 원래 zoom level로 서서히 복귀
      if (
        Math.abs(this.zoomLevel - this.originalZoomLevel) <
        CAMERA_SETTINGS.COLLISION_RECOVERY_STEP
      ) {
        // 원래 zoom level에 거의 도달했으면 정확히 설정
        this.zoomLevel = this.originalZoomLevel;
        this.isColliding = false;
      } else {
        // 원래 zoom level 방향으로 서서히 이동
        if (this.zoomLevel < this.originalZoomLevel) {
          this.zoomLevel += CAMERA_SETTINGS.COLLISION_RECOVERY_STEP;
        } else {
          this.zoomLevel -= CAMERA_SETTINGS.COLLISION_RECOVERY_STEP;
        }
      }

      // 카메라 위치 업데이트
      this.updateCameraPosition();
    }
  }

  /**
   * 1인칭 시점 카메라 업데이트
   * @param targetPosition 타겟 위치
   */
  private updateFirstPersonCamera(targetPosition: THREE.Vector3): void {
    // 1인칭 시점: 타겟의 "눈" 위치에 카메라 배치
    const firstPersonPosition = targetPosition
      .clone()
      .add(this.firstPersonOffset);
    this.camera.position.copy(firstPersonPosition);

    // 카메라 회전 설정 (머리의 회전 방향으로 카메라도 바라봄)
    this.camera.rotation.x = this.headRotationX;
    this.camera.rotation.y = this.headRotationY;
    this.camera.rotation.z = 0;
  }

  /**
   * 접평면 모드 카메라 업데이트
   * @param targetPosition 타겟 위치
   */
  private updateTangentPlaneCamera(targetPosition: THREE.Vector3): void {
    // 접평면 모드: 구 표면에 접하는 평면과 나란한 평면 위에 카메라 배치

    // 구의 중심은 원점으로 가정
    const sphereCenter = new THREE.Vector3(0, 0, 0);

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
      this.updateThirdPersonCamera(targetPosition);
    }
  }

  /**
   * 3인칭 시점 카메라 업데이트
   * @param targetPosition 타겟 위치
   */
  private updateThirdPersonCamera(targetPosition: THREE.Vector3): void {
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

  /**
   * 카메라 업데이트 (애니메이션 프레임마다 호출)
   * 타겟이 이동한 경우 카메라도 따라서 이동
   * @param objects 충돌 검사할 물체 배열 (선택적)
   */
  public update(objects?: THREE.Object3D[]): void {
    if (this.target) {
      this.updateCameraPosition();

      // 충돌 검사 및 회피 (objects가 제공된 경우)
      if (objects && objects.length > 0) {
        this.checkCollisionAndAvoid(objects);
      }
    }
  }

  /**
   * 1인칭/3인칭 시점 전환
   * @param isFirstPerson true면 1인칭, false면 3인칭
   */
  public toggleFirstPerson(isFirstPerson: boolean): void {
    this.isFirstPerson = isFirstPerson;
    this.updateCameraPosition();
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
      if (this.target && "resetHeadRotation" in this.target) {
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
      this.handleFirstPersonMouseMove(deltaMove);
    } else {
      this.handleThirdPersonMouseMove(deltaMove);
    }

    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  /**
   * 1인칭 시점에서의 마우스 이동 처리
   * @param deltaMove 마우스 이동량
   */
  private handleFirstPersonMouseMove(deltaMove: {
    x: number;
    y: number;
  }): void {
    if (!this.target) return;

    // X축 이동은 Y축 회전 (좌우 회전)
    this.headRotationY -= deltaMove.x * MOUSE_SETTINGS.ROTATION_SENSITIVITY;

    // Y축 이동은 X축 회전 (상하 회전) - 제한 적용
    this.headRotationX += deltaMove.y * MOUSE_SETTINGS.ROTATION_SENSITIVITY;
    this.headRotationX = Math.max(
      -CAMERA_SETTINGS.HEAD_ROTATION_LIMIT,
      Math.min(CAMERA_SETTINGS.HEAD_ROTATION_LIMIT, this.headRotationX)
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

  /**
   * 3인칭 시점에서의 마우스 이동 처리
   * @param deltaMove 마우스 이동량
   */
  private handleThirdPersonMouseMove(deltaMove: {
    x: number;
    y: number;
  }): void {
    // X축 이동(좌우 회전)은 무시하고 Y축 이동(상하 조정)만 처리
    // Y축 이동은 카메라 높이 조정 (제한 적용)
    const newOffsetY =
      this.offset.y - deltaMove.y * MOUSE_SETTINGS.HEIGHT_SENSITIVITY;
    this.offset.y = Math.max(
      CAMERA_SETTINGS.MIN_OFFSET_Y,
      Math.min(CAMERA_SETTINGS.MAX_OFFSET_Y, newOffsetY)
    );

    this.updateCameraPosition();
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
    const zoomDelta =
      event.deltaY > 0 ? MOUSE_SETTINGS.ZOOM_STEP : -MOUSE_SETTINGS.ZOOM_STEP;
    this.zoomLevel = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, this.zoomLevel + zoomDelta)
    );

    this.updateCameraPosition();
  }

  // 이전 터치 위치 저장
  private previousTouchX: number | null = null;

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
      this.previousTouchX = event.touches[0].clientX;
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

    // 3인칭 시점에서만 터치 이동 처리 (1인칭 시점은 복잡한 터치 제스처가 필요)
    this.handleThirdPersonMouseMove(deltaMove);

    this.previousMousePosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
    this.previousTouchX = event.touches[0].clientX;
  }

  /**
   * 터치 종료 이벤트 핸들러
   */
  private handleTouchEnd(): void {
    this.isDragging = false;
    this.previousTouchX = null;
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
