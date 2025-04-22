import * as THREE from "three";
import { HumanMesh } from "./HumanMesh";

/**
 * 보물 상자 형태의 mesh를 생성하는 클래스
 * 하단 박스와 상단 박스(뚜껑)로 구성되며, 사용자와 상호작용 시 뚜껑이 열림
 */
export class TreasureChestMesh extends THREE.Object3D {
  // 상자의 크기
  private width: number;
  private depth: number;
  private height: number;

  // 하단 박스와 상단 박스(뚜껑)
  private bottomBox: THREE.Mesh;
  private topBox: THREE.Mesh;

  // 상단 박스(뚜껑)의 피벗 포인트
  private topBoxPivot: THREE.Object3D;

  // 상자가 열려있는지 여부
  private isOpen: boolean = false;

  // 애니메이션 관련 변수
  private animationStartTime: number = 0;
  private animationDuration: number = 0.3; // 0.3초 동안 애니메이션 진행 (더 빠르게)

  /**
   * TreasureChestMesh 생성자
   * @param width 상자의 너비 (기본값: 10)
   * @param depth 상자의 깊이 (기본값: 10)
   * @param height 상자의 높이 (기본값: 5)
   * @param color 상자의 색상 (기본값: 0x8B4513 - 갈색)
   */
  constructor(
    width: number = 10,
    depth: number = 10,
    height: number = 5,
    color: THREE.ColorRepresentation = 0x8b4513
  ) {
    super();

    this.width = width;
    this.depth = depth;
    this.height = height;

    // 재질 생성
    const material = new THREE.MeshPhongMaterial({
      color: color,
      wireframe: false,
    });

    // 하단 박스 생성
    const bottomBoxGeometry = new THREE.BoxGeometry(width, height, depth);
    this.bottomBox = new THREE.Mesh(bottomBoxGeometry, material);
    this.add(this.bottomBox);

    // 상단 박스(뚜껑)의 피벗 포인트 생성
    // 피벗 포인트는 상자의 뒷부분 상단에 위치
    this.topBoxPivot = new THREE.Object3D();
    this.topBoxPivot.position.set(0, height / 2, depth / 2 - 0.1); // 약간 안쪽으로 이동하여 겹침 방지
    this.add(this.topBoxPivot);

    // 상단 박스(뚜껑) 생성
    const topBoxGeometry = new THREE.BoxGeometry(width, height, depth);
    this.topBox = new THREE.Mesh(topBoxGeometry, material);
    // 피벗 기준으로 위치 조정 (피벗이 뚜껑의 뒷부분 하단에 오도록)
    this.topBox.position.set(0, height / 2, -depth / 2 + 0.1);
    this.topBoxPivot.add(this.topBox);
  }

  /**
   * 상자 열기 (애니메이션 없이 즉시 열기)
   */
  open(): void {
    if (!this.isOpen) {
      this.topBoxPivot.rotation.x = -Math.PI / 2; // X축에 대해 -90도 회전
      this.isOpen = true;
    }
  }

  /**
   * 상자 닫기 (애니메이션 없이 즉시 닫기)
   */
  close(): void {
    if (this.isOpen) {
      this.topBoxPivot.rotation.x = 0; // 회전 초기화
      this.isOpen = false;
    }
  }

  /**
   * 상자 열기 애니메이션 시작
   * @param time 현재 시간
   */
  startOpenAnimation(time: number): void {
    if (!this.isOpen) {
      this.animationStartTime = time;
      this.isOpen = true; // 애니메이션 시작 시 상태 변경
    }
  }

  /**
   * 상자 닫기 애니메이션 시작
   * @param time 현재 시간
   */
  startCloseAnimation(time: number): void {
    if (this.isOpen) {
      this.animationStartTime = time;
      this.isOpen = false; // 애니메이션 시작 시 상태 변경
    }
  }

  /**
   * 애니메이션 업데이트
   * @param time 현재 시간
   */
  updateAnimation(time: number): void {
    // 애니메이션 시작 시간이 설정되어 있는 경우에만 애니메이션 진행
    if (this.animationStartTime > 0) {
      // 애니메이션 진행 시간 계산
      const elapsedTime = Math.min(
        time - this.animationStartTime,
        this.animationDuration
      );

      // 애니메이션 진행률 (0~1)
      const progress = elapsedTime / this.animationDuration;

      if (this.isOpen) {
        // 열기 애니메이션
        this.topBoxPivot.rotation.x = (-Math.PI / 2) * progress;
      } else {
        // 닫기 애니메이션
        this.topBoxPivot.rotation.x = (-Math.PI / 2) * (1 - progress);
      }

      // 애니메이션 완료 시 시작 시간 초기화
      if (progress >= 1) {
        this.animationStartTime = 0;
      }
    }
  }

  /**
   * HumanMesh의 오른팔과의 충돌 감지
   * @param human HumanMesh 객체
   * @returns 충돌 여부
   */
  checkRightArmCollision(human: HumanMesh): boolean {
    // HumanMesh 클래스에서 rightArmPivot은 Object3D이고, 그 자식으로 rightArm이 있음
    // 직접 내부 구조에 접근하여 오른팔 메시 가져오기
    let rightArm: THREE.Object3D | null = null;

    // 모든 자식 객체 탐색
    human.traverse((child) => {
      // rightArmPivot 찾기
      if (
        child.name === "rightArmPivot" ||
        (child instanceof THREE.Object3D &&
          child.position.x > 0 && // 오른쪽에 위치
          Math.abs(child.position.y - 0.6) < 0.1)
      ) {
        // y 위치가 약 0.6

        // rightArmPivot의 자식들 중 rightArm 찾기
        if (child.children.length > 0) {
          // 첫 번째 자식이 rightArm
          rightArm = child.children[0];
        }
      }
    });

    if (!rightArm) {
      return false;
    }

    // 오른팔의 바운딩 박스 계산
    // rightArm은 이미 THREE.Object3D 타입으로 확인됨
    const rightArmBounds = new THREE.Box3().setFromObject(rightArm);

    // 상자의 바운딩 박스 계산
    const chestBounds = new THREE.Box3().setFromObject(this);

    // 충돌 감지
    return rightArmBounds.intersectsBox(chestBounds);
  }

  /**
   * 상호작용 업데이트
   * @param human HumanMesh 객체
   * @param time 현재 시간
   */
  updateInteraction(human: HumanMesh, time: number): void {
    // 오른팔과의 충돌 감지
    const collision = this.checkRightArmCollision(human);

    // 충돌 시 상자 열기 (한 번 열리면 계속 열린 상태 유지)
    if (collision && !this.isOpen) {
      this.startOpenAnimation(time);
      console.log("보물 상자가 열렸습니다!");
    }

    // 애니메이션 업데이트
    this.updateAnimation(time);
  }

  /**
   * 상자 크기 설정
   * @param width 너비
   * @param depth 깊이
   * @param height 높이
   */
  setSize(width: number, depth: number, height: number): void {
    this.width = width;
    this.depth = depth;
    this.height = height;

    // 기존 지오메트리 해제
    (this.bottomBox.geometry as THREE.BufferGeometry).dispose();
    (this.topBox.geometry as THREE.BufferGeometry).dispose();

    // 새 지오메트리 생성 및 적용
    const bottomBoxGeometry = new THREE.BoxGeometry(width, height, depth);
    const topBoxGeometry = new THREE.BoxGeometry(width, height, depth);

    this.bottomBox.geometry = bottomBoxGeometry;
    this.topBox.geometry = topBoxGeometry;

    // 피벗 포인트 위치 조정
    this.topBoxPivot.position.set(0, height / 2, depth / 2 - 0.1);
    this.topBox.position.set(0, height / 2, -depth / 2 + 0.1);
  }

  /**
   * 상자 색상 설정
   * @param color 새 색상
   */
  setColor(color: THREE.ColorRepresentation): void {
    (this.bottomBox.material as THREE.MeshPhongMaterial).color =
      new THREE.Color(color);
    (this.topBox.material as THREE.MeshPhongMaterial).color = new THREE.Color(
      color
    );
  }

  /**
   * 메모리 해제
   */
  dispose(): void {
    // 지오메트리와 재질 해제
    (this.bottomBox.geometry as THREE.BufferGeometry).dispose();
    (this.topBox.geometry as THREE.BufferGeometry).dispose();
    (this.bottomBox.material as THREE.Material).dispose();
    (this.topBox.material as THREE.Material).dispose();
  }
}
