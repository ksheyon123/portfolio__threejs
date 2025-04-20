import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { HumanMesh } from "../models/HumanMesh";

/**
 * HumanMesh를 사용하는 React 컴포넌트 예제
 * 이 컴포넌트는 Three.js 씬을 설정하고 HumanMesh를 사용하는 방법을 보여줍니다.
 */
const HumanMeshUsage: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const humanRef = useRef<HumanMesh>(new HumanMesh(0x3366ff));
  const [poseType, setPoseType] = useState<string>("walk");

  useEffect(() => {
    if (!mountRef.current) return;
    if (!humanRef.current) return;

    // 컨테이너 크기 가져오기
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 씬, 카메라, 렌더러 설정
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 3;
    camera.position.y = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // 조명 추가
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // 바닥 추가 (선택 사항)
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshPhongMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = -0.5;
    scene.add(floor);

    console.log(humanRef.current);
    // 사람 메시 생성
    const human = humanRef.current;
    scene.add(human);

    // 애니메이션 ID 저장 변수
    let animationId: number;
    const clock = new THREE.Clock();

    // 애니메이션 함수
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();
      // 현재 선택된 포즈에 따라 다른 애니메이션 적용
      switch (poseType) {
        case "walk":
          // 걷는 애니메이션
          human.walk(time * 3);
          break;
        case "raiseArms":
          // 양팔 들기 포즈
          human.resetRotations();
          human.rotateLeftArm(-Math.PI / 2, 0, 0);
          human.rotateRightArm(-Math.PI / 2, 0, 0);
          break;
        case "running":
          // 달리기 포즈
          human.resetRotations();
          human.rotateLeftArm(-Math.PI / 4, 0, 0);
          human.rotateRightArm(Math.PI / 4, 0, 0);
          human.rotateLeftLeg(Math.PI / 4, 0, 0);
          human.rotateRightLeg(-Math.PI / 4, 0, 0);
          break;
        case "wave":
          // 손 흔들기 포즈
          human.resetRotations();
          human.rotateRightArm(-Math.PI / 2, 0, 0);
          // 오른팔 흔들기 애니메이션
          human.rotateRightArm(-Math.PI / 2, 0, Math.sin(time * 5) * 0.5);
          break;
        default:
          // 기본 상태
          human.resetRotations();
      }

      // 전체 회전 (선택 사항)
      human.rotation.y = time * 0.5;
      renderer.render(scene, camera);
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
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // 클린업 함수
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);

      if (mountRef.current && renderer.domElement) {
        try {
          mountRef.current.removeChild(renderer.domElement);
        } catch (e) {
          console.warn("HumanMeshUsage cleanup error:", e);
        }
      }

      // 메모리 해제
      human.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      renderer.dispose();
    };
  }, [poseType, humanRef.current]); // poseType이 변경될 때마다 useEffect 재실행

  // 포즈 변경 핸들러
  const handlePoseChange = (pose: string) => {
    setPoseType(pose);
  };

  return (
    <div className="flex flex-col items-center">
      <div ref={mountRef} className="w-full h-96 mb-4" />

      <div className="flex space-x-2 mb-4">
        <button
          className={`px-4 py-2 rounded ${
            poseType === "walk" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => handlePoseChange("walk")}
        >
          걷기
        </button>
        <button
          className={`px-4 py-2 rounded ${
            poseType === "raiseArms" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => handlePoseChange("raiseArms")}
        >
          양팔 들기
        </button>
        <button
          className={`px-4 py-2 rounded ${
            poseType === "running" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => handlePoseChange("running")}
        >
          달리기 자세
        </button>
        <button
          className={`px-4 py-2 rounded ${
            poseType === "wave" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => handlePoseChange("wave")}
        >
          손 흔들기
        </button>
        <button
          className={`px-4 py-2 rounded ${
            poseType === "reset" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => handlePoseChange("reset")}
        >
          초기화
        </button>
      </div>

      <div className="text-center text-gray-700">
        <p>위 버튼을 클릭하여 다양한 포즈를 확인하세요.</p>
        <p>HumanMesh 클래스는 각 신체 부위를 개별적으로 제어할 수 있습니다.</p>
      </div>
    </div>
  );
};

export default HumanMeshUsage;
