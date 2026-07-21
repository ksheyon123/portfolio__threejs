import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RiggedBoxMesh } from "@models/RiggedBoxMesh";

/**
 * 스켈레탈 리깅 학습 페이지.
 * 두 뼈에 바인딩된 SkinnedMesh를 슬라이더로 굽혀, 메시가 관절 주변에서
 * 부드럽게 휘는 것을 관찰한다. SkeletonHelper로 뼈대를, OrbitControls로 카메라를 조작한다.
 */
const Rigging: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const riggedRef = useRef<RiggedBoxMesh | null>(null);
  const [bendDeg, setBendDeg] = useState(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 씬 / 카메라 / 렌더러
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(5, 3, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // 조명 (MeshStandardMaterial은 조명이 있어야 보인다)
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // 바닥 격자 (공간감)
    scene.add(new THREE.GridHelper(10, 10, 0x444466, 0x222233));

    // 리깅 메시 — 관절이 메시 중앙이므로, 바닥(y=-2)이 격자(y=0)에 닿도록 위로 올린다.
    const rigged = new RiggedBoxMesh(1, 4, 1, 12);
    rigged.position.y = 2;
    scene.add(rigged);
    riggedRef.current = rigged;

    // 뼈대 시각화
    const skeletonHelper = new THREE.SkeletonHelper(rigged);
    scene.add(skeletonHelper);

    // 카메라 궤도 조작 (관절 높이를 바라보게)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2, 0);
    controls.enableDamping = true;
    controls.update();

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
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

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      controls.dispose();
      rigged.dispose();
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        try {
          mountRef.current.removeChild(renderer.domElement);
        } catch (e) {
          console.warn("Rigging cleanup error:", e);
        }
      }
      riggedRef.current = null;
    };
  }, []);

  // 슬라이더 → 관절 각도 (도 단위 UI, 라디안으로 변환해 뼈에 전달)
  const handleBend = (deg: number) => {
    setBendDeg(deg);
    riggedRef.current?.setBend((deg * Math.PI) / 180);
  };

  return (
    <>
      <div
        ref={mountRef}
        className="w-screen h-screen overflow-hidden"
      />

      {/* 조작 패널 */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/60 text-white rounded-xl px-6 py-4 backdrop-blur">
        <div className="text-sm mb-2 font-medium">
          관절 각도: <span className="tabular-nums">{bendDeg}°</span>
        </div>
        <input
          type="range"
          min={-90}
          max={90}
          value={bendDeg}
          onChange={(e) => handleBend(Number(e.target.value))}
          className="w-72 cursor-pointer"
        />
        <div className="text-xs text-white/60 mt-2">
          슬라이더로 관절을 굽히세요. 파란 선(SkeletonHelper)이 뼈대입니다. 드래그로 카메라 회전.
        </div>
      </div>
    </>
  );
};

export default Rigging;
