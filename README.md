# ts-to-mock

프로젝트 내 TypeScript 타입 파일을 전체 스캔해 `mocks` 객체 하나로 묶어 export하는 CLI 도구입니다.

```bash
ts-to-mock ./src -o ./src/mocks/index.ts
```

```ts
// src/mocks/index.ts (자동 생성)
import { UserRole, type User, type Product, ... } from "../types/api"

export const mocks = {
  UserMock: {
    id: "a3f2c1d4-...",
    name: "Alice Smith",
    email: "alice@example.com",
    role: UserRole.Admin,
    ...
  } as User,
  ProductMock: {
    title: "lorem ipsum",
    price: 42,
    ...
  } as Product,
  ...
}
```

---

## 설치 및 실행

### 로컬 개발 중 (빌드 없이)

```bash
npm install
npm run cli -- ./src -o ./src/mocks/index.ts
```

### npm link (전역 등록)

```bash
npm link
ts-to-mock ./src -o ./src/mocks/index.ts
```

---

## 사용법

```bash
ts-to-mock <dir> [options]
```

### 인수

| 인수 | 설명 |
|---|---|
| `<dir>` | 스캔할 프로젝트 루트 디렉터리 (필수) |

### 옵션

| 옵션 | 설명 | 기본값 |
|---|---|---|
| `-o, --out <file>` | 출력 파일 경로 (미지정 시 stdout) | - |
| `-e, --exclude <dirs...>` | 추가로 제외할 디렉터리명 | - |

`node_modules`, `dist`, `build`, `.git`, `coverage`, `.next`, `.nuxt`는 기본으로 제외됩니다.

---

## 예시

### stdout 출력

```bash
ts-to-mock ./src
```

### 파일로 저장

```bash
ts-to-mock ./src -o ./src/mocks/index.ts
```

### 추가 디렉터리 제외

```bash
ts-to-mock ./src -o ./src/mocks/index.ts -e __tests__ fixtures
```

---

## 출력 형식

모든 타입의 mock이 `mocks` 객체 하나에 담깁니다.  
키 이름은 `TypeNameMock` (접미사) 형식입니다.

```ts
export const mocks = {
  UserMock:    { ... } as User,
  ProductMock: { ... } as Product,
  UserRoleMock: UserRole.Admin as UserRole,   // enum
}
```

타입 단언은 TypeScript 컴파일러로 검증 후 결정됩니다.
- 대부분 `as TypeName`
- 내장 라이브러리 타입의 심볼 프로퍼티(`[Symbol.toStringTag]` 등) 문제가 있는 경우만 `as unknown as TypeName`

파일 저장 시 import가 자동 생성됩니다. enum은 런타임 값이 필요하므로 `type` 없이, 나머지는 `type`으로 임포트됩니다:

```ts
import { UserRole, type User, type Product } from "../types/api"
```

---

## 프로젝트 구조

```
src/
  cli/index.ts          CLI 진입점
  core/ast-to-mock.ts   mock 생성 코어 (TypeScript AST + faker)
  types/                예시 TypeScript 타입 파일
  mocks/index.ts        생성된 mock 파일 (-o 옵션 사용 시)
```

---

## 동작 원리

```
디렉터리 스캔
  → .ts / .tsx 파일 수집 (테스트·스토리 파일 제외)
  → ts.createProgram()     전체 프로그램 빌드 (tsconfig.json 자동 탐색)
  → TypeChecker            TypeReference는 선언 컨텍스트 기반으로 해석
  → faker                  필드 타입 및 이름에 맞는 랜덤 데이터 생성
  → 1차: as TypeName 생성 후 컴파일러 검증
  → 실패한 타입만 as unknown as TypeName으로 교체
  → export const mocks = { TypeNameMock: {...} as TypeName, ... }
```

### 타입 해석 흐름

```
TypeReference 만날 때
  ├─ 내장 유틸리티 (Partial, Pick, Omit, Promise ...)  → 직접 처리
  ├─ TypeChecker로 선언 탐색 (컨텍스트 정확도 우선)
  │    ├─ InterfaceDeclaration  → 프로퍼티 전개
  │    ├─ TypeAliasDeclaration  → 타입 노드 재귀 전개
  │    ├─ EnumDeclaration       → 멤버 중 랜덤 선택
  │    └─ ClassDeclaration      → 프로퍼티 전개
  └─ typeMap fallback (TypeChecker 실패 시)
```

여러 파일에 같은 타입명이 존재할 경우, 알파벳 순서상 먼저 처리된 파일의 정의를 사용합니다.

---

## 지원 범위

| 항목 | 지원 여부 |
|---|---|
| `interface`, `type alias`, `enum` | ✓ |
| `union`, `intersection`, `tuple` | ✓ |
| `Partial` / `Required` / `Readonly` / `Pick` / `Omit` / `Promise` / `Array<T>` | ✓ |
| `interface extends` 상속 필드 | ✓ |
| 프로젝트 내 모든 파일 자동 탐색 | ✓ |
| node_modules 외부 패키지 타입 | ✓ TypeChecker로 추적 |
| `A.B` 네임스페이스 타입 (`WebAssembly.Memory` 등) | ✓ TypeChecker로 추적 |
| 함수 타입 필드 (`() => void` 등) | ✓ `() => {}` 스텁 생성 |
| 인터페이스 메서드 시그니처 | ✓ `() => {}` 스텁 생성 |
| 순환 참조 타입 | ✓ 자동 차단 (depth limit 6) |
| `Extract`, `Exclude`, `ReturnType` 등 고급 유틸리티 | △ `{}` 로 생성됨 |

---

## 필드명 기반 데이터 생성

필드명을 인식해 의미 있는 값을 생성합니다:

| 패턴 | 예시 필드명 | 생성 값 |
|---|---|---|
| 정확히 일치 | `name`, `email`, `company`, `phone` | faker 대응값 |
| 정확히 일치 | `id` | UUID |
| 정확히 일치 | `timezone`, `locale`, `slug`, `ip`, `mimeType` | 대응값 |
| `*Id` 접미사 | `userId`, `teamId`, `projectId` | UUID |
| `*At` 접미사 | `createdAt`, `updatedAt`, `joinedAt` | ISO 날짜 문자열 |
| `*Date` 접미사 | `startDate`, `endDate`, `dueDate` | ISO 날짜 문자열 |
| `*Url` 접미사 | `avatarUrl`, `imageUrl` | URL |
| 그 외 `string` | — | lorem ipsum 단어 |

---

## 주의사항

**옵셔널 필드(`?`)는 약 30% 확률로 생략됩니다.**

실행마다 결과가 달라지므로, 특정 필드가 반드시 필요하면 생성 후 직접 지정합니다.

```ts
import { mocks } from "./mocks"

const user = { ...mocks.UserMock, id: "fixed-id" }
```

---

**`Extract`, `Exclude`, `ReturnType`, `Parameters` 등 고급 유틸리티 타입은 `{}` 로 생성됩니다.**
