import * as THREE from "three";

/**
 * 스켈레탈 리깅 학습용 메시.
 *
 * 세로로 긴 박스 하나를 두 개의 뼈(Bone)에 스키닝 웨이트로 바인딩한 SkinnedMesh다.
 * 관절(자식 뼈)을 굽히면 위쪽 정점이 웨이트에 비례해 따라 움직여 메시가 "부드럽게" 휜다.
 * (HumanMesh의 피벗 계층 방식은 자식 전체가 통째로 꺾이지만, 여기선 정점별 웨이트로
 *  관절 주변이 연속적으로 변형되는 것이 핵심 차이다.)
 *
 * 좌표 배치:
 *   - 정점 y ∈ [-h/2, +h/2]
 *   - bone0(루트): 메시 바닥 y=-h/2
 *   - bone1(자식): bone0 로컬 기준 +boneLength → 월드 y=0 (메시 중앙이 관절점)
 *   - 웨이트: t = (y + h/2) / h  →  bone0 = 1-t, bone1 = t  (선형 블렌딩)
 */
export class RiggedBoxMesh extends THREE.SkinnedMesh {
  private bones: THREE.Bone[];
  private boneLength: number;

  /**
   * @param width 박스 너비 (기본 1)
   * @param height 박스 높이 — 이 축을 따라 휜다 (기본 4)
   * @param depth 박스 깊이 (기본 1)
   * @param heightSegments 높이 방향 분할 수. 적으면 관절이 각지게 꺾이므로 충분히 준다 (기본 8)
   * @param color 재질 색상 (기본 청록)
   */
  constructor(
    width: number = 1,
    height: number = 4,
    depth: number = 1,
    heightSegments: number = 8,
    color: THREE.ColorRepresentation = 0x44aa88,
  ) {
    // super() 호출 전에는 this를 쓸 수 없으므로, 스키닝 지오메트리를 정적 메서드로 먼저 만든다.
    const geometry = RiggedBoxMesh.buildSkinnedGeometry(
      width,
      height,
      depth,
      heightSegments,
    );
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.1,
    });

    super(geometry, material);

    // 뼈 길이 = 메시 높이의 절반 (관절이 메시 중앙에 오도록)
    this.boneLength = height / 2;
    this.bones = RiggedBoxMesh.buildBones(this.boneLength);

    // 루트 뼈를 메시에 추가해야 뼈대가 씬 그래프에 들어가 변형이 적용된다.
    this.add(this.bones[0]);

    // skeleton 생성 및 바인딩 (geometry의 skinIndex/skinWeight ↔ 뼈 연결)
    const skeleton = new THREE.Skeleton(this.bones);
    this.bind(skeleton);
  }

  /**
   * 스키닝 웨이트가 부여된 박스 지오메트리를 만든다.
   * 각 정점의 y를 0~1로 정규화해 두 뼈에 선형 블렌딩한다.
   */
  private static buildSkinnedGeometry(
    width: number,
    height: number,
    depth: number,
    heightSegments: number,
  ): THREE.BoxGeometry {
    // 높이 방향(두 번째 세그먼트 인자)만 세분화 — 그 축을 따라 휘기 때문.
    const geometry = new THREE.BoxGeometry(
      width,
      height,
      depth,
      1,
      heightSegments,
      1,
    );

    const position = geometry.attributes.position;
    const half = height / 2;
    const skinIndices: number[] = [];
    const skinWeights: number[] = [];

    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      // t: 바닥(0) → 꼭대기(1)
      const t = (y + half) / height;
      // 정점당 최대 4개 뼈를 참조할 수 있으나, 여기선 bone0·bone1 둘만 쓰고 나머지는 0.
      skinIndices.push(0, 1, 0, 0);
      skinWeights.push(1 - t, t, 0, 0);
    }

    geometry.setAttribute(
      "skinIndex",
      new THREE.Uint16BufferAttribute(skinIndices, 4),
    );
    geometry.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(skinWeights, 4),
    );

    return geometry;
  }

  /**
   * 부모-자식으로 연결된 두 뼈를 만든다.
   * @param boneLength 뼈 길이 (메시 높이의 절반)
   */
  private static buildBones(boneLength: number): THREE.Bone[] {
    // 루트 뼈: 메시 바닥에 위치
    const bone0 = new THREE.Bone();
    bone0.position.y = -boneLength;

    // 자식 뼈(관절): 부모 로컬 기준 +boneLength → 월드에서 메시 중앙(y=0)
    const bone1 = new THREE.Bone();
    bone1.position.y = boneLength;
    bone0.add(bone1);

    return [bone0, bone1];
  }

  /**
   * 관절(자식 뼈)을 z축으로 굽힌다.
   * @param angleRad 굽힘 각도 (라디안)
   */
  setBend(angleRad: number): void {
    this.bones[1].rotation.z = angleRad;
  }

  /** 뼈 배열 반환 (SkeletonHelper·테스트용) */
  getBones(): THREE.Bone[] {
    return this.bones;
  }

  /** 뼈 길이 반환 */
  getBoneLength(): number {
    return this.boneLength;
  }

  /** 메모리 해제 */
  dispose(): void {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
