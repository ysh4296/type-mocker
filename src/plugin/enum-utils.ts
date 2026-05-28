import { relative, dirname } from "node:path"
import { EnumRef } from "../core/types"

/**
 * Recursively collects the enum class names referenced inside a mock value tree.
 * For example, if the tree contains `EnumRef("Role.Admin")`, "Role" is added to
 * `names`. These names are later used to build missing import statements.
 */
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

/**
 * Generates `import { EnumName } from "..."` statements for any enum that is
 * referenced in the transformed code but not yet imported in the file.
 *
 * @param currentFile  - Absolute path of the file being transformed.
 * @param enumNames    - Set of enum class names that need to be available at runtime.
 * @param fileTypeMap  - Maps source file paths to their exported type names.
 * @param existingCode - The (already transformed) source text, used to detect
 *                       imports that are already present before the first `createMock` call.
 * @returns A newline-separated block of import statements, or `""` if nothing is needed.
 */
export function buildEnumImports(
  currentFile: string,
  enumNames: Set<string>,
  fileTypeMap: Map<string, string[]>,
  existingCode: string,
): string {
  const byFile      = new Map<string, string[]>()
  // Only scan the section of code before the first createMock call to check imports
  const importSection = existingCode.split("createMock")[0]

  for (const name of enumNames) {
    // Skip enums that are already imported
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

  if (byFile.size === 0) return ""

  return [...byFile.entries()]
    .map(([filePath, names]) => {
      const rel        = relative(dirname(currentFile), filePath)
        .replace(/\\/g, "/")
        .replace(/\.tsx?$/, "")
      const importPath = rel.startsWith(".") ? rel : "./" + rel
      return `import { ${names.join(", ")} } from "${importPath}"`
    })
    .join("\n")
}
