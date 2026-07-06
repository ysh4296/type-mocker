/**
 * mock 생성 엣지케이스 검증용 픽스처 타입 모음.
 * 재귀 참조, 유틸리티 타입, 유니온, 튜플, 함수 타입, 네임스페이스 등을 다룬다.
 */

export enum Status {
  Active   = "ACTIVE",
  Inactive = "INACTIVE",
}

// ─── 자기참조 타입 (순환 가드 검증용) ─────────────────────────────────────────

export interface LinkedListNode {
  value: number
  next?: LinkedListNode // 옵셔널 자기참조 — 30% 확률로 생략되어 재귀가 자연스럽게 끝남
}

export interface TreeNode {
  id:       string
  children: TreeNode[] // 필수 자기참조 — 순환 가드가 없으면 무한 재귀로 스택오버플로우 발생
}

// ─── 상속 ─────────────────────────────────────────────────────────────────────

export interface Base {
  baseField: string
}

export interface Derived extends Base {
  derivedField: number
}

// ─── 리터럴 유니온, 튜플, 함수, 기타 프리미티브 ──────────────────────────────

export interface Task {
  id:            string
  status:        Status
  priority:      1 | 2 | 3
  label:         "low" | "medium" | "high"
  coords:        [number, number]
  namedCoords:   [x: number, y: number]
  optionalTuple: [string, number?]
  handler:       () => void
  data:          Record<string, number>
  meta:          unknown
  anything:      any
  impossible:    never
  literalTrue:   true
  literalFalse:  false
  nullField:     null
}

// ─── 유틸리티 타입 ────────────────────────────────────────────────────────────

export type PartialUser    = Partial<{ id: string; name: string }>
export type RequiredAddr   = Required<{ street?: string; city?: string }>
export type ReadonlyTags   = Readonly<{ tags: string[] }>
export type UnionPrimitive = string | number | boolean
export type IntersectionAB = { a: string } & { b: number }
export type NestedArray    = number[][]

// ─── 클래스 선언 (구조적 확장 fallback 검증용) ───────────────────────────────

export class UserClass {
  id!:   string
  name!: string
}

export interface HasClassField {
  owner: UserClass
}

// ─── 네임스페이스 / qualified name ───────────────────────────────────────────

export namespace NS {
  export interface Inner {
    x: string
  }
}

export interface HasQualified {
  inner: NS.Inner
}
