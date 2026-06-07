# ts-to-mock

TypeScript 타입을 스캔해 faker 기반 mock 데이터를 자동 생성하는 CLI 도구.  
번들러 설정 없이 동작합니다. Turbopack · SWC · Vite · webpack — 무엇을 써도 상관없습니다.

---

## 설치

```bash
npm install ts-to-mock
```

Node.js 14.18 이상이 필요합니다.

---

## 실제 활용 패턴

### 1. TypeScript 타입 정의

```ts
// src/types.ts
export type User = {
  id:      number
  name:    string
  email:   string
  phone:   string
  company: string
}

export type Order = {
  id:        number
  userId:    number
  status:    string
  createdAt: string
}
```

### 2. mock 파일 작성

`createMock<T>()` 로 필요한 mock을 선언합니다.  
타입은 프로젝트 어디에 선언돼 있어도 자동으로 찾습니다.

```ts
// src/mocks/index.ts
import { createMock, createMockList } from 'ts-to-mock'
import type { User, Order } from '../types'

export const mockUser   = createMock<User>()
export const mockUsers  = createMockList<User>(5)
export const mockOrder  = createMock<Order>()
export const mockOrders = createMockList<Order>(5)
```

### 3. generate 실행

```bash
npx ts-mock generate
```

두 가지 작업이 자동으로 처리됩니다.

**`__mocks__/index.ts` 생성**

```ts
// __mocks__/index.ts  (자동 생성 — 수정 금지)
export const UserMock = {
  id:      4,
  name:    "Lola Friesen",
  email:   "lola@example.com",
  phone:   "010-1234-5678",
  company: "Acme Corp",
}
export const UserMockList = [{ ... }, { ... }, { ... }, { ... }, { ... }]

export const OrderMock = {
  id:        12,
  userId:    "a3f1...",
  status:    "shipped",
  createdAt: "2024-03-15T09:23:00.000Z",
}
export const OrderMockList = [{ ... }, { ... }, { ... }, { ... }, { ... }]
```

**소스 파일 변환** — mock 값을 인자로 자동 주입

```ts
// src/mocks/index.ts  (자동 변환)
import { createMock, createMockList } from 'ts-to-mock'
import type { User, Order } from '../types'
import * as mocks from '../../__mocks__'

export const mockUser   = createMock<User>(mocks.UserMock)
export const mockUsers  = createMockList<User>(5, mocks.UserMockList)
export const mockOrder  = createMock<Order>(mocks.OrderMock)
export const mockOrders = createMockList<Order>(5, mocks.OrderMockList)
```

### 4. API 함수에서 mock 분기 처리

환경 변수로 mock 모드와 실제 API를 구분합니다.

```ts
// src/api/users.ts
import type { User } from '../types'

const isMock = import.meta.env.VITE_MOCK === 'true'  // Vite
// const isMock = process.env.NEXT_PUBLIC_MOCK === 'true'  // Next.js

export async function fetchUsers(): Promise<User[]> {
  if (isMock) {
    const { mockUsers } = await import('../mocks')
    return mockUsers
  }
  const res = await fetch('/api/users')
  return res.json()
}
```

dynamic import를 사용하면 mock 코드가 실제 빌드에서 트리 쉐이킹됩니다.

### 5. 스크립트 등록

```json
{
  "scripts": {
    "dev":      "vite",
    "dev:mock": "ts-mock generate && vite --mode mock",
    "build":    "vite build",
    "prebuild": "ts-mock generate"
  }
}
```

```
# .env.mock
VITE_MOCK=true
```

```bash
npm run dev       # 실제 API
npm run dev:mock  # mock 데이터
```

---

## CLI 옵션

```
ts-mock generate [options]

Options:
  -d, --dir <dir>      스캔할 루트 디렉토리  (기본값: .)
  -o, --output <dir>   mock 파일 출력 경로   (기본값: __mocks__)
  --exclude <dirs...>  제외할 디렉토리 이름
```

```bash
npx ts-mock generate --dir ./src --output __generated__ --exclude fixtures e2e
```

---

<details>
<summary>지원 타입</summary>

| 기능 | 지원 |
|---|---|
| `interface`, `type alias`, `enum` | ✓ |
| `union`, `intersection`, `tuple` | ✓ |
| `Partial` / `Required` / `Readonly` / `Pick` / `Omit` / `Promise` / `Array<T>` | ✓ |
| `interface extends` 상속 | ✓ |
| 프로젝트 파일 자동 탐색 | ✓ |
| `node_modules` 타입 | ✓ TypeChecker 경유 |
| 네임스페이스 타입 (`WebAssembly.Memory` 등) | ✓ TypeChecker 경유 |
| 함수 타입 / 메서드 시그니처 | ✓ `() => {}` stub 생성 |
| 순환 참조 | ✓ 깊이 6 자동 차단 |
| 고급 유틸리티 (`Extract`, `Exclude`, `ReturnType` 등) | △ `{}` 생성 |

</details>

<details>
<summary>필드명 추론</summary>

필드명을 분석해 의미 있는 faker 값을 생성합니다.

| 패턴 | 예시 필드 | 생성 값 |
|---|---|---|
| 정확히 일치 | `id` | UUID |
| 정확히 일치 | `name`, `email`, `phone`, `company` | faker 해당값 |
| 정확히 일치 | `timezone`, `locale`, `slug`, `ip`, `mimeType` | faker 해당값 |
| `*Id` 접미사 | `userId`, `teamId` | UUID |
| `*At` 접미사 | `createdAt`, `updatedAt` | ISO 날짜 문자열 |
| `*Date` 접미사 | `startDate`, `dueDate` | ISO 날짜 문자열 |
| `*Url` 접미사 | `avatarUrl`, `imageUrl` | URL |
| 그 외 `string` | — | lorem ipsum 단어 |

</details>

<details>
<summary>주의사항</summary>

**옵셔널 필드 (`?`) 는 약 30% 확률로 생략됩니다.**  
고정 값이 필요하면 생성 후 해당 필드를 직접 덮어쓰세요.

**고급 유틸리티 타입 (`Extract`, `Exclude`, `ReturnType`, `Parameters` 등) 은 `{}` 를 생성합니다.**

**`ts-mock generate` 를 실행하지 않고 `createMock<T>()` 를 호출하면 런타임 에러가 발생합니다.**  
`dev:mock` 스크립트처럼 generate 후 서버를 실행하는 형태로 등록해 두세요.

</details>

<details>
<summary>동작 원리</summary>

```
ts-mock generate
  ↓
프로젝트 스캔
  → .ts / .tsx 파일 수집 (테스트·스토리 파일 제외)
  → ts.createProgram() 으로 전체 프로그램 빌드 (tsconfig.json 자동 감지)
  → TypeChecker 로 타입 참조 해석
  → faker 로 필드명·타입 기반 랜덤 데이터 생성
  ↓
__mocks__/index.ts 출력
  ↓
소스 파일 변환
  → createMock<T>()      →  createMock<T>(mocks.TMock)
  → createMockList<T>(n) →  createMockList<T>(n, mocks.TMockList)
  → import * as mocks from '...' 자동 삽입
```

</details>
