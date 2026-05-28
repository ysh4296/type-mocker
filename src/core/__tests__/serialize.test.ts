import { describe, it, expect } from "vitest"
import { serialize } from "../serialize"
import { EnumRef } from "../types"

describe("serialize", () => {
  describe("primitives", () => {
    it("serializes strings as JSON-quoted values", () => {
      expect(serialize("hello")).toBe('"hello"')
      expect(serialize("")).toBe('""')
      expect(serialize('say "hi"')).toBe('"say \\"hi\\""')
    })

    it("serializes numbers", () => {
      expect(serialize(0)).toBe("0")
      expect(serialize(42)).toBe("42")
      expect(serialize(3.14)).toBe("3.14")
      expect(serialize(-1)).toBe("-1")
    })

    it("serializes booleans", () => {
      expect(serialize(true)).toBe("true")
      expect(serialize(false)).toBe("false")
    })

    it("serializes null", () => {
      expect(serialize(null)).toBe("null")
    })

    it("serializes undefined", () => {
      expect(serialize(undefined)).toBe("undefined")
    })
  })

  describe("special values", () => {
    it("serializes functions as arrow function stubs", () => {
      expect(serialize(() => {})).toBe("() => {}")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(serialize(function foo() {} as any)).toBe("() => {}")
    })

    it("serializes EnumRef as its raw reference string", () => {
      expect(serialize(new EnumRef("Role.Admin"))).toBe("Role.Admin")
      expect(serialize(new EnumRef("Priority.High"))).toBe("Priority.High")
    })
  })

  describe("arrays", () => {
    it("serializes empty arrays as '[]'", () => {
      expect(serialize([])).toBe("[]")
    })

    it("serializes flat arrays with correct indentation", () => {
      const result = serialize([1, 2, 3], 0)
      expect(result).toMatch(/^\[/)
      expect(result).toMatch(/\]$/)
      expect(result).toContain("1")
      expect(result).toContain("2")
      expect(result).toContain("3")
    })

    it("serializes nested arrays", () => {
      const result = serialize([[1, 2], [3, 4]], 0)
      expect(result).toContain("1")
      expect(result).toContain("3")
    })
  })

  describe("objects", () => {
    it("serializes empty objects as '{}'", () => {
      expect(serialize({})).toBe("{}")
    })

    it("serializes objects with key: value pairs", () => {
      const result = serialize({ a: 1, b: "hello" }, 0)
      expect(result).toMatch(/^\{/)
      expect(result).toMatch(/\}$/)
      expect(result).toContain("a:")
      expect(result).toContain("b:")
      expect(result).toContain('"hello"')
    })

    it("omits undefined-valued keys", () => {
      const result = serialize({ a: 1, b: undefined, c: "x" })
      expect(result).toContain("a:")
      expect(result).not.toContain("b:")
      expect(result).toContain("c:")
    })

    it("serializes nested objects", () => {
      const result = serialize({ user: { id: "abc", age: 30 } }, 0)
      expect(result).toContain("user:")
      expect(result).toContain("id:")
      expect(result).toContain('"abc"')
    })
  })

  describe("depth / indentation", () => {
    it("increases indentation per depth level", () => {
      const depth0 = serialize({ a: 1 }, 0)
      const depth1 = serialize({ a: 1 }, 1)
      // depth 1 should have more leading whitespace inside the object
      expect(depth1.split("\n")[1]?.startsWith("    ")).toBe(true) // 4 spaces = 2 indent levels
      expect(depth0.split("\n")[1]?.startsWith("  ")).toBe(true)   // 2 spaces = 1 indent level
    })
  })
})
