import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { HumanMesh } from "./models/HumanMesh";
import { SphereMesh } from "./models/SphereMesh";
import { CameraModel } from "./models/CameraModel";
import { BoxMesh } from "./models/BoxMesh";
import { PlaneMesh } from "./models/PlaneMesh";
import { InteractionManager } from "./models/InteractionManager";
import { TreasureChestMesh } from "./models/TreasureChestMesh";

const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const humanRef = useRef<HumanMesh | null>(null);
  const sphereRef = useRef<SphereMesh | null>(null);
  const cameraModelRef = useRef<CameraModel | null>(null);
  const boxRef = useRef<BoxMesh | null>(null);
  const planeRef = useRef<PlaneMesh | null>(null);
  const interactionManagerRef = useRef<InteractionManager | null>(null);
  const treasureChestsRef = useRef<TreasureChestMesh[]>([]);

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

    // 구와 박스를 담을 컨테이너 생성
    const sphereContainer = new THREE.Object3D();
    scene.add(sphereContainer);

    // 사람 메시 생성
    const human = new HumanMesh(0x3366ff);
    humanRef.current = human;

    // 사람 메시의 크기 조정 (구에 비례하게)
    human.scale.set(5, 5, 5);

    // 반지름이 50인 구 생성 (HumanMesh 연결)
    const sphere = new SphereMesh(50, 0xcccccc, human);
    sphereRef.current = sphere;
    sphereContainer.add(sphere);

    // 박스 메시 생성 (크기 10x10x10, 색상 주황색)
    const box = new BoxMesh(10, 10, 10, 0xff5533);
    boxRef.current = box;

    // 박스를 구 표면의 임의의 위치에 배치
    box.placeOnSphere(sphere, sphere.getRadius());
    sphereContainer.add(box);

    // 보물 상자 메시 생성 (세 개)
    const treasureChests: TreasureChestMesh[] = [];
    const treasureChestColors = [0x8b4513, 0xa0522d, 0xcd853f]; // 갈색 계열 색상

    for (let i = 0; i < 3; i++) {
      const treasureChest = new TreasureChestMesh(
        10,
        10,
        5,
        treasureChestColors[i]
      );

      // 구 표면의 임의의 위치에 배치하기 위한 랜덤 방향 벡터 생성
      const theta = Math.random() * Math.PI * 2; // 0 ~ 2π (수평각)
      const phi = Math.acos(2 * Math.random() - 1); // 0 ~ π (수직각)

      // 구 좌표계를 직교 좌표계로 변환
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);

      const direction = new THREE.Vector3(x, y, z).normalize();

      // 보물 상자의 위치 설정 (구 표면에 접하도록)
      const position = direction
        .clone()
        .multiplyScalar(sphere.getRadius() + 2.5);
      treasureChest.position.copy(position);

      // 보물 상자가 구 표면을 향하도록 회전 설정
      treasureChest.lookAt(new THREE.Vector3(0, 0, 0));
      // Y축으로 90도 회전하여 상자가 바닥면이 구 표면에 접하도록 함
      treasureChest.rotateX(Math.PI / 2);

      // 보물 상자를 배열과 씬에 추가
      treasureChests.push(treasureChest);
      sphereContainer.add(treasureChest);
    }

    // 참조 저장
    treasureChestsRef.current = treasureChests;

    // 길과 같은 PlaneMesh 생성 (너비 5, 높이 30, 색상 회색)
    const plane = new PlaneMesh(5, 30, 0x335533);
    planeRef.current = plane;

    // 시작 방향과 끝 방향 설정 (예: 북극에서 적도 방향으로)
    const startDir = new THREE.Vector3(0, 1, 0); // 북극 방향
    const endDir = new THREE.Vector3(0, 0, 1); // 적도 방향 (z축 방향)
    plane.setStartDirection(startDir);
    plane.setEndDirection(endDir);

    // PlaneMesh를 구 표면에 배치
    plane.placeOnSphere(sphere, sphere.getRadius());
    sphereContainer.add(plane);

    // 사람 메시의 기준점을 발 하단으로 조정하기 위한 컨테이너 생성
    const humanContainer = new THREE.Object3D();

    // 사람 메시를 컨테이너에 추가하고, 발 하단이 컨테이너의 기준점이 되도록 위치 조정
    // HumanMesh의 발 하단은 약 y = -0.5 위치에 있으므로, 스케일(5)을 고려하여 y = 2.5로 올림
    human.position.y = 2.5;
    humanContainer.add(human);

    // 컨테이너를 구의 표면에 위치시키기
    humanContainer.position.set(0, 50, 0);

    scene.add(humanContainer);

    // 카메라 모델 생성 및 설정
    const cameraModel = new CameraModel(camera, mountRef.current);
    cameraModelRef.current = cameraModel;

    // 상호작용 관리자 생성
    const interactionManager = new InteractionManager();
    interactionManagerRef.current = interactionManager;

    // 카메라가 HumanMesh를 바라보도록 설정
    cameraModel.setTarget(human);

    // 카메라 위치 및 오프셋 설정 (HumanMesh를 잘 볼 수 있는 위치)
    cameraModel.setOffset(0, 10, 30);
    // 1인칭 시점에서 카메라를 머리 위치로 설정 (HumanMesh의 머리는 y = 0.85에 위치)
    // 스케일이 5이므로 오프셋도 5배로 조정 (0.85 * 5 = 4.25)
    cameraModel.setFirstPersonOffset(0, 4.25, 0);

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

    // 애니메이션 함수
    const animate = () => {
      if (
        !sceneRef.current ||
        !humanRef.current ||
        !sphereRef.current ||
        !cameraModelRef.current
      )
        return;

      sceneRef.current.animationId = requestAnimationFrame(animate);

      const { scene, camera, renderer, clock } = sceneRef.current;
      const human = humanRef.current;

      const sphere = sphereRef.current;
      const cameraModel = cameraModelRef.current;
      const box = boxRef.current;

      const time = clock.getElapsedTime();

      // 상호작용 업데이트
      if (box && human && sphere && interactionManagerRef.current) {
        interactionManagerRef.current.update(box, human, sphere);
      }

      // 보물 상자와 사람 메시의 상호작용 업데이트
      if (human && treasureChestsRef.current.length > 0) {
        treasureChestsRef.current.forEach((treasureChest) => {
          treasureChest.updateInteraction(human, time);
        });
      }

      // SphereMesh 클래스의 updateRotation 메서드 호출
      sphere.updateRotation();

      // sphereContainer의 rotation을 sphere의 rotation으로 설정
      // 이렇게 하면 구가 회전할 때 구 표면에 위치한 BoxMesh도 함께 회전합니다
      sphereContainer.rotation.copy(sphere.rotation);

      // 포즈 업데이트
      human.updatePose(time);

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
          console.warn("App cleanup error:", e);
        }
      }

      // 메모리 해제
      if (humanRef.current) {
        humanRef.current.dispose();
      }
      if (sphereRef.current) {
        sphereRef.current.dispose();
      }
      if (cameraModelRef.current) {
        cameraModelRef.current.dispose();
      }
      if (boxRef.current) {
        boxRef.current.dispose();
      }
      if (planeRef.current) {
        planeRef.current.dispose();
      }
      // 보물 상자 메시 해제
      if (treasureChestsRef.current.length > 0) {
        treasureChestsRef.current.forEach((treasureChest) => {
          treasureChest.dispose();
        });
        treasureChestsRef.current = [];
      }
      renderer.dispose();

      // 참조 정리
      sceneRef.current = null;
      humanRef.current = null;
      sphereRef.current = null;
      cameraModelRef.current = null;
      boxRef.current = null;
    };
  }, []); // 빈 의존성 배열 - 마운트 시 한 번만 실행

  return (
    <div className="min-h-screen">
      <header className="p-4 bg-gray-100">
        <h1 className="text-2xl font-bold">React Three.js 포트폴리오</h1>
      </header>

      <main className="container mx-auto p-4">
        <div className="card bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl mb-4">구 위의 캐릭터와 보물 상자 예제</h2>
          <p className="mb-4 text-gray-700">
            반지름이 50인 구 위에 캐릭터와 보물 상자를 올려두고 카메라로
            캐릭터를 바라보는 예제입니다. 방향키를 사용하여 구를 회전시켜보세요.
            Alt 키를 눌러 1인칭/3인칭 시점을 전환할 수 있습니다. 스페이스 키를
            누르면 캐릭터의 오른팔이 움직이고, 오른팔이 보물 상자와 충돌하면
            상자가 열립니다.
          </p>

          <div
            ref={mountRef}
            className="h-96 border border-gray-200 rounded-lg overflow-hidden"
          />

          <div className="text-center text-gray-700 mt-4">
            <p>방향키를 사용하여 구를 회전시켜보세요.</p>
            <p>위/아래 키: X축 회전, 왼쪽/오른쪽 키: Y축 회전</p>
            <p>
              Shift 키를 누른 상태로 방향키를 누르면 캐릭터가 달리기 모션으로
              변경되고 구의 회전 속도가 20% 빨라집니다.
            </p>
            <p>Alt 키를 눌러 1인칭/3인칭 시점을 전환해보세요.</p>
            <p>
              스페이스 키를 눌러 캐릭터의 오른팔을 움직여 보물 상자와
              상호작용해보세요.
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center p-4 mt-8 bg-gray-100">
        <p>&copy; 2025 React Three.js 튜토리얼</p>
      </footer>
    </div>
  );
};

export default App;
