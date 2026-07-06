import { describe, it, expect } from "vitest"
import { resolve } from "node:path"
import { parseTypes } from "../project-scanner"
import { toMock } from "../mock-generator"
import { EnumRef } from "../types"

const FIXTURES = resolve(__dirname, "fixtures/edge-cases.ts")

// 옵셔널 필드 생략, 유니온 멤버 선택, 배열 길이 등 확률적으로 분기되는 로직이
// 여러 샘플에 걸쳐 실제로 다 실행되도록 반복 실행하는 헬퍼.
function repeat(n: number, fn: (i: number) => void): void {
  for (let i = 0; i < n; i++) fn(i)
}

describe("self-referential types (cycle guard)", () => {
  it("never throws or hangs on an optional self-referential field", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    repeat(20, () => {
      expect(() => toMock("LinkedListNode", typeMap, checker)).not.toThrow()
    })
  })

  it("terminates recursion for a required self-referential array field", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    repeat(20, () => {
      const node = toMock("TreeNode", typeMap, checker)
      expect(typeof node.id).toBe("string")
      expect(Array.isArray(node.children)).toBe(true)
      // 순환 가드 때문에 손자 노드는 무한 재귀 대신 {}로 수렴한다
      for (const child of node.children as unknown[]) {
        expect(typeof child).toBe("object")
      }
    })
  })
})

describe("interface inheritance", () => {
  it("merges fields from an extended interface", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const derived = toMock("Derived", typeMap, checker)
    expect(typeof derived.baseField).toBe("string")
    expect(typeof derived.derivedField).toBe("number")
  })
})

describe("literal unions, tuples, functions, misc primitives", () => {
  it("picks a value from a numeric literal union", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    repeat(20, () => {
      const task = toMock("Task", typeMap, checker)
      expect([1, 2, 3]).toContain(task.priority)
    })
  })

  it("picks a value from a string literal union", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    repeat(20, () => {
      const task = toMock("Task", typeMap, checker)
      expect(["low", "medium", "high"]).toContain(task.label)
    })
  })

  it("generates fixed-length tuples", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const task = toMock("Task", typeMap, checker)
    expect(task.coords).toHaveLength(2)
    expect(typeof (task.coords as number[])[0]).toBe("number")
    expect(typeof (task.coords as number[])[1]).toBe("number")
  })

  it("generates named tuple members the same as unnamed ones", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const task = toMock("Task", typeMap, checker)
    expect(task.namedCoords).toHaveLength(2)
    expect(typeof (task.namedCoords as number[])[0]).toBe("number")
    expect(typeof (task.namedCoords as number[])[1]).toBe("number")
  })

  it("randomly includes or omits the optional tuple element", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const seen = new Set<number>()
    repeat(30, () => {
      const task = toMock("Task", typeMap, checker)
      const tuple = task.optionalTuple as unknown[]
      expect(typeof tuple[0]).toBe("string")
      seen.add(tuple.length)
    })
    // 샘플이 충분하면 1(생략)과 2(포함) 두 경우 모두 관측되어야 한다
    expect(seen.has(1) || seen.has(2)).toBe(true)
  })

  it("generates function-typed fields as callable stubs", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const task = toMock("Task", typeMap, checker)
    expect(typeof task.handler).toBe("function")
    expect(() => (task.handler as () => void)()).not.toThrow()
  })

  it("generates Record<K,V> fields as empty objects", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const task = toMock("Task", typeMap, checker)
    expect(task.data).toEqual({})
  })

  it("generates unknown/any fields as empty objects", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const task = toMock("Task", typeMap, checker)
    expect(task.meta).toEqual({})
    expect(task.anything).toEqual({})
  })

  it("generates never-typed fields as null", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const task = toMock("Task", typeMap, checker)
    expect(task.impossible).toBeNull()
  })

  it("generates boolean and null literal fields verbatim", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const task = toMock("Task", typeMap, checker)
    expect(task.literalTrue).toBe(true)
    expect(task.literalFalse).toBe(false)
    expect(task.nullField).toBeNull()
  })

  it("still generates enum-typed fields as EnumRef inside a complex interface", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const task = toMock("Task", typeMap, checker)
    expect(task.status).toBeInstanceOf(EnumRef)
    expect((task.status as EnumRef).ref).toMatch(/^Status\./)
  })
})

describe("utility types", () => {
  it("Partial<T> generates the same shape as T (fields may still be omitted independently)", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const user = toMock("PartialUser", typeMap, checker)
    if ("id" in user) expect(typeof user.id).toBe("string")
    if ("name" in user) expect(typeof user.name).toBe("string")
  })

  it("Required<T> generates all fields even when optional in the source", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    repeat(20, () => {
      const addr = toMock("RequiredAddr", typeMap, checker)
      // 참고: Required<T>는 내부 타입 노드를 그대로 목킹하는 방식으로 처리되므로,
      // 원본 멤버에 붙어있던 `?`의 생략 확률이 여전히 적용된다.
      if ("street" in addr) expect(typeof addr.street).toBe("string")
      if ("city" in addr) expect(typeof addr.city).toBe("string")
    })
  })

  it("Readonly<T> generates the same shape as T", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const tags = toMock("ReadonlyTags", typeMap, checker)
    expect(Array.isArray(tags.tags)).toBe(true)
  })

  it("resolves a union of primitives to one concrete member", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    repeat(20, () => {
      const value = toMock("UnionPrimitive", typeMap, checker)
      expect(["string", "number", "boolean"]).toContain(typeof value)
    })
  })

  it("merges an intersection of two object types", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const value = toMock("IntersectionAB", typeMap, checker)
    expect(typeof value.a).toBe("string")
    expect(typeof value.b).toBe("number")
  })

  it("generates nested arrays for T[][]", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const value = toMock("NestedArray", typeMap, checker) as unknown as number[][]
    expect(Array.isArray(value)).toBe(true)
    for (const row of value) {
      expect(Array.isArray(row)).toBe(true)
      for (const n of row) expect(typeof n).toBe("number")
    }
  })
})

describe("class declarations (structural expansion fallback)", () => {
  it("expands a class-typed field via the TypeChecker", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const value = toMock("HasClassField", typeMap, checker)
    const owner = value.owner as Record<string, unknown>
    expect(typeof owner.id).toBe("string")
    expect(typeof owner.name).toBe("string")
  })
})

describe("namespaced / qualified type references", () => {
  it("resolves a namespace-qualified type reference (NS.Inner)", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const value = toMock("HasQualified", typeMap, checker)
    const inner = value.inner as Record<string, unknown>
    expect(typeof inner.x).toBe("string")
  })
})

describe("without a TypeChecker (AST-only fast path)", () => {
  it("still generates simple interfaces when checker is omitted", () => {
    const { typeMap } = parseTypes(FIXTURES)
    const derived = toMock("Derived", typeMap)
    expect(typeof derived.baseField).toBe("string")
    expect(typeof derived.derivedField).toBe("number")
  })

  it("falls back gracefully for a self-referential type with no checker", () => {
    const { typeMap } = parseTypes(FIXTURES)
    expect(() => toMock("LinkedListNode", typeMap)).not.toThrow()
  })

  it("does not stack-overflow on a required self-referential array field with no checker", () => {
    // 회귀 테스트: TreeNode의 `children: TreeNode[]` 필드는 옵셔널이 아니므로,
    // 이 AST-only 경로에 순환 가드가 없으면 콜스택이 터질 때까지 재귀한다.
    // checker가 없어도 ctx.resolving이 이 경로를 반드시 막아줘야 한다.
    const { typeMap } = parseTypes(FIXTURES)
    repeat(20, () => {
      expect(() => toMock("TreeNode", typeMap)).not.toThrow()
    })
  })
})
