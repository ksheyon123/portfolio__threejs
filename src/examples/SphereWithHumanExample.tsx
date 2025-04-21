import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { HumanMesh } from "../models/HumanMesh";
import { SphereMesh } from "../models/SphereMesh";

/**
 * 반지름이 50인 구 위에 HumanMesh를 올려두고 방향키로 구를 회전시키는 예제
 */
const SphereWithHumanExample: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const humanRef = useRef<HumanMesh | null>(null);
  const sphereRef = useRef<SphereMesh | null>(null);
  const [poseType, setPoseType] = useState<string>("reset");

  // 씬, 카메라, 렌더러 등의 참조를 저장할 ref
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    clock: THREE.Clock;
    animationId?: number;
  } | null>(null);

  // 키 입력 상태는 SphereMesh 클래스 내부로 이동

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
    camera.position.z = 100;
    camera.position.y = 50;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // 조명 추가
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // 사람 메시 생성
    const human = new HumanMesh(0x3366ff);
    humanRef.current = human;

    // 반지름이 50인 구 생성 (HumanMesh 연결)
    const sphere = new SphereMesh(50, 0xcccccc, human);
    sphereRef.current = sphere;
    scene.add(sphere);

    // 사람 메시의 크기 조정 (구에 비례하게)
    human.scale.set(5, 5, 5);

    // 사람 메시를 구의 표면에 위치시키기
    // 구의 반지름(50) + 약간의 오프셋을 주어 구의 표면에 정확히 위치
    human.position.set(0, 50, 0);

    scene.add(human);

    // 시계 생성
    const clock = new THREE.Clock();

    // sceneRef에 참조 저장
    sceneRef.current = { scene, camera, renderer, clock };

    // 키 이벤트 핸들러는 SphereMesh 클래스 내부로 이동

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

    // 클린업 함수
    return () => {
      window.removeEventListener("resize", handleResize);
      // 키 이벤트 리스너는 SphereMesh 클래스 내부에서 처리

      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }

      if (mountRef.current && renderer.domElement) {
        try {
          mountRef.current.removeChild(renderer.domElement);
        } catch (e) {
          console.warn("SphereWithHumanExample cleanup error:", e);
        }
      }

      // 메모리 해제
      if (humanRef.current) {
        humanRef.current.dispose();
      }
      if (sphereRef.current) {
        sphereRef.current.dispose();
      }
      renderer.dispose();

      // 참조 정리
      sceneRef.current = null;
      humanRef.current = null;
      sphereRef.current = null;
    };
  }, []); // 빈 의존성 배열 - 마운트 시 한 번만 실행

  // 애니메이션 및 포즈 변경 처리
  useEffect(() => {
    if (!sceneRef.current || !humanRef.current || !sphereRef.current) return;

    const { scene, camera, renderer, clock } = sceneRef.current;
    const human = humanRef.current;
    const sphere = sphereRef.current;

    // 이전 애니메이션 취소
    if (sceneRef.current.animationId) {
      cancelAnimationFrame(sceneRef.current.animationId);
    }

    // 회전 속도는 SphereMesh 클래스 내부로 이동

    // 애니메이션 함수
    const animate = () => {
      sceneRef.current!.animationId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      // SphereMesh 클래스의 updateRotation 메서드 호출
      sphere.updateRotation();

      // 구의 회전에 따라 사람 메시의 위치 업데이트
      // 구의 반지름(50)을 기준으로 사람 메시를 구의 표면에 위치시킴
      const radius = sphere.getRadius();

      // 사람 메시를 구의 북극(0, radius, 0)에 위치시키고 구의 회전을 적용
      // 구의 회전 행렬을 사람 메시의 위치에 적용
      const position = new THREE.Vector3(0, radius, 0);
      position.applyQuaternion(sphere.quaternion);

      // human.position.copy(position);

      // // 사람 메시가 항상 구의 표면에 수직이 되도록 회전 설정
      // // 사람 메시의 발이 구의 중심을 향하도록 함
      // human.lookAt(sphere.position);
      // human.rotateX(Math.PI / 2); // 추가 회전으로 올바른 방향 조정

      // HumanMesh의 포즈 업데이트
      human.updatePose(time);

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
  }, []); // 의존성 배열이 비어 있으므로 마운트 시 한 번만 실행

  // 포즈 변경 핸들러
  const handlePoseChange = (pose: string) => {
    if (humanRef.current) {
      humanRef.current.setPoseType(pose);
      setPoseType(pose); // UI 상태 업데이트를 위해 필요
    }
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

      <div className="text-center text-gray-700 mb-4">
        <p>방향키를 사용하여 구를 회전시켜보세요.</p>
        <p>위/아래 키: X축 회전, 왼쪽/오른쪽 키: Y축 회전</p>
        <p>위 버튼을 클릭하여 다양한 포즈를 확인하세요.</p>
        <p>구 회전 시 자동으로 걷기 모션이 활성화됩니다.</p>
      </div>
    </div>
  );
};

export default SphereWithHumanExample;
