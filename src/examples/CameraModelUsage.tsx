import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { HumanMesh } from "../models/HumanMesh";
import { CameraModel } from "../models/CameraModel";

/**
 * CameraModel을 사용하는 React 컴포넌트 예제
 * 이 컴포넌트는 Three.js 씬을 설정하고 CameraModel을 사용하는 방법을 보여줍니다.
 *
 * 기능:
 * - Alt 키를 눌러 1인칭/3인칭 시점 전환
 * - 마우스 드래그로 카메라 회전
 * - 마우스 휠로 줌인/줌아웃
 * - 타겟(HumanMesh)이 이동하면 카메라도 따라서 이동
 */
const CameraModelUsage: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const humanRef = useRef<HumanMesh | null>(null);
  const cameraModelRef = useRef<CameraModel | null>(null);
  const [viewMode, setViewMode] = useState<string>("3인칭");
  const [poseType, setPoseType] = useState<string>("walk");

  // 씬, 카메라, 렌더러 등의 참조를 저장할 ref
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    clock: THREE.Clock;
    animationId?: number;
  } | null>(null);

  // 씬 초기화 및 설정 (마운트 시 한 번만 실행)
  useEffect(() => {
    if (!mountRef.current) return;

    // 컨테이너 크기 가져오기
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 씬, 카메라, 렌더러 설정
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    camera.position.y = 2;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // 조명 추가
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // 바닥 추가
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshPhongMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = -0.5;
    scene.add(floor);

    // 사람 메시 생성
    const human = new HumanMesh(0x3366ff);
    humanRef.current = human;
    scene.add(human);

    // 카메라 모델 생성 및 설정
    const cameraModel = new CameraModel(camera, mountRef.current);
    cameraModel.setTarget(human);
    cameraModel.setOffset(0, 2, 5); // 3인칭 시점 오프셋 설정
    cameraModel.setFirstPersonOffset(0, 0.5, 0); // 1인칭 시점 오프셋 설정 (머리 위치)
    cameraModelRef.current = cameraModel;

    // 시계 생성
    const clock = new THREE.Clock();

    // sceneRef에 참조 저장
    sceneRef.current = { scene, camera, renderer, clock };

    // 창 크기 변경 이벤트 처리
    const handleResize = () => {
      if (!mountRef.current || !sceneRef.current) return;

      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;

      const { camera, renderer } = sceneRef.current;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // Alt 키 이벤트 리스너 (시점 전환 상태 업데이트)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Alt") {
        setViewMode("1인칭");
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") {
        setViewMode("3인칭");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // 클린업 함수
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);

      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }

      if (mountRef.current && renderer.domElement) {
        try {
          mountRef.current.removeChild(renderer.domElement);
        } catch (e) {
          console.warn("CameraModelUsage cleanup error:", e);
        }
      }

      // 메모리 해제
      if (humanRef.current) {
        humanRef.current.dispose();
      }
      if (cameraModelRef.current) {
        cameraModelRef.current.dispose();
      }
      floorGeometry.dispose();
      floorMaterial.dispose();
      renderer.dispose();

      // 참조 정리
      sceneRef.current = null;
      humanRef.current = null;
      cameraModelRef.current = null;
    };
  }, []); // 빈 의존성 배열 - 마운트 시 한 번만 실행

  // 애니메이션 및 포즈 변경 처리
  useEffect(() => {
    if (!sceneRef.current || !humanRef.current || !cameraModelRef.current)
      return;

    const { scene, camera, renderer, clock } = sceneRef.current;
    const human = humanRef.current;
    const cameraModel = cameraModelRef.current;

    // 이전 애니메이션 취소
    if (sceneRef.current.animationId) {
      cancelAnimationFrame(sceneRef.current.animationId);
    }

    // 애니메이션 함수
    const animate = () => {
      sceneRef.current!.animationId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      // 현재 선택된 포즈에 따라 다른 애니메이션 적용
      switch (poseType) {
        case "walk":
          // 걷는 애니메이션
          human.walk(time * 3);

          // 걸으면서 앞으로 이동 (타겟 이동 시 카메라도 따라서 이동)
          human.position.x = Math.sin(time * 0.5) * 2;
          human.position.z = Math.cos(time * 0.5) * 2;
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

          // 달리면서 빠르게 이동 (타겟 이동 시 카메라도 따라서 이동)
          human.position.x = Math.sin(time) * 3;
          human.position.z = Math.cos(time) * 3;
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

      // 카메라 모델 업데이트 (타겟 이동 시 카메라도 따라서 이동)
      cameraModel.update();

      renderer.render(scene, camera);
    };

    // 애니메이션 시작
    animate();

    // 클린업 함수
    return () => {
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
    };
  }, [poseType]); // poseType이 변경될 때마다 실행

  // 포즈 변경 핸들러
  const handlePoseChange = (pose: string) => {
    setPoseType(pose);

    // 포즈 변경 시 머리 회전 초기화
    if (humanRef.current) {
      humanRef.current.resetHeadRotation();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div ref={mountRef} className="w-full h-96 mb-4 relative">
        <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
          {viewMode} 시점 (Alt 키로 전환)
        </div>
      </div>

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
          달리기
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
        <p>카메라 조작 방법:</p>
        <ul className="list-disc text-left pl-6">
          <li>Alt 키: 1인칭/3인칭 시점 전환</li>
          <li>마우스 드래그: 카메라 회전</li>
          <li>마우스 휠: 줌인/줌아웃</li>
        </ul>
      </div>
    </div>
  );
};

export default CameraModelUsage;
