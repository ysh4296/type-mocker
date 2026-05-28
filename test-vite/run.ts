import { readFileSync } from "node:fs"
import { resolve, relative, dirname } from "node:path"
import { parseTypesFromProject, toMock, EnumRef } from "../src/core/ast-to-mock"
import { serialize } from "../src/core/serialize"

const srcDir = resolve("./test-project/src")
const appFile = resolve("./test-project/src/app.ts")

// ─── 1. 프로젝트 스캔 ─────────────────────────────────────────────────────────
const { typeMap, fileTypeMap, checker } = parseTypesFromProject(srcDir)

console.log(`스캔 완료: ${typeMap.size}개 타입 발견`)
console.log("타입 목록:", [...typeMap.keys()].join(", "))
console.log()

// ─── 2. transform 실행 ────────────────────────────────────────────────────────
const code = readFileSync(appFile, "utf-8")
const enumsNeeded = new Set<string>()

let transformed = code

transformed = transformed.replace(
  /createMock<(\w+)>\(\s*\)/g,
  (originalMatch: string, typeName: string) => {
    try {
      const mock = toMock(typeName, typeMap, checker)
      collectEnumNames(mock, enumsNeeded)
      return serialize(mock, 0)
    } catch (e) {
      console.error(`  skipped ${typeName}:`, e)
      return originalMatch
    }
  },
)

transformed = transformed.replace(
  /createMockList<(\w+)>\((\d+)\s*\)/g,
  (originalMatch: string, typeName: string, countStr: string) => {
    try {
      const count = parseInt(countStr, 10)
      const mocks = Array.from({ length: count }, () => toMock(typeName, typeMap, checker))
      mocks.forEach(m => collectEnumNames(m, enumsNeeded))
      return serialize(mocks, 0)
    } catch (e) {
      console.error(`  skipped ${typeName}:`, e)
      return originalMatch
    }
  },
)

// enum import 주입
if (enumsNeeded.size > 0) {
  const importBlock = buildEnumImports(appFile, enumsNeeded, fileTypeMap, transformed)
  if (importBlock) transformed = importBlock + "\n" + transformed
}

// ─── 3. 결과 출력 ─────────────────────────────────────────────────────────────
console.log("━━━ 입력 (test-project/src/app.ts) ━━━━━━━━━━━━━━━━━━━━━━━━")
console.log(code)
console.log()
console.log("━━━ 번들 출력 (플러그인 변환 결과) ━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log(transformed)

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function collectEnumNames(value: unknown, names: Set<string>): void {
  if (value instanceof EnumRef) { names.add(value.ref.split(".")[0]); return }
  if (Array.isArray(value)) { value.forEach(v => collectEnumNames(v, names)); return }
  if (typeof value === "object" && value !== null)
    Object.values(value as Record<string, unknown>).forEach(v => collectEnumNames(v, names))
}

function buildEnumImports(
  currentFile: string,
  enumNames: Set<string>,
  fileTypeMap: Map<string, string[]>,
  existingCode: string,
): string {
  const byFile = new Map<string, string[]>()
  const importSection = existingCode.split("createMock")[0]

  for (const name of enumNames) {
    if (new RegExp(`\\b${name}\\b`).test(importSection)) continue
    for (const [filePath, names] of fileTypeMap) {
      if (names.includes(name)) {
        const list = byFile.get(filePath) ?? []
        list.push(name)
        byFile.set(filePath, list)
        break
      }
    }
  }

  return [...byFile.entries()]
    .map(([filePath, names]) => {
      const rel = relative(dirname(currentFile), filePath).replace(/\\/g, "/").replace(/\.tsx?$/, "")
      const importPath = rel.startsWith(".") ? rel : "./" + rel
      return `import { ${names.join(", ")} } from "${importPath}"`
    })
    .join("\n")
}
