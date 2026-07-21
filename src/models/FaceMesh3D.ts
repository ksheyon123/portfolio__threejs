import * as THREE from "three";

/** 3D 공간의 정점. 2D와 달리 z를 온전히 쓴다. */
export interface Vertex3D {
  x: number;
  y: number;
  z: number;
}

/** 삼각형 면 = 정점 인덱스 3개. 저장 시 클릭 순서(winding)를 보존한다. */
export type Face = [number, number, number];

/**
 * 정점으로 면 만들기 학습용 메시 (3D 수동 면).
 *
 * 2D 데모(FaceMesh)는 position만 손으로 채우고 index는 들로네가 자동으로 정했다.
 * 3D에선 "어느 정점 3개가 한 면인가"가 자동으로 정해지지 않으므로, 사용자가
 * 정점 3개를 직접 골라 삼각형을 정의한다 — 즉 **position·index를 모두 손으로** 채운다.
 *
 * BufferGeometry의 세 버퍼:
 *   - position: 각 정점 (x, y, z) — z가 0이 아닌 정점도 그대로
 *   - index   : 면 목록을 평탄화 [a,b,c, …] (사용자가 addFace로 채움)
 *   - normal  : computeVertexNormals() — 면마다 방향이 다르므로 side: DoubleSide
 */
export class FaceMesh3D extends THREE.Mesh {
  // 정점 목록(원재료). 이 배열이 진실이고 geometry는 여기서 파생된다.
  private vertices: Vertex3D[];

  // 수동 면 목록. index 버퍼는 이 목록을 평탄화한 것.
  private faces: Face[] = [];

  constructor(
    initialVertices: Vertex3D[] = [],
    color: THREE.ColorRepresentation = 0x44aa88,
  ) {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide, // 사용자 winding이 뒤섞일 수 있어 양면
      transparent: true,
      opacity: 0.85,
    });
    super(geometry, material);

    // 방어적 복사 — 호출자 배열/객체와 내부 상태를 분리한다(FaceMesh 선례).
    this.vertices = initialVertices.map((v) => ({ x: v.x, y: v.y, z: v.z }));
    this.rebuild();
  }

  /** 현재 정점·면 목록으로 position·index·normal 버퍼를 다시 만든다. */
  private rebuild(): void {
    const n = this.vertices.length;

    // position: (x, y, z) 펼치기
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = this.vertices[i].x;
      positions[i * 3 + 1] = this.vertices[i].y;
      positions[i * 3 + 2] = this.vertices[i].z;
    }
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );

    // index: 면 목록 평탄화. 면이 없으면 index 제거(null).
    if (this.faces.length > 0) {
      const flat: number[] = [];
      for (const [a, b, c] of this.faces) flat.push(a, b, c);
      this.geometry.setIndex(flat);
    } else {
      this.geometry.setIndex(null);
    }

    // 법선 — 조명(MeshStandardMaterial) 대응. 인접 면 공유 정점은 평균됨(부드러운 셰이딩).
    this.geometry.computeVertexNormals();
    this.geometry.attributes.position.needsUpdate = true;
  }

  /** 무순서 3정점 조합의 정렬 키(중복 판정용). */
  private static faceKey(a: number, b: number, c: number): string {
    return [a, b, c].sort((x, y) => x - y).join("_");
  }

  /**
   * 정점 3개로 삼각형 면을 추가한다. 아래 중 하나면 무시(index 불변):
   *   ① 인덱스가 정수가 아니거나 범위 [0, vertexCount) 밖
   *   ② 세 인덱스 중 둘 이상이 같음(축퇴 삼각형)
   *   ③ 같은 무순서 3정점 조합의 면이 이미 있음(중복)
   * 검증은 통과하되 저장은 원래 순서(winding)를 보존한다 — 법선 방향이 클릭 순서를 따르도록.
   * (공선 삼각형(면적 0)은 렌더 시 사라지지만 오류가 아니므로 막지 않는다.)
   */
  addFace(a: number, b: number, c: number): void {
    const n = this.vertices.length;
    const valid = (i: number) => Number.isInteger(i) && i >= 0 && i < n;
    if (!valid(a) || !valid(b) || !valid(c)) return; // ①
    if (a === b || b === c || a === c) return; // ②

    const key = FaceMesh3D.faceKey(a, b, c);
    if (this.faces.some((f) => FaceMesh3D.faceKey(f[0], f[1], f[2]) === key))
      return; // ③

    this.faces.push([a, b, c]); // winding 보존
    this.rebuild();
  }

  /** k번째 면을 제거하고 index를 재계산한다. */
  removeFace(k: number): void {
    if (k < 0 || k >= this.faces.length) return;
    this.faces.splice(k, 1);
    this.rebuild();
  }

  /** 면 목록의 복사본을 반환(외부에서 내부 상태를 못 바꾸도록). */
  getFaces(): Face[] {
    return this.faces.map((f) => [f[0], f[1], f[2]] as Face);
  }

  /** 정점 목록의 복사본을 반환. */
  getVertices(): Vertex3D[] {
    return this.vertices.map((v) => ({ x: v.x, y: v.y, z: v.z }));
  }

  /** 현재 정점 수. */
  get vertexCount(): number {
    return this.vertices.length;
  }

  /**
   * 면 목록의 각 삼각형 3변을, 중복 제거한 무방향 정점 인덱스 쌍으로 반환한다.
   * 인접 면이 공유하는 변은 하나로 합쳐진다(예: 사면체 → 6개). 면이 없으면 빈 배열.
   * 페이지는 이 에지로 LineSegments를 그려 면 경계를 드러낸다.
   */
  getFaceEdges(): [number, number][] {
    const seen = new Set<string>();
    const edges: [number, number][] = [];
    const addEdge = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push([a, b]);
    };
    for (const [a, b, c] of this.faces) {
      addEdge(a, b);
      addEdge(b, c);
      addEdge(c, a);
    }
    return edges;
  }

  /** 정점을 목록 끝에 추가(면 목록은 유지 — 새 정점은 아직 어느 면에도 안 속함). */
  addVertex(x: number, y: number, z: number): void {
    this.vertices.push({ x, y, z });
    this.rebuild();
  }

  /**
   * i번째 정점 좌표를 옮긴다. 면 연결(index)은 그대로다 — 2D 들로네와 달리
   * 재삼각분할이 없으므로 정점 위치만 바뀌고 면 목록은 불변.
   */
  moveVertex(i: number, x: number, y: number, z: number): void {
    if (i < 0 || i >= this.vertices.length) return;
    this.vertices[i] = { x, y, z };
    this.rebuild();
  }

  /**
   * i번째 정점을 제거하고, 그 정점을 참조하는 모든 면을 삭제한 뒤,
   * 남은 면들의 인덱스 중 i보다 큰 것을 1씩 감소시켜(정점 배열 시프트 보정) 재빌드한다.
   * 이 재매핑을 빠뜨리면 잘못된 정점을 가리키는 면이 남는 게 이 기능의 핵심 난점.
   */
  removeVertex(i: number): void {
    if (i < 0 || i >= this.vertices.length) return;
    this.vertices.splice(i, 1);
    this.faces = this.faces
      .filter((f) => !f.includes(i)) // 정점 i를 쓰던 면 삭제
      .map(
        (f) =>
          f.map((idx) => (idx > i ? idx - 1 : idx)) as Face, // 시프트 보정
      );
    this.rebuild();
  }

  /** 정점·면을 모두 비운다. */
  reset(): void {
    this.vertices = [];
    this.faces = [];
    this.rebuild();
  }

  /** 메모리 해제. */
  dispose(): void {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
