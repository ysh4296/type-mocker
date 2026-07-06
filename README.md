# ts-to-mock

A CLI tool that scans your TypeScript types and auto-generates faker-based mock data.  
No bundler configuration required. Works with Turbopack, SWC, Vite, webpack, Next.js — anything.

---

## Install

```bash
npm install ts-to-mock
```

Requires Node.js 14.18 or later.

---

## Real-world usage pattern

### 1. Define your TypeScript types

```ts
// src/types.ts
export type User = {
  id:      number
  name:    string
  email:   string
  phone:   string
  company: string
}
```

### 2. Write a mock file

Declare the mocks you need with `createMock<T>()`.  
The type can be declared anywhere in your project — it's found automatically.

```ts
// src/mocks/index.ts
import { createMock, createMockList } from 'ts-to-mock'
import type { User } from '../types'

export const mockUser  = createMock<User>()
export const mockUsers = createMockList<User>(5)
```

### 3. Run generate

```bash
npx ts-mock generate
```

Two things happen automatically.

**Generates `__mocks__/index.ts`** — filled with real faker values

```ts
// __mocks__/index.ts  (auto-generated — do not edit)
export const UserMock = {
  id:      4,
  name:    "Lola Friesen",
  email:   "lola@example.com",
  phone:   "010-1234-5678",
  company: "Acme Corp",
}
export const UserMockList = [{ ... }, { ... }, { ... }, { ... }, { ... }]
```

**Transforms your source file** — automatically injects the mock values as arguments

```ts
// src/mocks/index.ts  (auto-transformed)
import { createMock, createMockList } from 'ts-to-mock'
import type { User } from '../types'
import * as mocks from '../../__mocks__'

export const mockUser  = createMock<User>(mocks.UserMock)
export const mockUsers = createMockList<User>(5, mocks.UserMockList)
```

### 4. Use the mock data

Once generated, just import from your mock file wherever you need it.  
Feel free to pick whatever mock/real switching strategy suits your project.

**Option A. Switch via a function argument**

```ts
// src/api/users.ts
import type { User } from '../types'

export async function fetchUsers(mock: boolean): Promise<User[]> {
  if (mock) {
    const { mockUsers } = await import('../mocks')
    return mockUsers
  }
  const res = await fetch('/api/users')
  return res.json()
}
```

**Option B. Switch via an environment variable**

```ts
// Read the env var however your framework does it
const isMock = process.env.MOCK === 'true'           // Node.js / webpack
// const isMock = import.meta.env.VITE_MOCK === 'true'  // Vite
// const isMock = process.env.NEXT_PUBLIC_MOCK === 'true' // Next.js

export async function fetchUsers(): Promise<User[]> {
  if (isMock) {
    const { mockUsers } = await import('../mocks')
    return mockUsers
  }
  const res = await fetch('/api/users')
  return res.json()
}
```

Using dynamic imports lets the mock code get tree-shaken out of your production build.

### 5. Add an npm script

```json
{
  "scripts": {
    "generate": "ts-mock generate",
    "dev":      "ts-mock generate && vite"
  }
}
```

---

## CLI options

```
ts-mock generate [options]

Options:
  -d, --dir <dir>      Root directory to scan  (default: .)
  -o, --output <dir>   Mock file output path   (default: __mocks__)
  --exclude <dirs...>  Directory names to exclude
```

```bash
npx ts-mock generate --dir ./src --output __generated__ --exclude fixtures e2e
```

---

<details>
<summary>Supported types</summary>

| Feature | Support |
|---|---|
| `interface`, `type alias`, `enum` | ✓ |
| `union`, `intersection`, `tuple` | ✓ |
| `Partial` / `Required` / `Readonly` / `Pick` / `Omit` / `Promise` / `Array<T>` | ✓ |
| `interface extends` inheritance | ✓ |
| Automatic project-wide file discovery | ✓ |
| `node_modules` types | ✓ via TypeChecker |
| Namespaced types (e.g. `WebAssembly.Memory`) | ✓ via TypeChecker |
| Function types / method signatures | ✓ generates `() => {}` stubs |
| Circular references | ✓ auto-cutoff at depth 6 |
| Advanced utility types (`Extract`, `Exclude`, `ReturnType`, etc.) | △ generates `{}` |

</details>

<details>
<summary>Field name inference</summary>

Field names are analyzed to generate meaningful faker values.

| Pattern | Example field | Generated value |
|---|---|---|
| Exact match | `id` | UUID |
| Exact match | `name`, `email`, `phone`, `company` | corresponding faker value |
| Exact match | `timezone`, `locale`, `slug`, `ip`, `mimeType` | corresponding faker value |
| `*Id` suffix | `userId`, `teamId` | UUID |
| `*At` suffix | `createdAt`, `updatedAt` | ISO date string |
| `*Date` suffix | `startDate`, `dueDate` | ISO date string |
| `*Url` suffix | `avatarUrl`, `imageUrl` | URL |
| Any other `string` | — | lorem ipsum word |

</details>

<details>
<summary>Caveats</summary>

**Optional fields (`?`) are omitted about 30% of the time.**  
If you need a fixed value, overwrite that field directly after generation.

**Advanced utility types (`Extract`, `Exclude`, `ReturnType`, `Parameters`, etc.) generate `{}`.**

**Importing a mock file before running `ts-mock generate` will throw a runtime error.**

</details>

<details>
<summary>How it works</summary>

```
ts-mock generate
  ↓
Scan the project
  → Collect .ts / .tsx files (excluding test/story files)
  → Build the full program with ts.createProgram() (tsconfig.json auto-detected)
  → Resolve type references with the TypeChecker
  → Generate random data with faker based on field name and type
  ↓
Emit __mocks__/index.ts
  ↓
Transform source files
  → createMock<T>()      →  createMock<T>(mocks.TMock)
  → createMockList<T>(n) →  createMockList<T>(n, mocks.TMockList)
  → Auto-insert `import * as mocks from '...'`
```

</details>
