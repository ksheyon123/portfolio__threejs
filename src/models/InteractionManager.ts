import * as THREE from "three";
import { BoxMesh } from "./BoxMesh";
import { HumanMesh } from "./HumanMesh";
import { SphereMesh } from "./SphereMesh";
import { TreasureChestMesh } from "./TreasureChestMesh";

/**
 * 객체 간 상호작용을 관리하는 클래스
 * 거리 기반 상호작용 및 충돌 감지 처리
 */
export class InteractionManager {
  // 근접 단계별 거리 임계값
  private proximityThresholds = {
    far: 15, // 먼 거리
    medium: 10, // 중간 거리
    close: 5, // 가까운 거리
  };

  // 색상 변화 단계
  private colorStages: {
    normal: THREE.ColorRepresentation;
    warning: THREE.ColorRepresentation;
    danger: THREE.ColorRepresentation;
  } = {
    normal: 0xff5533, // 기본 색상
    warning: 0xffaa33, // 경고 색상 (중간 거리)
    danger: 0xff3333, // 위험 색상 (가까운 거리)
  };

  // 충돌 상태
  private isColliding = false;

  /**
   * 거리 계산 및 상호작용 처리
   * @param box BoxMesh 객체
   * @param human HumanMesh 객체
   * @param sphere SphereMesh 객체
   */
  /**
   * 거리 계산 및 상호작용 처리
   * @param boxes BoxMesh 객체 또는 BoxMesh 객체 배열
   * @param human HumanMesh 객체
   * @param sphere SphereMesh 객체
   * @param treasureChests TreasureChestMesh 객체 배열 (선택적)
   */
  update(
    boxes: BoxMesh | BoxMesh[],
    human: HumanMesh,
    sphere: SphereMesh,
    treasureChests?: TreasureChestMesh[]
  ): void {
    // 박스 배열 생성 (단일 박스인 경우 배열로 변환)
    const boxArray = Array.isArray(boxes) ? boxes : [boxes];

    // 사람 위치 계산
    const humanPosition = new THREE.Vector3();
    human.getWorldPosition(humanPosition);

    // 사람의 바운딩 박스 계산
    const humanBounds = new THREE.Box3().setFromObject(human);

    // 충돌 감지 변수
    let collision = false;

    // 가장 가까운 박스와의 거리 (색상 변경용)
    let closestDistance = Infinity;
    let closestBox: BoxMesh | null = null;

    // BoxMesh와의 충돌 감지
    for (const box of boxArray) {
      // 박스 위치 계산
      const boxPosition = new THREE.Vector3();
      box.getWorldPosition(boxPosition);

      // 박스와 사람 사이의 거리 계산
      const distance = boxPosition.distanceTo(humanPosition);

      // 가장 가까운 박스 업데이트
      if (distance < closestDistance) {
        closestDistance = distance;
        closestBox = box;
      }

      // 충돌 감지
      const boxBounds = new THREE.Box3().setFromObject(box);
      if (boxBounds.intersectsBox(humanBounds)) {
        collision = true;
        break;
      }
    }

    // TreasureChestMesh와의 충돌 감지 (제공된 경우)
    if (treasureChests && treasureChests.length > 0 && !collision) {
      for (const treasureChest of treasureChests) {
        const treasureChestBounds = new THREE.Box3().setFromObject(
          treasureChest
        );
        if (treasureChestBounds.intersectsBox(humanBounds)) {
          collision = true;
          break;
        }
      }
    }

    // 충돌 상태 업데이트 및 구의 회전 제한
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
