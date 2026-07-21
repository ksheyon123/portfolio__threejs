# 정점으로 면 만들기 — 편집 가능한 2D 다각형 (Vertex → Face)

## 목적
메시가 어떻게 **원재료(정점)로부터** 만들어지는지를 손으로 구현해 익힌다.
`BufferGeometry`에 `position`(정점 좌표)과 `index`(어느 정점 3개가 한 삼각형 면을 이루는가)를
직접 채워, `z=0` 평면 위 임의의 좌표들을 **순서대로 이어 다각형 면**을 만든다.
정점을 추가·이동하면 면이 실시간으로 다시 만들어지는 것을 관찰한다.
(기존 데모들은 `BoxGeometry` 등 완성된 지오메트리를 썼지만, 여기선 그 지오메트리의
바닥에 있는 정점·인덱스 버퍼 그 자체를 손으로 구성하는 것이 핵심이다.)

## 범위
- `/vertex-face` **별도 라우트 + 별도 페이지 컴포넌트**(`VertexFace.tsx`)로 만든다. 기존 페이지·모델은 건드리지 않는다.
- 면 생성 로직은 기존 `src/models/` 패턴대로 클래스(`FaceMesh`)로 분리한다.
- **이번 버전은 2D 전용**: 모든 정점은 `z=0` 평면 위에 있다. 3D(높이 있는 정점)는 범위 밖.
- 삼각분할은 **팬(fan) 방식**만 구현한다(볼록 다각형 전제). 오목 다각형 지원(ear-clipping)은 이번 범위 밖 — 향후 리비전.

## 기능 목록

### 기능: 2D 정점 목록 → position 버퍼
- **의도**: 정점(2D 좌표)이 면의 원재료다. 좌표 목록을 GPU가 읽는 `position` attribute로 변환한다.
- **방식**: `FaceMesh`가 정점 배열(`{x, y}[]`)을 보관한다. 각 정점을 `(x, y, 0)`으로 펼쳐 `Float32BufferAttribute`(itemSize 3)로 `position`에 설정한다.
- **주의**: 2D지만 Three.js position은 항상 3성분이라 `z`는 0으로 채운다. 정점 목록이 바뀔 때마다 attribute를 새로 만들거나 `needsUpdate`를 세운다.
- **인수기준**: 정점 N개를 주면 `geometry.attributes.position.count === N`. i번째 정점의 position이 `(xᵢ, yᵢ, 0)`과 같다(`toBeCloseTo`).

### 기능: 팬 삼각분할 → index 버퍼
- **의도**: N각형 면을 삼각형들로 채워야 래스터라이저가 면을 그린다. 정점 0을 축으로 부채꼴(fan)로 쪼갠다.
- **방식**: N≥3일 때 `index = [0, i, i+1]` (i = 1 … N-2) → 삼각형 N-2개. N<3이면 면이 성립하지 않으므로 index를 빈 배열로 둔다.
- **주의**: 팬은 **볼록 다각형 전제**다. 오목 좌표를 주면 삼각형이 다각형 밖으로 삐져나온다(→ 사람 확인 필요, 향후 ear-clipping). 정점 순서(winding)가 면의 앞뒤를 정한다.
- **인수기준**: N≥3이면 `index.count === (N-2)*3`이고, k번째 삼각형의 인덱스가 `[0, k+1, k+2]`다. N<3이면 index가 비어 있다(길이 0 또는 index 미설정).

### 기능: 법선 계산 (조명 대응)
- **의도**: `MeshStandardMaterial`이 조명을 받으려면 법선이 필요하다. 평면이므로 면 법선은 한 방향(±z)이다.
- **방식**: position·index를 채운 뒤 `geometry.computeVertexNormals()`를 호출한다. 재질은 앞뒤 모두 보이도록 `side: THREE.DoubleSide`.
- **주의**: 정점을 CCW(반시계)로 주면 법선이 +z(카메라 쪽)를 향한다. 편집으로 순서가 뒤집히면 법선도 뒤집히지만 DoubleSide라 계속 보인다.
- **인수기준**: 빌드 후 `geometry.attributes.normal`이 존재하고 count가 정점 수와 같다. CCW 볼록 다각형에서 각 정점 법선의 z성분이 +1에 가깝다(`toBeCloseTo`, 부호는 winding 의존).

### 기능: 정점 편집 (add / move / remove / reset)
- **의도**: 평면 위 임의 좌표를 주고(추가), 옮기고(이동), 지워서 면이 실시간으로 다시 만들어지는 것이 이 데모의 목적이다.
- **방식**:
  - `addVertex(x, y)`: 목록 끝에 추가 후 재빌드(position + index + normal).
  - `moveVertex(i, x, y)`: i번째 좌표 갱신 후 position·normal 갱신(정점 수 불변이면 index 유지).
  - `removeVertex(i)` / `reset()`: 목록에서 제거 / 전체 비우기 후 재빌드.
- **주의**: `addVertex`/`removeVertex`는 정점 수가 바뀌므로 index를 반드시 재계산한다. `moveVertex`는 개수가 그대로면 index 재계산이 불필요하지만 normal은 다시 계산한다.
- **인수기준**:
  - `addVertex` 후 `position.count`가 1 증가하고 index가 재계산된다(N≥3부터 삼각형 생성).
  - `moveVertex(i, x, y)` 후 i번째 position이 `(x, y, 0)`으로 바뀐다(`toBeCloseTo`).
  - `reset()` 후 `position.count === 0`, index 비어 있음.

### 기능: 페이지 상호작용 (클릭 추가 · 드래그 이동 · 정투영 top-down)
- **의도**: 평면 위 임의 좌표를 마우스로 직접 주고, 정점이 이어져 면이 채워지는 과정을 눈으로 본다.
- **방식**:
  - `OrthographicCamera`로 `z=0` 평면을 정면에서 내려다본다(2D 느낌). `OrbitControls`는 이번엔 비활성(2D라 회전 불필요) — 대신 pan/zoom만 허용하거나 고정.
  - `Raycaster`로 빈 평면 클릭 → `addVertex`. 기존 정점(작은 점 헬퍼) 위 드래그 → `moveVertex`.
  - 정점을 작은 점(`Points` 또는 sphere)으로, 외곽선을 `LineLoop`로 시각화해 "정점을 잇는다"를 드러낸다. 채워진 면은 반투명.
  - `reset` 버튼과 현재 정점 수 표시.
- **주의**: 정리 시 geometry·material·헬퍼·컨트롤을 dispose하고 리스너를 해제한다(기존 페이지 cleanup 규약). 화면 좌표 → 평면 좌표 변환은 Raycaster–plane 교차로 한다.
- **인수기준**: **[사람 확인 필요]** 빈 곳을 클릭하면 점이 찍히고, 3개 이상부터 면이 채워진다. 정점을 드래그하면 면이 실시간으로 바뀐다. `reset`으로 모두 지워진다.

## 사람 확인 필요 (육안)
렌더링 결과·클릭/드래그 상호작용·면이 채워지는 모습·오목 다각형에서 팬 삼각분할이 삐져나오는지는
WebGL이 필요해 jsdom에서 검증 불가 → `npm run dev`로 `/vertex-face`에서 육안 확인한다.
순수 계산(정점→position, 팬 index 구성, 법선, add/move/remove/reset 상태 변화)만 자동 테스트한다.
