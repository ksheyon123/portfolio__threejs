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
  private segmentLength: number = 0.5; // 기본 마디 길이 (총 길이 계산용)
  private segmentLengths: number[] = []; // 각 마디별 길이 배열
  private segmentRadius: number = 0.15; // 각 마디의 반지름
  private fingerColor: THREE.ColorRepresentation = 0xffccaa; // 손가락 색상
  private totalLength: number = 0; // 손가락 전체 길이

  /**
   * FingerMesh 생성자
   * @param segmentCount 손가락 마디 개수 (기본값: 3)
   * @param segmentLength 각 마디의 기본 길이 (기본값: 0.5)
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

    // 실제 손가락 마디 비율에 따른 길이 설정
    this.initSegmentLengths();

    // 초기 위치 설정 (XZ 평면 위)
    this.position.set(0, 0, 0);
  }

  /**
   * 실제 손가락 마디 비율에 따른 길이 초기화
   * 근위지골(45%), 중위지골(35%), 원위지골(20%) 비율 적용
   */
  private initSegmentLengths(): void {
    // 기본 비율 설정 (3마디 기준)
    const defaultRatios = [0.45, 0.35, 0.2]; // 합이 1이 되도록 설정

    // 전체 길이 계산 (segmentLength * segmentCount)
    this.totalLength = this.segmentLength * this.segmentCount;

    // 마디 수에 따라 비율 조정
    this.segmentLengths = [];

    if (this.segmentCount === 3) {
      // 3마디일 경우 기본 비율 사용
      for (let i = 0; i < this.segmentCount; i++) {
        this.segmentLengths.push(this.totalLength * defaultRatios[i]);
      }
    } else {
      // 마디 수가 다를 경우 균등 분배 (필요시 다른 비율 적용 가능)
      const equalRatio = 1.0 / this.segmentCount;
      for (let i = 0; i < this.segmentCount; i++) {
        this.segmentLengths.push(this.totalLength * equalRatio);
      }
    }
  }

  /**
   * Bone 구조 생성
   * @returns 생성된 Bone 배열
   */
  private createBones(): THREE.Bone[] {
    const bones: THREE.Bone[] = [];

    // 손가락 기반(base) 뼈 생성
    const baseBone = new THREE.Bone();
    baseBone.position.set(0, 0, 0);
    bones.push(baseBone);

    // 각 마디에 해당하는 뼈 생성
    let prevBone = baseBone;
    for (let i = 0; i < this.segmentCount; i++) {
      const bone = new THREE.Bone();
      // 이전 뼈의 끝에 현재 뼈 위치시키기 (Y축 방향으로 뻗도록 설정)
      // 각 마디별 길이 적용
      bone.position.set(0, this.segmentLengths[i], 0);

      // 부모-자식 관계 설정
      prevBone.add(bone);
      bones.push(bone);

      // 다음 반복을 위해 현재 뼈를 이전 뼈로 설정
      prevBone = bone;
    }

    return bones;
  }

  /**
   * 손가락 지오메트리 생성 및 가중치 설정
   * @returns 가중치가 설정된 BufferGeometry
   */
  private createFingerGeometry(): THREE.BufferGeometry {
    // 손가락 형태의 지오메트리 생성 (원통형)
    const geometry = new THREE.CylinderGeometry(
      this.segmentRadius, // 상단 반지름
      this.segmentRadius, // 하단 반지름
      this.totalLength, // 높이 (전체 길이 사용)
      8, // 원통의 둘레 분할 수
      this.segmentCount * 4, // 높이 방향 분할 수
      false // 뚜껑 유무
    );

    // 손가락이 Y축 방향으로 뻗도록 함 (회전 필요 없음)

    // 정점 가중치 배열 생성
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    // 스키닝을 위한 가중치와 인덱스 배열
    const skinIndices: number[] = [];
    const skinWeights: number[] = [];

    // 각 마디의 시작 위치 계산 (누적 길이)
    const segmentStarts: number[] = [0];
    let accumulatedLength = 0;
    for (let i = 0; i < this.segmentCount - 1; i++) {
      accumulatedLength += this.segmentLengths[i];
      segmentStarts.push(accumulatedLength);
    }

    // 각 정점에 대한 가중치 계산
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);

      // 정점의 Y 위치에 따라 영향을 받는 Bone 결정
      // 0 ~ 1 사이로 정규화된 위치 계산
      const y = (vertex.y + this.totalLength / 2) / this.totalLength;

      // 정규화된 Y 위치를 실제 위치로 변환
      const actualY = y * this.totalLength;

      // 해당 위치가 어느 마디에 속하는지 결정
      let boneIndex = 0;
      for (let j = 1; j < this.segmentCount; j++) {
        if (actualY > segmentStarts[j]) {
          boneIndex = j;
        }
      }

      // 인접한 두 Bone의 영향도 계산
      const skinIndex = boneIndex;
      const skinWeight = 1.0;

      // 각 정점은 최대 4개의 Bone에 영향을 받을 수 있음
      // 여기서는 단순화를 위해 가장 가까운 Bone에만 100% 영향을 받도록 설정
      skinIndices.push(skinIndex, 0, 0, 0);
      skinWeights.push(skinWeight, 0, 0, 0);
    }

    // 가중치 정보를 지오메트리에 추가
    geometry.setAttribute(
      "skinIndex",
      new THREE.Uint16BufferAttribute(new Uint16Array(skinIndices), 4)
    );
    geometry.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(new Float32Array(skinWeights), 4)
    );

    return geometry;
  }

  /**
   * 손가락 메시 생성
   * Bone 시스템을 사용하여 구현합니다.
   */
  public createFingerMesh(): void {
    // Bone 구조 생성
    this.bones = this.createBones();

    // 지오메트리 생성 및 가중치 설정
    const geometry = this.createFingerGeometry();

    // 재질 생성
    const material = new THREE.MeshPhongMaterial({
      color: this.fingerColor,
      wireframe: false,
    });

    // 스키닝 활성화 (속성 직접 설정)
    (material as any).skinning = true;

    // Skeleton 생성
    this.skeleton = new THREE.Skeleton(this.bones);

    // SkinnedMesh 생성
    this.fingerMesh = new THREE.SkinnedMesh(geometry, material);
    this.fingerMesh.add(this.bones[0]); // 루트 Bone 추가
    this.fingerMesh.bind(this.skeleton); // Skeleton 바인딩

    // FingerMesh 객체에 SkinnedMesh 추가
    this.add(this.fingerMesh);
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
   * 두 번째 Bone을 90도 구부리는 테스트 메소드
   * 손가락의 두 번째 마디(중위지골)를 X축 기준으로 90도 회전시킵니다.
   */
  public bendSecondBone90Degrees(): void {
    // bones 배열이 비어있으면 아무 작업도 수행하지 않음
    if (this.bones.length < 3) {
      console.warn("손가락 뼈 구조가 아직 생성되지 않았습니다.");
      return;
    }

    // 두 번째 Bone (인덱스 2)을 가져옴
    // bones[0]은 base bone, bones[1]은 첫 번째 마디, bones[2]는 두 번째 마디
    const secondBone = this.bones[2];

    // X축을 기준으로 90도(π/2 라디안) 회전
    // 손가락이 Y축 방향으로 뻗어 있으므로 X축 회전이 손가락을 앞으로 구부리는 효과를 줌
    secondBone.rotation.x = -Math.PI / 2;

    // 변경 사항이 적용되었음을 콘솔에 출력
    console.log("두 번째 Bone이 90도 구부러졌습니다.");
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
