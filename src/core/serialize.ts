import { EnumRef } from "./types"

/**
 * Converts a mock value tree into a JavaScript source code string.
 *
 * The output is intended to be embedded directly in bundled code, so it must
 * be valid JavaScript syntax. `depth` controls the indentation level for
 * nested objects and arrays (2-space indent per level).
 *
 * Special cases:
 * - `EnumRef` → emits the raw reference string (e.g. `Role.Admin`)
 * - `undefined` object values → omitted (keeps objects clean)
 * - functions → emitted as `() => {}` stubs
 */
export function serialize(value: unknown, depth = 0): string {
  const pad   = "  ".repeat(depth)
  const inner = "  ".repeat(depth + 1)

  if (value instanceof EnumRef)   return value.ref
  if (value === null)              return "null"
  if (value === undefined)         return "undefined"
  if (typeof value === "string")   return JSON.stringify(value)
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (typeof value === "function") return "() => {}"

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]"
    const items = value.map(v => `${inner}${serialize(v, depth + 1)}`).join(",\n")
    return `[\n${items}\n${pad}]`
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${inner}${k}: ${serialize(v, depth + 1)}`)
    if (entries.length === 0) return "{}"
    return `{\n${entries.join(",\n")}\n${pad}}`
  }

  return "null"
}
