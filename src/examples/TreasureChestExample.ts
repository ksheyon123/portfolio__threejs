import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { HumanMesh } from "../models/HumanMesh";
import { TreasureChestMesh } from "../models/TreasureChestMesh";

/**
 * TreasureChestMesh 예제
 * HumanMesh의 오른팔과 TreasureChestMesh의 상호작용을 보여줌
 */
export class TreasureChestExample {
  // Three.js 기본 요소
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  // 조명
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;

  // 메시 객체들
  private human: HumanMesh;
  private treasureChests: TreasureChestMesh[] = [];

  // 애니메이션 관련 변수
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;

  /**
   * 생성자
   * @param container 렌더러를 추가할 DOM 요소
   */
  constructor(container: HTMLElement) {
    // 씬 생성
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // 하늘색 배경

    // 카메라 설정
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);

    // 렌더러 설정
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // 컨트롤 설정
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // 조명 설정
    this.setupLights();

    // 바닥 생성
    this.createFloor();

    // 사람 메시 생성
    this.human = new HumanMesh();
    this.human.position.set(0, 0, 0);
    this.scene.add(this.human);

    // 보물 상자 메시 생성 (여러 개)
    this.createTreasureChests();

    // 시계 생성 (애니메이션용)
    this.clock = new THREE.Clock();

    // 창 크기 변경 이벤트 리스너 등록
    window.addEventListener("resize", () => this.onWindowResize(container));

    // 애니메이션 시작
    this.animate();
  }

  /**
   * 조명 설정
   */
  private setupLights(): void {
    // 주변광 생성
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    // 방향광 생성
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(5, 10, 7);
    this.directionalLight.castShadow = true;

    // 그림자 품질 설정
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -10;
    this.directionalLight.shadow.camera.right = 10;
    this.directionalLight.shadow.camera.top = 10;
    this.directionalLight.shadow.camera.bottom = -10;

    this.scene.add(this.directionalLight);
  }

  /**
   * 바닥 생성
   */
  private createFloor(): void {
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x999999,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // 바닥이 수평이 되도록 회전
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  /**
   * 보물 상자 메시 생성 (여러 개)
   */
  private createTreasureChests(): void {
    // 보물 상자 위치 배열
    const positions = [
      { x: -5, z: -3 },
      { x: 0, z: -5 },
      { x: 5, z: -3 },
    ];

    // 보물 상자 색상 배열
    const colors = [0x8b4513, 0xa0522d, 0xcd853f];

    // 각 위치에 보물 상자 생성
    for (let i = 0; i < positions.length; i++) {
      const treasureChest = new TreasureChestMesh(10, 10, 5, colors[i]);
      treasureChest.position.set(positions[i].x, 2.5, positions[i].z); // 바닥 위에 위치
      this.treasureChests.push(treasureChest);
      this.scene.add(treasureChest);
    }
  }

  /**
   * 창 크기 변경 이벤트 핸들러
   * @param container 렌더러가 추가된 DOM 요소
   */
  private onWindowResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  /**
   * 애니메이션 루프
   */
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // 시간 업데이트
    const time = this.clock.getElapsedTime();

    // 사람 메시 포즈 업데이트
    this.human.updatePose(time);

    // 각 보물 상자와 사람 메시의 상호작용 업데이트
    for (const treasureChest of this.treasureChests) {
      treasureChest.updateInteraction(this.human, time);
    }

    // 컨트롤 업데이트
    this.controls.update();

    // 렌더링
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * 리소스 해제
   */
  dispose(): void {
    // 애니메이션 프레임 취소
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // 메시 객체 해제
    this.human.dispose();
    for (const treasureChest of this.treasureChests) {
      treasureChest.dispose();
    }

    // 렌더러 DOM 요소 제거
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    // 렌더러 해제
    this.renderer.dispose();
  }
}
