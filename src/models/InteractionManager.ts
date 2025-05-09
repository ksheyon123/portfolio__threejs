import * as THREE from "three";
import { BoxMesh } from "./BoxMesh";
import { HumanMesh } from "./HumanMesh";
import { SphereMesh } from "./SphereMesh";
import { TreasureChestMesh } from "./TreasureChestMesh";

// 근접 단계별 거리 임계값 상수
const PROXIMITY_THRESHOLDS = {
  FAR: 15, // 먼 거리
  MEDIUM: 10, // 중간 거리
  CLOSE: 5, // 가까운 거리
};

// 색상 변화 단계 상수
const COLOR_STAGES = {
  NORMAL: 0xff5533, // 기본 색상
  WARNING: 0xffaa33, // 경고 색상 (중간 거리)
  DANGER: 0xff3333, // 위험 색상 (가까운 거리)
};

// 충돌 감지 관련 상수
const COLLISION_SETTINGS = {
  MIN_DISTANCE: 0.05, // 충돌로 간주할 최소 거리
  MAX_RAYCAST_DISTANCE: 5, // 레이캐스트 최대 검사 거리
  HUMAN_BOUNDS_SCALE: 0.4, // 사람 바운딩 박스 스케일 (0.4 = 40%)
};

/**
 * 충돌 예측 결과 인터페이스
 */
interface CollisionPrediction {
  willCollide: boolean;
  distance: number;
  collisionPoint?: THREE.Vector3;
}

/**
 * 객체 간 상호작용을 관리하는 클래스
 * 거리 기반 상호작용 및 충돌 감지 처리
 */
export class InteractionManager {
  // 근접 단계별 거리 임계값
  private proximityThresholds = {
    far: PROXIMITY_THRESHOLDS.FAR,
    medium: PROXIMITY_THRESHOLDS.MEDIUM,
    close: PROXIMITY_THRESHOLDS.CLOSE,
  };

  // 색상 변화 단계
  private colorStages: {
    normal: THREE.ColorRepresentation;
    warning: THREE.ColorRepresentation;
    danger: THREE.ColorRepresentation;
  } = {
    normal: COLOR_STAGES.NORMAL,
    warning: COLOR_STAGES.WARNING,
    danger: COLOR_STAGES.DANGER,
  };

  // 충돌 상태
  private isColliding = false;

  /**
   * 레이캐스팅을 사용한 충돌 예측
   * @param origin 레이캐스트 시작 위치
   * @param direction 레이캐스트 방향 (정규화된 벡터)
   * @param objects 충돌 검사할 객체 배열
   * @param minDistance 충돌로 간주할 최소 거리 (기본값: 0.05)
   * @returns 예측 결과 객체 {willCollide: boolean, distance: number}
   */
  predictCollision(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    objects: THREE.Object3D[],
    minDistance: number = COLLISION_SETTINGS.MIN_DISTANCE
  ): CollisionPrediction {
    // 레이캐스터 생성
    const raycaster = new THREE.Raycaster(
      origin,
      direction.normalize(),
      0, // 시작 거리
      COLLISION_SETTINGS.MAX_RAYCAST_DISTANCE // 최대 검사 거리
    );

    // 레이캐스팅 수행
    const intersects = raycaster.intersectObjects(objects, true);

    // 교차점이 있고 거리가 minDistance 이하인 경우 충돌 예측
    if (intersects.length > 0) {
      const distance = intersects[0].distance;
      return {
        willCollide: distance <= minDistance,
        distance: distance,
        collisionPoint: intersects[0].point,
      };
    }

    // 교차점이 없는 경우
    return {
      willCollide: false,
      distance: Infinity,
    };
  }

  /**
   * 이동 방향에 따른 충돌 예측
   * @param human HumanMesh 객체
   * @param moveDirection 이동 방향 벡터
   * @param boxes BoxMesh 객체 배열
   * @param treasureChests TreasureChestMesh 객체 배열 (선택적)
   * @returns 예측 결과 객체 {willCollide: boolean, distance: number}
   */
  predictMovementCollision(
    human: HumanMesh,
    moveDirection: THREE.Vector3,
    boxes: BoxMesh[],
    treasureChests?: TreasureChestMesh[]
  ): CollisionPrediction {
    // 이동 방향이 없으면 충돌 없음
    if (moveDirection.length() === 0) {
      return { willCollide: false, distance: Infinity };
    }

    // 충돌 검사할 객체들 수집
    const objects: THREE.Object3D[] = [...boxes];
    if (treasureChests && treasureChests.length > 0) {
      objects.push(...treasureChests);
    }

    // 사람의 바운딩 박스 계산
    const humanBounds = this.calculateHumanBounds(human);

    // 바운딩 박스의 크기와 중심점 계산
    const humanSize = new THREE.Vector3();
    humanBounds.getSize(humanSize);

    const humanCenter = new THREE.Vector3();
    humanBounds.getCenter(humanCenter);

    // 바운딩 박스의 모서리 및 중요 지점들 계산
    const checkPoints = this.calculateCheckPoints(humanCenter, humanSize);

    // 각 지점에서 레이캐스팅 수행하여 가장 가까운 충돌 거리 찾기
    return this.findClosestCollision(checkPoints, moveDirection, objects);
  }

  /**
   * 사람의 바운딩 박스 계산
   * @param human HumanMesh 객체
   * @returns 바운딩 박스
   */
  private calculateHumanBounds(human: HumanMesh): THREE.Box3 {
    return new THREE.Box3().setFromObject(human);
  }

  /**
   * 충돌 검사를 위한 체크 포인트 계산
   * @param center 바운딩 박스 중심점
   * @param size 바운딩 박스 크기
   * @returns 체크 포인트 배열
   */
  private calculateCheckPoints(
    center: THREE.Vector3,
    size: THREE.Vector3
  ): THREE.Vector3[] {
    const scale = COLLISION_SETTINGS.HUMAN_BOUNDS_SCALE;

    return [
      center.clone(), // 중심점
      new THREE.Vector3(
        center.x + size.x * scale,
        center.y,
        center.z + size.z * scale
      ), // 오른쪽 앞
      new THREE.Vector3(
        center.x - size.x * scale,
        center.y,
        center.z + size.z * scale
      ), // 왼쪽 앞
      new THREE.Vector3(
        center.x,
        center.y + size.y * scale,
        center.z + size.z * scale
      ), // 위쪽 앞
      new THREE.Vector3(
        center.x,
        center.y - size.y * scale,
        center.z + size.z * scale
      ), // 아래쪽 앞
    ];
  }

  /**
   * 가장 가까운 충돌 지점 찾기
   * @param checkPoints 체크 포인트 배열
   * @param moveDirection 이동 방향 벡터
   * @param objects 충돌 검사할 객체 배열
   * @returns 충돌 예측 결과
   */
  private findClosestCollision(
    checkPoints: THREE.Vector3[],
    moveDirection: THREE.Vector3,
    objects: THREE.Object3D[]
  ): CollisionPrediction {
    let minDistance = Infinity;
    let willCollide = false;

    for (const point of checkPoints) {
      const result = this.predictCollision(point, moveDirection, objects);

      // 충돌이 예상되고 현재까지의 최소 거리보다 작으면 업데이트
      if (result.distance < minDistance) {
        minDistance = result.distance;
        willCollide = result.willCollide || willCollide;
      }
    }

    return {
      willCollide: willCollide,
      distance: minDistance,
    };
  }

  /**
   * 거리 계산 및 상호작용 처리
   * @param boxes BoxMesh 객체 또는 BoxMesh 객체 배열
   * @param human HumanMesh 객체
   * @param sphere SphereMesh 객체
   * @param treasureChests TreasureChestMesh 객체 배열 (선택적)
   * @param moveDirection 현재 이동 방향 벡터 (선택적)
   */
  update(
    boxes: BoxMesh | BoxMesh[],
    human: HumanMesh,
    sphere: SphereMesh,
    treasureChests?: TreasureChestMesh[],
    moveDirection?: THREE.Vector3
  ): void {
    // 박스 배열 생성 (단일 박스인 경우 배열로 변환)
    const boxArray = Array.isArray(boxes) ? boxes : [boxes];

    // 사람 위치 계산
    const humanPosition = new THREE.Vector3();
    human.getWorldPosition(humanPosition);

    // 사람의 바운딩 박스 계산
    const humanBounds = this.calculateHumanBounds(human);

    // 이동 방향이 제공된 경우 충돌 예측 수행
    this.handleMovementPrediction(
      human,
      moveDirection,
      boxArray,
      sphere,
      treasureChests
    );

    // 충돌 감지 및 처리
    const collision = this.detectCollision(
      humanBounds,
      boxArray,
      treasureChests
    );
    this.updateCollisionState(collision, sphere);

    // 근접성 기반 색상 변경
    this.updateProximityColors(humanPosition, boxArray);
  }

  /**
   * 이동 방향에 따른 충돌 예측 및 처리
   * @param human HumanMesh 객체
   * @param moveDirection 이동 방향 벡터
   * @param boxes BoxMesh 객체 배열
   * @param sphere SphereMesh 객체
   * @param treasureChests TreasureChestMesh 객체 배열 (선택적)
   */
  private handleMovementPrediction(
    human: HumanMesh,
    moveDirection: THREE.Vector3 | undefined,
    boxes: BoxMesh[],
    sphere: SphereMesh,
    treasureChests?: TreasureChestMesh[]
  ): void {
    if (moveDirection && moveDirection.length() > 0) {
      const prediction = this.predictMovementCollision(
        human,
        moveDirection,
        boxes,
        treasureChests
      );

      // 디버깅용 로그 - 충돌 예측 거리 출력
      console.log("예측 충돌 거리:", prediction.distance);

      // 거리가 임계값 미만이면 이동 제한 신호 전달
      if (prediction.distance < this.proximityThresholds.close) {
        sphere.setMovementRestriction(true, moveDirection);
      } else {
        sphere.setMovementRestriction(false);
      }
    }
  }

  /**
   * 충돌 감지
   * @param humanBounds 사람의 바운딩 박스
   * @param boxes BoxMesh 객체 배열
   * @param treasureChests TreasureChestMesh 객체 배열 (선택적)
   * @returns 충돌 여부
   */
  private detectCollision(
    humanBounds: THREE.Box3,
    boxes: BoxMesh[],
    treasureChests?: TreasureChestMesh[]
  ): boolean {
    // BoxMesh와의 충돌 감지
    for (const box of boxes) {
      const boxBounds = new THREE.Box3().setFromObject(box);
      if (boxBounds.intersectsBox(humanBounds)) {
        return true;
      }
    }

    // TreasureChestMesh와의 충돌 감지 (제공된 경우)
    if (treasureChests && treasureChests.length > 0) {
      for (const treasureChest of treasureChests) {
        const treasureChestBounds = new THREE.Box3().setFromObject(
          treasureChest
        );
        if (treasureChestBounds.intersectsBox(humanBounds)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 충돌 상태 업데이트
   * @param collision 충돌 여부
   * @param sphere SphereMesh 객체
   */
  private updateCollisionState(collision: boolean, sphere: SphereMesh): void {
    if (collision !== this.isColliding) {
      this.isColliding = collision;
      sphere.setCollisionState(collision);

      // 충돌 시 콘솔에 로그 출력 (디버깅용)
      if (collision) {
        console.log("충돌 발생: HumanMesh가 다른 객체와 충돌했습니다.");
      } else {
        console.log("충돌 해제: HumanMesh의 충돌이 해제되었습니다.");
      }
    }
  }

  /**
   * 근접성 기반 색상 업데이트
   * @param humanPosition 사람의 위치
   * @param boxes BoxMesh 객체 배열
   */
  private updateProximityColors(
    humanPosition: THREE.Vector3,
    boxes: BoxMesh[]
  ): void {
    // 가장 가까운 박스와의 거리 (색상 변경용)
    let closestDistance = Infinity;
    let closestBox: BoxMesh | null = null;

    // 가장 가까운 박스 찾기
    for (const box of boxes) {
      const boxPosition = new THREE.Vector3();
      box.getWorldPosition(boxPosition);

      // 박스와 사람 사이의 거리 계산
      const distance = boxPosition.distanceTo(humanPosition);

      // 가장 가까운 박스 업데이트
      if (distance < closestDistance) {
        closestDistance = distance;
        closestBox = box;
      }
    }

    // 가장 가까운 박스가 있는 경우, 거리에 따른 색상 변경
    if (closestBox) {
      if (closestDistance < this.proximityThresholds.close) {
        // 가까운 거리 - 위험 색상
        closestBox.setColor(this.colorStages.danger);
      } else if (closestDistance < this.proximityThresholds.medium) {
        // 중간 거리 - 경고 색상
        closestBox.setColor(this.colorStages.warning);
      } else {
        // 먼 거리 - 기본 색상
        closestBox.setColor(this.colorStages.normal);
      }
    }
  }

  /**
   * 임계값 설정
   * @param far 먼 거리 임계값
   * @param medium 중간 거리 임계값
   * @param close 가까운 거리 임계값
   */
  setProximityThresholds(far: number, medium: number, close: number): void {
    this.proximityThresholds.far = far;
    this.proximityThresholds.medium = medium;
    this.proximityThresholds.close = close;
  }

  /**
   * 색상 단계 설정
   * @param normal 기본 색상
   * @param warning 경고 색상
   * @param danger 위험 색상
   */
  setColorStages(
    normal: THREE.ColorRepresentation,
    warning: THREE.ColorRepresentation,
    danger: THREE.ColorRepresentation
  ): void {
    this.colorStages.normal = normal;
    this.colorStages.warning = warning;
    this.colorStages.danger = danger;
  }
}
