---
input_hash: 980f5c4d7891bbe37296ac8b0b7e35c5780c8041dedae816fd595b64c5d00a6d
generated: 2026-07-21
spec: harness/vertex-face-3d/spec.md
---

# QA 기능 체크리스트 — vertex-face-3d

## 기능 체크리스트 (기획 의도로부터 독립 도출)

3D 공간의 정점과 삼각형 면을 수동으로 정의하는 메시의 핵심 기능:

- 3D 정점 좌표(x, y, z) → position 버퍼 변환
- 정점 배열의 방어적 복사 (호출자 변형 방지)
- 정점 3개를 선택해 삼각형 면 추가
- 면 추가 시 인덱스 검증 (범위, 축퇴, 중복)
- 클릭 순서(winding) 보존
- Index 버퍼 생성 및 유지
- 면 제거 시 Index 재계산
- 면 배열의 방어적 복사
- 법선 벡터 계산 (조명 대응)
- 3개 작업 평면 정의 (ground y=0, front z=0, side x=0)
- 광선과 작업 평면의 교차점 계산
- 교차 실패 케이스 처리 (평행, 역방향)
- 면 에지 추출 및 중복 제거
- 정점 추가
- 정점 이동
- 정점 제거 및 인덱스 재매핑
- 모든 정점·면 초기화
- 3D 궤도 회전 및 관찰 (Orbit 카메라)
- 작업 평면 실시간 토글
- 클릭으로 평면 위에 정점 배치
- 3점 순차 선택으로 면 생성
- 정점·면·에지 시각화 (표식, 선, 반투명 면)

## 커버리지 매트릭스

| QA 기능 항목 | 개발자 테스트 | 커버리지 | 사람 판단 |
|-------------|--------------|:---:|----------|
| 3D position 버퍼 (z 포함) | `FaceMesh3D.test.ts > "i번째 정점 position이..."` | ✅ covered | — |
| 정점 배열 방어적 복사 | `FaceMesh3D.test.ts > "getVertices는 방어적..."` | ✅ covered | — |
| 면 추가 (유효한 입력) | `FaceMesh3D.test.ts > "addFace(0,1,2)..."` | ✅ covered | — |
| 다중 면 추가 | `FaceMesh3D.test.ts > "면 2개..."` | ✅ covered | — |
| 클릭 순서(winding) 보존 | `FaceMesh3D.test.ts > "winding(클릭 순서)..."` | ✅ covered | — |
| 인덱스 범위 검증 | `FaceMesh3D.test.ts > "범위 밖 인덱스..."` | ✅ covered | — |
| 인덱스 타입 검증 (음수·비정수) | `FaceMesh3D.test.ts > "음수·비정수..."` | ✅ covered | — |
| 축퇴 삼각형 거부 (중복 인덱스) | `FaceMesh3D.test.ts > "반복 인덱스..."` | ✅ covered | — |
| 중복 면 거부 (무순서 조합) | `FaceMesh3D.test.ts > "이미 있는 무순서..."` | ✅ covered | — |
| Index 버퍼 생성 | `FaceMesh3D.test.ts > "addFace(0,1,2)...", "면 2개..."` | ✅ covered | — |
| 면 없을 때 Index null | `FaceMesh3D.test.ts > "면이 없으면 index..."` | ✅ covered | — |
| 면 배열 방어적 복사 | `FaceMesh3D.test.ts > "getFaces는 방어적..."` | ✅ covered | — |
| 면 제거 및 Index 재계산 | `FaceMesh3D.test.ts > "removeFace(0)..."` | ✅ covered | — |
| 법선 계산 (면 존재 시) | `FaceMesh3D.test.ts > "면 1개 이상..."` | ✅ covered | — |
| 법선 방향 정확성 | `FaceMesh3D.test.ts > "xy평면 CCW..."` | ✅ covered | — |
| ground 평면 정의 | `workPlane.test.ts > "ground 평면은..."` | ✅ covered | — |
| front 평면 정의 | `workPlane.test.ts > "front 평면은..."` | ✅ covered | — |
| side 평면 정의 | `workPlane.test.ts > "side 평면은..."` | ✅ covered | — |
| 광선-평면 교차점 (ground) | `workPlane.test.ts > "바닥 평면 위로..."` | ✅ covered | — |
| 광선-평면 교차점 (front) | `workPlane.test.ts > "front 평면(z=0)..."` | ✅ covered | — |
| 광선-평면 교차점 (side) | `workPlane.test.ts > "side 평면(x=0)..."` | ✅ covered | — |
| 평행 광선 처리 | `workPlane.test.ts > "평면과 평행한..."` | ✅ covered | — |
| 역방향 광선 처리 | `workPlane.test.ts > "평면 뒤쪽으로..."` | ✅ covered | — |
| 면 에지 추출 (면 없음) | `FaceMesh3D.test.ts > "면이 없으면 빈..."` | ✅ covered | — |
| 면 에지 추출 (사면체) | `FaceMesh3D.test.ts > "사면체(면 4개)..."` | ✅ covered | — |
| 에지 중복 제거 | `FaceMesh3D.test.ts > "반환된 에지는..."` | ✅ covered | — |
| 정점 추가 | `FaceMesh3D.test.ts > "addVertex는..."` | ✅ covered | — |
| 정점 이동 | `FaceMesh3D.test.ts > "moveVertex는..."` | ✅ covered | — |
| 정점 제거 + 참조 면 삭제 | `FaceMesh3D.test.ts > "removeVertex는..."` | ✅ covered | — |
| 정점 제거 후 인덱스 유효성 | `FaceMesh3D.test.ts > "removeVertex 후..."` | ✅ covered | — |
| 초기화 (reset) | `FaceMesh3D.test.ts > "reset은..."` | ✅ covered | — |
| 3D 궤도 회전 관찰 | (없음) | — 육안 확인 | 요검토 |
| 작업 평면 실시간 토글 | (없음) | — 육안 확인 | 요검토 |
| 평면 위 정점 배치 (깊이 고정) | (없음) | — 육안 확인 | 요검토 |
| 3점 순차 선택 → 면 생성 | (없음) | — 육안 확인 | 요검토 |
| 정점·면·에지 시각화 | (없음) | — 육안 확인 | 요검토 |

---

## 분석 노트

### 자동 검증 커버리지 (✅ 100%)
**순수 계산 로직**은 모두 테스트 됨:
- 3D 정점 관리: position 버퍼, 좌표 유지, 방어적 복사
- 면 관리: 추가/제거, 인덱스 검증, winding 보존, 중복 제거, Index 버퍼
- 법선: 계산, 방향성
- 작업 평면: 정의, 광선 교차, 엣지 케이스
- 정점 편집: add/move/remove (인덱스 재매핑 포함), reset

### 육안 확인 필요 (WebGL 렌더링)
다음 기능은 **jsdom에서 WebGL 컨텍스트 부재로 검증 불가** → `npm run dev` 로 `/vertex-face-3d`에서 육안 확인:
- PerspectiveCamera + OrbitControls 동작
- GridHelper 또는 평면 시각화
- Points 마커 렌더링
- LineSegments 에지 표시
- 반투명 MeshStandardMaterial 표현
- 마우스 클릭→광선 생성→평면 교차 배치의 실제 흐름
- 3점 선택 UI 반응성

### 추가 지적 사항
- **인덱스 재매핑**: `removeVertex` 구현이 정점 삭제 후 남은 면의 인덱스를 정확히 보정하는지 검증 (spec 난점). 테스트에서 "removeVertex 후 남은 면 인덱스가 새 정점 배열 범위 안에 있다"로 충분히 커버됨.
- **정점 공선(면적 0) 삼각형**: spec에서 "렌더 시 사라지지만 오류 아님"으로 명시 — 면 추가 검증에서 부자연스럽게 느껴져도 무시(시각적 품질은 육안 확인).
- **Winding 방향**: 사용자 클릭 순서를 보존하면 조명이 순서에 따라 달라질 수 있음 — 재질이 `DoubleSide`이므로 렌더는 되지만, 정확한 법선 방향은 육안으로만 확인 가능.
