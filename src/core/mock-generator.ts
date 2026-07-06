import * as ts from "typescript"
import { faker } from "@faker-js/faker"
import { EnumRef, type TypeMap, type Ctx } from "./types"
import { interfaceToMock, typeNodeToMock } from "./ast-resolver"

/**
 * Generates a single mock object for the named type.
 *
 * @param typeName  - The exported type name to look up in `typeMap`.
 * @param typeMap   - Type registry built by `parseTypes` or `parseTypesFromProject`.
 * @param checker   - TypeChecker for cross-file type resolution (optional but recommended).
 * @param overrides - Key/value pairs merged on top of the generated mock.
 * @throws if `typeName` is not found in `typeMap`.
 */
export function toMock(
  typeName: string,
  typeMap: TypeMap,
  checker?: ts.TypeChecker,
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const entry = typeMap.get(typeName)
  if (!entry) throw new Error(`Type "${typeName}" not found in type registry`)

  // Always build a resolving set, even without a checker, so self-referential
  // types can't stack-overflow the AST-only fallback path (see ast-resolver.ts).
  const ctx: Ctx = { checker, resolving: new Set<ts.Node>() }

  let base: unknown
  if (entry.kind === "interface") {
    base = interfaceToMock(entry.node, typeMap, ctx)
  } else if (entry.kind === "enum") {
    const members    = [...entry.node.members]
    const picked     = faker.helpers.arrayElement(members)
    const memberName = ts.isIdentifier(picked.name)
      ? picked.name.text
      : String(members.indexOf(picked))
    base = new EnumRef(`${typeName}.${memberName}`)
  } else {
    base = typeNodeToMock(entry.node, typeMap, undefined, ctx)
  }

  if (base instanceof EnumRef || typeof base !== "object" || base === null)
    return base as unknown as Record<string, unknown>

  return overrides
    ? { ...(base as Record<string, unknown>), ...overrides }
    : (base as Record<string, unknown>)
}

/**
 * Generates an array of `count` independent mock objects for the named type.
 * Each item is generated with a fresh faker seed, so values will differ.
 */
export function toMockList(
  typeName: string,
  typeMap: TypeMap,
  count = 3,
  checker?: ts.TypeChecker,
): Record<string, unknown>[] {
  return Array.from({ length: count }, () => toMock(typeName, typeMap, checker))
}
