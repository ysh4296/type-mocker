export function getStringRanges(code: string): [number, number][] {
  const ranges: [number, number][] = []
  const quotes = ['"', "'", "`"]
  let i = 0

  while (i < code.length) {
    if (code[i] === "/" && code[i + 1] === "/") {
      while (i < code.length && code[i] !== "\n") i++
      continue
    }
    if (code[i] === "/" && code[i + 1] === "*") {
      i += 2
      while (i < code.length && !(code[i - 1] === "*" && code[i] === "/")) i++
      i++
      continue
    }
    if (quotes.includes(code[i])) {
      const q     = code[i]
      const start = i++
      while (i < code.length) {
        if (code[i] === "\\") { i += 2; continue }
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

export function isInsideString(offset: number, ranges: [number, number][]): boolean {
  return ranges.some(([s, e]) => offset >= s && offset < e)
}
