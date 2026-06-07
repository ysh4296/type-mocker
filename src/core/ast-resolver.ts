import * as ts from "typescript"
import { faker } from "@faker-js/faker"
import { EnumRef, type TypeMap, type Ctx } from "./types"
import { getStringHint } from "./faker-hints"
import { expandCheckerType } from "./type-checker"

// ─── Symbol resolution (crosses file boundaries) ─────────────────────────────

/**
 * Resolves a TypeScript Symbol to a mock value, following import aliases and
 * walking into declarations from any file (including node_modules).
 *
 * Tracks visited declarations in `ctx.resolving` to prevent infinite recursion
 * on self-referential types like linked-list nodes.
 */
export function resolveSymbolToMock(
  symbol: ts.Symbol,
  typeMap: TypeMap,
  ctx: Ctx,
): unknown {
  // Unwrap `import { X }` aliases to the original declaration
  const resolved =
    symbol.flags & ts.SymbolFlags.Alias
      ? ctx.checker.getAliasedSymbol(symbol)
      : symbol

  const decls = resolved.getDeclarations()
  if (!decls?.length) return {}

  const decl = decls[0]
  if (ctx.resolving.has(decl)) return {} // cycle guard

  ctx.resolving.add(decl)
  try {
    if (ts.isInterfaceDeclaration(decl))
      return interfaceToMock(decl, typeMap, ctx)

    if (ts.isTypeAliasDeclaration(decl))
      return typeNodeToMock(decl.type, typeMap, undefined, ctx)

    if (ts.isEnumDeclaration(decl)) {
      const members    = [...decl.members]
      const picked     = faker.helpers.arrayElement(members)
      const memberName = ts.isIdentifier(picked.name)
        ? picked.name.text
        : String(members.indexOf(picked))
      return new EnumRef(`${decl.name?.text ?? "Enum"}.${memberName}`)
    }

    // Class declarations and everything else: fall back to structural expansion
    const type = ctx.checker.getDeclaredTypeOfSymbol(resolved)
    return expandCheckerType(type, "", typeMap, ctx)
  } finally {
    ctx.resolving.delete(decl)
  }
}

// ─── AST-based mock generation (fast path for local types) ───────────────────

/**
 * Generates a mock object for an interface declaration.
 * Resolves `extends` clauses first so inherited fields are included,
 * then applies the interface's own members on top.
 */
export function interfaceToMock(
  node: ts.InterfaceDeclaration,
  typeMap: TypeMap,
  ctx?: Ctx,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // Resolve base types from `extends` clauses
  if (node.heritageClauses) {
    for (const clause of node.heritageClauses) {
      if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue
      for (const type of clause.types) {
        const name  = ts.isIdentifier(type.expression) ? type.expression.text : ""
        const entry = name ? typeMap.get(name) : undefined
        if (entry?.kind === "interface") {
          Object.assign(result, interfaceToMock(entry.node, typeMap, ctx))
        } else if (ctx) {
          const sym = ctx.checker.getSymbolAtLocation(type.expression)
          if (sym) {
            const v = resolveSymbolToMock(sym, typeMap, ctx)
            if (typeof v === "object" && v !== null && !(v instanceof EnumRef))
              Object.assign(result, v)
          }
        }
      }
    }
  }

  Object.assign(result, typeElementsToMock(node.members, typeMap, ctx))
  return result
}

/**
 * Iterates over interface/type-literal members and produces mock values
 * for each property. Methods become `() => {}` stubs.
 * Optional fields are randomly omitted ~30% of the time.
 */
export function typeElementsToMock(
  members: ts.NodeArray<ts.TypeElement>,
  typeMap: TypeMap,
  ctx?: Ctx,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const member of members) {
    if (ts.isMethodSignature(member)) {
      const key = memberKey(member.name)
      if (key) result[key] = () => {}
      continue
    }
    if (!ts.isPropertySignature(member) || !member.type) continue
    const key = memberKey(member.name)
    if (!key) continue
    if (member.questionToken && Math.random() < 0.3) continue
    result[key] = typeNodeToMock(member.type, typeMap, key, ctx)
  }
  return result
}

function memberKey(name: ts.PropertyName): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text
  return ""
}

/** Collects string literal keys from a type node (used for Pick/Omit). */
export function extractLiteralKeys(node: ts.TypeNode): string[] {
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) return [node.literal.text]
  if (ts.isUnionTypeNode(node)) return node.types.flatMap(extractLiteralKeys)
  return []
}

/**
 * Core dispatcher: converts any `ts.TypeNode` into a JavaScript mock value.
 *
 * Handles every TypeScript type syntax:
 * - Primitives (`string`, `number`, `boolean`, `null`, `undefined`)
 * - Literals (`"foo"`, `42`, `true`)
 * - Arrays and tuples
 * - Union and intersection types
 * - Type references (local types, built-in utilities like `Partial`/`Pick`/`Omit`)
 * - Inline type literals `{ key: string }`
 * - Function and constructor types
 */
export function typeNodeToMock(
  node: ts.TypeNode,
  typeMap: TypeMap,
  fieldName?: string,
  ctx?: Ctx,
): unknown {
  switch (node.kind) {
    case ts.SyntaxKind.StringKeyword:
      return fieldName ? getStringHint(fieldName) : faker.lorem.word()
    case ts.SyntaxKind.NumberKeyword:
      return faker.datatype.number({ min: 0, max: 100 })
    case ts.SyntaxKind.BooleanKeyword:
      return faker.datatype.boolean()
    case ts.SyntaxKind.NullKeyword:
      return null
    case ts.SyntaxKind.UndefinedKeyword:
    case ts.SyntaxKind.VoidKeyword:
      return undefined
    case ts.SyntaxKind.AnyKeyword:
    case ts.SyntaxKind.UnknownKeyword:
    case ts.SyntaxKind.ObjectKeyword:
      return {}
    case ts.SyntaxKind.NeverKeyword:
      return null

    case ts.SyntaxKind.LiteralType: {
      const lit = (node as ts.LiteralTypeNode).literal
      if (ts.isStringLiteral(lit))  return lit.text
      if (ts.isNumericLiteral(lit)) return Number(lit.text)
      if (lit.kind === ts.SyntaxKind.TrueKeyword)  return true
      if (lit.kind === ts.SyntaxKind.FalseKeyword) return false
      if (lit.kind === ts.SyntaxKind.NullKeyword)  return null
      return null
    }

    case ts.SyntaxKind.ArrayType: {
      const len = faker.datatype.number({ min: 1, max: 4 })
      return Array.from({ length: len }, () =>
        typeNodeToMock((node as ts.ArrayTypeNode).elementType, typeMap, undefined, ctx),
      )
    }

    case ts.SyntaxKind.UnionType: {
      const types   = [...(node as ts.UnionTypeNode).types]
      // Prefer concrete (non-null/undefined) members 80% of the time
      const concrete = types.filter(
        t =>
          t.kind !== ts.SyntaxKind.UndefinedKeyword &&
          t.kind !== ts.SyntaxKind.NullKeyword,
      )
      const pool = concrete.length > 0 && Math.random() > 0.2 ? concrete : types
      return typeNodeToMock(faker.helpers.arrayElement(pool), typeMap, fieldName, ctx)
    }

    case ts.SyntaxKind.IntersectionType: {
      const parts = (node as ts.IntersectionTypeNode).types.map(t => {
        const v = typeNodeToMock(t, typeMap, undefined, ctx)
        return typeof v === "object" && v !== null ? v : {}
      })
      return Object.assign({}, ...parts)
    }

    case ts.SyntaxKind.TypeLiteral:
      return typeElementsToMock((node as ts.TypeLiteralNode).members, typeMap, ctx)

    case ts.SyntaxKind.ParenthesizedType:
      return typeNodeToMock((node as ts.ParenthesizedTypeNode).type, typeMap, fieldName, ctx)

    case ts.SyntaxKind.TupleType:
      return (node as ts.TupleTypeNode).elements.map(e =>
        ts.isNamedTupleMember(e)
          ? typeNodeToMock(e.type, typeMap, undefined, ctx)
          : typeNodeToMock(e as ts.TypeNode, typeMap, undefined, ctx),
      )

    case ts.SyntaxKind.OptionalType:
      return Math.random() > 0.3
        ? typeNodeToMock((node as ts.OptionalTypeNode).type, typeMap, fieldName, ctx)
        : undefined

    case ts.SyntaxKind.FunctionType:
    case ts.SyntaxKind.ConstructorType:
      return () => undefined

    case ts.SyntaxKind.TypeReference:
      return resolveTypeReference(node as ts.TypeReferenceNode, typeMap, fieldName, ctx)

    default:
      return null
  }
}

/**
 * Resolves a `TypeReferenceNode` to a mock value.
 *
 * Resolution order:
 *  1. Built-in utility types (`Date`, `Array`, `Partial`, `Pick`, `Omit`, `Promise`, `Record`)
 *  2. TypeChecker symbol lookup (more accurate for multi-file projects)
 *  3. Local typeMap fallback (enums, interfaces, type aliases)
 */
function resolveTypeReference(
  refNode: ts.TypeReferenceNode,
  typeMap: TypeMap,
  fieldName: string | undefined,
  ctx: Ctx | undefined,
): unknown {
  if (!ts.isIdentifier(refNode.typeName)) {
    // QualifiedName (A.B) — delegate to TypeChecker
    if (ctx) {
      const sym = ctx.checker.getSymbolAtLocation(refNode.typeName)
      if (sym) return resolveSymbolToMock(sym, typeMap, ctx)
      const type = ctx.checker.getTypeAtLocation(refNode)
      if (!(type.flags & ts.TypeFlags.Any))
        return expandCheckerType(type, fieldName ?? "", typeMap, ctx)
    }
    return {}
  }

  const typeName = refNode.typeName.text

  // ── Built-in types ──────────────────────────────────────────────────────
  if (typeName === "Date")
    return faker.date.recent().toISOString()

  if (typeName === "Array" && refNode.typeArguments?.length) {
    const len = faker.datatype.number({ min: 1, max: 4 })
    return Array.from({ length: len }, () =>
      typeNodeToMock(refNode.typeArguments![0], typeMap, undefined, ctx),
    )
  }

  if (
    (typeName === "Partial" || typeName === "Required" || typeName === "Readonly") &&
    refNode.typeArguments?.length
  ) {
    return typeNodeToMock(refNode.typeArguments[0], typeMap, fieldName, ctx)
  }

  if (typeName === "Pick" && refNode.typeArguments?.length === 2) {
    const base = typeNodeToMock(refNode.typeArguments[0], typeMap, undefined, ctx)
    if (typeof base !== "object" || base === null) return base
    const keys = extractLiteralKeys(refNode.typeArguments[1])
    return Object.fromEntries(keys.map(k => [k, (base as Record<string, unknown>)[k]]))
  }

  if (typeName === "Omit" && refNode.typeArguments?.length === 2) {
    const base = typeNodeToMock(refNode.typeArguments[0], typeMap, undefined, ctx)
    if (typeof base !== "object" || base === null) return base
    const keys = new Set(extractLiteralKeys(refNode.typeArguments[1]))
    return Object.fromEntries(
      Object.entries(base as Record<string, unknown>).filter(([k]) => !keys.has(k)),
    )
  }

  if (typeName === "Promise" && refNode.typeArguments?.length)
    return typeNodeToMock(refNode.typeArguments[0], typeMap, undefined, ctx)

  if (typeName === "Record") return {}

  // ── TypeChecker lookup (preferred for multi-file accuracy) ──────────────
  // Resolving via the checker is more accurate than the flat typeMap when
  // multiple files export types with the same name.
  if (ctx) {
    const sym = ctx.checker.getSymbolAtLocation(refNode.typeName)
    if (sym) return resolveSymbolToMock(sym, typeMap, ctx)
  }

  // ── Local typeMap fallback ───────────────────────────────────────────────
  const entry = typeMap.get(typeName)
  if (entry) {
    if (entry.kind === "enum") {
      const members    = [...entry.node.members]
      const picked     = faker.helpers.arrayElement(members)
      const memberName = ts.isIdentifier(picked.name)
        ? picked.name.text
        : String(members.indexOf(picked))
      return new EnumRef(`${typeName}.${memberName}`)
    }
    if (entry.kind === "interface") return interfaceToMock(entry.node, typeMap, ctx)
    return typeNodeToMock(entry.node, typeMap, fieldName, ctx)
  }

  // ── TypeChecker structural fallback ─────────────────────────────────────
  if (ctx) {
    const type = ctx.checker.getTypeAtLocation(refNode)
    if (!(type.flags & ts.TypeFlags.Any))
      return expandCheckerType(type, fieldName ?? "", typeMap, ctx)
  }

  return {}
}
