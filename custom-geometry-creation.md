# 커스텀 지오메트리 생성 방식 상세 설명

커스텀 지오메트리 생성 방식은 Three.js에서 제공하는 기본 지오메트리(CylinderGeometry 등)를 사용하는 대신, 손가락의 해부학적 특성을 반영한 지오메트리를 처음부터 직접 구축하는 방법입니다. 이 방식을 통해 마디 부분이 두꺼운 실제 손가락의 형태를 정확하게 표현할 수 있습니다.

## 1. 정점(Vertices) 직접 정의 - 상세 과정

### 정점 생성 알고리즘

```
1. 손가락의 중심축(y축)을 따라 여러 개의 단면(cross-section)을 정의합니다.
2. 각 단면의 위치에서 반지름을 결정합니다.
   - 마디 위치: 더 큰 반지름 (예: 기본 반지름의 1.2~1.5배)
   - 마디 사이: 기본 반지름
3. 각 단면에서 원주를 따라 여러 개의 정점을 균등하게 배치합니다.
```

### 반지름 변화 함수 정의

마디 위치에서 반지름이 더 크게 되도록 하는 함수를 정의합니다:

```typescript
function calculateRadius(y: number): number {
  // 각 마디의 y 위치 계산 (0번째 마디부터 시작)
  const jointPositions: number[] = [];
  for (let i = 0; i <= segmentCount; i++) {
    jointPositions.push(i * segmentLength);
  }

  // 현재 y 위치에서 가장 가까운 마디까지의 거리 계산
  let minDistance = Number.MAX_VALUE;
  for (const jointPos of jointPositions) {
    const distance = Math.abs(y - jointPos);
    minDistance = Math.min(minDistance, distance);
  }

  // 거리에 따른 반지름 계산
  // 마디에 가까울수록 반지름이 커지고, 멀어질수록 기본 반지름에 가까워짐
  const maxRadiusMultiplier = 1.4; // 마디에서의 반지름 증가 비율
  const falloffDistance = segmentLength * 0.3; // 반지름 감소 거리

  const radiusMultiplier =
    1 +
    (maxRadiusMultiplier - 1) * Math.max(0, 1 - minDistance / falloffDistance);

  return baseRadius * radiusMultiplier;
}
```

### 정점 배열 생성 코드

```typescript
function createVertices(): Float32Array {
  const radialSegments = 8; // 원주 방향 분할 수
  const heightSegments = segmentCount * 4; // 높이 방향 분할 수

  const vertices: number[] = [];

  // 각 높이 단계마다
  for (let y = 0; y <= heightSegments; y++) {
    // y 위치 계산 (0부터 손가락 전체 길이까지)
    const posY = (y / heightSegments) * (segmentLength * segmentCount);

    // 현재 y 위치에서의 반지름 계산
    const radius = calculateRadius(posY);

    // 원주를 따라 정점 생성
    for (let x = 0; x <= radialSegments; x++) {
      // 원주 각도 계산 (0부터 2π까지)
      const theta = (x / radialSegments) * Math.PI * 2;

      // 극좌표계를 직교좌표계로 변환
      const vertexX = radius * Math.cos(theta);
      const vertexZ = radius * Math.sin(theta);

      // 정점 추가 (x, y, z 좌표)
      vertices.push(vertexX, posY, vertexZ);
    }
  }

  return new Float32Array(vertices);
}
```

## 2. 정점 인덱스(Indices) 설정 - 상세 과정

정점들을 연결하여 삼각형 면을 형성하는 인덱스 배열을 생성합니다. 이 과정은 원통형 메시의 표면을 구성하는 데 필수적입니다.

### 인덱스 생성 알고리즘

```
1. 각 높이 단계와 원주 위치에 대해 사각형(quad)을 형성합니다.
2. 각 사각형은 두 개의 삼각형으로 분할됩니다.
3. 삼각형은 세 개의 정점 인덱스로 정의됩니다.
```

### 인덱스 배열 생성 코드

```typescript
function createIndices(): Uint16Array | Uint32Array {
  const radialSegments = 8;
  const heightSegments = segmentCount * 4;

  const indices: number[] = [];

  // 각 높이 단계마다 (마지막 단계 제외)
  for (let y = 0; y < heightSegments; y++) {
    // 각 원주 위치마다 (마지막 위치 제외)
    for (let x = 0; x < radialSegments; x++) {
      // 현재 사각형의 네 꼭지점 인덱스 계산
      const a = y * (radialSegments + 1) + x;
      const b = a + 1;
      const c = a + (radialSegments + 1);
      const d = c + 1;

      // 두 개의 삼각형으로 사각형 형성
      indices.push(a, b, c); // 첫 번째 삼각형
      indices.push(b, d, c); // 두 번째 삼각형
    }
  }

  // 정점 수에 따라 적절한 타입의 배열 반환
  return indices.length > 65535
    ? new Uint32Array(indices)
    : new Uint16Array(indices);
}
```

## 3. 법선 벡터(Normals) 계산 - 상세 과정

법선 벡터는 각 정점에서 표면에 수직인 방향을 가리키는 벡터로, 조명 계산에 필수적입니다. 특히 마디 부분처럼 곡률이 변하는 부분에서 부드러운 음영 처리를 위해 정확한 법선 계산이 중요합니다.

### 법선 계산 방법

1. **자동 계산 방식**: Three.js의 `computeVertexNormals()` 메서드를 사용하여 자동으로 계산할 수 있습니다. 이 방식은 각 정점에 연결된 면들의 법선 벡터를 평균하여 계산합니다.

2. **수동 계산 방식**: 더 정확한 결과를 위해 각 정점의 법선을 직접 계산할 수 있습니다.

### 수동 법선 계산 코드

```typescript
function calculateNormals(
  vertices: Float32Array,
  indices: Uint16Array | Uint32Array
): Float32Array {
  const normals = new Float32Array(vertices.length);

  // 모든 법선을 0으로 초기화
  for (let i = 0; i < normals.length; i++) {
    normals[i] = 0;
  }

  // 각 삼각형마다
  for (let i = 0; i < indices.length; i += 3) {
    // 삼각형의 세 정점 인덱스
    const idx1 = indices[i] * 3;
    const idx2 = indices[i + 1] * 3;
    const idx3 = indices[i + 2] * 3;

    // 삼각형의 세 정점 좌표
    const v1 = new THREE.Vector3(
      vertices[idx1],
      vertices[idx1 + 1],
      vertices[idx1 + 2]
    );
    const v2 = new THREE.Vector3(
      vertices[idx2],
      vertices[idx2 + 1],
      vertices[idx2 + 2]
    );
    const v3 = new THREE.Vector3(
      vertices[idx3],
      vertices[idx3 + 1],
      vertices[idx3 + 2]
    );

    // 두 변 벡터 계산
    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);

    // 외적으로 면의 법선 계산
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    // 삼각형의 세 정점에 법선 누적
    normals[idx1] += normal.x;
    normals[idx1 + 1] += normal.y;
    normals[idx1 + 2] += normal.z;

    normals[idx2] += normal.x;
    normals[idx2 + 1] += normal.y;
    normals[idx2 + 2] += normal.z;

    normals[idx3] += normal.x;
    normals[idx3 + 1] += normal.y;
    normals[idx3 + 2] += normal.z;
  }

  // 누적된 법선 정규화
  for (let i = 0; i < normals.length; i += 3) {
    const nx = normals[i];
    const ny = normals[i + 1];
    const nz = normals[i + 2];

    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);

    if (length > 0) {
      normals[i] = nx / length;
      normals[i + 1] = ny / length;
      normals[i + 2] = nz / length;
    }
  }

  return normals;
}
```

## 4. UV 좌표 매핑 - 상세 과정

UV 좌표는 3D 모델의 표면에 2D 텍스처를 매핑하는 데 사용됩니다. 손가락 텍스처를 적용하거나 마디 부분에 특별한 시각적 효과를 주기 위해 필요합니다.

### UV 매핑 방식

원통형 UV 매핑을 사용하여 텍스처가 손가락 표면에 자연스럽게 감기도록 합니다:

- U 좌표: 원주 방향 (0~1)
- V 좌표: 높이 방향 (0~1)

### UV 좌표 생성 코드

```typescript
function createUVs(): Float32Array {
  const radialSegments = 8;
  const heightSegments = segmentCount * 4;

  const uvs: number[] = [];

  // 각 높이 단계마다
  for (let y = 0; y <= heightSegments; y++) {
    // v 좌표 계산 (0부터 1까지)
    const v = y / heightSegments;

    // 각 원주 위치마다
    for (let x = 0; x <= radialSegments; x++) {
      // u 좌표 계산 (0부터 1까지)
      const u = x / radialSegments;

      // UV 좌표 추가
      uvs.push(u, v);
    }
  }

  return new Float32Array(uvs);
}
```

## 5. 커스텀 지오메트리 생성 및 적용

위에서 계산한 정점, 인덱스, 법선, UV 좌표를 사용하여 BufferGeometry를 생성하고 이를 SkinnedMesh에 적용합니다.

### 전체 지오메트리 생성 코드

```typescript
function createFingerGeometry(): THREE.BufferGeometry {
  // 새 BufferGeometry 생성
  const geometry = new THREE.BufferGeometry();

  // 정점 위치 계산 및 설정
  const vertices = createVertices();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

  // 인덱스 계산 및 설정
  const indices = createIndices();
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  // UV 좌표 계산 및 설정
  const uvs = createUVs();
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

  // 법선 계산 및 설정
  // 방법 1: 자동 계산
  geometry.computeVertexNormals();

  // 방법 2: 수동 계산
  // const normals = calculateNormals(vertices, indices);
  // geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

  return geometry;
}
```

## 6. 가중치 설정 - 마디 형태에 맞춘 조정

커스텀 지오메트리에 맞게 가중치 설정 로직도 조정해야 합니다. 특히 마디 부분이 두꺼워진 형태에서는 가중치 계산 방식도 그에 맞게 수정되어야 합니다.

```typescript
function calculateSkinWeights(geometry: THREE.BufferGeometry): void {
  const positions = geometry.attributes.position;
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];

  // 각 정점에 대해
  for (let i = 0; i < positions.count; i++) {
    // 정점의 y 위치 (손가락 길이 방향)
    const y = positions.getY(i);

    // 정규화된 위치 (0~1)
    const normalizedY = y / (segmentLength * segmentCount);

    // 영향을 받는 본 인덱스 계산
    const boneIndex = Math.min(
      Math.floor(normalizedY * segmentCount),
      segmentCount - 1
    );

    // 인접한 본과의 혼합 가중치 계산
    // 마디 부분에서는 두 본의 영향을 더 부드럽게 혼합
    const bonePosition = boneIndex * segmentLength;
    const nextBonePosition = (boneIndex + 1) * segmentLength;

    // 현재 본과 다음 본 사이에서의 상대적 위치 (0~1)
    const blendFactor = (y - bonePosition) / segmentLength;

    // 마디 근처에서 가중치 조정
    let weight1 = 1.0 - blendFactor; // 현재 본 가중치
    let weight2 = blendFactor; // 다음 본 가중치

    // 마디 부분에서 가중치 혼합 강화
    if (
      Math.abs((y % segmentLength) - segmentLength * 0.5) <
      segmentLength * 0.2
    ) {
      // 마디 부분에 가까울 때 두 본의 영향을 더 균등하게 분배
      weight1 = Math.max(0.3, Math.min(0.7, weight1));
      weight2 = 1.0 - weight1;
    }

    // 가중치 설정 (최대 4개 본에 영향 가능)
    if (boneIndex < segmentCount - 1) {
      // 현재 본과 다음 본에 영향
      skinIndices.push(boneIndex, boneIndex + 1, 0, 0);
      skinWeights.push(weight1, weight2, 0, 0);
    } else {
      // 마지막 본에만 영향
      skinIndices.push(boneIndex, 0, 0, 0);
      skinWeights.push(1, 0, 0, 0);
    }
  }

  // 가중치 정보를 지오메트리에 추가
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(new Uint16Array(skinIndices), 4)
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(new Float32Array(skinWeights), 4)
  );
}
```

## 7. 구현 시 고려사항 및 최적화

### 성능 최적화

- 정점 수를 적절히 조절하여 성능과 시각적 품질 사이의 균형을 유지합니다.
- 특히 모바일 환경에서는 radialSegments와 heightSegments 값을 낮추는 것이 좋습니다.

### 메모리 관리

- 큰 배열을 생성할 때는 TypedArray(Float32Array, Uint16Array 등)를 사용하여 메모리 효율성을 높입니다.
- 불필요한 임시 객체 생성을 최소화합니다.

### 디버깅 팁

- 개발 중에는 wireframe 모드를 활성화하여 지오메트리 구조를 시각적으로 확인합니다.
- 법선 벡터를 시각화하여 조명 계산이 올바르게 이루어지는지 확인합니다.

이러한 방식으로 커스텀 지오메트리를 생성하면, 마디 부분이 두꺼운 실제 손가락과 유사한 형태의 SkinnedMesh를 구현할 수 있습니다. 이 접근법은 구현 복잡도가 높지만, 가장 정확하고 유연한 결과를 제공합니다.
