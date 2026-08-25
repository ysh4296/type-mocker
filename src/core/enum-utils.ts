import { posix } from "node:path"

const toPosix = (p: string): string => p.replace(/\\/g, "/")
import { EnumRef } from "./types"

export function collectEnumNames(value: unknown, names: Set<string>): void {
  if (value instanceof EnumRef) {
    names.add(value.ref.split(".")[0])
    return
  }
  if (Array.isArray(value)) {
    value.forEach(v => collectEnumNames(v, names))
    return
  }
  if (typeof value === "object" && value !== null) {
    Object.values(value as Record<string, unknown>).forEach(v => collectEnumNames(v, names))
  }
}

export function buildEnumImports(
  currentFile: string,
  enumNames: Set<string>,
  fileTypeMap: Map<string, string[]>,
  existingCode: string,
): string {
  const byFile = new Map<string, string[]>()

  for (const name of enumNames) {
    if (new RegExp(`import[^'"\\n]*\\b${name}\\b`).test(existingCode)) continue
    for (const [filePath, names] of fileTypeMap) {
      if (names.includes(name)) {
        const list = byFile.get(filePath) ?? []
        list.push(name)
        byFile.set(filePath, list)
        break
      }
    }
  }

  if (byFile.size === 0) return ""

  return [...byFile.entries()]
    .map(([filePath, names]) => {
      const rel        = posix.relative(posix.dirname(toPosix(currentFile)), toPosix(filePath))
        .replace(/\.tsx?$/, "")
      const importPath = rel.startsWith(".") ? rel : "./" + rel
      return `import { ${names.join(", ")} } from "${importPath}"`
    })
    .join("\n")
}
