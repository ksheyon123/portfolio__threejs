import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FaceMesh3D } from "@models/FaceMesh3D";
import { placeOnWorkPlane, WorkPlaneKey } from "@models/workPlane";

type Mode = "vertex" | "face";

const PLANE_LABEL: Record<WorkPlaneKey, string> = {
  ground: "바닥 (y=0)",
  front: "앞 (z=0)",
  side: "옆 (x=0)",
};

/**
 * 정점으로 면 만들기 학습 페이지 (3D 수동 면).
 *
 * 2D 데모(/vertex-face)는 평면 위 점만 찍으면 들로네가 면을 자동 연결했지만,
 * 3D에선 어느 3개가 한 면인가가 자동으로 정해지지 않는다 — 그래서 사용자가
 * 정점 3개를 직접 골라 삼각형 면을 정의한다(index 버퍼를 손으로 채움).
 *
 *   - PerspectiveCamera + OrbitControls로 궤도 회전·확대(진짜 3D 관찰)
 *   - 작업 평면 토글(바닥/앞/옆) — 활성 평면 위에만 정점을 찍어 깊이를 고정
 *   - '정점 추가' 모드: 빈 곳 클릭 → placeOnWorkPlane로 좌표 → addVertex
 *   - '면 만들기' 모드: 정점 마커 3번 순차 클릭 → addFace로 삼각형 생성
 *   - reset, 정점·면 수·현재 모드·활성 평면 표시
 */
const VertexFace3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  // useEffect 내부 상태를 버튼/키가 부르기 위한 브리지들
  const resetRef = useRef<(() => void) | null>(null);
  const modeRef = useRef<Mode>("vertex");
  const planeRef = useRef<WorkPlaneKey>("ground");

  const [mode, setMode] = useState<Mode>("vertex");
  const [plane, setPlane] = useState<WorkPlaneKey>("ground");
  const [vertexCount, setVertexCount] = useState(0);
  const [faceCount, setFaceCount] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  // 선택 상태를 리스너에서 읽기 위한 ref 미러
  const selectedRef = useRef<number[]>([]);

  // 모드/평면 토글 — state와 ref를 함께 갱신(리스너는 ref로 최신값을 읽는다)
  const changeMode = (m: Mode) => {
    modeRef.current = m;
    setMode(m);
    selectedRef.current = [];
    setSelected([]);
  };
  const changePlane = (p: WorkPlaneKey) => {
    planeRef.current = p;
    setPlane(p);
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 씬 / 렌더러
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14141f);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // 원근 카메라 — 궤도로 3D를 관찰(2D의 top-down 정투영과 대비)
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(6, 6, 8);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    // 조명 — 면마다 법선 방향이 달라 사방에서 비춘다.
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(5, 8, 6);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // 활성 작업 평면 표시용 그리드(3개 만들어 두고 활성만 보이게)
    const makeGrid = (key: WorkPlaneKey) => {
      const g = new THREE.GridHelper(10, 10, 0x5566aa, 0x2a2a3a);
      // GridHelper는 기본 xz평면(법선 +y = ground). front/side는 회전.
      if (key === "front") g.rotation.x = Math.PI / 2; // xy평면(z=0)
      if (key === "side") g.rotation.z = Math.PI / 2; // yz평면(x=0)
      return g;
    };
    const grids: Record<WorkPlaneKey, THREE.GridHelper> = {
      ground: makeGrid("ground"),
      front: makeGrid("front"),
      side: makeGrid("side"),
    };
    (Object.values(grids) as THREE.GridHelper[]).forEach((g) => scene.add(g));
    const syncGrid = () => {
      (Object.keys(grids) as WorkPlaneKey[]).forEach((k) => {
        grids[k].visible = k === planeRef.current;
      });
    };

    // 면 메시(원재료: 정점·면 목록)
    const face = new FaceMesh3D([]);
    scene.add(face);

    // 면 에지(LineSegments) — 각 삼각형의 세 변
    const edgeGeom = new THREE.BufferGeometry();
    const edgeLines = new THREE.LineSegments(
      edgeGeom,
      new THREE.LineBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 }),
    );
    scene.add(edgeLines);

    // 정점 마커(Points) — 일반 정점
    const pointGeom = new THREE.BufferGeometry();
    const points = new THREE.Points(
      pointGeom,
      new THREE.PointsMaterial({ color: 0xffdd44, size: 12, sizeAttenuation: false }),
    );
    scene.add(points);

    // 선택된 정점 하이라이트(Points) — '면 만들기' 진행 중 표시
    const selGeom = new THREE.BufferGeometry();
    const selPoints = new THREE.Points(
      selGeom,
      new THREE.PointsMaterial({ color: 0xff5588, size: 18, sizeAttenuation: false }),
    );
    scene.add(selPoints);

    // 정점·면 목록 → 헬퍼 지오메트리 동기화
    const syncHelpers = () => {
      const verts = face.getVertices();
      const arr = new Float32Array(verts.length * 3);
      verts.forEach((v, i) => {
        arr[i * 3] = v.x;
        arr[i * 3 + 1] = v.y;
        arr[i * 3 + 2] = v.z;
      });
      pointGeom.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
      pointGeom.computeBoundingSphere();

      // 선택 하이라이트
      const sel = selectedRef.current;
      const selArr = new Float32Array(sel.length * 3);
      sel.forEach((idx, k) => {
        const v = verts[idx];
        if (!v) return;
        selArr[k * 3] = v.x;
        selArr[k * 3 + 1] = v.y;
        selArr[k * 3 + 2] = v.z;
      });
      selGeom.setAttribute("position", new THREE.Float32BufferAttribute(selArr, 3));
      selGeom.computeBoundingSphere();

      // 면 에지
      const edges = face.getFaceEdges();
      const edgeArr = new Float32Array(edges.length * 2 * 3);
      edges.forEach(([a, b], k) => {
        const base = k * 6;
        edgeArr[base] = verts[a].x;
        edgeArr[base + 1] = verts[a].y;
        edgeArr[base + 2] = verts[a].z;
        edgeArr[base + 3] = verts[b].x;
        edgeArr[base + 4] = verts[b].y;
        edgeArr[base + 5] = verts[b].z;
      });
      edgeGeom.setAttribute("position", new THREE.Float32BufferAttribute(edgeArr, 3));
      edgeGeom.computeBoundingSphere();

      setVertexCount(verts.length);
      setFaceCount(face.getFaces().length);
    };
    syncGrid();
    syncHelpers();

    // ── 픽 유틸 ─────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    // Points 픽 임계값(화면 픽셀 기준) — sizeAttenuation:false라 화면 고정 크기.
    raycaster.params.Points = { threshold: 0.4 };
    const ndc = new THREE.Vector2();

    const setNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
    };

    // 클릭 지점 근처의 정점 인덱스(화면 투영 거리). 없으면 -1.
    const pickVertex = (clientX: number, clientY: number): number => {
      const rect = renderer.domElement.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const verts = face.getVertices();
      const v = new THREE.Vector3();
      let best = -1;
      let bestDist = 16; // 픽셀 임계값
      verts.forEach((vert, i) => {
        v.set(vert.x, vert.y, vert.z).project(camera);
        const sx = ((v.x + 1) / 2) * rect.width;
        const sy = ((-v.y + 1) / 2) * rect.height;
        const d = Math.hypot(sx - px, sy - py);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      return best;
    };

    // ── 클릭 처리 ───────────────────────────────────────────
    // OrbitControls의 드래그(회전)와 클릭을 구분: down→up 이동거리가 작을 때만 클릭.
    let downX = 0;
    let downY = 0;
    let downT = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      downT = e.timeStamp;
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved > 5 || e.timeStamp - downT > 400) return; // 드래그로 간주

      if (modeRef.current === "vertex") {
        // 활성 평면 위에 정점 추가
        setNdc(e.clientX, e.clientY);
        const hit = placeOnWorkPlane(planeRef.current, raycaster.ray);
        if (hit) {
          face.addVertex(hit.x, hit.y, hit.z);
          syncHelpers();
        }
      } else {
        // 면 만들기 — 정점 마커 3번 순차 클릭
        const idx = pickVertex(e.clientX, e.clientY);
        if (idx < 0) return;
        const cur = selectedRef.current;
        if (cur.includes(idx)) return; // 같은 정점 중복 선택 무시
        const next = [...cur, idx];
        if (next.length === 3) {
          face.addFace(next[0], next[1], next[2]);
          selectedRef.current = [];
          setSelected([]);
          syncHelpers();
        } else {
          selectedRef.current = next;
          setSelected(next);
          syncHelpers();
        }
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("pointerup", onPointerUp);

    // ── 렌더 루프 ──────────────────────────────────────────
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      syncGrid();
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    resetRef.current = () => {
      face.reset();
      selectedRef.current = [];
      setSelected([]);
      syncHelpers();
    };

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      edgeGeom.dispose();
      (edgeLines.material as THREE.Material).dispose();
      pointGeom.dispose();
      (points.material as THREE.Material).dispose();
      selGeom.dispose();
      (selPoints.material as THREE.Material).dispose();
      (Object.values(grids) as THREE.GridHelper[]).forEach((g) => {
        g.geometry.dispose();
        (g.material as THREE.Material).dispose();
      });
      face.dispose();
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        try {
          mountRef.current.removeChild(renderer.domElement);
        } catch (e) {
          console.warn("VertexFace3D cleanup error:", e);
        }
      }
      resetRef.current = null;
    };
  }, []);

  const handleReset = () => resetRef.current?.();

  const modeBtn = (m: Mode, label: string) => (
    <button
      onClick={() => changeMode(m)}
      className={`text-sm rounded-lg px-3 py-1 transition-colors ${
        mode === m ? "bg-sky-500/70" : "bg-white/15 hover:bg-white/25"
      }`}
    >
      {label}
    </button>
  );

  const planeBtn = (p: WorkPlaneKey) => (
    <button
      onClick={() => changePlane(p)}
      className={`text-sm rounded-lg px-3 py-1 transition-colors ${
        plane === p ? "bg-emerald-500/70" : "bg-white/15 hover:bg-white/25"
      }`}
    >
      {PLANE_LABEL[p]}
    </button>
  );

  return (
    <>
      <div ref={mountRef} className="w-screen h-screen overflow-hidden" />

      {/* 조작 패널 */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/60 text-white rounded-xl px-6 py-4 backdrop-blur flex flex-col gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span>
            정점 <span className="tabular-nums font-medium">{vertexCount}</span>
          </span>
          <span>
            면 <span className="tabular-nums font-medium">{faceCount}</span>
          </span>
          {mode === "face" && (
            <span className="text-pink-300">
              선택 {selected.length}/3
            </span>
          )}
          <button
            onClick={handleReset}
            className="text-sm bg-white/15 hover:bg-white/25 rounded-lg px-3 py-1 transition-colors"
          >
            reset
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 w-10">모드</span>
          {modeBtn("vertex", "정점 추가")}
          {modeBtn("face", "면 만들기")}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 w-10">평면</span>
          {planeBtn("ground")}
          {planeBtn("front")}
          {planeBtn("side")}
        </div>
      </div>

      {/* 안내 */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-black/50 text-white/80 rounded-lg px-4 py-2 text-xs backdrop-blur max-w-md text-center">
        드래그로 궤도를 돌려 3D로 관찰하세요. '정점 추가' 모드에서 활성 평면(초록 그리드) 위를 클릭해 정점을,
        '면 만들기' 모드에서 정점 3개를 순차 클릭해 삼각형 면을 만듭니다.
      </div>
    </>
  );
};

export default VertexFace3D;
