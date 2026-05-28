import { describe, it, expect, beforeAll } from "vitest"
import { resolve } from "node:path"
import { parseTypesFromProject } from "../../core/project-scanner"
import { toMock } from "../../core/mock-generator"
import { serialize } from "../../core/serialize"
import { getStringRanges, isInsideString } from "../string-utils"
import { collectEnumNames, buildEnumImports } from "../enum-utils"
import { EnumRef } from "../../core/types"

const FIXTURES_DIR = resolve(__dirname, "../../core/__tests__/fixtures")

describe("plugin transform logic (unit)", () => {
  let state: ReturnType<typeof parseTypesFromProject>

  beforeAll(() => {
    state = parseTypesFromProject(FIXTURES_DIR)
  })

  it("generates a serializable User mock", () => {
    const { typeMap, checker } = state
    const mock   = toMock("User", typeMap, checker)
    const result = serialize(mock, 0)
    expect(result).toMatch(/^\{/)
    expect(result).toContain("id:")
    expect(result).toContain("email:")
    expect(result).toContain("name:")
  })

  it("does not replace createMock<User>() inside a string literal", () => {
    const code   = `const label = "createMock<User>()"`
    const ranges = getStringRanges(code)
    const offset = code.indexOf("createMock")
    expect(isInsideString(offset, ranges)).toBe(true)
  })

  it("replaces createMock<User>() outside a string literal", () => {
    const code   = `const user = createMock<User>()`
    const ranges = getStringRanges(code)
    const offset = code.indexOf("createMock")
    expect(isInsideString(offset, ranges)).toBe(false)
  })

  it("correctly detects enum names in a mock tree", () => {
    const { typeMap, checker } = state
    const mock   = toMock("User", typeMap, checker)
    const names  = new Set<string>()
    collectEnumNames(mock, names)
    expect(names.has("Role")).toBe(true)
  })

  it("builds enum import statements for missing imports", () => {
    const { fileTypeMap } = state
    const fakeFile = resolve(FIXTURES_DIR, "consumer.ts")
    const code     = `const user = createMock<User>()\n`
    const imports  = buildEnumImports(fakeFile, new Set(["Role"]), fileTypeMap, code)
    expect(imports).toContain("import")
    expect(imports).toContain("Role")
  })

  it("skips enum imports that are already present in the file", () => {
    const { fileTypeMap } = state
    const fakeFile = resolve(FIXTURES_DIR, "consumer.ts")
    const code     = `import { Role } from "./types"\nconst user = createMock<User>()\n`
    const imports  = buildEnumImports(fakeFile, new Set(["Role"]), fileTypeMap, code)
    expect(imports).toBe("")
  })
})

describe("serialize round-trips", () => {
  it("serializes arrays of mocks", () => {
    const { typeMap, checker } = parseTypesFromProject(FIXTURES_DIR)
    const mocks  = [toMock("Post", typeMap, checker), toMock("Post", typeMap, checker)]
    const result = serialize(mocks, 0)
    expect(result).toMatch(/^\[/)
    expect(result).toContain("title:")
    expect(result).toContain("body:")
  })

  it("emits EnumRef values without quotes", () => {
    const ref    = new EnumRef("Role.Admin")
    const result = serialize({ role: ref }, 0)
    expect(result).toContain("role: Role.Admin")
    expect(result).not.toContain('"Role.Admin"')
  })
})
