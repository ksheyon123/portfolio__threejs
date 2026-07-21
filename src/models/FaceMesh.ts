import * as THREE from "three";

/** 평면 위 2D 정점. z는 항상 0으로 취급한다. */
export interface Vertex2D {
  x: number;
  y: number;
}

/**
 * 정점으로 면 만들기 학습용 메시 (2D 전용).
 *
 * `z=0` 평면 위 임의의 2D 정점 목록을 받아, `BufferGeometry`의 아래 세 버퍼를 손으로 채운다:
 *   - position: 각 정점 (x, y, 0)
 *   - index   : 팬(fan) 삼각분할 — 정점 0을 축으로 [0, i, i+1] (i = 1 … N-2)
 *   - normal  : computeVertexNormals()로 계산 (CCW 볼록 다각형이면 +z)
 *
 * 완성된 지오메트리(BoxGeometry 등)를 쓰는 다른 데모와 달리, 여기선 그 지오메트리의
 * 바닥에 있는 정점·인덱스 버퍼 자체를 구성하는 것이 핵심이다.
 *
 * 팬 삼각분할은 **볼록 다각형 전제**다. 오목 좌표를 주면 삼각형이 다각형 밖으로
 * 삐져나온다(오목 지원은 ear-clipping 필요 — 향후 리비전).
 */
export class FaceMesh extends THREE.Mesh {
  // 정점 목록(원재료). 이 배열이 곧 진실이고, geometry는 여기서 파생된다.
  private vertices: Vertex2D[];

  constructor(
    initialVertices: Vertex2D[] = [],
    color: THREE.ColorRepresentation = 0x44aa88,
  ) {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide, // 정점 순서가 뒤집혀도 계속 보이도록
      transparent: true,
      opacity: 0.85,
    });
    super(geometry, material);

    // 방어적 복사 — 호출자가 넘긴 배열/객체와 내부 상태를 분리한다.
    this.vertices = initialVertices.map((v) => ({ x: v.x, y: v.y }));
    this.rebuild();
  }

  /**
   * 현재 정점 목록으로 position·index·normal 버퍼를 다시 만든다.
   * 정점 수가 바뀌는 편집(add/remove/reset) 뒤엔 반드시 호출한다.
   */
  private rebuild(): void {
    const n = this.vertices.length;

    // position: (x, y, 0) 펼치기
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = this.vertices[i].x;
      positions[i * 3 + 1] = this.vertices[i].y;
      positions[i * 3 + 2] = 0;
    }
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );

    // index: 팬 삼각분할. 정점 3개 미만이면 면이 성립하지 않으므로 index 제거.
    if (n >= 3) {
      const indices: number[] = [];
      for (let i = 1; i <= n - 2; i++) {
        indices.push(0, i, i + 1);
      }
      this.geometry.setIndex(indices);
    } else {
      this.geometry.setIndex(null);
    }

    // 법선 — 조명(MeshStandardMaterial) 대응. 평면이므로 CCW면 +z.
    this.geometry.computeVertexNormals();
    this.geometry.attributes.position.needsUpdate = true;
  }

  /** 정점 목록의 복사본을 반환 (외부에서 내부 상태를 못 바꾸도록). */
  getVertices(): Vertex2D[] {
    return this.vertices.map((v) => ({ x: v.x, y: v.y }));
  }

  /** 현재 정점 수. */
  get vertexCount(): number {
    return this.vertices.length;
  }

  /**
   * 팬 삼각분할의 각 삼각형 3변을, 중복 제거한 무방향 정점 인덱스 쌍으로 반환한다.
   * 페이지가 이 에지로 LineSegments를 그려 내부 대각선까지 보이게 한다.
   * (평면 다각형은 모든 삼각형이 코플래너라 EdgesGeometry로는 내부 변이 사라진다.)
   * 정점 3개 미만이면 면이 없으므로 빈 배열. 외곽 N변 + 내부 대각선 N-3 = 2N-3개.
   */
  getTriangleEdges(): [number, number][] {
    const n = this.vertices.length;
    if (n < 3) return [];

    const seen = new Set<string>();
    const edges: [number, number][] = [];
    const addEdge = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push([a, b]);
    };

    // 팬 삼각형 [0, i, i+1]의 세 변을 모은다(공유 변은 중복 제거됨).
    for (let i = 1; i <= n - 2; i++) {
      addEdge(0, i);
      addEdge(i, i + 1);
      addEdge(i + 1, 0);
    }
    return edges;
  }

  /** 정점을 목록 끝에 추가하고 면을 다시 만든다. */
  addVertex(x: number, y: number): void {
    this.vertices.push({ x, y });
    this.rebuild();
  }

  /**
   * i번째 정점 좌표를 옮긴다.
   * 정점 수가 그대로라 index는 유지되지만, 형상이 바뀌었으므로 법선은 다시 계산한다.
   */
  moveVertex(i: number, x: number, y: number): void {
    if (i < 0 || i >= this.vertices.length) return;
    this.vertices[i].x = x;
    this.vertices[i].y = y;

    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    pos.setXYZ(i, x, y, 0);
    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  /** i번째 정점을 제거하고 면을 다시 만든다. */
  removeVertex(i: number): void {
    if (i < 0 || i >= this.vertices.length) return;
    this.vertices.splice(i, 1);
    this.rebuild();
  }

  /** 모든 정점을 비운다. */
  reset(): void {
    this.vertices = [];
    this.rebuild();
  }

  /** 메모리 해제. */
  dispose(): void {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
