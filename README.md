# ts-to-mock

TypeScript 인터페이스 파일을 읽어 타입이 달린 mock 변수를 자동으로 생성하는 CLI 도구입니다.

```bash
ts-to-mock src/types/user.ts
```

```ts
export const mockUser: User = {
  id: "a3f2c1d4-...",
  name: "Alice Smith",
  email: "alice@example.com",
  age: 34,
  role: UserRole.Editor,
  isActive: true,
  tags: ["lorem", "ipsum"],
  createdAt: "2024-03-15T09:23:41.000Z"
}
```

---

## 설치 및 실행

### npm / git URL로 설치한 경우

```bash
npx ts-to-mock src/types/user.ts
npm exec ts-to-mock -- src/types/user.ts
```

### 로컬 개발 중 (빌드 없이)

```bash
npm install
npm run cli -- src/types/user.ts
```

### 빌드 후 직접 실행

```bash
npm run build          # dist/cli.js 생성
node dist/cli.js src/types/user.ts
npx . src/types/user.ts
```

### npm link (선택사항)

시스템 전역에 `ts-to-mock` 명령어를 등록하고 싶다면:

```bash
npm run build
npm link
ts-to-mock src/types/user.ts
```

---

## 사용법

```bash
ts-to-mock <ts-file> [options]
```

### 옵션

| 옵션 | 설명 | 기본값 |
|---|---|---|
| `-n, --count <n>` | 생성 개수 | `1` |
| `-o, --out <file>` | 파일로 저장 (기본: stdout) | - |
| `-s, --schema <name>` | 특정 타입 지정 (기본: 파일 내 전체) | - |

---

## 예시

### 기본 — stdout 출력

```bash
ts-to-mock src/types/user.ts
```

### 여러 개 생성

```bash
ts-to-mock src/types/user.ts -n 5
```

```ts
export const mockUsers: User[] = [
  { id: "...", name: "Alice Smith", ... },
  { id: "...", name: "Bob Jones",   ... },
  ...
]
```

### 파일로 저장

```bash
ts-to-mock src/types/user.ts -o src/mocks/mockUser.ts
```

저장 시 타입 import가 자동으로 추가됩니다. enum은 값으로 사용되므로 `type` 없이, 나머지는 `type`으로 임포트됩니다:

```ts
// src/mocks/mockUser.ts (자동 생성)
import { UserRole, type User } from "../types/user"

export const mockUser: User = {
  ...
}
```

### 파일에 타입이 여러 개인 경우

```ts
// src/types/order.ts
export interface OrderItem { ... }
export interface Order { ... }
```

```bash
# 전체 타입 한 번에 생성
ts-to-mock src/types/order.ts

# 특정 타입만 지정
ts-to-mock src/types/order.ts --schema Order
```

### 조합 예시

```bash
ts-to-mock src/types/order.ts --schema Order -n 3 -o src/mocks/mockOrder.ts
```

---

## 프로젝트 구조

```
src/
  cli/index.ts          CLI 진입점
  core/ast-to-mock.ts   mock 생성 코어 (TypeScript AST + faker)
  types/                예시 TypeScript 타입 파일
    user.ts
    product.ts
    order.ts
  mocks/                생성된 mock 파일 (--out 옵션 사용 시)
```

---

## 동작 원리

```
TypeScript 파일
  → ts.createProgram()   전체 프로그램 빌드 (tsconfig.json 자동 탐색)
  → TypeChecker          import 체인 + node_modules 타입까지 완전 해석
  → faker                필드 타입에 맞는 랜덤 데이터 생성
  → export const mockXxx: Xxx = { ... }
```

프로젝트 루트의 `tsconfig.json`을 자동으로 탐색해 컴파일 옵션을 그대로 사용합니다.

### 타입 해석 흐름

로컬 타입은 AST 기반으로 빠르게 처리하고, 외부 타입은 TypeChecker를 통해 재귀적으로 전개합니다.

```
TypeReference 만날 때
  ├─ 로컬 typeMap에 있음  → AST 기반 즉시 전개 (빠름)
  └─ 없음
      ├─ checker.getSymbolAtLocation()  → Declaration 탐색
      │    ├─ InterfaceDeclaration  → 프로퍼티 전개
      │    ├─ TypeAliasDeclaration  → 타입 노드 재귀 전개
      │    ├─ EnumDeclaration       → 멤버 중 랜덤 선택
      │    └─ ClassDeclaration      → 프로퍼티 전개
      └─ checker.getTypeAtLocation()  → 타입 시스템 레벨 전개
```

---

## 지원 범위

### 타입

| 항목 | 지원 여부 |
|---|---|
| `interface`, `type alias`, `enum` | ✓ |
| `union`, `intersection`, `tuple` | ✓ |
| `Partial` / `Required` / `Readonly` / `Pick` / `Omit` / `Promise` / `Array<T>` | ✓ |
| `interface extends` 상속 필드 | ✓ |
| 상대경로 import (`./`, `../`) 타입 | ✓ 재귀 추적 |
| node_modules 외부 패키지 타입 | ✓ TypeChecker로 추적 |
| `A.B` 형태 네임스페이스 타입 (`WebAssembly.Memory` 등) | ✓ TypeChecker로 추적 |
| 순환 참조 타입 | ✓ 자동 차단 (depth limit 6) |
| 함수 타입 필드 | △ 생략됨 |
| `Extract`, `Exclude`, `ReturnType`, `Parameters` 등 고급 유틸리티 | △ `{}` 로 생성됨 |

### node_modules 타입 예시

```ts
// src/types/memory.ts
export interface GameState {
  memory: WebAssembly.Memory   // node_modules 내장 전역 타입
  buffer: ArrayBuffer
}
```

```bash
ts-to-mock src/types/memory.ts
```

```ts
export const mockGameState: GameState = {
  memory: {
    buffer: {
      byteLength: 57
    }
  },
  buffer: {
    byteLength: 83
  }
}
```

### 필드명 기반 데이터 생성

필드명을 인식해 의미있는 값을 생성합니다:

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

**함수 타입 필드는 생성 결과에서 생략됩니다.**

```ts
export interface Ctx {
  onClick: (e: MouseEvent) => void   // → 생성된 파일에 이 필드 없음
}
```

생성 후 수동으로 `jest.fn()` 등을 채워야 합니다.

---

**`Extract`, `Exclude`, `ReturnType`, `Parameters` 등 고급 유틸리티 타입은 `{}` 로 생성됩니다.**

---

**옵셔널 필드(`?`)는 약 30% 확률로 생략됩니다.**

실행마다 결과가 달라지므로, 특정 필드가 반드시 필요하면 생성 후 직접 추가합니다.
