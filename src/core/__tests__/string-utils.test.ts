import { describe, it, expect } from "vitest"
import { getStringRanges, isInsideString } from "../string-utils"

describe("getStringRanges", () => {
  // 소스 코드 문자열에서 실제 문자열 리터럴 구간만 찾아내는지 검증한다
  // (주석 안의 따옴표나 이스케이프된 따옴표에 속으면 안 됨)
  it("returns no ranges for code with no strings", () => {
    expect(getStringRanges("const x = 1 + 2")).toEqual([])
  })

  it("finds a single double-quoted string", () => {
    const code = 'const x = "hello"'
    const ranges = getStringRanges(code)
    expect(ranges).toHaveLength(1)
    const [start, end] = ranges[0]
    expect(code.slice(start, end)).toBe('"hello"')
  })

  it("finds single-quoted and backtick strings", () => {
    const code = "const a = 'foo'; const b = `bar`"
    const ranges = getStringRanges(code)
    expect(ranges).toHaveLength(2)
    expect(code.slice(...ranges[0])).toBe("'foo'")
    expect(code.slice(...ranges[1])).toBe("`bar`")
  })

  it("does not treat quotes inside a line comment as strings", () => {
    // // 주석 안의 따옴표는 문자열이 아니므로 무시해야 한다
    const code = '// this "looks" like a string\nconst x = 1'
    expect(getStringRanges(code)).toEqual([])
  })

  it("does not treat quotes inside a block comment as strings", () => {
    // /* */ 블록 주석 안의 따옴표도 마찬가지로 무시해야 한다
    const code = '/* "not a string" */ const x = 1'
    expect(getStringRanges(code)).toEqual([])
  })

  it("handles escaped quotes inside a string without ending early", () => {
    // \" 이스케이프를 만나면 문자열이 아직 끝나지 않은 것으로 처리해야 한다
    const code = 'const x = "say \\"hi\\" now"'
    const ranges = getStringRanges(code)
    expect(ranges).toHaveLength(1)
    expect(code.slice(...ranges[0])).toBe('"say \\"hi\\" now"')
  })

  it("skips over template literal interpolations", () => {
    const code = "const x = `hello ${name} world`"
    const ranges = getStringRanges(code)
    expect(ranges).toHaveLength(1)
    expect(code.slice(...ranges[0])).toBe("`hello ${name} world`")
  })

  it("handles nested braces inside a template literal interpolation", () => {
    // ${ } 안에 중첩된 {}가 있어도 depth 카운팅으로 올바른 종료 지점을 찾아야 한다
    const code = "const x = `value: ${ {a: 1}.a }`"
    const ranges = getStringRanges(code)
    expect(ranges).toHaveLength(1)
    expect(code.slice(...ranges[0])).toBe("`value: ${ {a: 1}.a }`")
  })

  it("finds multiple strings across multiple lines", () => {
    const code = 'const a = "one"\nconst b = "two"'
    const ranges = getStringRanges(code)
    expect(ranges).toHaveLength(2)
    expect(code.slice(...ranges[0])).toBe('"one"')
    expect(code.slice(...ranges[1])).toBe('"two"')
  })
})

describe("isInsideString", () => {
  // 주어진 오프셋이 문자열 리터럴 구간([start, end)) 안에 있는지 판별하는지 검증한다
  it("returns true when the offset falls within a string range", () => {
    const ranges: [number, number][] = [[5, 12]]
    expect(isInsideString(8, ranges)).toBe(true)
  })

  it("returns false when the offset falls outside all ranges", () => {
    const ranges: [number, number][] = [[5, 12]]
    expect(isInsideString(20, ranges)).toBe(false)
  })

  it("treats the start of a range as inside and the end as exclusive", () => {
    // 반열린 구간([start, end))이므로 end 위치 자체는 범위 밖으로 취급되어야 한다
    const ranges: [number, number][] = [[5, 12]]
    expect(isInsideString(5, ranges)).toBe(true)
    expect(isInsideString(12, ranges)).toBe(false)
  })

  it("returns false for an empty ranges list", () => {
    expect(isInsideString(0, [])).toBe(false)
  })

  it("checks across multiple ranges", () => {
    const ranges: [number, number][] = [[0, 3], [10, 15]]
    expect(isInsideString(1, ranges)).toBe(true)
    expect(isInsideString(12, ranges)).toBe(true)
    expect(isInsideString(5, ranges)).toBe(false)
  })
})
