import { describe, it, expect } from "vitest"
import { resolve } from "node:path"
import { parseTypes } from "../project-scanner"
import { toMock, toMockList } from "../mock-generator"
import { EnumRef } from "../types"

const FIXTURES = resolve(__dirname, "fixtures/types.ts")

describe("toMock", () => {
  describe("interface types", () => {
    it("generates a User mock with the correct shape", () => {
      const { typeMap, checker } = parseTypes(FIXTURES)
      const user = toMock("User", typeMap, checker)

      expect(typeof user.id).toBe("string")
      expect(typeof user.name).toBe("string")
      expect(typeof user.email).toBe("string")
      expect(typeof user.age).toBe("number")
      expect(typeof user.active).toBe("boolean")
    })

    it("generates enum-typed fields as EnumRef instances", () => {
      const { typeMap, checker } = parseTypes(FIXTURES)
      const user = toMock("User", typeMap, checker)
      expect(user.role).toBeInstanceOf(EnumRef)
      expect((user.role as EnumRef).ref).toMatch(/^Role\./)
    })

    it("generates nested interface fields", () => {
      const { typeMap, checker } = parseTypes(FIXTURES)
      const user = toMock("User", typeMap, checker)
      const address = user.address as Record<string, unknown>
      expect(typeof address.street).toBe("string")
      expect(typeof address.city).toBe("string")
      expect(typeof address.country).toBe("string")
    })

    it("generates array-typed fields as arrays", () => {
      const { typeMap, checker } = parseTypes(FIXTURES)
      const user = toMock("User", typeMap, checker)
      expect(Array.isArray(user.tags)).toBe(true)
    })

    it("generates a Post mock with the correct shape", () => {
      const { typeMap, checker } = parseTypes(FIXTURES)
      const post = toMock("Post", typeMap, checker)

      expect(typeof post.id).toBe("string")
      expect(typeof post.title).toBe("string")
      expect(typeof post.body).toBe("string")
      expect(typeof post.published).toBe("boolean")
      expect(typeof post.likes).toBe("number")
    })
  })

  describe("type alias types", () => {
    it("generates a PaginatedUsers mock with correct shape", () => {
      const { typeMap, checker } = parseTypes(FIXTURES)
      const page = toMock("PaginatedUsers", typeMap, checker)
      expect(Array.isArray(page.items)).toBe(true)
      expect(typeof page.total).toBe("number")
      expect(typeof page.page).toBe("number")
      expect(typeof page.pageSize).toBe("number")
    })
  })

  describe("overrides", () => {
    it("merges override values on top of the generated mock", () => {
      const { typeMap, checker } = parseTypes(FIXTURES)
      const user = toMock("User", typeMap, checker, { name: "Alice", age: 25 })
      expect(user.name).toBe("Alice")
      expect(user.age).toBe(25)
      // Other fields still generated
      expect(typeof user.id).toBe("string")
    })
  })

  describe("error handling", () => {
    it("throws for type names not in the registry", () => {
      const { typeMap, checker } = parseTypes(FIXTURES)
      expect(() => toMock("NonExistentType", typeMap, checker)).toThrow(/not found/)
    })
  })
})

describe("toMockList", () => {
  it("generates an array of the requested length", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const users = toMockList("User", typeMap, 3, checker)
    expect(users).toHaveLength(3)
  })

  it("each generated item has the correct shape", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const users = toMockList("User", typeMap, 2, checker)
    for (const user of users) {
      expect(typeof user.id).toBe("string")
      expect(typeof user.name).toBe("string")
    }
  })

  it("generates unique id values across items", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const users = toMockList("User", typeMap, 5, checker)
    const ids = new Set(users.map(u => u.id))
    // UUIDs should be unique — extremely unlikely to collide
    expect(ids.size).toBe(5)
  })

  it("defaults to 3 items when count is omitted", () => {
    const { typeMap, checker } = parseTypes(FIXTURES)
    const users = toMockList("User", typeMap, undefined, checker)
    expect(users).toHaveLength(3)
  })
})
