import { describe, it, expect } from "vitest"
import { getStringRanges, isInsideString } from "../string-utils"

describe("getStringRanges", () => {
  it("returns an empty array when there are no strings", () => {
    expect(getStringRanges("const x = 1 + 2")).toEqual([])
    expect(getStringRanges("")).toEqual([])
  })

  it("detects double-quoted strings", () => {
    const ranges = getStringRanges(`const x = "hello"`)
    expect(ranges).toHaveLength(1)
    expect(ranges[0][0]).toBe(10)  // start index of "hello"
    expect(ranges[0][1]).toBe(17)  // end index (exclusive)
  })

  it("detects single-quoted strings", () => {
    const ranges = getStringRanges(`const x = 'world'`)
    expect(ranges).toHaveLength(1)
  })

  it("detects template literals", () => {
    const ranges = getStringRanges("const x = `hello`")
    expect(ranges).toHaveLength(1)
  })

  it("detects multiple strings on one line", () => {
    const ranges = getStringRanges(`const a = "foo", b = "bar"`)
    expect(ranges).toHaveLength(2)
  })

  it("skips content inside line comments", () => {
    const ranges = getStringRanges(`// "not a string"\nconst x = 1`)
    expect(ranges).toHaveLength(0)
  })

  it("skips content inside block comments", () => {
    const ranges = getStringRanges(`/* "not a string" */const x = 1`)
    expect(ranges).toHaveLength(0)
  })

  it("handles escaped quotes inside strings", () => {
    // `"he\"llo"` — the backslash-escaped quote must not end the string early
    const code   = `const x = "he\\"llo"`
    const ranges = getStringRanges(code)
    expect(ranges).toHaveLength(1)
    expect(ranges[0][1] - ranges[0][0]).toBeGreaterThan(6) // longer than "hello"
  })

  it("handles template literals with ${} expressions", () => {
    const ranges = getStringRanges("const x = `hello ${name} world`")
    expect(ranges).toHaveLength(1)
  })

  it("handles adjacent strings", () => {
    const ranges = getStringRanges(`"a" + "b"`)
    expect(ranges).toHaveLength(2)
  })
})

describe("isInsideString", () => {
  it("returns true for an offset inside a string range", () => {
    const code   = `const x = "hello"`
    const ranges = getStringRanges(code)
    // 'h' at index 11 is inside "hello"
    expect(isInsideString(11, ranges)).toBe(true)
  })

  it("returns true for the opening quote character", () => {
    const code   = `const x = "hello"`
    const ranges = getStringRanges(code)
    expect(isInsideString(10, ranges)).toBe(true) // the `"` char
  })

  it("returns false for an offset before any string", () => {
    const code   = `const x = "hello"`
    const ranges = getStringRanges(code)
    expect(isInsideString(0, ranges)).toBe(false)
    expect(isInsideString(9, ranges)).toBe(false) // the space before `"`
  })

  it("returns false for an offset after the string ends", () => {
    const code   = `const x = "hello"; const y = 1`
    const ranges = getStringRanges(code)
    expect(isInsideString(18, ranges)).toBe(false) // after the closing `"`
  })

  it("returns false when ranges is empty", () => {
    expect(isInsideString(5, [])).toBe(false)
  })
})
