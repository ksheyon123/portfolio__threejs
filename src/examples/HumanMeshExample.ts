import * as THREE from "three";
import { HumanMesh } from "../models/HumanMesh";

/**
 * HumanMesh 클래스 사용 예제
 * 이 예제는 HumanMesh 객체를 생성하고 씬에 추가하는 방법을 보여줍니다.
 */
export class HumanMeshExample {
  private scene: THREE.Scene;
  private human: HumanMesh;
  private clock: THREE.Clock;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.clock = new THREE.Clock();

    // 사람 메시 생성 (파란색)
    this.human = new HumanMesh(0x3366ff);

    // 씬에 추가
    this.scene.add(this.human);

    // 위치 조정
    this.human.position.set(0, 0, 0);
  }

  /**
   * 애니메이션 업데이트
   * 이 메서드는 렌더링 루프에서 호출되어야 합니다.
   */
  update(): void {
    const time = this.clock.getElapsedTime();

    // 걷는 애니메이션 적용
    this.human.walk(time * 3);

    // 전체 회전 (선택 사항)
    // this.human.rotation.y = time * 0.5;
  }

  /**
   * 팔과 다리를 개별적으로 움직이는 예제
   * @param leftArmX 왼쪽 팔 X축 회전 (라디안)
   * @param rightArmX 오른쪽 팔 X축 회전 (라디안)
   * @param leftLegX 왼쪽 다리 X축 회전 (라디안)
   * @param rightLegX 오른쪽 다리 X축 회전 (라디안)
   */
  moveIndividualLimbs(
    leftArmX: number,
    rightArmX: number,
    leftLegX: number,
    rightLegX: number
  ): void {
    // 걷는 애니메이션 대신 개별 제어
    this.human.rotateLeftArm(leftArmX, 0, 0);
    this.human.rotateRightArm(rightArmX, 0, 0);
    this.human.rotateLeftLeg(leftLegX, 0, 0);
    this.human.rotateRightLeg(rightLegX, 0, 0);
  }

  /**
   * 포즈 예제 - 양팔 들기
   */
  poseRaiseArms(): void {
    this.human.rotateLeftArm(-Math.PI / 2, 0, 0); // 왼팔 위로
    this.human.rotateRightArm(-Math.PI / 2, 0, 0); // 오른팔 위로
    this.human.rotateLeftLeg(0, 0, 0); // 다리 기본 위치
    this.human.rotateRightLeg(0, 0, 0); // 다리 기본 위치
  }

  /**
   * 포즈 예제 - 달리기 자세
   */
  poseRunning(): void {
    this.human.rotateLeftArm(-Math.PI / 4, 0, 0); // 왼팔 앞으로
    this.human.rotateRightArm(Math.PI / 4, 0, 0); // 오른팔 뒤로
    this.human.rotateLeftLeg(Math.PI / 4, 0, 0); // 왼다리 앞으로
    this.human.rotateRightLeg(-Math.PI / 4, 0, 0); // 오른다리 뒤로
  }

  /**
   * 포즈 초기화
   */
  resetPose(): void {
    this.human.resetRotations();
  }

  /**
   * 메모리 해제
   */
  dispose(): void {
    this.human.dispose();
    this.scene.remove(this.human);
  }
}
