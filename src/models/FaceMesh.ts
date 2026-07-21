import * as THREE from "three";
import { triangulate } from "@libs/delaunay";

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
 *   - index   : 들로네 삼각분할(@libs/delaunay) — 겹침·구멍 없이 볼록 껍질 영역을 채움
 *   - normal  : computeVertexNormals()로 계산 (삼각형이 CCW라 +z)
 *
 * 완성된 지오메트리(BoxGeometry 등)를 쓰는 다른 데모와 달리, 여기선 그 지오메트리의
 * 바닥에 있는 정점·인덱스 버퍼 자체를 구성하는 것이 핵심이다.
 *
 * 들로네라 점을 어디에·어떤 순서로 주든 면이 겹치지 않는다(내부 점은 삼각형을 쪼갠다).
 * 다만 볼록 껍질 영역만 채우므로 오목 경계는 표현 못 한다(향후 constrained triangulation).
 */
export class FaceMesh extends THREE.Mesh {
  // 정점 목록(원재료). 이 배열이 곧 진실이고, geometry는 여기서 파생된다.
  private vertices: Vertex2D[];

  // 마지막 삼각분할 결과(flat 인덱스 [a,b,c,…]). rebuild()에서 갱신, 에지 계산에 재사용.
  private triangles: number[] = [];

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
   * 들로네는 정점 위치가 바뀌어도 연결이 달라질 수 있어, 위치 편집(move) 뒤에도 호출한다.
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

    // index: 들로네 삼각분할. 점 3개 미만/공선이면 면이 없어 빈 결과 → index 제거.
    this.triangles = triangulate(this.vertices);
    this.geometry.setIndex(
      this.triangles.length > 0 ? this.triangles : null,
    );

    // 법선 — 조명(MeshStandardMaterial) 대응. 삼각형이 CCW라 +z.
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
   * 현재 삼각분할의 각 삼각형 3변을, 중복 제거한 무방향 정점 인덱스 쌍으로 반환한다.
   * 페이지가 이 에지로 LineSegments를 그려 외곽선뿐 아니라 내부 변까지 보이게 한다.
   * (평면 다각형은 모든 삼각형이 코플래너라 EdgesGeometry로는 내부 변이 사라진다.)
   * 삼각형이 없으면(점 3개 미만/공선) 빈 배열.
   */
  getTriangleEdges(): [number, number][] {
    const seen = new Set<string>();
    const edges: [number, number][] = [];
    const addEdge = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push([a, b]);
    };

    // 삼각분할 결과의 각 삼각형 세 변(공유 변은 중복 제거됨).
    for (let i = 0; i < this.triangles.length; i += 3) {
      const a = this.triangles[i];
      const b = this.triangles[i + 1];
      const c = this.triangles[i + 2];
      addEdge(a, b);
      addEdge(b, c);
      addEdge(c, a);
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
   * 들로네는 위치가 바뀌면 삼각분할 연결도 달라질 수 있으므로 전체 재빌드한다
   * (팬 때처럼 index를 그대로 두면 드래그 중 면이 겹칠 수 있다).
   */
  moveVertex(i: number, x: number, y: number): void {
    if (i < 0 || i >= this.vertices.length) return;
    this.vertices[i].x = x;
    this.vertices[i].y = y;
    this.rebuild();
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
