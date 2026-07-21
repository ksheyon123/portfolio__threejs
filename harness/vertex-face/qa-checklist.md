---
input_hash: 26ddf5b7a8a9740fc32e5e4a1f4d4710bc6ef2ed3d0d5ae4db15ea3ef6d25b50
generated: 2026-07-21
spec: harness/vertex-face/spec.md
---

# QA 기능 체크리스트 — vertex-face (정점으로 면 만들기, 2D 팬 삼각분할)

## 기능 체크리스트 (기획 의도로부터 독립 도출)

순수 계산(테스트 가능):
- 2D 정점 목록 → `position` attribute: itemSize 3, `count === N`
- i번째 정점의 position이 `(xᵢ, yᵢ, 0)` (z는 0으로 채움)
- 팬 삼각분할: N≥3에서 `index.count === (N-2)*3`
- 팬 인덱스 배치: k번째 삼각형이 `[0, k+1, k+2]`
- N<3(정점 0/1/2개)이면 면 없음 → `index` 미설정(null)
- 법선 존재: `normal` attribute가 정점 수만큼 존재
- CCW 볼록 다각형에서 정점 법선 z성분 ≈ +1
- `addVertex`: position.count +1, index 재계산 (N≥3부터 삼각형 생성)
- 2개→3개 전이 순간 면이 생긴다(index null → count 3)
- `moveVertex(i,x,y)`: i번째 position만 `(x,y,0)`으로 갱신, 나머지 불변
- `moveVertex` 후 법선 재계산(정점 수 불변이면 index 유지)
- `removeVertex(i)`: position.count −1, 뒤 정점이 당겨짐
- `reset`: position.count 0, index null, 내부 목록 비움
- `getVertices`: 내부 상태 방어적 복사본 반환
- (자원 정리) `dispose`가 geometry/material 해제

렌더링·상호작용(테스트 불가 — 육안 확인):
- `/vertex-face` 라우트 + 별도 페이지 컴포넌트 마운트
- 빈 곳 클릭 → 정점 추가, 3개부터 면이 채워짐
- 노란 점 드래그 → 정점 이동, 면 실시간 갱신
- 외곽선(LineLoop)·정점 점(Points)·반투명 면 시각화
- 정투영(OrthographicCamera) top-down 2D 뷰
- reset 버튼 · 정점 수 표시
- 오목 다각형에서 팬 삼각형이 면 밖으로 삐져나오는지(향후 ear-clipping)
- cleanup: geometry/material/헬퍼/컨트롤 dispose, 리스너 해제

## 커버리지 매트릭스

| QA 기능 항목 | 개발자 테스트 | 커버리지 | 사람 판단 |
|-------------|--------------|:---:|----------|
| position.count === N | `FaceMesh.test.ts > "정점 N개를 주면 position.count === N"` | ✅ covered | — |
| i번째 position = (xᵢ,yᵢ,0) | `FaceMesh.test.ts > "i번째 정점의 position이 (xᵢ, yᵢ, 0)이다"` | ✅ covered | — |
| N≥3 index.count === (N-2)*3 | `FaceMesh.test.ts > "N≥3이면 index.count === (N-2)*3"` | ✅ covered | — |
| 팬 인덱스 배치 [0,k+1,k+2] | `FaceMesh.test.ts > "k번째 삼각형의 인덱스가 [0, k+1, k+2]다"` | ✅ covered | — |
| N=3 → 삼각형 1개 | `FaceMesh.test.ts > "삼각형(N=3)은 삼각형 1개"` | ✅ covered | — |
| N<3 → index null | `FaceMesh.test.ts > "정점 2개 이하면 면이 없다(index null)"` | ✅ covered | — |
| normal 존재 & count === N | `FaceMesh.test.ts > "빌드 후 normal attribute가 정점 수만큼 존재한다"` | ✅ covered | — |
| CCW 볼록 → 법선 z ≈ +1 | `FaceMesh.test.ts > "CCW 볼록 다각형의 정점 법선 z성분은 +1에 가깝다"` | ✅ covered | — |
| addVertex: count+1 & index 재계산 | `FaceMesh.test.ts > "addVertex는 position.count를 1 늘리고 index를 재계산한다"` | ✅ covered | — |
| 2→3 전이에 면 생성 | `FaceMesh.test.ts > "2개 → 3개로 넘어가는 순간 면이 생긴다"` | ✅ covered | — |
| moveVertex: i번째만 갱신, 나머지 불변 | `FaceMesh.test.ts > "moveVertex는 i번째 좌표만 바꾼다"` | ✅ covered | — |
| moveVertex 후 법선 재계산 | (전용 테스트 없음 — 코드상 `computeVertexNormals()` 호출) | △ partial (동작은 존재, 결과 미단언) | 요검토 |
| removeVertex: count−1 & 당김 | `FaceMesh.test.ts > "removeVertex는 position.count를 1 줄인다"` | ✅ covered | — |
| reset: count 0 & index null & 목록 비움 | `FaceMesh.test.ts > "reset은 정점을 모두 비운다"` | ✅ covered | — |
| getVertices 방어적 복사 | `FaceMesh.test.ts > "getVertices는 현재 정점 목록의 복사본을 돌려준다"` | ✅ covered | — |
| 생성자 initialVertices 방어적 복사 | (전용 테스트 없음 — `getVertices` 복사만 검증) | △ partial | 요검토(경미) |
| dispose 자원 해제 | (없음) | ❌ 누락 (테스트 가능하나 미검증) | 요검토(경미) |
| `/vertex-face` 라우트 등록 | (테스트 없음 — `App.tsx`에 정적 등록 확인됨) | △ 정적 확인 | — |
| 클릭 추가 / 드래그 이동 / reset 버튼 | (테스트 불가) | — 육안 확인 | 요검토 |
| 정투영 top-down 2D 뷰 | (테스트 불가) | — 육안 확인 | 요검토 |
| 외곽선/점/반투명 면 시각화 | (테스트 불가) | — 육안 확인 | 요검토 |
| 오목 다각형 팬 삐져나옴(향후 ear-clipping) | (범위 밖) | — 육안 확인 | 요검토 |
| 페이지 cleanup(dispose·리스너 해제) | (테스트 불가) | — 육안/코드리뷰 | 요검토 |

## 메모 (비차단 · 조언)

- **순수 계산 커버리지는 강함**: spec의 4개 계산 기능(position / 팬 index / 법선 / add·move·remove·reset)의 핵심 인수기준이 모두 자동 테스트로 검증됨. `❌ 누락`은 없고 `△`만 소수.
- **경미한 갭 3건(모두 테스트 가능하지만 선택적)**:
  1. `moveVertex` 후 법선 재계산이 실제로 반영됐는지(예: 정점을 뒤집어 z 부호 변화) 결과 단언이 없다. 현재는 위치 갱신만 단언.
  2. 생성자에 넘긴 `initialVertices`의 방어적 복사(호출자 배열 변경이 내부에 안 새는지)는 `getVertices` 경로로만 간접 확인됨.
  3. `dispose()`가 geometry/material을 해제하는지 검증하는 테스트가 없다(스파이로 검증 가능).
- **5번째 기능(페이지 상호작용)은 spec이 명시적으로 `[사람 확인 필요]`**로 표시 → WebGL 필요, jsdom 검증 불가. `npm run dev`로 `/vertex-face`에서 육안 확인 대상.
- `/vertex-face` 라우트는 `App.tsx`에 정적으로 등록되어 있음(자동 테스트는 없으나 코드상 확인됨).
