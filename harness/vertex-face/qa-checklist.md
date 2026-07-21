---
input_hash: 5e20f8680a4ccac4c9ce0a6b07eef5451948f7914a1e7282b16fdbf1afc88478
generated: 2026-07-21
spec: harness/vertex-face/spec.md
---

# QA 기능 체크리스트 — vertex-face (정점으로 면 만들기, 2D 들로네 삼각분할)

> 리비전 반영: 팬 → **들로네(Bowyer–Watson)** 로 삼각분할 교체. 들로네 로직은 Three.js 비의존
> 순수 모듈 `src/libs/delaunay.ts`(`@libs`)로 분리, `FaceMesh`가 `triangulate()`를 호출.
> `moveVertex`도 재삼각분할(rebuild)로 바뀜. `getTriangleEdges()`는 삼각분할 결과에서 무방향
> 중복 제거 에지를 뽑음(팬 때의 `2N-3` 공식이 아니라 실제 삼각분할 기반).

## 기능 체크리스트 (기획 의도로부터 독립 도출)

순수 계산(테스트 가능):

들로네 알고리즘 (`delaunay.ts`):
- N<3이면 빈 결과, 전부 공선이면 빈 결과, 전부 한 점 중복이면 빈 결과
- **겹침 없음**: 삼각형 넓이 합 == 볼록 껍질 넓이 (내부 점 포함해도 유지)
- **빈 외접원 성질**: 어떤 삼각형의 외접원 안에 다른 점이 엄격히 안 들어감
- **CCW**: 모든 삼각형의 부호 있는 넓이 > 0
- 비공선 3점 → 삼각형 1개, 입력 정점 {0,1,2} 모두 사용
- 볼록 사각형 → 삼각형 2개
- 사각형+중앙점(5점) → 삼각형 4개(중앙점이 네 모서리로 연결)
- 비공선 N≥3에서 모든 입력 점이 최소 한 삼각형에 등장(포함성)

FaceMesh 통합 (`FaceMesh.ts`):
- 2D 정점 목록 → `position` attribute: itemSize 3, `count === N`
- i번째 정점 position이 `(xᵢ, yᵢ, 0)` (z는 0으로 채움)
- 들로네 index: N=3 → count 3, 사각형 → count 6, 사각형+중앙점 → count 12
- N<3(0/1/2개) 또는 공선이면 면 없음 → `index` null
- 법선 존재: `normal` attribute가 정점 수만큼 존재
- CCW 삼각분할에서 정점 법선 z성분 ≈ +1
- `addVertex`: position.count +1, 삼각분할 재계산(N≥3부터 면 생성)
- 2개→3개 전이 순간 면이 생긴다(index null → count 3)
- `moveVertex(i,x,y)`: i번째 position만 `(x,y,0)`으로 갱신, 나머지 불변
- `removeVertex(i)`: position.count −1, 뒤 정점이 당겨짐
- `reset`: position.count 0, index null, 내부 목록 비움, 에지 빈 배열
- `getVertices`: 내부 상태 방어적 복사본 반환
- `getTriangleEdges()`: 삼각분할의 모든 삼각형 변을 무방향·중복 제거해 `[a,b][]`로 반환
- N<3이면 빈 배열
- N=3 → 변 3개, 무방향 중복 없음
- 사각형+중앙점(5점) → 외곽 4변 + 중앙점 스포크 4변 = **8개**
- 반환 에지 무방향 중복 없음, 인덱스는 정점 범위 안(a≠b)
- 정점 추가 시 에지 재계산

렌더링·상호작용(테스트 불가 — 육안 확인):
- `/vertex-face` 라우트 + 별도 페이지 컴포넌트 마운트
- 빈 곳 클릭 → 정점 추가, 3개부터 면이 채워짐
- **기존 면 안쪽에 점을 찍으면 그 자리에서 삼각형이 쪼개지고 면이 겹치지 않음(이번 리비전 목적)**
- 노란 점 드래그 → 정점 이동, 면 실시간 재삼각분할
- 삼각형 에지 `LineSegments`가 면 위에 얹혀 내부 변까지 화면에 보임
- 정투영(OrthographicCamera) top-down 2D 뷰
- 외곽선·정점 점·반투명 면 시각화, reset 버튼·정점 수 표시
- cleanup: geometry/material/헬퍼/컨트롤 dispose, 리스너 해제

## 커버리지 매트릭스

| QA 기능 항목 | 개발자 테스트 | 커버리지 | 사람 판단 |
|-------------|--------------|:---:|----------|
| **[들로네] N<3 → 빈 결과** | `delaunay.test.ts > "점 3개 미만이면 삼각형 없음"` | ✅ covered | — |
| **[들로네] 공선 점 → 빈 결과** | `delaunay.test.ts > "공선 점들은 면을 만들 수 없다"` | ✅ covered | — |
| **[들로네] 비공선 3점 → 삼각형 1개(CCW), {0,1,2} 사용** | `delaunay.test.ts > "비공선 3점은 삼각형 1개 (CCW)"` | ✅ covered | — |
| **[들로네] 겹침 없음: 사각형 넓이 합 = 껍질 넓이** | `delaunay.test.ts > "볼록 사각형은 삼각형 2개, 넓이 합 = 사각형 넓이"` | ✅ covered | — |
| **[들로네] 겹침 없음: 내부 점 포함해도 넓이 합 유지(리비전 목적)** | `delaunay.test.ts > "내부 점을 넣어도 넓이 합은 그대로"` | ✅ covered | — |
| **[들로네] 사각형+중앙점 → 삼각형 4개** | `delaunay.test.ts > "내부 점을 넣어도…"` (`flat.length === 4*3` 단언) | ✅ covered | — |
| **[들로네] 빈 외접원 성질** | `delaunay.test.ts > "들로네 성질: 어떤 삼각형의 외접원 안에도…"` | ✅ covered | 요검토(경미, 아래 메모) |
| **[들로네] 모든 삼각형 CCW** | `delaunay.test.ts > "내부 점을 넣어도…"` (`signedArea > 0` 루프) | ✅ covered | — |
| **[들로네] 포함성: 모든 입력 점이 삼각형에 등장** | `delaunay.test.ts > "비공선 N≥3에서 모든 입력 점이 최소 한 삼각형에 등장"` | ✅ covered | — |
| position.count === N | `FaceMesh.test.ts > "정점 N개를 주면 position.count === N"` | ✅ covered | — |
| i번째 position = (xᵢ,yᵢ,0) | `FaceMesh.test.ts > "i번째 정점의 position이 (xᵢ, yᵢ, 0)이다"` | ✅ covered | — |
| index: N=3 → count 3 | `FaceMesh.test.ts > "삼각형(N=3)은 삼각형 1개 → index.count 3"` | ✅ covered | — |
| index: 사각형 → count 6 | `FaceMesh.test.ts > "볼록 사각형은 삼각형 2개 → index.count 6"` | ✅ covered | — |
| index: 사각형+중앙점 → count 12 | `FaceMesh.test.ts > "내부 점을 넣으면 삼각형 4개로 쪼개진다"` | ✅ covered | — |
| N<3 → index null | `FaceMesh.test.ts > "정점 2개 이하면 면이 없다(index null)"` | ✅ covered | — |
| 공선 → index null | `FaceMesh.test.ts > "공선 점들은 면을 만들 수 없다(index null)"` | ✅ covered | — |
| normal 존재 & count === N | `FaceMesh.test.ts > "빌드 후 normal attribute가 정점 수만큼 존재한다"` | ✅ covered | — |
| CCW → 법선 z ≈ +1 | `FaceMesh.test.ts > "삼각형이 CCW라 정점 법선 z성분은 +1에 가깝다"` | ✅ covered | — |
| addVertex: count+1 & 재삼각분할 | `FaceMesh.test.ts > "addVertex는 position.count를 1 늘리고 삼각분할을 재계산한다"` | ✅ covered | — |
| 2→3 전이에 면 생성 | `FaceMesh.test.ts > "2개 → 3개(비공선)로 넘어가는 순간 면이 생긴다"` | ✅ covered | — |
| moveVertex: i번째만 갱신, 나머지 불변 | `FaceMesh.test.ts > "moveVertex는 i번째 좌표만 바꾼다"` | ✅ covered | — |
| moveVertex 후 재삼각분할·법선 재계산 | `FaceMesh.test.ts > "moveVertex는 재삼각분할한다(공선→비공선으로 옮기면 면이 생긴다)"` | ✅ covered | — |
| removeVertex: count−1 & 당김 | `FaceMesh.test.ts > "removeVertex는 position.count를 1 줄인다"` | ✅ covered | — |
| reset: count 0 & index null & 목록·에지 비움 | `FaceMesh.test.ts > "reset은 정점을 모두 비운다"` | ✅ covered | — |
| getVertices 방어적 복사 | `FaceMesh.test.ts > "getVertices는 현재 정점 목록의 복사본을 돌려준다"` | ✅ covered | — |
| **[에지] N<3 → 빈 배열** | `FaceMesh.test.ts > "N<3이면 빈 배열"` | ✅ covered | — |
| **[에지] N=3 → 변 3개, 무방향 중복 없음** | `FaceMesh.test.ts > "삼각형(N=3)은 변 3개, 중복 없음"` | ✅ covered | — |
| **[에지] 사각형+중앙점 → 8개(외곽 4 + 스포크 4)** | `FaceMesh.test.ts > "사각형+중앙점은 외곽 4변 + 중앙점 스포크 4변 = 8개"` | ✅ covered | — |
| **[에지] 반환 에지 무방향 중복 없음** | `FaceMesh.test.ts > "반환된 모든 에지는 무방향 중복이 없다"` | ✅ covered | — |
| **[에지] 인덱스가 정점 범위 안(a≠b)** | `FaceMesh.test.ts > "에지 인덱스는 실제 정점 범위 안에 있다"` | ✅ covered | — |
| **[에지] 정점 추가 시 재계산** | `FaceMesh.test.ts > "정점을 추가하면 에지도 재계산된다"` | ✅ covered | — |
| 생성자 initialVertices 방어적 복사 | (전용 테스트 없음 — 코드상 `.map()` 복사, `getVertices` 경로로만 간접 확인) | △ partial | 요검토(경미) |
| dispose 자원 해제 | (없음) | ❌ 누락 (테스트 가능하나 미검증) | 요검토(경미) |
| `/vertex-face` 라우트 등록 | (테스트 없음 — `App.tsx:17`에 정적 등록 확인됨) | △ 정적 확인 | — |
| **내부 점 클릭 시 삼각형 쪼개짐·겹침 없음(리비전 목적, 화면)** | (테스트 불가 — `VertexFace.tsx`가 `getTriangleEdges()`→`LineSegments` 배선, 계산부는 delaunay 테스트로 커버) | — 육안 확인 | 요검토 |
| 삼각형 에지 LineSegments 화면 표시(내부 변) | (테스트 불가 — `VertexFace.tsx:83,118` 배선 확인됨) | — 육안 확인 | 요검토 |
| 클릭 추가 / 드래그 이동 / reset 버튼 | (테스트 불가) | — 육안 확인 | 요검토 |
| 정투영 top-down 2D 뷰 | (테스트 불가) | — 육안 확인 | 요검토 |
| 외곽선/점/반투명 면 시각화 | (테스트 불가) | — 육안 확인 | 요검토 |
| 페이지 cleanup(dispose·리스너 해제) | (테스트 불가 — `VertexFace.tsx` cleanup 블록 코드상 확인) | — 육안/코드리뷰 | 요검토 |

## 메모 (비차단 · 조언)

- **들로네 핵심 인수기준은 전부 자동 커버**: 리비전이 고치려는 *겹침 버그*가 (1) 넓이 합 == 볼록 껍질 넓이(내부 점 포함), (2) 빈 외접원 성질, (3) CCW, (4) 사각형+중앙점 → 삼각형 4개, (5) `getTriangleEdges` 8개 — 다섯 항목 모두 전용 테스트로 검증됨. 순수 로직을 `@libs/delaunay`로 분리한 덕에 Three.js 없이 `delaunay.test.ts`에서 헐 넓이(모노톤 체인+신발끈)·in-circle 행렬식·부호 넓이로 불변식을 직접 단언한다. FaceMesh 쪽은 그 결과가 index/normal/edge 버퍼로 올바로 옮겨지는지를 통합 테스트한다. 계층 분리와 테스트 배치가 spec 의도(`delaunay.test.ts` 불변식 / `FaceMesh.test.ts` 통합)와 정확히 일치.

- **빈 외접원 테스트의 임계값 주의(경미)**: `delaunay.test.ts`의 in-circle 단언은 절대 임계 `eps*1e6`(=1)을 쓴다. in-circle 판정식이 좌표 4제곱 규모라 이 테스트 데이터(좌표 |값|≤5)에서는 진짜 내부 점이면 값이 그보다 훨씬 크게 나와 판별되지만, 절대 임계라 좌표 스케일이 커지면 느슨해질 수 있다. 현재 고정 데이터에서는 유효하며 성질 자체는 검증됨 — 조언 수준.

- **`moveVertex` 재삼각분할 커버 완료(이번 갱신)**: 이전에 △(부분)이던 항목이 이제 `FaceMesh.test.ts`의 전용 테스트로 `✅`. 공선 3점(면 없음, index null) → 가운데 점을 선 밖으로 `moveVertex` → `index.count 3`으로 삼각형이 생기는지 단언한다. 리비전 인수기준(`moveVertex`가 index 유지가 아니라 위치 변화 시 **재빌드**한다)이 결과로 검증됨.

- **경미한 갭 2건(모두 테스트 가능하지만 선택적)**:
  1. 생성자 `initialVertices`의 방어적 복사(호출자 배열/객체 변경이 내부에 안 새는지)는 `getVertices` 경로로만 간접 확인.
  2. `dispose()`가 geometry/material을 해제하는지 검증 테스트 없음(스파이로 검증 가능).

- **페이지 상호작용(클릭 추가·드래그 이동·내부 점 클릭 시 겹침 없이 쪼개짐·정투영)은 spec이 명시적으로 `[사람 확인 필요]`** → WebGL 필요, jsdom 검증 불가. 겹침 없음의 *계산적 근거*는 delaunay 테스트가 커버하나, 화면에서 실제로 그렇게 보이는지는 `npm run dev`로 `/vertex-face`에서 육안 확인 대상.

- `/vertex-face` 라우트는 `App.tsx`에 정적 등록(`import VertexFace` + `<Route path="/vertex-face">`), 페이지는 `getTriangleEdges()`→`LineSegments`로 내부 변 시각화 배선 확인됨(자동 테스트는 없음, 정적 확인).
