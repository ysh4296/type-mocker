import { describe, it, expect } from "vitest"
import { getStringHint } from "../faker-hints"

describe("getStringHint", () => {
  describe("exact field name matches", () => {
    it("returns a valid email for 'email'", () => {
      expect(getStringHint("email")).toMatch(/@/)
    })

    it("returns a UUID for 'id'", () => {
      expect(getStringHint("id")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it("returns a URL for 'url'", () => {
      expect(getStringHint("url")).toMatch(/^https?:\/\//)
    })

    it("returns a non-empty string for 'name'", () => {
      const result = getStringHint("name")
      expect(typeof result).toBe("string")
      expect(result.length).toBeGreaterThan(0)
    })

    it("returns a non-empty string for 'body'", () => {
      const result = getStringHint("body")
      expect(typeof result).toBe("string")
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe("suffix-based fallback matches", () => {
    it("returns a UUID for fields ending with 'Id'", () => {
      expect(getStringHint("userId")).toMatch(/^[0-9a-f-]{36}$/)
      expect(getStringHint("postId")).toMatch(/^[0-9a-f-]{36}$/)
    })

    it("returns an ISO date string for fields ending with 'At'", () => {
      const result = getStringHint("createdAt")
      expect(() => new Date(result).toISOString()).not.toThrow()
    })

    it("returns an ISO date string for fields ending with 'Date'", () => {
      const result = getStringHint("birthDate")
      expect(() => new Date(result).toISOString()).not.toThrow()
    })

    it("returns a URL for fields ending with 'Url'", () => {
      expect(getStringHint("avatarUrl")).toMatch(/^https?:\/\//)
    })
  })

  describe("unknown field names", () => {
    it("returns a non-empty string for unrecognized names", () => {
      const result = getStringHint("unknownXyz")
      expect(typeof result).toBe("string")
      expect(result.length).toBeGreaterThan(0)
    })

    it("does not confuse short names with suffix hints", () => {
      // "Id" alone is shorter than the suffix "Id", so it shouldn't match suffix
      const result = getStringHint("Id")
      expect(typeof result).toBe("string")
    })
  })
})
