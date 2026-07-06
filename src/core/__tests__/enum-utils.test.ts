import { describe, it, expect } from "vitest"
import { collectEnumNames, buildEnumImports } from "../enum-utils"
import { EnumRef } from "../types"

describe("collectEnumNames", () => {
  // mock 트리를 순회하며 등장하는 EnumRef의 enum 이름을 모두 모으는지 검증한다
  it("collects the enum name from a top-level EnumRef", () => {
    const names = new Set<string>()
    collectEnumNames(new EnumRef("Role.Admin"), names)
    expect(names).toEqual(new Set(["Role"]))
  })

  it("collects multiple distinct enum names from a nested object", () => {
    const names = new Set<string>()
    collectEnumNames(
      { role: new EnumRef("Role.Admin"), status: new EnumRef("Status.Active") },
      names,
    )
    expect(names).toEqual(new Set(["Role", "Status"]))
  })

  it("collects enum names nested inside arrays", () => {
    const names = new Set<string>()
    collectEnumNames([new EnumRef("Role.Admin"), new EnumRef("Role.Guest")], names)
    expect(names).toEqual(new Set(["Role"]))
  })

  it("collects enum names nested inside arrays of objects", () => {
    const names = new Set<string>()
    collectEnumNames([{ status: new EnumRef("Status.Active") }], names)
    expect(names).toEqual(new Set(["Status"]))
  })

  it("does nothing for values with no enum refs", () => {
    const names = new Set<string>()
    collectEnumNames({ a: 1, b: "x", c: [1, 2, 3], d: null, e: undefined }, names)
    expect(names.size).toBe(0)
  })

  it("does not descend into functions", () => {
    // typeof value === "object" 분기만 순회하므로 함수 값은 그냥 지나쳐야 한다
    const names = new Set<string>()
    collectEnumNames(() => {}, names)
    expect(names.size).toBe(0)
  })

  it("accumulates into a pre-populated Set across multiple calls", () => {
    // 호출부(플러그인)에서 여러 mock에 대해 같은 Set을 재사용하는 패턴을 검증
    const names = new Set<string>(["Existing"])
    collectEnumNames(new EnumRef("Role.Admin"), names)
    expect(names).toEqual(new Set(["Existing", "Role"]))
  })
})

describe("buildEnumImports", () => {
  it("returns an empty string when there are no enum names", () => {
    const result = buildEnumImports("/proj/out.ts", new Set(), new Map(), "")
    expect(result).toBe("")
  })

  it("returns an empty string when the enum's file cannot be found in fileTypeMap", () => {
    // fileTypeMap에 없는 이름은 어느 파일에서 import해야 할지 알 수 없으므로 무시된다
    const result = buildEnumImports("/proj/out.ts", new Set(["Role"]), new Map(), "")
    expect(result).toBe("")
  })

  it("generates a relative import for an enum defined in another file", () => {
    const fileTypeMap = new Map([["/proj/src/types.ts", ["Role", "User"]]])
    const result = buildEnumImports("/proj/src/out.ts", new Set(["Role"]), fileTypeMap, "")
    expect(result).toBe('import { Role } from "./types"')
  })

  it("groups multiple enum names imported from the same file", () => {
    const fileTypeMap = new Map([["/proj/src/types.ts", ["Role", "Status"]]])
    const result = buildEnumImports(
      "/proj/src/out.ts",
      new Set(["Role", "Status"]),
      fileTypeMap,
      "",
    )
    expect(result).toBe('import { Role, Status } from "./types"')
  })

  it("splits enum names across separate import statements per source file", () => {
    const fileTypeMap = new Map([
      ["/proj/src/types.ts", ["Role"]],
      ["/proj/src/status.ts", ["Status"]],
    ])
    const result = buildEnumImports(
      "/proj/src/out.ts",
      new Set(["Role", "Status"]),
      fileTypeMap,
      "",
    )
    expect(result).toContain('import { Role } from "./types"')
    expect(result).toContain('import { Status } from "./status"')
  })

  it("skips an enum that is already imported in the existing code", () => {
    // 변환 대상 소스에 이미 import 구문이 있으면 중복 삽입하지 않아야 한다
    const fileTypeMap = new Map([["/proj/src/types.ts", ["Role", "Status"]]])
    const result = buildEnumImports(
      "/proj/src/out.ts",
      new Set(["Role", "Status"]),
      fileTypeMap,
      'import { Role } from "./types"\n',
    )
    expect(result).toBe('import { Status } from "./types"')
  })

  it("normalizes backslashes to forward slashes in the import path", () => {
    // Windows 경로(\\)로 들어와도 import 경로는 항상 슬래시(/)로 나와야 한다
    const fileTypeMap = new Map([["C:\\proj\\src\\nested\\types.ts", ["Role"]]])
    const result = buildEnumImports(
      "C:\\proj\\src\\out.ts",
      new Set(["Role"]),
      fileTypeMap,
      "",
    )
    expect(result).toBe('import { Role } from "./nested/types"')
  })
})
