# 스켈레탈 리깅 학습 데모 (Bone / Skeleton / SkinnedMesh)

## 목적
스켈레탈 리깅의 핵심 개념(뼈대·스키닝 웨이트·SkinnedMesh 바인딩)을 손으로 구현해 익힌다.
두 개의 뼈(Bone)를 체인으로 연결하고, 하나의 세로로 긴 박스 메시를 그 뼈들에 웨이트로
바인딩해, 관절을 굽히면 메시가 관절 주변에서 **부드럽게 휘어지는** 것을 관찰한다.
기존 `HumanMesh`의 피벗 계층 방식(각지게 꺾임)과 대비되는, 캐릭터 리깅의 정석 방식이다.

## 범위
- `/rigging` **별도 라우트 + 별도 페이지 컴포넌트**로 만든다(기존 `/modeling`·`Modeling.tsx`는 건드리지 않는다).
- 리깅 로직은 기존 `src/models/` 패턴대로 클래스(`RiggedBoxMesh`)로 분리한다.

## 기능 목록

### 기능: 두 뼈 체인 (Bone hierarchy)
- **의도**: 스켈레탈 애니메이션의 뼈대는 부모-자식 계층이다. 관절 하나(뼈 2개)로 최소 체인을 만든다.
- **방식**: `THREE.Bone` 2개. `bone0`(루트)를 메시 바닥에, `bone1`(자식)을 `bone0` 기준 위로 뼈 길이만큼 올려 관절점을 만든다. `bone0.add(bone1)`.
- **주의**: `bone1.position.y`는 월드가 아니라 **부모(bone0) 로컬 기준**이다. 관절이 메시 중앙에 오도록 뼈 길이 = 메시 높이의 절반.
- **인수기준**: `bone0.children`가 `bone1`을 포함한다. `bone1.position.y`가 뼈 길이(메시높이/2)와 같다(`toBeCloseTo`).

### 기능: 스키닝 웨이트 (skinIndex / skinWeight)
- **의도**: 각 정점이 어느 뼈의 영향을 얼마나 받는지 정의해야 메시가 뼈를 따라 변형된다. 이게 리깅의 핵심.
- **방식**: 세로로 긴 `BoxGeometry`(height 방향 세그먼트 다수)를 만들고, 각 정점 y를 0~1로 정규화한 값 `t`로 선형 블렌딩한다 — bone0 웨이트 `1-t`, bone1 웨이트 `t`. `skinIndex`/`skinWeight`를 geometry attribute로 추가.
- **주의**: 세그먼트가 적으면 관절이 각지게 꺾여 스켈레탈의 장점이 안 보인다 → height 세그먼트를 충분히(예: 8+) 준다. skinWeight는 정점당 최대 4개 뼈, 여기선 2개만 쓰고 나머지 0.
- **인수기준**: 모든 정점에서 skinWeight 4개의 합이 1이다(`toBeCloseTo`). 바닥 정점(y 최소)은 bone0 웨이트≈1, 꼭대기 정점(y 최대)은 bone1 웨이트≈1.

### 기능: SkinnedMesh 바인딩
- **의도**: geometry·skeleton·뼈대를 하나로 묶어야 GPU 스키닝이 동작한다.
- **방식**: `THREE.Skeleton(bones)` 생성. `SkinnedMesh(geometry, material)`에 루트 뼈를 `add`하고 `mesh.bind(skeleton)` 호출.
- **주의**: 루트 뼈를 메시에 `add`하지 않으면 뼈가 씬 그래프에 없어 변형이 적용되지 않는다. 재질은 스키닝을 지원해야 한다(`MeshStandardMaterial` 등 표준 재질은 SkinnedMesh에서 자동 처리).
- **인수기준**: `mesh.skeleton`이 바인딩된 skeleton과 같다. `mesh.skeleton.bones.length === 2`.

### 기능: 관절 굽히기 (setBend)
- **의도**: 관절 각도를 바꾸면 위쪽 뼈에 웨이트가 실린 정점만 따라 움직여 메시가 휜다.
- **방식**: `setBend(angleRad)` 메서드가 `bone1.rotation.z`를 설정. 페이지의 슬라이더가 이 값을 실시간 제어.
- **인수기준**: `setBend(θ)` 호출 후 `bone1.rotation.z`가 `θ`와 같다(`toBeCloseTo`). **[사람 확인 필요]** 슬라이더를 움직이면 메시 상단이 관절 주변에서 부드럽게(각지지 않게) 휜다.

### 기능: 학습용 시각화 (SkeletonHelper + OrbitControls)
- **의도**: 뼈가 어디 있고 어떻게 도는지 눈으로 봐야 학습이 된다. 카메라를 돌려 다각도로 관찰한다.
- **방식**: `SkeletonHelper(mesh)`를 씬에 추가해 뼈대를 선으로 표시. `OrbitControls`로 카메라 조작(three/examples/jsm, 로컬 번들이라 CSP 무관).
- **주의**: 정리 시 helper·controls·geometry·material을 dispose하고 리스너를 해제한다(기존 페이지들의 cleanup 규약).
- **인수기준**: **[사람 확인 필요]** 뼈대 선이 보이고, 관절을 굽히면 뼈 선도 함께 꺾인다. 마우스 드래그로 카메라가 궤도 회전한다.

## 사람 확인 필요 (육안)
렌더링 결과·휘어짐의 매끄러움·헬퍼 표시·카메라 조작은 jsdom에서 검증 불가 →
`npm run dev`로 `/rigging`에서 육안 확인한다. 순수 계산(뼈 위치·스키닝 웨이트·setBend)만 자동 테스트한다.
