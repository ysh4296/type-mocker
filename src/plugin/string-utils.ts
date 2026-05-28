/**
 * Utilities for detecting string literal and comment ranges in JavaScript/TypeScript
 * source code. Used by the transform step to avoid replacing `createMock<T>()`
 * calls that appear inside string literals or comments.
 */

/**
 * Walks the source text and returns the `[start, end)` character ranges of every
 * string literal (single-quote, double-quote, and template literal).
 *
 * Line comments (`//`) and block comments (`/* *\/`) are skipped entirely so
 * their content is never mistaken for a string range.
 *
 * Template literals with `${...}` expressions are treated as opaque: the
 * nested expression content is consumed without recursive parsing, which is
 * sufficient for the purpose of detecting whether a regex match sits inside
 * a string.
 */
export function getStringRanges(code: string): [number, number][] {
  const ranges: [number, number][] = []
  const quotes = ['"', "'", "`"]
  let i = 0

  while (i < code.length) {
    // Skip line comments
    if (code[i] === "/" && code[i + 1] === "/") {
      while (i < code.length && code[i] !== "\n") i++
      continue
    }
    // Skip block comments
    if (code[i] === "/" && code[i + 1] === "*") {
      i += 2
      while (i < code.length && !(code[i - 1] === "*" && code[i] === "/")) i++
      i++
      continue
    }
    // Detect start of a string literal
    if (quotes.includes(code[i])) {
      const q     = code[i]
      const start = i++
      while (i < code.length) {
        if (code[i] === "\\") { i += 2; continue } // escaped character
        // Template expression `${...}` — consume without recursing
        if (q === "`" && code[i] === "$" && code[i + 1] === "{") {
          i += 2
          let depth = 1
          while (i < code.length && depth > 0) {
            if      (code[i] === "{") depth++
            else if (code[i] === "}") depth--
            i++
          }
          continue
        }
        if (code[i] === q) { i++; break }
        i++
      }
      ranges.push([start, i])
      continue
    }
    i++
  }

  return ranges
}

/**
 * Returns `true` if `offset` falls within any of the given string ranges.
 * Used to guard regex replacements from firing inside string literals.
 */
export function isInsideString(offset: number, ranges: [number, number][]): boolean {
  return ranges.some(([s, e]) => offset >= s && offset < e)
}
