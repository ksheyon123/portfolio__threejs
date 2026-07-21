import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { FaceMesh } from "@models/FaceMesh";

/**
 * 정점으로 면 만들기 학습 페이지 (2D).
 *
 * z=0 평면을 정투영(OrthographicCamera)으로 정면에서 본다.
 *   - 빈 곳 클릭 → 정점 추가 (3개부터 팬 삼각분할로 면이 채워진다)
 *   - 정점(노란 점) 드래그 → 정점 이동, 면 실시간 갱신
 *   - reset → 모두 지우기
 * 외곽선(LineLoop)과 정점 점(Points)으로 "정점을 잇는다"를 드러낸다.
 */
const VertexFace: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<FaceMesh | null>(null);
  // useEffect 안에서 정의한 reset을 버튼에서 부르기 위한 브리지
  const resetRef = useRef<(() => void) | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 씬 / 렌더러
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // 정투영 카메라 — z=0 평면을 +z에서 내려다본다(2D 느낌).
    const viewSize = 12; // 세로로 보이는 월드 높이
    const makeFrustum = (w: number, h: number) => {
      const aspect = w / h;
      const halfH = viewSize / 2;
      const halfW = halfH * aspect;
      return { halfW, halfH };
    };
    const { halfW, halfH } = makeFrustum(width, height);
    const camera = new THREE.OrthographicCamera(
      -halfW,
      halfW,
      halfH,
      -halfH,
      0.1,
      100,
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    // 조명 — MeshStandardMaterial이 보이려면 필요. 평면 법선(+z)을 비추도록 정면에.
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(2, 3, 10);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // 격자 — z=0 평면에 눕힌다(GridHelper는 기본 xz평면이라 x축 90° 회전).
    const grid = new THREE.GridHelper(viewSize * 2, 24, 0x444466, 0x262636);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    // 면 메시(원재료: 정점 목록)
    const face = new FaceMesh([]);
    scene.add(face);
    faceRef.current = face;

    // 외곽선(LineLoop) — 정점을 순서대로 잇는 선
    const lineGeom = new THREE.BufferGeometry();
    const line = new THREE.LineLoop(
      lineGeom,
      new THREE.LineBasicMaterial({ color: 0x88ccff }),
    );
    line.position.z = 0.01; // 면 위에 살짝 띄워 z-fighting 방지
    scene.add(line);

    // 삼각형 에지(팬 삼각분할) — 외곽선뿐 아니라 정점 0에서 뻗는 내부 대각선까지
    // 그려 각 삼각형이 눈에 보이게 한다. (코플래너라 EdgesGeometry 대신 직접 그림)
    const triGeom = new THREE.BufferGeometry();
    const triEdges = new THREE.LineSegments(
      triGeom,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
      }),
    );
    triEdges.position.z = 0.005; // 면 위, 외곽선(LineLoop) 아래
    scene.add(triEdges);

    // 정점 마커(Points)
    const pointGeom = new THREE.BufferGeometry();
    const points = new THREE.Points(
      pointGeom,
      new THREE.PointsMaterial({ color: 0xffdd44, size: 14, sizeAttenuation: false }),
    );
    points.position.z = 0.02;
    scene.add(points);

    // 정점 목록 → 외곽선/점 지오메트리 동기화
    const syncHelpers = () => {
      const verts = face.getVertices();
      const arr = new Float32Array(verts.length * 3);
      verts.forEach((v, i) => {
        arr[i * 3] = v.x;
        arr[i * 3 + 1] = v.y;
        arr[i * 3 + 2] = 0;
      });
      lineGeom.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
      pointGeom.setAttribute("position", new THREE.Float32BufferAttribute(arr.slice(), 3));
      lineGeom.computeBoundingSphere();
      pointGeom.computeBoundingSphere();

      // 삼각형 에지 — getTriangleEdges()의 인덱스 쌍마다 선분 하나
      const edges = face.getTriangleEdges();
      const edgeArr = new Float32Array(edges.length * 2 * 3);
      edges.forEach(([a, b], k) => {
        const base = k * 6;
        edgeArr[base] = verts[a].x;
        edgeArr[base + 1] = verts[a].y;
        edgeArr[base + 2] = 0;
        edgeArr[base + 3] = verts[b].x;
        edgeArr[base + 4] = verts[b].y;
        edgeArr[base + 5] = 0;
      });
      triGeom.setAttribute("position", new THREE.Float32BufferAttribute(edgeArr, 3));
      triGeom.computeBoundingSphere();

      setCount(verts.length);
    };
    syncHelpers();

    // ── 마우스 → z=0 평면 좌표 ──────────────────────────────
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // z=0
    const hit = new THREE.Vector3();

    // 화면 픽셀 → 평면 위 월드 좌표. 실패 시 null.
    const toPlane = (clientX: number, clientY: number): THREE.Vector3 | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray.intersectPlane(plane, hit) ? hit.clone() : null;
    };

    // 클릭 지점 근처의 정점 인덱스(드래그 대상). 없으면 -1.
    // 픽셀 임계값을 월드 단위로 환산: viewSize(월드 높이)/화면높이 * 12px.
    const pickVertex = (world: THREE.Vector3): number => {
      const worldPerPixel = viewSize / renderer.domElement.clientHeight;
      const threshold = worldPerPixel * 14; // 점 크기와 대략 맞춤
      const verts = face.getVertices();
      let best = -1;
      let bestDist = threshold;
      verts.forEach((v, i) => {
        const d = Math.hypot(v.x - world.x, v.y - world.y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      return best;
    };

    let dragIndex = -1;

    const onPointerDown = (e: PointerEvent) => {
      const world = toPlane(e.clientX, e.clientY);
      if (!world) return;
      const idx = pickVertex(world);
      if (idx >= 0) {
        dragIndex = idx; // 기존 정점 잡고 드래그 시작
        renderer.domElement.setPointerCapture(e.pointerId);
      } else {
        face.addVertex(world.x, world.y); // 빈 곳 → 정점 추가
        syncHelpers();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (dragIndex < 0) return;
      const world = toPlane(e.clientX, e.clientY);
      if (!world) return;
      face.moveVertex(dragIndex, world.x, world.y);
      syncHelpers();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (dragIndex >= 0) {
        try {
          renderer.domElement.releasePointerCapture(e.pointerId);
        } catch {
          /* capture가 없을 수 있음 */
        }
      }
      dragIndex = -1;
    };

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("pointermove", onPointerMove);
    dom.addEventListener("pointerup", onPointerUp);

    // ── 렌더 루프 ──────────────────────────────────────────
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const f = makeFrustum(w, h);
      camera.left = -f.halfW;
      camera.right = f.halfW;
      camera.top = f.halfH;
      camera.bottom = -f.halfH;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // reset 버튼이 부르도록 ref에 노출
    resetRef.current = () => {
      face.reset();
      syncHelpers();
    };

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointermove", onPointerMove);
      dom.removeEventListener("pointerup", onPointerUp);
      lineGeom.dispose();
      (line.material as THREE.Material).dispose();
      triGeom.dispose();
      (triEdges.material as THREE.Material).dispose();
      pointGeom.dispose();
      (points.material as THREE.Material).dispose();
      face.dispose();
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        try {
          mountRef.current.removeChild(renderer.domElement);
        } catch (e) {
          console.warn("VertexFace cleanup error:", e);
        }
      }
      faceRef.current = null;
      resetRef.current = null;
    };
  }, []);

  const handleReset = () => resetRef.current?.();

  return (
    <>
      <div ref={mountRef} className="w-screen h-screen overflow-hidden" />

      {/* 조작 패널 */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/60 text-white rounded-xl px-6 py-4 backdrop-blur flex items-center gap-4">
        <div className="text-sm">
          정점 수: <span className="tabular-nums font-medium">{count}</span>
          {count < 3 && (
            <span className="text-white/50 ml-2">(3개부터 면이 채워져요)</span>
          )}
        </div>
        <button
          onClick={handleReset}
          className="text-sm bg-white/15 hover:bg-white/25 rounded-lg px-3 py-1 transition-colors"
        >
          reset
        </button>
      </div>

      {/* 안내 */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-black/50 text-white/80 rounded-lg px-4 py-2 text-xs backdrop-blur">
        빈 곳을 클릭해 정점을 추가하고, 노란 점을 드래그해 옮기세요. 정점을 순서대로 이어 면을 만듭니다.
      </div>
    </>
  );
};

export default VertexFace;
