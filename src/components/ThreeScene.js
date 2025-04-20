import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const ThreeScene = () => {
  const mountRef = useRef(null);
  const [renderer, setRenderer] = useState(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // 컨테이너 크기 가져오기
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 씬, 카메라, 렌더러 설정
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

    const newRenderer = new THREE.WebGLRenderer({ antialias: true });
    newRenderer.setSize(width, height);
    newRenderer.setClearColor(0xf0f0f0);
    setRenderer(newRenderer);

    // 마운트 요소에 렌더러 추가
    mountRef.current.appendChild(newRenderer.domElement);

    // 큐브 생성
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0x44aa88 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // 조명 추가
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // 카메라 위치 설정
    camera.position.z = 5;

    // 애니메이션 ID 저장 변수
    let animationId;

    // 애니메이션 함수
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;

      newRenderer.render(scene, camera);
    };

    // 애니메이션 시작
    animate();

    // 창 크기 변경 이벤트 처리
    const handleResize = () => {
      if (!mountRef.current) return;

      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      newRenderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // 클린업 함수
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);

      if (mountRef.current && newRenderer.domElement) {
        try {
          mountRef.current.removeChild(newRenderer.domElement);
        } catch (e) {
          console.warn("ThreeScene cleanup error:", e);
        }
      }

      // 메모리 해제
      geometry.dispose();
      material.dispose();
      newRenderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-96" />;
};

export default ThreeScene;
