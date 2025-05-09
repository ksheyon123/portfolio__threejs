import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { CameraModel } from "@models/CameraModel";
import { FingerMesh } from "@models/FingerMesh";
import ToolTipIcon from "@components/ToolTipIcon";

const Modeling: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const fingerRef = useRef<FingerMesh | null>(null);
  const cameraModelRef = useRef<CameraModel | null>(null);

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

    // 화면 크기 직접 가져오기
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 씬, 카메라, 렌더러 설정
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // 조명 추가
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // 주 조명 (그림자 생성)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(10, 10, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    scene.add(mainLight);

    // 보조 조명 (반대 방향에서 비추는 조명)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // XZ 평면 (바닥) 생성
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.2,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = Math.PI / 2; // XZ 평면이 되도록 회전
    plane.position.y = 0;
    plane.receiveShadow = true;
    scene.add(plane);

    // 좌표축 헬퍼 추가
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // 그리드 헬퍼 추가 (XZ 평면에 10x10 그리드, 간격 1)
    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);

    // FingerMesh 생성 (XZ 평면 위 (0, ?, 0) 위치에 배치)
    const finger = new FingerMesh();
    finger.createFingerMesh(); // 손가락 메시 생성 메서드 호출
    fingerRef.current = finger;
    // 두 번째 Bone을 90도 구부림
    finger.bendSecondBone90Degrees();

    scene.add(finger);

    // 카메라 모델 생성 및 설정
    const cameraModel = new CameraModel(camera, mountRef.current);
    cameraModelRef.current = cameraModel;

    // 카메라가 FingerMesh를 바라보도록 설정
    cameraModel.setTarget(finger);
    cameraModel.setOffset(0, 2, 5);

    // 시계 생성
    const clock = new THREE.Clock();

    // sceneRef에 참조 저장
    sceneRef.current = { scene, camera, renderer, clock };

    // 창 크기 변경 이벤트 처리
    const handleResize = () => {
      if (!sceneRef.current) return;

      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      const { camera, renderer } = sceneRef.current;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // 애니메이션 함수
    const animate = () => {
      if (!sceneRef.current || !fingerRef.current || !cameraModelRef.current)
        return;

      sceneRef.current.animationId = requestAnimationFrame(animate);

      const { scene, camera, renderer, clock } = sceneRef.current;
      const finger = fingerRef.current;
      const cameraModel = cameraModelRef.current;

      const time = clock.getElapsedTime();

      // FingerMesh 업데이트
      finger.update(time);

      // 카메라 업데이트
      cameraModel.update();

      renderer.render(scene, camera);
    };

    // 애니메이션 시작
    animate();

    // 클린업 함수
    return () => {
      window.removeEventListener("resize", handleResize);

      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }

      if (mountRef.current && renderer.domElement) {
        try {
          mountRef.current.removeChild(renderer.domElement);
        } catch (e) {
          console.warn("Modeling cleanup error:", e);
        }
      }

      // 메모리 해제
      if (fingerRef.current) {
        fingerRef.current.dispose();
      }
      if (cameraModelRef.current) {
        cameraModelRef.current.dispose();
      }

      renderer.dispose();

      // 참조 정리
      sceneRef.current = null;
      fingerRef.current = null;
      cameraModelRef.current = null;
    };
  }, []); // 빈 의존성 배열 - 마운트 시 한 번만 실행

  return (
    <>
      {/* 고정된 툴팁 아이콘 - 우측 상단에 위치 */}
      <div className="fixed top-4 right-4 z-[9999]">
        <div
          className="p-2 flex items-center justify-center"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            borderRadius: "50%",
          }}
        >
          <ToolTipIcon
            text={`
              [손가락 모델링 페이지]
              
              • 이 페이지는 XZ 평면 위에 손가락 형태의 Mesh를 생성합니다.
              • 손가락은 (0, ?, 0) 위치에 존재합니다.
              
              [조작 방법]
              • 마우스 드래그: 카메라 회전
              • 마우스 휠: 줌인/줌아웃
              • Alt 키: 1인칭/3인칭 시점 전환
            `}
            position="left-top"
            iconType="question"
            size="lg"
            className="text-blue-700"
          />
        </div>
      </div>

      {/* Three.js 렌더링 영역 */}
      <div
        ref={mountRef}
        className="w-screen h-screen border-0 overflow-hidden"
      />
    </>
  );
};

export default Modeling;
