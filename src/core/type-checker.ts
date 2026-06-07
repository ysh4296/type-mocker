import * as ts from "typescript"
import { faker } from "@faker-js/faker"
import { type TypeMap, type Ctx } from "./types"
import { getStringHint } from "./faker-hints"

/**
 * Recursively converts a TypeChecker `ts.Type` into a mock value.
 *
 * Used for types that cannot be resolved purely from the local AST — mainly
 * imported types from node_modules (e.g. `Response`, `Buffer`) or complex
 * mapped/conditional types that the AST walker cannot unwrap directly.
 *
 * `depth` is a recursion guard: any type graph deeper than 6 levels collapses
 * to `{}` to prevent stack overflows on self-referential types.
 */
export function expandCheckerType(
  type: ts.Type,
  field: string,
  typeMap: TypeMap,
  ctx: Ctx,
  depth = 0,
): unknown {
  if (depth > 6) return {}

  // Primitive flags
  if (type.flags & ts.TypeFlags.String)    return getStringHint(field)
  if (type.flags & ts.TypeFlags.Number)    return faker.datatype.number({ min: 0, max: 100 })
  if (type.flags & ts.TypeFlags.Boolean)   return faker.datatype.boolean()
  if (type.flags & ts.TypeFlags.Null)      return null
  if (type.flags & ts.TypeFlags.Undefined) return undefined
  if (type.flags & ts.TypeFlags.Void)      return undefined
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return {}
  if (type.flags & ts.TypeFlags.Never)     return null

  // Literal types
  if (type.isStringLiteral()) return type.value
  if (type.isNumberLiteral()) return type.value
  if (type.flags & ts.TypeFlags.BooleanLiteral) return faker.datatype.boolean()

  // Union: pick one concrete member (prefer non-null/undefined branches)
  if (type.isUnion()) {
    const concrete = type.types.filter(
      t => !(t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)),
    )
    const pool = concrete.length > 0 ? concrete : type.types
    return expandCheckerType(faker.helpers.arrayElement(pool), field, typeMap, ctx, depth)
  }

  // Intersection: merge all parts into a single object
  if (type.isIntersection()) {
    const parts = type.types.map(t => {
      const v = expandCheckerType(t, field, typeMap, ctx, depth)
      return typeof v === "object" && v !== null ? v : {}
    })
    return Object.assign({}, ...parts)
  }

  // Array types: generate a short list of the element type
  if (ctx.checker.isArrayType(type)) {
    const args = ctx.checker.getTypeArguments(type as ts.TypeReference)
    if (args.length) {
      const len = faker.datatype.number({ min: 1, max: 4 })
      return Array.from({ length: len }, () =>
        expandCheckerType(args[0], "", typeMap, ctx, depth + 1),
      )
    }
    return []
  }

  // Object / interface / class: expand each visible property
  const props = type.getProperties()
  if (props.length) {
    const result: Record<string, unknown> = {}
    for (const prop of props) {
      const propType = ctx.checker.getTypeOfSymbol(prop)
      const optional = (prop.flags & ts.SymbolFlags.Optional) !== 0
      if (optional && Math.random() < 0.3) continue
      if (
        prop.flags & ts.SymbolFlags.Method ||
        propType.getCallSignatures().length > 0
      ) {
        result[prop.name] = () => {}
        continue
      }
      result[prop.name] = expandCheckerType(propType, prop.name, typeMap, ctx, depth + 1)
    }
    return result
  }

  return {}
}
