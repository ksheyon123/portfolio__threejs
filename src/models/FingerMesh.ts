import * as THREE from "three";

/**
 * 손가락 형태의 mesh를 생성하는 클래스
 * XZ 평면 위 (0, ?, 0) 위치에 존재하는 손가락 형태의 메시를 생성합니다.
 * Three.js의 Bone 시스템을 사용하여 구현됩니다.
 */
export class FingerMesh extends THREE.Object3D {
  // 손가락 메시 관련 속성
  private fingerMesh: THREE.SkinnedMesh | null = null;
  private skeleton: THREE.Skeleton | null = null;
  private bones: THREE.Bone[] = [];

  // 손가락 설정
  private segmentCount: number = 3; // 손가락 마디 개수
  private segmentLength: number = 0.5; // 각 마디의 길이
  private segmentRadius: number = 0.15; // 각 마디의 반지름
  private fingerColor: THREE.ColorRepresentation = 0xffccaa; // 손가락 색상

  /**
   * FingerMesh 생성자
   * @param segmentCount 손가락 마디 개수 (기본값: 3)
   * @param segmentLength 각 마디의 길이 (기본값: 0.5)
   * @param segmentRadius 각 마디의 반지름 (기본값: 0.15)
   * @param color 손가락 색상 (기본값: 살색)
   */
  constructor(
    segmentCount: number = 3,
    segmentLength: number = 0.5,
    segmentRadius: number = 0.15,
    color: THREE.ColorRepresentation = 0xffccaa
  ) {
    super();

    // 설정 저장
    this.segmentCount = segmentCount;
    this.segmentLength = segmentLength;
    this.segmentRadius = segmentRadius;
    this.fingerColor = color;

    // 초기 위치 설정 (XZ 평면 위 (0, ?, 0))
    this.position.set(0, this.segmentRadius, 0);
  }

  /**
   * 손가락 메시 생성
   * Bone 시스템을 사용하여 구현될 예정입니다.
   */
  public createFingerMesh(): void {
    // 추후 구현 예정
    console.log("FingerMesh 생성 - 아직 구현되지 않음");
  }

  /**
   * 손가락 구부림 각도 설정
   * @param angle 구부림 각도 (라디안)
   */
  public setBendAngle(angle: number): void {
    // 추후 구현 예정
    console.log("손가락 구부림 각도 설정 - 아직 구현되지 않음");
  }

  /**
   * 애니메이션 업데이트 (매 프레임 호출)
   * @param time 경과 시간 (초)
   */
  public update(time: number): void {
    // 추후 구현 예정
    // console.log("FingerMesh 업데이트 - 아직 구현되지 않음");
  }

  /**
   * 메모리 해제
   */
  public dispose(): void {
    // 추후 구현 예정
    console.log("FingerMesh 메모리 해제 - 아직 구현되지 않음");
  }
}
