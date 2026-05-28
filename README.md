# ts-to-mock

TypeScript 타입을 스캔해 faker 기반 mock 데이터를 자동 생성하는 도구입니다.

두 가지 방식으로 사용할 수 있습니다.

| 방식 | 적합한 환경 |
|---|---|
| **번들러 플러그인** | Vite / webpack / Rollup / esbuild 프로젝트 |
| **CLI** | 번들러 없는 Node.js 프로젝트, 파일 생성이 필요한 경우 |

---

## 데모 실행

```bash
# Node.js 20+ 필요 (nvm use 20)
cd test-project
npm install
npm run dev   # http://localhost:5173
```

`createMock<User>()` 등으로 생성된 mock 데이터가 카드 형식으로 표시됩니다.  
**새 데이터 생성** 버튼을 누르면 faker가 새 값을 만들어냅니다.

---

## 번들러 플러그인

코드에 `createMock<T>()`를 작성하면 빌드 시점에 객체 리터럴로 교체됩니다.  
런타임 오버헤드 없이 타입 추론과 자동완성이 그대로 동작합니다.

### 설치

```bash
npm install ts-to-mock
```

### 플러그인 등록

```ts
// vite.config.ts
import tsMock from 'ts-to-mock/vite'

export default {
  plugins: [tsMock()]
}
```

```js
// webpack.config.js
const tsMock = require('ts-to-mock/webpack')

module.exports = {
  plugins: [new tsMock()]
}
```

```js
// rollup.config.js
import tsMock from 'ts-to-mock/rollup'

export default {
  plugins: [tsMock()]
}
```

```js
// esbuild
import tsMock from 'ts-to-mock/esbuild'

await build({
  plugins: [tsMock()]
})
```

### 사용

```ts
import { createMock, createMockList } from 'ts-to-mock'
import type { User, Post } from './types'

const user  = createMock<User>()   // User 타입으로 추론됨
const post  = createMock<Post>()
const users = createMockList<User>(3)  // User[] 타입
```

빌드 후 실제 번들에 들어가는 코드:

```ts
const user = {
  id: "f3152fb1-...",
  name: "Lola Friesen",
  email: "lola@example.com",
  role: Role.Admin,
  createdAt: "2024-01-15T09:23:00.000Z",
  ...
}
```

`createMock<T>()` 호출 자체가 사라지고 객체가 인라인으로 들어갑니다.

### 플러그인 옵션

```ts
tsMock({
  dir:     './src',        // 스캔 디렉터리 (기본값: 프로젝트 루트)
  exclude: ['fixtures'],   // 추가로 제외할 디렉터리명
})
```

---

## CLI

프로젝트를 스캔해 모든 타입의 mock을 파일로 생성합니다.

### 로컬 개발

```bash
npm install
npm run cli -- ./src -o ./src/mocks/index.ts
```

### 전역 설치

```bash
npm link
ts-to-mock ./src -o ./src/mocks/index.ts
```

### 사용법

```bash
ts-to-mock <dir> [options]
```

| 인수 / 옵션 | 설명 | 기본값 |
|---|---|---|
| `<dir>` | 스캔할 디렉터리 (필수) | — |
| `-o, --out <file>` | 출력 파일 경로 | stdout |
| `-e, --exclude <dirs...>` | 추가로 제외할 디렉터리명 | — |

`node_modules`, `dist`, `build`, `.git`, `coverage`, `.next`, `.nuxt`는 기본 제외됩니다.

### 예시

```bash
# stdout 출력
ts-to-mock ./src

# 파일로 저장
ts-to-mock ./src -o ./src/mocks/index.ts

# 특정 디렉터리 추가 제외
ts-to-mock ./src -o ./src/mocks/index.ts -e __tests__ fixtures
```

### 생성 파일 예시

```ts
// src/mocks/index.ts (자동 생성)
import { Role, type User, type Post } from "../types"

export const mocks = {
  UserMock: {
    id: "a3f2c1d4-...",
    name: "Alice Smith",
    email: "alice@example.com",
    role: Role.Admin,
    createdAt: "2024-01-15T09:23:00.000Z",
  } as User,
  PostMock: {
    id: "b2e1f3a5-...",
    title: "lorem ipsum dolor",
    published: true,
    ...
  } as Post,
}
```

### 활용

```ts
import { mocks } from './mocks'

// 그대로 사용
const user = mocks.UserMock

// 특정 필드 오버라이드
const user = { ...mocks.UserMock, id: 'fixed-id' }
```

---

## 지원 타입

| 항목 | 지원 여부 |
|---|---|
| `interface`, `type alias`, `enum` | ✓ |
| `union`, `intersection`, `tuple` | ✓ |
| `Partial` / `Required` / `Readonly` / `Pick` / `Omit` / `Promise` / `Array<T>` | ✓ |
| `interface extends` 상속 | ✓ |
| 프로젝트 내 모든 파일 자동 탐색 | ✓ |
| node_modules 외부 패키지 타입 | ✓ TypeChecker로 추적 |
| `A.B` 네임스페이스 타입 (`WebAssembly.Memory` 등) | ✓ TypeChecker로 추적 |
| 함수 타입 / 메서드 시그니처 | ✓ `() => {}` 스텁 생성 |
| 순환 참조 | ✓ 자동 차단 (depth limit 6) |
| `Extract`, `Exclude`, `ReturnType` 등 고급 유틸리티 | △ `{}` 로 생성됨 |

---

## 필드명 기반 데이터 생성

필드명을 인식해 의미 있는 값을 생성합니다.

| 패턴 | 예시 필드명 | 생성 값 |
|---|---|---|
| 정확히 일치 | `id` | UUID |
| 정확히 일치 | `name`, `email`, `phone`, `company` | faker 대응값 |
| 정확히 일치 | `timezone`, `locale`, `slug`, `ip`, `mimeType` | 대응값 |
| `*Id` 접미사 | `userId`, `teamId` | UUID |
| `*At` 접미사 | `createdAt`, `updatedAt` | ISO 날짜 문자열 |
| `*Date` 접미사 | `startDate`, `dueDate` | ISO 날짜 문자열 |
| `*Url` 접미사 | `avatarUrl`, `imageUrl` | URL |
| 그 외 `string` | — | lorem ipsum 단어 |

---

## 주의사항

**옵셔널 필드(`?`)는 약 30% 확률로 생략됩니다.**  
실행마다 결과가 달라지므로, 반드시 필요한 필드는 생성 후 직접 지정합니다.

**`Extract`, `Exclude`, `ReturnType`, `Parameters` 등 고급 유틸리티 타입은 `{}` 로 생성됩니다.**

---

## 동작 원리

```
디렉터리 스캔
  → .ts / .tsx 파일 수집 (테스트·스토리 파일 제외)
  → ts.createProgram()   전체 프로그램 빌드 (tsconfig.json 자동 탐색)
  → TypeChecker          TypeReference를 선언 컨텍스트 기반으로 해석
  → faker                필드 타입 및 이름에 맞는 랜덤 데이터 생성

[CLI]
  → 1차: as TypeName 생성 후 컴파일러 검증
  → 실패한 타입만 as unknown as TypeName으로 교체
  → export const mocks = { TypeNameMock: {...} as TypeName, ... }

[플러그인]
  → createMock<T>() 패턴을 정규식으로 탐지
  → 제네릭 인자 T를 추출해 mock 생성
  → 객체 리터럴로 인라인 교체
  → enum import 자동 주입
```
